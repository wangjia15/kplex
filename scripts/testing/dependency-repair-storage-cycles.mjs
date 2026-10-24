/**
 * Bounded create/change/delete history in one disposable database/profile per frozen PR207 variant.
 * Owns serial graceful process lifetimes, private provenance/failure receipts and two reopens after
 * each cycle. Metadata/allocation diagnostics and semantic oracles stay outside CPU windows. This
 * is a separate storage-history diagnostic, never pooled with primary acceptance measurements.
 * The finite fault-smoke mode throws only after its first completed two-owner create phase to
 * verify failed-receipt persistence and owned-profile removal; full mode never injects a fault.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inventoryOwnedIndexedDbFiles } from "../../tests/support/indexedDbFileInventory.mjs";
import { createDependencyRepairPointReadVariant } from "../../tests/support/dependencyRepairPointReads.mjs";
import { createDependencyRepairVariants, DEPENDENCY_REPAIR_VARIANT_IDENTITIES as identities } from "../../tests/support/dependencyRepairVariants.mjs";
import { contributorBrowserBundle } from "../../tests/support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "../../tests/support/browserTypeScript.mjs";
import { installRestartCompletionObserver } from "../../tests/support/restartCompletionObserver.mjs";
import { chromiumProcessSnapshot } from "../../tests/support/chromiumProcessMetrics.mjs";
import { initialize, metrics, processChanges, ownedIndexedDbSize } from "./dependency-count-reuse.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../.."), runtime = identities.runtimeFile;
/** Hash exact bytes without source/artifact normalization. */
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
/** Read frozen local Git objects without moving or rewriting a branch. */
const source = commit => execFileSync("git", ["show", `${commit}:${runtime}`], { cwd: root, encoding: "utf8", timeout: 15000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
const candidateSource = source(identities.candidateCommit);
const variants = { ...createDependencyRepairVariants({ baselineSource: source(identities.baselineCommit), candidateSource }), E: createDependencyRepairPointReadVariant({ candidateSource }) };
const mode = process.argv[2] ?? "smoke", ids = (process.argv[3] ?? "D,A").split(",");
if (!["smoke", "fault-smoke", "full"].includes(mode) || ids.some(/** Reject unplanned controls rather than choosing another candidate. */id => !variants[id]) || new Set(ids).size !== ids.length) throw Error("Finite mode/variant list required");
if (process.version !== "v22.22.2") throw Error("Pinned Node required");
const owners = mode === "full" ? 256 : 2, cycles = mode === "full" ? 3 : 1;
const directory = await mkdtemp(join(tmpdir(), `kplex-repair-cycles-207-${mode}-`));
const summary = { version: "dependency-repair-cycles-207-v1", mode, directory, owners, cycles, ids,
  node: process.version, platform: process.platform, architecture: process.arch, nodeComponents: { ...process.versions },
  baseline: identities.baselineCommit, reviewed: identities.candidateCommit,
  frozenSources: { baselineSha256: identities.baselineSha256, reviewedSha256: identities.candidateSha256 },
  variants: {}, productionArtifacts: {}, toolingHashes: {}, createdAt: new Date().toISOString(), status: "incomplete", results: [],
  faultProtocol: mode === "fault-smoke" ? "Deliberate tool-owned exception after the first completed create phase; expected exit1 and retained failed result with owned profile absent" : null,
  limitations: "Separate diagnostic cohort; same DB/profile across cycles, no reset, all create/change/delete work and native closures complete. Later create phases recreate tombstone owners. Observation revisions rise monotonically; compare logical parity across variants at the same cycle. Full source oracles are outside CPU windows and affect backend caches. Two immediate graceful reopens per cycle, no deliberate waits or forced GC. Root snapshots include observer IPC; renderer endpoints are a separate view, never added to process totals. CPU is not pooled with primary acceptance. restartMs includes the separately timed post-exit allocation observer; do not interpret it as uninstrumented restart latency. The harness executes exact TypeScript browser bundles; installed production artifact hashes are reference identities, not artifacts executed by this harness." };
console.log(JSON.stringify({ directory, mode, owners, cycles, ids }));
await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));

