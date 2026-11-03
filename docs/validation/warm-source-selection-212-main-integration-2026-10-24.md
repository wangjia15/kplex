# PR212 — accepted-main integration acceptance

The first sections preserve the completed `6fa936d` acceptance. Main subsequently accepted #213 as
`d48f76641df149dd5bb4d000fe9764251ece9807`; the latest integration section below records that pass
separately. No historical timing, artifact identity or failure is reassigned to another tree.

## First integration: merged #211

Prepared by **Zsolt's Codex Agent**. Accepted main advanced to
`6fa936d6522ba45f2c6bb2dfb853671e5218b055` (merged #211) during final PR212 acceptance.
CI441 and CI442 passed the preceding branch, but final readback found a HANDOFF conflict with the
new main. This record covers the normal main integration and its fresh acceptance; it does not
relabel the [initial af09bc4 evidence](warm-source-selection-212-2026-10-24.md).

The accepted #211 changes do not modify `SourceRepository.ts` or `sourceAcquisition.ts`. Their
baseline bytes match af09bc4, and PR212's candidate bytes are unchanged. Other accepted runtime
modules are now present in both comparison bundles. Relative to 6fa936d, these remain the only two
production files changed by PR212. No unmerged #211 work or history was modified.

The conflict resolution retains the #212 handoff/standing header, the accepted stable-gates test
command, and all new warm-selection test entries. No schema, scheduler, compiler, graph-publication
or gate semantics are changed by the resolution. The original exact-head/lease-retirement contract,
focused tests and failure analysis remain in the initial report. C15–C26 remain paused.

## 6fa936d comparison

Node 22.22.2; `node scripts/testing/warm-source-selection.mjs compare`, now pinned to 6fa936d.
Same predeclared serial 32/128/256-owner matrix, three alternating 128-owner pairs and bounded
dense/legacy/shared-revision controls. No agent build, other test or native indexing overlapped.
The [receipts](warm-source-selection-212-main-integration-2026-10-24.json) retain every arm,
source/bundle hash, transaction/request total, semantic digest, follow-up edit/reopen and cleanup.

| Complete unchanged pass | Order | Baseline ms | Candidate ms | Baseline renderer CPU ms | Candidate renderer CPU ms |
| --- | --- | ---: | ---: | ---: | ---: |
| 32 owners | A, F | 47.347 | 46.551 | 41.978 | 37.999 |
| 128, pair 1 | A, F | 159.535 | 147.442 | 114.944 | 109.826 |
| 128, pair 2 | F, A | 161.924 | 148.115 | 114.876 | 110.024 |
| 128, pair 3 | A, F | 158.421 | 148.097 | 114.844 | 110.279 |
| 256 owners | A, F | 319.415 | 282.686 | 224.419 | 205.528 |

6fa936d 128-owner medians improve **7.2% elapsed / 4.2% renderer CPU**. This is a small
synthetic workload, not a production-vault percentage. The earlier adverse pair remains retained;
the different cohort medians are not attributed to #211. Renderer CPU excludes Browser/storage
process CPU; detailed accounting remains separate from primary timing.

Counts are unchanged from the causal trace: 32-owner host comparison **130 → 98** transactions;
complete 128-owner reconciliation **777 → 649**. Head gets, hashes, decodes and lease counts remain
equal. All **20 current-baseline arms passed** exact unchanged heads, independent semantic/provenance
parity, quiet-tail closure, an ordinary edit and a second actual browser restart. All owned profiles
were deleted. The sampled profile maximum stayed below 10 MiB, against the unchanged 256 MiB
profile ceiling and 2 GiB free-space preflight; this is not a continuous disk or heap peak.

The tradeoffs remain: a clean current owner saves one transaction; a legacy owner adds one optional
probe transaction. The mixed two-owner legacy control therefore has no net saving and adds two
head requests. Genuinely missing heads also add one probe transaction before ordinary inspection.
Empty-cache cold-start and legacy-heavy latency are unmeasured. All adverse follow-up observations
remain in the receipts, including the slightly slower 256-owner edit (16.521/16.567 ms).

## 6fa936d verification and native acceptance

Integrated **`npm run verify:obsidian` passed** with Node 22.22.2, actual dependencies/Obsidian
typings and the real production build. All per-command groups passed: architecture 7, core 130,
functional 1,420, browser UI 228, portable sources 357 and **real-IndexedDB sources 775**. These are
not unique-test totals. The additional accepted-main cases are included, the two-path cancellation
contract passes, and the 20,015-owner publication case passes in 249.419 seconds. No assertion,
fixture size, timing budget or deadline was weakened.

The integrated built/staged `main.js` SHA-256 is
`8f613477a4b94c590533ac7d53164de25c1c550e1fb7b7bc986ac7bfae56c401`.
Manifest/styles hashes remain in the receipts. The artifact was built before the merge/report commit,
from the accepted-main integration working tree on `16cdb2d`; its build ID therefore includes that
pre-merge revision and dirty marker. The receipt pins the actual runtime sources, baseline and
executable bundles; this is not a claim that the artifact was built from a later clean commit.

Only existing Small was opened: Obsidian 1.15.0 (installer 1.14.0), Electron 43.3.0 /Chrome
150.0.7871.212, AC power, real foreground and original background throttling. A fresh backup and
CLI path guard preceded staging: 74 Markdown /76 visible files, originally closed.

| Integrated exact-build native check | Result |
| --- | --- |
| Strict staging /registered command /rendered DOM /captured JS errors | Passed, exact three artifact hashes |
| Protected metadata component, 16 existing sources | Passed; 32 transactions, 48 hashes, 16 lease adds/deletes; exact facts/heads; zero owned debt |
| Shared selection and protected metadata, 16 sources | Passed; 48 transactions, 48 head gets, 48 hashes, 16 lease adds/deletes; exact facts/heads; zero owned debt |
| Deliberate failure after one shared read | Expected failure; independent wrapper/controller/config cleanup passed, zero readers/decode/owned durable leases |
| Two warm reloads | Passed; strict readiness 3.194/2.856 s, unchanged source heads/settings, zero source Markdown reads/parses/repairs and zero full builds |
| Six foreground inventory workflows | Passed with held background inventory; resumed normally, zero source flush joins, no fixture/controller left |
| Fresh-state restoration | Passed; settings/workspace/core/community enablement/original artifacts byte-exact, all 76 visible files and content digest unchanged; exact selected renderer exited, original closed startup flag restored |

The first two reader rows cover different operation scopes, not native A/B timings. Warm counters
include 15 source-acquisition checks and 16 reused bodies per run; zero physical reads/parses is not
zero entry calls. Native elapsed observations are functional evidence, not production speedup,
exclusive CPU, synchronous task duration or actual paint. Inherited protection was not erased or
counted as newly leaked. Restoration uses the exact recorded renderer's exit before offline writes,
without reopening another vault or changing OS permissions.

All current-baseline profiles and native fixtures are retired. The normal accepted-main merge and
validation files are published together after these checks; remote head/status are read back on
PR212 after the commit. Historical CI441/CI442 remain green on their original tree and do not
substitute for the new integrated-commit CI.

The original 50 ms URL-heavy and 45 ms parser assertions, all correctness assertions and normal
test deadlines remain unchanged. Only existing Small is used natively. No deleted Brain copy,
new native vault, private database dump or additional large synthetic fixture was created. The
repository's existing 20,015-owner verification test remains enabled.

Final remote CI belongs to the integrated commit and is recorded on [PR212](https://github.com/zsviczian/kplex/pull/212)
after this report's commit. Keep the PR draft for independent review; no PR merge, release or
production-vault deployment is authorized. Production-scale speedup, Windows/minimum-host and
physical-device acceptance remain unclaimed. No additional manual check is required for the scoped
source contracts. Recommend the narrow correction for independent review with the measured
current-format benefit and explicit legacy/missing-head costs.


## Latest integration: accepted #213 /d48f766

Main advanced again after the 6fa936d checks completed. Accepted #213 changes Sidecar modifier-click
UI/actions and their translations/tests, not either #212 production file. A normal merge preserves
all accepted changes and resolves only HANDOFF. No source/history of #213 is modified.

The same twenty-arm comparison is repeated against d48f766 with fresh serial profiles. All arms
pass exact head/semantic/provenance, quiet closure, normal edit, actual reopen and profile cleanup.
The [latest receipt section](warm-source-selection-212-main-integration-2026-10-24.json) retains all
observations and executable/source identities alongside the 6fa936d and initial af09bc4 records.

| Complete unchanged pass | Order | Baseline ms | Candidate ms | Baseline renderer CPU ms | Candidate renderer CPU ms |
| --- | --- | ---: | ---: | ---: | ---: |
| 32 owners | A, F | 48.428 | 44.761 | 42.423 | 38.051 |
| 128, pair 1 | A, F | 161.786 | 144.798 | 115.239 | 107.193 |
| 128, pair 2 | F, A | 156.229 | 148.578 | 111.213 | 110.448 |
| 128, pair 3 | A, F | 161.002 | 149.053 | 115.205 | 110.517 |
| 256 owners | A, F | 305.515 | 299.959 | 219.477 | 213.933 |

Latest 128-owner medians improve **7.7% elapsed /4.1% renderer CPU**. The one-transaction-per-clean-
owner reduction, unchanged authentication/request totals and legacy/missing-head tradeoffs remain
identical. Differences between cohort gains are not attributed to either accepted UI change, and
no production-scale, cold-start or legacy-heavy speedup is claimed. The original adverse samples
remain retained; this is accepted-baseline integration, not outcome-selected retrying.

The d48f766 and 6fa936d benchmark bundles are **byte-for-byte identical**, confirming the accepted
Sidecar change is outside the timed workload. The repeated results still retain every sample;
variation is not attributed to a source change in the measured operation.

Combined **`npm run verify:obsidian` passed** with pinned Node 22.22.2, actual installed typings,
real build, and all per-command groups: architecture 7, core 130, functional **1,425**, browser UI
**228**, portable sources **357**, real-IndexedDB sources **775**. An idle Node test worker delayed
this run after its final passed test, then exited without intervention. Read-only process metadata
showed 0 CPU at that observation; its retention cause is unproven. No worker was killed, assertion
changed or deadline extended to obtain this pass.

Latest exact built/staged `main.js` SHA-256:
`2c883e0ebec3b86a0fbb6c8500bd91dae535610d79cbb7c49cdb55091062b686`.
It was built from the pre-commit d48f766 integration tree on HEAD `30c37d3`, with its dirty build-ID
marker. Actual source/bundle/artifact hashes are pinned; no later clean-commit attribution is made.

All latest exact-build native checks passed again: registered command/rendered DOM/error smoke;
the sixteen-source protected component (32 transactions/48 hashes), sixteen-source shared selection
(48 transactions/48 head gets/48 hashes), and expected-failure cleanup with zero owned reader/decode/
lease debt. Both warm reloads retain exact selected heads/settings, with zero source Markdown
reads/parses/repairs and zero full builds (3.151/3.163 s functional observations). All six foreground
inventory workflows pass, resume normally and make zero source flush joins. These are awaited API/
DOM observations, not synchronous-blocking, paint or production-vault speedup measurements.

Fresh Small restoration passed: settings/workspace/core/community enablement/original artifacts
byte-exact; 74 Markdown /76 visible files and their content digest unchanged; exact tested renderer
exited and original closed startup flag restored. No other native vault was opened or modified.
The user agreed to hold main stable through the final CI window.

The accepted-main merges, conflict resolution and current evidence are published on the existing
branch. Final integrated head and complete CI are verified after this report commit and recorded
on PR212; earlier green CI441/CI442 are not promoted to this latest application bundle. Keep the
PR draft for independent review, with no PR merge/release/production deployment.
