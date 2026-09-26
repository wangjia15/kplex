import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { SectionContent, SectionFigure } from "../index/SectionExpansion";
import type { PdfCropResolver } from "../index/PdfCropRenderer";
import { FigureImage } from "./FigureImage";
import { SECTION_PANEL, SECTION_PANEL_LIMITS, sectionQuoteLines, type SectionPanel } from "./layout";
import { MathText } from "./MathText";
import { containsMath } from "./mathSegments";
import { ObsidianIcon } from "./ObsidianIcon";
import { ResizeHandle } from "./ResizeHandle";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Keep mouse presses on panel controls from starting a Plex pan; touch keeps native scrolling. */
const stopMouse = (event: ReactPointerEvent<HTMLElement>) => {
  if (event.pointerType !== "touch") event.stopPropagation();
};

/**
 * Reading content of one expanded section, drawn under its card: highlighted passages with their
 * comments, and — as a branch of its own — the figures. Positions come from the scene (canvas
 * coordinates), so a panel pans and zooms with the Plex.
 */
export function SectionContentPanel({ panel, content, crops, canvasScale, onToggleCollapse, onOpenHighlight, onFigureEnter, onFigureLeave, onFigurePin, onMove, onResize, onContextMenu }: {
  panel: SectionPanel;
  content: SectionContent;
  crops: PdfCropResolver;
  /** Current Plex zoom, so a drag follows the pointer at any zoom level. */
  canvasScale: () => number;
  onToggleCollapse: (panelId: string) => void;
  onOpenHighlight: (line: number, linkTarget?: string) => void;
  onFigureEnter: (figure: SectionFigure, element: HTMLElement) => void;
  onFigureLeave: () => void;
  onFigurePin: (figure: SectionFigure, element: HTMLElement) => void;
  onMove: (panelId: string, dx: number, dy: number) => void;
  onResize: (panelId: string, width: number, height: number) => void;
  onContextMenu: (panelId: string, event: MouseEvent<HTMLDivElement>) => void;
}) {
  const [draftSize, setDraftSize] = useState<{ width: number; height: number } | null>(null);
  const [draftOffset, setDraftOffset] = useState<{ dx: number; dy: number } | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const width = draftSize?.width ?? panel.width;
  const height = draftSize?.height ?? panel.height;
  const figuresPanel = panel.kind === "figures";
  const highlights = figuresPanel ? [] : content.highlights;
  const figures = figuresPanel ? content.figures : [];
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // The Plex zooms on wheel; let a panel with overflowing content scroll instead.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      if (el.scrollHeight > el.clientHeight + 1) event.stopPropagation();
    };
    el.addEventListener("wheel", wheel, { passive: true });
    return () => el.removeEventListener("wheel", wheel);
  }, [panel.collapsed]);

  // The header doubles as the drag handle: a press that travels moves the panel, a plain click
  // still folds it.
  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    event.stopPropagation();
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (!active.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
    active.moved = true;
    const scale = Math.max(0.05, canvasScale());
    setDraftOffset({ dx: dx / scale, dy: dy / scale });
  };
  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drag.current = null;
    const offset = draftOffset;
    setDraftOffset(null);
    if (!active.moved || !offset) return;
    suppressClick.current = true;
    onMove(panel.panelId, offset.dx, offset.dy);
  };

  const summary = figuresPanel
    ? count(figures.length, "figure", "figures")
    : count(highlights.length, "highlight", "highlights");

  return <div
    className={`kplex-section-panel${figuresPanel ? " is-figures" : ""}${panel.collapsed ? " is-collapsed" : ""}${draftOffset ? " is-dragging" : ""}`}
    style={{ left: panel.left + (draftOffset?.dx ?? 0), top: panel.top + (draftOffset?.dy ?? 0), width, height }}
    data-kplex-section-panel={panel.panelId}
    onContextMenu={(event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onContextMenu(panel.panelId, event);
    }}
    onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
    onDoubleClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
  >
    <button
      type="button"
      className="kplex-section-panel-header"
      style={{ height: SECTION_PANEL.header }}
      aria-expanded={!panel.collapsed}
      aria-label={panel.collapsed
        ? (figuresPanel ? "Show figures" : "Show section content")
        : (figuresPanel ? "Hide figures" : "Hide section content")}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={() => {
        if (suppressClick.current) { suppressClick.current = false; return; }
        onToggleCollapse(panel.panelId);
      }}
    >
      <ObsidianIcon name={panel.collapsed ? "chevron-right" : "chevron-down"} size={12} />
      {figuresPanel && <ObsidianIcon name="image" size={12} />}
      <span className="kplex-section-panel-summary">{summary}</span>
    </button>
    {!panel.collapsed && <div ref={bodyRef} className="kplex-section-panel-body">
      {highlights.map((item, index) => <div
        key={`h-${index}`}
        className="kplex-section-quote-group"
        style={{ "--kplex-quote-color": item.color ?? undefined } as CSSProperties}
      >
        <button
          type="button"
          className="kplex-section-quote"
          aria-label={item.text.slice(0, 600)}
          onPointerDown={stopMouse}
          onClick={() => onOpenHighlight(item.line, item.linkTarget)}
        >
          {/* A typeset formula is taller than the source text it replaces, so a quote carrying
              maths is never clipped to an estimated line count. */}
          <span
            className="kplex-section-quote-text"
            style={containsMath(item.text) ? undefined : { maxHeight: sectionQuoteLines(item.text, width) * SECTION_PANEL.quoteLineHeight }}
          ><MathText text={item.text} /></span>
        </button>
        {item.comments.map((comment, commentIndex) => <div
          key={`c-${commentIndex}`}
          className="kplex-section-comment"
          style={{ marginLeft: SECTION_PANEL.commentIndent }}
          onPointerDown={stopMouse}
        >
          <ObsidianIcon name="message-square" size={10} />
          <span className="kplex-section-comment-text"><MathText text={comment} /></span>
        </div>)}
      </div>)}
      {figures.length > 0 && <div className="kplex-section-figures">
        {figures.map((figure, index) => <button
          key={`f-${index}`}
          type="button"
          className="kplex-section-figure"
          onPointerDown={stopMouse}
          onPointerEnter={(event: ReactPointerEvent<HTMLButtonElement>) => {
            if (event.pointerType === "mouse" || event.pointerType === "pen") onFigureEnter(figure, event.currentTarget);
          }}
          onPointerLeave={onFigureLeave}
          onClick={(event: MouseEvent<HTMLButtonElement>) => onFigurePin(figure, event.currentTarget)}
        >
          <span className="kplex-section-figure-image">
            <FigureImage figure={figure} crops={crops} />
          </span>
          <span className="kplex-section-figure-caption">{figure.caption || " "}</span>
        </button>)}
      </div>}
    </div>}
    <ResizeHandle
      width={width}
      height={height}
      limits={panel.collapsed ? { ...SECTION_PANEL_LIMITS, minHeight: panel.height, maxHeight: panel.height } : SECTION_PANEL_LIMITS}
      label="Drag to resize"
      onDraft={(nextWidth, nextHeight) => setDraftSize({ width: nextWidth, height: nextHeight })}
      onCommit={(nextWidth, nextHeight) => {
        setDraftSize(null);
        onResize(panel.panelId, nextWidth, nextHeight);
      }}
    />
  </div>;
}
