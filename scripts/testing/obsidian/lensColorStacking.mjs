/** Exact-build #197 regression: real native color/suggestion layers above the lens body portal.
 * Uses the existing disposable vault, native Electron input and no note or saved lens fixtures. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {validateTarget} from './runner.mjs';

/** Exercise native stacking and nested dismissal in separate owning documents. */
async function scenario(app,c) {
  const p=app.plugins.plugins['k-plex'];
  const check=(ok,message)=>{if(!ok)throw Error(message)};
  check(p&&!app.setting.isOpen&&app.vault.getFiles().length<1000,'Clean disposable Small required');
  await p.settingsWriteQueue;
  const settings=JSON.parse(JSON.stringify(p.settings)),layout=app.workspace.getLayout(),sessions=documentSessions(p).capture();
  const leaves=[],dialogs=[],cases=[];
  const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const until=async(read,message)=>{const end=Date.now()+15000;while(!read()){check(!c.closed&&Date.now()<end,message);await wait(30)}};
  /** Hit testing precedes trusted input so a programmatic click cannot hide a stacking regression. */
  const click=async element=>{
    check(element,'Missing control');element.scrollIntoView({block:'nearest'});await wait(80);
    const doc=element.ownerDocument,r=element.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);
    check(r.width&&r.height&&element.contains(doc.elementFromPoint(x,y)),'Control obscured: '+element.className);
    const win=doc.defaultView.require('@electron/remote').getCurrentWindow();win.focus();win.webContents.focus();
    win.webContents.sendInputEvent({type:'mouseMove',x,y});
    win.webContents.sendInputEvent({type:'mouseDown',x,y,button:'left',clickCount:1});
    win.webContents.sendInputEvent({type:'mouseUp',x,y,button:'left',clickCount:1});await wait(120);
  };
  const escape=async doc=>{
    const win=doc.defaultView.require('@electron/remote').getCurrentWindow();win.focus();win.webContents.focus();
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await wait(120);
  };
  try {
    await documentSessions(p).off();
    for(const surface of ['tab','window']) {
      c.progress={surface,cases};
      const leaf=app.workspace.getLeaf(surface==='window'?'window':true);leaves.push(leaf);
      await leaf.setViewState({type:'k-plex-react-view',active:true});await leaf.view.waitUntilReady();await app.workspace.revealLeaf(leaf);
      const root=leaf.view.contentEl.querySelector('.kplex-app'),doc=root.ownerDocument;
      await click(root.querySelector('.kplex-filter-trigger'));
      await until(()=>doc.querySelector('.kplex-filter-portal'),'Lens panel pending');
      const panel=doc.querySelector('.kplex-filter-portal');
      await click(panel.querySelector('[aria-label="'+p.translator('filter.newLens')+'"]'));
      const mode=[...panel.querySelectorAll('.kplex-lens-editor-row select')].find(select=>[...select.options].some(option=>option.value==='style'));
      mode.value='style';mode.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));
      await until(()=>panel.querySelector('.kplex-lens-style-grid'),'Style controls pending');
      for(const index of [0,1,2]) {
        await click(panel.querySelectorAll('.kplex-lens-style-grid button')[index]);
        await until(()=>doc.querySelector('.modal-container .kplex-color-modal'),'Native color modal pending');
        const modal=doc.querySelector('.modal-container .kplex-color-modal');dialogs.push(modal);
        check(modal.ownerDocument===doc,'Color modal opened in another document');
        const nativeContainer=modal.closest('.modal-container');
        check(Number(doc.defaultView.getComputedStyle(nativeContainer).zIndex)>Number(doc.defaultView.getComputedStyle(panel).zIndex),'Lens panel overtook native modal');
        if(index===0){const win=doc.defaultView.require('@electron/remote').getCurrentWindow();const image=await win.webContents.capturePage();require('node:fs').writeFileSync(c.screenshotPrefix+'-'+surface+'.png',image.toPNG());}
        await click(modal.querySelector('.kplex-color-source-editor select'));
        // Close the native select popup before changing its value through the form's public DOM event.
        await escape(doc);
        const source=modal.querySelector('.kplex-color-source-editor select');check(source?.isConnected,'Select Escape dismissed color modal');
        source.value='theme';source.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));
        await click(modal.querySelector('.kplex-theme-color-choice'));
        await until(()=>doc.querySelector('.prompt'),'Native theme chooser pending');
        const prompt=doc.querySelector('.prompt');dialogs.push(prompt);
        await click(prompt.querySelector('input'));
        await escape(doc);await until(()=>!prompt.isConnected,'Theme chooser Escape pending');
        check(modal.isConnected&&panel.isConnected,'Chooser dismissed an ancestor');
        if(index===0){
          source.value='fixed';source.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));
          const text=modal.querySelector('.kplex-literal-controls input[type=text]');text.value='#12345680';text.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));
          await click([...modal.querySelectorAll('button')].find(button=>button.textContent===p.translator('colors.useColor')));
          await until(()=>!modal.isConnected,'Use color pending');
          check(panel.querySelector('.kplex-lens-style-grid button').textContent==='#12345680','Color did not reach the local lens draft');
        }else{
          await click([...modal.querySelectorAll('button')].find(button=>button.textContent===p.translator('common.cancel')));
          await until(()=>!modal.isConnected,'Color Cancel pending');
        }
        check(panel.isConnected,'Color dismissal removed lens draft');
        cases.push(surface+': '+['fill applied to draft','border canceled','text canceled'][index]+'; native hit targets and chooser');
      }
      await click(panel.querySelector('.kplex-lens-style-grid button'));const modal=doc.querySelector('.kplex-color-modal');dialogs.push(modal);
      await escape(doc);await until(()=>!modal.isConnected,'Color Escape pending');check(panel.isConnected,'Color Escape dismissed lens draft');
      await escape(doc);await until(()=>!panel.isConnected,'Lens Escape pending');
      await click(root.querySelector('.kplex-filter-trigger'));await until(()=>doc.querySelector('.kplex-filter-portal'),'Reopen pending');
      await click(root.querySelector('.kplex-brand'));await until(()=>!doc.querySelector('.kplex-filter-portal'),'Outside dismissal pending');
    }
    check(JSON.stringify(p.settings.graphLenses)===JSON.stringify(settings.graphLenses),'Unsaved lens changed settings');
    return{cases,windows:2,input:'native Electron mouse/key events; source modes and color text set through DOM form events',physicalMobile:false};
  } finally {
    const failures=[],clean=async run=>{try{await run()}catch(error){failures.push(String(error))}};
    for(const dialog of dialogs.reverse())if(dialog?.isConnected)await clean(()=>dialog.closest('.modal-container')?.querySelector('.modal-close-button')?.click());
    for(const leaf of leaves.reverse())await clean(()=>leaf.detach());
    p.settings=settings;await clean(()=>p.saveSettings(false,false));
    await clean(()=>app.workspace.changeLayout(layout));await clean(()=>documentSessions(p).restore(sessions));
    await wait(1500);await clean(()=>p.settingsWriteQueue);await clean(()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
    if(failures.length)throw Error('Cleanup: '+failures.join('; '));
  }
}

const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
await runControlledProbe('lens-color-stacking-197',scenario,
  'c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.screenshotPrefix='+JSON.stringify(join(process.env.KPLEX_HOST_REPORT_DIR??'','lens-color'))+';const documentSessions='+nativeDocumentSessions.toString()+';',
  ['styles.css','src/ui/PlexFilter.tsx','src/ui/ColorSourceModal.ts']);
