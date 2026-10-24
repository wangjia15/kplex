/**
 * Portable lifecycle contracts for the serialized fresh-process native scenario.
 * A deterministic renderer clock and fake Electron/Obsidian boundaries exercise
 * cancellation, ten-minute timing and independent observer retirement without
 * launching Obsidian, reading a vault, or changing any production scheduling.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import vm from 'node:vm';
import {createFreshObservation} from '../scripts/testing/obsidian/indexingFreshObservation.mjs';
import {runFreshIndexingScenario} from '../scripts/testing/obsidian/indexingFreshScenario.mjs';

/** Create a fully private fake renderer with timers controlled by the test. */
function harness({arm = 'host', failObserverStop = false, omitMaintenance = false, failBlockerStart = false, inactiveBlocker = false, failBlockerStop = false} = {}) {
  let at = 10000, nextId = 0, result, enabled = 0, probeStops = 0, observerStops = 0, appends = 0;
  const timers = new Map(), delays = [], notifications = [], blockerCalls = [], cleanupOrder = [], artifact = Buffer.from('pinned-test-artifact');
  let blockerActive = false;
  const controller = {arm, closed: false, done: false, progress: {}, vaultPath: '/small', pluginDir: '/small/.obsidian/plugins/k-plex',
    mainSha: createHash('sha256').update(artifact).digest('hex'), center: 'Center.md', tracePath: '/private/trace', resultPath: '/private/result'};
  /** Register a deterministic timeout or interval without using the host event loop. */
  function schedule(fn, ms, interval) {
    const id = ++nextId;
    timers.set(id, {fn, due: at + ms, interval});
    if (!interval) delays.push(ms);
    return id;
  }
  const fakeWindow = {
    /** Register the scenario's exact requested timeout duration. */
    setTimeout(fn, ms) { return schedule(fn, ms, null); },
    /** Register the scenario's independent periodic CPU sampler. */
    setInterval(fn, ms) { return schedule(fn, ms, ms); },
    /** Remove a test-owned timeout by its actual identity. */
    clearTimeout(id) { timers.delete(id); },
    /** Remove a test-owned observation interval by its actual identity. */
    clearInterval(id) { timers.delete(id); }
  };
  const index = {
    size: 88, building: false, snapshotPersistTimer: null, orphanCleanupTimer: null, urlCacheWrites: new Map(),
    sourceAcquisition: {
      inventory: null,
      /** Report no source work in this finite lifecycle fixture. */
      getActivityState() { return {pendingKnown: 0, knownImpactTasks: 0, sourceActive: 0, repoWrites: 0, repoDeleteTask: false}; },
      /** Establish the same completion authority predicate as the driver. */
      hasSemanticDependencies() { return true; }
    },
    indexedDb: {
      /** Return passive storage completion without opening a database. */
      getActivityState() { return {queuedBodies: 0, writerActive: false}; },
      /** Model ordinary async maintenance completion after its timer fires. */
      async cleanupOrphanGenerations() { await index.indexedDb.readSnapshotCatalog(); },
      /** Model a bounded catalog read without retaining any generation or source data. */
      async readSnapshotCatalog() { return {available: true}; },
      /** Supply the production deletion seam without inventing a stale generation. */
      async deleteGeneration() {}
    },
    /** Supply fixed source counters without source text. */
    getSourceAcquisitionCounters() { return {calls: 0}; },
    /** Supply an empty unsaved-source backlog. */
    getSourceRepositoryDiagnostics() { return {unsaved: 0}; },
    /** Supply completed URL coverage. */
    getUrlIndexProgress() { return {complete: true, active: false, failed: false}; },
    /** Supply idle scheduler lanes. */
    getWorkPriorityDiagnostics() { return {active: [0], waiting: 0}; },
    /** Report that no snapshot hydration remains. */
    hasPendingSnapshotHydration() { return false; },
    /** Verify the fixture's completed graph publication. */
    isFullSnapshotHydrated() { return true; },
    /** Model the normal five-minute task without shortening the scenario's observation window. */
    scheduleOrphanCleanup() {
      if (omitMaintenance) return;
      index.orphanCleanupTimer = fakeWindow.setTimeout(/** Run the actual wrapped maintenance method on its normal deadline. */ () => {
        index.orphanCleanupTimer = null;
        void index.indexedDb.cleanupOrphanGenerations();
      }, 300000);
    },
    /** Preserve the scheduling wrapper's nested delegation shape. */
    deferOrphanCleanup() { index.scheduleOrphanCleanup(); }
  };
  const plugin = {index, layoutReady: true, indexPreparationAdmitted: false, manifest: {id: 'k-plex'}, initialIndexComplete: true, indexDirty: false, rebuildTask: null,
    /** Model the production activation boundary followed by normal deferred maintenance. */
    async activateView() { index.deferOrphanCleanup(); }};
  const nativeWindow = {
    webContents: {debugger: {/** Keep the fake host free of a diagnostic debugger. */ isAttached() { return false; }},
      /** Report unchanged background-throttling policy. */ getBackgroundThrottling() { return true; }},
    /** Confirm foreground ownership for every sample. */ isFocused() { return true; },
    /** Model idempotent native window restoration. */ restore() {},
    /** Model a visible native host. */ show() {},
    /** Model a focused native host. */ focus() {}
  };
  const remote = {powerSaveBlocker: {
    /** Record the explicit test-owned request and fail before activation when injection requires it. */
    start(type) {
      blockerCalls.push({action: 'start', type, at, enabled});
      if (failBlockerStart) throw Error('Injected display request start failure');
      blockerActive = !inactiveBlocker;
      return 0;
    },
    /** Verify even a zero-valued blocker identity instead of relying on truthiness. */
    isStarted(id) { assert.equal(id, 0); return blockerActive; },
    /** Model independent display-request retirement with a visible injected failure. */
    stop(id) {
      assert.equal(id, 0); blockerCalls.push({action: 'stop', at}); cleanupOrder.push('blocker.stop');
      if (failBlockerStop) throw Error('Injected display request stop failure');
      blockerActive = false; return true;
    }
  }, /** Resolve the only fake native window. */ getCurrentWindow() { return nativeWindow; }, app: {
    /** Model foreground activation without global state. */ focus() {},
    /** Return process-wide monotonically increasing CPU counters for Browser and renderer. */
    getAppMetrics() { return [{pid: 1, creationTime: 1, type: 'Browser', cpu: {cumulativeCPUUsage: at / 100000}},
      {pid: 7, creationTime: 1, type: 'Tab', cpu: {cumulativeCPUUsage: at / 50000}}]; }
  }};
  const app = {workspace: {/** Resolve actual host layout readiness before settling. */ onLayoutReady(resolve) { resolve(); }}, setting: {isOpen: false},
    plugins: {plugins: {}, enabledPlugins: new Set(),
      /** Enable only the fake plugin, retaining an invocation count for cancellation assertions. */
      async enablePlugin() { enabled++; app.plugins.plugins['k-plex'] = plugin; }},
    vault: {adapter: {basePath: '/small'},
      /** Return the only allowed disposable vault name. */ getName() { return 'kplex-test-small'; },
      /** Return the selected center in deterministic order. */ getMarkdownFiles() { return [{path: 'Center.md', extension: 'md'}]; },
      /** Return the same finite attachment notification fixture. */ getFiles() { return [{path: 'asset.png', extension: 'png'}]; },
      /** Return one existing native folder. */ getAllFolders() { return [{path: 'Folder'}]; },
      /** Retain notification types rather than source contents. */ trigger(type) { notifications.push(type); }}
  };
  const fakeFs = {
    /** Supply exact artifact bytes without disk access. */ readFileSync() { return artifact; },
    /** Retain only whether private trace cleanup ran. */ appendFileSync() { appends++; cleanupOrder.push('trace.append'); },
    /** Capture the final serialized native receipt in memory. */ writeFileSync(_path, text) { result = JSON.parse(text); cleanupOrder.push('result.write'); }
  };
  controller.createObservation = /** Install the actual bounded observer with an optional retirement fault. */ options => {
    const observer = createFreshObservation(options), stop = observer.stop;
    observer.stop = /** Retire real wrappers before injecting a cleanup failure for independence coverage. */ () => {
      observerStops++; cleanupOrder.push('observer.stop'); const stopped = stop();
      if (failObserverStop) throw Error('Injected observer retirement failure');
      return stopped;
    };
    return observer;
  };
  controller.createLightweightProbe = /** Supply passive scalar counters with an independently owned cleanup. */ () => ({
    /** Copy a bounded count without work or source acquisition. */ snapshot() { return {calls: 0}; },
    /** Accept an already sampled memory receipt. */ sample() {},
    /** Track cleanup even if the separate observer retirement throws. */ stop() { probeStops++; cleanupOrder.push('probe.stop'); }
  });
  const modules = {'node:fs': fakeFs, 'node:crypto': {createHash}, 'node:path': {join}, '@electron/remote': remote,
    process: {pid: 7, versions: {node: 'fake'}, /** Return sampled memory, not allocation or peak claims. */ memoryUsage() { return {rss: 100, heapUsed: 50}; }}};
  const context = vm.createContext({app, c: controller, window: fakeWindow, document: {hidden: false,
    /** Keep document focus consistent with native focus. */ hasFocus() { return true; }}, Date: {/** Expose the deterministic epoch clock. */ now() { return at; }},
    /** Resolve only the explicit private test boundaries used by the serialized function. */ require(id) { assert.ok(Object.hasOwn(modules, id), id); return modules[id]; }});
  const task = vm.runInContext(`(${runFreshIndexingScenario.toString()})(app,c)`, context);
  /** Flush enough promise continuations for a completed fake timer to reach its next wait. */
  async function microtasks() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
  /** Advance one native timer in timestamp order; intervals retain their ordinary cadence. */
  function nextTimer() {
    let next;
    for (const entry of timers) if (!next || entry[1].due < next[1].due) next = entry;
    assert.ok(next, 'Scenario stalled without a timer');
    const [id, timer] = next; at = timer.due;
    if (timer.interval) timer.due += timer.interval; else timers.delete(id);
    timer.fn();
  }
  /** Drive only until the requested lifecycle boundary, with a strict fake-event bound. */
  async function until(predicate) {
    for (let i = 0; i < 2000; i++) { await microtasks(); if (predicate()) return; nextTimer(); }
    assert.fail('Fake scenario exceeded its event bound');
  }
  /** Snapshot local lifecycle evidence without leaking mutable native fixture objects. */
  function state() { return {at, result, enabled, probeStops, observerStops, appends, timers: timers.size, delays, notifications, blockerCalls, blockerActive, cleanupOrder}; }
  return {controller, task, until, microtasks, state};
}

