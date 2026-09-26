import type { ExcaliBrainSettings } from "../settings";
import type { GraphPage, Neighborhood, Neighbour, NodeStyle, PositionedEdge, PositionedNode, Role, ScrollZone, SectionSizeOverride } from "../types";
import { RelationType } from "../types";
import { resolveLinkStyle, resolveNodeStyle } from "../index/style";
import type { GraphIndex } from "../index/GraphIndex";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function siblingScale(settings: ExcaliBrainSettings): number {
  return clamp(settings.siblingRelativeSize / 100, 0.3, 0.85);
}

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

export type SectionTreeEdge = {
  id: string;
  sourcePath: string;
  targetPath: string;
};

/** Folder-tree connector from a section card (or highlights panel) to the panel hanging off it. */
export type SectionPanelEdge = {
  id: string;
  sectionPath: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

/**
 * A panel below a section card: the highlights panel hangs off the card, and the figures panel
 * hangs off the highlights panel as its own branch.
 */
export type SectionPanel = {
  /** Identity for folding/resizing: the section id, or `<section id>#figures`. */
  panelId: string;
  kind: SectionPanelKind;
  sectionId: string;
  sectionPath: string;
  left: number;
  top: number;
  width: number;
  height: number;
  collapsed: boolean;
};

export type PlexScene = {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  zoneViewports: Partial<Record<ScrollZone, ZoneViewport>>;
  sectionTreeEdges?: SectionTreeEdge[];
  sectionPanelEdges?: SectionPanelEdge[];
  sectionPanels?: SectionPanel[];
};

export type SectionPanelKind = "highlights" | "figures";

export const SECTION_CARD_LIMITS = { minWidth: 120, maxWidth: 640, minHeight: 28, maxHeight: 320 } as const;
export const SECTION_PANEL_LIMITS = { minWidth: 200, maxWidth: 960, minHeight: 64, maxHeight: 1400 } as const;

export type SectionContentOptions = {
  showHighlights: boolean;
  showFigures: boolean;
  /** Sections whose panel is folded to its header. */
  collapsed: ReadonlySet<string>;
};

/** Metrics shared by the layout estimate and styles.css (.kplex-section-panel*). */
export const SECTION_PANEL = {
  width: 340,
  indent: 26,
  gap: 6,
  header: 24,
  padding: 6,
  maxBody: 560,
  quoteLineHeight: 16,
  quoteMaxLines: 12,
  quoteChrome: 10,
  commentLineHeight: 15,
  commentChrome: 6,
  commentGap: 3,
  commentIndent: 16,
  itemGap: 4,
  figureColumns: 2,
  figureTileHeight: 150,
  figureGap: 6,
  /** Extra vertical room for a rendered formula compared with the same text on one line. */
  mathLineHeight: 26,
} as const;

/** Rough rendered width in average Latin character units; CJK glyphs count double. */
function textUnits(text: string): number {
  let units = 0;
  for (const char of text) units += char.charCodeAt(0) > 0x2e80 ? 2 : 1;
  return units;
}

/** Comment branches are shown in full: lines at the narrower, indented branch width. */
export function sectionCommentLines(text: string, panelWidth: number = SECTION_PANEL.width): number {
  const unitsPerLine = Math.max(12, (panelWidth - 60) / 6);
  return text.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(textUnits(line) / unitsPerLine)), 0);
}

/** Lines a quote will occupy in the panel, capped by the clamp (a wider panel fits more per line). */
export function sectionQuoteLines(text: string, panelWidth: number = SECTION_PANEL.width): number {
  const unitsPerLine = Math.max(12, (panelWidth - 32) / 6.1);
  return clamp(Math.ceil(textUnits(text) / unitsPerLine), 1, SECTION_PANEL.quoteMaxLines);
}

export function sectionPanelSize(
  content: import("../index/SectionExpansion").SectionContent,
  options: SectionContentOptions,
  panelId: string,
  size: SectionSizeOverride = {},
): { width: number; height: number; collapsed: boolean } | null {
  const highlights = options.showHighlights ? content.highlights : [];
  if (!highlights.length) return null;
  const width = size.panelWidth ?? SECTION_PANEL.width;
  if (options.collapsed.has(panelId)) return { width, height: SECTION_PANEL.header, collapsed: true };
  // A user-set height is kept as is; the body scrolls when content is taller.
  if (size.panelHeight !== undefined) return { width, height: size.panelHeight, collapsed: false };
  let body = SECTION_PANEL.padding * 2;
  for (const item of highlights) {
    body += sectionQuoteLines(item.text, width) * SECTION_PANEL.quoteLineHeight + SECTION_PANEL.quoteChrome + SECTION_PANEL.itemGap
      + mathExtraHeight(item.text);
    for (const comment of item.comments) {
      body += SECTION_PANEL.commentGap + SECTION_PANEL.commentChrome + sectionCommentLines(comment, width) * SECTION_PANEL.commentLineHeight
        + mathExtraHeight(comment);
    }
  }
  return { width, height: SECTION_PANEL.header + Math.min(SECTION_PANEL.maxBody, body), collapsed: false };
}

