# Pending foreground recovery and superseded native folder work

Branch: `2026-10-28-investigate-ontology-index-recovery`, uncommitted against `17e39bf1dd5c964c84c69e82b1197c9b2ab5971d`. This follow-up supersedes the acceptance conclusion in the [previous validation](ontology-index-recovery-final-review-loop-2026-10-29.md), whose 3,404 tests did not cover pending peer I/O or obsolete native folder work.

## Corrections

1. **Independent selected-body acquisition.** Warm eager surfaces sharing a center acquire their selected owners independently. Duplicate owners share one read within an observation. Only ready groups enter a serialized compiler/publication lane; each successful extension includes previously successful inputs. The same canonical host/compiler owner still decides every role, direction and evidence precedence. Partial recovery remains read-only, without complete-neighborhood, canonical graph, source-catalog or write authority.
2. **Cooperative folder cancellation.** The native folder compiler's caller guard now includes request identity, structural revision and the original selection-settings signature. Superseded work exits at the next existing cooperative boundary, before further candidate windows. Final publication guards remain in place. Native membership still comes directly from Obsidian, without Markdown reads or a recursive subtree build.

## Compatibility and lifecycle work exposed by the fixes

- A synchronous old/new canvas lease replacement is coalesced before body acquisition. Unchanged failing inputs retain their existing attempt receipt and are not polled by re-renders.
- Real demand/source/policy changes wake a retired recovery observation while native I/O remains pending. Late continuations cannot publish under the retired observation. Final demand release, purge and unload release the foreground task before the held read settles. There are no new retry timers or polling loops. Obsidian's underlying read itself is not forcibly aborted.
- Successful read certificates retain only their selected parsed bodies, permitting later extensions without reacquiring a certified peer. This is scope-local retention, not a durable/global cache or a raw-text copy. The existing per-surface 64 MiB requested-body guard remains independent between groups. Successful unions may contain several surfaces; the guard is not a single total-memory bound. Replacing/releasing the recovery scope releases its certificate ownership. Exact source, policy, demand, native identity/stat/event and metadata-object checks fence acquisition and publication.
- Cancelling an old folder operation can make it finish earlier than its actual replacement. Its awaiters therefore join the newer request. If the old caller still holds a higher-priority scheduler lease, the current replacement is re-admitted at that priority instead of waiting on a lower-priority checkpoint behind its own caller. The obsolete lower-priority pass cancels through the same request guard. No second scheduler is introduced.
- Optional acquisition/compiler failures stay local to their surface. A failed peer cannot erase an already successful group or poison the publication lane.

## Regression coverage

The permanent `tests/on-demand-indexing.test.mjs` suite now covers both original group orders with a peer held pending; late peer completion; groups added/released during pending I/O; policy supersession; reuse of previously certified selected bodies; final-demand release, purge and unload before read completion; request/structural folder cancellation; replacement-waiter readiness; and cross-priority replacement progress. The 130-member cancellation case expects zero obsolete candidate windows after the replacement takes over. Existing native-move, alias, selected-owner finality, independent byte-budget and unchanged-attempt assertions are preserved.

The final focused command under Node 22.22.3 passed 35/35:

```sh
node --test --test-name-pattern='pending warm recovery|superseded native|shared-center|two visible folders|ordinary alias patch|selected recovery preparation|finite recovery fences' tests/on-demand-indexing.test.mjs
```

Preparation work remains approximately linear: 1,559 and 6,119 file lookups for 40 and 160 selected neighbors. These are synthetic-host operation counts in real Chromium, not native elapsed-time, actual-paint or production thermal measurements. Installed-type checking (`npx tsc --noEmit`) and `git diff --check` passed before full verification.

An earlier exploratory run found read-order and unchanged-input retry mistakes; the complete affected suites also caught shortened folder readiness after cancellation. Those implementation mistakes were corrected without weakening their assertions. A newly added policy probe initially used a nonexistent `Neighborhood.next` field; it now uses the existing `neighbours(page, "next")` contract. A released-body probe now checks retirement of selected input authority, since an independently valid hot body may legitimately remain readable. None of these intermediate failures is retained as a baseline error.

The first full-verification run was deliberately stopped before native staging to address the cross-priority wait found during source review. Its outer driver restored the disposable vault's original artifacts/configuration/layout. The final run restarts the full standard verification on the frozen corrected patch.

## Final verification

The frozen corrected patch passed the complete standard `npm run verify` through `scripts/testing/obsidian/verify.mjs`: architecture **9/9**, core **130/130**, main **1,679/1,679**, UI browser **403/403**, portable sources **357/357** and source browser **839/839**. Total: **3,417 tests, zero failures**. The source-browser lane took 939.86 seconds. Its unchanged 20,015-owner cached-incidence test passed in 260.77 seconds, preserving exact metadata, evidence, gates and degrees with no I/O during the measured publication. The real production build against installed Obsidian typings, scanner and whitespace checks passed.

The exact production build passed the native smoke and all **12 targeted native check groups** in `kplex-test-small`, under Node 22.22.3 / Obsidian 1.15.0 (installer 1.14.0). These include a healthy selected peer publishing while the other native read remains pending, retention of both roles after that read finishes, and cancellation before native candidate windows while a P1 caller supersedes a P2 replacement. The previous nine native checks also remain green.

The outer driver restored original executables, settings bytes, enablement bytes and workspace layout. Independent executable hash checks passed. A read-only post-check confirmed zero owned fixture folders, no retained controller and the original plugin loaded. The interrupted exploratory Chromium orphan and its owned temporary profile were also removed. Production vaults were not accessed.

Runtime/test hashes remain identical to the frozen verification input. Native source and artifact hashes match the tested build. The tracked patch SHA-256 is `3840ecdd74322a15f80dc9825db75b20429f5f8b526239adc292a3d4666ce871`. Exact source identities, commands, full native receipts and cleanup evidence are saved in the [companion JSON receipt](ontology-index-recovery-pending-work-2026-10-29.json).

I repeated **“Evaluate the regression risk of this PR”** against the corrected acquisition, compiler, proof-retention, replacement, priority and teardown boundaries. No further confirmed regression or merge blocker was found. Normal asynchronous event interleavings remain a residual risk; successful parsed-body retention is deliberately finite and scope-owned. These checks establish macOS native behavior and Chromium contracts, not physical mobile, new Windows-host, actual-paint or production thermal certification. No additional manual test is required for these reproduced findings. Changes remain uncommitted.