test('cancellation during settling retires observers without enabling the plugin', /** Cancel an active test wait rather than advancing the sixty-second interval. */ async () => {
  const run = harness({arm: 'A'});
  await run.until(/** Stop at the first armed observation boundary. */ () => run.controller.progress.point === 'settlingStart');
  run.controller.closed = true; run.controller.cancelWait();
  await run.microtasks();
  assert.equal(run.controller.done, true, 'Cancellation must finish without another timer');
  await run.task;
  const state = run.state();
  assert.equal(state.enabled, 0); assert.equal(state.observerStops, 1); assert.equal(state.timers, 0);
  assert.equal(state.result.status, 'failed'); assert.match(state.result.error, /interrupted/);
  assert.equal(state.appends, 1);
  assert.equal(state.blockerActive, false); assert.equal(state.blockerCalls.length, 2);
  assert.equal(state.blockerCalls[1].at, state.blockerCalls[0].at, 'Cancellation promptly releases its display request');
});

test('cancellation during the first post-completion wait never starts another 590-second wait', /** Verify cancellation completes before any further fake timer advances. */ async () => {
  const run = harness();
  await run.until(/** Stop after completion is captured and its first tail wait is installed. */ () => run.controller.progress.point === 'idleStart');
  run.controller.closed = true; run.controller.cancelWait();
  await run.microtasks();
  assert.equal(run.controller.done, true, 'First-tail cancellation must be prompt');
  await run.task;
  const state = run.state();
  assert.equal(state.result.status, 'failed'); assert.equal(state.timers, 0);
  assert.ok(!state.delays.includes(590000));
  assert.equal(state.result.points.post600, undefined);
  assert.equal(state.blockerActive, false);
});

