import type { GraphIndex } from "../index/GraphIndex";
import type { GraphPage, LinkStyle, NodeStyle, StrokeStyle, FillStyle } from "../types";
import {
  compileGraphPredicate,
  type CompiledGraphPredicate,
  type GraphPredicateContext,
  type GraphPredicateEdgeContext,
  type GraphPredicateEngine,
  type GraphPredicateExpression,
  type GraphPredicateValue,
} from "./GraphPredicate";
import { tryParseGraphPredicateExpression } from "./GraphPredicateParser";

export type GraphLensScope = "node" | "edge" | "evidence";
export type GraphLensMode = "include" | "exclude" | "style";

export type GraphLensNodeStyle = Pick<NodeStyle, "backgroundColor" | "fillStyle" | "textColor" | "borderColor" | "strokeWidth" | "strokeStyle">;
export type GraphLensEdgeStyle = Pick<LinkStyle, "strokeColor" | "strokeWidth" | "strokeStyle" | "showLabel" | "textColor">;
export type GraphLensStyle = {
  node?: GraphLensNodeStyle;
  edge?: GraphLensEdgeStyle;
};

export type GraphLensDefinition = {
  id: string;
  name: string;
  enabled: boolean;
  scope: GraphLensScope;
  mode: GraphLensMode;
  expression: string;
  style?: GraphLensStyle;
};

export type CompiledGraphLens = GraphLensDefinition & {
  predicate: CompiledGraphPredicate;
};

export type GraphLensCompileError = { id: string; name: string; error: string };

export type CompiledGraphLensSet = {
  lenses: CompiledGraphLens[];
  errors: GraphLensCompileError[];
  usesFrontmatter: boolean;
  noteProperties: ReadonlySet<string>;
};

export const EMPTY_GRAPH_LENS_SET: CompiledGraphLensSet = {
  lenses: [],
  errors: [],
  usesFrontmatter: false,
  noteProperties: new Set<string>(),
};

const VALID_EDGE_ROLES = new Set(["parent", "child", "left", "right", "previous", "next", "sibling"]);
const VALID_EDGE_KINDS = new Set(["defined", "inferred"]);
const VALID_EDGE_DIRECTIONS = new Set(["from", "to", "both"]);

function literalString(value: GraphPredicateValue | undefined): string | null {
  return value?.kind === "literal" && typeof value.value === "string" ? value.value : null;
}

function propertyKey(value: GraphPredicateValue | undefined): string | null {
  return value?.kind === "property" ? `${value.namespace}.${value.key}` : null;
}

