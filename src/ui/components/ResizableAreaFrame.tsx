/**
 * Portable frame for a bounded canvas region. The host owns pointer capture,
 * coordinate conversion and persistence; this component supplies a reusable
 * visual boundary and independent keyboard-accessible dimension controls.
 */
import type { KeyboardEvent } from "react";

type WidthControl = Readonly<{edge: "left" | "right"; label: string; value: number; min: number; max: number; onChange: (width: number) => void}>;

/** Physical arrow direction matches the declared edge; only width uses Shift for one-unit precision. */
function resizeKey(event: KeyboardEvent<HTMLDivElement>, axis: "height" | "width", edge: "top" | "bottom" | "left" | "right",
  value: number, min: number, max: number, changed: (value: number) => void): void {
  let next: number;
  if (event.key === "Home") next = min;
  else if (event.key === "End") next = max;
  else {
    const negative = axis === "height" ? "ArrowUp" : "ArrowLeft", positive = axis === "height" ? "ArrowDown" : "ArrowRight";
    if (event.key !== negative && event.key !== positive) return;
    const direction = event.key === negative ? -1 : 1, sign = edge === "top" || edge === "left" ? -1 : 1;
    next = value + direction * sign * (axis === "width" && event.shiftKey ? 1 : 10);
  }
  event.preventDefault();event.stopPropagation();changed(Math.max(min, Math.min(max, next)));
}

/** Render a region boundary and expose its current height when editing is enabled. */
export function ResizableAreaFrame({ className, left, top, width, height, shapePath, edge, editing, heightEditing = editing, widthControl, label, value, min, max, onHeightChange }: {
  className: string;
  left: number;
  top: number;
  width: number;
  height: number;
  shapePath?: string;
  edge: "top" | "bottom";
  editing: boolean;
  heightEditing?: boolean;
  widthControl?: WidthControl;
  label: string;
  value: number;
  min: number;
  max: number;
  onHeightChange: (height: number) => void;
}) {
  return <div className={`${className}${shapePath ? " is-shaped-area" : ""}`} style={{ left, top, width, height }}>
    {shapePath && <svg className="kplex-area-shape" viewBox={`${left} ${top} ${width} ${height}`} aria-hidden="true" focusable="false">
      <path d={shapePath} fillRule="evenodd" vectorEffect="non-scaling-stroke" />
    </svg>}
    {heightEditing && <div
      className="kplex-area-keyboard-handle is-height-handle"
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onKeyDown={/** Existing height arrows retain their physical top/bottom meaning. */ event => resizeKey(event, "height", edge, value, min, max, onHeightChange)}
    />}
    {editing && widthControl && <div
      className={`kplex-area-keyboard-handle is-width-handle is-edge-${widthControl.edge}`}
      role="separator" tabIndex={0} aria-label={widthControl.label} aria-orientation="vertical"
      aria-valuemin={widthControl.min} aria-valuemax={widthControl.max} aria-valuenow={widthControl.value}
      onKeyDown={/** Horizontal arrows use this exact captured area's optional width owner. */ event => resizeKey(event, "width", widthControl.edge, widthControl.value, widthControl.min, widthControl.max, widthControl.onChange)}
    />}
  </div>;
}
