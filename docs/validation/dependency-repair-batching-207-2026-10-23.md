# Dependency repair batching — PR #207

Zsolt's Codex Agent. Implementation returned for review after complete local and applicable exact-build Windows validation. The component study demonstrates substantial maintenance savings and a repeatable candidate-associated database-open penalty after the harness restart. Performance acceptance is qualified; the PR remains draft and has no automatic merge authorization.

## Accepted baseline and entry

The maintainer authorized merging #205 after its CI disposition. Exactly one unchanged-head retry of run 402 passed complete verification/build at `104a5837ca358238f2c3cbd5f7177516094ab138`, with zero failures/skips. The original 64.9 ms URL-heavy timer failure remains retained; the <50 ms assertion, deadlines and runtime were unchanged. The expensive native metadata-read path is unreachable in that Node fixture without IndexedDB. Generic memory-read branch changes do not establish that zero changed instructions execute. Prior implementation CI, full local verification and native exact-build checks also passed. This supports accepting a non-reproducible timing limitation; its precise cause is unknown and broader CPU acceptance remains open.

#205 merged normally as **`930747679894f003a2acf3b800df798826ee090c`**, verified reachable from main. #207 incorporated current main through normal merge **`86d7fe459161a36c7ddd7c5f5e5d2fa236526412`**, published and remotely verified before implementation or comparative measurements. The existing assignment/test plan and 2417-byte standing HANDOFF header were preserved.

The comparison baseline is **main `930747679894f003a2acf3b800df798826ee090c`**. Runtime `SourceRepository.ts` SHA-256: `534a061e64ddfe7a609cc774788567ec8ba6afc4c953ea556e7ff9834fe4c63e`.

| Baseline artifact | SHA-256 |
| --- | --- |
| main.js | `7fa00a354d38fb2cedecbb9d15c5277e0513813b7074d487f5ebda9820c2b79f` |
| manifest.json | `3395e425860e5068e9f3b3d9a0e3d58cefd2c11dededc690beb87f60e733ed7d` |
| styles.css | `88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974` |

Private entry receipts/artifacts: `%TEMP%\kplex-207-validation`. Read-only native preflight verified the existing Small vault, 107 files/88 Markdown notes, one Obsidian window, ready source state and no pending work. No production vault or #206 branch/data was accessed.

## Source and measurement identity boundaries

The 98-arm comparison and separate reopen/responsiveness diagnostics below measured runtime source `5d52a7f8021c63e1898cffd57f855d6c38732962f00a7ee95457799679b63250`, associated production build `d7d3f7eb1dcad8d4b3e468bde77465159919f3b3d99f22d70a9a3797d66270fa`. They are not silently relabeled as final-build measurements.

Complete verification first stopped at the official `prefer-promise-reject-errors` rule for two new `reject(error)` catch callbacks. A proposed normalization to `SourceFactError` (source `aa1d540242a9ef7a0c9b051aa2eb26df5afb5bf13fa4e4d79249b84a8bac0338`) passed targeted lint, but independent review found that it could bypass storage-failure handling or lose attributed native AbortError identity. Its complete-verification attempt was deliberately stopped before build/deployment. Both receipts remain private; neither is a passing verification.

The corrected source `d8d6d532bb711b3cb2bb5d0e55152392495533b8eb64c069158ca8b0e98809d8` differs from the measured source only in those two catch expressions: actual `Error` instances, including native Chromium `DOMException`, are retained unchanged; only a non-Error throw is wrapped in a normal Error. The successful-work algorithm is unchanged. The dedicated real-IDB regression fails the faulty normalization at storage-owner notification (zero calls instead of one), then passes all six corrected cursor/ledger cases: quota classification/original identity, unexpected Error notification, public cancellation attribution, atomic snapshot rollback and later exact recovery. Targeted negative/positive commands each execute one top-level test, with zero skips; they are not a substitute for the complete suite. Private receipts are `sync-error-negative-aa1.log`, `sync-error-final-d8.log` and `sync-error-regression.json` under the validation root.

The separate final-source `repair-smoke` bridge passed **42/42 arms** at `%TEMP%\kplex-dependency-repair-207-Mb7jyC` (2026-10-23T14:51:36Z–14:53:13Z). All 26 detailed arms exactly match the original measured cohort's operation/projection/staging/delivered counters, non-timing transaction/page counters, selected-byte/count digests, before/after/reopen/recreation states and closure debts. This establishes deterministic successful-work equivalence for the covered two-owner controls, including cleanup and subsequent edit/reopen. It does not repeat 128-owner CPU inference or resolve the reopen-latency qualification. Historical performance remains attached to its measured identities; final verification/build/native results are recorded separately.

## Protocol and decision rules, before new measurements

Use Node 22.22.2, actual dependencies and real Chromium IndexedDB. Compare the pinned baseline against only the candidate repository implementation, serially with alternating order. Keep browser version, synthetic facts, distributions, settings and procedure equal. Each arm uses the existing test-owned disposable browser harness, without forced GC or global cache resets. Fresh process/profile preparation is outside measured source maintenance; record this boundary. Physical storage/OS cache equality and whole-Obsidian CPU are not claimed.

Characterize creation, genuinely changed replacement and deletion separately, with unchanged projection as a #204 control. Mixed and mostly-distinct workloads are required; duplicate-heavy data is diagnostic only. Use 64/128/256-owner scaling and three alternating matched pairs at 128 for both representative distributions. Retain every failed/incomplete/unfavorable arm. Exclude only a documented protocol violation.

Detailed observers count membership requests, cursor opens/continuations/delivered rows, distinct page keys, ledger reads/mutations, old-row deletes, transactions and bytes separately from lightweight CPU runs. Source-derived JavaScript promise/await stages are not native request counts or CPU shares. Include complete repair, primary journals, lease release and known old-revision reclamation before completion. Follow with genuine editing and actual browser-process restart/reopen; record their cost separately. Do not subtract independent medians or mix CPU counters across process identities. Renderer CPU/main-thread task endpoints exclude Browser/storage/worker process CPU; restart wall time includes launch, while CPU before observer attachment remains unmeasured. Memory endpoints are samples, not allocation or true peaks. Transaction elapsed is not exclusive lock time.

Proceed only with exact correctness and recovery, unchanged <50 ms URL-heavy responsiveness assertion, no weakened deadlines/coverage, and useful representative complete-cost improvement. The predeclared performance gate is at least 20% fewer selected-repair logical native operations on mixed data and at least 5% lower median matched complete maintenance renderer CPU, improving in at least two of three representative mixed pairs. Mostly-distinct and small-edit controls must show no repeatable material regression: a >=10% CPU or elapsed increase in at least two of three pairs (and >5 ms absolute per-arm difference) requires investigation rather than acceptance. These are component-study rules, not a whole-vault CPU target. All actual endpoints and qualifications will be retained; a failed gate means correction or a precise no-go, not a favorable tolerance chosen later.

