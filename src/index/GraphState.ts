import type { GraphPage } from "../types";
import { RelationEvidenceStore } from "./RelationEvidence";

/** Immutable-at-publication graph snapshot. A builder may mutate a private instance, but GraphIndex
 * only exposes a state after the complete evidence graph has been resolved. */
export type GraphState = {
  pages: Map<string, GraphPage>;
  lowercasePathMap: Map<string, string>;
  evidence: RelationEvidenceStore;
  discoveredFields: Map<string, { name: string; count: number }>;
};

export const createGraphState = (): GraphState => ({
  pages: new Map<string, GraphPage>(),
  lowercasePathMap: new Map<string, string>(),
  evidence: new RelationEvidenceStore(),
  discoveredFields: new Map<string, { name: string; count: number }>(),
});

export function getGraphPage(state: GraphState, path: string): GraphPage | undefined {
  return state.pages.get(path) ?? state.pages.get(state.lowercasePathMap.get(path.toLowerCase()) ?? "");
}
