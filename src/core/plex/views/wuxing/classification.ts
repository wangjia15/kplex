/** Wu Xing classifies admitted local notes through one explicit dimension. This is presentation membership, never relationship classification or a source parser. */
import type {GraphNodeView} from "../../../graph/model";
import type {PlexViewRead} from "../contracts";
import {WUXING_PHASES, type WuXingConfiguration, type WuXingPhase} from "./configuration";

export type WuXingMembership = WuXingPhase | "unmapped" | "conflicting" | "unavailable";

/** Normalize only primitive field values; do not interpret objects, links, formulas, nested lists or guessed synonyms. */
function scalar(value: unknown): string | null {
  return typeof value === "string" ? value.trim()
    : typeof value === "number" && Number.isFinite(value) || typeof value === "boolean" ? String(value) : null;
}

/** Repeated aliases of one phase deduplicate. Distinct matched phases conflict; excessive source values remain unavailable rather than certifying a partial match. */
export function classifyWuXingValues(raw: unknown, configuration: WuXingConfiguration): WuXingMembership {
  const values = Array.isArray(raw) ? raw : [raw];
  if (values.length > 256) return "unavailable";
  const matched = new Set<WuXingPhase>();
  for (const value of values) {
    const normalized = scalar(value);
    if (normalized === null) continue;
    if (normalized.length > 4096) return "unavailable";
    for (const phase of WUXING_PHASES) if (configuration.values[phase].includes(normalized)) matched.add(phase);
  }
  if (matched.size > 1) return "conflicting";
  for (const phase of matched) return phase;
  return "unmapped";
}

/** No fallback chain: property reads only its selected field; type/tags use existing facets after metadata availability is established. */
export function classifyWuXingNode(node: GraphNodeView, read: PlexViewRead, configuration: WuXingConfiguration): WuXingMembership {
  if (node.kind !== "document" || node.file?.extension !== "md") return "unmapped";
  if (configuration.source === "property") {
    const result = read.properties?.read(node.id, configuration.field);
    if (result?.status === "available") return classifyWuXingValues(result.value, configuration);
    return result?.status === "unsupported" ? "unmapped" : "unavailable";
  }
  const availability = read.properties?.availability(node.id);
  if (availability !== "available") return availability === "unsupported" ? "unmapped" : "unavailable";
  return classifyWuXingValues(configuration.source === "type" ? node.noteType : node.tags, configuration);
}
