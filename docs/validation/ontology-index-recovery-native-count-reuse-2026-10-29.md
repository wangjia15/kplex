# Native folder count reuse and cancellation

Branch: `2026-10-28-investigate-ontology-index-recovery`, uncommitted against `17e39bf1dd5c964c84c69e82b1197c9b2ab5971d`. This follow-up supersedes the acceptance conclusion in the [pending-work validation](ontology-index-recovery-pending-work-2026-10-29.md). Its 3,417 tests did not cover count-proof reuse across native preview replacement or scope cancellation inside count-only compilation.

## Correction

`GraphIndex` retains one small current count proof per native `TFolder`, alongside the existing per-page presentation attachment. A new preview page can adopt a completed proof under the same structural revision, visibility signature and native observation. The observation retains primitive path/name/parent coordinates and the original children-array reference/length, without copying members or another graph. Native folder and parent identities are reacquired through the typed Vault API. Count proofs grant numeric structural gates only; source, incidence, whole-neighborhood and editing authority remain unchanged.

Native topology invalidation clears both proof owners. Visibility changes invalidate the matching signature. Folder replacement, native coordinate changes and children-array replacement reject reuse. Body-only stat changes, sorting and display-limit changes preserve valid structural counts. Purge and unload clear the retained proof cache. Native preview compilation supplies its already-validated center totals to the same cache, so optional preparation can reuse that completed work too.

`HostMetadataPreview.folderGates()` now accepts the caller's currentness guard and carries it into `buildFolder()` and its existing compiler runtime. Scope retirement stops count compilation at a cooperative boundary and rejects its final return. The GraphIndex count owner also checks purge, native identity, topology and visibility immediately before retaining a completed proof. The outer preview publisher closes those same native observations and rejects a purged lifetime before installing any scope or count proof.

Cache hits use constant-time native lookups and primitive comparisons. A cache miss retains the existing direct-member streaming/counting algorithm and its limits. No body acquisition, recursive subtree preparation, new scheduler, retry timer, listener, durable cache schema or persisted setting is introduced. As with the existing index, in-place native membership mutations rely on Vault topology events; this cache does not claim to discover arbitrary silent same-length member replacement by rescanning on every hit.

## Regressions and preflight

Fifteen permanent cases were added to `tests/on-demand-indexing.test.mjs`:

- Seven reuse/dependency cases cover unchanged preview replacement, body-only edits, presentation changes, visibility changes, topology changes, native folder replacement and children-array replacement. The initial 130-member child count runs once; unchanged dependencies reuse it. Recomputed proofs assert the exact 0/130/131 visible totals and no Markdown body/inventory acquisition.
- Six cancellation cases retire the scope, visibility, topology, cache, plugin or native folder identity inside an actual compiler checkpoint. They assert zero obsolete child-validation lookups and no retired page proof.
- Two final-publication cases hold an already completed preview across purge or native replacement. Neither retired result can repopulate reusable count proof or publish its old scope.

The final focused selection passed **22/22**, including the previous native move, alias, supersession, replacement-waiter and cross-priority tests:

```sh
node --test --test-name-pattern='native folder count proof|abandoned native gate count|completed native preview|superseded native|two visible folders|ordinary alias patch' tests/on-demand-indexing.test.mjs
```

The complete affected suites passed **238/238** before the final publication guard and its two additional cases. Installed-type checking and whitespace checks passed. Full verification restarts on the final frozen patch; the interrupted earlier portable run's driver restored the original disposable-vault files/configuration/layout before that restart. Its owned interrupted Chromium instance is also retired.

## Final verification

The final frozen patch passed the complete standard `npm run verify` through `scripts/testing/obsidian/verify.mjs`: architecture **9/9**, core **130/130**, main **1,679/1,679**, UI browser **403/403**, portable sources **357/357**, source browser **854/854**. Total: **3,432 tests, zero failures**. The real production build against installed Obsidian typings, scanner and whitespace checks passed. The source-browser lane took 942.45 seconds; the unchanged 20,015-owner cached-incidence test passed in 250.36 seconds. Selected-owner preparation retained the same 1,559/6,119 file lookups for 40/160 neighbors. These are controlled test observations, not actual paint or production thermal measurements.

The exact production build passed the standard native smoke and all **16 targeted native check groups** in `kplex-test-small`, under Node 22.22.3 / Obsidian 1.15.0 (installer 1.14.0). The new native checks verify one initial child count followed by reuse on an identical preview, fresh exact totals when note visibility changes, zero obsolete child-validation lookups after scope retirement, and no retained reusable proof from that retired count. All previous 12 native groups remain green.

The interrupted preliminary full run stopped in the portable phase to close the outer preview-publication purge race; its driver restored original files/configuration/layout. The corrected final run started from frozen runtime/test sources. The final driver restored original executables, settings bytes, enablement bytes and workspace layout. Independent executable hash checks passed. A read-only native post-check confirmed no controller, zero owned fixture folders and the original plugin loaded. The interrupted owned Chromium process and temporary profile were removed. Production vaults were not accessed.

All runtime/test source hashes match the frozen input; native source hashes and deployed artifact hashes match that build. The tracked patch SHA-256 is `7793bdd0759b843965b4c3399fdcb9c3aa53356b6ecb6baa7ba8fbba3a670064`, against the base and branch above. Exact identities, commands, complete native receipts and restoration evidence are in the [companion JSON receipt](ontology-index-recovery-native-count-reuse-2026-10-29.json).

I repeated **“Evaluate the regression risk of this PR”** across proof dependencies, native identity, visibility, compilation/publication boundaries, replacement readiness, priority and teardown. No further confirmed introduced regression or merge blocker was found. Cache misses still use the existing direct-member compiler. In-place same-length membership mutations rely on the existing Vault event contract. Native acceptance covers macOS; physical mobile, new Windows-host, actual paint and production thermal performance are separate environments/measurements. No additional manual check is required for these reproduced findings. Changes remain uncommitted.
