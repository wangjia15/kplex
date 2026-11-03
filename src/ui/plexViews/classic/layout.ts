import {classicEditorKey, measureClassicEditor, bindClassicEditor, type ClassicEditorLayout} from "./occurrenceEditor";
import { classicAreaForRole as scrollZoneForRole, horizontalDensity, spacingPolicy, layoutColumns, siblingScale, lateralAreaGap} from "../../../core/plex/views/classic/geometry";
export {scrollZoneForRole, horizontalDensity, spacingPolicy, layoutColumns, siblingScale, lateralAreaGap};
import {classicViewDefinition} from "../../../core/plex/views/classic/definition";
import {nodeId} from "../../../core/graph/model";
import type {PlexProjection} from "../../../core/plex/views/contracts";
import {nodeSize, countsForLayout, nodeLabelFontSize} from "../measurement";
/**
 * Classic host binding: arrange semantic neighborhoods into presentation zones.
 * Area resize bounds exist for empty groups independently of overflow viewports;
 * Horizontal density owns area/column spacing, vertical density owns row spacing. Label truncation
 * remains the explicit style character budget at every density; compact view
 * and minimum-link targets share the same geometry policy across normal/expanded/section scenes.
 * Parent width owns lateral x anchors; density three touches area edges and four permits bounded
 * margin overlap, while child-column/row controls cannot push those anchors. Optional deferred counts
 * keep offscreen geometry independent of incidence queries; rendered rows acquire current counts.
 * One-sided arrangement shares one friend/challenger strip without changing roles or edges;
 * independent lateral/Sibling scroll areas never share compacted margins.
 * Relation groups own no semantic counts/descendants; sibling witnesses bind their real members.
 * Callers own interaction, settings persistence and camera transforms.
 */
import type { KplexSettings } from "../../../settings";
import type { GraphPage, Neighborhood, Neighbour, NodeStyle, PositionedEdge, PositionedNode, Role, ScrollZone, SectionSizeOverride } from "../../../types";
import { RelationType } from "../../../types";
import { resolveLinkStyle, resolveNodeStyle } from "../../../index/style";
import type { GraphIndex } from "../../../index/GraphIndex";
import { appearanceWithoutColors } from "../../../core/contracts/appearance";

/** The Classic host adapter receives only cached presentation/incidence reads, never a mutable index or plugin. */
export type ClassicSceneRead = Pick<GraphIndex, "titleFor" | "neighbours" | "neighbourCount" | "gateStats" | "visibleRelationshipsWithin">;
/** Bound a geometry input to its supported presentation interval. */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Overlay live area heights while retaining inherited layout-profile settings and style dictionaries.
 * The source facade remains unchanged; spreading its own fields would discard inherited settings.
 */
export function withAreaHeightOverrides(settings: KplexSettings, overrides: Partial<Pick<KplexSettings, "parentMaxHeight" | "childMaxHeight" | "friendMaxHeight" | "siblingMaxHeight">>): KplexSettings {
  const next = Object.create(settings) as KplexSettings;
  return Object.assign(next, overrides);
}

export type {SceneViewport as ZoneViewport, SceneAreaBounds as ZoneAreaBounds, SectionPanel, SectionPanelEdge, SectionPanelKind} from "../scene";
import type {SceneViewport as ZoneViewport, SceneAreaBounds as ZoneAreaBounds, SectionPanel, SectionPanelEdge, HostPlexScene} from "../scene";
export type SectionTreeEdge = {
  id: string;
  sourcePath: string;
  targetPath: string;
};

/** Explicit dimensions for a center thought whose content owns more space than a label pill. */
export type CenterNodeSize = { width: number; height: number };

export type PlexScene = HostPlexScene;

/** Ordinary geometry policy only. The existing appearance projection removes paint fields;
 * inactive themes, workflow settings and lens behavior never enter this finite layout key. */
export function sceneLayoutPolicyKey(settings: KplexSettings): string {
  return JSON.stringify([
    settings.baseFontSize, settings.childColumns, settings.childMaxHeight, settings.compactingFactor,
    settings.compactView, settings.friendMaxHeight, settings.graphDepth, settings.horizontalCompactingFactor,
    settings.lateralArrangement, settings.maxItemCount, settings.minLinkLength, settings.parentColumns,
    settings.parentMaxHeight, settings.siblingMaxHeight, settings.siblingRelativeSize, settings.wrapNodeLabels,
    ...(["baseNodeStyle", "centralNodeStyle", "baseLinkStyle", "inferredLinkStyle", "folderLinkStyle", "tagLinkStyle", "hierarchyLinkStyles"] as const)
      .map(/** Compare the active prepared style policy, preserving every supported non-color field. */ key => appearanceWithoutColors(key, settings[key])),
  ]);
}

/** Snapshot bounded ordinary-geometry inputs. Source clocks/provenance do not position nodes;
 * ordered membership, labels, winning styles and relations do. Settings, semantic crosslinks
 * and section projections retain their separate caller-owned invalidation. */
