/** Versioned view-type settings contracts. Migration and update functions remain pure; only the
 * host's existing serialized settings writer may persist their results. Settings versions are
 * independent of the view API and native workspace/session versions. */
export type PlexViewConfigurationMigration = Readonly<{
  from: number;
  to: number;
  /** Receive detached bounded values; return a replacement retaining unknown fields as appropriate. */
  migrate: (values: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>;
}>;

export type PlexViewConfigurationSchema = Readonly<{
  version: number;
  fields: Readonly<Record<string, Readonly<{defaultValue: unknown; validate: (value: unknown) => boolean;
    /** Opt in to independent stable-key entries. Each entry stays atomic; arrays never deep-merge. */
    entries?: true;
    /** Missing stable entries inherit their declared default, materialized only when edited. */
    inheritEntries?: true}>>>;
  migrations?: readonly PlexViewConfigurationMigration[];
}>;

export type ViewConfigurationUnavailableReason = "invalid" | "unsupported" | "migration-failed";
export type PlexViewConfiguration = Readonly<{status: "available"; values: Readonly<Record<string, unknown>>}>
  | Readonly<{status: "unavailable"; reason: ViewConfigurationUnavailableReason}>;

/** Stable object keys are preferable to array indices for independently editable presets/categories. */
export type ViewConfigurationAddress = Readonly<{field: string; path?: readonly (string | number)[]}>;
export type ViewConfigurationEdit = Readonly<{kind: "set"; value: unknown} | {kind: "remove"}>;
/** An optional exact precondition distinguishes an absent leaf from a concurrently edited value. */
export type ViewConfigurationExpected = Readonly<{present: boolean; value?: unknown}>;
export type ViewConfigurationMigrationResult = Readonly<
  {status: "unchanged" | "migrated"; settings: Record<string, unknown>}
  | {status: "unavailable"; reason: ViewConfigurationUnavailableReason; original: unknown}
>;
