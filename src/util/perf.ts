/**
 * Temporary instrumentation helpers used to profile K-Plex startup/indexing and steady-state load.
 *
 * IMPORTANT: every console emission is a single string. This intentionally avoids object arguments
 * because Chromium/WebKit devtools display copied objects poorly and the resulting logs are much
 * harder to paste into bug reports.
 */
export type PerfDetails = Record<string, unknown>;

type DurationAggregate = { count: number; totalMs: number; maxMs: number; lastMs: number };
type WorkloadProvider = () => PerfDetails;

const round1 = (value: number): number => Math.round(value * 10) / 10;
const instrumentationStartedAt = typeof performance !== "undefined" && typeof performance.now === "function"
  ? performance.now()
  : Date.now();

let sequence = 0;
const counters = new Map<string, number>();
const durations = new Map<string, DurationAggregate>();
const gauges = new Map<string, unknown>();

let workloadTimer: number | null = null;
let lagTimer: number | null = null;
let longTaskObserver: PerformanceObserver | null = null;
let workloadProvider: WorkloadProvider | null = null;
let lagSamples = 0;
let lagTotalMs = 0;
let lagMaxMs = 0;
let longTaskCount = 0;
let longTaskTotalMs = 0;
let longTaskMaxMs = 0;

export function perfNow(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function perfElapsed(startedAt: number): number {
  return round1(Math.max(0, perfNow() - startedAt));
}

function printable(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(round1(value)) : String(value);
  if (typeof value === "boolean" || typeof value === "bigint") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (value instanceof Error) return JSON.stringify(`${value.name}: ${value.message}`);
  try { return JSON.stringify(value); } catch { return JSON.stringify(String(value)); }
}

function memoryDetails(): PerfDetails {
  const memory = (performance as Performance & {
    memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number };
  }).memory;
  if (!memory) return {};
  const mb = (value?: number) => typeof value === "number" ? round1(value / 1024 / 1024) : undefined;
  return {
    heapUsedMB: mb(memory.usedJSHeapSize),
    heapTotalMB: mb(memory.totalJSHeapSize),
    heapLimitMB: mb(memory.jsHeapSizeLimit),
  };
}

/** Emit one copy/paste-friendly instrumentation line. */
export function perfLog(event: string, details: PerfDetails = {}): void {
  const elapsed = perfElapsed(instrumentationStartedAt);
  const fields = Object.entries(details)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${printable(value)}`)
    .join(" | ");
  const suffix = fields ? ` | ${fields}` : "";
  console.log(`[K-Plex instrumentation] ${new Date().toISOString()} | +${elapsed}ms | #${++sequence} | ${event}${suffix}`);
}

/** Increment a counter that will be included in the next workload window. */
export function perfCount(name: string, delta = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + delta);
}

/** Aggregate a duration for the next workload window. */
export function perfDuration(name: string, elapsedMs: number): void {
  const value = Math.max(0, elapsedMs);
  const previous = durations.get(name) ?? { count: 0, totalMs: 0, maxMs: 0, lastMs: 0 };
  previous.count += 1;
  previous.totalMs += value;
  previous.maxMs = Math.max(previous.maxMs, value);
  previous.lastMs = value;
  durations.set(name, previous);
}

/** Record a current-value gauge that persists across workload windows. */
export function perfGauge(name: string, value: unknown): void {
  gauges.set(name, value);
}

function resetWindowAggregates(): void {
  counters.clear();
  durations.clear();
  lagSamples = 0;
  lagTotalMs = 0;
  lagMaxMs = 0;
  longTaskCount = 0;
  longTaskTotalMs = 0;
  longTaskMaxMs = 0;
}

function workloadDetails(providerDetails: PerfDetails): PerfDetails {
  const detail: PerfDetails = { ...providerDetails, ...Object.fromEntries(gauges), ...memoryDetails() };
  for (const [name, value] of counters) detail[`count.${name}`] = value;
  for (const [name, value] of durations) {
    detail[`time.${name}.count`] = value.count;
    detail[`time.${name}.totalMs`] = round1(value.totalMs);
    detail[`time.${name}.avgMs`] = round1(value.totalMs / Math.max(1, value.count));
    detail[`time.${name}.maxMs`] = round1(value.maxMs);
    detail[`time.${name}.lastMs`] = round1(value.lastMs);
  }
  if (lagSamples) {
    detail["eventLoop.samples"] = lagSamples;
    detail["eventLoop.avgLagMs"] = round1(lagTotalMs / lagSamples);
    detail["eventLoop.maxLagMs"] = round1(lagMaxMs);
  }
  if (longTaskCount) {
    detail["longTask.count"] = longTaskCount;
    detail["longTask.totalMs"] = round1(longTaskTotalMs);
    detail["longTask.maxMs"] = round1(longTaskMaxMs);
  }
  return detail;
}

/**
 * Start a low-overhead rolling workload monitor. It samples event-loop drift once per second and
 * prints one summary every `windowMs` while the supplied provider reports `active: true`.
 */
export function perfStartWorkloadMonitor(provider: WorkloadProvider, windowMs = 10000): void {
  perfStopWorkloadMonitor();
  workloadProvider = provider;

  let expected = perfNow() + 1000;
  lagTimer = window.setInterval(() => {
    const now = perfNow();
    const lag = Math.max(0, now - expected);
    expected = now + 1000;
    lagSamples += 1;
    lagTotalMs += lag;
    lagMaxMs = Math.max(lagMaxMs, lag);
  }, 1000);

  try {
    const supported = typeof PerformanceObserver !== "undefined" &&
      (PerformanceObserver.supportedEntryTypes?.includes("longtask") ?? false);
    if (supported) {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTaskCount += 1;
          longTaskTotalMs += entry.duration;
          longTaskMaxMs = Math.max(longTaskMaxMs, entry.duration);
        }
      });
      longTaskObserver.observe({ entryTypes: ["longtask"] });
    }
  } catch {
    longTaskObserver = null;
  }

  workloadTimer = window.setInterval(() => {
    let providerDetails: PerfDetails = {};
    try { providerDetails = workloadProvider?.() ?? {}; } catch (error) { providerDetails = { providerError: String(error) }; }
    const active = providerDetails.active === true;
    if (active) perfLog("workload.window", workloadDetails(providerDetails));
    resetWindowAggregates();
  }, Math.max(3000, windowMs));

  perfLog("workload.monitor.start", { windowMs: Math.max(3000, windowMs), longTaskObserver: Boolean(longTaskObserver) });
}

export function perfStopWorkloadMonitor(): void {
  if (workloadTimer !== null) window.clearInterval(workloadTimer);
  if (lagTimer !== null) window.clearInterval(lagTimer);
  workloadTimer = null;
  lagTimer = null;
  workloadProvider = null;
  try { longTaskObserver?.disconnect(); } catch { /* instrumentation shutdown only */ }
  longTaskObserver = null;
  resetWindowAggregates();
}
