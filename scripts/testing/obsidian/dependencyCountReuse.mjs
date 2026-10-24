/**
 * Diagnostic-only ordinary acquisition characterization in the guarded disposable Small vault.
 * Uses real Vault edits and production storage; extra proof reads and native request wrappers make
 * this an operation/eligibility receipt, never an acceptance CPU measurement. Owns and removes
 * one synthetic folder, restores wrappers/throttling, and leaves settings and other vaults alone.
 * The opt-in PR207 study also observes creation, changed memberships, deletion and a later edit;
 * its separately named receipts must not be pooled with the historical unchanged-reuse study.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { obsidianCliExecutable, spawnNativeSync } from "./processTools.mjs";
import { validateTarget } from "./runner.mjs";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, "kplex-test-small", "This bounded fixture is Small-only");
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const output = process.env.KPLEX_HOST_REPORT_DIR;
const repairStudy = process.env.KPLEX_DEPENDENCY_REPAIR_STUDY === "1";
const reportName = repairStudy ? "dependency-repair-native.json" : "dependency-reuse-native.json";
assert(output && (!existsSync(output) || readdirSync(output).length === 0), "Use a fresh private report directory");
mkdirSync(output, { recursive: true });

/** Execute one named-vault request without shell quoting, visible helper windows or unbounded waits. */
function cli(command, ...args) {
  const result = spawnNativeSync(obsidianCliExecutable(), [`vault=${vaultName}`, command, ...args],
    { cwd: root, encoding: "utf8", timeout: 30_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout ?? "")) throw result.error ?? Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Decode only the finite JSON receipt, not CLI exit status as an assertion result. */
function evaluate(code) { return JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, "")); }
assert.equal(cli("vault", "info=path"), target.vault);
const artifacts = Object.fromEntries(["main.js", "manifest.json", "styles.css"].map(/** Check installed bytes before permitting any synthetic Vault write. */name => {
  const built = readFileSync(join(root, "dist", name));
  assert(built.equals(readFileSync(join(target.pluginDir, name))), `Installed ${name} differs from dist`);
  return [name, createHash("sha256").update(built).digest("hex")];
}));

