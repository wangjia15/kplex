/** Portable measured grid geometry for view-declared areas. Inputs are admitted rectangles, never source readers or host objects; shared host owners retain clipping, filtering, hit-testing, resizing and persistence. */
import type {ViewRect} from "./contracts";

/** Reserved adornment space participates in packing without changing a native node/editor's size. */
export type MeasuredAreaInsets = Readonly<{top?: number; right?: number; bottom?: number; left?: number}>;
export type MeasuredAreaItem = Readonly<{id: string; width: number; height: number; insets?: MeasuredAreaInsets}>;
export type MeasuredAreaGrid = Readonly<{positions: ReadonlyMap<string, ViewRect>; width: number; height: number}>;
type MeasuredCell = Readonly<{item: MeasuredAreaItem; top: number; right: number; bottom: number; left: number; width: number; height: number}>;

/** Validate one admitted list before geometry work. Limits are the existing shared scene/grid limits. */
function measuredCells(items: readonly MeasuredAreaItem[]): readonly MeasuredCell[] {
  if (items.length > 2048) throw new Error("Invalid measured area size");
  const ids = new Set<string>(), cells: MeasuredCell[] = [];
  for (const item of items) {
    if (typeof item.id !== "string" || !item.id || ids.has(item.id) || !Number.isFinite(item.width) || item.width <= 0
      || !Number.isFinite(item.height) || item.height <= 0) throw new Error("Invalid measured area item");
    const top = item.insets?.top ?? 0, right = item.insets?.right ?? 0, bottom = item.insets?.bottom ?? 0, left = item.insets?.left ?? 0;
    for (const reserve of [top, right, bottom, left]) if (!Number.isFinite(reserve) || reserve < 0 || reserve > 100_000)
      throw new Error("Invalid measured area inset");
    ids.add(item.id);cells.push({item, top, right, bottom, left, width: item.width + left + right, height: item.height + top + bottom});
  }
  return cells;
}

/** Column envelopes share exactly the same measurement policy for automatic choice and final packing. */
function columnWidths(cells: readonly MeasuredCell[], count: number): readonly number[] {
  const widths = Array<number>(count).fill(0);
  for (let index = 0; index < cells.length; index++) widths[index % count] = Math.max(widths[index % count], cells[index].width);
  return widths;
}

/** Choose the greatest bounded column count whose actual column envelopes fit world-space width.
 * No camera/DOM facts enter this decision. A too-wide single card still returns one column;
 * the caller must retain its measured minimum width rather than clip the card. */
export function measuredAreaColumns(items: readonly MeasuredAreaItem[], width: number, columnGap: number, paddingX = 24, maximum = 32): number {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(columnGap) || columnGap < 0
    || !Number.isFinite(paddingX) || paddingX < 0 || !Number.isInteger(maximum) || maximum < 1 || maximum > 32)
    throw new Error("Invalid automatic area columns");
  const cells = measuredCells(items);
  for (let count = Math.min(maximum, cells.length); count > 1; count--) {
    let required = paddingX * 2 + columnGap * (count - 1);
    for (const column of columnWidths(cells, count)) required += column;
    if (required <= width) return count;
  }
  return 1;
}

/** Pack finite measured cells into aligned columns/rows. Editor dimensions stay unchanged; the caller supplies density-adjusted gaps and places the resulting area in world coordinates. */
export function measuredAreaGrid(items: readonly MeasuredAreaItem[], columns: number,
  columnGap: number, rowGap: number, paddingX = 24, paddingTop = 42, paddingBottom = 16): MeasuredAreaGrid {
  if (!Number.isInteger(columns) || columns < 1 || columns > 32 || items.length > 2048
    || ![columnGap, rowGap, paddingX, paddingTop, paddingBottom].every(value => Number.isFinite(value) && value >= 0)) throw new Error("Invalid area grid policy");
  if (!items.length) return {positions: new Map(), width: 0, height: 0};
  const cells = measuredCells(items), count = Math.min(columns, items.length), widths = columnWidths(cells, count), heights = Array<number>(Math.ceil(items.length / count)).fill(0);
  for (let index = 0; index < cells.length; index++) heights[Math.floor(index / count)] = Math.max(heights[Math.floor(index / count)], cells[index].height);
  const xs: number[] = [], ys: number[] = [];
  let x = paddingX, y = paddingTop;
  for (const width of widths) {xs.push(x + width / 2);x += width + columnGap;}
  for (const height of heights) {ys.push(y + height / 2);y += height + rowGap;}
  const positions = new Map<string, ViewRect>();
  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index];positions.set(cell.item.id, {x: xs[index % count] + (cell.left - cell.right) / 2,
      y: ys[Math.floor(index / count)] + (cell.top - cell.bottom) / 2, width: cell.item.width, height: cell.item.height});
  }
  return {positions, width: x - columnGap + paddingX, height: y - rowGap + paddingBottom};
}
