/** Executable non-Classic conformance policy, deliberately absent from production registration.
 * It uses only the public pure API; the host retains explicit source expansion and all rendering. */
import {plexSectionAnchor, type PlexViewDefinition, type PlexOccurrence, type PlexViewEdge, type ViewRect} from "../../src/core/plex/views";
export const sectionViewProbeDefinition: PlexViewDefinition = {
  id: "org.example.sections", version: 1, labelKey: "Section conformance", icon: "list-tree",
  capabilities: {sections: true, editor: true}, defaultState: null, restoreState: () => null,
  project: input => {
    const root = input.read.node(input.attention);if (!root) return null;
    const snapshot = input.sections?.status === "available" ? input.sections.snapshot : null;
    if (snapshot && snapshot.documentId !== root.id) return null;
    const occurrences: PlexOccurrence[] = [{id: "root", nodeId: root.id, representation: "thought"}], edges: PlexViewEdge[] = [];
    const rows = input.read.relations(root.id, "child");
    for (const [index, relation] of rows.items.entries()) {
      const id = `note-${index}`;occurrences.push({id, nodeId: relation.node.id, role: relation.role, relation, representation: "thought"});
      const sourceSection = snapshot && plexSectionAnchor(snapshot, relation.node.id, relation.role);
      edges.push({id: `recorded-${index}`, kind: "semantic", source: "root", target: id, sourceNode: root.id, targetNode: relation.node.id,
        sourcePort: index % 2 ? "right" : "left", targetPort: index % 2 ? "left" : "right", relation, ...(sourceSection ? {sourceSection} : {})});
    }
    for (const id of snapshot?.visible ?? []) occurrences.push({id: `row-${id}`, nodeId: root.id, representation: "thought", role: "child",
      section: {documentId: root.id, revision: snapshot!.revision, sectionId: id}});
    return {attention: root.id, entry: "root", root: "root", editor: "root", frame: "root", occurrences, edges,
      truncated: rows.truncated, coverage: rows.coverage};
  },
  layout: (projection, measured) => {
    const positions = new Map<string, ViewRect>();let row = 0, note = 0;
    for (const occurrence of projection.occurrences) {
      const size = measured.find(value => value.id === occurrence.id)!;
      positions.set(occurrence.id, {x: occurrence.id === "root" || occurrence.section ? 0 : note++ % 2 ? 440 : -440,
        y: occurrence.section ? 100 + row++ * 70 : occurrence.id === "root" ? 0 : 200, width: size.width, height: size.height});
    }
    return {positions, areas: []};
  },
};
