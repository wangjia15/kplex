/** Shared list/grid filtering mechanics over measured occurrences. Geometry policy is supplied by the view's area. */
import type {PlexArea} from "../../core/plex/views/contracts";
import type {PositionedNode} from "../../types";
import {occurrenceKey, type SceneAreaLayout, type SceneViewport} from "./scene";
import {measuredAreaGrid, measuredAreaColumns} from "../../core/plex/views/areaLayout";
import {nodeBadgeInsets} from "../../core/plex/views/decorations";

/** Keep coordinates unless the view explicitly opts into filtered repacking; duplicate canonical notes remain independent rows. */
export function reflowArea(panel: SceneViewport, nodes: PositionedNode[], filter: string,
  matches: (node: PositionedNode, filter: string) => boolean, policy?: PlexArea["reflow"]): SceneAreaLayout {
  const filtering = filter.trim().length > 0;
  let rows = filtering ? nodes.filter(node => matches(node, filter)) : nodes;
  const localPositions = new Map<string, {x: number; y: number}>();
  /** Reuse the view's measured world coordinates for unfiltered or explicitly stable filtered regions. */
  const keepPositions = (): SceneAreaLayout => {
    for (const node of rows) localPositions.set(occurrenceKey(node), {x: node.x - panel.left, y: node.y - panel.contentTop});
    return {nodes: rows, localPositions, contentHeight: panel.contentHeight, count: rows.length, filtering};
  };
  if (!filtering || !policy) return keepPositions();
  if (nodes.length && nodes.every(node => node.branch && node.occurrenceId)) {
    const all = new Map(nodes.map(node => [occurrenceKey(node), node])), retained = new Set(rows.map(occurrenceKey));
    // A matching descendant retains its actual area-local ancestors; no canonical copy can substitute for that path.
    for (const row of rows) {
      let parent = row.branch?.parent;
      const visited = new Set<string>();
      while (parent && all.has(parent) && !visited.has(parent)) {visited.add(parent);retained.add(parent);parent = all.get(parent)!.branch?.parent;}
    }
    rows = nodes.filter(node => retained.has(occurrenceKey(node)));
    if (policy.filterLayout === "keep") return keepPositions();
    const groups = new Map<string, PositionedNode[]>();
    for (const node of rows) {
      let root = node;
      const visited = new Set<string>();
      while (root.branch?.parent && retained.has(root.branch.parent) && !visited.has(root.branch.parent)) {visited.add(root.branch.parent);root = all.get(root.branch.parent)!;}
      const key = occurrenceKey(root), group = groups.get(key) ?? [];group.push(node);groups.set(key, group);
    }
    const bounds = [...groups].map(([id, group]) => {
      const left = Math.min(...group.map(node => node.x - node.width / 2)), top = Math.min(...group.map(node => node.y - node.height / 2));
      return {id, left, top, width: Math.max(...group.map(node => node.x + node.width / 2 + (node.controlReserve?.right ?? 0))) - left,
        height: Math.max(...group.map(node => node.y + node.height / 2 + (node.controlReserve?.bottom ?? 0))) - top};
    });
    const grid = measuredAreaGrid(bounds, policy.columns, policy.columnGap, policy.rowGap, 24, policy.paddingTop ?? 42, policy.paddingBottom ?? 16);
    for (const bound of bounds) {
      const cell = grid.positions.get(bound.id)!;
      for (const node of groups.get(bound.id)!) localPositions.set(occurrenceKey(node), {x: (panel.width - grid.width) / 2 + cell.x - cell.width / 2 + node.x - bound.left,
        y: cell.y - cell.height / 2 + node.y - bound.top});
    }
    return {nodes: rows, localPositions, contentHeight: Math.max(panel.height, grid.height), count: rows.length, filtering};
  }
  if (policy.filterLayout === "keep") return keepPositions();
  if (policy.autoColumns) {
    const cells = rows.map(/** Repacking uses the same shared badge envelope as the original layout. */ node => ({id: occurrenceKey(node), width: node.width, height: node.height, insets: nodeBadgeInsets(node, node.viewBadge)}));
    const columns = measuredAreaColumns(cells, panel.width, policy.columnGap), grid = measuredAreaGrid(cells, columns, policy.columnGap, policy.rowGap, 24, policy.paddingTop ?? 42, policy.paddingBottom ?? 16);
    for (const [id, cell] of grid.positions) localPositions.set(id, {x: (panel.width - grid.width) / 2 + cell.x, y: cell.y});
    return {nodes: rows, localPositions, contentHeight: Math.max(panel.height, grid.height), count: rows.length, filtering};
  }
  const columns = Math.max(1, Math.min(16, Math.round(policy.columns))), gap = Math.max(0, policy.rowGap);
  const top = Math.max(42, policy.paddingTop ?? 42), bottom = Math.max(0, policy.paddingBottom ?? 16);
  let y = top;
  for (let offset = 0; offset < rows.length; offset += columns) {
    const row = rows.slice(offset, offset + columns), height = Math.max(...row.map(node => node.height));
    const width = row.reduce((sum, node) => sum + node.width, 0) + Math.max(0, policy.columnGap) * (row.length - 1);
    let x = Math.max(8, (panel.width - width) / 2);
    for (const node of row) {localPositions.set(occurrenceKey(node), {x: x + node.width / 2, y: y + height / 2});x += node.width + Math.max(0, policy.columnGap);}
    y += height + gap;
  }
  return {nodes: rows, localPositions, contentHeight: Math.max(panel.height, y - (rows.length ? gap : 0) + bottom), count: rows.length, filtering};
}
