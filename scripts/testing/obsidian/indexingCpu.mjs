/**
 * Controlled PR201 reconstruction and warm-restore workloads in the disposable Small vault.
 * Reconstruction creates only an owned subtree; restore emits initial discovery notifications
 * for existing native identities. Both measure through neutral-source/URL/cache drain and an
 * equal idle tail, then restore configuration, workspace and fixture inventory. Native
 * process CPU covers every process reported by Electron once; profiles/awaits are separate.
 * Detailed storage attribution retains the existing database name across dormant warm reloads;
 * observing storage never opens a new connection inside the measured interval.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {validateTarget} from './runner.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {createStartupResourceProbe} from './startupResources.mjs';
import {createIndexingCpuProbe,createLightweightIndexingProbe} from './indexingCpuProbe.mjs';
import {runIndexingCheckpoint} from './indexingCheckpoint.mjs';
import {createIndexingConsumerProbe} from './indexingConsumerProbe.mjs';

/** Exercise existing production owners; temporary admission holds are reported, never timed gains. */
async function scenario(app,c) {
  const check=(value,message)=>{if(!value)throw Error(message)};
  const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const until=async(read,message,ms=180000,cleanup=false)=>{const end=Date.now()+ms;while(!(await read())){check((cleanup||!c.closed)&&Date.now()<end,message);await wait(50)}};
  const id='k-plex',initial=app.plugins.plugins[id],layout=app.workspace.getLayout();
  const folder='Kplex-201-CPU',owned=[],cases=[];
  const originalFiles=new Set(app.vault.getFiles().map(file=>file.path));
  let p=initial,probe,resources,consumerProbe,release,sourceEnabled=false,pausedSource,visible,visibilityOwner,restoreNative=false,phase='setup',sampleTimer,fixedHorizonTimer,hub;
  let profileOwned=false,profileActive=false,profile,checkpoint,resourceDatabaseName;
  const remote=require('@electron/remote'),win=remote.getCurrentWindow();
  const cpuProcesses=new Map(),visibility={samples:0,hidden:0,unfocused:0,throttleChanged:0};
  const cpuCoverage={samples:0,unsupported:0,invalidIdentity:0,emptySamples:0,regressions:0,maximumReported:0};
  let cpuStartedAt=0;
  const throttle=win.webContents.getBackgroundThrottling?.();
  /** Account for each process identity once, retaining terminal samples when a process exits. */
  const sample=()=>{
    const metrics=remote.app.getAppMetrics();cpuCoverage.samples++;
    cpuCoverage.maximumReported=Math.max(cpuCoverage.maximumReported,metrics.length);
    if(!metrics.length)cpuCoverage.emptySamples++;
    for(const metric of metrics) {
      const cumulative=metric.cpu?.cumulativeCPUUsage;
      if(!Number.isFinite(cumulative)||cumulative<0){cpuCoverage.unsupported++;continue;}
      if(!Number.isSafeInteger(metric.pid)||metric.pid<=0||!Number.isFinite(metric.creationTime)||metric.creationTime<=0){cpuCoverage.invalidIdentity++;continue;}
      const key=metric.pid+':'+metric.creationTime,old=cpuProcesses.get(key);
      if(old){if(cumulative<old.last)cpuCoverage.regressions++;old.last=cumulative;}else cpuProcesses.set(key,{pid:metric.pid,created:metric.creationTime,type:metric.type,
        first:metric.creationTime>=cpuStartedAt?0:cumulative,last:cumulative});
    }
    visibility.samples++;visibility.hidden+=Number(document.hidden);
    visibility.unfocused+=Number(!document.hasFocus()||!win.isFocused());
    visibility.throttleChanged+=Number(win.webContents.getBackgroundThrottling?.()!==throttle);
    resources?.sample(require('process').memoryUsage());
  };
  /** CPU is Electron cumulative process CPU in seconds, summed without adding worker-thread totals. */
  const validCpu=()=>!cpuCoverage.unsupported&&!cpuCoverage.invalidIdentity&&!cpuCoverage.emptySamples&&!cpuCoverage.regressions
    &&[...cpuProcesses.values()].some(row=>row.type==='Browser')&&[...cpuProcesses.values()].some(row=>row.pid===require('process').pid);
  /** Capture process totals with the actual target renderer identity; worker CPU is never added twice. */
  const cpu=()=>{sample();return {seconds:[...cpuProcesses.values()].reduce((sum,row)=>sum+row.last-row.first,0),
    currentRendererPid:require('process').pid,processes:[...cpuProcesses.values()].map(row=>({...row})),coverage:{...cpuCoverage},visibility:{...visibility}}};
  /** Read retained scalar work and truthful persistence state without a new source acquisition. */
  const facts=()=>({source:p.index.getSourceAcquisitionCounters(),repository:p.index.getSourceRepositoryDiagnostics(),
    urls:p.index.getUrlIndexProgress(),scheduler:p.index.getWorkPriorityDiagnostics(),cache:p.index.indexedDb.getActivityState(),
    acquisition:p.index.sourceAcquisition.getActivityState(),inventory:!!p.index.sourceAcquisition.inventory,
    pendingUrlWrites:p.index.urlCacheWrites.size,snapshotQueued:p.index.snapshotPersistTimer!==null,
    orphanCleanupQueued:p.index.orphanCleanupTimer!==null,
    ready:p.getIndexStatus(),nodes:p.index.size});
  /** Require equivalent source authority, URL coverage, no writers/queued bodies and no active owners. */
  const drained=()=>{
    const f=facts();return p.index.sourceAcquisition.hasSemanticDependencies()&&!f.repository.unsaved
      &&f.urls.complete&&!f.urls.active&&!f.urls.failed
      &&!f.inventory&&!f.pendingUrlWrites&&!f.cache.queuedBodies&&!f.cache.writerActive
      &&!f.acquisition.pendingKnown&&!f.acquisition.knownImpactTasks&&!f.acquisition.sourceActive
      &&!f.acquisition.repoWrites&&!f.acquisition.repoDeleteTask
      &&!f.snapshotQueued&&f.scheduler.active.every(value=>value===0)&&!f.scheduler.waiting&&!p.index.building&&!p.index.hasPendingSnapshotHydration();
  };
  try {
    check(initial&&!app.setting.isOpen&&app.vault.getFiles().length<1000,'Clean disposable Small required');
    c.index=initial.index;
    check(!app.vault.getFolderByPath(folder),'Owned fixture collision');
    remote.app.focus({steal:true});win.restore();win.show();win.focus();
    await until(()=>!document.hidden&&document.hasFocus()&&win.isFocused(),'Foreground required',10000);
    await initial.settingsWriteQueue;
    restoreNative=true;
    p.settings.indexingModeDesktop='eager';p.settings.indexBeforeViewDesktop=true;
    p.settings.startInPopout=false;p.settings.documentSyncMode='off';p.settings.sidecarOpen=false;
    await p.saveSettings(false,false);await p.settingsWriteQueue;
    const coldDatabase=c.checkpoint&&c.scenario==='reconstruction'?(await p.index.indexedDb.open()).name:null;
    await app.plugins.disablePlugin(id);
    // Cold fixtures start from the same test-owned logical store contents, before ordinary eager
    // setup is allowed to run. The warm arm restores later, at its measured reload boundary.
    if(coldDatabase)checkpoint=await c.runCheckpoint(app,{...c.checkpoint,databaseName:coldDatabase});
    await app.plugins.enablePlugin(id);p=app.plugins.plugins[id];
    c.index=p?.index;
    await until(()=>p?.layoutReady,'Reload layout');p.appearanceMigrationDialog?.close();
    await p.activateView();await until(()=>p.initialIndexComplete&&!p.index.building&&!p.index.hasPendingSnapshotHydration(),'Initial graph');
    await until(async()=>{await p.index.flushSourceRepository();return drained()},'Initial source closure');
    cases.push('initial eager graph and durable source closure');
    c.progress={phase:'fixture',cases};
    if(c.scenario==='restore') {
      // Seed a verified current graph outside measurement. Notifications below model native initial
      // discovery of existing identities; they create no file or invented body/stat revision.
      if(c.checkpoint?.action!=='restore') {
        await p.performRebuild(false,true,'cpu-warm-seed',true);
        await until(async()=>{await p.index.flushSourceRepository();return drained()},'Warm seed source closure');
        p.index.cancelPendingPersistence();
        check(await p.index.persistIndexedDbSnapshot(p.index.snapshotPersistGeneration),'Current complete snapshot seed');
      }
      const note=app.vault.getMarkdownFiles()[0],attachment=app.vault.getFiles().find(file=>file.extension!=='md');
      const nativeFolder=app.vault.getAllFolders().find(item=>item.path!=='/');
      check(note&&attachment&&nativeFolder,'Existing Markdown, attachment and folder required');
      for(const type of ['k-plex-react-view','k-plex-sidepanel-view'])for(const leaf of app.workspace.getLeavesOfType(type))leaf.detach();
      p.settings.indexBeforeViewDesktop=false;p.settings.lastActivePath=note.path;
      await p.saveSettings(false,false);await p.settingsWriteQueue;
      const databaseName=(await p.index.indexedDb.open())?.name;
      resourceDatabaseName=databaseName;
      await app.plugins.disablePlugin(id);
      if(c.checkpoint) {
        check(databaseName,'Existing checkpoint database required');
        checkpoint=await c.runCheckpoint(app,{...c.checkpoint,databaseName});
        c.progress={phase:'checkpoint-'+c.checkpoint.action,cases,checkpoint};
      }
      await app.plugins.enablePlugin(id);p=app.plugins.plugins[id];
      c.index=p?.index;
      await until(()=>p?.layoutReady,'Deferred restore setup');
      check(!p.indexPreparationAdmitted,'Restore must remain dormant until measured opening');
      for(const item of [note,attachment,nativeFolder])app.vault.trigger('create',item);
      cases.push('three unchanged native create notifications before inventory capture');
    } else {
    // Prevent setup events from starting competing rebuilds; ordinary source/URL work resumes
    // before measurement. The real rebuild itself owns its usual source pause/publication.
    visibilityOwner=p;visible=p.hasVisibleKplexSurface;p.hasVisibleKplexSurface=()=>false;
    release=p.index.workScheduler.begin(1);c.release=()=>release?.();
    pausedSource=p.index.sourceAcquisition;sourceEnabled=pausedSource.pauseInventory();
    release();release=null;
    await until(()=>!p.index.sourceAcquisition.inventory,'Retire setup inventory');
    release=p.index.workScheduler.begin(1);
    await app.vault.createFolder(folder);owned.push(folder);
    await app.vault.createFolder(folder+'/Nested');owned.push(folder+'/Nested');
    hub=await app.vault.create(folder+'/Hub.md','# Hub\n');owned.push(hub.path);
    for(let n=0;n<c.count;n++) {
      const path=folder+'/Nested/Owner'+String(n).padStart(4,'0')+'.md';
      const body='---\nParent: "[['+hub.path+']]"\ntags: [kplex201/nested]\naliases: ["CPU owner '+n+'"]\n---\n'
        +'Status:: active\n[Reference](https://example.com/kplex201/'+n+')\n'
        +(n%10===0?'A long paragraph with bounded plain words. '.repeat(22500):'An ordinary paragraph. '.repeat(80));
      const file=await app.vault.create(path,body);owned.push(file.path);
    }
    await until(()=>owned.filter(path=>path.endsWith('.md')).every(path=>app.metadataCache.getFileCache(app.vault.getFileByPath(path))),'Fixture metadata');
    await wait(300);p.index.cancelPendingPersistence();
    }
    const source=p.index.sourceAcquisition,index=p.index;
    if(c.observers==='lightweight') {
      probe=c.createLightweightProbe(index);resources=probe;
    } else if(c.observers) {
      resources=c.createResources({phase:()=>phase,now:()=>performance.now(),cpu:()=>require('process').cpuUsage(),
        cpuProcess:{pid:require('process').pid,type:'renderer'},databaseName:index.indexedDb.connection?.name??resourceDatabaseName,detailed:c.detailed});
      resources.attach(index);probe=c.createProbe(index,{resourceProbe:resources});
    } else {
      // This control retains the same CPU sampler and completion checks while omitting work wrappers.
      const empty={snapshot:()=>({enabled:false}),stop:()=>{},sample:()=>{}};resources=empty;probe=empty;
    }
    if(c.consumers)consumerProbe=c.createConsumerProbe(index);
    if(c.profile) {
      check(!win.webContents.debugger.isAttached(),'Separate profile requires an unclaimed debugger');
      win.webContents.debugger.attach('1.3');profileOwned=true;
      await win.webContents.debugger.sendCommand('Profiler.enable');
      await win.webContents.debugger.sendCommand('Profiler.setSamplingInterval',{interval:5000});
      await win.webContents.debugger.sendCommand('Profiler.start');profileActive=true;
    }
    cpuStartedAt=Date.now();cpu();check(validCpu(),'Complete finite native CPU counters required');
    sampleTimer=window.setInterval(sample,c.sampleMs);
    const started=performance.now();phase='graph';c.progress={phase,cases,count:c.count};
    const fixedHorizonMs=30000;
    let fixedHorizon;
    fixedHorizonTimer=window.setTimeout(()=>{fixedHorizon={elapsedMs:performance.now()-started,cpu:cpu(),facts:facts()}},fixedHorizonMs);
    release?.();release=null;
    if(c.scenario==='restore') {
      await p.activateView();
      await until(()=>p.initialIndexComplete&&!p.indexDirty&&!p.rebuildTask&&!p.index.hasPendingSnapshotHydration(),'Warm restoration and backlog completion');
    } else await p.performRebuild(false,true,'cpu-fixture',true);
    check(index.isFullSnapshotHydrated()&&!p.indexDirty,'Complete production coordinator rebuild failed');
    source.resumeInventory(sourceEnabled);sourceEnabled=false;
    const graphReady={elapsedMs:performance.now()-started,cpu:cpu(),facts:facts(),work:probe.snapshot()};
    phase='tail';c.progress={phase,cases,count:c.count,graphReady};
    // Observe ordinary production scheduling; explicit setup/cleanup flushes stay outside timing.
    await until(()=>drained(),'Post-ready source/URL/persistence drain',360000);
    const complete={elapsedMs:performance.now()-started,cpu:cpu(),facts:facts(),work:probe.snapshot(),resources:resources.snapshot(),consumers:consumerProbe?.snapshot()};
    if(profileActive) {
      c.progress={phase:'profile-stop',cases,count:c.count,graphReady,complete};
      const result=await win.webContents.debugger.sendCommand('Profiler.stop');profileActive=false;
      // Keep only bounded code aggregates; no script URLs, source text or raw profiles are returned.
      const raw=result.profile;check(raw&&raw.nodes.length<=100000,'Bounded renderer profile required');
      const nodes=new Map(raw.nodes.map(node=>[node.id,node.callFrame])),groups=new Map();
      for(let n=0;n<(raw.samples?.length??0);n++) {
        const frame=nodes.get(raw.samples[n]),kind=frame?.url?.includes('plugin:k-plex')?'plugin':frame?.url?'host':'runtime';
        const rawName=frame?.functionName??'';
        const name=/^[A-Za-z_$][A-Za-z0-9_$]{0,119}$/.test(rawName)
          ||['(idle)','(program)','(garbage collector)','(root)'].includes(rawName)?rawName:'(anonymous or computed)';
        const key=kind+':'+name;
        const group=groups.get(key)??{kind,name,samples:0,microseconds:0};
        group.samples++;group.microseconds+=raw.timeDeltas?.[n]??0;groups.set(key,group);
      }
      profile={scope:'Current renderer JavaScript only; excludes Browser/GPU/Utility and parser workers. Separate diagnostic run; not a CPU acceptance sample.',
        intervalMicroseconds:5000,samples:raw.samples?.length??0,durationMicroseconds:raw.endTime-raw.startTime,
        top:[...groups.values()].sort((a,b)=>b.microseconds-a.microseconds).slice(0,40)};
    }
    c.progress={phase,cases,count:c.count,graphReady,complete,profile};
    // Finite semantic checks use the actual current graph after all measured source work.
    if(hub)check(index.get(hub.path)?.file===hub,'Hub native identity');
    for(const path of owned.filter(path=>path.includes('/Owner'))) {
      check(index.get(path)?.file===app.vault.getFileByPath(path),'Owner physical binding');
      check(index.neighbours(index.get(path),'parent').some(item=>item.page.path===hub.path),'Parent semantics');
      check(index.explainRelationship(path,hub.path)?.decisions.some(item=>item.active),'Active provenance');
    }
    if(hub) {
      check(index.get('tag:#kplex201/nested')||[...index.state.pages.values()].some(page=>page.isTag&&page.path.includes('kplex201/nested')),'Nested tag membership');
      cases.push('full graph bindings, parents, provenance and nested tags');
    }
    phase='idle';const idleStart={elapsedMs:performance.now()-started,cpu:cpu()};
    await wait(c.idleMs);check(drained(),'Work returned during equal idle tail');
    const idle={elapsedMs:performance.now()-started,cpu:cpu(),facts:facts(),work:probe.snapshot(),resources:resources.snapshot()};
    cases.push('durable source/URL/cache closure and equal idle tail');
    phase='horizon';await wait(Math.max(0,fixedHorizonMs-(performance.now()-started)));
    fixedHorizon??={elapsedMs:performance.now()-started,cpu:cpu(),facts:facts()};
    window.clearTimeout(fixedHorizonTimer);fixedHorizonTimer=undefined;
    check(validCpu(),'Native CPU coverage changed during measurement');
    check(drained(),'Work returned before the fixed horizon');
    return {scenario:c.scenario,count:hub?c.count:0,observers:c.observers,sampleMs:c.sampleMs,checkpoint,profile,graphReady,complete,idleStart,idle,fixedHorizon,
      cases,files:app.vault.getFiles().length,throttle,runtime:{...require('process').versions},
      acceptanceEligible:!c.profile&&!c.consumers&&c.checkpoint?.action!=='capture',
      comparable:!c.profile&&!c.consumers&&c.checkpoint?.action!=='capture'&&visibility.hidden===0&&visibility.unfocused===0&&visibility.throttleChanged===0,
      limits:(c.scenario==='restore'?'Controlled initial discovery notifications and plugin reload with valid caches. ':'Owned finite cold sources after an admitted full rebuild. ')
        +'Neither is a full-process restart or reproduction of the private Mac vault. CPU includes all Electron-reported Obsidian processes and other activity; exited-process terminal intervals may be unobserved. Setup holds/seeding are outside measurement. Native geometry/API assertions do not prove actual paint, trusted pointer latency, physical touch or macOS thermals.'};
  } catch(error) {
    // Diagnostics must not replace the original failure when a reload left no plugin instance.
    c.progress={...c.progress,error:String(error)};
    try{c.progress.facts=facts();c.progress.work=probe?.snapshot();c.progress.resources=resources?.snapshot()}catch{}
    throw error;
  }
  finally {
    if(sampleTimer)window.clearInterval(sampleTimer);if(fixedHorizonTimer)window.clearTimeout(fixedHorizonTimer);
    let profileCleanupFailure;
    if(profileActive)try{await win.webContents.debugger.sendCommand('Profiler.stop')}catch{}
    if(profileOwned){try{await win.webContents.debugger.sendCommand('Profiler.disable')}catch{}
      try{if(win.webContents.debugger.isAttached())win.webContents.debugger.detach()}catch(error){profileCleanupFailure=String(error)}}
    const failures=profileCleanupFailure?[profileCleanupFailure]:[],clean=async work=>{try{await work()}catch(error){failures.push(String(error))}};
    // Each owner releases independently so a missing replacement cannot skip native restoration.
    await clean(()=>consumerProbe?.stop());await clean(()=>probe?.stop());await clean(()=>resources?.stop());await clean(()=>release?.());
    await clean(()=>{if(visible&&visibilityOwner)visibilityOwner.hasVisibleKplexSurface=visible});
    await clean(()=>pausedSource?.resumeInventory(sourceEnabled));
    if(restoreNative) {
    for(const path of owned.reverse())await clean(async()=>{
      const item=app.vault.getFileByPath(path)??app.vault.getFolderByPath(path);
      check(item&&(item.path===folder||item.path.startsWith(folder+'/')),'Owned fixture disappeared');
      if('children' in item)check(item.children.length===0,'Owned folder contains unexpected items');
      await app.vault.delete(item,true);
    });
    await clean(()=>p?.index?.flushSourceRepository());
    await clean(()=>app.plugins.disablePlugin(id));
    await clean(()=>app.workspace.changeLayout(layout));
    await clean(()=>app.vault.adapter.write(initial.manifest.dir+'/data.json',c.originalData));
    await clean(()=>app.plugins.enablePlugin(id));p=app.plugins.plugins[id];
    await clean(async()=>{await until(()=>p?.layoutReady,'Restored plugin setup',180000,true);await p.settingsWriteQueue;await wait(1500);
      await app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData);
      check(app.vault.getFiles().length===originalFiles.size&&app.vault.getFiles().every(file=>originalFiles.has(file.path)),'File inventory restoration');
    });
    }
    if(failures.length)throw Error('PR201 cleanup: '+failures.join('; '));
  }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const count=Number(process.env.KPLEX_CPU_OWNERS??64),idleMs=Number(process.env.KPLEX_CPU_IDLE_MS??10000),scenarioName=process.env.KPLEX_CPU_SCENARIO??'reconstruction';