export function neighborhoodSceneKey(neighborhood: Neighborhood | null, index: Pick<GraphIndex, "titleFor">, settings: KplexSettings): string {
  if (!neighborhood) return "";
  const node = (page: GraphPage, relation: Neighbour | null, role: Role | "center"): unknown => [
    page.path, page.isFolder, page.isTag, Boolean(page.file), page.url, page.noteType,
    page.transient?.kind === "group" ? page.name : index.titleFor(page),
    page.transient?.groupMembers?.map(member => member.page.path),
    appearanceWithoutColors("baseNodeStyle", resolveNodeStyle(page, relation, role, settings)),
    relation?.relationType, relation?.typeDefinition, relation?.linkDirection,
  ];
  return JSON.stringify([node(neighborhood.center, null, "center"),
    ...(["parents", "children", "leftFriends", "rightFriends", "siblings"] as const).map(
      /** Preserve exact rendered order, including sorting and filtered candidate admission. */ key => neighborhood[key].map(row => node(row.page, row, row.role)),
    )]);
}

/** Rebind reused ordinary geometry to current read pages. Coordinate reuse must never retain
 * an old mtime/property/filter context or replaced native file as the displayed endpoint. */
export function bindSceneNeighborhood(scene: PlexScene, neighborhood: Neighborhood | null): PlexScene {
  if (!neighborhood) return scene;
  const pages = new Map([neighborhood.center, ...neighborhood.parents.map(row => row.page),
    ...neighborhood.children.map(row => row.page), ...neighborhood.leftFriends.map(row => row.page),
    ...neighborhood.rightFriends.map(row => row.page), ...neighborhood.siblings.map(row => row.page)]
    .map(page => [page.path, page]));
  let changed = false;
  const nodes = scene.nodes.map(node => {
    const page = pages.get(node.page.path);
    if (!page || page === node.page) return node;
    changed = true; return {...node, page};
  });
  return changed ? {...scene, nodes} : scene;
}

/** Resolve current visual styles and dimensions without mutating the semantic page or neighbor. */
function makeNode(
  n: Neighbour,
  role: Role,
  index: ClassicSceneRead,
  settings: KplexSettings,
  deferCounts = false,
  editor?: ClassicEditorLayout,
  center = "",
): PositionedNode {
  const resolved = resolveNodeStyle(n.page, n, role, settings);
  const scale = role === "sibling" ? siblingScale(settings) : 1;
  const style: NodeStyle = scale === 1 ? resolved : {
    ...resolved,
    fontSize: (resolved.fontSize ?? 18) * scale,
    gateRadius: (resolved.gateRadius ?? settings.baseNodeStyle.gateRadius ?? 5) * scale,
  };
  const label = n.page.transient?.kind === "group" ? n.page.name : index.titleFor(n.page);
  const baseSize = nodeSize(`${resolved.prefix ?? ""}${label}`, resolved.fontSize ?? 18, settings, false, resolved.maxLabelLength ?? 30, resolved.maxWidth ?? settings.baseNodeStyle.maxWidth, resolved.strokeWidth);
  const size = scale === 1 ? baseSize : { width: baseSize.width * scale,
    // Sibling scaling keeps its width/proportions but cannot shrink the actual font's clip box.
    height: Math.max(baseSize.height * scale, Math.ceil(nodeLabelFontSize(style.fontSize ?? 18, false, settings.baseFontSize)
      * (settings.wrapNodeLabels ? 2.8 : 1.6) + 8 + 2 * Math.max(0, style.strokeWidth ?? 1))) };
  const node: PositionedNode = {
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
    ...countsForLayout(n.page, index, deferCounts),
  };
  measureClassicEditor(node, center, editor);return node;
}

export type ExpandedMiniLayout = Readonly<{
  columns: number; rows: number; width: number; columnGap: number;
  rowHeight: number; topGap: number; contentHeight: number; viewportHeight: number;
}>;

/**
 * Shared expanded-child box metrics for geometry reserves and renderer cells. Child columns now
 * honor narrower child-column settings within the established three-column maximum. Minimum
 * cell widths preserve non-overlapping pills; scale applies to the whole sibling-descendant box.
 */
export function expandedMiniLayout(settings: KplexSettings, parentWidth: number, childCount: number, scale = 1): ExpandedMiniLayout {
  const { horizontal, vertical, spacing } = spacingPolicy(settings);
  const columns = Math.min(3, layoutColumns(settings, "child"), Math.max(1, childCount));
  const rows = Math.ceil(childCount / columns);
  const columnGap = 8 * horizontal / 0.675 * spacing;
  const width = Math.max(Math.max(220, Math.min(330, parentWidth * 1.7)) * horizontal / 0.675 * spacing,
    columns * (64 + columnGap));
  const rowHeight = 16 * (settings.baseFontSize ?? 12.4) / 12.4 + 12 * vertical / 0.675 * spacing;
  const topGap = 14 * vertical / 0.675 * spacing;
  return {
    columns, rows, width: width * scale, columnGap: columnGap * scale,
    rowHeight: rowHeight * scale, topGap: topGap * scale,
    contentHeight: rows * rowHeight * scale,
    viewportHeight: Math.min(2, rows) * rowHeight * scale,
  };
}

