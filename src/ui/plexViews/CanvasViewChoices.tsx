/** Per-canvas view-specific choices adjacent to the existing shared view selector. */
import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import type {Translator} from "../../lang";
import type {CanvasViewContributionController} from "./CanvasViewContributionController";
import {canvasViewText} from "./labels";
import {TooltipButton} from "../components/TooltipButton";
import {ObsidianIcon} from "../ObsidianIcon";

/** No duplicated selected state: every render derives choices from the captured native session. */
export function CanvasViewChoices({controller, translate}: Readonly<{controller: CanvasViewContributionController; translate: Translator}>) {
  useSyncExternalStore(controller.session.subscribe, controller.session.getSnapshot, controller.session.getSnapshot);
  const alive = useRef(false), [unavailable, setUnavailable] = useState(false);
  const definition = controller.session.definition;
  useEffect(/** Ignore outcomes after the panel or its owning canvas has disappeared. */ () => {alive.current = true; return () => {alive.current = false;};}, [controller]);
  return <>{controller.choices().map(choice => <div key={choice.id} className="kplex-filter-row kplex-view-choice" data-kplex-view-choice={choice.id}>
    <label>{canvasViewText(choice.label, translate)}
    <select aria-label={canvasViewText(choice.label, translate)} value={choice.selected} disabled={!choice.enabled}
      onChange={/** The closure keeps the panel's opening canvas and exact admitted choice. */ event => {
        const selected = choice.options.find(option => option.id === event.currentTarget.value);
        event.currentTarget.value = choice.selected;
        if (choice.enabled && selected?.enabled) void selected.command.run().then(outcome => {
          if (alive.current) setUnavailable(outcome.status !== "completed");
        });
      }}>{choice.options.map(option => <option key={option.id} value={option.id} disabled={!option.enabled}>
        {canvasViewText(option.label, translate)}{option.unavailableReason ? ` — ${canvasViewText(option.unavailableReason, translate)}` : ""}
      </option>)}</select></label>
    {choice.settings && <TooltipButton className="kplex-icon-button" disabled={!choice.enabled}
      label={translate("view.settingsFor", {name: canvasViewText(choice.options.find(option => option.id === choice.selected)?.label ?? choice.label, translate)})}
      onClick={/** Reacquire this same choice to support repeated opening without borrowing a different view/preset. */ () => {
        const current = controller.session.definition === definition ? controller.choices().find(row => row.id === choice.id && row.selected === choice.selected && row.enabled) : undefined;
        if (!current?.settings) {setUnavailable(true);return;}
        void current.settings.run().then(outcome => {if (alive.current) setUnavailable(outcome.status !== "completed");});
      }}><ObsidianIcon name="settings" size={14} /></TooltipButton>}
    {choice.help && <TooltipButton className="kplex-icon-button" disabled={!choice.enabled}
      label={translate("view.helpFor", {name: canvasViewText(choice.options.find(option => option.id === choice.selected)?.label ?? choice.label, translate)})}
      onClick={/** Repeated Info opens reacquire only this same captured choice; focus never redirects it. */ () => {
        const current = controller.session.definition === definition ? controller.choices().find(row => row.id === choice.id && row.selected === choice.selected && row.enabled) : undefined;
        if (!current?.help) {setUnavailable(true);return;}
        void current.help.run().then(/** A closed panel cannot show feedback for its retired help command. */ outcome => {if (alive.current) setUnavailable(outcome.status !== "completed");});
      }}><ObsidianIcon name="info" size={14} /></TooltipButton>}
  </div>)}{unavailable && <div role="status" className="kplex-lens-help">{translate("view.unavailable")}</div>}</>;
}
