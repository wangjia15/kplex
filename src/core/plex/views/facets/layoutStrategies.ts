/** Pure measured Facets category geometry. Strategies arrange existing area/card envelopes;
 * canonical occurrences, classification, native editors and all interactions remain shared. */
import type {ViewRect, PlexAreaShape, ViewPoint} from "../contracts";
import type {FacetLayout, FacetFocusAnchor} from "./contracts";

export type FacetRegionFrame = Readonly<{bounds: ViewRect; content: ViewRect; shape?: PlexAreaShape;
  width: number; height: number}>;
export type FacetRegionFrames = Readonly<{frames: readonly FacetRegionFrame[]; centers: readonly ViewPoint[]; radius: number; diagonal: number}>;

/** The attention/editor envelope includes its asymmetric badge while remaining centered at0. */
function focusEnvelope(focus: ViewRect, badge?: ViewRect): Readonly<{width: number; height: number}> {
  return {width: Math.max(focus.width / 2, badge ? Math.abs(badge.x) : 0, badge ? Math.abs(badge.x + badge.width) : 0) * 2,
    height: Math.max(focus.height / 2, badge ? Math.abs(badge.y) : 0, badge ? Math.abs(badge.y + badge.height) : 0) * 2};
}

/** Linear categories keep their order; independent cardinal anchors move only presentation.
 * Subtracting the chosen anchor keeps the one native attention editor at the stable origin. */
function linearFrames(sizes: readonly Readonly<{width: number; height: number}>[], focus: Readonly<{width: number; height: number}>,
  spacing: number, horizontal: boolean, anchor: FacetFocusAnchor): FacetRegionFrame[] {
  const width = horizontal ? sizes.reduce(/** Sum finite measured category widths and explicit gaps. */ (sum, size) => sum + size.width, 0) + (sizes.length - 1) * spacing
    : Math.max(...sizes.map(/** A vertical stack centers unequal widths without altering their measurements. */ size => size.width));
  const height = horizontal ? Math.max(...sizes.map(/** A horizontal spread centers unequal heights. */ size => size.height))
    : sizes.reduce(/** Sum measured category heights without duplicating the focus. */ (sum, size) => sum + size.height, 0) + (sizes.length - 1) * spacing;
  const origin = {x: anchor === "left" ? -focus.width / 2 - spacing : anchor === "right" ? width + focus.width / 2 + spacing : width / 2,
    y: anchor === "top" ? -focus.height / 2 - spacing : anchor === "bottom" ? height + focus.height / 2 + spacing : height / 2};
  let cursor = 0;
  return sizes.map(/** Every category keeps its own width/height; the block is translated relative to the focus anchor. */ size => {
    const bounds = {x: (horizontal ? cursor : (width - size.width) / 2) - origin.x,
      y: (horizontal ? (height - size.height) / 2 : cursor) - origin.y, ...size};
    cursor += (horizontal ? size.width : size.height) + spacing;return {bounds, content: bounds, ...size};
  });
}

/** Concentric dimensions mean horizontal and vertical band thickness. Notes occupy the band's
 * measured top strip; the remaining band is a genuine empty target, never an overlapping box.
 * Each strip has ordinary bounded shared scrolling/columns. Resizing one band moves outer bands. */
function concentricFrames(sizes: readonly Readonly<{width: number; height: number}>[], focus: Readonly<{width: number; height: number}>, spacing: number): FacetRegionFrame[] {
  let inner: ViewRect = {x: -focus.width / 2 - spacing, y: -focus.height / 2 - spacing, width: focus.width + spacing * 2, height: focus.height + spacing * 2};
  return sizes.map(/** Stable inner-to-outer order is independent of stored category membership. */ size => {
    const bounds = {x: inner.x - size.width, y: inner.y - size.height, width: inner.width + size.width * 2, height: inner.height + size.height * 2};
    const frame: FacetRegionFrame = {bounds, content: {x: bounds.x, y: bounds.y, width: bounds.width, height: size.height},
      shape: {kind: "rounded-band", inner, radius: 14}, ...size};
    inner = {x: bounds.x - spacing, y: bounds.y - spacing, width: bounds.width + spacing * 2, height: bounds.height + spacing * 2};return frame;
  });
}

/** One strategy boundary receives only measured rectangles. Quadrants is admitted only for4;
 * the effective-layout owner supplies an explicit circular fallback for incompatible presets. */
export function facetCategoryFrames(sizes: readonly Readonly<{width: number; height: number}>[], focus: ViewRect, badge: ViewRect | undefined,
  spacing: number, layout: FacetLayout, anchor?: FacetFocusAnchor): FacetRegionFrames {
  const envelope = focusEnvelope(focus, badge), diagonal = Math.max(...sizes.map(/** Circular separation reserves complete individual rectangles. */ size => Math.hypot(size.width, size.height)));
  const centerRadius = Math.max(Math.hypot(focus.width, focus.height) / 2,
    badge ? Math.hypot(Math.max(Math.abs(badge.x), Math.abs(badge.x + badge.width)), Math.max(Math.abs(badge.y), Math.abs(badge.y + badge.height))) : 0);
  const radius = Math.max((diagonal + spacing) / (2 * Math.sin(Math.PI / sizes.length)), centerRadius + diagonal / 2 + spacing);
  let frames: readonly FacetRegionFrame[];
  if (layout === "concentric") frames = concentricFrames(sizes, envelope, spacing);
  else if (layout === "vertical" || layout === "horizontal") frames = linearFrames(sizes, envelope, spacing, layout === "horizontal", anchor ?? (layout === "horizontal" ? "top" : "left"));
  else if (layout === "quadrants") {
    if (sizes.length !== 4) throw new Error("Quadrants requires four categories");
    frames = sizes.map(/** Clockwise quadrants leave the full attention/editor envelope between their inner edges. */ (size, index) => {
      const bounds = {x: index === 0 || index === 3 ? -envelope.width / 2 - spacing - size.width : envelope.width / 2 + spacing,
        y: index < 2 ? -envelope.height / 2 - spacing - size.height : envelope.height / 2 + spacing, ...size};
      return {bounds, content: bounds, ...size};
    });
  } else frames = sizes.map(/** Preserve the established clockwise circular geometry and top starting region. */ (size, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / sizes.length;
    const bounds = {x: Math.cos(angle) * radius - size.width / 2, y: Math.sin(angle) * radius - size.height / 2, ...size};
    return {bounds, content: bounds, ...size};
  });
  return {frames, radius, diagonal, centers: frames.map(/** Guides use the content strip center, never an inner hole. */ frame => ({x: frame.content.x + frame.content.width / 2, y: frame.content.y + frame.content.height / 2}))};
}