/** Save partial phases and failed lifetimes by reference before another operation can replace them. */
async function persist(result) {
  await writeFile(join(directory, result.variant + ".json"), JSON.stringify(result, null, 2));
  await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
}

/** Authenticate frozen sources/artifacts and direct diagnostic/bundling inputs before work. */
async function pinProvenance() {
  summary.workingSourceSha256 = sha(await readFile(join(root, runtime)));
  if (summary.workingSourceSha256 !== identities.candidateSha256) throw Error("Production source changed before the frozen cycles diagnostic");
  const baselineDirectory = process.env.KPLEX_REPAIR_BASELINE_ARTIFACT_DIR;
  if (!baselineDirectory) throw Error("Explicit KPLEX_REPAIR_BASELINE_ARTIFACT_DIR required for frozen artifact provenance");
  for (const [label, selected] of [["baseline", resolve(baselineDirectory)], ["reviewed", join(root, "dist")]]) {
    const hashes = {};
    for (const file of ["main.js", "manifest.json", "styles.css"]) hashes[file] = sha(await readFile(join(selected, file)));
    summary.productionArtifacts[label] = hashes;
  }
  if (summary.productionArtifacts.baseline["main.js"] !== "7fa00a354d38fb2cedecbb9d15c5277e0513813b7074d487f5ebda9820c2b79f"
    || summary.productionArtifacts.reviewed["main.js"] !== "19d75415c69d8c77bbde934f618eeece2f0387459a49003090eedef61b9bb28f") throw Error("Frozen production artifact identity differs");
  for (const file of ["scripts/testing/dependency-repair-storage-cycles.mjs", "scripts/testing/dependency-count-reuse.mjs",
    "tests/support/indexedDbFileInventory.mjs", "tests/support/dependencyRepairVariants.mjs", "tests/support/dependencyRepairPointReads.mjs",
    "tests/support/chromiumProcessMetrics.mjs", "tests/support/contributorBrowserFixture.mjs", "tests/support/retiredSourcePrototypes.mjs",
    "tests/support/browserTypeScript.mjs", "tests/support/browserExecutable.mjs", "tests/support/chromiumLifecycle.mjs",
    "tests/support/restartCompletionObserver.mjs", "tests/support/dependencyCountReuseFixture.mjs"])
    summary.toolingHashes[file] = sha(await readFile(join(root, file)));
  for (const id of ids) {
    const descriptor = { ...variants[id] }; delete descriptor.source; delete descriptor.sourceOverrides;
    summary.variants[id] = descriptor; await writeFile(join(directory, id + ".SourceRepository.ts"), variants[id].source);
  }
  await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
}

/** Preserve invalid renderer counters as unknown rather than serializing a false zero. */
function attachMetricEndpoints(receipt, before, after) {
  receipt.metricEndpoints = { before, after };
  receipt.rendererCpuSeconds = Number.isFinite(before.ProcessTime) && Number.isFinite(after.ProcessTime)
    && after.ProcessTime >= before.ProcessTime ? after.ProcessTime - before.ProcessTime : null;
  receipt.sampledJsHeap = { before: before.JSHeapUsedSize, after: after.JSHeapUsedSize };
  if (receipt.rendererCpuSeconds === null) receipt.rendererCpuError = "Renderer ProcessTime unavailable or non-monotonic";
}

/** Retain after endpoints independently even if measured work or another endpoint failed. */
async function terminalEndpoints(browser, receipt, metricBefore, processBefore) {
  const errors = [];
  try { attachMetricEndpoints(receipt, metricBefore, await metrics(browser)); }
  catch (error) { errors.push({ endpoint: "renderer-after", error: String(error.stack ?? error) }); }
  try { const after = await chromiumProcessSnapshot(browser); receipt.processCpu = { before: processBefore, after, comparison: processChanges(processBefore, after) }; }
  catch (error) { errors.push({ endpoint: "process-after", error: String(error.stack ?? error) }); }
  if (errors.length) receipt.endpointErrors = errors;
  return errors;
}

