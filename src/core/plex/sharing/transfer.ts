/** Pure, explicit import plans and portable exports. Callers own preview, collision consent and the existing atomic settings queue. */
import type {FacetPreset} from "../views/facets/contracts";
import type {SemanticColorPair} from "../colorPreferences";
import {facetId} from "../views/facets/validation";
import {validatePortablePackage} from "./validation";
import type {PortablePackage, SharedLens} from "./contracts";

export type InstalledSharedLens = SharedLens & Readonly<{enabled: boolean}>;
export type SharingState = Readonly<{presets: Readonly<Record<string, unknown>>; lenses: readonly InstalledSharedLens[]; palette: readonly SemanticColorPair[]}>;
export type ImportChoices = Readonly<{targetId: string; replace: boolean; lensIds: readonly string[]; replacePalette: readonly string[]}>;
export type ImportExpectation = Readonly<{preset: unknown; lensTargets: Readonly<Record<string, unknown>>; paletteTargets: Readonly<Record<string, unknown>>}>;
export type PreparedImport = Readonly<{package: PortablePackage; choices: ImportChoices; expected: ImportExpectation}>;
/** Native preview can explain actual installed-capacity refusal without parsing English error messages. */
export class PortableSharingCapacityError extends Error {
  /** Machine identity only; native consumers own localized recovery copy. */
  constructor() {super("Portable package exceeds installed settings capacity");this.name = "PortableSharingCapacityError";}
}

