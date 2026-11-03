/** Exact-build Mind Map saved-destination navigation through real History, pins and native
 * pickers in disposable Small. Uses cached existing notes, edits no content and restores native
 * layout/settings independently of assertions through the established controlled transport. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';

/** Click the production saved controls and assert both attention and the pinned layout root. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace,remote=require('@electron/remote'),native=remote.getCurrentWindow();
 if(!p||app.setting.isOpen||app.vault.getFiles().length>=1000)throw Error('Clean disposable Small required');
 const original=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout(),bounds=native.getBounds(),maximized=native.isMaximized(),cases=[];let host;
 /** Keep native waits bounded and retire them with their owning controller. */
 const until=async(read,message)=>{const end=Date.now()+20000;while(!read()){if(c.closed||Date.now()>end)throw Error(message);await new Promise(resolve=>window.setTimeout(resolve,40))}};
 /** Assertion messages identify workflows without logging private content. */
 const check=(value,message)=>{if(!value)throw Error(message)};
 try{
  await until(()=>p.layoutReady&&!p.isStartupInitializing()&&!p.index.hasActiveSemanticPreparation(),'Startup did not settle');
  native.restore();native.setBounds({x:20,y:20,width:1400,height:950});native.show();native.focus();native.webContents.focus();workspace.leftSplit.collapse();workspace.rightSplit.collapse();
  const titles=new Set(),pages=app.vault.getMarkdownFiles().map(file=>p.index.get(file.path)).filter(page=>{if(!page)return false;const title=p.index.titleFor(page);if(titles.has(title))return false;titles.add(title);return true}).slice(0,3);check(pages.length===3,'Three cached unique saved targets required');
  Object.assign(p.settings,{navigationHistory:pages.map(page=>page.path),pinnedNodes:pages.slice(1).map(page=>page.path),embedCentralNode:false,autoOpenCentralDocument:false,followActiveFile:false,animationSpeed:0});await p.saveSettings(false,false);p.index.notifyPresentation();
  const anchors=[];workspace.iterateRootLeaves(leaf=>{if(leaf.view.containerEl.ownerDocument===document&&leaf.view.containerEl.getBoundingClientRect().width>0)anchors.push(leaf)});check(anchors[0],'Native main-window anchor absent');
  await workspace.revealLeaf(anchors[0]);workspace.setActiveLeaf(anchors[0],{focus:true});host=workspace.getLeaf('tab');await host.setViewState({type:'k-plex-react-view',active:true});await host.view.waitUntilReady();await workspace.revealLeaf(host);await p.setDocumentSyncMode(host,'off');p.notifyNavigation(pages[0].path,host);
  const root=()=>host.view.containerEl.querySelector('.kplex-app'),doc=host.view.containerEl.ownerDocument,session=host.view.documentSession.plexView;
  await until(()=>host.view.documentSession.centerPath===pages[0].path&&root()?.querySelector('.kplex-filter-trigger'),'Initial attention absent');
  root().querySelector('.kplex-filter-trigger').click();await until(()=>doc.querySelector('.kplex-view-selector select'),'Selector absent');
  const select=doc.querySelector('.kplex-view-selector select');select.value='mindmap';select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));await until(()=>session.definition.id==='mindmap','Mind Map selection absent');doc.querySelector('.kplex-filter-panel-header button').click();
  /** Current native state and rendered root must agree, not merely the shared history record. */
  const arrived=target=>host.view.documentSession.centerPath===target.path&&session.layoutRoot(target.path)===target.path&&root().querySelector('[data-kplex-keyboard-id="root"]')?.dataset.kplexPath===target.path;
  await until(()=>arrived(pages[0]),'Initial Mind Map root absent');
  for(const [kind,target]of [['history',pages[1]],['pin',pages[2]]]){
   const attr=kind==='history'?'kplexHistoryPath':'kplexPinnedPath',selector=kind==='history'?'[data-kplex-history-path]':'[data-kplex-pinned-path]';
   const button=[...root().querySelectorAll(selector)].find(el=>el.dataset[attr]===target.path);check(button&&!button.disabled,'Actual saved button absent');button.click();await until(()=>arrived(target),'Saved '+kind+' did not reroot Mind Map');cases.push({id:'native-saved-button-reroot',kind});
  }
  const surface=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===host)?.[0];
  for(const [action,target]of [['history.open',pages[0]],['pins.open',pages[1]]]){
   await p.actionManager.dispatch({id:action,source:'internal',surfaceId:surface});await until(()=>doc.querySelector('.prompt-input'),'Native saved picker absent');
   const input=doc.querySelector('.prompt-input');input.value=p.index.titleFor(target);input.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));
   await until(()=>doc.querySelector('.suggestion-item')?.textContent.includes(p.index.titleFor(target)),'Exact saved picker result absent');input.focus();
   for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'Enter'});
   await until(()=>!doc.querySelector('.prompt-input')&&arrived(target),'Saved picker did not reroot Mind Map');cases.push({id:'native-saved-picker-reroot',action});
  }
  check(!session.editors.bindings.length,'Saved navigation unexpectedly created an editor');return {cases,notesEdited:false,host:{electron:process.versions.electron,chrome:process.versions.chrome}};
 }finally{
  // The only modal this scenario opens is its own captured saved-target picker.
  if(documentsafe(host)?.querySelector('.prompt-input'))for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'Escape'});
  if(host&&workspace.getLeafById(host.id)===host)host.detach();p.settings=original;await p.saveSettings(false,false);p.savedSettingsPolicy=policy;
  await workspace.changeLayout(layout);native.setBounds(bounds);if(maximized)native.maximize();await p.settingsWriteQueue;await new Promise(resolve=>window.setTimeout(resolve,500));await app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData);
 }
 /** Access only the still-owned view document during independent cleanup. */
 function documentsafe(leaf){return leaf?.view.containerEl.ownerDocument;}
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const definitions='c.originalData='+JSON.stringify(readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8'))+';';
await runControlledProbe('rooted-saved-navigation',scenario,definitions,['src/ui/PlexGraph.tsx','src/ui/App.tsx','src/application/ActionManager.ts']);
