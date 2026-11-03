/** Classic-specific geometry controls. The shared shell supplies finite values and semantic preference commands. */
import {LayoutSlider} from "../../components/LayoutSlider";
import {LayoutCheckbox} from "../../components/LayoutCheckbox";
import {ObsidianIcon} from "../../ObsidianIcon";
import {horizontalDensity, layoutColumns, type ClassicGeometryPreferences} from "../../../core/plex/views/classic/geometry";
import type {Translator} from "../../../lang";
export type ClassicLayoutValue = "horizontalCompactingFactor" | "compactingFactor" | "parentColumns" | "childColumns";
/** Keep the existing native control components, limits, labels and surface/device persistence semantics. */
export function ClassicLayoutControls({values, translate, onValue, onSimplified, simplifiedHint}: {
  values: ClassicGeometryPreferences; translate: Translator; onValue: (key: ClassicLayoutValue, value: number) => void;
  onSimplified: (enabled: boolean) => void; simplifiedHint: string;
}) {return <>
      <div className="kplex-density-axes">
        <LayoutSlider label={translate("graph.horizontalDensity")} caption={translate("graph.horizontalDensityShort")}
          hint={translate("settings.ui.horizontal.density.help")} icon={<ObsidianIcon name="move-horizontal" size={11} />}
          value={horizontalDensity(values)} displayValue={horizontalDensity(values).toFixed(2)} min={0.75} max={4} step={0.05}
          onChange={/** Persist the horizontal axis without modifying row spacing. */ (value) => onValue("horizontalCompactingFactor", value)} />
        <LayoutSlider label={translate("graph.verticalDensity")} caption={translate("graph.verticalDensityShort")}
          hint={translate("settings.ui.vertical.density.help")} icon={<ObsidianIcon name="move-vertical" size={11} />}
          value={values.compactingFactor} displayValue={values.compactingFactor.toFixed(2)} min={0.75} max={4} step={0.05}
          onChange={/** Persist row density without modifying labels or horizontal spacing. */ (value) => onValue("compactingFactor", value)} />
      </div>
      <div className="kplex-density-axes">
        <LayoutSlider label={translate("graph.parentColumns")} caption={translate("graph.parentColumnsShort")}
          icon={<ObsidianIcon name="columns-2" size={11} />} value={layoutColumns(values, "parent")} displayValue={String(layoutColumns(values, "parent"))}
          min={1} max={3} step={1} onChange={/** Persist the exact parent grid width. */ (value) => onValue("parentColumns", value)} />
        <LayoutSlider label={translate("graph.childColumns")} caption={translate("graph.childColumnsShort")}
          icon={<ObsidianIcon name="columns-3" size={11} />} value={layoutColumns(values, "child")} displayValue={String(layoutColumns(values, "child"))}
          min={1} max={7} step={1} onChange={/** Persist the exact child grid width. */ (value) => onValue("childColumns", value)} />
        <LayoutCheckbox label={translate("layout.simplifiedTitle")} checked={values.lateralArrangement === "left"}
          controlId="simplified-layout" onChange={onSimplified}
          hint={simplifiedHint} />
      </div>
  </>;
}
