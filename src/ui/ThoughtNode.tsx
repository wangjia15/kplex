import { useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import type { GateSide, PositionedNode } from "../types";
import { alphaHexToCss } from "../index/style";
import type { ExcaliBrainSettings } from "../settings";
import { gateDiameter } from "./layout";
import { ObsidianIcon } from "./ObsidianIcon";

const GATES: GateSide[] = ["top", "bottom", "left", "right"];
export type ConnectionDragState = "normal" | "candidate" | "blocked" | "origin";

export function ThoughtNode({
  node,
  settings,
  selected,
  highlighted,
  dimmed,
  highlightedGates,
  dragging,
  connectionState = "normal",
  onActivate,
  onOpen,
  onHoverNode,
  onHoverGate,
  onHoverEnd,
  onHoverPreview,
  onGatePointerDown,
  onNodePointerDown,
}: {
  node: PositionedNode;
  settings: ExcaliBrainSettings;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  highlightedGates: ReadonlySet<GateSide>;
  dragging?: boolean;
  connectionState?: ConnectionDragState;
  onActivate: (node: PositionedNode) => void;
  onOpen: (node: PositionedNode) => void;
  onHoverNode: (node: PositionedNode) => void;
  onHoverGate: (node: PositionedNode, gate: GateSide) => void;
  onHoverEnd: () => void;
  onHoverPreview: (node: PositionedNode, target: HTMLElement, event: globalThis.PointerEvent) => void;
  onGatePointerDown: (node: PositionedNode, gate: GateSide, event: PointerEvent<HTMLSpanElement>) => void;
  onNodePointerDown: (node: PositionedNode, event: PointerEvent<HTMLDivElement>) => void;
}) {
  const previewTimer = useRef<number | null>(null);
  const style = node.style;
  const strokeStyle = style.strokeStyle === "dashed" ? "dashed" : style.strokeStyle === "dotted" ? "dotted" : "solid";
  const prefix = style.prefix ?? "";
  const label = `${prefix}${node.label}`;
  const max = style.maxLabelLength ?? 30;
  const display = label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label;
  const click = (e: MouseEvent) => { e.stopPropagation(); onActivate(node); };
  const fill = alphaHexToCss(style.backgroundColor, "rgba(0,0,0,.42)");
  const pattern = style.fillStyle === "hachure"
    ? `repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 1px, transparent 1px 6px), ${fill}`
    : style.fillStyle === "cross-hatch"
      ? `repeating-linear-gradient(45deg, rgba(255,255,255,.06) 0 1px, transparent 1px 7px), repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 1px, transparent 1px 7px), ${fill}`
      : fill;
  const gateSize = gateDiameter(style);
  const nodeCss = {
    left: node.x - node.width / 2,
    top: node.y - node.height / 2,
    width: node.width,
    height: node.height,
    background: pattern,
    color: alphaHexToCss(style.textColor, "white"),
    borderColor: alphaHexToCss(style.borderColor, "rgba(255,255,255,.18)"),
    borderWidth: `${style.strokeWidth ?? 1}px`,
    borderStyle: strokeStyle,
    borderRadius: style.strokeShaprness === "sharp" ? 5 : node.role === "center" ? 18 : 12,
    fontSize: `${node.role === "center" ? Math.max(13, Math.min(24, (style.fontSize ?? 18) * 0.72)) : Math.max(10, Math.min(16, (style.fontSize ?? 18) * 0.62))}px`,
    "--kplex-gate-size": `${gateSize}px`,
    "--kplex-gate-stroke": alphaHexToCss(style.gateStrokeColor, "rgba(226,239,255,.84)"),
    "--kplex-gate-fill": alphaHexToCss(style.gateBackgroundColor, "rgba(226,239,255,.84)"),
  } as CSSProperties;

  const classes = [
    "excalibrain-thought",
    `excalibrain-role-${node.role}`,
    selected ? "is-selected" : "",
    highlighted ? "is-highlighted" : "",
    dimmed ? "is-dimmed" : "",
    dragging ? "is-dragging" : "",
    connectionState !== "normal" ? `is-connect-${connectionState}` : "",
  ].filter(Boolean).join(" ");

  const clearPreview = () => {
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current);
    previewTimer.current = null;
  };

  useEffect(() => () => clearPreview(), []);

  return <div
    className={classes}
    style={nodeCss}
    data-kplex-path={node.page.path}
    onPointerDown={(e: PointerEvent<HTMLDivElement>) => { clearPreview(); onNodePointerDown(node, e); }}
    onPointerEnter={(e: PointerEvent<HTMLDivElement>) => {
      onHoverNode(node);
      clearPreview();
      const target = e.currentTarget;
      const nativeEvent = e.nativeEvent;
      previewTimer.current = window.setTimeout(() => {
        previewTimer.current = null;
        onHoverPreview(node, target, nativeEvent);
      }, 1000);
    }}
    onPointerLeave={() => { clearPreview(); onHoverEnd(); }}
    onClick={click}
    onDoubleClick={(e: MouseEvent<HTMLDivElement>) => { e.stopPropagation(); onOpen(node); }}
    aria-label={`${node.label} — ${node.page.path}`}
  >
    <span className="excalibrain-thought-label">
      {style.icon && <ObsidianIcon name={style.icon} size={node.role === "center" ? 18 : 13} className="excalibrain-node-icon" />}
      <span>{display}</span>
    </span>
    {GATES.map((gate) => {
      const stat = node.gateStats[gate];
      return <span key={gate} className={`excalibrain-gate-wrap gate-wrap-${gate}`}>
        <span
          className={`excalibrain-gate gate-${gate}${stat.hasAny ? " has-connections" : " is-empty"}${highlightedGates.has(gate) ? " is-highlighted" : ""}`}
          data-kplex-gate={gate}
          onPointerEnter={(e: PointerEvent<HTMLSpanElement>) => { e.stopPropagation(); onHoverGate(node, gate); }}
          onPointerLeave={(e: PointerEvent<HTMLSpanElement>) => { e.stopPropagation(); onHoverNode(node); }}
          onPointerDown={(e: PointerEvent<HTMLSpanElement>) => { clearPreview(); onGatePointerDown(node, gate, e); }}
          onClick={(e: MouseEvent<HTMLSpanElement>) => e.stopPropagation()}
          title={`${gate} gate${stat.hasAny ? ` · ${stat.visibleCount} visible` : " · no relationships"}`}
        />
        {settings.showNeighborCount && stat.visibleCount > 0 && <span className="excalibrain-gate-count">{stat.visibleCount}</span>}
      </span>;
    })}
  </div>;
}
