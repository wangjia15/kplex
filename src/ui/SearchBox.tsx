import { useEffect, useState, type ChangeEvent, type MouseEvent } from "react";
import type { GraphIndex } from "../index/GraphIndex";
import type { GraphPage } from "../types";
import { ObsidianIcon } from "./ObsidianIcon";

export function SearchBox({ index, onActivate }: { index: GraphIndex; onActivate: (page: GraphPage) => void }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(query), 60);
    return () => window.clearTimeout(timer);
  }, [query]);
  const results = focused ? index.search(searchQuery, 24) : [];

  return <div className="excalibrain-search-shell">
    <div className="excalibrain-search-icon"><ObsidianIcon name="search" size={16} /></div>
    <input
      className="excalibrain-search"
      value={query}
      onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.currentTarget.value)}
      onFocus={() => setFocused(true)}
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