/** Reserve exactly the visible expanded box height, optionally scaling the full sibling-descendant strip. */
export function expandedChildReserve(page: GraphPage, index: ClassicSceneRead, settings: KplexSettings, centerPath: string, scale = 1): number {
  if (page.transient?.kind === "group") return 0;
  if (settings.graphDepth !== 2) return 0;
  const childCount = index.neighbours(page, "child")
    .filter((child) => child.page.path !== centerPath)
    .slice(0, settings.maxItemCount).length;
  if (!childCount) return 0;
  const metrics = expandedMiniLayout(settings, 0, childCount, scale);
  return metrics.topGap + metrics.viewportHeight;
}

/** Bound the expanded-child footprint independently from whether a renderer currently filters it. */
function miniLayoutForNode(node: Pick<PositionedNode, "page" | "width" | "role">, index: ClassicSceneRead, settings: KplexSettings, centerPath: string): ExpandedMiniLayout | null {
  if (node.page.transient?.kind === "group") return null;
  if (settings.graphDepth !== 2 || node.role === "center") return null;
  const count = index.neighbours(node.page, "child").filter(child => child.page.path !== centerPath).slice(0, settings.maxItemCount).length;
  return count ? expandedMiniLayout(settings, node.width, count, node.role === "sibling" ? siblingScale(settings) : 1) : null;
}

/** Read a thought's full horizontal footprint for main and filtered grids using the same child-box geometry. */
export function expandedNodeWidth(node: Pick<PositionedNode, "page" | "width" | "role">, index: ClassicSceneRead, settings: KplexSettings, centerPath: string): number {
  // Parent packing must remain independent from child-column controls. Reserve the established
  // maximum mini width even when its current renderer uses a narrower one/two-column strip.
  const envelope = node.role === "parent" ? withMiniColumnEnvelope(settings) : settings;
  return Math.max(node.width, miniLayoutForNode(node, index, envelope, centerPath)?.width ?? 0);
}

/** Reserve a stable maximum-width descendant envelope without changing any live settings. */
function withMiniColumnEnvelope(settings: KplexSettings): KplexSettings {
  return Object.assign(Object.create(settings) as KplexSettings, { childColumns: 3 });
}

/** Arrange existing semantic roles into split or shared-left areas; deferred geometry leaves displayed counts to callers. */
export function buildScene(
  neighborhood: Neighborhood,
  index: ClassicSceneRead,
  settings: KplexSettings,
  showCrossLinks = true,
  centerSizeOverride?: CenterNodeSize,
  deferCounts = false,
  editor?: ClassicEditorLayout,
  bindEditor = true,
): PlexScene {
  const centerStyle = resolveNodeStyle(neighborhood.center, null, "center", settings);
  const centerLabel = index.titleFor(neighborhood.center);
  const normalCenterSize = nodeSize(`${centerStyle.prefix ?? ""}${centerLabel}`, centerStyle.fontSize ?? 30, settings, true, centerStyle.maxLabelLength ?? 30, centerStyle.maxWidth ?? settings.centralNodeStyle.maxWidth ?? settings.baseNodeStyle.maxWidth, centerStyle.strokeWidth);
  const centerSize = centerSizeOverride
    ? { width: Math.max(180, centerSizeOverride.width), height: Math.max(48, centerSizeOverride.height) }
    : normalCenterSize;
  const center: PositionedNode = {
    page: neighborhood.center,
    role: "center",
    x: 0,
    y: 0,
    ...centerSize,
    style: centerStyle,
    label: centerLabel,
    ...countsForLayout(neighborhood.center, index, deferCounts),
  };

  const rows = (items: Neighbour[], role: Role): PositionedNode[] => items.map(row => makeNode(row, role, index, settings, deferCounts, editor, neighborhood.center.path));
  const input = {center, parents: rows(neighborhood.parents, "parent"), children: rows(neighborhood.children, "child"),
    leftFriends: rows(neighborhood.leftFriends, "left"), rightFriends: rows(neighborhood.rightFriends, "right"), siblings: rows(neighborhood.siblings, "sibling")};
  // Measure bounded cached descendants before pure geometry. The portable policy never receives a host reader.
  const measured = new Map<PositionedNode, {reserve: number; width: number; mini: ReturnType<typeof miniLayoutForNode>; envelope: ReturnType<typeof miniLayoutForNode>}>();
  for (const node of [center, ...input.parents, ...input.children, ...input.leftFriends, ...input.rightFriends, ...input.siblings]) {
    if (editor && classicEditorKey(node, neighborhood.center.path) === editor.binding.occurrenceId && node.page.file === editor.page.file) {measured.set(node, {reserve: 0, width: node.width, mini: null, envelope: null});continue;}
    measured.set(node, {reserve: node === center ? 0 : expandedChildReserve(node.page, index, settings, neighborhood.center.path),
      width: expandedNodeWidth(node, index, settings, neighborhood.center.path), mini: miniLayoutForNode(node, index, settings, neighborhood.center.path),
      envelope: miniLayoutForNode(node, index, withMiniColumnEnvelope(settings), neighborhood.center.path)});
  }
  const nodes = [center, ...input.parents, ...input.children, ...input.leftFriends, ...input.rightFriends, ...input.siblings];
  const projection: PlexProjection = {attention: nodeId(center.page.path), entry: "0", layoutRoot: nodeId(center.page.path),
    occurrences: nodes.map((node, position) => ({id: String(position), nodeId: nodeId(node.page.path), representation: "thought",
      ...(node.role === "center" ? {} : {role: node.role, areaId: node.role})})), edges: [], truncated: false, coverage: "cached"};
  // Pass only the finite geometry preference projection, never the native plugin/settings object.
  const preferences = {compactingFactor: settings.compactingFactor, horizontalCompactingFactor: settings.horizontalCompactingFactor,
    compactView: Boolean(settings.compactView), minLinkLength: settings.minLinkLength, parentColumns: settings.parentColumns, childColumns: settings.childColumns,
    siblingRelativeSize: settings.siblingRelativeSize, lateralArrangement: settings.lateralArrangement, parentMaxHeight: settings.parentMaxHeight,
    childMaxHeight: settings.childMaxHeight, friendMaxHeight: settings.friendMaxHeight, siblingMaxHeight: settings.siblingMaxHeight};
  const geometry = classicViewDefinition.layout(projection, nodes.map((node, position) => ({id: String(position), width: node.width, height: node.height,
    ...(editor && classicEditorKey(node, neighborhood.center.path) === editor.binding.occurrenceId && node.page.file === editor.page.file ? {editor: true as const} : {}),
    expandedWidth: measured.get(node)!.width, expandedReserve: measured.get(node)!.reserve,
    mini: measured.get(node)!.mini, envelope: measured.get(node)!.envelope})), preferences, Boolean(centerSizeOverride));
  nodes.forEach((node, position) => Object.assign(node, geometry.positions.get(String(position))));
  const zoneViewports: Partial<Record<ScrollZone, ZoneViewport>> = {}, zoneAreas: Partial<Record<ScrollZone, ZoneAreaBounds>> = {};
  for (const key of ["parent", "child", "left", "right", "sibling"] as const) {
    const area = geometry.areas.find(value => value.id === key); if (!area) continue;
    zoneAreas[key] = {key, left: area.bounds.x, top: area.bounds.y, width: area.bounds.width, height: area.bounds.height, resizeEdge: area.resizeEdge ?? "bottom"};
    if (area.viewport) zoneViewports[key] = {key, left: area.viewport.x, top: area.viewport.y, width: area.viewport.width, height: area.viewport.height,
      contentTop: area.viewport.contentTop, contentHeight: area.viewport.contentHeight, initialScrollTop: area.viewport.initialScrollTop};
  }
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
      style: resolveLinkStyle(n, settings, neighborhood.center),
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

  return bindEditor ? bindClassicEditor({nodes, edges, zoneViewports, zoneAreas}, neighborhood.center.path, editor) : {nodes, edges, zoneViewports, zoneAreas};
}

