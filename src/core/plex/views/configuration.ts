/** Bounded view-type preferences and immutable scoped updates. Read-time migrations are pure;
 * persistence, incoming synchronization and write serialization remain with the existing host owner. */
import type {PlexViewConfiguration, PlexViewConfigurationSchema, ViewConfigurationAddress, ViewConfigurationEdit,
  ViewConfigurationExpected, ViewConfigurationMigrationResult} from './configurationContracts';
import {configurationJson as json, configurationRecord as record, viewConfigurationId, viewConfigurationKey, viewConfigurationEntryKey, VIEW_CONFIGURATION_LIMITS} from './configurationValues';
import {upgradeConfigurationPayload, validateConfigurationMigrations} from './configurationMigrations';
import {configurationEntryValue, configurationExpected, configurationLeaf, editConfigurationLeaf, validViewConfigurationAddress} from './configurationPaths';
export type {PlexViewConfiguration, PlexViewConfigurationSchema, PlexViewConfigurationMigration, ViewConfigurationAddress,
  ViewConfigurationEdit, ViewConfigurationExpected, ViewConfigurationMigrationResult} from './configurationContracts';
export {viewConfigurationKey, VIEW_CONFIGURATION_LIMITS} from './configurationValues';

/** Capture precise remote ownership. Container requests include a separate aggregate epoch;
 * an entry request excludes sibling-entry aggregates, while still observing map/schema changes. */
export function viewConfigurationOwnerDomains(domain: string): readonly string[] {
  const match = /^canvasViewSettings:([a-z][a-z0-9.-]{0,79}):([a-z][a-zA-Z0-9-]{0,63})(?::([A-Za-z0-9][A-Za-z0-9._-]{0,79}))?$/.exec(domain);
  if (match) return ["canvasViewSettings", `canvasViewSettings:${match[1]}`, `canvasViewSettings:${match[1]}:${match[2]}`,
    ...(match[3] ? [domain] : [`${domain}:*`])];
  return domain === "canvasViewSettings" ? [domain, `${domain}:*`]
    : /^canvasViewSettings:[a-z][a-z0-9.-]{0,79}$/.test(domain) ? ["canvasViewSettings", domain, `${domain}:*`] : [domain];
}
/** Incoming entry/field changes also retire whole-container drafts, never unrelated leaf owners. */
export function viewConfigurationChangedDomains(domain: string): readonly string[] {
  const match = /^canvasViewSettings:([a-z][a-z0-9.-]{0,79})(?::([a-z][a-zA-Z0-9-]{0,63}))?(?::([A-Za-z0-9][A-Za-z0-9._-]{0,79}))?$/.exec(domain);
  return match ? [domain, "canvasViewSettings:*", `canvasViewSettings:${match[1]}:*`,
    ...(match[3] ? [`canvasViewSettings:${match[1]}:${match[2]}:*`] : [])] : [domain];
}
/** Scope a nested update to its declared atomic collection entry; ordinary fields remain atomic. */
export function viewConfigurationUpdateDomain(definition: Readonly<{id: string; configuration?: PlexViewConfigurationSchema}>, address: ViewConfigurationAddress): string {
  const entry = address.path?.[0];
  return `canvasViewSettings:${definition.id}:${address.field}${definition.configuration?.fields[address.field]?.entries
    && typeof entry === "string" && viewConfigurationEntryKey(entry) ? `:${entry}` : ""}`;
}
/** Fail at static registration if a schema cannot supply valid, bounded defaults. */
export function validateViewConfigurationSchema(schema: PlexViewConfigurationSchema): void {
  validateConfigurationMigrations(schema);
  if (!record(schema.fields) || Object.keys(schema.fields).length > VIEW_CONFIGURATION_LIMITS.fields)
    throw new Error("Invalid view configuration schema");
  const defaults: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema.fields)) {
    if (!viewConfigurationKey(key) || !field.validate(field.defaultValue) || field.entries !== undefined
      && (field.entries !== true || !record(field.defaultValue) || !Object.keys(field.defaultValue).every(viewConfigurationEntryKey))
      || field.inheritEntries !== undefined && (field.inheritEntries !== true || field.entries !== true)) throw new Error("Invalid view configuration default");
    defaults[key] = field.defaultValue;
  }
  json(defaults);
}

