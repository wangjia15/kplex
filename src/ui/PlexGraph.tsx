import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent, type PointerEvent } from "react";
import type ExcaliBrainPlugin from "../main";
import type { GraphIndex } from "../index/GraphIndex";
import type { ExcaliBrainSettings } from "../settings";
import type { GateRole, GateSide, GraphPage, Neighbour, NodeStyle, PositionedEdge, PositionedNode, Role, ScrollZone } from "../types";
import { LinkDirection } from "../types";
import { alphaHexToCss, resolveLinkStyle, resolveNodeStyle } from "../index/style";
import { buildScene, effectiveLabelLimit, gateDiameter, type ZoneViewport } from "./layout";
import { ThoughtNode, type ConnectionDragState } from "./ThoughtNode";
import { ObsidianIcon } from "./ObsidianIcon";

type Point = { x: number; y: number };
type HoverState =
  | { kind: "node"; path: string }
  | { kind: "gate"; path: string; gate: GateSide }
  | { kind: "edge"; id: string }
  | null;

type EdgeGates = { source: GateSide; target: GateSide };
type ConnectDrag = {
  originPath: string;
  gate: GateSide;
  pointerId: number;
  current: Point;
};
type NodeDrag = {
  path: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  x: number;
  y: number;
  moved: boolean;
};

type ScrollValues = Record<ScrollZone, number>;
type ZoneBooleanMap = Partial<Record<ScrollZone, boolean>>;
type ZoneStringMap = Partial<Record<ScrollZone, string>>;

const ZONES: ScrollZone[] = ["parent", "child", "left", "right", "sibling"];
const EMPTY_SCROLLS: ScrollValues = { parent: 0, child: 0, left: 0, right: 0, sibling: 0 };
const GATE_GAP = 3;
const MAX_ZOOM = 3;
const COLUMN_PRESETS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [1, 2], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5], [4, 6], [4, 7],
];
const GENERIC_RELATION_LABELS = new Set([
  "parent", "parents", "child", "children", "friend", "friends", "challenger", "jump", "jumps",
  "previous", "prev", "next", "before", "after", "west", "east", "north", "south", "up", "down",
  "u", "d", "n", "e", "w", "source", "origin", "inception", "parent domain", "leads to",
  "contributes to", "nurtures", "similar", "supports", "alternatives", "advantages", "pros", "opposes",
  "disadvantages", "missing", "cons", "file-tree", "folder-tree", "tag-tree", "inferred-link", "inferred",
  "sibling", "url", "attachment",
].map((label) => label.toLowerCase()));
const gateKey = (path: string, gate: GateSide) => `${path}::${gate}`;

type EdgeGeometry = { d: string; midpoint: Point };
type ZoneDisplayLayout = {
  nodes: PositionedNode[];
  localPositions: Map<string, Point>;
  contentHeight: number;
  count: number;
  filtering: boolean;
};

type ExpandedMiniThought = {
  key: string;
  relation: Neighbour;
  label: string;
  style: NodeStyle;
  localX: number;
  localY: number;
  width: number;
  height: number;
};

type ExpandedCluster = {
  parent: PositionedNode;
  left: number;
  top: number;
  width: number;
  viewportHeight: number;
  contentHeight: number;
  scrollTop: number;
  children: ExpandedMiniThought[];
};

function gatesForEdge(edge: PositionedEdge): EdgeGates {
  switch (edge.role) {
    case "parent": return { source: "top", target: "bottom" };
    case "child": return { source: "bottom", target: "top" };
    case "left":
    case "previous": return { source: "left", target: "right" };
    case "right":
    case "next": return { source: "right", target: "left" };
    case "sibling": return { source: "right", target: "left" };
  }
}

function semanticRoleForGate(gate: GateSide): GateRole {
  switch (gate) {
    case "top": return "parent";
    case "bottom": return "child";
    case "left": return "left";
    case "right": return "right";
  }
}

function semanticRoleForPosition(point: Point): GateRole {
  if (Math.abs(point.x) > Math.abs(point.y)) return point.x < 0 ? "left" : "right";
  return point.y < 0 ? "parent" : "child";
}

function normalizedRole(role: Role | "center"): GateRole | null {
  if (role === "parent" || role === "child" || role === "left" || role === "right") return role;
  if (role === "previous") return "left";
  if (role === "next") return "right";
  return null;
}

function zoneForRole(role: Role | "center"): ScrollZone | null {
  switch (role) {
    case "parent": return "parent";
    case "child": return "child";
    case "left":
    case "previous": return "left";
    case "right":
    case "next": return "right";
    case "sibling": return "sibling";
    case "center": return null;
  }
}

function oppositeGate(gate: GateSide): GateSide {
  if (gate === "top") return "bottom";
  if (gate === "bottom") return "top";
  if (gate === "left") return "right";
  return "left";
}

function gatePoint(node: PositionedNode, gate: GateSide): Point {
  const gateRadius = gateDiameter(node.style) / 2;
  switch (gate) {
    case "top": return { x: node.x, y: node.y - node.height / 2 - GATE_GAP - gateRadius };
    case "bottom": return { x: node.x, y: node.y + node.height / 2 + GATE_GAP + gateRadius };
    case "left": return { x: node.x - node.width / 2 - GATE_GAP - gateRadius, y: node.y };
    case "right": return { x: node.x + node.width / 2 + GATE_GAP + gateRadius, y: node.y };
  }
}

function gateVector(gate: GateSide): Point {
  switch (gate) {
    case "top": return { x: 0, y: -1 };
    case "bottom": return { x: 0, y: 1 };
    case "left": return { x: -1, y: 0 };
    case "right": return { x: 1, y: 0 };
  }
}

function cubicPoint(a: Point, c1: Point, c2: Point, b: Point, t: number): Point {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return {
    x: uu * u * a.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + tt * t * b.x,
    y: uu * u * a.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + tt * t * b.y,
  };
}