/** Stable structural comparisons ignore harmless object-key order without altering authored arrays/text. */
export function sharingEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object" || Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.entries(left), b = Object.entries(right);
  return a.length === b.length && a.every(/** Unknown sibling keys remain part of an exact preview token. */ ([key, value]) =>
    Object.prototype.hasOwnProperty.call(right, key) && sharingEqual(value, Reflect.get(right, key)));
}
/** Capture only target owners. Unrelated installed presets/lenses/colors can change while preview is open. */
function expectation(pkg: PortablePackage, choices: ImportChoices, state: SharingState): ImportExpectation {
  const lenses = pkg.kind === "lens" ? [{...pkg.lens, id: choices.targetId}] : (pkg.lenses ?? []).filter(lens => choices.lensIds.includes(lens.id));
  return {preset: pkg.kind === "facets" ? state.presets[choices.targetId] ?? null : null,
    lensTargets: Object.fromEntries(lenses.map(/** Imported lens activation is never part of portable data. */ lens => [lens.id, state.lenses.find(item => item.id === lens.id) ?? null])),
    paletteTargets: Object.fromEntries((pkg.palette ?? []).map(/** Every referenced supplied pair is fenced even when keeping installed colors. */ pair => [pair.id, state.palette.find(item => item.id === pair.id) ?? null]))};
}
/** Preview refuses ambiguous collisions; dependencies are opt-in and colliding dependency lenses must be handled separately. */
export function preparePortableImport(pkg: PortablePackage, choices: ImportChoices, state: SharingState): PreparedImport {
  const validation = validatePortablePackage(pkg);if (validation.status !== "valid" || !facetId(choices.targetId)) throw new Error("Invalid portable import");
  const target = pkg.kind === "facets" ? state.presets[choices.targetId] : state.lenses.find(item => item.id === choices.targetId);
  if (choices.replace !== (target !== undefined)) throw new Error("Choose a new identity or explicitly replace an installed entry");
  const dependencies = pkg.kind === "facets" ? pkg.lenses ?? [] : [];
  if (new Set(choices.lensIds).size !== choices.lensIds.length || choices.lensIds.some(id => !dependencies.some(lens => lens.id === id)
    || state.lenses.some(lens => lens.id === id))) throw new Error("Dependency lens collision; import that lens separately with an explicit target");
  if (choices.replacePalette.some(id => !(pkg.palette ?? []).some(pair => pair.id === id))) throw new Error("Unknown palette choice");
  const supplied = new Set((pkg.palette ?? []).map(pair => pair.id));
  for (const id of validation.paletteReferences) if (!supplied.has(id) && !state.palette.some(pair => pair.id === id)) throw new Error("Missing referenced palette color");
  return {package: validation.value, choices: JSON.parse(JSON.stringify(choices)) as ImportChoices, expected: expectation(pkg, choices, state)};
}
/** Recheck exact preview targets against the latest queue state and return detached edits; no effect occurs here. */
export function applyPortableImport(plan: PreparedImport, state: SharingState): Readonly<{preset?: FacetPreset; lenses: InstalledSharedLens[]; palette: SemanticColorPair[]}> {
  if (!sharingEqual(plan.expected, expectation(plan.package, plan.choices, state))) throw new Error("Portable preview is stale");
  const fresh = preparePortableImport(plan.package, plan.choices, state), pkg = fresh.package;
  const palette = state.palette.map(pair => ({...pair}));
  for (const pair of pkg.palette ?? []) {
    const index = palette.findIndex(item => item.id === pair.id);
    if (index < 0) palette.push({...pair});else if (fresh.choices.replacePalette.includes(pair.id)) palette[index] = {...pair};
  }
  const additions = pkg.kind === "lens" ? [{...pkg.lens, id: fresh.choices.targetId}] : (pkg.lenses ?? []).filter(lens => fresh.choices.lensIds.includes(lens.id));
  const lenses = state.lenses.filter(lens => !additions.some(item => item.id === lens.id)).map(lens => ({...lens}));
  for (const lens of additions) lenses.push({...lens, enabled: false});
  return {palette, lenses, ...(pkg.kind === "facets" ? {preset: pkg.preset} : {})};
}
/** Normalize code-owned labels/help through host-supplied literals, never export translation keys or live activation. */
export function exportFacetPackage(id: string, preset: FacetPreset, text: Readonly<{name: string; labels: Readonly<Record<string, string>>; helpMarkdown: string; locale?: string}>,
  palette: readonly SemanticColorPair[], lenses: readonly InstalledSharedLens[], selectedLensIds: readonly string[], aiContext: string, allowPrivate = false): PortablePackage {
  const {nameKey: _nameKey, categories, ...rest} = preset;
  const value = {format: "kplex-preset", version: 1, kind: "facets", id, aiContext, preset: {...rest, name: text.name,
    categories: Object.fromEntries(Object.entries(categories).map(/** Export the effective label while keeping stable category identity. */ ([key, category]) => {
      const {labelKey: _labelKey, ...data} = category;return [key, {...data, label: text.labels[key] ?? data.label}];
    })), helpMarkdown: text.helpMarkdown, ...(text.locale ? {helpSourceLocale: text.locale} : {})},
    ...(selectedLensIds.length ? {lenses: lenses.filter(lens => selectedLensIds.includes(lens.id)).map(sharedLens)} : {})};
  if (new Set(selectedLensIds).size !== selectedLensIds.length || selectedLensIds.some(key => !lenses.some(lens => lens.id === key))) throw new Error("Unknown selected lens dependency");
  return exportPackage(value, palette, allowPrivate);
}
/** Export excludes enabled state and never exports other installed lenses implicitly. */
function sharedLens(lens: InstalledSharedLens): SharedLens {return {id: lens.id, name: lens.name, scope: lens.scope, mode: lens.mode, expression: lens.expression, ...(lens.style ? {style: lens.style} : {})};}
/** A standalone lens uses exactly the same version, palette and privacy admission as Facets. */
export function exportLensPackage(lens: InstalledSharedLens, palette: readonly SemanticColorPair[], aiContext: string, allowPrivate = false): PortablePackage {
  return exportPackage({format: "kplex-preset", version: 1, kind: "lens", id: lens.id, lens: sharedLens(lens), aiContext}, palette, allowPrivate);
}
/** Attach only referenced palette pairs; refuse privacy findings unless the export dialog explicitly acknowledges them. */
function exportPackage(value: unknown, palette: readonly SemanticColorPair[], allowPrivate: boolean): PortablePackage {
  const initial = validatePortablePackage(value);if (initial.status !== "valid") throw new Error("Invalid portable export");
  if (initial.privacy.length && !allowPrivate) throw new Error("Private selectors or paths require explicit export approval");
  const referenced = palette.filter(pair => initial.paletteReferences.includes(pair.id));
  if (initial.paletteReferences.some(id => !referenced.some(pair => pair.id === id))) throw new Error("Missing referenced palette color");
  const result = validatePortablePackage({...initial.value, ...(referenced.length ? {palette: referenced} : {})});
  if (result.status !== "valid") throw new Error("Invalid portable export");return result.value;
}
