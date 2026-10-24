/**
 * Native PR203 observation installed before plugin enable. Uses existing diagnostic owners and
 * forwarding counters; retains no note text and exports no owner coordinates. Weakly held file
 * observations are private. CPU includes each Electron
 * process identity once. Optional existing resource instrumentation belongs only to a separate
 * diagnostic lane, including optional bounded PR206 source/recovery observation. The caller supplies a self-contained native system reader; strict runs require
 * sampled AC and an unlocked session. Long gaps invalidate CPU coverage and restart quiet.
 */
export function createMacStudyProbe(app,options) {
  const remote=require('@electron/remote'),win=remote.getCurrentWindow(),processInfo=require('process');
  const originalLayout=app.workspace.onLayoutReady,originals=[],processes=new Map(),samples=[];
  const started=performance.now(),epoch=Date.now(),throttle=win.webContents.getBackgroundThrottling();
  let plugin=null,timer=null,closed=false,attached=false,preAdmission=null,attachError=null,lastSample=started,resources=null,convergence=null;
  const counts={parserCalls:0,parserUtf16:0,hashCalls:0,hashUtf16:0,transactions:0,readonly:0,readwrite:0,
    acquisitions:0,uniqueAcquiredOwners:0,repeatedAcquiredOwners:0,sameRevisionRevisits:0,bodyRequests:0,dirtyBodyRequests:0,
    inventoryStarts:0,sourceAdoptions:0,fullBuilds:0,maskAdds:0,maskRemoves:0,repeatedMaskAdds:0};
  const owners=new WeakSet(),revisions=new WeakMap(),outcomes={},maskOrigins={};
  const known=new Set(['ready','activated','absent','unsaved','cancelled','superseded','rejected','missing','stale','pending-metadata',
    'storage-unavailable','backpressure','quota-exceeded','write-error','read-error','decode-budget','memory-budget',
    'invalid-head','invalid-chunk','invalid-frame','missing-chunk','tombstone','format-version','activated-not-live',
    'missing-posting','invalid-posting','unsupported-body-value','newer-database','catalog-uncertain',
    'dependency-pending','dependency-invalid','host-catalog-stale','unsupported-scope']);
  const events=[];let eventDrops=0;
  let maskContext='other';
  const coverage={samples:0,unsupported:0,emptySamples:0,invalidIdentity:0,regressions:0,exits:0,births:0,maximumGapMs:0,
    hidden:0,unfocused:0,throttleChanges:0,locked:0,idleUnsupported:0,onBattery:0,powerChanges:0,powerUnsupported:0};
  let ready=null,closure=null,quietStarted=null,previousPids=new Set(),resourcePhase='before-enable',baselinePower=null;
  /** Retain a bounded diagnostic timeline of fixed labels/scalars, never producer arguments or IDs. */
  function event(kind,details) {
    if(!options.diagnosticEvents)return;
    if(events.length>=128){eventDrops++;return;}
    events.push({elapsedMs:performance.now()-started,kind,...details});
  }
  /** Preserve receiver, return and promise identity; restore inherited properties by deletion. */
  function wrap(owner,key,before) {
    if(typeof owner?.[key]!=='function')throw Error('Missing observer boundary '+key);
    const descriptor=Object.getOwnPropertyDescriptor(owner,key),original=owner[key];
    /** Count only before forwarding the original operation, without adding an awaited continuation. */
    const replacement=function(...args){if(!closed)before.call(this,args);return original.apply(this,args);};
    owner[key]=replacement;originals.push({owner,key,descriptor,replacement});
  }
  /** Observe finite result categories while returning the exact original promise/result. */
  function resultObserver(owner,key,label) {
    const descriptor=Object.getOwnPropertyDescriptor(owner,key),original=owner[key];
    /** Retain no result payload after inspecting fixed reason/outcome fields. */
    const replacement=function(...args) {
      const result=original.apply(this,args);
      /** Count only known protocol categories; arbitrary strings and exceptions never escape. */
      const finish=value=>{
        if(closed)return;
        for(const key of ['outcome','reason'])if(known.has(value?.[key])){const category=label+'.'+key+'.'+value[key];outcomes[category]=(outcomes[category]??0)+1;}
        if(typeof value==='boolean') {
          const category=label+'.boolean.'+value;outcomes[category]=(outcomes[category]??0)+1;
          if(options.diagnosticEvents&&(label==='index.adoptStartupSources'||label==='source.reconcile'))event(label,{value,
            authority:plugin.index.sourceAcquisition.hasSemanticDependencies(),unsaved:plugin.index.sourceAcquisition.repository.unsaved.size,
            initial:plugin.initialIndexComplete,startupIncomplete:plugin.initialSourceIndexIncomplete??null});
        }
        if(label==='repository.replace'&&value?.outcome==='unsaved')event('repository-unsaved',{reason:known.has(value.reason)?value.reason:'other'});
      };
      if(result&&typeof result.then==='function')result.then(finish,/** Consume only the observer's rejection branch. */ ()=>{if(!closed)outcomes[label+'.failed']=(outcomes[label+'.failed']??0)+1;});else finish(result);
      return result;
    };
    owner[key]=replacement;originals.push({owner,key,descriptor,replacement});
  }
  /** Label synchronous mask mutations accurately; async continuations deliberately remain other. */
  function maskOwner(owner,key) {
    const descriptor=Object.getOwnPropertyDescriptor(owner,key),original=owner[key];
    /** Scope origin only around the original synchronous invocation. */
    const replacement=function(...args){const prior=maskContext;maskContext=key;try{return original.apply(this,args);}finally{maskContext=prior;}};
    owner[key]=replacement;originals.push({owner,key,descriptor,replacement});
  }
  /** Attach at native layout registration, before startup admission; no compiled hook is needed. */
  function attach(p) {
    if(attached)return;
    if(!p?.index||p.indexPreparationAdmitted&&!options.allowRunning)throw Error('Pre-admission observation unavailable');
    preAdmission=!p.indexPreparationAdmitted;plugin=p;attached=true;
    resources?.attach(p.index);
    convergence=options.convergenceFactory?.(app,p)??null;
    if(!options.observers)return;
    const index=p.index,source=index.sourceAcquisition,repo=source.repository;
    wrap(index.metadataParser,'parse',/** Count all parser submissions without retaining Markdown. */ args=>{
      counts.parserCalls++;if(typeof args[0]==='string')counts.parserUtf16+=args[0].length;
    });
    wrap(repo.runtime,'digest',/** Count encoded source validation input without another encoding. */ args=>{
      counts.hashCalls++;if(typeof args[0]==='string')counts.hashUtf16+=args[0].length;
    });
    wrap(repo,'transaction',/** Count the repository boundary, excluding direct native transactions. */ args=>{
      counts.transactions++;if(args[2]==='readonly')counts.readonly++;if(args[2]==='readwrite')counts.readwrite++;
    });
    wrap(source,'acquire',/** Count source calls and exact observed-revision revisits, including ready no-ops. */ args=>{
      counts.acquisitions++;const file=args[0];if(!file||typeof file!=='object')return;
      if(owners.has(file))counts.repeatedAcquiredOwners++;else{owners.add(file);counts.uniqueAcquiredOwners++;}
      const revision=source.states?.get(file)?.revision,stat=file.stat,old=revisions.get(file);
      if(old&&old.path===file.path&&old.mtime===stat?.mtime&&old.size===stat?.size&&old.revision===revision)counts.sameRevisionRevisits++;
      revisions.set(file,{path:file.path,mtime:stat?.mtime,size:stat?.size,revision});
    });
    wrap(source,'readBody',/** Count dirty-body requests without querying cache or changing receipt authority. */ args=>{counts.bodyRequests++;if(source.states?.get(args[0])?.bodyDirty)counts.dirtyBodyRequests++;});
    wrap(source,'reconcile',/** Count reconcile calls, including joins; lifecycle diagnostics count inventory admissions. */ ()=>{counts.inventoryStarts++;});
    wrap(index,'adoptStartupSources',/** Count actual adoption attempts; result observers retain their booleans separately. */ ()=>{counts.sourceAdoptions++;});
    wrap(index,'rebuild',/** Count rebuild() calls only; semantic diagnostics and decisions also cover progressive compilation. */ ()=>{counts.fullBuilds++;});
    wrap(repo.unsaved,'add',/** Observe current-set transitions without changing mask authority. */ function(args){
      if(this.has(args[0]))counts.repeatedMaskAdds++;else{counts.maskAdds++;event('mask-add',{origin:maskContext,countBefore:this.size});}
      const key='add.'+maskContext;maskOrigins[key]=(maskOrigins[key]??0)+1;
    });
    wrap(repo.unsaved,'delete',/** Count only removals of existing masks. */ function(args){if(this.has(args[0])){counts.maskRemoves++;event('mask-remove',{origin:maskContext,countBefore:this.size});const key='remove.'+maskContext;maskOrigins[key]=(maskOrigins[key]??0)+1;}});
    for(const key of ['rememberMemory','forgetMemory','tombstone'])maskOwner(repo,key);
    for(const key of ['acquire','reconcile'])resultObserver(source,key,'source.'+key);
    resultObserver(index,'adoptStartupSources','index.adoptStartupSources');
    for(const key of ['replace','write','retryMemory'])resultObserver(repo,key,'repository.'+key);
  }
  /** Capture bounded existing health facts; never acquire, flush, inspect disk or scan graph data. */
  function facts() {
    const p=plugin;
    if(!p)return {loaded:false};
    const index=p.index;
    return {loaded:true,ready:p.getIndexStatus(),nodes:index.size,initial:p.initialIndexComplete,dirty:p.indexDirty,
      source:index.getSourceAcquisitionCounters(),repository:index.getSourceRepositoryDiagnostics(),
      urls:index.getUrlIndexProgress(),scheduler:index.getWorkPriorityDiagnostics(),cache:index.indexedDb.getActivityState(),
      acquisition:index.sourceAcquisition.getActivityState(),authority:index.sourceAcquisition.hasSemanticDependencies(),
      snapshotQueued:index.snapshotPersistTimer!==null,building:!!index.building,hydrating:index.hasPendingSnapshotHydration(),semanticActive:index.hasActiveSemanticPreparation()};
  }
  /** Require actual route closure; ready alone never implies source/URL or persistence closure. */
  function drained(f) {
    return f.loaded&&f.ready.upToDate&&f.authority&&!f.dirty&&!f.repository.unsaved&&f.urls.complete&&!f.urls.active&&!f.urls.failed
      &&!f.cache.queuedBodies&&!f.cache.writerActive&&!f.acquisition.sourceActive&&!f.acquisition.repoWrites&&!f.acquisition.repoDeleteTask
      &&!f.acquisition.pendingKnown&&!f.acquisition.knownImpactTasks&&!f.snapshotQueued&&!f.building&&!f.hydrating&&!f.semanticActive
      &&f.scheduler.active.every(/** Every real scheduler lane must be inactive. */ value=>value===0)&&!f.scheduler.waiting;
  }
  /** Sample cumulative process CPU, retaining exited identities without double-counting worker threads. */
  function sample() {
    if(closed)return;
    const now=performance.now(),gapMs=now-lastSample,metrics=remote.app.getAppMetrics(),current=new Set();coverage.samples++;
    if(!metrics.length)coverage.emptySamples++;
    coverage.maximumGapMs=Math.max(coverage.maximumGapMs,now-lastSample);lastSample=now;
    for(const metric of metrics) {
      const cumulative=metric.cpu?.cumulativeCPUUsage;
      if(!Number.isFinite(cumulative)||cumulative<0){coverage.unsupported++;continue;}
      if(!Number.isSafeInteger(metric.pid)||!Number.isFinite(metric.creationTime)||metric.creationTime<=0){coverage.invalidIdentity++;continue;}
      const key=metric.pid+':'+metric.creationTime;current.add(key);let row=processes.get(key);
      if(!row){row={pid:metric.pid,created:metric.creationTime,type:metric.type,first:metric.creationTime>=epoch?0:cumulative,last:cumulative};processes.set(key,row);if(coverage.samples>1)coverage.births++;}
      if(cumulative<row.last)coverage.regressions++;row.last=cumulative;
    }
    for(const key of previousPids)if(!current.has(key))coverage.exits++;
    previousPids=current;
    const system=options.systemStateReader?.(remote)??{powerSupported:false,onBattery:null,idleState:'unknown',thermalState:'unknown'};
    const foreground={hidden:document.hidden,documentFocused:document.hasFocus(),windowFocused:win.isFocused(),throttle:win.webContents.getBackgroundThrottling(),system};
    coverage.hidden+=Number(foreground.hidden);coverage.unfocused+=Number(!foreground.documentFocused||!foreground.windowFocused);
    coverage.throttleChanges+=Number(foreground.throttle!==throttle);
    coverage.locked+=Number(system.idleState==='locked');coverage.idleUnsupported+=Number(system.idleState==='unknown');
    if(system.powerSupported) {
      if(baselinePower===null)baselinePower=system.onBattery;
      coverage.onBattery+=Number(system.onBattery);coverage.powerChanges+=Number(system.onBattery!==baselinePower);
    }else coverage.powerUnsupported++;
    const cpuSeconds=Array.from(processes.values()).reduce(/** Sum each process, including its threads, once. */ (sum,row)=>sum+row.last-row.first,0);
    const memory=processInfo.memoryUsage(),f=facts();
    if(resources&&plugin) {
      const source=plugin.startupDiagnostics?.progress('source'),hydration=plugin.startupDiagnostics?.progress('hydration');
      resourcePhase=(source?.phase??'unknown')+'|'+(hydration?.phase??'unknown');
    }
    const row={elapsedMs:now-started,gapMs,foreground,cpuSeconds,heap:memory.heapUsed,rss:memory.rss,counts:{...counts},facts:f};
    samples.push(row);
    if(gapMs>5000){quietStarted=null;closure=null;}
    if(f.loaded&&f.ready.upToDate&&!ready)ready=row;
    if(drained(f)){if(!closure){closure=row;quietStarted=now;}}else{quietStarted=null;closure=null;}
    if(samples.length>3000)samples.shift();
  }
  /** Restore each forwarding wrapper and the exact original native layout method independently. */
  function stop() {
    if(!closed)sample();closed=true;window.clearInterval(timer);
    try {
      for(const entry of originals.reverse())if(entry.owner[entry.key]===entry.replacement) {
        if(entry.descriptor)Object.defineProperty(entry.owner,entry.key,entry.descriptor);else delete entry.owner[entry.key];
      }
      originals.length=0;
    } finally {
      try{convergence?.stop();}
      finally{try{resources?.stop();}
        finally{if(app.workspace.onLayoutReady===layoutReplacement)app.workspace.onLayoutReady=originalLayout;}}
    }
  }
  /** Forward registration unchanged and attach before the host can run K-Plex's layout callback. */
  function layoutReplacement(...args) {
    try{const p=app.plugins.plugins['k-plex'];if(p&&!attached)attach(p);}catch(error){attachError=String(error);throw error;}
    return originalLayout.apply(this,args);
  }
  /** Return retained scalars; full snapshots are requested infrequently by the external driver. */
  function snapshot(full=false) {
    const elapsedMs=performance.now()-started;
    return {attached,preAdmission,attachError,closed,elapsedMs,coverage:{...coverage},counts:{...counts},last:samples.at(-1),ready,closure,
      operationCoverage:options.observers?(options.partialObservers?'since-late-attachment':'pre-admission-forwarders'):'not-observed',
      quietMs:quietStarted===null?0:performance.now()-quietStarted,
      validCpu:coverage.unsupported===0&&coverage.emptySamples===0&&coverage.invalidIdentity===0&&coverage.regressions===0&&coverage.maximumGapMs<=5000
        &&Array.from(processes.values()).some(/** Require the host process as well as current renderer. */ row=>row.type==='Browser')
        &&Array.from(processes.values()).some(/** Verify the measured renderer is in the process scope. */ row=>row.pid===processInfo.pid),
      comparable:coverage.hidden===0&&coverage.unfocused===0&&coverage.throttleChanges===0&&coverage.locked===0&&coverage.powerChanges===0
        &&(!options.requireAc||coverage.powerUnsupported===0&&coverage.onBattery===0)&&(!options.requireUnlocked||coverage.idleUnsupported===0),
      systemPolicy:{requireAc:!!options.requireAc,requireUnlocked:!!options.requireUnlocked},
      ...(full?{samples,outcomes:{...outcomes},maskOrigins:{...maskOrigins},events,eventDrops,processes:Array.from(processes.values()),diagnostics:plugin?.getStartupDiagnostics(),decisions:plugin?.index.getIndexDiagnostics(),...(resources?{resources:resources.snapshot()}:{} ),...(convergence?{convergence:convergence.snapshot()}:{} )}:{}),
      runtime:processInfo.versions,throttle};
  }
  const running=app.plugins.plugins['k-plex'];
  if(running&&!options.allowRunning)throw Error('Probe must arm before enable');
  if(options.allowRunning&&options.observers&&!(options.partialObservers&&options.diagnostic))throw Error('Late startup observation cannot claim early operation counters');
  if((options.partialObservers||options.diagnosticEvents||options.convergenceFactory)&&!options.diagnostic)throw Error('Partial/event observation requires explicit diagnostic purpose');
  if(options.storageBusy)throw Error('Storage operation still owned');
  resources=options.resourceFactory?.({phase:/** Return the last scalar sample's finite lane phases; never query status per resource operation. */ ()=>resourcePhase,now:/** Resource timings are inclusive elapsed time, not process CPU. */ ()=>performance.now(),databaseName:options.databaseName,detailed:options.resourceDetailed!==false});
  app.workspace.onLayoutReady=layoutReplacement;
  try{if(running)attach(running);sample();timer=window.setInterval(sample,options.sampleMs??1000);}catch(error){stop();throw error;}
  return {attach,snapshot,stop,sample};
}
