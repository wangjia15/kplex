/** PR203 test-tool safety gates: native filesystem-alias refusal, pre-enable ordering and owned blocked storage. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,linkSync,rmSync,readFileSync,realpathSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {validateStudyTarget,assertLiveStudy,studyDatabaseName,stageStudyArtifacts,enableObserved,verifyStudyCheckpoint,validateStudyReceiptPath} from '../scripts/testing/obsidian/macStudySafety.mjs';
import {createMacStudyStorage} from '../scripts/testing/obsidian/macStudyStorage.mjs';
import {macCpuSeconds,captureMacSourceFlags,readMacDiagnosticFlags,preserveMacStartupFailureState} from '../scripts/testing/obsidian/macStudyStartup.mjs';
import {captureMacRendererCpu} from '../scripts/testing/obsidian/macStudyCpuProfile.mjs';
import {createMacStudyProbe} from '../scripts/testing/obsidian/macStudyProbe.mjs';
import {captureMacStudySystem} from '../scripts/testing/obsidian/macStudySystem.mjs';
const require=createRequire(import.meta.url);

test('native system facts never substitute AC or unlocked for unsupported reads',/** Read fixed native facts without installing listeners or accepting arbitrary labels. */ ()=>{
  const monitor={isOnBatteryPower:/** Expose the actual native source. */ ()=>true,getSystemIdleState:/** Preserve lock state independently of window focus. */ threshold=>{assert.equal(threshold,10);return 'locked';},getCurrentThermalState:/** Retain supported thermal context without changing policy. */ ()=>'fair'};
  assert.deepEqual(captureMacStudySystem({powerMonitor:monitor}),{powerSupported:true,onBattery:true,idleState:'locked',thermalState:'fair'});
  assert.deepEqual(captureMacStudySystem({}),{powerSupported:false,onBattery:null,idleState:'unknown',thermalState:'unknown'});
  const unavailable={isOnBatteryPower:/** Remote errors remain unavailable, never a false AC observation. */ ()=>{throw Error('Unavailable');},getSystemIdleState:/** Unknown labels cannot certify unlocked state. */ ()=>'private-label',getCurrentThermalState:/** Unknown labels are not exported. */ ()=>'private-label'};
  assert.deepEqual(captureMacStudySystem({powerMonitor:unavailable}),{powerSupported:false,onBattery:null,idleState:'unknown',thermalState:'unknown'});
});

test('native timing qualifies power transitions and OS locks independently of focus',/** Continuous sampler facts survive external CLI gaps and cannot be repaired by later reconnection. */ ()=>{
  let time=0,tick,onBattery=false,idleState='idle';
  const remote={getCurrentWindow:/** Keep the selected native window focused. */ ()=>({isFocused:/** Focus alone does not prove unlocked. */ ()=>true,webContents:{getBackgroundThrottling:/** Preserve the host policy. */ ()=>true}}),app:{getAppMetrics:/** Include main and renderer CPU without double counting workers. */ ()=>[{pid:1,creationTime:1,type:'Browser',cpu:{cumulativeCPUUsage:0}},{pid:7,creationTime:1,type:'Tab',cpu:{cumulativeCPUUsage:0}}]}};
  const factory=vm.runInNewContext('('+createMacStudyProbe.toString()+')',{require:/** Supply native scalar boundaries only. */ name=>name==='@electron/remote'?remote:{pid:7,versions:{},memoryUsage:/** Keep memory separate from CPU. */ ()=>({})},performance:{now:/** Advance one native sample at a time. */ ()=>time},Date:{now:/** Fix process identity epoch. */ ()=>100},document:{hidden:false,hasFocus:/** Keep document focus while the OS locks. */ ()=>true},window:{setInterval:/** Retain the callback without a real timer. */ value=>{tick=value;return 1;},clearInterval:/** Retire the owned fixture callback. */ ()=>{tick=null;}}});
  const app={workspace:{onLayoutReady:/** Preserve the native registration. */ callback=>callback},plugins:{plugins:{}}};
  const systemStateReader=/** Inject app-observed facts rather than inferring power from the caller's execution context. */ ()=>({powerSupported:true,onBattery,idleState,thermalState:'nominal'});
  const probe=factory(app,{systemStateReader,requireAc:true,requireUnlocked:true});assert.equal(probe.snapshot().comparable,true);
  onBattery=true;time=1000;tick();assert.equal(probe.snapshot().comparable,false);assert.equal(probe.snapshot().coverage.onBattery,1);
  onBattery=false;idleState='locked';time=2000;tick();assert.equal(probe.snapshot().coverage.locked,1);assert.equal(probe.snapshot().comparable,false);
  idleState='idle';time=3000;tick();assert.equal(probe.snapshot().comparable,false);assert.equal(probe.snapshot().coverage.powerChanges,1);assert.equal(probe.snapshot().last.foreground.system.onBattery,false);probe.stop();
  const unsupported=factory(app,{requireAc:true,requireUnlocked:true});assert.equal(unsupported.snapshot().comparable,false);assert.ok(unsupported.snapshot().coverage.powerUnsupported>0);unsupported.stop();
});

