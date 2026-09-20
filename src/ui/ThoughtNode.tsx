import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import type { GateSide, PositionedNode } from "../types";
import { alphaHexToCss } from "../index/style";
import type { ExcaliBrainSettings } from "../settings";
import { gateDiameter } from "./layout";

const GATES: GateSide[] = ["top", "bottom", "left", "right"];

export function ThoughtNode({
  node,
  settings,
  selected,
  highlighted,
  dimmed,
  highlightedGates,
  onActivate,
  onOpen,
  onHoverNode,
  onHoverGate,
  onHoverEnd,
}: {
  node: PositionedNode;
  settings: ExcaliBrainSettings;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  highlightedGates: ReadonlySet<GateSide>;
  onActivate: (node: PositionedNode) => void;
  onOpen: (node: PositionedNode) => void;
  onHoverNode: (node: PositionedNode) => void;
  onHoverGate: (node: PositionedNode, gate: GateSide) => void;
  onHoverEnd: () => void;
}) {
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
  ].filter(Boolean).join(" ");

  return <div
    className={classes}
    style={nodeCss}
    onPointerDown={(e: PointerEvent<HTMLDivElement>) => e.stopPropagation()}
    onPointerEnter={() => onHoverNode(node)}
    onPointerLeave={onHoverEnd}
    onClick={click}
    onDoubleClick={(e: MouseEvent<HTMLDivElement>) => { e.stopPropagation(); onOpen(node); }}
    title={`${node.label}\n${node.page.path}`}
  >
    <span className="excalibrain-thought-label">{display}</span>
    {settings.showNeighborCount && node.neighbourCount > 0 && <span className="excalibrain-count">{node.neighbourCount}</span>}
    {GATES.map((gate) => <span
      key={gate}
      className={`excalibrain-gate gate-${gate}${highlightedGates.has(gate) ? " is-highlighted" : ""}`}
      onPointerEnter={(e: PointerEvent<HTMLSpanElement>) => { e.stopPropagation(); onHoverGate(node, gate); }}
      onPointerLeave={(e: PointerEvent<HTMLSpanElement>) => { e.stopPropagation(); onHoverNode(node); }}
      onPointerDown={(e: PointerEvent<HTMLSpanElement>) => e.stopPropagation()}
      onClick={(e: MouseEvent<HTMLSpanElement>) => e.stopPropagation()}
      title={`${gate} gate`}
    />)}
  </div>;
}
