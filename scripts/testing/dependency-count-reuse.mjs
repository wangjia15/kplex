/**
 * Bounded test-only PR204/PR207 comparison using production repository owners in disposable real Chromium
 * databases. Owns serial browser lifetimes and private result receipts, separates diagnostic/native
 * request counting from renderer timing, and includes reclamation, process restart and later editing.
 * Native Obsidian and private vaults are never opened.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, readdir, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { performance as nodePerformance } from "node:perf_hooks";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { contributorBrowserBundle, contributorBrowserInitialize } from "../../tests/support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "../../tests/support/browserTypeScript.mjs";
import { installDependencyCountReuseFixture } from "../../tests/support/dependencyCountReuseFixture.mjs";
import { chromiumProcessSnapshot } from "../../tests/support/chromiumProcessMetrics.mjs";
import { installRestartCompletionObserver } from "../../tests/support/restartCompletionObserver.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repairStudy = (process.argv[2] ?? "").startsWith("repair-");
const base = repairStudy ? "930747679894f003a2acf3b800df798826ee090c" : "cd12a857c1c2c89c2d13f6c6b2a3e1a5203d5ffa";
const runtimeFile = "src/index/SourceRepository.ts";
/** Pin compared source/bundle bytes independently of the surrounding tooling commit. */
const sha256 = value => createHash("sha256").update(value).digest("hex");

/**
 * Stat owned regular files without reading contents. A running backend may retire a listed file;
 * retain that non-atomic observation as unknown totals rather than failing work or inventing zero.
 * The optional metadata adapter makes this exact race deterministic in harness-only tests.
 */
export async function ownedIndexedDbSize(profile, metadata = { readdir, lstat }) {
  const selected = resolve(profile);
  if (!selected.startsWith(resolve(tmpdir()) + sep) || basename(selected) !== "profile"
    || !basename(dirname(selected)).startsWith("kplex-source-idb-")) throw Error("Unowned browser profile size request");
  for (const path of [dirname(selected), selected]) if ((await metadata.lstat(path)).isSymbolicLink()) throw Error("Profile alias rejected");
  const defaultDirectory = await metadata.lstat(join(selected, "Default"));
  if (defaultDirectory.isSymbolicLink() || !defaultDirectory.isDirectory()) throw Error("IndexedDB parent alias or non-directory rejected");
  const indexedDbRoot = join(selected, "Default", "IndexedDB");
  const started = performance.now(), stack = [indexedDbRoot], missingEntries = [];
  let files = 0, bytes = 0, directories = 0, entriesSeen = 0;
  while (stack.length) {
    const directory = stack.pop(); if (++directories > 128) throw Error("IndexedDB directory bound exceeded");
    let entries;
    try {
      const state = await metadata.lstat(directory);
      if (state.isSymbolicLink() || !state.isDirectory()) throw Error("IndexedDB directory alias or non-directory rejected");
      entries = await metadata.readdir(directory, { withFileTypes: true });
    }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      missingEntries.push(relative(indexedDbRoot, directory) || "."); continue;
    }
    for (const entry of entries) {
      if (++entriesSeen > 4224) throw Error("IndexedDB metadata entry bound exceeded");
      const path = join(directory, entry.name); let state;
      try { state = await metadata.lstat(path); }
      catch (error) {
        if (error.code !== "ENOENT") throw error;
        missingEntries.push(relative(indexedDbRoot, path)); continue;
      }
      if (state.isSymbolicLink()) throw Error("IndexedDB alias rejected");
      if (state.isDirectory()) stack.push(path);
      else if (state.isFile()) { if (++files > 4096) throw Error("IndexedDB file bound exceeded"); bytes += state.size; }
    }
  }
  return { status: missingEntries.length ? "unstable" : "observed", missingEntries,
    files: missingEntries.length ? null : files, bytes: missingEntries.length ? null : bytes,
    observedFiles: files, observedRegularFileBytes: bytes, directories, observationElapsedMs: performance.now() - started,
    scope: "Non-atomic regular-file stat observation under owned Default/IndexedDB; ENOENT leaves totals unknown. Not allocated disk bytes, live records, fsync or physical-cache equivalence" };
}

/** Read an owned optional receipt without treating malformed JSON or other I/O errors as absence. */
async function optionalReceipt(path) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

/** Validate finite cohort identities without opening a browser or upgrading missing historical proof. */
export function validateResumeIdentity(previous, expected, protocol, legacy, directory) {
  for (const field of ["mode", "node", "platform", "base", "sourceHashes", "bundleHashes", "conditions", "study"])
    if (JSON.stringify(previous[field]) !== JSON.stringify(expected[field])) throw new Error(`Resume ${field} differs from the recorded cohort`);
  if (resolve(previous.directory) !== directory || !Array.isArray(previous.results)) throw new Error("Resume directory/results identity is invalid");
  if (previous.protocol) {
    if (JSON.stringify(previous.protocol) !== JSON.stringify(protocol)) throw new Error("Resume fixture/helper/input protocol differs");
    return null;
  }
  if (!legacy || JSON.stringify(legacy.protocol) !== JSON.stringify(protocol)
    || typeof legacy.legacyAttestation?.basis !== "string" || !legacy.legacyAttestation.basis.trim()
    || typeof legacy.legacyAttestation?.limitation !== "string" || !legacy.legacyAttestation.limitation.trim()) {
    throw new Error("Legacy cohort needs an explicit current-hash/no-edit attestation in resume-protocol.json; no pre-cohort fixture hash may be inferred");
  }
  return legacy.legacyAttestation;
}

/** Skip only an independently loaded passed receipt whose exact planned workload also agrees. */
export function canSkipSavedArm(entry, receipt, config, detailed) {
  if (!receipt || receipt.name !== entry.name || receipt.status !== entry.status) throw new Error(`Saved arm receipt mismatch: ${entry.name}`);
  if (entry.status !== "passed") return false;
  if (config) for (const [field, expected] of Object.entries({ ...config, detailed }))
    if (receipt[field] !== expected) throw new Error(`Saved arm input ${field} differs: ${entry.name}`);
  return true;
}

