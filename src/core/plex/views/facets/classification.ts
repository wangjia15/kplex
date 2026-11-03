/** Property/type/tag membership of already admitted local notes. The existing cached-property
 * owner supplies availability. This does not parse content, infer relationships or acquire data. */
import type {GraphNodeView} from "../../../graph/model";
import type {PlexViewRead} from "../contracts";
import type {FacetMembership, FacetPreset} from "./contracts";

/** Preserve trimmed exact case-sensitive primitive matching; unsupported structures never
 * become a partial successful result or an accidental match through string coercion. */
function scalar(value: unknown): string | null {
  return typeof value === "string" ? value.trim()
    : typeof value === "number" && Number.isFinite(value) || typeof value === "boolean" ? String(value) : null;
}
/** Match all declared categories, deduplicating aliases in one category. Source lists retain the
 * previous256-value/4096-character limits; multiple distinct categories remain conflicting. */
export function compileFacetValues(preset: FacetPreset): (raw: unknown) => FacetMembership {
  const aliases = new Map<string, Set<string>>();
  for (const id of preset.order) for (const value of preset.categories[id].values) {
    const normalized = value.trim(), categories = aliases.get(normalized) ?? new Set<string>();
    categories.add(id);aliases.set(normalized, categories);
  }
  return raw => {
  if (raw === undefined || raw === null) return {status: "unassigned"};
  const values: readonly unknown[] = Array.isArray(raw) ? raw : [raw];
  if (values.length > 256) return {status: "unresolved", reason: "unsupported"};
  const matches = new Set<string>();
  for (const value of values) {
    const normalized = scalar(value);
    if (normalized === null || normalized.length > 4096) return {status: "unresolved", reason: "unsupported"};
    for (const id of aliases.get(normalized) ?? []) matches.add(id);
  }
  return matches.size > 1 ? {status: "conflicting", categories: preset.order.filter(id => matches.has(id))}
    : matches.size === 1 ? {status: "assigned", category: [...matches][0]} : {status: "unassigned"};
  };
}
/** Convenience entry for isolated values; production projection compiles its preset once. */
export function classifyFacetValues(raw: unknown, preset: FacetPreset): FacetMembership {return compileFacetValues(preset)(raw);}
/** Checking is reserved for current active local preparation. A persistent cache absence or
 * unsupported input is explicit Cannot classify, never an indefinite spinner/definite absence. */
function unavailable(read: PlexViewRead, node: GraphNodeView, unsupported = false): FacetMembership {
  return unsupported ? {status: "unresolved", reason: "unsupported"}
    : read.scope?.(node.id).pending ? {status: "checking"} : {status: "unresolved", reason: "metadata"};
}
/** Exactly one selected source; there is no property→type→tag fallback chain. Advanced rules
 * compose the shared predicate owner separately and cannot use a fabricated center self-edge. */
export function classifyFacetNode(node: GraphNodeView, read: PlexViewRead, preset: FacetPreset,
  match: (raw: unknown) => FacetMembership = compileFacetValues(preset)): FacetMembership {
  if (node.kind !== "document" || node.file?.extension !== "md") return unavailable(read, node, true);
  if (preset.source === "rules") return {status: "unresolved", reason: "rule"};
  if (preset.source === "property") {
    const value = read.properties?.read(node.id, preset.field);
    return value?.status === "available" ? match(value.value) : unavailable(read, node, value?.status === "unsupported");
  }
  const availability = read.properties?.availability(node.id);
  return availability === "available" ? match(preset.source === "type" ? node.noteType : node.tags)
    : unavailable(read, node, availability === "unsupported");
}
