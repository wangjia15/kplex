import { buildGraphLensSimpleConditionExpression, type GraphLensSimpleField, type GraphLensSimpleOperator } from "./GraphLensSimple";
import { compileGraphPredicate, type CompiledGraphPredicate } from "./GraphPredicate";
import { tryParseGraphPredicateExpression } from "./GraphPredicateParser";

export type QuickPlexFilterField = Extract<GraphLensSimpleField, "node.label" | "file.tags" | "node.noteType">;
export type PlexFilterState = {
  field: QuickPlexFilterField;
  operator: GraphLensSimpleOperator;
  value: string;
  showCrossLinks: boolean;
};

export const EMPTY_PLEX_FILTER: PlexFilterState = {
  field: "node.label",
  operator: "contains",
  value: "",
  showCrossLinks: true,
};

export function isPlexFilterActive(filter: PlexFilterState): boolean {
  return Boolean(filter.value.trim());
}

/**
 * The quick filter is deliberately a one-condition Graph Lens. Keeping it on the same field /
 * operator vocabulary as named lenses makes positive and negative filtering behave identically
 * without maintaining a second predicate language in the toolbar.
 */
export function compilePlexFilter(filter: PlexFilterState): CompiledGraphPredicate | null {
  if (!isPlexFilterActive(filter)) return null;
  const expressionSource = buildGraphLensSimpleConditionExpression({
    id: "quick-filter",
    field: filter.field,
    operator: filter.operator,
    value: filter.value.trim(),
  });
  const parsed = tryParseGraphPredicateExpression(expressionSource);
  return parsed.expression ? compileGraphPredicate(parsed.expression) : null;
}
