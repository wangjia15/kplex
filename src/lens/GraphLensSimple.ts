import type { GraphLensScope } from "./GraphLens";
import { tryParseGraphPredicateExpression } from "./GraphPredicateParser";
import type { GraphPredicateExpression, GraphPredicateValue } from "./GraphPredicate";

export type GraphLensSimpleCombinator = "all" | "any";
export type GraphLensSimpleOperator =
  | "is"
  | "is-not"
  | "contains"
  | "starts-with"
  | "ends-with"
  | "has"
  | "does-not-have"
  | "in-folder"
  | "not-in-folder"
  | "exists"
  | "not-exists";

export type GraphLensSimpleField =
  | "node.label"
  | "file.path"
  | "file.folder"
  | "file.tags"
  | "node.noteType"
  | "file.extension"
  | "note.property"
  | "edge.definition"
  | "edge.role"
  | "edge.kind"
  | "edge.direction"
  | "edge.sourcePath"
  | "edge.targetPath"
  | "evidence.fieldName"
  | "evidence.definition"
  | "evidence.sourceKind"
  | "evidence.active"
  | "evidence.declaredRole"
  | "evidence.declaredByPath"
  | "evidence.declaredTargetPath"
  | "evidence.suppressionReason";

export type GraphLensSimpleCondition = {
  id: string;
  field: GraphLensSimpleField;
  operator: GraphLensSimpleOperator;
  value: string;
  propertyName?: string;
};

export type GraphLensSimpleModel = {
  combinator: GraphLensSimpleCombinator;
  conditions: GraphLensSimpleCondition[];
};

