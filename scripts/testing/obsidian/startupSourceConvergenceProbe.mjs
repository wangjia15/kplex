/**
 * Diagnostic-only PR206 forwarding observer for the existing native startup/source owners.
 * It reads fixed scalar state, never source contents or identities, and starts no product work.
 * Promise identity, return values, scheduling policy and validity decisions remain unchanged.
 * The serial study controller owns installation and independent restoration; timing runs omit it.
 */
export function createStartupSourceConvergenceProbe(app, plugin) {
  const index = plugin.index, source = index.sourceAcquisition, repo = source.repository;
  const restores = [], counts = {}, events = [], active = new Map(), ownerEvents = [], owners = new WeakMap();
  const started = performance.now();
  let closed = false, droppedEvents = 0, activationOverflow = 0, adoption = 0, nextAdoption = 0, sampledOwners = 0, droppedOwnerEvents = 0;
  /** Increment only caller-supplied finite categories, never a source/path-derived key. */
  function count(key) { counts[key] = (counts[key] ?? 0) + 1; }
  /** Retain bounded scalar transitions; excess detail is explicitly unavailable. */
  function event(kind, details = {}) {
    if (events.length < 256) events.push({ elapsedMs: performance.now() - started, kind, ...details });
    else droppedEvents++;
  }
  /** Read existing readiness owners without acquiring, flushing or enumerating sources. */
  function state() {
    return { authority: source.hasSemanticDependencies(), inventory: !!source.inventory,
      maintenance: source.getMaintenanceRevision(), host: source.hostRevision,
      inventoryRevision: source.inventoryRevision, unsaved: repo.unsaved.size,
      pendingKnown: source.pendingKnownFiles.size, semantic: index.hasPendingSemanticPreparation(),
      initial: plugin.initialIndexComplete, incomplete: plugin.initialSourceIndexIncomplete,
      generation: index.generation, hydrationRun: index.snapshotHydrationRun };
  }
  /** Sample at most eight weak native identities and 128 scalar transitions, without paths or content. */
  function ownerEvent(file, kind, details = {}) {
    if (!file || typeof file !== 'object' || file.extension !== 'md') return;
    let id = owners.get(file);
    if (!id) { if (sampledOwners >= 8) return; id = ++sampledOwners; owners.set(file, id); }
    if (ownerEvents.length >= 128) { droppedOwnerEvents++; return; }
    const observation = source.states.get(file);
    ownerEvents.push({ elapsedMs: performance.now() - started, id, kind, revision: observation?.revision ?? null,
      dirty: !!observation?.dirty, bodyDirty: !!observation?.bodyDirty, created: !!observation?.created,
      resolutionDirty: !!observation?.resolutionDirty, inventory: !!source.inventory,
      capturedCoordinates: !!source.sourceCoordinates?.has(file.path), ...details });
  }
  /** Restore own/inherited method shape exactly, preserving the original result/promise identity. */
  function wrap(owner, key, observe) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, key), original = owner[key];
    if (typeof original !== 'function') throw Error('Missing convergence observation seam');
    /** Forward before attaching passive result observers; never await or replace product promises. */
    const replacement = function(...args) { return observe.call(this, original, args); };
    owner[key] = replacement;
    restores.push(/** Remove only our wrapper; competing ownership is an explicit cleanup failure. */ () => {
      if (owner[key] !== replacement) throw Error('Convergence wrapper ownership changed');
      if (descriptor) Object.defineProperty(owner, key, descriptor); else delete owner[key];
    });
  }
  /** Observe success/failure without creating an unhandled rejection or changing the returned promise. */
  function observe(result, finish, failed) {
    if (result && typeof result.then === 'function') result.then(
      /** Product rejection remains owned by its original caller. */ value => { if (!closed) finish(value); },
      /** Keep rejected observation separate from boolean incompleteness. */ () => { if (!closed) { count('observer.rejected'); failed?.(); } });
    else if (!closed) finish(result);
    return result;
  }
  try {
    wrap(index, 'adoptStartupSources', /** Identify the interval and actual failed precondition evidence. */ function(original, args) {
      const id = ++nextAdoption; adoption = id; count('adoption.attempt'); event('adoption.begin', { id, ...state() });
      return observe(original.apply(this, args), /** Record final readiness without inferring CPU savings. */ value => {
        count(value ? 'adoption.true' : 'adoption.false'); event('adoption.end', { id, value, ...state() });
        if (adoption === id) adoption = 0;
      }, /** A rejected adoption cannot leak its diagnostic interval into unrelated work. */ () => { if (adoption === id) adoption = 0; });
    });
    wrap(source, 'flush', /** Correlate real flush results with an outstanding adoption interval. */ function(original, args) {
      const id = adoption;
      return observe(original.apply(this, args), /** No flush is invoked by this observer. */ value => {
        count(value ? 'flush.true' : 'flush.false');
        if (id) event('adoption.flush', { id, value, ...state() });
      });
    });
    wrap(source, 'reconcile', /** Record actual admissions separately from joins. */ function(original, args) {
      const joined = !!this.inventory; count(joined ? 'inventory.join' : 'inventory.admit');
      if (!joined) event('inventory.begin', state());
      return observe(original.apply(this, args), /** Result observers execute after the public owner settles. */ value => {
        count(value ? 'inventory.true' : 'inventory.false');
        if (!joined) event('inventory.end', { value, ...state() });
      });
    });
    wrap(source, 'inventoryReady', /** Observe the precise production recovery signal and its owner ordering. */ function(original, args) {
      count('inventory.ready'); event('inventory.ready', state()); return original.apply(this, args);
    });
    wrap(source, 'acquire', /** Classify acquisition admission from existing weakly held source flags. */ function(original, args) {
      const observation = this.states.get(args[0]); count('acquire.total');
      for (const key of ['dirty', 'bodyDirty', 'created', 'resolutionDirty']) if (observation?.[key]) count('acquire.' + key);
      ownerEvent(args[0], 'acquire.begin');
      return observe(original.apply(this, args), /** Sample flags only after the actual acquisition result settles. */ value => {
        ownerEvent(args[0], 'acquire.end', { current: !!value?.current, saved: !!value?.saved });
      });
    });
    wrap(source, 'markContributorHostChange', /** Count validity changes and whether they interrupt active inventory. */ function(original, args) {
      const kind = ['source', 'topology', 'resolution', 'environment'].includes(args[0]) ? args[0] : 'other';
      count('host.' + kind); if (this.inventory) count('host.active.' + kind);
      return original.apply(this, args);
    });
    wrap(repo, 'activate', /** Track bounded in-flight ordinary activation; retain no completed owner history. */ function(original, args) {
      const sourceId = args[1].sourceId, alias = !!args[6], entry = { cleanup: false, repair: false, alias };
      const tracked = active.size < 32 && !active.has(sourceId);
      if (tracked) active.set(sourceId, entry); else activationOverflow++;
      count(alias ? 'activation.alias' : 'activation.ordinary');
      return observe(original.apply(this, args), /** Reclaim versus selected repair exposes the actual #204 branch, not digest eligibility. */ value => {
        if (tracked && active.get(sourceId) === entry) active.delete(sourceId);
        if (!tracked || alias || value?.outcome !== 'activated') return;
        if (entry.cleanup && !entry.repair) count('countReuse.realized');
        else if (entry.repair && !entry.cleanup) count('countReuse.selectedRepair');
        else count('countReuse.unclassified');
      }, /** A rejected activation cannot retain a diagnostic owner. */ () => {
        if (tracked && active.get(sourceId) === entry) active.delete(sourceId);
      });
    });
    for (const [key, flag] of [['cleanupStagedLocalDependencies', 'cleanup'], ['repairLocalDependencies', 'repair']]) {
      wrap(repo, key, /** Observe the branch already chosen by activation, without extra proof reads. */ function(original, args) {
        const entry = active.get(args[1]); if (entry) entry[flag] = true;
        return original.apply(this, args);
      });
    }
    for (const [owner, name, label] of [[app.vault, 'create', 'create'], [app.vault, 'modify', 'modify'],
      [app.vault, 'rename', 'rename'], [app.vault, 'delete', 'delete'],
      [app.metadataCache, 'changed', 'metadata'], [app.metadataCache, 'resolve', 'resolve'], [app.metadataCache, 'resolved', 'resolved']]) {
      const ref = owner.on(name, /** Count native notifications separately from source validity revisions. */ file => {
        if (!closed) { count('native.' + label); if (source.inventory) count('native.active.' + label); ownerEvent(file, 'native.' + label); }
      });
      restores.push(/** Release this diagnostic listener independently of plugin listeners. */ () => owner.offref(ref));
    }
  } catch (error) {
    for (const restore of restores.reverse()) { try { restore(); } catch { /* Preserve the installation failure. */ } }
    throw error;
  }
  return {
    /** Export bounded aggregate evidence, never owner keys or private note coordinates. */
    snapshot() { return { counts: { ...counts }, events: events.slice(), droppedEvents, ownerEvents: ownerEvents.slice(),
      sampledOwners, droppedOwnerEvents, activationOverflow, active: active.size }; },
    /** Retire observers even if one independent resource cannot be restored. */
    stop() {
      if (closed) return;
      closed = true; const errors = [];
      for (const restore of restores.reverse()) { try { restore(); } catch (error) { errors.push(String(error)); } }
      active.clear();
      if (errors.length) throw Error(errors.join('; '));
    },
  };
}
