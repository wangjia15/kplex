import { useState, type ChangeEvent, type FocusEvent, type MouseEvent } from "react";
import type { GraphIndex } from "../index/GraphIndex";
import type { GraphPage } from "../types";
import { ObsidianIcon } from "./ObsidianIcon";
import { perfLog } from "../util/perf";

export function SearchBox({ index, onActivate }: { index: GraphIndex; onActivate: (page: GraphPage) => void }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  // Search is deliberately synchronous and bounded. GraphIndex keeps a pre-normalized search
  // table, so even large vaults do not need a debounce that makes the field feel unresponsive.
  const results = focused ? index.search(query, 24) : [];

  return <div className="excalibrain-search-shell">
    <div className="excalibrain-search-icon"><ObsidianIcon name="search" size={16} /></div>
    <input
      className="excalibrain-search"
      value={query}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        const value = e.currentTarget.value;
        perfLog("search.input", { query: value, eventLagMs: Math.max(0, performance.now() - e.timeStamp) });
        setQuery(value);
      }}
      onFocus={(e: FocusEvent<HTMLInputElement>) => {
        perfLog("search.focus", { eventLagMs: Math.max(0, performance.now() - e.timeStamp), indexSize: index.size });
        setFocused(true);
      }}
      onBlur={() => window.setTimeout(() => setFocused(false), 120)}
      placeholder="Search thoughts…"
      aria-label="Search thoughts"
    />
    {focused && results.length > 0 && <div className="excalibrain-search-results">
      {results.map((page) => {
        const title = index.titleFor(page);
        return <button
          key={page.path}
          className="excalibrain-search-result"
          title={`${title}\n${page.path}`}
          onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
          onClick={() => { onActivate(page); setQuery(""); setFocused(false); }}
        >
          <span>{title}</span><small>{page.path}</small>
        </button>;
      })}
    </div>}
  </div>;
}
