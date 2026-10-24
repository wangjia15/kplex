# Ordinary dependency-count reuse — PR #204

Prepared by **Zsolt's Codex Agent**, 2026-10-23. Local implementation, comparisons, full verification and exact-build Windows acceptance are complete. Publication/remote CI are recorded at the published head in PR #204, which remains draft. No merge/release is authorized, and #203's branch, instructions, binaries and running Mac experiment are untouched.

## Question and checkpoint

Can ordinary source replacement avoid removing and readding identical dependency contributions without weakening validity, source publication or recovery? The comparison baseline is accepted `main@cd12a857c1c2c89c2d13f6c6b2a3e1a5203d5ffa`, including merged #201. It is not the pre-#201 baseline. All production changes are confined to `src/index/SourceRepository.ts`.

Exact baseline production build on Node **22.22.2**:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `608b2dd34e98ac84d117ebeb86d8cd287e26b3f34b8302a0f1ee7e72c9a53194` |
| `manifest.json` | `3395e425860e5068e9f3b3d9a0e3d58cefd2c11dededc690beb87f60e733ed7d` |
| `styles.css` | `88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974` |

The retained #201 `c39fb487…` build used version 0.2.1. Current main uses 0.2.2, so it was rebuilt and retained separately before candidate deployment. The first complete-cohort candidate source SHA-256 was `f2f8d4549e044b8d77429e63f965cc0175025a622661cf2383c84cc2a7022193`. It failed the late-change performance control and is not the final candidate. The corrected source SHA-256 is `951ce4e86ad1bea9b86a53d7efad1c2e4375e3eda38e220b4933409510a337ef`; its full browser cohort and exact installable-artifact/native acceptance have completed.

Final production build and installed artifact on Node **22.22.2**, source `951ce4e8…`:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `46bcd36b14291169465f98f0c2635ffb331d576eb84177d1e030281a90dc15d1` |
| `manifest.json` | `3395e425860e5068e9f3b3d9a0e3d58cefd2c11dededc690beb87f60e733ed7d` |
| `styles.css` | `88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974` |

## Mechanism and early go decision

`Vault.modify` marks a source dirty; production acquisition calls ordinary replacement before graph semantic no-op suppression. Prose, URL-label and scalar-value edits can advance source facts without changing their dependency projection. Clean restart often avoids replacement through existing source reuse, so it is not an assumed optimization hit.

The Windows baseline diagnostic used real Vault edits in the existing guarded `kplex-test-small` vault, initially **107 files / 88 Markdown notes**, Obsidian **1.14.4**, installer **1.14.0**. Eight prose/URL-label edits produced **8/8** fresh source revisions with matching membership count/digest: **128/128 memberships** matched. A URL-target edit produced an equal-count/different-digest fallback: **8/9 attempts**, **128/144 memberships**, matched overall. These synthetic frequencies establish a real caller, not the hit rate of a private vault or #203's dataset.

Ordinary repair previously read and decremented every old contribution, read and incremented every new contribution, and deleted old rows. The implementation preserves counts only after authenticating old rows and selected count multiplicity, exact streamed equality and final transaction fences. It still publishes new source facts/head/families/owner/sequence and finishes the normal primary mutation ticket. New/changed/deleted, legacy, unsaved, pending or superseded cases retain normal repair/failure behavior.

For `N` old memberships, `U` distinct keys summed across bounded pages, `D` source-distinct keys and `P` old pages, baseline selected repair performs approximately `7N` membership/key requests. Corrected reuse performs `3N + U + 2D` proof/reclaim requests, at most `6N`, plus at most `P−1` byte-boundary lookahead rereads, `P` old-page hashes and scalar journal/fence work. Staging remains unchanged. All `2N` decrement/increment key writes disappear on eligible replacement. First-occurrence seeks ensure full occurrence-count ranges are disjoint and scanned once; no whole-source key set is retained. Authentication uses bounded readonly transactions; do not infer that total transaction count falls. Native request counts are not CPU shares.

The correction defers authentication until the new count/digest matches the captured owner. It recomputes the old digest with original old-row byte/page rules, then requires stored/old/new commitments to agree. Changed projections immediately use normal repair. Missing rows and undercounted ledgers still cannot certify reuse; primary tickets, final activation fences, publication and reclamation are unchanged.

The local proof and real caller support proceeding with this narrow change. Overall CPU reduction, private-vault opportunity and #203's incomplete-startup/unsaved tail are separate questions.

