/**
 * Test-only, self-contained PR201 work observer, suitable for CLI function.toString injection.
 * Attach after obtaining the current GraphIndex; always call stop() in the driver's finally and
 * plugin-unload cleanup. No timer, source read, flush, retry or authority mutation is introduced.
 * Returned promises/results and receivers are unchanged. Rejection observers consume their own
 * branch only. Durations include await/microtask scheduling, overlap, and are never CPU time.
 *
 * An optional caller-owned createStartupResourceProbe instance can be supplied as resourceProbe.
 * Its native transaction/request/lease ledger remains authoritative; this observer adds P3 mask,
 * parser and rejection detail rather than duplicating that native instrumentation. Without it,
 * repository.transaction rows count that boundary only, excluding direct native lease transactions.
 * UTF-8 hashing bytes are encoded-input estimates, not disk traffic; parsing counts UTF-16 units.
 * No input, filename, source identity, exception message or unbounded per-owner map is reported.
 * Body rejection signals can overlap; unknown misses cannot distinguish missing/stale/corrupt disk
 * facts without changing production signatures. Receipt current/stale describes observed parser,
 * event and physical coordinates only; it does not query Vault membership or grant reuse.
 * Baselines without bodyInputs report unknown. Optional cache result counts include internal peeks
 * made by getBodies; these nested requests overlap and must not be summed as distinct logical reads.
 * The separate lightweight export counts synchronous calls/input lengths without clocks, encodings
 * or promise observers; its caller owns completion checks and process/memory sampling cadence.
 */