/** Allocate a distinct attempt filename; callers use exclusive creation so earlier receipts survive. */
export function attemptReceiptFilename(name, entries) {
  const attempts = entries.filter(/** Every earlier outcome consumes its own immutable receipt identity. */entry => entry.name === name).length;
  return attempts === 0 ? `${name}.json` : `${name}.attempt-${attempts + 1}.json`;
}

/** Use exact source identities without moving a branch or invoking a shell. */
function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", timeout: 15000, windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr}`);
  return result.stdout;
}
/** Retain existing endpoint metrics, including optional renderer cumulative CPU; never infer store CPU. */
export async function metrics(browser) {
  const result = await browser.command("Performance.getMetrics");
  const values = Object.fromEntries(result.metrics.map(/** Retain named cumulative CDP endpoints without deriving allocation or peak memory. */metric => [metric.name, metric.value]));
  if (!Number.isFinite(values.TaskDuration)) throw new Error("CDP TaskDuration unavailable");
  return values;
}
/** Chromium ProcessTime queries current renderer process cumulative CPU, excluding other processes. */
function cpuDelta(before, after) {
  return Number.isFinite(before.ProcessTime) && Number.isFinite(after.ProcessTime)
    && after.ProcessTime >= before.ProcessTime && after.ProcessTime > 0 ? after.ProcessTime - before.ProcessTime : null;
}
/** Try the existing target command surface only; unsupported Browser-process access remains explicit. */
async function processSnapshot(browser, root = false) {
  if (root) return chromiumProcessSnapshot(browser);
  try {
    const result = await browser.command("SystemInfo.getProcessInfo");
    return { supported: true, processes: result.processInfo.map(/** Retain only process identity/type and cumulative CPU, with no process command lines. */item => ({ id: item.id, type: item.type, cpuTime: item.cpuTime })) };
  } catch (error) { return { supported: false, error: String(error.stack ?? error) }; }
}
/** Compare each observed process identity once; births/exits and unsupported snapshots forbid complete-process attribution. */
export function processChanges(before, after) {
  if (!before.supported || !after.supported) return { available: false, reason: "SystemInfo process snapshots unavailable; renderer endpoints cannot identify Browser/storage CPU" };
  const old = new Map(before.processes.map(/** Bind the snapshot to actual process identities rather than process role medians. */item => [item.id, item]));
  const seen = new Set(), deltas = [], births = [], exits = [];
  for (const item of after.processes) {
    seen.add(item.id); const previous = old.get(item.id);
    if (!previous || previous.type !== item.type) { births.push(item); if (previous) exits.push(previous); }
    else deltas.push({ id: item.id, type: item.type, cpuSeconds: Number.isFinite(item.cpuTime) && Number.isFinite(previous.cpuTime)
      && item.cpuTime >= previous.cpuTime ? item.cpuTime - previous.cpuTime : null });
  }
  for (const item of before.processes) if (!seen.has(item.id)) exits.push(item);
  return { available: true, deltas, births, exits, complete: births.length === 0 && exits.length === 0 && deltas.every(/** Missing cumulative counters remain unknown rather than becoming zero CPU. */item => item.cpuSeconds !== null),
    limitation: "Snapshots bracket the metric requests as well as the reopen interval; no terminal sample for exits or exclusive storage-thread attribution" };
}
/** Bound each arm's host wait; Chromium's own command deadline bounds its awaited operation. */
export async function initialize(browser) {
  await browser.evaluate(contributorBrowserInitialize);
  await browser.evaluate(`(${installDependencyCountReuseFixture.toString()})()`);
  await browser.command("Performance.enable", { timeDomain: "threadTicks" });
}
/** Run a complete replacement/reclaim interval, then restart the real browser and perform another edit. */
export async function arm(bundle, name, config, detailed) {
  const launchStart = performance.now();
  let browser;
  const result = { name, ...config, detailed, status: "incomplete", failurePhase: "browser-start" };
  try {
    browser = await chromiumHarness(bundle);
    result.freshProcessLaunchElapsedMs = performance.now() - launchStart;
    result.failurePhase = "fixture-preparation";
    await initialize(browser);
    if (config.shutdown) await browser.evaluate(`(${installRestartCompletionObserver.toString()})()`);
    result.browserVersion = await browser.command("Browser.getVersion");
    result.target = await browser.command("Target.getTargetInfo");
    const database = `dependency-${config.operation ? "repair" : "reuse"}-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await browser.evaluate(`(/** Create only this arm's owned logical database before measured work. */async()=>{const B=dependencyCountReuse;B.context=await B.setup(${JSON.stringify(database)},${config.owners},${Boolean(config.wide)},false,${JSON.stringify(config.distribution ?? "reuse")});return true})()`);
    if (config.operation !== "create") for (let first = 0; first < config.owners; first += 32)
      await browser.evaluate(`dependencyCountReuse.seedRange(dependencyCountReuse.context,${first},32)`);
    else await browser.evaluate("dependencyCountReuse.closeWork(dependencyCountReuse.context)");
    if (config.changeMode === "late") await browser.evaluate("dependencyCountReuse.context.changeMode='late';true");
    result.before = await browser.evaluate("dependencyCountReuse.oracle(dependencyCountReuse.context)");
    if (detailed) await browser.evaluate("dependencyCountReuse.observer=dependencyCountReuse.observe(dependencyCountReuse.context.repository)");
    result.failurePhase = "measured-work";
    if (config.rootProcessCpu) result.maintenanceProcessSnapshots = { before: await processSnapshot(browser, true) };
    const before = await metrics(browser), started = performance.now();
    try {
      if (config.response) await browser.evaluate("(/** Arm observers after the preparation oracle and only for this diagnostic workload. */()=>{dependencyCountReuse.responsiveness=dependencyCountReuse.observeResponsiveness();return true})()");
      const batches = [];
      // Keep each awaited browser command below the shared 60-second transport deadline. The
      // end-to-end endpoints include every batch and IPC gap; identical batching applies to A/F.
      const transportBatch = config.operation ? 8 : 32;
      for (let first = 0; first < config.owners; first += transportBatch) {
        const expression = config.operation
          ? `dependencyCountReuse.repairWorkload(dependencyCountReuse.context,${JSON.stringify(config.operation)},${detailed ? "dependencyCountReuse.observer" : "null"},${first},${transportBatch})`
          : `dependencyCountReuse.workload(dependencyCountReuse.context,${config.mixed},${config.rounds ?? 1},${detailed ? "dependencyCountReuse.observer" : "null"},${first},32)`;
        batches.push(await browser.evaluate(expression));
      }
      result.work = { activations: batches.reduce(/** Count completed activations across all timed transport batches. */(sum, batch) => sum + batch.activations, 0), batches };
    } finally {
      if (config.response) result.responsiveness = await browser.evaluate("(/** Include the terminal gap and retire interval/long-task ownership before any later oracle. */()=>dependencyCountReuse.responsiveness?.stop()??{missing:true})()");
      result.elapsedMs = performance.now() - started;
      const after = await metrics(browser);
      result.metricEndpoints = { before, after };
      result.rendererMainThreadTaskSeconds = after.TaskDuration - before.TaskDuration;
      result.rendererProcessCpuSeconds = cpuDelta(before, after);
      result.sampledJsHeap = { before: before.JSHeapUsedSize, after: after.JSHeapUsedSize };
      if (detailed) result.detail = await browser.evaluate("(/** Retire detailed wrappers before returning finite diagnostic aggregates. */()=>{const o=dependencyCountReuse.observer;o.retire();return {operations:o.operations,projectionOracle:o.eligibility,staging:o.staging,delivered:o.delivered,lifetimes:o.lifetimes}})()");
      if (config.response && (!result.responsiveness.cleanupComplete || result.responsiveness.cleanupErrors.length)) throw new Error("Responsiveness diagnostic cleanup reported a failure");
    }
    if (config.rootProcessCpu) { result.maintenanceProcessSnapshots.after = await processSnapshot(browser, true); result.maintenanceProcessSnapshots.comparison = processChanges(result.maintenanceProcessSnapshots.before, result.maintenanceProcessSnapshots.after); }
    result.after = await browser.evaluate("dependencyCountReuse.oracle(dependencyCountReuse.context)");
    result.failurePhase = "restart-and-later-edit";
    if (config.shutdown) result.beforeFixtureClose = await browser.evaluate("window.__kplexRestartCompletion.drain()");
    await browser.evaluate("dependencyCountReuse.context.fixture.close();true");
    if (config.shutdown) {
      result.beforeShutdown = await browser.evaluate(`(/** Prove native terminal completion and closed connection before either shutdown protocol. */async()=>{
        const d=window.__kplexRestartCompletion,B=dependencyCountReuse;await d.drain();
        ok(B.context.repository.transactions.size===0,'Repository has no active native transactions');
        let closed=false;try{B.context.db.transaction('meta','readonly');}catch(error){closed=error instanceof DOMException&&error.name==='InvalidStateError';}
        ok(closed,'Fixture cache requested actual native connection close');
        const receipt=d.retire();delete window.__kplexRestartCompletion;return {...receipt,completedTransactions:receipt.completed,abortedTransactions:receipt.aborted,connectionClosed:closed};
      })()`);
      result.processBeforeShutdown = browser.identity();
      result.storageBeforeShutdown = await ownedIndexedDbSize(result.processBeforeShutdown.profile);
    }
    const restartStart = performance.now();
    if (config.shutdown) result.restartLifecycle = await browser.restart({ shutdown: config.shutdown,
      /** The active transaction observer has already authenticated this exact pre-quit lifetime. */
      beforeShutdown: async () => result.beforeShutdown,
      /** Observe file metadata after actual process exit, separately from launch/open timing. */
      afterShutdown: async () => {
        result.storageAfterShutdown = await ownedIndexedDbSize(result.processBeforeShutdown.profile);
        if (config.storageInventory) {
          const { inventoryOwnedIndexedDbFiles } = await import("../../tests/support/indexedDbFileInventory.mjs");
          result.storageAfterShutdown.inventory = await inventoryOwnedIndexedDbFiles(result.processBeforeShutdown.profile);
        }
        return result.storageAfterShutdown;
      } });
    else await browser.restart();
    result.browserRestartElapsedMs = performance.now() - restartStart;
    await initialize(browser);
    result.restartedTarget = await browser.command("Target.getTargetInfo");
    if (config.reopenDiagnostic) result.processSnapshots = { before: await processSnapshot(browser, config.rootProcessCpu) };
    const reopenBefore = await metrics(browser);
    const observerCpuBefore = config.reopenDiagnostic ? process.cpuUsage() : null;
    const observerEventLoopBefore = config.reopenDiagnostic ? nodePerformance.eventLoopUtilization() : null;
    const reopenStart = performance.now();
    result.reopen = { status: "incomplete" };
    try {
      const expression = config.reopenDiagnostic ? `(/** Preserve the original native await order inside one evaluation while measuring synchronous phase boundaries. */async()=>{
        const B=dependencyCountReuse,M=sourceModules;ok(!B.reopenDiagnostic,'Previous reopen diagnostic handle remains');
        const d=B.reopenDiagnostic=B.observeReopen(),begin=performance.now();
        try{
          const f=await fixture(${JSON.stringify(database)});
          B.context={fixture:f,repository:f.repository,db:await f.cache.open(),name:${JSON.stringify(database)},owners:${config.owners},wide:${Boolean(config.wide)},distribution:${JSON.stringify(config.distribution ?? "reuse")}};
          d.report.spans.fixtureOpen={elapsedMs:performance.now()-begin};d.attach(f.repository);d.phase('lookup');
          const lookupAt=performance.now(),lookup=await f.repository.lookupLocalDependencyCounts([M.sourceLocalDependencyKey('node','Owner-0000.md')],/** Keep the original serial lookup lifetime and finality contract. */()=>true,true);
          d.report.spans.lookup={elapsedMs:performance.now()-lookupAt};ok(lookup.outcome==='ready','Durable reopen lookup');
          d.phase('closure');const closureAt=performance.now(),closure=await B.closeWork(B.context);
          const closureMs=performance.now()-closureAt;d.report.spans.closeWork={elapsedMs:closureMs};
          d.report.spans.closureRemainder={elapsedMs:Math.max(0,closureMs-(d.report.spans.flush?.elapsedMs??0)-(d.report.spans.completeInventory?.elapsedMs??0))};
          d.report.browserTotalMs=performance.now()-begin;
          ok(d.report.repairEntries===0,'Clean reopen executes no selected count repair');ok(d.report.countKeyWrites===0,'Clean reopen writes no count ledger');
          return {outcome:lookup.outcome,counts:lookup.value.counts,closure,diagnostic:d.report};
        }catch(caught){return {status:'failed',error:String(caught.stack??caught),diagnostic:d.report};}
        finally{d.retire();}
      })()` : `(/** Reopen the same durable database in the restarted browser and authenticate its selected counts. */async()=>{const B=dependencyCountReuse,M=sourceModules,f=await fixture(${JSON.stringify(database)});B.context={fixture:f,repository:f.repository,db:await f.cache.open(),name:${JSON.stringify(database)},owners:${config.owners},wide:${Boolean(config.wide)},distribution:${JSON.stringify(config.distribution ?? "reuse")}};const lookup=await f.repository.lookupLocalDependencyCounts([M.sourceLocalDependencyKey('node','Owner-0000.md')],/** This serial synthetic lookup remains live for its entire request. */()=>true,true);ok(lookup.outcome==='ready','Durable reopen lookup');return {outcome:lookup.outcome,counts:lookup.value.counts,closure:${config.operation ? "await B.closeWork(B.context)" : "null"}}})()`;
      Object.assign(result.reopen,await browser.evaluate(expression));
      if (result.reopen.status === "failed") throw new Error(result.reopen.error);
      if (config.reopenDiagnostic && !result.reopen.diagnostic.cleanup.restored) throw new Error("Reopen diagnostic bindings were not restored");
      result.reopen.status = "passed";
    } finally {
      result.reopen.elapsedMs = performance.now() - reopenStart;
      if (config.reopenDiagnostic) {
        const cpu = process.cpuUsage(observerCpuBefore), eventLoop = nodePerformance.eventLoopUtilization(observerEventLoopBefore);
        result.reopen.nodeObserver = { userCpuSeconds: cpu.user / 1e6, systemCpuSeconds: cpu.system / 1e6,
          eventLoopActiveMs: eventLoop.active, eventLoopIdleMs: eventLoop.idle, eventLoopUtilization: eventLoop.utilization,
          scope: "Node observer only, bracketing this same evaluate/outer-wall interval; excludes before/after CDP metrics and SystemInfo snapshots. Active elapsed is not CPU." };
      }
      const reopenAfter = await metrics(browser);
      result.reopen.metricEndpoints = { before: reopenBefore, after: reopenAfter };
      result.reopen.rendererMainThreadTaskSeconds = reopenAfter.TaskDuration - reopenBefore.TaskDuration;
      result.reopen.rendererProcessCpuSeconds = cpuDelta(reopenBefore, reopenAfter);
      if (config.reopenDiagnostic) {
        result.reopen.diagnostic = await browser.evaluate("(/** Read native terminal events only after the original CPU endpoint; method bindings were already restored in the original evaluation. */()=>{const B=dependencyCountReuse,d=B.reopenDiagnostic;if(!d)return {missing:true};d.retire();const report=d.report;report.cleanup={...report.cleanup,pendingTransactions:report.pendingTransactions};delete B.reopenDiagnostic;return report})()");
        result.processSnapshots.after = await processSnapshot(browser, config.rootProcessCpu);
        result.processSnapshots.comparison = processChanges(result.processSnapshots.before,result.processSnapshots.after);
        if (result.reopen.diagnostic.missing || !result.reopen.diagnostic.cleanup.restored || result.reopen.diagnostic.pendingTransactions !== 0) throw new Error("Reopen diagnostic terminal closure is incomplete");
      }
    }
    if (config.operation) result.afterReopen = await browser.evaluate("dependencyCountReuse.oracle(dependencyCountReuse.context)");
    if (config.operation === "delete") {
      const recreationBefore = await metrics(browser), recreationStart = performance.now();
      result.recreation = { status: "incomplete" };
      try {
        Object.assign(result.recreation, await browser.evaluate(`(/** Recreate the deleted source separately; this activation is not an edit of an existing live owner. */async()=>{
          const B=dependencyCountReuse;
          ok((await B.context.repository.inspect('Owner-0000.md')).reason==='tombstone','Recreation starts from a durable tombstone');
          const recreated=await B.replace(B.context,0,6,true,${Boolean(config.wide)});
          return {outcome:recreated.outcome,sequence:recreated.sequence,closure:await B.closeWork(B.context)};
        })()`));
        result.recreation.status = "passed";
      } finally {
        result.recreation.elapsedMs = performance.now() - recreationStart;
        const recreationAfter = await metrics(browser);
        result.recreation.metricEndpoints = { before: recreationBefore, after: recreationAfter };
        result.recreation.rendererMainThreadTaskSeconds = recreationAfter.TaskDuration - recreationBefore.TaskDuration;
        result.recreation.rendererProcessCpuSeconds = cpuDelta(recreationBefore, recreationAfter);
        result.recreation.sampledJsHeap = { before: recreationBefore.JSHeapUsedSize, after: recreationAfter.JSHeapUsedSize };
      }
      result.afterRecreation = await browser.evaluate("dependencyCountReuse.oracle(dependencyCountReuse.context)");
      result.recreatedOwner = await browser.evaluate("(/** Verify a live selected owner before arming the later genuine-edit CPU interval. */async()=>{const selected=await dependencyCountReuse.context.repository.inspect('Owner-0000.md');ok(selected.head?.state==='complete','Recreated source is a live owner before editing');return {sourceRevision:selected.head.sourceRevision,sequence:selected.sequence}})()");
      if (result.recreatedOwner.sequence !== result.recreation.sequence) throw new Error("Recreated selected owner changed before the later edit");
    }
    const editBefore = await metrics(browser), editStart = performance.now();
    result.subsequentEdit = await browser.evaluate(`(/** Measure a genuine dependency-changing edit after restart, including its maintenance closure. */async()=>{const B=dependencyCountReuse;const result=await B.replace(B.context,0,7,${config.operation ? true : config.changeMode === "late" ? false : !config.mixed},${Boolean(config.wide)});ok(await B.context.repository.completeLocalDependencyInventory()==='ready','Later edit closes');return {outcome:result.outcome,sequence:result.sequence,closure:${config.operation ? "await B.closeWork(B.context)" : "null"}}})()`);
    result.subsequentEdit.elapsedMs = performance.now() - editStart;
    const editAfter = await metrics(browser);
    result.subsequentEdit.metricEndpoints = { before: editBefore, after: editAfter };
    result.subsequentEdit.rendererMainThreadTaskSeconds = editAfter.TaskDuration - editBefore.TaskDuration;
    result.subsequentEdit.rendererProcessCpuSeconds = cpuDelta(editBefore, editAfter);
    if (config.operation === "delete") {
      result.subsequentEdit.operation = "genuine edit of recreated live owner";
      if (!(result.subsequentEdit.sequence > result.recreatedOwner.sequence)) throw new Error("Genuine later edit did not advance the recreated live owner");
    }
    result.reopenOracle = await browser.evaluate("dependencyCountReuse.oracle(dependencyCountReuse.context)");
    await browser.evaluate("dependencyCountReuse.context.fixture.close();true");
    result.status = "passed"; delete result.failurePhase;
  } catch (error) {
    result.status = "failed"; result.error = String(error.stack ?? error);
    if (error.lifecycleReceipt) result.restartLifecycle = error.lifecycleReceipt;
  }
  finally {
    if (!browser) {
      result.freshProcessLaunchElapsedMs = performance.now() - launchStart;
      result.cleanup = { status: "unverified-by-driver", note: "Browser helper rejected before returning its handle; driver obtained no cleanup capability. No measured CPU endpoints exist." };
    } else {
      if (config.shutdown) {
        try { result.shutdownObserverCleanup = await browser.evaluate("(/** Retire only this arm's test observer if an earlier stage failed. */()=>{const d=window.__kplexRestartCompletion;if(!d)return {present:false,bindingsRestored:true};const value=d.retire();delete window.__kplexRestartCompletion;return {present:true,...value}})()"); }
        catch (error) { result.shutdownObserverCleanup = { bindingsRestored: false, error: String(error.stack ?? error) }; result.status = "failed"; }
      }
      if (config.reopenDiagnostic) {
        try { result.reopenDiagnosticCleanup = await browser.evaluate("(/** Restore/delete only this arm's retained diagnostic handle even after native or transport failure. */()=>{const B=dependencyCountReuse,d=B.reopenDiagnostic;if(!d)return {present:false,restored:true};const cleanup=d.retire();delete B.reopenDiagnostic;return {present:true,...cleanup,pendingTransactions:d.report.pendingTransactions}})()"); }
        catch (error) { result.reopenDiagnosticCleanup = { restored: false, error: String(error.stack ?? error) }; result.status = "failed"; }
      }
      if (config.response) {
        try { result.responsivenessCleanup = await browser.evaluate("(/** Independently retire a diagnostic observer after workload failure; stop is idempotent. */()=>{const observer=dependencyCountReuse.responsiveness;if(observer)observer.stop();return {present:Boolean(observer),retired:true}})()"); }
        catch (error) { result.responsivenessCleanup = { retired: false, error: String(error.stack ?? error) }; result.status = "failed"; }
      }
      try { await browser.cleanup(); result.cleanup = { status: "passed" }; }
      catch (error) { result.cleanup = { status: "failed", error: String(error.stack ?? error) }; result.status = "failed"; }
    }
  }
  return result;
}

/** Negative controls count actual first creation, deletion and pending-journal recovery independently. */
async function controls(bundle, name) {
  const browser = await chromiumHarness(bundle);
  try {
    await initialize(browser);
    return await browser.evaluate(`(/** Exercise first creation, deletion and interrupted selected repair through production owners. */async()=>{
      const B=dependencyCountReuse,M=sourceModules,c=await B.setup(${JSON.stringify(name)},2),r=c.repository,db=c.db,results={};
      try{
        let o=B.observe(r);try{await B.replace(c,2,1);results.newOwner={operations:o.operations};}finally{o.retire();}
        results.afterNew=await B.oracle(c);
        o=B.observe(r);try{const result=await r.tombstone('Owner-0002.md');ok(result.outcome==='activated','Tombstone activates');ok(await r.flush(),'Deletion flush closes');results.deleted={operations:o.operations};}finally{o.retire();}
        results.afterDelete=await B.oracle(c);
        let cancelled=false;const checkpoint=r.runtime.localDependencyCheckpoint;
        r.runtime.localDependencyCheckpoint=/** Interrupt after a committed selected decrement batch. */phase=>{if(phase==='after-local-old-count-batch')cancelled=true;};
        const old=await r.inspect('Owner-0000.md'),data=B.facts(0,9,true);
        const result=await r.replace({sourceId:'Owner-0000.md',expected:old.expected,physical:{...old.head.physical,mtime:9},observation:{...old.head.observation,revision:9},families:Object.fromEntries(M.SOURCE_FAMILIES.map(/** Supply genuine changed facts to ordinary selected-count repair. */family=>[family,/** Preserve repository backpressure while producing the fault control. */async emit=>{for(const fact of data[family])if(!await emit(fact))return false;return true}]))},/** Stop only after the controlled committed repair checkpoint. */()=>!cancelled);
        r.runtime.localDependencyCheckpoint=checkpoint;
        results.interrupted={outcome:result.outcome,reason:result.reason,repairs:await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).count())};
        ok(cancelled&&results.interrupted.repairs>0,'Actual selected repair interruption retains journal');
        o=B.observe(r);try{await B.replace(c,0,10);results.pendingRecovery={operations:o.operations};}finally{o.retire();}
        for(const previous of new Set([old.head.sourceRevision,...Object.values(old.head.families).map(/** Include retained family revisions in known predecessor reclamation. */family=>family.revision)]))ok(await r.cleanupRevision('Owner-0000.md',previous),'Interrupted predecessor reclaimed');
        results.afterRecovery=await B.oracle(c);
        return results;
      }finally{c.fixture.close();}
    })()`);
  } finally { await browser.cleanup(); }
}

/** Preserve every arm immediately; timing runs omit detailed wrappers and the semantic oracle. */
async function main() {
  if (process.version !== "v22.22.2") throw new Error(`Node 22.22.2 required; actual ${process.version}`);
  const mode = (process.argv[2] ?? "smoke").replace(/^repair-/, "");
  if (!["smoke", "characterize", "representative", "full", "late-control", "reopen", "responsiveness", "shutdown", "shutdown-smoke", "shutdown-size"].includes(mode)) throw new Error("Use an existing comparison mode or repair-shutdown, repair-shutdown-smoke, repair-shutdown-size");
  const shutdownStudy = mode.startsWith("shutdown");
  const followup = repairStudy && (["reopen", "responsiveness"].includes(mode) || shutdownStudy);
  if (!repairStudy && (["reopen", "responsiveness"].includes(mode) || shutdownStudy)) throw new Error("Follow-up diagnostics are restricted to the PR207 repair study");
  const changed = git(["diff", base, "--name-only", "--", "src/"]).trim().split(/\r?\n/).filter(Boolean);
  if (changed.some(/** Other runtime changes would invalidate the single-file exact-baseline override. */file => file !== runtimeFile)) throw new Error(`Exact baseline override insufficient for runtime files: ${changed.join(", ")}`);
  const baselineSource = git(["show", `${base}:${runtimeFile}`]);
  const candidateSource = await readFile(join(root, runtimeFile), "utf8");
  let productionArtifacts;
  if (shutdownStudy) {
    if (sha256(baselineSource) !== "534a061e64ddfe7a609cc774788567ec8ba6afc4c953ea556e7ff9834fe4c63e"
      || sha256(candidateSource) !== "d8d6d532bb711b3cb2bb5d0e55152392495533b8eb64c069158ca8b0e98809d8") throw Error("Shutdown study source identity changed");
    if (!process.env.KPLEX_REPAIR_BASELINE_ARTIFACT_DIR) throw Error("Pinned baseline artifact directory required");
    productionArtifacts = { A: sha256(await readFile(join(process.env.KPLEX_REPAIR_BASELINE_ARTIFACT_DIR, "main.js"))),
      F: sha256(await readFile(join(root, "dist/main.js"))) };
    if (productionArtifacts.A !== "7fa00a354d38fb2cedecbb9d15c5277e0513813b7074d487f5ebda9820c2b79f"
      || productionArtifacts.F !== "19d75415c69d8c77bbde934f618eeece2f0387459a49003090eedef61b9bb28f") throw Error("Shutdown study production artifact identity changed");
  }
  const bundles = { A: await contributorBrowserBundle([runtimeFile], { [runtimeFile]: baselineSource }), F: await contributorBrowserBundle([runtimeFile]) };
  const resumeDirectory = process.env.KPLEX_REPAIR_RESUME_DIR;
  if (resumeDirectory && followup) throw new Error("Follow-up diagnostics require a fresh separate report directory, not acceptance-cohort resumption");
  if (resumeDirectory && !repairStudy) throw new Error("Resumption is restricted to the PR207 repair study");
  const reportPrefix = followup ? `kplex-dependency-repair-207-${mode}-` : repairStudy ? "kplex-dependency-repair-207-" : "kplex-dependency-count-reuse-";
  const directory = resumeDirectory ? resolve(resumeDirectory) : await mkdtemp(join(tmpdir(), reportPrefix));
  if (resumeDirectory && (!directory.startsWith(resolve(tmpdir()) + sep) || !basename(directory).startsWith("kplex-dependency-repair-207-"))) throw new Error("Resume only an existing owned PR207 temporary report directory");
  let summary = { mode, directory, createdAt: new Date().toISOString(), node: process.version, platform: process.platform, base, head: git(["rev-parse", "HEAD"]).trim(), sourceHashes: { A: sha256(baselineSource), F: sha256(candidateSource) }, bundleHashes: Object.fromEntries(Object.entries(bundles).map(/** Record each actual browser bundle separately from source identities. */([key, value]) => [key, sha256(value)])), conditions: { storage: "fresh test-owned real Chromium IndexedDB per arm", timing: "Existing CDP endpoint metrics: main-thread TaskDuration(threadTicks) plus ProcessTime current-renderer cumulative CPU when available; Browser/storage-process CPU excluded; no exclusive store CPU attribution", metricSemantics: "https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/inspector/inspector_performance_agent.cc", profile: "existing shared disposable Chromium harness; headless, disable-gpu", completion: "all known old source revisions reclaimed and no local journals; actual selected-row oracle follows timing", later: "same owned browser profile restarted, authenticated lookup then genuine dependency-changing edit", memory: "Endpoint JS heap samples only; not allocation or true peak", forcedGc: false }, results: [] };
  if (repairStudy) {
    summary.study = "PR207 ordinary dependency-count repair";
    Object.assign(summary.conditions, {
      workload: "Separate fresh creation, genuinely changed replacement, ordinary deletion and authenticated unchanged-projection control; mixed and mostly-distinct memberships; duplicate-heavy diagnostic only",
      completion: "Each measured batch includes ordinary repair, complete known old membership/family reclamation, flush, inventory closure and bounded release/debt assertions; full actual-source projection oracle is outside timing",
      preparation: "Fresh real browser/profile/database per arm; seeded predecessor construction is outside timing; creation starts from an initialized empty logical database",
      later: "Same owned browser profile restarted, authenticated lookup and closure; deletion cohorts separately measure recreation before a genuine edit of the recreated live owner. Recreation/edit completion includes normal cleanup; full oracles follow each interval.",
      operationAccounting: "Diagnostic native calls are request/continuation attempts; delivered rows/bytes are read payloads and may include boundary lookahead or aborted work. A range-delete request does not identify its logical deleted-row count. Transaction terminal events distinguish commit/abort, while the independent final oracle establishes actual reclamation and exact selected counts.",
      limitations: "Renderer ProcessTime covers renderer threads only; Browser/storage/utility CPU, OS PIDs/births/exits and sampling gaps are not observed. Fresh profiles do not establish equivalent physical storage, OS caches or heap. Browser launch/restart wall costs are separate; their startup CPU precedes CDP metric enablement and is excluded. Detailed native lifetime elapsed includes scheduling and is not exclusive lock time.",
    });
  }
  if (shutdownStudy) {
    summary.productionArtifacts = productionArtifacts;
    summary.conditions.shutdownStudy = "Diagnostic-only: same completed 128-owner mixed deletion write history; forced SIGTERM/fallback versus normal CDP Browser.close. Passive transaction terminal observer, closed native connection, actual owned PID exit/new PID before reopen. No forced GC or idle delay. File stat observations are outside native-open clocks; physical equivalence is not inferred.";
    summary.conditions.decisionRule = "Existing material rule retained: candidate >=10% and >5ms excess in at least2/3 pairs for reopen, localized native open, and separately total shutdown/relaunch/reopen. Inspect cost shifted into shutdown. If graceful128 repeats material excess, bounded64/256 graceful size comparison; all failures/unfavorable arms retained, no post-hoc tolerance.";
  }
  if (followup) Object.assign(summary.conditions, { diagnosticOnly: true, cpuEligibleForAcceptance: false,
    diagnosticScope: mode === "reopen" || shutdownStudy ? "One-evaluation fixture/open, lookup, flush, completeInventory and closure-remainder wall spans; total renderer CPU only. Native open events and at most 16 transaction records; SystemInfo snapshots outside CPU endpoints. No source payloads or extra between-phase native awaits."
      : "16ms event-loop heartbeat including terminal gap, optional >=50ms long-task count/observed maximum/top8. Whole replacement includes staging, count repair, reclamation, closure and IPC; no exclusive count-owner CPU, true maximum task duration or paint inference.",
    diagnosticOverhead: "Diagnostic observers and process snapshots are separate follow-ups; do not pool these CPU endpoints with the original acceptance cohort. Original unfavorable reopen endpoints remain unchanged." });
  const protocol = repairStudy ? { version: "dependency-repair-207-v1", transportBatch: 8, seedBatch: 32,
    fixtureSha256: sha256(await readFile(join(root, "tests/support/dependencyCountReuseFixture.mjs"))),
    browserHarnessSha256: sha256(await readFile(join(root, "tests/support/browserTypeScript.mjs"))),
    contributorFixtureSha256: sha256(await readFile(join(root, "tests/support/contributorBrowserFixture.mjs"))) } : null;
  if (shutdownStudy) Object.assign(protocol, { version: "dependency-repair-207-shutdown-v1",
    lifecycleSha256: sha256(await readFile(join(root, "tests/support/chromiumLifecycle.mjs"))),
    completionObserverSha256: sha256(await readFile(join(root, "tests/support/restartCompletionObserver.mjs"))) });
  const passed = new Map();
  if (resumeDirectory) {
    const previousBytes = await readFile(join(directory, "summary.json"));
    const previous = JSON.parse(previousBytes.toString("utf8"));
    const legacy = previous.protocol ? null : await optionalReceipt(join(directory, "resume-protocol.json"));
    const legacyAttestation = validateResumeIdentity(previous, summary, protocol, legacy, directory);
    if (legacyAttestation) previous.legacyProtocolAdoption = legacyAttestation;
    for (const entry of previous.results) {
      const filename = entry.file ?? `${entry.name}.json`;
      if (!/^[a-zA-Z0-9.-]+\.json$/.test(filename)) throw new Error("Unsafe saved receipt filename");
      const receipt = await optionalReceipt(join(directory, filename));
      if (canSkipSavedArm(entry, receipt)) {
        if (passed.has(entry.name)) throw new Error(`Duplicate passed arm: ${entry.name}`);
        passed.set(entry.name, receipt);
      }
    }
    const resumedAt = new Date().toISOString();
    const snapshot = `summary-before-resume-${resumedAt.replace(/[:.]/g, "-")}.json`;
    await writeFile(join(directory, snapshot), previousBytes, { flag: "wx" });
    summary = previous; summary.protocol = protocol;
    (summary.resumptions ??= []).push({ resumedAt, previousSummarySha256: sha256(previousBytes), snapshot, currentHead: git(["rev-parse", "HEAD"]).trim(), skippedPassedArms: passed.size });
    delete summary.finishedAt; summary.status = "resuming";
  } else if (repairStudy) summary.protocol = protocol;
  console.log(JSON.stringify({ directory, mode, sourceHashes: summary.sourceHashes }));
  await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
  /** Persist every completed/incomplete arm immediately so unfavorable evidence survives later faults. */
  const save = async (name, result) => {
    const file = attemptReceiptFilename(name, summary.results);
    await writeFile(join(directory, file), JSON.stringify(result, null, 2), { flag: "wx" });
    summary.results.push({ name, status: result.status ?? "passed", file });
    await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ name, file, status: result.status ?? "passed", elapsedMs: result.elapsedMs, rendererMainThreadTaskSeconds: result.rendererMainThreadTaskSeconds, rendererProcessCpuSeconds: result.rendererProcessCpuSeconds, error: result.error }));
  };
  const currentResults = new Map();
  /** Reuse only a fully validated passed arm; failed/incomplete attempts remain visible and get a new receipt. */
  const run = async (kind, name, config, detailed) => {
    const saved = passed.get(name);
    if (saved && canSkipSavedArm({ name, status: "passed" }, saved, config, detailed)) {
      currentResults.set(name, "passed"); console.log(JSON.stringify({ name, status: "passed", resumedSkip: true })); return;
    }
    const result = await arm(bundles[kind], name, config, detailed);
    await save(name, result); currentResults.set(name, result.status);
  };
  if (followup) {
    if (shutdownStudy) {
      const pairs = mode === "shutdown-smoke" ? 1 : 3;
      for (let pair = 1; pair <= pairs; pair++) {
        const sizes = mode === "shutdown-size" ? pair % 2 ? [64, 256] : [256, 64] : [mode === "shutdown-smoke" ? 2 : 128];
        for (const owners of sizes) for (const shutdown of mode === "shutdown-size" ? ["graceful"] : pair % 2 ? ["forced", "graceful"] : ["graceful", "forced"])
          for (const kind of pair % 2 ? ["A", "F"] : ["F", "A"]) {
            const name = `diagnostic-${shutdown}-${owners}-mixed-delete-${pair}-${kind}`;
            await run(kind, name, { owners, distribution: "mixed", operation: "delete", wide: false, pair, reopenDiagnostic: true, shutdown }, false);
          }
      }
    } else if (mode === "reopen") {
      for (let pair=1;pair<=3;pair++) for (const kind of pair%2?["A","F"]:["F","A"]) {
        const name=`diagnostic-reopen-128-mixed-delete-${pair}-${kind}`;
        await run(kind,name,{owners:128,distribution:"mixed",operation:"delete",wide:false,pair,reopenDiagnostic:true},false);
      }
    } else for (const distribution of ["mixed","distinct"]) for (const kind of ["A","F"]) {
      const name=`diagnostic-responsiveness-128-${distribution}-changed-${kind}`;
      await run(kind,name,{owners:128,distribution,operation:"changed",wide:false,pair:1,response:true},false);
    }
    summary.finishedAt=new Date().toISOString();
    summary.status=[...currentResults.values()].every(/** Every requested diagnostic arm remains required; failed results are retained. */status=>status==="passed")?"passed":"failed";
    await writeFile(join(directory,"summary.json"),JSON.stringify(summary,null,2));
    if(summary.status!=="passed")process.exitCode=1;
    return;
  }
  if (repairStudy) {
    // Characterization deliberately measures only the accepted source before implementation;
    // later modes compare the exact accepted blob with the captured working candidate.
    const kinds = mode === "characterize" ? ["A"] : ["A", "F"];
    for (const distribution of ["mixed", "distinct", "reuse"]) for (const operation of ["create", "changed", "delete", "unchanged"]) for (const kind of kinds) {
      const name = `detail-${distribution}-${operation}-${kind}`;
      await run(kind, name, { owners: 2, distribution, operation, wide: false }, true);
    }
    for (const kind of kinds) await run(kind, `detail-wide-changed-${kind}`, { owners: 2, distribution: "mixed", operation: "changed", wide: true }, true);
    // Invalid diagnostic closure makes a timing cohort uninterpretable. Retain every diagnostic
    // receipt and return the failure before spending acceptance runs on an unvalidated harness.
    if ([...currentResults.values()].some(/** A current incomplete diagnostic is a failed prerequisite; historical failures remain separate receipts. */status => status !== "passed")) {
      summary.finishedAt = new Date().toISOString(); summary.status = "failed";
      await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
      process.exitCode = 1; return;
    }
    if (mode !== "characterize") {
      const sizes = mode === "full" ? [64, 128, 256] : mode === "representative" ? [128] : [2];
      for (const owners of sizes) for (const distribution of ["mixed", "distinct"]) for (const operation of ["create", "changed", "delete", "unchanged"]) {
        const pairs = owners === 128 && operation !== "unchanged" ? 3 : 1;
        for (let pair = 1; pair <= pairs; pair++) for (const kind of pair % 2 ? ["A", "F"] : ["F", "A"]) {
          const name = `timing-${owners}-${distribution}-${operation}-${pair}-${kind}`;
          await run(kind, name, { owners, distribution, operation, wide: false, pair }, false);
        }
      }
    }
    summary.finishedAt = new Date().toISOString();
    summary.status = [...currentResults.values()].every(/** Every required named arm must have an actual completed result. */status => status === "passed") ? "passed" : "failed";
    summary.retainedFailedOrIncompleteAttempts = summary.results.filter(/** Successful continuation does not erase the original unsuccessful attempt. */result => result.status !== "passed").length;
    await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
    if (summary.status !== "passed") process.exitCode = 1;
    return;
  }
  if (mode === "late-control") {
    // Keep the deliberately unfavorable zero-hit cohort separate. Its late mismatch exposed the
    // historical streaming-proof penalty; final deferred authentication must skip that old-row work.
    for (const kind of ["A", "F"])
      await save(`detail-late-${kind}`, await arm(bundles[kind], `detail-late-${kind}`, { owners: 2, mixed: false, changeMode: "late", rounds: 1, wide: false }, true));
    for (let pair = 1; pair <= 3; pair++) for (const kind of pair % 2 ? ["A", "F"] : ["F", "A"]) {
      const name = `timing-16-late-${pair}-${kind}`;
      await save(name, await arm(bundles[kind], name, { owners: 16, mixed: false, changeMode: "late", rounds: 1, wide: false, pair }, false));
    }
    summary.finishedAt = new Date().toISOString();
    summary.status = summary.results.every(/** An incomplete or failed arm prevents a clean cohort pass. */result => result.status === "passed") ? "passed" : "failed";
    await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
    if (summary.status !== "passed") process.exitCode = 1;
    return;
  }
  for (const kind of ["A", "F"]) {
    let result;
    try { result = await controls(bundles[kind], `dependency-controls-${kind}-${Date.now()}`); }
    catch (error) { result = { status: "failed", error: String(error.stack ?? error) }; }
    await save(`controls-${kind}`, result);
    if (result.status === "failed") { summary.status = "failed"; await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2)); process.exitCode = 1; return; }
  }
  const sizes = mode === "full" ? [64, 128, 256] : mode === "representative" ? [128] : [2];
  for (const wide of [false, true]) for (const mixed of [false, true]) for (const kind of ["A", "F"]) {
    const name = `detail-${wide ? "byte" : "page"}-${mixed ? "mixed" : "same"}-${kind}`;
    await save(name, await arm(bundles[kind], name, { owners: 2, mixed, wide, rounds: 2 }, true));
  }
  if (mode !== "characterize") for (const owners of sizes) for (const mixed of [false, true]) {
    const pairs = owners === 128 ? 3 : 1;
    for (let pair = 1; pair <= pairs; pair++) for (const kind of pair % 2 ? ["A", "F"] : ["F", "A"]) {
      const name = `timing-${owners}-${mixed ? "mixed" : "same"}-${pair}-${kind}`;
      await save(name, await arm(bundles[kind], name, { owners, mixed, wide: false, pair }, false));
    }
  }
  summary.finishedAt = new Date().toISOString();
  summary.status = summary.results.every(/** Preserve all failed/incomplete evidence in the final cohort status. */result => result.status === "passed") ? "passed" : "failed";
  await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
  if (summary.status !== "passed") process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