Eligibility counters describe matching projection opportunities, not proof-qualified activations. The final authentication/fences and observed absence of selected-key writes establish realized reuse separately. Native diagnostic phase labels are mutable across awaited owners; concurrent repository work can contribute calls to an active label. Those diagnostic counts are neither exclusive phase attribution nor CPU measurements.

## Predeclared comparison protocol

- Real Chromium IndexedDB, production codecs/repository and projection; only the Obsidian host is doubled. Baseline source is read at the exact accepted commit; the harness refuses another changed runtime file. Candidate source/bundle hashes are saved per cohort.
- Fresh owned browser profile/database per arm using the existing browser harness. Setup creates equivalent selected logical state. No global storage reset, forced GC, altered production scheduling or new persistent vault/profile.
- Deterministic dense/shared memberships, duplicate keys, nested tags, raw/canonical URLs and origins, fields/resolver tokens. Separate 256-row and byte-boundary controls; first creation, deletion and interrupted selected repair are tested separately.
- Detailed request/transaction counting and actual row/count/fact oracle run separately from lightweight comparisons. The oracle checks ordered projected memberships, exact selected count ledger, no inactive local rows or journals, and no retired neutral chunks/postings.
- Timing covers ordinary replacement, normal count work or authentication, durable old-row reclaim, and explicit reclamation of all known retired source/family revisions. Equal 32-owner transport batches avoid a 60-second CDP command limit; the one start/end interval includes batch IPC gaps and closure reads.
- Serial baseline/candidate with alternating order; 64/128/256 owners, three matched pairs at representative 128 for unchanged and mixed workloads. No builds, other tests or native vault indexing overlap. Each arm then restarts its owned browser and separately measures authenticated reopen and a genuine changed edit through closure.
- The same two CDP metric endpoints provide renderer `ProcessTime` cumulative CPU and main-thread `TaskDuration`, plus sampled JS heap. Preserve raw endpoint values and actual Chromium/target identity. This excludes Browser/storage-process CPU and is not exclusive IndexedDB CPU. Heap samples are neither allocation nor true peak memory.
- Go requires exact correctness/recovery closure, measured elimination of redundant key writes, no hidden reclaim/restart/edit debt, and improved representative end-to-end cost without changing interactive behavior. No whole-vault percentage or arbitrary 50% threshold is inferred. Incomplete/unfavorable runs remain in the record; exclusions require a documented protocol failure.

The browser fixture does not bootstrap the historical global contributor catalog/root. Normal primary mutation tickets/dirty fences still run and close; global certificate repair is covered by the existing real-IDB journal tests and native acquisition, not attributed to this synthetic timing.

Chromium's [performance-agent implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/inspector/inspector_performance_agent.cc) obtains `ProcessTime` from the current renderer process's cumulative CPU usage. Workers in that process are already included and are not added again. Storage work in other Chromium processes remains outside this measurement. Actual runs use Chrome **155.0.8059.82** on Windows.

During the historical first-candidate (`f2f8d454…`) cohort, the maintainer closed the open Obsidian windows and authorized reopening either disposable vault. That condition change was observed at 07:07:26 UTC, before its first 64-owner result was saved; the exact activation timestamp was not retained, so that historical 64-owner pair remains descriptive. This limitation belongs to the first-candidate cohort, not the corrected results below. **All corrected `951ce4e8…` arms, including 64 owners, ran after Obsidian closure**, with no Obsidian window reopened during the cohort. Fresh browser processes still do not establish identical physical storage, OS-cache or heap state.

## Unfavorable control and correction

The first full-cohort source (`f2f8d454…`) passed all 30 correctness-bearing arms and reduced median 128-owner renderer CPU by 34.6% for unchanged projections and 26.0% for the early-change mixed fixture. It nevertheless failed the additional late-change control. That control changes only the final resolved host-link target, with the first different membership at ordinal **621/623**, and has zero reuse opportunities. A genuine host resolution can change while its lexical literal stays unchanged; this is a valid distinct source-fact input.

| Pair/order | Baseline CPU (s) | First candidate CPU (s) | Baseline elapsed (s) | First candidate elapsed (s) |
| --- | ---: | ---: | ---: | ---: |
| 1 A/F | 3.035393 | 3.671214 | 5.436838 | 6.574774 |
| 2 F/A | 3.200268 | 3.694232 | 5.824080 | 6.569176 |
| 3 A/F | 3.048576 | 3.628171 | 5.473529 | 6.510044 |

