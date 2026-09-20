import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import type { GraphIndex } from "../index/GraphIndex";
import type { GraphPage } from "../types";
import { ObsidianIcon } from "./ObsidianIcon";

export function SearchBox({ index, onActivate }: { index: GraphIndex; onActivate: (page: GraphPage) => void }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const results = focused ? index.search(query, 24) : [];
  const clampedSelectedIndex = results.length ? Math.max(0, Math.min(results.length - 1, selectedIndex)) : 0;

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
    const ownerDocument = shellRef.current?.ownerDocument ?? document;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && shellRef.current?.contains(target)) return;
      close();
    };
    ownerDocument.addEventListener("pointerdown", onPointerDown, true);
    return () => ownerDocument.removeEventListener("pointerdown", onPointerDown, true);
  }, [focused]);

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
    {focused && results.length > 0 && <div ref={resultsRef} className="excalibrain-search-results">
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
    </div>}
  </div>;
}
