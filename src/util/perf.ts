/** Monotonic clock used by cooperative indexing schedules and startup quiet-window checks. */
export function perfNow(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}