/** Size of the figures branch. It is a panel of its own so images get room to be readable. */
export function sectionFiguresPanelSize(
  content: import("../index/SectionExpansion").SectionContent,
  options: SectionContentOptions,
  panelId: string,
  size: SectionSizeOverride = {},
): { width: number; height: number; collapsed: boolean } | null {
  const figures = options.showFigures ? content.figures : [];
  if (!figures.length) return null;
  const width = size.figuresWidth ?? SECTION_PANEL.width;
  if (options.collapsed.has(panelId)) return { width, height: SECTION_PANEL.header, collapsed: true };
  if (size.figuresHeight !== undefined) return { width, height: size.figuresHeight, collapsed: false };
  const rows = Math.ceil(figures.length / SECTION_PANEL.figureColumns);
  const body = SECTION_PANEL.padding * 2 + rows * SECTION_PANEL.figureTileHeight + (rows - 1) * SECTION_PANEL.figureGap;
  return { width, height: SECTION_PANEL.header + Math.min(SECTION_PANEL.maxBody, body), collapsed: false };
}

/** Display formulas are typeset taller than the source text they replace. */
function mathExtraHeight(text: string): number {
  return (text.match(/\$\$/g)?.length ?? 0) / 2 * SECTION_PANEL.mathLineHeight;
}

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
  return { width, height: center ? 48 : 26 };
}

