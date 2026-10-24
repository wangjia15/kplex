/**
 * Finite test-only PR207 causal source overrides, never runtime flags or deployed alternatives.
 * Exact accepted baseline/candidate bytes are mandatory. B changes only old-row reclamation in D;
 * C changes only ledger maintenance in D. B/C/D share D's authenticated, record/byte-bounded read
 * prefix, journal transaction and freshness fences. A retains its original baseline read scaffold,
 * so A-to-D is not a pure two-factor comparison. Callers own bundles, tests and private receipts.
 */
import { createHash } from "node:crypto";

/** Pin production inputs independently of the surrounding diagnostic/tooling commit. */
export const DEPENDENCY_REPAIR_VARIANT_IDENTITIES = Object.freeze({
  protocol: "dependency-repair-207-causal-v1",
  runtimeFile: "src/index/SourceRepository.ts",
  baselineCommit: "930747679894f003a2acf3b800df798826ee090c",
  candidateCommit: "d6ef7f07b199e2eb2497f13148374f5edf6802d3",
  baselineSha256: "534a061e64ddfe7a609cc774788567ec8ba6afc4c953ea556e7ff9834fe4c63e",
  candidateSha256: "d8d6d532bb711b3cb2bb5d0e55152392495533b8eb64c069158ca8b0e98809d8",
});

const countStart = "            const counts = new Map<string, number>();\n";
const deleteStart = "            if (old.rows.length) {\n";
const deleteEnd = "            const decremented = old.rows.length > 0, incremented = next.rows.length > 0;\n";

const individualDeletion = `            // Test-only B: retire each already authenticated old occurrence individually.
            // Ledger grouping and the original transaction/journal prefix remain D's implementation.
            for (const row of old.rows) rows.delete([sourceId, row.sourceRevision, row.index]);
`;

const occurrenceCounts = `            await new Promise<void>(
              /** Test-only C: replay each occurrence through one outstanding native ledger request. */
              (resolve, reject) => {
                const phases = [old.rows, next.rows]; let phase = 0, index = 0;
                /** Preserve old-before-new intermediate checks and own-transaction read-your-writes. */
                const read = (): void => {
                  try {
                    if (!current() || this.closed) throw new SourceFactError("cancelled");
                    while (phase < phases.length && index === phases[phase].length) { phase += 1; index = 0; }
                    if (phase === phases.length) { resolve(); return; }
                    const row = phases[phase][index++], key = row.key, delta = phase === 0 ? -1 : 1;
                    const request = keys.get(key);
                    request.onerror = /** Preserve genuine native read errors for the repository transaction owner. */
                      () => reject(request.error ?? new SourceFactError("read-error"));
                    request.onsuccess = /** Authenticate one ledger and commit this occurrence before reading the next. */
                      () => {
                        try {
                          if (!current() || this.closed) throw new SourceFactError("cancelled");
                          const value: unknown = request.result;
                          if (value !== undefined && (!validSourceLocalDependencyKeyState(value) || value.key !== key)) {
                            throw new SourceFactError("dependency-invalid");
                          }
                          const previous = value === undefined ? 0 : value.count, count = previous + delta;
                          if (!sourceCount(count) || delta < 0 && previous === 0) throw new SourceFactError("dependency-invalid");
                          if (count === 0) keys.delete(key); else keys.put({ version: 1, key, count } satisfies SourceLocalDependencyKeyState);
                          read();
                        } catch (error) { reject(error instanceof Error ? error : new Error("Source dependency repair failed")); }
                      };
                  } catch (error) { reject(error instanceof Error ? error : new Error("Source dependency repair failed")); }
                };
                read();
              });
            if (!current() || this.closed) throw new SourceFactError("cancelled");
`;

/** Hash exact UTF-8 text without newline normalization or source parsing. */
function sha256(source) { return createHash("sha256").update(source, "utf8").digest("hex"); }

/** Reject source drift before an anchor can accidentally select a different implementation. */
function authenticate(source, expected, label) {
  if (typeof source !== "string" || sha256(source) !== expected)
    throw new Error(`PR207 ${label} source identity differs from the pinned causal protocol`);
}

/** Select a single exact bounded region; absent, repeated or reversed anchors fail closed. */
function region(source, start, end) {
  const first = source.indexOf(start), last = source.indexOf(end);
  if (first < 0 || last <= first || first !== source.lastIndexOf(start) || last !== source.lastIndexOf(end))
    throw new Error("PR207 causal source anchors are absent, repeated or out of order");
  return { first, last, text: source.slice(first, last) };
}

/** Replace exactly one authenticated region, keeping every surrounding byte unchanged. */
function replaceRegion(source, start, end, replacement) {
  const selected = region(source, start, end);
  return source.slice(0, selected.first) + replacement + source.slice(selected.last);
}

/** Return immutable inputs/qualifications suitable for exact bundle and private diagnostic receipts. */
function describe(id, source, countMaintenance, oldRowReclamation, readScaffold, qualification) {
  return Object.freeze({ id, source, sha256: sha256(source), countMaintenance, oldRowReclamation,
    readScaffold, qualification,
    sourceOverrides: Object.freeze({ [DEPENDENCY_REPAIR_VARIANT_IDENTITIES.runtimeFile]: source }) });
}

/**
 * Construct four explicitly identified diagnostic sources without changing production files.
 * A and D are byte-identical inputs. B retains grouped counts but uses individual exact-key old
 * deletes. C retains D's range delete but reads/writes each occurrence sequentially. C validates
 * one native ledger payload at a time and defers all old-row deletion until every checked count
 * step succeeds. The existing transaction atomically commits counts, reclamation and journal cursor.
 * Surrounding inherited source comments describe D; these descriptor qualifications identify the
 * deliberate test-only differences. Compile, real-IDB and semantic validation remain caller duties.
 * @throws If either whole-source identity or any finite region anchor has changed.
 */
export function createDependencyRepairVariants({ baselineSource, candidateSource }) {
  const identities = DEPENDENCY_REPAIR_VARIANT_IDENTITIES;
  authenticate(baselineSource, identities.baselineSha256, "baseline");
  authenticate(candidateSource, identities.candidateSha256, "candidate");
  const grouped = region(candidateSource, countStart, deleteStart);
  const rangeDeletion = region(candidateSource, deleteStart, deleteEnd);
  const B = replaceRegion(candidateSource, deleteStart, deleteEnd, individualDeletion);
  const C = replaceRegion(candidateSource, countStart, deleteStart, occurrenceCounts);
  // Inversion guards assert that these are two isolated edits, not a generated alternate repository.
  if (B.replace(individualDeletion, rangeDeletion.text) !== candidateSource
    || C.replace(occurrenceCounts, grouped.text) !== candidateSource) throw new Error("PR207 causal transform escaped its selected region");
  return Object.freeze({
    A: describe("A", baselineSource, "per-occurrence", "individual", "baseline",
      "Exact accepted baseline; membership read/promise scaffold differs from B/C/D."),
    B: describe("B", B, "page-distinct", "individual", "bounded-authenticated-prefix",
      "D with only authenticated old-prefix range reclamation replaced by individual exact-key deletes."),
    C: describe("C", C, "per-occurrence", "authenticated-range", "bounded-authenticated-prefix",
      "D with only grouped ledger maintenance replaced by ordered per-occurrence native reads/writes; shares D's prefix scaffold, not A's."),
    D: describe("D", candidateSource, "page-distinct", "authenticated-range", "bounded-authenticated-prefix",
      "Exact frozen candidate; no production source changes or runtime diagnostic flags."),
  });
}
