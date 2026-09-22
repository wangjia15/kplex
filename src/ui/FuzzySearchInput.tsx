import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ObsidianIcon } from "./ObsidianIcon";

export type FuzzySearchInputProps<T> = {
  value: string;
  onChange: (value: string) => void;
  results: readonly T[];
  onChoose: (value: T) => void;
  getKey: (value: T) => string;
  getLabel: (value: T) => string;
  getDetail?: (value: T) => string | null | undefined;
  placeholder?: string;
  ariaLabel?: string;
  icon?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  floating?: boolean;
  /**
   * `app` keeps the historic K-Plex topbar overlay inside `.excalibrain-app`.
   * `viewport` portals to the document body so a modal cannot clip the result list.
   */
  floatingMode?: "app" | "viewport";
  portalSelector?: string;
  maxFloatingHeight?: number;
  resultPrefix?: (value: T) => ReactNode;
  onEnterWithoutResult?: () => void;
  onCtrlEnter?: () => void;
  openResultsOnFocus?: boolean;
  onFocusChange?: (focused: boolean) => void;
  className?: string;
  highlightMatches?: boolean;
};

function matchIndices(text: string, rawQuery: string): Set<number> {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return new Set();
  const lower = text.toLocaleLowerCase();
  const contiguous = lower.indexOf(query);
  if (contiguous >= 0) {
    return new Set(Array.from({ length: query.length }, (_, offset) => contiguous + offset));
  }

  const indices = new Set<number>();
  let cursor = 0;
  for (const char of query) {
    const found = lower.indexOf(char, cursor);
    if (found < 0) return new Set();
    indices.add(found);
    cursor = found + 1;
  }
  return indices;
}

function highlightedText(text: string, query: string): ReactNode {
  const indices = matchIndices(text, query);
  if (!indices.size) return text;

  const parts: ReactNode[] = [];
  let start = 0;
  let currentMatch = indices.has(0);
  for (let index = 1; index <= text.length; index += 1) {
    const nextMatch = index < text.length && indices.has(index);
    if (index < text.length && nextMatch === currentMatch) continue;
    const fragment = text.slice(start, index);
    parts.push(currentMatch
      ? <mark key={`${start}:m`} className="kplex-fuzzy-match">{fragment}</mark>
      : <span key={`${start}:t`}>{fragment}</span>);
    start = index;
    currentMatch = nextMatch;
  }
  return <>{parts}</>;
}

/**
 * Shared K-Plex fuzzy-input chrome used by graph search and relationship creation.
 * Callers own ranking; this component owns focus, keyboard navigation, highlighting,
 * and optional portal positioning.
 */
