import { useRef, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";

export type SizeLimits = { minWidth: number; maxWidth: number; minHeight: number; maxHeight: number };

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/**
 * Bottom-right corner handle that resizes its positioned parent. Pointer deltas are converted to
 * canvas units from the parent's rendered/layout width ratio, so it works at any Plex zoom.
 * onDraft previews the size while dragging; onCommit fires once on release.
 */
export function ResizeHandle({ width, height, limits, label, onDraft, onCommit }: {
  width: number;
  height: number;
  limits: SizeLimits;
  label: string;
  onDraft: (width: number, height: number) => void;
  onCommit: (width: number, height: number) => void;
}) {
  const drag = useRef<{ pointerId: number; x: number; y: number; width: number; height: number; scale: number; last: { width: number; height: number } } | null>(null);

  const down = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const host = event.currentTarget.parentElement;
    const scale = host && host.offsetWidth > 0 ? host.getBoundingClientRect().width / host.offsetWidth : 1;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, width, height, scale: scale || 1, last: { width, height } };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const next = {
      width: Math.round(clamp(active.width + (event.clientX - active.x) / active.scale, limits.minWidth, limits.maxWidth)),
      height: Math.round(clamp(active.height + (event.clientY - active.y) / active.scale, limits.minHeight, limits.maxHeight)),
    };
    active.last = next;
    onDraft(next.width, next.height);
  };
  const up = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.stopPropagation();
    drag.current = null;
    if (active.last.width !== active.width || active.last.height !== active.height) onCommit(active.last.width, active.last.height);
    else onDraft(active.width, active.height);
  };
  const stop = (event: MouseEvent<HTMLSpanElement>) => event.stopPropagation();

  return <span
    className="kplex-resize-handle"
    role="separator"
    aria-label={label}
    onPointerDown={down}
    onPointerMove={move}
    onPointerUp={up}
    onPointerCancel={up}
    onClick={stop}
    onDoubleClick={stop}
    onContextMenu={stop}
  />;
}
