/**
 * Test-only Mac full-application startup lane. Requires exactly one native window belonging to
 * the guarded copy, quits normally, and records new process identities from before relaunch in
 * an independent bounded child. Early CPU coverage survives synchronous CLI reconnects; native
 * scalar observation is explicitly late and cannot claim complete early operation counters.
 * Pure diagnostic flag reads retry at most twice under the run deadline. Failed runs attempt
 * full probe capture before the independent recorder, observer and configuration cleanup. Optional
 * convergence observers forward existing owners and retain bounded scalar diagnostics only.
 */
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnNativeSync} from './processTools.mjs';
import {createMacStudyProbe} from './macStudyProbe.mjs';
import {verifyStudyCheckpoint} from './macStudySafety.mjs';
import {captureMacDiagnosticProfiles} from './macStudyCpuProfile.mjs';
import {createStartupResourceProbe} from './startupResources.mjs';
import {captureMacStudySystem} from './macStudySystem.mjs';
import {createStartupSourceConvergenceProbe} from './startupSourceConvergenceProbe.mjs';

const executable='/Applications/Obsidian.app',self=fileURLToPath(import.meta.url);

/** Diagnostic-only inventory of existing native source-state flags. No note reads, acquisition,
 * mutations or exported identities; the caller gates this bounded scan outside primary timing. */
export function captureMacSourceFlags(app) {
  const plugin=app.plugins.plugins['k-plex'],index=plugin?.index,source=index?.sourceAcquisition,files=app.vault.getMarkdownFiles();
  if(!source?.states?.get||files.length>20000)throw Error('Source-state diagnostic bound/capability refused');
  const flags={total:files.length,observed:0,dirty:0,bodyDirty:0,created:0,resolutionDirty:0,revisionNonZero:0,identityAssigned:0};
  for(const file of files) {
    const state=source.states.get(file);if(!state)continue;
    flags.observed++;
    for(const key of ['dirty','bodyDirty','created','resolutionDirty'])flags[key]+=Number(Boolean(state[key]));
    flags.revisionNonZero+=Number(state.revision>0);flags.identityAssigned+=Number(Boolean(state.identity));
  }
  const repo=source.repository;
  let retained=null;
  if(Object.prototype.toString.call(repo?.memory)==='[object Map]'&&Object.prototype.toString.call(repo.unsaved)==='[object Set]') {
    if(repo.memory.size>20000||repo.unsaved.size>20000)throw Error('Retained-state diagnostic bound refused');
    retained={entries:repo.memory.size,bytes:repo.memoryBytes,unsaved:repo.unsaved.size,unsavedWithMemory:0,
      unsavedWithoutMemory:0,withActiveLane:0,pendingDeletes:repo.pendingDeletes?.size??null,
      retryTimer:repo.retryTimer===undefined?null:repo.retryTimer!==null,retryTask:repo.retryTask===undefined?null:!!repo.retryTask,retryFailures:repo.retryFailures??null,expectedKinds:{}};
    for(const key of repo.unsaved)if(repo.memory.has(key))retained.unsavedWithMemory++;else retained.unsavedWithoutMemory++;
    for(const [key,value] of repo.memory) {
      retained.withActiveLane+=Number(repo.lanes?.has(key)??false);
      const kind=['head','missing','unavailable'].includes(value.expected?.kind)?value.expected.kind:'other';
      retained.expectedKinds[kind]=(retained.expectedKinds[kind]??0)+1;
    }
    // Stored current() callbacks may carry caller budget/lifetime state. Never invoke them just
    // to observe validity; actual production outcomes are collected by the forwarding probe.
  }
  return {flags,source:source.getCounters(),retained,readiness:{initial:plugin.initialIndexComplete??null,
    initialSourceIncomplete:plugin.initialSourceIndexIncomplete??null,dirty:plugin.indexDirty??null,
    semanticPending:index.hasPendingSemanticPreparation?.()??null,searchPending:index.hasPendingSearchVocabulary?.()??null,
    localCountsUnavailable:index.hasUnavailableLocalCounts?.()??null}};
}

/** Retry only the pure aggregate flag query, at most twice under the unchanged run deadline. */
export function readMacDiagnosticFlags(evaluate,deadline,onTimeout,now=Date.now) {
  for(let attempt=0;attempt<2;attempt++) {
    if(now()>=deadline)throw Error('Diagnostic flag deadline reached');
    try{return evaluate(`JSON.stringify((${captureMacSourceFlags.toString()})(app))`);}
    catch(error) {
      if(!String(error).includes('ETIMEDOUT'))throw error;
      onTimeout({at:new Date(now()).toISOString(),attempt:attempt+1,error:String(error)});
      if(attempt===1)throw error;
    }
  }
}

