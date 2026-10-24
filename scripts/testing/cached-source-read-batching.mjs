/**
 * Finite PR205 accepted-base/candidate comparison in fresh disposable real Chromium databases.
 * Production restart inventory and its durable metadata helper retain normal scheduling and source
 * validation. Diagnostic native-request counts are separate from lightweight renderer CPU timing.
 * Every accepted arm includes complete lease release, later editing/reclamation and browser reopen.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromiumHarness } from "../../tests/support/browserTypeScript.mjs";
import { contributorBrowserBundle, contributorBrowserInitialize } from "../../tests/support/contributorBrowserFixture.mjs";
import { installCachedSourceReadFixture } from "../../tests/support/cachedSourceReadFixture.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const baseline = "0f94252aabb8b23458b5df192380854ea0bddd53";
const runtimeFile = "src/index/SourceRepository.ts";
/** Record exact source and test bundle bytes independently from a later documentation/tooling commit. */
const sha256 = value => createHash("sha256").update(value).digest("hex");
/** Read immutable accepted source without changing checkouts or using a command shell. */
function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", timeout: 15000, windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr}`);
  return result.stdout;
}
/** Read existing cumulative CDP endpoints; this does not measure Browser/storage-process CPU. */
async function metrics(browser) {
  const result = await browser.command("Performance.getMetrics");
  const values = Object.fromEntries(result.metrics.map(/** Keep the exact named endpoint values for independent recalculation. */metric => [metric.name, metric.value]));
  if (!Number.isFinite(values.TaskDuration)) throw new Error("CDP TaskDuration unavailable");
  return values;
}
/** Existing renderer process CPU is optional; never substitute task time or sum workers twice. */
function cpu(before, after) {
  return Number.isFinite(before.ProcessTime) && Number.isFinite(after.ProcessTime) && after.ProcessTime > 0
    && after.ProcessTime >= before.ProcessTime ? after.ProcessTime - before.ProcessTime : null;
}
/** Install only test-owned fixtures and enable low-overhead existing metric endpoints. */
async function initialize(browser) {
  await browser.evaluate(contributorBrowserInitialize);
  await browser.evaluate(`(${installCachedSourceReadFixture.toString()})()`);
  await browser.command("Performance.enable", { timeDomain: "threadTicks" });
}
/** Capture one complete awaited interval with no diagnostic wrappers or oracle enumeration. */
async function timed(browser, expression) {
  const before = await metrics(browser), start = performance.now();
  const result = { status: "incomplete" };
  try { result.value = await browser.evaluate(expression); result.status = "passed"; }
  catch (error) { result.status = "failed"; result.error = String(error.stack ?? error); }
  finally {
    const elapsedMs = performance.now() - start, after = await metrics(browser);
    Object.assign(result, { elapsedMs, metricEndpoints: { before, after }, rendererProcessCpuSeconds: cpu(before, after),
      rendererMainThreadTaskSeconds: after.TaskDuration - before.TaskDuration,
      sampledJsHeap: { before: before.JSHeapUsedSize, after: after.JSHeapUsedSize } });
  }
  return result;
}
/** Count actual native work in a separate interval and retire every observer even on rejection. */
async function detailed(browser, expression) {
  return browser.evaluate(`(/** Scope diagnostics to this exact production helper/inventory lifetime. */async()=>{
    const B=cachedSourceRead,o=B.observe(B.context.repository);let result;
    try{result=await (${expression});return {status:'passed',value:result,totals:o.totals};}
    finally{o.retire();}
  })()`);
}
/** Preserve finite closure coordinates while excluding synthetic per-owner content from printed output. */
function sanitizedOracle(value) {
  const { heads, ...closure } = value;
  return { ...closure, owners: heads.length, selectedHeadDigest: sha256(JSON.stringify(heads)),
    familyChunks: heads.reduce(/** Sum physical family chunks independently from request counts. */(total, head) => total + Object.values(head.families).reduce(/** Every selected manifest contributes its declared chunk count. */(sum, family) => sum + family.chunks, 0), 0) };
}
/** Own one fresh process/profile arm, normal release/cleanup, subsequent edit and real process restart. */
async function arm(bundle, name, config, diagnostic) {
  const browser = await chromiumHarness(bundle);
  const result = { name, ...config, diagnostic, status: "incomplete" };
  try {
    await initialize(browser);
    result.browserVersion = await browser.command("Browser.getVersion");
    result.target = await browser.command("Target.getTargetInfo");
    const database = `cached-read-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await browser.evaluate(`(/** Open only this arm's owned logical database and host fixture. */async()=>{cachedSourceRead.context=await cachedSourceRead.setup(${JSON.stringify(database)},${config.owners},${Boolean(config.dense)},${config.control === "legacy"});return true})()`);
    for (let first = 0; first < config.owners; first += 16)
      await browser.evaluate(`cachedSourceRead.seedRange(cachedSourceRead.context,${first},16)`);
    if (config.control) await browser.evaluate(`cachedSourceRead.prepareControl(cachedSourceRead.context,${JSON.stringify(config.control)})`);
    const before = await browser.evaluate("cachedSourceRead.oracle(cachedSourceRead.context)");
    result.before = sanitizedOracle(before);
    if (config.damage) await browser.evaluate(`cachedSourceRead.corruptMetadata(cachedSourceRead.context,${JSON.stringify(config.damage)})`);
    await browser.evaluate("cachedSourceRead.reset(cachedSourceRead.context);true");
    if (diagnostic) {
      if (config.damage) {
        result.component = await detailed(browser, `cachedSourceRead.negativeComponent(cachedSourceRead.context,${JSON.stringify(config.damage)})`);
        result.inventory = { status: "not-run", reason: "Corrupt-family negative control; ordinary edit repairs before the next full inventory" };
      } else {
        result.component = await detailed(browser, "cachedSourceRead.component(cachedSourceRead.context)");
        await browser.evaluate("cachedSourceRead.reset(cachedSourceRead.context);true");
        result.inventory = await detailed(browser, "cachedSourceRead.inventory(cachedSourceRead.context)");
      }
    } else result.inventory = await timed(browser, "cachedSourceRead.inventory(cachedSourceRead.context)");
    if (!config.damage && result.inventory.status !== "passed") throw new Error(`Inventory failed: ${result.inventory.error}`);
    const after = await browser.evaluate("cachedSourceRead.oracle(cachedSourceRead.context)");
    result.after = sanitizedOracle(after);
    if (JSON.stringify(before.heads) !== JSON.stringify(after.heads)) throw new Error("Cached validation changed a selected source head");
    result.subsequentEdit = await timed(browser, "cachedSourceRead.subsequentEdit(cachedSourceRead.context)");
    if (result.subsequentEdit.status !== "passed") throw new Error(`Subsequent edit failed: ${result.subsequentEdit.error}`);
    result.afterEdit = sanitizedOracle(await browser.evaluate("cachedSourceRead.oracle(cachedSourceRead.context)"));
    await browser.evaluate("cachedSourceRead.context.fixture.close();true");
    const restartStart = performance.now(); await browser.restart(); result.browserRestartElapsedMs = performance.now() - restartStart;
    await initialize(browser);
    await browser.evaluate(`(/** Reconstruct the exact post-edit host without changing durable storage after restart. */async()=>{
      const B=cachedSourceRead;B.context=await B.setup(${JSON.stringify(database)},${config.owners},${Boolean(config.dense)},${config.control === "legacy"});
      const f=B.context.fixture,file=f.files.get(B.path(0));f.metadata.get(file.path).frontmatter.aliases=['New alias after cached validation'];file.stat.mtime++;file.stat.size++;B.reset(B.context);return true;
    })()`);
    result.reopen = await timed(browser, "cachedSourceRead.inventory(cachedSourceRead.context)");
    if (result.reopen.status !== "passed") throw new Error(`Reopen failed: ${result.reopen.error}`);
    result.afterReopen = sanitizedOracle(await browser.evaluate("cachedSourceRead.oracle(cachedSourceRead.context)"));
    if (result.afterReopen.selectedHeadDigest !== result.afterEdit.selectedHeadDigest) throw new Error("Clean reopen changed selected heads or shifted source repair");
    await browser.evaluate("cachedSourceRead.context.fixture.close();true");
    result.status = "passed";
  } catch (error) { result.error = String(error.stack ?? error); }
  finally {
    try { await browser.cleanup(); result.cleanup = { status: "passed" }; }
    catch (error) { result.cleanup = { status: "failed", error: String(error.stack ?? error) }; result.status = "failed"; }
  }
  return result;
}
/** Persist every unfavorable/incomplete receipt immediately; no outcome-based exclusions are allowed. */
async function main() {
  if (process.version !== "v22.22.2") throw new Error(`Node 22.22.2 required; actual ${process.version}`);
  const mode = process.argv[2] ?? "characterize";
  if (!["characterize", "smoke", "representative", "full"].includes(mode)) throw new Error("Use characterize, smoke, representative or full");
  const changed = git(["diff", baseline, "--name-only", "--", "src/"]).trim().split(/\r?\n/).filter(Boolean);
  if (changed.some(/** Exact baseline substitution may not silently inherit another changed runtime owner. */file => file !== runtimeFile)) throw new Error(`SourceRepository-only baseline override insufficient: ${changed.join(", ")}`);
  const source = { A: git(["show", `${baseline}:${runtimeFile}`]), F: await readFile(join(root, runtimeFile), "utf8") };
  const bundles = { A: await contributorBrowserBundle([runtimeFile], { [runtimeFile]: source.A }), F: await contributorBrowserBundle([runtimeFile]) };
  const directory = await mkdtemp(join(tmpdir(), "kplex-cached-source-read-"));
  const summary = { directory, mode, baseline, head: git(["rev-parse", "HEAD"]).trim(), createdAt: new Date().toISOString(), node: process.version,
    platform: process.platform, sourceHashes: Object.fromEntries(Object.entries(source).map(/** Pin production runtime text independently from harness commits. */([key, text]) => [key, sha256(text)])),
    bundleHashes: Object.fromEntries(Object.entries(bundles).map(/** Record actual synthetic executable bytes for both arms. */([key, text]) => [key, sha256(text)])),
    conditions: { lifecycle: "fresh disposable Chromium process/profile/database per arm; normal source seeding before measurement; actual browser restart reuses this owned profile",
      workload: "actual production reconcileRestartHostInventory with healthy cached sources; separate actual durableHostInventory component diagnostics",
      scheduling: "Isolated acquisition consumer uses explicit synthetic host doubles and has no GraphIndex backgroundCheckpoint callback; production repository yields, authentication and lease-release scheduling remain unchanged. This is not full-application foreground-admission evidence",
      timing: "CDP renderer ProcessTime cumulative CPU when available and main-thread TaskDuration(threadTicks); Browser/storage-process CPU excluded; endpoints include IPC gaps and normal yields",
      transactionLifetimes: "Diagnostic-only native transaction creation-to-complete/abort event elapsed time includes queueing and event dispatch; it is not exclusive write-lock duration or store CPU",
      metricSemantics: "https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/inspector/inspector_performance_agent.cc",
      memory: "Endpoint JS heap samples only; not allocation or true peak", release: "original-connection lease release included; oracle follows timing; edit/reclamation and reopen reported separately",
      limitations: "fresh profiles do not establish identical physical storage, OS caches or heap; CDP target identity is retained, but OS PID births/exits and sampling gaps across Browser/storage/utility processes are not observed; no whole-Obsidian or exclusive-store CPU claim", forcedGc: false }, results: [] };
  console.log(JSON.stringify({ directory, mode, sourceHashes: summary.sourceHashes }));
  await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
  /** Keep receipts independent so a later failure cannot erase preceding results. */
  async function save(name, result) {
    summary.results.push({ name, status: result.status });
    await writeFile(join(directory, `${name}.json`), JSON.stringify(result, null, 2));
    await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ name, status: result.status, inventory: result.inventory && { elapsedMs: result.inventory.elapsedMs, rendererProcessCpuSeconds: result.inventory.rendererProcessCpuSeconds }, error: result.error }));
  }
  const controls = mode === "characterize" ? [{ owners: 8 }, { owners: 16 }, { owners: 2, dense: true }, { owners: 2, control: "legacy" }, { owners: 2, control: "shared" }, { owners: 1, damage: "sha" }, { owners: 1, damage: "posting" }] : [{ owners: 16 }];
  for (const config of controls) for (const kind of ["A", "F"]) {
    const name = `detail-${config.owners}-${config.damage ?? config.control ?? (config.dense ? "dense" : "tiny")}-${kind}`;
    await save(name, await arm(bundles[kind], name, config, true));
  }
  if (mode !== "characterize") for (const owners of mode === "full" ? [64, 128, 256] : mode === "representative" ? [128] : [8]) {
    for (let pair = 1; pair <= (owners === 128 ? 3 : 1); pair++) for (const kind of pair % 2 ? ["A", "F"] : ["F", "A"]) {
      const name = `timing-${owners}-${pair}-${kind}`;
      await save(name, await arm(bundles[kind], name, { owners, pair }, false));
    }
  }
  summary.finishedAt = new Date().toISOString();
  summary.status = summary.results.every(/** A failed or incomplete arm prevents a clean cohort result. */result => result.status === "passed") ? "passed" : "failed";
  await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
  if (summary.status !== "passed") process.exitCode = 1;
}
await main();
