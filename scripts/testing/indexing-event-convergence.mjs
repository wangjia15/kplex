/**
 * Bounded PR210 accepted-base/candidate comparison. No production files or persistent host vaults
 * are changed. Timing and detailed native request observation use separate fresh browser arms;
 * every arm retains adverse outcomes, actual closure, independent semantics, quiet tail/edit/reopen.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromiumHarness} from '../../tests/support/browserTypeScript.mjs';
import {contributorBrowserBundle, contributorBrowserInitialize} from '../../tests/support/contributorBrowserFixture.mjs';
import {installSourceEventWorkFixture, sourceEventBrowserInitialize} from '../../tests/support/sourceEventWorkFixture.mjs';
import {installCachedSourceReadFixture} from '../../tests/support/cachedSourceReadFixture.mjs';
import {collect, hostOracle, semanticView} from '../../tests/support/cachedSourceFixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = '90032c6d7499fa4e40179110f7b5672d356aa390', owner = 'src/adapters/obsidian/sourceAcquisition.ts';
/** Pin source, executable fixture and final semantic receipts independently of documentation commits. */
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
/** Read exact accepted source with argument arrays; never switch branches or write Git state. */
function git(args) {
  const result = spawnSync('git', args, {cwd: root, encoding: 'utf8', timeout: 15000, windowsHide: true});
  if (result.status !== 0) throw new Error(`git ${args[0]}: ${result.stderr}`); return result.stdout;
}
/** Existing cumulative renderer metrics exclude Browser/storage/utility processes and startup. */
async function metrics(browser) {
  const reply = await browser.command('Performance.getMetrics');
  const result = Object.fromEntries(reply.metrics.map(/** Keep named raw endpoints for recalculation. */item => [item.name, item.value]));
  if (!Number.isFinite(result.TaskDuration)) throw new Error('Renderer TaskDuration unavailable'); return result;
}
/** Measure one awaited interval with transport wall time separate from browser-side completion. */
async function timed(browser, expression) {
  const before = await metrics(browser), started = performance.now(), result = {status: 'incomplete'};
  try { result.value = await browser.evaluate(expression); result.status = 'passed'; }
  catch (error) { result.status = 'failed'; result.error = String(error.stack ?? error); }
  finally {
    const after = await metrics(browser); result.transportElapsedMs = performance.now() - started;
    result.metricEndpoints = {before, after};
    result.rendererProcessCpuSeconds = Number.isFinite(before.ProcessTime) && Number.isFinite(after.ProcessTime)
      && after.ProcessTime >= before.ProcessTime && after.ProcessTime > 0 ? after.ProcessTime - before.ProcessTime : null;
    result.rendererMainThreadTaskSeconds = after.TaskDuration - before.TaskDuration;
    result.sampledJsHeap = {before: before.JSHeapUsedSize, after: after.JSHeapUsedSize};
  }
  return result;
}
/** Install existing full-host oracle functions in their expected lexical module context. */
async function initialize(browser) {
  await browser.evaluate(contributorBrowserInitialize);
  await browser.evaluate(sourceEventBrowserInitialize({collect, hostOracle, semanticView}));
  await browser.command('Performance.enable', {timeDomain: 'threadTicks'});
}
/** Own exactly one fresh disposable process/database; complete cleanup independently of assertions. */
async function arm(bundle, config) {
  const result = {...config, status: 'incomplete'}; let browser;
  try {
    browser = await chromiumHarness(bundle);
    result.identity = browser.identity(); result.browser = await browser.command('Browser.getVersion');
    result.target = await browser.command('Target.getTargetInfo'); await initialize(browser);
    await browser.evaluate(`(async()=>{sourceEventWork.context=await sourceEventWork.setup(${JSON.stringify(config.name)},${config.owners});return true})()`);
    result.before = await browser.evaluate('sourceEventWork.semanticOracle(sourceEventWork.context)');
    await browser.evaluate('sourceEventWork.reset(sourceEventWork.context);true');
    if (config.diagnostic) {
      await browser.evaluate(`(${installCachedSourceReadFixture.toString()})()`);
      result.run = await browser.evaluate(`(async()=>{const observer=cachedSourceRead.observe(sourceEventWork.context.fixture.repository);
        try{return {status:'passed',value:await sourceEventWork.run(sourceEventWork.context,${config.eventHeavy},${config.broadStart}),native:observer.totals};}
        catch(error){return {status:'failed',error:String(error.stack??error),native:observer.totals};}finally{observer.retire();}})()`);
    } else result.run = await timed(browser, `sourceEventWork.run(sourceEventWork.context,${config.eventHeavy},${config.broadStart})`);
    if (result.run.status !== 'passed') throw new Error(result.run.error);
    result.quiet = await timed(browser, 'sourceEventWork.quiet(sourceEventWork.context)');
    if (result.quiet.status !== 'passed') throw new Error(result.quiet.error);
    result.after = await browser.evaluate('sourceEventWork.semanticOracle(sourceEventWork.context)');
    result.subsequentEdit = await timed(browser, 'sourceEventWork.subsequentEdit(sourceEventWork.context)');
    if (result.subsequentEdit.status !== 'passed') throw new Error(result.subsequentEdit.error);
    result.afterEdit = await browser.evaluate('sourceEventWork.semanticOracle(sourceEventWork.context)');
    result.reopen = await timed(browser, 'sourceEventWork.reopen(sourceEventWork.context)');
    if (result.reopen.status !== 'passed') throw new Error(result.reopen.error);
    result.afterReopen = await browser.evaluate('sourceEventWork.semanticOracle(sourceEventWork.context)');
    if (result.afterEdit.semanticDigest !== result.afterReopen.semanticDigest) throw new Error('Reopen changed final semantics');
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed'; result.error = String(error.stack ?? error);
    if (browser) {
      try { result.failureState = await browser.evaluate(`typeof sourceEventWork==='undefined'||!sourceEventWork.context?null:
        {lastRun:sourceEventWork.context.lastRun??null,state:sourceEventWork.state(sourceEventWork.context)}`); }
      catch (captureError) { result.failureCaptureError = String(captureError.stack ?? captureError); }
    }
  }
  finally {
    try {
      result.fixtureCleanup = browser ? await browser.evaluate('sourceEventWork.cleanup(sourceEventWork.context)') : {closed: true, browserAbsent: true};
      const cleanup = result.fixtureCleanup;
      if (!cleanup.closed || !cleanup.browserAbsent && (!cleanup.repositoryClosed || cleanup.remainingEventDisposers !== 0
        || cleanup.timers.some(value => value !== null))) throw new Error('Fixture resources did not completely retire');
    }
    catch (error) { result.fixtureCleanup = {closed: false, error: String(error.stack ?? error)}; result.status = 'failed'; }
    try { await browser?.cleanup(); result.browserCleanup = 'passed'; }
    catch (error) { result.browserCleanup = String(error.stack ?? error); result.status = 'failed'; }
  }
  return result;
}
/** Predeclared finite cells; a smoke run is tooling validation, never the three-pair claim. */
function protocol(mode) {
  const cells = mode === 'smoke' ? [{owners: 16, eventHeavy: true, broadStart: true, scenario: 'events', pairs: 1}]
    : [{owners: 8, eventHeavy: false, broadStart: false, scenario: 'settled-quiet-no-events', pairs: 1},
      {owners: 16, eventHeavy: false, broadStart: true, scenario: 'broad-no-concurrent-source-events', pairs: 3},
      {owners: 96, eventHeavy: true, broadStart: true, scenario: 'events', pairs: 3},
      {owners: 384, eventHeavy: true, broadStart: true, scenario: 'events', pairs: 3}];
  return {cells, mutations: 'Exactly3 modify/metadata/known-resolved waves at fixed owner1/4,1/2,3/4 boundaries; targets0,last,0; same final content',
    expectation: 'Candidate retains unaffected broad sweep progress; baseline may repeat prefixes. Every arm must genuinely close and match independent final semantics; censored/incomplete baseline is no completed speedup.',
    limits: '45000ms in-browser convergence bound and16 explicit production flush joins per phase; existing60s CDP command deadline unchanged',
    thresholds: 'No changed product acceptance or responsiveness thresholds; heartbeat is a diagnostic20ms timer, not native interaction or paint.',
    lifecycle: 'Fresh owned browser/profile/database per arm; identical seeded closed authority. Subsequent edit and connection/acquisition reopen use same database; no whole-browser restart/scaling/storage study.',
    cpu: 'CDP renderer ProcessTime when monotonic, TaskDuration(threadTicks) separately. Browser/storage/utility CPU, OS process births/exits and worker-exclusive CPU are unmeasured; no worker addition.',
    observation: 'Equal bounded fixture counters, coarse phase/owner forwarding, Set/array work summaries, fixed-boundary delivery wrappers and heartbeat are INCLUDED in both CPU intervals; this is not a minimal-observer claim. Native request observer only in diagnostic mode. Independent semantic oracle/DB enumeration excluded.',
    convergence: 'Explicit bounded production flush joins are the declared synthetic browser protocol, not proof of automatic native event convergence. Separate Windows operations are required. Quiet control is settled acquisition, not full application startup.',
    memory: 'JS heap endpoint samples only, neither allocation nor true peak. No forced GC, scheduler changes or storage resets.',
    identity: 'Synthetic host headless Chromium is not Windows Obsidian/native acceptance; main.ts admission correction is outside this source-owner executable.'};
}
/** Save each arm before starting another; failures remain private and are never excluded by outcome. */
async function main() {
  if (process.version !== 'v22.22.2') throw new Error(`Node22.22.2 required, actual ${process.version}`);
  const mode = process.argv[2] ?? 'plan';
  if (!['plan', 'smoke', 'diagnostic', 'timing'].includes(mode)) throw new Error('Use plan, smoke, diagnostic or timing');
  const declared = protocol(mode); if (mode === 'plan') { console.log(JSON.stringify({baseline, ...declared}, null, 2)); return; }
  const changed = git(['diff', baseline, '--name-only', '--', 'src/']).trim().split(/\r?\n/).filter(Boolean);
  if (changed.some(/** main.ts is not imported by this isolated source-owner bundle. */file => file !== owner && file !== 'src/main.ts')) throw new Error(`Unshared runtime change: ${changed.join(',')}`);
  const sources = {baseline: git(['show', `${baseline}:${owner}`]), candidate: await readFile(join(root, owner), 'utf8')};
  const extra = ['src/core/graph/compiler.ts', 'src/adapters/obsidian/ontologySourceCollector.ts', 'src/adapters/obsidian/metadataSourceCollector.ts'];
  const bundles = {};
  for (const kind of ['baseline', 'candidate']) bundles[kind] = await contributorBrowserBundle(extra, {[owner]: sources[kind]});
  const directory = await mkdtemp(join(tmpdir(), 'kplex-source-event-210-'));
  const summary = {directory, mode, baseline, head: git(['rev-parse', 'HEAD']).trim(), changed, node: process.version, platform: process.platform,
    createdAt: new Date().toISOString(), protocol: declared, sourceHashes: Object.fromEntries(Object.entries(sources).map(/** Pin exact runtime bytes. */([key, value]) => [key, hash(value)])),
    toolingHashes: {runner: hash(await readFile(fileURLToPath(import.meta.url))), fixture: hash(installSourceEventWorkFixture.toString()),
      oracleFunctions: hash([collect.toString(), hostOracle.toString(), semanticView.toString()].join('\n')),
      diagnosticObserver: hash(installCachedSourceReadFixture.toString())},
    bundleHashes: Object.fromEntries(Object.entries(bundles).map(/** Pin actual test executable bytes. */([key, value]) => [key, hash(value)])), results: []};
  await writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2)); console.log(JSON.stringify({directory, mode}));
  for (const cell of declared.cells) for (let pair = 1; pair <= (mode === 'diagnostic' ? 1 : cell.pairs); pair++) {
    for (const kind of pair % 2 ? ['baseline', 'candidate'] : ['candidate', 'baseline']) {
      const name = `${mode}-${cell.owners}-${cell.scenario}-${pair}-${kind}`;
      const result = await arm(bundles[kind], {...cell, pair, kind, name, diagnostic: mode === 'diagnostic'});
      await writeFile(join(directory, `${name}.json`), JSON.stringify(result, null, 2));
      summary.results.push({name, status: result.status}); await writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
      console.log(JSON.stringify({name, status: result.status, run: result.run && {rendererCpuSeconds: result.run.rendererProcessCpuSeconds,
        elapsedMs: result.run.value?.elapsedMs, repeatedInspections: result.run.value?.work.repeatedInspections}, error: result.error}));
    }
  }
  summary.finishedAt = new Date().toISOString(); summary.status = summary.results.every(/** Preserve adverse or failed outcomes in cohort status. */item => item.status === 'passed') ? 'passed' : 'failed';
  await writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
  if (summary.status !== 'passed') process.exitCode = 1;
}
await main();