/** Retain an attached probe before failed-run cleanup; capture failure cannot replace the original error. */
export function preserveMacStartupFailureState(state,evaluate) {
  if(!state.attachedAt||state.result)return;
  try {
    state.result=evaluate('JSON.stringify(window.kplexMacStartup.probe.snapshot(true))');
    state.resultCapturedAfterFailure=true;
  }catch(error){state.resultCaptureError=String(error);}
}

/** Parse Darwin's cumulative process time, including long-lived hour/day forms. */
export function macCpuSeconds(value) {
  if(!/^(?:\d+-)?\d+(?::\d{2}){1,2}(?:\.\d+)?$/.test(value))throw Error('Unsupported ps CPU time');
  const [days,clock]=value.includes('-')?value.split('-'):['0',value];
  const parts=clock.split(':').map(Number);
  if(parts.length<2||parts.length>3||parts.some(/** Reject unsupported ps formats. */ n=>!Number.isFinite(n)))throw Error('Unsupported ps CPU time');
  return Number(days)*86400+parts.reduce(/** Expand sexagesimal components. */ (total,n)=>total*60+n,0);
}

/** Read only application process identity/time/command, with no note content or arguments. */
function applicationProcesses() {
  const result=spawnNativeSync('/bin/ps',['-axo','pid=,ppid=,lstart=,time=,comm='],{encoding:'utf8',timeout:3000,maxBuffer:8*1024*1024});
  if(result.error||result.status!==0)throw Error('Native process inventory unavailable');
  const rows=[];
  for(const line of result.stdout.split('\n')) {
    const match=line.match(/^\s*(\d+)\s+(\d+)\s+(\S+\s+\S+\s+\d+\s+\S+\s+\d+)\s+(\S+)\s+(.+)$/);
    if(!match||!match[5].startsWith(executable+'/Contents/')||match[5]===executable+'/Contents/MacOS/obsidian-cli')continue;
    rows.push({pid:Number(match[1]),parent:Number(match[2]),created:match[3],cpu:macCpuSeconds(match[4]),command:match[5]});
  }
  return rows;
}

/** Independent recorder: all selected processes must be absent at arm, so new CPU starts at zero.
 * Exited processes retain their last observed cumulative time; final subsecond CPU can be missed. */
async function recordProcesses(file,maximumMs) {
  const report={started:new Date().toISOString(),samples:[],processes:[],errors:[],maximumGapMs:0,scope:'Darwin ps cumulative CPU; one identity per PID/lstart; threads included; terminal exit intervals may be missed'},identities=new Map();
  let timer,closed=false,last=Date.now();
  /** Persist the last process times and total without exposing process arguments. */
  function sample() {
    const now=Date.now();report.maximumGapMs=Math.max(report.maximumGapMs,now-last);last=now;
    try {
      const current=applicationProcesses();
      for(const row of current)identities.set(row.pid+':'+row.created,row);
      report.processes=Array.from(identities.values());
      report.samples.push({at:now,cpuSeconds:report.processes.reduce(/** Sum each process lifetime once. */ (total,row)=>total+row.cpu,0),present:current.map(/** Retain process identities, not arguments. */ row=>row.pid)});
    }catch(error){report.errors.push({at:now,error:String(error)});}
    writeFileSync(file,JSON.stringify(report),{mode:0o600});
  }
  /** Stop only the owned recorder, after a final sample and durable receipt. */
  function stop() {
    if(closed)return;closed=true;clearInterval(timer);clearTimeout(deadline);sample();process.exitCode=0;
    process.removeListener('SIGTERM',stop);
  }
  if(applicationProcesses().length)throw Error('Startup recorder must arm with Obsidian absent');
  sample();timer=setInterval(sample,1000);const deadline=setTimeout(stop,maximumMs);
  process.on('SIGTERM',stop);
}

/** Run through the serial study driver only. No forced termination or production opening is used.
 * Saved enablement is temporary, restored independently of runtime observation success. */
