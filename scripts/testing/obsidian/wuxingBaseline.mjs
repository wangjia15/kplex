/** Bounded accepted-main negative control for fresh Compass popout Sidecar creation. Uses the
 * real prior-source artifact and existing native host; retains failure and restores owned resources. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';

async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace;
 if(!p||app.setting.isOpen||app.vault.getFiles().length>=1000)throw Error('Clean disposable Small required');
 const settings=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout(),folder='Kplex-220-Baseline-'+Date.now(),hosts=[],cleanup=[];
 let directory,file;
 const check=(value,message)=>{if(c.closed||!value)throw Error(message)};
 const until=async(read,message)=>{const end=Date.now()+20000;while(!read()){check(Date.now()<end,message);await new Promise(resolve=>window.setTimeout(resolve,50))}};
 try{
  await until(()=>!p.isStartupInitializing()&&!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Baseline startup did not settle');
  directory=await app.vault.createFolder(folder);file=await app.vault.create(folder+'/Goal.md','# Goal\n\nDisposable accepted-main control.\n');p.index.insertCreatedFile(file);
  Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,embedCentralNode:false,autoOpenCentralDocument:false,followActiveFile:false});
  const host=workspace.getLeaf('window');hosts.push(host);await host.setViewState({type:'k-plex-react-view',active:true});await host.view.waitUntilReady();await p.setDocumentSyncMode(host,'off');
  p.notifyNavigation(file.path,host);await until(()=>host.view.documentSession.centerPath===file.path&&host.view.containerEl.ownerDocument!==document,'Accepted-main Compass popout absent');
  check(host.view.documentSession.plexView.definition.id==='classic','Control must use accepted Compass');
  const win=host.view.containerEl.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow();win.restore();win.show();win.focus();win.webContents.focus();await workspace.revealLeaf(host);workspace.setActiveLeaf(host,{focus:true});
  await p.openSidecar(host,p.index.get(file.path));
  const observe=()=>{c.progress={phase:'accepted-main-fresh-compass-popout-sidecar',view:host.view.documentSession.plexView.definition.id,sidecarType:p.sidecarLeaves.get(host)?.view.getViewType(),expectedDocument:p.sidecarLeaves.get(host)?.view.file?.path===file.path,cleanup};return c.progress.expectedDocument};
  await until(observe,'Accepted-main fresh Compass popout Sidecar did not open its document');
  return {freshPopoutSidecar:true,cleanup};
 }finally{
  const errors=[];const clean=async(label,work)=>{try{await work();cleanup.push({label,status:'passed'})}catch(error){errors.push(String(error));cleanup.push({label,status:'failed'})}c.progress={...c.progress,cleanup}};
  for(const host of hosts)await clean('detach-owned-host',()=>host.detach());
  p.settings=settings;await clean('restore-live-settings',()=>p.saveSettings(false,false));p.savedSettingsPolicy=policy;
  await clean('restore-layout',()=>workspace.changeLayout(layout));
  if(file&&app.vault.getFileByPath(file.path)===file)await clean('delete-owned-file',()=>app.vault.delete(file,true));
  if(directory&&app.vault.getFolderByPath(folder)===directory&&!directory.children.length)await clean('delete-owned-folder',()=>app.vault.delete(directory,true));
  await clean('drain-settings',()=>p.settingsWriteQueue);await new Promise(resolve=>window.setTimeout(resolve,750));await clean('restore-settings-bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(errors.length)throw Error('Baseline cleanup: '+errors.join('; '));
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small'||process.env.KPLEX_PROBE_BASELINE_REF!=='998781070a9382005154f4f884ed753280a9cf52')throw Error('Explicit accepted-main control required');
await runControlledProbe('wuxing-220-accepted-main-sidecar',scenario,'c.originalData='+JSON.stringify(readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8'))+';',[],{maximumMs:90000});