/** Resolve only a registered type's known fields. Absence inherits defaults without materializing a saved record. */
export function readViewConfiguration(definition: Readonly<{id: string; configuration?: PlexViewConfigurationSchema}>, stored: unknown): PlexViewConfiguration {
  const schema = definition.configuration;
  if (!schema) return {status: "available", values: {}};
  if (!record(stored) || Object.keys(stored).length > VIEW_CONFIGURATION_LIMITS.views) return {status: "unavailable", reason: "invalid"};
  const raw = Object.prototype.hasOwnProperty.call(stored, definition.id) ? stored[definition.id] : undefined;
  const upgraded = raw === undefined ? undefined : upgradeConfigurationPayload(schema, raw);
  if (upgraded?.status === "unavailable") return upgraded;
  const invalidReason = upgraded?.migrated ? "migration-failed" : "invalid";
  try {
    const payload = upgraded?.payload ?? {};
    const values = record(payload) && "values" in payload ? payload.values : raw === undefined ? {} : null;
    if (!record(values) || Object.keys(values).length > VIEW_CONFIGURATION_LIMITS.fields) return {status: "unavailable", reason: invalidReason};
    const effective: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(schema.fields)) {
      const value = Object.prototype.hasOwnProperty.call(values, key) ? values[key] : field.defaultValue;
      if (!field.validate(value)) return {status: "unavailable", reason: invalidReason};
      effective[key] = value;
    }
    return {status: "available", values: json(effective) as Record<string, unknown>};
  } catch { return {status: "unavailable", reason: invalidReason}; }
}

/** Return a migrated namespace map only when the resulting registered schema is usable.
 * Failed/future payloads retain their exact original reference and are never silently reset. */
export function migrateViewConfiguration(definition: Readonly<{id: string; configuration?: PlexViewConfigurationSchema}>, stored: unknown): ViewConfigurationMigrationResult {
  if (!record(stored) || Object.keys(stored).length > VIEW_CONFIGURATION_LIMITS.views) return {status: 'unavailable', reason: 'invalid', original: stored};
  const schema = definition.configuration;
  if (!schema || !Object.prototype.hasOwnProperty.call(stored, definition.id)) return {status: 'unchanged', settings: {...stored}};
  const result = upgradeConfigurationPayload(schema, stored[definition.id]);
  if (result.status === 'unavailable') return {...result, original: stored};
  const settings = {...stored, [definition.id]: result.payload}, effective = readViewConfiguration(definition, settings);
  if (effective.status !== 'available') return {status: 'unavailable', reason: result.migrated ? 'migration-failed' : effective.reason, original: stored};
  return {status: result.migrated ? 'migrated' : 'unchanged', settings};
}

/** Read one registered effective field/path without materializing defaults in saved data. */
export function readViewConfigurationAt(definition: Readonly<{id: string; configuration?: PlexViewConfigurationSchema}>, stored: unknown,
  address: ViewConfigurationAddress): ViewConfigurationExpected {
  if (!validViewConfigurationAddress(address)) return {present: false};
  const effective = readViewConfiguration(definition, stored);
  const field = definition.configuration?.fields[address.field];
  return validViewConfigurationAddress(address) && effective.status === 'available' && Object.prototype.hasOwnProperty.call(effective.values, address.field)
    ? configurationLeaf(configurationEntryValue(effective.values[address.field], field?.defaultValue, field?.inheritEntries, address.path ?? []), address.path ?? []) : {present: false};
}

/** Apply one bounded leaf operation to the latest map, preserving sibling presets/views and
 * unknown fields. Optional expected values reject a stale leaf rather than overwriting it.
 * The entire resulting field and namespace retain their schema/JSON limits. */
