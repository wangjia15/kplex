/**
 * Exact-source contracts for PR207's finite test-only causal variants. Baseline is read from its
 * accepted local Git object and frozen candidate from its local Git object; no branch, artifact or runtime is
 * changed. These tests prove transform scope/provenance, not compilation or IndexedDB correctness.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDependencyRepairVariants, DEPENDENCY_REPAIR_VARIANT_IDENTITIES as identities } from "./support/dependencyRepairVariants.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Read the exact frozen protocol object without depending on a later corrected working tree. */
function frozenSource(commit, label) {
  const result = spawnSync("git", ["show", `${commit}:${identities.runtimeFile}`],
    { cwd: root, encoding: "utf8", timeout: 15000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Pinned PR207 ${label} source unavailable: ${result.stderr}`);
  return result.stdout;
}
const baselineSource = frozenSource(identities.baselineCommit, "baseline"), candidateSource = frozenSource(identities.candidateCommit, "candidate");

/** Compare exact UTF-8 bytes, independently of the factory's recorded identity. */
function sha256(source) { return createHash("sha256").update(source, "utf8").digest("hex"); }

/** Split only exact count/delete sections, retaining everything outside as an independent scope check. */
function sections(source) {
  const start = source.indexOf("            const counts = new Map<string, number>();\n");
  const occurrenceStart = source.indexOf("            await new Promise<void>(\n              /** Test-only C:");
  const counts = start >= 0 ? start : occurrenceStart;
  const range = source.indexOf("            if (old.rows.length) {\n", counts);
  const individual = source.indexOf("            // Test-only B:", counts);
  const deletion = range >= 0 ? range : individual;
  const end = source.indexOf("            const decremented = old.rows.length > 0, incremented = next.rows.length > 0;\n", deletion);
  assert.ok(counts >= 0 && deletion > counts && end > deletion);
  return { before: source.slice(0, counts), counts: source.slice(counts, deletion), deletion: source.slice(deletion, end), after: source.slice(end) };
}

/** Exact baseline/candidate sources and independent descriptor hashes are mandatory protocol inputs. */
test("causal variants retain exact A/D source identities and one-file immutable overrides", () => {
  const variants = createDependencyRepairVariants({ baselineSource, candidateSource });
  assert.deepEqual(Object.keys(variants), ["A", "B", "C", "D"]);
  assert.equal(variants.A.source, baselineSource); assert.equal(variants.D.source, candidateSource);
  assert.equal(variants.A.sha256, identities.baselineSha256); assert.equal(variants.D.sha256, identities.candidateSha256);
  assert.equal(Object.isFrozen(variants), true);
  for (const [id, variant] of Object.entries(variants)) {
    assert.equal(variant.id, id); assert.equal(variant.sha256, sha256(variant.source));
    assert.deepEqual(Object.keys(variant.sourceOverrides), [identities.runtimeFile]);
    assert.equal(variant.sourceOverrides[identities.runtimeFile], variant.source);
    assert.equal(Object.isFrozen(variant), true); assert.equal(Object.isFrozen(variant.sourceOverrides), true);
  }
  assert.equal(new Set(Object.values(variants).map(/** All four alternatives have independent exact source identities. */variant => variant.sha256)).size, 4);
});

/** B changes only reclamation; C changes only ledger maintenance, with common bounded prefix and journal suffix. */
test("causal transforms leave D prefix, journal, fences and all other owners byte-identical", () => {
  const variants = createDependencyRepairVariants({ baselineSource, candidateSource });
  const B = sections(variants.B.source), C = sections(variants.C.source), D = sections(variants.D.source);
  for (const part of [B, C]) { assert.equal(part.before, D.before); assert.equal(part.after, D.after); }
  assert.equal(B.counts, D.counts); assert.equal(C.deletion, D.deletion);
  assert.notEqual(B.deletion, D.deletion); assert.notEqual(C.counts, D.counts);
  assert.match(B.deletion, /for \(const row of old\.rows\) rows\.delete\(\[sourceId, row\.sourceRevision, row\.index\]\)/);
  assert.doesNotMatch(B.deletion, /IDBKeyRange/);
  assert.match(C.counts, /const phases = \[old\.rows, next\.rows\]/);
  assert.match(C.counts, /const request = keys\.get\(key\)/);
  assert.match(C.counts, /!sourceCount\(count\) \|\| delta < 0 && previous === 0/);
  assert.match(C.counts, /validSourceLocalDependencyKeyState\(value\) \|\| value\.key !== key/);
  assert.doesNotMatch(C.counts, /rows\.delete|new Map|Promise\.all/);
  assert.match(C.deletion, /rows\.delete\(IDBKeyRange\.bound/);
});

/** Any unrelated source drift, newline change or reversed inputs must fail before diagnostic bundle creation. */
test("causal factory rejects source identity drift instead of loosely patching another candidate", () => {
  assert.throws(/** A tooling-era comment is still a different production source identity. */() => createDependencyRepairVariants({ baselineSource, candidateSource: candidateSource + "\n// drift\n" }), /candidate source identity differs/);
  assert.throws(/** The original baseline must remain exact even though only B/C are transformed. */() => createDependencyRepairVariants({ baselineSource: baselineSource + "\n", candidateSource }), /baseline source identity differs/);
  assert.throws(/** Newline normalization must never silently change the source measured under a receipt. */() => createDependencyRepairVariants({ baselineSource, candidateSource: candidateSource.replaceAll("\n", "\r\n") }), /candidate source identity differs/);
  assert.throws(/** Labels cannot swap sources while retaining historical interpretation. */() => createDependencyRepairVariants({ baselineSource: candidateSource, candidateSource: baselineSource }), /baseline source identity differs/);
});

/** The exact baseline is a historical control, while B/C/D share the new membership-read scaffold. */
test("causal descriptors retain the common-prefix qualification and isolated mechanisms", () => {
  const variants = createDependencyRepairVariants({ baselineSource, candidateSource });
  assert.equal(variants.A.readScaffold, "baseline"); assert.match(variants.A.qualification, /differs from B\/C\/D/);
  for (const id of ["B", "C", "D"]) assert.equal(variants[id].readScaffold, "bounded-authenticated-prefix");
  assert.deepEqual([variants.B.countMaintenance, variants.B.oldRowReclamation], ["page-distinct", "individual"]);
  assert.deepEqual([variants.C.countMaintenance, variants.C.oldRowReclamation], ["per-occurrence", "authenticated-range"]);
  assert.match(variants.C.qualification, /not A's/);
});
