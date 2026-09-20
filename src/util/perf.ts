const PERF_PREFIX = "[K-Plex PERF]";

export type PerfValue = string | number | boolean | null | undefined;
export type PerfDetails = Record<string, PerfValue>;

const round = (value: number): number => Math.round(value * 100) / 100;

function sanitize(details: PerfDetails): PerfDetails {
  const output: PerfDetails = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === "number") output[key] = Number.isFinite(value) ? round(value) : String(value);
    else if (value !== undefined) output[key] = value;
  }
  return output;
}

/**
 * Performance logs intentionally use exactly one string argument. This makes the complete line
 * easy to select/copy from DevTools without expanding console objects.
 */
export function perfLog(event: string, details: PerfDetails = {}): void {
  const payload = JSON.stringify({ event, ts: round(performance.now()), ...sanitize(details) });
  console.log(`${PERF_PREFIX} ${payload}`);
}

export function perfError(event: string, error: unknown, details: PerfDetails = {}): void {
  const message = error instanceof Error
    ? `${error.name}: ${error.message}${error.stack ? ` | ${error.stack.replace(/\s+/g, " ").trim()}` : ""}`
    : String(error);
  const payload = JSON.stringify({ event, ts: round(performance.now()), ...sanitize(details), error: message });
  console.error(`${PERF_PREFIX} ${payload}`);
}

export function perfDuration(startedAt: number): number {
  return performance.now() - startedAt;
}

export function perfMemoryDetails(): PerfDetails {
  const memory = (performance as Performance & {
    memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number };
  }).memory;
  if (!memory) return {};
  const mb = 1024 * 1024;
  return {
    heapUsedMB: memory.usedJSHeapSize !== undefined ? memory.usedJSHeapSize / mb : undefined,
    heapTotalMB: memory.totalJSHeapSize !== undefined ? memory.totalJSHeapSize / mb : undefined,
    heapLimitMB: memory.jsHeapSizeLimit !== undefined ? memory.jsHeapSizeLimit / mb : undefined,
  };
}

export type LagMonitor = {
  stop: () => { samples: number; over50ms: number; over100ms: number; maxLagMs: number; avgLagMs: number };
};

/**
 * Samples event-loop drift while expensive work is in progress. Large drift values indicate that
 * synchronous JS is blocking Obsidian's renderer even when the total wall-clock time looks normal.
 */
export function startLagMonitor(intervalMs = 100): LagMonitor {
  let expected = performance.now() + intervalMs;
  let samples = 0;
  let over50ms = 0;
  let over100ms = 0;
  let maxLagMs = 0;
  let totalLagMs = 0;
  const timer = window.setInterval(() => {
    const now = performance.now();
    const lag = Math.max(0, now - expected);
    samples += 1;
    totalLagMs += lag;
    maxLagMs = Math.max(maxLagMs, lag);
    if (lag >= 50) over50ms += 1;
    if (lag >= 100) over100ms += 1;
    expected = now + intervalMs;
  }, intervalMs);

  return {
    stop: () => {
      window.clearInterval(timer);
      return {
        samples,
        over50ms,
        over100ms,
        maxLagMs: round(maxLagMs),
        avgLagMs: round(samples ? totalLagMs / samples : 0),
      };
    },
  };
}