export function editViewConfigurationAt(definition: Readonly<{id: string; configuration?: PlexViewConfigurationSchema}>, stored: unknown,
  address: ViewConfigurationAddress, edit: ViewConfigurationEdit, expected?: ViewConfigurationExpected): Record<string, unknown> {
  const schema = definition.configuration, effective = readViewConfiguration(definition, stored);
  if (!edit || !["set", "remove"].includes(edit.kind) || !viewConfigurationId(definition.id) || !schema || !validViewConfigurationAddress(address)
    || !Object.prototype.hasOwnProperty.call(schema.fields, address.field) || effective.status !== 'available' || !record(stored)) throw new Error('View configuration is unavailable');
  const migration = migrateViewConfiguration(definition, stored);
  if (migration.status === 'unavailable') throw new Error('View configuration migration is unavailable');
  if (!Object.prototype.hasOwnProperty.call(stored, definition.id) && Object.keys(stored).length >= VIEW_CONFIGURATION_LIMITS.views) throw new Error('View configuration exceeds its bound');
  const previous = migration.settings[definition.id], payload = record(previous) ? previous : {version: schema.version, values: {}};
  const values = record(payload.values) ? payload.values : {}, nextValues = {...values};
  const field = schema.fields[address.field];
  const sparse = field.inheritEntries && address.path?.length && !Object.prototype.hasOwnProperty.call(values, address.field) ? {} : effective.values[address.field];
  const current = configurationEntryValue(sparse, field.defaultValue, field.inheritEntries, address.path ?? []);
  const actual = configurationLeaf(current, address.path ?? []);
  if (!configurationExpected(actual, expected)) throw new Error('View configuration changed');
  if (edit.kind === 'remove' && !address.path?.length) delete nextValues[address.field];
  else {
    const value = editConfigurationLeaf(current, address.path ?? [], edit);
    if (!schema.fields[address.field].validate(value)) throw new Error('Invalid view configuration field');
    nextValues[address.field] = value;
  }
  if (Object.keys(nextValues).length > VIEW_CONFIGURATION_LIMITS.fields) throw new Error('View configuration exceeds its bound');
  const next = json({...payload, values: nextValues});
  return {...migration.settings, [definition.id]: next};
}

/** Existing scalar callers retain their exact field API and share the scoped updater. */
export function editViewConfiguration(definition: Readonly<{id: string; configuration?: PlexViewConfigurationSchema}>, stored: unknown, key: string, value: unknown): Record<string, unknown> {
  return editViewConfigurationAt(definition, stored, {field: key}, {kind: 'set', value});
}

/** Explicitly reset one known leaf or this view's known fields. Unknown fields, other view
 * namespaces and vault properties are retained; unsupported future payloads refuse a downgrade. */
export function resetViewConfiguration(definition: Readonly<{id: string; configuration?: PlexViewConfigurationSchema}>, stored: unknown,
  address?: ViewConfigurationAddress): Record<string, unknown> {
  const schema = definition.configuration;
  if (!schema || readViewConfiguration(definition, stored).status !== 'available') throw new Error('View configuration is unavailable');
  if (address) {
    if (!validViewConfigurationAddress(address) || !Object.prototype.hasOwnProperty.call(schema.fields, address.field)) throw new Error('Unknown view configuration field');
    const initial = configurationLeaf(schema.fields[address.field].defaultValue, address.path ?? []);
    if (!initial.present) throw new Error('No default for this configuration leaf');
    const effective = readViewConfiguration(definition, stored);
    const current = effective.status === 'available' ? effective.values[address.field] : undefined;
    const value = !address.path?.length && schema.fields[address.field].entries && record(current) && record(initial.value)
      ? {...current, ...initial.value} : initial.value;
    return editViewConfigurationAt(definition, stored, address, {kind: 'set', value});
  }
  let next = stored;
  for (const field of Object.keys(schema.fields)) next = resetViewConfiguration(definition, next, {field});
  if (!record(next)) throw new Error('View configuration is unavailable');
  return next;
}

/** Explicit namespace removal is separate from reset, and affects only the named view's data.
 * Missing/disabled extensions are never removed automatically; the host must label/confirm scope. */
export function removeViewConfiguration(stored: unknown, id: string): Record<string, unknown> {
  if (!record(stored) || !viewConfigurationId(id)) throw new Error('Invalid view configuration identity');
  const next = {...stored};delete next[id];return next;
}
