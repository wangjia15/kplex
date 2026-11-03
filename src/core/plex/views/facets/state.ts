/** Per-canvas preset intent. Definitions/colors live in shared configuration; unknown/future
 * requested IDs and state stay intact rather than being rewritten during safe fallback rendering. */
import type {PlexViewConfiguration} from "../configuration";
import type {PlexViewStateAction, PlexViewStateResult} from "../contracts";
import {configurationRecord as record} from "../configurationValues";
import {facetLibrary} from "./configuration";
import {FACET_TEMPLATES} from "./templates";
import {facetId, isFacetPreset, isFacetReplacement} from "./validation";
import type {FacetPresetLibrary, FacetPresetSelection, FacetPreset, FacetCanvasState} from "./contracts";
import {isFacetLayout} from "./presentation";
import type {FacetLayout} from "./contracts";

/** Existing null state means the original Wu Xing preset. Unsupported versions remain opaque. */
export function restoreFacetState(value: unknown): unknown {return value ?? {version: 1, preset: "wuxing"};}
/** A malformed/current or future payload is displayable through fallback but has no implicit
 * mutation authority. Explicit session recovery remains owned by the existing host. */
export function facetState(value: unknown): FacetCanvasState | null {
  if (value === null || value === undefined) return {version: 1, preset: "wuxing"};
  if (!record(value) || value.version !== 1 || !facetId(value.preset)) return null;
  const combined = value.combinedDiagnostics;
  const overrides: Record<string, boolean> = {};
  const layouts: Record<string, FacetLayout> = {};
  if (value.layouts !== undefined) {
    if (!record(value.layouts) || Object.keys(value.layouts).length > 16) return null;
    for (const [id, layout] of Object.entries(value.layouts)) {
      if (!facetId(id) || !isFacetLayout(layout)) return null;
      layouts[id] = layout;
    }
  }
  if (combined !== undefined) {
    if (!record(combined) || Object.keys(combined).length > 16) return null;
    for (const [id, choice] of Object.entries(combined)) {
      if (!facetId(id) || typeof choice !== "boolean") return null;
      overrides[id] = choice;
    }
  }
  return {version: 1, preset: value.preset, ...(combined !== undefined ? {combinedDiagnostics: overrides} : {}), ...(value.layouts !== undefined ? {layouts} : {})};
}
/** Resolve one finite explicit replacement chain. Missing/future/cyclic entries never execute. */
export function resolveFacetPreset(library: FacetPresetLibrary, requestedId = "wuxing"): FacetPresetSelection {
  // Unreleased ACE had no shipped compatibility contract. Preserve every explicit saved ACE
  // entry; only absent inherited ACE intent follows its replacement ARC template.
  let id = requestedId === "ace" && library.presets.ace === undefined && isFacetPreset(library.presets.arc) ? "arc" : requestedId;
  const seen = new Set<string>();
  for (let count = 0; count < 16 && !seen.has(id); count++) {
    seen.add(id);const value = library.presets[id];
    if (isFacetPreset(value)) return {requestedId, id, preset: value, status: id === requestedId ? "ready" : "replaced"};
    if (!isFacetReplacement(value)) break;
    id = value.replacement;
  }
  const entries = orderedFacetPresets(library), fallback = entries.find(entry => entry.id === "wuxing") ?? entries[0];
  const unresolved = library.presets[id];
  return {requestedId, id: fallback?.id ?? "wuxing", preset: fallback?.preset ?? FACET_TEMPLATES.wuxing,
    status: record(unresolved) && typeof unresolved.version === "number" && unresolved.version > 1 ? "future" : "missing"};
}
/** Known editable entries only; unknown ordering IDs remain saved but are not executable choices. */
export function orderedFacetPresets(library: FacetPresetLibrary): readonly Readonly<{id: string; preset: FacetPreset}>[] {
  const ids = [...new Set([...library.order, ...Object.keys(library.presets)])];
  return ids.flatMap(id => {const preset = library.presets[id];return isFacetPreset(preset) ? [{id, preset}] : [];});
}
/** The menu and panel dispatch this same pure action through the existing guarded session. */
export function reduceFacetState(state: unknown, action: PlexViewStateAction, configuration: PlexViewConfiguration): PlexViewStateResult {
  const library = facetLibrary(configuration), current = facetState(state);
  if (!current || !library) return {status: "unavailable"};
  if (action.id === "preset.select" && facetId(action.args) && isFacetPreset(library.presets[action.args]))
    return {status: "updated", state: {...(record(state) ? state : {}), version: 1, preset: action.args}};
  const selected = resolveFacetPreset(library, current.preset);
  if (action.id === "diagnostics.combine" && typeof action.args === "boolean" && (selected.status === "ready" || selected.status === "replaced")) {
    const combined = {...current.combinedDiagnostics, [selected.id]: action.args};
    if (Object.keys(combined).length > 16) return {status: "unavailable"};
    return {status: "updated", state: {...(record(state) ? state : {}), version: 1, preset: current.preset, combinedDiagnostics: combined}};
  }
  return {status: "unavailable"};
}
/** Deletion needs an explicit current replacement even for closed canvases. One atomic entry
 * update preserves sibling presets and makes old restored intent resolve deterministically. */
export function replaceFacetPreset(library: FacetPresetLibrary, id: string, replacement: string): Readonly<{version: 1; replacement: string}> {
  if (id === replacement || !facetId(id) || !facetId(replacement) || !isFacetPreset(library.presets[id]) || !isFacetPreset(library.presets[replacement]))
    throw new Error("A current replacement preset is required");
  return {version: 1, replacement};
}
