import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { SectionContent, SectionFigure } from "../index/SectionExpansion";
import { SECTION_PANEL, SECTION_PANEL_LIMITS, sectionQuoteLines, type SectionPanel } from "./layout";
import { ObsidianIcon } from "./ObsidianIcon";
import { ResizeHandle } from "./ResizeHandle";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Keep mouse presses on panel controls from starting a Plex pan; touch keeps native scrolling. */
const stopMouse = (event: ReactPointerEvent<HTMLElement>) => {
  if (event.pointerType !== "touch") event.stopPropagation();
};

/**
 * Highlights and figures of one expanded section, drawn under its card. Positions come from the
 * scene (canvas coordinates), so the panel pans and zooms with the Plex.
 */
export function SectionContentPanel({ panel, content, showHighlights, showFigures, onToggleCollapse, onOpenLine, onFigureEnter, onFigureLeave, onFigurePin, onResize, onContextMenu }: {
  panel: SectionPanel;
  content: SectionContent;
  showHighlights: boolean;
  showFigures: boolean;
  onToggleCollapse: (sectionId: string) => void;
  onOpenLine: (line: number) => void;
  onFigureEnter: (figure: SectionFigure, element: HTMLElement) => void;
  onFigureLeave: () => void;
  onFigurePin: (figure: SectionFigure, element: HTMLElement) => void;
  onResize: (sectionId: string, width: number, height: number) => void;
  onContextMenu: (sectionId: string, event: MouseEvent<HTMLDivElement>) => void;
}) {
  const [draftSize, setDraftSize] = useState<{ width: number; height: number } | null>(null);
  const width = draftSize?.width ?? panel.width;
  const height = draftSize?.height ?? panel.height;
  const highlights = showHighlights ? content.highlights : [];
  const figures = showFigures ? content.figures : [];
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

  const summary = [
    highlights.length ? count(highlights.length, "highlight", "highlights") : "",
    figures.length ? count(figures.length, "figure", "figures") : "",
  ].filter(Boolean).join(" · ");

  return <div
    className={`kplex-section-panel${panel.collapsed ? " is-collapsed" : ""}`}
    style={{ left: panel.left, top: panel.top, width, height }}
    data-kplex-section-panel={panel.sectionId}
    onContextMenu={(event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onContextMenu(panel.sectionId, event);
    }}
    onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
    onDoubleClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
  >
    <button
      type="button"
      className="kplex-section-panel-header"
      style={{ height: SECTION_PANEL.header }}
      aria-expanded={!panel.collapsed}
      aria-label={panel.collapsed ? "Show section content" : "Hide section content"}
      onPointerDown={stopMouse}
      onClick={() => onToggleCollapse(panel.sectionId)}
    >
      <ObsidianIcon name={panel.collapsed ? "chevron-right" : "chevron-down"} size={12} />
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
          onClick={() => onOpenLine(item.line)}
        >
          <span className="kplex-section-quote-text" style={{ maxHeight: sectionQuoteLines(item.text, width) * SECTION_PANEL.quoteLineHeight }}>{item.text}</span>
        </button>
        {item.comments.map((comment, commentIndex) => <div
          key={`c-${commentIndex}`}
          className="kplex-section-comment"
          style={{ marginLeft: SECTION_PANEL.commentIndent }}
          onPointerDown={stopMouse}
        >
          <ObsidianIcon name="message-square" size={10} />
          <span className="kplex-section-comment-text">{comment}</span>
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
            <img src={figure.src} alt={figure.caption ? "" : (figure.alt || "Figure")} loading="lazy" decoding="async" draggable={false} />
          </span>
          <span className="kplex-section-figure-caption">{figure.caption || " "}</span>
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
        onResize(panel.sectionId, nextWidth, nextHeight);
      }}
    />
  </div>;
}
