import type { ExcaliBrainSettings } from "../settings";
import type { GraphPage, Neighborhood, Neighbour, NodeStyle, PositionedEdge, PositionedNode, Role, ScrollZone } from "../types";
import { resolveLinkStyle, resolveNodeStyle } from "../index/style";
import type { GraphIndex } from "../index/GraphIndex";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export type ZoneViewport = {
  key: ScrollZone;
  left: number;
  top: number;
  width: number;
  height: number;
  contentTop: number;
  contentHeight: number;
  initialScrollTop: number;
};

export type PlexScene = {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  zoneViewports: Partial<Record<ScrollZone, ZoneViewport>>;
};

export function gateDiameter(style: NodeStyle): number {
  // Keep a generous hit target in CSS, but visually the gate should remain subordinate to
  // the thought itself. gateRadius is retained as the legacy-compatible source setting.
  return Math.max(5, (style.gateRadius ?? 5) * 1.05);
}

export function effectiveLabelLimit(settings: ExcaliBrainSettings, configured = 30, center = false): number {
  // Compactness changes only how much text is shown and how tightly thoughts are spaced.
  // Node interior padding remains constant in every view.
  const density = clamp(settings.compactingFactor / 1.5, 0.5, 2);
  const base = Math.max(8, configured);
  const scaled = Math.round(base / density);
  return clamp(scaled + (center ? 8 : 0), center ? 18 : 8, center ? 72 : 52);
}

function nodeSize(label: string, fontSize: number, settings: ExcaliBrainSettings, center = false, configuredMax = 30): { width: number; height: number } {
  const visibleLength = Math.min(label.length, effectiveLabelLimit(settings, configuredMax, center));
  const minWidth = center ? 180 : 112;
  const maxWidth = center ? 370 : 286;
  const width = clamp(70 + visibleLength * Math.max(4.8, fontSize * 0.29), minWidth, maxWidth);

  // These are the tight/compact paddings, now used everywhere.
  return { width, height: center ? 54 : 30 };
}

function makeNode(
  n: Neighbour,
  role: Role,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
): PositionedNode {
  const style = resolveNodeStyle(n.page, n, role, settings);
  const label = index.titleFor(n.page);
  const size = nodeSize(`${style.prefix ?? ""}${label}`, style.fontSize ?? 18, settings, false, style.maxLabelLength ?? 30);
  return {
    page: n.page,
    role,
    relationType: n.relationType,
    typeDefinition: n.typeDefinition,
    linkDirection: n.linkDirection,
    x: 0,
    y: 0,
    ...size,
    style,
    label,
    neighbourCount: index.neighbourCount(n.page),
    gateStats: index.gateStats(n.page),
  };
}

const EXPANDED_CLUSTER_TOP_GAP = 14;
const EXPANDED_MINI_ROW_HEIGHT = 28;
const EXPANDED_MINI_COLUMNS = 3;
const EXPANDED_MINI_VISIBLE_ROWS = 2;

export function expandedChildReserve(page: GraphPage, index: GraphIndex, settings: ExcaliBrainSettings, centerPath: string): number {
  if (settings.graphDepth !== 2) return 0;
  const childCount = index.neighbours(page, "child")
    .filter((child) => child.page.path !== centerPath)
    .slice(0, settings.maxItemCount).length;
  if (!childCount) return 0;
  const visibleRows = Math.min(EXPANDED_MINI_VISIBLE_ROWS, Math.ceil(childCount / EXPANDED_MINI_COLUMNS));
  return EXPANDED_CLUSTER_TOP_GAP + visibleRows * EXPANDED_MINI_ROW_HEIGHT;
}

function distributeGrid(
  items: Neighbour[],
  baseY: number,
  rowDirection: -1 | 1,
  maxColumns: number,
  columnGap: number,
  rowGap: number,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  role: Role,
  centerPath: string,
): PositionedNode[] {
  const nodes = items.map((n) => makeNode(n, role, index, settings));
  if (!nodes.length) return nodes;

  const rows: Array<{ nodes: PositionedNode[]; height: number; reserve: number }> = [];
  for (let start = 0; start < nodes.length; start += maxColumns) {
    const rowNodes = nodes.slice(start, start + maxColumns);
    rows.push({
      nodes: rowNodes,
      height: Math.max(...rowNodes.map((n) => n.height)),
      // Expanded child strips grow downward from their parent thought. A row therefore only
      // reserves extra height when at least one thought in that row actually has children.
      reserve: Math.max(0, ...rowNodes.map((n) => expandedChildReserve(n.page, index, settings, centerPath))),
    });
  }

  let previousY = baseY;
  let previousHeight = rows[0].height;
  let previousReserve = rows[0].reserve;

  rows.forEach((row, rowIndex) => {
    let y: number;
    if (rowIndex === 0) {
      // Parent mini-children grow back toward the center, so move only that first parent row
      // upward when it actually has expanded descendants. Child rows grow away from center.
      y = rowDirection === -1 ? baseY - row.reserve : baseY;
    } else if (rowDirection === 1) {
      y = previousY + previousHeight / 2 + previousReserve + rowGap + row.height / 2;
    } else {
      y = previousY - previousHeight / 2 - rowGap - row.reserve - row.height / 2;
    }

    const rowWidth = row.nodes.reduce((sum, n) => sum + n.width, 0) + columnGap * Math.max(0, row.nodes.length - 1);
    let x = -rowWidth / 2;
    for (const node of row.nodes) {
      node.x = x + node.width / 2;
      node.y = y;
      x += node.width + columnGap;
    }

    previousY = y;
    previousHeight = row.height;
    previousReserve = row.reserve;
  });

  return nodes;
}

