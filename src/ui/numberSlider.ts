/** Shared native numeric control: bounded slider, persistent value and latest-only async delivery.
 * Callers retain draft/inheritance, validation, save ownership and lifecycle guards. A supplied
 * live-control guard prevents deferred completion or retired events from touching native UI;
 * already accepted writes retain their original persistence lifetime. */
import type {Setting, SliderComponent} from "obsidian";
import {LatestSliderValue} from "./components/latestSliderValue";

/** Mount without publishing a value. Peer refreshes cannot rewind an active pending gesture.
 * @param options.isCurrent Optional caller-owned row/document/generation guard. It fences user
 * events and asynchronous display updates without canceling an already accepted write. */
export function numberSlider(row: Setting, options: Readonly<{
  label: string; value: number; min: number; max: number; step: number; disabled?: boolean;
  format?: (value: number) => string; isCurrent?: () => boolean; onChange: (value: number) => void | Promise<void>;
}>) {
  row.settingEl.addClass("kplex-number-setting");
  let slider: SliderComponent, committed = options.value, draft: number | null = null, alive = true;
  const output = row.controlEl.createEl("output", {cls: "kplex-number-value", attr: {"aria-live": "off"}});
  /** Reading the display never normalizes or writes its owner's saved scalar. */
  const refresh = (): void => {
    if (!alive) return;
    const value = draft ?? committed, text = options.format?.(value) ?? String(Number(value.toFixed(2)));
    slider?.setValue(value);output.setText(text);slider?.sliderEl.setAttribute("aria-valuetext", text);
  };
  /** Persistence may finish after row removal or document adoption; only the current control paints. */
  const current = (): boolean => alive && options.isCurrent?.() !== false;
  const delivery = new LatestSliderValue(/** Retain committed/draft bookkeeping even when its native UI has retired. */ value => {
    draft = value;if (current()) refresh();
  }, /** The caller owns user-facing save recovery; the primitive reports unexpected callback failures. */ error => console.error("K-Plex numeric setting callback failed", error));
  row.addSlider(/** Seed the native range without invoking its captured change writer. */ control => {
    slider = control;
    control.setLimits(options.min, options.max, options.step).setValue(committed).setInstant(true).setDisabled(!!options.disabled)
      .onChange(/** Retired native events cannot enqueue another write or repaint an old thumb. */ value => {
        if (!current() || control.sliderEl.disabled) return;
        delivery.submit(value, /** Keep accepted persistence independent of later native row removal. */ next => {committed = next;return options.onChange(next);});
      });
    control.sliderEl.setAttribute("aria-label", options.label);
  });
  row.controlEl.append(output);refresh();
  return {
    /** Reconcile a saved/draft value without emitting a user edit or losing pending thumb input. */
    setValue(value: number): void {committed = value;refresh();},
    /** Explicit reset wins over an unsent gesture; ordinary peer refreshes use setValue. */
    resetValue(value: number): void {committed = value;delivery.cancelPending();refresh();},
    /** Native disabled state remains owned by the containing Settings row or modal. */
    setDisabled(value: boolean): void {slider.setDisabled(value);},
    /** Detach UI; callback owners still guard any last explicitly requested value. */
    dispose(): void {alive = false;delivery.dispose();},
    input: slider!.sliderEl,
  };
}