test('read-only diagnostic retries preserve timeout receipts and the original deadline',/** Retry only safe reads, never functional errors, and never initiate a read after expiry. */ ()=>{
  let calls=0,time=0;const receipts=[];
  const evaluate=/** A lost reply is safe to repeat because the flags query has no mutation. */ code=>{assert.match(code,/captureMacSourceFlags/);calls++;if(calls===1){time=30;throw Error('ETIMEDOUT');}return {observed:true};};
  const record=/** Preserve each timeout independently of a later successful query. */ value=>receipts.push(value);
  const now=/** Advance only the external observation clock. */ ()=>time;
  const zero=/** Keep repeated attempts inside the original deadline. */ ()=>0;
  const ignore=/** This assertion only checks calls and propagated errors. */ ()=>{};
  assert.deepEqual(readMacDiagnosticFlags(evaluate,100,record,now),{observed:true});
  assert.equal(calls,2);assert.equal(receipts.length,1);assert.equal(receipts[0].attempt,1);
  const wrongTarget=/** Functional failures must never be retried. */ ()=>{calls++;throw Error('Wrong target');};
  calls=0;assert.throws(/** The first functional error escapes unchanged. */ ()=>readMacDiagnosticFlags(wrongTarget,100,ignore,zero),/Wrong target/);assert.equal(calls,1);
  const timedOut=/** Model a transport failure without moving the clock. */ ()=>{calls++;throw Error('ETIMEDOUT');};
  calls=0;time=100;assert.throws(/** No query starts when the deadline has already expired. */ ()=>readMacDiagnosticFlags(timedOut,100,ignore,now),/deadline/);assert.equal(calls,0);
  calls=0;assert.throws(/** At most two lost replies are attempted. */ ()=>readMacDiagnosticFlags(timedOut,100,ignore,zero),/ETIMEDOUT/);assert.equal(calls,2);
  const expires=/** The first timeout consumes the remaining external budget. */ ()=>{calls++;time=100;throw Error('ETIMEDOUT');};
  calls=0;time=0;assert.throws(/** A retry cannot extend that budget. */ ()=>readMacDiagnosticFlags(expires,100,ignore,now),/deadline/);assert.equal(calls,1);
});

test('failed startup retains full probe state without replacing the original failure',/** Save interrupted evidence before independent cleanup, including capture-error and unattached paths. */ ()=>{
  const state={attachedAt:'test',status:'failed',error:'Original profile failure'};let calls=0;
  preserveMacStartupFailureState(state,/** Retain interrupted samples while the owned probe is still attached. */ code=>{calls++;assert.match(code,/snapshot\(true\)/);return {samples:[{cpuSeconds:1}]};});
  assert.equal(state.resultCapturedAfterFailure,true);assert.equal(state.result.samples.length,1);assert.equal(state.error,'Original profile failure');
  const unexpected=/** A retained result or unattached probe must not initiate another native query. */ ()=>{throw Error('Must not capture');};
  preserveMacStartupFailureState(state,unexpected);assert.equal(calls,1);
  const captureTimeout=/** Snapshot transport failure must not replace the run's original error. */ ()=>{throw Error('Capture ETIMEDOUT');};
  const failed={attachedAt:'test',error:'Original'};assert.doesNotThrow(/** Cleanup remains reachable after failed evidence capture. */ ()=>preserveMacStartupFailureState(failed,captureTimeout));assert.equal(failed.error,'Original');assert.match(failed.resultCaptureError,/ETIMEDOUT/);
  assert.doesNotThrow(/** Unattached failure has no known probe to capture. */ ()=>preserveMacStartupFailureState({},unexpected));
});