/** Reopen in the original single-evaluate native-open/lookup/closure order, retaining failed spans. */
async function reopen(browser, name, receipt) {
  receipt.status = "incomplete";
  try {
    receipt.failurePhase = "process-before";
    const before = await chromiumProcessSnapshot(browser); receipt.processCpu = { before };
    receipt.failurePhase = "renderer-before";
    const metricBefore = await metrics(browser); receipt.metricEndpoints = { before: metricBefore };
    receipt.failurePhase = "native-open-lookup-closure";
    const began = performance.now(); let workError, endpoints;
    try {
      Object.assign(receipt, await browser.evaluate(`(async()=>{const B=dependencyCountReuse,M=sourceModules,d=B.reopenDiagnostic=B.observeReopen(),start=performance.now();try{const f=await fixture(${JSON.stringify(name)});B.context={fixture:f,repository:f.repository,db:await f.cache.open(),name:${JSON.stringify(name)},owners:${owners},wide:false,distribution:'mixed'};d.report.spans.fixtureOpen={elapsedMs:performance.now()-start};d.attach(f.repository);d.phase('lookup');let at=performance.now();const found=await f.repository.lookupLocalDependencyCounts([M.sourceLocalDependencyKey('node','Owner-0000.md')],()=>true,true);ok(found.outcome==='ready','Durable counts ready');d.report.spans.lookup={elapsedMs:performance.now()-at};d.phase('closure');at=performance.now();const closure=await B.closeWork(B.context);d.report.spans.closeWork={elapsedMs:performance.now()-at};d.report.browserTotalMs=performance.now()-start;ok(d.report.repairEntries===0&&d.report.countKeyWrites===0,'No repair/count work on clean reopen');return{closure,diagnostic:d.report};}finally{d.retire();}})()`));
    } catch (error) { workError = error; }
    finally { receipt.outerElapsedMs = performance.now() - began; endpoints = await terminalEndpoints(browser, receipt, metricBefore, before); }
    // Restore/report retrieval stays outside the original CPU/Node-wall interval. Registered
    // terminal listeners still track the final request-success/transaction-complete race.
    try { receipt.diagnostic = await browser.evaluate("(()=>{const B=dependencyCountReuse,d=B.reopenDiagnostic;if(!d)return{missing:true};try{d.retire();return d.report}finally{delete B.reopenDiagnostic}})()"); }
    catch (error) { receipt.diagnosticCollectionError = String(error.stack ?? error); workError ??= error; }
    if (workError) throw workError;
    if (endpoints.length) throw Error("Reopen terminal CPU endpoint failed; partial receipt retained");
    if (receipt.diagnostic?.missing || receipt.diagnostic.pendingTransactions || !receipt.diagnostic.cleanup?.restored) throw Error("Reopen observer incomplete");
    receipt.failurePhase = "post-window-oracle"; receipt.oracle = await browser.evaluate("dependencyCountReuse.oracle(dependencyCountReuse.context)");
    receipt.status = "passed"; delete receipt.failurePhase; return receipt;
  } catch (error) { receipt.status = "failed"; receipt.error = String(error.stack ?? error); throw error; }
}

/** Drain native terminals, close the connection and retire the passive proof for one exact lifetime. */
async function closeNativeOwners(browser) {
  return browser.evaluate(`(async()=>{const B=dependencyCountReuse,d=window.__kplexRestartCompletion,r=B.cyclesCloseReceipt={status:'incomplete'};r.before=await d.drain();ok(B.context.repository.transactions.size===0,'No owned transaction');B.context.fixture.close();r.after=await d.drain();let closed=false;try{B.context.db.transaction('meta')}catch(e){closed=e.name==='InvalidStateError'}r.connectionClosed=closed;ok(closed,'Native connection closed');const proof=d.retire();delete window.__kplexRestartCompletion;Object.assign(r,proof,{status:'passed',completedTransactions:proof.completed,abortedTransactions:proof.aborted});return r})()`);
}

