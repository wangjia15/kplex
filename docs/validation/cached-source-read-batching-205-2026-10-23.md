# Cached-source read sharing — PR #205

Prepared by **Zsolt's Codex Agent**, 2026-10-23. Scoped implementation and required local/Windows validation are complete. Implementation checkpoint `8b1df5764d4799960a64ee2b149566b6278d0516` is published and its remote identity verified. Keep #205 draft for maintainer review; no merge, release, main write or production-vault deployment occurred.

## Baseline and ownership

The common accepted runtime baseline is `0f94252aabb8b23458b5df192380854ea0bddd53`, including merged #201/#203/#204. Initial branch head was documentation-only `b5976da64db5f0c7e09bb7a8c116d3b7e47d8d91`. Production source SHA-256 at the baseline is `951ce4e86ad1bea9b86a53d7efad1c2e4375e3eda38e220b4933409510a337ef`.

The baseline was rebuilt with actual installed typings/dependencies and Node **22.22.2** before candidate source changes. Its installable artifacts are:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `46bcd36b14291169465f98f0c2635ffb331d576eb84177d1e030281a90dc15d1` |
| `manifest.json` | `3395e425860e5068e9f3b3d9a0e3d58cefd2c11dededc690beb87f60e733ed7d` |
| `styles.css` | `88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974` |

Windows owns `SourceRepository` reader/lease paths and their tests. Companion #206 owns startup convergence/admission/event qualification. No companion branch is imported, edited or deployed. The first correction does not edit `sourceAcquisition.ts` or its shared call sites. The exact private API/safety proposal was [posted in #205](https://github.com/zsviczian/kplex/pull/205#issuecomment-6362396841), referencing #206. Any later shared-seam change requires a new explicit proposal first.

## Characterization and first correction

Actual `durableHostInventory()` calls `repository.visit(metadata)`. A healthy current-format single-chunk source uses three native transactions: atomic selected-head plus persistent family protection, protected chunk plus first bounded posting page, and original-connection lease release. This is different from `readSelected()`, whose stronger selected-head checks add transactions; those are not incorrectly assigned to this caller.

A real Chromium IndexedDB characterization test on the unchanged runtime reached the expected failure: **3 transactions versus the proposed 2**, after verifying exact facts/head, lease additions/deletions and SHA calls. Its failed baseline receipt is retained privately.

The correction shares the first protected metadata fetch with the existing atomic selection transaction. Every durable family lease, hash/frame/posting check and existing final freshness fence remains. JSON preview is bounded by the existing target size; crypto, arbitrary callbacks and host yields remain outside the transaction. Prepared data and its decode reservation belong to the selected view until explicit transfer or retirement. No cross-owner cache, public reader model, schema, scheduler, readiness/retry policy or resource-budget increase is introduced. Dense, oversized, legacy, memory and uncertain cases keep the ordinary path. Ineligible ordinary metadata pins still have an expanded write-transaction store scope, but issue no speculative chunk request. Native transaction lifetimes include queueing/event dispatch; they cannot prove exclusive write-lock duration.

Final runtime source SHA-256 is `534a061e64ddfe7a609cc774788567ec8ba6afc4c953ea556e7ff9834fe4c63e`. Initial characterization used pre-format `ed55d16cd3efeaeba127e26f53b968326c2d0842486daaeeb4eb627effc63b3e`; retain that separately. Helper indentation/line-ending normalization accounts for the source identity change. Final-cost measurements below use `534a061e…`.

The guarded native baseline demonstration consumed sixteen existing metadata sources in Small (88 Markdown notes/107 files) through actual `durableHostInventory()`: **48 transactions, 80 store requests, 16 lease-add/delete attempts and 48 hashes**, with unchanged facts/heads and zero readers/decode reservations afterward. That first native probe did not independently query durable retirement; the real-IDB comparison arms separately verify committed mutations and zero remaining leases for both runtimes. Host: Obsidian 1.14.5, Electron 43.3.0, Chrome 150.0.7871.212; one Small window, on AC power, background throttling enabled, document hidden. Native prototype totals cover the interval and can include incidental activity; they are not exclusive caller attribution or CPU timing.

