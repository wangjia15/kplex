/** Lightweight monotonic timing helpers. Production logging is intentionally disabled. */
export type PerfDetails = Record<string, unknown>;

const round1 = (value: number): number => Math.round(value * 10) / 10;

export function perfNow(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function perfElapsed(startedAt: number): number {
  return round1(Math.max(0, perfNow() - startedAt));
}

export function perfLog(_event: string, _details: PerfDetails = {}): void {
  // Intentionally disabled in production.
}
