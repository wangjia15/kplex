/** Immutable bounded addresses inside one validated schema field. Stable preset/category keys
 * keep unrelated queued edits independent; no whole-map replacement or native effect occurs. */
import type {ViewConfigurationAddress, ViewConfigurationEdit, ViewConfigurationExpected} from "./configurationContracts";
import {configurationJson, configurationRecord, viewConfigurationEntryKey, viewConfigurationKey, VIEW_CONFIGURATION_LIMITS} from "./configurationValues";

/** Refuse unsafe keys, oversized addresses and invalid array offsets before traversing JSON. */
export function validViewConfigurationAddress(address: unknown): address is ViewConfigurationAddress {
  if (!address || typeof address !== "object" || Array.isArray(address)) return false;
  const field: unknown = Reflect.get(address, "field"), path: unknown = Reflect.get(address, "path");
  const parts: readonly unknown[] = Array.isArray(path) ? path : [];
  return viewConfigurationKey(field) && (path === undefined || Array.isArray(path)) && parts.length <= VIEW_CONFIGURATION_LIMITS.path
    && parts.every(/** Paths carry identities only, never expressions or inferred field ownership. */ part =>
      typeof part === "number" ? Number.isInteger(part) && part >= 0 && part < 4096
        : typeof part === "string" && viewConfigurationEntryKey(part));
}

/** Read one own-property leaf; absence is distinct from a present undefined/programmatic value. */
export function configurationLeaf(value: unknown, path: readonly (string | number)[]): ViewConfigurationExpected {
  for (const key of path) {
    if ((!configurationRecord(value) && !Array.isArray(value)) || !Object.prototype.hasOwnProperty.call(value, key)) return {present: false};
    value = Reflect.get(value, String(key)) as unknown;
  }
  return {present: true, value};
}

/** Seed only an addressed missing default entry. Unknown/future and existing entries remain
 * atomic; this never fills missing members within an existing entry or persists during a read. */
export function configurationEntryValue(value: unknown, defaults: unknown, inherit: boolean | undefined,
  path: readonly (string | number)[]): unknown {
  const key = path[0];
  return inherit && typeof key === "string" && configurationRecord(value) && configurationRecord(defaults)
    && !Object.prototype.hasOwnProperty.call(value, key) && Object.prototype.hasOwnProperty.call(defaults, key)
    ? {...value, [key]: defaults[key]} : value;
}

/** Compare an opening leaf only; sibling edits cannot invalidate or overwrite this leaf. */
export function configurationExpected(actual: ViewConfigurationExpected, expected?: ViewConfigurationExpected): boolean {
  return expected === undefined || actual.present === expected.present
    && (!actual.present || JSON.stringify(actual.value) === JSON.stringify(expected.value));
}

/** Copy the addressed spine, requiring existing intermediate objects and valid array indices.
 * Removal from an array is explicit and shifts its following entries; stable-key maps avoid this
 * ambiguity for presets. An absent removal is a no-op. The complete field is schema-validated later. */
export function editConfigurationLeaf(value: unknown, path: readonly (string | number)[], edit: ViewConfigurationEdit): unknown {
  if (!path.length) return edit.kind === "set" ? configurationJson(edit.value) : undefined;
  const [key, ...tail] = path;
  if (!configurationRecord(value) && !Array.isArray(value)) throw new Error("View configuration path is unavailable");
  if (Array.isArray(value)) {
    if (typeof key !== "number" || key >= value.length) throw new Error("View configuration index is unavailable");
    const existing: readonly unknown[] = value;
    const result: unknown[] = [...existing];
    if (!tail.length && edit.kind === "remove") result.splice(key, 1);
    else result[key] = editConfigurationLeaf(existing[key], tail, edit);
    return result;
  }
  if (typeof key !== "string" || tail.length && !Object.prototype.hasOwnProperty.call(value, key)) throw new Error("View configuration path is unavailable");
  const result = {...value};
  if (!tail.length && edit.kind === "remove") delete result[key];
  else result[key] = editConfigurationLeaf(value[key], tail, edit);
  return result;
}