export async function runMacStudyStartup({target,config,report,cli,evaluate,save}) {
  if(process.platform!=='darwin')throw Error('Actual Mac startup required');
  const maximumMs=config.maximumMs??900000;
  if((config.nativeProfile||config.captureSourceFlags||config.lateStartupObservers||config.diagnosticEvents||config.convergenceDiagnostics||config.resourceCounts||config.detailedResources)&&config.purpose!=='diagnostic')throw Error('Startup detail requires diagnostic purpose');
  if(maximumMs<60000||maximumMs>2700000)throw Error('Startup observation bound refused');
  const communityFile=join(target.config,'community-plugins.json'),dataFile=join(target.pluginDir,'data.json'),workspaceFile=join(target.config,'workspace.json');
  const community=readFileSync(communityFile,'utf8'),data=readFileSync(dataFile,'utf8'),workspace=readFileSync(workspaceFile,'utf8');
  const layout=evaluate('JSON.stringify({layout:app.workspace.getLayout()})').layout;
  writeFileSync(join(config.reportDir,'startup-community-before.json'),community,{mode:0o600});
  writeFileSync(join(config.reportDir,'startup-data-before.json'),data,{mode:0o600});
  writeFileSync(join(config.reportDir,'startup-layout-before.json'),JSON.stringify(layout),{mode:0o600});
  writeFileSync(join(config.reportDir,'startup-workspace-before.json'),workspace,{mode:0o600});
  const cpuFile=join(config.reportDir,'startup-cpu.json');let child,launched=false;
  /** Wait outside the application while the independent recorder keeps sampling. */
  const wait=/** Resolve one serial observation delay. */ ms=>new Promise(/** Own this external timer. */ done=>setTimeout(done,ms));
  report.startup={status:'running',counterCoverage:config.lateStartupObservers?'Diagnostic forwarding counts since late CLI attachment only; no full startup operation totals':'Native sampler attaches after CLI reconnect; early operation counters unavailable',cache:'Aging state after the preceding completed run; no matched startup pair',quietRequiredMs:600000};save();
  try {
    const registry=JSON.parse(readFileSync(join(homedir(),'Library/Application Support/obsidian/obsidian.json'),'utf8'));
    const reopen=Object.values(registry.vaults??{}).filter(/** Only marked-open entries can be automatically restored. */ row=>row.open);
    if(reopen.some(/** Refuse any saved startup route to a different vault, including production. */ row=>realpathSync(row.path)!==target.vault))throw Error('Registry would reopen another vault; startup refused');
    report.startup.registryOpenVaults=reopen.length;
    if(config.checkpoint) {
      const meta=verifyStudyCheckpoint(target,config.checkpoint),state=evaluate('JSON.stringify({done:window.kplexMacStudy?.done,busy:window.kplexMacStudy?.storage.busy,result:window.kplexMacStudy?.result})');
      if(!state.done||state.busy||!state.result?.verified||JSON.stringify(state.result.rows)!==JSON.stringify(meta.rows))throw Error('Startup requires the immediately preceding verified common restore');
      report.startup.cache={checkpointSha256:meta.fileSha256,stores:meta.rows};
    }
    report.startup.preflight=evaluate(`(()=>{const r=require('@electron/remote'),w=r.getCurrentWindow(),all=r.BrowserWindow.getAllWindows().filter(x=>!x.isDestroyed());if(app.vault.getName()!==${JSON.stringify(target.vaultName)}||app.vault.adapter.getBasePath()!==${JSON.stringify(target.vault)}||all.length!==1||all[0].id!==w.id||app.plugins.plugins['k-plex'])throw Error('Startup isolation refused');return JSON.stringify({windows:all.length,window:w.id,metrics:r.app.getAppMetrics().map(x=>({pid:x.pid,created:x.creationTime,type:x.type}))})})()`);
    evaluate("(()=>{const r=require('@electron/remote');window.setTimeout(()=>r.app.quit(),100);return JSON.stringify({quitRequested:true})})()");
    const shutdownLimit=Date.now()+30000;
    while(applicationProcesses().length&&Date.now()<shutdownLimit)await wait(500);
    if(applicationProcesses().length)throw Error('Normal application quit did not finish; no second launch attempted');
    writeFileSync(communityFile,JSON.stringify(['k-plex']));
    if(config.startupLayout) {
      const saved=readFileSync(config.startupLayout,'utf8');JSON.parse(saved);writeFileSync(workspaceFile,saved);
      report.startup.layoutSha256=createHash('sha256').update(saved).digest('hex');
    }
    child=spawn(process.execPath,[self,'--sample',cpuFile,String(maximumMs+60000)],{stdio:'ignore'});
    child.on('error',/** Retain recorder launch failure, rather than silently losing early coverage. */ error=>{report.startup.recorderError=String(error);});
    for(let n=0;n<30&&!existsSync(cpuFile);n++)await wait(100);
    if(!existsSync(cpuFile))throw Error('External recorder did not arm');
    report.startup.launchAt=new Date().toISOString();save();
    launched=true;report.startup.launchAttempted=true;
    const opened=spawnNativeSync('/usr/bin/open',['-a',executable,'obsidian://open?vault='+encodeURIComponent(target.vaultName)],{encoding:'utf8',timeout:10000});
    if(opened.error||opened.status!==0)throw Error('Application relaunch failed');
    const deadline=Date.now()+maximumMs;let armed=false;
    while(Date.now()<deadline) {
      await wait(5000);
      try {
        if(!armed) {
          report.startup.reconnectedAt=new Date().toISOString();
          const attachment=evaluate(`(()=>{if(app.vault.getName()!==${JSON.stringify(target.vaultName)}||app.vault.adapter.getBasePath()!==${JSON.stringify(target.vault)})throw Error('Startup target mismatch');const p=app.plugins.plugins['k-plex'];if(!p?.index)throw Error('Startup plugin not loaded yet');const r=require('@electron/remote'),w=r.getCurrentWindow();if(r.BrowserWindow.getAllWindows().filter(x=>!x.isDestroyed()).length!==1)throw Error('Startup lost single-window isolation');r.app.show?.();r.app.focus({steal:true});w.show();w.moveTop();w.focus();if(!window.kplexMacStartup?.probe){const epoch=Date.now();window.kplexMacStartup={epoch,probe:(${createMacStudyProbe.toString()})(app,{...${JSON.stringify({observers:!!config.lateStartupObservers,allowRunning:true,partialObservers:!!config.lateStartupObservers,diagnostic:config.purpose==='diagnostic',diagnosticEvents:!!config.diagnosticEvents,databaseName:target.databaseName,resourceDetailed:!config.resourceCounts,requireAc:config.requireAc!==false,requireUnlocked:true})},systemStateReader:(${captureMacStudySystem.toString()})${config.convergenceDiagnostics?',convergenceFactory:('+createStartupSourceConvergenceProbe.toString()+')':''}${config.detailedResources||config.resourceCounts?',resourceFactory:('+createStartupResourceProbe.toString()+')':''}})};}return JSON.stringify({attached:true,epoch:window.kplexMacStartup.epoch})})()`);
          armed=true;report.startup.probeEpoch=attachment.epoch;report.startup.attachedAt=new Date().toISOString();
          if(config.captureSourceFlags) {
            report.startup.sourceFlags=[];
            const value=readMacDiagnosticFlags(evaluate,deadline,/** Preserve transport failures independently of a later successful pure read. */ value=>{(report.startup.diagnosticTransportErrors??=[]).push(value);save();});
            report.startup.sourceFlags.push({boundary:'attached',at:Date.now(),value});
          }
        }
        report.startup.progress=evaluate('JSON.stringify({at:Date.now(),metadata:app.metadataCache.initialized,inProgress:app.metadataCache.inProgressTaskCount,resolver:app.metadataCache.linkResolverQueue?.items?.length??app.metadataCache.linkResolverQueue?.items?.size,domCenter:[...document.querySelectorAll(".kplex-role-center[data-kplex-path]")].some(el=>el.getAttribute("data-kplex-path")===app.plugins.plugins["k-plex"]?.settings.lastActivePath),probe:window.kplexMacStartup.probe.snapshot()})');
        if(report.startup.progress.domCenter&&report.startup.firstObservedDomMs===undefined)report.startup.firstObservedDomMs=Date.now()-Date.parse(report.startup.launchAt);
        save();
        if(config.nativeProfile&&!report.startup.nativeProfiles&&report.startup.progress.probe.elapsedMs>=(config.profileAfterMs??30000)) {
          try {
            if(config.captureSourceFlags) {
              const value=readMacDiagnosticFlags(evaluate,deadline,/** Retrying this read never starts a profiler or storage operation. */ value=>{(report.startup.diagnosticTransportErrors??=[]).push(value);save();});
              report.startup.sourceFlags.push({boundary:'before-profile',at:Date.now(),value});
            }
            await captureMacDiagnosticProfiles({reportDir:config.reportDir,report:report.startup,cli,evaluate,save});
            if(config.captureSourceFlags) {
              const value=readMacDiagnosticFlags(evaluate,deadline,/** Keep a late read timeout separate from profiler ownership/cleanup. */ value=>{(report.startup.diagnosticTransportErrors??=[]).push(value);save();});
              report.startup.sourceFlags.push({boundary:'after-profile',at:Date.now(),value});
            }
          }catch(error){report.startup.profileError=String(error);throw error;}
        }
        if(report.startup.progress.metadata&&!report.startup.progress.inProgress&&!report.startup.progress.resolver
          &&report.startup.progress.domCenter&&report.startup.progress.probe.quietMs>=600000){report.startup.status='complete';break;}
      }catch(error){(report.startup.reconnects??=[]).push({at:new Date().toISOString(),error:String(error)});save();}
      if(report.startup.profileError)throw Error('Startup diagnostic capture failed: '+report.startup.profileError);
    }
    if(armed)report.startup.result=evaluate('JSON.stringify(window.kplexMacStartup.probe.snapshot(true))');
    if(report.startup.status==='running')report.startup.status='incomplete';
    return report.startup;
  } catch(error) {
    report.startup.status='failed';report.startup.error=String(error);
    preserveMacStartupFailureState(report.startup,evaluate);
    throw error;
  } finally {
    const cleanupErrors=[];
    try {
      if(child&&child.exitCode===null&&!child.signalCode) {
        child.kill('SIGTERM');
        for(let n=0;n<80&&child.exitCode===null&&!child.signalCode;n++)await wait(100);
        if(child.exitCode===null&&!child.signalCode){child.kill('SIGKILL');report.startup.forcedRecorderStop=true;await wait(200);}
      }
    }catch(error){cleanupErrors.push('Recorder stop: '+String(error));}
    try {
      if(existsSync(cpuFile)) {
        report.startup.externalCpu=JSON.parse(readFileSync(cpuFile,'utf8'));
        report.startup.externalCpuValid=!report.startup.forcedRecorderStop&&!report.startup.recorderError&&report.startup.externalCpu.errors.length===0
          &&report.startup.externalCpu.maximumGapMs<2000&&report.startup.externalCpu.processes.length>0;
      }
    }catch(error){cleanupErrors.push('Recorder receipt: '+String(error));}
    try {
      if(launched&&applicationProcesses().length) {
        // A normal saved startup populates enabledPlugins from disk. Runtime-only disable does
        // not clear that saved-enabled set; use the normal disable-and-save owner, then restore
        // the exact original file bytes independently below. An uncertain launch also cleans up.
        evaluate(`(()=>{const c=window.kplexMacStartup??={};c.probe?.stop();c.done=false;c.task=(async()=>{const p=app.plugins.plugins['k-plex'];if(p)await p.settingsWriteQueue;await app.plugins.disablePluginAndSave('k-plex');await app.workspace.changeLayout(${JSON.stringify(layout)});c.done=true})().catch(error=>{c.error=String(error);c.done=true});return JSON.stringify({started:true})})()`);
        for(let n=0;n<30;n++){await wait(1000);const state=evaluate('JSON.stringify({done:window.kplexMacStartup.done,error:window.kplexMacStartup.error})');if(state.error)throw Error(state.error);if(state.done)break;if(n===29)throw Error('Startup cleanup timeout');}
        await wait(1500);
        report.startup.cleanup=evaluate("(()=>{delete window.kplexMacStartup;return JSON.stringify({loaded:!!app.plugins.plugins['k-plex'],enabled:[...app.plugins.enabledPlugins]})})()");
        if(report.startup.cleanup.loaded||report.startup.cleanup.enabled.length)throw Error('Startup plugin remains enabled');
      } else if(launched)report.startup.cleanup={applicationStopped:true,loaded:false};
    }catch(error){cleanupErrors.push('Native cleanup: '+String(error));}
    for(const [file,bytes] of [[communityFile,community],[dataFile,data],[workspaceFile,workspace]])try{writeFileSync(file,bytes);}catch(error){cleanupErrors.push('Configuration restore: '+String(error));}
    report.startup.configurationRestored=cleanupErrors.length===0;report.startup.cleanupErrors=cleanupErrors;save();
    if(cleanupErrors.length)throw Error('Startup cleanup incomplete: '+cleanupErrors.join('; '));
  }
}

if(process.argv[2]==='--sample')await recordProcesses(process.argv[3],Number(process.argv[4]));
