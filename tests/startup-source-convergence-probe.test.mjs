/** PR206 diagnostic observer contracts; synthetic owners establish instrumentation, not product performance. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {createStartupSourceConvergenceProbe} from '../scripts/testing/obsidian/startupSourceConvergenceProbe.mjs';

/** Supply finite event owners and production-shaped scalar boundaries without storage or native I/O. */
function fixture() {
  const listeners = new Set();
  const events = {
    /** Retain the diagnostic subscription for independent cleanup assertions. */
    on(name, callback) { const ref = { name, callback }; listeners.add(ref); return ref; },
    /** Release only the selected observer. */
    offref(ref) { listeners.delete(ref); },
  };
  const repo = { unsaved: new Set(),
    /** Follow the branch selected by the fixture, never imply a real reuse proof. */
    async activate(_db, head, _expected, _current, _ticket, local) {
      if (local.reject) throw Error('Owned rejection');
      if (local.reuse) await this.cleanupStagedLocalDependencies(null, head.sourceId);
      else await this.repairLocalDependencies(null, head.sourceId);
      return { outcome: 'activated' };
    },
    /** Return an existing private-reclaim outcome. */
    async cleanupStagedLocalDependencies() { return 'ready'; },
    /** Return an existing selected-repair outcome. */
    async repairLocalDependencies() { return 'ready'; },
  };
  const source = { repository: repo, states: new WeakMap(), pendingKnownFiles: new Set(), inventory: null,
    /** Return the fixture's current authority. */ hasSemanticDependencies() { return true; },
    /** Supply a finite revision without advancing it. */ getMaintenanceRevision() { return 1; },
    /** Preserve the original flush promise. */ flush() { return Promise.resolve(true); },
    /** Preserve the existing reconciliation promise. */ reconcile() { return Promise.resolve(true); },
    /** Expose the actual notification seam. */ inventoryReady() {},
    /** Supply one ordinary acquisition result. */ acquire() { return Promise.resolve({ current: true, saved: true }); },
    /** Observe host changes without adding real work. */ markContributorHostChange() {},
  };
  const index = { sourceAcquisition: source,
    /** Keep semantic readiness independent of source observation. */ hasPendingSemanticPreparation() { return false; },
    /** Supply one completed adoption result. */ adoptStartupSources() { return Promise.resolve(true); },
  };
  return { app: { vault: events, metadataCache: events }, plugin: { index }, source, repo, listeners };
}

test('observer preserves promise identity, counts actual branch selection, and exports no owner keys', /** Forward synthetic owners and verify independent teardown. */ async () => {
  const f = fixture(), original = f.source.flush, originalReady = f.source.inventoryReady;
  const promise = Promise.resolve(true); f.source.flush = /** Keep one externally identifiable result. */ () => promise;
  const probe = createStartupSourceConvergenceProbe(f.app, f.plugin);
  assert.equal(f.source.flush(), promise);
  await f.repo.activate(null, { sourceId: 'private-owner-a' }, null, null, null, { reuse: true });
  await f.repo.activate(null, { sourceId: 'private-owner-b' }, null, null, null, { reuse: false });
  await assert.rejects(f.repo.activate(null, { sourceId: 'private-owner-c' }, null, null, null, { reject: true }));
  await Promise.resolve();
  const result = probe.snapshot();
  assert.equal(result.counts['countReuse.realized'], 1);
  assert.equal(result.counts['countReuse.selectedRepair'], 1);
  assert.equal(result.active, 0);
  assert(!JSON.stringify(result).includes('private-owner'));
  assert.equal(f.listeners.size, 7);
  probe.stop(); probe.stop();
  assert.equal(f.listeners.size, 0);
  assert.equal(f.source.inventoryReady, originalReady);
  assert.equal(f.source.flush(), promise);
  f.source.flush = original;
});

test('event detail is bounded and partial installation restores earlier wrappers', /** Exercise capacity and failed capability paths without production activity. */ () => {
  const f = fixture(), probe = createStartupSourceConvergenceProbe(f.app, f.plugin);
  for (let n = 0; n < 300; n++) f.source.inventoryReady();
  assert.equal(probe.snapshot().events.length, 256);
  assert.equal(probe.snapshot().droppedEvents, 44);
  assert.equal(probe.snapshot().counts['inventory.ready'], 300);
  probe.stop();
  const original = f.plugin.index.adoptStartupSources;
  delete f.repo.activate;
  assert.throws(() => createStartupSourceConvergenceProbe(f.app, f.plugin), /Missing convergence/);
  assert.equal(f.plugin.index.adoptStartupSources, original);
  assert.equal(f.listeners.size, 0);
});

test('owner trajectories cap weak identities and detail without exporting private paths', /** Retain only anonymous ordinals and fixed source flags. */ async () => {
  const f = fixture(), probe = createStartupSourceConvergenceProbe(f.app, f.plugin);
  const files = Array.from({ length: 10 }, /** Supply distinct native-shaped identities. */ (_, n) => ({ path: 'private-note-' + n, extension: 'md' }));
  for (let n = 0; n < 200; n++) await f.source.acquire(files[n % files.length]);
  const result = probe.snapshot();
  assert.equal(result.sampledOwners, 8);
  assert.equal(result.ownerEvents.length, 128);
  assert(result.droppedOwnerEvents > 0);
  assert(!JSON.stringify(result).includes('private-note'));
  assert(result.ownerEvents.every(/** Anonymous identities remain within the documented bound. */ item => item.id >= 1 && item.id <= 8));
  probe.stop();
});
