/**
 * Read-only PR205/212 demonstration of the actual production durable-host-inventory caller in an
 * exact-build, guarded disposable vault. Native operation totals are diagnostic, not CPU shares.
 * The shared controlled-probe owner verifies artifact/source identity and configuration cleanup.
 */
import { runControlledProbe } from './controlledProbe.mjs';

/** Consume existing small cached sources without creating notes or changing production state. */
async function scenario(app, controller) {
  const index = app.plugins.plugins['k-plex']?.index, acquisition = index?.sourceAcquisition;
  const repository = acquisition?.repository;
  /** Reject an unsafe/incomplete fixture rather than silently changing the measured workload. */
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  assert(repository && index, 'Loaded production source repository');
  assert(app.plugins.plugins['k-plex'].getIndexStatus().upToDate, 'Index ready before diagnostic');
  const originals = [], selected = [], ownedLeases = new Set(), totals = { transactions: {}, requests: {}, leaseAdds: 0, leaseDeletes: 0, hashes: 0 };
  /** Test instrumentation owns exact receiver method identities and never rebinds originals. */
  const patch = (object, key, replacement) => { const original = object[key]; object[key] = replacement(original); originals.push({ object, key, original }); };
  /** Use a finite closed namespace of existing native operation kinds. */
  const count = (map, key) => { map[key] = (map[key] ?? 0) + 1; };
  /** Cancellation retires only this read request, never the production index. */
  const current = () => !controller.closed;
  const db = await repository.open();
  assert(db, 'Open durable cache');
  /** Read only selected derivative coordinates; this diagnostic confers no source authority. */
  const ownerFor = sourceId => new Promise(/** Await native terminal completion before exposing derivative coordinates. */(resolve, reject) => {
    const tx = db.transaction(['sourceLocalDependencyOwners'], 'readonly');
    const request = tx.objectStore('sourceLocalDependencyOwners').get(sourceId);
    tx.oncomplete = /** Expose only a committed diagnostic owner. */() => resolve(request.result);
    tx.onabort = tx.onerror = /** Preserve the failed native transaction. */() => reject(tx.error);
  });
  for (const file of app.vault.getMarkdownFiles()) {
    const cache = app.metadataCache.getFileCache(file), inspection = await repository.inspect(file.path, [], current);
    const head = inspection.head, metadata = head?.families.metadata;
    if (cache && inspection.saved && inspection.reason === 'ready' && head.sequence > 0 && head.bodyParserVersion !== 2 && metadata?.chunks === 1 && metadata.records <= 16 && metadata.bytes <= 8192)
      selected.push({ file, cache, head, owner: controller.selection ? await ownerFor(file.path) : null,
        expected: acquisition.currentHostInventory(file, cache) });
    if (selected.length === 16) break;
  }
  assert(selected.length === 16, 'Sixteen existing bounded cached metadata sources');
  try {
    patch(IDBDatabase.prototype, 'transaction', /** Include the direct original-connection lease release. */original => /** Preserve native transaction ownership. */function(...args) {
      const transaction = original.apply(this, args);
      count(totals.transactions, transaction.mode + '|' + [...transaction.objectStoreNames].sort().join(','));
      return transaction;
    });
    for (const key of ['get', 'getAll', 'add', 'put', 'delete']) patch(IDBObjectStore.prototype, key,
      /** Count source requests without retaining keys or note contents. */original => /** Forward exact native requests. */function(...args) {
        count(totals.requests, this.name + '|' + key);
        if (this.name === 'meta' && key === 'add' && args[0]?.key?.startsWith('source-lease:')) {
          totals.leaseAdds++;
          if (this.transaction.db === db) ownedLeases.add(args[0].key);
          assert(ownedLeases.size <= 256, 'Bound diagnostic lease-key retention');
        }
        if (this.name === 'meta' && key === 'delete' && args[0]?.startsWith?.('source-lease:')) totals.leaseDeletes++;
        return original.apply(this, args);
      });
    patch(repository.runtime, 'digest', /** Keep every cryptographic authentication call. */original => /** Retain normal runtime digest implementation. */function(...args) { totals.hashes++; return original.apply(this, args); });
    for (const item of selected) {
      const capture = acquisition.capture(item.file);
      /** Retain the exact native incarnation/stat, cache identity and controller lifetime. */
      const ownerCurrent = () => current() && acquisition.current(capture, current)
        && app.metadataCache.getFileCache(item.file) === item.cache;
      let expected;
      if (controller.selection) {
        assert(item.owner?.state === 'complete', 'Existing complete local dependency owner');
        const selection = await repository.inspectWithLocalDependencies(item.file.path,
          item.owner.order, item.owner.markdownOrder, ownerCurrent);
        assert(selection.dependencyReason === 'ready' && selection.inspection.saved, 'Shared saved selection ready');
        assert(JSON.stringify(selection.inspection.head) === JSON.stringify(item.head), 'Exact original selected head');
        expected = selection.inspection.expected;
      }
      const result = await acquisition.durableHostInventory(item.file.path, ownerCurrent, expected);
      assert(ownerCurrent(), 'Native identity/cache remains current after protected read');
      assert(result.reason === 'ready', 'Actual durable host inventory ready');
      assert(JSON.stringify(result.facts) === JSON.stringify(item.expected), 'Exact current host inventory facts');
      if (controller.failAfterFirst) throw Error('Deliberate cached-read cleanup validation');
    }
  } finally {
    for (const item of originals.reverse()) item.object[item.key] = item.original;
    assert(originals.every(/** All diagnostic wrappers must be restored exactly. */item => item.object[item.key] === item.original), 'Wrapper cleanup');
    assert(repository.readers.size === 0 && repository.decodeBytes === 0, 'Reader and decode closure, including failure');
    const remaining = await repository.transaction(db, ['meta'], 'readonly', selected[0].head.sourceId,
      /** Reuse the existing bounded transaction owner; only terminal completion certifies absence. */async transaction => {
        const store = transaction.objectStore('meta');
        const rows = await Promise.all([...ownedLeases].map(/** Queue only this interval's bounded exact lease keys. */key =>
          new Promise(/** Request handlers retain no note contents and grant no authority before commit. */(resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = /** Forward the exact persisted value. */() => resolve(request.result);
            request.onerror = /** Reject failed reads rather than certifying absence. */() => reject(request.error);
          })));
        return rows.filter(/** Count only persisted protection, never attempted deletion. */row => row !== undefined).length;
      });
    assert(remaining === 0, 'All observed target leases retired');
    controller.progress = { wrappersRestored: true, readers: repository.readers.size, decodeBytes: repository.decodeBytes, durableLeasesRemaining: remaining };
  }
  for (const item of selected) {
    const after = await repository.inspect(item.file.path, [], current);
    assert(JSON.stringify(after.head) === JSON.stringify(item.head), 'Cached read never rewrites source');
  }
  assert(repository.readers.size === 0 && repository.decodeBytes === 0, 'Reader and decode closure');
  const remote = require('@electron/remote'), win = remote.getCurrentWindow();
  return { owners: selected.length, selection: controller.selection, totals, readers: repository.readers.size, decodeBytes: repository.decodeBytes,
    durableLeasesRemaining: controller.progress.durableLeasesRemaining,
    host: { electron: process.versions.electron, chrome: process.versions.chrome, rendererPid: process.pid,
      nativeWindow: win.id, hidden: document.hidden, focused: document.hasFocus(),
      backgroundThrottling: win.webContents.getBackgroundThrottling?.(), battery: remote.powerMonitor.isOnBatteryPower?.() ?? null },
    limitations: 'Process-wide native interval counts can include incidental activity; normal scheduling, no exclusive caller CPU or production-vault performance claim.' };
}

await runControlledProbe('cached-source-reads', scenario,
  `c.failAfterFirst=${process.env.KPLEX_CACHED_READ_FAIL_AFTER_FIRST === '1'};c.selection=${process.env.KPLEX_CACHED_READ_SELECTION === '1'};`,
  ['src/index/SourceRepository.ts', 'src/adapters/obsidian/sourceAcquisition.ts']);