Median renderer CPU increased **20.4%** and elapsed increased **20.0%**. Cause: authentication consumed almost the entire old projection before detecting a late inequality, then normal repair still ran. These unfavorable results are retained; better unchanged medians did not justify accepting that path.

The corrected source gates authentication on the completed count/digest comparison. Its same late control performed zero authentication calls/requests:

| Pair/order | Baseline CPU (s) | Corrected CPU (s) | Baseline elapsed (s) | Corrected elapsed (s) |
| --- | ---: | ---: | ---: | ---: |
| 1 A/F | 3.041616 | 2.999801 | 5.520863 | 5.616328 |
| 2 F/A | 3.068223 | 3.040973 | 6.002632 | 5.513743 |
| 3 A/F | 2.965786 | 3.104815 | 5.432061 | 6.332291 |

Median CPU is effectively unchanged (3.041616 → 3.040973 s); pair CPU changes are −1.4%, −0.9%, +4.7%. Median elapsed is +1.7%, with one slower candidate arm retained (+0.900 s); no cause for that wall-time variation is established. The deterministic extra authentication path is gone. These are complete-maintenance comparisons followed by real browser restart/edit, not exclusive storage CPU or a promise that every individual edit becomes faster.

## Corrected full-cohort results

The corrected source `951ce4e8…` completed **30/30 arms**: two creation/deletion/interruption controls, eight detailed page/byte controls and 20 lightweight timing arms. The separate corrected late-change cohort completed **8/8 arms**. Source and browser-bundle identities were captured before execution; these are browser test bundles, not the installable production `main.js`.

| Identity | Baseline | Corrected candidate |
| --- | --- | --- |
| SourceRepository SHA-256 | `7625a3821513d8ad7a40a44635922713bc1a4b8e0d5a682f424e46556ac584a4` | `951ce4e86ad1bea9b86a53d7efad1c2e4375e3eda38e220b4933409510a337ef` |
| Browser bundle SHA-256 | `2f86bc0c03fbfd9bf7fd760c37c0279183526425d4aa5fe7f2ac95835d082b08` | `23c18c3b5378d41ff5a10bfdf9ea548f3ba873d3d92eb03faf898a8cc561b7bb` |

Each owner has **623 memberships**. The timing workloads contain 39,872 / 79,744 / 159,488 selected memberships at 64 / 128 / 256 owners. Unchanged workloads have 100% projection matches; mixed workloads change one in four owners and have 75% matching owners and records. The detailed mixed fixture has **3/4 replacements and 1,869/2,492 records** matching; its remaining equal-count/different-key case does not reuse counts. These deterministic frequencies are fixture properties, not a measured real-vault distribution.

All final timing arms were visible/focused at every recorded batch boundary. Every arm closed local journals, inactive memberships, primary dirty fences and contributor-journal debt before its timing endpoint. Independent oracles after timing and again after restart/edit found exact row/count/fact agreement and zero retired source chunks/postings. No unfavorable or incomplete arm was excluded.

Values below are baseline → corrected candidate. CPU is current-renderer cumulative CPU through complete replacement and reclamation; elapsed includes the entire interval. The 128-owner values are medians of three arms; 64/256 each have one pair. Percentage columns compare those displayed medians, while the next table preserves actual paired differences.

| Owners / workload | Pairs | Renderer CPU (s), A → F | CPU change | Elapsed (s), A → F | Elapsed change |
| --- | ---: | ---: | ---: | ---: | ---: |
| 64 / unchanged | 1 | 11.948666 → 8.505936 | -28.8% | 23.901 → 18.114 | -24.2% |
| 64 / mixed | 1 | 12.787711 → 9.608908 | -24.9% | 25.641 → 20.225 | -21.1% |
| 128 / unchanged | 3 | 24.799523 → 16.905211 | -31.8% | 51.387 → 37.805 | -26.4% |
| 128 / mixed | 3 | 25.038902 → 18.982173 | -24.2% | 51.506 → 41.552 | -19.3% |
| 256 / unchanged | 1 | 50.448471 → 34.696299 | -31.2% | 106.042 → 79.782 | -24.8% |
| 256 / mixed | 1 | 50.748699 → 39.291399 | -22.6% | 106.648 → 87.108 | -18.3% |

