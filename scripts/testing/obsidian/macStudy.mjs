/**
 * Serial PR203 Mac study driver. All native calls select and verify the explicit disposable vault.
 * Staging, storage checkpoints and oracles occur outside timed work; enable is observed from before
 * onload. Raw reports and configuration receipts must stay outside Git. No production mutation,
 * fixture creation, forced flush, scheduler hold or cache-policy change is owned. The separate
 * startup action owns normal application quit only after positively verifying one test window.
 * Optional bounded convergence observers are restricted to explicitly labelled diagnostic runs.
 */
import {readFileSync,writeFileSync,mkdirSync,realpathSync,existsSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnNativeSync,obsidianCliExecutable} from './processTools.mjs';
import {validateStudyTarget,assertLiveStudy,stageStudyArtifacts,enableObserved,verifyStudyCheckpoint,validateStudyReceiptPath} from './macStudySafety.mjs';
import {createMacStudyStorage} from './macStudyStorage.mjs';
import {createMacStudyProbe} from './macStudyProbe.mjs';
import {runMacStudyOracle} from './macStudyOracle.mjs';
import {runMacStudyStartup} from './macStudyStartup.mjs';
import {captureMacDiagnosticProfiles} from './macStudyCpuProfile.mjs';
import {createStartupResourceProbe} from './startupResources.mjs';
import {runMacStudyAvailability} from './macStudyAvailability.mjs';
import {captureMacStudySystem} from './macStudySystem.mjs';
import {createStartupSourceConvergenceProbe} from './startupSourceConvergenceProbe.mjs';

const project=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const target=validateStudyTarget(config),action=config.action;
const stopAt=config.stopAt?Date.parse(config.stopAt):Infinity;
if(Number.isNaN(stopAt)||stopAt<=Date.now())throw Error('Invalid or expired observation stopAt');
const allowed=['inspect','checkpoint','restore','resume-restore','resume-checkpoint','reset','measure','control','startup','cleanup'];
if(!allowed.includes(action))throw Error('Unknown study action');
if(config.nativeProfile&&config.purpose!=='diagnostic')throw Error('Native profiles require a separately labelled diagnostic run');
if((config.detailedResources||config.resourceCounts||config.lateStartupObservers||config.diagnosticEvents||config.convergenceDiagnostics||config.availabilityTargets)&&config.purpose!=='diagnostic')throw Error('Resource/event/navigation observation requires a separate diagnostic run');
if(config.detailedResources&&config.resourceCounts)throw Error('Choose counts-only or detailed resource observation');
if(config.captureSourceFlags&&config.purpose!=='diagnostic')throw Error('Source-state inventory requires a separate diagnostic run');
if(config.availabilityTargets&&(!Number.isSafeInteger(config.availabilityAfterMs??15000)||(config.availabilityAfterMs??15000)<0||(config.availabilityAfterMs??15000)+65000>(config.maximumMs??2700000)))throw Error('Availability workload must fit within the diagnostic observation');
if(config.nativeProfile&&(!Number.isSafeInteger(config.profileAfterMs??30000)||(config.profileAfterMs??30000)<0||(config.profileAfterMs??30000)>(config.maximumMs??2700000)-25000))throw Error('Profile window must fit within the diagnostic observation');
mkdirSync(config.reportDir,{recursive:true,mode:0o700});
const reportDir=realpathSync(config.reportDir);
if(readdirSync(reportDir).length)throw Error('Use an empty report directory; previous and interrupted receipts are preserved');
validateStudyReceiptPath(target,project,join(config.reportDir,'report.json'));
if(config.checkpoint)validateStudyReceiptPath(target,project,config.checkpoint);
if(config.startupLayout)validateStudyReceiptPath(target,project,config.startupLayout);
if(config.availabilityTargets)validateStudyReceiptPath(target,project,config.availabilityTargets);
const report={schema:1,action,status:'running',started:new Date().toISOString(),node:process.version,
  platform:process.platform,
  target:{name:target.vaultName,path:target.vault,database:target.databaseName},source:config.source,purpose:config.purpose??'acceptance-observation',artifacts:null};
