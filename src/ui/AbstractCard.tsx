import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type ExcaliBrainPlugin from "../main";
import type { AbstractPreview } from "../paper/obsidian/PaperReadingController";
import type { GraphPage } from "../types";
import { ObsidianIcon } from "./ObsidianIcon";

export type AbstractCardState = {
  id: string;
  path: string;
  left: number;
  top: number;
  pinned: boolean;
};

export const ABSTRACT_CARD_WIDTH = 360;

/**
 * Abstract card for a Plex node. A hover card follows the pointer's node; pinned cards stay until
 * closed and can be dragged by their header. Positions are viewport-relative (not canvas), so
 * panning or zooming the Plex does not move a pinned card.
 */
export function AbstractCard({ plugin, card, onPin, onClose, onMove, onPointerEnter, onPointerLeave, onShowDetails }: {
  plugin: ExcaliBrainPlugin;
  card: AbstractCardState;
  onPin: (id: string) => void;
  onClose: (id: string) => void;
  onMove: (id: string, left: number, top: number) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onShowDetails: (page: GraphPage) => void;
}) {
  const page = plugin.index.get(card.path) ?? null;
  const [preview, setPreview] = useState<AbstractPreview | null | undefined>(undefined);
  const drag = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreview(undefined);
    if (!page) {
      setPreview(null);
      return;
    }
    void plugin.paperReading.abstractPreview(page).then((value) => {
      if (!cancelled) setPreview(value);
    });
    return () => { cancelled = true; };
  }, [plugin, page]);

  // The Plex zooms on wheel through a native listener; keep wheel scrolling inside the card.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const stop = (event: WheelEvent) => event.stopPropagation();
    el.addEventListener("wheel", stop, { passive: true });
    return () => el.removeEventListener("wheel", stop);
  }, [preview]);

  if (!page || preview === null) return null;
  const title = plugin.index.titleFor(page);
  const isPaper = plugin.paperReading.isPaperPage(page);

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
    className={`kplex-abstract-card${card.pinned ? " is-pinned" : ""}`}
    style={{ left: card.left, top: card.top, width: ABSTRACT_CARD_WIDTH }}
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
      <div className="kplex-abstract-card-title">{title}</div>
      <div className="kplex-abstract-card-actions">
        {isPaper && <button type="button" className="clickable-icon" aria-label="Paper details" onClick={() => onShowDetails(page)}>
          <ObsidianIcon name="book-open" size={14} />
        </button>}
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
    <div ref={bodyRef} className="kplex-abstract-card-body">
      {preview === undefined
        ? <div className="kplex-abstract-card-muted">Loading…</div>
        : preview.text.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </div>
    {preview && <div className="kplex-abstract-card-source">
      {preview.source === "note" ? "From the note" : `From ${preview.source}`}
    </div>}
  </div>;
}
