/** Local Wu Xing projection consumes bounded canonical direct incidence and cached selected properties. It owns no scheduler, vault inventory or semantic mutation. */
import type {PlexProjection, PlexViewInput, PlexOccurrence, PlexViewEdge, PhysicalPort} from "../contracts";
import type {NodeId} from "../../../graph/model";
import type {Role} from "../../../graph/relations";
import {classifyWuXingNode} from "./classification";
import {wuXingConfiguration} from "./configuration";

/** Physical gates retain established semantic directions regardless of the phase containing a note. */
function ports(role: Role): {source: PhysicalPort; target: PhysicalPort} {
  if (role === "parent") return {source: "top", target: "bottom"};
  if (role === "child") return {source: "bottom", target: "top"};
  return role === "left" || role === "previous" ? {source: "left", target: "right"} : {source: "right", target: "left"};
}

/** Deduplicate notes across six direct roles while preserving every admitted canonical role edge. Stable IDs do not contain classification or layout state. */
export function projectWuXing(input: PlexViewInput): PlexProjection | null {
  const attention = input.read.node(input.attention);
  if (!attention || !input.read.isCurrent()) return null;
  const configuration = wuXingConfiguration(input.configuration), occurrences = new Map<NodeId, PlexOccurrence>(), edges: PlexViewEdge[] = [];
  /** A phase is a grouping partition, never an ontology role or write target. */
  const occurrence = (node: typeof attention, role?: Role, relation?: PlexOccurrence["relation"]): PlexOccurrence => {
    const membership = classifyWuXingNode(node, input.read, configuration);
    return {id: JSON.stringify(["wuxing", node.id]), nodeId: node.id,
      ...(node.id === attention.id ? {} : {areaId: `wuxing.${membership}`}), representation: "thought",
      groupingPartition: `wuxing.${membership}`, role: node.id === attention.id ? undefined : role, relation,
      ports: {top: "parent", bottom: "child", left: "left", right: "right"}};
  };
  const entry = occurrence(attention); occurrences.set(attention.id, entry);
  let truncated = false, coverage = input.read.coverage;
  for (const role of ["parent", "child", "left", "right", "previous", "next"] as const) {
    const rows = input.read.relations(attention.id, role);
    truncated ||= rows.truncated;
    if (rows.coverage === "unavailable") coverage = "unavailable";
    for (const relation of [...rows.items.slice(0, input.maximum)].sort((left, right) => input.read.compare(left.node, right.node))) {
      if (relation.node.id === attention.id) continue;
      const target = occurrences.get(relation.node.id) ?? occurrence(relation.node, role, relation);
      occurrences.set(relation.node.id, target);
      const port = ports(role);
      edges.push({id: JSON.stringify(["wuxing-edge", role, relation.node.id]), kind: "semantic", source: entry.id, target: target.id,
        sourceNode: attention.id, targetNode: relation.node.id, sourcePort: port.source, targetPort: port.target, relation});
    }
    truncated ||= rows.items.length > input.maximum;
  }
  if (!input.read.isCurrent()) return null;
  return {attention: attention.id, layoutRoot: attention.id, entry: entry.id, editor: entry.id, frame: entry.id,
    occurrences: [...occurrences.values()], edges, truncated, coverage};
}
