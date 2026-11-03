/** Pure branch/generation state transitions. The existing session guard decides whether an editor or lifetime prevents committing a fold. */
import type {PlexBranchAction, PlexProjection} from "../contracts";
import {admitMindMapState, restoreMindMapState, type MindMapState} from "./state";

/** Change only represented expandable occurrences and refuse invalid, future-version or over-budget intent. */
export function reduceMindMap(state: unknown, projection: PlexProjection, action: PlexBranchAction): MindMapState | null {
  const current = restoreMindMapState(state);
  const restored = current.version === 1 && current.scope === projection.layoutRoot ? current : restoreMindMapState(projection.stateSuggestion);
  if (restored.version !== 1 || restored.scope !== projection.layoutRoot) return null;
  const expanded = new Set(restored.expanded), collapsed = new Set(restored.collapsed);
  let rows = projection.occurrences.filter(row => row.branch?.canExpand && !row.branch.reference);
  if (action.kind === "toggle") rows = rows.filter(row => row.id === action.occurrenceId);
  else if (action.kind === "expand-generation") {
    const depth = Math.min(...rows.filter(row => !row.branch!.expanded).map(row => row.branch!.depth));
    rows = rows.filter(row => !row.branch!.expanded && row.branch!.depth === depth);
  } else {
    const depth = Math.max(...rows.filter(row => row.branch!.expanded).map(row => row.branch!.depth));
    rows = rows.filter(row => row.branch!.expanded && row.branch!.depth === depth);
  }
  if (!rows.length) return null;
  for (const row of rows) {
    const open = action.kind === "expand-generation" || action.kind === "toggle" && !row.branch!.expanded;
    if (open) {collapsed.delete(row.id); expanded.add(row.id);} else {expanded.delete(row.id); collapsed.add(row.id);}
  }
  return admitMindMapState({...restored, expanded: [...expanded], collapsed: [...collapsed]});
}