## Bounded design checkpoint

The baseline already groups at most 256 occurrences per transaction. It serially reads one membership, reads its ledger and writes a count for every occurrence. Proposed correction: validate a contiguous cursor prefix under record and byte bounds; read each distinct ledger once with at most one unvalidated result outstanding; replay every old decrement before every new increment with intermediate safe-integer/underflow checks; then commit one final count mutation per key, old-row deletion and exact journal advancement atomically. All mutable reads remain in the original readwrite transaction, preserving independent-writer serialization. No schema, journal format, scheduler, source admission, reader/lease, projection, setting or #206-owned change is authorized.

For N occurrences and D distinct page keys, ordinary logical work is N membership reads + N ledger reads + N mutations. The candidate uses N cursor steps + D ledger reads + D mutations, original journal work and one exact old-prefix range deletion per page. All-distinct creation pages inherently save no such native calls; any scheduling/CPU benefit must be measured. A bulk getAll(256) is rejected because large valid rows could overfetch excessive data. Cursor byte-boundary lookahead and the baseline exposure to one arbitrarily corrupt stored record must be reported honestly.

### Baseline characterization and final pre-comparison clarification

The baseline-only 13-arm characterization passed, including complete cleanup/edit/reopen. For two mixed owners, creation delivered 1246 memberships with 902 page-distinct keys; changed replacement delivered 2492 with 1786 page-distinct keys and deleted 1246 old rows; deletion delivered/deleted 1246 rows. Mostly-distinct creation delivered 1214 rows/1214 page-distinct keys. These are detailed operation receipts, not acceptance CPU results. Raw directory: `%TEMP%\kplex-dependency-repair-207-NFrEAz`.

This confirms that per-key coalescing alone cannot justify a large native-call claim on creation or all-distinct data. The final bounded correction also replaces per-row old-prefix deletes with one exact range deletion after every primary coordinate is authenticated, in the same transaction. It changes neither the logical rows reclaimed nor atomic count/cursor advancement. A forged selected journal with equal non-null old/new revisions is explicitly rejected after the existing private-marker handling: otherwise preloading could conceal the baseline's delete-before-read missing-row failure. The new negative test failed on the provisional implementation before this correction; no candidate CPU comparisons had started.

For clarity before comparative collection, the 20% request and 5% CPU gates apply to an **equal operation mix of creation + changed replacement + deletion** at the same owner count, summing actual endpoints within each matched pair. Per-operation outcomes remain separately reported and subject to the material-regression rule. This aggregate is a declared component workload, not a private-vault frequency estimate or one continuous browser lifetime. Reopen and later-edit CPU/wall endpoints and launch/restart wall cost remain separate mandatory comparisons; startup CPU before attachment is unmeasured. Neither percentage gate is changed. Candidate detailed observations must distinguish native range-delete requests from the logical rows reclaimed, and byte-boundary delivered lookahead from retained work.

## Results

### Early validation checkpoints

The first baseline work-count test failed as intended: 257 ledger reads/writes versus three per-page distinct keys. The provisional implementation passed the original focused tests, then failed the newly added impossible-same-revision negative (incorrect `ready`). The exact accepted baseline passed that same negative through a private copy of the unchanged test with only the repository bundle overridden. The corrected candidate rejects it and preserves the durable snapshot. The initial full affected suite retained three obsolete per-occurrence write expectations (21 versus 22, 12 versus 28, 604 versus 608); those failures are retained, and exact coalesced expectations now preserve the fallback/semantic checks.

Corrected real-IndexedDB affected suite: **56/56 pass, zero skips**, including exact range bounds, fractional-neighbor rollback, advanced-cursor browser restart, native abort/interruption, unsaved recovery and inherited #204/#205 contracts. Portable harness: **6/6 pass**. Actual dependency typings/typecheck and production build pass on Node **22.22.2**. Candidate runtime SourceRepository SHA-256: `5d52a7f8021c63e1898cffd57f855d6c38732962f00a7ee95457799679b63250`; candidate production main.js: `d7d3f7eb1dcad8d4b3e468bde77465159919f3b3d99f22d70a9a3797d66270fa`. Manifest/styles match baseline. Power plan read-only receipt: Windows Balanced; no power-policy change was made.

At this early checkpoint, complete comparative costs, full verification and exact-build Windows checks were pending. Later sections supersede that status. #207 remains draft and has no automatic merge/release authority.

### Detailed native operation comparison

All 26 diagnostic baseline/candidate arms passed before the lightweight cohort started. Each arm uses two owners, complete known predecessor reclamation, exact source-to-membership-to-ledger oracles, browser-process restart, and a later genuine edit. Deletion arms measure recreation separately before editing the recreated live owner. Historical baseline-only characterization predates that explicit recreation/edit split and is not pooled with acceptance CPU measurements.

| Distribution / operation | Baseline selected-repair requests | Candidate requests | Baseline ledger reads / mutations | Candidate ledger reads / mutations | Old-row delete requests, baseline → candidate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mixed / creation | 3,758 | 3,070 | 1,246 / 1,246 | 902 / 902 | 0 → 0 |
| Mixed / changed | 8,754 | 6,102 | 2,492 / 2,492 | 1,786 / 1,786 | 1,246 → 6 |
| Mixed / deletion | 5,004 | 3,076 | 1,246 / 1,246 | 902 / 902 | 1,246 → 6 |
| Mostly distinct / creation | 3,662 | 3,662 | 1,214 / 1,214 | 1,214 / 1,214 | 0 → 0 |
| Mostly distinct / changed | 8,530 | 7,322 | 2,428 / 2,428 | 2,428 / 2,428 | 1,214 → 6 |
| Mostly distinct / deletion | 4,876 | 3,668 | 1,214 / 1,214 | 1,214 / 1,214 | 1,214 → 6 |

The equal creation/change/delete mix falls **17,516 → 12,248 requests (30.1%)** on mixed data and **17,068 → 14,652 (14.2%)** on mostly-distinct data. Native cursor continuation counts as a request; transaction creation is reported separately. All membership occurrences are still read and checked. A range-delete request still retires every logical row in that prefix; it is not evidence of fewer physical writes or storage-process CPU. Mostly-distinct creation saves no calls, so a CPU benefit there cannot be attributed to fewer native operations. Authenticated unchanged replacements perform zero selected-count repair requests in both versions; their authentication/private reclamation remains necessary.

For both distributions, baseline/candidate selected-repair transactions remain **6/6 creation, 10/10 changed, 6/6 deletion and 0/0 unchanged**. Total observed transactions remain **31/31, 53/53, 27/27 and 55/55**, respectively. The ordinary narrow-row opportunity is work inside existing transactions, not a reduction from one transaction per occurrence. Wide-byte pages may split differently to enforce bounded retention; they are reported separately from these request-count totals.

