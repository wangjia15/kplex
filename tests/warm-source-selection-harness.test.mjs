/** Test the warm measurement's completion/oracle gates independently of Chromium storage timing. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { installWarmSourceSelectionFixture } from './support/warmSourceSelectionFixture.mjs';

/** Install only the finite controller doubles; real storage behavior belongs to the browser suites. */
function fixture() {
  const work = { writes: [] };
  const acquisition = {
    restartInventoryChecked: false, pendingKnownFiles: new Set(), pendingKnownImpacts: new Set(),
    knownImpactTasks: 0, knownFanoutTasks: new Set(), pendingResolutionKeys: new Set(), uncertainResolution: false,
    /** Model completed reconciliation without emulating storage. */async reconcile() { return true; }, /** Model the final dependency readiness gate. */hasSemanticDependencies() { return true; },
    /** Supply bounded diagnostic output. */getCounters() { return {}; }, /** Report no live fixture activity. */getActivityState() { return {}; },
  };
  const context = { fixture: { acquisition, repository: { /** Model durable completion independently from reconciliation. */async flush() { return true; } },
    reads: [], parses: [], work: { /** Return the exact work state checked by the controller. */snapshot() { return work; } } } };
  const originalWindow = globalThis.window;
  globalThis.window = { cachedSourceRead: { /** Preserve the separate host-only control. */async inventory() { return 'host'; } },
    sourceEventWork: { /** Fail through the same independent-oracle seam as real comparisons. */async semanticOracle(value) { assert.equal(value, context); throw Error('Independent oracle mismatch'); } } };
  installWarmSourceSelectionFixture();
  const api = globalThis.window.warmSourceSelection;
  return { context, acquisition, api, work,
    /** Restore the original process global even after assertion failure. */restore() { if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; } };
}

test('complete warm measurement requires actual reconciliation, durable closure and dependency readiness', /** Incomplete joins must never produce a successful timing receipt. */async () => {
  const f = fixture();
  try {
    assert.equal((await f.api.run(f.context, 'complete')).completed, true);
    for (const [object, key] of [[f.acquisition, 'reconcile'], [f.context.fixture.repository, 'flush'], [f.acquisition, 'hasSemanticDependencies']]) {
      const original = object[key];
      try { object[key] = /** Reject exactly one required completion gate. */() => false; await assert.rejects(f.api.run(f.context, 'complete')); }
      finally { object[key] = original; }
    }
  } finally { f.restore(); }
});

test('a warm timing receipt rejects source work or deferred resolution debt', /** Detect moving actual application work beyond the measured window. */async () => {
  const f = fixture();
  try {
    for (const rows of [f.context.fixture.reads, f.context.fixture.parses, f.work.writes]) {
      rows.push('unexpected');
      try { await assert.rejects(f.api.run(f.context, 'complete')); } finally { rows.pop(); }
    }
    for (const rows of [f.acquisition.pendingKnownFiles, f.acquisition.pendingKnownImpacts,
      f.acquisition.knownFanoutTasks, f.acquisition.pendingResolutionKeys]) {
      rows.add('pending');
      try { await assert.rejects(f.api.run(f.context, 'complete')); } finally { rows.clear(); }
    }
    for (const key of ['knownImpactTasks', 'uncertainResolution']) {
      const original = f.acquisition[key]; f.acquisition[key] = true;
      try { await assert.rejects(f.api.run(f.context, 'complete')); } finally { f.acquisition[key] = original; }
    }
  } finally { f.restore(); }
});

test('the independent semantic oracle failure is propagated, never converted into a successful receipt', /** A semantic failure remains a failed experiment. */async () => {
  const f = fixture();
  try { await assert.rejects(f.api.semantics(f.context), /Independent oracle mismatch/); }
  finally { f.restore(); }
});
