/**
 * Serial fresh-process Windows acceptance driver for pinned PR201 artifacts. Owns Small-only
 * checkpoint/configuration backups, guarded graceful lifecycle transitions, staging and final
 * restoration. No production source/build/global storage/PR203 operation is performed.
 * Every incomplete arm and original receipt stays in the explicitly private TEMP report folder.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join, resolve, relative, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {runIndexingCheckpoint} from './indexingCheckpoint.mjs';
import {createFreshObservation} from './indexingFreshObservation.mjs';
import {createLightweightIndexingProbe} from './indexingCpuProbe.mjs';
import {runFreshIndexingScenario} from './indexingFreshScenario.mjs';
import {createFreshHost} from './indexingFreshHost.mjs';
import {assertPinnedArtifacts} from './indexingFreshGuards.mjs';
import {validateTarget} from './runner.mjs';

assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v22.22.2');
assert.equal(process.env.KPLEX_CPU_FRESH_RESTART_CONFIRMED, 'only-kplex-test-small', 'Explicit maintainer restart confirmation required');
const target = validateTarget({vaultName: process.env.KPLEX_TEST_VAULT_NAME, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR});
assert.equal(target.vault.toLowerCase(), 'c:\\obsidian\\kplex-test-small');
const directory = resolve(process.env.KPLEX_HOST_REPORT_DIR ?? '');
assert(directory.startsWith(resolve(tmpdir()) + '\\') && !existsSync(directory), 'Fresh private TEMP report directory required');
const ownedDirectory = relative(resolve(tmpdir()), directory);
assert(dirname(ownedDirectory) === '.' && /^kplex-pr201-resume[\w.-]*$/.test(ownedDirectory), 'Preserve existing checkpoint-owned TEMP directory guard before host mutation');
mkdirSync(directory);
const host = createFreshHost(target, directory), backup = join(directory, 'original'); mkdirSync(backup);
const baseline = resolve(process.env.KPLEX_CPU_FRESH_BASELINE_DIR ?? ''), candidate = resolve('dist');
assert(process.env.KPLEX_CPU_FRESH_BASELINE_DIR, 'Explicit previously built baseline artifact directory required');
const checkpoint = join(tmpdir(), 'kplex-pr201-resume-checkpoints-20261022', 'warm-v2.bin');
const checkpointSha = '9e4503aec40d4d80a247cfb6926b432bd3529dac6b2f886d13df11228b5a2106';
const originalCheckpoint = join(directory, 'original.bin');
const files = ['main.js', 'manifest.json', 'styles.css'];
const originalConfiguration = new Map();
const summary = {protocol: 'indexing-cpu-201-windows-protocol.md', startedAt: new Date().toISOString(),
  runtimeBaseline: '551a3b52895484de3dd41e5c6eb2fa8c6712fec4', runtimeCandidate: 'fa08e60e1a7122f8b37fcd11c943b883317b6ae8',
  checkpointSha, runs: [], restartAuthorization: 'Maintainer confirmed all other vaults saved/closed; only disposable Small remains.'};
let metadata, captureReceipt, appOpen = true, preparedData, preparationLayout;
/** Hash actual artifacts/checkpoints without disclosing their data. */
function hash(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
/** Save a durable private receipt after each lifecycle/arm, including failures. */
function save() { writeFileSync(join(directory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n'); }
/** Preserve existing JSON configuration byte-for-byte, including companion settings. */
function backupJson(folder) {
  for (const entry of readdirSync(folder, {withFileTypes: true})) {
    assert(!entry.isSymbolicLink(), 'No symlink in owned configuration');
    const file = join(folder, entry.name);
    if (entry.isDirectory()) backupJson(file);
    else if (entry.name.endsWith('.json')) {
      const key = relative(target.config, file), bytes = readFileSync(file); originalConfiguration.set(key, bytes);
      const destination = join(backup, key); mkdirSync(resolve(destination, '..'), {recursive: true}); writeFileSync(destination, bytes);
    }
  }
}
/** Run the existing authenticated offline checkpoint owner, with separately timed restoration. */
function storage(action, path, expectedSha256) {
  const begin = Date.now();
  const receipt = host.checkpoint(`(async()=>JSON.stringify(await (${runIndexingCheckpoint.toString()})(app,${JSON.stringify({action, path, expectedSha256, databaseName: metadata.databaseName, vaultPath: target.vault})})))()`);
  return {begin, end: Date.now(), receipt};
}
/** Stop only the test controller's waits; its finally independently releases each observer. */
async function retireController() {
  let state = host.evaluate(`JSON.stringify((()=>{const c=window.kplexFreshCpuProbe;if(!c)return {done:true};c.closed=true;c.cancelWait?.();return {done:c.done}})())`);
  const end = Date.now() + 20000;
  while (!state.done && Date.now() < end) { await host.delay(250); state = host.evaluate('JSON.stringify({done:window.kplexFreshCpuProbe?.done})'); }
  assert(state.done, 'Fresh observer cleanup deadline');
  host.evaluate('delete window.kplexFreshCpuProbe;JSON.stringify({removed:true})');
}
/** Join existing setup writers, close owned Plex views, and disable K-Plex outside timing. */
function offline() {
  return host.checkpoint(`(async()=>{const p=app.plugins.plugins['k-plex'];if(p){await p.settingsWriteQueue;await p.index.flushSourceRepository();
    const a=p.index.sourceAcquisition.getActivityState();if(Object.values(a).some(n=>n!==0)||p.index.urlCacheWrites.size)throw Error('Preparation source work pending');
    for(const kind of ['k-plex-react-view','k-plex-sidepanel-view'])for(const leaf of app.workspace.getLeavesOfType(kind))leaf.detach();
    await app.plugins.disablePlugin('k-plex');}return JSON.stringify({offline:!app.plugins.plugins['k-plex']})})()`);
}
/** Stage only previously built artifacts and deterministic test settings while no host is running. */
function stage(arm) {
  const source = arm === 'A' ? baseline : candidate;
  const hashes = Object.fromEntries(files.map(/** Bind each artifact to its retained bytes. */ file => [file, hash(join(source, file))]));
  assertPinnedArtifacts({main: hashes['main.js'], manifest: hashes['manifest.json'], styles: hashes['styles.css']}, arm === 'A' ? 'A' : 'F');
  for (const file of files) { copyFileSync(join(source, file), join(target.pluginDir, file)); assert.equal(hash(join(target.pluginDir, file)), hashes[file]); }
  writeFileSync(join(target.pluginDir, 'data.json'), preparedData);
  const enabled = JSON.parse(originalConfiguration.get('community-plugins.json').toString());
  writeFileSync(join(target.config, 'community-plugins.json'), JSON.stringify(enabled.filter(/** Fresh measurement starts without a K-Plex instance. */ id => id !== 'k-plex'), null, 2));
  return hashes;
}
try {
  host.inventory(); backupJson(target.config);
  assert.equal(hash(checkpoint), checkpointSha);
  for (const file of files) copyFileSync(join(target.pluginDir, file), join(backup, file));
  metadata = host.checkpoint(`(async()=>{const p=app.plugins.plugins['k-plex'];if(!p)throw Error('Original enabled plugin required');
    await p.settingsWriteQueue;await p.index.flushSourceRepository();return JSON.stringify({databaseName:(await p.index.indexedDb.open()).name,
    layout:app.workspace.getLayout(),center:app.vault.getMarkdownFiles()[0].path,files:app.vault.getFiles().length,markdown:app.vault.getMarkdownFiles().length})})()`);
  assert.equal(metadata.files, 107); assert.equal(metadata.markdown, 88);
  writeFileSync(join(directory, 'metadata.json'), JSON.stringify(metadata));
  assert(offline().offline); preparationLayout = host.evaluate('JSON.stringify(app.workspace.getLayout())');
  captureReceipt = storage('capture', originalCheckpoint); summary.originalCheckpoint = captureReceipt;
  const settings = JSON.parse(originalConfiguration.get('plugins\\k-plex\\data.json').toString());
  Object.assign(settings, {indexingModeDesktop: 'eager', indexBeforeViewDesktop: false, lastActivePath: metadata.center,
    startInPopout: false, documentSyncMode: 'off', sidecarOpen: false}); preparedData = JSON.stringify(settings, null, 2);
  summary.harness = Object.fromEntries(['indexingFresh.mjs', 'indexingFreshHost.mjs', 'indexingFreshScenario.mjs', 'indexingFreshObservation.mjs', 'indexingFreshGuards.mjs', 'indexingCpuProbe.mjs', 'indexingCheckpoint.mjs'].map(/** Record exact test-source identity separately from production commits. */ file => [file, hash(join('scripts/testing/obsidian', file))]));
  save();
  for (const label of ['host', 'A1', 'F1', 'F2', 'A2', 'A3', 'F3']) {
    const arm = label === 'host' ? 'host' : label[0], runDirectory = join(directory, label); mkdirSync(runDirectory);
    const row = {label, arm, startedAt: Date.now()}; summary.runs.push(row); save();
    assert(offline().offline); row.restoration = storage('restore', checkpoint, checkpointSha);
    row.logicalVerification = storage('verify', checkpoint, checkpointSha);
    await host.checkpoint(`(async()=>{await app.workspace.changeLayout(${JSON.stringify(preparationLayout)});return JSON.stringify({layout:true})})()`);
    const before = await host.quit(); appOpen = false;
    row.artifacts = stage(arm); row.launchBegin = Date.now();
    row.identity = await host.launch(before); appOpen = true; row.launchEnd = Date.now(); row.power = host.power();
    const control = {arm, vaultPath: target.vault, pluginDir: target.pluginDir, center: metadata.center,
      mainSha: row.artifacts['main.js'], tracePath: join(runDirectory, 'samples.ndjson'), resultPath: join(runDirectory, 'result.json')};
    host.evaluate(`(()=>{if(window.kplexFreshCpuProbe)throw Error('Existing fresh observer');const c=window.kplexFreshCpuProbe={...${JSON.stringify(control)},done:false,closed:false,progress:{phase:'install'}};
      c.createObservation=${createFreshObservation.toString()};c.createLightweightProbe=${createLightweightIndexingProbe.toString()};
      c.task=(${runFreshIndexingScenario.toString()})(app,c).catch(error=>{c.error=String(error);c.done=true});return JSON.stringify({started:true})})()`);
    const end = Date.now() + 1300000;
    let state;
    do {
      await host.delay(10000);
      state = host.evaluate('JSON.stringify({done:window.kplexFreshCpuProbe?.done,error:window.kplexFreshCpuProbe?.error,phase:window.kplexFreshCpuProbe?.progress?.phase,point:window.kplexFreshCpuProbe?.progress?.point,at:Date.now()})');
      row.progress = state; save();
      console.log(JSON.stringify({label, ...state}));
    } while (!state.done && Date.now() < end);
    assert(state.done, 'Bounded fresh-process experiment deadline');
    await retireController();
    row.result = JSON.parse(readFileSync(control.resultPath)); row.finishedAt = Date.now();
    assert.equal(row.result.status, 'passed', row.result.error); assert.equal(row.result.observerErrors.length, 0, 'Observer coverage errors');
    assert.equal(hash(join(target.pluginDir, 'main.js')), row.artifacts['main.js']);
    row.resultSha = hash(control.resultPath); row.traceSha = hash(control.tracePath); save();
  }
  summary.status = 'passed';
} catch (error) { summary.status = 'failed'; summary.error = String(error); process.exitCode = 1; }
finally {
  try {
    assert(metadata && originalConfiguration.size, 'Original configuration identity required for restoration');
    if (!appOpen) { await host.launch(); appOpen = true; }
    await retireController(); assert(offline().offline);
    if (captureReceipt) {
      summary.originalRestoration = storage('restore', originalCheckpoint, captureReceipt.receipt.sha256);
      summary.originalVerification = storage('verify', originalCheckpoint, captureReceipt.receipt.sha256);
    } else summary.databaseRestoration = 'Original capture failed before any restore; preserve database and restore configuration/layout independently.';
    await host.quit(); appOpen = false;
    for (const [file, bytes] of originalConfiguration) writeFileSync(join(target.config, file), bytes);
    for (const file of files) copyFileSync(join(backup, file), join(target.pluginDir, file));
    summary.restoredIdentity = await host.launch(); appOpen = true;
    summary.nativeRestoration = host.checkpoint(`(async()=>{await new Promise(resolve=>app.workspace.onLayoutReady(resolve));
      const end=Date.now()+180000;let p;while(!(p=app.plugins.plugins['k-plex'])?.layoutReady){if(Date.now()>end)throw Error('Original plugin layout readiness');await new Promise(resolve=>window.setTimeout(resolve,50))}
      await app.workspace.changeLayout(${JSON.stringify(metadata.layout)});await p.settingsWriteQueue;await p.index.flushSourceRepository();
      while(Object.values(p.index.sourceAcquisition.getActivityState()).some(n=>n!==0)||p.index.urlCacheWrites.size||p.index.building||p.index.hasPendingSnapshotHydration()){
        if(Date.now()>end)throw Error('Original source closure');await new Promise(resolve=>window.setTimeout(resolve,50))}
      return JSON.stringify({files:app.vault.getFiles().length,markdown:app.vault.getMarkdownFiles().length,source:p.index.sourceAcquisition.getActivityState(),unsaved:p.index.getSourceRepositoryDiagnostics().unsaved,
        cache:p.index.indexedDb.getActivityState(),controller:!!window.kplexFreshCpuProbe,debugger:require('@electron/remote').getCurrentWindow().webContents.debugger.isAttached()})})()`);
    await host.delay(1500);
    for (const [file, bytes] of originalConfiguration) { writeFileSync(join(target.config, file), bytes); assert(readFileSync(join(target.config, file)).equals(bytes), 'Original JSON configuration bytes'); }
    for (const file of files) assert.equal(hash(join(target.pluginDir, file)), hash(join(backup, file)));
    assert.equal(summary.nativeRestoration.files, metadata.files); assert.equal(summary.nativeRestoration.markdown, metadata.markdown);
    assert.equal(summary.nativeRestoration.unsaved, 0); assert.equal(summary.nativeRestoration.controller, false); assert.equal(summary.nativeRestoration.debugger, false);
    summary.configurationBytesRestored = originalConfiguration.size;
    summary.cleanup = 'passed';
  } catch (error) { summary.cleanup = 'failed'; summary.cleanupError = String(error); summary.status = 'failed'; process.exitCode = 1; }
  summary.finishedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({status: summary.status, cleanup: summary.cleanup, directory, error: summary.error, cleanupError: summary.cleanupError}));
}
