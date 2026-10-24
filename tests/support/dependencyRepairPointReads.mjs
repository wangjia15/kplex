/**
 * Contingency-only PR207 source override for bounded exact-ordinal membership reads. This factory
 * never edits production or starts an experiment. E retains frozen D's grouped ledger, validated
 * range deletion, transaction/journal and scheduling owners. Point reads require an additional
 * scalar primary-key coverage proof: otherwise a fractional neighbor skipped by get() could be
 * deleted without validation. Consequently E is a point-read-plus-proof control, not a pure API
 * substitution or proof about browser prefetch/compaction. Callers own all validation and receipts.
 */
import { createHash } from "node:crypto";
import { DEPENDENCY_REPAIR_VARIANT_IDENTITIES } from "./dependencyRepairVariants.mjs";

/** Identify this optional control independently of the unchanged primary A/B/C/D experiment. */
export const DEPENDENCY_REPAIR_POINT_READ_PROTOCOL = "dependency-repair-207-point-prefix-v1";

const helperStart = "  /**\n   * Read a contiguous selected-repair prefix without bulk-fetching unchecked record payloads.\n";
const helperEnd = "  /**\n   * Apply one selected-owner count journal in record/byte-bounded transactions.";

const pointHelper = `  /**
   * Test-only E: read one exact ordinal at a time under D's shared record/byte allowance, then
   * authenticate scalar primary-key coverage in this same transaction. Point reads alone skip
   * fractional neighbors; checking the entire observed prefix, including a discarded byte-boundary
   * lookahead, prevents the unchanged range deletion from retiring unvalidated coordinates.
   * At most one row result is outstanding. The final count returns only a scalar; every expected
   * ordinal was already fetched and strictly validated, so exact range cardinality proves there
   * is no additional coordinate without retaining untrusted key arrays or row payloads.
   */
  private readLocalDependencyRepairRows(store: IDBObjectStore, sourceId: string, revision: string,
    first: number, records: number, limit: number, byteLimit: number, allowOversized: boolean,
    current: () => boolean): Promise<{ rows: SourceLocalDependencyRow[]; bytes: number }> {
    if (first >= records || limit <= 0) return Promise.resolve({ rows: [], bytes: 0 });
    const end = Math.min(records, first + limit);
    return new Promise(
      /** Keep exact reads and the finite coverage proof inside the original active transaction. */
      (resolve, reject) => {
        const selected: SourceLocalDependencyRow[] = []; let bytes = 0;
        /** Authenticate all observed primary coordinates before permitting D's range deletion. */
        const verify = (last: number): void => {
          try {
            if (!current() || this.closed) throw new SourceFactError("cancelled");
            const expected = last - first + 1;
            const request = store.count(IDBKeyRange.bound([sourceId, revision, first], [sourceId, revision, last]));
            request.onerror = /** Retain genuine native read error identity for transaction recovery. */
              () => reject(request.error ?? new SourceFactError("read-error"));
            request.onsuccess = /** Reject a missing or extra coordinate without retaining unchecked row payloads. */
              () => {
                try {
                  if (!current() || this.closed) throw new SourceFactError("cancelled");
                  const count = request.result;
                  if (!sourceCount(count) || count !== expected) throw new SourceFactError("dependency-invalid");
                  resolve({ rows: selected, bytes });
                } catch (error) { reject(error instanceof Error ? error : new Error("Source dependency repair failed")); }
              };
          } catch (error) { reject(error instanceof Error ? error : new Error("Source dependency repair failed")); }
        };
        /** Read and validate one ordinal before exposing another native row result. */
        const read = (): void => {
          try {
            if (!current() || this.closed) throw new SourceFactError("cancelled");
            const index = first + selected.length, request = store.get([sourceId, revision, index]);
            request.onerror = /** Preserve genuine native read error identity and existing error classification. */
              () => reject(request.error ?? new SourceFactError("read-error"));
            request.onsuccess = /** Validate the requested row and D's exact UTF-8 retention bound. */
              () => {
                try {
                  if (!current() || this.closed) throw new SourceFactError("cancelled");
                  const row: unknown = request.result;
                  if (!validSourceLocalDependencyRow(row) || row.sourceId !== sourceId || row.sourceRevision !== revision || row.index !== index) {
                    throw new SourceFactError("dependency-invalid");
                  }
                  const rowBytes = encodedBytes(JSON.stringify(row)) + 1;
                  if (rowBytes > SOURCE_MAX_RECORD_BYTES) throw new SourceFactError("dependency-invalid");
                  if (bytes + rowBytes > byteLimit && (selected.length > 0 || !allowOversized)) {
                    verify(index); return;
                  }
                  selected.push(row); bytes += rowBytes;
                  if (index + 1 === end || bytes >= byteLimit) verify(index); else read();
                } catch (error) { reject(error instanceof Error ? error : new Error("Source dependency repair failed")); }
              };
          } catch (error) { reject(error instanceof Error ? error : new Error("Source dependency repair failed")); }
        };
        read();
      });
  }

`;

/** Hash exact UTF-8 source bytes without newline normalization or source reformatting. */
function sha256(source) { return createHash("sha256").update(source, "utf8").digest("hex"); }

/**
 * Return E from exact frozen D bytes, replacing only its bounded membership-prefix helper.
 * The extra scalar range-count proof preserves protection against intervening invalid keys.
 * Every byte outside that helper remains D's original grouped-count/range-delete implementation.
 * @throws If source identity or either unique method-region anchor differs from the pinned input.
 */
export function createDependencyRepairPointReadVariant({ candidateSource }) {
  const identity = DEPENDENCY_REPAIR_VARIANT_IDENTITIES;
  if (typeof candidateSource !== "string" || sha256(candidateSource) !== identity.candidateSha256)
    throw new Error("PR207 point-read control requires the exact frozen D source");
  const first = candidateSource.indexOf(helperStart), last = candidateSource.indexOf(helperEnd);
  if (first < 0 || last <= first || first !== candidateSource.lastIndexOf(helperStart) || last !== candidateSource.lastIndexOf(helperEnd))
    throw new Error("PR207 point-read control helper anchors are absent, repeated or out of order");
  const source = candidateSource.slice(0, first) + pointHelper + candidateSource.slice(last);
  if (source.replace(pointHelper, candidateSource.slice(first, last)) !== candidateSource)
    throw new Error("PR207 point-read control escaped its helper region");
  return Object.freeze({ id: "E", source, sha256: sha256(source),
    sourceOverrides: Object.freeze({ [identity.runtimeFile]: source }),
    protocol: DEPENDENCY_REPAIR_POINT_READ_PROTOCOL, countMaintenance: "page-distinct",
    oldRowReclamation: "authenticated-range", readScaffold: "bounded-point-prefix-with-key-coverage",
    qualification: "Frozen D with exact-ordinal point reads plus one scalar range-count proof per observed prefix; necessary extra proof prevents fractional-key deletion, so this is not a pure cursor API substitution. The scalar result bounds retained proof memory, not backend range-enumeration work on corrupt storage." });
}