test('native observation retains process lifetimes and waits for semantic/event closure',/** Exercise the real scalar sampler without admitting production work. */ ()=>{
  let time=0,tick,hidden=false,focused=true,semantic=true,pendingKnown=1,resourceAttached=0,resourceStopped=0,statusReads=0,resourcePhase;
  let metrics=[{pid:1,creationTime:1000,type:'Browser',cpu:{cumulativeCPUUsage:10}},
    {pid:7,creationTime:1000,type:'Tab',cpu:{cumulativeCPUUsage:20}}];
  const original=/** Preserve the exact native registration result and receiver. */ function(callback){assert.equal(this,app.workspace);return callback;};
  const app={workspace:{onLayoutReady:original},plugins:{plugins:{}}};
  const win={isFocused:/** Report foreground independently of document visibility. */ ()=>focused,webContents:{getBackgroundThrottling:/** Preserve the original host throttle. */ ()=>true}};
  const factory=vm.runInNewContext('('+createMacStudyProbe.toString()+')',{
    require:/** Supply only the real probe's external host boundaries. */ name=>name==='@electron/remote'?{getCurrentWindow:/** Select the measured native window. */ ()=>win,app:{getAppMetrics:/** Return cumulative process metrics. */ ()=>metrics}}:{pid:7,versions:{},memoryUsage:/** Keep sampled heap separate from CPU. */ ()=>({heapUsed:1,rss:2})},
    performance:{now:/** Advance observed monotonic time explicitly. */ ()=>time},Date:{now:/** Give newly born processes an epoch after the arm. */ ()=>5000},
    document:{get hidden(){return hidden;},hasFocus:/** Report native document focus. */ ()=>focused},
    window:{setInterval:/** Own a timer without a real wait. */ callback=>{tick=callback;return 1;},clearInterval:/** Retire the owned timer. */ ()=>{tick=null;}}});
  const probe=factory(app,{observers:false,resourceFactory:/** Reuse one caller-owned resource observer and retire it with the scalar probe. */ options=>{resourcePhase=options.phase;return {
    attach:/** Count pre-admission attachment. */ ()=>resourceAttached++,snapshot:/** Return aggregate detail only in full snapshots. */ ()=>({attached:resourceAttached}),stop:/** Observe resource cleanup. */ ()=>resourceStopped++};}});assert.equal(probe.snapshot().validCpu,true);
  const index={size:3,sourceAcquisition:{getActivityState:/** Pending known events fence closure even with a ready indicator. */ ()=>({pendingKnown,knownImpactTasks:0,sourceActive:0,repoWrites:0,repoDeleteTask:0}),hasSemanticDependencies:/** Source authority is independently present. */ ()=>true},
    getSourceAcquisitionCounters:/** No source work is introduced by observation. */ ()=>({}),getSourceRepositoryDiagnostics:/** Healthy storage has no masks. */ ()=>({unsaved:0}),
    getUrlIndexProgress:/** URL completion is independent of graph readiness. */ ()=>({complete:true,active:false,failed:false}),getWorkPriorityDiagnostics:/** No scheduler lane is held by this test. */ ()=>({active:[0],waiting:0}),indexedDb:{getActivityState:/** Persistence is drained. */ ()=>({queuedBodies:0,writerActive:false})},
    snapshotPersistTimer:null,building:false,hasPendingSnapshotHydration:/** Hydration is drained. */ ()=>false,hasActiveSemanticPreparation:/** Model an in-flight semantic continuation. */ ()=>semantic,getIndexDiagnostics:/** Full snapshots retain existing lifecycle aggregates. */ ()=>({})};
  app.plugins.plugins['k-plex']={index,indexPreparationAdmitted:false,initialIndexComplete:true,indexDirty:false,getIndexStatus:/** Readiness alone cannot satisfy closure. */ ()=>{statusReads++;return {upToDate:true};},getStartupDiagnostics:/** Supply the full snapshot's existing diagnostic boundary. */ ()=>({}),startupDiagnostics:{progress:/** Supply actual finite lane progress without a status calculation. */ lane=>({phase:lane==='source'?'source-reconciliation':'source-authority'})}};
  const callback=/** The host registration must remain untouched. */ ()=>{};assert.equal(app.workspace.onLayoutReady(callback),callback);
  time=1000;metrics[0].cpu.cumulativeCPUUsage=12;metrics[1].cpu.cumulativeCPUUsage=22;tick();
  const beforeResourceCalls=statusReads;for(let n=0;n<100;n++)assert.equal(resourcePhase(),'source-reconciliation|source-authority');assert.equal(statusReads,beforeResourceCalls);
  assert.equal(probe.snapshot().preAdmission,true);assert.equal(probe.snapshot().last.cpuSeconds,4);assert.equal(probe.snapshot().closure,null);
  semantic=false;time=2000;tick();assert.equal(probe.snapshot().closure,null);
  pendingKnown=0;time=3000;tick();assert.equal(probe.snapshot().closure.elapsedMs,3000);
  metrics=[metrics[0],{pid:8,creationTime:6000,type:'Utility',cpu:{cumulativeCPUUsage:3}}];time=4000;tick();
  assert.equal(probe.snapshot().last.cpuSeconds,7);assert.equal(probe.snapshot().coverage.exits,1);assert.equal(probe.snapshot().coverage.births,1);
  hidden=true;focused=false;time=5000;tick();assert.equal(probe.snapshot().comparable,false);
  time=11000;tick();assert.equal(probe.snapshot().validCpu,false);assert.equal(probe.snapshot().closure.elapsedMs,11000);assert.equal(probe.snapshot().quietMs,0);
  assert.equal(resourceAttached,1);assert.equal(probe.snapshot(true).resources.attached,1);
  probe.stop();assert.equal(tick,null);assert.equal(app.workspace.onLayoutReady,original);
  assert.equal(resourceStopped,1);
});

test('startup diagnostic inventories only existing source flags without reads or acquisition',/** Count native-state flags while keeping identities and note I/O outside the result. */ ()=>{
  const files=[{},{},{}],states=new WeakMap([[files[0],{dirty:true,bodyDirty:true,created:false,resolutionDirty:false,revision:2,identity:'private'}],[files[1],{dirty:false,bodyDirty:false,created:true,resolutionDirty:true,revision:0,identity:null}]]);
  const source={states,getCounters:/** Return aggregate counters only. */ ()=>({checked:1})};
  const app={plugins:{plugins:{'k-plex':{index:{sourceAcquisition:source}}}},vault:{getMarkdownFiles:/** Enumerate existing native objects without reading notes. */ ()=>files}};
  assert.deepEqual(captureMacSourceFlags(app),{flags:{total:3,observed:2,dirty:1,bodyDirty:1,created:1,resolutionDirty:1,revisionNonZero:1,identityAssigned:1},source:{checked:1},retained:null,readiness:{initial:null,initialSourceIncomplete:null,dirty:null,semanticPending:null,searchPending:null,localCountsUnavailable:null}});
  app.vault.getMarkdownFiles=/** Refuse an unexpectedly larger diagnostic scope before scanning. */ ()=>new Array(20001);assert.throws(/** The cap is explicit, not a truncated successful observation. */ ()=>captureMacSourceFlags(app),/bound/);
});

