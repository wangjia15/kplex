/**
 * Separate diagnostic-only V8 CPU capture using the established native CLI/CDP commands.
 * Refuses a competing debugger/DevTools owner, preserves raw frames only in private storage,
 * and releases this capture's profiler/debugger independently of success. It never changes
 * production artifacts or counts worker samples again as additional process CPU.
 */
import {writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnNativeSync} from './processTools.mjs';

/** Capture the same separate native and renderer windows for plugin reload or application
 * startup diagnostics. The caller owns private paths/target guards and retains partial receipts. */
export async function captureMacDiagnosticProfiles({reportDir,report,cli,evaluate,save}) {
  const ids=evaluate("JSON.stringify({browser:require('@electron/remote').app.getAppMetrics().find(x=>x.type==='Browser')?.pid,renderer:require('process').pid})");
  report.nativeProfiles=[];
  for(const role of ['browser','renderer']) {
    if(!Number.isSafeInteger(ids[role]))throw Error('Native profile process unavailable');
    const file=join(reportDir,role+'-sample.txt'),at=new Date().toISOString();
    const sampled=spawnNativeSync('/usr/bin/sample',[String(ids[role]),'5','10','-file',file],{encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024});
    report.nativeProfiles.push({role,pid:ids[role],file,at,status:sampled.status,error:sampled.error?.message,output:sampled.stderr});save();
    if(sampled.error||sampled.status!==0||!existsSync(file))throw Error('Native sampling failed');
  }
  report.rendererCpuProfile=await captureMacRendererCpu({cli,evaluate,file:join(reportDir,'renderer.cpuprofile')});save();
}

/** Capture a bounded renderer window outside acceptance timing. The caller owns target/private
 * destination validation and supplies the same serial CLI/evaluation boundary as the study. */
export async function captureMacRendererCpu({cli,evaluate,file,durationMs=5000,wait=/** Wait outside Obsidian while the native profiler records. */ ms=>new Promise(/** Resolve this external observing timer. */ done=>setTimeout(done,ms))}) {
  if(!Number.isFinite(durationMs)||durationMs<1||durationMs>10000)throw Error('Diagnostic CPU window bound refused');
  const before=evaluate("JSON.stringify((()=>{const w=require('@electron/remote').getCurrentWindow();return {attached:w.webContents.debugger.isAttached(),devtools:w.webContents.isDevToolsOpened()}})())");
  if(before.attached||before.devtools)throw Error('Competing native debugger owner');
  let attempted=false,started=false;
  try {
    attempted=true;cli('dev:cdp','method=Profiler.enable');cli('dev:cdp','method=Profiler.start');started=true;
    const at=Date.now();await wait(durationMs);
    const output=cli('dev:cdp','method=Profiler.stop');started=false;
    const result=JSON.parse(output.slice(output.indexOf('{'))),profile=result.profile;
    if(!profile||!Array.isArray(profile.nodes)||!Array.isArray(profile.samples)||profile.samples.length!==profile.timeDeltas?.length)throw Error('Incomplete native CPU profile');
    writeFileSync(file,JSON.stringify(profile),{flag:'wx',mode:0o600});
    return {file,elapsedMs:Date.now()-at,samples:profile.samples.length,samplingIntervalMicroseconds:null,source:'Native CLI/CDP renderer profiler; worker/native CPU remains in process counters'};
  } finally {
    if(attempted) {
      try {
        const state=evaluate("JSON.stringify({attached:require('@electron/remote').getCurrentWindow().webContents.debugger.isAttached()})");
        if(state.attached){try{if(started)cli('dev:cdp','method=Profiler.stop');}finally{cli('dev:cdp','method=Profiler.disable');}}
      } finally {
        evaluate("(()=>{const d=require('@electron/remote').getCurrentWindow().webContents.debugger;if(d.isAttached())d.detach();return JSON.stringify({detached:!d.isAttached()})})()");
      }
    }
  }
}