function appendSiblingParentLinks(
  nodes: PositionedNode[],
  edges: PositionedEdge[],
  index: ClassicSceneRead,
  settings: KplexSettings,
  centerPath: string,
): void {
  const siblings = new Map<string, string>();
  for (const node of nodes) {
    if (node.role !== "sibling") continue;
    for (const page of node.page.transient?.groupMembers?.map(member => member.page) ?? [node.page]) siblings.set(page.path, node.page.path);
  }
  const siblingPaths = new Set(siblings.keys());
  if (!siblingPaths.size) return;
  const seen = new Set<string>();
  for (const parent of nodes) {
    if (parent.role !== "parent" || parent.page.path === centerPath || parent.page.transient && parent.page.transient.kind !== "group") continue;
    const sources = parent.page.transient?.groupMembers?.map(member => member.page) ?? [parent.page];
    for (const source of sources) for (const relation of index.visibleRelationshipsWithin(source, siblingPaths)) {
      if (relation.role !== "child") continue;
      const targetPath = siblings.get(relation.page.path)!;
      const id = JSON.stringify([parent.page.path, targetPath]);
      if (seen.has(id)) continue;
      seen.add(id);
      edges.push({
        id: `sibling-parent:${parent.page.transient?.kind === "group" || targetPath !== relation.page.path ? id : `${parent.page.path}:${relation.page.path}`}`,
        sourcePath: parent.page.path,
        targetPath,
        ...(parent.page.transient?.kind === "group" || targetPath !== relation.page.path
          ? { explanationSourcePath: source.path, explanationTargetPath: relation.page.path } : {}),
        role: "child",
        relationType: relation.relationType,
        typeDefinition: relation.typeDefinition,
        direction: relation.linkDirection,
        style: resolveLinkStyle(relation, settings, source),
      });
    }
  }
}

/** Append semantic links between supplied visible persistent nodes, preserving existing structural
 * pairs. Mutates only the caller-owned edge array; the caller chooses full-scene or clipped membership.
 * Iterating adjacency avoids an O(visible²) pair scan and never queries section/transient sources.
 * A focus reads only that endpoint's adjacency plus earlier incident endpoints to retain the
 * ordinary projection's canonical orientation. It never acquires absent source information. */