export function FuzzySearchInput<T>({
  value,
  onChange,
  results,
  onChoose,
  getKey,
  getLabel,
  getDetail,
  placeholder = "Search…",
  ariaLabel = "Search",
  icon = "search",
  autoFocus = false,
  disabled = false,
  floating = false,
  floatingMode = "app",
  portalSelector = ".excalibrain-app",
  maxFloatingHeight = 440,
  resultPrefix,
  onEnterWithoutResult,
  onCtrlEnter,
  openResultsOnFocus = true,
  onFocusChange,
  className = "",
  highlightMatches = true,
}: FuzzySearchInputProps<T>) {
  const [focused, setFocused] = useState(false);
  const [editedSinceFocus, setEditedSinceFocus] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [overlayStyle, setOverlayStyle] = useState<CSSProperties | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const visibleResults = focused && (
    openResultsOnFocus || (editedSinceFocus && value.trim().length > 0)
  ) ? results : [];
  const clampedSelectedIndex = visibleResults.length ? Math.max(0, Math.min(visibleResults.length - 1, selectedIndex)) : 0;
  const portalRoot = floating
    ? (floatingMode === "viewport"
      ? shellRef.current?.ownerDocument.body ?? null
      : shellRef.current?.closest<HTMLElement>(portalSelector) ?? null)
    : null;

  const dismissResults = () => {
    setEditedSinceFocus(false);
    setSelectedIndex(0);
  };

  const close = () => {
    setFocused(false);
    setEditedSinceFocus(false);
    setSelectedIndex(0);
    onFocusChange?.(false);
  };

  const choose = (item: T) => {
    onChoose(item);
    close();
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [value]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const dismiss = () => dismissResults();
    shell.addEventListener("kplex-dismiss-suggestions", dismiss);
    return () => shell.removeEventListener("kplex-dismiss-suggestions", dismiss);
  }, []);

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
    if (!floating || !focused || !visibleResults.length) {
      setOverlayStyle(null);
      return;
    }

    const shell = shellRef.current;
    if (!shell) return;
    const ownerWindow = shell.ownerDocument.defaultView;
    if (!ownerWindow) return;

    const updatePosition = () => {
      const shellRect = shell.getBoundingClientRect();
      const margin = 8;
      const gap = 6;

      if (floatingMode === "viewport") {
        const viewportWidth = ownerWindow.innerWidth;
        const viewportHeight = ownerWindow.innerHeight;
        const width = Math.min(shellRect.width, Math.max(0, viewportWidth - margin * 2));
        const left = Math.max(margin, Math.min(shellRect.left, viewportWidth - margin - width));
        const below = Math.max(0, viewportHeight - shellRect.bottom - gap - margin);
        const above = Math.max(0, shellRect.top - gap - margin);
        const openBelow = below >= Math.min(180, maxFloatingHeight) || below >= above;
        const maxHeight = Math.max(0, Math.min(maxFloatingHeight, openBelow ? below : above));
        const style: CSSProperties = {
          position: "fixed",
          left,
          width,
          maxHeight,
          zIndex: 10000,
        };
        if (openBelow) style.top = shellRect.bottom + gap;
        else style.bottom = viewportHeight - shellRect.top + gap;
        setOverlayStyle(style);
        return;
      }

      const app = shell.closest<HTMLElement>(portalSelector) ?? null;
      const topbar = shell.closest<HTMLElement>(".excalibrain-topbar") ?? null;
      if (!app || !topbar) return;
      const appRect = app.getBoundingClientRect();
      const topbarRect = topbar.getBoundingClientRect();
      const availableWidth = Math.max(0, appRect.width - margin * 2);
      const width = Math.min(780, Math.max(shellRect.width, Math.min(620, availableWidth)), availableWidth);
      const minLeft = margin;
      const maxLeft = Math.max(minLeft, appRect.width - margin - width);
      const left = Math.min(maxLeft, Math.max(minLeft, shellRect.left - appRect.left));
      const top = Math.max(0, topbarRect.bottom - appRect.top + gap);
      const maxHeight = Math.max(0, Math.min(maxFloatingHeight, appRect.height - top - margin));
      setOverlayStyle({ left, top, width, maxHeight });
    };

    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    const app = floatingMode === "app" ? shell.closest<HTMLElement>(portalSelector) : null;
    const topbar = floatingMode === "app" ? shell.closest<HTMLElement>(".excalibrain-topbar") : null;
    if (app) resizeObserver.observe(app);
    if (topbar) resizeObserver.observe(topbar);
    resizeObserver.observe(shell);
    ownerWindow.addEventListener("resize", updatePosition);
    ownerWindow.addEventListener("scroll", updatePosition, true);

    return () => {
      resizeObserver.disconnect();
      ownerWindow.removeEventListener("resize", updatePosition);
      ownerWindow.removeEventListener("scroll", updatePosition, true);
    };
  }, [floating, floatingMode, focused, visibleResults.length, maxFloatingHeight, portalSelector]);

  useEffect(() => {
    const container = resultsRef.current;
    if (!container || !visibleResults.length) return;
    container.querySelector<HTMLElement>(`[data-kplex-fuzzy-index="${clampedSelectedIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [clampedSelectedIndex, visibleResults.length]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (visibleResults.length) dismissResults();
      return;
    }
    if (event.key === "ArrowDown" && visibleResults.length) {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(visibleResults.length - 1, current + 1));
      return;
    }
    if (event.key === "ArrowUp" && visibleResults.length) {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && onCtrlEnter) {
      event.preventDefault();
      event.stopPropagation();
      onCtrlEnter();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const selected = visibleResults[clampedSelectedIndex];
      if (selected) choose(selected);
      else onEnterWithoutResult?.();
    }
  };

  const list = focused && visibleResults.length > 0
    ? <div ref={resultsRef} className={`excalibrain-search-results${floating ? " kplex-fuzzy-floating-results" : " kplex-fuzzy-inline-results"}`} style={floating ? overlayStyle ?? undefined : undefined}>
      {visibleResults.map((item, resultIndex) => {
        const label = getLabel(item);
        const detail = getDetail?.(item);
        const highlightQuery = highlightMatches ? value : "";
        return <button
          key={getKey(item)}
          data-kplex-fuzzy-index={resultIndex}
          className={`excalibrain-search-result${resultIndex === clampedSelectedIndex ? " is-selected" : ""}`}
          title={detail ? `${label}\n${detail}` : label}
          onMouseDown={(event: MouseEvent<HTMLButtonElement>) => event.preventDefault()}
          onMouseEnter={() => setSelectedIndex(resultIndex)}
          onClick={() => choose(item)}
        >
          {resultPrefix?.(item)}
          <span>{highlightedText(label, highlightQuery)}</span>{detail ? <small>{highlightedText(detail, highlightQuery)}</small> : null}
        </button>;
      })}
    </div>
    : null;

  const resultList = floating && portalRoot && overlayStyle && list ? createPortal(list, portalRoot) : (!floating ? list : null);

  return <div ref={shellRef} className={`excalibrain-search-shell kplex-fuzzy-search${className ? ` ${className}` : ""}`}>
    {icon ? <div className="excalibrain-search-icon"><ObsidianIcon name={icon} size={16} /></div> : null}
    <input
      ref={inputRef}
      className="excalibrain-search"
      value={value}
      disabled={disabled}
      onChange={(event: ChangeEvent<HTMLInputElement>) => { setEditedSinceFocus(true); onChange(event.currentTarget.value); }}
      onFocus={() => { setFocused(true); setEditedSinceFocus(false); onFocusChange?.(true); }}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-expanded={focused && visibleResults.length > 0}
      autoComplete="off"
    />
    {resultList}
  </div>;
}

/** Tiny ranking helper for short string vocabularies such as ontology fields. */
export function fuzzyFilterStrings(values: readonly string[], query: string, limit = 24): string[] {
  const q = query.trim().toLocaleLowerCase();
  const unique = [...new Map(values.map((value) => [value.toLocaleLowerCase(), value] as const)).values()];
  if (!q) return unique.slice(0, limit);

  const score = (value: string): number | null => {
    const text = value.toLocaleLowerCase();
    if (text === q) return 0;
    if (text.startsWith(q)) return 1 + (text.length - q.length) / 1000;
    const at = text.indexOf(q);
    if (at >= 0) return 10 + at + (text.length - q.length) / 1000;
    let cursor = 0;
    let gaps = 0;
    for (const char of q) {
      const found = text.indexOf(char, cursor);
      if (found < 0) return null;
      gaps += found - cursor;
      cursor = found + 1;
    }
    return 100 + gaps + text.length / 1000;
  };

  return unique
    .map((value) => ({ value, score: score(value) }))
    .filter((entry): entry is { value: string; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value, undefined, { sensitivity: "base", numeric: true }))
    .slice(0, limit)
    .map((entry) => entry.value);
}
