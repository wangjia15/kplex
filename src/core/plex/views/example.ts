/** Executable developer example: two measured columns, canonical direct child connectors and
 * presentation-only state/configuration. Imports use the supported pure entry point exclusively. */
import {CANVAS_VIEW_API_VERSION, type PlexViewDefinition, type PlexOccurrence, type PlexViewEdge} from "./index";

/** Read a small supported state while retaining opaque future payloads in workspace storage. */
function side(value: unknown): -1 | 1 | null {
  if (!value || typeof value !== "object" || Reflect.get(value, "version") !== 1) return null;
  const valueSide: unknown = Reflect.get(value, "side");
  return valueSide === -1 || valueSide === 1 ? valueSide : null;
}
export const exampleViewDefinition: PlexViewDefinition = {
  id: "org.example.columns", version: CANVAS_VIEW_API_VERSION, labelKey: "Example columns", icon: "columns-2",
  capabilities: {}, defaultState: {version: 1, side: 1},
  configuration: {version: 1, fields: {
    spacing: {defaultValue: 80, validate: value => typeof value === "number" && Number.isFinite(value) && value >= 20 && value <= 200},
    showHeading: {defaultValue: true, validate: value => typeof value === "boolean"},
    title: {defaultValue: "Example columns", validate: value => typeof value === "string" && value.length <= 128},
  }},
  /** Unknown versions remain intact; unsupported state has no command authority. */
  restoreState: value => value ?? {version: 1, side: 1},
  reduceState(state, action) {
    if (side(state) === null || action.id !== "side" || action.args !== -1 && action.args !== 1) return {status: "unavailable"};
    return {status: "updated", state: {version: 1, side: action.args}};
  },
  /** Projection uses existing bounded, current facts only; no source or mutation API exists. */
  project(input) {
    if (!input.read.isCurrent() || !input.read.node(input.attention)) return null;
    const direction = side(input.state) ?? 1;
    const occurrences: PlexOccurrence[] = [{id: "focus", nodeId: input.attention, representation: "thought", ports: {right: "child", left: "child"}}];
    const edges: PlexViewEdge[] = [], seen = new Set([input.attention]);
    const children = input.read.relations(input.attention, "child", Math.max(0, input.maximum - 1));
    for (const relation of children.items) {
      if (seen.has(relation.node.id) || occurrences.length >= input.maximum) continue;
      seen.add(relation.node.id);
      const id = `child-${occurrences.length}`;
      occurrences.push({id, nodeId: relation.node.id, representation: "thought", role: relation.role, relation,
        ports: {[direction === 1 ? "left" : "right"]: "parent"}});
      edges.push({id: `edge-${id}`, kind: "semantic", source: "focus", target: id,
        sourceNode: input.attention, targetNode: relation.node.id, relation,
        sourcePort: direction === 1 ? "right" : "left", targetPort: direction === 1 ? "left" : "right"});
    }
    return {attention: input.attention, entry: "focus", frame: "focus", root: "focus", occurrences, edges,
      truncated: children.truncated, coverage: children.coverage,
      heading: input.configuration?.status === "available" && input.configuration.values.showHeading === true
        ? {literal: String(input.configuration.values.title)} : null};
  },
  /** Measured cards are positioned without a private renderer, label measurer or settings owner. */
  layout(projection, measurements, _preferences, _editor, context) {
    const positions = new Map<string, {x: number; y: number; width: number; height: number}>();
    const focus = measurements.find(row => row.id === projection.entry);
    if (!focus) return {positions, areas: []};
    const first = projection.edges[0], direction = first?.sourcePort === "left" ? -1 : 1;
    const spacing = context?.configuration?.status === "available" ? Number(context.configuration.values.spacing) : 80;
    positions.set(focus.id, {x: -focus.width / 2, y: -focus.height / 2, width: focus.width, height: focus.height});
    let y = 0;
    for (const row of measurements) {
      if (row.id === focus.id) continue;
      positions.set(row.id, {x: direction === 1 ? focus.width / 2 + spacing : -focus.width / 2 - spacing - row.width,
        y, width: row.width, height: row.height});
      y += row.height + 20;
    }
    return {positions, areas: []};
  },
};
