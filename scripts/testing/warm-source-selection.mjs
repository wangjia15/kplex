/**
 * PR212 bounded current-main/candidate warm validation in fresh, disposable Chromium profiles.
 * Each measured pass follows an actual browser restart over identically seeded synthetic facts.
 * Native accounting is separate from timing; source/frame authentication and normal leases remain
 * production work. Profiles retire serially, with explicit sampled disk limits and failed receipts.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, readdir, stat, statfs } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromiumHarness } from '../../tests/support/browserTypeScript.mjs';
import { contributorBrowserBundle, contributorBrowserInitialize } from '../../tests/support/contributorBrowserFixture.mjs';
import { installCachedSourceReadFixture } from '../../tests/support/cachedSourceReadFixture.mjs';
import { installWarmSourceSelectionFixture } from '../../tests/support/warmSourceSelectionFixture.mjs';
import { sourceEventBrowserInitialize } from '../../tests/support/sourceEventWorkFixture.mjs';
import { collect, hostOracle, semanticView } from '../../tests/support/cachedSourceFixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = 'd48f76641df149dd5bb4d000fe9764251ece9807';
const runtimeFiles = ['src/index/SourceRepository.ts', 'src/adapters/obsidian/sourceAcquisition.ts'];
const minimumFreeBytes = 2 * 1024 ** 3, maximumProfileBytes = 256 * 1024 ** 2;
/** Pin source/bundle evidence without exposing any personal vault path or content. */
const sha256 = text => createHash('sha256').update(text).digest('hex');
/** Read immutable Git input without checking out or importing any independent PR branch. */
function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr}`);
  return result.stdout;
}
/** Keep the existing low-space restriction explicit before creating each owned profile. */
async function freeBytes() { const info = await statfs(tmpdir()); return info.bavail * info.bsize; }
/** Sample only this harness-owned profile between operations; no database dump or vault scan. */
async function directoryBytes(path) {
  let bytes = 0;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    try { bytes += entry.isDirectory() ? await directoryBytes(file) : (await stat(file)).size; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return bytes;
}
/** Install shared test fixtures and independent oracle, never substitutes for source authentication. */
async function initialize(browser) {
  await browser.evaluate(contributorBrowserInitialize);
  await browser.evaluate(`(${installCachedSourceReadFixture.toString()})()`);
  await browser.evaluate(sourceEventBrowserInitialize({ collect, hostOracle, semanticView }));
  await browser.evaluate(`(${installWarmSourceSelectionFixture.toString()})()`);
  await browser.command('Performance.enable', { timeDomain: 'threadTicks' });
}
/** Retain cumulative metric endpoints; unsupported process CPU stays explicitly unavailable. */
async function metrics(browser) {
  const result = await browser.command('Performance.getMetrics');
  return Object.fromEntries(result.metrics.map(/** Preserve original named values for independent recomputation. */item => [item.name, item.value]));
}
/** Measure a complete awaited interval, including native release/commit completion and IPC gaps. */
async function timed(browser, expression) {
  const before = await metrics(browser), started = performance.now();
  const result = { status: 'incomplete' };
  try { result.value = await browser.evaluate(expression); result.status = 'passed'; }
  catch (error) { result.status = 'failed'; result.error = String(error.stack ?? error); }
  finally {
    result.elapsedMs = performance.now() - started;
    const after = await metrics(browser); result.metrics = { before, after };
    result.rendererMainThreadCpuSeconds = after.TaskDuration - before.TaskDuration;
    result.rendererProcessCpuSeconds = before.ProcessTime >= 0 && after.ProcessTime > 0
      ? after.ProcessTime - before.ProcessTime : null;
  }
  return result;
}
/** Keep per-arm source-head identity exact, while committed receipts contain only a digest. */
function closure(value) {
  const { heads, ...rest } = value;
  return { ...rest, owners: heads.length, selectedHeadDigest: sha256(JSON.stringify(heads)) };
}
/** Reconstruct identical source/native inputs without seeding after a genuine browser restart. */
async function setup(browser, name, config, edited = false) {
  await browser.evaluate(`(/** Own one bounded controller interval outside native transactions. */async()=>{
    const B=cachedSourceRead,c=B.context=await B.setup(${JSON.stringify(name)},${config.owners},${!!config.dense},${config.control === 'legacy'});
    if(${edited}){const file=c.fixture.files.get(B.path(0));c.fixture.metadata.get(file.path).frontmatter.aliases=['New alias after cached validation'];file.stat.mtime++;file.stat.size++;}
    return true;
  })()`);
}
/** Own one serial bounded profile, including failure cleanup, later edit and second true reopen. */
async function arm(bundle, name, config) {
  const result = { name, ...config, status: 'incomplete', diskSamples: [] };
  let browser;
  try {
    result.freeBytesBefore = await freeBytes();
    if (result.freeBytesBefore < minimumFreeBytes) throw new Error('Insufficient free disk for bounded test profile');
    browser = await chromiumHarness(bundle); result.browser = await browser.command('Browser.getVersion');
    /** Enforce a sampled profile ceiling between bounded phases without perturbing timed IO. */
    const sample = async phase => {
      const bytes = await directoryBytes(browser.identity().profile); result.diskSamples.push({ phase, bytes });
      if (bytes > maximumProfileBytes) throw new Error('Owned profile exceeds 256 MiB bound');
    };
    const database = `warm-source-${name}`;
    await initialize(browser); await setup(browser, database, config);
    for (let first = 0; first < config.owners; first += 16)
      await browser.evaluate(`cachedSourceRead.seedRange(cachedSourceRead.context,${first},16)`);
    if (config.control) await browser.evaluate(`warmSourceSelection.prepareControl(cachedSourceRead.context,${JSON.stringify(config.control)})`);
    await sample('seed');
    await browser.evaluate('cachedSourceRead.context.fixture.close();true');
    await browser.restart(); await initialize(browser); await setup(browser, database, config);
    result.before = closure(await browser.evaluate('cachedSourceRead.oracle(cachedSourceRead.context)'));
    await browser.evaluate('cachedSourceRead.reset(cachedSourceRead.context);true');
    const expression = `warmSourceSelection.run(cachedSourceRead.context,${JSON.stringify(config.operation)})`;
    result.inventory = config.diagnostic ? await browser.evaluate(`(/** Own one bounded controller interval outside native transactions. */async()=>{
      const observer=cachedSourceRead.observe(cachedSourceRead.context.repository);
      try{return {status:'passed',value:await ${expression},totals:observer.totals};}
      finally{observer.retire();}
    })()`) : await timed(browser, expression);
    if (result.inventory.status !== 'passed') throw new Error(result.inventory.error);
    result.quiet = closure(await browser.evaluate('warmSourceSelection.quiet(cachedSourceRead.context)'));
    if (result.before.selectedHeadDigest !== result.quiet.selectedHeadDigest) throw new Error('Warm validation changed source heads');
    result.semantics = await browser.evaluate('warmSourceSelection.semantics(cachedSourceRead.context)');
    await sample('warm');
    result.edit = await timed(browser, 'cachedSourceRead.subsequentEdit(cachedSourceRead.context)');
    if (result.edit.status !== 'passed') throw new Error(result.edit.error);
    result.afterEdit = closure(await browser.evaluate('cachedSourceRead.oracle(cachedSourceRead.context)'));
    result.editSemantics = await browser.evaluate('warmSourceSelection.semantics(cachedSourceRead.context)');
    await browser.evaluate('cachedSourceRead.context.fixture.close();true');
    await browser.restart(); await initialize(browser); await setup(browser, database, config, true);
    result.reopen = await timed(browser, expression);
    if (result.reopen.status !== 'passed') throw new Error(result.reopen.error);
    result.afterReopen = closure(await browser.evaluate('cachedSourceRead.oracle(cachedSourceRead.context)'));
    result.reopenSemantics = await browser.evaluate('warmSourceSelection.semantics(cachedSourceRead.context)');
    if (result.afterEdit.selectedHeadDigest !== result.afterReopen.selectedHeadDigest
      || result.editSemantics.semanticDigest !== result.reopenSemantics.semanticDigest) throw new Error('Reopen altered facts/semantics or shifted repair');
    await sample('reopen'); result.status = 'passed';
  } catch (error) { result.status = 'failed'; result.error = String(error.stack ?? error); }
  finally {
    if (browser) {
      const profile = browser.identity().profile;
      try { await browser.evaluate('cachedSourceRead.context?.fixture.close();true'); }
      catch (error) { result.cleanupEvalError = String(error); }
      try {
        await browser.cleanup();
        try { await stat(profile); throw new Error('Owned profile survived cleanup'); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        result.cleanup = { profileRemoved: true };
      } catch (error) { result.status = 'failed'; result.cleanup = { error: String(error.stack ?? error) }; }
    }
    result.sampledPeakProfileBytes = Math.max(0, ...result.diskSamples.map(/** A sampled high-water mark is not a continuous peak. */item => item.bytes));
    result.freeBytesAfter = await freeBytes();
  }
  return result;
}
/** Run a fixed small matrix and persist unfavorable receipts before moving to the next clean profile. */
async function main() {
  if (process.version !== 'v22.22.2') throw new Error('Node 22.22.2 required');
  const mode = process.argv[2] ?? 'characterize';
  if (!['characterize', 'smoke', 'compare'].includes(mode)) throw new Error('Use characterize, smoke or compare');
  const changed = git(['diff', baseline, '--name-only', '--', 'src/']).trim().split(/\r?\n/).filter(Boolean);
  if (changed.some(/** Never import an independent PR or silently compare unrelated runtime changes. */path => !runtimeFiles.includes(path))) throw new Error(`Out-of-scope runtime change: ${changed}`);
  const overrides = Object.fromEntries(runtimeFiles.map(/** Pin both coordinated production owners to accepted current main. */path => [path, git(['show', `${baseline}:${path}`])]));
  const entries = [...runtimeFiles, 'src/core/graph/compiler.ts', 'src/adapters/obsidian/ontologySourceCollector.ts', 'src/adapters/obsidian/metadataSourceCollector.ts'];
  const bundles = { A: await contributorBrowserBundle(entries, overrides), F: await contributorBrowserBundle(entries) };
  const directory = await mkdtemp(join(tmpdir(), 'kplex-warm-selection-'));
  const summary = { baseline, head: git(['rev-parse', 'HEAD']).trim(), node: process.version, mode, directory,
    startedAt: new Date().toISOString(), minimumFreeBytes, maximumProfileBytes,
    runtimeSourceHashes: { A: Object.fromEntries(runtimeFiles.map(/** Pin actual accepted source independently from the PR planning head. */file => [file, sha256(overrides[file])])),
      F: Object.fromEntries(await Promise.all(runtimeFiles.map(/** Pin candidate working-tree bytes before any later commit/report update. */async file => [file, sha256(await readFile(join(root, file), 'utf8'))]))) },
    conditions: { timing: 'Complete reconciliation after an actual browser restart; native release and flush included. Separate diagnostic arms. Main-thread TaskDuration uses threadTicks; renderer ProcessTime is optional; Browser/storage CPU excluded.',
      storage: 'At least 2 GiB free before each serial arm. Each owned profile is sampled between phases against 256 MiB; recorded high-water marks are not continuous peaks. No database dumps or native vaults.',
      oracle: 'Exact unchanged per-arm source heads, independent fresh-host compiler vs authenticated cached semantic replay, quiet tail, later edit/reclamation and actual second restart. No equal physical-cache or production-vault gain claim.' },
    bundleHashes: Object.fromEntries(Object.entries(bundles).map(/** Pin actual executable fixture bytes independently from later report commits. */([key, value]) => [key, sha256(value)])), results: [] };
  const matrix = mode === 'characterize' ? [
    { owners: 32, operation: 'host', diagnostic: true, kinds: ['A'] },
    { owners: 32, operation: 'complete', diagnostic: true, kinds: ['A'] },
    { owners: 128, operation: 'complete', diagnostic: false, kinds: ['A', 'F'] },
  ] : mode === 'smoke' ? [{ owners: 8, operation: 'complete', diagnostic: true, kinds: ['A', 'F'] }]
    : [32, 128, 256].flatMap(/** Alternate three representative pairs, without outcome-selected retries. */owners =>
      Array.from({ length: owners === 128 ? 3 : 1 }, (_, pair) => ({ owners, pair: pair + 1, operation: 'complete', diagnostic: false, kinds: pair % 2 ? ['F', 'A'] : ['A', 'F'] })))
      .concat([{ owners: 32, operation: 'host', diagnostic: true, kinds: ['A', 'F'] },
        { owners: 128, operation: 'complete', diagnostic: true, kinds: ['A', 'F'] },
        ...['dense', 'legacy', 'shared'].map(/** Dense payloads stay limited to two owners. */control => ({ owners: 2, dense: control === 'dense', control: control === 'dense' ? undefined : control, operation: 'complete', diagnostic: true, kinds: ['A', 'F'] }))]);
  console.log(JSON.stringify({ directory, mode, baseline }));
  for (const [index, config] of matrix.entries()) for (const kind of config.kinds) {
    const name = `${index}-${config.owners}-${config.control ?? (config.dense ? 'dense' : config.operation)}-${kind}`;
    const result = await arm(bundles[kind], name, config);
    await writeFile(join(directory, `${name}.json`), JSON.stringify(result, null, 2));
    summary.results.push({ name, status: result.status });
    await writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ name, status: result.status, inventory: result.inventory && { elapsedMs: result.inventory.elapsedMs, cpu: result.inventory.rendererProcessCpuSeconds, mainThreadCpu: result.inventory.rendererMainThreadCpuSeconds, transactions: result.inventory.totals?.transactions }, disk: result.sampledPeakProfileBytes, error: result.error }));
  }
  summary.finishedAt = new Date().toISOString();
  summary.status = summary.results.every(/** Keep any failed arm visible in the cohort's exit status. */result => result.status === 'passed') ? 'passed' : 'failed';
  await writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
  if (summary.status !== 'passed') process.exitCode = 1;
}
await main();
