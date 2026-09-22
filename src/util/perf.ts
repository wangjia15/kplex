/** Lightweight, content-free performance diagnostics for K-Plex indexing. */
export type PerfDetails = Record<string, unknown>;

type ChromiumPerformanceMemory = {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

export function perfNow(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function perfElapsed(startedAt: number): number {
  return round1(Math.max(0, perfNow() - startedAt));
}

export function perfMemoryDetails(): PerfDetails {
  try {
    const memory = (performance as Performance & { memory?: ChromiumPerformanceMemory }).memory;
    if (!memory) return {};
    const mb = (bytes: number | undefined): number | undefined => typeof bytes === "number" ? round1(bytes / 1024 / 1024) : undefined;
    const details: PerfDetails = {};
    const used = mb(memory.usedJSHeapSize);
    const total = mb(memory.totalJSHeapSize);
    const limit = mb(memory.jsHeapSizeLimit);
    if (used !== undefined) details.heapUsedMB = used;
    if (total !== undefined) details.heapTotalMB = total;
    if (limit !== undefined) details.heapLimitMB = limit;
    return details;
  } catch {
    return {};
  }
}

export function perfLog(event: string, details: PerfDetails = {}): void {
  // Deliberately never include note paths or contents here. These logs are safe to leave enabled
  // while diagnosing large-vault startup and are considerably cheaper than profiling by hand.
  try {
    console.info(`[K-Plex index] ${event}`, { ...details, ...perfMemoryDetails() });
  } catch {
    // Performance diagnostics must never affect indexing.
  }
}
