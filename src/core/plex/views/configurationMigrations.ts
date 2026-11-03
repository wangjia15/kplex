/** Pure bounded schema upgrades. The original payload is never mutated or discarded on failure;
 * the existing host writer decides when a successful normalized payload becomes durable. */
import type {PlexViewConfigurationSchema, ViewConfigurationUnavailableReason} from "./configurationContracts";
import {configurationJson, configurationRecord, VIEW_CONFIGURATION_LIMITS} from "./configurationValues";

export type ConfigurationPayloadResult = Readonly<{status: "available"; payload: Record<string, unknown>; migrated: boolean}
  | {status: "unavailable"; reason: ViewConfigurationUnavailableReason}>;

/** Require a finite, increasing, unambiguous migration chain at registration. */
export function validateConfigurationMigrations(schema: PlexViewConfigurationSchema): void {
  if (!Number.isInteger(schema.version) || schema.version < 1 || schema.version > 1024
    || (schema.migrations?.length ?? 0) > VIEW_CONFIGURATION_LIMITS.migrations) throw new Error("Invalid view configuration schema version");
  const sources = new Set<number>();
  for (const migration of schema.migrations ?? []) {
    if (!Number.isInteger(migration.from) || !Number.isInteger(migration.to) || migration.from < 1
      || migration.to <= migration.from || migration.to > schema.version || sources.has(migration.from)
      || typeof migration.migrate !== "function") throw new Error("Invalid view configuration migration");
    sources.add(migration.from);
  }
}

/** Upgrade detached values at most eight times. Unknown/future versions remain unavailable;
 * thrown, oversized or invalid migration results remain recoverable without a replacement write. */
export function upgradeConfigurationPayload(schema: PlexViewConfigurationSchema, raw: unknown): ConfigurationPayloadResult {
  if (!configurationRecord(raw) || !Number.isInteger(raw.version) || typeof raw.version !== "number"
    || raw.version < 1 || raw.version > schema.version) return {status: "unavailable", reason: "unsupported"};
  let migrating = raw.version !== schema.version;
  try {
    let payload = configurationJson(raw);
    if (!configurationRecord(payload)) return {status: "unavailable", reason: "invalid"};
    const migrated = migrating;
    for (let step = 0; payload.version !== schema.version; step++) {
      const version = payload.version;
      const migration = schema.migrations?.find(/** A source version has exactly one registered successor. */ row => row.from === version);
      if (!migration || step >= VIEW_CONFIGURATION_LIMITS.migrations) return {status: "unavailable", reason: "unsupported"};
      if (!configurationRecord(payload.values)) return {status: "unavailable", reason: "migration-failed"};
      const values = migration.migrate(payload.values);
      if (!configurationRecord(values) || Object.prototype.toString.call(values) !== "[object Object]") return {status: "unavailable", reason: "migration-failed"};
      payload = {...payload, version: migration.to, values: configurationJson(values)};
      payload = configurationJson(payload);
      if (!configurationRecord(payload)) return {status: "unavailable", reason: "migration-failed"};
      migrating = true;
    }
    return {status: "available", payload, migrated};
  } catch {return {status: "unavailable", reason: migrating ? "migration-failed" : "invalid"};}
}
