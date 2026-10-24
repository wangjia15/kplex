/**
 * Test-only redundant-proof control for the bounded PR207 causal comparison. F retains frozen
 * D's cursor traversal and adds the exact scalar coverage proof used by contingency E before
 * returning a prefix, including a discarded byte-boundary lookahead. It never changes production,
 * starts a workload or proposes redundant proof as a product optimization. D/F isolate the extra
 * proof strategy; E/F share it while comparing point reads with cursor traversal. Callers own
 * compilation, correctness, operation accounting, browser lifetimes and private receipts.
 */
import { createHash } from "node:crypto";
import { DEPENDENCY_REPAIR_VARIANT_IDENTITIES } from "./dependencyRepairVariants.mjs";
import { createDependencyRepairPointReadVariant } from "./dependencyRepairPointReads.mjs";

/** Identify this contingency independently of the frozen primary four-variant protocol. */
export const DEPENDENCY_REPAIR_CURSOR_PROOF_PROTOCOL = "dependency-repair-207-cursor-proof-v1";

const helperStart = "  /**\n   * Read a contiguous selected-repair prefix without bulk-fetching unchecked record payloads.\n";
const helperEnd = "  /**\n   * Apply one selected-owner count journal in record/byte-bounded transactions.";
const verifyStart = "        /** Authenticate all observed primary coordinates before permitting D's range deletion. */\n";
const verifyEnd = "        /** Read and validate one ordinal before exposing another native row result. */\n";
const cursorRequest = "        const request = store.openCursor(IDBKeyRange.bound([sourceId, revision, first], [sourceId, revision, end - 1]));\n";

/** Hash exact UTF-8 source without newline normalization or generated formatting. */
function sha256(source) { return createHash("sha256").update(source, "utf8").digest("hex"); }

/** Return a unique ordered region, rejecting drift before a source override can escape its owner. */
function region(source, start, end) {
  const first = source.indexOf(start), last = source.indexOf(end);
  if (first < 0 || last <= first || first !== source.lastIndexOf(start) || last !== source.lastIndexOf(end))
    throw new Error("PR207 cursor-proof source anchors are absent, repeated or out of order");
  return { first, last, text: source.slice(first, last) };
}

/** Replace one exact method statement without accepting an absent or repeated transform anchor. */
function replaceOnce(source, search, replacement) {
  const index = source.indexOf(search);
  if (index < 0 || index !== source.lastIndexOf(search)) throw new Error("PR207 cursor-proof statement anchor differs");
  return source.slice(0, index) + replacement + source.slice(index + search.length);
}

/**
 * Return F from exact frozen D, with only its membership-prefix helper changed. E's actual verify
 * function is copied byte-for-byte rather than independently restating count/current/error logic.
 * The cursor still validates every source/revision/ordinal and retains D's record/byte limits.
 * Each ordinary or byte-lookahead completion runs one additional same-transaction scalar proof;
 * no count grouping, old-row deletion, journal, error policy or scheduler outside this helper changes.
 * @throws If frozen source identity or any unique bounded source-region anchor differs.
 */
export function createDependencyRepairCursorProofVariant({ candidateSource }) {
  const identity = DEPENDENCY_REPAIR_VARIANT_IDENTITIES;
  if (typeof candidateSource !== "string" || sha256(candidateSource) !== identity.candidateSha256)
    throw new Error("PR207 cursor-proof control requires the exact frozen D source");
  const selected = region(candidateSource, helperStart, helperEnd);
  const point = createDependencyRepairPointReadVariant({ candidateSource });
  const verify = region(point.source, verifyStart, verifyEnd).text;
  let helper = replaceOnce(selected.text, cursorRequest, verify + cursorRequest);
  helper = replaceOnce(helper, "                resolve({ rows: selected, bytes }); return;", "                verify(index); return;");
  helper = replaceOnce(helper, "              if (index + 1 === end || bytes >= byteLimit) resolve({ rows: selected, bytes });",
    "              if (index + 1 === end || bytes >= byteLimit) verify(index);");
  helper = replaceOnce(helper, "   * Read a contiguous selected-repair prefix without bulk-fetching unchecked record payloads.",
    "   * Test-only F: retain D's cursor prefix and add E's exact redundant scalar range proof.");
  const source = candidateSource.slice(0, selected.first) + helper + candidateSource.slice(selected.last);
  if (source.replace(helper, selected.text) !== candidateSource) throw new Error("PR207 cursor-proof control escaped its helper region");
  return Object.freeze({ id: "F", source, sha256: sha256(source),
    sourceOverrides: Object.freeze({ [identity.runtimeFile]: source }),
    protocol: DEPENDENCY_REPAIR_CURSOR_PROOF_PROTOCOL, countMaintenance: "page-distinct",
    oldRowReclamation: "authenticated-range", readScaffold: "bounded-cursor-prefix-with-scalar-proof",
    qualification: "Frozen D cursor traversal plus E's byte-identical scalar coverage proof on every observed phase prefix, including discarded lookahead. This redundant-proof diagnostic is not a production proposal or proof of a backend cause." });
}
