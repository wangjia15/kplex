/** Production Mind Map policy, composed from pure hierarchy/state/geometry modules. Shared runtime owns acquisition, actions and the native editor. */
import type {PlexViewDefinition} from "../contracts";
import {mindMapConfiguration, mindMapConfigurationSchema, MIND_MAP_LIMITS} from "./configuration";
import {defaultMindMapState, restoreMindMapState} from "./state";
import {projectMindMap} from "./projection";
import {layoutMindMap} from "./layout";
import {reduceMindMap} from "./actions";
import {appendPlexSections} from "../sections";

/** This definition is not user-visible until registered with its localized settings and real shared-host behavior. */
export const mindMapViewDefinition: PlexViewDefinition = {
  id: "mindmap", version: 1, labelKey: "view.mindmap", icon: "network", navigation: "rooted", navigationEntry: "attention", editorHosting: "occurrence",
  capabilities: {sections: true, descendants: false, editor: true, compact: false}, sectionSource: "layout-root", defaultState: defaultMindMapState,
  hierarchy: {maximumScopes: MIND_MAP_LIMITS.scopes, maximumDepth: MIND_MAP_LIMITS.depth,
    primary: "center", controls: "measured", relations: "child-and-peer", reduce: reduceMindMap},
  configuration: mindMapConfigurationSchema, restoreState: restoreMindMapState,
  /** Only the pinned root receives the shared current outline. Branch traversal and canonical
   * edges retain their original identities; sections consume the existing host scene bound. */
  project(input) {
    const projection = projectMindMap(input);
    return projection && input.sections?.status === "available"
      ? appendPlexSections(projection, input.sections.snapshot, Math.min(2048, input.maximum * 8 + 1)) : projection;
  },
  /** Layout consumes the same admitted type settings as projection and the actual occurrence/editor measurements. */
  layout(projection, measurements, _preferences, _editor, context) {
    const configuration = mindMapConfiguration(context?.configuration);
    if (!configuration) throw new Error("Mind Map configuration unavailable");
    return layoutMindMap(projection, measurements, configuration, context?.areaHeights);
  },
};
