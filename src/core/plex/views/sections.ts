/** One-document, revision-scoped section data and deterministic physical-anchor policy. The
 * existing source owner supplies provenance; this module never parses or classifies evidence. */
import type {NodeId} from "../../graph/model";
import type {Role} from "../../graph/relations";
import type {PlexViewDefinition, PlexProjection, PlexOccurrence} from "./contracts";

/** Resolve the explicitly supported central document without acquiring sources. Unsupported
 * views return null; the default preserves existing attention-following section consumers. */
export function plexSectionDocument(definition: Pick<PlexViewDefinition, "capabilities" | "sectionSource">,
  attention: NodeId, layoutRoot?: NodeId): NodeId | null {
  return definition.capabilities.sections === true ? definition.sectionSource === "layout-root" ? layoutRoot ?? null : attention : null;
}
export type PlexSectionRef = Readonly<{documentId: NodeId; revision: string; sectionId: string}>;
export type PlexSectionRow = Readonly<{id: string; label: string; level: number; parent: string | null; children: readonly string[];
  line: number; start: number; end: number}>;
export type PlexSectionProvenance = Readonly<{sectionId: string | null; target: NodeId; role: Role}>;
export type PlexSectionSnapshot = Readonly<{documentId: NodeId; path: string; revision: string; rows: readonly PlexSectionRow[];
  visible: readonly string[]; provenance: readonly PlexSectionProvenance[]}>;
export type PlexSectionRead = Readonly<{status: "available"; snapshot: PlexSectionSnapshot}>
  | Readonly<{status: "unavailable"; reason: "source" | "limit" | "editor"}>;

/** Bounded plain snapshot. Duplicate headings use source-owned IDs, never their label. */
export function validPlexSectionSnapshot(value: PlexSectionSnapshot): boolean {
  if (!value.documentId || typeof value.path !== "string" || !value.path || !value.revision || value.revision.length > 256
    || value.rows.length > 256 || value.provenance.length > 4096 || value.visible.length > value.rows.length) return false;
  const ids = new Map(value.rows.map(row => [row.id, row]));
  if (ids.size !== value.rows.length || new Set(value.visible).size !== value.visible.length || value.visible.some(id => !ids.has(id))) return false;
  for (const row of value.rows) {
    if (!row.id || row.id.length > 4096 || typeof row.label !== "string" || row.label.length > 4096
      || !Number.isInteger(row.level) || row.level < 1 || row.level > 6 || !Number.isInteger(row.line) || row.line < 1
      || !Number.isInteger(row.start) || !Number.isInteger(row.end) || row.start < 0 || row.end < row.start
      || row.parent !== null && (!ids.has(row.parent) || ids.get(row.parent)!.level >= row.level)
      || new Set(row.children).size !== row.children.length || row.children.some(id => ids.get(id)?.parent !== row.id)) return false;
    if (row.parent && !ids.get(row.parent)!.children.includes(row.id)) return false;
  }
  return value.provenance.every(row => (row.sectionId === null || ids.has(row.sectionId)) && !!row.target
    && ["parent", "child", "left", "right", "previous", "next", "sibling"].includes(row.role));
}
/** A reference is meaningful only inside its exact current document revision. */
export function plexSectionReference(snapshot: PlexSectionSnapshot, reference: PlexSectionRef): boolean {
  return reference.documentId === snapshot.documentId && reference.revision === snapshot.revision && snapshot.rows.some(row => row.id === reference.sectionId);
}
/** Folding resolves to the nearest visible source ancestor. Missing/retired refs return the
 * aggregate note anchor; another document or duplicate heading label is never substituted. */
export function visiblePlexSection(snapshot: PlexSectionSnapshot, reference: PlexSectionRef): PlexSectionRef | null {
  if (!plexSectionReference(snapshot, reference)) return null;
  const rows = new Map(snapshot.rows.map(row => [row.id, row])), visible = new Set(snapshot.visible);let id: string | null = reference.sectionId;
  for (let n = 0; id && n < 256; n++) {
    if (visible.has(id)) return {...reference, sectionId: id};
    id = rows.get(id)?.parent ?? null;
  }
  return null;
}
/** Genuine multiple declarations route to their lowest common visible ancestor, or the note
 * header when no such row exists/preamble participates. Never pick the first declaration. */
export function plexSectionAnchor(snapshot: PlexSectionSnapshot, target: NodeId, role: Role): PlexSectionRef | null {
  const sources = snapshot.provenance.filter(row => row.target === target && row.role === role);
  if (!sources.length || sources.some(row => row.sectionId === null)) return null;
  const rows = new Map(snapshot.rows.map(row => [row.id, row])), visible = new Set(snapshot.visible);
  const chain = (id: string): string[] => {
    const out: string[] = [];
    for (let n = 0; id && n < 256; n++) {if (visible.has(id)) out.push(id);id = rows.get(id)?.parent ?? "";}
    return out;
  };
  const chains = sources.map(row => chain(row.sectionId!)), shared = chains[0].find(id => chains.every(other => other.includes(id)));
  return shared ? {documentId: snapshot.documentId, revision: snapshot.revision, sectionId: shared} : null;
}

/** Compose source-owned, read-only heading occurrences at the declared central root. No
 * branch or semantic relationship is synthesized. Existing canonical edges may use a proven
 * heading as their physical source, while the shared renderer owns outline connectors. */
export function appendPlexSections(projection: PlexProjection, snapshot: PlexSectionSnapshot, maximum: number): PlexProjection {
  const root = projection.occurrences.find(row => row.id === (projection.root ?? projection.entry));
  if (!root?.nodeId || root.nodeId !== snapshot.documentId || !validPlexSectionSnapshot(snapshot)
    || !Number.isInteger(maximum) || maximum < projection.occurrences.length || maximum > 2048) throw new Error("Invalid central section projection");
  const visible = new Set(snapshot.visible), rows = snapshot.rows.filter(row => visible.has(row.id));
  const sections: PlexOccurrence[] = rows.slice(0, maximum - projection.occurrences.length).map(/** Source IDs distinguish duplicate headings and carry their exact current document proof. */ row => ({
    id: JSON.stringify(["section", row.id]), nodeId: snapshot.documentId, representation: "thought", ports: {},
    section: {documentId: snapshot.documentId, revision: snapshot.revision, sectionId: row.id},
  }));
  return {...projection, occurrences: [...projection.occurrences, ...sections], truncated: projection.truncated || sections.length < rows.length,
    edges: projection.edges.map(/** Physical anchors require source-owned canonical provenance; phase/branch geometry grants no evidence. */ edge => {
      if (edge.kind !== "semantic" || edge.source !== root.id) return edge;
      const sourceSection = plexSectionAnchor(snapshot, edge.targetNode, edge.relation.role);
      return sourceSection ? {...edge, sourceSection} : edge;
    })};
}
