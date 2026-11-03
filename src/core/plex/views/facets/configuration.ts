/** Facets schema2 upgrades the existing wuxing namespace. The shared writer owns persistence;
 * reads/migrations are bounded, detached and never change note content or workspace intent. */
import type {PlexViewConfiguration, PlexViewConfigurationSchema} from "../configuration";
import {configurationRecord as record} from "../configurationValues";
import {wuXingConfigurationSchema, wuXingConfiguration} from "../wuxing/configuration";
import {FACET_TEMPLATES, FACET_TEMPLATE_ORDER} from "./templates";
import {validFacetLibrary, validFacetOrder} from "./validation";
import type {FacetPreset, FacetPresetLibrary} from "./contracts";

/** Convert exactly the old owned fields, retaining unknown values. Explicit aliases remain
 * trimmed/case-sensitive; no family/generational interpretation or value rewrite is substituted. */
function migrateWuXing(values: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  if (Object.prototype.hasOwnProperty.call(values, "presets") || Object.prototype.hasOwnProperty.call(values, "presetOrder")) throw new Error("Conflicting future Facets fields");
  for (const [key, field] of Object.entries(wuXingConfigurationSchema.fields))
    if (Object.prototype.hasOwnProperty.call(values, key) && !field.validate(values[key])) throw new Error("Invalid legacy Wu Xing preference");
  const legacy = wuXingConfiguration({status: "available", values}), template = FACET_TEMPLATES.wuxing;
  const preset: FacetPreset = {...template, source: legacy.source, field: legacy.field, order: [...legacy.order], start: legacy.start,
    spacing: legacy.spacing, regionWidth: legacy.regionWidth, regionHeight: legacy.regionHeight, guides: legacy.guides, tints: legacy.tints,
    categories: Object.fromEntries(legacy.order.map(id => [id, {...template.categories[id], label: legacy.labels[id], values: [...legacy.values[id]],
      ...(legacy.values[id][0] ? {assignment: legacy.values[id][0]} : {assignment: undefined})}]))};
  // Omit an absent assignment rather than persisting undefined; an empty recognizer remains
  // read-only until its author supplies an explicit canonical value.
  const categories = Object.fromEntries(Object.entries(preset.categories).map(([id, category]) => {
    const {assignment, ...other} = category; return [id, assignment === undefined ? other : {...other, assignment}];
  }));
  const migrated: Record<string, unknown> = {...values};
  for (const key of Object.keys(wuXingConfigurationSchema.fields)) delete migrated[key];
  // Other supplied templates inherit without materializing a second copy in the legacy payload.
  return {...migrated, presets: {wuxing: {...preset, categories}}, presetOrder: [...FACET_TEMPLATE_ORDER]};
}

export const facetsConfigurationSchema: PlexViewConfigurationSchema = {version: 2,
  migrations: [{from: 1, to: 2, migrate: migrateWuXing}], fields: {
    presets: {entries: true, inheritEntries: true, defaultValue: FACET_TEMPLATES, validate: validFacetLibrary},
    presetOrder: {defaultValue: [...FACET_TEMPLATE_ORDER], validate: validFacetOrder},
  }};

/** Partial stored template overrides inherit untouched templates. Explicit replacements/future
 * entries override the same key and remain inert until resolved; no read materializes settings. */
export function facetLibrary(configuration?: PlexViewConfiguration): FacetPresetLibrary | null {
  if (configuration?.status === "unavailable") return null;
  const values = configuration?.values ?? {}, presets = values.presets ?? FACET_TEMPLATES, order = values.presetOrder ?? FACET_TEMPLATE_ORDER;
  return validFacetLibrary(presets) && validFacetOrder(order) && record(presets)
    ? {presets: {...FACET_TEMPLATES, ...presets}, order: [...order]} : null;
}
