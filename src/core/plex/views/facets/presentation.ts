/** Pure effective presentation defaults. Shared preset configuration and explicit canvas choices
 * remain separate; resolving them never writes, reclassifies a note or acquires a source. */
import type {FacetPreset, FacetCanvasState, FacetDiagnostics, FacetDiagnosticStatus, FacetLayout} from "./contracts";

export const FACET_DIAGNOSTIC_ORDER: readonly FacetDiagnosticStatus[] = ["unassigned", "conflicting", "checking", "unresolved"];
export const FACET_LAYOUTS: readonly FacetLayout[] = ["circular", "concentric", "vertical", "horizontal", "quadrants"];
export type ResolvedFacetDiagnostics = Readonly<{combined: boolean; side: NonNullable<FacetDiagnostics["side"]>;
  orientation: NonNullable<FacetDiagnostics["orientation"]>; showEmpty?: boolean; order: readonly FacetDiagnosticStatus[]}>;

/** Diagnostic identity is fixed; labels/colors and dock placement cannot invent another result. */
export function isFacetDiagnosticStatus(value: unknown): value is FacetDiagnosticStatus {
  return FACET_DIAGNOSTIC_ORDER.some(/** Compare exact stable identities, never translated copy. */ status => status === value);
}

/** Stable layout values are shared by schema admission, captured choices and session restore. */
export function isFacetLayout(value: unknown): value is FacetLayout {
  return FACET_LAYOUTS.some(/** Compare only declared identity values. */ layout => layout === value);
}

/** The saved preset owns layout. Legacy canvas overrides remain inert; incompatible quadrants
 * visibly falls back without rewriting the preset or any canvas's other preferences. */
export function facetLayout(preset: FacetPreset, _presetId: string, _state?: FacetCanvasState | null): Readonly<{requested: FacetLayout; effective: FacetLayout; fallback: boolean}> {
  const requested = preset.layout ?? "circular", fallback = requested === "quadrants" && preset.order.length !== 4;
  return {requested, effective: fallback ? "circular" : requested, fallback};
}

/** Starting identity and reversal affect geometry only; matching/phase identities remain stored. */
export function facetLayoutOrder(preset: FacetPreset): readonly string[] {
  const start = preset.order.indexOf(preset.start), order = [...preset.order.slice(start), ...preset.order.slice(0, start)];
  return preset.reverse ? order.reverse() : order;
}

/** Old/current presets inherit combined diagnostics lazily. Explicit canvas choices survive
 * subsequent preset-default edits, including a choice equal to the old default. */
export function facetDiagnostics(preset: FacetPreset, presetId: string, state?: FacetCanvasState | null): ResolvedFacetDiagnostics {
  const values = preset.diagnostics;
  return {combined: state?.combinedDiagnostics?.[presetId] ?? values?.combined ?? true, side: values?.side ?? "right",
    orientation: values?.orientation ?? "vertical", showEmpty: values?.showEmpty, order: values?.order ?? FACET_DIAGNOSTIC_ORDER};
}
