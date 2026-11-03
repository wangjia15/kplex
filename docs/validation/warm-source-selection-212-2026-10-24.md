# Warm source-head selection — PR212

This is the initial `af09bc4` baseline record. Main subsequently accepted #211 while final acceptance
was running; see the [accepted-main integration record](warm-source-selection-212-main-integration-2026-10-24.md)
for current-baseline results. Historical measurements and failures below remain unchanged.

## Decision and scope

The candidate removes one redundant head-only transaction per healthy current-format owner in
unchanged restart host comparison. It preserves independent protected metadata authentication and
adds an exact revision/sequence check to that reader's existing lease-retirement transaction.
This is a small coordination saving, not a new cache, schema, scheduler or indexing architecture.

Prepared by **Zsolt's Codex Agent** for [draft PR212](https://github.com/zsviczian/kplex/pull/212).
The fixed accepted baseline is `af09bc42d78abe03ed0d32e0edcdf22d0ebe08ae`, including #210.
The planning branch started at `740c85cd9df85b78ced33b165c498a30b7dc3f26`.
No #211 runtime work was imported. Historical #205/#206 timings are motivation only; the present
comparison rebuilds the two actual source owners from accepted main and the candidate.

## Causal trace and correction

Previously `reconcileRestartHostInventory()` inspected each head, then called
`ensureLocalDependencies()`, whose readonly owner/journal/state selection already reads that head.
`durableHostInventory()` subsequently obtains an independent protected metadata reader. Complete
`reconcile()` also performs later owner checks and final inventory/projection closure.

`inspectWithLocalDependencies()` shares only the clean dependency/head observation. Memory,
unsaved/deletion overlays, activation changes, unknown owners, repair and legacy cases retain the
ordinary inspect/ensure path. In particular, legacy primary authentication still precedes repair.
No family lease, authentication receipt or selected head survives into an unrelated operation.

The metadata visit still owns the #205 combined pin/fetch, SHA checks, frame/posting/manifest
validation, decode reservation and original-connection lease retirement. Its optional expected head
must match both before consumption and during that existing retirement transaction. The latter
adds `sourceHeads` to that transaction's scope; there is no additional final transaction. Failure
or abort returns non-ready and retains conservative durable protection where deletion failed.
The enclosing native TFile/incarnation/stat, MetadataCache, Date/Daily Notes, priority/cancellation
and final dependency-projection fences remain in place. Consumed facts stay private until ready.

