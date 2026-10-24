/**
 * Native test-only warm activation after fresh-process preparation for PR201. Inject with
 * toString(); the driver supplies guarded private paths and serialized observer factories.
 * Owns only observers/timers, never product scheduling, persistence flushing or forced GC.
 * Records ordinary maintenance invocation/settlement and a full ten-minute completion tail.
 */
export async function runFreshIndexingScenario(app, c) {
  const fs = require('node:fs'), crypto = require('node:crypto'), paths = require('node:path');
  const remote = require('@electron/remote'), win = remote.getCurrentWindow();
  const observation = c.createObservation({now: /** Share Electron's epoch-millisecond time domain. */ () => Date.now(), maximumSamples: 1800});
  const throttle = win.webContents.getBackgroundThrottling();
  const displayRequest = {type: 'prevent-display-sleep', started: false, stopped: false};
  let phase = 'settling', plugin, probe, timer, displayBlocker, traceCursor = 0, sampleFailure;
  const points = {}, startedAt = Date.now(), waiters = new Map();
  /** Check cancellation without changing the production owners or their deadlines. */
  function check(value, message) { if (!value) throw Error(message); }
  /** Yield in this renderer's window; observation continues on its independent timer. */
  function wait(ms) {
    return new Promise(/** Retain only this test-owned wait so cancellation cannot alter production timers. */ resolve => {
      const id = window.setTimeout(/** Retire the completed wait before continuing. */ () => { waiters.delete(id); resolve(); }, ms);
      waiters.set(id, resolve);
    });
  }
  /** Release every outstanding test wait on cancellation; product scheduling is untouched. */
  c.cancelWait = function cancelWait() {
    for (const [id, resolve] of waiters) { window.clearTimeout(id); resolve(); }
    waiters.clear();
  };
  /** Poll readiness only; never flush or expedite a production task to obtain closure. */
  async function until(read, message, maximumMs = 180000) {
    const end = Date.now() + maximumMs;
    check(!c.closed && !sampleFailure, message);
    while (!read()) { check(!c.closed && !sampleFailure && Date.now() < end, message); await wait(50); }
    check(!c.closed && !sampleFailure, message);
  }
  /** Capture only existing scalar diagnostics, with no source reads or database enumeration. */
  function facts() {
    if (!plugin) return {pluginEnabled: false};
    const index = plugin.index;
    return {pluginEnabled: true, source: index.getSourceAcquisitionCounters(), repository: index.getSourceRepositoryDiagnostics(),
      urls: index.getUrlIndexProgress(), scheduler: index.getWorkPriorityDiagnostics(), cache: index.indexedDb.getActivityState(),
      acquisition: index.sourceAcquisition.getActivityState(), inventory: !!index.sourceAcquisition.inventory,
      pendingUrlWrites: index.urlCacheWrites.size, snapshotQueued: index.snapshotPersistTimer !== null,
      orphanCleanupQueued: index.orphanCleanupTimer !== null, building: index.building,
      indexDirty: plugin.indexDirty, initialIndexComplete: plugin.initialIndexComplete,
      snapshotHydration: index.hasPendingSnapshotHydration(), nodes: index.size};
  }
  /** Match the prior driver's source/URL/cache/snapshot/scheduler completion condition. */
  function drained() {
    const f = facts();
    return plugin.index.sourceAcquisition.hasSemanticDependencies() && !f.repository.unsaved
      && f.urls.complete && !f.urls.active && !f.urls.failed && !f.inventory && !f.pendingUrlWrites
      && !f.cache.queuedBodies && !f.cache.writerActive && !f.acquisition.pendingKnown
      && !f.acquisition.knownImpactTasks && !f.acquisition.sourceActive && !f.acquisition.repoWrites
      && !f.acquisition.repoDeleteTask && !f.snapshotQueued && f.scheduler.active.every(/** All scheduler lanes must be idle. */ n => n === 0)
      && !f.scheduler.waiting && !f.building && !f.snapshotHydration;
  }
  /** Append a bounded batch privately so an interrupted arm retains its actual samples. */
  function flushTrace() {
    const fresh = observation.samples.slice(traceCursor);
    if (fresh.length) fs.appendFileSync(c.tracePath, fresh.map(/** Serialize observations, never vault text. */ row => JSON.stringify(row)).join('\n') + '\n');
    traceCursor = observation.samples.length;
  }
  /** Retain per-process cumulative counters and actual sample times, not just endpoint maps. */
  function sample() {
    const state = facts();
    const row = observation.sample(remote.app.getAppMetrics(), require('process').memoryUsage(), {
      hidden: document.hidden, documentFocused: document.hasFocus(), windowFocused: win.isFocused(),
      backgroundThrottling: win.webContents.getBackgroundThrottling(), throttleChanged: win.webContents.getBackgroundThrottling() !== throttle,
      currentRendererPid: require('process').pid
    });
    check(row, 'Observation sample bound'); row.phase = phase; row.facts = state; row.work = probe?.snapshot();
    probe?.sample(require('process').memoryUsage());
    if (observation.samples.length % 10 === 0) flushTrace();
  }
  /** Own the timer error separately so the scenario can retain a truthful incomplete receipt. */
  function tick() {
    try { sample(); } catch (error) { sampleFailure = String(error); c.progress.sampleFailure = sampleFailure; }
  }
  /** Take a same-instant CPU/facts endpoint and retain its observation phase. */
  function capture(label) {
    sample(); points[label] = {at: Date.now(), cpu: observation.endpoint(label), facts: facts(), work: probe?.snapshot()};
    c.progress = {phase, point: label, startedAt, at: Date.now(), points};
    return points[label];
  }
  /** Verify file identity before enabling and after observation; staging occurred before launch. */
  function artifactHash() {
    return crypto.createHash('sha256').update(fs.readFileSync(paths.join(c.pluginDir, 'main.js'))).digest('hex');
  }
  let error, stopped;
  try {
    await new Promise(/** Begin the fixed settling interval only after actual host layout readiness. */ resolve => app.workspace.onLayoutReady(resolve));
    check(app.vault.adapter.basePath === c.vaultPath && app.vault.getName() === 'kplex-test-small', 'Exact disposable vault required');
    check(!app.plugins.plugins['k-plex'] && !app.plugins.enabledPlugins.has('k-plex'), 'Fresh process must start with K-Plex disabled');
    check(!app.setting.isOpen && !win.webContents.debugger.isAttached(), 'Clean foreground host required');
    check(artifactHash() === c.mainSha, 'Pinned artifact before enable');
    displayBlocker = remote.powerSaveBlocker.start('prevent-display-sleep');
    check(remote.powerSaveBlocker.isStarted(displayBlocker), 'Test-owned display request required');
    displayRequest.started = true;
    observation.event('display-request.started', {active: true});
    remote.app.focus({steal: true}); win.restore(); win.show(); win.focus();
    await until(/** Wait for actual native and document focus before arming. */ () => !document.hidden && document.hasFocus() && win.isFocused(), 'Foreground required', 10000);
    observation.event('host.layout-ready'); capture('settlingStart'); timer = window.setInterval(tick, 1000);
    await wait(60000); check(!sampleFailure && !c.closed, 'Settling observation interrupted');
    capture('settlingEnd');
    if (c.arm !== 'host') {
      phase = 'enable'; capture('enableStart');
      await app.plugins.enablePlugin('k-plex'); plugin = app.plugins.plugins['k-plex'];
      check(!c.closed && !sampleFailure, 'Plugin enable observation interrupted');
      await until(/** The warm session must be dormant at layout readiness. */ () => plugin?.layoutReady, 'Dormant plugin layout');
      check(plugin.manifest.id === 'k-plex' && !plugin.indexPreparationAdmitted, 'Warm activation must remain unadmitted');
      check(!plugin.index.orphanCleanupTimer, 'No pre-observer orphan schedule');
      probe = c.createLightweightProbe(plugin.index);
      observation.wrap(plugin.index, 'scheduleOrphanCleanup', 'maintenance.schedule');
      observation.wrap(plugin.index, 'deferOrphanCleanup', 'maintenance.defer');
      observation.wrap(plugin.index.indexedDb, 'cleanupOrphanGenerations', 'maintenance.execute');
      observation.wrap(plugin.index.indexedDb, 'readSnapshotCatalog', 'snapshot.catalog');
      observation.wrap(plugin.index.indexedDb, 'deleteGeneration', 'maintenance.delete-generation');
      capture('enableEnd');
      const note = app.vault.getMarkdownFiles()[0], attachment = app.vault.getFiles().find(/** Match the existing attachment notification workload. */ f => f.extension !== 'md');
      const folder = app.vault.getAllFolders().find(/** Match an existing native folder identity. */ f => f.path !== '/');
      check(note?.path === c.center && attachment && folder, 'Same native workload and center required');
      phase = 'activation'; capture('activation'); observation.event('notifications.begin');
      for (const item of [note, attachment, folder]) app.vault.trigger('create', item);
      observation.event('notifications.end'); observation.event('activateView.begin');
      await plugin.activateView();
      await until(/** Join the same graph/backlog owner as the historical warm driver. */ () => plugin.initialIndexComplete && !plugin.indexDirty && !plugin.rebuildTask && !plugin.index.hasPendingSnapshotHydration(), 'Warm graph/backlog completion');
      check(plugin.index.isFullSnapshotHydrated(), 'Complete restored graph required');
      capture('graphReady'); phase = 'background';
      await until(drained, 'Source/URL/cache/snapshot closure', 360000);
      capture('complete');
      observation.event('oracle.begin', {ownedSources: 0});
      // This unchanged warm fixture has no cold subtree/hub; no per-owner oracle traversal.
      check(plugin.index.isFullSnapshotHydrated() && !plugin.indexDirty, 'Warm semantic publication remains complete');
      observation.event('oracle.end'); capture('idleStart');
    } else {
      phase = 'host'; capture('activation'); capture('complete'); capture('idleStart');
      observation.event('host.boundary', {pluginEnabled: false, syntheticCompletion: false});
    }
    phase = 'post-completion';
    await wait(Math.max(0, points.complete.at + 10000 - Date.now()));
    check(!c.closed && !sampleFailure, 'Initial post-completion observation interrupted'); capture('idle10');
    await wait(Math.max(0, points.complete.at + 600000 - Date.now()));
    check(!c.closed && !sampleFailure, 'Ten-minute observation interrupted');
    capture('post600');
    if (plugin) check(drained(), 'Work pending at final endpoint');
    check(artifactHash() === c.mainSha, 'Pinned artifact after measurement');
  } catch (caught) { error = String(caught); }
  finally {
    if (timer) window.clearInterval(timer);
    c.cancelWait(); c.cancelWait = null;
    try { if (plugin) observation.event('observer.retirement', {orphanQueued: plugin.index.orphanCleanupTimer !== null}); } catch (caught) { error ??= String(caught); }
    try { stopped = observation.stop(); } catch (caught) { error ??= String(caught); }
    try { probe?.stop(); } catch (caught) { error ??= String(caught); }
    try {
      if (displayBlocker !== undefined) {
        check(remote.powerSaveBlocker.stop(displayBlocker), 'Test-owned display request cleanup');
        displayRequest.stopped = true;
      }
    } catch (caught) { error ??= String(caught); }
    try { flushTrace(); } catch (caught) { error ??= String(caught); }
    const finalCpu = points.post600?.cpu;
    const measured = observation.samples.filter(/** Validate actual measurement without hiding preparation samples. */ row => row.at >= (points.activation?.at ?? Infinity));
    const visibilityViolations = measured.filter(/** A condition change remains a recorded protocol violation. */ row => row.context.hidden || !row.context.documentFocused || !row.context.windowFocused || row.context.throttleChanged).length;
    const processCoverage = measured.length > 0 && measured.every(/** Require Browser and selected renderer in every actual observation. */ row =>
      row.processes.some(/** Locate process-wide Browser accounting. */ process => process.type === 'Browser')
      && row.processes.some(/** Locate the actual selected renderer, not an assumed Tab. */ process => process.pid === require('process').pid));
    const maintenance = {invocations: observation.events.filter(/** Count actual cleanup entry. */ row => row.label === 'maintenance.execute:invoke').length,
      fulfilled: observation.events.filter(/** Count method settlement without claiming deletes succeeded. */ row => row.label === 'maintenance.execute:fulfilled').length,
      rejected: observation.events.filter(/** Preserve failed maintenance promises separately. */ row => row.label === 'maintenance.execute:rejected').length};
    const maintenanceObserved = c.arm === 'host' || (maintenance.invocations > 0 && maintenance.fulfilled > 0 && maintenance.rejected === 0);
    const acceptanceEligible = !error && observation.errors.length === 0 && finalCpu?.valid && finalCpu.terminalCpuComplete
      && processCoverage && points.post600.at - points.complete.at >= 600000 && maintenanceObserved;
    const result = {status: error ? 'failed' : 'passed', error, arm: c.arm, mainSha: c.mainSha,
      rendererPid: require('process').pid, throttle, startedAt, endedAt: Date.now(), points,
      displayRequest,
      events: observation.events, observerErrors: observation.errors, observerStop: stopped,
      acceptanceEligible: !!acceptanceEligible, comparable: !!acceptanceEligible && visibilityViolations === 0,
      processCoverage, visibilityViolations, maintenance, maintenanceObserved, maximumGapMs: finalCpu?.maximumGapMs,
      sampleCount: observation.samples.length, runtime: {...require('process').versions},
      limits: 'Fresh-process warm activation, not full application startup. Process CPU includes workers once. Exited terminal CPU may be missed. No forced GC or physical storage equivalence.'};
    fs.writeFileSync(c.resultPath, JSON.stringify(result, null, 2) + '\n');
    c.done = true; c.error = error; c.progress = {phase: 'done', status: result.status, points, sampleCount: result.sampleCount};
  }
}
