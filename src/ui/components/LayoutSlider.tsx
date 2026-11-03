/**
 * Compact, accessible layout rail shared by density axes, columns and typography. The caller owns
 * localization, numeric policy and persistence; this component only displays and emits values.
 * A marked accessible wrapper supplies help to the shell's shared delayed control-tooltip owner;
 * the input retains its concise name and no competing browser title tooltip is emitted.
 */
import {useEffect, useRef, useState, type ChangeEvent, type ReactNode} from "react";
import {LatestSliderValue} from "./latestSliderValue";

/** Render a bounded rail with its exact value, preserving the established Plex control footprint. */
export function LayoutSlider({ label, caption, hint, icon, value, displayValue, min, max, step, onChange }: {
  label: string;
  caption: string;
  hint?: string;
  icon: ReactNode;
  value: number;
  displayValue: string | ((value: number) => string);
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<number | null>(null), delivery = useRef<LatestSliderValue | null>(null);
  useEffect(/** Closing the rail detaches its draft; the guarded owner may finish its last intent.
   * A retired view rejects that intent, and StrictMode remount creates a fresh delivery owner. */ () => () => {
    delivery.current?.dispose(); delivery.current = null;
  }, []);
  const shown = draft ?? value, formatted = typeof displayValue === "function" ? displayValue(shown) : draft === null ? displayValue : String(draft);
  const percent = Math.max(0, Math.min(100, (shown - min) / (max - min) * 100));
  return <label className="kplex-density-control" aria-label={hint ?? label} data-kplex-control-tooltip>
    <span className="kplex-density-heading">{icon}<span>{caption}</span><output>{formatted}</output></span>
    <span className={`kplex-density-rail${step === 1 ? " is-stepped" : ""}`}>
      <span className="kplex-density-fill" style={{ width: `${percent}%` }} />
      <input type="range" min={min} max={max} step={step} value={shown} aria-label={label}
        onChange={/** Keep the thumb immediate while coalescing only unstarted async callback values. */ (event: ChangeEvent<HTMLInputElement>) => {
          delivery.current ??= new LatestSliderValue(setDraft, error => console.error("K-Plex slider callback failed", error));
          delivery.current.submit(Number(event.currentTarget.value), onChange);
        }} />
    </span>
  </label>;
}