/** Own a diagnostic controller whose finally retires every wrapper and every created fixture. */
async function characterize(failAfterEdit, repairStudy) {
  const c = window.__kplexDependencyReuse, p = app.plugins.plugins["k-plex"], i = p?.index, s = i?.sourceAcquisition;
  const r = s?.repository, remote = require("@electron/remote"), native = remote.getCurrentWindow();
  /** Fail assertions without converting incomplete cleanup into a pass. */
  const check = (value, message) => { if (!value) throw Error(message); };
  /** Poll existing readiness owners; this diagnostic does not change production scheduling. */
  const until = async (predicate, message) => {
    const end = Date.now() + 120_000;
    while (!predicate()) { check(!c.cancelled && Date.now() < end, message); await new Promise(/** Yield normal host tasks between readiness checks. */done => window.setTimeout(done, 100)); }
  };
  /** Await source and graph completion, including normal durable count/reclaim owners. */
  const settle = async () => {
    await until(/** Observe existing completion owners without forcing work during characterization. */() => s.hasSemanticDependencies() && !s.inventory && !s.pendingKnownFiles.size && !s.pendingResolutionKeys.size
      && !s.knownImpactTasks && !i.building && !i.rebuildQueued && !p.rebuildTask, "Fixture source/graph completion timed out");
    check(await r.flush(), "Fixture durability failed");
  };
  check(p && r && !app.setting.isOpen, "Loaded K-Plex and clean native prerequisites required");
  c.folder = `Kplex-Dependency-${repairStudy ? "Repair" : "Reuse"}-${Date.now()}`;
  c.paths = Array.from({ length: 8 }, /** Bound every synthetic note to the newly owned folder. */(_, n) => `${c.folder}/Note-${n}.md`);
  c.restores = []; c.created = []; c.originalMethods = []; c.phase = "preparation";
  const beforeInventory = app.vault.getFiles().map(/** Retain only the private pre-probe inventory needed for cleanup verification. */file => file.path).sort();
  const throttle = native.webContents.getBackgroundThrottling();
  const operations = {}, eligibility = { attempts: 0, matching: 0, records: 0, matchingRecords: 0, reasons: {} };
  let phase = "other", result, error, release, observing = repairStudy;
  /** Count native calls by existing production phase, keeping all diagnostic reads separate. */
  const count = (kind, store) => { if (!observing) return; const key = `${phase}|${kind}|${store}`; operations[key] = (operations[key] ?? 0) + 1; };
  /** Replace only a test-observed method and restore its exact original identity. */
  const wrap = (object, name, replacement) => {
    const original = object[name]; check(typeof original === "function", `Missing diagnostic seam ${name}`);
    c.originalMethods.push({ object, name, original });
    object[name] = replacement(original); c.restores.push(/** Restore exact method identity after any native outcome. */() => { object[name] = original; });
  };
  try {
    native.webContents.setBackgroundThrottling(false);
    await settle();
    check(!app.vault.getFolderByPath(c.folder), "Owned fixture folder already exists");
    await app.vault.createFolder(c.folder); c.created.push(c.folder);
    for (const name of ["get", "put", "delete", "count", "getAll", "openCursor"])
      wrap(IDBObjectStore.prototype, name, /** Preserve native receiver/arguments while observing request volume. */original => /** Attribute each store request before forwarding it unchanged. */function(...args) { count(name, this.name); return original.apply(this, args); });
    wrap(IDBCursor.prototype, "continue", /** Keep cursor traversal visible instead of counting only initial requests. */original => /** Forward the exact native cursor while counting each logical advancement. */function(...args) { count("cursor.continue", this.source.objectStore?.name ?? this.source.name); return original.apply(this, args); });
    for (const name of ["count", "getKey"])
      wrap(IDBIndex.prototype, name, /** Preserve indexed lookup/count behavior. */original => /** Attribute each index request to its owning store. */function(...args) { count(`index.${name}`, this.objectStore.name); return original.apply(this, args); });
    for (const [name, label] of [["stageLocalDependencies", "staging"], ["authenticateLocalCountReuse", "authentication"],
      ["repairLocalDependencies", "selected-repair"], ["cleanupStagedLocalDependencies", "private-reclaim"]]) {
      if (typeof r[name] !== "function") continue;
      wrap(r, name, /** Observe the existing awaited production owner rather than adding scheduling. */original => /** Restore enclosing attribution even after a production rejection. */async function(...args) { const old = phase; phase = label; try { return await original.apply(this, args); } finally { phase = old; } });
    }
    wrap(r, "activate", /** Preserve ordinary versus alias activation arguments and results. */original => /** Count fixture projection matches; isolate extra proof reads as diagnostic-only work. */async function(...args) {
      const head = args[1], local = args[5];
      if (observing && c.paths.includes(head.sourceId) && !args[6] && local) {
        const oldPhase = phase; phase = "diagnostic-only";
        try {
          const selected = await this.localDependencySelection(args[0], head.sourceId, args[3], true);
          eligibility.attempts++; eligibility.records += local.records;
          const matching = selected.owner?.records === local.records && selected.owner?.digest === local.digest;
          if (matching) { eligibility.matching++; eligibility.matchingRecords += local.records; }
          else { const reason = selected.owner?.records === local.records ? "same-count-different-digest" : "different-record-count"; eligibility.reasons[reason] = (eligibility.reasons[reason] ?? 0) + 1; }
        } finally { phase = oldPhase; }
      }
      return original.apply(this, args);
    });
    c.phase = "creation";
    for (let n = 0; n < c.paths.length; n++) {
      const links = repairStudy ? Array.from({ length: 24 }, /** Combine ordinary shared note targets with owner-specific URL targets. */(_, k) => `[[${c.paths[(n + 1 + k) % c.paths.length]}]]\n[Link ${k}](https://example.com/reuse/${n}/${k})`).join("\n") : "";
      const text = `---\ntags: [dependency-reuse/shared/nested]\naliases: [Reuse note ${n}]\n---\n[[${c.paths[(n + 1) % c.paths.length]}]]\n[Original label](https://example.com/reuse)\n${links}\nOriginal prose.\n`;
      await app.vault.create(c.paths[n], text); c.created.push(c.paths[n]);
    }
    release = i.acquireSemanticDemand(c.paths[0]);
    await settle();
    for (const path of c.paths) check((await r.inspect(path)).head?.state === "complete", "Selected fixture source missing");
    const creation = { eligibility: structuredClone(eligibility), operations: structuredClone(operations) };
    observing = true;
    c.phase = "prose-and-label-edits";
    for (const path of c.paths) {
      const file = app.vault.getFileByPath(path), old = (await r.inspect(path)).head;
      await app.vault.modify(file, (await app.vault.read(file)).replace("Original prose.", "Fresh prose.").replace("Original label", "Fresh label"));
      await until(/** Join the real edit wave before checking its new selected revision. */() => !s.pendingKnownFiles.size && !s.knownImpactTasks, "Edit acquisition did not drain"); await settle();
      check((await r.inspect(path)).head?.sourceRevision !== old.sourceRevision, "Genuine edit did not advance source revision");
    }
    const unchanged = structuredClone(eligibility);
    const unchangedOperations = structuredClone(operations);
    if (failAfterEdit) throw Error("Deliberate cleanup validation after real edit");
    c.phase = "changed-membership-edit";
    const file = app.vault.getFileByPath(c.paths[0]);
    const beforeChanged = { attempts: eligibility.attempts, matching: eligibility.matching, head: (await r.inspect(file.path)).head };
    const changedText = (await app.vault.read(file)).replace("https://example.com/reuse", "https://example.com/changed");
    await app.vault.modify(file, repairStudy ? changedText.replace("dependency-reuse/shared/nested", "dependency-repair/changed/leaf").replace(c.paths[1], c.paths[2]) : changedText);
    await settle();
    const changedFallback = { attempts: eligibility.attempts - beforeChanged.attempts, matching: eligibility.matching - beforeChanged.matching };
    check(changedFallback.attempts > changedFallback.matching, "Changed edit itself did not exercise ordinary fallback");
    check((await r.inspect(file.path)).head?.sourceRevision !== beforeChanged.head?.sourceRevision, "Changed membership edit did not advance the selected source revision");
    const changed = { eligibility: structuredClone(eligibility), operations: structuredClone(operations), changedFallback };
    let deletion;
    if (repairStudy) {
      c.phase = "deletion";
      for (const path of c.paths.slice(-2)) { const deleting = app.vault.getFileByPath(path); check(deleting, "Owned deletion fixture missing"); await app.vault.delete(deleting); }
      await settle();
      for (const path of c.paths.slice(-2)) check(!(await r.inspect(path)).head, "Deleted fixture remains a live selected source");
      deletion = { operations: structuredClone(operations) };
      c.phase = "subsequent-edit";
      const before = (await r.inspect(file.path)).head;
      await app.vault.modify(file, (await app.vault.read(file)).replace("https://example.com/changed", "https://example.com/later-edit"));
      await settle();
      check((await r.inspect(file.path)).head?.sourceRevision !== before.sourceRevision, "Subsequent edit did not advance source revision");
      check(await r.completeLocalDependencyInventory() === "ready", "Ordinary repair inventory did not close");
    }
    result = { status: "passed", study: repairStudy ? "dependency-repair-207" : "dependency-reuse-204", operationSnapshotSemantics: "Cumulative native calls; subtract adjacent snapshots for interval deltas. Diagnostic host activity can enter an interval.", creation, unchanged, unchangedOperations, changed, deletion, all: eligibility, operations, counters: s.getCounters?.() ?? null,
      hidden: document.hidden, focused: document.hasFocus(), runtime: { pid: process.pid, nativeId: native.id } };
  } catch (caught) { error = caught; }
  finally {
    c.phase = "cleanup";
    const failures = [];
    /** Attempt each independent owner even if another restoration or fixture delete fails. */
    const restoreOwned = async (label, action) => { try { await action(); } catch (caught) { failures.push(`${label}: ${String(caught)}`); } };
    for (const restore of c.restores.reverse()) await restoreOwned("wrapper", restore);
    await restoreOwned("demand", /** Release only the semantic demand acquired for this fixture. */() => release?.());
    await restoreOwned("throttling", /** Restore the captured native policy even if fixture cleanup fails. */() => native.webContents.setBackgroundThrottling(throttle));
    for (const path of c.created.reverse()) await restoreOwned("fixture", /** Delete only successfully created entries, children before their owned folder. */async () => {
      const entry = app.vault.getFileByPath(path) ?? app.vault.getFolderByPath(path);
      if (entry) await app.vault.delete(entry, true);
    });
    try {
      c.cancelled = false; await settle();
      const inventoryRestored = JSON.stringify(beforeInventory) === JSON.stringify(app.vault.getFiles().map(/** Compare the actual final file inventory with its private starting receipt. */file => file.path).sort());
      check(inventoryRestored, "Owned fixture cleanup changed the previous file inventory");
      const wrappersRestored = c.originalMethods.every(/** Verify actual method identity rather than assuming restoration succeeded. */binding => binding.object[binding.name] === binding.original);
      check(wrappersRestored, "Original method identities were not restored");
      c.cleanup = { inventoryRestored, wrappersRestored, throttleRestored: native.webContents.getBackgroundThrottling() === throttle,
        fixturesAbsent: !app.vault.getFolderByPath(c.folder) };
      check(Object.values(c.cleanup).every(/** Every independent cleanup owner must be verified before success. */value => value === true),
        "Owned fixture cleanup is incomplete");
    } catch (cleanupError) { failures.push(String(cleanupError.stack ?? cleanupError)); }
    if (failures.length) { c.cleanupError = failures.join("\n"); if (!error) error = Error(c.cleanupError); }
  }
  if (error) throw error;
  return result;
}

