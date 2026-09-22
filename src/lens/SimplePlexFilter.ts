import {
  compileGraphPredicate,
  predicateAll,
  predicateAny,
  predicateCall,
  predicateLiteral,
  predicateProperty,
  type CompiledGraphPredicate,
  type GraphPredicateExpression,
} from "./GraphPredicate";

export type PlexFilterState = { keyword: string; tag: string; noteType: string };
export const EMPTY_PLEX_FILTER: PlexFilterState = { keyword: "", tag: "", noteType: "" };

export function isPlexFilterActive(filter: PlexFilterState): boolean {
  return Boolean(filter.keyword.trim() || filter.tag.trim() || filter.noteType.trim());
}

/**
 * Keeps the existing simple filter UI while translating it into the generic predicate model.
 * Named lenses can later produce the same CompiledGraphPredicate without changing graph rendering.
 */
export function compilePlexFilter(filter: PlexFilterState): CompiledGraphPredicate | null {
  const clauses: GraphPredicateExpression[] = [];
  const keyword = filter.keyword.trim();
  const tag = filter.tag.trim();
  const noteType = filter.noteType.trim().replace(/^#/, "");

  if (keyword) {
    const wanted = predicateLiteral(keyword);
    clauses.push(predicateAny(
      predicateCall("text.contains", predicateProperty("node", "label"), wanted),
      predicateCall("text.contains", predicateProperty("node", "path"), wanted),
      predicateCall("text.contains", predicateProperty("node", "aliases"), wanted),
      predicateCall("text.contains", predicateProperty("edge", "definition"), wanted),
    ));
  }

  if (tag) {
    clauses.push(predicateCall("tags.has", predicateProperty("node", "tags"), predicateLiteral(tag)));
  }

  if (noteType) {
    clauses.push(predicateCall("text.equals", predicateProperty("node", "noteType"), predicateLiteral(noteType)));
  }

  if (!clauses.length) return null;
  return compileGraphPredicate(predicateAll(...clauses));
}
