/**
 * Test-only PR201 consumer attribution, injectable through the exported function's source.
 * Explicit Node async contexts distinguish requested readers and inventory without an ambient
 * current-consumer variable. Bounded private identities describe overlap, never authority.
 * Raw family attempts/completions have independent bounded ledgers, including visits made by
 * inspect/pin grammar validation outside readSelected. They never grant selected-read credit.
 * No diagnostic read, hash, timer, retry or production readiness mutation is introduced.
 */
/** Attach bounded passive attribution to one loaded index; unsupported host async contexts reject cleanly. */
export function createIndexingConsumerProbe(index) {
  const acquisition = index?.sourceAcquisition, repository = acquisition?.repository;
  if (!acquisition || !repository) throw new Error('Consumer probe requires current source owners');
  let AsyncLocalStorage;
  try { ({AsyncLocalStorage} = require('node:async_hooks')); }
  catch { throw new Error('Consumer probe requires host Node AsyncLocalStorage'); }
  if (typeof AsyncLocalStorage !== 'function') throw new Error('Consumer probe requires host Node AsyncLocalStorage');
  const contexts = new AsyncLocalStorage(), originals = [], aggregates = new Map(), methods = {};
  const sources = new Map(), tuples = new Map(), memberships = new Map(), pendingReads = new Set();
  const rawSources = new Map(), rawTuples = new Map(), rawMemberships = new Map(), rawPending = new Set(), rawAggregates = new Map();
  const LIMIT = 4096, BYTE_LIMIT = 2 * 1024 * 1024, LABEL_LIMIT = 192;
  let running = true, errors = 0, nextRequest = 0, nextSource = 0, nextTuple = 0;
  let active = 0, peakActive = 0, sourceBytes = 0, tupleBytes = 0, pendingBytes = 0, finalSnapshot = null;
  const dropped = {sources: 0, tuples: 0, memberships: 0, contexts: 0, pendingReads: 0, labels: 0, invalidIdentities: 0};
  const coverage = {attributed: 0, unattributed: 0, ambiguous: 0, publicationUnknown: 0,
    publicationChangedDuringRead: 0, authenticatedReads: 0, authenticatedFamilies: 0};
  const repeats = {first: 0, sameRequest: 0, sameRequestSameConsumer: 0, sameRequestOtherConsumer: 0, otherRequestSamePublication: 0,
    otherRequestChangedPublication: 0, otherRequestUnknownPublication: 0, membershipUnknown: 0};
  /** Keep attempt and ready-completion repetition distinct; neither represents selected authority. */
  const rawRepeatCounts = () => ({first: 0, sameRequest: 0, sameRequestSameConsumer: 0, sameRequestOtherConsumer: 0,
    otherRequestSamePublication: 0, otherRequestChangedPublication: 0, otherRequestUnknownPublication: 0, membershipUnknown: 0});
  const rawFamilies = {attempts: 0, attributed: 0, unattributed: 0, insideSelectedRead: 0, outsideSelectedRead: 0,
    ready: 0, notReady: 0, rejected: 0, thrown: 0, unidentified: 0, completionUntracked: 0,
    publicationChangedDuringVisit: 0, publicationUnknown: 0, pendingAtStop: 0};
  const rawRepeats = {attempted: rawRepeatCounts(), ready: rawRepeatCounts()};
  const rawDropped = {sources: 0, tuples: 0, memberships: 0, pendingVisits: 0, labels: 0, invalidIdentities: 0};
  let rawSourceBytes = 0, rawTupleBytes = 0, rawMembershipBytes = 0, nextRawSource = 0, nextRawTuple = 0;

  /** Isolate observer failures from product callbacks, returns and promise settlement. */
  function observe(callback) { try { callback(); } catch { errors++; } }
  /** Read existing scalar publication coordinates without invoking any product operation. */
  function publication() {
    const value = index.semanticPublicationRevision ?? index.publicationRevision;
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  /** Retain only finite method/consumer labels; no arbitrary arguments enter aggregate keys. */
  function add(context, operation, amount = 1) {
    const consumer = context?.consumer ?? 'unattributed';
    let key = consumer + ':' + operation;
    if (!aggregates.has(key) && aggregates.size >= LABEL_LIMIT - 1) { dropped.labels++; key = 'other'; }
    aggregates.set(key, (aggregates.get(key) ?? 0) + amount);
  }
  /** Count explicit async ownership; an unsupported/missing context remains visibly unattributed. */
  function current() {
    const context = contexts.getStore();
    coverage[context?.request != null ? 'attributed' : 'unattributed']++;
    return context;
  }
  /** Observe the existing promise without returning its observer branch or retaining its value. */
  function settled(result, callback) {
    if (result && typeof result.then === 'function') result.then(
      /** A success observer cannot turn the product promise into a rejection. */
      value => { if (running) observe(/** Credit completion only while this diagnostic lifetime remains active. */ () => callback(true, value)); },
      /** A rejection observer consumes only its own diagnostic branch. */
      () => { if (running) observe(/** Record rejection without retaining or rethrowing its exception. */ () => callback(false)); });
    else if (running) observe(/** Apply the same completion accounting to a synchronous result. */ () => callback(true, result));
  }
  /** Preserve original own descriptors and inherited methods for idempotent cleanup. */
  function wrap(owner, key, factory) {
    if (typeof owner?.[key] !== 'function') { methods[key] = 'absent'; return; }
    const descriptor = Object.getOwnPropertyDescriptor(owner, key), original = owner[key];
    const replacement = factory(original);
    owner[key] = replacement;
    if (owner[key] !== replacement) throw new Error('Consumer probe could not wrap ' + key);
    originals.push({owner, key, descriptor, replacement}); methods[key] = 0;
  }
  /** Count one supported method without allocating per-call records or copying its arguments. */
  function called(key) { methods[key]++; }
  /** Run existing work under a scalar-only request lineage, retaining its exact returned promise. */
  function contextMethod(owner, key, label, root = false) {
    wrap(owner, key, /** Capture the original method for this diagnostic context wrapper. */ original =>
      /** Enter only diagnostic async context; delegate with the product receiver and exact result. */ function (...args) {
      if (!running) return original.apply(this, args);
      called(key);
      const parent = contexts.getStore();
      if (active >= LIMIT || !Number.isSafeInteger(nextRequest + 1)) {
        dropped.contexts++;
        return contexts.run(null, /** Capacity loss must not inherit a misleading parent attribution. */ () => original.apply(this, args));
      }
      const request = root || parent?.request == null ? ++nextRequest : parent.request;
      const consumer = key === 'prepareSemanticScope' ? (args[3] !== undefined ? 'sibling' : 'neighborhood')
        : parent?.consumer === 'sibling' && !label.startsWith('inventory.') ? 'sibling.' + label : label;
      const context = {request, consumer, publication: parent && !root ? parent.publication : publication()};
      active++; peakActive = Math.max(peakActive, active);
      let result;
      try { result = contexts.run(context, /** Preserve the receiver while attaching lineage to existing async work. */ () => original.apply(this, args)); }
      catch (error) { active--; throw error; }
      settled(result, /** Retire the diagnostic active count when this existing operation settles. */ () => { active--; });
      return result;
    });
  }
  /** Assign private bounded ordinals; neither source paths nor revision strings are exported. */
  function sourceOrdinal(sourceId) {
    if (typeof sourceId !== 'string' || sourceId.length > 16384) { dropped.invalidIdentities++; return null; }
    if (sources.has(sourceId)) return sources.get(sourceId);
    const bytes = 2 * sourceId.length + 64;
    if (sources.size >= LIMIT || sourceBytes + bytes > BYTE_LIMIT) { dropped.sources++; return null; }
    const ordinal = ++nextSource;
    sources.set(sourceId, ordinal); sourceBytes += bytes;
    return ordinal;
  }
  /** Form an exact bounded head/family identity; raw callers use independent source ordinals and losses.
   * Raw visits additionally reject unvalidated containers before serialization; selected callers retain their contract. */
  function tupleKey(view, family, source = sourceOrdinal(view?.head?.sourceId), raw = false) {
    const head = view?.head, manifest = head?.families?.[family], losses = raw ? rawDropped : dropped;
    if (source === null || !manifest || !['resolution', 'metadata', 'values', 'body-urls'].includes(family)) return null;
    const fields = [source, head.sourceRevision, view.sequence, family, manifest.revision, manifest.chunks,
      manifest.records, manifest.bytes, manifest.postings, manifest.digest, manifest.postingDigest];
    if (raw && fields.some(/** Memory selections have a null sequence; reject other unvalidated containers before serialization. */ (value, position) =>
      !(position === 2 && value === null) && typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value)))) { losses.invalidIdentities++; return null; }
    if (fields.some(/** Reject oversized identity components before allocating the tuple serialization. */ value => typeof value === 'string' && value.length > 16384)) { losses.invalidIdentities++; return null; }
    const key = JSON.stringify(fields);
    if (key.length > 32768) { losses.invalidIdentities++; return null; }
    return key;
  }
  /** Bound raw labels separately so attempted validation cannot consume authenticated aggregate capacity. */
  function rawAdd(context, operation) {
    let key = (context?.consumer ?? 'unattributed') + ':' + operation;
    if (!rawAggregates.has(key) && rawAggregates.size >= LABEL_LIMIT - 1) { rawDropped.labels++; key = 'other'; }
    rawAggregates.set(key, (rawAggregates.get(key) ?? 0) + 1);
  }
  /** Allocate only private raw identities; rejected attempts cannot exhaust authenticated source ordinals. */
  function rawTuple(view, family) {
    const sourceId = view?.head?.sourceId;
    if (typeof sourceId !== 'string' || sourceId.length > 16384) { rawDropped.invalidIdentities++; return null; }
    let source = rawSources.get(sourceId);
    if (source === undefined) {
      const bytes = 2 * sourceId.length + 64;
      if (rawSources.size >= LIMIT || rawSourceBytes + bytes > BYTE_LIMIT) { rawDropped.sources++; return null; }
      source = ++nextRawSource; rawSources.set(sourceId, source); rawSourceBytes += bytes;
    }
    const key = tupleKey(view, family, source, true);
    if (!key) return null;
    let tuple = rawTuples.get(key);
    if (!tuple) {
      const bytes = 2 * key.length + 128;
      if (rawTuples.size >= LIMIT || rawTupleBytes + bytes > BYTE_LIMIT) { rawDropped.tuples++; return null; }
      tuple = {ordinal: ++nextRawTuple}; rawTuples.set(key, tuple); rawTupleBytes += bytes;
    }
    return tuple;
  }
  /** Classify exact repeats independently at admission and ready completion, with bounded lineage membership. */
  function rawRepeat(tuple, context, stage, observedPublication) {
    if (!tuple) return;
    const counts = rawRepeats[stage], consumerKey = stage + 'Consumer', publicationKey = stage + 'Publication', requestKey = stage + 'Request';
    const membershipKey = context?.request != null ? context.request + ':' + tuple.ordinal : null;
    let membership = membershipKey ? rawMemberships.get(membershipKey) : null;
    if (!Object.prototype.hasOwnProperty.call(tuple, publicationKey)) { counts.first++; rawAdd(context, stage + '.first'); }
    else if (!membershipKey || tuple[requestKey] == null) counts.membershipUnknown++;
    else if (membership?.[consumerKey] !== undefined) {
      counts.sameRequest++;
      const sameConsumer = membership[consumerKey] === context.consumer;
      counts[sameConsumer ? 'sameRequestSameConsumer' : 'sameRequestOtherConsumer']++;
      rawAdd(context, stage + '.sameRequest.from.' + membership[consumerKey]);
    } else if (!membership && (rawMemberships.size >= LIMIT || rawMembershipBytes + 512 + 2 * membershipKey.length > BYTE_LIMIT)) counts.membershipUnknown++;
    else if (observedPublication === null || tuple[publicationKey] === null) counts.otherRequestUnknownPublication++;
    else {
      const category = observedPublication === tuple[publicationKey] ? 'otherRequestSamePublication' : 'otherRequestChangedPublication';
      counts[category]++; rawAdd(context, stage + '.' + category);
    }
    tuple[publicationKey] = observedPublication;
    // Publication equality cannot recover an unknown preceding request identity.
    tuple[requestKey] = context?.request ?? null;
    if (membershipKey) {
      // Fixed allowance covers both finite consumer labels and the bounded ordinal/request key.
      const bytes = 512 + 2 * membershipKey.length;
      if (!membership && rawMemberships.size < LIMIT && rawMembershipBytes + bytes <= BYTE_LIMIT) {
        membership = {}; rawMemberships.set(membershipKey, membership); rawMembershipBytes += bytes;
      }
      if (membership) membership[consumerKey] = context.consumer;
      else rawDropped.memberships++;
    }
  }
  /** Admit bounded completion observation without retaining a source key or the enclosing read's private strings. */
  function beginRaw(context, view, family) {
    rawFamilies.attempts++;
    rawFamilies[context?.request != null ? 'attributed' : 'unattributed']++;
    rawFamilies[context?.read && pendingReads.has(context.read) ? 'insideSelectedRead' : 'outsideSelectedRead']++;
    const lineage = context?.request != null ? {request: context.request, consumer: context.consumer} : null;
    const tuple = rawTuple(view, family), atPublication = publication();
    if (!tuple) rawFamilies.unidentified++;
    rawRepeat(tuple, lineage, 'attempted', atPublication); rawAdd(lineage, 'attempted');
    if (rawPending.size >= LIMIT) { rawDropped.pendingVisits++; rawFamilies.completionUntracked++; return null; }
    const visit = {context: lineage, tuple, publication: atPublication}; rawPending.add(visit);
    return visit;
  }
  /** Ready family completion is diagnostic only; rejected, thrown and non-ready visits grant no ready-repeat credit. */
  function finishRaw(visit, outcome) {
    if (!rawPending.delete(visit)) return;
    rawFamilies[outcome]++; rawAdd(visit.context, outcome);
    const observedPublication = publication();
    if (observedPublication === null || visit.publication === null) rawFamilies.publicationUnknown++;
    else if (observedPublication !== visit.publication) rawFamilies.publicationChangedDuringVisit++;
    if (outcome === 'ready') rawRepeat(visit.tuple, visit.context, 'ready', observedPublication);
  }
  /** Promote only a whole ready selected read; earlier successful family callbacks grant no credit. */
  function authenticate(context, keys) {
    coverage.authenticatedReads++;
    add(context, 'authenticatedReads');
    const observedPublication = publication();
    if (observedPublication === null || context?.publication == null) coverage.publicationUnknown++;
    else if (context && observedPublication !== context.publication) coverage.publicationChangedDuringRead++;
    for (const key of keys) {
      coverage.authenticatedFamilies++; add(context, 'authenticatedFamilies');
      let tuple = tuples.get(key);
      if (!tuple) {
        const bytes = 2 * key.length + 96;
        if (tuples.size >= LIMIT || tupleBytes + bytes > BYTE_LIMIT) { dropped.tuples++; continue; }
        tuple = {ordinal: ++nextTuple, publication: observedPublication};
        tuples.set(key, tuple); tupleBytes += bytes; repeats.first++; add(context, 'firstFamilyTuple');
      } else {
        const membership = context ? context.request + ':' + tuple.ordinal : null;
        if (membership && memberships.has(membership)) {
          repeats.sameRequest++;
          const previous = memberships.get(membership);
          repeats[previous === context.consumer ? 'sameRequestSameConsumer' : 'sameRequestOtherConsumer']++;
          add(context, 'sameRequestFamilyRepeat.from.' + previous);
        }
        else if (!context) repeats.membershipUnknown++;
        else if (memberships.size >= LIMIT) { repeats.membershipUnknown++; dropped.memberships++; }
        else if (observedPublication === null || tuple.publication === null) repeats.otherRequestUnknownPublication++;
        else {
          const category = observedPublication === tuple.publication ? 'otherRequestSamePublication' : 'otherRequestChangedPublication';
          repeats[category]++; add(context, category + 'FamilyRepeat');
        }
        tuple.publication = observedPublication;
      }
      if (context) {
        const membership = context.request + ':' + tuple.ordinal;
        if (memberships.has(membership) || memberships.size < LIMIT) memberships.set(membership, context.consumer);
        else dropped.memberships++;
      }
    }
  }
  /** Return bounded aggregate snapshots, with no source, head, manifest, body or exception data. */
  function snapshot() {
    if (finalSnapshot) return finalSnapshot;
    return {running, errors, methods: {...methods}, coverage: {...coverage}, repeats: {...repeats}, dropped: {...dropped},
      rawFamilies: {...rawFamilies, repeats: {attempted: {...rawRepeats.attempted}, ready: {...rawRepeats.ready}}, dropped: {...rawDropped},
        scope: {sources: rawSources.size, tuples: rawTuples.size, memberships: rawMemberships.size, pendingVisits: rawPending.size,
          sourceBytes: rawSourceBytes, tupleBytes: rawTupleBytes, membershipBytes: rawMembershipBytes,
          pendingRecordEstimateBytes: rawPending.size * 128, mapEntryLimit: LIMIT, privateBytesLimitPerMap: BYTE_LIMIT},
        top: [...rawAggregates].sort(/** Rank raw diagnostic counts independently of authenticated aggregates. */ (a, b) => b[1] - a[1]).slice(0, 64)
          .map(/** Export only finite raw-consumer labels and counts, never tuple coordinates. */ ([operation, count]) => ({operation, count})),
        semantics: 'Raw visitFamily attempts and ready/non-ready completions, including inspect/pin grammar validation. Repetition compares exact head/family tuples and request/consumer/publication, separately at admission and ready completion. These are not whole selected-read authentication or reusable authority. Byte figures estimate private strings/containers, not process memory.'},
      scope: {requests: nextRequest, activeContexts: active, peakActiveContexts: peakActive,
        sources: sources.size, tuples: tuples.size, memberships: memberships.size, sourceBytes, tupleBytes,
        pendingReads: pendingReads.size, pendingBytes,
        tupleLimit: LIMIT, privateBytesLimitPerMap: BYTE_LIMIT, aggregateLabels: aggregates.size},
      top: [...aggregates].sort(/** Rank only bounded aggregate counters, never private identities. */ (a, b) => b[1] - a[1]).slice(0, 64)
        .map(/** Export finite operation labels and scalar counts without their observed arguments. */ ([operation, count]) => ({operation, count})),
      semantics: 'Passive diagnostic counts, not CPU or authority. Authenticated tuples require whole readSelected ready. Same-request includes nested consumers; other-request publication compares the preceding authenticated occurrence. Missing contexts and capacity loss are explicit. Repository transactions exclude direct native lease release. No identities or facts are exported.'};
  }
  const probe = {snapshot,
    /** Stop attribution and restore only owned wrappers, independent of product cancellation. */
    stop() {
      running = false;
      for (const entry of originals.splice(0).reverse()) observe(/** Restore only this probe's current replacement, preserving later owners. */ () => {
        if (entry.owner[entry.key] !== entry.replacement) return;
        if (entry.descriptor) Object.defineProperty(entry.owner, entry.key, entry.descriptor);
        else delete entry.owner[entry.key];
      });
      observe(/** Release diagnostic async stores without cancelling their original product operations. */ () => contexts.disable());
      for (const read of pendingReads) read.keys.length = 0;
      pendingReads.clear(); pendingBytes = 0;
      rawFamilies.pendingAtStop = rawPending.size; rawPending.clear();
      finalSnapshot = snapshot();
      sources.clear(); tuples.clear(); memberships.clear(); aggregates.clear();
      rawSources.clear(); rawTuples.clear(); rawMemberships.clear(); rawAggregates.clear();
      return finalSnapshot;
    },
  };
  try {
    contextMethod(index, 'prepareSemanticScope', 'neighborhood', true);
    for (const [key, label] of [['prepareRequestedNeighborhood', 'neighborhood'],
      ['prepareRequestedCandidateDegrees', 'degree'], ['prepareRequestedUrlTitle', 'url-title']]) {
      contextMethod(acquisition, key, label);
    }
    for (const key of ['reconcile', 'reconcileRestartHostInventory', 'reconcileKnownImpacts', 'repairResolutionDirtySources']) {
      contextMethod(acquisition, key, 'inventory.' + key, key === 'reconcile');
    }
    for (const [owner, keys] of [[acquisition, ['captureForReplay']], [repository,
      ['inspect', 'ensureLocalDependencies', 'validateSelections', 'validateLocalDependencies', 'localDependencySelection']]]) {
      for (const key of keys) wrap(owner, key, /** Bind the fixed operation label to its existing implementation. */ original =>
        /** Count under the caller's async lineage and forward all arguments unchanged. */ function (...args) {
        if (running) { called(key); observe(/** Keep attribution failures outside the product invocation. */ () => add(current(), key)); }
        return original.apply(this, args);
      });
    }
    wrap(repository, 'transaction', /** Retain the existing transaction owner; no native transaction is substituted. */ original =>
      /** Count finite store/mode labels while preserving the repository's exact return. */ function (...args) {
      if (running) { called('transaction'); observe(/** Aggregate only bounded store vocabulary and the current consumer. */ () => {
        const stores = Array.isArray(args[1]) ? args[1] : [];
        const label = stores.length <= 16 && stores.every(/** Bound store-label inspection before copying or sorting. */ value => typeof value === 'string' && value.length <= 128)
          ? [...stores].sort().join(',') : 'unknown';
        add(current(), 'transaction.' + (['readonly', 'readwrite'].includes(args[2]) ? args[2] : 'unknown') + '.' + label);
      }); }
      return original.apply(this, args);
    });
    wrap(repository.runtime, 'digest', /** Preserve the existing digest implementation and result identity. */ original =>
      /** Count calls and string lengths without encoding, copying or retaining hash input. */ function (...args) {
      if (running) { called('digest'); observe(/** Charge only scalar hash work to the active consumer context. */ () => {
        const context = current(); add(context, 'digest');
        if (typeof args[0] === 'string') add(context, 'digestUtf16Units', args[0].length);
      }); }
      return original.apply(this, args);
    });
    wrap(repository, 'visitFamily', /** Keep family traversal and authentication owned by the repository. */ original =>
      /** Count raw work independently and stage selected tuples only inside their owning whole read. */ function (...args) {
      let rawVisit = null;
      if (running) { called('visitFamily'); observe(/** Attribute raw attempts; stage authenticated candidates only for an admitted selected read. */ () => {
        const context = current(); add(context, 'visitFamily');
        rawVisit = beginRaw(context, args[0], args[1]);
        if (context?.read && pendingReads.has(context.read)) {
          const key = tupleKey(args[0], args[1]);
          const bytes = key ? 2 * key.length + 32 : 0;
          if (key && context.read.keys.length < 16 && pendingBytes + bytes <= BYTE_LIMIT) {
            context.read.keys.push(key); context.read.bytes += bytes; pendingBytes += bytes;
          }
          else if (key) dropped.tuples++;
        }
      }); }
      let result;
      try { result = original.apply(this, args); }
      catch (error) {
        if (running && rawVisit) observe(/** A synchronous throw is visible without replacing the original exception. */ () => finishRaw(rawVisit, 'thrown'));
        throw error;
      }
      if (rawVisit) settled(result, /** Observe raw completion separately; no selected-read credit is created here. */ (success, value) => {
        finishRaw(rawVisit, !success ? 'rejected' : value === 'ready' ? 'ready' : 'notReady');
      });
      return result;
    });
    wrap(repository, 'readSelected', /** Preserve the selected-reader implementation and its returned promise. */ original =>
      /** Scope provisional tuple identities to this read and credit only its whole ready outcome. */ function (...args) {
      if (!running) return original.apply(this, args);
      called('readSelected');
      const parent = current(), read = {keys: [], bytes: 0};
      if (parent?.read) coverage.ambiguous++;
      if (pendingReads.size < LIMIT) pendingReads.add(read); else dropped.pendingReads++;
      const context = parent ? {...parent, read} : {consumer: 'unattributed', request: null, publication: null, read};
      observe(/** Record invocation separately from eventual successful authentication. */ () => add(parent, 'readSelected'));
      /** Release private tuple strings after success, failure, synchronous throw or explicit stop. */
      const release = () => { pendingReads.delete(read); pendingBytes -= read.bytes; read.bytes = 0; read.keys.length = 0; };
      let result;
      try { result = contexts.run(context, /** Propagate the provisional read scope without wrapping its consumer callback. */ () => original.apply(this, args)); }
      catch (error) { release(); throw error; }
      settled(result, /** Failed or superseded reads release identities without authentication credit. */ (success, value) => {
        try { if (success && value?.outcome === 'ready') authenticate(parent?.request == null ? null : parent, read.keys); }
        finally { release(); }
      });
      return result;
    });
    return probe;
  } catch (error) { probe.stop(); throw error; }
}
