/** Bounded cache-only connector composition for non-Classic views. Canonical incidence/style stays with GraphIndex; exact admitted occurrence geometry supplies physical ports. No acquisition, classification or relationship writing occurs here. */
import type {GateSide, GraphPage, Neighbour, PositionedEdge, PositionedNode, Role} from "../../types";
import type {KplexSettings} from "../../settings";
import {resolveLinkStyle} from "../../index/style";
import {occurrenceKey, semanticSceneEdge} from "./scene";

/** Preserve opaque path identity and use one unordered canonical pair, matching the existing connector deduplication policy. */
function pair(a: string, b: string): string {return JSON.stringify(a < b ? [a, b] : [b, a]);}

/** Map existing semantic roles to a declared physical gate; an explicit unsupported port map never acquires a fallback gate. */
export function occurrenceRelationPort(node: PositionedNode, role: Role): GateSide | undefined {
  if (["left", "right", "previous", "next"].includes(role) && node.peerPort) return node.peerPort.side;
  const normalized = role === "previous" ? "left" : role === "next" ? "right" : role;
  return (Object.entries(node.physicalPorts ?? {}) as [GateSide, string][]).find(([, value]) => value === normalized)?.[0];
}

/** The inverse describes the same canonical relation as seen from its other endpoint, independently of arrow styling. */
function inverse(role: Role): Role {
  return role === "parent" ? "child" : role === "child" ? "parent" : role === "left" ? "right" : role === "right" ? "left"
    : role === "previous" ? "next" : role === "next" ? "previous" : "sibling";
}

/**
 * Add one closest compatible visible occurrence pair for each extra canonical relationship.
 * Primary semantic pairs win; ties follow admitted scene order, so a repeated note never gains
 * fabricated ancestry. Synthetic/transient endpoints and unsupported physical ports are excluded.
 * Hard work/edge caps return an honest limited flag; zero reads cannot assert semantic completeness.
 */
export function appendOccurrenceCrossLinks(nodes: readonly PositionedNode[], edges: PositionedEdge[],
  read: {get(path: string): GraphPage | undefined; visibleRelationshipsWithin(page: GraphPage, within: Set<string>): Neighbour[]},
  settings: KplexSettings): {limited: boolean} {
  const copies = new Map<string, PositionedNode[]>(), seen = new Set<string>();
  for (const node of nodes) {
    if (!node.occurrenceId || node.page.transient || read.get(node.page.path) !== node.page || node.physicalPorts === undefined) continue;
    const rows = copies.get(node.page.path) ?? []; rows.push(node); copies.set(node.page.path, rows);
  }
  for (const edge of edges) if (semanticSceneEdge(edge)) seen.add(pair(edge.sourcePath, edge.targetPath));
  const within = new Set(copies.keys());
  let work = 0, added = 0;
  for (const sources of copies.values()) {
    if (++work > 16384) return {limited: true};
    const source = sources[0].page;
    for (const relation of read.visibleRelationshipsWithin(source, within)) {
      if (++work > 16384 || added >= 4096) return {limited: true};
      const key = pair(source.path, relation.page.path), targets = copies.get(relation.page.path);
      if (source.path === relation.page.path || seen.has(key) || !targets || targets[0].page !== relation.page) continue;
      let best: {source: PositionedNode; target: PositionedNode; sourcePort: GateSide; targetPort: GateSide; distance: number} | undefined;
      for (const a of sources) for (const b of targets) {
        if (++work > 16384) return {limited: true};
        const sourcePort = occurrenceRelationPort(a, relation.role), targetPort = occurrenceRelationPort(b, inverse(relation.role));
        if (!sourcePort || !targetPort) continue;
        const distance = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (!best || distance < best.distance) best = {source: a, target: b, sourcePort, targetPort, distance};
      }
      if (!best) continue;
      seen.add(key); added++;
      edges.push({id: JSON.stringify(["cross", occurrenceKey(best.source), occurrenceKey(best.target), relation.role]), kind: "semantic",
        sourcePath: source.path, targetPath: relation.page.path, sourceOccurrence: occurrenceKey(best.source), targetOccurrence: occurrenceKey(best.target),
        sourcePort: best.sourcePort, targetPort: best.targetPort, role: relation.role, relationType: relation.relationType,
        typeDefinition: relation.typeDefinition, direction: relation.linkDirection, style: resolveLinkStyle(relation, settings, source), isCrossLink: true});
    }
  }
  return {limited: false};
}