test('retained-memory diagnostics never invoke producer validity callbacks',/** Observe bounded retention/retry facts without changing caller lifetime or budget state. */ ()=>{
  const source={states:new WeakMap(),getCounters:/** Return aggregate diagnostics without I/O. */ ()=>({}),repository:{
    memory:new Map([['private-owner',{expected:{kind:'head'},current:/** Diagnostic code must not evaluate this stateful producer guard. */ ()=>{throw Error('Do not call');}}]]),
    memoryBytes:32,unsaved:new Set(['private-owner','evicted-owner']),lanes:new Map(),pendingDeletes:new Map(),retryTimer:null,retryTask:null,retryFailures:2}};
  const app={plugins:{plugins:{'k-plex':{index:{sourceAcquisition:source}}}},vault:{getMarkdownFiles:/** No note enumeration is needed for the empty fixture. */ ()=>[]}};
  const value=captureMacSourceFlags(app);
  assert.deepEqual(value.retained,{entries:1,bytes:32,unsaved:2,unsavedWithMemory:1,unsavedWithoutMemory:1,withActiveLane:0,pendingDeletes:0,retryTimer:false,retryTask:false,retryFailures:2,expectedKinds:{head:1}});
  assert.ok(!JSON.stringify(value).includes('private-owner'));assert.ok(!JSON.stringify(value).includes('evicted-owner'));
});

test('late forwarding requires explicit diagnostic coverage and preserves outcomes, privacy and cleanup',/** Observe a post-attachment unsaved event without claiming early startup totals or replacing promises. */ async()=>{
  let tick;const originalLayout=/** Preserve native registration identity. */ callback=>callback;
  const promise=Promise.resolve({outcome:'unsaved',reason:'dependency-pending'}),adoption=Promise.resolve(false);
  const repo={runtime:{digest:/** Supply the real wrapper boundary. */ ()=>''},transaction:/** No storage request occurs in this fixture. */ ()=>{},unsaved:new Set(),
    rememberMemory:/** Simulate one real mask transition with a private owner. */ ()=>repo.unsaved.add('private-owner'),forgetMemory:/** Match the retirement boundary. */ ()=>{},tombstone:/** Match the deletion boundary. */ ()=>{},
    replace:/** Return exactly the producer's promise. */ ()=>promise,write:/** Match the public write boundary. */ ()=>promise,retryMemory:/** Match normal retry ownership. */ ()=>Promise.resolve()};
  const source={repository:repo,states:new WeakMap(),acquire:/** Match normal acquisition. */ ()=>promise,readBody:/** Match parser input requests. */ ()=>null,reconcile:/** Match inventory completion. */ ()=>adoption,
    getActivityState:/** Report existing drained work only. */ ()=>({}),hasSemanticDependencies:/** Authority remains separate from adoption. */ ()=>true};
  const index={sourceAcquisition:source,metadataParser:{parse:/** No Markdown is parsed by this fixture. */ ()=>{}},rebuild:/** Match the full-build boundary. */ ()=>{},adoptStartupSources:/** Preserve the actual false result. */ ()=>adoption,
    getSourceAcquisitionCounters:/** Report aggregates. */ ()=>({}),getSourceRepositoryDiagnostics:/** Report masks without identifiers. */ ()=>({unsaved:repo.unsaved.size}),getUrlIndexProgress:/** Supply normal progress. */ ()=>({complete:true}),getWorkPriorityDiagnostics:/** No scheduler work is introduced. */ ()=>({active:[0],waiting:0}),indexedDb:{getActivityState:/** No cache writer exists. */ ()=>({})},hasPendingSnapshotHydration:/** Hydration is inactive. */ ()=>false,hasActiveSemanticPreparation:/** No semantic task exists. */ ()=>false,getIndexDiagnostics:/** No raw diagnostic payloads. */ ()=>[]};
  const app={workspace:{onLayoutReady:originalLayout},plugins:{plugins:{'k-plex':{index,indexPreparationAdmitted:true,getIndexStatus:/** Readiness remains incomplete. */ ()=>({upToDate:false}),getStartupDiagnostics:/** Only aggregate data is returned. */ ()=>({})}}}};
  const factory=vm.runInNewContext('('+createMacStudyProbe.toString()+')',{require:/** Supply only native scalar capabilities. */ name=>name==='@electron/remote'?{getCurrentWindow:/** Select one test window. */ ()=>({isFocused:/** Keep native focus. */ ()=>true,webContents:{getBackgroundThrottling:/** Preserve policy. */ ()=>true}}),app:{getAppMetrics:/** Include browser and renderer once. */ ()=>[{pid:1,creationTime:1,type:'Browser',cpu:{cumulativeCPUUsage:0}},{pid:7,creationTime:1,type:'Tab',cpu:{cumulativeCPUUsage:0}}]}}:{pid:7,versions:{},memoryUsage:/** Supply scalar memory. */ ()=>({})},
    performance:{now:/** No real time passes. */ ()=>0},Date:{now:/** Fix the arm epoch. */ ()=>100},document:{hidden:false,hasFocus:/** Keep document focus. */ ()=>true},window:{setInterval:/** Own no real timer. */ callback=>{tick=callback;return 1;},clearInterval:/** Retire the fixture timer. */ ()=>{tick=null;}}});
  assert.throws(/** Default late observation cannot claim early counters. */ ()=>factory(app,{allowRunning:true,observers:true}),/Late startup/);
  const originalReplace=repo.replace,probe=factory(app,{allowRunning:true,observers:true,partialObservers:true,diagnostic:true,diagnosticEvents:true});
  repo.rememberMemory();assert.equal(repo.replace(),promise);assert.equal(index.adoptStartupSources(),adoption);await promise;await adoption;
  const result=probe.snapshot(true);assert.equal(result.preAdmission,false);assert.equal(result.operationCoverage,'since-late-attachment');
  assert.equal(result.outcomes['repository.replace.reason.dependency-pending'],1);assert.equal(result.outcomes['index.adoptStartupSources.boolean.false'],1);
  assert.ok(result.events.some(/** Observe a fixed unsaved reason without an owner coordinate. */ row=>row.kind==='repository-unsaved'&&row.reason==='dependency-pending'));
  for(let n=0;n<150;n++)repo.replace();await promise;
  assert.equal(probe.snapshot(true).events.length,128);assert.ok(probe.snapshot(true).eventDrops>0);
  assert.ok(!JSON.stringify(result).includes('private-owner'));probe.stop();assert.equal(repo.replace,originalReplace);assert.equal(app.workspace.onLayoutReady,originalLayout);assert.equal(tick,null);
});