Mixed selected membership JSON bytes are 187,668 after creation and 188,200 after changed replacement; mostly-distinct bytes are 189,452 and 189,760. Deletion leaves zero selected memberships. Baseline/candidate counts, digests and selected bytes match; inactive-membership, journal, known-family and test-owned lease debt close in both versions. These are logical retained bytes, not physical database size.

The candidate retains at most 256 checked occurrences across both phases and a 256 KiB encoded-row target; a legal oversized first singleton uses the inherited 4 MiB single-record ceiling. One unchecked cursor value is exposed at a time, and at most one ledger result is outstanding. Byte-boundary lookahead is checked but discarded and read again next page. Detailed delivered-row/byte maxima therefore do not prove retained-prefix or heap peaks. Corrupt storage may expose one oversized native value before validation, as in the baseline; bulk overfetch of many unchecked values is avoided.

Source-level continuation accounting is separate: the baseline awaits each membership read, its ledger read, and the enclosing per-occurrence `apply()`; a full 256-occurrence page therefore has 768 occurrence-related await resumptions. The candidate awaits up to two contiguous phase prefixes plus one callback-chained ledger pass per page, at most three such resumptions. State/journal reads, transaction completion and between-page yields remain. Native cursor/ledger callbacks still execute for each necessary read; this is not a claim that all serialized database stages disappear or that promise counts establish CPU attribution.

### Lightweight complete-cost comparison

Frozen cohort receipts: `%TEMP%\kplex-dependency-repair-207-VsdaxA`, started 2026-10-23T13:00:53Z. Detailed observers and full semantic enumeration are outside the CPU acceptance intervals. Work includes staged facts, count repair, primary journal work, complete known-old-revision reclamation, flush, inventory closure and bounded release/debt assertions. Actual source/membership/count oracles follow each interval. The same eight-owner transport batching and IPC gaps apply to both arms. No local build, test suite or native-vault probe overlaps this cohort; light source/report review continues.

The three completed mixed 128-owner pairs have the following equal creation/change/deletion sums. Each sum combines actual endpoints from that pair's separate operation arms; it is not one continuous browser run or a subtraction of independent medians.

| Pair | Renderer CPU seconds, baseline → candidate | Paired change | Elapsed seconds, baseline → candidate | Paired change |
| --- | ---: | ---: | ---: | ---: |
| 1 | 50.089 → 28.410 | −43.3% | 103.475 → 58.255 | −43.7% |
| 2 | 49.268 → 28.269 | −42.6% | 101.804 → 56.639 | −44.4% |
| 3 | 49.094 → 28.320 | −42.3% | 101.047 → 57.055 | −43.5% |

The median paired change is **−42.6% renderer CPU / −43.7% elapsed**. This satisfies the predeclared mixed component CPU gate in all three pairs; the completed distinct-key controls are reported below and final verification is tracked separately. No whole-vault or thermal conclusion follows. The measured CPU covers the current renderer's threads, not Browser/storage/utility processes. Main-thread task CPU, process launch/restart wall time, later editing and heap endpoints are recorded separately.

The initial cohort stopped after 61 saved passing arms (26 diagnostic, 35 lightweight) while starting the candidate 128-owner mixed unchanged control. Chromium initialization threw at the shared helper's bundle-readiness failure, before measured work or CPU endpoints. Initialization was outside the driver's arm try/finally, so no arm receipt was emitted. Original PowerShell native-error handling retained the throw location but lost its readiness-state JSON; the exact startup cause is unknown. The original summary and an explicitly incomplete attempt receipt are retained. This is a failed preparation prerequisite, not an excluded unfavorable timing sample. The subsequent narrow driver correction captured startup errors and permitted identity-checked resumption of missing arms without rerunning passing results. Runtime, assertions and deadlines remain unchanged.

The resumed control passed (renderer CPU 19.615 → 19.596 s; elapsed 42.797 → 42.995 s). The driver now captures startup failure, exclusively creates distinct attempt receipts, checks runtime/bundle/Node/platform/workload identities, and skips only independently loaded passed receipts with matching planned inputs. Its eight portable contracts pass. Original fixture/helper hashes were not recorded; resumption explicitly qualifies current hashes, pre-cohort modification times, unchanged shared helpers against Git and the main agent's observed no-edit interval as legacy adoption, not retrospective cryptographic proof. The original summary bytes, their hash and the incomplete attempt remain saved.

**Adverse reopen wall endpoints require investigation.** Candidate reopen elapsed exceeds the declared 10% and 5 ms threshold in at least two of three pairs for mixed creation, mixed deletion, mostly-distinct creation, changed replacement and deletion. Mixed deletion is 35.93 → 59.09, 35.12 → 49.39 and 40.43 → 580.45 ms; mostly-distinct changed includes 45.13 → 266.54 and 45.96 → 415.32 ms. Renderer reopen CPU remains about 5–6 ms. Flat renderer CPU does not explain the wait or rule out a storage effect caused by the changed write history. These results remain included. The separate diagnostic below locates database-open, lookup and closure costs after the cohort; no environmental or storage-compaction cause is established. Better aggregate maintenance results do not resolve this adverse endpoint.

Detailed transaction maxima are inclusive native transaction elapsed, not exclusive lock time or longest JavaScript task. One unfavorable mixed-creation maximum is retained: **45.7 → 68.8 ms**; mixed changed/deletion maxima are **78.4 → 30.7 / 78.1 → 26.8 ms**, and mostly-distinct creation/changed/deletion **47.8 → 26.6 / 73.7 → 37.0 / 74.5 → 39.9 ms**. These maxima cover all observed transactions in each arm, not only count repair. Separate event-loop/long-task diagnostics and native foreground checks are reported below.

### Completed acceptance cohort

All **98 required arms completed** (26 detailed diagnostic and 72 lightweight), with one separately retained incomplete browser-start attempt. Final original/resumed collection ended 2026-10-23T14:26:17Z. No failed measured interval was removed. The following values are per-operation medians; percentages are medians of actual paired changes. Unchanged controls and each 64/256 scale cell have one pair and are descriptive.

| Distribution / operation | Pairs | Renderer CPU s, baseline → candidate | Elapsed s, baseline → candidate | Median paired CPU change |
| --- | ---: | ---: | ---: | ---: |
| mixed / create | 3 | 13.298 → 9.289 | 24.577 → 17.793 | -30.2% |
| mixed / changed | 3 | 24.598 → 14.192 | 51.927 → 29.332 | -42.4% |
| mixed / delete | 3 | 11.384 → 4.866 | 24.875 → 9.999 | -57.3% |
| mixed / unchanged | 1 | 19.615 → 19.596 | 42.797 → 42.995 | -0.1% |
| distinct / create | 3 | 12.781 → 10.094 | 23.948 → 19.099 | -21.0% |
| distinct / changed | 3 | 23.884 → 16.101 | 52.639 → 33.539 | -32.5% |
| distinct / delete | 3 | 10.665 → 6.022 | 25.047 → 13.601 | -43.5% |
| distinct / unchanged | 1 | 22.843 → 23.039 | 48.158 → 48.148 | 0.9% |

