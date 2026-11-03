import {classicEditorKey, classicEditorIdentity, retainClassicEditor} from "./occurrenceEditor";
/** Classic-only host policy registration. The shared renderer asks for capabilities, not view-ID branches. */
import type {PlexViewDefinition} from "../../../core/plex/views/contracts";
import {classicViewDefinition, classicAreaDropRole, CLASSIC_AREAS, CLASSIC_HEIGHTS} from "../../../core/plex/views/classic/definition";
import type {KplexSettings} from "../../../settings";
import type {GraphIndex} from "../../../index/GraphIndex";
import type {Translator} from "../../../lang";
import {buildScene, buildSectionExpandedScene, neighborhoodSceneKey, sceneLayoutPolicyKey, bindSceneNeighborhood} from "./layout";
import {classicAreaLayout} from "./areaLayout";
import {ClassicAreaLabels} from "./ClassicAreaLabels";
import {ClassicLayoutControls} from "./ClassicLayoutControls";
import {compassPolygons} from "../../../core/plex/compassBackground";
import {groupNeighborhood} from "./groups";

/** Keep legacy labels and shared-left grouping attached to Classic's physical area definition. */
export function classicAreaTitle(zone: string, translate: Translator, arrangement: KplexSettings["lateralArrangement"]): string {
  if (zone === "parent") return translate("graph.zoneParents");
  if (zone === "child") return translate("graph.zoneChildren");
  if (zone === "left") return translate(arrangement === "left" ? "graph.zoneFriendsChallengers" : "graph.zoneFriendsPrevious");
  if (zone === "right") return translate("graph.zoneChallengersNext");
  return translate("graph.zoneSiblings");
}

const classicIntegration = {
  dropRole: classicAreaDropRole, editorKey: classicEditorKey, editorIdentity: classicEditorIdentity, retainEditor: retainClassicEditor,
  Labels: ClassicAreaLabels, Controls: ClassicLayoutControls, tint: compassPolygons,
  repack: classicAreaLayout,
  heightControls: {
    parent: {...CLASSIC_HEIGHTS.parent, kind: "classic" as const}, child: {...CLASSIC_HEIGHTS.child, kind: "classic" as const},
    left: {...CLASSIC_HEIGHTS.left, kind: "classic" as const}, right: {...CLASSIC_HEIGHTS.right, kind: "classic" as const},
    sibling: {...CLASSIC_HEIGHTS.sibling, kind: "classic" as const},
  },
  areas: CLASSIC_AREAS, heights: CLASSIC_HEIGHTS,
  title: classicAreaTitle, group: groupNeighborhood,
  geometryKey: neighborhoodSceneKey, policyKey: sceneLayoutPolicyKey,
  layout: buildScene, sections: buildSectionExpandedScene, bind: bindSceneNeighborhood,
  /** The legacy entry point delegates to Classic's one portable projection owner. */
  neighborhood: (read: Pick<GraphIndex, "getNeighborhood">, path: string) => read.getNeighborhood(path),
};
const integrations = new Map<PlexViewDefinition, typeof classicIntegration>([[classicViewDefinition, classicIntegration]]);

/** A future definition uses the generic scene pipeline unless explicitly registered with a reviewed host extension. */
export function classicIntegrationFor(definition: PlexViewDefinition): typeof classicIntegration | undefined { return integrations.get(definition); }
