/** Shared host-free lens syntax/selector/relationship validation. Legacy host and portable packages use this one owner. */
import {compileGraphPredicate, type GraphPredicateExpression, type GraphPredicateValue} from "./predicate";
import {tryParseGraphPredicateExpression, type PredicateParseIssue} from "./predicateParser";
export type PortableLensValidationIssue =
  | { code: "parse"; issue: PredicateParseIssue }
  | { code: "selector-reference-required" }
  | { code: "unknown-edge-role"; value: string }
  | { code: "unknown-edge-kind"; value: string }
  | { code: "unknown-edge-direction"; value: string };

const VALID_EDGE_ROLES = new Set(["parent", "child", "left", "right", "previous", "next", "sibling"]);
const VALID_EDGE_KINDS = new Set(["defined", "inferred"]);
const VALID_EDGE_DIRECTIONS = new Set(["from", "to", "both"]);

/** Read only a literal string from the existing parsed AST. */
function literalString(value: GraphPredicateValue | undefined): string | null {
  return value?.kind === "literal" && typeof value.value === "string" ? value.value : null;
}

/** Read the exact selector identity without interpreting its values. */
function propertyKey(value: GraphPredicateValue | undefined): string | null {
  return value?.kind === "property" ? `${value.namespace}.${value.key}` : null;
}

/** Validate enum-valued relationship selectors recursively and return the first structured issue without formatting English. */
export function graphLensSemanticError(expression: GraphPredicateExpression): PortableLensValidationIssue | null {
  const inspect = (item: GraphPredicateExpression): PortableLensValidationIssue | null => {
    if (item.kind === "all" || item.kind === "any") {
      for (const child of item.expressions) {
        const error = inspect(child);
        if (error) return error;
      }
      return null;
    }
    if (item.kind === "not") return inspect(item.expression);
    let property: string | null = null;
    let value: string | null = null;
    if (item.kind === "compare") {
      property = propertyKey(item.left);
      value = literalString(item.right);
    } else if (item.functionName === "text.equals" || item.functionName === "collection.contains") {
      property = propertyKey(item.args[0]);
      value = literalString(item.args[1]);
    }
    if (!property || value === null) return null;
    const normalized = value.trim().toLocaleLowerCase();
    if (property === "edge.role" && !VALID_EDGE_ROLES.has(normalized)) {
      return { code: "unknown-edge-role", value };
    }
    if (property === "edge.kind" && !VALID_EDGE_KINDS.has(normalized)) return { code: "unknown-edge-kind", value };
    if (property === "edge.direction" && !VALID_EDGE_DIRECTIONS.has(normalized)) return { code: "unknown-edge-direction", value };
    return null;
  };
  return inspect(expression);
}

/** Validate syntax, selector dependencies and relationship enum values for editor feedback without producing UI text. */
export function validateGraphLensExpression(expression: string): PortableLensValidationIssue | null {
  const parsed = tryParseGraphPredicateExpression(expression);
  if (!parsed.expression) return { code: "parse", issue: parsed.error ?? { code: "invalid-expression", position: 1 } };
  const predicate = compileGraphPredicate(parsed.expression);
  if (predicate.dependencies.namespaces.size === 0) return { code: "selector-reference-required" };
  return graphLensSemanticError(parsed.expression);
}