function distributeVertical(
  items: Neighbour[],
  x: number,
  gap: number,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  role: Role,
  centerPath: string,
): PositionedNode[] {
  const nodes = items.map((n) => makeNode(n, role, index, settings));
  if (!nodes.length) return nodes;

  const reserves = nodes.map((node) => expandedChildReserve(node.page, index, settings, centerPath));
  nodes[0].x = x;
  nodes[0].y = 0;
  for (let i = 1; i < nodes.length; i += 1) {
    const previous = nodes[i - 1];
    const node = nodes[i];
    node.x = x;
    node.y = previous.y + previous.height / 2 + reserves[i - 1] + gap + node.height / 2;
  }

  // Center the complete occupied strip (including expanded children) around the Plex midline.
  const top = nodes[0].y - nodes[0].height / 2;
  const lastIndex = nodes.length - 1;
  const bottom = nodes[lastIndex].y + nodes[lastIndex].height / 2 + reserves[lastIndex];
  const shift = -(top + bottom) / 2;
  for (const node of nodes) node.y += shift;
  return nodes;
}

function shiftBottomTo(nodes: PositionedNode[], bottomLimit: number, index: GraphIndex, settings: ExcaliBrainSettings, centerPath: string): void {
  if (!nodes.length) return;
  const currentBottom = Math.max(...nodes.map((node) =>
    node.y + node.height / 2 + expandedChildReserve(node.page, index, settings, centerPath)
  ));
  if (currentBottom <= bottomLimit) return;
  const shift = currentBottom - bottomLimit;
  for (const node of nodes) node.y -= shift;
}

function viewportFor(
  key: ScrollZone,
  nodes: PositionedNode[],
  maxHeight: number,
  anchor: "top" | "bottom" | "center",
  bottomLimit?: number,
): ZoneViewport | null {
  if (!nodes.length) return null;
  const padX = 24;
  const padY = 16;
  const minX = Math.min(...nodes.map((n) => n.x - n.width / 2));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width / 2));
  const minY = Math.min(...nodes.map((n) => n.y - n.height / 2));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height / 2));
  const contentTop = minY - padY;
  const contentBottom = maxY + padY;
  const contentHeight = contentBottom - contentTop;
  const limitHeight = bottomLimit === undefined ? Number.POSITIVE_INFINITY : Math.max(72, bottomLimit - contentTop);
  const height = Math.min(contentHeight, Math.max(120, maxHeight), limitHeight);
  if (contentHeight <= height + 0.5) return null;

  let top = contentTop;
  let initialScrollTop = 0;
  if (bottomLimit !== undefined) {
    // Pin bounded side lists immediately above the child section while still showing their first
    // items initially. Scrolling then reveals later items without the panel drifting into children.
    top = bottomLimit - height;
  } else {
    if (anchor === "bottom") top = contentBottom - height;
    else if (anchor === "center") top = clamp(-height / 2, contentTop, contentBottom - height);
    initialScrollTop = Math.max(0, top - contentTop);
  }

  return {
    key,
    left: minX - padX,
    top,
    width: maxX - minX + padX * 2,
    height,
    contentTop,
    contentHeight,
    initialScrollTop,
  };
}

