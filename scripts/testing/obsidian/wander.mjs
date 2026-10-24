/**
 * Exact-build Wander/navigation acceptance in the explicit disposable small vault. Temporary
 * fixtures, native input, observers and settings belong to this driver and are restored on failure.
 * Actual native keyframes/geometry establish functional motion, not subjective paint or touch quality.
 */
import assert from 'node:assert/strict';
import {spawnNativeSync as spawnSync,obsidianCliExecutable} from './processTools.mjs';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateTarget} from './runner.mjs';
const projectRoot=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const vaultName=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName,'kplex-test-small','Select the disposable small vault explicitly');
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;
assert(output&&(!existsSync(output)||!readdirSync(output).length),'Choose a fresh report directory');mkdirSync(output,{recursive:true});
const driver=readFileSync(fileURLToPath(import.meta.url));writeFileSync(join(output,'driver-source.mjs'),driver);
const report={status:'running',startedAt:new Date().toISOString(),node:process.version,driverSha256:createHash('sha256').update(driver).digest('hex'),artifacts:{},scenarios:[],limitations:['Electron input and observed native geometry/keyframes are functional evidence; physical touch and perceived paint remain separate.']};
const configurations=['data.json','community-plugins.json'].map(name=>{const path=name==='data.json'?join(target.pluginDir,name):join(target.config,name);return{path,bytes:existsSync(path)?readFileSync(path):null}});
/** Reject native eval errors even when CLI returns zero. */
function cli(command,...args){const r=spawnSync(obsidianCliExecutable(),[`vault=${vaultName}`,command,...args],{cwd:projectRoot,encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw r.error??Error(r.stderr||r.stdout);return r.stdout.trim()}
/** Read detached JSON observations instead of retaining renderer objects. */
function evaluate(code){return JSON.parse(cli('eval',`code=${code}`).replace(/^=>\s*/,''))}
/** Poll briefly without blocking the renderer or changing its throttling. */
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Install a cancellable test-only owner; no product debug API is introduced. */
function probe(){
 const p=app.plugins.plugins['k-plex'],remote=require('@electron/remote'),win=remote.getCurrentWindow();
 if(!p?.actionManager||window.__kplexWanderProbe||app.setting.isOpen||document.querySelector('.modal-container,.menu'))throw Error('Clean loaded native prerequisites required');
 const c=window.__kplexWanderProbe={originalSettings:JSON.parse(JSON.stringify(p.settings)),layout:app.workspace.getLayout(),originalModes:app.workspace.getLeavesOfType('k-plex-react-view').map(leaf=>({leaf,state:leaf.view.displayModes?.getSnapshot()})),cases:[],owned:false,done:false,cancelled:false};
 const folder='__kplex_wander_native';
 /** Refuse late fixture/input work after external cleanup retires the task. */
 const check=(value,label)=>{if(c.cancelled)throw Error('Retired Wander probe');if(!value)throw Error(label)};
 /** Use finite, cancellation-aware host observations. */
 const wait=async ms=>{check(true,'active');await new Promise(resolve=>window.setTimeout(resolve,ms));check(true,'active')};
 /** Wait for actual scene/render state without substituting global index counts. */
 const until=async(predicate,label,ms=30000)=>{const end=Date.now()+ms;while(!predicate()){check(Date.now()<end,label);await wait(25)}};
 /** Record complete passed assertions only. */
 const passed=(id,details={})=>c.cases.push({id,status:'passed',...details});
 let leaf,surface,root;
 /** Reacquire the exact native surface generation whenever the view is replaced. */
 const acquire=()=>{leaf=app.workspace.getLeavesOfType('k-plex-react-view').find(item=>item.view.contentEl.ownerDocument===document&&p.isKplexLeafVisible(item));root=leaf?.view.contentEl.querySelector('.kplex-app');surface=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===leaf)?.[0];return Boolean(root&&surface)};
 /** Dispatch all actions through the production catalog and its owning native surface. */
 const action=async id=>{const result=await p.actionManager.dispatch({id,source:'toolbar',surfaceId:surface});check(result.status==='completed',`Action ${id}: ${result.status}`)};
 /** Read normal center/history rather than a second Wander route model. */
 const center=()=>p.actionManager.readSnapshot(surface)?.center?.identity;
 /** Deliver a trusted native pointer gesture to the actual hit-tested control. */
 const click=async element=>{check(element?.getClientRects().length,'Visible control required');const r=element.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);check(element.contains(document.elementFromPoint(x,y)),'Control obscured');win.webContents.sendInputEvent({type:'mouseMove',x,y});win.webContents.sendInputEvent({type:'mouseDown',x,y,button:'left',clickCount:1});win.webContents.sendInputEvent({type:'mouseUp',x,y,button:'left',clickCount:1});await wait(100)};
 /** Escape uses the actual native Scope/DOM delivery, including toolbar focus. */
 const key=async(element,value)=>{element.focus({preventScroll:true});win.webContents.sendInputEvent({type:'keyDown',keyCode:value});win.webContents.sendInputEvent({type:'keyUp',keyCode:value});await wait(100)};
 /** Observe buttons using their localized accessible names in this exact Plex. */
 const playback=()=>root?.querySelector('.kplex-wander-controls button:nth-child(2)');
 const paused=()=>playback()?.getAttribute('aria-label')===p.translator('wander.play');
 /** Navigate via the ordinary plugin notification and wait for the real destination scene. */
 const navigate=async name=>{p.notifyNavigation(`${folder}/${name}.md`);await until(()=>center()===`${folder}/${name}.md`&&root.querySelector('.kplex-role-center'),'Native center missing');await wait(1200)};
 /** Restore original preferences/layout and remove only this driver's owned fixtures. */
 c.cleanup=async()=>{
  c.cancelled=true;p.dismissKplexMenu();
  for(const [id] of p.actionSurfaceHosts)await p.actionManager.dispatch({id:'view.wander.stop',source:'internal',surfaceId:id});
  for(const {leaf:owner,state} of c.originalModes){if(state&&owner.view.displayModes){const modes=owner.view.displayModes;if(modes.getSnapshot().fullscreen!==state.fullscreen)modes.toggleFullscreen();modes.setZen(state.zen)}}
  if(c.observer)c.observer.disconnect();
  if(c.menuOriginal)p.showKplexMenuAtMouseEvent=c.menuOriginal;
  if(c.matchMediaDescriptor)Object.defineProperty(window,'matchMedia',c.matchMediaDescriptor);else if(c.matchMediaOriginal){delete window.matchMedia;c.matchMediaOriginal=null}
  Object.assign(p.settings,c.originalSettings);await p.saveSettings(false,false);p.index.notifyPresentation();
  if(c.originalSettings.lastActivePath)p.notifyNavigation(c.originalSettings.lastActivePath);
  if(c.owned){const entry=app.vault.getFolderByPath(folder);if(entry)await app.vault.delete(entry,true);c.owned=false}
  await app.workspace.changeLayout(c.layout);c.cleaned=true;
 };
 c.task=new Promise(resolve=>window.setTimeout(resolve,0)).then(async()=>{
  remote.app.focus({steal:true});win.show();win.focus();win.webContents.focus();await until(()=>document.hasFocus()&&!document.hidden,'Native foreground unavailable',5000);
  check(acquire(),'Mounted main-window Plex required');leaf.view.displayModes.setZen(false);check(!app.vault.getFolderByPath(folder),'Fixture collision');await app.vault.createFolder(folder);c.owned=true;
  p.settings.embedCentralNode=false;p.settings.showFolderNodes=false;p.settings.showTagNodes=false;p.settings.renderSiblings=false;p.settings.showAttachments=true;p.settings.animationSpeed=1;p.settings.allowAutozoom=false;
  const children=p.settings.hierarchy.children[0];check(children,'Configured child ontology required');
  await app.vault.createBinary(`${folder}/Image.png`,Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5X8AAAAASUVORK5CYII='),char=>char.charCodeAt(0)).buffer);
  for(const [name,links] of [['A',['B','D','Image.png']],['B',['C']],['C',[]],['D',['E','Image.png']],['E',[]]]){
   const body=links.length?`---\n${JSON.stringify(children)}:\n${links.map(next=>`  - "[[${folder}/${next}]]"`).join('\n')}\n---\n`:'';
   const file=await app.vault.create(`${folder}/${name}.md`,body+`# ${name}\n`);p.index.insertCreatedFile(file);
  }
  p.index.insertCreatedFile(app.vault.getFileByPath(`${folder}/Image.png`));
  p.index.notifyPresentation();await wait(500);await navigate('A');
  await until(()=>root.querySelectorAll('[data-kplex-path]').length>=4,'Fixture neighbors unavailable');
  /** Inspect only the current production port exposed as React composition props, without adding a product global. */
  const graphPorts=()=>{const element=root.querySelector('.kplex-plex'),key=Object.keys(element).find(key=>key.startsWith('__reactFiber$'));for(let fiber=element[key];fiber;fiber=fiber.return){if(fiber.memoizedProps?.actionPorts)return fiber.memoizedProps.actionPorts.current}return null};
  check(graphPorts()?.readWanderScene().candidates.some(item=>item.node.identity===`${folder}/Image.png`&&item.node.kind==='file'),'Attachment excluded from Wander projection');passed('attachment-projection-eligibility');
  await action('view.zoom-out');await wait(100);const camera=root.querySelector('.kplex-camera').style.transform;
  const target=root.querySelector(`[data-kplex-path="${folder}/B.md"]`);check(target,'Displayed destination required');const before=target.getBoundingClientRect();
  // Observe real arrival immediately after React lays out the replacement center.
  c.motion=[];c.observer=new MutationObserver(()=>{
   const node=root.querySelector('.kplex-role-center');if(node?.dataset.kplexPath!==`${folder}/B.md`)return;
   for(const animation of node.getAnimations()){const frames=animation.effect.getKeyframes();if(frames.length===5)c.motion.push({frames:frames.map(f=>f.transform),duration:animation.effect.getTiming().duration,rect:{left:node.getBoundingClientRect().left,top:node.getBoundingClientRect().top}})}
  });c.observer.observe(root,{subtree:true,childList:true,attributes:true});
  p.notifyNavigation(`${folder}/B.md`);await until(()=>c.motion.length,'Curved shared center animation missing');await wait(1300);
  check(root.querySelector('.kplex-camera').style.transform===camera,'Autozoom-off scale/pan unexpectedly changed');
  const node=root.querySelector('.kplex-role-center');check(!node.getAnimations().length,'Finished center animation retained');
  passed('shared-center-arrival',{source:{left:before.left,top:before.top},keyframes:c.motion[0].frames,duration:c.motion[0].duration});c.observer.disconnect();
  await navigate('A');root.focus({preventScroll:true});check(app.commands.executeCommandById('k-plex:kplex-wander'),'Published native Wander command missing');await until(()=>root.querySelector('.kplex-wander-controls'),'Wander controls absent');check(leaf.view.displayModes.getSnapshot().zen,'Wander failed to enter Zen');
  await action('view.wander.start');check(root.querySelectorAll('.kplex-wander-controls').length===1,'Duplicate Wander controls');passed('native-command-and-idempotent-start');
  win.webContents.sendInputEvent({type:'mouseMove',x:0,y:0});await wait(100);
  const buttonStyle=getComputedStyle(playback()),zoomStyle=getComputedStyle(root.querySelector('.kplex-zoom-controls button'));
  for(const property of ['backgroundColor','color','height','width','borderRadius'])check(buttonStyle[property]===zoomStyle[property],`Wander button differs from Plex ${property}`);
  const pace=root.querySelector('.kplex-wander-controls input');check(pace.closest('.kplex-density-rail')&&getComputedStyle(pace).appearance==='none','Wander bypassed the Plex layout slider');passed('native-shared-plex-controls');
  c.menuOriginal=p.showKplexMenuAtMouseEvent;
  p.showKplexMenuAtMouseEvent=function(menu,event,hostLeaf){menu.setUseNativeMenu(false);return c.menuOriginal.call(this,menu,event,hostLeaf)};
  const graphRect=root.querySelector('.kplex-plex').getBoundingClientRect(),menuX=Math.round(graphRect.left+10),menuY=Math.round(graphRect.top+10);
  win.webContents.sendInputEvent({type:'mouseDown',x:menuX,y:menuY,button:'right',clickCount:1});win.webContents.sendInputEvent({type:'mouseUp',x:menuX,y:menuY,button:'right',clickCount:1});
  await until(()=>[...document.querySelectorAll('.menu-item')].some(item=>item.textContent.trim()===p.translator('actions.view.wander.start')),'Plex context Wander entry missing');
  check(paused(),'Opening Plex menu did not auto-pause');await click([...document.querySelectorAll('.menu-item')].find(item=>item.textContent.trim()===p.translator('actions.view.wander.start')));check(!paused(),'Context menu did not resume the same session');p.showKplexMenuAtMouseEvent=c.menuOriginal;c.menuOriginal=null;passed('native-plex-context-menu',{backend:'Obsidian DOM menu with trusted Electron input'});
  const slider=root.querySelector('.kplex-wander-controls input');check(slider.min==='3'&&slider.max==='15','Pace range incorrect');
  const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;setter.call(slider,'3');slider.dispatchEvent(new Event('input',{bubbles:true}));slider.dispatchEvent(new Event('change',{bubbles:true}));
  await until(()=>root.querySelector('.is-keyboard-selected'),'Preselection missing');await until(()=>center()!==`${folder}/A.md`,'Wander did not navigate',15000);
  check(!paused(),'Wander self-navigation incorrectly paused');check(p.settings.navigationHistory.at(-1)===center(),'Wander skipped normal history');passed('start-preselect-history-and-self-navigation');
  await click(playback());check(paused(),'Explicit Pause failed');const held=center();await wait(3400);check(center()===held,'Pause allowed late move');
  await navigate('D');check(paused(),'Manual navigation resumed Wander');await click(playback());check(!paused(),'Play did not resume');await until(()=>center()!==`${folder}/D.md`,'Resume ignored current center',15000);passed('pause-manual-center-resume');
  await click(root.querySelector('.kplex-role-center'));check(paused(),'Node interaction failed to auto-pause');passed('native-pointer-auto-pause');
  await navigate('A');await click(playback());await action('view.center-editor.toggle');check(paused(),'Entering native editor did not pause Wander');
  await until(()=>root.querySelector('.kplex-central-editor-content')&&!root.querySelector('.kplex-central-editor-status'),'Native central editor unavailable');
  const editor=root.querySelector('.kplex-central-editor-content');check(editor.querySelector('.markdown-source-view,.markdown-preview-view'),'Native Markdown view replaced');
  await click(playback());check(!paused(),'Play failed with native editor open');await click(editor.querySelector('.kplex-central-editor-toolbar button'));check(paused(),'Native read/edit toggle did not auto-pause');
  await action('view.center-editor.toggle');await until(()=>!root.querySelector('.kplex-central-editor-content'),'Native editor failed to collapse');passed('native-editor-read-edit-auto-pause');
  await click(playback());await key(root,'Escape');check(!root.querySelector('.kplex-wander-controls'),'Escape failed to stop Wander');check(!leaf.view.displayModes.getSnapshot().zen,'Escape failed to restore non-Zen entry');passed('escape-restores-entry-zen');
  leaf.view.displayModes.setZen(true);await action('view.wander.start');await wait(150);await action('view.wander.stop');check(leaf.view.displayModes.getSnapshot().zen,'Stop failed to preserve preexisting Zen');passed('preexisting-zen-restored');
  leaf.view.displayModes.setZen(false);await action('view.fullscreen.toggle');await action('view.wander.start');await wait(150);await action('view.wander.stop');check(leaf.view.displayModes.getSnapshot().fullscreen,'Wander changed fullscreen');await action('view.fullscreen.toggle');passed('fullscreen-independent');
  await action('view.wander.start');await wait(150);await action('view.wander.stop');const stopped=center();await wait(3500);check(center()===stopped,'Stop allowed stale navigation');passed('stop-during-anticipation');
  await navigate('A');await action('view.wander.start');
  await until(()=>center()!==`${folder}/A.md`&&root.querySelector('.kplex-role-center').getAnimations().some(animation=>animation.effect.getKeyframes().length===5),'Active Wander arrival missing');
  await action('view.wander.stop');const flightStopped=center();c.stopAnimations=root.querySelector('.kplex-role-center').getAnimations().map(animation=>({type:animation.constructor.name,name:animation.animationName,property:animation.transitionProperty,frames:animation.effect.getKeyframes(),duration:animation.effect.getTiming().duration}));
  check(!c.stopAnimations.some(animation=>animation.frames.some(frame=>frame.transform&&frame.transform!=='none')),'Stop retained spatial arrival motion');
  await wait(3500);check(center()===flightStopped&&!root.querySelector('.kplex-wander-controls'),'Stop during flight allowed late work');passed('stop-during-arrival');
  p.settings.animationSpeed=0;p.index.notifyPresentation();await navigate('A');p.notifyNavigation(`${folder}/B.md`);await wait(50);check(!root.querySelector('.kplex-role-center').getAnimations().length,'Animation-off produced spatial arrival');passed('animation-off');
  p.settings.animationSpeed=1;p.index.notifyPresentation();await navigate('A');c.matchMediaDescriptor=Object.getOwnPropertyDescriptor(window,'matchMedia');c.matchMediaOriginal=window.matchMedia;
  window.matchMedia=function(query){const result=c.matchMediaOriginal.call(window,query);return query==='(prefers-reduced-motion: reduce)'?new Proxy(result,{get:(target,key)=>key==='matches'?true:typeof target[key]==='function'?target[key].bind(target):target[key]}):result};
  p.notifyNavigation(`${folder}/B.md`);await wait(50);check(!root.querySelector('.kplex-role-center').getAnimations().length,'Reduced-motion produced spatial arrival');
  if(c.matchMediaDescriptor)Object.defineProperty(window,'matchMedia',c.matchMediaDescriptor);else delete window.matchMedia;c.matchMediaDescriptor=null;c.matchMediaOriginal=null;passed('reduced-motion');
  const mainParent=leaf.parent,mainRoot=root,mainSurface=surface;await action('view.wander.start');await wait(150);app.workspace.moveLeafToPopout(leaf);
  await until(()=>leaf.view.contentEl.ownerDocument!==document&&leaf.view.contentEl.querySelector('.kplex-app')!==mainRoot&&[...p.actionSurfaceHosts].some(([id,entry])=>entry.leaf===leaf&&id!==mainSurface),'Main-to-popout remount missing');
  const popDoc=leaf.view.contentEl.ownerDocument;await until(()=>popDoc.body.style.getPropertyValue('--zoom-factor'),'Popout native chrome not initialized');await leaf.view.waitUntilReady();
  const popRoot=leaf.view.contentEl.querySelector('.kplex-app'),popSurface=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===leaf)?.[0];
  check(!popRoot.querySelector('.kplex-wander-controls')&&!leaf.view.displayModes.getSnapshot().zen,'Migration retained Wander or entry Zen');
  await p.actionManager.dispatch({id:'view.wander.start',source:'toolbar',surfaceId:popSurface});await until(()=>popRoot.querySelector('.kplex-wander-controls'),'Popout Wander unavailable');
  check(popRoot.querySelector('.kplex-wander-controls').ownerDocument===popDoc,'Popout controls used wrong document');
  leaf.parent.removeChild(leaf);mainParent.insertChild(mainParent.children.length,leaf);await app.workspace.revealLeaf(leaf);app.workspace.setActiveLeaf(leaf,{focus:true});
  await until(()=>leaf.view.contentEl.ownerDocument===document&&leaf.view.contentEl.querySelector('.kplex-app')!==popRoot&&acquire()&&surface!==popSurface,'Popout-to-main remount missing');
  check(!root.querySelector('.kplex-wander-controls')&&!leaf.view.displayModes.getSnapshot().zen,'Return migration retained Wander');const migrated=center();await wait(3500);check(center()===migrated,'Retired popout timer navigated main view');passed('two-way-popout-session-retirement');

 }).then(()=>{c.done=true},error=>{c.error=String(error?.stack??error);c.done=true});
 return {installed:true};
}
let installed=false;
try{
 assert.equal(cli('vault','info=path'),target.vault);
 report.obsidian=cli('version');cli('dev:errors','clear');
 for(const name of ['main.js','styles.css','manifest.json']){const built=readFileSync(join(projectRoot,'dist',name)),actual=readFileSync(join(target.pluginDir,name));assert(built.equals(actual),`Installed ${name} mismatch`);report.artifacts[name]=createHash('sha256').update(actual).digest('hex')}
 cli('command','id=k-plex:kplex-start');await delay(1000);evaluate(`JSON.stringify((${probe.toString()})())`);installed=true;
 const end=Date.now()+180000;
 while(true){const state=evaluate('JSON.stringify((()=>{const c=window.__kplexWanderProbe;return {done:c?.done,error:c?.error,cases:c?.cases,stopAnimations:c?.stopAnimations}})())');report.scenarios=state.cases??[];if(state.stopAnimations)report.stopAnimations=state.stopAnimations;if(state.done){if(state.error)throw Error(state.error);break}assert(Date.now()<end,'Native Wander deadline exceeded');await delay(500)}
 report.nativeErrors=cli('dev:errors');assert(!report.nativeErrors||/^No errors captured\.?$/i.test(report.nativeErrors),'Native JavaScript errors captured');
 report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack??error)}
finally{
 if(installed){try{evaluate('(()=>{const c=window.__kplexWanderProbe;c.cleanup().then(()=>{c.cleanupDone=true},error=>{c.cleanupError=String(error);c.cleanupDone=true});return JSON.stringify(true)})()');const end=Date.now()+30000;while(true){const s=evaluate('JSON.stringify({done:window.__kplexWanderProbe?.cleanupDone,error:window.__kplexWanderProbe?.cleanupError})');if(s.done){assert(!s.error,s.error);break}assert(Date.now()<end,'Native cleanup timeout');await delay(250)}evaluate('JSON.stringify(delete window.__kplexWanderProbe)');report.cleaned=true}catch(error){report.status='failed';report.cleanupError=String(error.stack??error)}}
 for(const item of configurations){if(item.bytes)writeFileSync(item.path,item.bytes);else if(existsSync(item.path))unlinkSync(item.path)}
 report.finishedAt=new Date().toISOString();
 writeFileSync(join(output,'wander-native.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(`Wander native ${report.status}; ${report.scenarios.length} passed scenarios; ${join(output,'wander-native.json')}`);if(report.error)console.error(report.error);if(report.cleanupError)console.error(report.cleanupError);if(report.status!=='passed')process.exitCode=1;
