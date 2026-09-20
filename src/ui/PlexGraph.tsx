import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { GraphIndex } from "../index/GraphIndex";
import type { ExcaliBrainSettings } from "../settings";
import type { GateSide, GraphPage, PositionedEdge, PositionedNode } from "../types";
import { LinkDirection } from "../types";
import { alphaHexToCss } from "../index/style";
import { buildScene, gateDiameter } from "./layout";
import { ThoughtNode } from "./ThoughtNode";

type Point = { x: number; y: number };
type HoverState =
  | { kind: "node"; path: string }
  | { kind: "gate"; path: string; gate: GateSide }
  | { kind: "edge"; id: string }
  | null;

type EdgeGates = { source: GateSide; target: GateSide };

const GATE_GAP = 3;
const gateKey = (path: string, gate: GateSide) => `${path}::${gate}`;

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

function edgePath(a: Point, b: Point, sourceGate: GateSide, targetGate: GateSide, connectorStyle: "bezier" | "straight"): string {
  if (connectorStyle === "straight") return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;

  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const control = Math.max(34, Math.min(180, distance * 0.42));
  const av = gateVector(sourceGate);
  const bv = gateVector(targetGate);
  const c1 = { x: a.x + av.x * control, y: a.y + av.y * control };
  const c2 = { x: b.x + bv.x * control, y: b.y + bv.y * control };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
}

function markerFor(head?: string): string | undefined {
  if (!head || head === "none") return undefined;
  if (head === "triangle") return "url(#excalibrain-triangle)";
  if (head === "dot") return "url(#excalibrain-dot)";
  if (head === "bar") return "url(#excalibrain-bar)";
  return "url(#excalibrain-arrow)";
}

