/** Classic filtered-area packing policy; shared region controls own input/scroll and canonical filtering. */
import type {KplexSettings} from "../../../settings";
import type {PositionedNode} from "../../../types";
import type {ClassicSceneRead} from "./layout";
import {layoutColumns, spacingPolicy, expandedNodeWidth, expandedChildReserve, siblingScale} from "./layout";
import {occurrenceKey, type SceneViewport as ZoneViewport, type SceneAreaLayout} from "../scene";
/** Repack zone-local matches with the current axis/column policy and full expanded-child footprint. */
export function classicAreaLayout(
  zone: string,
  panel: ZoneViewport,
  nodes: PositionedNode[],
  filter: string,
  settings: KplexSettings,
  index: ClassicSceneRead,
  centerPath: string,
  matchesZoneFilter: (node: PositionedNode, filter: string) => boolean,
): SceneAreaLayout {
  const filtering = filter.trim().length > 0;
  const filtered = filtering ? nodes.filter((node) => matchesZoneFilter(node, filter)) : nodes;
  const localPositions = new Map<string, {x: number; y: number}>();

  if (!filtering) {
    for (const node of filtered) {
      localPositions.set(occurrenceKey(node), { x: node.x - panel.left, y: node.y - panel.contentTop });
    }
    return { nodes: filtered, localPositions, contentHeight: panel.contentHeight, count: filtered.length, filtering };
  }

  // Filtering is a list operation, not a visibility mask. Re-pack matching thoughts so removed
  // items leave no holes in the scroll content. The filter tools occupy the first ~36 px.
  const topPadding = 42;
  const bottomPadding = 16;
  if (zone === "parent" || zone === "child") {
    const columns = layoutColumns(settings, zone);
    const { horizontal, vertical, spacing } = spacingPolicy(settings);
    const columnGap = 26 * horizontal / 0.675 * spacing;
    const rowGap = 20 * vertical / 0.675 * spacing;
    let y = topPadding;

    for (let start = 0; start < filtered.length; start += columns) {
      const row = filtered.slice(start, start + columns);
      const rowHeight = row.length ? Math.max(...row.map((node) => node.height)) : 0;
      const widths = row.map((node) => node.occurrenceId ? node.width : expandedNodeWidth(node, index, settings, centerPath));
      const rowWidth = widths.reduce((sum, width) => sum + width, 0) + columnGap * Math.max(0, row.length - 1);
      let x = Math.max(8, (panel.width - rowWidth) / 2);
      row.forEach(/** Center each pill within its full descendant footprint. */ (node, column) => {
        localPositions.set(occurrenceKey(node), { x: x + widths[column] / 2, y: y + rowHeight / 2 });
        x += widths[column] + columnGap;
      });
      const rowReserve = Math.max(0, ...row.map((node) => node.occurrenceId ? 0 : expandedChildReserve(node.page, index, settings, centerPath)));
      y += rowHeight + rowReserve + rowGap;
    }
    const contentHeight = Math.max(panel.height, Math.max(topPadding + bottomPadding, y - (filtered.length ? rowGap : 0) + bottomPadding));
    return { nodes: filtered, localPositions, contentHeight, count: filtered.length, filtering };
  }

  const { vertical, spacing } = spacingPolicy(settings);
  const gap = 20 * vertical / 0.675 * spacing;
  const occupiedHeight = filtered.reduce((sum, node, nodeIndex) => (
    sum
    + node.height
    + (node.occurrenceId ? 0 : expandedChildReserve(node.page, index, settings, centerPath, node.role === "sibling" ? siblingScale(settings) : 1))
    + (nodeIndex > 0 ? gap : 0)
  ), 0);
  const availableHeight = Math.max(0, panel.height - topPadding - bottomPadding);
  let y = topPadding;
  if ((zone === "left" || zone === "right") && occupiedHeight < availableHeight) {
    // panel.top is in world coordinates. The active node lives at world y = 0, so -panel.top
    // is its panel-local midline. Keep filtered sparse lateral lists centered on that same line.
    const midlineY = -panel.top;
    const maxTop = Math.max(topPadding, panel.height - bottomPadding - occupiedHeight);
    y = Math.max(topPadding, Math.min(maxTop, midlineY - occupiedHeight / 2));
  }
  for (const node of filtered) {
    localPositions.set(occurrenceKey(node), { x: node.x - panel.left, y: y + node.height / 2 });
    y += node.height + (node.occurrenceId ? 0 : expandedChildReserve(node.page, index, settings, centerPath, node.role === "sibling" ? siblingScale(settings) : 1)) + gap;
  }
  const contentHeight = Math.max(panel.height, Math.max(topPadding + bottomPadding, y - (filtered.length ? gap : 0) + bottomPadding));
  return { nodes: filtered, localPositions, contentHeight, count: filtered.length, filtering };
}
