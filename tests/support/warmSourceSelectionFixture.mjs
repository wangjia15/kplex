/**
 * PR212 finite warm-restart workload around the existing cached-read fixture. Production acquisition,
 * source storage and semantic compilers retain their authority. This layer joins the complete pass,
 * compares independent fresh-host semantics outside timing, and owns no alternate storage policy.
 */
export function installWarmSourceSelectionFixture() {
  const B = window.cachedSourceRead;
  /** Reject incomplete joins rather than equating a returned promise with source readiness. */
  const check = (value, message) => { if (!value) throw new Error(message); };
  /** Exercise either the exact host comparison or its full production reconciliation owner. */
  async function run(context, operation) {
    if (operation === 'host') return B.inventory(context);
    const f = context.fixture, a = f.acquisition;
    check(!a.restartInventoryChecked, 'Each measured pass starts before restart validation');
    check(await a.reconcile(), 'Complete unchanged source reconciliation succeeds');
    check(await f.repository.flush(), 'All original durable source work closes');
    check(a.hasSemanticDependencies(), 'Actual dependency projection grants final readiness');
    const work = f.work.snapshot();
    check(!f.reads.length && !f.parses.length && !work.writes.length, 'Warm pass reads/parses/replaces no source');
    check(!a.pendingKnownFiles.size && !a.pendingKnownImpacts.size && !a.knownImpactTasks
      && !a.knownFanoutTasks.size && !a.pendingResolutionKeys.size && !a.uncertainResolution,
    'No deferred owner/referrer work is shifted past measurement');
    return { completed: true, counters: a.getCounters(), work, activity: a.getActivityState() };
  }
  /** A matched quiet tail observes only existing work; its delay never changes runtime scheduling. */
  async function quiet(context) {
    const before = context.fixture.work.snapshot();
    await new Promise(/** Observe finite late work without introducing a production deadline. */resolve => setTimeout(resolve, 250));
    check(JSON.stringify(before) === JSON.stringify(context.fixture.work.snapshot()), 'No shifted source work during quiet tail');
    return B.oracle(context);
  }
  /** Reuse the accepted independent compiler/replay oracle, including every provenance occurrence. */
  async function semantics(context) { return window.sourceEventWork.semanticOracle(context); }
  /** Retain genuinely shared immutable revisions without inventing facts absent from the live host. */
  async function prepareControl(context, control) {
    if (control !== 'shared') return B.prepareControl(context, control);
    const r = context.repository, id = B.path(0), selected = await r.inspect(id, []), records = [];
    check(await r.visit(id, 'resolution', /** Capture authenticated existing facts outside measurement. */rows => { records.push(...rows); return true; }) === 'ready', 'Current resolution family readable');
    const changed = await r.replace({ sourceId: id, expected: selected.expected, physical: selected.head.physical,
      observation: selected.head.observation, bodyParserVersion: selected.head.bodyParserVersion,
      families: { ...selected.head.families, resolution: /** Restage identical facts while retaining the other immutable revisions. */async emit => {
        for (const record of records) if (!(await emit(record))) return false;
        return true;
      } } });
    check(changed.outcome === 'activated', 'Shared-revision control activates normally');
    const after = await r.inspect(id, []);
    check(new Set(Object.values(after.head.families).map(/** Distinct immutable family identities require independent protection. */family => family.revision)).size > 1, 'Actually shared family revisions');
    check(await r.completeLocalDependencyInventory() === 'ready', 'Shared setup closes count work');
  }
  window.warmSourceSelection = { run, quiet, semantics, prepareControl };
  return true;
}