### Representative matched pairs

| Workload / pair / order | A CPU (s) | F CPU (s) | Actual paired CPU delta (s) | A elapsed (s) | F elapsed (s) | Actual paired elapsed delta (s) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unchanged 1 / A/F | 24.799523 | 17.224137 | -7.575386 | 51.032 | 37.977 | -13.054 |
| Unchanged 2 / F/A | 24.744886 | 16.778572 | -7.966314 | 51.387 | 37.612 | -13.775 |
| Unchanged 3 / A/F | 24.999942 | 16.905211 | -8.094731 | 51.581 | 37.805 | -13.775 |
| Mixed 1 / A/F | 25.370648 | 18.815267 | -6.555381 | 52.708 | 41.552 | -11.155 |
| Mixed 2 / F/A | 24.743188 | 19.265723 | -5.477465 | 51.194 | 42.086 | -9.108 |
| Mixed 3 / A/F | 25.038902 | 18.982173 | -6.056729 | 51.506 | 41.341 | -10.166 |

All six representative pairs reduced renderer CPU and complete-maintenance elapsed time. Median CPU fell **31.8%** for unchanged and **24.2%** for mixed replacements; elapsed fell **26.4%** and **19.3%**. Main-thread task-time medians were 15.064482 → 10.593929 s and 15.199732 → 11.725841 s respectively; those task times are already part of process CPU and are not added to it.

### Restart and subsequent changed edit

After every arm the owned browser process was restarted with the same disposable profile, then an authenticated count lookup and one genuine dependency-changing ordinary edit were measured separately. Startup is the observed browser-harness restart elapsed time, not Obsidian application startup; its CPU was not captured. The later edit includes its own repair/reclamation and closure. Values are medians for 128 owners and the single arm at other sizes.

| Owners / workload | Browser restart ms, A → F | Authenticated reopen ms, A → F | Reopen renderer CPU ms, A → F | Subsequent edit ms, A → F | Edit renderer CPU ms, A → F |
| --- | ---: | ---: | ---: | ---: | ---: |
| 64 / unchanged | 412.266 → 739.273 | 32.388 → 28.002 | 3.595 → 3.641 | 365.346 → 355.618 | 210.167 → 208.183 |
| 64 / mixed | 413.668 → 430.564 | 31.831 → 23.738 | 3.675 → 3.472 | 385.229 → 369.638 | 217.672 → 213.030 |
| 128 / unchanged | 439.795 → 433.377 | 26.941 → 35.087 | 3.754 → 3.659 | 395.610 → 398.638 | 223.153 → 220.474 |
| 128 / mixed | 441.435 → 439.518 | 26.688 → 41.618 | 3.657 → 3.743 | 394.247 → 406.479 | 219.950 → 223.378 |
| 256 / unchanged | 476.932 → 452.056 | 49.812 → 42.261 | 3.879 → 3.563 | 444.194 → 388.252 | 243.512 → 214.904 |
| 256 / mixed | 456.768 → 433.552 | 52.614 → 42.044 | 4.530 → 3.745 | 402.263 → 391.819 | 222.111 → 220.965 |

At 128 owners, candidate reopen elapsed medians were **8.145 ms** and **14.930 ms** slower, while reopen renderer CPU remained approximately 3.6–3.8 ms. Subsequent changed-edit elapsed medians were **3.027 ms** and **12.232 ms** slower; renderer CPU was 223.153 → 220.474 ms and 219.950 → 223.378 ms. These small increases are retained. There was no outstanding reclamation debt to explain away: all count journals, inactive memberships and retired family rows were already zero before restart and remained zero after the edit. The measurements do not establish a cause for individual wall-time differences.

### Sampled memory

Representative 128-owner JS-heap endpoint samples are shown in MiB; each cell is before → after the main replacement interval. These are samples, not allocation measurements, true peaks or proof of a retained-memory change. No GC was forced, and no GC cause is inferred from falling samples.

| Workload / pair | Baseline sampled JS heap MiB | Candidate sampled JS heap MiB |
| --- | ---: | ---: |
| Unchanged 1 | 1.667 → 4.498 | 1.676 → 5.632 |
| Unchanged 2 | 1.667 → 9.719 | 1.685 → 2.041 |
| Unchanged 3 | 1.666 → 4.931 | 1.677 → 9.623 |
| Mixed 1 | 1.674 → 6.176 | 36.069 → 7.058 |
| Mixed 2 | 1.667 → 9.669 | 1.677 → 2.031 |
| Mixed 3 | 1.668 → 4.955 | 22.963 → 4.183 |

