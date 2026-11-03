/**
 * Obsidian compatibility adapter for lazy property reads and pair-scoped predicate evidence.
 * Preserves persisted predicate values while passing only plain records to the portable engine.
 */
import type { App, CachedMetadata, TFile } from "obsidian";
import type {GraphNodeView} from "../../core/graph/model";
import type {NotePropertyRead} from "../../core/plex/noteProperties";
import { ONTOLOGY_PRECEDENCE_SUPPRESSION, type RelationEvidence, type EvidenceDecision } from "../../index/RelationEvidence";
import type { GraphPage, LinkDirection, RelationType, Role } from "../../types";
import type { GraphPropertyProvider, GraphPredicateContext } from "../../core/plex/predicate";
import type { GraphEvidenceProvider, PortableLensCandidate } from "../../core/plex/lens";
import { graphNodeViewFromLegacy } from "./graphContracts";

/**
 * Preserve the historical English value as a persisted selector contract, never as UI copy.
 * New predicates can use evidence.suppressionCode; resolver DTOs retain stable machine codes.
 */
function persistedSuppressionReason(reason: string | undefined): string | undefined {
  return reason === ONTOLOGY_PRECEDENCE_SUPPRESSION
    ? "Conflicting body ontology is overridden by frontmatter ontology for this note pair."
    : reason;
}

export type LegacyPredicateEdgeContext = {
  role?: Role | "center";
  relationType?: RelationType;
  definition?: string;
  linkDirection?: LinkDirection | null;
  sourcePath?: string;
  targetPath?: string;
};
export type LegacyPredicateContext = {
  node: { page: GraphPage; label?: string };
  edge?: LegacyPredicateEdgeContext;
  evidence?: RelationEvidence & { active?: boolean; suppressionReason?: string };
  center?: GraphPage;
};
export type LegacyLensCandidate = {
  page: GraphPage;
  label: string;
  center?: GraphPage;
  edge?: LegacyPredicateEdgeContext;
};
export type LegacyEvidenceSource = {
  explainRelationship(sourcePath: string, targetPath: string): { decisions: readonly EvidenceDecision[] } | null;
};

/** Select one cached field with the established exact-then-case-insensitive property-name policy. */
function cachedProperty(cache: CachedMetadata | null, key: string): unknown {
  const raw: unknown = cache?.frontmatter;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const frontmatter = raw as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(frontmatter, key)) return frontmatter[key];
  const wanted = key.toLocaleLowerCase();
  const match = Object.keys(frontmatter).find(candidate => candidate.toLocaleLowerCase() === wanted);
  return match ? frontmatter[match] : undefined;
}

/** Cached Markdown fields only. Availability-aware reads additionally fence native identity/stat/cache and the caller's publication/lifetime; no cache or body reader is created. */
export function createLegacyPropertyProvider(app: App, isCurrent: () => boolean = () => true, nativeFile?: (node: GraphNodeView) => TFile | null | undefined): GraphPropertyProvider {
  type Capture = {status: "available"; file: TFile; cache: CachedMetadata; path: string; mtime: number; size: number}
    | {status: "unavailable" | "unsupported"};
  /** Capture only the current native cache. A path reused by a renamed/deleted file cannot certify the old facet. */
  function capture(node: GraphNodeView): Capture {
    if (node.kind !== "document" || !node.file || node.file.extension !== "md") return {status: "unsupported"};
    if (!isCurrent()) return {status: "unavailable"};
    const file = app.vault.getFileByPath(node.file.path);
    if (!file || nativeFile && nativeFile(node) !== file || file.extension !== "md" || file.stat.mtime !== node.file.mtime
      || node.file.size !== undefined && node.file.size !== file.stat.size) return {status: "unavailable"};
    const cache = app.metadataCache.getFileCache(file);
    return cache ? {status: "available", file, cache, path: file.path, mtime: file.stat.mtime, size: file.stat.size} : {status: "unavailable"};
  }
  /** Check again after a selected-field read so synchronous invalidation/getters cannot return stale values. */
  function current(value: Extract<Capture, {status: "available"}>): boolean {
    return isCurrent() && value.file.path === value.path && value.file.stat.mtime === value.mtime && value.file.stat.size === value.size
      && app.vault.getFileByPath(value.path) === value.file && app.metadataCache.getFileCache(value.file) === value.cache;
  }
  return {
    /** Preserve the existing predicate compatibility path, including its absent-value behavior. */
    getNoteProperty(node, key) {
      if (node.kind !== "document" || !node.file || node.file.extension !== "md") return undefined;
      const file = app.vault.getFileByPath(node.file.path);
      if (!file || file.extension !== "md") return undefined;
      return cachedProperty(app.metadataCache.getFileCache(file), key);
    },
    /** An empty but present cache proves a missing property; no cache means unavailable metadata. */
    notePropertyAvailability(node) {
      const value = capture(node);
      return value.status === "available" && !current(value) ? "unavailable" : value.status;
    },
    /** Read one field without retaining/copying frontmatter; arbitrary objects remain unsupported classifier values. */
    readNoteProperty(node, key): NotePropertyRead {
      const value = capture(node);
      if (value.status !== "available") return {status: value.status};
      const field = cachedProperty(value.cache, key);
      return current(value) ? {status: "available", value: field, isCurrent: () => current(value)} : {status: "unavailable"};
    },
  };
}

/** Convert a legacy candidate to plain portable predicate inputs, retaining persisted suppression values and exposing stable codes separately. */
export function predicateContextFromLegacy(context: LegacyPredicateContext): GraphPredicateContext {
  return {
    node: { node: graphNodeViewFromLegacy(context.node.page), label: context.node.label },
    center: context.center ? graphNodeViewFromLegacy(context.center) : undefined,
    edge: context.edge,
    evidence: context.evidence ? {
      ...context.evidence,
      ...(context.evidence.suppressionReason === ONTOLOGY_PRECEDENCE_SUPPRESSION ? { suppressionCode: context.evidence.suppressionReason } : {}),
      suppressionReason: persistedSuppressionReason(context.evidence.suppressionReason),
    } : undefined,
  };
}

export function lensCandidateFromLegacy(candidate: LegacyLensCandidate): PortableLensCandidate {
  return {
    node: graphNodeViewFromLegacy(candidate.page),
    label: candidate.label,
    center: candidate.center ? graphNodeViewFromLegacy(candidate.center) : undefined,
    edge: candidate.edge,
  };
}

/** Pair-scoped mapping runs only when an evidence-scope lens requests it. */
export function createLegacyEvidenceProvider(index: LegacyEvidenceSource): GraphEvidenceProvider {
  return {
    /** Read only the requested note pair and copy its evidence into predicate inputs without mutating semantic decisions. */
    decisions(sourcePath, targetPath) {
      return (index.explainRelationship(sourcePath, targetPath)?.decisions ?? []).map((decision) => ({
        evidence: { ...decision.evidence, ...(decision.suppressionReason === ONTOLOGY_PRECEDENCE_SUPPRESSION ? { suppressionCode: decision.suppressionReason } : {}) },
        active: decision.active,
        suppressionReason: persistedSuppressionReason(decision.suppressionReason),
      }));
    },
  };
}
