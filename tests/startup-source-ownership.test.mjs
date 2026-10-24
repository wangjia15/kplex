/**
 * Automatic rebuild ownership while source-backed startup is still adopting. Production interval,
 * rebuild and backlog methods are extracted intact; host effects/builders are counted capabilities.
 * This event-order regression is not a storage, native-interaction or CPU measurement.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {startupSourceCoordinatorSource} from './support/startupSourceCoordinator.mjs';

const require = createRequire(import.meta.url), ts = require('typescript');
const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const module = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true);
const plugin = module.statements.find(/** Select the real plugin lifecycle owner. */ node => ts.isClassDeclaration(node) && node.name?.text === 'KplexPlugin');
const names = new Set(['performRebuild', 'rebuildIndex', 'pruneMissingDirtyMarkdownPaths']);
const methods = plugin.members.filter(/** Copy complete production implementations, not alternate fixture algorithms. */ member => names.has(member.name?.getText(module)));
assert.equal(methods.length, names.size);
const onload = plugin.members.find(/** Locate the original timer registration. */ member => member.name?.getText(module) === 'onload');
const interval = onload.body.statements.find(/** Preserve the exact interval policy and callback. */ statement => ts.isIfStatement(statement)
  && statement.expression.getText(module) === 'this.settings.indexUpdateInterval > 0');
assert(interval, 'Actual legacy interval registration exists');
const base = startupSourceCoordinatorSource().replace("import {Platform,TFile,TFolder} from 'obsidian';", '')
  .replace('export class StartupSourceCoordinator', 'class StartupSourceCoordinator');
const position = base.lastIndexOf('}');
const body = base.slice(0, position) + methods.map(/** Retain production method bodies unchanged. */ member => member.getText(module)).join('\n')
  + '\n/** Test-owned wrapper installs the actual onload timer statement. */\ninstallInitialRebuildInterval(){' + interval.getText(module) + '}\n}';
const js = ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const load = new Function('Platform', 'TFile', 'TFolder', 'Notice', 'window', js + '\nreturn StartupSourceCoordinator;');

/** Native notice presentation is outside this coordinator ownership fixture. */
class Notice { /** Accept the real command's notification without emulating UI. */ constructor() {} }

/** Supply a held initial adopter and finite graph effects to the actual legacy interval callback. */
function fixture({ reasons = ['startup:stale-snapshot'], dirty = [], sourceBacked = true, complete = false, onDemand = false } = {}) {
  let callback, period, pending, release;
  const timers = { /** Capture registration without changing its requested production interval. */ setInterval(work, delay) { callback = work; period = delay; return 1; } };
  const Coordinator = load({ isIosApp: false }, class {}, class {}, Notice, timers), p = new Coordinator();
  const counts = { full: 0, local: 0 }, initial = new Promise(/** Hold source adoption independently of automatic graph rebuild. */ done => { release = done; });
  p.app = { vault: { /** Retain the genuine named dirty source. */ getFileByPath: path => path === 'A.md' ? { path, extension: 'md' } : null } };
  p.settings = { indexUpdateInterval: 120000 }; p.layoutReady = true; p.indexPreparationAdmitted = true;
  p.initialIndexComplete = complete; p.initialIndexTask = initial; p.indexDirty = true; p.rebuildTimer = 1;
  p.indexBacklogReasons = new Set(reasons); p.dirtyMarkdownPaths = new Set(dirty);
  p.hasVisibleKplexSurface = /** The real interval only flushes a visible dirty surface. */ () => true;
  p.notifyIndexStatus = /** Observe ownership independently of status UI. */ () => {};
  p.registerInterval = /** This test retains no real timer. */ () => {};
  p.translator = /** Notification copy is unchanged and belongs to native checks. */ key => key;
  p.refreshBookmarkedEntryPoints = /** Preserve the local refresh branch's optional presentation completion. */ async () => {};
  p.startupGraphSeedPaths = /** No path discovery is required to observe builder admission. */ () => [];
  p.index = {
    size: 1,
    /** No structural operation owns this controlled interval. */ hasPendingStructuralMaintenance: () => false,
    /** The cache hydration owner has settled; source adoption is still held. */ hasPendingSnapshotHydration: () => false,
    /** Only source-backed initial work has the distinct ownership contract. */ hasSourceBackedStartup: () => sourceBacked,
    /** Keep mode-specific refresh separate from eager adoption. */ isOnDemandMode: () => onDemand,
    /** The coherent physical baseline remains navigable. */ hasPhysicalBaseline: () => true,
    /** This test observes ordinary full-builder admission, not progressive compilation. */ isFullSnapshotHydrated: () => true,
    /** Count the actual builder boundary without simulating source/cache algorithms. */ rebuild: async () => { counts.full++; return false; },
    /** Preserve the on-demand branch's own local refresh. */ refreshOnDemandGraph: async () => { counts.local++; return false; },
    /** Decision formatting is outside this admission test. */ noteBuildDecision() {},
  };
  const rebuild = p.rebuildIndex;
  p.rebuildIndex = /** Preserve the real coordinator promise for the callback's void invocation. */ function(...args) { pending = rebuild.apply(this, args); return pending; };
  p.installInitialRebuildInterval();
  assert.equal(period, 120000, 'The production interval is unchanged');
  return { p, counts, initial,
    /** Fire the exact registered callback without advancing a watchdog or awaiting the held adopter. */
    async interval() { callback(); await pending; },
    /** Release the independent startup prerequisite after assertions. */
    close() { release(); },
  };
}

for (const reason of ['startup:stale-snapshot', 'startup:no-snapshot', 'startup:partial-restore-incomplete']) {
  test(`automatic ${reason} cannot compete with initial source adoption`, /** Keep startup reasons owned without clearing or falsely completing them. */ async () => {
    const f = fixture({ reasons: [reason] });
    try {
      await f.interval();
      assert.equal(f.counts.full, 0, 'An automatic startup-only backlog cannot pause/restart the source owner with a full rebuild');
      assert.equal(f.p.initialIndexComplete, false);
      assert.equal(f.p.indexDirty, true); assert.deepEqual([...f.p.indexBacklogReasons], [reason]);
      assert.equal(f.p.initialIndexTask, f.initial);
    } finally { f.close(); }
  });
}

for (const [name, options, expected] of [
  ['genuine structural change', { reasons: ['startup:stale-snapshot', 'vault:rename-folder'] }, 1],
  ['genuine dirty path', { reasons: ['startup:stale-snapshot', 'metadata:changed'], dirty: ['A.md'] }, 1],
  ['ordinary cold build', { sourceBacked: false }, 1],
  ['completed startup', { complete: true }, 1],
  ['on-demand refresh', { onDemand: true }, 0],
]) {
  test(`${name} retains its normal owner`, /** Retain validity-bearing work outside the narrow startup-only case. */ async () => {
    const f = fixture(options);
    try { await f.interval(); assert.equal(f.counts.full, expected); assert.equal(f.counts.local, options.onDemand ? 1 : 0); }
    finally { f.close(); }
  });
}

for (const [showNotice, force] of [[true, false], [false, true]]) {
  test(`explicit rebuild notice=${showNotice} force=${force} remains available`, /** User commands retain their existing rebuild semantics. */ async () => {
    const f = fixture();
    try { await f.p.rebuildIndex(showNotice, force, 'explicit'); assert.equal(f.counts.full, 1); }
    finally { f.close(); }
  });
}