function migrateEarlyCheckpointLensExpression(scope: GraphLensScope, source: string): string {
  if (scope !== "edge") return source;
  const trimmed = source.trim();
  const bare = trimmed.match(/^(["'])(.*)\1$/s);
  if (bare) return `edge.definition.equals(${JSON.stringify(bare[2])})`;
  const parsed = tryParseGraphPredicateExpression(trimmed);
  const expression = parsed.expression;
  if (expression?.kind !== "compare" || expression.operator !== "eq") return source;
  if (propertyKey(expression.left) !== "edge.role") return source;
  const value = literalString(expression.right);
  if (value === null || VALID_EDGE_ROLES.has(value.trim().toLocaleLowerCase())) return source;
  return `edge.definition.equals(${JSON.stringify(value)})`;
}

function graphLensSemanticError(expression: GraphPredicateExpression): string | null {
  const inspect = (item: GraphPredicateExpression): string | null => {
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
      return `Unknown Plex position “${value}”. To match a relationship property such as working-on, use Relationship property in Simple view (edge.definition in Code view).`;
    }
    if (property === "edge.kind" && !VALID_EDGE_KINDS.has(normalized)) return `Unknown relationship kind “${value}”. Use defined or inferred.`;
    if (property === "edge.direction" && !VALID_EDGE_DIRECTIONS.has(normalized)) return `Unknown relationship direction “${value}”. Use from, to, or both.`;
    return null;
  };
  return inspect(expression);
}

const VALID_STROKE_STYLES = new Set<StrokeStyle>(["solid", "dashed", "dotted"]);
const VALID_FILL_STYLES = new Set<FillStyle>(["solid", "hachure", "cross-hatch"]);
const HEX_COLOR = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;

function sanitizeColor(value: unknown): string | undefined {
  return typeof value === "string" && HEX_COLOR.test(value.trim()) ? value.trim() : undefined;
}

function sanitizeWidth(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0.5, Math.min(8, value));
}

function sanitizeGraphLensStyle(value: unknown, scope: GraphLensScope): GraphLensStyle | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { node?: Record<string, unknown>; edge?: Record<string, unknown> };
  if (scope === "node") {
    const source = raw.node;
    if (!source) return undefined;
    const node: GraphLensNodeStyle = {};
    const backgroundColor = sanitizeColor(source.backgroundColor); if (backgroundColor) node.backgroundColor = backgroundColor;
    const textColor = sanitizeColor(source.textColor); if (textColor) node.textColor = textColor;
    const borderColor = sanitizeColor(source.borderColor); if (borderColor) node.borderColor = borderColor;
    const strokeWidth = sanitizeWidth(source.strokeWidth); if (strokeWidth !== undefined) node.strokeWidth = strokeWidth;
    if (typeof source.strokeStyle === "string" && VALID_STROKE_STYLES.has(source.strokeStyle as StrokeStyle)) node.strokeStyle = source.strokeStyle as StrokeStyle;
    if (typeof source.fillStyle === "string" && VALID_FILL_STYLES.has(source.fillStyle as FillStyle)) node.fillStyle = source.fillStyle as FillStyle;
    return Object.keys(node).length ? { node } : undefined;
  }
  const source = raw.edge;
  if (!source) return undefined;
  const edge: GraphLensEdgeStyle = {};
  const strokeColor = sanitizeColor(source.strokeColor); if (strokeColor) edge.strokeColor = strokeColor;
  const textColor = sanitizeColor(source.textColor); if (textColor) edge.textColor = textColor;
  const strokeWidth = sanitizeWidth(source.strokeWidth); if (strokeWidth !== undefined) edge.strokeWidth = strokeWidth;
  if (typeof source.strokeStyle === "string" && VALID_STROKE_STYLES.has(source.strokeStyle as StrokeStyle)) edge.strokeStyle = source.strokeStyle as StrokeStyle;
  if (typeof source.showLabel === "boolean") edge.showLabel = source.showLabel;
  return Object.keys(edge).length ? { edge } : undefined;
}

export function defaultGraphLensStyle(scope: GraphLensScope): GraphLensStyle {
  return scope === "node"
    ? { node: { borderColor: "#ffb300", strokeWidth: 2 } }
    : { edge: { strokeColor: "#ffb300", strokeWidth: 2 } };
}

