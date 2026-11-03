/** Read-only section placement during saved-graph hydration. Existing resolved neighborhood rows
 * own roles, direction and styling; the explicit one-file section read owns physical occurrences.
 * No evidence is invented, published or made available to relationship editing. */
import type KplexPlugin from "../main";
import type {GraphIndex} from "./GraphIndex";
import type {CentralSectionExpansion, ExpandedSection} from "./SectionExpansion";
import type {Neighborhood, Role, Relation} from "../types";
import {classifyRelation} from "./RelationResolver";

export type SectionPreviewPlacement = Readonly<{sectionId: string | null; targetPath: string; role: Role}>;
const buckets = ["parents", "children", "leftFriends", "rightFriends"] as const;
const roles: Readonly<Record<typeof buckets[number], Role>> = {parents: "parent", children: "child", leftFriends: "left", rightFriends: "right"};

/** Preserve current displayed incidence until detailed provenance arrives. Missing/changed source
 * identities, complete evidence and absent canonical rows never borrow an older section placement.
 * The existing snapshot owner alone decides whether a saved read is still presentable. */
export function projectSectionPreview(plugin: KplexPlugin, index: GraphIndex, expansion: CentralSectionExpansion,
  center: Neighborhood, sections: ExpandedSection[], indexedTargets: ReadonlySet<string>): readonly SectionPreviewPlacement[] {
  const proof = expansion.sourceRevision, path = expansion.centerPath;
  const preview = index.getSectionPreviewNeighborhood?.(path);
  if (!preview) return [];
  // Losing a physical occurrence proof retires its anchor, never the already readable canonical
  // relationship. Keep that row on the note header until a current source/evidence owner replaces it.
  const physicalCurrent = Boolean(proof && proof.path === path && proof.file.path === path && proof.file.stat.mtime === proof.mtime
    && proof.file.stat.size === proof.size && index.get(path)?.file === proof.file
    && (proof.cache === undefined || plugin.app.metadataCache.getFileCache(proof.file) === proof.cache));
  const source = expansion.projectionSource, byId = new Map(sections.map(section => [section.id, section]));
  const inference = index.publishedInferAllLinksAsFriends(path), placements: SectionPreviewPlacement[] = [];
  const owners = new Map<string, Array<{raw: typeof source.sections[number]; relation: Relation}>>();
  const preamblePaths = new Set<string>(), preambleFiles = new Set();
  for (const placement of physicalCurrent ? source.linkPlacements : []) if (placement.sectionId === null) {
    preamblePaths.add(placement.initialPath);if (placement.file) preambleFiles.add(placement.file);
  }
  // Index this one source's already resolved local occurrences once, avoiding a heading scan
  // for every displayed relationship. Classification stays in the existing canonical owner.
  for (const raw of physicalCurrent ? source.sections : []) for (const relation of raw.page.neighbours.values()) {
    const actual = relation.target.transient?.actualPath;
    if (!actual) continue;
    for (const role of ["parent", "child", "left", "right", "previous", "next"] as const) {
      const type = classifyRelation(relation, role, inference);
      if (!type) continue;
      const key = JSON.stringify([actual, role, type]), rows = owners.get(key) ?? [];
      rows.push({raw, relation});owners.set(key, rows);
    }
  }
  for (const bucket of buckets) for (const row of preview[bucket]) {
    const actual = row.page.path, role = row.role ?? roles[bucket];
    // Loaded provenance stays authoritative. The preview neighborhood itself already composes
    // current pair replacements/visibility; removed or hidden canonical rows never reach here.
    if (indexedTargets.has(actual)) continue;
    const matches = owners.get(JSON.stringify([actual, role, row.relationType])) ?? [];
    if (!matches.length || preamblePaths.has(actual) || row.page.file && preambleFiles.has(row.page.file) || source.headerTargets.has(actual)) {
      center[bucket].push(row);
      if (physicalCurrent) placements.push({sectionId: null, targetPath: actual, role});
    }
    for (const {raw, relation} of matches) {
      const section = byId.get(raw.id);
      if (!section) continue;
      // Rebind native target identity without mutating the canonical page or its evidence store.
      const page = {...relation.target, file: row.page.file};
      section.neighborhood[bucket].push({...row, page});
      section.page.neighbours.set(page.path, {...relation, target: page});
      placements.push({sectionId: raw.id, targetPath: actual, role});
    }
  }
  for (const neighborhood of [center, ...sections.map(section => section.neighborhood)]) for (const bucket of buckets) {
    neighborhood[bucket] = index.sortNeighbours(neighborhood[bucket]).slice(0, plugin.settings.maxItemCount);
  }
  return placements;
}