report.bounds={quietMs:config.quietMs??(action==='control'?60000:600000),maximumMs:config.maximumMs??2700000,stopAt:Number.isFinite(stopAt)?new Date(stopAt).toISOString():null,requireAc:config.requireAc!==false,requireUnlocked:true};
report.harness=Object.fromEntries(['macStudy.mjs','macStudySafety.mjs','macStudyStorage.mjs','macStudyProbe.mjs','macStudyOracle.mjs','macStudyStartup.mjs','macStudyCpuProfile.mjs','macStudyAvailability.mjs','macStudySystem.mjs','startupResources.mjs','startupSourceConvergenceProbe.mjs'].map(/** Freeze test-source identity before any native action. */ name=>[name,createHash('sha256').update(readFileSync(new URL(name,import.meta.url))).digest('hex')]));
const reportFile=join(reportDir,'report.json');
let restoration=null,measurementOwned=false;

/** Bound every native IPC process; a transport failure is recorded independently of product status. */
function cli(command,...args) {
  const result=spawnNativeSync(obsidianCliExecutable(),[`vault=${target.vaultName}`,command,...args],
    {cwd:project,encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:16*1024*1024});
  if(result.error||result.status!==0||/^Error:/m.test(result.stdout??''))throw Error(result.error?.message||result.stderr||result.stdout||'Native CLI failed');
  return result.stdout.trim();
}

/** Native evaluations return explicit JSON; never treat exit zero plus an Error string as success. */
function evaluate(code) {
  const output=cli('eval','code='+code),start=output.indexOf('{');
  if(start<0)throw Error('Missing JSON native reply: '+output.slice(0,200));
  return JSON.parse(output.slice(start));
}