| Distribution / operation | Reopen elapsed ms, baseline → candidate | Reopen renderer CPU ms | Later-edit elapsed ms | Later-edit renderer CPU ms |
| --- | ---: | ---: | ---: | ---: |
| mixed / create | 30.222 → 41.878 | 5.584 → 5.593 | 360.976 → 189.469 | 198.716 → 111.087 |
| mixed / changed | 29.002 → 29.352 | 5.930 → 5.658 | 385.686 → 197.778 | 202.168 → 113.026 |
| mixed / delete | 35.927 → 59.093 | 5.747 → 5.853 | 387.250 → 228.257 | 204.346 → 119.531 |
| mixed / unchanged | 30.300 → 317.092 | 5.555 → 6.004 | 385.301 → 245.514 | 198.956 → 140.585 |
| distinct / create | 20.408 → 26.202 | 5.223 → 5.799 | 353.446 → 229.390 | 187.778 → 128.806 |
| distinct / changed | 45.958 → 266.544 | 5.418 → 5.850 | 386.517 → 259.258 | 193.240 → 128.254 |
| distinct / delete | 39.601 → 50.215 | 5.371 → 5.644 | 366.158 → 255.859 | 193.606 → 133.232 |
| distinct / unchanged | 24.993 → 25.394 | 5.412 → 5.504 | 354.867 → 238.920 | 186.366 → 127.051 |


The declared equal operation mix has median actual-pair sums **49.268 → 28.320 renderer CPU seconds / 101.804 → 57.055 elapsed seconds** on mixed data (median paired changes −42.6% / −43.7%), and **47.331 → 32.219 CPU seconds / 101.634 → 66.569 elapsed seconds** on mostly-distinct data (−31.9% / −34.9%). All three ordinary-operation pairs improve in each distribution. No repeated material later-edit CPU/wall excess was found. The adverse reopen wall endpoints remain a separate acceptance exception.

Deletion is followed by separately measured recreation and then a genuine edit of that recreated owner: median recreation CPU **121.949 → 84.390 ms** and elapsed **201.751 → 148.225 ms** on mixed data; **112.051 → 93.804 ms CPU / 181.974 → 161.470 ms elapsed** on mostly-distinct data. These costs are not relabeled as an edit or hidden in the maintenance interval.

| Single matched scale pair / equal operation mix | Renderer CPU seconds, baseline → candidate | Elapsed seconds, baseline → candidate |
| --- | ---: | ---: |
| 64 / mixed | 24.471 → 14.281 | 49.370 → 27.704 |
| 64 / mostly distinct | 23.610 → 16.352 | 49.045 → 32.579 |
| 256 / mixed | 100.461 → 58.410 | 210.161 → 121.251 |
| 256 / mostly distinct | 95.009 → 65.426 | 209.804 → 141.228 |

| 128-owner cohort | Fresh-process launch median ms, baseline → candidate | Browser restart median ms, baseline → candidate |
| --- | ---: | ---: |
| Mixed creation | 395.307 → 451.912 | 407.369 → 462.893 |
| Mixed changed | 381.620 → 392.748 | 477.498 → 426.190 |
| Mixed deletion | 430.242 → 395.943 | 451.390 → 464.666 |
| Mixed unchanged | 461.763 → 469.859 | 430.183 → 462.792 |
| Distinct creation | 371.166 → 474.212 | 404.994 → 422.577 |
| Distinct changed | 436.367 → 382.104 | 449.617 → 410.464 |
| Distinct deletion | 466.271 → 396.823 | 459.801 → 432.670 |
| Distinct unchanged | 371.094 → 511.835 | 433.159 → 483.113 |

Launch/restart wall includes process transport and bundle initialization; startup CPU before metric enablement is unmeasured. Favorable and unfavorable launch values are retained. Endpoint JS heap ranges across the 72 lightweight arms are **1.209–91.584 MiB before / 1.707–10.814 MiB after** on baseline and **1.209–92.434 / 1.904–11.169 MiB** on candidate. No GC was forced. Lower after-values can reflect normal collection; these are neither allocation nor true peak measurements, nor evidence of identical heaps.

### Bounded follow-up: reopen penalty

Six separate diagnostic arms repeat 128-owner mixed deletion in three alternating pairs, retaining the complete preceding workload, actual browser-process restart, recreation and later edit. Private receipts: `%TEMP%\kplex-dependency-repair-207-reopen-2H2RXH`. Their counters and extra observations are not pooled with the acceptance CPU cohort. One evaluation preserves the original native await order and records local phase walls, at most eight open records and sixteen transaction records. Node CPU/event-loop endpoints and optional process snapshots remain outside the original metric requests or are explicitly observer-only. Method bindings restore immediately; terminal transaction coverage is checked after the original CPU endpoint, avoiding a new wait inside the measured operation. Eleven portable harness contracts pass, including rejection, bounded history, terminal heartbeat, and independent timer/drain/disconnect failure cleanup.

| Pair | Outer reopen ms, baseline → candidate | Native `indexedDB.open()` call-to-success ms | Browser-local total ms | Lookup/closure ms, baseline → candidate |
| --- | ---: | ---: | ---: | ---: |
| 1 | 34.751 → 532.682 | 25.1 → 521.3 | 33.2 → 531.3 | 2.5 / 4.8 → 2.5 / 6.4 |
| 2 | 37.729 → 199.163 | 27.1 → 188.1 | 36.1 → 197.7 | 2.4 / 5.5 → 2.6 / 5.8 |
| 3 | 36.740 → 47.275 | 25.7 → 34.9 | 35.5 → 45.9 | 2.2 / 6.5 → 2.3 / 7.8 |

All six arms complete with zero repair entries, count-ledger writes, pending transactions, blocked-open events or schema upgrades, and verified wrapper/fixture cleanup. The expensive interval is **native database open**, not count-repair re-execution or outer CDP/Node return latency. The outer/browser-local difference is about 1–2 ms. `SystemInfo.getProcessInfo` rejects the existing page target as Browser-target-only; the diagnostic therefore cannot identify Browser/storage CPU. Flat renderer CPU and the absence of logical repair do not establish that the penalty is unrelated to the preceding candidate writes.

The result demonstrates a **repeatable candidate-associated post-restart database-open tax under this harness protocol**. It does not establish compaction, GC, recovery, file-lock or host scheduling as its cause. Creation has adverse reopen endpoints without old-prefix range deletion, so range deletion alone cannot explain every case. Fresh profiles and equal logical data do not guarantee equal physical database state. The existing harness stops its owned process with SIGTERM and a five-second SIGKILL fallback; normal graceful Chromium/Obsidian quit is not separately measured. No GC, storage clearing, delayed measurement, longer sleep or production scheduling change was used to manufacture equivalence.