export function appendVisibleCrossLinks(
  nodes: PositionedNode[],
  edges: PositionedEdge[],
  index: ClassicSceneRead,
  settings: KplexSettings,
  centerPath: string,
  focus?: Readonly<{ path: string; accepts: (edge: PositionedEdge) => boolean }>,
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
  /** Both ordinary and focused projection share identity, styling and structural deduplication. */
  const append = (source: GraphPage, relation: Neighbour): void => {
    if (source.path === relation.page.path) return;
    const pairKey = source.path < relation.page.path
      ? `${source.path}\u0000${relation.page.path}`
      : `${relation.page.path}\u0000${source.path}`;
    if (seenPairs.has(pairKey)) return;
    seenPairs.add(pairKey);
    const edge: PositionedEdge = {
      id: `cross:${source.path}:${relation.page.path}:${relation.role}`,
      sourcePath: source.path,
      targetPath: relation.page.path,
      role: relation.role,
      relationType: relation.relationType,
      typeDefinition: relation.typeDefinition,
      direction: relation.linkDirection,
      style: resolveLinkStyle(relation, settings, source),
      isCrossLink: true,
    };
    if (!focus || focus.accepts(edge)) edges.push(edge);
  };
  if (!focus) {
    for (const source of visibleByPath.values()) for (const relation of index.visibleRelationshipsWithin(source, visiblePaths)) append(source, relation);
    return;
  }
  const target = visibleByPath.get(focus.path);
  if (!target) return;
  const order = new Map([...visibleByPath.keys()].map((path, position) => [path, position]));
  const candidates: { source: GraphPage; relation: Neighbour }[] = [];
  for (const relation of index.visibleRelationshipsWithin(target, visiblePaths)) {
    if (relation.page.path === target.path) continue;
    const other = visibleByPath.get(relation.page.path);
    if (!other) continue;
    // The normal projection emits the first displayed endpoint's directed view. A reciprocal
    // lookup preserves that exact role/style/orientation when the hovered node is the target.
    if (order.get(other.path)! < order.get(target.path)!) {
      const reciprocal = index.visibleRelationshipsWithin(other, new Set([target.path])).find(row => row.page.path === target.path);
      if (reciprocal) { candidates.push({ source: other, relation: reciprocal }); continue; }
    }
    candidates.push({ source: target, relation });
  }
  candidates.sort((a, b) => order.get(a.source.path)! - order.get(b.source.path)!);
  for (const candidate of candidates) append(candidate.source, candidate.relation);
}
export const SECTION_CARD_LIMITS = { minWidth: 120, maxWidth: 640, minHeight: 28, maxHeight: 320 } as const;
export const SECTION_PANEL_LIMITS = { minWidth: 200, maxWidth: 960, minHeight: 64, maxHeight: 1400 } as const;

/** What content a section renders below its card, plus the panels folded to their header. */
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
  quoteMaxLines: 20,
  quoteChrome: 10,
  commentLineHeight: 15,
  commentChrome: 6,
  commentGap: 3,
  commentIndent: 16,
  itemGap: 4,
  figureColumns: 2,
  figureTileHeight: 150,
  figureGap: 6,
  /** Height of an image shown inside a highlight quote (plus its gap to the quote text). */
  quoteFigureHeight: 150,
  quoteFigureGap: 4,
  /** Extra vertical room for a rendered formula compared with the same text on one line. */
  mathLineHeight: 26,
} as const;

/** Rough rendered width in average Latin character units; CJK glyphs count double. */
function textUnits(text: string): number {
  let units = 0;
  for (const char of text) units += char.charCodeAt(0) > 0x2e80 ? 2 : 1;
  return units;
}

/** Text shown under a quote: the passage itself, or the caption of an image-only highlight. */
export function sectionQuoteText(item: { text: string; figure?: { caption: string } }): string {
  return item.text || item.figure?.caption || "";
}

const SECTION_CARD_DEFAULT_WIDTH = { min: 172, max: 460 } as const;
/** Width at which a section-linked node's title starts wrapping onto more lines. */
const SECTION_RELATION_WRAP_WIDTH = 240;

/** Default section card width: the heading mark, the full title and the card padding. */
function sectionCardWidth(title: string, fontSize: number): number {
  const labelFont = clamp(fontSize * 0.62, 10, 16);
  return clamp(Math.ceil(66 + textUnits(title) * labelFont * 0.56), SECTION_CARD_DEFAULT_WIDTH.min, SECTION_CARD_DEFAULT_WIDTH.max);
}

/** Comment branches are shown in full: lines at the narrower, indented branch width. */
export function sectionCommentLines(text: string, panelWidth: number = SECTION_PANEL.width): number {
  const unitsPerLine = Math.max(12, (panelWidth - 60) / 6);
  return text.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(textUnits(line) / unitsPerLine)), 0);
}

/** Lines a quote will occupy in the panel, capped by the clamp (a wider panel fits more per line). */
export function sectionQuoteLines(text: string, panelWidth: number = SECTION_PANEL.width): number {
  const unitsPerLine = Math.max(12, (panelWidth - 32) / 6.1);
  const lines = text.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(textUnits(line) / unitsPerLine)), 0);
  return clamp(lines, 1, SECTION_PANEL.quoteMaxLines);
}

/** Display formulas are typeset taller than the source text they replace. */
function mathExtraHeight(text: string): number {
  return (text.match(/\$\$/g)?.length ?? 0) / 2 * SECTION_PANEL.mathLineHeight;
}