## Predeclared measurement protocol

- Compare the exact accepted source with the candidate using real Chromium IndexedDB and actual production `durableHostInventory()` plus complete `reconcileRestartHostInventory()` call paths. Host facts are deterministic fixture doubles, not private vault data.
- Seed healthy durable sources outside timing, then start each arm in a fresh disposable browser process/profile using the established harness. Run serially in alternating A/F and F/A order: 64/128/256 owners, with three matched representative pairs at 128. Do not overlap builds, suites or native indexing with acceptance measurements.
- Count direct native transactions, including original-connection release, requests, committed lease additions/deletions, hash/decode work and bytes separately from lightweight timing. Detailed runs include tiny, shared-revision, dense/multichunk and legacy controls. Diagnostic timings do not become primary CPU evidence.
- Lightweight timing uses existing CDP cumulative renderer `ProcessTime` and main-thread task endpoints. [Chromium's implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/inspector/inspector_performance_agent.cc) obtains `ProcessTime` from the current process's cumulative CPU usage; `threadTicks` controls the separate task endpoint. Renderer threads are already included; Browser/storage-process CPU is excluded. No exclusive store CPU or whole-Obsidian savings claim follows. Retain raw endpoints and per-arm process/target/version identities.
- Complete all reader/lease/decode cleanup before ending each measured interval. Assert unchanged heads and zero unintended source writes/body reads/parses. Include a later genuine edit, old-revision reclamation, browser restart and reopened read separately. Oracles stay outside timing.
- Record heap samples as samples, not allocation or true peak usage. Fresh processes do not establish equal physical storage, OS-cache or heap state. No forced GC, pacing change, hidden work deferral or post-hoc tolerance.
- Success requires exact authenticity/recovery/interaction closure, deterministic coordination reduction without removing lease work, and useful improvement in representative complete cost. Preserve all pairs, unfavorable results and incomplete receipts. If CPU remains uncertain, state that limit; transaction counts are not CPU shares. Do not expand into a generic profiling campaign.

## Portable Windows safety-fixture checkpoint

The inherited Mac guard test reproduced Windows `EPERM` at directory `symlinkSync` under Node 22.22.2. The separate tooling correction uses a native directory junction on Windows and a directory symlink elsewhere. It asserts that the alias is actually symbolic and resolves to the intended target before the unchanged safety guard rejects it. No assertion is skipped or weakened. All **22** tooling tests pass, zero skips. This checkpoint is published as `b8fac4f2a0426e13c66a692d8ba9b75b2ece344a` on #205; no Mac-thread edit is required.

## Verification checkpoint

The corrected expanded focused suite passes **11/11**, zero skips. Two initial new-fixture failures are retained: the writer emits an empty terminal chunk after exact limits, and an aborted native release may close its original connection. Exact-boundary fixtures now retain every fact/posting while forming authenticated single-chunk boundaries; failed-release cleanup uses the independent live connection. No runtime correction was needed for those fixture failures.

Full `npm run verify` and strict `verify:obsidian` passed on Node 22.22.2 with real installed dependencies, typings and production build: architecture/core/lint, main 1355, DOM 227, portable-source 357 and real-IDB 690 test executions all pass with zero skips. The 20,015-source complete cached-center incidence case passes in 313.176 seconds, including exact metadata/evidence/gates/degrees. It is correctness evidence, not a new acceptance benchmark. Exact-build staging/smoke in guarded Small passes.

Final native caller demonstration passes: **32 transactions, 80 store requests, 16 lease-add/delete attempts and 48 hashes** for sixteen saved sources. Exact facts/heads are unchanged; independently queried durable leases, active readers and decode reservations are all zero. The intentional failure after one read exits as expected with wrapper/controller/configuration cleanup and independently verified zero durable leases/readers/decode bytes. It remains a failed scenario receipt, not relabeled a successful workload. Candidate document visibility is visible versus the initial baseline's hidden state; native counts are diagnostic intervals, not comparable CPU or latency measurements.

Candidate `main.js` SHA-256 is **`7fa00a354d38fb2cedecbb9d15c5277e0513813b7074d487f5ebda9820c2b79f`**. Manifest/styles retain the baseline hashes. Windows is 10.0.26200; native host is Obsidian 1.14.5 (installer 1.14.0), Electron 43.3.0 / Chrome 150.0.7871.212 with embedded Node 24.18.1. Drivers, builds and portable/browser suites use Node 22.22.2. Only disposable Small was open; AC power and background throttling remain recorded. Sandbox process creation error1909 required the working regular Windows process context; no source or comparison preparation changed.

All affected native interaction/recovery acceptance passes. Raw receipts stay private under `kplex-205-validation` and the measurement harness's task-owned temporary directories.

## First complete cost cohort

Private receipt: `kplex-cached-source-read-pr3zHN`, Node 22.22.2, Headless Chrome155.0.8059.82. All twelve arms passed. Synthetic actual production acquisition/repository methods use host doubles; GraphIndex's optional background checkpoint is absent. This isolates the production consumer, not full application scheduling or foreground latency. Target/browser identities are retained; this is not complete OS process birth/exit CPU accounting. Each arm owns a fresh process/profile/database; later reopen restarts that browser with the same owned profile.

Sixteen-source diagnostics: metadata component **48→32 transactions** (−33.3%); complete restart inventory **82→66** (−19.5%). Requests remain80/164 respectively; sixteen lease creations/deletions,48 hashes,16 decodes and3798 chunk bytes are identical. Dense fallback and legacy-owner authentication retain their ordinary work; a mixed legacy/current fixture saves only the current owner's transaction. This reduces coordination, not authentication or lease records.

Every lightweight interval below includes complete ordinary release; edit includes explicit old-family reclamation, and reopened inventory follows a genuine browser-process restart. CPU is cumulative **renderer process** seconds; wall time is milliseconds. Browser/storage-process CPU is excluded.

| Owners / pair (order) | Inventory CPU A→F | Inventory wall A→F | Edit/reclaim CPU A→F | Reopen CPU A→F |
| --- | --- | --- | --- | --- |
|64 /1 (A,F)|0.065085→0.062626|89.503→80.028|0.012737→0.013053|0.074567→0.069942|
|128 /1 (A,F)|0.128388→0.134260|168.629→173.557|0.013043→0.013150|0.141806→0.135348|
|128 /2 (F,A)|0.133349→0.118503|175.575→152.611|0.013881→0.012792|0.142543→0.135175|
|128 /3 (A,F)|0.131819→0.120774|170.114→152.803|0.014043→0.013227|0.156657→0.133409|
|256 /1 (A,F)|0.266873→0.250118|341.256→308.740|0.016297→0.016691|0.294443→0.250540|

Representative paired CPU changes are+4.57%,−11.13%,−8.38%; median paired change−8.38%. Ratio of the separately reported medians is−8.38% (0.131819→0.120774seconds). One unfavorable pair remains included. Subsequent edit CPU is roughly13–17ms and is not a demonstrated saving; no persistent repair/reclaim/lease debt or head rewrite remained. Endpoint heap samples ranged5.3–22.1MB before and7.6–20.8MB after across fixture sizes, with candidate comparable to baseline. They are not allocations or true peaks.

An independent harness review requested stronger explicit no-dirty/pending-fanout assertions and retained cleanup-failure receipts. A finite follow-up validates those oracle/receipt changes and the corrupt-family controls; this first cohort is retained, not excluded or replaced based on outcomes.

## Final controls and oracle confirmation

Final diagnostics `kplex-cached-source-read-OER4Wl` pass **14/14 arms**. All wrappers/profile resources retire. Diagnostic totals show zero overflow or pending transactions. Clean inventory leaves no head changes, body reads/parses, active readers/decode reservations, persistent leases, repair journals, dirty owners, pending fan-out or local dependency lookups. Shared-revision control retains three lease creations/deletions for two owners while saving two component transactions (6→4). Dense two-owner component/inventory stays at 14/20 transactions. The mixed legacy/current component/inventory saves only one (7→6 /16→15); supported legacy URL-free grammar authenticates normally.

| Corrupt one-owner component | Transactions A→F | Requests | Lease add/delete | Hashes | Decodes / bytes | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| Metadata SHA |3→2|5|1 /1|1|1 /237|`invalid-chunk` in both |
| Posting key |3→2|5|1 /1|2|1 /237|`invalid-posting` in both |

Both negative controls remain non-ready, then pass ordinary edit/reclamation and restarted clean inventory. There is no extra proof followed by the old path: actual request/decode/hash work is unchanged. This does not establish changed-source CPU savings. Missing/frame/oversized faults and failure precedence also pass the focused real-IDB tests.

For sixteen tiny owners, baseline pin transactions total5.5ms (max0.7ms), followed by4.7ms of separate chunk/posting transactions (max0.6ms). Candidate combined transactions total9.5ms (max0.9ms). Dense fallback pin totals1.1→1.0ms (max0.6ms both); legacy/current mixed pin totals0.8→1.0ms (max0.5ms both). These instrumented transaction creation-to-terminal-event lifetimes include queueing and dispatch, and **are not exclusive write-lock duration or CPU**. No contention/physical-device latency guarantee follows. Foreground tests separately check admission across a paused reader after commit.

The oracle-confirmation cohort `kplex-cached-source-read-2NtscB` passes **12/12 arms**, now explicitly checking zero dirty/deferred acquisition work and preserving cleanup failures in receipts. Same runtime source534a061e…, same accepted base and browser. No source, workload size, pacing or tolerance changed. It resolves the oracle gap rather than excluding the first cohort.

| Owners / pair (order) | Inventory CPU A→F | Inventory wall A→F | Edit/reclaim CPU A→F | Reopen CPU A→F |
| --- | --- | --- | --- | --- |
|64 /1 (A,F)|0.064265→0.062679|82.093→85.833|0.013628→0.013303|0.078390→0.075585|
|128 /1 (A,F)|0.127585→0.121661|168.810→155.633|0.013851→0.013363|0.141459→0.133447|
|128 /2 (F,A)|0.127894→0.121514|167.109→155.443|0.013147→0.013075|0.144951→0.134072|
|128 /3 (A,F)|0.128369→0.122001|167.022→151.753|0.013618→0.012978|0.146020→0.134038|
|256 /1 (A,F)|0.261768→0.250537|327.433→307.345|0.016128→0.016752|0.284616→0.255346|

Representative paired inventory CPU changes−4.64%,−4.99%,−4.96%; median paired change−4.96%. Representative CPU medians0.127894→0.121661seconds (−4.88%); wall medians167.109→155.443ms (−6.98%). Sixty-four-owner wall time is unfavorable despite lower CPU; retain it. No new persistent debt/head changes occur after editing/reopening. The256-owner candidate edit/reclaim wall time21.173ms versus17.482ms is also retained; this source-write path is unchanged and these few endpoint samples cannot prove equivalence or attribution.

Final diagnostic harness SHA-256: driver `baeb1bb42a8a116e57ef0e712d04532cbe8644bd5158922b1b900e550d2229b0`, fixture `08c571eabe7a965b5e078c59570e48562560febb2250a2b78a75a6db1f8883c8`. The initial native baseline driver was `329caf151f74130b8b6a93efe429db724435457d5d3521c1e4e5ade36d871d3c`; final native acceptance uses `597c9175a651a09b8e7f42d95f3832ae8ae7c9187f534364982548a4d7f98477` after adding saved-selection guards and an exact durable-lease absence oracle under the existing bounded transaction owner, including the deliberate-failure path. Executable fixture bundle hashes, target/version identities, heap/metric endpoints and process-restart elapsed observations remain in each private receipt. Endpoint samples and lifecycle ownership do not establish whole-process peak memory, matched physical caches or complete OS process birth/exit accounting.

## Remaining interval endpoints

All later edit/reclaim and reopened-inventory wall times are retained below. Heap entries are before / after inventory samples in bytes, not allocation or peak memory.

| Cohort / owners / pair | Edit/reclaim wall ms A→F | Reopen wall ms A→F | Heap before / after A | Heap before / after F |
| --- | --- | --- | --- | --- |
| First / 64 / 1 | 17.027 → 17.263 | 89.361 → 81.788 | 5379280 / 7610904 | 5346224 / 7558496 |
| First / 128 / 1 | 17.163 → 16.261 | 177.329 → 168.992 | 9235804 / 13832520 | 9541000 / 13874156 |
| First / 128 / 2 | 18.424 → 16.894 | 179.580 → 166.108 | 9560536 / 14079804 | 9320424 / 13781260 |
| First / 128 / 3 | 17.837 → 16.786 | 201.856 → 163.824 | 9356096 / 13931592 | 9336500 / 13701672 |
| First / 256 / 1 | 17.784 → 17.907 | 386.722 → 317.585 | 22122364 / 20834036 | 22115712 / 20393996 |
| Confirmation / 64 / 1 | 27.066 → 17.656 | 92.880 → 86.469 | 5342088 / 7619800 | 5249712 / 7462304 |
| Confirmation / 128 / 1 | 17.863 → 17.386 | 176.052 → 162.034 | 9367136 / 13919972 | 9461456 / 13876720 |
| Confirmation / 128 / 2 | 17.625 → 17.392 | 177.310 → 164.201 | 9298660 / 13897096 | 9339428 / 13715008 |
| Confirmation / 128 / 3 | 17.712 → 17.298 | 183.163 → 168.077 | 9337584 / 13893260 | 9367248 / 13763740 |
| Confirmation / 256 / 1 | 17.482 → 21.173 | 393.217 → 325.917 | 22113136 / 20856812 | 22099956 / 20485536 |

## Exact-build Windows acceptance and final state

| Lane | Result / scope | Private receipt |
| --- | --- | --- |
| Strict verification/staging | Full verify, real build, installed hashes and CLI/DOM smoke pass | `verify-obsidian/report.json` |
| Production metadata caller | 32 transactions; exact facts/heads; zero owned durable leases/readers/decode | `native-candidate/cached-source-reads.json` |
| Intentional caller failure | Expected failed scenario; durable, wrapper, controller and configuration cleanup pass | `native-cleanup-fault/cached-source-reads.json` |
| SI4 | Actual settings/source consumers and restoration pass; Small-specific minimum-file prerequisite is explicitly 0 | `si4/si4-native.json` |
| SI5 | Changed policy, missing/corrupt optional cache, corrupt source and offline edit recover without an unnecessary full rebuild; settings/fixtures/throttle restored | `si5/report.json` |
| Foreground inventory | Held background work allows requested foreground scopes; stale/cancelled work stays non-authoritative and owned state converges | `foreground/report.json` |
| Startup admission | Dormant/native edits, six device controls, concurrent main/sidebar opening, reopen reuse, enabled Eager and inactive live Plex pass | `startup-admission-closed/startup-admission-195.json` |
| Gate counts | Filter/count, tags/folders, URL evidence and presentation-only cases pass | `gates/` |
| Rename and ontology startup | Identity/recovery and startup update cases pass | `rename/`, `ontology/` |
| Live updates | Actual On-demand / background URLs / Responsive profile; edits, early interactive consumers and convergence pass; original Eager configuration restored | `live-updates-profile-final/report.json`, `live-profile-restoration.json` |

The first startup-admission attempt correctly refused an already open Plex before scenario mutation. That failed receipt is retained under `startup-admission/`; an outer guard then captured the layout/configuration, closed Plex tabs, ran the unchanged probe and restored original files/layout. `startup-layout-restoration.json` passes. No assertion, deadline, readiness policy or production source was changed to obtain the pass.

Final audit: Small returns to 107 files / 88 Markdown notes, original Eager mode, ready semantic/URL state, zero pending source/resolution/known work, unsaved sources, active readers, decode reservations or retained test controllers. Built and installed `main.js` remain 7fa00a35…; production source remains 534a061e…. All test-owned fixtures and altered settings/layouts are restored. Native method/DOM evidence is not actual paint, physical-device or controlled whole-Obsidian performance acceptance.

### Historical conservative protection, preserved

A final global-zero lease assertion initially failed on **two durable source-family leases**, despite every measured/new reader lifetime closing. A read-only audit found neither belongs to the current repository owner or selects a current family revision. Exact SHA-256 fingerprints of each lease's key/source/revision/owner match **both records in all three October 22 checkpoints**, including the original pre-investigation database:

- `original.bin`: SHA-256 `bde4bd733e06e4e4a2569d6db2de598bfe0e8297be60156bde4990dba8e9460c`, timestamp 2026-10-22T06:00:21Z,2/2 exact matches.
- `warm.bin`: `faad97c77d953a9e449854759dae69f78c26006dc1ecdafd33a2689468d56941`,2/2 matches.
- `warm-v2.bin`: `9e4503aec40d4d80a247cfb6926b432bd3529dac6b2f886d13df11228b5a2106`,2/2 matches.

This establishes that these protections predate #205. Their original failure cause is not established. They remain untouched under the existing conservative contract; no expiry, forced reclamation, global storage clearing or checkpoint restore was performed. Fresh comparison arms and candidate native observed keys have zero remaining leases. Therefore the final Small global count is **2 inherited /0 new**, not an invented global-zero result. `global-lease-audit.json`, `historical-lease-comparison.json` and `final-cleanup.json` retain this distinction privately. Node 22 initially refused the archived Electron V8 wire version; the read-only comparison ran in matching embedded Node 24.18.1 instead. No runtime build used that host Node.

## Review conclusion

Deliver the bounded correction for maintainer review. It removes one transaction from eligible ordinary metadata reads, reducing complete unchanged restart-inventory transactions 19.5% in the diagnostic fixture, while preserving every lease/request/hash and all source validity/recovery contracts. Representative renderer CPU improves modestly in the controlled consumer; the unfavorable pair and later edit endpoints remain included. No shifted repair/reclamation/restart debt is demonstrated.

The principal limits remain Browser/storage CPU coverage, full application scheduling and physical storage/cache equivalence. Expanded write-store scope has bounded functional/diagnostic coverage, not an exclusive lock-time guarantee. This does not solve the Mac startup loop/broad-tag timeout, historical orphan reclamation or the original overall CPU objective. No further runtime optimization or additional measurement campaign is needed for this scoped return. #206 and merged #203/#204 remain untouched.

Independent review covered ownership, bounds, authentication/final freshness, cancellation/close, conservative failure, component reuse, TSDoc and test-harness attribution/cleanup. Automated full verification and native acceptance complement that review. No additional manual gate is requested for this Windows scope; Mac/physical-device/production-vault performance remains unclaimed.

Reproduce with Node 22.22.2: `node scripts/testing/cached-source-read-batching.mjs characterize` or `full`; use the explicit Small guards for `verify:obsidian` and documented native drivers. Final documentary publication and draft-PR head are verified separately; GitHub CI state must be reported as observed, never inferred from local passes.