export function createGraphLensId(): string {
  return `lens-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeGraphLensDefinitions(value: unknown): GraphLensDefinition[] {
  if (!Array.isArray(value)) return [];
  const output: GraphLensDefinition[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Partial<GraphLensDefinition>;
    const scope: GraphLensScope = raw.scope === "edge" || raw.scope === "evidence" ? raw.scope : "node";
    const rawExpression = typeof raw.expression === "string" ? raw.expression.trim() : "";
    const expression = migrateEarlyCheckpointLensExpression(scope, rawExpression);
    if (!expression) continue;
    let id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : createGraphLensId();
    while (ids.has(id)) id = createGraphLensId();
    ids.add(id);
    output.push({
      id,
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Untitled lens",
      enabled: raw.enabled === true,
      scope,
      mode: raw.mode === "exclude" ? "exclude" : raw.mode === "style" ? "style" : "include",
      expression,
      style: sanitizeGraphLensStyle(raw.style, scope),
    });
  }
  return output;
}

export function compileGraphLensDefinitions(definitions: readonly GraphLensDefinition[]): CompiledGraphLensSet {
  const lenses: CompiledGraphLens[] = [];
  const errors: GraphLensCompileError[] = [];
  const noteProperties = new Set<string>();
  let usesFrontmatter = false;
  for (const lens of definitions) {
    if (!lens.enabled) continue;
    const parsed = tryParseGraphPredicateExpression(lens.expression);
    if (!parsed.expression) {
      errors.push({ id: lens.id, name: lens.name, error: parsed.error ?? "Invalid expression" });
      continue;
    }
    const predicate = compileGraphPredicate(parsed.expression);
    if (predicate.dependencies.namespaces.size === 0) {
      errors.push({ id: lens.id, name: lens.name, error: "The selector must reference a note, relationship, evidence, file, or this." });
      continue;
    }
    const semanticError = graphLensSemanticError(parsed.expression);
    if (semanticError) {
      errors.push({ id: lens.id, name: lens.name, error: semanticError });
      continue;
    }
    predicate.dependencies.noteProperties.forEach((property) => noteProperties.add(property));
    usesFrontmatter ||= predicate.dependencies.usesFrontmatter;
    lenses.push({ ...lens, predicate });
  }
  return { lenses, errors, usesFrontmatter, noteProperties };
}

export function validateGraphLensExpression(expression: string): string | null {
  const parsed = tryParseGraphPredicateExpression(expression);
  if (!parsed.expression) return parsed.error ?? "Invalid expression";
  const predicate = compileGraphPredicate(parsed.expression);
  if (predicate.dependencies.namespaces.size === 0) return "The selector must reference a note, relationship, evidence, file, or this.";
  return graphLensSemanticError(parsed.expression);
}

export type GraphLensCandidate = {
  page: GraphPage;
  label: string;
  center?: GraphPage;
  edge?: GraphPredicateEdgeContext;
};

function matchesEvidenceLens(
  engine: GraphPredicateEngine,
  index: GraphIndex,
  lens: CompiledGraphLens,
  candidate: GraphLensCandidate,
): boolean {
  const center = candidate.center;
  const sourcePath = candidate.edge?.sourcePath ?? center?.path;
  const targetPath = candidate.edge?.targetPath ?? candidate.page.path;
  if (!sourcePath || sourcePath === targetPath) return false;
  const explanation = index.explainRelationship(sourcePath, targetPath);
  if (!explanation) return false;
  return explanation.decisions.some((decision) => {
    const evidence = {
      ...decision.evidence,
      active: decision.active,
      suppressionReason: decision.suppressionReason,
    };
    const context: GraphPredicateContext = {
      node: { page: candidate.page, label: candidate.label },
      center,
      edge: candidate.edge,
      evidence,
    };
    return engine.matches(lens.predicate, context);
  });
}

function matchesLens(
  engine: GraphPredicateEngine,
  index: GraphIndex,
  lens: CompiledGraphLens,
  candidate: GraphLensCandidate,
): boolean {
  if (lens.scope === "evidence") return matchesEvidenceLens(engine, index, lens, candidate);
  const context: GraphPredicateContext = {
    node: { page: candidate.page, label: candidate.label },
    center: candidate.center,
    edge: candidate.edge,
  };
  return engine.matches(lens.predicate, context);
}

/**
 * Active include lenses are OR'ed (union); active exclude lenses subtract from that result.
 * With no include lens the whole currently materialized Plex is the baseline. This function never
 * discovers or traverses additional graph depth: it only decides whether an already-visible
 * candidate survives the lens layer.
 */
export function matchesGraphLenses(
  engine: GraphPredicateEngine,
  index: GraphIndex,
  lensSet: CompiledGraphLensSet,
  candidate: GraphLensCandidate,
): boolean {
  if (!lensSet.lenses.length) return true;
  const includes = lensSet.lenses.filter((lens) => lens.mode === "include");
  const excludes = lensSet.lenses.filter((lens) => lens.mode === "exclude");
  const included = includes.length === 0 || includes.some((lens) => matchesLens(engine, index, lens, candidate));
  if (!included) return false;
  return !excludes.some((lens) => matchesLens(engine, index, lens, candidate));
}


/** Merge matching style lenses in list order. Later lenses override earlier style fields. */
export function graphLensNodeStyle(
  engine: GraphPredicateEngine,
  index: GraphIndex,
  lensSet: CompiledGraphLensSet,
  candidate: GraphLensCandidate,
): GraphLensNodeStyle {
  const style: GraphLensNodeStyle = {};
  for (const lens of lensSet.lenses) {
    if (lens.mode !== "style" || lens.scope !== "node" || !lens.style?.node) continue;
    if (matchesLens(engine, index, lens, candidate)) Object.assign(style, lens.style.node);
  }
  return style;
}

/** Edge and evidence style lenses both decorate the resolved visible relationship. */
export function graphLensEdgeStyle(
  engine: GraphPredicateEngine,
  index: GraphIndex,
  lensSet: CompiledGraphLensSet,
  candidate: GraphLensCandidate,
): GraphLensEdgeStyle {
  const style: GraphLensEdgeStyle = {};
  for (const lens of lensSet.lenses) {
    if (lens.mode !== "style" || lens.scope === "node" || !lens.style?.edge) continue;
    if (matchesLens(engine, index, lens, candidate)) Object.assign(style, lens.style.edge);
  }
  return style;
}