/** Persist actual progress before awaiting another bounded native poll. */
function save() {writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n',{mode:0o600});}

/** Yield outside Obsidian without controlling its production scheduler. */
const delay=/** Wait between serial IPC observations. */ ms=>new Promise(/** Resolve the external polling timer. */ done=>setTimeout(done,ms));

/** Start an owned deferred storage job and retain blocked operations rather than abandoning requests. */
async function storage(method,file) {
  evaluate(`(()=>{const c=window.kplexMacStudy;if(c.busy)throw Error('Controller busy');c.busy=true;c.done=false;c.error=null;c.result=null;window.setTimeout(()=>{c.task=c.storage[${JSON.stringify(method)}](${file?JSON.stringify(file):''}).then(value=>{c.result=value;c.done=true;c.busy=false},error=>{c.error=String(error);c.done=true;c.busy=false})},20);return JSON.stringify({started:true})})()`);
  const deadline=Date.now()+300000;
  while(Date.now()<deadline) {
    await delay(1000);
    let state;
    try {state=evaluate('JSON.stringify({done:window.kplexMacStudy.done,busy:window.kplexMacStudy.storage.busy,error:window.kplexMacStudy.error,result:window.kplexMacStudy.done?window.kplexMacStudy.result:null})');}
    catch(error) {
      // IPC can time out while the retained native transaction continues. Do not abandon or
      // restart it, declare failure/success, or extend the original outer deadline.
      (report.storageTransportErrors??=[]).push({at:new Date().toISOString(),error:String(error)});save();continue;
    }
    if(state.done){if(state.error)throw Error(state.error);return state.result;}
  }
  report.storageStillOwned=true;throw Error('Storage timeout: controller retained; activation remains fenced');
}

/** Reuse the established native foreground sequence; retain the host's original throttling. */
async function foreground() {
  evaluate("(()=>{const c=window.kplexMacStudy;c.foreground=false;c.focusError=null;const remote=require('@electron/remote'),w=remote.getCurrentWindow();remote.app.show?.();remote.app.focus({steal:true});if(w.isMinimized())w.restore();w.show();w.moveTop();w.focus();return JSON.stringify({requested:true})})()");
  for(let attempt=0;attempt<20;attempt++) {
    await delay(250);
    const state=evaluate(`JSON.stringify({hidden:document.hidden,documentFocused:document.hasFocus(),windowFocused:require('@electron/remote').getCurrentWindow().isFocused(),throttle:require('@electron/remote').getCurrentWindow().webContents.getBackgroundThrottling(),system:(${captureMacStudySystem.toString()})(require('@electron/remote'))})`);
    if(!state.hidden&&state.documentFocused&&state.windowFocused&&['active','idle'].includes(state.system.idleState))return state;
  }
  throw Error('Foreground renderer unavailable; activation refused');
}

/** Verify the live target and native plugin isolation before installing maintenance controllers. */
function preflight() {
  if(realpathSync(cli('vault','info=path'))!==target.vault)throw Error('CLI target mismatch');
  const live=evaluate('JSON.stringify({name:app.vault.getName(),path:app.vault.adapter.getBasePath(),loaded:!!app.plugins.plugins["k-plex"],enabled:[...app.plugins.enabledPlugins],sync:!!app.internalPlugins.plugins.sync?.enabled,publish:!!app.internalPlugins.plugins.publish?.enabled,metadata:app.metadataCache.initialized,inProgress:app.metadataCache.inProgressTaskCount,resolver:app.metadataCache.linkResolverQueue?.items?.size??app.metadataCache.linkResolverQueue?.items?.length,indexingNotice:[...document.querySelectorAll(".notice")].some(el=>el.textContent?.includes("Indexing vault")),files:app.vault.getFiles().length,markdown:app.vault.getMarkdownFiles().length})');
  assertLiveStudy(target,live);report.preflight=live;
  if(live.loaded&&action!=='cleanup')throw Error('Plugin must be off before study action');
  if(!config.smoke&&(live.enabled.length||live.sync||live.publish))throw Error('Copy startup isolation changed');
  if(['measure','control','startup'].includes(action)&&(!live.metadata||live.inProgress||live.resolver||live.indexingNotice))throw Error('Host metadata still indexing');
  if(['measure','control','startup'].includes(action)) {
    const system=evaluate(`JSON.stringify((${captureMacStudySystem.toString()})(require('@electron/remote')))`);
    report.preflight.system=system;
    if(config.requireAc!==false&&(!system.powerSupported||system.onBattery))throw Error('Native AC power unavailable; activation refused');
    if(!['active','idle'].includes(system.idleState))throw Error('Unlocked native session unavailable; activation refused');
  }
  return live;
}

try {
  preflight();
  if(action==='resume-restore'||action==='resume-checkpoint') {
    // Observe the already-owned native job only. Never reinstall its controller, start another
    // transaction or reinterpret a timeout as success. Retain the original failed run separately.
    if(!config.checkpoint)throw Error('Restore checkpoint identity required');
    report.maintenanceForeground=await foreground();save();
    const expected=action==='resume-restore'?verifyStudyCheckpoint(target,config.checkpoint):null,deadline=Date.now()+300000;
    while(Date.now()<deadline) {
      await delay(1000);let state;
      try {state=evaluate('JSON.stringify({done:window.kplexMacStudy?.done,busy:window.kplexMacStudy?.storage.busy,error:window.kplexMacStudy?.error,result:window.kplexMacStudy?.done?window.kplexMacStudy.result:null})');}
      catch(error){(report.storageTransportErrors??=[]).push({at:new Date().toISOString(),error:String(error)});save();continue;}
      report.progress={done:state.done,busy:state.busy};save();
      if(state.error)throw Error(state.error);
      if(state.done) {
        const meta=expected??verifyStudyCheckpoint(target,config.checkpoint);
        if(state.busy||JSON.stringify(state.result?.rows)!==JSON.stringify(meta.rows)
          ||(action==='resume-restore'?!state.result?.verified:state.result?.fileSha256!==meta.fileSha256))throw Error('Retained storage result does not verify this checkpoint');
        report.storage=state.result;report.recovered=true;report.status='complete';break;
      }
    }
    if(report.status!=='complete'){report.storageStillOwned=true;throw Error('Retained restore still pending; activation remains fenced');}
  } else if(action==='startup') {
    const lifetime=evaluate('JSON.stringify({busy:!!window.kplexMacStudy?.busy||!!window.kplexMacStudy?.storage.busy})');
    if(lifetime.busy)throw Error('Storage still owned');
    report.artifacts=stageStudyArtifacts(target,config.artifactDir,{loaded:false,storageBusy:false});
    const startup=await runMacStudyStartup({target,config,report,cli,evaluate,save});report.status=startup.status;
  } else if(action==='cleanup') {
    evaluate("(()=>{const c=window.kplexMacStudy??={};c.probe?.stop();if(c.storage?.busy)throw Error('Storage still owned');c.cleanupDone=false;c.cleanupError=null;c.cleanupTask=app.plugins.disablePlugin('k-plex').then(()=>{c.cleanupDone=true},error=>{c.cleanupDone=true;c.cleanupError=String(error)});return JSON.stringify({started:true})})()");
    for(let n=0;n<30;n++){await delay(1000);const state=evaluate('JSON.stringify({done:window.kplexMacStudy.cleanupDone,error:window.kplexMacStudy.cleanupError})');if(state.error)throw Error(state.error);if(state.done)break;if(n===29)throw Error('Cleanup disable timeout');}
    report.cleanup=evaluate("(()=>{const c=window.kplexMacStudy;c?.probe?.stop();if(c?.storage?.busy)return JSON.stringify({blocked:true});c?.storage?.close();delete window.kplexMacStudy;return JSON.stringify({removed:true,loaded:!!app.plugins.plugins['k-plex'],enabled:[...app.plugins.enabledPlugins]})})()");
    if(report.cleanup.blocked)throw Error('Storage still owned');
    if(report.cleanup.loaded||report.cleanup.enabled.includes('k-plex'))throw Error('Cleanup left K-Plex enabled');
    report.status='complete';
  } else {
    report.controller=evaluate(`(()=>{const old=window.kplexMacStudy;if(old?.busy||old?.storage.busy)throw Error('Storage still owned');old?.probe?.stop();old?.storage.close();window.kplexMacStudy={storage:(${createMacStudyStorage.toString()})(app,${JSON.stringify({name:target.vaultName,path:target.vault,production:target.production,databaseName:target.databaseName})})};return JSON.stringify({installed:true})})()`);
    if(['checkpoint','restore'].includes(action)){report.maintenanceForeground=await foreground();save();}
    if(action==='inspect')report.storage=await storage('inspect');
    else if(['checkpoint','restore','reset'].includes(action)) {
      if(action==='reset') {
        const existing=await storage('inspect');
        if(existing.exists) {
          if(!config.checkpoint||!existsSync(config.checkpoint))throw Error('Existing test storage must have a retained checkpoint before reset');
          verifyStudyCheckpoint(target,config.checkpoint);
        }
      }
      report.storage=await storage(action,config.checkpoint);
    } else {
      const measured=action==='measure';
      const quietMs=config.quietMs??600000,maximumMs=config.maximumMs??2700000;
      if(!config.smoke&&((measured&&quietMs<600000)||(!measured&&quietMs<60000)||maximumMs>2700000))throw Error('Study observation bounds changed');
      report.foreground=await foreground();
      if(measured)report.artifacts=stageStudyArtifacts(target,config.artifactDir,{loaded:false,storageBusy:false});
      const layoutFile=join(reportDir,'layout-before.json');
      const before=evaluate('JSON.stringify({layout:app.workspace.getLayout()})');writeFileSync(layoutFile,JSON.stringify(before.layout),{mode:0o600});
      const settingsPath=join(target.pluginDir,'data.json'),originalData=readFileSync(settingsPath,'utf8');
      restoration={settingsPath,originalData,layout:before.layout};measurementOwned=measured;
      writeFileSync(join(reportDir,'data-before.json'),originalData,{mode:0o600});
      await enableObserved({
        arm:/** Arm native process sampling before onload, without changing startup settings. */ async()=>{
          report.arm=evaluate(`(()=>{const c=window.kplexMacStudy;if(c.storage.busy)throw Error('Storage busy');c.probe=(${createMacStudyProbe.toString()})(app,{...${JSON.stringify({observers:config.observers!==false,sampleMs:1000,storageBusy:false,databaseName:target.databaseName,diagnostic:config.purpose==='diagnostic',diagnosticEvents:!!config.diagnosticEvents,resourceDetailed:!config.resourceCounts,requireAc:config.requireAc!==false,requireUnlocked:true})},systemStateReader:(${captureMacStudySystem.toString()})${config.convergenceDiagnostics?',convergenceFactory:('+createStartupSourceConvergenceProbe.toString()+')':''}${config.detailedResources||config.resourceCounts?',resourceFactory:('+createStartupResourceProbe.toString()+')':''}});return JSON.stringify(c.probe.snapshot())})()`);
          if(!report.arm.validCpu)throw Error('Native cumulative CPU unavailable');
          if(!report.arm.comparable)throw Error('Renderer lost foreground before enable');
        },
        enable:/** Start the real plugin/view with ordinary production admission and scheduling. */ async()=>{
          if(measured)evaluate("(()=>{const c=window.kplexMacStudy;c.done=false;c.error=null;c.started=true;window.setTimeout(()=>{c.task=(async()=>{await app.plugins.enablePlugin('k-plex');const p=app.plugins.plugins['k-plex'];if(!p)throw Error('Plugin missing');if(!c.probe.snapshot().attached)throw Error('Pre-admission attach missed');await p.activateView()})().then(()=>{c.done=true},error=>{c.done=true;c.error=String(error)})},20);return JSON.stringify({started:true})})()");
        },
        cleanup:/** Release partially installed wrappers even if activation fails. */ async()=>{evaluate("(()=>{window.kplexMacStudy?.probe?.stop();return JSON.stringify({stopped:true})})()");},
      });
      const deadline=Math.min(Date.now()+maximumMs,stopAt);
      while(Date.now()<deadline) {
        await delay(config.smoke?1000:5000);
        let state;
        try {state=evaluate('JSON.stringify({done:window.kplexMacStudy.done,error:window.kplexMacStudy.error,probe:window.kplexMacStudy.probe.snapshot()})');}
        catch(error) {
          // A transport timeout does not stop the already-armed native sampler. Preserve that
          // observation and retry serially under the same deadline; other failures still abort.
          if(!String(error).includes('ETIMEDOUT'))throw error;
          (report.observationTransportErrors??=[]).push({at:new Date().toISOString(),error:String(error)});save();continue;
        }
        report.progress=state;save();
        if(state.error||state.probe.attachError)throw Error(state.error??state.probe.attachError);
        if(config.availabilityTargets&&!report.availabilityStarted&&state.probe.elapsedMs>=(config.availabilityAfterMs??15000)) {
          const targets=JSON.parse(readFileSync(config.availabilityTargets,'utf8'));
          evaluate(`(()=>{const c=window.kplexMacStudy;c.availabilityCancelled=false;c.availabilityDone=false;c.availabilityTask=(${runMacStudyAvailability.toString()})(app,{targets:${JSON.stringify(targets)},isCancelled:()=>c.availabilityCancelled,onProgress:value=>{c.availabilityProgress=value}}).then(value=>{c.availability=value;c.availabilityDone=true},error=>{c.availabilityError=String(error);c.availabilityDone=true});return JSON.stringify({started:true})})()`);
          report.availabilityStarted=true;
        }
        if(report.availabilityStarted)report.availability=evaluate('JSON.stringify({done:window.kplexMacStudy.availabilityDone,error:window.kplexMacStudy.availabilityError,result:window.kplexMacStudy.availability??window.kplexMacStudy.availabilityProgress})');
        if(config.nativeProfile&&!report.nativeProfiles&&state.probe.elapsedMs>=(config.profileAfterMs??30000)) {
          await captureMacDiagnosticProfiles({reportDir,report,cli,evaluate,save});
        }
        if(measured&&state.probe.quietMs>=quietMs){report.completedQuiet=true;break;}
        if(!measured&&state.probe.elapsedMs>=quietMs){report.completedQuiet=true;break;}
      }
      report.result=evaluate('JSON.stringify(window.kplexMacStudy.probe.snapshot(true))');
      report.status=report.completedQuiet?'complete':'incomplete';
      evaluate("(()=>{window.kplexMacStudy.availabilityCancelled=true;window.kplexMacStudy.probe.stop();return JSON.stringify({stopped:true})})()");
      if(measured) {
        const layout=evaluate('JSON.stringify({layout:app.workspace.getLayout()})');
        writeFileSync(join(reportDir,'layout-measured.json'),JSON.stringify(layout.layout),{flag:'wx',mode:0o600});
      }
      if(measured&&config.oracle) {
        const options=config.oracleTargets?{targets:JSON.parse(readFileSync(config.oracleTargets,'utf8'))}:{};
        evaluate(`(()=>{const c=window.kplexMacStudy;c.oracleDone=false;c.oracleError=null;c.oracleCancelled=false;c.oracleTask=(${runMacStudyOracle.toString()})(app,{...${JSON.stringify(options)},isCancelled:()=>c.oracleCancelled,onProgress:value=>{c.oracleProgress=value}}).then(value=>{c.oracle=value;c.oracleDone=true},error=>{c.oracleError=String(error);c.oracleDone=true});return JSON.stringify({started:true})})()`);
        for(let n=0;n<180;n++) {
          await delay(1000);const state=evaluate('JSON.stringify({done:window.kplexMacStudy.oracleDone,error:window.kplexMacStudy.oracleError,result:window.kplexMacStudy.oracleDone?window.kplexMacStudy.oracle:null})');
          if(state.error)throw Error(state.error);
          if(state.done){report.oracle=state.result;writeFileSync(join(reportDir,'oracle-targets.json'),JSON.stringify(state.result.targets),{mode:0o600});break;}
          if(n===179)throw Error('Oracle timeout');
        }
      }
      if(measured) {
        evaluate("(()=>{const c=window.kplexMacStudy;c.cleanupDone=false;c.task=(async()=>{const p=app.plugins.plugins['k-plex'];if(p)await p.settingsWriteQueue;await app.plugins.disablePlugin('k-plex');await app.workspace.changeLayout("+JSON.stringify(before.layout)+");c.cleanupDone=true})().catch(error=>{c.cleanupError=String(error);c.cleanupDone=true});return JSON.stringify({started:true})})()");
        for(let n=0;n<30;n++){await delay(1000);const state=evaluate('JSON.stringify({done:window.kplexMacStudy.cleanupDone,error:window.kplexMacStudy.cleanupError})');if(state.error)throw Error(state.error);if(state.done)break;if(n===29)throw Error('Disable cleanup timeout');}
        await delay(1500);writeFileSync(settingsPath,originalData);
      }
      report.cleanup=evaluate("(()=>{const c=window.kplexMacStudy;c.probe.stop();c.storage.close();delete window.kplexMacStudy;return JSON.stringify({removed:true,loaded:!!app.plugins.plugins['k-plex'],enabled:[...app.plugins.enabledPlugins]})})()");
    }
    if(!['measure','control'].includes(action))report.status='complete';
  }
} catch(error) {
  report.status='failed';report.error=String(error);
    try{report.failure=evaluate('JSON.stringify({probe:window.kplexMacStudy?.probe?.snapshot(true),oracle:window.kplexMacStudy?.oracleProgress,storageBusy:window.kplexMacStudy?.storage.busy,loaded:!!app.plugins.plugins["k-plex"]})');}catch(capture){report.captureError=String(capture);}
} finally {
  if(restoration) {
    try {
      evaluate("(()=>{const c=window.kplexMacStudy;if(c){c.oracleCancelled=true;c.availabilityCancelled=true;}c?.probe?.stop();return JSON.stringify({stopped:true})})()");
      if(measurementOwned) {
        evaluate("(()=>{let c=window.kplexMacStudy;if(!c)c=window.kplexMacStudy={};c.finalDone=false;c.finalError=null;c.finalTask=(async()=>{await app.plugins.disablePlugin('k-plex');await app.workspace.changeLayout("+JSON.stringify(restoration.layout)+");c.finalDone=true})().catch(error=>{c.finalError=String(error);c.finalDone=true});return JSON.stringify({started:true})})()");
        for(let n=0;n<30;n++){await delay(1000);const state=evaluate('JSON.stringify({done:window.kplexMacStudy.finalDone,error:window.kplexMacStudy.finalError})');if(state.error)throw Error(state.error);if(state.done)break;if(n===29)throw Error('Final cleanup timeout');}
        await delay(1500);writeFileSync(restoration.settingsPath,restoration.originalData);
      }
      const cleanup=evaluate("(()=>{const c=window.kplexMacStudy;if(c?.storage?.busy)throw Error('Storage still owned');c?.storage?.close();delete window.kplexMacStudy;return JSON.stringify({removed:true,loaded:!!app.plugins.plugins['k-plex'],enabled:[...app.plugins.enabledPlugins]})})()");
      report.finalCleanup=cleanup;
      if(cleanup.loaded)throw Error('Study plugin remains loaded');
    } catch(error){report.cleanupError=String(error);report.status='failed';}
  }
  report.finished=new Date().toISOString();save();
}
console.log(JSON.stringify({status:report.status,error:report.error,report:reportFile}));
if(report.status==='failed')process.exitCode=1;
