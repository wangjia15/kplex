/** Advanced category rules compile through the shared predicate grammar/engine. Only bounded
 * immutable syntax is retained; note values and canonical evidence live in one projection frame. */
import {compileGraphPredicate, GraphPredicateEngine, type CompiledGraphPredicate, type GraphPredicateContext,
  type GraphPredicateRead, type GraphPredicateResult, type GraphPredicateValue, type GraphPredicateEvidence} from "../../predicate";
import {tryParseGraphPredicateExpression, type PredicateParseIssue} from "../../predicateParser";
import type {GraphNodeView} from "../../../graph/model";
import type {PlexViewRead, PlexViewRelation, PlexEvidenceRead} from "../contracts";
import type {FacetMembership, FacetPreset} from "./contracts";
import type {NotePropertyAvailability, NotePropertyRead} from "../../noteProperties";
import {evaluatePortablePredicateContexts} from "../../lens";

export type FacetRulePlan = Readonly<{status: "ready"; rules: ReadonlyMap<string, CompiledGraphPredicate>; fields: readonly string[]; evidence: boolean}>
  | Readonly<{status: "invalid"; category: string; issue?: PredicateParseIssue}>;
const plans = new Map<string, FacetRulePlan>();

/** At most16 finite preset syntax plans; no note/source/host object or property value survives. */
export function compileFacetRules(preset: FacetPreset): FacetRulePlan {
  const signature = JSON.stringify(preset.order.map(id => [id, preset.categories[id].rule ?? ""]));
  const previous = plans.get(signature);if (previous) return previous;
  const rules = new Map<string, CompiledGraphPredicate>(), fields = new Set<string>();let evidence = false;
  let plan: FacetRulePlan | undefined;
  for (const id of preset.order) {
    const source = preset.categories[id].rule?.trim() ?? "";
    if (!source || source.length > 2048) {plan = {status: "invalid", category: id};break;}
    const parsed = tryParseGraphPredicateExpression(source);
    if (!parsed.expression) {plan = {status: "invalid", category: id, issue: parsed.error};break;}
    const compiled = compileGraphPredicate(parsed.expression);rules.set(id, compiled);
    if (compiled.dependencies.unsupportedSelectors?.size) {plan = {status: "invalid", category: id};break;}
    for (const key of [...compiled.dependencies.noteProperties, ...compiled.dependencies.focusProperties ?? []]) fields.add(key);
    evidence ||= compiled.dependencies.namespaces.has("evidence");
    if (fields.size > 16 || [...fields].some(field => field.length > 128)) {plan = {status: "invalid", category: id};break;}
  }
  plan ??= {status: "ready", rules, fields: [...fields], evidence};
  if (plans.size >= 16) {const first = plans.keys().next();if (!first.done) plans.delete(first.value);}
  plans.set(signature, plan);return plan;
}

/** Only admitted synchronous values are reused across categories/relationship contexts. The
 * shared field owner and final scene proof retain lifetime authority; this is not an index. */