const report = { status: "incomplete", artifacts, startedAt: new Date().toISOString(), diagnosticOnly: true, vaultName, node: process.version };
const controllerToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let state;
/** Read only bounded controller progress/cleanup; the controller retains native restoration ownership. */
function controllerState() {
  return evaluate(`(/** Export only this invocation's bounded progress; never adopt another controller. */()=>{const c=window.__kplexDependencyReuse;if(c&&c.token!==${JSON.stringify(controllerToken)})return {done:false,foreign:true};return c?.done?{done:true,result:c.result,error:c.error,cleanup:c.cleanup,cleanupError:c.cleanupError}:{done:false,phase:c?.phase,missing:!c}})()`);
}
/**
 * Request cancellation after a transport failure/deadline, then join the controller's independent
 * finally owners. Retry transient transport errors without discarding the only recovery bindings;
 * an unavailable receipt remains a failure rather than assumed cleanup.
 */
async function cancelAndJoin(previous) {
  const cleanupDeadline = Date.now() + 150_000;
  let latest = previous, cancellationRequested = false;
  report.cleanupTransportErrors ??= [];
  while (!latest?.done && Date.now() < cleanupDeadline) {
    try {
      if (!cancellationRequested) {
        const receipt = evaluate(`(/** Cancel only the matching owned controller, leaving native finally cleanup in charge. */()=>{const c=window.__kplexDependencyReuse;if(!c)return {cancelled:false,missing:true};if(c.token!==${JSON.stringify(controllerToken)})return {cancelled:false,foreign:true};c.cancelled=true;return {cancelled:true}})()`);
        if (receipt.foreign || receipt.missing) return { done: false, foreign: receipt.foreign, missing: receipt.missing };
        cancellationRequested = receipt.cancelled === true;
      }
      latest = controllerState();
    } catch (error) {
      if (report.cleanupTransportErrors.length < 8) report.cleanupTransportErrors.push(String(error.stack ?? error));
    }
    if (!latest?.done) await new Promise(/** Avoid busy polling while the native finally owners settle. */done => setTimeout(done, 2000));
  }
  return latest;
}
try {
  evaluate(`(/** Start one owned native controller and retain its final cleanup/failure receipt. */()=>{if(window.__kplexDependencyReuse)throw Error('Previous controller remains');const c=window.__kplexDependencyReuse={done:false,token:${JSON.stringify(controllerToken)}};(${characterize.toString()})(${process.env.KPLEX_REUSE_FAIL_AFTER_EDIT === "1"},${repairStudy}).then(/** Publish completion only after characterize has run every cleanup owner. */result=>{c.result=result;c.done=true},/** Retain the rejection alongside independent cleanup evidence. */error=>{c.error=String(error.stack??error);c.done=true});return {started:true}})()`);
  report.hostVersion = cli("version");
  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline) {
    await new Promise(/** Poll bounded controller progress without changing native scheduling. */done => setTimeout(done, 2000));
    // Deliberately fail only this outer poll after launch; cancellation/cleanup transport stays real.
    if (process.env.KPLEX_REUSE_FAIL_POLL === "1") throw Error("Deliberate outer polling failure after controller launch");
    state = controllerState();
    if (state.done) break;
  }
  assert(state?.done, "Diagnostic deadline exceeded; controller requires cleanup before another native run");
  report.native = state; report.status = state.error ? "failed" : "passed";
  if (state.error) process.exitCode = 1;
} catch (error) {
  report.error = String(error.stack ?? error); process.exitCode = 1;
  state = await cancelAndJoin(state);
  report.native = state ?? null;
} finally {
  const cleaned = state?.done && state.cleanup?.inventoryRestored && state.cleanup?.wrappersRestored
    && state.cleanup?.throttleRestored && state.cleanup?.fixturesAbsent && !state.cleanupError;
  // Retain the finite owned controller/bindings if cleanup cannot be verified, so another native
  // run cannot silently overwrite the only references needed for targeted recovery.
  report.controllerRetained = true;
  if (cleaned) {
    try {
      const removed = evaluate(`(/** Remove only this completed, independently verified controller and confirm absence. */()=>{const c=window.__kplexDependencyReuse;if(c?.token!==${JSON.stringify(controllerToken)}||!c.done||c.cleanupError||!c.cleanup?.inventoryRestored||!c.cleanup?.wrappersRestored||!c.cleanup?.throttleRestored||!c.cleanup?.fixturesAbsent)throw Error('Controller cleanup is not verified');delete window.__kplexDependencyReuse;return {removed:!window.__kplexDependencyReuse}})()`);
      assert.equal(removed.removed, true, "Owned controller removal was not confirmed");
      report.controllerRetained = false;
    } catch (error) { report.controllerRemovalError = String(error.stack ?? error); }
  }
  if (!cleaned || report.controllerRetained || report.error) {
    report.status = "failed"; process.exitCode = 1;
  }
  report.completedAt = new Date().toISOString();
  writeFileSync(join(output, reportName), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ status: report.status, report: join(output, reportName), error: state?.error, cleanup: state?.cleanup }));
