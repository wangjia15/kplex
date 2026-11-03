/** Shared bounded workspace values. This preserves the existing native-session JSON/depth limits without retaining host objects. */
export function boundedViewState(value: unknown): unknown {
  try {
    const encoded = JSON.stringify(value);
    if (!encoded || encoded.length > 16_384) return null;
    const result: unknown = JSON.parse(encoded);
    /** Deep payloads cannot make restoration recurse without a bound. */
    const bounded = (item: unknown, depth: number): boolean => depth <= 8 && (!item || typeof item !== "object"
      || Object.values(item).every(child => bounded(child, depth + 1)));
    return bounded(result, 0) ? result : null;
  } catch { return null; }
}