/** Estimated size of the highlights panel below a section card, or null when nothing is shown. */
export function sectionPanelSize(
  content: import("../../../index/SectionExpansion").SectionContent,
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
    const text = sectionQuoteText(item);
    body += (text ? sectionQuoteLines(text, width) * SECTION_PANEL.quoteLineHeight + mathExtraHeight(text) : 0)
      + (item.figure ? SECTION_PANEL.quoteFigureHeight + (text ? SECTION_PANEL.quoteFigureGap : 0) : 0)
      + SECTION_PANEL.quoteChrome + SECTION_PANEL.itemGap;
    for (const comment of item.comments) {
      body += SECTION_PANEL.commentGap + SECTION_PANEL.commentChrome + sectionCommentLines(comment, width) * SECTION_PANEL.commentLineHeight
        + mathExtraHeight(comment);
    }
  }
  return { width, height: SECTION_PANEL.header + Math.min(SECTION_PANEL.maxBody, body), collapsed: false };
}

/** Size of the figures branch. It is a panel of its own so images get room to be readable. */
export function sectionFiguresPanelSize(
  content: import("../../../index/SectionExpansion").SectionContent,
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

/** Runtime layout for central-note heading expansion. Section headings form an outline tree
 * below the normal Plex. Each visible section still owns a local four-gate relationship cluster.
 * Hidden descendants of a folded section project their relationships upward into the nearest
 * visible folded ancestor. Nothing here is persisted in GraphIndex. The central scene's
 * editable area controls remain available independently of expanded sections. Optional deferred
 * counts preserve section-owned overrides while ordinary rendered rows project fresh gates. */
export function buildSectionExpandedScene(
  expansion: import("../../../index/SectionExpansion").CentralSectionExpansion,
  index: ClassicSceneRead,
  settings: KplexSettings,
  expandedSectionIds: ReadonlySet<string> = new Set(expansion.sections.filter((section) => section.childIds.length).map((section) => section.id)),
  showCrossLinks = true,
  centerSizeOverride?: CenterNodeSize,
  deferCounts = false,
  editor?: ClassicEditorLayout,
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
  const scene = buildScene(baseNeighborhood, index, settings, false, centerSizeOverride, deferCounts, editor, false);
  const byId = new Map(expansion.sections.map((section) => [section.id, section] as const));
  const roots = expansion.sections.filter((section) => !section.parentId);
  const visible: Array<{ section: import("../../../index/SectionExpansion").ExpandedSection; depth: number }> = [];
  const visit = (section: import("../../../index/SectionExpansion").ExpandedSection, depth: number) => {
    visible.push({ section, depth });
    if (!expandedSectionIds.has(section.id)) return;
    for (const childId of section.childIds) {
      const child = byId.get(childId);
      if (child) visit(child, depth + 1);
    }
  };
  for (const root of roots) visit(root, 0);

  type SourcedNeighbour = { relation: Neighbour; sourceSectionPath: string };
  const collectOwn = (section: import("../../../index/SectionExpansion").ExpandedSection): Record<"parent" | "child" | "left" | "right", SourcedNeighbour[]> => ({
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
  const collectForVisibleSection = (section: import("../../../index/SectionExpansion").ExpandedSection) => {
    const groups = [collectOwn(section)];
    if (!expandedSectionIds.has(section.id)) {
      const addDescendants = (parent: import("../../../index/SectionExpansion").ExpandedSection) => {
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
  const verticalDensityT = (clamp(settings.compactingFactor, 1, 4) - 1) / 3;
  const horizontalDensityT = (clamp(horizontalDensity(settings), 1, 4) - 1) / 3;
  const { spacing } = spacingPolicy(settings);
  const compact = settings.compactView ? 0.82 : 1;
  /** Preserve each established section curve while applying the selected axis and spacing target. */
  const mix = (lo: number, hi: number, axis: "horizontal" | "vertical" = "vertical"): number => {
    const progress = axis === "horizontal" ? horizontalDensityT : verticalDensityT;
    return (lo + (hi - lo) * progress) * spacing * compact;
  };

  const sectionStartGap = mix(78, 26);
  const depthIndent = mix(92, 28, "horizontal");
  const verticalGap = mix(48, 20);
  // Keep the previous maximum-density endpoints, but give related pills meaningful whitespace
  // below that density. The inter-section gutter above remains independently unchanged.
  const relationHorizontalGap = mix(90, 60 + (24 - 60) * 5 / 12, "horizontal");
  const relationLateralStep = mix(60, 36 + (22 - 36) * 5 / 12);
  const relationVerticalGap = mix(90, 66 + (38 - 66) * 5 / 12);
  const relationRowStep = mix(60, 38 + (22 - 38) * 5 / 12);
  const relationMinHorizontalGap = mix(36, 8 + (4 - 8) * 5 / 12, "horizontal");
  const relationMinVerticalGap = mix(22, 8 + (4 - 8) * 5 / 12);
  const startY = normalBottom + sectionStartGap;
  const centerNode = scene.nodes.find((node) => node.role === "center");
  const centerStructuralX = centerNode ? centerNode.x - centerNode.width / 2 + 20 : -80;
  const rootLeft = centerStructuralX + mix(92, 24, "horizontal");
  const sectionTreeEdges: SectionTreeEdge[] = [];
  const sectionNodeById = new Map<string, PositionedNode>();
  let cursorY = startY;

  let naturalHeight = 0;
  const makeSectionNode = (section: import("../../../index/SectionExpansion").ExpandedSection, depth: number, relations: ReturnType<typeof collectForVisibleSection>): PositionedNode => {
    const pseudo: Neighbour = { page: section.page, role: "child", relationType: RelationType.DEFINED, typeDefinition: "section", linkDirection: null };
    const node = makeNode(pseudo, "child", index, settings, deferCounts);
    // A heading card fits its whole title (up to a readable cap) rather than the node label limit.
    node.width = sectionCardWidth(node.label, node.style.fontSize ?? 18);
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
  // Nodes linked from a section show their whole title: a fixed width and as many lines as needed.
  const makeRelationNode = (item: SourcedNeighbour, role: Exclude<Role, "sibling">): PositionedNode => {
    const node = makeNode(item.relation, role, index, settings, deferCounts, editor, expansion.centerNeighborhood.center.path);
    const label = `${node.style.prefix ?? ""}${node.label}`;
    const font = clamp((node.style.fontSize ?? 18) * 0.62, 10, 16);
    const chrome = 34 + (node.style.icon ? 18 : 0);
    const singleLine = Math.ceil(chrome + textUnits(label) * font * 0.56);
    if (singleLine <= SECTION_RELATION_WRAP_WIDTH) {
      node.width = Math.max(node.width, singleLine);
    } else {
      node.width = SECTION_RELATION_WRAP_WIDTH;
      const lines = Math.ceil(textUnits(label) * font * 0.56 / (SECTION_RELATION_WRAP_WIDTH - chrome));
      node.height = Math.max(node.height, Math.ceil(lines * font * 1.3 + 12));
    }
    node.wrapLabel = true;
    return node;
  };
  /** Place one bounded section-owned relation group with actual-width and non-touching rows. */
  const addRelationGroup = (sectionNode: PositionedNode, sectionId: string, nodes: PositionedNode[], items: SourcedNeighbour[], role: Exclude<Role, "sibling">, extraBelow = 0, rightEdge = sectionNode.x + sectionNode.width / 2, clearanceHeight = sectionNode.height) => {
    const horizontal = role === "left" || role === "previous" || role === "right" || role === "next";
    const direction = role === "left" || role === "previous" || (settings.lateralArrangement === "left" && role === "right")
      ? -1 : role === "right" || role === "next" ? 1 : 0;

    if (horizontal) {
      // Side neighbours form a vertical stack. At maximum density, never allow the thought pills
      // themselves to touch/overlap: preserve a small positive gap even when their rendered height
      // is larger than the nominal density step.
      const maxHeight = Math.max(0, ...nodes.map((node) => node.height));
      const lateralStep = Math.max(relationLateralStep, maxHeight + relationMinVerticalGap);
      nodes.forEach((node, itemIndex) => {
        node.x = direction > 0
          ? rightEdge + node.width / 2 + relationHorizontalGap
          : sectionNode.x + direction * (sectionNode.width / 2 + node.width / 2 + relationHorizontalGap);
        node.y = sectionNode.y + (itemIndex - (nodes.length - 1) / 2) * lateralStep;
      });
    } else {
      // Parents/children use their main-zone column limits. Position each row from actual rendered
      // node widths instead of a fixed centre-to-centre step, so long labels can never
      // make adjacent pills overlap. Row spacing receives the same minimum-air guarantee.
      const columns = Math.min(layoutColumns(settings, role === "parent" ? "parent" : "child"), Math.max(1, nodes.length));
      const rows = Math.ceil(nodes.length / columns);
      let rowOffset = 0;
      for (let row = 0; row < rows; row++) {
        const start = row * columns;
        const rowNodes = nodes.slice(start, start + columns);
        const totalWidth = rowNodes.reduce((sum, node) => sum + node.width, 0) + relationMinHorizontalGap * Math.max(0, rowNodes.length - 1);
        let x = sectionNode.x - totalWidth / 2;
        const rowHeight = Math.max(0, ...rowNodes.map((node) => node.height));
        const rowStep = Math.max(relationRowStep, rowHeight + relationMinVerticalGap);
        for (const node of rowNodes) {
          node.x = x + node.width / 2;
          node.y = sectionNode.y + (role === "parent" ? -1 : 1) * (Math.max(relationVerticalGap, (clearanceHeight + rowHeight) / 2 + relationMinVerticalGap) + rowOffset + (role === "parent" ? 0 : extraBelow));
          x += node.width + relationMinHorizontalGap;
        }
        rowOffset += rowStep;
      }
    }

    const offsets = sectionSizes.get(sectionId)?.nodeOffsets;
    nodes.forEach((node, itemIndex) => {
      // A node the user dragged keeps its place relative to the layout position.
      const offset = offsets?.[node.page.transient?.actualPath ?? node.page.path];
      if (offset) {
        node.x += offset[0];
        node.y += offset[1];
      }
      node.sectionId = sectionId;
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
        style: resolveLinkStyle(sourced.relation, settings, sectionNode.page),
      });
    });
  };

  for (const { section, depth } of visible) {
    const relations = collectForVisibleSection(section);
    const built = {
      parent: relations.parent.map((item) => makeRelationNode(item, "parent")),
      child: relations.child.map((item) => makeRelationNode(item, "child")),
      left: relations.left.map((item) => makeRelationNode(item, "left")),
      right: relations.right.map((item) => makeRelationNode(item, "right")),
    };
    const sectionSize = sectionSizes.get(section.id);
    const figuresPanelId = `${section.id}#figures`;
    const panelSize = contentOptions ? sectionPanelSize(section.content, contentOptions, section.id, sectionSize) : null;
    const figuresSize = contentOptions ? sectionFiguresPanelSize(section.content, contentOptions, figuresPanelId, sectionSize) : null;
    // Reserved before the card is placed; the exact value is corrected once the panels are laid out.
    const panelBlock = (panelSize ? SECTION_PANEL.gap + panelSize.height + Math.max(0, sectionSize?.panelDy ?? 0) : 0)
      + (figuresSize ? SECTION_PANEL.gap + figuresSize.height + Math.max(0, sectionSize?.figuresDy ?? 0) : 0);
    const node = makeSectionNode(section, depth, relations);
    // Lay out the finite cluster privately, then translate its actual occupied extents. Nominal
    // row counts cannot reserve wrapped rows or configured 1–7-column clusters safely.
    node.y = 0;
    const clusterStart = scene.nodes.length;
    addRelationGroup(node, section.id, built.parent, relations.parent, "parent", 0, node.x + node.width / 2, node.customSize ? naturalHeight : node.height);
    addRelationGroup(node, section.id, built.child, relations.child, "child", panelBlock);
    const gridNodes = scene.nodes.slice(clusterStart);
    // Right-side neighbours clear a content panel wider than its card.
    const cardLeft = node.x - node.width / 2;
    let panelRight = node.x + node.width / 2;
    if (panelSize) panelRight = Math.max(panelRight, cardLeft + SECTION_PANEL.indent + panelSize.width);
    if (figuresSize) panelRight = Math.max(panelRight, cardLeft + SECTION_PANEL.indent + (panelSize ? SECTION_PANEL.indent : 0) + figuresSize.width);
    addRelationGroup(node, section.id, built.left, relations.left, "left");
    addRelationGroup(node, section.id, built.right, relations.right, "right", 0, panelRight);
    const cluster = [node, ...scene.nodes.slice(clusterStart)];
    if (settings.lateralArrangement === "left") {
      const friends = cluster.filter(/** Preserve distinct roles while sharing one physical side. */ item => item.role === "left");
      const challengers = cluster.filter(/** Only section-owned challengers move; ordinary scene zones are already placed. */ item => item.role === "right");
      const lateral = [...friends, ...challengers];
      let bottom = 0;
      for (const item of lateral) {
        item.y = bottom + item.height / 2;
        bottom += item.height + relationMinVerticalGap;
      }
      const midline = (bottom - relationMinVerticalGap) / 2;
      for (const item of lateral) item.y -= midline;
    }
    for (const lateral of cluster) {
      if (lateral.role !== "left" && lateral.role !== "right") continue;
      const direction = lateral.role === "left" || settings.lateralArrangement === "left" ? -1 : 1;
      let distance = Math.abs(lateral.x - node.x);
      for (const obstacle of gridNodes) {
        if (obstacle.role !== "parent") continue;
        distance = Math.max(distance, direction * (obstacle.x - node.x) + (obstacle.width + lateral.width) / 2 + relationHorizontalGap);
      }
      lateral.x = node.x + direction * distance;
    }
    // Child columns govern their own row width. Keep them below the actual lateral strip rather
    // than widening the lateral anchor to clear children; parent columns alone own that x fence.
    const localChildren = gridNodes.filter(item => item.role === "child");
    const lateralNodes = cluster.filter(item => item.role === "left" || item.role === "right");
    if (localChildren.length && lateralNodes.length) {
      const lateralBottom = Math.max(...lateralNodes.map(item => item.y + item.height / 2));
      const childTop = Math.min(...localChildren.map(item => item.y - item.height / 2));
      const childShift = Math.max(0, lateralBottom + verticalGap - childTop);
      for (const child of localChildren) child.y += childShift;
    }
    const clusterTop = Math.min(...cluster.map(item => item.y - (item === node && node.customSize ? naturalHeight : item.height) / 2));
    const clusterBottom = Math.max(...cluster.map(item => item.y + item.height / 2));
    const shift = cursorY - clusterTop;
    for (const item of cluster) item.y += shift;
    // A resized card keeps its top edge where the default-height card started, growing downward
    // from the handle the user dragged.
    if (node.customSize) node.y += (node.height - naturalHeight) / 2;
    cursorY += clusterBottom - clusterTop + verticalGap;
    sectionNodeById.set(section.id, node);
    scene.nodes.push(node);
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
    // The next section clears wherever the panels actually ended up, including dragged offsets.
    const panelsBottom = Math.max(
      cardBottom,
      highlightsPanel ? highlightsPanel.top + highlightsPanel.height : -Infinity,
      figuresPanel ? figuresPanel.top + figuresPanel.height : -Infinity,
    );
    cursorY = Math.max(cursorY, panelsBottom + verticalGap);
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
  return bindClassicEditor(scene, expansion.centerNeighborhood.center.path, editor);
}