### Bounded follow-up: responsiveness

Four separate 128-owner changed-source arms cover mixed and mostly-distinct facts. Private receipts: `%TEMP%\kplex-dependency-repair-207-responsiveness-kgkacE`. The 16 ms heartbeat includes the terminal partial interval. Supported long-task observation retains only count, observed maximum and the largest eight intervals, and excludes startup/oracle work. These diagnostic CPU values are excluded from acceptance statistics.

| Workload | Largest observed heartbeat gap ms, baseline → candidate | Observed long tasks ≥50 ms | Observer cleanup |
| --- | ---: | ---: | --- |
| Mixed changed | 20.5 → 19.9 | 0 → 0 | Complete, no errors |
| Mostly-distinct changed | 28.0 → 35.4 | 0 → 0 | Complete, no errors |

These are inclusive event-loop observations over staging, count repair, reclamation, closure and IPC. No ≥50 ms long task was observed; the recorded maximum is `null`, not a claimed zero/true peak task duration. Timer gaps do not prove paint or exclusive count-owner blocking time. The existing URL-heavy <50 ms assertion remains unchanged and passed complete verification. Native foreground/edit/search/count checks are reported below.

## Final reviewed-build verification

The complete `verify:obsidian` entry point passed on Node **22.22.2**, 2026-10-23T14:53:39Z–15:16:10Z. It ran full `npm run verify`, including release/architecture checks, real dependency typings, official Obsidian lint, all tests and the production build, then staged and smoked those exact artifacts in the guarded Small vault. Totals: architecture **7**, core **130**, main **1,363**, browser UI **227**, portable sources **357**, real IndexedDB **701**; every suite has zero failures, cancellations or skips. The original URL-heavy <50 ms requirement and all deadlines remain unchanged. The inherited Windows junction-based alias-refusal safety test was retained; no skip or weakened guard was introduced.

| Final reviewed artifact | SHA-256 |
| --- | --- |
| SourceRepository.ts | `d8d6d532bb711b3cb2bb5d0e55152392495533b8eb64c069158ca8b0e98809d8` |
| main.js | `19d75415c69d8c77bbde934f618eeece2f0387459a49003090eedef61b9bb28f` |
| manifest.json | `3395e425860e5068e9f3b3d9a0e3d58cefd2c11dededc690beb87f60e733ed7d` |
| styles.css | `88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974` |

Private final receipts: `%TEMP%\kplex-207-validation\strict-verify-reviewed\report.json`, `strict-verify-reviewed.log` and `strict-verify-reviewed-process.json`. The original lint failure and stopped intermediate-normalization verification remain separate receipts, not passing runs. The final source's complete suite also passes the dedicated native-failure regression. The 20,015-owner cached-incidence and skew/cancellation tests both pass; their durations are functional-validation observations, not a matched CPU comparison.

Component comparisons use Chrome **155.0.8059.82**. Windows host validation uses Obsidian **1.14.5**, installer **1.14.0**, Electron **43.3.0**, Chrome **150.0.7871.212**, embedded Node **24.18.1**; the external driver/build runtime remains Node 22.22.2. These environments are not pooled for CPU inference. Exact-build Windows scenarios and final cleanup are recorded below.

### Native ordinary-source demonstration

The same guarded Small vault and stronger final native harness were exercised on accepted baseline `7fa00a35…` and final candidate `19d75415…`. Eight owned synthetic notes combine repeated note targets, 24 links/URLs each, nested tags and aliases. Each selected revision advances through ordinary creation, prose/label-only edits, a genuine URL/tag/resolver change, deletion of two notes and a later genuine edit. Snapshot counters are cumulative; the following deltas subtract adjacent snapshots within each actual run, never independent medians.

| Native interval | Ledger reads / mutations, baseline → candidate | Old-membership delete requests, baseline → candidate |
| --- | ---: | ---: |
| Creation | 1,392 / 1,392 → 648 / 648 | 0 → 0 |
| Unchanged-projection edits | 0 / 0 → 0 / 0 | 0 → 0 |
| Genuine changed dependencies | 348 / 348 → 111 / 111 | 174 → 1 |
| Deletion and resulting host invalidation | 2,436 / 2,436 → 822 / 822 | 1,392 → 8 |
| Subsequent genuine edit | 348 / 348 → 116 / 116 | 174 → 1 |

This is an observed request subset and eligibility/correctness demonstration, **not native CPU acceptance or a complete physical-operation count**. The native wrapper omits cursor deletion and transaction creation; concurrent host work can enter its intervals. Necessary inbound-owner reprocessing makes the deletion interval broader than the two explicit deletes. The isolated browser observer and final actual-row oracle provide the fuller transaction/reclamation evidence. Both native runs retain the unchanged #204 fast path, close count inventory and restore fixture inventory, original method identities and throttling. Private receipts: `native-baseline-confirmed/dependency-repair-native.json`, `native-candidate/dependency-repair-native.json` and `native-comparison-summary.json` under the validation root.

### Exact-build Windows interaction, recovery and restoration

All scenarios below used final `19d75415…`, serially, after strict staging. Their actual assertions pass; no native CPU comparison is inferred.

| Scenario | Result / private receipt under the validation root |
| --- | --- |
| Ordinary create/change/delete/later edit | Pass; `native-candidate/dependency-repair-native.json` |
| Deliberate failure after real edits | Expected exit1/failure retained; all four cleanup flags true, controller removed; `native-cleanup-fault/dependency-repair-native.json` |
| SI4 | Pass; `si4/si4-native.json`. `KPLEX_SI4_REQUIRED_FILES=0` labels Small functional coverage; this is not a 600-note scale claim or a relaxed semantic assertion. |
| SI5 reload/recovery | Pass; `si5/report.json` |
| Foreground navigation/edit/search | Pass; `foreground/report.json` |
| Startup admission with Plex closed initially | Pass; `startup-admission-closed`, `startup-layout-restoration.json`; original layout/configuration restored |
| Tags/folders/gate counts and search | Pass; `gates/report.json` |
| Rename/recovery | Pass; `rename/rename-identity.json` |
| Ontology edits before remaining held startup source | Pass; `ontology/ontology-startup-updates-190.json`; stationary view, early owned commits and physical provenance asserted |
| On-demand/background-URL/Responsive live updates | Pass; `live-updates-profile-final/report.json`, `live-profile-restoration.json`; original Eager settings/layout/configuration/file inventory restored |

The first one-shot final audit failed immediately after that Eager restoration reload because normal startup was still active: 5/88 indexed, `loading-cache`, one active source. Files, controller absence, unsaved/readers/decode counts and the two historical leases were already correct. The nonzero chain result and transcribed scalar receipt remain retained (`native-chain-results.json`, `final-audit-initial-incomplete.json`); this is not silently called a passing audit. A bounded readiness precondition subsequently observed natural completion, without changing runtime scheduling or assertions. The unchanged final audit then passed: **107 files / 88 Markdown notes, Eager, index/source/URL readiness true; zero pending known/resolution work, tasks, writes, unsaved sources, readers, decode reservations and test controllers**. See `restored-startup-completion.json` and `final-cleanup.json`.

