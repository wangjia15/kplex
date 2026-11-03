/** Existing bounded JSON/settings primitives, shared by schema reads, migrations and scoped
 * updates. These helpers neither acquire source data nor persist anything. Unknown JSON remains
 * inert; callers validate only fields owned by a registered view. */
export const VIEW_CONFIGURATION_LIMITS = {views: 32, fields: 64, encodedCharacters: 16_384, depth: 8, migrations: 8, path: 6} as const;

/** Stable registry identities never become paths or executable module names. */
export function viewConfigurationId(value: unknown): boolean {return typeof value === "string" && /^[a-z][a-z0-9.-]{0,79}$/.test(value);}
/** Saved JSON must never make prototype fields into editable configuration keys. */
export function viewConfigurationKey(key: unknown): boolean {
  return typeof key === "string" && /^[a-z][a-zA-Z0-9-]{0,63}$/.test(key) && !["constructor", "prototype", "__proto__"].includes(key);
}
/** Bounded stable collection identities are editable data keys, never prototype properties. */
export function viewConfigurationEntryKey(key: unknown): boolean {
  return typeof key === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(key) && !["constructor", "prototype", "__proto__"].includes(key);
}
/** Accept JSON object records, excluding arrays and null. */
export function configurationRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
/** Bound traversal before serialization, including cyclic or non-JSON programmatic input. */
function bounded(value: unknown, depth = 0, remaining = {nodes: 4096, characters: VIEW_CONFIGURATION_LIMITS.encodedCharacters}): boolean {
  if (depth > VIEW_CONFIGURATION_LIMITS.depth || --remaining.nodes < 0) return false;
  if (typeof value === "string") {remaining.characters -= value.length; return remaining.characters >= 0;}
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (!Array.isArray(value) && !configurationRecord(value)) return false;
  return Object.entries(value).every(/** Count keys and descend within the same finite budget. */ ([key, child]) => {
    remaining.characters -= key.length;
    return remaining.characters >= 0 && bounded(child, depth + 1, remaining);
  });
}
/** Detach one namespace/value while retaining the existing 16,384-character/depth/node bounds. */
export function configurationJson(value: unknown): unknown {
  if (!bounded(value)) throw new Error("Invalid view configuration");
  const encoded = JSON.stringify(value);
  if (encoded.length > VIEW_CONFIGURATION_LIMITS.encodedCharacters) throw new Error("View configuration exceeds its bound");
  return JSON.parse(encoded) as unknown;
}
