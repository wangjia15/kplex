/** Declarative adjacent-category workflow guides for linear Facets layouts. They are pure
 * decorations with stable unordered pair identities; no note/evidence/drop endpoint is created. */
import type {FacetPreset, FacetFlowStyle, FacetCanvasState, FacetLayout} from "./contracts";
import type {PlexDecoration, PlexDecorationText, PlexDecorationTextSize} from "../contracts";
import type {FacetRegionFrame} from "./layoutStrategies";
import {facetLayout, facetLayoutOrder} from "./presentation";
import {configurationRecord as record} from "../configurationValues";

/** Pair identities survive order reversal; direction is interpreted against the actual sequence. */
export function facetFlowId(a: string, b: string): string {return JSON.stringify(["facets-flow", ...(a < b ? [a, b] : [b, a])]);}

/** Forward means the preset's logical sequence even when geometry displays it right-to-left
 * or bottom-to-top. Reversal never silently changes which category generates the next stage. */
export function facetFlowOrder(preset: FacetPreset): readonly string[] {return facetLayoutOrder({...preset, reverse: false});}

/** One style grammar serves the preset, overrides and portable validator; text is inert data. */
export function validFacetFlow(value: unknown): value is FacetFlowStyle {
  return record(value) && Object.keys(value).every(/** The shared style grammar grants no executable/HTML members. */ key => ["direction", "style", "caption", "captionPosition", "source", "target"].includes(key))
    && (value.direction === undefined || value.direction === "forward" || value.direction === "backward" || value.direction === "both")
    && (value.style === undefined || value.style === "arrow" || value.style === "line" || value.style === "none")
    && (value.captionPosition === undefined || value.captionPosition === "start" || value.captionPosition === "middle" || value.captionPosition === "end")
    && (value.caption === undefined || typeof value.caption === "string" && value.caption.length <= 80);
}

/** Overrides merge only the named fields; blank captions intentionally suppress an inherited one. */
export function facetFlowStyle(preset: FacetPreset, a: string, b: string): FacetFlowStyle {
  const key = facetFlowId(a, b), override = preset.flowOverrides?.find(/** Pair matching never depends on translated category labels. */ value => facetFlowId(value.source, value.target) === key);
  return {direction: "forward", style: "arrow", captionPosition: "middle", ...preset.flow, ...override};
}

/** Supply only currently usable captions to the existing shared text measurement owner. */
export function facetFlowLabels(preset: FacetPreset, presetId: string, state?: FacetCanvasState | null): readonly PlexDecorationText[] {
  const layout = facetLayout(preset, presetId, state).effective;if (!preset.guides || layout !== "horizontal" && layout !== "vertical") return [];
  const order = facetFlowOrder(preset);
  return order.slice(1).flatMap(/** Every adjacent pair contributes at most one bounded nonempty label. */ (id, index) => {
    const caption = facetFlowStyle(preset, order[index], id).caption;
    return caption ? [{id: facetFlowId(order[index], id), label: {literal: caption}}] : [];
  });
}

/** Route outside the complete category footprint and away from the fixed attention/editor.
 * Caption start/middle/end follows the outer rail. Distinct rails prevent label collisions;
 * all finite points/captions participate in the shared dock and manual-fit bounds. */
export function layoutFacetFlows(preset: FacetPreset, order: readonly string[], frames: readonly FacetRegionFrame[], layout: FacetLayout,
  measurements: ReadonlyMap<string, PlexDecorationTextSize> = new Map()): readonly PlexDecoration[] {
  if (!preset.guides || layout !== "horizontal" && layout !== "vertical") return [];
  const horizontal = layout === "horizontal", below = horizontal && (preset.focusAnchor ?? "top") === "top", left = !horizontal && preset.focusAnchor === "right";
  const boundary = horizontal ? below ? Math.max(...frames.map(/** A top-anchored focus leaves safe guide rails below every category. */ frame => frame.bounds.y + frame.bounds.height))
    : Math.min(...frames.map(/** Other horizontal anchors leave the upper category edge clear. */ frame => frame.bounds.y))
    : left ? Math.min(...frames.map(/** A right-anchored focus leaves safe guide rails to the left. */ frame => frame.bounds.x))
      : Math.max(...frames.map(/** Other vertical anchors leave the right category edge clear. */ frame => frame.bounds.x + frame.bounds.width));
  const maximumWidth = Math.max(0, ...[...measurements.values()].map(/** Captions retain measured world-space widths, independent of zoom. */ value => value.width));
  const maximumHeight = Math.max(0, ...[...measurements.values()].map(/** Staggered rails avoid long-caption intersections. */ value => value.height));
  const sequence = facetFlowOrder(preset);
  return sequence.slice(1).map(/** Guides have category identities only, never canonical note endpoints. */ (target, index): PlexDecoration => {
    const source = sequence[index], id = facetFlowId(source, target), style = facetFlowStyle(preset, source, target), a = frames[order.indexOf(source)].bounds, b = frames[order.indexOf(target)].bounds;
    const caption = style.caption ? measurements.get(id) : undefined;if (style.caption && !caption) throw new Error("Missing measured guide caption");
    const rail = boundary + (horizontal ? below ? 1 : -1 : left ? -1 : 1) * (preset.spacing + (horizontal ? maximumHeight + index * (maximumHeight + 18) : index * (maximumWidth + 18)));
    const start = horizontal ? {x: a.x + a.width / 2, y: below ? a.y + a.height + 8 : a.y - 8} : {x: left ? a.x - 8 : a.x + a.width + 8, y: a.y + a.height / 2};
    const end = horizontal ? {x: b.x + b.width / 2, y: below ? b.y + b.height + 8 : b.y - 8} : {x: left ? b.x - 8 : b.x + b.width + 8, y: b.y + b.height / 2};
    const fraction = style.captionPosition === "start" ? .2 : style.captionPosition === "end" ? .8 : .5;
    const captionBounds = caption && {x: horizontal ? start.x + (end.x - start.x) * fraction - caption.width / 2 : left ? rail - caption.width - 8 : rail + 8,
      y: horizontal ? below ? rail + 8 : rail - caption.height - 8 : start.y + (end.y - start.y) * fraction - caption.height / 2, width: caption.width, height: caption.height};
    return {id, kind: "guide", points: [start, horizontal ? {x: start.x, y: rail} : {x: rail, y: start.y},
      horizontal ? {x: end.x, y: rail} : {x: rail, y: end.y}, end], stroke: style.style === "none" ? "none" : "line",
      ...(style.style === "arrow" ? {direction: style.direction} : {}),
      ...(caption && captionBounds && style.caption ? {caption: {label: {literal: style.caption}, bounds: captionBounds, fontSize: caption.fontSize}} : {})};
  });
}