test('host control observes exactly ten minutes after its explicit completion boundary', /** Advance real requested durations deterministically without sleeping on the host. */ async () => {
  const run = harness();
  await run.until(/** Stop when the scenario has written its final private receipt. */ () => run.controller.done);
  await run.task;
  const state = run.state(), result = state.result;
  assert.equal(result.status, 'passed'); assert.equal(state.enabled, 0); assert.equal(state.timers, 0);
  assert.equal(result.points.post600.at - result.points.complete.at, 600000);
  assert.equal(result.points.idle10.at - result.points.complete.at, 10000);
  assert.equal(result.points.settlingEnd.at - result.points.settlingStart.at, 60000);
  assert.ok(result.sampleCount >= 660 && result.sampleCount < 700);
  assert.equal(result.acceptanceEligible, true); assert.equal(result.comparable, true);
  assert.equal(result.maintenanceObserved, true, 'Disabled-plugin control is maintenance-exempt');
});

test('candidate acceptance requires actual deferred maintenance invocation and settlement', /** Preserve a completed but coverage-incomplete arm rather than inventing maintenance evidence. */ async () => {
  const complete = harness({arm: 'F'});
  await complete.until(/** Join the normally scheduled maintenance and final endpoint. */ () => complete.controller.done);
  await complete.task;
  assert.equal(complete.state().result.acceptanceEligible, true);
  assert.equal(complete.state().result.maintenance.invocations, 1);
  assert.equal(complete.state().result.maintenance.fulfilled, 1);
  const incomplete = harness({arm: 'F', omitMaintenance: true});
  await incomplete.until(/** Preserve the missing-maintenance result after its complete observation window. */ () => incomplete.controller.done);
  await incomplete.task;
  assert.equal(incomplete.state().result.status, 'passed', 'Lifecycle completion is distinct from acceptance coverage');
  assert.equal(incomplete.state().result.maintenanceObserved, false);
  assert.equal(incomplete.state().result.acceptanceEligible, false);
  assert.equal(incomplete.state().result.comparable, false);
});

