import type { ExcaliBrainSettings } from "../settings";
import type { Neighborhood, Neighbour, NodeStyle, PositionedEdge, PositionedNode, Role, ScrollZone } from "../types";
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
): PositionedNode[] {
  const nodes = items.map((n) => makeNode(n, role, index, settings));
  const positioned: PositionedNode[] = [];

  for (let start = 0, row = 0; start < nodes.length; start += maxColumns, row += 1) {
    const rowNodes = nodes.slice(start, start + maxColumns);
    const rowHeight = Math.max(...rowNodes.map((n) => n.height));
    const rowWidth = rowNodes.reduce((sum, n) => sum + n.width, 0) + columnGap * Math.max(0, rowNodes.length - 1);
    let x = -rowWidth / 2;
    const y = baseY + rowDirection * row * (rowHeight + rowGap);

    for (const node of rowNodes) {
      node.x = x + node.width / 2;
      node.y = y;
      positioned.push(node);
      x += node.width + columnGap;
    }
  }

  return positioned;
}

function distributeVertical(
  items: Neighbour[],
  x: number,
  gap: number,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  role: Role,
): PositionedNode[] {
  const nodes = items.map((n) => makeNode(n, role, index, settings));
  if (!nodes.length) return nodes;
  const totalHeight = nodes.reduce((sum, n) => sum + n.height, 0) + gap * Math.max(0, nodes.length - 1);
  let y = -totalHeight / 2;
  for (const node of nodes) {
    node.x = x;
    node.y = y + node.height / 2;
    y += node.height + gap;
  }
  return nodes;
}

function shiftBottomTo(nodes: PositionedNode[], bottomLimit: number): void {
  if (!nodes.length) return;
  const currentBottom = Math.max(...nodes.map((node) => node.y + node.height / 2));
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

  // Compactness only controls inter-node spacing and label length. Expanded mode reserves
  // additional vertical room for each thought's second-level child strip.
  const compactFactor = clamp(1.5 / settings.compactingFactor, 0.58, 1.45);
  const legacySpacing = clamp(settings.minLinkLength / 18, 0.72, 1.7);
  const expanded = settings.graphDepth === 2;
  const columnGap = 54 * compactFactor * legacySpacing + (expanded ? 54 : 0);
  const rowGap = 44 * compactFactor * legacySpacing + (expanded ? 92 : 0);
  const centerGap = 72 * compactFactor * legacySpacing + (expanded ? 74 : 0);
  const sideGap = 24 * compactFactor * legacySpacing + (expanded ? 84 : 0);

  const typicalHeight = 30;
  const parentBaseY = -(center.height / 2 + typicalHeight / 2 + centerGap);
  const childBaseY = center.height / 2 + typicalHeight / 2 + centerGap;

  const parents = distributeGrid(neighborhood.parents, parentBaseY, -1, Math.max(1, Math.min(4, Math.round(settings.parentColumns))), columnGap, rowGap, index, settings, "parent");
  const children = distributeGrid(neighborhood.children, childBaseY, 1, Math.max(1, Math.min(7, Math.round(settings.childColumns))), columnGap, rowGap, index, settings, "child");

  const maxCenterHalfWidth = center.width / 2;
  const sideX = maxCenterHalfWidth + (205 * compactFactor * legacySpacing);
  const left = distributeVertical(neighborhood.leftFriends, -sideX, sideGap, index, settings, "left");
  const right = distributeVertical(neighborhood.rightFriends, sideX, sideGap, index, settings, "right");

  const rightExtent = right.length ? Math.max(...right.map((n) => n.x + n.width / 2)) : maxCenterHalfWidth;
  const siblingCenterX = Math.max(sideX + 300 * compactFactor, rightExtent + 205 * compactFactor);
  const siblings = distributeVertical(neighborhood.siblings, siblingCenterX, sideGap, index, settings, "sibling");

  // Side/sibling zones must finish before the children zone starts. This prevents a bounded
  // sibling/friend list from sitting on top of the first child row when either list is long.
  const childSectionTop = children.length
    ? Math.min(...children.map((node) => node.y - node.height / 2))
    : center.height / 2 + centerGap + 18;
  const sideBottom = childSectionTop - Math.max(24, 24 * compactFactor);
  shiftBottomTo(left, sideBottom);
  shiftBottomTo(right, sideBottom);
  shiftBottomTo(siblings, sideBottom);

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
