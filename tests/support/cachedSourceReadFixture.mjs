/**
 * PR205 real-IndexedDB cached-read fixture. Production source/acquisition owners perform staging,
 * authentication, inventory and reclamation; synthetic host doubles contain no application notes.
 * Diagnostic wrappers count native calls, including original-connection reader retirement, and
 * restore exact identities. The lightweight timing lane never installs these wrappers.
 */
export function installCachedSourceReadFixture() {
  const M = window.sourceModules;
  /** Reject partial synthetic evidence rather than granting source readiness from a counter. */
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const request = window.value;
  /** Stable synthetic path; opaque production identities are never inferred from this spelling. */
  const path = index => `Read-owner-${String(index).padStart(4, "0")}.md`;
  /** Produce finite small metadata or a genuinely multichunk alias family with the same host model. */
  function addHost(context, index, dense = false, urlFree = false) {
    const text = `Friends:: [[Shared target]]${urlFree ? "" : `\n[Reference](https://example.com/shared/${index % 4})`}`;
    const aliases = dense ? Array.from({ length: 600 }, /** Keep dense rows deterministic and above the normal chunk target. */(_, ordinal) => `Alias ${ordinal} ${"x".repeat(600)}`) : [`Owner alias ${index}`];
    const file = context.fixture.add(path(index), text, { aliases });
    context.fixture.metadata.get(file.path).hostTags = ["#shared/nested"];
    return file;
  }
  /** Open only this arm's owned database and reconstruct identical host objects after browser restart. */
  async function setup(name, owners, dense = false, urlFree = false) {
    const fixture = await window.fixture(name);
    const context = { fixture, repository: fixture.repository, db: await fixture.cache.open(), name, owners, dense, urlFree };
    for (let index = 0; index < owners; index++) addHost(context, index, dense, urlFree);
    return context;
  }
  /** Stage healthy canonical sources outside measured reads, including stable dependency coordinates. */
  async function seedRange(context, first = 0, limit = context.owners) {
    const end = Math.min(context.owners, first + limit);
    for (let index = first; index < end; index++) {
      const file = context.fixture.files.get(path(index));
      const result = await context.fixture.acquisition.acquire(file, M.parseBodyMetadata(context.fixture.texts.get(file.path)));
      assert(result.current && result.saved, "Synthetic source acquisition must be durable");
      assert(await context.repository.ensureLocalDependencies(file.path, index, index) === "ready", "Dependency coordinates close before measurement");
    }
    if (end === context.owners) assert(await context.repository.completeLocalDependencyInventory() === "ready", "Initial dependency inventory closes");
  }
  /** Clear test-only observation arrays before the measured production invocation. */
  function reset(context) {
    context.fixture.work.reset(); context.fixture.reads.length = 0; context.fixture.parses.length = 0;
  }
  /** Invoke the real restart-inventory consumer, including ordinary head and local-owner checks. */
  async function inventory(context) {
    const files = [...context.fixture.files.values()];
    const structuralOrder = new Map(files.map(/** Supply the fixture's stable genuine encounter ordinals. */(file, index) => [file.path, index]));
    const acquisition = context.fixture.acquisition;
    assert(!acquisition.restartInventoryChecked, "Each arm measures one fresh restart-inventory pass");
    const result = await acquisition.reconcileRestartHostInventory(files, structuralOrder, /** No source/host event occurs in this unchanged serial fixture. */() => true);
    assert(result && acquisition.restartInventoryChecked, "Full production host comparison closes");
    assert(context.fixture.reads.length === 0 && context.fixture.parses.length === 0 && context.fixture.work.writes.length === 0, "Clean cached comparison must not read bodies, parse or activate sources");
    const work = context.fixture.work.snapshot();
    const hostClosure = { dirtyOwners: 0, pendingKnown: acquisition.pendingKnownFiles.size,
      pendingKnownImpacts: acquisition.pendingKnownImpacts.size, knownFanoutTasks: acquisition.knownFanoutTasks.size,
      knownImpactTasks: acquisition.knownImpactTasks, pendingResolutionKeys: acquisition.pendingResolutionKeys.size,
      uncertainResolution: acquisition.uncertainResolution };
    for (const file of files) {
      const state = acquisition.states.get(file);
      if (state && (state.dirty || state.bodyDirty || state.resolutionDirty || state.created || state.impact)) hostClosure.dirtyOwners++;
    }
    assert(work.localLookups === 0, "Unchanged host comparison must not begin resolution-dependency fan-out");
    assert(hostClosure.dirtyOwners === 0 && hostClosure.pendingKnown === 0 && hostClosure.pendingKnownImpacts === 0
      && hostClosure.knownFanoutTasks === 0 && hostClosure.knownImpactTasks === 0 && hostClosure.pendingResolutionKeys === 0
      && !hostClosure.uncertainResolution, "Clean inventory must not shift host/source repair or resolution work beyond measurement");
    return { completed: result, owners: files.length, counters: acquisition.getCounters(), hostClosure, work: {
      inspections: work.inspections.length, visits: work.visits.length, writes: work.writes.length,
      headPages: work.headPages, localEnsures: work.localEnsures, localCompletes: work.localCompletes, localLookups: work.localLookups,
      vaultReads: context.fixture.reads.length, parses: context.fixture.parses.length,
    } };
  }
  /** Isolate the real durable host-metadata helper; its private facts are checked before discarding. */
  async function component(context) {
    let records = 0;
    for (const file of context.fixture.files.values()) {
      const result = await context.fixture.acquisition.durableHostInventory(file.path, /** This controlled helper call has no concurrent host event. */() => true);
      assert(result.reason === "ready", "Durable metadata helper authenticates each complete family");
      const expected = context.fixture.acquisition.currentHostInventory(file, context.fixture.metadata.get(file.path));
      assert(JSON.stringify(result.facts) === JSON.stringify(expected), "Actual helper retains exact host-significant facts");
      records += result.facts.length;
    }
    return { owners: context.owners, records };
  }
  /** Damage only this control's immutable metadata bytes/posting after healthy setup has closed. */
  async function corruptMetadata(context, damage) {
    const id = path(0), selected = await context.repository.inspect(id, []), family = selected.head.families.metadata;
    const store = damage === "sha" ? M.SOURCE_CHUNK_STORE : M.SOURCE_POSTING_STORE;
    await window.edit(context.db, [store], /** Keep the fault injection inside one ordinary native fixture transaction. */async transaction => {
      const objectStore = transaction.objectStore(store), key = [id, family.revision, "metadata", 0];
      const row = await request(objectStore.get(key));
      assert(row !== undefined, "Negative control damages an actual selected metadata record");
      objectStore.put(damage === "sha" ? { ...row, digest: "0".repeat(64) } : { ...row, key: `${row.key}:corrupt` });
    });
  }
  /** A corrupt helper result remains non-ready and releases protection; repair is measured later. */
  async function negativeComponent(context, damage) {
    const result = await context.fixture.acquisition.durableHostInventory(path(0), /** The only concurrent change was the completed explicit storage fault. */() => true);
    const expected = damage === "sha" ? "invalid-chunk" : "invalid-posting";
    assert(result.reason === expected, "Actual helper rejects the selected corrupt family with its original classification");
    return { owners: 1, reason: result.reason, returnedPrivateRecords: result.facts.length, published: false };
  }
  /** Narrow negative-path setup retains ordinary manifests and production replacement semantics. */
  async function prepareControl(context, control) {
    const id = path(0), selected = await context.repository.inspect(id, []), head = selected.head;
    if (control === "legacy") {
      // Existing URL-bearing grammar2 is not accepted as a fabricated current grammar. An empty
      // body URL family is the supported legacy compatibility control and remains byte-authenticated.
      assert(head.families["body-urls"].records === 0, "Legacy fixture's actual parser input is URL-free");
      const result = await context.repository.replace({ sourceId: id, expected: selected.expected,
        physical: head.physical, observation: head.observation, bodyParserVersion: 2,
        families: { ...head.families, "body-urls": /** Produce the actual URL-free legacy family through normal staging. */async () => true } });
      assert(result.outcome === "activated", "Legacy control uses a genuine normal source replacement");
    } else if (control === "shared") {
      const result = await context.repository.replace({ sourceId: id, expected: selected.expected,
        physical: head.physical, observation: head.observation, bodyParserVersion: head.bodyParserVersion,
        families: { ...head.families, resolution: /** Change one family while retaining the other immutable family selections. */async emit => emit({ kind: "host-link", state: "unresolved", target: "Synthetic changed resolution", count: 1 }) } });
      assert(result.outcome === "activated", "Shared-family control publishes normally");
      const current = await context.repository.inspect(id, []);
      assert(new Set(Object.values(current.head.families).map(/** Distinct selected revisions need independent persistent protection. */family => family.revision)).size > 1, "Control genuinely selects several immutable family revisions");
    }
    assert(await context.repository.completeLocalDependencyInventory() === "ready", "Control setup closes before observation");
  }
  /** Independent closure oracle is deliberately outside both timing and diagnostic operation totals. */
  async function oracle(context) {
    const { repository, db } = context;
    const heads = await request(db.transaction(M.SOURCE_HEAD_STORE).objectStore(M.SOURCE_HEAD_STORE).getAll());
    const meta = await request(db.transaction("meta").objectStore("meta").getAll());
    const leases = meta.filter(/** Reader records have an established literal key namespace. */row => typeof row.key === "string" && row.key.startsWith("source-lease:"));
    const repairs = await request(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).count());
    const impacts = await request(db.transaction(M.SOURCE_IMPACT_STORE).objectStore(M.SOURCE_IMPACT_STORE).count());
    const local = meta.find(/** Read actual durable selected-count closure rather than fixture bookkeeping. */row => row.key === M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY);
    const primary = meta.find(/** Primary tickets must be closed as well as local reclamation. */row => row.key === M.SOURCE_DEPENDENCY_STATE_KEY);
    assert(heads.length === context.owners && heads.every(/** All synthetic materialized files retain complete source heads. */head => head.state === "complete"), "Every seeded owner remains complete");
    assert(leases.length === 0 && repository.readers.size === 0 && repository.decodeBytes === 0, "All reader protection and decode reservations are released");
    assert(repairs === 0 && impacts === 0 && local?.pending === 0 && primary?.dirty === 0, "No shifted repair or reclamation debt");
    return { heads, leases: leases.length, readers: repository.readers.size, decodeBytes: repository.decodeBytes, peakDecodeBytes: repository.getDiagnostics().peakDecodeBytes, repairs, impacts, pending: local.pending, primaryDirty: primary.dirty };
  }
  /** Genuine metadata edit after cached reads; reclaim every known old source/family revision. */
  async function subsequentEdit(context) {
    const file = context.fixture.files.get(path(0));
    const old = await context.repository.inspect(file.path, []);
    context.fixture.metadata.get(file.path).frontmatter.aliases = ["New alias after cached validation"];
    file.stat.mtime++; file.stat.size++;
    const result = await context.fixture.acquisition.acquire(file, M.parseBodyMetadata(context.fixture.texts.get(file.path)));
    assert(result.current && result.saved, "Subsequent ordinary edit commits");
    const selected = await context.repository.inspect(file.path, []);
    assert(selected.head.sourceRevision !== old.head.sourceRevision, "Later edit genuinely advances source revision");
    for (const revision of new Set([old.head.sourceRevision, ...Object.values(old.head.families).map(/** Retained family revisions also require conservative cleanup. */family => family.revision)]))
      assert(await context.repository.cleanupRevision(file.path, revision), "Known retired family cleanup closes");
    assert(await context.repository.completeLocalDependencyInventory() === "ready", "Later edit settles dependency closure");
    return { saved: result.saved, current: result.current, reason: result.reason, advanced: true };
  }
  /**
   * Fixed-cardinality native totals carry request identity through completion. No per-source trace
   * or mutable phase label supplies exclusive attribution. All instrumentation is diagnostic-only.
   */
  function observe(repository) {
    const totals = { transactions: {}, transactionLifetimes: {}, requests: {}, committedTransactions: 0, abortedTransactions: 0, pendingTransactions: 0,
      leaseAdds: 0, leaseDeletes: 0, leaseAddCommitted: 0, leaseDeleteCommitted: 0, maxLiveLeaseDelta: 0,
      hashes: 0, hashUtf16Units: 0, decodes: 0, decodedUtf16Units: 0, chunkGets: 0, chunkRecords: 0, chunkEncodedBytes: 0,
      postingReads: 0, postingRecords: 0, ownerVisits: 0, overflow: false };
    const restores = [], transactionState = new WeakMap();
    let liveLeaseDelta = 0, retired = false;
    /** Saturate rather than silently lose integer precision or permit unbounded label growth. */
    const add = (object, key, amount = 1) => { const next = (object[key] ?? 0) + amount; if (!Number.isSafeInteger(next)) totals.overflow = true; else object[key] = next; };
    /**
     * Native creation-to-terminal-event elapsed time includes queueing and event dispatch. These
     * diagnostic aggregates cannot establish exclusive write-lock hold time or store CPU cost.
     */
    function finishLifetime(state, terminal) {
      const elapsed = Math.max(0, performance.now() - state.started);
      const value = totals.transactionLifetimes[state.label] ??= { count: 0, complete: 0, abort: 0, totalMs: 0, maxMs: 0,
        bucketsMs: { "0-1": 0, "1-4": 0, "4-16": 0, "16-64": 0, "64-256": 0, "256+": 0 } };
      add(value, "count"); add(value, terminal); value.totalMs += elapsed; value.maxMs = Math.max(value.maxMs, elapsed);
      const bucket = elapsed <= 1 ? "0-1" : elapsed <= 4 ? "1-4" : elapsed <= 16 ? "4-16" : elapsed <= 64 ? "16-64" : elapsed <= 256 ? "64-256" : "256+";
      add(value.bucketsMs, bucket);
      if (!Number.isFinite(value.totalMs)) totals.overflow = true;
    }
    /** Save exact receiver method identity before every test-only replacement. */
    const patch = (object, key, replacement) => { const original = object[key]; object[key] = replacement(original); restores.push({ object, key, original }); };
    patch(IDBDatabase.prototype, "transaction", /** Every native transaction includes direct release paths. */original => /** Attach bounded per-transaction completion identity without changing handlers. */function(...args) {
      const started = performance.now(), transaction = original.apply(this, args), stores = [...transaction.objectStoreNames].sort().join(",");
      const state = { adds: 0, deletes: 0, started, label: `${transaction.mode}|${stores}` }; transactionState.set(transaction, state);
      add(totals.transactions, state.label); totals.pendingTransactions++;
      transaction.addEventListener("complete", /** Only committed writes contribute to the outstanding-lease bound. */() => { finishLifetime(state, "complete"); totals.pendingTransactions--; totals.committedTransactions++; totals.leaseAddCommitted += state.adds; totals.leaseDeleteCommitted += state.deletes; liveLeaseDelta += state.adds - state.deletes; totals.maxLiveLeaseDelta = Math.max(totals.maxLiveLeaseDelta, liveLeaseDelta); });
      transaction.addEventListener("abort", /** Preserve incomplete/aborted transactions as observed outcomes. */() => { finishLifetime(state, "abort"); totals.pendingTransactions--; totals.abortedTransactions++; });
      return transaction;
    });
    for (const method of ["get", "getAll", "getAllKeys", "count", "add", "put", "delete", "openCursor", "openKeyCursor"])
      patch(IDBObjectStore.prototype, method, /** Keep native requests and their result ownership unchanged. */original => /** Count a finite store/method vocabulary before forwarding the call. */function(...args) {
        add(totals.requests, `${this.name}|${method}`);
        const state = transactionState.get(this.transaction);
        if (this.name === "meta" && method === "add" && args[0]?.key?.startsWith("source-lease:")) { totals.leaseAdds++; if (state) state.adds++; }
        if (this.name === "meta" && method === "delete" && typeof args[0] === "string" && args[0].startsWith("source-lease:")) { totals.leaseDeletes++; if (state) state.deletes++; }
        const result = original.apply(this, args);
        if (this.name === M.SOURCE_CHUNK_STORE && method === "get") result.addEventListener("success", /** Attribute immutable bytes to this exact native chunk request. */() => { const row = result.result; totals.chunkGets++; if (row && typeof row.bytes === "number") { totals.chunkRecords += row.records; totals.chunkEncodedBytes += row.bytes; } });
        if (this.name === M.SOURCE_POSTING_STORE && ["get", "getAll"].includes(method)) result.addEventListener("success", /** Count returned posting records without retaining their payloads. */() => { totals.postingReads++; totals.postingRecords += Array.isArray(result.result) ? result.result.length : result.result ? 1 : 0; });
        return result;
      });
    for (const method of ["get", "getKey", "getAll", "getAllKeys", "count", "openCursor", "openKeyCursor"])
      patch(IDBIndex.prototype, method, /** Index calls have their own closed namespace. */original => /** Preserve receiver, argument and request identities. */function(...args) { add(totals.requests, `${this.objectStore.name}|index.${method}`); return original.apply(this, args); });
    patch(repository.runtime, "digest", /** Hash input sizes do not allocate an encoded payload copy. */original => /** Forward normal cryptographic authentication unchanged. */function(text, ...args) { totals.hashes++; totals.hashUtf16Units += text.length; return original.call(this, text, ...args); });
    patch(repository, "visitFamily", /** Count actual family-owner visits rather than wrapper invocations. */original => /** Retain all production family authentication and scheduling. */function(...args) { totals.ownerVisits++; return original.apply(this, args); });
    patch(JSON, "parse", /** Detailed decode accounting runs separately from acceptance timing. */original => /** Classify actual decoded fact arrays without retaining any decoded object. */function(text, ...args) { const decoded = original.call(this, text, ...args); if (Array.isArray(decoded) && decoded.every(/** Family frames carry literal kind discriminants. */row => row && typeof row.kind === "string")) { totals.decodes++; totals.decodedUtf16Units += text.length; } return decoded; });
    return { totals,
      /** Restore wrappers independently of pass/fail and verify no diagnostic method escaped. */
      retire() { if (retired) return; retired = true; for (const item of restores.reverse()) item.object[item.key] = item.original; assert(restores.every(/** Exact original identities must be restored, not rebound substitutes. */item => item.object[item.key] === item.original), "Diagnostic wrappers restored"); assert(totals.pendingTransactions === 0, "All observed native transactions have terminal events"); } };
  }
  window.cachedSourceRead = { path, setup, seedRange, reset, component, negativeComponent, corruptMetadata, inventory, prepareControl, oracle, subsequentEdit, observe };
}
