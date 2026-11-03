/** Bounded occurrence folds and stable sides in the existing session payload. This never chooses or persists a layout-root preference. */
import {nodeId, type NodeId} from "../../../graph/model";
import {boundedViewState} from "../state";
import {MIND_MAP_LIMITS} from "./configuration";

export type MindMapState = Readonly<Record<string, unknown> & {version: 1; scope: NodeId | null; initialGenerations: number | null;
  expanded: readonly string[]; collapsed: readonly string[]; sides: Readonly<Record<string, -1 | 1>>}>;
export type UnavailableMindMapState = Readonly<{version: 0; unavailable: true}>;
export const defaultMindMapState: MindMapState = {version: 1, scope: null, initialGenerations: null, expanded: [], collapsed: [], sides: {}};
const unavailable: UnavailableMindMapState = {version: 0, unavailable: true};

/** Occurrence IDs encode exact lineage, but are never interpreted as native file paths. */
export function validMindMapOccurrence(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MIND_MAP_LIMITS.occurrenceCharacters;
}

/** Detach and validate this version's known fields, while retaining bounded unknown v1 values inertly. Future versions never execute. */
export function restoreMindMapState(value: unknown): MindMapState | UnavailableMindMapState {
  if (value === null || value === undefined) return {...defaultMindMapState, expanded: [], collapsed: [], sides: {}};
  const raw = boundedViewState(value);
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Reflect.get(raw, "version") !== 1) return unavailable;
  const scope: unknown = Reflect.get(raw, "scope"), initialGenerations: unknown = Reflect.get(raw, "initialGenerations");
  const expanded: unknown = Reflect.get(raw, "expanded"), collapsed: unknown = Reflect.get(raw, "collapsed"), sides: unknown = Reflect.get(raw, "sides");
  if ((scope === null) !== (initialGenerations === null) || scope !== null && !validMindMapOccurrence(scope) || initialGenerations !== null
    && (typeof initialGenerations !== "number" || !Number.isInteger(initialGenerations) || initialGenerations < 1 || initialGenerations > 3)
    || !Array.isArray(expanded) || !Array.isArray(collapsed) || expanded.length > 256 || collapsed.length > 256
    || !expanded.every(validMindMapOccurrence) || !collapsed.every(validMindMapOccurrence)
    || !sides || typeof sides !== "object" || Array.isArray(sides) || Object.keys(sides).length > 256) return unavailable;
  const pairs: [string, -1 | 1][] = [];
  for (const [id, rawSide] of Object.entries(sides)) {
    const side: unknown = rawSide;
    if (!validMindMapOccurrence(id) || side !== -1 && side !== 1) return unavailable;
    pairs.push([id, side]);
  }
  pairs.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const result: MindMapState = {...raw, version: 1, scope: scope === null ? null : nodeId(scope), initialGenerations,
    expanded: [...new Set(expanded)].sort(), collapsed: [...new Set(collapsed)].sort(), sides: Object.fromEntries(pairs)};
  return JSON.stringify(result).length <= MIND_MAP_LIMITS.stateCharacters ? result : unavailable;
}

/** New roots seed the initial generation count once; later type-setting edits cannot silently acquire more generations. */
export function scopeMindMapState(state: MindMapState, root: NodeId, initialGenerations: number): MindMapState {
  return state.scope === root ? state : {...state, scope: root, initialGenerations, expanded: [], collapsed: [], sides: {}};
}

/** Produce an admitted session replacement or refuse growth before it can reset the existing session's bounded state. */
export function admitMindMapState(state: MindMapState): MindMapState | null {
  const value = restoreMindMapState(state);
  return value.version === 1 ? value : null;
}