function Edge({
  edge,
  nodes,
  inverseArrowDirection,
  connectorStyle,
  highlighted,
  dimmed,
  onHover,
  onLeave,
}: {
  edge: PositionedEdge;
  nodes: Map<string, PositionedNode>;
  inverseArrowDirection: boolean;
  connectorStyle: "bezier" | "straight";
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
  const d = edgePath(a, b, gates.source, gates.target, connectorStyle);
  const style = edge.style;
  const dash = style.strokeStyle === "dashed" ? "7 7" : style.strokeStyle === "dotted" ? "2 6" : undefined;

  // Preserve the legacy arrow-direction rule without reversing the geometry. This keeps every
  // connector physically attached to the correct gate while still moving arrowheads as before.
  const reverse = edge.direction === (inverseArrowDirection ? LinkDirection.TO : LinkDirection.FROM);
  const markerStart = markerFor(reverse ? style.endArrowHead : style.startArrowHead);
  const markerEnd = markerFor(reverse ? style.startArrowHead : style.endArrowHead);
  const baseWidth = style.strokeWidth ?? 1.2;
  const strokeWidth = highlighted ? Math.max(baseWidth + 1.7, 2.8) : baseWidth;
  const stroke = alphaHexToCss(style.strokeColor, "rgba(190,210,235,.52)");

  return <g className={`excalibrain-edge${highlighted ? " is-highlighted" : ""}${dimmed ? " is-dimmed" : ""}`}>
    <path
      className="excalibrain-edge-visible"
      d={d}
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
      d={d}
      fill="none"
      stroke="transparent"
      strokeWidth={Math.max(14, baseWidth + 12)}
      vectorEffect="non-scaling-stroke"
      onPointerEnter={onHover}
      onPointerLeave={onLeave}
    />
    {style.showLabel && edge.typeDefinition && <text
      className="excalibrain-edge-label"
      x={(a.x + b.x) / 2}
      y={(a.y + b.y) / 2 - 5}
      fill={alphaHexToCss(style.textColor, "white")}
      fontSize={style.fontSize ?? 10}
    >{edge.typeDefinition}</text>}
  </g>;
}

export function PlexGraph({ index, settings, activePath, onActivate, onOpen }: {
  index: GraphIndex;
  settings: ExcaliBrainSettings;
  activePath: string;
  onActivate: (page: GraphPage) => void;
  onOpen: (page: GraphPage) => void;
}) {
  const neighborhood = index.getNeighborhood(activePath);
  const scene = useMemo(
    () => neighborhood ? buildScene(neighborhood, index, settings) : { nodes: [], edges: [], siblingViewport: null },
    [neighborhood, index, settings],
  );
  const viewport = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [hover, setHover] = useState<HoverState>(null);
  const [siblingScrollTop, setSiblingScrollTop] = useState(0);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const fit = () => {
    const el = viewport.current;
    if (!el) return;
    setCamera({ x: el.clientWidth / 2, y: el.clientHeight / 2, scale: Math.min(1, settings.maxZoom || 1) });
  };

  useEffect(() => {
    setSiblingScrollTop(0);
    setHover(null);
    if (settings.allowAutozoom) fit();
    else {
      const el = viewport.current;
      if (el) setCamera({ x: el.clientWidth / 2, y: el.clientHeight / 2, scale: Math.min(1, settings.maxZoom || 1) });
    }
  }, [activePath, settings.allowAutozoom, settings.maxZoom]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.(".excalibrain-sibling-scroll")) return;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      setCamera((c) => {
        const nextScale = Math.max(0.3, Math.min(settings.maxZoom || 1.8, c.scale * factor));
        const worldX = (px - c.x) / c.scale;
        const worldY = (py - c.y) / c.scale;
        return { scale: nextScale, x: px - worldX * nextScale, y: py - worldY * nextScale };
      });
    };
    el.addEventListener("wheel", wheel, { passive: true });
    return () => el.removeEventListener("wheel", wheel);
  }, [settings.maxZoom]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as Element;
    if (target.closest(".excalibrain-thought, .excalibrain-zoom-controls, .excalibrain-sibling-scroll, .excalibrain-edge-hit")) return;
    drag.current = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setCamera((c) => ({ ...c, x: drag.current!.cx + e.clientX - drag.current!.x, y: drag.current!.cy + e.clientY - drag.current!.y }));
  };
  const up = () => { drag.current = null; };

  const renderedNodeMap = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    for (const node of scene.nodes) {
      map.set(node.page.path, node.role === "sibling" ? { ...node, y: node.y - siblingScrollTop } : node);
    }
    return map;
  }, [scene.nodes, siblingScrollTop]);

  const visibleEdges = useMemo(() => scene.edges.filter((edge) => {
    if (edge.role !== "sibling" || !scene.siblingViewport) return true;
    const target = renderedNodeMap.get(edge.targetPath);
    if (!target) return false;
    const top = scene.siblingViewport.top;
    const bottom = top + scene.siblingViewport.height;
    return target.y + target.height / 2 >= top && target.y - target.height / 2 <= bottom;
  }), [scene.edges, scene.siblingViewport, renderedNodeMap]);

  const interaction = useMemo(() => {
    const edgeIds = new Set<string>();
    const nodePaths = new Set<string>();
    const gates = new Set<string>();

    if (!hover) return { edgeIds, nodePaths, gates };

    if (hover.kind === "edge") {
      edgeIds.add(hover.id);
    } else if (hover.kind === "node") {
      nodePaths.add(hover.path);
      for (const edge of visibleEdges) {
        if (edge.sourcePath === hover.path || edge.targetPath === hover.path) edgeIds.add(edge.id);
      }
    } else {
      nodePaths.add(hover.path);
      gates.add(gateKey(hover.path, hover.gate));
      for (const edge of visibleEdges) {
        const edgeGates = gatesForEdge(edge);
        const matchesSource = edge.sourcePath === hover.path && edgeGates.source === hover.gate;
        const matchesTarget = edge.targetPath === hover.path && edgeGates.target === hover.gate;
        if (matchesSource || matchesTarget) edgeIds.add(edge.id);
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

  if (!neighborhood) return <div className="excalibrain-empty">Select a note to start navigating K-Plex.</div>;

  const renderNode = (node: PositionedNode) => {
    const highlightedGates = new Set<GateSide>();
    for (const gate of ["top", "bottom", "left", "right"] as GateSide[]) {
      if (interaction.gates.has(gateKey(node.page.path, gate))) highlightedGates.add(gate);
    }
    return <ThoughtNode
      key={`${node.role}:${node.page.path}`}
      node={node}
      settings={settings}
      selected={node.page.path === activePath}
      highlighted={interaction.nodePaths.has(node.page.path)}
      dimmed={hover !== null && !interaction.nodePaths.has(node.page.path)}
      highlightedGates={highlightedGates}
      onActivate={(n) => onActivate(n.page)}
      onOpen={(n) => onOpen(n.page)}
      onHoverNode={(n) => setHover({ kind: "node", path: n.page.path })}
      onHoverGate={(n, gate) => setHover({ kind: "gate", path: n.page.path, gate })}
      onHoverEnd={() => setHover(null)}
    />;
  };

  const standardNodes = scene.nodes.filter((node) => node.role !== "sibling");
  const siblingNodes = scene.nodes.filter((node) => node.role === "sibling");

  return <div
    ref={viewport}
    className="excalibrain-plex"
    style={{ background: alphaHexToCss(settings.backgroundColor, "#0c2233") }}
    onPointerDown={down}
    onPointerMove={move}
    onPointerUp={up}
    onPointerLeave={up}
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
          highlighted={interaction.edgeIds.has(edge.id)}
          dimmed={hover !== null && !interaction.edgeIds.has(edge.id)}
          onHover={() => setHover({ kind: "edge", id: edge.id })}
          onLeave={() => setHover(null)}
        />)}
      </svg>

      <div className="excalibrain-nodes">
        {standardNodes.map(renderNode)}
        {scene.siblingViewport && siblingNodes.length > 0 && <div
          className="excalibrain-sibling-scroll"
          style={{
            left: scene.siblingViewport.left,
            top: scene.siblingViewport.top,
            width: scene.siblingViewport.width,
            height: scene.siblingViewport.height,
          }}
          onPointerDown={(e: PointerEvent<HTMLDivElement>) => e.stopPropagation()}
          onScroll={(e: { currentTarget: HTMLDivElement }) => setSiblingScrollTop(e.currentTarget.scrollTop)}
          title="Siblings"
        >
          <div className="excalibrain-sibling-content" style={{ height: scene.siblingViewport.contentHeight }}>
            {siblingNodes.map((node) => renderNode({
              ...node,
              x: node.x - scene.siblingViewport!.left,
              y: node.y - scene.siblingViewport!.top,
            }))}
          </div>
        </div>}
      </div>
    </div>

    <div className="excalibrain-zoom-controls">
      <button onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setCamera((c) => ({ ...c, scale: Math.min(settings.maxZoom || 1.8, c.scale * 1.15) })); }}>+</button>
      <button onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setCamera((c) => ({ ...c, scale: Math.max(.3, c.scale / 1.15) })); }}>−</button>
      <button onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); fit(); }}>◎</button>
    </div>
  </div>;
}
