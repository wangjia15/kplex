/** Bounded child/peer trees with canonical parents above their root. Projection requests finite host-owned frontiers but never acquires or schedules sources. */
import type {NodeId} from "../../../graph/model";
import type {PlexOccurrence, PlexProjection, PlexViewEdge, PlexViewInput, PlexViewRelation, PlexBranch, PlexRelationRead} from "../contracts";
import {mindMapConfiguration, MIND_MAP_LIMITS} from "./configuration";
import {admitMindMapState, restoreMindMapState, scopeMindMapState} from "./state";
import {mindMapEditorPaths, mindMapOccurrence} from "./occurrences";

type BranchWork = {id: string; lineage: readonly NodeId[]; depth: number; side: -1 | 1; areaId?: string; relation?: PlexViewRelation; parent?: string};

/** Traverse a finite breadth-first child/peer frontier with root parent context; repeated notes remain independent and ancestor cycles become terminal references. */
export function projectMindMap(input: PlexViewInput): PlexProjection | null {
  const configuration = mindMapConfiguration(input.configuration), restored = restoreMindMapState(input.state), root = input.layoutRoot;
  if (!configuration || restored.version !== 1 || !root || !Number.isInteger(input.maximum) || input.maximum < 1
    || input.read.node(root)?.id !== root || !input.read.isCurrent()) return null;
  const scoped = admitMindMapState(scopeMindMapState(restored, root, Math.min(configuration.initialGenerations, configuration.maximumDepth)));
  if (!scoped) return null;
  let state = scoped;
  const maximum = Math.min(configuration.maximumOccurrences, MIND_MAP_LIMITS.occurrences, Math.max(1, input.maximum * 8 + 1));
  const expanded = new Set(state.expanded), collapsed = new Set(state.collapsed), editorPaths = mindMapEditorPaths(input, root);
  const pinned = new Set<string>(), pinChildren = new Map<string, Set<NodeId>>(), pinScopes = new Set<NodeId>();
  for (const path of editorPaths.values()) for (let length = 1; length <= path.length; length++) {
    const id = mindMapOccurrence(path.slice(0, length)); if (!id) continue; pinned.add(id);
    if (length < path.length) {const children = pinChildren.get(id) ?? new Set<NodeId>(); children.add(path[length]); pinChildren.set(id, children); if (length > 1) pinScopes.add(path[length - 1]);}
  }
  const reserved = new Set([...(input.retainedScopes ?? []).slice(0, 16), ...pinScopes].filter(id => id !== root));
  const parents = new Set<NodeId>(), visited = new Set<string>(), occurrences: PlexOccurrence[] = [], edges: PlexViewEdge[] = [];
  const queue: BranchWork[] = [{id: "root", lineage: [root], depth: 0, side: 1}];
  let truncated = false;
  /** Each expanded node exposes actual children/peers; only the root adds parents. Each exact endpoint has one deterministic placement and ancestry still terminates cycles. */
  const readBranches = (id: NodeId, limit: number, atRoot: boolean): PlexRelationRead => {
    const roles = atRoot ? ["parent", "child", "left", "right", "previous", "next"] as const : ["child", "left", "right", "previous", "next"] as const;
    const reads = roles.map(role => input.read.relations(id, role, limit));
    const rows = new Map<NodeId, PlexViewRelation>();
    for (const read of reads) for (const row of read.items) if (!rows.has(row.node.id)) rows.set(row.node.id, row);
    return {items: [...rows.values()], truncated: reads.some(read => read.truncated),
      coverage: reads.some(read => read.coverage === "unavailable") ? "unavailable" : reads.every(read => read.coverage === "local") ? "local" : "cached"};
  };
  /** A new scope cannot displace an already retained frontier during a cache publication or sibling reorder. */
  const admitScope = (id: NodeId): boolean => {
    if (id === root || parents.has(id)) return true;
    if (parents.size >= MIND_MAP_LIMITS.scopes) return false;
    const reservedRemaining = [...reserved].filter(value => !parents.has(value) && value !== id).length;
    if (!reserved.has(id) && parents.size + reservedRemaining >= MIND_MAP_LIMITS.scopes) return false;
    parents.add(id); return true;
  };
  while (queue.length && occurrences.length < maximum) {
    const work = queue.shift()!, canonical = work.lineage[work.lineage.length - 1];
    if (visited.has(work.id)) continue; visited.add(work.id);
    const node = input.read.node(canonical); if (!node || node.id !== canonical || !input.read.isCurrent()) return null;
    const reference = work.lineage.slice(0, -1).includes(canonical);
    // Lowering type limits cannot remove an existing native editor's genuine ancestry. The hard depth/occurrence bounds still apply.
    const maximumDepth = pinChildren.has(work.id) ? Math.max(configuration.maximumDepth, work.depth + 1) : configuration.maximumDepth;
    const scope = input.read.scope?.(canonical) ?? {coverage: "unavailable", prepared: false, complete: false, pending: false};
    const probe = reference ? {items: [], truncated: false, coverage: "cached" as const} : readBranches(canonical, 1, work.depth === 0);
    const wantExpanded = !reference && work.depth < maximumDepth
      && !collapsed.has(work.id) && (expanded.has(work.id) || work.depth < state.initialGenerations!);
    const canExpand = !reference && work.depth < maximumDepth && !(scope.complete && probe.coverage !== "unavailable" && probe.items.length === 0 && !probe.truncated);
    const admitted = wantExpanded && canExpand && admitScope(canonical);
    const rows = admitted ? readBranches(canonical, Math.min(input.maximum, 128), work.depth === 0) : probe;
    // Cached children remain usable before their full scope is prepared. Missing completeness
    // does not mean the displayed branch is unavailable, nor does a count-only proof certify it.
    let status: PlexBranch["status"] = reference || !wantExpanded ? "ready" : scope.pending ? "loading"
      : rows.coverage === "unavailable" ? "unavailable" : scope.complete ? "ready"
        : scope.prepared || rows.items.length > 0 ? "partial" : "unavailable";
    if (wantExpanded && canExpand && !admitted || admitted && rows.truncated || !reference && work.depth >= maximumDepth
      && (rows.items.length > 0 || !scope.complete)) {status = "limited"; truncated = true;}
    const children: {id: string; lineage: readonly NodeId[]; relation: PlexViewRelation}[] = [];
    if (admitted) {
      const relations = new Map(rows.items.map(row => [row.node.id, row]));
      for (const child of pinChildren.get(work.id) ?? []) if (!relations.has(child)) {
        const roles = work.depth === 0 ? ["parent", "child", "left", "right", "previous", "next"] as const : ["child", "left", "right", "previous", "next"] as const;
        const row = roles.flatMap(role => input.read.relation?.(canonical, child, role)?.items ?? []).find(value => value.node.id === child);
        if (row && input.read.isCurrent()) relations.set(child, row);
      }
      if (work.depth === 0 && scope.complete && !rows.truncated && rows.coverage !== "unavailable") {
        // Only a complete, untruncated root read can retire stale side assignments; cached zero is insufficient.
        const live = new Set([...relations.keys()].map(child => mindMapOccurrence([root, child])));
        state = {...state, sides: Object.fromEntries(Object.entries(state.sides).filter(([id]) => live.has(id)))};
      }
      const candidates = [...relations.values()].map(relation => {
        const lineage = [...work.lineage, relation.node.id], id = mindMapOccurrence(lineage);
        if (!id) {truncated = true; status = "limited"; return null;}
        return {id, lineage, relation};
      }).filter((value): value is NonNullable<typeof value> => value !== null);
      // Retain editor ancestry before applying the display cap, then restore semantic sibling order for geometry.
      candidates.sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)) || input.read.compare(a.relation.node, b.relation.node));
      let remaining = maximum - occurrences.length - 1 - queue.length;
      for (const candidate of candidates) {
        const futurePins = [...pinned].filter(id => id !== work.id && !visited.has(id) && !queue.some(row => row.id === id) && !children.some(row => row.id === id) && id !== candidate.id).length;
        if (remaining <= 0 || !pinned.has(candidate.id) && remaining <= futurePins) {truncated = true; status = "limited"; continue;}
        if (work.depth === 0 && candidate.relation.role === "child" && state.sides[candidate.id] === undefined) {
          // Retained unshown branches keep their own future side, but cannot bias today's visible split under partial coverage.
          const values = [...relations.keys()].flatMap(/** Count only real current root candidates, not stale or unavailable saved branches. */ id => {
            const occurrence = mindMapOccurrence([root, id]), side = occurrence ? state.sides[occurrence] : undefined;
            return side === -1 || side === 1 ? [side] : [];
          });
          const side = values.filter(value => value === -1).length < values.filter(value => value === 1).length ? -1 : 1;
          const next = admitMindMapState({...state, sides: {...state.sides, [candidate.id]: side}});
          if (!next) {truncated = true; status = "limited"; continue;} state = next;
        }
        children.push(candidate); remaining--;
      }
      children.sort((a, b) => input.read.compare(a.relation.node, b.relation.node));
    }
    const branch: PlexBranch = {parent: work.parent, depth: work.depth, side: work.side, expanded: admitted, canExpand, reference, status};
    const peerPort = work.depth === 0 || work.side === -1 ? "left" : "right";
    occurrences.push({id: work.id, nodeId: canonical, areaId: work.areaId, representation: "thought", role: work.relation?.role,
      relation: work.relation, branch, ports: work.depth === 0 ? {top: "parent", bottom: "child", left: "left"}
        : work.side === 1 ? {left: "parent", bottom: "child", right: "left"} : {left: "left", bottom: "child", right: "parent"},
      peerPort: {side: peerPort, count: new Set(rows.items.filter(row => ["left", "right", "previous", "next"].includes(row.role)).map(row => row.node.id)).size,
        complete: scope.complete && rows.coverage !== "unavailable" && !rows.truncated && !reference},
      ...(!admitted && !reference && work.parent ? {groupingPartition: JSON.stringify([work.parent, work.side])} : {})});
    if (work.parent && work.relation) edges.push({id: work.id, kind: "semantic", source: work.parent, target: work.id,
      sourceNode: work.lineage[work.lineage.length - 2], targetNode: canonical, relation: work.relation,
      sourcePort: work.relation.role === "child" ? "bottom" : work.relation.role === "parent" ? "top" : work.side === 1 ? "right" : "left",
      targetPort: work.parent === "root" && work.relation.role === "parent" ? "bottom" : work.side === 1 ? "left" : "right"});
    let parentColumn = 0;
    for (const child of children) {
      // The measured parent grid fills row-major. Only its first column points outward left;
      // the one-column case and middle/right columns point right. Descendants inherit ports.
      const parentSide = child.relation.role === "parent" && configuration.parentColumns > 1
        && parentColumn++ % configuration.parentColumns === 0 ? -1 : 1;
      const side = work.depth ? work.side : child.relation.role === "parent" ? parentSide : child.relation.role !== "child" ? -1
        : configuration.arrangement === "left" ? -1 : configuration.arrangement === "right" ? 1 : state.sides[child.id];
      const areaId = work.depth ? work.areaId : child.relation.role === "parent" ? "parent" : child.relation.role === "child" ? side === -1 ? "child-left" : "child-right" : "left";
      queue.push({...child, parent: work.id, depth: work.depth + 1, side, areaId});
    }
  }
  if (!input.read.isCurrent()) return null;
  truncated ||= queue.length > 0;
  const suggestion = JSON.stringify(state) === JSON.stringify(restored) ? undefined : state;
  return {attention: input.attention, layoutRoot: root, root: "root", entry: "root", frame: "root", occurrences, edges,
    truncated, coverage: input.read.coverage, preparation: {parents: [...parents]}, stateSuggestion: suggestion};
}
