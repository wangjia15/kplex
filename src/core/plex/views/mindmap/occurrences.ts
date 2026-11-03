/** Mind Map traversal identities and live-editor ancestry. Only this view's own lineage encoding is decoded; canonical IDs stay opaque. */
import {nodeId, type NodeId} from "../../../graph/model";
import type {PlexViewInput} from "../contracts";
import {MIND_MAP_LIMITS} from "./configuration";
import {validMindMapOccurrence} from "./state";

/** Root has a fixed occurrence anchor; every other identity depends on exact ancestry, never arrival or sort position. */
export function mindMapOccurrence(lineage: readonly NodeId[]): string | null {
  const value = lineage.length === 1 ? "root" : JSON.stringify(lineage);
  return validMindMapOccurrence(value) ? value : null;
}

/** Capture only well-formed bindings belonging to this rooted traversal, without granting authority to missing relationships. */
export function mindMapEditorPaths(input: PlexViewInput, root: NodeId): ReadonlyMap<string, readonly NodeId[]> {
  const paths = new Map<string, readonly NodeId[]>();
  for (const editor of (input.editors ?? []).slice(0, 1)) {
    if (editor.occurrenceId === "root" && editor.nodeId === root) {paths.set("root", [root]); continue;}
    try {
      const value: unknown = JSON.parse(editor.occurrenceId);
      if (!Array.isArray(value) || value.length < 2 || value.length > MIND_MAP_LIMITS.depth + 1
        || !value.every(validMindMapOccurrence) || value[0] !== root || value[value.length - 1] !== editor.nodeId
        || mindMapOccurrence(value.map(nodeId)) !== editor.occurrenceId) continue;
      paths.set(editor.occurrenceId, value.map(nodeId));
    } catch { /* A foreign definition's binding cannot become this view's traversal path. */ }
  }
  return paths;
}
