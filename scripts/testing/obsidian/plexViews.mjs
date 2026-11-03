/**
 * Exact-build native proof for internal view policies. Reuses the guarded Small controller,
 * real editor/actions/Sidecars and the test-only portable definition. Temporary registration
 * is maintenance-only; the shipped registry remains Classic-only. Restores every owned leaf,
 * fixture, wrapper, workspace and settings independently of scenario success.
 */
import {buildSync} from 'esbuild';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';

/** Exercise compatible view changes without substituting native document or semantic owners. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace,withEditor=c.lane!=='pairs',withPairs=c.lane!=='editor';
 if(!p||app.vault.getFiles().length>=1000||app.setting.isOpen)throw Error('Clean disposable Small required');
 const settings=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout();
 const folder='Kplex-215-Views-'+Date.now(),path=name=>folder+'/'+name+'.md',files=[],hosts=[],releases=[],restores=[];
 let createdFolder,failure;const cases=[],cleanup=[],embedded=new Set();
 /** Every wait fences the controller so timeout retirement cannot resume native mutations. */
 const check=(value,message)=>{if(c.closed||!value)throw Error(message)};
 const wait=async ms=>{check(true,'Retired controller');await new Promise(resolve=>window.setTimeout(resolve,ms));check(true,'Retired controller')};
 const until=async(read,message)=>{const end=Date.now()+20000;while(!read()){check(Date.now()<end,message);await wait(40)}};
 const root=host=>host.view.contentEl.querySelector('.kplex-app');
 const center=host=>root(host)?.querySelector('.kplex-role-center')?.dataset.kplexPath;
 /** Forward native methods unchanged while counting only the settled view-switch interval. */
 const observe=(owner,key,counters)=>{const original=owner[key];check(typeof original==='function','Missing observer '+key);owner[key]=function(...args){counters[key]=(counters[key]??0)+1;return original.apply(this,args)};const restore=()=>{owner[key]=original};restores.push(restore);return restore};
 try{
  await until(()=>!p.isStartupInitializing(),'Startup ownership did not settle');
  const remote=require('@electron/remote'),win=remote.getCurrentWindow();remote.app.focus({steal:true});win.show();win.focus();win.webContents.focus();
  await until(()=>!document.hidden,'Native foreground unavailable');
  createdFolder=await app.vault.createFolder(folder);
  const child=p.settings.hierarchy.children[0];check(child,'Configured child ontology required');
  for(const name of ['Focus','Other','Root','Repeated']){const file=await app.vault.create(path(name),name==='Root'?`---\n${JSON.stringify(child)}: "[[${path('Repeated')}]]"\n---\n# Root\n`:`# ${name}\n\nDisposable native editor fixture.\n`);files.push(file);p.index.insertCreatedFile(file);releases.push(p.index.acquireSemanticDemand(file.path))}
  await until(()=>files.every(file=>app.metadataCache.getFileCache(file))&&!p.index.hasPendingSemanticPreparation(),'Fixture preparation did not settle');
  Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,embedCentralNode:withEditor,autoOpenCentralDocument:false,followActiveFile:false,centralNodeMarkdownMode:'source',animationSpeed:0,graphDepth:1,renderSiblings:false,showPageNodes:true,showInferredNodes:true,showFolderNodes:false,showTagNodes:false,graphLenses:[],applyPowerFilter:false});
  p.index.notifyPresentation();
  await until(()=>p.index.get(path('Root'))&&p.index.neighbours(p.index.get(path('Root')),'child').some(row=>row.page.path===path('Repeated')),'Cached native semantic witness absent');
  const hostA=workspace.getLeaf('tab');hosts.push(hostA);
  const prototype=Object.getPrototypeOf(hostA),originalSetState=prototype.setViewState;
  prototype.setViewState=function(...args){if(this.containerEl.closest('.kplex-central-editor-leaf-host'))embedded.add(this);return originalSetState.apply(this,args)};
  restores.push(()=>{prototype.setViewState=originalSetState});
  await hostA.setViewState({type:'k-plex-react-view',active:true});await hostA.view.waitUntilReady();
  hostA.view.centerPresentation.update({embedCentralNode:withEditor,centralNodeMarkdownMode:'source'});p.notifyNavigation(path('Focus'),hostA);
  await until(()=>center(hostA)===path('Focus'),'First attention did not render');
  if(withEditor)await until(()=>root(hostA)?.querySelector('.kplex-central-editor-content .cm-content'),'Single native source editor absent');
  let hostB,sideA,sideB;
  if(withPairs){
   hostB=workspace.createLeafBySplit(hostA,'vertical',false);hosts.push(hostB);await hostB.setViewState({type:'k-plex-react-view',active:true});await hostB.view.waitUntilReady();
   hostB.view.centerPresentation.update({embedCentralNode:withEditor,centralNodeMarkdownMode:'source'});
   for(const [host,name]of[[hostA,'Focus'],[hostB,'Other']]){p.notifyNavigation(path(name),host);await until(()=>center(host)===path(name),'Attention did not render');await p.openSidecar(host,p.index.get(path(name)))}
   sideA=p.sidecarLeaves.get(hostA);sideB=p.sidecarLeaves.get(hostB);check(sideA&&sideB&&sideA!==sideB,'Independent native companions required');
  }
  await workspace.revealLeaf(hostA);
  let content,editorLeaf,editor,editorElement;
  if(withEditor){
   await until(()=>root(hostA)?.querySelector('.kplex-central-editor-content .cm-content'),'Native source editor absent');
   content=root(hostA).querySelector('.kplex-central-editor-content .cm-content');content.focus();
   await until(()=>workspace.activeLeaf?.view.editor&&root(hostA).querySelector('.kplex-central-editor-leaf-host')?.contains(workspace.activeLeaf.view.containerEl),'Embedded native leaf did not own focus');
   editorLeaf=workspace.activeLeaf;editor=editorLeaf.view.editor;editorElement=root(hostA).querySelector('.kplex-central-editor-content');
  }
  if(c.editorControlOnly)return{control:'two-native-editors-and-pairs-before-view-switch',sourceReady:true};
  const a=hostA.view.documentSession.plexView,b=hostB?.view.documentSession.plexView,original=a.registry;
  const probe=c.createProbe({root:path('Root'),repeated:path('Repeated')});
  const bad={...probe,id:'test.failed',layout(){throw Error('Deliberate native scene failure')}};
  const unavailable={...probe,id:'test.unavailable',project(){return null}};
  const noEditor={...probe,id:'test.no-editor',capabilities:{...probe.capabilities,editor:false}};
  a.registry=new original.constructor([...original.available,probe,bad,noEditor,unavailable]);restores.push(()=>{a.recover();a.registry=original});
  await until(()=>!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Settled semantic scope required');
  c.progress={phase:'compatible-switches'};
  if(withEditor)await until(()=>hosts.every(host=>root(host)?.querySelector('.kplex-central-editor-content .cm-content')),'Both native source editors must finish opening');
  await p.index.resolveNodeVisuals(files.map(file=>p.index.get(file.path)).filter(Boolean));
  await p.settingsWriteQueue;await wait(300);
  const trail=hostA.view.documentSession.footprints,trailLength=trail.length,work={read:0,cachedRead:0,parse:0,acquireSemanticDemand:0,saveSettings:0};
  const stop=[observe(app.vault,'read',work),observe(app.vault,'cachedRead',work),observe(p.index.metadataParser,'parse',work),observe(p.index,'acquireSemanticDemand',work),observe(p,'saveSettings',work)];
  await wait(100);for(const [key,value]of Object.entries(work))check(value===0,'Quiet control performed '+key+': '+value);
  const quietWork={...work};
  const beforeShell=root(hostA).querySelector('.kplex-plex');
  const surface=[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===hostA)?.[0];check(surface,'Exact native action surface absent');
  const prepared=p.actionManager.prepare({id:'node.activate',source:'internal',surfaceId:surface,target:{kind:'explicit',node:p.actionManager.readSnapshot(surface).center}});
  check(prepared.state==='accepted','Captured native action was not accepted');let staleStatus;

  for(const id of ['test.situated','classic','test.situated']){
   a.select(id);if(staleStatus===undefined){staleStatus=(await prepared.run()).status;check(staleStatus==='cancelled','Prepared action survived synchronous view retirement')}
   await until(()=>id==='classic'?!root(hostA).querySelector('[data-kplex-keyboard-id="look-here"]')&&center(hostA)===path('Focus'):root(hostA).querySelectorAll('[data-kplex-keyboard-id="repeat-above"]').length===1,'Selected view did not render');
   if(id!=='classic')check(root(hostA).querySelector('[data-kplex-edge-id="real-child"]'),'Semantic occurrence edge missing');
   if(withEditor)check(root(hostA).querySelector('.kplex-central-editor-content')===editorElement&&editorLeaf.view.editor===editor,'View change replaced native editor');
   check(root(hostA).querySelector('.kplex-plex')===beforeShell,'View change replaced shared canvas shell');
   if(withPairs)check(p.sidecarLeaves.get(hostA)===sideA&&p.sidecarLeaves.get(hostB)===sideB&&b.definition.id==='classic','View change crossed native pair/session ownership');
  }
  for(const restore of stop)restore();
  for(const [key,value]of Object.entries(work))check(value===0,'Same-scope switching performed '+key+': '+value);
  check(trail===hostA.view.documentSession.footprints&&trail.length===trailLength,'View switch recorded a navigation visit');
  cases.push({id:'compatible-switch-'+c.lane+'-zero-source-work',work,quietWork,staleStatus,editorRetained:withEditor,pairsRetained:withPairs});
  if(withEditor){
  c.progress={phase:'dirty-editor',cases};
  content.focus();const marker='\nKplex-215-native-edit\n';editor.replaceRange(marker,editor.getCursor('to'));
  const markerLine=editor.getValue().split('\n').findIndex(line=>line.includes('Kplex-215-native-edit'));check(markerLine>=0,'Owned native edit missing');editor.setCursor({line:markerLine,ch:5});
  const cursor=editor.getCursor(),value=editor.getValue(),dirtyAtSwitch=!(await app.vault.read(files.find(file=>file.path===path('Focus')))).includes('Kplex-215-native-edit');
  check(dirtyAtSwitch,'Dirty-editor precondition was not observed');a.select('classic');
  await until(()=>!root(hostA).querySelector('[data-kplex-keyboard-id="look-here"]')&&center(hostA)===path('Focus'),'Dirty Classic switch did not render');
  a.select('test.situated');
  await until(()=>root(hostA).querySelector('[data-kplex-keyboard-id="repeat-above"]'),'Dirty switch did not settle');
  check(editorLeaf.view.editor===editor&&editor.getValue()===value&&JSON.stringify(editor.getCursor())===JSON.stringify(cursor)&&editorElement.contains(document.activeElement),'Dirty native editor/caret/focus changed');
  a.select('test.no-editor');check(a.definition.id==='test.situated','Incompatible view destroyed a live editor');
  a.select('test.failed');await until(()=>root(hostA).querySelector('.kplex-view-error'),'Failed definition recovery absent');
  check(root(hostA).querySelector('.kplex-central-editor-content')===editorElement&&editor.getValue()===value&&editorElement.contains(document.activeElement),'Failure replaced or lost native editor/focus');
  a.recover();await until(()=>!root(hostA).querySelector('.kplex-view-error'),'Classic recovery failed');
  a.select('test.unavailable');await until(()=>root(hostA).querySelector('.kplex-view-error'),'Unavailable definition did not retain recovery');
  check(root(hostA).querySelector('.kplex-central-editor-content')===editorElement&&editor.getValue()===value,'Unavailable projection removed native editor');
  a.recover();await until(()=>!root(hostA).querySelector('.kplex-view-error'),'Unavailable recovery failed');
  cases.push({id:'dirty-editor-caret-incompatible-view-and-failure-recovery',dirtyAtSwitch,editorRetained:true});
  }
  a.select('test.situated');await until(()=>root(hostA).querySelector('[data-kplex-keyboard-id="repeat-below"]'),'Probe did not return');
  check(root(hostA).querySelectorAll(`[data-kplex-path="${path('Repeated')}"]`).length===2,'Duplicate canonical occurrences collapsed');
  c.progress={phase:'popout',cases};
  const session=hostA.view.documentSession;
  check(typeof workspace.moveLeafToPopout==='function','Native popout migration API missing');workspace.moveLeafToPopout(hostA);
  await until(()=>hostA.view.contentEl.ownerDocument!==document&&root(hostA)?.querySelector('[data-kplex-keyboard-id="repeat-above"]'),'Popout remount did not restore view selection');
  await hostA.view.waitUntilReady();check(hostA.view.documentSession===session&&a.definition.id==='test.situated','Popout replaced native view session');
  const parents=[];workspace.iterateRootLeaves(leaf=>{if(leaf!==hostA&&leaf.view.containerEl.ownerDocument===document&&leaf.view.containerEl.isConnected)parents.push(leaf.parent)});check(parents.length,'Main native parent missing');
  hostA.parent.removeChild(hostA);parents[0].insertChild(parents[0].children.length,hostA);await workspace.revealLeaf(hostA);await hostA.view.waitUntilReady();
  await until(()=>hostA.view.contentEl.ownerDocument===document&&root(hostA)?.querySelector('[data-kplex-keyboard-id="repeat-above"]'),'Main return did not retain selected view');
  check(hostA.view.documentSession===session,'Main return replaced native session');cases.push({id:'popout-main-remount-retains-selected-view-and-canonical-occurrences'});
  a.recover();c.progress={phase:'complete',cases};return{lane:c.lane,cases,cleanup,host:{node:process.version,electron:process.versions.electron,chrome:process.versions.chrome,rendererPid:process.pid,hidden:document.hidden},limitations:['Native Electron automation; physical Windows/phone/tablet interaction remains separate.']};
 }catch(error){c.progress={...c.progress,embedded:[...embedded].map(leaf=>({type:leaf.view?.getViewType(),state:leaf.getViewState()?.state?.mode,editor:!!leaf.view?.editor,domType:leaf.view?.containerEl.dataset.type,deferred:leaf.view?.constructor?.name})),nativeEditors:hosts.map(host=>({mode:host.view.centerPresentation?.getSnapshot(),editor:!!root(host)?.querySelector('.kplex-central-editor-content'),source:!!root(host)?.querySelector('.cm-content'),status:root(host)?.querySelector('.kplex-central-editor-status')?.textContent,kinds:[...root(host)?.querySelectorAll('.kplex-central-editor-leaf-host [data-type]')??[]].map(el=>el.dataset.type),failure:!!root(host)?.querySelector('.kplex-view-error')}))};failure=error;throw error}
 finally{
  const errors=[];
  /** Attribute teardown failures without altering the native operation, timeout or assertions. */
  const clean=async(label,action)=>{const start=Date.now();try{await action();cleanup.push({label,status:'passed',elapsedMs:Date.now()-start})}catch(error){const message=String(error);cleanup.push({label,status:'failed',elapsedMs:Date.now()-start,error:message});errors.push(label+': '+message)}c.progress={...c.progress,cleanup}};
  for(const [i,restore]of restores.reverse().entries())await clean('restore-resource-'+i,restore);
  for(const [i,release]of releases.reverse().entries())await clean('release-demand-'+i,release);
  for(const [i,host]of hosts.reverse().entries())await clean('detach-host-'+i,()=>host.detach());
  p.settings=settings;p.savedSettingsPolicy=policy;
  await clean('restore-layout',()=>workspace.changeLayout(layout));await clean('settle-settings',()=>p.settingsWriteQueue);
  for(const [i,file]of files.reverse().entries())if(app.vault.getFileByPath(file.path)===file)await clean('delete-fixture-'+i,()=>app.vault.delete(file,true));
  if(createdFolder&&app.vault.getFolderByPath(folder)===createdFolder&&!createdFolder.children.length)await clean('delete-fixture-folder',()=>app.vault.delete(createdFolder,true));
  await new Promise(resolve=>window.setTimeout(resolve,500));await clean('restore-settings-bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(errors.length)throw Error((failure?String(failure)+'; ':'')+'View fixture cleanup: '+errors.join('; '));
 }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit Small fixture required');
const bundle=buildSync({entryPoints:['tests/support/plexViewProbe.ts'],bundle:true,write:false,platform:'browser',format:'cjs'}).outputFiles[0].text;
const controlOnly=process.env.KPLEX_PLEX_VIEW_EDITOR_CONTROL_ONLY==='true';
const requested=process.env.KPLEX_PLEX_VIEW_NATIVE_LANE;
if(requested&&!['editor','pairs','combined'].includes(requested))throw Error('Unknown native view lane');
for(const lane of requested?[requested]:controlOnly?['combined']:['editor','pairs']){
 const definitions='c.lane='+JSON.stringify(lane)+';c.editorControlOnly='+JSON.stringify(controlOnly)+';c.originalData='+JSON.stringify(readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8'))+';c.createProbe=(()=>{const module={exports:{}},exports=module.exports;'+bundle+';return module.exports.createProbeViewDefinition})();';
 const report=await runControlledProbe('plex-views-215-'+lane,scenario,definitions,controlOnly?['src/ui/PlexGraph.tsx']:['src/ui/PlexGraph.tsx','src/application/PlexViewSession.ts','src/core/plex/views/contracts.ts'],{maximumMs:240000});
 if(report.status!=='passed')break;
}