/** Close/drain the actual native lifetime, retain failed restart proof, then open the same database. */
async function quitAndReopen(browser, name, receipt) {
  receipt.status = "incomplete"; receipt.failurePhase = "native-close";
  try {
    receipt.guard = await closeNativeOwners(browser);
    const profile = browser.identity().profile;
    receipt.failurePhase = "pre-shutdown-file-metadata"; receipt.before = await ownedIndexedDbSize(profile);
    receipt.failurePhase = "graceful-restart"; const start = performance.now();
    try {
      receipt.lifecycle = await browser.restart({ shutdown: "graceful",
        /** The guard owns the exact native lifetime already drained and closed above. */beforeShutdown: async () => receipt.guard,
        /** Observe metadata after actual exit, outside launch/open CPU intervals. */afterShutdown: async () => {
          receipt.after = await ownedIndexedDbSize(profile); receipt.after.inventory = await inventoryOwnedIndexedDbFiles(profile); return receipt.after;
        } });
    } finally { receipt.restartMs = performance.now() - start; }
    receipt.failurePhase = "new-browser-initialize"; await initialize(browser); await browser.evaluate(`(${installRestartCompletionObserver.toString()})()`);
    receipt.failurePhase = "reopen-and-oracle"; receipt.opened = { status: "incomplete" }; await reopen(browser, name, receipt.opened);
    receipt.failurePhase = "post-open-file-metadata"; receipt.afterOpen = await ownedIndexedDbSize(profile);
    receipt.status = "passed"; delete receipt.failurePhase; return receipt;
  } catch (error) {
    receipt.status = "failed"; receipt.error = String(error.stack ?? error); if (error.lifecycleReceipt) receipt.lifecycle = error.lifecycleReceipt;
    if (receipt.failurePhase === "native-close") {
      try { receipt.guard = await browser.evaluate("dependencyCountReuse.cyclesCloseReceipt??{missing:true}"); }
      catch (collectionError) { receipt.guardCollectionError = String(collectionError.stack ?? collectionError); }
    }
    throw error;
  }
}

/** Measure the original eight-owner batches and retain endpoints even for interrupted work. */
async function operationPhase(browser, cycle, operation, phase) {
  try {
    phase.failurePhase = "process-before"; const before = await chromiumProcessSnapshot(browser); phase.processCpu = { before };
    phase.failurePhase = "renderer-before"; const metricBefore = await metrics(browser); phase.metricEndpoints = { before: metricBefore };
    phase.failurePhase = "measured-work"; const began = performance.now(); let workError, endpoints;
    try {
      for (let first = 0; first < owners; first += 8) {
        if (operation === "delete") await browser.evaluate(`dependencyCountReuse.repairWorkload(dependencyCountReuse.context,'delete',null,${first},8)`);
        else await browser.evaluate(`(async()=>{const B=dependencyCountReuse;for(let i=${first};i<Math.min(${owners},${first + 8});i++)await B.replace(B.context,i,${cycle * 2 + (operation === "changed" ? 1 : 0)},${operation === "changed"});return B.closeWork(B.context)})()`);
      }
    } catch (error) { workError = error; }
    finally { phase.elapsedMs = performance.now() - began; endpoints = await terminalEndpoints(browser, phase, metricBefore, before); }
    if (workError) throw workError;
    if (endpoints.length) throw Error("Operation terminal CPU endpoint failed; partial receipt retained");
    phase.failurePhase = "post-window-oracle"; phase.oracle = await browser.evaluate("dependencyCountReuse.oracle(dependencyCountReuse.context)");
    phase.failurePhase = "post-window-file-metadata"; phase.files = await ownedIndexedDbSize(browser.identity().profile);
    phase.status = "passed"; delete phase.failurePhase;
  } catch (error) { phase.status = "failed"; phase.error = String(error.stack ?? error); throw error; }
}