The [initial proposal](https://github.com/zsviczian/kplex/pull/212#issuecomment-6382014022)
preceded production edits. A controlled independent writer during an awaited SHA exposed a
candidate finality gap: the old immutable bytes authenticated but the selected head had changed.
The [revised proposal](https://github.com/zsviczian/kplex/pull/212#issuecomment-6382160741)
documents the retirement fence and corrects the prediction: **transactions decrease; head-get
request totals do not decrease on the clean path**. The failing sample was retained.

## Controlled comparison

Node **22.22.2**, real installed dependencies/Obsidian declarations and Chromium IndexedDB.
`node scripts/testing/warm-source-selection.mjs compare` runs serial fresh profiles, with actual
browser restart after seeding and a second actual restart after an ordinary edit. Only the two
runtime files differ; executable/source hashes and every declared arm are retained in the
[sanitized receipts](warm-source-selection-212-2026-10-24.json).

Lightweight timing includes the **whole awaited reconciliation**, normal retirement and flush.
Native accounting uses separate arms. Renderer ProcessTime is CPU for the renderer process;
TaskDuration with threadTicks is main-thread task CPU. Neither includes Browser/storage-process
CPU. No build, other test or native indexing was launched during these comparisons.

| Complete unchanged pass | Order | Baseline ms | Candidate ms | Baseline renderer CPU ms | Candidate renderer CPU ms |
| --- | --- | ---: | ---: | ---: | ---: |
| 32 owners | A, F | 49.960 | 44.703 | 43.549 | 37.884 |
| 128, pair 1 | A, F | 160.352 | 150.314 | 113.582 | 109.757 |
| 128, pair 2 | F, A | 157.781 | 145.867 | 112.402 | 108.787 |
| 128, pair 3 | A, F | 154.769 | 156.900 | 112.797 | 115.743 |
| 256 owners | A, F | 306.558 | 281.703 | 218.906 | 202.933 |

At 128 owners, medians improve **4.7% elapsed / 2.7% renderer CPU**. Pair 3 is adverse:
**1.4% slower / 2.6% more renderer CPU**; it is retained, without retry or exclusion.
The prior no-change control used identical A/F bundle hashes: 160.223/159.876 ms and
114.520/114.863 renderer CPU ms at 128 owners. These observations support a modest useful saving;
three pairs cannot establish statistical certainty or a production-vault speedup.

| Separate diagnostic arm | Transactions A → F | Head gets A → F | Hashes A/F | Decodes A/F | Lease adds/deletes A/F |
| --- | ---: | ---: | ---: | ---: | ---: |
| Host comparison, 32 | 130 → 98 | 96 → 96 | 96 | 32 | 32/32 |
| Complete reconcile, 128 | 777 → 649 | 640 → 640 | 512 | 128 | 128/128 |
| Complete dense/multichunk, 2 | 31 → 29 | 10 → 10 | 18 | 6 | 2/2 |
| Complete mixed current/legacy, 2 | 29 → 29 | 12 → 14 | 17 | 5 | 7/7 |
| Complete mixed family revisions, 2 | 21 → 19 | 10 → 10 | 8 | 2 | 3/3 |

The two-owner legacy control contains one current-format and one legacy owner. The current owner
saves one transaction; the legacy owner adds one optional probe transaction, giving no net saving
and two additional head requests in this control. A legacy-heavy inventory can therefore pay
additional coordination cost. No legacy gain or unchanged legacy latency is claimed. All diagnostic transactions completed with zero pending/aborted transactions. Hashes,
decode counts and leases are unchanged within each matched arm.

The optional probe is not free on exceptional owners: a genuinely missing head still falls back to
ordinary inspection after the owner/head transaction, adding one readonly transaction at that
boundary. This is a known tradeoff of the conservative fallback. These warm comparisons do not
measure an empty-cache cold-start latency change or claim a cold-start improvement. Existing cold
source, storage-unavailable and foreground correctness/performance guards remain unchanged.

All **20 final arms passed**. Each retained exact unchanged selected heads, independent fresh-host
compiler versus cached replay parity (including provenance/multiplicity), no body reads/parses or
source replacements in the warm interval, a quiet tail without shifted work, an actual later edit,
retirement, and an actual second restart with exact post-edit head/semantic parity. The semantic
digests also match between baseline and candidate arms. Follow-up edits were 14.6–18.7 ms; the
third 128-owner reopen was adverse (168.4/180.8 ms), while the other timed reopen pairs improved.

Profiles were serial and deleted before the next arm. The largest sampled final profile was
under 10 MiB, against a 256 MiB bound and a 2 GiB minimum-free-space preflight. These are sampled
high-water marks, not continuous disk or heap peaks. This comparison created no private database
dump, additional large fixture, deleted Brain-copy restoration or new native vault. Complete
verification separately retains the repository's existing 20,015-owner synthetic publication test.

## Correctness and retained failures

The 36 focused real-browser contracts passed after fixture corrections. They cover exact revision
and sequence, independent writer before delivery and during SHA, held async consumers, final-read
and lease-retirement faults, memory/unsaved masks, tombstone, activation, cancellation/close,
malformed derivative owner, actual interrupted count repair, supported owner upgrade, primary URL
and metadata corruption, dense families, same-stat modification, new TFile identity, rename/delete,
MetadataCache replacement, unload, and Date/Daily Notes changes during complete reconciliation.
All normal scenarios require zero readers, decode reservations and owned leases on completion.
The deliberate retirement failures assert conservative retained protection, then restore only
their exact test-owned keys. Three harness controls reject incomplete readiness, shifted work and
independent semantic-oracle failure. These suites are included in normal `npm test`.

The first test run incorrectly assumed parser2 URL-bearing sources are unsupported. It was replaced
with actual corrupted legacy URL authentication; production compatibility was preserved. Repair
fixture iterations initially produced private reclaim rather than selected count repair because
alias-only changes preserve dependency memberships, and another field still occurred in values.
The final fixture changes a genuine metadata-only field membership, interrupts real activation,
and checks old/new membership and journal closure. Original failures remain identified in receipts;
they were not counted as successful samples.

The initial full verification exposed an existing cancellation test injecting `resolved` through
`ensureLocalDependencies()`. On the new clean path that method is a later projection check, so
the injection occurred after host comparison (one comparison instead of zero). The hook now tests
both the new shared pre-comparison selection and the original ensure fallback through a supported
legacy owner. All original assertions remain: one injected event, zero host comparisons, no source
authority from the cancelled pass, and successful fresh reconciliation. No production fence or
assertion was relaxed. The failed full run is retained; a fresh complete run is required.

## Full and native acceptance

`npm run verify:obsidian` passed with Node 22.22.2 on macOS (Darwin 23.5.0), including
release/architecture/core checks, lint, 1,420 functional tests, 227 browser UI tests, 357 portable
source tests, **772 real-IndexedDB source tests**, and the real TypeScript/production build. These
are per-command totals, not unique contracts. The existing 20,015-owner publication case passed
in both full runs. The first full run's obsolete cancellation hook failed as documented above;
the corrected two-path guard and the second complete run passed without assertion relaxation.

The exact built/staged `main.js` SHA-256 is
`3a4893c15ee81c712913b4c58ad42511a9aa6796173556f68c2be25c7603b3ce`.
Manifest/styles hashes are in the receipts. This artifact was built from the planning HEAD plus
the measured working-tree runtime hashes, before the implementation/report commit; its build ID
therefore carries the planning revision and dirty marker. It is not misattributed to a later clean
commit. GitHub CI separately checks the final committed head.

Only existing **kplex-test-small** was used natively: CLI-confirmed path, 74 Markdown / 76 visible
files, Obsidian **1.15.0 (installer 1.14.0)**, Electron **43.3.0**, Chrome **150.0.7871.212**,
AC power, real foreground and original background throttling. No other native vault was opened.

| Exact-build native check | Result |
| --- | --- |
| Strict staging and smoke | Passed; three artifact hashes match, registered command, rendered `.kplex-app`, no captured JS errors |
| Existing protected metadata component, 16 sources | Passed; 32 transactions, 48 hashes, 16 lease adds/deletes; exact facts/heads; zero owned lease/reader/decode debt |
| Shared selection + protected metadata, 16 sources | Passed; 48 transactions, 48 head gets, 48 hashes, 16 lease adds/deletes; exact facts/heads; zero owned debt |
| Deliberate failure after first shared read | Expected failed scenario; wrappers/controller/configuration cleanup passed, zero owned leases/readers/decode |
| Two foreground warm plugin reloads | Passed; unchanged selected-head digest/settings, strict readiness 3.136/3.162 s, zero source Markdown reads/parses/repairs and zero full builds |
| Foreground inventory workflow | Passed all six folder/gate, navigation, link create/remove, node-create and visible-edit cases while background inventory was held; resumed normally; zero source flush joins |
| Final restoration | Passed; original settings, workspace, core/community enablement and installed artifacts byte-exact; all fixture content unchanged; selected renderer exited and original closed startup state restored |

The first reader row is the metadata component alone; the second adds selection/finality. They are
not native A/B timing arms. Shared-chain counts corroborate the browser trace, without attributing
all process-wide incidental activity to the caller. Warm reloads are functional observations, not
native speedup estimates. Their instrumentation recorded 15 source-acquisition checks and 16 reused
bodies per run, despite zero source Markdown reads/parses/repairs and unchanged selected heads;
this is not a claim of zero acquisition entry calls. Foreground API elapsed time includes awaits
and is not a synchronous-task or actual-paint measurement.

The initial restoration guard stopped before file writes because the application registry retained
`open=true` after window close. The exact recorded Small renderer had exited. Offline restoration
then verified all captured bytes and the original 76-file content digest, and reset only Small's
startup flag. An OS Accessibility query was unavailable; no permissions were changed and no other
vault was opened. Inherited durable protection was never erased or counted as newly leaked.

Reproduce the native checks after strict staging with the three explicit Small-vault variables and
a fresh report directory per driver: `node scripts/testing/obsidian/cachedSourceReads.mjs`, then
`KPLEX_CACHED_READ_SELECTION=1` on that driver; add `KPLEX_CACHED_READ_FAIL_AFTER_FIRST=1` for the
expected cleanup failure. Use `KPLEX_SI5_RESTART_RUNS=2 node scripts/testing/obsidian/startup.mjs`
and `npm run verify:obsidian:foreground` serially. Restore the original test state afterward.

The report pins local/browser/native evidence. Branch publication, exact remote head and final
remote CI are verified after this report's commit and recorded on [PR212](https://github.com/zsviczian/kplex/pull/212),
not inferred from local passes. Keep the PR draft for independent review; no merge/release or
production deployment is authorized. No additional manual check is required for these scoped
contracts. Recommend the narrow correction for review with the measured modest gain and explicit
fallback costs, rather than a broader indexing campaign.

The unavailable deleted large Brain copy is outside scope. Existing `kplex-test` contains 20,015
Markdown files by filesystem inventory but supplies no native scale/performance result here. No
physical-device, Windows, minimum-host or actual-paint performance acceptance is claimed.