function makeNode(
  n: Neighbour,
  role: Role,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
): PositionedNode {
  const resolved = resolveNodeStyle(n.page, n, role, settings);
  const scale = role === "sibling" ? siblingScale(settings) : 1;
  const style: NodeStyle = scale === 1 ? resolved : {
    ...resolved,
    fontSize: (resolved.fontSize ?? 18) * scale,
    gateRadius: (resolved.gateRadius ?? settings.baseNodeStyle.gateRadius ?? 5) * scale,
  };
  const label = index.titleFor(n.page);
  const baseSize = nodeSize(`${resolved.prefix ?? ""}${label}`, resolved.fontSize ?? 18, settings, false, resolved.maxLabelLength ?? 30);
  const size = scale === 1 ? baseSize : { width: baseSize.width * scale, height: baseSize.height * scale };
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

  const reserveScale = role === "sibling" ? siblingScale(settings) : 1;
  const reserves = nodes.map((node) => expandedChildReserve(node.page, index, settings, centerPath) * reserveScale);
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

function fitVerticalStrip(
  nodes: PositionedNode[],
  topLimit: number,
  bottomLimit: number,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  centerPath: string,
  alignment: "top" | "center" | "bottom" | "midline" = "center",
): void {
  if (!nodes.length) return;
  const occupiedTop = Math.min(...nodes.map((node) => node.y - node.height / 2));
  const occupiedBottom = Math.max(...nodes.map((node) =>
    node.y + node.height / 2 + expandedChildReserve(node.page, index, settings, centerPath)
  ));
  const occupiedHeight = occupiedBottom - occupiedTop;
  const availableHeight = Math.max(1, bottomLimit - topLimit);
  const targetTop = occupiedHeight > availableHeight
    ? topLimit
    : alignment === "midline"
      // distributeVertical() is already centered around the active node (y = 0). Preserve
      // that semantic midline whenever the strip fits, shifting only as much as necessary
      // to keep the occupied strip inside its configured lateral bounds.
      ? clamp(occupiedTop, topLimit, bottomLimit - occupiedHeight)
      : alignment === "bottom"
        ? bottomLimit - occupiedHeight
        : alignment === "top"
          ? topLimit
          : topLimit + (availableHeight - occupiedHeight) / 2;
  const shift = targetTop - occupiedTop;
  for (const node of nodes) node.y += shift;
}

function viewportFor(
  key: ScrollZone,
  nodes: PositionedNode[],
  maxHeight: number,
  anchor: "top" | "bottom" | "center",
  bottomLimit?: number,
  topLimit?: number,
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
  const boundedHeight = topLimit !== undefined && bottomLimit !== undefined
    ? Math.max(72, bottomLimit - topLimit)
    : bottomLimit === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(72, bottomLimit - contentTop);
  const height = Math.min(contentHeight, Math.max(72, maxHeight), boundedHeight);
  if (contentHeight <= height + 0.5) return null;

  let top = contentTop;
  let initialScrollTop = 0;
  if (topLimit !== undefined && bottomLimit !== undefined) {
    top = topLimit;
    initialScrollTop = Math.max(0, top - contentTop);
  } else if (bottomLimit !== undefined) {
    top = bottomLimit - height;
    initialScrollTop = Math.max(0, top - contentTop);
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

export function buildScene(neighborhood: Neighborhood, index: GraphIndex, settings: ExcaliBrainSettings, showCrossLinks = true): PlexScene {
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
  const compactFactor = clamp(1.35 / settings.compactingFactor, 0.38, 1.35);
  const legacySpacing = clamp(settings.minLinkLength / 18, 0.72, 1.7);
  const columnGap = 50 * compactFactor * legacySpacing;
  const rowGap = 36 * compactFactor * legacySpacing;
  const centerGap = 66 * compactFactor * legacySpacing;
  const sideGap = 18 * compactFactor * legacySpacing;

  const typicalHeight = 26;
  const parentBaseY = -(center.height / 2 + typicalHeight / 2 + centerGap);
  const childExtraGap = Math.max(42, 52 * compactFactor * legacySpacing);
  const childBaseY = center.height / 2 + typicalHeight / 2 + centerGap + childExtraGap;

  const parents = distributeGrid(neighborhood.parents, parentBaseY, -1, Math.max(1, Math.min(2, Math.round(settings.parentColumns))), columnGap, rowGap, index, settings, "parent", neighborhood.center.path);
  const children = distributeGrid(neighborhood.children, childBaseY, 1, Math.max(1, Math.min(7, Math.round(settings.childColumns))), columnGap, rowGap, index, settings, "child", neighborhood.center.path);

  const maxCenterHalfWidth = center.width / 2;
  const sideX = maxCenterHalfWidth + (205 * compactFactor * legacySpacing);
  const left = distributeVertical(neighborhood.leftFriends, -sideX, sideGap, index, settings, "left", neighborhood.center.path);
  const right = distributeVertical(neighborhood.rightFriends, sideX, sideGap, index, settings, "right", neighborhood.center.path);

  const rightExtent = right.length ? Math.max(...right.map((n) => n.x + n.width / 2)) : maxCenterHalfWidth;
  // When there is no challenger/next strip, siblings should not reserve an empty lateral column.
  // Compact view tightens the remaining gap a little further without changing sibling scale.
  const siblingBase = right.length ? 285 : 205;
  const siblingAfterRight = right.length ? 190 : 120;
  const compactSiblingMultiplier = settings.compactView ? 0.82 : 1;
  const siblingCenterX = Math.max(
    sideX + siblingBase * compactFactor * legacySpacing * compactSiblingMultiplier,
    rightExtent + siblingAfterRight * compactFactor * legacySpacing * compactSiblingMultiplier,
  );
  const siblings = distributeVertical(neighborhood.siblings, siblingCenterX, sideGap, index, settings, "sibling", neighborhood.center.path);

  // Lateral zones are independent of the parent zone. Friends and challengers form a
  // symmetrical pair around the Plex and may extend upward into the same vertical range as
  // parents. Their lower edge stays slightly above the children. Siblings occupy a separate,
  // slightly higher band farther to the right.
  const childSectionTop = children.length
    ? Math.min(...children.map((node) => node.y - node.height / 2))
    : center.height / 2 + centerGap + childExtraGap + 12;
  const sideToChildrenGap = Math.max(30, 36 * compactFactor * legacySpacing);
  const sideBottom = childSectionTop - sideToChildrenGap;
  const sideTop = sideBottom - Math.max(120, settings.friendMaxHeight);
  // Sparse lateral relationship lists are centered on the active node's horizontal midline:
  // one node sits level with the center, two straddle it evenly, and larger lists grow
  // outward in both directions. Only shift the strip when it reaches the zone bounds.
  fitVerticalStrip(left, sideTop, sideBottom, index, settings, neighborhood.center.path, "midline");
  fitVerticalStrip(right, sideTop, sideBottom, index, settings, neighborhood.center.path, "midline");

  const siblingLift = Math.max(58, 72 * compactFactor * legacySpacing);
  const siblingBottom = sideBottom - siblingLift;
  const siblingTop = siblingBottom - Math.max(120, settings.siblingMaxHeight);
  fitVerticalStrip(siblings, siblingTop, siblingBottom, index, settings, neighborhood.center.path);

  const zoneViewports: Partial<Record<ScrollZone, ZoneViewport>> = {};
  const parentViewport = viewportFor("parent", parents, settings.parentMaxHeight, "bottom");
  const childViewport = viewportFor("child", children, settings.childMaxHeight, "top");
  const leftViewport = viewportFor("left", left, settings.friendMaxHeight, "top", sideBottom, sideTop);
  const rightViewport = viewportFor("right", right, settings.friendMaxHeight, "top", sideBottom, sideTop);
  const siblingViewport = viewportFor("sibling", siblings, settings.siblingMaxHeight, "top", siblingBottom, siblingTop);
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

  // Siblings exist only because they share one or more currently visible parents with the center.
  // Those structural parent→sibling links are part of the sibling presentation itself and must
  // remain visible even when optional cross-links are disabled.
  appendSiblingParentLinks(nodes, edges, index, settings, neighborhood.center.path);
  if (showCrossLinks) appendVisibleCrossLinks(nodes, edges, index, settings, neighborhood.center.path);

  return { nodes, edges, zoneViewports };
}

function appendSiblingParentLinks(
  nodes: PositionedNode[],
  edges: PositionedEdge[],
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  centerPath: string,
): void {
  const siblingPaths = new Set(nodes.filter((node) => node.role === "sibling").map((node) => node.page.path));
  if (!siblingPaths.size) return;
  for (const parent of nodes) {
    if (parent.role !== "parent" || parent.page.path === centerPath || parent.page.transient) continue;
    for (const relation of index.visibleRelationshipsWithin(parent.page, siblingPaths)) {
      if (relation.role !== "child") continue;
      edges.push({
        id: `sibling-parent:${parent.page.path}:${relation.page.path}`,
        sourcePath: parent.page.path,
        targetPath: relation.page.path,
        role: "child",
        relationType: relation.relationType,
        typeDefinition: relation.typeDefinition,
        direction: relation.linkDirection,
        style: resolveLinkStyle(relation, settings),
      });
    }
  }
}

/** Add each semantic relationship between already-visible, non-central persistent nodes exactly
 * once. Iterating each visible page's actual adjacency list avoids an O(visible²) pair scan. */
function appendVisibleCrossLinks(
  nodes: PositionedNode[],
  edges: PositionedEdge[],
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  centerPath: string,
): void {
  const visibleByPath = new Map<string, GraphPage>();
  for (const node of nodes) {
    if (node.page.path === centerPath || node.page.transient) continue;
    visibleByPath.set(node.page.path, node.page);
  }
  const visiblePaths = new Set(visibleByPath.keys());
  if (visiblePaths.size < 2) return;

  const seenPairs = new Set<string>();
  // Structural sibling-parent links are rendered regardless of the cross-link filter. Seed the
  // de-duplication set with all already-rendered non-central pairs so enabling cross-links adds
  // only additional relationships instead of drawing a second connector on top of them.
  for (const edge of edges) {
    if (edge.sourcePath === centerPath || edge.targetPath === centerPath) continue;
    const pairKey = edge.sourcePath < edge.targetPath
      ? `${edge.sourcePath}\u0000${edge.targetPath}`
      : `${edge.targetPath}\u0000${edge.sourcePath}`;
    seenPairs.add(pairKey);
  }
  for (const source of visibleByPath.values()) {
    for (const relation of index.visibleRelationshipsWithin(source, visiblePaths)) {
      if (source.path === relation.page.path) continue;
      const pairKey = source.path < relation.page.path
        ? `${source.path}\u0000${relation.page.path}`
        : `${relation.page.path}\u0000${source.path}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      edges.push({
        id: `cross:${source.path}:${relation.page.path}:${relation.role}`,
        sourcePath: source.path,
        targetPath: relation.page.path,
        role: relation.role,
        relationType: relation.relationType,
        typeDefinition: relation.typeDefinition,
        direction: relation.linkDirection,
        style: resolveLinkStyle(relation, settings),
        isCrossLink: true,
      });
    }
  }
}

/** Runtime layout for central-note heading expansion. Section headings form an outline tree
 * below the normal Plex. Each visible section still owns a local four-gate relationship cluster.
 * Hidden descendants of a folded section project their relationships upward into the nearest
 * visible folded ancestor. Nothing here is persisted in GraphIndex. */
export function buildSectionExpandedScene(
  expansion: import("../index/SectionExpansion").CentralSectionExpansion,
  index: GraphIndex,
  settings: ExcaliBrainSettings,
  expandedSectionIds: ReadonlySet<string> = new Set(expansion.sections.filter((section) => section.childIds.length).map((section) => section.id)),
  showCrossLinks = true,
  contentOptions: SectionContentOptions | null = null,
  sectionSizes: ReadonlyMap<string, SectionSizeOverride> = new Map(),
): PlexScene {
  const sectionPaths = new Set(expansion.sections.map((section) => section.page.path));
  const baseNeighborhood: Neighborhood = {
    ...expansion.centerNeighborhood,
    children: expansion.centerNeighborhood.children.filter((item) => !sectionPaths.has(item.page.path)),
  };
  // Add cross-links after section/runtime relationship nodes are appended, so the visibility rule
  // is truly based on the final scene rather than only on the unexpanded center neighbourhood.
  const scene = buildScene(baseNeighborhood, index, settings, false);
  const byId = new Map(expansion.sections.map((section) => [section.id, section] as const));
  const roots = expansion.sections.filter((section) => !section.parentId);
  const visible: Array<{ section: import("../index/SectionExpansion").ExpandedSection; depth: number }> = [];
  const visit = (section: import("../index/SectionExpansion").ExpandedSection, depth: number) => {
    visible.push({ section, depth });
    if (!expandedSectionIds.has(section.id)) return;
    for (const childId of section.childIds) {
      const child = byId.get(childId);
      if (child) visit(child, depth + 1);
    }
  };
  for (const root of roots) visit(root, 0);

  type SourcedNeighbour = { relation: Neighbour; sourceSectionPath: string };
  const collectOwn = (section: import("../index/SectionExpansion").ExpandedSection): Record<"parent" | "child" | "left" | "right", SourcedNeighbour[]> => ({
    parent: section.neighborhood.parents.map((relation) => ({ relation, sourceSectionPath: section.page.path })),
    child: section.neighborhood.children.map((relation) => ({ relation, sourceSectionPath: section.page.path })),
    left: section.neighborhood.leftFriends.map((relation) => ({ relation, sourceSectionPath: section.page.path })),
    right: section.neighborhood.rightFriends.map((relation) => ({ relation, sourceSectionPath: section.page.path })),
  });
  const mergeRelations = (groups: Array<Record<"parent" | "child" | "left" | "right", SourcedNeighbour[]>>) => {
    const out: Record<"parent" | "child" | "left" | "right", SourcedNeighbour[]> = { parent: [], child: [], left: [], right: [] };
    for (const role of ["parent", "child", "left", "right"] as const) {
      const seen = new Map<string, SourcedNeighbour>();
      for (const group of groups) {
        for (const item of group[role]) {
          const actual = item.relation.page.transient?.actualPath ?? item.relation.page.path;
          const key = `${role}:${actual}`;
          const previous = seen.get(key);
          if (!previous || (previous.relation.relationType === RelationType.INFERRED && item.relation.relationType === RelationType.DEFINED)) seen.set(key, item);
        }
      }
      out[role] = [...seen.values()];
    }
    return out;
  };
  const collectForVisibleSection = (section: import("../index/SectionExpansion").ExpandedSection) => {
    const groups = [collectOwn(section)];
    if (!expandedSectionIds.has(section.id)) {
      const addDescendants = (parent: import("../index/SectionExpansion").ExpandedSection) => {
        for (const childId of parent.childIds) {
          const child = byId.get(childId);
          if (!child) continue;
          groups.push(collectOwn(child));
          addDescendants(child);
        }
      };
      addDescendants(section);
    }
    return mergeRelations(groups);
  };

  const ordinaryChildren = scene.nodes.filter((node) => node.role === "child");
  const childViewport = scene.zoneViewports.child;
  const normalBottom = childViewport
    ? childViewport.top + childViewport.height
    : ordinaryChildren.length
      ? Math.max(...ordinaryChildren.map((node) => node.y + node.height / 2))
      : 90;
  // Section expansion has its own much steeper density curve. Density 1 deliberately matches the
  // previous density-4 appearance; density 4 becomes a genuinely compact outline with short tree
  // branches instead of merely shaving a few pixels from a spacious layout.
  const sectionDensity = clamp(settings.compactingFactor, 1, 4);
  const densityT = (sectionDensity - 1) / 3;
  const mix = (lo: number, hi: number): number => lo + (hi - lo) * densityT;

  // Keep the outline itself very compact at high density, but do not squeeze the semantic
  // neighbours attached to a section nearly as aggressively. User testing showed that the old
  // density 2.25 relationship spacing is the right visual target for density 4: compact, but with
  // a visible sliver of air between sibling thoughts. This remap therefore drives only the
  // section-attached semantic nodes through a gentler density curve while leaving the L-shaped
  // structural tree on the steeper section curve above.
  const relationDensityT = densityT * (5 / 12); // density 4 -> previous density 2.25 spacing
  const relationMix = (lo: number, hi: number): number => lo + (hi - lo) * relationDensityT;

  const sectionStartGap = mix(78, 26);
  const depthIndent = mix(92, 28);
  const verticalGap = mix(48, 20);
  const relationHorizontalGap = relationMix(60, 24);
  const relationLateralStep = relationMix(36, 22);
  const relationVerticalGap = relationMix(66, 38);
  const relationRowStep = relationMix(38, 22);
  // These reserves determine section-to-section outline spacing, so keep them on the compact
  // section curve. The semantic nodes themselves are spaced with relationMix above.
  const clusterBaseGap = mix(56, 30);
  const clusterLateralReserve = mix(18, 9);
  const relationMinGap = relationMix(8, 4);
  const startY = normalBottom + sectionStartGap;
  const centerNode = scene.nodes.find((node) => node.role === "center");
  const centerStructuralX = centerNode ? centerNode.x - centerNode.width / 2 + 20 : -80;
  const rootLeft = centerStructuralX + mix(92, 24);
  const sectionTreeEdges: SectionTreeEdge[] = [];
  const sectionNodeById = new Map<string, PositionedNode>();
  let cursorY = startY;

  let naturalHeight = 0;
  const makeSectionNode = (section: import("../index/SectionExpansion").ExpandedSection, depth: number, relations: ReturnType<typeof collectForVisibleSection>): PositionedNode => {
    const pseudo: Neighbour = { page: section.page, role: "child", relationType: RelationType.DEFINED, typeDefinition: "section", linkDirection: null };
    const node = makeNode(pseudo, "child", index, settings);
    node.width = Math.max(172, Math.min(286, node.width + mix(16, 2)));
    node.height = Math.max(32, node.height + mix(3, -1));
    naturalHeight = node.height;
    const size = sectionSizes.get(section.id);
    if (size?.cardWidth !== undefined || size?.cardHeight !== undefined) {
      node.width = clamp(size.cardWidth ?? node.width, SECTION_CARD_LIMITS.minWidth, SECTION_CARD_LIMITS.maxWidth);
      node.height = clamp(size.cardHeight ?? node.height, SECTION_CARD_LIMITS.minHeight, SECTION_CARD_LIMITS.maxHeight);
      node.customSize = true;
    }
    // x is the card centre; rootLeft is the left edge of the first heading card.
    node.x = rootLeft + node.width / 2 + depth * depthIndent;
    node.gateStats = {
      top: { visibleCount: relations.parent.length, hasAny: relations.parent.length > 0 },
      bottom: { visibleCount: relations.child.length, hasAny: relations.child.length > 0 },
      left: { visibleCount: relations.left.length, hasAny: relations.left.length > 0 },
      right: { visibleCount: relations.right.length, hasAny: relations.right.length > 0 },
    };
    return node;
  };

  const sectionPanels: SectionPanel[] = [];
  const sectionPanelEdges: SectionPanelEdge[] = [];
  // Panels hang off their card the way child sections do: a spine drops from the parent's
  // lower-left port and turns into the panel's left edge, beside its header.
  const structuralInset = 14;
  // extraBelow pushes the bottom cluster under the content panel; rightEdge keeps right-side
  // neighbours clear of a panel wider than its card.
  const addRelationGroup = (sectionNode: PositionedNode, items: SourcedNeighbour[], role: Exclude<Role, "sibling">, extraBelow = 0, rightEdge = sectionNode.x + sectionNode.width / 2) => {
    const nodes = items.map((item) => makeNode(item.relation, role, index, settings));
    const horizontal = role === "left" || role === "previous" || role === "right" || role === "next";
    const direction = role === "left" || role === "previous" ? -1 : role === "right" || role === "next" ? 1 : 0;

    if (horizontal) {
      // Side neighbours form a vertical stack. At maximum density, never allow the thought pills
      // themselves to touch/overlap: preserve a small positive gap even when their rendered height
      // is larger than the nominal density step.
      const maxHeight = Math.max(0, ...nodes.map((node) => node.height));
      const lateralStep = Math.max(relationLateralStep, maxHeight + relationMinGap);
      nodes.forEach((node, itemIndex) => {
        node.x = direction > 0
          ? rightEdge + node.width / 2 + relationHorizontalGap
          : sectionNode.x + direction * (sectionNode.width / 2 + node.width / 2 + relationHorizontalGap);
        node.y = sectionNode.y + (itemIndex - (nodes.length - 1) / 2) * lateralStep;
      });
    } else {
      // Parents/children are arranged in rows of up to three. Position each row from the actual
      // rendered node widths instead of a fixed centre-to-centre step, so long labels can never
      // make adjacent pills overlap. Row spacing receives the same minimum-air guarantee.
      const columns = Math.min(3, Math.max(1, nodes.length));
      const rows = Math.ceil(nodes.length / columns);
      let rowOffset = 0;
      for (let row = 0; row < rows; row++) {
        const start = row * columns;
        const rowNodes = nodes.slice(start, start + columns);
        const totalWidth = rowNodes.reduce((sum, node) => sum + node.width, 0) + relationMinGap * Math.max(0, rowNodes.length - 1);
        let x = sectionNode.x - totalWidth / 2;
        const rowHeight = Math.max(0, ...rowNodes.map((node) => node.height));
        const rowStep = Math.max(relationRowStep, rowHeight + relationMinGap);
        for (const node of rowNodes) {
          node.x = x + node.width / 2;
          node.y = sectionNode.y + (role === "parent" ? -1 : 1) * (relationVerticalGap + rowOffset + (role === "parent" ? 0 : extraBelow));
          x += node.width + relationMinGap;
        }
        rowOffset += rowStep;
      }
    }

    nodes.forEach((node, itemIndex) => {
      scene.nodes.push(node);
      const sourced = items[itemIndex];
      scene.edges.push({
        id: `section-edge:${sectionNode.page.path}:${node.page.path}:${role}:${itemIndex}`,
        sourcePath: sectionNode.page.path,
        targetPath: node.page.path,
        explanationSourcePath: sourced.sourceSectionPath,
        explanationTargetPath: sourced.relation.page.path,
        role,
        relationType: sourced.relation.relationType,
        typeDefinition: sourced.relation.typeDefinition,
        direction: sourced.relation.linkDirection,
        style: resolveLinkStyle(sourced.relation, settings),
      });
    });
  };

  for (const { section, depth } of visible) {
    const relations = collectForVisibleSection(section);
    const lateralCount = Math.max(relations.left.length, relations.right.length);
    const topRows = Math.ceil(relations.parent.length / 3);
    const bottomRows = Math.ceil(relations.child.length / 3);
    const clusterAbove = Math.max(topRows * relationRowStep + (topRows ? clusterBaseGap : 0), lateralCount > 1 ? (lateralCount - 1) * clusterLateralReserve : 0);
    const sectionSize = sectionSizes.get(section.id);
    const figuresPanelId = `${section.id}#figures`;
    const panelSize = contentOptions ? sectionPanelSize(section.content, contentOptions, section.id, sectionSize) : null;
    const figuresSize = contentOptions ? sectionFiguresPanelSize(section.content, contentOptions, figuresPanelId, sectionSize) : null;
    // Reserved before the card is placed; the exact value is corrected once the panels are laid out.
    const panelBlock = (panelSize ? SECTION_PANEL.gap + panelSize.height + Math.max(0, sectionSize?.panelDy ?? 0) : 0)
      + (figuresSize ? SECTION_PANEL.gap + figuresSize.height + Math.max(0, sectionSize?.figuresDy ?? 0) : 0);
    const clusterBelow = Math.max(panelBlock + bottomRows * relationRowStep + (bottomRows ? clusterBaseGap : 0), lateralCount > 1 ? (lateralCount - 1) * clusterLateralReserve : 0);
    const node = makeSectionNode(section, depth, relations);
    cursorY += clusterAbove;
    // Keep the card's top edge where a default-height card would start, so a resized card grows
    // downwards from the handle the user dragged.
    node.y = node.customSize ? cursorY - naturalHeight / 2 + node.height / 2 : cursorY;
    cursorY = node.y + node.height / 2 + clusterBelow + verticalGap;
    sectionNodeById.set(section.id, node);
    scene.nodes.push(node);
    const cardLeft = node.x - node.width / 2;
    const cardBottom = node.y + node.height / 2;
    const panelLeft = cardLeft + SECTION_PANEL.indent;
    let panelCursor = cardBottom;
    let highlightsPanel: SectionPanel | null = null;
    if (panelSize) {
      // A dragged panel keeps its own place; the offset is stored relative to this layout spot.
      highlightsPanel = {
        panelId: section.id,
        kind: "highlights",
        sectionId: section.id,
        sectionPath: section.page.path,
        left: panelLeft + (sectionSize?.panelDx ?? 0),
        top: panelCursor + SECTION_PANEL.gap + (sectionSize?.panelDy ?? 0),
        width: panelSize.width,
        height: panelSize.height,
        collapsed: panelSize.collapsed,
      };
      sectionPanels.push(highlightsPanel);
      sectionPanelEdges.push({
        id: `section-panel-edge:${section.id}`,
        sectionPath: section.page.path,
        fromX: cardLeft + structuralInset,
        fromY: cardBottom,
        toX: highlightsPanel.left,
        toY: highlightsPanel.top + SECTION_PANEL.header / 2,
      });
      panelCursor += SECTION_PANEL.gap + panelSize.height;
    }
    // Figures branch off the highlights panel, indented one more step; with no highlights they
    // hang directly off the section card.
    const figuresLeft = panelLeft + (panelSize ? SECTION_PANEL.indent : 0);
    let figuresPanel: SectionPanel | null = null;
    if (figuresSize) {
      figuresPanel = {
        panelId: figuresPanelId,
        kind: "figures",
        sectionId: section.id,
        sectionPath: section.page.path,
        left: figuresLeft + (sectionSize?.figuresDx ?? 0),
        top: panelCursor + SECTION_PANEL.gap + (sectionSize?.figuresDy ?? 0),
        width: figuresSize.width,
        height: figuresSize.height,
        collapsed: figuresSize.collapsed,
      };
      sectionPanels.push(figuresPanel);
      sectionPanelEdges.push({
        id: `section-panel-edge:${figuresPanelId}`,
        sectionPath: section.page.path,
        fromX: (highlightsPanel?.left ?? cardLeft) + structuralInset,
        fromY: highlightsPanel ? highlightsPanel.top + highlightsPanel.height : cardBottom,
        toX: figuresPanel.left,
        toY: figuresPanel.top + SECTION_PANEL.header / 2,
      });
    }
    // Neighbours and the next section clear wherever the panels actually ended up.
    const panelsBottom = Math.max(
      cardBottom,
      highlightsPanel ? highlightsPanel.top + highlightsPanel.height : -Infinity,
      figuresPanel ? figuresPanel.top + figuresPanel.height : -Infinity,
    );
    const rightEdge = Math.max(
      node.x + node.width / 2,
      highlightsPanel ? highlightsPanel.left + highlightsPanel.width : -Infinity,
      figuresPanel ? figuresPanel.left + figuresPanel.width : -Infinity,
    );
    addRelationGroup(node, relations.parent, "parent");
    addRelationGroup(node, relations.child, "child", Math.max(0, panelsBottom - cardBottom));
    addRelationGroup(node, relations.left, "left");
    addRelationGroup(node, relations.right, "right", 0, rightEdge);
  }

  for (const { section } of visible) {
    const childNode = sectionNodeById.get(section.id);
    if (!childNode) continue;
    const parentNode = section.parentId ? sectionNodeById.get(section.parentId) : centerNode;
    if (!parentNode) continue;
    sectionTreeEdges.push({
      id: `section-tree:${parentNode.page.path}:${childNode.page.path}`,
      sourcePath: parentNode.page.path,
      targetPath: childNode.page.path,
    });
  }

  scene.sectionTreeEdges = sectionTreeEdges;
  scene.sectionPanelEdges = sectionPanelEdges;
  scene.sectionPanels = sectionPanels;
  if (showCrossLinks) appendVisibleCrossLinks(scene.nodes, scene.edges, index, settings, expansion.centerNeighborhood.center.path);
  return scene;
}