export function facetRuleClassifier(read: PlexViewRead, center: GraphNodeView, plan: FacetRulePlan):
  Readonly<{classify: (node: GraphNodeView, relations: readonly PlexViewRelation[]) => FacetMembership; isCurrent: () => boolean}> {
  const fields = new Map<string, NotePropertyRead>(), availability = new Map<string, NotePropertyAvailability>();
  const values = new Map<string, GraphPredicateRead>(), pairs = new Map<string, readonly GraphPredicateEvidence[] | null>();
  let evidenceCount = 0;
  const engine = new GraphPredicateEngine({getNoteProperty: () => undefined,
    notePropertyAvailability: node => {
      if (!availability.has(node.id)) availability.set(node.id, read.properties?.availability(node.id) ?? "unavailable");
      return availability.get(node.id)!;
    }, readNoteProperty: (node, key) => {
      const id = JSON.stringify([node.id, key]);
      if (!fields.has(id)) {
        if (fields.size >= 16384 || !read.isCurrent()) return {status: "unavailable"};
        fields.set(id, read.properties?.read(node.id, key) ?? {status: "unavailable"});
      }
      return fields.get(id)!;
    }});
  const resolve = (value: GraphPredicateValue, context: GraphPredicateContext): GraphPredicateRead => {
    if (!read.isCurrent()) return {status: "unavailable", reason: "metadata"};
    if (value.kind !== "property" || value.namespace === "edge" || value.namespace === "evidence") return engine.readAvailable(value, context);
    const id = JSON.stringify([value.namespace === "this" ? center.id : context.node.node.id, value.namespace, value.key]);
    if (!values.has(id)) {
      if (values.size >= 32768) return {status: "unavailable", reason: "metadata"};
      values.set(id, engine.readAvailable(value, context));
    }
    return values.get(id)!;
  };
  const classify = (node: GraphNodeView, relations: readonly PlexViewRelation[]): FacetMembership => {
    if (plan.status !== "ready") return {status: "unresolved", reason: "rule"};
    const matched: string[] = [];let unknown: Exclude<GraphPredicateResult, {status: "available"}> | undefined;
    for (const [id, predicate] of plan.rules) {
      const needsRelation = predicate.dependencies.namespaces.has("edge") || predicate.dependencies.namespaces.has("evidence");
      const relationships = needsRelation ? predicate.dependencies.namespaces.has("edge") ? relations : relations.slice(0, 1) : [];
      /** Missing context remains absent. The engine can still prove true OR unknown / false AND
       * unknown without inventing a focus self-edge or certifying a missing evidence record. */
      function* contexts(): Iterable<GraphPredicateContext> {
      for (const relation of relationships.length ? relationships : [undefined]) {
        const base: GraphPredicateContext = {node: {node}, center, ...(relation ? {edge: {role: relation.role, relationType: relation.relationType,
          definition: relation.definition, linkDirection: relation.direction, sourcePath: center.path, targetPath: node.path}} : {})};
        let evidence: readonly GraphPredicateContext["evidence"][] = [undefined];
        if (predicate.dependencies.namespaces.has("evidence") && relation) {
          if (!pairs.has(node.id)) {
            const pair: PlexEvidenceRead = read.evidence(center.id, node.id), count = pair.value?.decisions.length ?? 0;
            const bounded = pair.coverage !== "unavailable" && !!pair.value && count <= 256 && evidenceCount + count <= 4096;
            if (bounded) evidenceCount += count;
            pairs.set(node.id, bounded ? pair.value.decisions.map(decision => ({...decision.evidence, active: decision.active, suppressionReason: decision.suppressionReason})) : null);
          }
          const pair = pairs.get(node.id);
          // All canonical decisions remain explicit, including active=false and suppression.
          // An inactive decision can only match the user's actual predicate; it never becomes active.
          evidence = pair?.length ? pair : [undefined];
        }
        for (const decision of evidence) {
          yield {...base, evidence: decision};
        }
      }
      }
      const result = evaluatePortablePredicateContexts(engine, predicate, contexts(), resolve);
      if (result.status === "available" && result.value) matched.push(id);
      else if (result.status !== "available") unknown ??= result;
    }
    if (matched.length > 1) return {status: "conflicting", categories: matched};
    if (unknown) return unknown.reason === "metadata" && read.scope?.(node.id).pending ? {status: "checking"}
      : {status: "unresolved", reason: unknown.reason === "relationship" ? "relationship" : unknown.reason === "metadata" ? "metadata" : unknown.reason === "value" ? "unsupported" : "rule"};
    return matched.length ? {status: "assigned", category: matched[0]} : {status: "unassigned"};
  };
  return {classify, isCurrent: () => {
    if (!read.isCurrent()) return false;
    for (const value of fields.values()) if (value.status === "available" && value.isCurrent && !value.isCurrent()) return false;
    return true;
  }};
}