export function createIndexingCpuProbe(index, { resourceProbe = null } = {}) {
  const acquisition = index?.sourceAcquisition, repository = acquisition?.repository;
  if (!acquisition || !repository) throw new Error('Indexing probe requires current source owners');
  const parserVersion=repository.getDiagnostics().bodyParserVersion;
  const originals = [], groups = new Map(), limit = 192;
  const reasons = new Set(['ready', 'missing', 'stale', 'pending-metadata', 'tombstone', 'format-version', 'invalid-head',
    'missing-chunk', 'invalid-chunk', 'invalid-frame', 'missing-posting', 'invalid-posting', 'decode-budget',
    'unsupported-body-value', 'storage-unavailable', 'newer-database', 'quota-exceeded', 'read-error', 'write-error',
    'cancelled', 'superseded', 'backpressure', 'unsaved', 'memory-budget', 'catalog-uncertain', 'activated',
    'activated-not-live', 'dependency-pending', 'dependency-invalid', 'host-catalog-stale', 'unsupported-scope']);
  const outcomes = new Set(['activated', 'absent', 'unsaved', 'cancelled', 'superseded', 'rejected', 'ready',
    'pending-acquisition', 'storage-unavailable', 'stale']);
  const now = () => performance.now(), started = now();
  let running = true, stoppedAt = null, observerFailures = 0, maskContext = 'unknown';
  const masks = { additions: 0, removals: 0, repeatedAdds: 0, peak: repository.unsaved.size };
  const body = { calls: 0, returned: 0, nullResults: 0, dirty: 0, bodyDirty: 0, created: 0,
    memoryMask: 0, evictedMask: 0, unknownMiss: 0, cacheRequestTokenAbsent: 0,
    cacheRequestTokenCurrent: 0, cacheRequestTokenStale: 0, cacheRequestTokenUnknown: 0 };
  const cacheTokens = { getBodies: { calls: 0, requests: 0, hits: 0, misses: 0, failedRequests: 0 },
    getQueuedBody: { calls: 0, requests: 0, hits: 0, misses: 0, failedRequests: 0 } };
  const parser = { calls: 0, utf16Units: 0, completed: 0, failed: 0 };
  const hashing = { calls: 0, utf16Units: 0, utf8Bytes: 0 };
  const transactions = { calls: 0, readonly: 0, readwrite: 0, other: 0 };
  /** Keep observation failure isolated from every production result, including cleanup. */
  function observe(callback) { try { callback(); } catch { observerFailures++; } }
  function row(label) {
    if (!groups.has(label) && groups.size >= limit - 1) label = 'other';
    if (!groups.has(label)) groups.set(label, { calls: 0, completed: 0, failed: 0, active: 0, peak: 0,
      invocationMs: 0, elapsedMs: 0, maximumElapsedMs: 0 });
    return groups.get(label);
  }
  function count(label) { row(label).calls++; }
  /** Restore inherited properties by deletion, not by leaving an own-property replacement. */
  function wrap(owner, key, create) {
    if (typeof owner?.[key] !== 'function') return;
    const descriptor = Object.getOwnPropertyDescriptor(owner, key), original = owner[key];
    const replacement = create(original);
    owner[key] = replacement; originals.push({ owner, key, descriptor, replacement });
  }
  function resultCounters(label, result) {
    if (reasons.has(result?.reason)) count(label + '.reason.' + result.reason);
    if (outcomes.has(result?.outcome)) count(label + '.outcome.' + result.outcome);
  }
  /** Read existing coordinates only: never call capture/current/getBodyCacheRequest or host APIs. */
  function tokenStatus(file, state) {
    if (!acquisition.bodyInputs || typeof acquisition.bodyInputs.get !== 'function') return 'Unknown';
    const receipt = acquisition.bodyInputs.get(file);
    if (!receipt) return 'Absent';
    const physical = receipt.physical, stat = file?.stat;
    if (!state || !physical || !stat || typeof receipt.parserVersion !== 'number'
      || typeof receipt.revision !== 'number') return 'Unknown';
    // Pure parser receipts do not certify global host-resolution observations or source durability.
    if (acquisition.closed || receipt.retired || receipt.parserVersion !== parserVersion || typeof receipt.inputToken !== 'string'
      || !receipt.inputToken || state.revision !== receipt.revision
      || file.path !== physical.path || stat.mtime !== physical.mtime || stat.size !== physical.size
      || stat.ctime !== physical.ctime) return 'Stale';
    return 'Current';
  }
  /** Inclusive passive timing never awaits or substitutes the original promise. */
  function operation(owner, key, label, before, after) {
    wrap(owner, key, original => function (...args) {
      if (!running) return original.apply(this, args);
      const value = row(label), at = now();
      value.calls++; value.active++; value.peak = Math.max(value.peak, value.active);
      observe(() => before?.(args));
      const previousContext = maskContext;
      if (['repository.rememberMemory', 'repository.forgetMemory', 'repository.tombstone'].includes(label)) maskContext = label;
      const finish = (failed, result) => {
        if (!running) return;
        observe(() => {
          const elapsed = now() - at;
          value.active--; value.elapsedMs += elapsed; value.maximumElapsedMs = Math.max(value.maximumElapsedMs, elapsed);
          value[failed ? 'failed' : 'completed']++;
          if (failed && label === 'parser.parse') parser.failed++;
          if (!failed) { resultCounters(label, result); after?.(result); }
        });
      };
      let result;
      try { result = original.apply(this, args); }
      catch (error) { value.invocationMs += now() - at; finish(true); throw error; }
      finally { maskContext = previousContext; }
      value.invocationMs += now() - at;
      if (result && typeof result.then === 'function') result.then(result => finish(false, result), () => finish(true));
      else finish(false, result);
      return result;
    });
  }
  /** Sample only existing private collections; never select disk state or certify source readiness. */
  function maskCategories() {
    const result = { total: repository.unsaved.size, memoryBytes: repository.memoryBytes ?? 0,
      pendingRetirement: 0, currentMemory: 0, expiredMemory: 0, evictedOrUnowned: 0, activeLane: 0, unknownLifetime: 0 };
    for (const id of repository.unsaved) {
      if (repository.lanes.has(id)) result.activeLane++;
      if (repository.pendingDeletes.has(id)) { result.pendingRetirement++; continue; }
      const memory = repository.memory.get(id);
      if (!memory) { result.evictedOrUnowned++; continue; }
      // Existing current predicates are observation-only fences; no repository operation runs.
      try { if (memory.current()) result.currentMemory++; else result.expiredMemory++; }
      catch { result.unknownLifetime++; }
    }
    return result;
  }
  function snapshot() {
    let categories = null;
    observe(() => { categories = maskCategories(); });
    return { running, elapsedMs: (stoppedAt ?? now()) - started, observerFailures,
      masks: { ...masks, categories }, body: { ...body }, parser: { ...parser }, hashing: { ...hashing },
      cacheTokens: Object.fromEntries(Object.entries(cacheTokens).map(([key, value]) => [key, { ...value }])),
      transactions: { ...transactions }, transactionScope: 'repository method; excludes direct native transactions',
      resourceProbeAttached: resourceProbe !== null,
      groups: Object.fromEntries([...groups].map(([key, value]) => [key, { ...value }])),
      semantics: 'Inclusive overlapping elapsed durations are not CPU. Input bytes are estimates. Mask transition origins are synchronous call context; write reason/outcome rows explain results, not exact causal attribution of concurrent mask changes. Body signals overlap and unknown misses are not proven storage faults. Stop freezes counters and restores wrappers; pending rows remain pending-at-stop. Native resource probe is caller-owned and must be stopped separately.' };
  }
  const probe = {
    snapshot,
    /** Idempotent cleanup restores only this observer's wrappers and never cancels existing work. */
    stop() {
      if (running) { stoppedAt = now(); running = false; }
      for (const entry of originals.reverse()) {
        if (entry.owner[entry.key] !== entry.replacement) continue;
        if (entry.descriptor) Object.defineProperty(entry.owner, entry.key, entry.descriptor);
        else delete entry.owner[entry.key];
      }
      originals.length = 0;
      return snapshot();
    },
  };
  try {
    wrap(repository.unsaved, 'add', original => function (id) {
      const existed = this.has(id), result = original.apply(this, arguments);
      if (running) observe(() => {
        masks[existed ? 'repeatedAdds' : 'additions']++;
        if (!existed) count('mask.add.' + maskContext);
        masks.peak = Math.max(masks.peak, this.size);
      });
      return result;
    });
    wrap(repository.unsaved, 'delete', original => function () {
      const result = original.apply(this, arguments);
      if (running && result) observe(() => { masks.removals++; count('mask.remove.' + maskContext); });
      return result;
    });
    for (const key of ['replace', 'write', 'rememberMemory', 'forgetMemory', 'tombstone', 'retryMemory', 'flush',
      'ensureLocalDependencies', 'completeLocalDependencyInventory', 'settleLocalDependencyWork', 'repairLocalDependencies',
      'stageChunks', 'stageLocalDependencies', 'activate', 'flushContributorHostChange']) operation(repository, key, 'repository.' + key);
    operation(repository, 'transaction', 'repository.transaction', args => {
      transactions.calls++;
      const mode = args[2]; transactions[mode === 'readonly' || mode === 'readwrite' ? mode : 'other']++;
      count('transaction.mode.' + (mode === 'readonly' || mode === 'readwrite' ? mode : 'other'));
    });
    operation(repository.runtime, 'digest', 'runtime.digest', args => {
      hashing.calls++;
      if (typeof args[0] === 'string') { hashing.utf16Units += args[0].length; hashing.utf8Bytes += new TextEncoder().encode(args[0]).byteLength; }
    });
    operation(repository.runtime, 'yield', 'runtime.yield');
    operation(index.metadataParser, 'parse', 'parser.parse', args => {
      parser.calls++; if (typeof args[0] === 'string') parser.utf16Units += args[0].length;
    }, () => { parser.completed++; });
    for (const key of ['loadBody', 'acquire', 'reconcile']) operation(acquisition, key, 'acquisition.' + key);
    operation(acquisition, 'readBody', 'acquisition.readBody', args => {
      body.calls++;
      const file = args[0], state = acquisition.states?.get(file);
      body['cacheRequestToken' + tokenStatus(file, state)]++;
      if (state?.dirty) body.dirty++;
      if (state?.bodyDirty) body.bodyDirty++;
      if (state?.created) body.created++;
      if (repository.unsaved.has(file?.path)) {
        if (repository.memory.has(file.path)) body.memoryMask++; else body.evictedMask++;
      }
    }, result => { if (result) body.returned++; else { body.nullResults++; body.unknownMiss++; } });
    /** Observe actual token-qualified optional-cache requests; keep no copied path/body inventory. */
    wrap(acquisition.cache, 'getBodies', original => function (requests) {
      if (!running) return original.apply(this, arguments);
      const value = cacheTokens.getBodies;
      let qualified = 0;
      observe(() => {
        for (const request of requests) if (typeof request.inputToken === 'string') qualified++;
        if (qualified) value.calls++;
        value.requests += qualified;
      });
      let result;
      try { result = original.apply(this, arguments); }
      catch (error) {
        observe(() => { value.failedRequests += qualified; });
        throw error;
      }
      if (!qualified) return result;
      // The original request array is referenced only until its existing promise settles. No path,
      // token or body is copied into retained observer state or emitted in the report.
      const complete = (failed, values) => {
        if (!running) return;
        observe(() => {
          for (const request of requests) if (typeof request.inputToken === 'string') {
            if (failed) value.failedRequests++;
            else value[values?.has(request.path) ? 'hits' : 'misses']++;
          }
        });
      };
      if (result && typeof result.then === 'function') result.then(values => complete(false, values), () => complete(true));
      else complete(false, result);
      return result;
    });
    wrap(acquisition.cache, 'getQueuedBody', original => function (path, mtime, inputToken) {
      if (!running || typeof inputToken !== 'string') return original.apply(this, arguments);
      const value = cacheTokens.getQueuedBody;
      observe(() => { value.calls++; value.requests++; });
      let result;
      try { result = original.apply(this, arguments); }
      catch (error) { observe(() => { value.failedRequests++; }); throw error; }
      observe(() => { value[result ? 'hits' : 'misses']++; });
      return result;
    });
    // Parser failures are the method row's failed count; no exception object is retained.
    return probe;
  } catch (error) { probe.stop(); throw error; }
}

