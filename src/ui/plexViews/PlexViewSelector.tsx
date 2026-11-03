/** Session-owned native select inside Views and lenses; selection never follows global keyboard focus. */
import {useEffect, useId, useRef, useState, useSyncExternalStore} from "react";
import type {PlexViewSession} from "../../application/PlexViewSession";
import type {Translator} from "../../lang";
import {viewLabel} from "./labels";
import type {CanvasViewContributionController} from "./CanvasViewContributionController";
import {TooltipButton} from "../components/TooltipButton";
import {ObsidianIcon} from "../ObsidianIcon";

/** Read the successful selection from the existing owner, including rejected or retired transitions. */
export function PlexViewSelector({session, translate, contributions}: {
  session: PlexViewSession; translate: Translator; contributions?: CanvasViewContributionController;
}) {
  useSyncExternalStore(session.subscribe, session.getSnapshot);
  const selected = session.definition.id;
  const [restriction, setRestriction] = useState<"editor" | "unavailable" | null>(null);
  const [switching, setSwitching] = useState(false), pending = useRef(false);
  const alive = useRef(false), owner = useRef(session);owner.current = session;
  useEffect(/** Retired panels cannot receive a late native-save result. */ () => {alive.current = true;return () => {alive.current = false;};}, [session]);
  const id = useId();
  useEffect(/** A later successful selection retires only the old explanation, never a lens draft. */ () => {setRestriction(null);}, [session, selected]);
  const definitions = [...session.registry.available].sort((first, second) =>
    Number(second.id === session.registry.fallbackId) - Number(first.id === session.registry.fallbackId));
  return <section className="kplex-filter-section kplex-view-selector">
    <label htmlFor={id}>{translate("view.choose")}
      <select id={id} value={selected} disabled={definitions.length === 1 || switching}
        aria-describedby={restriction ? `${id}-restriction` : undefined}
        onChange={event => {
          const requested = event.currentTarget.value;
          const current = session.capture();
          if (!current() || !session.registry.has(requested)) setRestriction("unavailable");
          else if (!pending.current) {
            pending.current = true;setSwitching(true);
            void session.requestSelection(requested).then(accepted => {
              if (alive.current && owner.current === session && current()) setRestriction(accepted ? null : session.canSelect(requested) ? "unavailable" : "editor");
            }).finally(() => {pending.current = false;if (alive.current && owner.current === session) setSwitching(false);});
          }
          // Native select changes its DOM value before React receives the event. Restore the actual
          // owner value synchronously even when a repeated rejection does not schedule another render.
          event.currentTarget.value = session.definition.id;
        }}>
        {definitions.map(definition => <option key={definition.id} value={definition.id}>{viewLabel(definition.labelKey, translate)}</option>)}
      </select>
    </label>
    {contributions?.session === session && <TooltipButton className="kplex-icon-button" label={translate("view.settingsFor", {name: viewLabel(session.definition.labelKey, translate)})}
      onClick={/** Repeated navigation captures a fresh command for this panel's actual view, never global focus. */ () => {
        if (session.definition.id !== selected) {setRestriction("unavailable");return;}
        void contributions.capture({kind: "settings"}).run().then(outcome => setRestriction(outcome.status === "completed" ? null : "unavailable"));
      }}><ObsidianIcon name="settings" size={14} /></TooltipButton>}
    {restriction && <div id={`${id}-restriction`} role="status" className="kplex-lens-help">
      {translate(restriction === "editor" ? "view.editorTransitionBlocked" : "view.unavailable")}
    </div>}
  </section>;
}