The global two conservative family leases were preserved. A separate read-only fingerprint comparison exactly matches both records against the previous #205 receipt and all three retained October22 test checkpoints; `historical-lease-comparison.json` records two exact matches each. Test-owned component leases/debt close to zero; global historical protections are not deleted, expired, reset or presented as test leakage.

Independent source/harness review covered ownership, bounds, old-before-new multiplicity, atomic cursor/count/deletion commit, native error identity, concurrent writers, cleanup, TSDoc and attribution. The temporary plan marker is removed. Production changes remain confined to `SourceRepository.ts`; startup/event policy, source acquisition, settings/schema, #204 reuse, #205 reader/lease behavior and #206 are unchanged. No production vault or release deployment occurred.

## Review disposition and remaining decision

The implementation is useful and ready for **code/evidence review**, with full local and applicable exact-build Windows correctness/recovery/interaction evidence. Representative maintenance work and renderer CPU improve substantially; distinct-key and subsequent-edit controls also improve. The large cohort remains tied to measured `5d52…`/`d7d3…`, with explicit deterministic bridge and renewed final-source validation for `d8d6…`/`19d7…`.

**An unqualified performance-acceptance or merge recommendation is held.** The declared adverse reopen criterion was triggered and the bounded diagnostic locates a repeatable candidate-associated native database-open penalty. Its storage-process cost and backend cause are unmeasured. Better maintenance totals do not erase it. No speculative runtime correction, GC, storage redesign, delay or schedule tuning is proposed.

The smallest remaining decision is maintainer acceptance of the measured restart tradeoff, or one specifically scoped comparison of graceful browser quit against the existing SIGTERM/fallback restart, retaining the same completed write history and open-phase observations. That would test the remaining shutdown/physical-state confounder; it is not assumed to clear the candidate. Full-application Obsidian shutdown, macOS and physical mobile acceptance are not established by these Windows/component checks. No additional general UI manual matrix is needed for this backend-only change. #207 stays draft and must not merge automatically. GitHub publication/CI status is recorded in the PR against the published head; local verification is not represented as remote CI.


## Graceful-shutdown follow-up protocol (declared before collection)

2026-10-23: CI411 completed successfully against published implementation `479100d03c5bbed0a5e4e17da01b667f58d7d2af`; diagnostic work started independently while CI ran. Production is frozen at final source d8d6... / artifact 19d754... . Accepted baseline remains 930747... / source534a... / artifact7fa00... . Original forced-restart measurements above remain intact.

Retained forced diagnostics localized the three candidate-associated delays to native `indexedDB.open()` (25.1 -> 521.3,27.1 -> 188.1,25.7 -> 34.9ms). Lookup stayed 2.2-2.6ms; outer transport about1.2-1.6ms; repair/count writes were zero. The old helper sent SIGTERM with a five-second SIGKILL fallback and waited for root exit, but did not retain actual PID/exit/fallback receipts. Native terminal completion and physical backend quiescence were not interchangeable, and no LevelDB/GC/compaction cause was established.

New bounded comparison: three alternating baseline/candidate pairs at128 owners, mixed deletion, for both forced and graceful protocols (12 arms). Pair source order AF/FA/AF; protocol order forced/graceful,graceful/forced,forced/graceful. Same fixture, seed/transport batches, logical oracle, write/reclamation history and post-reopen recreation/edit. Final catch-only correction is distinguished from the earlier measured source. A separate2-owner four-arm smoke passed and is excluded from inference.

A passive native transaction observer is installed before setup, waits for every complete/abort event, proves repository pending transactions zero and native connection closure, then restores its binding before quit. Forced shutdown retains the original signals/deadline. Graceful shutdown sends CDP Browser.close and requires actual owned root PID exit0 without signal before a different root launches; timeout/fallback cannot earn a graceful pass. Owned profile IndexedDB regular-file stat totals are observed before shutdown and after actual exit, before launch, with their overhead separate. These totals are neither allocated disk usage nor logical live data, and do not establish equal OS caches/fsync/compaction state. No forced GC, delay, global storage change or production deployment.

Separate clocks: shutdown -> actual exit, post-exit stat observation, browser launch, browser-local native open/fixture open/lookup/flush/inventory/closure, outer CDP elapsed and observer CPU. Combined restart+reopen is also assessed so cost moved into shutdown is visible. Renderer CPU covers that process only, not Browser/storage/utility processes. Diagnostic observer CPU is not pooled with the original acceptance cohort.

Decision rule remains candidate >=10% **and** >5ms excess in at least2/3 matched pairs; inspect native open and complete restart/reopen separately. If graceful128 repeats material excess, run only bounded64/256 graceful comparison (three alternating pairs per size), then stop. All failures/unfavorable arms are retained. Contract tests24/24 pass; default non-opt-in restart semantics remain unchanged.


## Main shutdown comparison: actual results

All12 arms passed; collection16:00:53-16:09:35UTC. Private receipt directory `%TEMP%/kplex-dependency-repair-207-shutdown-ogaLcJ`; four-arm smoke `%TEMP%/kplex-dependency-repair-207-shutdown-smoke-JlQDwv`. No runs excluded or retried. The size extension was triggered by graceful native-open excess in2/3 pairs under the unchanged criterion.

Each A/F cell is baseline/candidate in milliseconds, preserving actual paired samples.

| Protocol/pair | Native open A/F | Delta F-A | Outer reopen A/F | Shutdown A/F | Launch A/F | Restart+reopen sum A/F |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
|forced/1|73.7 / 37.2|-36.5|83.9 / 51.3|99.8 / 72.2|385.2 / 351.5|576.6 / 477.3|
|graceful/1|24.9 / 40.8|15.9|35.8 / 52.6|153.4 / 131.1|331.4 / 320.5|523.2 / 507.0|
|graceful/2|454.4 / 39.2|-415.2|465.1 / 50.8|126.2 / 114.4|331.7 / 349.0|925.5 / 516.9|
|forced/2|74.3 / 611.8|537.5|84.4 / 625.4|96.1 / 80.2|342.4 / 398.6|525.3 / 1107.0|
|forced/3|26.2 / 37.8|11.6|35.8 / 50.4|91.1 / 69.5|333.7 / 339.0|463.1 / 460.9|
|graceful/3|26.5 / 39.2|12.7|38.0 / 50.5|120.9 / 124.4|326.7 / 334.2|488.3 / 511.4|

The sum includes shutdown, post-exit metadata observation, relaunch and outer reopen. It excludes the intervening fixture-binding initialization, target/SystemInfo queries and CPU endpoint calls; it is a sum of measured spans, not continuous full-application startup latency. All clocks are distinct; native open is request-call to success, not browser launch or transport.

