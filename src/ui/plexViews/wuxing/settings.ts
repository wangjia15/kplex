/** Facets UI contributions use the captured session and shared queued settings writer. */
import type {CanvasViewSettingsContribution} from "../settingsContributions";
import type {CanvasViewContributionContext, CanvasViewChoice} from "../contributionContracts";
import {facetLibrary} from "../../../core/plex/views/facets/configuration";
import {facetState, orderedFacetPresets, resolveFacetPreset} from "../../../core/plex/views/facets/state";
import {facetPresetLabel, facetHasWuXingPhases} from "../../../core/plex/views/facets/labels";
import {FacetPresetManager} from "../facets/FacetPresetManager";
import {facetDiagnostics} from "../../../core/plex/views/facets/presentation";
import {facetHelpText} from "../facets/help";

/** Both entry points dispatch the same state reducer, preserving independent canvas intent. */
function presetChoice(context: CanvasViewContributionContext): CanvasViewChoice | null {
  const library = facetLibrary(context.configuration), state = facetState(context.state);
  if (!library || !state) return null;
  const selected = resolveFacetPreset(library, state.preset);
  const options: CanvasViewChoice["options"][number][] = orderedFacetPresets(library).map(({id, preset}) => ({id,
    label: facetPresetLabel(preset), command: {kind: "state", action: {id: "preset.select", args: id}}}));
  if (selected.status !== "replaced" && !options.some(option => option.id === state.preset)) options.unshift({id: state.preset,
    label: {key: "facets.presetUnavailable"}, enabled: false, command: {kind: "state", action: {id: "preset.select", args: state.preset}}});
  return {id: "preset", label: {key: "facets.preset"}, selected: selected.status === "replaced" ? selected.id : state.preset, options,
    ...(selected.status === "ready" || selected.status === "replaced" ? {settings: {kind: "settings" as const, target: selected.id}, help: {kind: "help" as const, target: selected.id}} : {})};
}

export const wuXingSettingsContribution: CanvasViewSettingsContribution = {
  id: "wuxing",
  /** The command can explain only the exact selected preset admitted by its opening context. */
  help: (context, target) => {
    const library = facetLibrary(context.configuration), state = facetState(context.state);if (!library || !state) return null;
    const selected = resolveFacetPreset(library, state.preset);
    return target === selected.id && (selected.status === "ready" || selected.status === "replaced")
      ? {name: facetPresetLabel(selected.preset), markdown: facetHelpText(selected.id, selected.preset)} : null;
  },
  manager: (app, context, target) => new FacetPresetManager(app, context, target),
  items: ({translate, manage}) => [{name: translate("facets.about"), desc: translate("facets.aboutHelp")},
    ...(manage ? [{name: translate("facets.manage"), desc: translate("facets.managerHelp"), action: manage}] : [])],
  choices: context => [presetChoice(context)].flatMap(/** Only the selected preset contributes a choice; layout belongs to its saved definition. */ choice => choice ? [choice] : []),
  menus: context => {
    const choice = presetChoice(context);
    return [...(choice ? [{id: "preset", kind: "submenu" as const, label: choice.label, icon: "orbit", items: choice.options.map(option =>
      ({...option, kind: "action" as const, checked: option.id === choice.selected}))}] : []),
    {id: "settings", kind: "action", label: {key: "facets.settings"}, icon: "settings", command: {kind: "settings"}}];
  },
  layoutControls: context => {
    const library = facetLibrary(context.configuration), state = facetState(context.state);
    if (!library || !state) return [];
    const selected = resolveFacetPreset(library, state.preset);
    if (selected.status !== "ready" && selected.status !== "replaced") return [];
    const address = (field: string) => ({field: "presets", path: [selected.id, field]});
    return [
      {...address("diagnostics"), path: [selected.id, "diagnostics", "combined"], kind: "checkbox", labelKey: "facets.combineDiagnostics",
        hintKey: "facets.combineDiagnosticsCanvasHint", state: {value: facetDiagnostics(selected.preset, selected.id, state).combined, actionId: "diagnostics.combine"}},
      {...address("spacing"), labelKey: "wuxing.spacing", icon: "move-horizontal", min: 24, max: 200, step: 8},
      {...address("regionWidth"), labelKey: "wuxing.width", icon: "move-horizontal", min: 200, max: 640, step: 20},
      {...address("regionHeight"), labelKey: "wuxing.height", icon: "move-vertical", min: 160, max: 600, step: 20},
      {...address("guides"), kind: "checkbox", labelKey: "wuxing.guides"},
      {...address("tints"), kind: "checkbox", labelKey: "wuxing.tints"},
      ...(selected.preset.interpretation === "wuxing" && facetHasWuXingPhases(selected.preset) ? [
        {...address("relativeLabels"), kind: "checkbox" as const, labelKey: "facets.relativeLabels" as const},
        {...address("regulatingGuides"), kind: "checkbox" as const, labelKey: "facets.regulatingGuides" as const},
      ] : []),
    ];
  },
};
