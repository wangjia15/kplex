/** Exact native area defaults compose with existing shared measured dimensions. These controls
 * edit only the parent preset draft, preserve explicit inheritance and never resize a canvas. */
import {styleNumberSlider} from "../../styleNumberSlider";
import type {FacetPreset} from "../../../core/plex/views/facets/contracts";
import type {Translator} from "../../../lang";

/** One optional width/height pair belongs to one stable category or diagnostics identity. */
export function renderAreaSizeSettings(body: HTMLElement, group: "categories" | "diagnostics", id: string,
  read: () => FacetPreset, change: (preset: FacetPreset) => void, t: Translator): void {
  for (const [field, label, minimum, maximum] of [["width", "wuxing.width", 200, 2400], ["height", "wuxing.height", 160, 1200]] as const) {
    const value = read().areaSizes?.[group]?.[id]?.[field];
    styleNumberSlider(body, t, {label: t(label), help: t("facets.areaSizeHelp", {minimum, maximum}), initial: value,
      fallback: read()[field === "width" ? "regionWidth" : "regionHeight"], min: minimum, max: maximum, step: 1,
      onChange: next => {
        const preset = read(), sizes = {...preset.areaSizes?.[group]}, size = {...sizes[id]};
        if (next === undefined) delete size[field];else size[field] = next;
        if (Object.keys(size).length) sizes[id] = size;else delete sizes[id];
        change({...preset, areaSizes: {...preset.areaSizes, [group]: sizes}});
      }});
  }
}