const sampleMs=Number(process.env.KPLEX_CPU_SAMPLE_MS??250);
if(![250,1000].includes(sampleMs))throw Error('Use 250 or1000 ms process sampling');
const checkpointPath=process.env.KPLEX_CPU_CHECKPOINT;
const checkpoint=checkpointPath?{action:process.env.KPLEX_CPU_CHECKPOINT_ACTION??'restore',path:checkpointPath,
  vaultPath:target.vault,expectedSha256:process.env.KPLEX_CPU_CHECKPOINT_SHA256}:null;
if(checkpoint&&(!['capture','restore'].includes(checkpoint.action)||scenarioName==='reconstruction'&&checkpoint.action!=='restore'))throw Error('Cold checkpoints require restore; capture requires warm restoration');
if(![32,64,128,256].includes(count)||!Number.isInteger(idleMs)||idleMs<5000||idleMs>30000)throw Error('Use 32/64/128/256 owners and 5000–30000 ms idle');
if(!['reconstruction','restore'].includes(scenarioName))throw Error('Use reconstruction or restore');
await runControlledProbe('indexing-cpu-201',scenario,
  'c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.count='+count+';c.idleMs='+idleMs+';c.scenario='+JSON.stringify(scenarioName)
  +';c.observers='+JSON.stringify(process.env.KPLEX_CPU_OBSERVERS==='lightweight'?'lightweight':process.env.KPLEX_CPU_OBSERVERS!=='false')
  +';c.sampleMs='+sampleMs+';c.checkpoint='+JSON.stringify(checkpoint)+';c.runCheckpoint='+runIndexingCheckpoint.toString()
  +';c.consumers='+(process.env.KPLEX_CPU_CONSUMERS==='true')+';c.createConsumerProbe='+createIndexingConsumerProbe.toString()
  +';c.detailed='+(process.env.KPLEX_CPU_DETAILED==='true')+';c.profile='+(process.env.KPLEX_CPU_PROFILE==='true')+';c.createResources='+createStartupResourceProbe.toString()+';c.createProbe='+createIndexingCpuProbe.toString()+';c.createLightweightProbe='+createLightweightIndexingProbe.toString()+';',
  ['src/main.ts','src/adapters/obsidian/sourceAcquisition.ts','src/index/IndexedDbCache.ts','src/index/SourceRepository.ts'],{maximumMs:780000});
