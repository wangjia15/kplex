/** Wu Xing type-wide presentation configuration. Finite settings are separate from per-canvas selection/camera/editor state and never affect semantic policy. */
import type {PlexViewConfiguration, PlexViewConfigurationSchema} from "../configuration";

export const WUXING_PHASES = ["water", "wood", "fire", "earth", "metal"] as const;
export type WuXingPhase = typeof WUXING_PHASES[number];
export type WuXingSource = "property" | "type" | "tag";
export type WuXingConfiguration = Readonly<{
  source: WuXingSource; field: string; order: readonly WuXingPhase[]; start: WuXingPhase;
  labels: Readonly<Record<WuXingPhase, string>>; values: Readonly<Record<WuXingPhase, readonly string[]>>;
  spacing: number; regionWidth: number; regionHeight: number; guides: boolean; tints: boolean;
}>;

/** Stable phase IDs are independent of UI language and raw vault values. */
export function isWuXingPhase(value: unknown): value is WuXingPhase {
  return typeof value === "string" && WUXING_PHASES.some(phase => phase === value);
}
/** Accept each phase exactly once; rotation is a separate starting-phase preference. */
export function wuXingPhaseOrder(value: unknown): WuXingPhase[] | null {
  if (typeof value !== "string" || value.length > 80) return null;
  const parts = value.split(",").map(part => part.trim());
  return parts.length === 5 && parts.every(isWuXingPhase) && new Set(parts).size === 5 ? parts : null;
}
/** Bound user labels and alias lists before they can enter scene state or native layout. */
function text(value: unknown, maximum: number): boolean { return typeof value === "string" && value.length <= maximum; }
/** Numeric bounds apply equally to native controls and incoming synchronized configuration. */
function number(value: unknown, minimum: number, maximum: number): boolean { return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum; }

export const wuXingConfigurationSchema: PlexViewConfigurationSchema = {
  version: 1, fields: {
    source: {defaultValue: "property", validate: value => value === "property" || value === "type" || value === "tag"},
    field: {defaultValue: "phase", validate: value => text(value, 128) && typeof value === "string" && value.trim().length > 0},
    order: {defaultValue: WUXING_PHASES.join(","), validate: value => wuXingPhaseOrder(value) !== null},
    start: {defaultValue: "water", validate: isWuXingPhase},
    spacing: {defaultValue: 56, validate: value => number(value, 24, 200)},
    regionWidth: {defaultValue: 320, validate: value => number(value, 200, 640)},
    regionHeight: {defaultValue: 280, validate: value => number(value, 160, 600)},
    guides: {defaultValue: true, validate: value => typeof value === "boolean"},
    tints: {defaultValue: true, validate: value => typeof value === "boolean"},
    ...Object.fromEntries(WUXING_PHASES.flatMap(phase => [
      [`${phase}Label`, {defaultValue: "", validate: (value: unknown) => text(value, 80)}],
      [`${phase}Values`, {defaultValue: phase, validate: (value: unknown) => text(value, 1024)}],
    ])),
  },
};

/** Interpret validated effective values. Raw values match trimmed, case-sensitive text; aliases are explicit comma/newline-separated entries. */
export function wuXingConfiguration(configuration?: PlexViewConfiguration): WuXingConfiguration {
  const values = configuration?.status === "available" ? configuration.values : {};
  /** Resolve defaults without materializing a settings namespace or retaining caller objects. */
  const field = (key: string): unknown => values[key] ?? wuXingConfigurationSchema.fields[key].defaultValue;
  /** The schema above guarantees strings; this local check keeps this helper safe in direct tests. */
  const string = (key: string): string => {const value = field(key); return typeof value === "string" ? value : "";};
  const source = field("source"), start = field("start");
  return {source: source === "type" || source === "tag" ? source : "property", field: string("field").trim(),
    order: wuXingPhaseOrder(field("order")) ?? [...WUXING_PHASES], start: isWuXingPhase(start) ? start : "water",
    labels: {water: string("waterLabel"), wood: string("woodLabel"), fire: string("fireLabel"), earth: string("earthLabel"), metal: string("metalLabel")},
    values: Object.fromEntries(WUXING_PHASES.map(phase => [phase, string(`${phase}Values`).split(/[,\n]/).map(value => value.trim()).filter(Boolean)])) as Record<WuXingPhase, string[]>,
    spacing: Number(field("spacing")), regionWidth: Number(field("regionWidth")), regionHeight: Number(field("regionHeight")),
    guides: field("guides") === true, tints: field("tints") === true};
}
