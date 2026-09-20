import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import type { GraphIndex } from "../index/GraphIndex";
import type { GraphPage } from "../types";
import { ObsidianIcon } from "./ObsidianIcon";

export function SearchBox({ index, onActivate }: { index: GraphIndex; onActivate: (page: GraphPage) => void }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [overlayStyle, setOverlayStyle] = useState<CSSProperties | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const results = focused ? index.search(query, 24) : [];
  const clampedSelectedIndex = results.length ? Math.max(0, Math.min(results.length - 1, selectedIndex)) : 0;
  const portalRoot = shellRef.current?.closest<HTMLElement>(".excalibrain-app") ?? null;

  const close = () => {
    setFocused(false);
    setSelectedIndex(0);
  };

  const choose = (page: GraphPage) => {
    onActivate(page);
    setQuery("");
    close();
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!focused) return;
    const shell = shellRef.current;
    if (!shell) return;
    const ownerDocument = shell.ownerDocument;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (shell.contains(target) || resultsRef.current?.contains(target))) return;
      close();
    };
    ownerDocument.addEventListener("pointerdown", onPointerDown, true);
    return () => ownerDocument.removeEventListener("pointerdown", onPointerDown, true);
  }, [focused]);

  useLayoutEffect(() => {
    if (!focused || !results.length) {
      setOverlayStyle(null);
      return;
    }

    const shell = shellRef.current;
    const app = shell?.closest<HTMLElement>(".excalibrain-app") ?? null;
    const topbar = shell?.closest<HTMLElement>(".excalibrain-topbar") ?? null;
    if (!shell || !app || !topbar) return;

    const ownerWindow = shell.ownerDocument.defaultView;
    if (!ownerWindow) return;

    const updatePosition = () => {
      const appRect = app.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const topbarRect = topbar.getBoundingClientRect();
      const margin = 8;
      const gap = 6;
      const availableWidth = Math.max(0, appRect.width - margin * 2);
      const width = Math.min(780, Math.max(shellRect.width, Math.min(620, availableWidth)), availableWidth);
      const minLeft = margin;
      const maxLeft = Math.max(minLeft, appRect.width - margin - width);
      const left = Math.min(maxLeft, Math.max(minLeft, shellRect.left - appRect.left));
      const top = Math.max(0, topbarRect.bottom - appRect.top + gap);
      const maxHeight = Math.max(0, Math.min(440, appRect.height - top - margin));

      setOverlayStyle({ left, top, width, maxHeight });
    };

    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(app);
    resizeObserver.observe(topbar);
    resizeObserver.observe(shell);
    ownerWindow.addEventListener("resize", updatePosition);
    ownerWindow.addEventListener("scroll", updatePosition, true);

    return () => {
      resizeObserver.disconnect();
      ownerWindow.removeEventListener("resize", updatePosition);
      ownerWindow.removeEventListener("scroll", updatePosition, true);
    };
  }, [focused, results.length]);

  useEffect(() => {
    const container = resultsRef.current;
    if (!container || !results.length) return;
    container.querySelector<HTMLElement>(`[data-kplex-search-index="${clampedSelectedIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [clampedSelectedIndex, results.length]);

  const onKeyDown = (event: { key: string; preventDefault(): void; currentTarget: HTMLInputElement }) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      event.currentTarget.blur();
      return;
    }
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(results.length - 1, current + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const page = results[clampedSelectedIndex];
      if (page) choose(page);
    }
  };

  const resultList = focused && results.length > 0 && portalRoot && overlayStyle
    ? createPortal(<div ref={resultsRef} className="excalibrain-search-results" style={overlayStyle}>
      {results.map((page, resultIndex) => {
        const title = index.titleFor(page);
        return <button
          key={page.path}
          data-kplex-search-index={resultIndex}
          className={`excalibrain-search-result${resultIndex === clampedSelectedIndex ? " is-selected" : ""}`}
          title={`${title}\n${page.path}`}
          onMouseDown={(event: MouseEvent<HTMLButtonElement>) => event.preventDefault()}
          onMouseEnter={() => setSelectedIndex(resultIndex)}
          onClick={() => choose(page)}
        >
          <span>{title}</span><small>{page.path}</small>
        </button>;
      })}
    </div>, portalRoot)
    : null;

  return <div ref={shellRef} className="excalibrain-search-shell">
    <div className="excalibrain-search-icon"><ObsidianIcon name="search" size={16} /></div>
    <input
      className="excalibrain-search"
      value={query}
      onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.currentTarget.value)}
      onFocus={() => setFocused(true)}
      onKeyDown={onKeyDown}
      placeholder="Search nodes…"
      aria-label="Search nodes"
      aria-expanded={focused && results.length > 0}
    />
    {resultList}
  </div>;
}
