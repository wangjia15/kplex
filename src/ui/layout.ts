import type { ExcaliBrainSettings } from "../settings";
import type { Neighborhood, Neighbour, NodeStyle, PositionedEdge, PositionedNode, Role } from "../types";
import { resolveLinkStyle, resolveNodeStyle } from "../index/style";
import type { GraphIndex } from "../index/GraphIndex";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export type SiblingViewport = {
  left: number;
  top: number;
  width: number;
  height: number;
  contentHeight: number;
};

export type PlexScene = {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  siblingViewport: SiblingViewport | null;
};

export function gateDiameter(style: NodeStyle): number {
  // Legacy gateRadius is a radius. Give the React renderer a little more visual weight
  // and keep enough diameter for reliable pointer targeting.
  return Math.max(14, (style.gateRadius ?? 5) * 2 + 6);
}

function nodeSize(label: string, fontSize: number, compact: boolean, center = false): { width: number; height: number } {
  const width = clamp(86 + label.length * Math.max(5.2, fontSize * 0.31), center ? 180 : 138, compact ? 220 : center ? 330 : 276);
  if (center) return { width, height: 58 };
  return { width, height: compact ? 30 : 36 };
}

function makeNode(
  n: Neighbour,
  role: Role,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
): PositionedNode {
  const style = resolveNodeStyle(n.page, n, role, settings);
  const label = index.titleFor(n.page);
  const size = nodeSize(`${style.prefix ?? ""}${label}`, style.fontSize ?? 18, settings.compactView, false);
  return {
    page: n.page,
    role,
    relationType: n.relationType,
    typeDefinition: n.typeDefinition,
    x: 0,
    y: 0,
    ...size,
    style,
    label,
    neighbourCount: index.neighbourCount(n.page),
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

function distributeSiblings(
  items: Neighbour[],
  centerX: number,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
): { nodes: PositionedNode[]; viewport: SiblingViewport | null } {
  const nodes = items.map((n) => makeNode(n, "sibling", index, settings));
  if (!nodes.length) return { nodes, viewport: null };

  const gap = settings.compactView ? 12 : 16;
  const padTop = 12;
  const padBottom = 12;
  const horizontalPad = 24;
  const widest = Math.max(...nodes.map((n) => n.width));
  const contentHeight = padTop + padBottom + nodes.reduce((sum, n) => sum + n.height, 0) + gap * Math.max(0, nodes.length - 1);
  const maxHeight = settings.compactView ? 286 : 340;
  const height = Math.min(contentHeight, maxHeight);
  const width = widest + horizontalPad * 2 + 12; // room for outside gates and the native scrollbar
  const left = centerX - width / 2;
  const top = -height / 2;

  let localY = padTop;
  for (const node of nodes) {
    node.x = centerX;
    node.y = top + localY + node.height / 2;
    localY += node.height + gap;
  }

  return { nodes, viewport: { left, top, width, height, contentHeight } };
}

export function buildScene(neighborhood: Neighborhood, index: GraphIndex, settings: ExcaliBrainSettings): PlexScene {
  const centerStyle = resolveNodeStyle(neighborhood.center, null, "center", settings);
  const centerLabel = index.titleFor(neighborhood.center);
  const centerSize = nodeSize(`${centerStyle.prefix ?? ""}${centerLabel}`, centerStyle.fontSize ?? 30, false, true);
  const center: PositionedNode = {
    page: neighborhood.center,
    role: "center",
    x: 0,
    y: 0,
    ...centerSize,
    style: centerStyle,
    label: centerLabel,
    neighbourCount: index.neighbourCount(neighborhood.center),
  };

  const compactFactor = settings.compactView ? Math.max(0.65, 1 / settings.compactingFactor) : 1;
  const legacySpacing = clamp(settings.minLinkLength / 18, 0.72, 1.7);
  const columnGap = 54 * compactFactor * legacySpacing;
  const rowGap = 48 * compactFactor * legacySpacing;
  const centerGap = 76 * compactFactor * legacySpacing;
  const sideGap = 26 * compactFactor * legacySpacing;

  const typicalHeight = settings.compactView ? 30 : 36;
  const parentBaseY = -(center.height / 2 + typicalHeight / 2 + centerGap);
  const childBaseY = center.height / 2 + typicalHeight / 2 + centerGap;

  // The Plex becomes much easier to scan when parent/child sets form compact matrices.
  // Keep parents to three columns and children to five columns, expanding away from center.
  const parents = distributeGrid(neighborhood.parents, parentBaseY, -1, 3, columnGap, rowGap, index, settings, "parent");
  const children = distributeGrid(neighborhood.children, childBaseY, 1, 5, columnGap, rowGap, index, settings, "child");

  const maxCenterHalfWidth = center.width / 2;
  const sideX = maxCenterHalfWidth + (205 * compactFactor * legacySpacing);
  const left = distributeVertical(neighborhood.leftFriends, -sideX, sideGap, index, settings, "left");
  const right = distributeVertical(neighborhood.rightFriends, sideX, sideGap, index, settings, "right");

  const rightExtent = right.length ? Math.max(...right.map((n) => n.x + n.width / 2)) : maxCenterHalfWidth;
  const siblingCenterX = Math.max(sideX + 300 * compactFactor, rightExtent + 205 * compactFactor);
  const { nodes: siblings, viewport: siblingViewport } = distributeSiblings(neighborhood.siblings, siblingCenterX, index, settings);

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

  return { nodes, edges, siblingViewport };
}
