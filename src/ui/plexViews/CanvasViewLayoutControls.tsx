/** Render bounded declared controls through the existing shared rail components. No settings
 * state or persistence lives here; native Settings and this rail address the same schema leaves. */
import type {Translator} from "../../lang";
import type {PlexViewConfiguration, ViewConfigurationExpected} from "../../core/plex/views/configuration";
import {configurationLeaf} from "../../core/plex/views/configurationPaths";
import type {CanvasViewLayoutControl} from "./contributionContracts";
import {canvasViewText} from "./labels";
import {LayoutSlider} from "../components/LayoutSlider";
import {LayoutCheckbox} from "../components/LayoutCheckbox";
import {ObsidianIcon} from "../ObsidianIcon";

/** Empty/unavailable groups render nothing. Committed configuration owns layout; the shared
 * slider may hold its newest input as a local thumb draft while an async save finishes. */
export function CanvasViewLayoutControls({controls, configuration, translate, onChange, readValue}: Readonly<{
  controls: readonly CanvasViewLayoutControl[]; configuration: PlexViewConfiguration; translate: Translator;
  onChange: (control: CanvasViewLayoutControl, value: number | boolean) => void | Promise<void>;
  readValue?: (control: CanvasViewLayoutControl) => ViewConfigurationExpected;
}>) {
  if (configuration.status !== "available" || !controls.length) return null;
  return <div className="kplex-density-axes">{controls.map(control => {
    const key = `${control.field}:${JSON.stringify(control.path ?? [])}`;
    const value = control.kind === "checkbox" && control.state ? control.state.value
      : (readValue ? readValue(control) : configurationLeaf(configuration.values[control.field], control.path ?? [])).value;
    const label = control.label ? canvasViewText(control.label, translate) : control.labelKey ? translate(control.labelKey) : "";
    const hint = control.hint ? canvasViewText(control.hint, translate) : control.hintKey ? translate(control.hintKey) : undefined;
    return control.kind === "checkbox" ? <LayoutCheckbox key={key} label={label} hint={hint} checked={value === true}
      controlId={key} onChange={checked => {void onChange(control, checked);}} />
      : <LayoutSlider key={key} label={label} caption={control.caption ? canvasViewText(control.caption, translate) : control.captionKey ? translate(control.captionKey) : label}
        hint={hint} icon={<ObsidianIcon name={control.icon} size={11} />} value={Number(value)} displayValue={number => number.toFixed(2)}
        min={control.min} max={control.max} step={control.step} onChange={number => onChange(control, number)} />;
  })}</div>;
}
