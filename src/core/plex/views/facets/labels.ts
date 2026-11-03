/** Explicit catalog/literal presentation values. User labels are never reinterpreted as keys. */
import type {CanvasViewText, PlexNodeBadge} from "../contracts";
import type {FacetPreset, FacetCategory, FacetMembership} from "./contracts";

/** The model cycle is independent of an author's visual category order, aliases or labels. */
export const FACET_WUXING_CYCLE = ["wood", "fire", "earth", "metal", "water"] as const;
/** Optional Wu Xing interpretation requires the five explicit stable phase identities. */
export function facetHasWuXingPhases(preset: FacetPreset): boolean {
  return preset.order.length === 5 && FACET_WUXING_CYCLE.every(id => preset.order.includes(id));
}
/** Model-relative copy never changes classification, canonical roles or edit authority. Unknown
 * attention classification supplies no default reference and therefore no relative-role claim. */
export function facetRelativeLabel(preset: FacetPreset, focus: string | undefined, candidate: string): CanvasViewText | undefined {
  if (preset.interpretation !== "wuxing" || !preset.relativeLabels || !facetHasWuXingPhases(preset)) return undefined;
  const cycle: readonly string[] = FACET_WUXING_CYCLE, a = focus === undefined ? -1 : cycle.indexOf(focus), b = cycle.indexOf(candidate);
  if (a < 0 || b < 0) return {key: "facets.relativeUnavailable"};
  return {key: ["facets.relativeSame", "facets.relativeGenerate", "facets.relativeRegulate", "facets.relativeRegulated", "facets.relativeGenerated"][(b - a + 5) % 5]};
}

/** Built-in explanatory names localize; editable literal names retain their exact text. */
export function facetPresetLabel(preset: FacetPreset): CanvasViewText {
  return preset.name.trim() ? {literal: preset.name} : {key: preset.nameKey ?? "facets.preset"};
}
/** Category identity is independent of its visible label and recognition/assignment values. */
export function facetCategoryLabel(category: FacetCategory, id: string): CanvasViewText {
  return category.label.trim() ? {literal: category.label} : category.labelKey ? {key: category.labelKey} : {literal: id};
}
/** Recoverable technical status is not a definite Unassigned classification. */
export function facetMembershipDescription(membership: FacetMembership): CanvasViewText {
  return {key: membership.status === "unresolved" ? `facets.reason.${membership.reason}` : `facets.reason.${membership.status}`};
}
/** Assigned focus categories retain colored chips; uncertain focus/diagnostic values use the
 * shared compact node status, with the same exact classification reason and no write authority. */
export function facetMembershipBadge(membership: FacetMembership, preset: FacetPreset): PlexNodeBadge {
  const label = membership.status === "assigned" ? facetCategoryLabel(preset.categories[membership.category], membership.category)
    : {key: membership.status === "unresolved" ? "facets.cannotClassify" : `facets.${membership.status}`};
  return {label, description: facetMembershipDescription(membership), ...(membership.status === "assigned"
    ? {background: preset.categories[membership.category].color} : {presentation: "status" as const})};
}