| Protocol/pair | Fixture open A/F | Lookup A/F | closeWork A/F | Renderer reopen CPU A/F | Transport remainder A/F |
| --- | ---: | ---: | ---: | ---: | ---: |
|forced/1|75.0 / 38.3|2.3 / 2.5|5.1 / 9.3|6.7 / 6.4|1.4 / 1.1|
|graceful/1|25.8 / 41.9|2.5 / 2.4|5.8 / 6.3|6.5 / 7.1|1.7 / 1.8|
|graceful/2|455.5 / 40.3|2.5 / 2.6|5.6 / 6.6|6.9 / 6.8|1.4 / 1.3|
|forced/2|75.3 / 612.9|2.1 / 4.0|5.7 / 7.3|6.3 / 9.0|1.3 / 1.1|
|forced/3|27.0 / 39.0|2.1 / 2.6|5.1 / 6.6|6.3 / 7.1|1.4 / 2.2|
|graceful/3|27.5 / 40.1|2.2 / 2.2|6.6 / 6.5|7.3 / 6.5|1.5 / 1.6|

| Protocol/pair | Preceding delete/closure wall ms A/F | Renderer CPU ms A/F | IndexedDB stat bytes A before/after | F before/after |
| --- | ---: | ---: | ---: | ---: |
|forced/1|24396.4 / 9606.3|11065.1 / 4665.5|17920108 / 17920108|30043045 / 30067829|
|graceful/1|24348.2 / 10021.2|11122.4 / 4819.8|24450653 / 26130427|33282147 / 34368369|
|graceful/2|24330.6 / 9982.4|11122.6 / 4876.5|25048274 / 26557975|33958773 / 35527334|
|forced/2|25209.5 / 10221.9|11444.4 / 4868.1|25402275 / 25419800|35194047 / 35219021|
|forced/3|25164.7 / 10128.8|11228.6 / 4789.6|25000722 / 25030170|18839097 / 18857855|
|graceful/3|24771.3 / 10358.5|11096.5 / 4920.6|25209029 / 26701558|33800759 / 35181866|

Every arm starts from the same verified128-owner logical inventory:79,744 memberships,12,038,784 logical JSON bytes and24,982 distinct keys. After deletion and reopen there are128 tombstone owners, zero selected membership bytes/keys, and zero repair/pending/dirty/journal/inactive/lease/reader/decode debt. This is not a physically empty database. All pre-quit native transaction starts equal terminal completions plus aborts, pending=0, connection-close check passes, bindings restore. Graceful roots acknowledge Browser.close and exit0 without signal/fallback; forced roots report SIGTERM (no SIGKILL escalation); every replacement PID differs. Reopen executes zero repair entries/count writes, and later recreation/edit/oracles/cleanup pass.

`SystemInfo.getProcessInfo` is unavailable through this page target (explicit failure retained), so these results do not attribute Browser/storage/utility CPU. Renderer ProcessTime includes renderer threads only, and Node observer CPU is separate. No renderer CPU spike explains the native wait.

Exact diagnostic protocol receipts:

```json
{
  "sourceHashes": {
    "A": "534a061e64ddfe7a609cc774788567ec8ba6afc4c953ea556e7ff9834fe4c63e",
    "F": "d8d6d532bb711b3cb2bb5d0e55152392495533b8eb64c069158ca8b0e98809d8"
  },
  "bundleHashes": {
    "A": "0a5005f3350f0f68e3bcc9f0779b18c861090907466bf0acb168b3a0db1d5add",
    "F": "343bec7712a7b5c7f9a9f0a7cd1cd98907c92e8ce7ab2cbb16d1aebf0b10dc76"
  },
  "productionArtifacts": {
    "A": "7fa00a354d38fb2cedecbb9d15c5277e0513813b7074d487f5ebda9820c2b79f",
    "F": "19d75415c69d8c77bbde934f618eeece2f0387459a49003090eedef61b9bb28f"
  },
  "protocol": {
    "version": "dependency-repair-207-shutdown-v1",
    "transportBatch": 8,
    "seedBatch": 32,
    "fixtureSha256": "ba747512909fecc4cdf78bc909c68dec7c91dd9abc43932ae15e046c8fd3374e",
    "browserHarnessSha256": "1679543234a82e3707b4a8929ace6f9baabadc16011026371bfc87e5aaaeac93",
    "contributorFixtureSha256": "65232eb0125dbe5da9a924c6247ef6a4ce087f7deb2a3b0aade9170226e4c41a",
    "lifecycleSha256": "68e2c0a71b2c5d5c31e3c972eb4b1f05f2e32e7c7c6abdedf475d8e130e39a7f",
    "completionObserverSha256": "7f9f9d5236adb503b40b16dee118d73035ed8eb3cd109cb98d2160d9ba8df6fe"
  }
}
```


## Bounded graceful size comparison and final decision

All12 extension arms passed,16:09:52-16:21:22UTC, three alternating pairs each at64 and256 owners. Private receipts: `%TEMP%/kplex-dependency-repair-207-shutdown-size-p4E6aZ`. Together with the main12 and smoke4, all28 browser arms pass; no failures, exclusions, retries or extra measurements. The inherited generic summary condition says128 owners; actual arm configs/oracles and the predeclared size protocol correctly specify64/256. No source or runtime artifact changed.

| Owners/pair | Native open A/F ms | Delta F-A | Outer reopen A/F ms | Shutdown A/F ms | Launch A/F ms | Restart+reopen sum A/F ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
|64/1|13.3 / 35.5|22.2|23.3 / 43.9|111.8 / 180.1|330.6 / 371.6|468.3 / 597.7|
|256/1|34.7 / 118.2|83.5|42.9 / 204.4|149.6 / 174.1|332.8 / 340.2|528.1 / 722.4|
|256/2|32.5 / 89.1|56.6|41.0 / 164.1|143.2 / 157.0|343.9 / 351.7|531.0 / 676.5|
|64/2|14.2 / 29.5|15.3|23.3 / 37.6|143.3 / 133.7|354.8 / 331.8|523.2 / 504.9|
|64/3|15.2 / 37.8|22.6|24.2 / 49.0|139.6 / 156.7|352.0 / 325.0|518.0 / 532.6|
|256/3|34.1 / 117.7|83.6|43.7 / 184.2|170.5 / 144.5|353.9 / 339.7|570.4 / 672.2|

