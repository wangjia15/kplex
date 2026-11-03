/** Adapt the existing explicit SectionExpansion source/folding owner to plain current view
 * inputs. No heading scan, body read, evidence resolution or native editor is implemented here. */
import type {CentralSectionExpansion} from "../../index/SectionExpansion";
import type {GraphIndex} from "../../index/GraphIndex";
import type {GraphPage, Neighborhood, Role} from "../../types";
import {nodeId} from "../../core/graph/model";
import {validPlexSectionSnapshot, plexSectionReference, type PlexSectionRef, type PlexSectionSnapshot, type PlexSectionProvenance} from "../../core/plex/views/sections";

export type PlexSectionViewContext = Readonly<{snapshot: PlexSectionSnapshot; isCurrent: () => boolean;
  page: (reference: PlexSectionRef) => GraphPage | null}>;

/** Capture only an already-expanded document. Invalid/missing native revision proofs remain
 * unavailable; old Classic callers do not need to adopt this optional view-plugin boundary. */
export function createPlexSectionViewContext(expansion: CentralSectionExpansion, revision: string, expanded: ReadonlySet<string>,
  source: Pick<GraphIndex, "get">, current: () => boolean): PlexSectionViewContext | null {
  const proof = expansion.sourceRevision, path = expansion.centerPath;
  if (!proof || proof.path !== path || expansion.sections.length > 256 || !revision || revision.length > 256) return null;
  const isCurrent = (): boolean => current() && proof.file.path === path && proof.file.stat.mtime === proof.mtime && proof.file.stat.size === proof.size
    && source.get(path)?.file === proof.file;
  if (!isCurrent()) return null;
  const pages = new Map(expansion.sections.map(row => [row.id, row.page]));
  const rows = expansion.sections.flatMap(row => {
    const section = row.page.transient;
    return section?.kind === "section" && section.sourcePath === path && section.sectionId === row.id
      && section.line !== undefined && section.start !== undefined && section.end !== undefined
      ? [{id: row.id, label: row.page.name, level: row.level, parent: row.parentId, children: [...row.childIds],
        line: section.line, start: section.start, end: section.end}] : [];
  });
  if (rows.length !== expansion.sections.length) return null;
  const byId = new Map(rows.map(row => [row.id, row]));
  const visible = rows.filter(row => {
    let parent = row.parent;
    for (let n = 0; parent && n < 256; n++) {if (!expanded.has(parent)) return false;parent = byId.get(parent)?.parent ?? null;}
    return !parent;
  }).map(row => row.id);
  const provenance: PlexSectionProvenance[] = [];
  const seen = new Set<string>();let inspected = 0, overflow = false;
  const append = (neighborhood: Neighborhood, sectionId: string | null): void => {
    const roles: readonly [Role, Neighborhood["children"]][] = [["parent", neighborhood.parents], ["child", neighborhood.children],
      ["left", neighborhood.leftFriends], ["right", neighborhood.rightFriends], ["sibling", neighborhood.siblings]];
    for (const [role, items] of roles) for (const relation of items) {
      if (++inspected > 8192) {overflow = true;return;}
      const semanticRole = relation.role ?? role;
      const actual = relation.page.transient?.actualPath ?? relation.page.path;
      const page = source.get(actual);if (!page || page.transient || page.path === path) continue;
      const explanation = expansion.explanations.get(`${neighborhood.center.path}\u0000${relation.page.path}`);
      const genuine = explanation?.decisions.some(decision => decision.active && (sectionId === null
        || decision.evidence.declaredByPath === path && decision.evidence.declaredTargetPath === actual
          && ["inline-ontology", "obsidian-link", "unresolved-link", "body-url", "property-url"].includes(decision.evidence.sourceKind)));
      if (!genuine || !explanation?.resolvedRoles.some(row => row.role === semanticRole)) continue;
      if (provenance.length >= 4096) {overflow = true;return;}
      const key = JSON.stringify([sectionId, actual, semanticRole]);
      if (!seen.has(key)) {seen.add(key);provenance.push({sectionId, target: nodeId(actual), role: semanticRole});}
    }
  };
  append(expansion.centerNeighborhood, null);
  for (const row of expansion.sections) {if (overflow) return null;append(row.neighborhood, row.id);}
  // A saved canonical edge can be placed immediately using this current file's physical body
  // occurrence. These read-only placements are not RelationshipExplanation/editable evidence.
  for (const placement of expansion.previewPlacements ?? []) {
    if (provenance.length >= 4096) return null;
    const key = JSON.stringify([placement.sectionId, placement.targetPath, placement.role]);
    if (!seen.has(key)) {seen.add(key);provenance.push({sectionId: placement.sectionId, target: nodeId(placement.targetPath), role: placement.role});}
  }
  if (overflow) return null;
  const snapshot: PlexSectionSnapshot = {documentId: nodeId(path), path, revision, rows, visible, provenance};
  if (!validPlexSectionSnapshot(snapshot) || !isCurrent()) return null;
  return {snapshot, isCurrent, page: reference => isCurrent() && plexSectionReference(snapshot, reference) ? pages.get(reference.sectionId) ?? null : null};
}
