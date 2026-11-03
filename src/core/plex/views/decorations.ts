/** Optional measured marks use existing text/color validation and finite geometry. They never
 * acquire graph data or create semantic/drop endpoints. Shared host measurement paints them. */
import {sanitizeColorValue, isThemeColorName, isPaletteColorId, type ColorValue} from "../../contracts/colorValue";
import type {PlexNodeBadge, ViewRect} from "./contracts";
import type {MeasuredAreaInsets} from "./areaLayout";
import {validCanvasViewText} from "./presentation";

/** Bound code-owned reference output and discard no invalid values silently. */
export function boundedViewColors(value: readonly ColorValue[]): readonly ColorValue[] {
  const entries: readonly unknown[] = value;
  if (!Array.isArray(entries) || entries.length > 256) throw new Error("View color references exceed their bound");
  return entries.map((entry: unknown) => {
    const color = sanitizeColorValue(entry);
    if (color === undefined || typeof color !== "string" && (color.kind === "theme" ? !isThemeColorName(color.variable) : !isPaletteColorId(color.id))) throw new Error("Invalid view color reference");
    return typeof color === "string" ? color : color.kind === "theme" ? {kind: "theme", variable: color.variable} : {kind: "palette", id: color.id};
  });
}
/** Badges expose plain accessible copy and supported colors, never native HTML or actions. */
export function validPlexNodeBadge(badge: PlexNodeBadge): boolean {
  if (!badge || !validCanvasViewText(badge.label) || badge.description !== undefined && !validCanvasViewText(badge.description)
    || "literal" in badge.label && badge.label.literal.length > 80
    || badge.presentation !== undefined && badge.presentation !== "category" && badge.presentation !== "status") return false;
  try {if (badge.background !== undefined) boundedViewColors([badge.background]); return true;} catch {return false;}
}
/** Category chips sit above the card; compact status text sits below, offset from the gates.
 * Both measured rectangles participate in fitting and follow native editor dimensions. */
export function nodeBadgeBounds(node: ViewRect, measured: Readonly<{width: number; height: number; presentation?: "category" | "status"}>): ViewRect {
  if (![node.x, node.y, node.width, node.height, measured.width, measured.height].every(Number.isFinite)
    || node.width <= 0 || node.height <= 0 || measured.width <= 0 || measured.height <= 0) throw new Error("Invalid node badge geometry");
  return measured.presentation === "status"
    ? {x: node.x - node.width / 2, y: node.y + node.height / 2 + 4, width: Math.min(measured.width, node.width), height: measured.height}
    : {x: node.x - node.width / 2, y: node.y - node.height / 2 - measured.height - 12, width: measured.width, height: measured.height};
}

/** Reserve the same top/right category or bottom status overhang that the shared node paints.
 * Packing receives geometry only; it never enlarges the native node or editor rectangle. */
export function nodeBadgeInsets(node: Readonly<{width: number; height: number}>, badge?: Readonly<{width: number; height: number; presentation?: "category" | "status"}>): MeasuredAreaInsets | undefined {
  if (!badge) return undefined;
  const bounds = nodeBadgeBounds({x: 0, y: 0, width: node.width, height: node.height}, badge);
  return badge.presentation === "status" ? {bottom: 4 + bounds.height}
    : {top: -node.height / 2 - bounds.y, right: Math.max(0, bounds.x + bounds.width - node.width / 2)};
}
