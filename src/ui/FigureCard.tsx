import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { SectionFigure } from "../index/SectionExpansion";
import type { PdfCropResolver } from "../index/PdfCropRenderer";
import { FigureImage } from "./FigureImage";
import { ObsidianIcon } from "./ObsidianIcon";

export type FigureCardState = {
  id: string;
  figure: SectionFigure;
  left: number;
  top: number;
  pinned: boolean;
};

export const FIGURE_CARD_WIDTH = 480;

/**
 * Full-size view of a section figure. A hover card follows the pointer; pinned cards stay until
 * closed, can be dragged by their header and resized. Positions are viewport-relative, so panning
 * or zooming the Plex does not move a pinned card.
 */
export function FigureCard({ card, crops, onPin, onClose, onMove, onOpenLine, onPointerEnter, onPointerLeave }: {
  card: FigureCardState;
  crops: PdfCropResolver;
  onPin: (id: string) => void;
  onClose: (id: string) => void;
  onMove: (id: string, left: number, top: number) => void;
  onOpenLine: (line: number) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const drag = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Keep wheel scrolling inside the card instead of zooming the Plex.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const stop = (event: WheelEvent) => event.stopPropagation();
    el.addEventListener("wheel", stop, { passive: true });
    return () => el.removeEventListener("wheel", stop);
  }, []);

  const { figure } = card;
  const title = figure.caption || figure.alt || figure.path?.split("/").pop() || "Figure";

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!card.pinned || (event.target as Element).closest("button")) return;
    drag.current = { pointerId: event.pointerId, dx: event.clientX - card.left, dy: event.clientY - card.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    onMove(card.id, event.clientX - active.dx, event.clientY - active.dy);
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };

  return <div
    ref={rootRef}
    className={`kplex-abstract-card kplex-figure-card${card.pinned ? " is-pinned" : ""}`}
    style={{ left: card.left, top: card.top, width: FIGURE_CARD_WIDTH }}
    onPointerDown={(event) => event.stopPropagation()}
    onPointerEnter={onPointerEnter}
    onPointerLeave={onPointerLeave}
    onContextMenu={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
  >
    <div
      className="kplex-abstract-card-header"
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="kplex-abstract-card-title kplex-figure-card-title">{title}</div>
      <div className="kplex-abstract-card-actions">
        <button type="button" className="clickable-icon" aria-label="Go to figure in note" onClick={() => onOpenLine(figure.line)}>
          <ObsidianIcon name="file-search" size={14} />
        </button>
        <button
          type="button"
          className={`clickable-icon${card.pinned ? " is-active" : ""}`}
          aria-label={card.pinned ? "Unpin" : "Pin"}
          aria-pressed={card.pinned}
          onClick={() => onPin(card.id)}
        ><ObsidianIcon name={card.pinned ? "pin-off" : "pin"} size={14} /></button>
        {card.pinned && <button type="button" className="clickable-icon" aria-label="Close" onClick={() => onClose(card.id)}>
          <ObsidianIcon name="x" size={14} />
        </button>}
      </div>
    </div>
    <div className="kplex-figure-card-body">
      <FigureImage figure={figure} crops={crops} />
      {figure.caption && <div className="kplex-figure-card-caption">{figure.caption}</div>}
    </div>
  </div>;
}
