/** Mind Map native Settings and live canvas density contribution. Shared typography/editor/visibility and per-canvas root/folds remain under their existing owners. */
import type {CanvasViewSettingsContribution} from "../settingsContributions";
import {MIND_MAP_DENSITY, MIND_MAP_LIMITS} from "../../../core/plex/views/mindmap/configuration";

export const mindMapSettingsContribution: CanvasViewSettingsContribution = {
  id: "mindmap",
  layoutControls: [
    {field: "parentColumns", labelKey: "graph.parentColumns", captionKey: "graph.parentColumnsShort", icon: "columns-2", min: 1, max: 3, step: 1},
    {field: "horizontalDensity", labelKey: "graph.horizontalDensity", captionKey: "graph.horizontalDensityShort",
      hintKey: "settings.ui.horizontal.density.help", icon: "move-horizontal", ...MIND_MAP_DENSITY},
    {field: "verticalDensity", labelKey: "graph.verticalDensity", captionKey: "graph.verticalDensityShort",
      hintKey: "settings.ui.vertical.density.help", icon: "move-vertical", ...MIND_MAP_DENSITY},
  ],
  /** Native controls address only registered type fields through the shared queued writer. Opening never persists defaults. */
  items: ({translate, key}) => [
    {name: translate("mindmap.arrangement"), control: {type: "dropdown", key: key("arrangement"), options: {
      balanced: translate("mindmap.balanced"), left: translate("mindmap.left"), right: translate("mindmap.right"),
    }}},
    {name: translate("mindmap.horizontalSpacing"), control: {type: "slider", key: key("horizontalSpacing"), min: 40, max: 240, step: 4}},
    {name: translate("mindmap.verticalSpacing"), control: {type: "slider", key: key("verticalSpacing"), min: 12, max: 80, step: 2}},
    {name: translate("graph.parentColumns"), control: {type: "slider", key: key("parentColumns"), min: 1, max: 3, step: 1}},
    {name: translate("graph.horizontalDensity"), desc: translate("settings.ui.horizontal.density.help"), control: {type: "slider", key: key("horizontalDensity"), ...MIND_MAP_DENSITY}},
    {name: translate("graph.verticalDensity"), desc: translate("settings.ui.vertical.density.help"), control: {type: "slider", key: key("verticalDensity"), ...MIND_MAP_DENSITY}},
    {name: translate("mindmap.initialGenerations"), desc: translate("mindmap.initialGenerationsHelp"), control: {type: "slider", key: key("initialGenerations"), min: 1, max: 3, step: 1}},
    {name: translate("mindmap.maximumDepth"), control: {type: "slider", key: key("maximumDepth"), min: 1, max: MIND_MAP_LIMITS.depth, step: 1}},
    {name: translate("mindmap.maximumOccurrences"), desc: translate("mindmap.limitHelp"), control: {type: "slider", key: key("maximumOccurrences"), min: 16, max: MIND_MAP_LIMITS.occurrences, step: 1}},
  ],
};
