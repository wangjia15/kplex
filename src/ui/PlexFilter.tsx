import { useId, useMemo } from "react";
import type { GraphIndex } from "../index/GraphIndex";
import { ObsidianIcon } from "./ObsidianIcon";

export type PlexFilterState = { keyword: string; tag: string; noteType: string };
export const EMPTY_PLEX_FILTER: PlexFilterState = { keyword: "", tag: "", noteType: "" };

export function PlexFilter({ index, revision, value, onChange }: { index: GraphIndex; revision: number; value: PlexFilterState; onChange: (value: PlexFilterState) => void }) {
  const tagListId = `kplex-filter-tags-${useId().replaceAll(":", "")}`;
  const { tags, noteTypes } = useMemo(() => {
    const tagSet = new Set<string>();
    const typeSet = new Set<string>();
    for (const page of index.allPages()) {
      page.tags.forEach((tag) => tagSet.add(tag));
      if (page.noteType) typeSet.add(page.noteType);
    }
    return { tags: [...tagSet].sort(), noteTypes: [...typeSet].sort() };
  }, [index, revision]);
  const active = Boolean(value.keyword || value.tag || value.noteType);
  return <details className={`kplex-filter${active ? " is-active" : ""}`}>
    <summary className="excalibrain-icon-button" title="Filter visible Plex" aria-label="Filter visible Plex"><ObsidianIcon name="list-filter" size={16} /></summary>
    <div className="kplex-filter-panel" onPointerDown={(event) => event.stopPropagation()}>
      <label>Keyword<input value={value.keyword} placeholder="Title, path or relationship" onChange={(e) => onChange({ ...value, keyword: e.currentTarget.value })} /></label>
      <label>Tag<input value={value.tag} list={tagListId} placeholder="#tag" onChange={(e) => onChange({ ...value, tag: e.currentTarget.value })} /></label>
      <datalist id={tagListId}>{tags.map((tag) => <option key={tag} value={tag} />)}</datalist>
      <label>Note type<select value={value.noteType} onChange={(e) => onChange({ ...value, noteType: e.currentTarget.value })}>
        <option value="">Any</option>{noteTypes.map((type) => <option key={type} value={type}>{type}</option>)}
      </select></label>
      {active && <button className="mod-cta" onClick={() => onChange(EMPTY_PLEX_FILTER)}>Clear filter</button>}
    </div>
  </details>;
}
