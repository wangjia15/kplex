/** Bounded synthetic reproduction of delayed resolver closes using production source acquisition
 * and real IndexedDB. Reads no Obsidian vault and changes no production settings or artifacts. */
import assert from "node:assert/strict";
import {chromiumHarness} from "../../tests/support/browserTypeScript.mjs";
import {contributorBrowserBundle, contributorBrowserInitialize} from "../../tests/support/contributorBrowserFixture.mjs";

const browser = await chromiumHarness(await contributorBrowserBundle());
try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
  const results = [];
  for (const scenario of ["immediate", "native-resolve", "delayed", "interrupted"]) {
    const result = await browser.evaluate(`(async () => {
      const scenario = ${JSON.stringify(scenario)}, f = await fixture('ontology-recovery-' + scenario);
      try {
        const owners = 32;
        for (let i = 0; i < owners; i++) f.add('Owner' + i + '.md', 'Related:: [[Owner' + ((i + 1) % owners) + ']]');
        await f.acquire(); ok(await f.acquisition.reconcile(), 'Seed closed source authority');
        f.work.reset(); const before = f.acquisition.getCounters(), causes = [], passes = [];
        f.acquisition.startupDiagnostics = {
          phase() {}, processed() {}, count() {}, recordWork() {}, mark() {}, stopActivityPhase() {},
          beginActivity(kind, scope, reason) { passes.push({kind, scope, reason}); return 0; },
          endActivity() {}, activityCause(reason) { causes.push(reason); }
        };
        /** Deliver host-shaped events for synthetic notes; the native event matcher remains real. */
        const edit = async (index, delayed) => {
          const file = f.files.get('Owner' + index + '.md'); file.stat.mtime++;
          f.texts.set(file.path, 'Related:: [[Owner' + ((index + 2) % owners) + ']]');
          f.app.vault.trigger('modify', file); f.app.metadataCache.trigger('changed', file);
          if (delayed) await new Promise(resolve => setTimeout(resolve, 75));
          if (scenario === 'native-resolve') {
            f.app.metadataCache.trigger('resolve', file);
            await new Promise(resolve => setTimeout(resolve, 75));
          }
          f.app.metadataCache.trigger('resolved');
        };
        await edit(0, scenario !== 'immediate');
        const invalidated = {localAuthority: f.acquisition.localDependencyAuthorityReady,
          semanticAuthority: f.acquisition.hasSemanticDependencies(),
          foregroundCapability: f.acquisition.localContributorDiscovery(runtime()) !== null};
        const ensure = f.repository.ensureLocalDependencies; let interrupted = false;
        if (scenario === 'interrupted') f.repository.ensureLocalDependencies = async function(...args) {
          const value = await ensure.apply(this, args);
          if (!interrupted && args[0] === 'Owner7.md') { interrupted = true; await edit(31, true); }
          return value;
        };
        const start = performance.now(), outcomes = [];
        for (let attempt = 0; attempt < 3; attempt++) {
          outcomes.push(await f.acquisition.reconcile());
          if (outcomes.at(-1)) break;
        }
        const after = f.acquisition.getCounters(), delta = Object.fromEntries(Object.keys(after).map(key => [key, after[key] - before[key]]));
        return {scenario, owners, invalidated, causes, passes, outcomes, elapsedMs: Math.round(performance.now() - start),
          enumerations: f.work.markdownEnumerations, localEnsures: f.work.localEnsures,
          counters: delta, ready: f.acquisition.hasSemanticDependencies()};
      } finally { f.close(); }
    })()`);
    assert.equal(result.ready, true);
    if (scenario === "immediate" || scenario === "native-resolve") assert.equal(result.enumerations, 0);
    else { assert(result.causes.includes("expired-resolver")); assert(result.enumerations > 0); }
    if (scenario === "interrupted") assert.deepEqual(result.outcomes, [false, true]);
    results.push(result);
  }
  console.log(JSON.stringify({node: process.version, productionVaultAccess: false, results}, null, 2));
} finally { await browser.cleanup(); }
