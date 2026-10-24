/**
 * Test-only, serializable observer for fresh-process indexing acceptance runs.
 * Electron process metrics are retained once per native identity; worker-thread CPU
 * is already included and must never be added separately. The caller owns sampling,
 * the epoch-millisecond clock, and lifecycle markers. No vault data is collected.
 * Temporary method wrappers preserve application return values and restore independently.
 */

/**
 * Create a bounded observation record with no imports or outer dependencies.
 * @param now Epoch-millisecond clock, matching Electron process creationTime units.
 * @param maximumSamples Hard sample bound; exceeding it makes acceptance invalid.
 * @returns Observer whose endpoint CPU totals are lower bounds for exited processes.
 */
export function createFreshObservation({now, maximumSamples = 1200}) {
  if (typeof now !== 'function' || !Number.isSafeInteger(maximumSamples) || maximumSamples < 1) {
    throw new TypeError('A clock and positive integer sample bound are required');
  }
  const startedAt = now();
  if (!Number.isFinite(startedAt)) throw new TypeError('The observation clock must be finite');
  const samples = [], events = [], errors = [], processes = new Map(), wrappers = [];
  let stopped = false, lastAt = null, maximumGapMs = 0;

  /** Retain bounded, deduplicated diagnostic codes without host objects or source data. */
  function fail(code) {
    if (!errors.includes(code) && errors.length < 128) errors.push(code);
  }

  /** Capture clock regressions as invalid evidence without disrupting the application. */
  function timestamp() {
    const at = now();
    if (!Number.isFinite(at)) { fail('invalid-clock'); return startedAt; }
    if (at < startedAt || (lastAt !== null && at < lastAt)) fail('clock-regression');
    return at;
  }

  /** Copy only plain numeric/boolean detail, refusing strings and retained host objects. */
  function numericDetail(value) {
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const copy = {};
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'boolean' || item === null) copy[key] = item;
      else if (typeof item === 'number' && Number.isFinite(item)) copy[key] = item;
    }
    return copy;
  }

  /** Record an instrumentation-owned label and numeric facts, never arguments or results. */
  function event(label, detail) {
    if (stopped) return;
    if (events.length >= maximumSamples * 16) { fail('event-limit'); return; }
    const row = {at: timestamp(), label};
    const safeDetail = numericDetail(detail);
    if (safeDetail !== undefined) row.detail = safeDetail;
    events.push(row);
    return row;
  }

  /** Copy numeric memory samples without interpreting them as allocation or true peaks. */
  function memorySnapshot(memory) {
    const copy = {};
    for (const key of ['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers', 'workingSetSize', 'privateBytes']) {
      if (Number.isFinite(memory?.[key]) && memory[key] >= 0) copy[key] = memory[key];
    }
    return copy;
  }

  /**
   * Retain one process-wide CPU sample and presence transitions.
   * Missing identities/counters, duplicates and counter resets invalidate the record.
   * Disappearance retains the last CPU and explicitly marks the unobserved terminal tail.
   */
  function sample(metrics, memory, context = {}) {
    if (stopped) { fail('sample-after-stop'); return null; }
    if (samples.length >= maximumSamples) { fail('sample-limit'); return null; }
    const at = timestamp();
    const gapMs = lastAt === null ? null : at - lastAt;
    if (gapMs !== null) maximumGapMs = Math.max(maximumGapMs, gapMs);
    lastAt = at;
    const row = {at, elapsedMs: at - startedAt, gapMs, processes: [], births: [], disappearances: [], memory: memorySnapshot(memory), context: {}};
    for (const key of ['hidden', 'documentFocused', 'windowFocused', 'backgroundThrottling', 'throttleChanged', 'currentRendererPid']) {
      if (typeof context[key] === 'boolean' || (typeof context[key] === 'number' && Number.isFinite(context[key]))) row.context[key] = context[key];
    }
    if (!Array.isArray(metrics) || metrics.length === 0) { fail('empty-metrics'); metrics = []; }
    const present = new Set();
    for (const metric of metrics) {
      const pid = metric?.pid, created = metric?.creationTime, cumulative = metric?.cpu?.cumulativeCPUUsage;
      if (!Number.isSafeInteger(pid) || pid <= 0 || !Number.isFinite(created) || created <= 0) { fail('invalid-process-identity'); continue; }
      if (!Number.isFinite(cumulative) || cumulative < 0) { fail('invalid-process-cpu'); continue; }
      const identity = `${pid}:${created}`;
      if (present.has(identity)) { fail('duplicate-process-identity'); continue; }
      present.add(identity);
      let process = processes.get(identity);
      if (!process) {
        process = {identity, pid, created, type: typeof metric.type === 'string' ? metric.type : 'Unknown',
          first: created >= startedAt ? 0 : cumulative, last: cumulative, firstSeenAt: at,
          lastSeenAt: at, present: true, missingTerminalCpu: false, disappearances: 0};
        processes.set(identity, process);
        row.births.push({identity, createdDuringObservation: created >= startedAt});
      } else {
        if (cumulative < process.last) fail('process-cpu-regression');
        if (metric.type !== process.type) fail('process-type-changed');
        process.last = cumulative;
        process.lastSeenAt = at;
        process.present = true;
        process.missingTerminalCpu = false;
      }
      row.processes.push({identity, pid, created, type: process.type, cumulative});
    }
    for (const process of processes.values()) {
      if (process.present && !present.has(process.identity)) {
        process.present = false;
        process.missingTerminalCpu = true;
        process.disappearances += 1;
        row.disappearances.push({identity: process.identity, lastSeenAt: process.lastSeenAt});
      }
    }
    samples.push(row);
    return row;
  }

  /** Snapshot cumulative per-identity deltas from retained observations without hidden sampling. */
  function endpoint(label) {
    const rows = [];
    let seconds = 0, terminalCpuComplete = true;
    for (const process of processes.values()) {
      const delta = process.last - process.first;
      seconds += delta;
      if (process.missingTerminalCpu) terminalCpuComplete = false;
      rows.push({...process, seconds: delta});
    }
    return {label, at: timestamp(), sampledAt: lastAt, seconds, processes: rows, sampleCount: samples.length,
      maximumGapMs, terminalCpuComplete, valid: errors.length === 0 && samples.length > 0, errors: [...errors]};
  }

  /**
   * Observe a method without changing receiver, arguments, synchronous errors or return identity.
   * Promise settlement is observed by attached handlers; callers receive the original promise.
   * Arguments, returned values and rejection objects are never retained.
   */
  function wrap(owner, key, label) {
    if (stopped) throw new Error('Cannot wrap after stop');
    const original = owner?.[key];
    if (typeof original !== 'function') throw new TypeError('The wrapped method must exist');
    const ownDescriptor = Object.getOwnPropertyDescriptor(owner, key);
    /** Forward the original operation exactly and record only its lifecycle. */
    function wrapped(...args) {
      event(`${label}:invoke`);
      let result;
      try { result = Reflect.apply(original, this, args); }
      catch (error) { event(`${label}:throw`); throw error; }
      event(`${label}:return`);
      try {
        const then = result?.then;
        if (typeof then === 'function') {
          Reflect.apply(then, result, [
            /** Record completion without retaining a potentially sensitive return value. */
            function settled() { event(`${label}:fulfilled`); },
            /** Observe rejection while leaving the original promise and error unchanged. */
            function rejected() { event(`${label}:rejected`); }
          ]);
        }
      } catch { fail('promise-observation-failed'); }
      return result;
    }
    owner[key] = wrapped;
    if (owner[key] !== wrapped) throw new Error('Method wrapper installation failed');
    wrappers.push({owner, key, wrapped, ownDescriptor, label});
    return wrapped;
  }

  /**
   * Restore every owned wrapper independently, preserving later owners on conflicts.
   * Repeated stop calls are idempotent; pending settlements cannot append after shutdown.
   */
  function stop() {
    if (stopped) return {conflicts: [], errors: [...errors]};
    const conflicts = [];
    for (const entry of wrappers.reverse()) {
      try {
        if (entry.owner[entry.key] !== entry.wrapped) {
          conflicts.push(entry.label); fail('wrapper-ownership-conflict'); continue;
        }
        if (entry.ownDescriptor) Object.defineProperty(entry.owner, entry.key, entry.ownDescriptor);
        else delete entry.owner[entry.key];
      } catch { conflicts.push(entry.label); fail('wrapper-restore-failed'); }
    }
    wrappers.length = 0;
    event('observer:stop', {conflicts: conflicts.length});
    stopped = true;
    return {conflicts, errors: [...errors]};
  }

  return {startedAt, samples, events, errors, sample, endpoint, event, wrap, stop};
}