export function buildScene(neighborhood: Neighborhood, index: GraphIndex, settings: ExcaliBrainSettings): PlexScene {
  const centerStyle = resolveNodeStyle(neighborhood.center, null, "center", settings);
  const centerLabel = index.titleFor(neighborhood.center);
  const centerSize = nodeSize(`${centerStyle.prefix ?? ""}${centerLabel}`, centerStyle.fontSize ?? 30, settings, true, centerStyle.maxLabelLength ?? 30);
  const center: PositionedNode = {
    page: neighborhood.center,
    role: "center",
    x: 0,
    y: 0,
    ...centerSize,
    style: centerStyle,
    label: centerLabel,
    neighbourCount: index.neighbourCount(neighborhood.center),
    gateStats: index.gateStats(neighborhood.center),
  };

  // Compactness controls inter-node spacing and label length. Expanded view adds vertical
  // space per thought/row only when that thought actually has visible child thoughts.
  const compactFactor = clamp(1.5 / settings.compactingFactor, 0.58, 1.45);
  const legacySpacing = clamp(settings.minLinkLength / 18, 0.72, 1.7);
  const columnGap = 54 * compactFactor * legacySpacing;
  const rowGap = 44 * compactFactor * legacySpacing;
  const centerGap = 72 * compactFactor * legacySpacing;
  const sideGap = 24 * compactFactor * legacySpacing;

  const typicalHeight = 30;
  const parentBaseY = -(center.height / 2 + typicalHeight / 2 + centerGap);
  const childBaseY = center.height / 2 + typicalHeight / 2 + centerGap;

  const parents = distributeGrid(neighborhood.parents, parentBaseY, -1, Math.max(1, Math.min(4, Math.round(settings.parentColumns))), columnGap, rowGap, index, settings, "parent", neighborhood.center.path);
  const children = distributeGrid(neighborhood.children, childBaseY, 1, Math.max(1, Math.min(7, Math.round(settings.childColumns))), columnGap, rowGap, index, settings, "child", neighborhood.center.path);

  const maxCenterHalfWidth = center.width / 2;
  const sideX = maxCenterHalfWidth + (205 * compactFactor * legacySpacing);
  const left = distributeVertical(neighborhood.leftFriends, -sideX, sideGap, index, settings, "left", neighborhood.center.path);
  const right = distributeVertical(neighborhood.rightFriends, sideX, sideGap, index, settings, "right", neighborhood.center.path);

  const rightExtent = right.length ? Math.max(...right.map((n) => n.x + n.width / 2)) : maxCenterHalfWidth;
  const siblingCenterX = Math.max(sideX + 300 * compactFactor, rightExtent + 205 * compactFactor);
  const siblings = distributeVertical(neighborhood.siblings, siblingCenterX, sideGap, index, settings, "sibling", neighborhood.center.path);

  // Side/sibling zones must finish before the children zone starts. This prevents a bounded
  // sibling/friend list from sitting on top of the first child row when either list is long.
  const childSectionTop = children.length
    ? Math.min(...children.map((node) => node.y - node.height / 2))
    : center.height / 2 + centerGap + 18;
  const sideBottom = childSectionTop - Math.max(24, 24 * compactFactor);
  shiftBottomTo(left, sideBottom, index, settings, neighborhood.center.path);
  shiftBottomTo(right, sideBottom, index, settings, neighborhood.center.path);
  shiftBottomTo(siblings, sideBottom, index, settings, neighborhood.center.path);

  const zoneViewports: Partial<Record<ScrollZone, ZoneViewport>> = {};
  const parentViewport = viewportFor("parent", parents, settings.parentMaxHeight, "bottom");
  const childViewport = viewportFor("child", children, settings.childMaxHeight, "top");
  const leftViewport = viewportFor("left", left, settings.siblingMaxHeight, "top", sideBottom);
  const rightViewport = viewportFor("right", right, settings.siblingMaxHeight, "top", sideBottom);
  const siblingViewport = viewportFor("sibling", siblings, settings.siblingMaxHeight, "top", sideBottom);
  if (parentViewport) zoneViewports.parent = parentViewport;
  if (childViewport) zoneViewports.child = childViewport;
  if (leftViewport) zoneViewports.left = leftViewport;
  if (rightViewport) zoneViewports.right = rightViewport;
  if (siblingViewport) zoneViewports.sibling = siblingViewport;

  const nodes = [center, ...parents, ...children, ...left, ...right, ...siblings];
  const edges: PositionedEdge[] = [];
  const from = (items: Neighbour[], role: Role) => {
    items.forEach((n, i) => edges.push({
      id: `${role}:${n.page.path}:${i}`,
      sourcePath: neighborhood.center.path,
      targetPath: n.page.path,
      role,
      relationType: n.relationType,
      typeDefinition: n.typeDefinition,
      direction: n.linkDirection,
      style: resolveLinkStyle(n, settings),
    }));
  };
  from(neighborhood.parents, "parent");
  from(neighborhood.children, "child");
  from(neighborhood.leftFriends, "left");
  from(neighborhood.rightFriends, "right");

  // Siblings are connected to one displayed parent where possible, matching legacy semantics.
  for (const sibling of neighborhood.siblings) {
    const parent = neighborhood.parents.find((p) => index.neighbours(p.page, "child").some((c) => c.page.path === sibling.page.path));
    if (!parent) continue;
    edges.push({
      id: `sibling:${parent.page.path}:${sibling.page.path}`,
      sourcePath: parent.page.path,
      targetPath: sibling.page.path,
      role: "sibling",
      relationType: sibling.relationType,
      typeDefinition: sibling.typeDefinition,
      direction: sibling.linkDirection,
      style: resolveLinkStyle(sibling, settings),
    });
  }

  return { nodes, edges, zoneViewports };
}