| Owners/pair | Lookup A/F ms | closeWork A/F ms | Renderer reopen CPU A/F ms | Delete/closure wall A/F ms | Renderer write CPU A/F ms |
| --- | ---: | ---: | ---: | ---: | ---: |
|64/1|2.7 / 2.3|4.3 / 3.6|6.6 / 6.3|13127.8 / 5312.7|5558.1 / 2918.3|
|256/1|2.2 / 2.7|3.6 / 81.1|6.5 / 7.0|50166.3 / 23354.3|22858.8 / 10064.5|
|256/2|2.5 / 2.2|3.6 / 70.0|6.6 / 6.8|50601.9 / 23736.9|23290.2 / 9961.6|
|64/2|2.4 / 2.1|4.3 / 3.6|6.3 / 6.1|12039.4 / 5038.6|5756.9 / 2563.2|
|64/3|2.3 / 2.3|4.3 / 6.3|6.6 / 6.4|11932.1 / 4951.9|5718.1 / 2477.2|
|256/3|2.2 / 2.4|4.0 / 61.5|6.7 / 7.0|54308.9 / 23741.1|24929.1 / 10269.8|

| Owners/pair | IndexedDB stat bytes A before/after | F before/after |
| --- | ---: | ---: |
|64/1|7575507 / 7575593|17106485 / 17106485|
|256/1|29607939 / 29607939|61504098 / 61504098|
|256/2|29607916 / 29607916|70390515 / 71795124|
|64/2|7601963 / 7601963|16946506 / 16946506|
|64/3|7583458 / 7583458|12744595 / 14583107|
|256/3|29648346 / 29648346|60806192 / 60806192|

All size arms retain the same native terminal-completion, connection-close, actual exit0/new PID, zero reopen repairs/count writes, recreation/edit/oracle and independent cleanup assertions as the main study. Baseline/candidate full logical before/after oracle objects match in every pair.

| Logical starting inventory | Memberships | Logical JSON bytes | Distinct keys |
| --- | ---: | ---: | ---: |
|64 owners|39872|6015744|12566|
|128 owners|79744|12038784|24982|
|256 owners|159488|24098688|49814|

**Recommendation: Keep draft (option3).** The candidate-associated penalty is not confined to SIGTERM/fallback. At256 owners, native-open deltas are +83.5,+56.6,+83.6ms, and combined restart/reopen deltas +194.3,+145.5,+101.8ms; all three pairs trigger the unchanged material criterion in both intervals. This is larger than the13-16ms non-outlier native excess at128 and the roughly20ms-scale excess at64. The sample supports growth at256; it does not establish a monotone scaling law or a bound for larger databases/vaults. The128 baseline454.4ms graceful outlier and forced candidate611.8ms remain retained. Graceful shutdown is reassuring about actual clean exit, but is not a performance cure.

The expensive interval is localized to native open, plus approximately61-81ms closeWork in the256 candidate arms (see phase table), with no pending repair/count work. It is not browser launch or CDP transport alone. Browser/utility/storage CPU is unmeasured; no backend profile establishes WAL recovery, compaction, range-delete processing or GC as the cause. The preceding implementation demonstrably changes work and physical file history, but file-size observations do not identify a storage mechanism. Native transaction closure and clean root exit rule out those missing lifecycle prerequisites; they do not prove equal physical state or OS cache.

Maintenance remains substantially cheaper: at256 each paired delete/closure saves26.8-30.6 seconds wall and12.8-14.7 renderer CPU seconds. These diagnostic cost observations are not pooled with the original acceptance CPU cohort or used to raise the tolerance. The implementation, #204 reuse, #205 reader protection, prior correctness/native evidence and original forced results remain intact. No production fix is proposed without a demonstrated backend cause. The smallest future causal diagnostic would be a targeted browser/storage-process trace of this bounded256-owner baseline/candidate history and native-open/closure interval; it was not added to this bounded assignment. Alternatively the maintainer can explicitly accept this measured, size-sensitive tradeoff. No automatic merge, release, production deployment or #206 change.

Measured diagnostic driver SHA256: `c2f9775b090b26e3c57bb39fbdc64b8da87b719d1db40367f21b6920f776e828`. Browser fixture/helper/lifecycle/observer and A/F bundle/artifact hashes match the main protocol block above for all extension arms. Raw receipts and measured-driver copy stay private. Reproduction uses pinned Node22.22.2, `KPLEX_REPAIR_BASELINE_ARTIFACT_DIR` pointing to verified baseline7fa00... main.js, unchanged candidate dist19d754..., and commands `node scripts/testing/dependency-count-reuse.mjs repair-shutdown-smoke`, then `repair-shutdown`, with `repair-shutdown-size` only when the fixed trigger is met. Do not pool these diagnostic observers with earlier acceptance timings.


Follow-up validation: pinned Node22.22.2 `node --test --test-concurrency=1 tests/chromium-lifecycle.test.mjs tests/restart-completion-observer.test.mjs tests/dependency-count-reuse-harness.test.mjs tests/source-local-dependencies-indexeddb.test.mjs` passes **81/81**, zero failures/cancellations/skips,70.0s. Private log `%TEMP%/kplex-207-validation/shutdown-final-regression.log`. New contract tests are included in `npm test`. All28 owned browser profile paths are absent after their recorded passing cleanup. CI411 run39978278077/job120498537183 completed successfully (npm ci and complete npm run verify) against479100d03c5bbed0a5e4e17da01b667f58d7d2af. Follow-up changes are diagnostic tooling/tests/docs only; the completed real-dependency build/full local/native validation and CI remain applicable to unchanged production source/artifact. No new production build/native matrix is claimed for this diagnostic-only checkpoint. No further general UI manual checks are required; full Obsidian shutdown/macOS/mobile performance acceptance remains unclaimed.


## Focused storage-isolation return

Zsolt's Codex Agent. The [separate causal report](dependency-repair-storage-207-2026-10-23.md) preserves this entire historical report and adds three A/B/C/D quartets, three read-control quartets, six detailed native-operation arms and three complete repeated cycles for each of baseline/candidate. A failed post-work metadata observation is retained and independently corrected/tested. Browser-root CPU now identifies additional reopen/closure cost, without an engine-level cause. Neither simple partial revert nor tested read strategy fixes the penalty; both repeated histories keep growing within the bounded window.

Recommendation remains **keep draft**. No runtime change or speculative fix is adopted; production source d8d6d532… and main.js19d75415… remain unchanged.114 focused contracts pass, plus reused exact-artifact real-dependency/full/native evidence above. CI411/412/413/414 passed; current publication checks are reported separately on the PR. No changed thresholds, production deployment or #206 interference.


### Subsequent maintainer acceptance for scoped merge

On2026-10-23 the maintainer stopped the causal investigation and explicitly accepted the reopening-latency/physical-storage tradeoff, unresolved backend cause and lack of production-vault scaling bound, conditional on CI and affected integration. This is an accepted limitation, not a performance pass or changed threshold. The [storage-isolation report](dependency-repair-storage-207-2026-10-23.md) retains both storage-growth sequences as a separate open follow-up and records the unchanged-source125-test real-IDB plus native foreground/SI5 integration passes. All prior adverse measurements and failed/incomplete attempts remain intact. Final CI/merge receipts are on PR207.
