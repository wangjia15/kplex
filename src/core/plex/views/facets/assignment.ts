/** Facets exposes explicit property targets only. Tag/type/rule sources remain read-only here;
 * their existing specialized owners are not replaced by a scalar YAML assignment. */
import type {PlexViewConfiguration} from "../configuration";
import {writableAssignmentField, type PlexPropertyAssignment} from "../propertyAssignment";
import {facetLibrary} from "./configuration";
import {facetState, resolveFacetPreset} from "./state";
import {facetCategoryLabel} from "./labels";
import {facetAreaId} from "./projection";
import type {FacetPreset} from "./contracts";

/** Unknown/future intent has no mutation authority, even when fallback categories are painted. */
export function facetPropertyAssignments(state: unknown, configuration: PlexViewConfiguration): readonly PlexPropertyAssignment[] {
  const library = facetLibrary(configuration), intent = facetState(state);if (!library || !intent) return [];
  const selected = resolveFacetPreset(library, intent.preset), preset = selected.preset;
  if (selected.status !== "ready" && selected.status !== "replaced" || preset.source !== "property") return [];
  return facetPresetAssignments(selected.id, preset);
}
/** Layout and the accessible action declare the exact same finite assignment identities. */
export function facetPresetAssignments(presetId: string, preset: FacetPreset): readonly PlexPropertyAssignment[] {
  if (preset.source !== "property" || !writableAssignmentField(preset.field)) return [];
  const recognized = [...new Set(preset.order.flatMap(id => preset.categories[id].values))];
  return [...preset.order.flatMap(id => {
    const category = preset.categories[id];
    const other = new Set(preset.order.filter(key => key !== id).flatMap(key => preset.categories[key].values.map(value => value.trim())));
    const matching = category.values.filter(value => !other.has(value.trim()));
    return category.assignment === undefined || !matching.some(value => value.trim() === category.assignment?.trim()) ? []
      : [{id: facetAreaId(presetId, "category", id), label: facetCategoryLabel(category, id), field: preset.field, recognized, matching, value: category.assignment}];
  }), {id: facetAreaId(presetId, "status", "unassigned"), label: {key: "facets.unassigned"}, field: preset.field, recognized, matching: []}];
}