Across all final timing arms, before-sample values ranged from 1.597 to 36.069 MiB and after-sample values from 2.031 to 10.299 MiB. Starting heap state therefore was not identical despite fresh processes and equivalent logical fixtures.

### Detailed native request and transaction accounting

Each detailed arm performs four ordinary replacements over two owners/two rounds, staging **2,492 memberships**. Counts include membership/source staging, activation, authentication where eligible, selected repair, private reclaim, explicit old source/family retirement and surrounding repository/closure work. A native request is an object-store/index request call or cursor delete; transactions are counted separately, with no conversion to CPU shares. The diagnostic oracle itself adds four requests/four readonly transactions per arm and is excluded from totals below. Cursor-continuation counts were zero in these phase totals.

Cells are **native requests / transactions**. Authentication transactions are readonly; selected-count repair and private reclaim transactions are readwrite. The retirement phase includes readonly authority preflight plus bounded readwrite cleanup.

**256-record page fixture**

| Phase | Unchanged A | Unchanged F | Mixed A | Mixed F |
| --- | ---: | ---: | ---: | ---: |
| Membership staging | 2,516 / 12 | 2,516 / 12 | 2,516 / 12 | 2,516 / 12 |
| Source chunks/postings staging | 1,188 / 8 | 1,188 / 8 | 1,188 / 8 | 1,188 / 8 |
| Activation | 112 / 4 | 112 / 4 | 112 / 4 | 112 / 4 |
| Authentication proof | 0 / 0 | 4,352 / 12 | 0 / 0 | 3,276 / 9 |
| Selected-count repair | 17,508 / 20 | 0 / 0 | 17,508 / 20 | 4,377 / 5 |
| Private inactive-row reclaim | 0 / 0 | 5,020 / 12 | 0 / 0 | 3,765 / 9 |
| Old source/family retirement | 60 / 12 | 60 / 12 | 60 / 12 | 60 / 12 |
| Other repository and closure work | 97 / 37 | 113 / 41 | 97 / 37 | 113 / 41 |
| **Total** | **21,481 / 93** | **13,361 / 101** | **21,481 / 93** | **15,407 / 100** |

**Byte-boundary fixture**

| Phase | Unchanged A | Unchanged F | Mixed A | Mixed F |
| --- | ---: | ---: | ---: | ---: |
| Membership staging | 2,540 / 24 | 2,540 / 24 | 2,540 / 24 | 2,540 / 24 |
| Source chunks/postings staging | 1,196 / 20 | 1,196 / 20 | 1,196 / 20 | 1,196 / 20 |
| Activation | 112 / 4 | 112 / 4 | 112 / 4 | 112 / 4 |
| Authentication proof | 0 / 0 | 4,852 / 24 | 0 / 0 | 3,649 / 18 |
| Selected-count repair | 17,508 / 20 | 0 / 0 | 17,508 / 20 | 4,377 / 5 |
| Private inactive-row reclaim | 0 / 0 | 5,020 / 12 | 0 / 0 | 3,765 / 9 |
| Old source/family retirement | 60 / 12 | 60 / 12 | 60 / 12 | 60 / 12 |
| Other repository and closure work | 121 / 69 | 137 / 73 | 121 / 69 | 137 / 73 |
| **Total** | **21,537 / 149** | **13,917 / 169** | **21,537 / 149** | **15,836 / 165** |

For unchanged projections, selected key-count writes fell **4,984 → 0** at both boundaries. Mixed arms retained exactly **1,246** required writes, versus baseline 4,984. Page-fixture total requests fell **21,481 → 13,361** (unchanged) and **21,481 → 15,407** (mixed); byte-fixture totals fell **21,537 → 13,917** and **21,537 → 15,836**. Total transactions rose, as the tables show; request/write elimination does not imply fewer transactions.

Membership staging was identical between A/F: the page fixture used **12 pages**, maximum **256 records / 38,795 bytes** (unchanged) or 38,815 bytes (mixed), and 371,092 / 371,172 total staged row bytes. The byte fixture used **24 pages**, maximum **146 records / 260,156 bytes**, and 5,900,692 / 5,900,772 total staged row bytes. Authentication/reclaim costs and old neutral-row retirement are included rather than deferred to the next run.

