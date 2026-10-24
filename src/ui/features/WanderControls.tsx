/**
 * Minimal Wander playback presentation. The per-view application controller owns scheduling and
 * Zen; callers supply icons and localized text. The explicit control marker excludes these native
 * widgets from user-interaction auto-pause without suppressing their normal keyboard/touch input.
 */
import type { ReactNode } from "react";
import type { WanderState } from "../../application/WanderController";
import type { Translator } from "../../lang";
import { ActionButton } from "../components/ActionButton";
import { LayoutSlider } from "../components/LayoutSlider";

/** Render the existing button primitives and one native whole-cycle pace slider. */
export function WanderControls({ state, translate, stopIcon, playbackIcon, paceIcon, onStop, onToggle, onSeconds }: {
  state: WanderState; translate: Translator; stopIcon: ReactNode; playbackIcon: ReactNode; paceIcon: ReactNode;
  onStop: () => void; onToggle: () => void; onSeconds: (seconds: number) => void;
}) {
  const paused = state.phase === "paused";
  return <div className="kplex-layout-controls kplex-wander-controls" data-kplex-wander-control role="group" aria-label={translate("wander.controls")}>
    <ActionButton label={translate("actions.view.wander.stop")} icon={stopIcon} onClick={onStop} />
    <ActionButton label={translate(paused ? "wander.play" : "wander.pause")} icon={playbackIcon} onClick={onToggle} />
    <LayoutSlider label={translate("wander.speed")} caption={translate("wander.interval")} icon={paceIcon}
      value={state.seconds} displayValue={translate("wander.pace", { seconds: state.seconds })} min={3} max={15} step={1}
      onChange={onSeconds} />
    <span className="kplex-keyboard-announcement" role="status" aria-live="polite">{state.reason
      ? translate(state.reason === "exhausted" ? "wander.exhausted" : "wander.unavailable") : paused ? translate("wander.paused") : ""}</span>
  </div>;
}