test('observer retirement failure still stops the lightweight probe and flushes the receipt', /** A failed cleanup owner must not prevent independent retirement or private trace preservation. */ async () => {
  const run = harness({arm: 'F', failObserverStop: true});
  await run.until(/** Let the normal maintenance and ten-minute observation finish. */ () => run.controller.done);
  await run.task;
  const state = run.state();
  assert.equal(state.result.status, 'failed'); assert.match(state.result.error, /Injected observer/);
  assert.equal(state.observerStops, 1); assert.equal(state.probeStops, 1); assert.ok(state.appends > 0);
  assert.equal(state.timers, 0); assert.equal(state.notifications.length, 3);
  assert.equal(state.blockerActive, false, 'Observer cleanup failure cannot retain the display request');
  assert.ok(state.result.events.some(/** Verify actual async maintenance invocation was observed. */ event => event.label === 'maintenance.execute:invoke'));
  assert.ok(state.result.events.some(/** Verify ordinary maintenance settlement was observed. */ event => event.label === 'maintenance.execute:fulfilled'));
});

test('display-request startup failures prevent settling and activation while preserving observer cleanup', /** Fail closed both when the native request throws and when its identity is inactive. */ async () => {
  for (const options of [{failBlockerStart: true}, {inactiveBlocker: true}]) {
    const run = harness({arm: 'F', ...options});
    await run.microtasks(); await run.task;
    const state = run.state();
    assert.equal(state.result.status, 'failed'); assert.equal(state.enabled, 0);
    assert.equal(state.observerStops, 1); assert.equal(state.timers, 0);
    assert.equal(state.result.points.settlingStart, undefined);
    assert.equal(state.blockerActive, false);
    assert.equal(state.blockerCalls.length, options.failBlockerStart ? 1 : 2);
  }
});

test('display-request retirement failure preserves other cleanup and an ineligible failure receipt', /** Native stop failure must not suppress trace flushing or erase earlier independent retirement. */ async () => {
  const run = harness({arm: 'F', failBlockerStop: true});
  await run.until(/** Finish the normal bounded observation before retiring its resource owners. */ () => run.controller.done);
  await run.task;
  const state = run.state();
  assert.equal(state.result.status, 'failed'); assert.match(state.result.error, /Injected display request stop failure/);
  assert.equal(state.result.acceptanceEligible, false); assert.equal(state.result.comparable, false);
  assert.equal(state.observerStops, 1); assert.equal(state.probeStops, 1); assert.equal(state.timers, 0);
  assert.ok(state.cleanupOrder.indexOf('observer.stop') < state.cleanupOrder.indexOf('blocker.stop'));
  assert.ok(state.cleanupOrder.indexOf('probe.stop') < state.cleanupOrder.indexOf('blocker.stop'));
  assert.ok(state.appends > 0);
  assert.equal(state.cleanupOrder.at(-1), 'result.write');
});

test('host, baseline and candidate use the same display request before settling or plugin enablement', /** Compare identical test-owned power conditions across all acceptance arms. */ async () => {
  for (const arm of ['host', 'A', 'F']) {
    const run = harness({arm});
    await run.until(/** Inspect resource ownership before measured activation or settling advances time. */ () => run.controller.progress.point === 'settlingStart');
    assert.deepEqual(run.state().blockerCalls, [{action: 'start', type: 'prevent-display-sleep', at: 10000, enabled: 0}]);
    assert.equal(run.state().blockerActive, true);
    run.controller.closed = true; run.controller.cancelWait();
    await run.microtasks(); await run.task;
    assert.equal(run.state().blockerActive, false); assert.equal(run.state().blockerCalls.length, 2);
  }
});