First creation still made **623** initial key-count writes; deletion still made **623** key-count updates (621 puts/two deletes) in both variants. Interrupted selected repair retained one durable journal and then recovered to exact counts with zero journals/inactive rows/retired families. The corrected late-change detailed arms confirmed first inequality at **621/623**, zero matches and **zero authentication requests**; both variants retained the same **2,492** selected key-count writes for those two changed replacements.

### Browser conclusion and remaining acceptance

This synthetic real-IDB comparison demonstrates removal of the identified redundant count work, improved representative complete-maintenance renderer CPU/elapsed, and no hidden old-row debt on restart or subsequent edit. The unfavorable late-change behavior of the first design was corrected and remeasured rather than averaged away. The corrected late control still contains the slower candidate wall-time arm documented above; it is not a guarantee that every edit gets faster.

These results cover a headless real-Chromium repository fixture with an explicit host double. Browser/storage-process CPU, OS cache/physical storage equivalence, allocation peaks, real-vault hit rate and physical/native interaction are not established by these timings. No whole-vault CPU percentage or conclusion about #203 is justified. Exact-build Windows functional evidence is recorded separately below; it is not pooled with these timings.

Private raw receipt identifiers are `kplex-dependency-count-reuse-lDO9Af` (corrected full cohort) and `kplex-dependency-count-reuse-wbKzGF` (corrected late control). Raw traces remain in private TEMP; only synthetic aggregate measurements are recorded here.

## Full verification and Windows acceptance

`scripts/testing/obsidian/verify.mjs` ran the full portable `npm run verify` through `runPortableVerification`, then staged the three exact artifacts, enabled the plugin and asserted the rendered view and absence of captured JavaScript errors. Its receipt is **passed** (08:20:47–08:44:02 UTC): Node **22.22.2**, Windows **10.0.26200**, Obsidian **1.14.5**, installer **1.14.0**. All six test-lane totals passed (7, 130, 1,333, 227, 357 and 679 executions), with zero failures/cancellations/skips. Architecture/core/lint and the actual installed-typings production build passed. Obsidian lint emitted no errors or warnings.

The outer PowerShell launch returned status 1 because redirected npm stderr notices became a `NativeCommandError`. This is retained as a launcher failure, not discarded as a test result: the runner can reach exact-build staging and its passed receipt only after `runPortableVerification` returns successfully, and every test-lane footer is green. No test was weakened or repeated to hide a failing assertion.

Obsidian had loaded **1.14.4** during the earlier baseline acquisition diagnostic. A user-authorized graceful restart, after checking that only Small was open, loaded **1.14.5**. Native before/after operation diagnostics therefore are not a controlled host CPU comparison. The isolated acceptance CPU cohorts all used the same Chrome **155.0.8059.82**, before reopening Small. No global storage or other vault was changed.

All final native lanes ran serially against the artifact above in guarded Small:

| Lane | Actual result |
| --- | --- |
| Ordinary acquisition diagnostic | Passed: 8/8 prose/label edits advanced source authority, 128/128 matching memberships authenticated/reclaimed; changed URL fell back. Total key writes 288 baseline → 32 candidate (the remaining changed replacement). Diagnostic operation counts, not native CPU comparison. |
| Diagnostic cleanup faults | Both expected failures passed cleanup assertions: after real edits and outer polling failure. Inventory, fixtures, wrapper identities, throttling and controller removal verified. |
| SI4 | Passed explicit Small mode (`KPLEX_SI4_REQUIRED_FILES=0`): saved ontology, evidence, titles, gates and write readiness; zero extra source work/full builds for policy-only changes. This is not the 20,015-note native lane. |
| SI5 recovery | Passed changed-policy, missing-cache, corrupt-cache, corrupt-source and offline-edit scenarios. Global vocabulary recovered in missing/corrupt-cache cases; offline edit performed exactly one semantic read/parse. Settings, fixtures and throttling restored. |
| SI5 warm reload | Three separate plugin reloads passed with exact selected heads unchanged and zero semantic Markdown reads/parses; settings, fixtures and throttling restored. These are plugin reloads, not full application startups. |
| Foreground inventory | Passed existing foreground smoke. |
| Live updates | Passed actual On-demand/background/Responsive scenario: foreground work before unrelated held URL work, then normal background drain. Original Eager profile and exact configuration bytes restored. |
| Interaction gate counts | Passed filtered/clear/presentation-only checks and exact denominators without source rebuild work. |
| Rename identity | Passed native identity/source/recovery assertions and exact configuration restoration. |
| Startup ontology updates | Passed stationary real edits before remaining startup work, with source-boundary and physical-provenance assertions; original strategy/configuration restored. |

