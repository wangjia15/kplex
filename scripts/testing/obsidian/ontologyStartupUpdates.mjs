/** Native functional reproduction of visible ontology edits behind the progressive startup cursor.
 * Uses the real coordinator, source writer, Vault edits and stationary scene in disposable Small.
 * Two foreground leases at real source commits distinguish the next boundary from completion. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';
import {validateTarget} from './runner.mjs';

/** Own a synthetic startup lifetime without replacing acquisition, compilation or publication. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 const check=(value,message)=>{if(!value)throw Error(message)};
 const until=async(read,message)=>{const end=Date.now()+60000;while(!read()){check(!c.closed&&Date.now()<end,message);await wait(30)}};
 check(p&&!app.setting.isOpen&&app.vault.getFiles().length<1000,'Clean Small-vault prerequisites');
 check(!p.index.isOnDemandMode(),'Reload into the actual Eager strategy before the startup probe');
 await until(()=>p.getIndexStatus().upToDate&&!p.rebuildTask&&!p.index.building,'Initial indexing did not settle');
 await p.settingsWriteQueue;await p.settingsReconciliation.prepare(false);
 const settings=structuredClone(p.settings),layout=app.workspace.getLayout(),initial=p.initialIndexComplete,owned=[];
 const folderName='Kplex-Startup-Ontology-190-'+Date.now(),path=name=>folderName+'/'+name+'.md';
 const parent='Kplex190 startup parent',child='Kplex190 startup child',commits=[];
 check(!p.ontologyRoleForField(parent)&&!p.ontologyRoleForField(child),'Fixture property collision');
 let folder,leaf,building,unblockPause,unblockTail,originalPublisher,failure;
 try{
  Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,followActiveFile:false,autoOpenCentralDocument:false,embedCentralNode:false,showPageNodes:true,showInferredNodes:true,showFolderNodes:false,showTagNodes:false,renderSiblings:false,graphLenses:[],applyPowerFilter:false,animationSpeed:0});
  p.settings.baseLinkStyle={...p.settings.baseLinkStyle,showLabel:true};await p.saveSettings(false);
  await p.updateOntologyField('parents',[...p.settings.hierarchy.parents,parent],[...p.settings.hierarchy.parents],p.receivedSettingsOwner('hierarchy'));
  await p.updateOntologyField('children',[...p.settings.hierarchy.children,child],[...p.settings.hierarchy.children],p.receivedSettingsOwner('hierarchy'));
  folder=await app.vault.createFolder(folderName);
  for(const name of ['A','B','Pause','Tail','Spacer'])owned.push(await app.vault.create(path(name),name==='A'?'---\n'+child+': "[['+folderName+'/B]]"\n---\n':'An owned startup fixture.\n'));
  await until(()=>owned.every(file=>app.metadataCache.getFileCache(file)),'Fixture metadata absent');
  for(const file of owned)p.index.insertCreatedFile(file);
  leaf=app.workspace.getLeaf('tab');await leaf.setViewState({type:'k-plex-react-view',active:true});await app.workspace.revealLeaf(leaf);await leaf.view.waitUntilReady();p.notifyNavigation(path('A'),leaf);
  await until(()=>leaf.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath===path('A')&&p.index.semanticDemandCounts.has(path('A')),'The actual fixture center/demand did not open');
  await until(()=>p.getIndexStatus().upToDate&&!p.rebuildTask&&!p.index.building,'Fixture preparation did not settle');
  // This synthetic startup assumes a settled preceding fixture. Graph readiness alone does not
  // retire independent source/URL work, which can legitimately supersede a private startup owner.
  await p.index.flushSourceRepository();
  await until(()=>{
   const source=p.index.sourceAcquisition,activity=source.getActivityState(),urls=p.index.getUrlIndexProgress();
   return source.hasSemanticDependencies()&&!source.inventory&&!activity.pendingKnown&&!activity.knownImpactTasks
    &&!activity.sourceActive&&!activity.repoWrites&&!activity.repoDeleteTask
    &&p.index.getSourceRepositoryDiagnostics().unsaved===0&&urls.complete&&!urls.active&&!urls.failed
    &&p.getIndexStatus().upToDate&&!p.rebuildTask&&!p.index.building;
  },'Fixture source and URL work did not settle');
  p.settings.lastActivePath=path('A');await p.saveSettings(false,false);
  check(p.startupGraphSeedPaths()[0]===path('A'),'The controlled startup must seed the tested saved center');
  const [a,b]=owned;
  // Native Vault enumeration is not creation/name order. Follow the exact input order that the
  // actual progressive owner captures, rather than holding a later source ahead of an earlier one.
  const remaining=app.vault.getMarkdownFiles().filter(file=>owned.includes(file)&&file!==a&&file!==b),pause=remaining[0],tail=remaining.at(-1);
  check(pause&&tail&&pause!==tail,'Two independent source boundaries required');
  let pauseEntered=false,tailEntered=false,observing=true;
  /** Timeout/cleanup must retire future holds before releasing already-owned leases. */
  c.release=()=>{observing=false;unblockPause?.();unblockTail?.();};
  originalPublisher=p.index.commitPreparedFile;
  /** Observe the actual synchronous publisher, then hold only its next cooperative continuation.
   * Independent URL/cache readers stay untouched; every graph/evidence commit remains synchronous. */
  p.index.commitPreparedFile=function(commit,apply){
   const result=originalPublisher.call(this,commit,apply);
   if(owned.some(file=>file.path===commit.sourcePath))commits.push(commit.sourcePath);
   if(observing&&this.progressiveVisibleRefresh&&commit.sourcePath===pause.path&&!pauseEntered){pauseEntered=true;unblockPause=this.workScheduler.begin(2);}
   if(observing&&this.progressiveVisibleRefresh&&commit.sourcePath===tail.path&&!tailEntered){tailEntered=true;unblockTail=this.workScheduler.begin(2);}
   return result;
  };
  p.index.fullSnapshotHydrated=false;p.index.resumableCheckpointPaths=null;p.initialIndexComplete=false;p.indexDirty=true;p.indexBacklogReasons.add('startup:initial-index');
  c.progress={phase:'progressive admission'};
  building=p.performRebuild(false,false,'startup:initial-index',true);
  await until(()=>pauseEntered,'Actual progressive source cursor did not reach Pause');
  c.progress={phase:'owned source paused'};
  check(p.index.building&&p.rebuildTask,'The actual coordinator does not own startup');
  await app.vault.modify(b,parent+':: [['+folderName+'/A]]\n');
  await app.fileManager.processFrontMatter(a,frontmatter=>{delete frontmatter[child]});
  await until(()=>app.metadataCache.resolvedLinks[b.path]?.[a.path]&&!app.metadataCache.getFileCache(a)?.frontmatter?.[child],'Native edited metadata did not resolve');
  const refreshB=p.index.refreshVisibleMarkdownPath(b.path),refreshA=p.index.refreshVisibleMarkdownPath(a.path);
  unblockPause();await Promise.all([refreshB,refreshA]);await until(()=>tailEntered,'Remaining tail did not resume');
  c.progress={phase:'stationary publication',commits:commits.map(path=>path.split('/').pop())};
  const current=()=>p.index.getNeighborhood(a.path)?.children.find(row=>row.page.path===b.path);
  await until(()=>current()?.typeDefinition===parent.toLowerCase().replaceAll(' ','-'),'Stationary center did not adopt the authored inverse ontology before the tail');
  await until(()=>leaf.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath===a.path&&[...leaf.view.contentEl.querySelectorAll('.kplex-edge-label')].some(label=>label.textContent===parent.toLowerCase().replaceAll(' ','-')),'Actual stationary SVG did not update');
  check(p.index.building,'Acceptance accidentally waited for complete indexing');
  const explanation=p.index.explainRelationship(a.path,b.path);
  check(explanation?.decisions.some(item=>item.active&&item.evidence.declaredByPath===b.path&&item.evidence.fieldName===parent),'Original authored source provenance missing');
  const paused=commits.indexOf(pause.path),tailed=commits.indexOf(tail.path);for(const file of [a,b])check(commits.findIndex((path,n)=>n>paused&&path===file.path)<tailed&&commits.findIndex((path,n)=>n>paused&&path===file.path)>paused,'Visible source was not committed before the tail');
  return {stationary:true,startupStillHeld:true,updatesBeforeRemainingSource:true,sourceBoundary:true,physicalProvenance:true,ownedNotes:owned.length,pausedSource:pause.name,remainingSource:tail.name,ownedCommits:commits.map(path=>path.split('/').pop()),limitations:'Controlled startup admission and native Vault writes; no full application restart or performance comparison.'};
 }catch(error){failure=error;c.progress={phase:'startup ontology',commits:commits.map(path=>path.split('/').pop()),center:leaf?.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath===path('A'),demand:p.index.semanticDemandCounts.has(path('A')),building:p.index.building,initial:p.initialIndexComplete,diagnostics:p.index.getSemanticPreparationDiagnostics()};throw error;}finally{
  const errors=[],clean=async run=>{try{await run()}catch(error){errors.push(String(error))}};
  c.release?.();await clean(()=>building);p.initialIndexComplete=initial;
  if(originalPublisher)p.index.commitPreparedFile=originalPublisher;
  await clean(()=>leaf?.detach());
  for(const file of owned.reverse())if(app.vault.getFileByPath(file.path)===file)await clean(()=>app.vault.delete(file));
  if(folder&&app.vault.getFolderByPath(folderName)===folder&&!folder.children.length)await clean(()=>app.vault.delete(folder,true));
  p.settings=settings;await clean(()=>p.saveSettings(false));await clean(()=>app.workspace.changeLayout(layout));await clean(()=>p.settingsWriteQueue);
  await wait(500);await clean(()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(errors.length)throw Error((failure?'Scenario: '+failure+'; ':'')+'Startup fixture cleanup: '+errors.join('; '));
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Startup ontology requires explicit Small');
const vault=process.env.KPLEX_TEST_VAULT_NAME,target=validateTarget({vaultName:vault,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;assert(output&&!existsSync(output),'Select a fresh evidence directory');mkdirSync(output,{recursive:true});
/** Match the existing Date-policy lane: strategy is fixed at construction and requires reload. */
const cli=(command,...args)=>{const r=spawnNativeSync(obsidianCliExecutable(),[`vault=${vault}`,command,...args],{encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw r.error??Error(r.stderr||r.stdout);return r.stdout.trim();};
const evaluate=code=>JSON.parse(cli('eval','code='+code).replace(/^=>\s*/,''));
/** Reacquire the actual strategy owner, never patch its readonly construction-time mode. */
const ready=async()=>{const until=Date.now()+90000;while(!evaluate('JSON.stringify(!!app.plugins.plugins["k-plex"]?.actionManager)')){assert(Date.now()<until,'Plugin readiness');await new Promise(r=>setTimeout(r,250));}};
assert.equal(resolve(cli('vault','info=path')),target.vault);
const configuration=['plugins/k-plex/data.json','community-plugins.json','workspace.json'].map(name=>({name,path:join(target.config,name),bytes:readFileSync(join(target.config,name))}));
const baseline=evaluate("(()=>{const p=app.plugins.plugins['k-plex'];if(window.kplexIndexingProbe||app.setting.isOpen)throw Error('Clean probe ownership required');return JSON.stringify({settings:p.settings,layout:app.workspace.getLayout(),files:app.vault.getFiles().map(file=>file.path).sort(),mode:p.index.isOnDemandMode()})})()");
for(const item of configuration)writeFileSync(join(output,item.name.replaceAll('/','-')+'.original'),item.bytes);
let changed=false;
try{
 if(baseline.mode){changed=true;evaluate("(async()=>{const p=app.plugins.plugins['k-plex'];p.settings.indexingModeDesktop='eager';p.settings.indexingMode='eager';await p.saveSettings(false,false);return JSON.stringify(true)})()");cli('plugin:disable','id=k-plex');cli('plugin:enable','id=k-plex');await ready();evaluate(`(async()=>{await app.workspace.changeLayout(${JSON.stringify(baseline.layout)});return JSON.stringify(true)})()`);}
 const data=readFileSync(join(target.pluginDir,'data.json'),'utf8');
 await runControlledProbe('ontology-startup-updates-190',scenario,'c.originalData='+JSON.stringify(data)+';',['src/main.ts']);
}finally{
 const restore={strategyReloaded:changed,status:'failed'};
 try{
  assert(evaluate('JSON.stringify(!window.kplexIndexingProbe)'),'Native controller must release ownership before mode restoration');
  if(changed){evaluate(`(async()=>{const p=app.plugins.plugins['k-plex'];p.settings=${JSON.stringify(baseline.settings)};await p.saveSettings(false,false);return JSON.stringify(true)})()`);cli('plugin:disable','id=k-plex');cli('plugin:enable','id=k-plex');await ready();}
  evaluate(`(async()=>{await app.workspace.changeLayout(${JSON.stringify(baseline.layout)});await app.plugins.plugins['k-plex'].settingsWriteQueue;return JSON.stringify(true)})()`);
  assert.deepEqual(evaluate('JSON.stringify(app.vault.getFiles().map(file=>file.path).sort())'),baseline.files);
  assert.equal(evaluate('JSON.stringify(app.plugins.plugins["k-plex"].index.isOnDemandMode())'),baseline.mode);
  await new Promise(r=>setTimeout(r,1500));for(const item of configuration){writeFileSync(item.path,item.bytes);assert(readFileSync(item.path).equals(item.bytes));}restore.status='passed';
 }catch(error){restore.error=String(error);process.exitCode=1;}
 writeFileSync(join(output,'strategy-restoration.json'),JSON.stringify(restore,null,2)+'\n');console.log(JSON.stringify({strategyRestoration:restore}));
}
