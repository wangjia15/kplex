/** Executable host contribution for the public example. No private built-in implementation is
 * imported; native Settings, menus, choices and rails all use the same registered schema/state. */
import type {CanvasViewSettingsContribution, CanvasViewContributionContext, CanvasViewChoice} from "./api";

/** One descriptor source supplies both the panel and checked native submenu. */
function sideChoice(context: CanvasViewContributionContext): CanvasViewChoice {
  const selected = context.state && typeof context.state === "object" && Reflect.get(context.state, "side") === -1 ? "left" : "right";
  return {id: "side", label: {literal: "Branch side"}, selected,
    options: [{id: "left", label: {literal: "Left"}, command: {kind: "state", action: {id: "side", args: -1}}},
      {id: "right", label: {literal: "Right"}, command: {kind: "state", action: {id: "side", args: 1}}}]};
}
export const exampleSettingsContribution: CanvasViewSettingsContribution = {
  id: "org.example.columns",
  items: ({key, translate}) => [
    {name: translate("view.exampleSpacing"), control: {type: "slider", key: key("spacing"), min: 20, max: 200, step: 10}},
    {name: translate("view.exampleShowHeading"), control: {type: "toggle", key: key("showHeading")}},
    {name: translate("view.exampleHeading"), control: {type: "text", key: key("title")}},
  ],
  layoutControls: [
    {field: "spacing", label: {literal: "Spacing"}, icon: "move-horizontal", min: 20, max: 200, step: 10},
    {kind: "checkbox", field: "showHeading", label: {literal: "Show heading"}},
  ],
  choices: context => [sideChoice(context)],
  menus: context => {
    const choice = sideChoice(context);
    return [{id: "side", kind: "submenu", label: choice.label, icon: "columns-2", items: choice.options.map(option =>
      ({...option, kind: "action", checked: option.id === choice.selected}))},
      {id: "settings", kind: "action", label: {literal: "Example settings"}, icon: "settings", command: {kind: "settings"}}];
  },
};
