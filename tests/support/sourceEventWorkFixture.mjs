/**
 * Finite PR210 production-acquisition workload in real IndexedDB. Native host events are synthetic;
 * source acquisition, dependency journals, reader protection and semantic replay remain production.
 * Three mutations are delivered at fixed distinct owner positions, never according to elapsed time
 * or repeated-work totals. Detailed native instrumentation is installed separately by the runner.
 */
export function installSourceEventWorkFixture(oracle) {
  const M = window.sourceModules;
  /** Fail with the original bounded synthetic condition rather than manufacturing readiness. */
  const check = (value, message) => { if (!value) throw new Error(message); };
  /** Synthetic identities are stable across arms and acquisition reopen. */
  const path = index => `Event-owner-${String(index).padStart(4, '0')}.md`;
  const settings = {hierarchy: {hidden: [], parents: [], children: [], leftFriends: ['Friends'],
    rightFriends: [], previous: [], next: []}, inferAllLinksAsFriends: false, inverseInfer: false,
    showFullTagName: true, tagStyleList: [], maxLabelLength: 30};
  const presentation = {noteTypeField: 'Type', primaryTagField: 'Style'};
  /** Identical final content is a function of owner and mutation ordinal, not execution speed. */
  const text = (index, owners, ordinal = 0) => `Friends:: [[${path((index + 1) % owners)}]]\n`
    + `[Reference ${ordinal}](https://example.com/event/${index % 4})\nStatus:: event-${ordinal}`;
  /** Observe terminal source and storage conditions without enumerating the database while timed. */
  function state(context) {
    const a = context.fixture.acquisition, r = context.fixture.repository;
    return {ready: a.hasSemanticDependencies(), ...a.getActivityState(), pendingResolution: a.pendingResolutionKeys.size,
      pendingImpacts: a.pendingKnownImpacts.size, fanouts: a.knownFanoutTasks.size,
      localInventoryPending: a.localInventoryCompletionPending, unsaved: r.unsaved.size,
      readers: r.readers.size, decodeBytes: r.decodeBytes, requested: a.requested};
  }
  /** A boolean returned by one interrupted pass is insufficient to establish genuine completion. */
  const closed = snapshot => snapshot.ready && !snapshot.pendingKnown && !snapshot.knownImpactTasks
    && !snapshot.sourceActive && !snapshot.repoWrites && !snapshot.repoDeleteTask && !snapshot.pendingResolution
    && !snapshot.pendingImpacts && !snapshot.fanouts && !snapshot.localInventoryPending && !snapshot.unsaved
    && !snapshot.readers && !snapshot.decodeBytes;
  /** Join the existing finite production work, retaining every cancelled/incomplete result. */
  async function converge(context, attempts = 16) {
    const outcomes = [], deadline = performance.now() + 45000;
    for (let attempt = 0; attempt < attempts; attempt++) {
      check(performance.now() < deadline, 'Bounded convergence deadline exceeded');
      outcomes.push(await context.fixture.acquisition.flush());
      check(await context.fixture.repository.flush(), 'Actual repository writes must drain');
      const snapshot = state(context);
      if (closed(snapshot)) return {outcomes, state: snapshot, completionAt: performance.now()};
      await new Promise(/** Yield only between explicit joins; production timers remain unchanged. */done => setTimeout(done, 0));
    }
    throw new Error(`Convergence remained incomplete: ${JSON.stringify({outcomes, state: state(context)})}`);
  }
  /** Seed complete canonical source authority before any measured event or observation. */
  async function setup(name, owners) {
    check(Number.isInteger(owners) && owners >= 8 && owners <= 384, 'Bounded owner count');
    const f = await window.fixture(name), context = {fixture: f, name, owners, delivered: [], baselineHeads: []};
    for (let index = 0; index < owners; index++) {
      const file = f.add(path(index), text(index, owners), {aliases: [`Alias ${index}`], Type: 'Synthetic'});
      file.stat.size = f.texts.get(file.path).length;
      f.metadata.get(file.path).hostTags = [`#event/group-${index % 4}`];
      f.app.metadataCache.resolvedLinks[file.path] = {[path((index + 1) % owners)]: 1};
    }
    await f.acquire(); await converge(context); f.acquisition.enableInventory();
    check(closed(state(context)), 'Seeded authority and storage must really close');
    reset(context); return context;
  }
  /** Fixture wrappers are equal in both arms and their overhead is included in measured CPU. */
  function reset(context) {
    const f = context.fixture; f.work.reset(); f.reads.length = 0; f.parses.length = 0;
    context.counterStart = f.acquisition.getCounters();
  }
  /** Deliver one actual modify/metadata/known-resolver wave without forcing internal revisions. */
  function mutate(context, index, ordinal) {
    const f = context.fixture, file = f.files.get(path(index));
    f.texts.set(file.path, text(index, context.owners, ordinal)); file.stat.mtime++; file.stat.size = f.texts.get(file.path).length;
    const old = f.metadata.get(file.path);
    f.metadata.set(file.path, {...old, frontmatter: {...old.frontmatter, aliases: [`Alias ${index}`, `Wave ${ordinal}`]}});
    const start = performance.now();
    f.app.vault.trigger('modify', file); f.app.metadataCache.trigger('changed', file); f.app.metadataCache.trigger('resolved');
    context.delivered.push({index, ordinal, at: start, finishedAt: performance.now(), content: f.texts.get(file.path)});
  }
  /** Aggregate exact synthetic work after the timed production interval, never during its awaits. */
  function work(context) {
    const f = context.fixture, snapshot = f.work.snapshot(), unique = new Set(snapshot.inspections);
    const counters = Object.fromEntries(Object.entries(f.acquisition.getCounters()).map(/** Each arm subtracts its own actual pre-work cumulative sample. */
      ([key, value]) => [key, value - context.counterStart[key]]));
    return {counters, inspections: snapshot.inspections.length, uniqueInspectedOwners: unique.size,
      repeatedInspections: snapshot.inspections.length - unique.size, ensures: snapshot.localEnsures,
      completes: snapshot.localCompletes, lookups: snapshot.localLookups, headPages: snapshot.headPages,
      visits: snapshot.visits.length, replacements: snapshot.writes.filter(/** Tombstones are reported separately from source activations. */name => name.startsWith('replace:')).length,
      tombstones: snapshot.writes.filter(/** Preserve any unexpected physical retirement work. */name => name.startsWith('tombstone:')).length,
      bodyReads: f.reads.length, parses: f.parses.length, markdownEnumerations: snapshot.markdownEnumerations,
      fileEnumerations: snapshot.fileEnumerations, rootEnumerations: snapshot.rootEnumerations};
  }
  /** Run an unscoped broad pass and either zero or exactly three identical finite source waves. */
  async function run(context, eventHeavy, broadStart = true) {
    const f = context.fixture, a = f.acquisition, original = f.repository.ensureLocalDependencies, diagnostics = a.startupDiagnostics;
    const boundaries = [1, 2, 3].map(/** Fixed distinct encounter coordinates are independent of repetitions. */part => Math.floor(context.owners * part / 4) - 1);
    const targets = [0, context.owners - 1, 0]; let next = 0, phase = '', token = 0;
    const passes = [], inspectedSweep = new Set(), ensured = new Set(); let sweepVisits = 0, ensureVisits = 0;
    // Forward at the production coarse accounting boundary. No algorithm, native event or
    // readiness flag is substituted; these bounded synthetic sets are equal observer overhead.
    a.startupDiagnostics = {
      /** Retain the production phase solely to separate the source sweep from coordinates/final proof. */
      phase(_kind, value) { phase = value; },
      /** Count actual sweep owner visits, not repeated internal inspections of one selected head. */
      processed(kind, sourceId) { if (kind === 'source' && phase === 'source-reconciliation') { sweepVisits++; inspectedSweep.add(sourceId); } },
      /** Preserve all finite pass outcomes, including cancelled/incomplete baseline attempts. */
      beginActivity(kind, scope, reason) { const id = ++token; passes.push({id, kind, scope, reason}); return id; },
      /** Original production ownership decides classification; this observer does not relabel it. */
      endActivity(id, outcome) { const pass = passes.find(item => item.id === id); if (pass) pass.outcome = outcome; },
      /** Other diagnostic categories do not require additional owner observations here. */
      count() {},
      /** Existing work accounting is observed separately through pass starts. */
      recordWork() {},
      /** Milestone recording grants no readiness in this fixture. */
      mark() {},
      /** Fixed category observation needs no per-owner queue. */
      activityCause() {},
      /** Idle accounting has no scheduling side effect. */
      stopActivityPhase() {},
    };
    const observed = {heartbeats: 0, maxHeartbeatGapMs: 0, intervalMs: 20}; let lastBeat = performance.now();
    const heartbeat = setInterval(/** One low-rate timer observes task availability, not paint or native interaction. */() => {
      const now = performance.now(); observed.maxHeartbeatGapMs = Math.max(observed.maxHeartbeatGapMs, now - lastBeat);
      lastBeat = now; observed.heartbeats++;
    }, observed.intervalMs);
    f.repository.ensureLocalDependencies = /** Deliver the fixed next event only after its distinct owner boundary completes. */ async function(sourceId, ...args) {
      ensureVisits++; ensured.add(sourceId);
      const result = await original.call(this, sourceId, ...args);
      if (eventHeavy && next < boundaries.length && sourceId === path(boundaries[next]) && result === 'ready') {
        const ordinal = ++next; mutate(context, targets[ordinal - 1], ordinal);
      }
      return result;
    };
    const beganAt = performance.now(); let closure;
    context.lastRun = {beganAt, boundaries, targets, passes, delivered: context.delivered};
    try {
      // This unscoped event deliberately opens genuine global uncertainty in both arms. The
      // control has no source events while that broad pass runs; it is not an idle no-work loop.
      if (broadStart) f.app.metadataCache.trigger('resolved');
      closure = await converge(context);
      check(next === (eventHeavy ? 3 : 0), 'Every predeclared mutation must actually be delivered');
      check(closed(state(context)), 'Actual source/dependency/reader closure is required');
      const lastEvent = context.delivered.at(-1)?.finishedAt ?? beganAt;
      return {beganAt, completedAt: closure.completionAt, elapsedMs: closure.completionAt - beganAt,
        eventDeliverySpanMs: context.delivered.length ? lastEvent - context.delivered[0].at : 0,
        lastEventToCompletionMs: closure.completionAt - lastEvent, delivered: [...context.delivered], boundaries, targets,
        outcomes: closure.outcomes, passes, closure: closure.state, heartbeat: observed, work: {...work(context),
          sourceSweepVisits: sweepVisits, uniqueSourceSweepOwners: inspectedSweep.size,
          revisitedSourceSweepOwners: sweepVisits - inspectedSweep.size, ensureVisits, uniqueEnsuredOwners: ensured.size,
          repeatedEnsureVisits: ensureVisits - ensured.size}};
    } finally {
      context.lastRun.finishedAt = performance.now(); context.lastRun.closure = state(context);
      context.lastRun.heartbeat = observed; context.lastRun.work = {...work(context), sourceSweepVisits: sweepVisits,
        uniqueSourceSweepOwners: inspectedSweep.size, revisitedSourceSweepOwners: sweepVisits - inspectedSweep.size,
        ensureVisits, uniqueEnsuredOwners: ensured.size, repeatedEnsureVisits: ensureVisits - ensured.size};
      clearInterval(heartbeat); f.repository.ensureLocalDependencies = original; a.startupDiagnostics = diagnostics;
    }
  }
  /** Independent fresh-host compilation is compared with authenticated selected-source replay. */
  async function semanticOracle(context) {
    const f = context.fixture; f.text = f.texts;
    const ids = [...f.files.keys()], rt = oracle.runtime();
    const expected = await oracle.hostOracle(f, ids, settings, presentation);
    const requests = [];
    for (const id of ids) {
      const captured = await f.acquisition.captureForReplay(id, presentation, rt);
      check(captured.outcome === 'ready', 'Every selected owner remains replayable'); requests.push(captured.request);
    }
    const replayed = await new M.CachedSourceSemanticReader(f.repository).prepare(requests,
      {revision: 'event-work:1', settings, isCurrent: () => true}, f.acquisition.cachedEntityReadPort(rt), rt);
    check(replayed.outcome === 'ready', `Authenticated final replay: ${replayed.reason}`);
    const expectedView = oracle.semanticView(expected), actual = oracle.semanticView(replayed.compilation);
    check(JSON.stringify(actual) === JSON.stringify(expectedView), 'Full final semantic and multiplicity oracle mismatch');
    const db = await f.cache.open(), request = window.value;
    const meta = await request(db.transaction('meta').objectStore('meta').getAll());
    const leases = meta.filter(/** Namespace comes from production persistent reader records. */row => typeof row.key === 'string' && row.key.startsWith('source-lease:')).length;
    const repairs = await request(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).count());
    const impacts = await request(db.transaction(M.SOURCE_IMPACT_STORE).objectStore(M.SOURCE_IMPACT_STORE).count());
    const local = meta.find(/** Selected local count closure is separate from the acquisition flag. */row => row.key === M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY);
    const primary = meta.find(/** Primary impact tickets must also finish before timing is accepted. */row => row.key === M.SOURCE_DEPENDENCY_STATE_KEY);
    check(!leases && !repairs && !impacts && !f.repository.readers.size && !f.repository.decodeBytes, 'No shifted lease/count/reclamation debt');
    check(local?.complete && local.pending === 0 && primary?.dirty === 0, 'Actual durable dependency completion remains closed');
    return {semanticDigest: await f.repository.observationDigest(JSON.stringify(actual)), owners: ids.length,
      nodes: actual.nodes.length, declarations: actual.declarations.length, leases, repairs, impacts, closure: state(context)};
  }
  /** Observe a matched quiet tail outside semantic-oracle work; no global/body scans are added. */
  async function quiet(context, milliseconds = 500) {
    await new Promise(/** This declared observation tail does not alter runtime scheduling. */done => setTimeout(done, milliseconds));
    check(closed(state(context)), 'Matched quiet tail must retain actual completion');
    return {milliseconds, closure: state(context), work: work(context)};
  }
  /** A subsequent real edit uses exactly one additional fixed wave in both arms. */
  async function subsequentEdit(context) { mutate(context, Math.floor(context.owners / 2), 4); return converge(context); }
  /** Reopen the same owned database and final documents with a fresh acquisition/connection. */
  async function reopen(context) {
    const f = context.fixture;
    check(closed(state(context)), 'Connection closure requires source and repository drain');
    const host = [...f.files].map(/** Preserve final content/metadata/stat exactly across a new native incarnation. */([id, file]) =>
      ({id, text: f.texts.get(id), metadata: structuredClone(f.metadata.get(id)), stat: {...file.stat}}));
    const links = structuredClone(f.app.metadataCache.resolvedLinks); f.close();
    const next = await window.fixture(context.name); context.fixture = next;
    for (const item of host) {
      const file = next.add(item.id, item.text, item.metadata.frontmatter); file.stat = item.stat; next.metadata.set(item.id, item.metadata);
    }
    next.app.metadataCache.resolvedLinks = links; reset(context);
    const result = await converge(context); next.acquisition.enableInventory(); return result;
  }
  /** Explicit closure also runs after a failed arm; browser-profile cleanup is separately owned. */
  async function cleanup(context) {
    if (!context) return {closed: true, contextAbsent: true};
    const before = state(context); context.fixture.close();
    return {closed: context.fixture.acquisition.closed, repositoryClosed: context.fixture.repository.closed,
      remainingEventDisposers: context.fixture.acquisition.cleanup.length, timers: [context.fixture.acquisition.timer,
      context.fixture.acquisition.pollTimer, context.fixture.acquisition.resolverWaveTimer,
      context.fixture.acquisition.deferredResolutionRetryTimer], before};
  }
  window.sourceEventWork = {setup, run, semanticOracle, quiet, subsequentEdit, reopen, cleanup, state, reset};
  return true;
}

/** Share exact oracle injection between the diagnostic runner and its real-IDB harness tests. */
export function sourceEventBrowserInitialize({collect, hostOracle, semanticView}) {
  return `(()=>{const M=window.sourceModules,assert=Object.assign(window.ok,{equal:window.equal});
    const runtime=()=>({now:()=>0,yield:async()=>{},isCurrent:()=>true,sliceBudgetMs:8,resolverBatchSize:50});
    const collect=${collect.toString()},hostOracle=${hostOracle.toString()},semanticView=${semanticView.toString()};
    return (${installSourceEventWorkFixture.toString()})({runtime,hostOracle,semanticView});})()`;
}