test('Mac process CPU parsing retains centiseconds and long process lifetimes',/** Darwin time fields are cumulative CPU, not wall-clock timestamps. */ ()=>{
  assert.equal(macCpuSeconds('0:01.23'),1.23);assert.equal(macCpuSeconds('12:34.56'),754.56);
  assert.equal(macCpuSeconds('2:03:04.50'),7384.5);assert.equal(macCpuSeconds('1-02:03:04.50'),93784.5);
  assert.throws(/** Unsupported formats cannot be recorded as zero CPU. */ ()=>macCpuSeconds('unavailable'));
});

/** Make a finite isolated filesystem layout; never touch an actual registered vault. */
function fixture() {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'kplex-study-guards-'))),productionPath=join(root,"Zsolt's Brain (2025)"),vaultPath=join(root,'kplex-test-brain-mac'),configDir=join(vaultPath,'.obsidian');
  mkdirSync(productionPath);mkdirSync(join(configDir,'plugins','k-plex'),{recursive:true});
  writeFileSync(join(configDir,'community-plugins.json'),'[]');
  const artifacts=join(root,'artifacts');mkdirSync(artifacts);
  for(const directory of [artifacts,join(configDir,'plugins','k-plex')])for(const [name,value] of Object.entries({'main.js':'// test','styles.css':'/* test */','manifest.json':'{"id":"k-plex"}'}))writeFileSync(join(directory,name),value);
  return {root,artifacts,options:{vaultName:'kplex-test-brain-mac',vaultPath,configDir,productionPath}};
}

test('study guards reject production names, aliases, overlap and shared files',/** Exercise guards before any write-capable controller exists. */ ()=>{
  const f=fixture();
  try {
    const target=validateStudyTarget(f.options);
    assertLiveStudy(target,{name:f.options.vaultName,path:target.vault});
    assert.throws(/** Production name can never reuse this target. */ ()=>validateStudyTarget({...f.options,vaultName:"Zsolt's Brain (2025)"}));
    assert.throws(/** Live production path refusal is independent of caller arguments. */ ()=>assertLiveStudy(target,{name:f.options.vaultName,path:f.options.productionPath}));
    assert.throws(/** Exact database identity is mandatory. */ ()=>assertLiveStudy(target,{name:f.options.vaultName,path:target.vault},studyDatabaseName("Zsolt's Brain (2025)")));
    const nested=join(f.options.productionPath,f.options.vaultName),nestedConfig=join(nested,'.obsidian');
    mkdirSync(nestedConfig,{recursive:true});writeFileSync(join(nestedConfig,'community-plugins.json'),'[]');
    assert.throws(/** A correctly named copy still cannot live inside production. */ ()=>validateStudyTarget({...f.options,vaultPath:nested,configDir:nestedConfig}),/overlap/);
    // A Windows junction is a genuine directory alias without the symbolic-link privilege requirement.
    // Verify the native alias itself so portability never turns this safety case into a mock or skip.
    const alias=join(f.root,'alias');symlinkSync(f.options.vaultPath,alias,process.platform==='win32'?'junction':'dir');
    assert.equal(lstatSync(alias).isSymbolicLink(),true);assert.equal(realpathSync(alias),realpathSync(f.options.vaultPath));
    assert.throws(/** A same-name check alone must not admit filesystem aliases. */ ()=>validateStudyTarget({...f.options,vaultPath:alias}),/Symlink/);
    const shared=join(f.options.configDir,'shared.json');linkSync(join(f.options.configDir,'community-plugins.json'),shared);
    assert.throws(/** Hard-linked settings are refused even inside a distinct folder. */ ()=>validateStudyTarget(f.options),/hard-linked/);
  } finally {rmSync(f.root,{recursive:true,force:true});}
});