The first live-update attempt failed its explicit profile prerequisite because Small was Eager. Its failed receipt is retained. The rerun selected the required actual profile through settings plus plugin reload, then independently restored the original in-memory strategy, file inventory and configuration bytes. No assertion/default was relaxed. An initial final read-only CLI check lacked the native-access sandbox context and could not reach Obsidian; the same check with the established native access succeeded, without restarting the app.

Final independent preflight found only Small open, **107 files / 88 Markdown notes**, index ready, no inventory/pending/resolution/known-impact work, visible/focused window, and **no captured JavaScript errors**. Installed `main.js` still equals built `46bcd36b…`; production source remains `951ce4e8…`. Raw receipts remain private under `kplex-204-validation`. Remote CI must be checked at the final published head; the PR checklist records its actual result.

## Decision and limits

**Go for review of this scoped implementation; keep the PR draft.** Redundant count maintenance is demonstrated in production callers and eliminated for authenticated equal projections. Every representative pair improved complete-maintenance renderer CPU/elapsed, with old membership and source-family reclamation included. Exact-build Windows interaction and recovery passed. The unfavorable first-design late-change result led to the smallest gating correction and was retained alongside the corrected measurements.

This does not establish whole-Obsidian CPU savings, private-vault hit rate, identical physical storage/heap state, physical-device acceptance or a solution to the broader indexing CPU objective. Individual later wall-time increases and the corrected late-control outlier remain explicit. #203 is independent and untouched. No further runtime change is proposed in this checkpoint; no merge or release is performed.

## Correctness and review

Corrected focused real-Chromium tests passed **11/11 executions** on Node 22.22.2, including the last-key-change zero-authentication assertion and an assertion that 1,001 memberships / 702 distinct keys cause exactly 702 range counts across pages. Coverage includes fresh facts, shared/duplicate counts, equal-count/different-key fallback, byte-sensitive digest false negatives, missing/corrupt old rows, missing/zero/understated duplicate ledgers, nested tags/URL labels, unrelated/same-source independent writers, older/incomplete/unsaved state, staging cancellation, interrupted reclaim, reopen, later edit and deletion. Deferred-authentication byte-page and interruption cases also passed. Harness observer/cleanup/late-fixture tests passed **3/3**.

Main-agent source review preserved the canonical projection, multiplicity, normal ticket/publication owner, immutable-prefix proof and final activation fences. No schema, scheduler, concurrency, default, parser or semantic-owner changes are included. The first design repeated whole key-range counts on each page; review rejected that potentially quadratic backend work before final acceptance. The final indexed first-occurrence proof counts each distinct range once.

The native diagnostic's normal cleanup passed, and a deliberate exception after real edits independently verified original file inventory, fixture absence, wrapper identities and background-throttling restoration. An agent-capacity interruption delayed progress; changes and receipts survived. It was not a product validation result.

## Historical exploratory results — not final-candidate acceptance

Initial two-owner smoke on source SHA `f94ecef1363ddcf284e847635d748b23657bad2ef87c1d9d68fb70d581426300` passed controls, eight detailed arms, four timing arms, full cleanup and browser restart/edit. For four unchanged replacements / 2,492 memberships, baseline selected repair issued **17,508 requests / 4,984 key writes**; that candidate issued **4,256 authentication + 5,020 reclaim requests / zero key writes**. Mixed controls matched 75% and retained 1,246 required key writes. Staging was unchanged.

Historical smoke unchanged timing was 863 → 569 ms and 0.257 → 0.199 s main-thread task time; mixed was 865 → 616 ms and 0.267 → 0.219 s. These small runs predate the final first-occurrence correction and do not provide final artifact acceptance or whole-process CPU evidence.

The first harness attempt used an invalid host-environment digest (`fixed` rather than 64 hex characters); production validation rejected setup. That harness error was corrected and the failed receipt retained. Two focused test setup errors (missing actual frontmatter tags and capturing an unavailable expectation after installing an unsaved overlay) were corrected without weakening assertions or runtime contracts.
