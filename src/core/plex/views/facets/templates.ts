/** Two editable built-ins share the existing classifier/layout/settings owner. Optional workflow
 * presets are portable JSON under presets/facets, rather than automatically inherited entries. */
import type {FacetPreset, FacetCategory} from "./contracts";
const colors = ["--color-blue", "--color-green", "--color-red", "--color-orange", "--color-purple", "--color-cyan", "--color-yellow"];

/** Templates are ordinary validated values, not separate view definitions or workflow engines. */
function template(nameKey: string, field: string, entries: readonly Readonly<{id: string; value?: string; labelKey?: string; color?: string}>[], guides = false): FacetPreset {
  return {version: 1, name: "", ...(nameKey ? {nameKey} : {}), source: "property", field,
    categories: Object.fromEntries(entries.map((entry, index): [string, FacetCategory] => [entry.id,
      {label: "", labelKey: entry.labelKey ?? `facets.${entry.id}`, color: entry.color && !entry.color.startsWith("--") ? entry.color : {kind: "theme", variable: entry.color ?? colors[index]},
        values: entry.value ? [entry.value, `${entry.value}\uFE0F`, entry.id] : [entry.id], assignment: entry.value ?? entry.id}])),
    order: entries.map(entry => entry.id), start: entries[0].id,
    spacing: 56, regionWidth: 320, regionHeight: 280, guides, tints: true,
    conflictingColor: {kind: "theme", variable: "--color-orange"}, unassignedColor: {kind: "theme", variable: "--background-secondary"}};
}

export const FACET_TEMPLATE_ORDER = ["wuxing", "map-roles"] as const;
export const FACET_TEMPLATES: Readonly<Record<string, FacetPreset>> = {
  wuxing: {...template("facets.presetWuXing", "status", [
    {id: "wood", value: "🟢", color: "--color-green"}, {id: "fire", value: "🔴", color: "--color-red"},
    {id: "earth", value: "🟤", color: "#a16207"}, {id: "metal", value: "🟡", color: "--color-yellow"},
    {id: "water", value: "🔵", color: "--color-blue"},
  ].map(entry => ({...entry, labelKey: `wuxing.${entry.id}`})), true), interpretation: "wuxing", relativeLabels: true, regulatingGuides: true},
  "map-roles": {...template("facets.presetMapRoles", "map-role", [{id: "hub", labelKey: "facets.mapHub"}, {id: "supporting-map", labelKey: "facets.supportingMap"},
    {id: "concept", labelKey: "facets.mapConcept"}, {id: "reference", labelKey: "facets.mapReference"}]), layout: "concentric"},
};

/** A neutral new-preset draft and custom example, never an inherited built-in entry. */
export const FACET_STATE_EXAMPLE: FacetPreset = {...template("", "state", [{id: "seed"}, {id: "research"}, {id: "draft"}, {id: "published"}]),
  name: "State", categories: Object.fromEntries(["Seed", "Research", "Draft", "Published"].map((label, index) => {
    const id = label.toLowerCase();
    return [id, {label, values: [id], assignment: id, color: {kind: "theme", variable: colors[index]}}];
  }))};