export function createGraphLensConditionId(): string {
  return `condition-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultGraphLensSimpleCondition(scope: GraphLensScope): GraphLensSimpleCondition {
  if (scope === "edge") return { id: createGraphLensConditionId(), field: "edge.definition", operator: "is", value: "" };
  if (scope === "evidence") return { id: createGraphLensConditionId(), field: "evidence.fieldName", operator: "is", value: "" };
  return { id: createGraphLensConditionId(), field: "node.label", operator: "contains", value: "" };
}

export function defaultGraphLensSimpleModel(scope: GraphLensScope): GraphLensSimpleModel {
  return { combinator: "all", conditions: [defaultGraphLensSimpleCondition(scope)] };
}

const quote = (value: string): string => JSON.stringify(value);
const propertyRef = (condition: GraphLensSimpleCondition): string => {
  if (condition.field === "note.property") return `note[${quote(condition.propertyName?.trim() ?? "")}]`;
  if (condition.field === "file.folder") return "file.path";
  return condition.field;
};

export function graphLensSimpleConditionNeedsValue(condition: GraphLensSimpleCondition): boolean {
  return condition.operator !== "exists" && condition.operator !== "not-exists";
}

export function buildGraphLensSimpleConditionExpression(condition: GraphLensSimpleCondition): string {
  const ref = propertyRef(condition);
  const value = quote(condition.value.trim());
  const comparesToCenter = condition.value === "$this" && ["edge.sourcePath", "edge.targetPath", "evidence.declaredByPath", "evidence.declaredTargetPath"].includes(condition.field);
  switch (condition.operator) {
    case "is":
      if (comparesToCenter) return `${ref} == this.path`;
      if (condition.field === "evidence.active") return `${ref} == ${condition.value === "false" ? "false" : "true"}`;
      return `${ref}.equals(${value})`;
    case "is-not":
      if (comparesToCenter) return `${ref} != this.path`;
      if (condition.field === "evidence.active") return `${ref} != ${condition.value === "false" ? "false" : "true"}`;
      return `not ${ref}.equals(${value})`;
    case "contains": return `${ref}.contains(${value})`;
    case "starts-with": return `${ref}.startsWith(${value})`;
    case "ends-with": return `${ref}.endsWith(${value})`;
    case "has": return condition.field === "file.tags" ? `file.hasTag(${value})` : `${ref}.contains(${value})`;
    case "does-not-have": return condition.field === "file.tags" ? `not file.hasTag(${value})` : `not ${ref}.contains(${value})`;
    case "in-folder": return `file.inFolder(${value})`;
    case "not-in-folder": return `not file.inFolder(${value})`;
    case "exists": return `${ref}.exists()`;
    case "not-exists": return `not ${ref}.exists()`;
  }
}

export function buildGraphLensSimpleExpression(model: GraphLensSimpleModel): string {
  const parts = model.conditions.map(buildGraphLensSimpleConditionExpression).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  const joiner = model.combinator === "any" ? " or " : " and ";
  return parts.map((part) => `(${part})`).join(joiner);
}

function propertyFromValue(value: GraphPredicateValue): { field: GraphLensSimpleField; propertyName?: string } | null {
  if (value.kind !== "property") return null;
  const full = `${value.namespace}.${value.key}`;
  const direct = new Set<GraphLensSimpleField>([
    "node.label", "file.path", "file.tags", "node.noteType", "file.extension",
    "edge.definition", "edge.role", "edge.kind", "edge.direction", "edge.sourcePath", "edge.targetPath",
    "evidence.fieldName", "evidence.definition", "evidence.sourceKind", "evidence.active", "evidence.declaredRole",
    "evidence.declaredByPath", "evidence.declaredTargetPath", "evidence.suppressionReason",
  ]);
  if (direct.has(full as GraphLensSimpleField)) return { field: full as GraphLensSimpleField };
  if (value.namespace === "note" && value.key) return { field: "note.property", propertyName: value.key };
  return null;
}

function literalText(value: GraphPredicateValue | undefined): string | null {
  if (!value || value.kind !== "literal") return null;
  if (typeof value.value === "string" || typeof value.value === "number" || typeof value.value === "boolean") return String(value.value);
  return value.value === null ? "" : null;
}

function simpleConditionFromExpression(expression: GraphPredicateExpression, inverted = false): GraphLensSimpleCondition | null {
  if (expression.kind === "not") return simpleConditionFromExpression(expression.expression, !inverted);
  if (expression.kind === "compare") {
    const property = propertyFromValue(expression.left);
    const rightIsCenter = expression.right.kind === "property" && expression.right.namespace === "this" && expression.right.key === "path";
    const value = rightIsCenter ? "$this" : literalText(expression.right);
    if (!property || value === null) return null;
    const isEqual = expression.operator === "eq";
    const isNotEqual = expression.operator === "neq";
    if (!isEqual && !isNotEqual) return null;
    const operator: GraphLensSimpleOperator = (isEqual !== inverted) ? "is" : "is-not";
    return { id: createGraphLensConditionId(), ...property, operator, value };
  }
  if (expression.kind !== "call") return null;

  const property = propertyFromValue(expression.args[0]);
  if (!property) return null;
  if (expression.functionName === "value.exists") {
    return { id: createGraphLensConditionId(), ...property, operator: inverted ? "not-exists" : "exists", value: "" };
  }
  const value = literalText(expression.args[1]);
  if (value === null) return null;

  let operator: GraphLensSimpleOperator | null = null;
  if (expression.functionName === "text.equals") operator = inverted ? "is-not" : "is";
  else if (expression.functionName === "text.contains") operator = inverted ? "does-not-have" : "contains";
  else if (expression.functionName === "text.startsWith" && !inverted) operator = "starts-with";
  else if (expression.functionName === "text.endsWith" && !inverted) operator = "ends-with";
  else if (expression.functionName === "tags.has") operator = inverted ? "does-not-have" : "has";
  else if (expression.functionName === "file.inFolder") {
    return { id: createGraphLensConditionId(), field: "file.folder", operator: inverted ? "not-in-folder" : "in-folder", value };
  }
  if (!operator) return null;
  return { id: createGraphLensConditionId(), ...property, operator, value };
}

export function tryParseGraphLensSimpleExpression(source: string): GraphLensSimpleModel | null {
  const parsed = tryParseGraphPredicateExpression(source);
  if (!parsed.expression) return null;
  const expression = parsed.expression;
  if (expression.kind === "all" || expression.kind === "any") {
    const conditions = expression.expressions.map((child) => simpleConditionFromExpression(child));
    if (conditions.some((condition) => condition === null)) return null;
    return {
      combinator: expression.kind === "any" ? "any" : "all",
      conditions: conditions as GraphLensSimpleCondition[],
    };
  }
  const condition = simpleConditionFromExpression(expression);
  return condition ? { combinator: "all", conditions: [condition] } : null;
}