function edgeGeometry(a: Point, b: Point, sourceGate: GateSide, targetGate: GateSide, connectorStyle: "bezier" | "straight"): EdgeGeometry {
  if (connectorStyle === "straight") {
    return { d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`, midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }

  // TheBrain-style connectors are deliberately shallow. Shorter control handles avoid the
  // exaggerated loops produced when lateral displacement is large compared with node spacing.
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const control = Math.max(20, Math.min(108, distance * 0.20));
  const av = gateVector(sourceGate);
  const bv = gateVector(targetGate);
  const c1 = { x: a.x + av.x * control, y: a.y + av.y * control };
  const c2 = { x: b.x + bv.x * control, y: b.y + bv.y * control };
  return {
    d: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`,
    midpoint: cubicPoint(a, c1, c2, b, 0.5),
  };
}

function relationLabel(typeDefinition?: string): string | null {
  const label = typeDefinition?.trim();
  if (!label || GENERIC_RELATION_LABELS.has(label.toLowerCase())) return null;
  return label;
}

function markerFor(head?: string): string | undefined {
  if (!head || head === "none") return undefined;
  if (head === "triangle") return "url(#excalibrain-triangle)";
  if (head === "dot") return "url(#excalibrain-dot)";
  if (head === "bar") return "url(#excalibrain-bar)";
  return "url(#excalibrain-arrow)";
}

function zoneTitle(zone: ScrollZone): string {
  if (zone === "parent") return "Parents";
  if (zone === "child") return "Children";
  if (zone === "left") return "Friends / jumps";
  if (zone === "right") return "Related / challengers";
  return "Siblings";
}

function matchesZoneFilter(node: PositionedNode, filter: string): boolean {
  const q = filter.trim().toLowerCase();
  if (!q) return true;
  return node.label.toLowerCase().includes(q) || node.page.path.toLowerCase().includes(q);
}

function buildZoneDisplayLayout(
  zone: ScrollZone,
  panel: ZoneViewport,
  nodes: PositionedNode[],
  filter: string,
  settings: ExcaliBrainSettings,
): ZoneDisplayLayout {
  const filtering = filter.trim().length > 0;
  const filtered = filtering ? nodes.filter((node) => matchesZoneFilter(node, filter)) : nodes;
  const localPositions = new Map<string, Point>();

  if (!filtering) {
    for (const node of filtered) {
      localPositions.set(node.page.path, { x: node.x - panel.left, y: node.y - panel.contentTop });
    }
    return { nodes: filtered, localPositions, contentHeight: panel.contentHeight, count: filtered.length, filtering };
  }

  // Filtering is a list operation, not a visibility mask. Re-pack matching thoughts so removed
  // items leave no holes in the scroll content. The filter tools occupy the first ~36 px.
  const topPadding = 42;
  const bottomPadding = 16;
  if (zone === "parent" || zone === "child") {
    const columns = zone === "parent"
      ? Math.max(1, Math.min(4, Math.round(settings.parentColumns)))
      : Math.max(1, Math.min(7, Math.round(settings.childColumns)));
    const columnGap = 26;
    const rowGap = 20;
    let y = topPadding;

    for (let start = 0; start < filtered.length; start += columns) {
      const row = filtered.slice(start, start + columns);
      const rowHeight = row.length ? Math.max(...row.map((node) => node.height)) : 0;
      const rowWidth = row.reduce((sum, node) => sum + node.width, 0) + columnGap * Math.max(0, row.length - 1);
      let x = Math.max(8, (panel.width - rowWidth) / 2);
      for (const node of row) {
        localPositions.set(node.page.path, { x: x + node.width / 2, y: y + rowHeight / 2 });
        x += node.width + columnGap;
      }
      y += rowHeight + rowGap;
    }
    const contentHeight = Math.max(panel.height, Math.max(topPadding + bottomPadding, y - (filtered.length ? rowGap : 0) + bottomPadding));
    return { nodes: filtered, localPositions, contentHeight, count: filtered.length, filtering };
  }

  const gap = 20;
  let y = topPadding;
  for (const node of filtered) {
    localPositions.set(node.page.path, { x: node.x - panel.left, y: y + node.height / 2 });
    y += node.height + gap;
  }
  const contentHeight = Math.max(panel.height, Math.max(topPadding + bottomPadding, y - (filtered.length ? gap : 0) + bottomPadding));
  return { nodes: filtered, localPositions, contentHeight, count: filtered.length, filtering };
}

function Edge({
  edge,
  nodes,
  inverseArrowDirection,
  connectorStyle,
  labelBackground,
  highlighted,
  dimmed,
  onHover,
  onLeave,
}: {
  edge: PositionedEdge;
  nodes: Map<string, PositionedNode>;
  inverseArrowDirection: boolean;
  connectorStyle: "bezier" | "straight";
  labelBackground: string;
  highlighted: boolean;
  dimmed: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const source = nodes.get(edge.sourcePath);
  const target = nodes.get(edge.targetPath);
  if (!source || !target) return null;

  const gates = gatesForEdge(edge);
  const a = gatePoint(source, gates.source);
  const b = gatePoint(target, gates.target);
  const geometry = edgeGeometry(a, b, gates.source, gates.target, connectorStyle);
  const style = edge.style;
  const dash = style.strokeStyle === "dashed" ? "7 7" : style.strokeStyle === "dotted" ? "2 6" : undefined;
  const reverse = edge.direction === (inverseArrowDirection ? LinkDirection.TO : LinkDirection.FROM);
  const markerStart = markerFor(reverse ? style.endArrowHead : style.startArrowHead);
  const markerEnd = markerFor(reverse ? style.startArrowHead : style.endArrowHead);
  const baseWidth = style.strokeWidth ?? 1.2;
  const strokeWidth = highlighted ? Math.max(baseWidth + 1.7, 2.8) : baseWidth;
  const stroke = alphaHexToCss(style.strokeColor, "rgba(190,210,235,.52)");
  const label = style.showLabel ? relationLabel(edge.typeDefinition) : null;
  const fontSize = style.fontSize ?? 10;
  const labelWidth = label ? Math.max(20, label.length * fontSize * 0.58 + 10) : 0;
  const labelHeight = fontSize + 6;

  return <g className={`excalibrain-edge${highlighted ? " is-highlighted" : ""}${dimmed ? " is-dimmed" : ""}`}>
    <path
      className="excalibrain-edge-visible"
      d={geometry.d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      markerEnd={markerEnd}
      markerStart={markerStart}
      vectorEffect="non-scaling-stroke"
    />
    <path
      className="excalibrain-edge-hit"
      d={geometry.d}
      fill="none"
      stroke="transparent"
      strokeWidth={Math.max(14, baseWidth + 12)}
      vectorEffect="non-scaling-stroke"
      onPointerEnter={onHover}
      onPointerLeave={onLeave}
    />
    {label && <g className="excalibrain-edge-label-wrap" pointerEvents="none">
      <rect
        x={geometry.midpoint.x - labelWidth / 2}
        y={geometry.midpoint.y - labelHeight / 2}
        width={labelWidth}
        height={labelHeight}
        rx={3}
        fill={labelBackground}
      />
      <text
        className="excalibrain-edge-label"
        x={geometry.midpoint.x}
        y={geometry.midpoint.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={alphaHexToCss(style.textColor, "white")}
        fontSize={fontSize}
      >{label}</text>
    </g>}
  </g>;
}

export function PlexGraph({ plugin, index, settings, activePath, onActivate, onOpen }: {
  plugin: ExcaliBrainPlugin;
  index: GraphIndex;
  settings: ExcaliBrainSettings;
  activePath: string;
  onActivate: (page: GraphPage) => void;
  onOpen: (page: GraphPage) => void;
}) {
  const neighborhood = index.getNeighborhood(activePath);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const scene = useMemo(
    () => neighborhood ? buildScene(neighborhood, index, settings) : { nodes: [], edges: [], zoneViewports: {} },
    [neighborhood, index, settings, layoutRevision],
  );
  const viewport = useRef<HTMLDivElement | null>(null);
  const zoneScrollRefs = useRef<Partial<Record<ScrollZone, HTMLDivElement>>>({});
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [hover, setHover] = useState<HoverState>(null);
  const [zoneScrollTop, setZoneScrollTop] = useState<ScrollValues>({ ...EMPTY_SCROLLS });
  const [zoneFilterOpen, setZoneFilterOpen] = useState<ZoneBooleanMap>({});
  const [zoneFilters, setZoneFilters] = useState<ZoneStringMap>({});
  const [expandedScrollTop, setExpandedScrollTop] = useState<Record<string, number>>({});
  const expandedPreviewTimer = useRef<number | null>(null);
  const [connectDrag, setConnectDrag] = useState<ConnectDrag | null>(null);
  const [nodeDrag, setNodeDrag] = useState<NodeDrag | null>(null);
  const panDrag = useRef<{ pointerId: number; button: number; x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const suppressActivateUntil = useRef(0);
  const layoutSaveTimer = useRef<number | null>(null);
  const sceneLayoutKey = [
    activePath,
    scene.nodes.map((node) => `${node.role}:${node.page.path}`).join("|"),
    ...ZONES.map((zone) => {
      const panel = scene.zoneViewports[zone];
      return panel ? `${zone}:${panel.left}:${panel.top}:${panel.width}:${panel.height}:${panel.contentTop}:${panel.contentHeight}` : `${zone}:-`;
    }),
  ].join("::");

  const fit = () => {
    const el = viewport.current;
    if (!el) return;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const includeRect = (left: number, top: number, right: number, bottom: number) => {
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    };

    for (const node of scene.nodes) {
      const zone = zoneForRole(node.role);
      if (zone && scene.zoneViewports[zone]) continue;
      includeRect(node.x - node.width / 2 - 14, node.y - node.height / 2 - 14, node.x + node.width / 2 + 14, node.y + node.height / 2 + 14);
    }
    for (const zone of ZONES) {
      const panel = scene.zoneViewports[zone];
      if (!panel) continue;
      includeRect(panel.left - 12, panel.top - 12, panel.left + panel.width + 12, panel.top + panel.height + 12);
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      setCamera({ x: el.clientWidth / 2, y: el.clientHeight / 2, scale: 1 });
      return;
    }

    const graphWidth = Math.max(1, maxX - minX);
    const graphHeight = Math.max(1, maxY - minY);
    const padding = 46;
    const availableWidth = Math.max(80, el.clientWidth - padding * 2);
    const availableHeight = Math.max(80, el.clientHeight - padding * 2);
    const maxScale = MAX_ZOOM;
    const scale = Math.max(0.18, Math.min(maxScale, availableWidth / graphWidth, availableHeight / graphHeight));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setCamera({
      scale,
      x: el.clientWidth / 2 - centerX * scale,
      y: el.clientHeight / 2 - centerY * scale,
    });
  };

  const toWorld = (clientX: number, clientY: number): Point => {
    const el = viewport.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: (clientX - rect.left - camera.x) / camera.scale,
      y: (clientY - rect.top - camera.y) / camera.scale,
    };
  };

  useEffect(() => {
    const nextScrolls: ScrollValues = { ...EMPTY_SCROLLS };
    for (const zone of ZONES) nextScrolls[zone] = scene.zoneViewports[zone]?.initialScrollTop ?? 0;
    setZoneScrollTop(nextScrolls);
    setZoneFilterOpen({});
    setZoneFilters({});
    setExpandedScrollTop({});
    setHover(null);
    setConnectDrag(null);
    setNodeDrag(null);
    panDrag.current = null;

    window.setTimeout(() => {
      for (const zone of ZONES) {
        const scrollEl = zoneScrollRefs.current[zone];
        if (scrollEl) scrollEl.scrollTop = nextScrolls[zone];
      }
      if (settings.allowAutozoom) fit();
      else {
        const el = viewport.current;
        if (el) setCamera({ x: el.clientWidth / 2, y: el.clientHeight / 2, scale: 1 });
      }
    }, 0);
  }, [sceneLayoutKey, settings.allowAutozoom]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (settings.allowAutozoom) fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [settings.allowAutozoom]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.(".kplex-zone-scroll, .kplex-expanded-scroll, .modal-container")) return;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      setCamera((c) => {
        const nextScale = Math.max(0.3, Math.min(MAX_ZOOM, c.scale * factor));
        const worldX = (px - c.x) / c.scale;
        const worldY = (py - c.y) / c.scale;
        return { scale: nextScale, x: px - worldX * nextScale, y: py - worldY * nextScale };
      });
    };
    el.addEventListener("wheel", wheel, { passive: true });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  useEffect(() => () => {
    if (layoutSaveTimer.current !== null) window.clearTimeout(layoutSaveTimer.current);
    if (expandedPreviewTimer.current !== null) window.clearTimeout(expandedPreviewTimer.current);
  }, []);

  const scheduleLayoutSave = () => {
    if (layoutSaveTimer.current !== null) window.clearTimeout(layoutSaveTimer.current);
    layoutSaveTimer.current = window.setTimeout(() => {
      layoutSaveTimer.current = null;
      void plugin.saveSettings(false);
    }, 180);
  };

  const zoneDisplayLayouts = useMemo(() => {
    const layouts: Partial<Record<ScrollZone, ZoneDisplayLayout>> = {};
    for (const zone of ZONES) {
      const panel = scene.zoneViewports[zone];
      if (!panel) continue;
      const nodes = scene.nodes.filter((node) => zoneForRole(node.role) === zone);
      layouts[zone] = buildZoneDisplayLayout(zone, panel, nodes, zoneFilters[zone] ?? "", settings);
    }
    return layouts;
  }, [scene.nodes, scene.zoneViewports, zoneFilters, settings.parentColumns, settings.childColumns, layoutRevision]);

  const renderedNodeMap = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    for (const node of scene.nodes) {
      const zone = zoneForRole(node.role);
      const panel = zone ? scene.zoneViewports[zone] : undefined;
      const local = zone ? zoneDisplayLayouts[zone]?.localPositions.get(node.page.path) : undefined;
      let rendered = panel && zone && local
        ? { ...node, x: panel.left + local.x, y: panel.top + local.y - zoneScrollTop[zone] }
        : node;
      if (nodeDrag?.path === node.page.path) rendered = { ...rendered, x: nodeDrag.x, y: nodeDrag.y };
      map.set(node.page.path, rendered);
    }
    return map;
  }, [scene.nodes, scene.zoneViewports, zoneDisplayLayouts, zoneScrollTop, nodeDrag]);

  const visibleNodePaths = useMemo(() => {
    const paths = new Set<string>();
    for (const node of scene.nodes) {
      if (nodeDrag?.path === node.page.path) {
        paths.add(node.page.path);
        continue;
      }
      const zone = zoneForRole(node.role);
      const panel = zone ? scene.zoneViewports[zone] : undefined;
      if (!zone || !panel) {
        paths.add(node.page.path);
        continue;
      }
      if (!zoneDisplayLayouts[zone]?.localPositions.has(node.page.path)) continue;
      const rendered = renderedNodeMap.get(node.page.path);
      if (!rendered) continue;
      const panelBottom = panel.top + panel.height;
      // Connectors only exist while the corresponding clipped node is actually visible.
      if (rendered.y - rendered.height / 2 >= panel.top && rendered.y + rendered.height / 2 <= panelBottom) {
        paths.add(node.page.path);
      }
    }
    return paths;
  }, [scene.nodes, scene.zoneViewports, zoneDisplayLayouts, renderedNodeMap, nodeDrag]);

  const expandedClusters = useMemo<ExpandedCluster[]>(() => {
    if (settings.graphDepth !== 2 || !neighborhood) return [];
    const clusters: ExpandedCluster[] = [];

    for (const baseNode of scene.nodes) {
      if (baseNode.role === "center" || !visibleNodePaths.has(baseNode.page.path)) continue;
      const parent = renderedNodeMap.get(baseNode.page.path);
      if (!parent) continue;

      const relations = index.neighbours(baseNode.page, "child")
        .filter((child) => child.page.path !== neighborhood.center.path)
        .slice(0, settings.maxItemCount);
      if (!relations.length) continue;

      const width = Math.max(220, Math.min(330, parent.width * 1.7));
      const columns = Math.min(3, relations.length);
      const cellWidth = width / Math.max(1, columns);
      const rowHeight = 28;
      const visibleRows = 2;
      const rows = Math.ceil(relations.length / 3);
      const contentHeight = Math.max(rowHeight, rows * rowHeight);
      const viewportHeight = Math.min(contentHeight, visibleRows * rowHeight);
      const scrollTop = Math.max(0, Math.min(expandedScrollTop[parent.page.path] ?? 0, Math.max(0, contentHeight - viewportHeight)));

      const children: ExpandedMiniThought[] = relations.map((relation, indexValue) => {
        const col = indexValue % 3;
        const row = Math.floor(indexValue / 3);
        const style = resolveNodeStyle(relation.page, relation, "child", settings);
        const label = index.titleFor(relation.page);
        const maxChars = Math.min(22, effectiveLabelLimit(settings, style.maxLabelLength ?? 30));
        const shownChars = Math.min(label.length, maxChars);
        const nodeWidth = Math.max(64, Math.min(cellWidth - 8, 34 + shownChars * 3.8));
        return {
          key: `${parent.page.path}::${relation.page.path}::${indexValue}`,
          relation,
          label,
          style,
          localX: (col + 0.5) * (width / 3),
          localY: row * rowHeight + rowHeight / 2,
          width: nodeWidth,
          height: 16,
        };
      });

      clusters.push({
        parent,
        left: parent.x - width / 2,
        top: parent.y + parent.height / 2 + 14,
        width,
        viewportHeight,
        contentHeight,
        scrollTop,
        children,
      });
    }

    return clusters;
  }, [settings.graphDepth, settings.compactingFactor, settings.maxItemCount, neighborhood, scene.nodes, visibleNodePaths, renderedNodeMap, expandedScrollTop, index, layoutRevision]);

  const expandedConnectors = useMemo(() => {
    if (settings.graphDepth !== 2) return [] as Array<{ key: string; d: string; stroke: string; width: number; dash?: string; markerStart?: string; markerEnd?: string }>;
    const connectors: Array<{ key: string; d: string; stroke: string; width: number; dash?: string; markerStart?: string; markerEnd?: string }> = [];
    for (const cluster of expandedClusters) {
      const source = gatePoint(cluster.parent, "bottom");
      for (const child of cluster.children) {
        const childY = cluster.top + child.localY - cluster.scrollTop;
        const childTop = childY - child.height / 2;
        const childBottom = childY + child.height / 2;
        if (childTop < cluster.top || childBottom > cluster.top + cluster.viewportHeight) continue;
        const target = { x: cluster.left + child.localX, y: childTop - 2 };
        const geometry = edgeGeometry(source, target, "bottom", "top", settings.connectorStyle);
        const style = resolveLinkStyle(child.relation, settings);
        const reverse = child.relation.linkDirection === (settings.inverseArrowDirection ? LinkDirection.TO : LinkDirection.FROM);
        connectors.push({
          key: child.key,
          d: geometry.d,
          stroke: alphaHexToCss(style.strokeColor, "rgba(190,210,235,.52)"),
          width: Math.max(0.65, (style.strokeWidth ?? 1.2) * 0.75),
          dash: style.strokeStyle === "dashed" ? "5 5" : style.strokeStyle === "dotted" ? "1.5 5" : undefined,
          markerStart: markerFor(reverse ? style.endArrowHead : style.startArrowHead),
          markerEnd: markerFor(reverse ? style.startArrowHead : style.endArrowHead),
        });
      }
    }
    return connectors;
  }, [expandedClusters, settings.graphDepth, settings.connectorStyle, settings.inverseArrowDirection, settings.baseLinkStyle, settings.hierarchyLinkStyles]);

  const visibleEdges = useMemo(
    () => scene.edges.filter((edge) => visibleNodePaths.has(edge.sourcePath) && visibleNodePaths.has(edge.targetPath)),
    [scene.edges, visibleNodePaths],
  );

  const interaction = useMemo(() => {
    const edgeIds = new Set<string>();
    const nodePaths = new Set<string>();
    const gates = new Set<string>();
    if (!hover) return { edgeIds, nodePaths, gates };

    if (hover.kind === "edge") edgeIds.add(hover.id);
    else if (hover.kind === "node") {
      nodePaths.add(hover.path);
      for (const edge of visibleEdges) if (edge.sourcePath === hover.path || edge.targetPath === hover.path) edgeIds.add(edge.id);
    } else {
      nodePaths.add(hover.path);
      gates.add(gateKey(hover.path, hover.gate));
      for (const edge of visibleEdges) {
        const edgeGates = gatesForEdge(edge);
        if ((edge.sourcePath === hover.path && edgeGates.source === hover.gate) || (edge.targetPath === hover.path && edgeGates.target === hover.gate)) edgeIds.add(edge.id);
      }
    }

    for (const edge of visibleEdges) {
      if (!edgeIds.has(edge.id)) continue;
      const edgeGates = gatesForEdge(edge);
      nodePaths.add(edge.sourcePath);
      nodePaths.add(edge.targetPath);
      gates.add(gateKey(edge.sourcePath, edgeGates.source));
      gates.add(gateKey(edge.targetPath, edgeGates.target));
    }
    return { edgeIds, nodePaths, gates };
  }, [hover, visibleEdges]);

  const connectBlockedPaths = useMemo(() => {
    if (!connectDrag) return new Set<string>();
    const origin = index.get(connectDrag.originPath);
    if (!origin) return new Set<string>();
    const blocked = index.gateNeighbourPaths(origin, connectDrag.gate);
    if (!origin.file || origin.file.extension !== "md") {
      for (const node of scene.nodes) if (!node.page.file || node.page.file.extension !== "md") blocked.add(node.page.path);
    }
    blocked.delete(origin.path);
    return blocked;
  }, [connectDrag, index, scene.nodes]);

  const connectBlockedEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!connectDrag) return ids;
    for (const edge of visibleEdges) {
      const gates = gatesForEdge(edge);
      if ((edge.sourcePath === connectDrag.originPath && gates.source === connectDrag.gate) ||
          (edge.targetPath === connectDrag.originPath && gates.target === connectDrag.gate)) ids.add(edge.id);
    }
    return ids;
  }, [connectDrag, visibleEdges]);

  const startGateDrag = (node: PositionedNode, gate: GateSide, event: PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setHover({ kind: "gate", path: node.page.path, gate });
    setConnectDrag({ originPath: node.page.path, gate, pointerId: event.pointerId, current: toWorld(event.clientX, event.clientY) });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startNodeDrag = (node: PositionedNode, event: PointerEvent<HTMLDivElement>) => {
    // Left-drag keeps the relationship-moving gesture. Middle/right drags bubble to the Plex
    // so every mouse button can pan even when the pointer starts on a thought.
    if (event.button !== 0 || !normalizedRole(node.role)) return;
    event.stopPropagation();
    const world = toWorld(event.clientX, event.clientY);
    const displayed = renderedNodeMap.get(node.page.path) ?? node;
    setNodeDrag({
      path: node.page.path,
      pointerId: event.pointerId,
      offsetX: world.x - displayed.x,
      offsetY: world.y - displayed.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      x: displayed.x,
      y: displayed.y,
      moved: false,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (![0, 1, 2].includes(e.button) || connectDrag || nodeDrag) return;
    const target = e.target as Element;
    if (target.closest(".excalibrain-zoom-controls, .kplex-zone-tools, .kplex-layout-controls, input, select, button")) return;
    if (e.button === 0 && target.closest(".excalibrain-thought")) return;
    const scrollZone = target.closest<HTMLElement>(".kplex-zone-scroll");
    if (e.button === 0 && scrollZone) {
      const rect = scrollZone.getBoundingClientRect();
      if (rect.right - e.clientX <= 12) return; // leave the native scrollbar draggable
    }
    e.preventDefault();
    panDrag.current = { pointerId: e.pointerId, button: e.button, x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (connectDrag) {
      if (e.pointerId !== connectDrag.pointerId) return;
      setConnectDrag((current) => current ? { ...current, current: toWorld(e.clientX, e.clientY) } : null);
      return;
    }
    if (nodeDrag) {
      if (e.pointerId !== nodeDrag.pointerId) return;
      const world = toWorld(e.clientX, e.clientY);
      const moved = nodeDrag.moved || Math.hypot(e.clientX - nodeDrag.startClientX, e.clientY - nodeDrag.startClientY) > 6;
      setNodeDrag((current) => current ? { ...current, x: world.x - current.offsetX, y: world.y - current.offsetY, moved } : null);
      return;
    }
    const drag = panDrag.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    // Snapshot the ref before scheduling state. Never dereference panDrag.current from inside
    // the state updater: pointerup/cancel can clear the ref before React executes the updater.
    const x = drag.cx + e.clientX - drag.x;
    const y = drag.cy + e.clientY - drag.y;
    drag.moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 2;
    setCamera((current) => ({ ...current, x, y }));
  };

  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (connectDrag && e.pointerId === connectDrag.pointerId) {
      const drag = connectDrag;
      const origin = index.get(drag.originPath);
      const hit = e.currentTarget.ownerDocument.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const targetEl = hit?.closest<HTMLElement>("[data-kplex-path]") ?? null;
      const targetGateEl = hit?.closest<HTMLElement>("[data-kplex-gate]") ?? null;
      const targetPath = targetEl?.dataset.kplexPath ?? null;
      const target = targetPath ? index.get(targetPath) : null;
      const targetGate = targetGateEl?.dataset.kplexGate as GateSide | undefined;
      // If the user deliberately drops on a gate, that gate states how the origin is seen from
      // the target. Invert it to obtain the relationship stored from the drag origin's view.
      const semanticRole = targetGate
        ? plugin.inverseGateRole(semanticRoleForGate(targetGate))
        : semanticRoleForGate(drag.gate);
      const fixedTarget = target && target.path !== drag.originPath && !connectBlockedPaths.has(target.path) ? target : undefined;
      setConnectDrag(null);
      setHover(null);
      suppressActivateUntil.current = Date.now() + 180;
      if (origin) {
        plugin.openRelationModal({
          mode: "create",
          origin,
          semanticRole,
          fixedTarget,
          onCommitted: () => setHover(null),
        });
      }
      return;
    }
    if (nodeDrag && e.pointerId === nodeDrag.pointerId) {
      const drag = nodeDrag;
      if (drag.moved) {
        suppressActivateUntil.current = Date.now() + 220;
        const draggedNode = renderedNodeMap.get(drag.path);
        const original = scene.nodes.find((node) => node.page.path === drag.path);
        const center = neighborhood?.center;
        if (draggedNode && original && center) {
          const nextRole = semanticRoleForPosition({ x: draggedNode.x, y: draggedNode.y });
          const currentRole = normalizedRole(original.role);
          if (currentRole && nextRole !== currentRole) {
            plugin.openRelationModal({
              mode: "relink",
              origin: center,
              fixedTarget: original.page,
              existingDirection: original.linkDirection,
              semanticRole: nextRole,
              onCommitted: () => setHover(null),
            });
          }
        }
      }
      setNodeDrag(null);
      return;
    }
    if (panDrag.current?.pointerId === e.pointerId) panDrag.current = null;
  };

  const cancel = (e: PointerEvent<HTMLDivElement>) => {
    if (connectDrag?.pointerId === e.pointerId) {
      setConnectDrag(null);
      setHover(null);
    }
    if (nodeDrag?.pointerId === e.pointerId) setNodeDrag(null);
    if (panDrag.current?.pointerId === e.pointerId) panDrag.current = null;
  };

  if (!neighborhood) return <div className="excalibrain-empty">Select a note to start navigating K-Plex.</div>;

  const connectionStateFor = (node: PositionedNode): ConnectionDragState => {
    if (!connectDrag) return "normal";
    if (node.page.path === connectDrag.originPath) return "origin";
    return connectBlockedPaths.has(node.page.path) ? "blocked" : "candidate";
  };

  const renderNode = (baseNode: PositionedNode, displayNode: PositionedNode) => {
    const highlightedGates = new Set<GateSide>();
    for (const gate of ["top", "bottom", "left", "right"] as GateSide[]) {
      if (interaction.gates.has(gateKey(baseNode.page.path, gate))) highlightedGates.add(gate);
    }
    if (connectDrag?.originPath === baseNode.page.path) highlightedGates.add(connectDrag.gate);

    return <ThoughtNode
      key={`${baseNode.role}:${baseNode.page.path}`}
      node={displayNode}
      settings={settings}
      selected={baseNode.page.path === activePath}
      highlighted={!connectDrag && interaction.nodePaths.has(baseNode.page.path)}
      dimmed={!connectDrag && hover !== null && !interaction.nodePaths.has(baseNode.page.path)}
      highlightedGates={highlightedGates}
      dragging={nodeDrag?.path === baseNode.page.path}
      connectionState={connectionStateFor(baseNode)}
      onActivate={() => { if (Date.now() >= suppressActivateUntil.current) onActivate(baseNode.page); }}
      onOpen={() => { if (Date.now() >= suppressActivateUntil.current) onOpen(baseNode.page); }}
      onHoverNode={() => { if (!connectDrag && !nodeDrag) setHover({ kind: "node", path: baseNode.page.path }); }}
      onHoverGate={(_, gate) => { if (!connectDrag && !nodeDrag) setHover({ kind: "gate", path: baseNode.page.path, gate }); }}
      onHoverEnd={() => { if (!connectDrag && !nodeDrag) setHover(null); }}
      onHoverPreview={(_, targetEl, event) => {
        if (!connectDrag && !nodeDrag) plugin.triggerHoverPreview(baseNode.page, targetEl, event, neighborhood.center.file?.path ?? "");
      }}
      onGatePointerDown={(_, gate, event) => startGateDrag(baseNode, gate, event)}
      onNodePointerDown={(_, event) => startNodeDrag(baseNode, event)}
    />;
  };

  const standardNodes = scene.nodes.filter((node) => {
    const zone = zoneForRole(node.role);
    return !zone || !scene.zoneViewports[zone];
  });
  const draggedBaseNode = nodeDrag ? scene.nodes.find((node) => node.page.path === nodeDrag.path) ?? null : null;
  const dragOrigin = connectDrag ? renderedNodeMap.get(connectDrag.originPath) : null;
  const dragPath = dragOrigin && connectDrag
    ? edgeGeometry(gatePoint(dragOrigin, connectDrag.gate), connectDrag.current, connectDrag.gate, oppositeGate(connectDrag.gate), settings.connectorStyle).d
    : null;

  const renderScrollZone = (zone: ScrollZone, panel: ZoneViewport) => {
    const allNodes = scene.nodes.filter((node) => zoneForRole(node.role) === zone && nodeDrag?.path !== node.page.path);
    const filter = zoneFilters[zone] ?? "";
    const layout = zoneDisplayLayouts[zone] ?? buildZoneDisplayLayout(zone, panel, allNodes, filter, settings);
    const displayedNodes = layout.nodes.filter((node) => nodeDrag?.path !== node.page.path);
    return <div
      key={zone}
      className={`kplex-zone-panel kplex-zone-${zone}`}
      style={{ left: panel.left, top: panel.top, width: panel.width, height: panel.height }}
    >
      <div className="kplex-zone-tools" onPointerDown={(event: PointerEvent<HTMLDivElement>) => event.stopPropagation()}>
        {zoneFilterOpen[zone] && <input
          className="kplex-zone-filter-input"
          type="text"
          value={filter}
          placeholder={`Filter ${zoneTitle(zone).toLowerCase()}…`}
          aria-label={`Filter ${zoneTitle(zone)}`}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const value = event.currentTarget.value;
            setZoneFilters((current) => ({ ...current, [zone]: value }));
            const scrollEl = zoneScrollRefs.current[zone];
            if (scrollEl) scrollEl.scrollTop = 0;
            setZoneScrollTop((current) => ({ ...current, [zone]: 0 }));
          }}
          onPointerDown={(event: PointerEvent<HTMLInputElement>) => event.stopPropagation()}
          autoFocus
        />}
        <span className="kplex-zone-filter-control">
          <span className="kplex-zone-count" aria-label={`${layout.count} ${zoneTitle(zone).toLowerCase()}`}>{layout.count}</span>
          <button
            className={`kplex-zone-filter-button${zoneFilterOpen[zone] ? " is-on" : ""}`}
            title={`Filter ${zoneTitle(zone)}`}
            aria-label={`Filter ${zoneTitle(zone)}`}
            onPointerDown={(event: PointerEvent<HTMLButtonElement>) => event.stopPropagation()}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              const closing = Boolean(zoneFilterOpen[zone]);
              setZoneFilterOpen((current) => ({ ...current, [zone]: !current[zone] }));
              if (closing) {
                setZoneFilters((current) => ({ ...current, [zone]: "" }));
                const scrollEl = zoneScrollRefs.current[zone];
                if (scrollEl) scrollEl.scrollTop = 0;
                setZoneScrollTop((current) => ({ ...current, [zone]: 0 }));
              }
            }}
          ><ObsidianIcon name="filter" size={13} /></button>
        </span>
      </div>
      <div
        ref={(element: HTMLDivElement | null) => { zoneScrollRefs.current[zone] = element ?? undefined; }}
        className="kplex-zone-scroll"
        onScroll={(event: { currentTarget: HTMLDivElement }) => {
          const scrollTop = event.currentTarget.scrollTop;
          setZoneScrollTop((current) => ({ ...current, [zone]: scrollTop }));
        }}
      >
        <div className="kplex-zone-content" style={{ height: layout.contentHeight }}>
          {displayedNodes.map((node) => {
            const local = layout.localPositions.get(node.page.path);
            if (!local) return null;
            return renderNode(node, { ...node, x: local.x, y: local.y });
          })}
        </div>
      </div>
    </div>;
  };

  const renderExpandedCluster = (cluster: ExpandedCluster) => {
    const scrollable = cluster.contentHeight > cluster.viewportHeight + 0.5;
    return <div
      key={`expanded:${cluster.parent.page.path}`}
      className="kplex-expanded-cluster"
      style={{ left: cluster.left, top: cluster.top, width: cluster.width, height: cluster.viewportHeight }}
      onPointerDown={(event: PointerEvent<HTMLDivElement>) => event.stopPropagation()}
    >
      <div
        className={`kplex-expanded-scroll${scrollable ? " is-scrollable" : ""}`}
        onScroll={(event: { currentTarget: HTMLDivElement }) => {
          const scrollTop = event.currentTarget.scrollTop;
          setExpandedScrollTop((current) => ({ ...current, [cluster.parent.page.path]: scrollTop }));
        }}
      >
        <div className="kplex-expanded-content" style={{ height: cluster.contentHeight }}>
          {cluster.children.map((child) => {
            const maxChars = Math.min(22, effectiveLabelLimit(settings, child.style.maxLabelLength ?? 30));
            const text = child.label.length > maxChars ? `${child.label.slice(0, Math.max(1, maxChars - 1))}…` : child.label;
            return <div
              key={child.key}
              className="kplex-expanded-mini-thought"
              style={{
                left: child.localX - child.width / 2,
                top: child.localY - child.height / 2,
                width: child.width,
                height: child.height,
                background: alphaHexToCss(child.style.backgroundColor, "rgba(0,0,0,.42)"),
                color: alphaHexToCss(child.style.textColor, "white"),
                borderColor: alphaHexToCss(child.style.borderColor, "rgba(255,255,255,.18)"),
              }}
              title={`${child.label} — ${child.relation.page.path}`}
              onClick={(event: MouseEvent<HTMLDivElement>) => { event.stopPropagation(); onActivate(child.relation.page); }}
              onDoubleClick={(event: MouseEvent<HTMLDivElement>) => { event.stopPropagation(); onOpen(child.relation.page); }}
              onPointerEnter={(event: PointerEvent<HTMLDivElement>) => {
                if (expandedPreviewTimer.current !== null) window.clearTimeout(expandedPreviewTimer.current);
                const target = event.currentTarget;
                const nativeEvent = event.nativeEvent;
                expandedPreviewTimer.current = window.setTimeout(() => {
                  expandedPreviewTimer.current = null;
                  plugin.triggerHoverPreview(child.relation.page, target, nativeEvent, neighborhood?.center.file?.path ?? "");
                }, 1000);
              }}
              onPointerLeave={() => {
                if (expandedPreviewTimer.current !== null) window.clearTimeout(expandedPreviewTimer.current);
                expandedPreviewTimer.current = null;
              }}
            >
              <span className="kplex-expanded-mini-gate" />
              {child.style.icon && <ObsidianIcon name={child.style.icon} size={8} className="kplex-expanded-mini-icon" />}
              <span className="kplex-expanded-mini-label">{text}</span>
            </div>;
          })}
        </div>
      </div>
    </div>;
  };

  const columnPresetIndex = COLUMN_PRESETS.reduce((best, pair, indexValue) => {
    const bestPair = COLUMN_PRESETS[best];
    const score = Math.abs(pair[0] - settings.parentColumns) + Math.abs(pair[1] - settings.childColumns);
    const bestScore = Math.abs(bestPair[0] - settings.parentColumns) + Math.abs(bestPair[1] - settings.childColumns);
    return score < bestScore ? indexValue : best;
  }, 0);

  return <div
    ref={viewport}
    className="excalibrain-plex"
    style={{ background: alphaHexToCss(settings.backgroundColor, "#0c2233") }}
    onPointerDown={down}
    onPointerMove={move}
    onPointerUp={up}
    onPointerCancel={cancel}
    onContextMenu={(event: MouseEvent<HTMLDivElement>) => event.preventDefault()}
  >
    <div className="excalibrain-camera" style={{ transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})` }}>
      <svg className="excalibrain-links" width="3200" height="2400" viewBox="-1600 -1200 3200 2400">
        <defs>
          <marker id="excalibrain-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M1,1 L8,4.5 L1,8" fill="none" stroke="context-stroke" strokeWidth="1.4" /></marker>
          <marker id="excalibrain-triangle" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0 L9,4.5 L0,9 z" fill="context-stroke" /></marker>
          <marker id="excalibrain-dot" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth"><circle cx="4" cy="4" r="2.6" fill="context-stroke" /></marker>
          <marker id="excalibrain-bar" markerWidth="8" markerHeight="10" refX="4" refY="5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M4,1 L4,9" stroke="context-stroke" strokeWidth="1.8" /></marker>
        </defs>
        {visibleEdges.map((edge) => <Edge
          key={edge.id}
          edge={edge}
          nodes={renderedNodeMap}
          inverseArrowDirection={settings.inverseArrowDirection}
          connectorStyle={settings.connectorStyle}
          labelBackground={alphaHexToCss(settings.backgroundColor, "#0c3e6a")}
          highlighted={!connectDrag && interaction.edgeIds.has(edge.id)}
          dimmed={connectDrag ? connectBlockedEdgeIds.has(edge.id) : hover !== null && !interaction.edgeIds.has(edge.id)}
          onHover={() => { if (!connectDrag && !nodeDrag) setHover({ kind: "edge", id: edge.id }); }}
          onLeave={() => { if (!connectDrag && !nodeDrag) setHover(null); }}
        />)}
        {expandedConnectors.map((connector) => <path
          key={`expanded-edge:${connector.key}`}
          className="kplex-expanded-edge"
          d={connector.d}
          fill="none"
          stroke={connector.stroke}
          strokeWidth={connector.width}
          strokeDasharray={connector.dash}
          markerStart={connector.markerStart}
          markerEnd={connector.markerEnd}
          vectorEffect="non-scaling-stroke"
        />)}
        {dragPath && <path className="kplex-drag-connector" d={dragPath} fill="none" vectorEffect="non-scaling-stroke" />}
      </svg>

      <div className="excalibrain-nodes">
        {standardNodes.filter((node) => nodeDrag?.path !== node.page.path).map((node) => renderNode(node, renderedNodeMap.get(node.page.path) ?? node))}
        {ZONES.map((zone) => {
          const panel = scene.zoneViewports[zone];
          return panel ? renderScrollZone(zone, panel) : null;
        })}
        {settings.graphDepth === 2 && expandedClusters.map(renderExpandedCluster)}
        {draggedBaseNode && renderNode(draggedBaseNode, renderedNodeMap.get(draggedBaseNode.page.path) ?? draggedBaseNode)}
      </div>
    </div>

    <div className="kplex-layout-controls" onPointerDown={(event: PointerEvent<HTMLDivElement>) => event.stopPropagation()}>
      <label className="kplex-mini-slider" title={`Compactness ${settings.compactingFactor.toFixed(2)}`}>
        <input
          type="range"
          min="0.75"
          max="3"
          step="0.05"
          value={settings.compactingFactor}
          aria-label="Compactness"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            settings.compactingFactor = Number(event.currentTarget.value);
            setLayoutRevision((value) => value + 1);
            scheduleLayoutSave();
          }}
        />
        <span>compact</span>
      </label>
      <label className="kplex-mini-slider" title={`${COLUMN_PRESETS[columnPresetIndex][0]} parent / ${COLUMN_PRESETS[columnPresetIndex][1]} child columns`}>
        <input
          type="range"
          min="0"
          max={String(COLUMN_PRESETS.length - 1)}
          step="1"
          value={columnPresetIndex}
          aria-label="Parent and child columns"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const preset = COLUMN_PRESETS[Math.max(0, Math.min(COLUMN_PRESETS.length - 1, Number(event.currentTarget.value)))] ?? COLUMN_PRESETS[0];
            settings.parentColumns = preset[0];
            settings.childColumns = preset[1];
            setLayoutRevision((value) => value + 1);
            scheduleLayoutSave();
          }}
        />
        <span>columns</span>
      </label>
    </div>

    <div className="excalibrain-zoom-controls">
      <button title="Zoom in" aria-label="Zoom in" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setCamera((c) => ({ ...c, scale: Math.min(MAX_ZOOM, c.scale * 1.15) })); }}><ObsidianIcon name="zoom-in" size={16} /></button>
      <button title="Zoom out" aria-label="Zoom out" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setCamera((c) => ({ ...c, scale: Math.max(.3, c.scale / 1.15) })); }}><ObsidianIcon name="zoom-out" size={16} /></button>
      <button title="Fit graph" aria-label="Fit graph" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); fit(); }}><ObsidianIcon name="focus" size={16} /></button>
    </div>
  </div>;
}