test('staging is stopped-only, complete and byte verified',/** No enable operation is part of staging. */ ()=>{
  const f=fixture();try {
    const target=validateStudyTarget(f.options);
    assert.throws(/** A loaded plugin must never see a replacement in progress. */ ()=>stageStudyArtifacts(target,f.artifacts,{loaded:true}),/stopped/);
    assert.throws(/** Pending storage ownership also fences replacement. */ ()=>stageStudyArtifacts(target,f.artifacts,{storageBusy:true}),/stopped/);
    const hashes=stageStudyArtifacts(target,f.artifacts,{loaded:false,storageBusy:false});assert.equal(Object.keys(hashes).length,3);
    assert.equal(readFileSync(join(target.pluginDir,'main.js'),'utf8'),'// test');
  }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('observation arms before enable; failed arm/enable clean up independently',/** A partial arm cannot consume first activation. */ async()=>{
  const events=[];
  await enableObserved({arm:/** Record arm order. */ async()=>events.push('arm'),enable:/** Record activation order. */ async()=>events.push('enable'),cleanup:/** Record rollback. */ async()=>events.push('cleanup')});
  assert.deepEqual(events,['arm','enable']);
  for(const failure of ['arm','enable']) {
    const calls=[];
    await assert.rejects(enableObserved({arm:/** Model an arm which may fail after owning resources. */ async()=>{calls.push('arm');if(failure==='arm')throw Error('arm');},
      enable:/** Model activation failure. */ async()=>{calls.push('enable');throw Error('enable');},cleanup:/** Cleanup remains unconditional after either failure. */ async()=>calls.push('cleanup')}));
    assert.equal(calls.at(-1),'cleanup');if(failure==='arm')assert.ok(!calls.includes('enable'));
  }
});

test('blocked reset stays busy until actual success and refuses wrong live identities',/** Fake only request delivery; native storage roundtrips are separate. */ async()=>{
  const name='kplex-test-brain-mac',expected={name,path:'/test/kplex-test-brain-mac',production:'/test/production',databaseName:studyDatabaseName(name)};
  const app={vault:{getName:/** Supply the guarded live name. */ ()=>name,adapter:{getBasePath:/** Supply the guarded live path. */ ()=>expected.path}},plugins:{plugins:{}}};
  let request;
  const indexedDB={deleteDatabase:/** Expose the request so blocked/late delivery can be tested. */ db=>{assert.equal(db,expected.databaseName);return request={};}};
  const factory=vm.runInNewContext('('+createMacStudyStorage.toString()+')',{require,Buffer,window:{},indexedDB});
  const controller=factory(app,expected),pending=controller.reset();request.onblocked();assert.equal(controller.busy,true);
  await assert.rejects(controller.reset(),/refused/);assert.throws(/** Tool disposal cannot abandon a pending delete. */ ()=>controller.close(),/owned/);
  request.onsuccess();assert.equal((await pending).blocked,true);assert.equal(controller.busy,false);controller.close();
  const wrong=factory(app,{...expected,databaseName:studyDatabaseName("Zsolt's Brain (2025)")});await assert.rejects(wrong.reset(),/refused/);
});

test('timed-out checkpoint closes a late connection without creating a receipt',/** A timeout must not leave an adoptable live database owner. */ async()=>{
  const f=fixture();try {
    const expected={name:f.options.vaultName,path:f.options.vaultPath,production:f.options.productionPath,databaseName:studyDatabaseName(f.options.vaultName)};
    const app={vault:{getName:/** Supply verified identity. */ ()=>expected.name,adapter:{getBasePath:/** Supply canonical test path. */ ()=>expected.path}},plugins:{plugins:{}}};
    let request,timeout,closed=0;
    const factory=vm.runInNewContext('('+createMacStudyStorage.toString()+')',{require,Buffer,
      window:{setTimeout:/** Retain the timer without a real wait. */ callback=>{timeout=callback;return 1;},clearTimeout:/** No native timer was created. */ ()=>{}},
      indexedDB:{open:/** Hold native delivery beyond the operation deadline. */ ()=>request={}}});
    const controller=factory(app,expected),job=controller.checkpoint(join(f.root,'late.rows'));
    timeout();await assert.rejects(job,/timed out/);assert.equal(controller.busy,false);
    request.result={close:/** Count deterministic late-handle disposal. */ ()=>closed++};request.onsuccess();
    assert.equal(closed,1);controller.close();
  }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('checkpoint value digests preserve structured values and distinguish lossy projections',/** V8 bytes are transport, never the value-equivalence oracle. */ ()=>{
  const factory=vm.runInNewContext('('+createMacStudyStorage.toString()+')',{require,Buffer});
  const controller=factory({},{}),buffer=new ArrayBuffer(16),view=new Uint8Array(buffer,4,4),sparse=new Array(2);
  sparse['01']='extra';const value={view,other:new Uint8Array(buffer,8,4),sparse,map:new Map([['x',undefined]]),date:new Date(123),nan:NaN,negativeZero:-0};
  value.self=value;
  assert.equal(controller.valueDigest(value),controller.valueDigest(structuredClone(value)));
  const roundtrip=controller.decodeValue(controller.encodeValue(value));
  assert.equal(controller.valueDigest(value),controller.valueDigest(roundtrip));
  assert.equal(roundtrip.view.buffer,roundtrip.other.buffer);assert.equal(roundtrip.view.buffer.byteLength,16);
  assert.notEqual(controller.valueDigest(sparse),controller.valueDigest([undefined,undefined]));
  assert.notEqual(controller.valueDigest(-0),controller.valueDigest(0));
  assert.notEqual(controller.valueDigest([view,view]),controller.valueDigest([new Uint8Array(view),new Uint8Array(view)]));
});

test('reset backup guards distinguish exact database identity from vault name and verify bytes',/** Wrong/missing backups never reach deletion. */ ()=>{
  const f=fixture();try {
    const target=validateStudyTarget(f.options),file=join(f.root,'checkpoint.rows');writeFileSync(file,'retained test bytes');
    const meta={format:2,name:target.databaseName,path:target.vault,fileSha256:createHash('sha256').update('retained test bytes').digest('hex')};
    writeFileSync(file+'.json',JSON.stringify(meta));assert.equal(verifyStudyCheckpoint(target,file).name,target.databaseName);
    writeFileSync(file+'.json',JSON.stringify({...meta,name:target.vaultName}));assert.throws(/** A vault label cannot authorize a database reset. */ ()=>verifyStudyCheckpoint(target,file),/another target/);
    writeFileSync(file+'.json',JSON.stringify(meta));writeFileSync(file,'changed');assert.throws(/** A torn or replaced stream is not a backup. */ ()=>verifyStudyCheckpoint(target,file),/digest mismatch/);
  }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('private checkpoints cannot be exported inside source or either vault',/** Check destinations before creating any raw row stream. */ ()=>{
  const f=fixture();try {
    const target=validateStudyTarget(f.options),project=join(f.root,'checkout');mkdirSync(project);
    validateStudyReceiptPath(target,project,join(f.root,'private.rows'));
    for(const root of [project,target.vault,target.production])assert.throws(/** All private-data destinations use the same containment guard. */ ()=>validateStudyReceiptPath(target,project,join(root,'private.rows')),/outside source and vaults/);
  }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('private receipts reject sibling Git repositories and worktrees',/** An unrelated checkout must not accept private data merely because it is outside this project. */ ()=>{
  const f=fixture();try {
    const target=validateStudyTarget(f.options),project=join(f.root,'checkout');mkdirSync(project);
    for(const kind of ['repository','worktree']) {
      const foreign=join(f.root,kind),reports=join(foreign,'nested','reports');mkdirSync(reports,{recursive:true});
      if(kind==='repository')mkdirSync(join(foreign,'.git'));else writeFileSync(join(foreign,'.git'),'gitdir: ../metadata');
      assert.throws(/** Refuse a Git ancestor before creating a report or checkpoint file. */ ()=>validateStudyReceiptPath(target,project,join(reports,'private.rows')),/Git/);
    }
  }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('native storage refuses Git destinations before database access',/** The serialized native controller independently guards direct calls without trusting the outer driver. */ async()=>{
  const f=fixture();try {
    const expected={name:f.options.vaultName,path:f.options.vaultPath,production:f.options.productionPath,databaseName:studyDatabaseName(f.options.vaultName)};
    const app={vault:{getName:/** Supply the positively identified test name. */ ()=>expected.name,adapter:{getBasePath:/** Supply its canonical test path. */ ()=>expected.path}},plugins:{plugins:{}}};
    let opened=0;
    const factory=vm.runInNewContext('('+createMacStudyStorage.toString()+')',{require,Buffer,window:{},indexedDB:{open:/** A refused destination must never reach this native boundary. */ ()=>{opened++;throw Error('Unexpected database access');}}});
    for(const kind of ['repository','worktree']) {
      const foreign=join(f.root,kind),reports=join(foreign,'nested','reports');mkdirSync(reports,{recursive:true});
      if(kind==='repository')mkdirSync(join(foreign,'.git'));else writeFileSync(join(foreign,'.git'),'gitdir: ../metadata');
      const controller=factory(app,expected);
      await assert.rejects(controller.checkpoint(join(reports,'private.rows')),/Git/);
      assert.equal(opened,0);assert.equal(controller.busy,false);controller.close();
    }
  }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('lossy legacy checkpoint transport is rejected before opening or clearing storage',/** File integrity alone cannot certify structured-value equivalence. */ async()=>{
  const f=fixture();try {
    const expected={name:f.options.vaultName,path:f.options.vaultPath,production:f.options.productionPath,databaseName:studyDatabaseName(f.options.vaultName)};
    const app={vault:{getName:/** Supply the guarded name. */ ()=>expected.name,adapter:{getBasePath:/** Supply the guarded root. */ ()=>expected.path}},plugins:{plugins:{}}};
    let opened=0;
    const factory=vm.runInNewContext('('+createMacStudyStorage.toString()+')',{require,Buffer,window:{},indexedDB:{open:/** Any native access would occur before the lossy stream was refused. */ ()=>{opened++;throw Error('Unexpected native access');}}});
    const controller=factory(app,expected),value=[1,new Uint8Array([1,2])],file=join(f.root,'lossy.rows');
    const line=JSON.stringify(['bodies',require('node:v8').serialize(value).toString('base64')])+'\n';writeFileSync(file,line);
    const rows={bodies:{count:1,sha256:createHash('sha256').update(controller.valueDigest(value)+'\n').digest('hex')}};
    writeFileSync(file+'.json',JSON.stringify({format:2,name:expected.databaseName,path:expected.path,layout:{stores:[{name:'bodies'}]},rows,fileSha256:createHash('sha256').update(line).digest('hex')}));
    await assert.rejects(controller.restore(file),/Decoded checkpoint digest mismatch/);assert.equal(opened,0);assert.equal(controller.busy,false);controller.close();
  }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('checkpoint decoding accepts bounded snapshot chunks and rejects oversized frames before native access',/** Large real snapshot rows remain bounded; cooperative verification retains exclusive ownership. */ async()=>{
  const f=fixture();try {
    const expected={name:f.options.vaultName,path:f.options.vaultPath,production:f.options.productionPath,databaseName:studyDatabaseName(f.options.vaultName)};
    const app={vault:{getName:/** Supply the guarded name. */ ()=>expected.name,adapter:{getBasePath:/** Supply the guarded root. */ ()=>expected.path}},plugins:{plugins:{}}};
    let opened=0,yields=0,controller;
    const factory=vm.runInNewContext('('+createMacStudyStorage.toString()+')',{require,Buffer,
      window:{setTimeout:/** Yield a task while activation remains fenced. */ callback=>{assert.equal(controller.busy,true);yields++;return setTimeout(callback,0);}},
      indexedDB:{open:/** A sentinel confirms complete decoded verification before native access. */ ()=>{opened++;assert.equal(controller.busy,true);throw Error('Native sentinel');}}});
    controller=factory(app,expected);
    const file=join(f.root,'large.rows'),value=[1,'x'.repeat(33*1024*1024)];
    const line=JSON.stringify(['snapshotChunks',controller.encodeValue(value).toString('base64')])+'\n';
    const rows={snapshotChunks:{count:1,sha256:createHash('sha256').update(controller.valueDigest(value)+'\n').digest('hex')}};
    /** Certify the exact private stream independently of its decoded acceptance. */
    function writeReceipt(content) {
      writeFileSync(file,content);
      writeFileSync(file+'.json',JSON.stringify({format:2,encoding:'v8-structured',name:expected.databaseName,path:expected.path,layout:{stores:[{name:'snapshotChunks'}]},rows,fileSha256:createHash('sha256').update(content).digest('hex')}));
    }
    writeReceipt(line);await assert.rejects(controller.restore(file),/Native sentinel/);
    assert.equal(opened,1);assert.ok(yields>0);assert.equal(controller.busy,false);
    writeReceipt('x'.repeat(64*1024*1024+1)+'\n');
    await assert.rejects(controller.restore(file),/row bound exceeded/);assert.equal(opened,1);assert.equal(controller.busy,false);controller.close();
  }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('diagnostic profiler refuses competing ownership and detaches after partial start failure',/** A failed capture cannot strand a debugger on the test renderer. */ async()=>{
  const f=fixture();try {
    const file=join(f.root,'cpu.json'),calls=[];
    await assert.rejects(captureMacRendererCpu({file,cli:/** No command can reach another debugger owner's session. */ ()=>{throw Error('Unexpected command');},evaluate:/** Report an existing owner. */ ()=>({attached:true,devtools:false})}),/Competing/);
    let attached=false,detached=false;
    await assert.rejects(captureMacRendererCpu({file,cli:/** Model debugger adoption followed by a failed start. */ (_command,method)=>{calls.push(method);if(method==='method=Profiler.enable')attached=true;if(method==='method=Profiler.start')throw Error('Start failed');return '{}';},
      evaluate:/** Expose/retire only the mock session adopted by this capture. */ code=>{if(code.includes('d.detach()')){attached=false;detached=true;return {detached:true};}return {attached,devtools:false};}}),/Start failed/);
    assert.equal(detached,true);assert.equal(attached,false);assert.deepEqual(calls,['method=Profiler.enable','method=Profiler.start','method=Profiler.disable']);
  }finally{rmSync(f.root,{recursive:true,force:true});}
});