try { await pinProvenance(); }
catch (error) { summary.status = "failed"; summary.failurePhase = "provenance"; summary.error = String(error.stack ?? error); await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2)); throw error; }
for (const id of ids) {
  const result = { variant: id, sourceSha256: variants[id].sha256, status: "incomplete", failurePhase: "bundle", cycles: [] };
  let browser; summary.results.push({ variant: id, file: id + ".json", status: "incomplete" }); await persist(result);
  try {
    const bundle = await contributorBrowserBundle([runtime], { [runtime]: variants[id].source }); result.bundleSha256 = sha(bundle); summary.variants[id].bundleSha256 = result.bundleSha256;
    result.failurePhase = "browser-start"; await persist(result); browser = await chromiumHarness(bundle);
    result.failurePhase = "fixture-preparation"; await initialize(browser); result.browserVersion = await browser.command("Browser.getVersion");
    await browser.evaluate(`(${installRestartCompletionObserver.toString()})()`);
    const name = `storage-cycles-${id}-${Date.now()}`; result.identity = browser.identity();
    await browser.evaluate(`(async()=>{const B=dependencyCountReuse;B.context=await B.setup(${JSON.stringify(name)},${owners},false,false,'mixed');return true})()`);
    await browser.evaluate("dependencyCountReuse.closeWork(dependencyCountReuse.context)");
    for (let cycle = 0; cycle < cycles; cycle += 1) {
      const record = { cycle: cycle + 1, phases: [] }; result.cycles.push(record);
      result.failurePhase = `cycle${cycle + 1}-preparation-oracle`; record.before = await browser.evaluate("dependencyCountReuse.oracle(dependencyCountReuse.context)");
      for (const operation of ["create", "changed", "delete"]) {
        const phase = { operation, label: operation === "create" && cycle > 0 ? "recreation of tombstone owners" : operation, status: "incomplete" };
        record.phases.push(phase); result.failurePhase = `cycle${cycle + 1}-${operation}`; await persist(result);
        await operationPhase(browser, cycle, operation, phase); await persist(result);
        console.log(JSON.stringify({ variant: id, cycle: cycle + 1, operation, elapsedMs: phase.elapsedMs }));
        if (mode === "fault-smoke" && cycle === 0 && operation === "create") {
          result.failurePhase = "deliberate-test-fault-after-first-create";
          result.deliberateFault = { triggered: true, phaseCompleted: "create", source: "test-only driver", expectedExitCode: 1 };
          await persist(result); throw Error("KPLEX_STORAGE_CYCLES_TEST_FAULT: deliberate failure after completed create phase");
        }
      }
      record.firstReopen = { status: "incomplete" }; result.failurePhase = `cycle${cycle + 1}-first-reopen`; await persist(result);
      await quitAndReopen(browser, name, record.firstReopen); await persist(result);
      record.repeatReopenWithoutSourceWrites = { status: "incomplete" }; result.failurePhase = `cycle${cycle + 1}-repeat-reopen`; await persist(result);
      await quitAndReopen(browser, name, record.repeatReopenWithoutSourceWrites); await persist(result);
      console.log(JSON.stringify({ variant: id, cycle: cycle + 1, reopen: record.firstReopen.opened.diagnostic.opens, repeat: record.repeatReopenWithoutSourceWrites.opened.diagnostic.opens, files: record.repeatReopenWithoutSourceWrites.after }));
    }
    result.failurePhase = "final-fixture-close"; result.finalClosure = await closeNativeOwners(browser);
    result.status = "passed"; delete result.failurePhase;
  } catch (error) {
    result.status = "failed"; result.error = String(error.stack ?? error); if (error.lifecycleReceipt) result.failureLifecycle = error.lifecycleReceipt;
    if (browser && result.failurePhase === "final-fixture-close") {
      try { result.finalClosure = await browser.evaluate("dependencyCountReuse.cyclesCloseReceipt??{missing:true}"); }
      catch (collectionError) { result.finalClosureCollectionError = String(collectionError.stack ?? collectionError); }
    }
  }
  finally {
    if (browser) {
      try {
        await browser.cleanup();
        try { await lstat(browser.identity().profile); result.cleanupProfileAbsent = false; }
        catch (error) { if (error.code !== "ENOENT") throw error; result.cleanupProfileAbsent = true; }
        if (!result.cleanupProfileAbsent) throw Error("Owned Chromium profile remains after cleanup");
        result.cleanup = "passed";
      }
      catch (error) { result.cleanup = "failed"; result.status = "failed"; result.cleanupError = String(error.stack ?? error); }
    } else result.cleanup = "unverified";
    summary.results.at(-1).status = result.status; await persist(result);
  }
  if (result.cleanup !== "passed") throw Error("Stop after incomplete owned cleanup");
}
summary.status = summary.results.every(/** Adverse arms remain failed rather than excluded. */result => result.status === "passed") ? "passed" : "failed";
summary.finishedAt = new Date().toISOString(); await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
if (summary.status !== "passed") process.exitCode = 1;