/**
 * Count parser, source-storage and digest calls synchronously without clocks, encoders or promise
 * observers. This test-only mode preserves original values/promises; completion belongs to the
 * native driver's independent source/cache closure oracle. UTF-16 lengths are not encoded bytes.
 * Required production owners must exist; the caller owns stop() and memory sampling cadence.
 * Parser and hash payloads are never retained.
 */
export function createLightweightIndexingProbe(index) {
  const repository = index.sourceAcquisition.repository, restores = [];
  const parser = { calls: 0, utf16Units: 0 }, hashing = { calls: 0, utf16Units: 0 };
  const transactions = { calls: 0, readonly: 0, readwrite: 0, other: 0 };
  let running = true, heapMaximum = 0, rssMaximum = 0;
  /** Count before delegation; never replace an async result or introduce a completion callback. */
  function wrap(owner, key, count) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, key), original = owner[key];
    /** Count the invocation synchronously, preserving the original receiver and result identity. */
    const replacement = function (...args) { if (running) count(args); return original.apply(this, args); };
    owner[key] = replacement;
    restores.push(/** Restore the prior descriptor only while this probe still owns the installed method. */ () => { if (owner[key] !== replacement) return;
      if (descriptor) Object.defineProperty(owner, key, descriptor); else delete owner[key]; });
  }
  wrap(index.metadataParser, 'parse', /** Count submissions and UTF-16 units without observing completion or encoding Markdown. */ args => { parser.calls++; if (typeof args[0] === 'string') parser.utf16Units += args[0].length; });
  wrap(repository.runtime, 'digest', /** Count existing hash input lengths without a second hash or UTF-8 conversion. */ args => { hashing.calls++; if (typeof args[0] === 'string') hashing.utf16Units += args[0].length; });
  wrap(repository, 'transaction', /** Classify the existing transaction mode; native transaction details remain unobserved. */ args => { transactions.calls++;
    transactions[args[2] === 'readonly' || args[2] === 'readwrite' ? args[2] : 'other']++; });
  /** Copy only fixed scalar counters, avoiding a retained per-source or payload collection. */
  function snapshot() { return { enabled: true, mode: 'lightweight', parser: { ...parser }, hashing: { ...hashing },
    transactions: { ...transactions }, heapMaximum, rssMaximum,
    semantics: 'Synchronous call counts and UTF-16 input lengths only; no promise timing or encoded-byte measurement.' }; }
  return { snapshot,
    /** Sample renderer memory only when the caller already samples process CPU. */
    sample(memory) { if (running) { heapMaximum = Math.max(heapMaximum, memory.heapUsed ?? 0); rssMaximum = Math.max(rssMaximum, memory.rss ?? 0); } },
    /** Release only these exact wrappers and return a copy of the final scalar observations. */
    stop() { running = false; for (const restore of restores.splice(0).reverse()) restore(); return snapshot(); },
  };
}
