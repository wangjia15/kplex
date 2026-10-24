# URL-heavy indexing timer investigation — 2026-10-24

Prepared by **Zsolt's Codex Agent**. This is an investigation, **not a validated replacement guard or a production performance fix**.

## Decision

The timer helper is an unreliable attribution instrument: a delayed callback does not establish that K-Plex executed one JavaScript task of that duration. Controlled no-application cases demonstrate this in Node and Chromium. **The cause of the historical natural CI failures remains unproven.** No natural >50 ms P15 failure reproduced in this bounded series, and no production regression was established. Retain the existing `<50 ms` P15 and `<45 ms` parser assertions unchanged. Do not replace them with CPU-only timing or an unvalidated Long Tasks check.

A reliable replacement satisfying the complete requested contract was not established. The next experiment is one bounded, instrumented Linux CI series that preserves the existing assertion and captures task/GC attribution on a naturally failing sample. No production optimization, scheduler/storage change, dependency change, merge, release or native-vault deployment is justified by these results.

## Identity and conditions

- GitHub main was confirmed as `894437d97bd0e21733e9072fcbecafa7e5d46e0e` (merged #210). The initially clean local main was `6295b329`; it was fast-forwarded before any execution. No open PR existed at the initial GitHub check.
- Every production/workload input remained at that accepted revision. No baseline/candidate production comparison was warranted. The diagnostic copies changed observation/setup only; the committed test remains intact.
- Node **22.22.2**, macOS **14.5 / 23F79**, arm64, 8 available logical CPUs; Google Chrome **156.0.8078.48**, using the existing `chromiumHarness`/`contributorBrowserBundle`. Disposable profiles and finite host doubles; real production modules and real Chromium IndexedDB.
- Installed dependencies were real and healthy under `npm ls --depth=0`: TypeScript 5.9.3, Obsidian 1.13.0, esbuild 0.25.5, React/ReactDOM 19.3.0, ESLint 9.39.5, official Obsidian lint plugin 0.4.2. The default shell was Node 18; all executions explicitly selected the required Node installation.
- Primary runs were serial, with detailed instrumentation in separate runs. An initial Node setup failure overlapped browser bootstrap; it reached no measured sample and is retained. There was no deliberate competing test load. Read-only process snapshots showed `suggestd` around 96–99% CPU and varying IDE/window-server activity. These snapshots are not interval measurements or proof of the source of a particular gap. The host was not exclusively reserved.
- Browser runs checked the intended focused, visible document. They are headless Chromium observations, not native Obsidian, physical-mobile or actual-paint acceptance. Main-thread/process CPU and callback availability are separate quantities.

## Historical evidence retained

The [#210 report](indexing-event-convergence-210-2026-10-24.md) retains CI426's **64.8 ms** failure, unchanged-head retry and later successful checks. Its changed reconcile/admission branches are not directly invoked by the measured patch; earlier state cannot be excluded by reachability alone. This investigation does not attribute the failure to #210.

Earlier records include:

- [Indexing-status integration](indexing-status-integration-2026-10-09.md): 56.2, 60.9, 65.3 and 63.2 ms; allocation, GC and runner scheduling were hypotheses without attribution.
- [SI4 acceptance](settings-independent-indexing-si4-acceptance-2026-10-03.md): 55.3, 95.7, 196.6, 74.5 and 60.1 ms; some runs overlapped heavy native startup, with no universal causal conclusion.
- [On-demand v2](on-demand-indexing-v2-2026-10-06.md): 50.8, 56.7 and 52.4 ms; the isolated failure overlapped a reference rebuild.
- [C08P](C08P-2026-09-26.md) and `C12a-2026-09-26.json`: host-churn failures and 70.6 ms, respectively, preserved with later passes.

The maintainer's other 53–65, 70.9 and 84.3 ms observations remain supplied historical evidence, not newly reproduced/attributed samples. No historical file was edited or failure erased.

## What actually runs

**P15 is a Node test, not a Chromium test.** `scripts/run-indexing-tests.mjs` launches `tests/indexing.test.mjs` with `process.execPath`; line 378 aliases `globalThis.window = globalThis`. The `window.setTimeout`, `MessageChannel` and `performance.now()` used there are Node facilities. Real Chromium tests run elsewhere in normal verification, after the indexing script, and cannot concurrently explain its P15 gap within that same serial command. Other processes/jobs can still contend externally.

The production path is:

1. `GraphIndex.patchMarkdownPaths()` cancels/defer-schedules persistence/cleanup, resolves files synchronously, acquires a generation and starts source acquisition. It constructs the actual GraphBuilder, with `workScheduler.checkpoint(2)` as its priority boundary.
2. `GraphBuilder.patchMarkdownFiles()` captures native identity/path/mtime/size, accepts the exact hot parsed body, and calls real source acquisition. Acquisition performs environment hashing, inspection/collection/comparison and optional persistence. Hot parsing is excluded; acquisition is not excluded. In Node, IndexedDB is unavailable and the real degraded-storage path runs. Chromium exercises real storage, so those timings must not be pooled with Node's.
3. Source fingerprints stream URL/topology/provenance tokens, checkpointing after bounded characters/scan steps. Overlay compaction, source-patch preparation and shared compiler/resolver work stay private and copy-on-write. Compiler budgets are 13 ms desktop / 9 ms mobile / 7 ms iOS.
4. Old/new evidence, URL origins, affected endpoints and canonical pair resolution use bounded loops and cancellation checkpoints (including 128-record and 32-endpoint batches). A checkpoint returning a resolved promise is **not** a browser/Node task yield. Once the clock budget is consumed, `yieldToHost()` awaits the disposable `MessageChannel` helper and the existing priority checkpoint, then rechecks lifetime. Other sources also use this task helper.
5. Immediately before publication there is a forced host-task yield and exact file/lifetime fence. `publishFileCommit()` accepts one synchronous callback, invokes it once, and expires it on return/throw. There is no await during partial live mutation.
6. `commitPatchState()` preserves canonical existing GraphPage objects and publishes large page/lowercase/field overlays rather than replaying all changes. This does **not** make the whole commit constant-time: existing-page rebinding, touched-path bookkeeping, presentation facets, URL-facet synchronization, cache invalidation, search entry updates and subscriber notification remain synchronous. `commitPreparedFile()` / `publishIncrementalFile()` own these coherent updates.
7. Post-commit work yields/checks cancellation, returns the result, schedules deferred snapshot/orphan work and releases building state. Deferred callbacks can execute before the next observed timer, including callbacks initiated earlier in the monolithic fixture.

Relevant owners: `src/index/GraphIndex.ts` (`patchMarkdownPaths`, `commitPreparedFile`, `publishIncrementalFile`, `patchSearchIndex`), `src/index/GraphBuilder.ts` (`patchMarkdownFiles`, `yieldToHost`, `commitPatchState`, compiler runtimes), `src/index/SourceFingerprint.ts`, `src/adapters/obsidian/sourceAcquisition.ts`, `src/adapters/obsidian/yieldToHostTask.ts`, `src/core/graph/patch.ts` and `src/core/graph/resolver.ts`.

Cancellation rejects private current work after awaited boundaries; already committed files remain committed. Publication, source fingerprints, cache/search coherence, URL/evidence provenance and canonical identity cannot be split by inserting an await in the final commit.

## What the helper proves and does not prove

`maxTimerGapDuring()` timestamps successive zero-delay callbacks, starts the first pending callback before work, awaits the operation, sets `running = false`, then awaits another zero-delay callback to drain. Its maximum is **elapsed callback spacing**.

- One large synchronous task or an unbroken chain of microtasks can increase it.
- GC, descheduling, other runnable callbacks and task-source ordering can increase it too. Several cooperative tasks can fit between two timer callbacks. A large gap is not a duration measurement of any one task or function.
- Preparation performed synchronously before entering the helper is outside its nominal interval, but allocations can cause later GC. Earlier asynchronous work is not retired by starting this helper.
- The final pending tick can run **after** work has completed and charge that later delay to the operation. The helper has no completion clipping or explicit observation-validity result. These are source-established limitations; they are not proof of which mechanism caused a historical failure.
- The measurement allocates timer callbacks and calls a clock, perturbing the event loop. Diagnostic arrays/hooks add more overhead; instrumented results below are deliberately separate.
- Node imposes a minimum timer delay and explicitly does not guarantee exact callback timing/order: [Node timer contract](https://github.com/nodejs/node/blob/v22.x/doc/api/timers.md). Browser nested timer clamping also differs from Node behavior. The Chromium idle controls here settled near 5 ms; this is observed scheduling, not application work.
- Chromium Long Tasks measure a task plus its microtask checkpoint and certain browser-thread intervals using elapsed time. They do not identify exclusive K-Plex CPU or remove OS preemption/GC: [Long Tasks specification](https://www.w3.org/TR/longtasks-1/). Positive controls must exercise real task dispatch, not just inspector evaluation.

The two existing `<45 ms` parser assertions use exactly the same helper in exactly the same Node environment, so they have the same attribution/tail limitations. Their observed results remained below threshold; no parser regression or justified correction was demonstrated. They remain unchanged.

## Controlled observations

The 18 invalid browser attempts are retained in append order: eight evaluation-syntax errors, six cancelled patches from an unsettled seed, two observer-syntax errors, one missing diagnostic export and one cancelled diagnostic patch. Cancelled setup attempts did not retain a completed callback-gap array and are not performance samples or passes. The corrected fixture awaited actual source/writer closure; it bypassed no production lifetime check. The initial isolated Node setup failure is retained separately.

All numbers are milliseconds except explicitly stated CPU seconds. Every primary callback gap, ordering, diagnostic event and setup failure is retained in the raw packet; the [companion JSON](url-heavy-timer-investigation-2026-10-24.json) records distributions and per-run results. No timed failure was excluded to manufacture a pass.

| Context | Runs | P15 maximum gap in run order | Callback observations per patch |
| --- | ---: | --- | --- |
| Isolated Node P15, fresh processes | 7 | 19.184, 21.224, 22.188, 19.204, 16.827, 18.622, 18.769 | 103–106 |
| Complete indexing file, fresh processes | 6 | 19.825, 30.729, 18.860, 18.366, 21.601, 19.791 | 87–92 |
| Chromium primary, fresh processes | 6 | 26.3, 31.2, 32.8, 26.7, 26.9, 32.2 | 1,373–1,441 |
| Chromium fixture-validation pilot | 1 | 28.0 | 1,396 |
| Separate Chromium diagnostics | 2 | 33.7, 28.7 | 1,355 / 1,388 |

Isolated Node patch gap p95 values were 14.669–16.262 ms; full-file p95 values 13.804–15.706 ms; primary Chromium p95 values 5.1–5.2 ms. Node patches took roughly 0.5 seconds. Real-IDB browser patches took 6.0–6.3 seconds. These different storage conditions are intentional and not a speed comparison.

The isolated Node copy reused the original compilation/host fixtures, seeded a fresh eager index and the managed note, then executed the original P15 block through restoration, including cancellation, retry/search, canonical targets and GraphPage identity. It excluded preceding P1–P14 mutations. Full-file copies preserved all original ordering and assertions. The primary helper preserved original timer scheduling/drain semantics, adding stored gap observations and one summary line after work. The committed original indexing script also passed independently.

### Negative and positive controls

- Each of seven isolated Node runs included an ordinary 200 ms idle control: maximum gaps **1.36–1.63 ms**, with many observations. Each 80 ms busy-loop control produced **80.44–81.00 ms**, so the unchanged 50 ms rule rejects all of them.
- Chromium primary controls produced approximately **5.1–5.6 ms** idle maxima and **80.0–80.2 ms** busy-loop maxima. They exercised the same measurement helper around no patch work and around deliberate blocking, respectively.
- Three Node no-patch controls externally suspended **only their own disposable Node process** using a child-owned SIGSTOP/SIGCONT pair. Callback gaps were **82.271 / 81.688 / 82.467 ms**, despite only about **3.5–5.3 ms process CPU over the whole control**. These intentionally fail the wall-gap assertion without K-Plex work. They demonstrate a mechanism, not that CI experienced a process stop.
- Two no-application browser controls explicitly froze/resumed only their disposable page. Gaps were **358.2 / 1,093.4 ms**, with no Long Tasks entries. An additional pair with native-task positive validation yielded **1,062.9 / 1,097.0 ms** no-work gaps and no long task overlapping those intervals. Lifecycle restoration/timer scheduling adds delay beyond the commanded 100 ms; it is not application CPU or a simulation of CI's exact contention.
- Direct CDP `Runtime.evaluate` busy loops produced the expected 80 ms timer gaps but **no Long Tasks entry** in the first control pair. The corrected control dispatched the loop inside an actual browser timer: gaps **80.7 / 80.3 ms**, and an **80 ms Long Tasks entry in both runs**. A replacement relying on absence of Long Tasks without this control would be invalid.

Duration-matched negative controls were then run serially after full verification, after the same 10,000-URL body preparation and cache priming. Three 500 ms Node idle windows measured **5.59 / 7.77 / 7.85 ms** maxima with **368 / 362 / 368** callbacks. The following actual P15 patches still passed (18.80 / 16.97 / 17.70 ms), but those timings are kept separate from the primary series. Three fresh-browser 6.2-second no-patch windows measured **12.5 / 12.3 / 15.6 ms** with **1,369 / 1,368 / 1,366** callbacks. The real patch and semantic checks ran afterward, outside each browser negative interval. These controls pass the unchanged 50 ms criterion with ample observations; their longer horizon/preparation differs from the earlier 200 ms controls, so the difference is not exclusive GC or scheduler attribution.

### Separate attribution diagnostics

- Two Node dispatch-only observations saw 447/449 MessageChannel deliveries; largest between-dispatch intervals about **14.4 / 16.4 ms**. The largest dispatch-wait intervals were about 19.2 / 13.3 ms. Waiting intervals include scheduling/other work and cannot be labeled exclusive idle or CPU.
- A separate Node CPU diagnostic grouped Promise/nextTick/microtask continuations until the next observed native async callback, using `async_hooks` plus Node 22.22.2's `process.threadCpuUsage()`. The isolated patch's largest such CPU interval was **21.568 ms**; publication **14.949 ms**, including search **6.799 ms**. The 80 ms blocking control consumed **80.077 ms** in one observed CPU interval.
- Three full-file CPU/GC diagnostic patches had maximum CPU intervals **23.239 / 19.118 / 19.068 ms** and atomic publication **20.022 / 17.451 / 17.237 ms**; search contributed **10.193 / 7.628 / 7.430 ms**. GC observations numbered **42 / 41 / 42**, with largest reported durations **5.797 / 5.773 / 8.953 ms**. These are GC performance entries, not exclusive stop-the-world attribution. No observed GC event explains a >50 ms failure. A slower/shared Linux runner could still spend >50 ms in the same synchronous publication; the Mac measurements do not exonerate that path.
- Full-file forwarding also observed two very short private-state commits/search updates near the start of P15, before the final measured-source commit. A follow-up identified the same plugin but a different live graph-state object (about 0.013–0.024 ms per private commit). This demonstrates nonexclusive activity in the interval; it does not establish a harmful earlier-test leak or the owner of a historical large gap.
- The diagnostic CPU clock controls grouped two 40 ms microtask-separated pieces into about **79.7 ms**, but two real timer-separated pieces into about **40.1 / 39.8 ms**. The idle control consumed <1 ms CPU while waiting about 151 ms. This is useful attribution, **not an absolute elapsed-response guarantee**: a descheduled or synchronously sleeping thread can have little CPU time. Observer overhead also changes slice cadence. Hooked full-file patches took 687–693 ms versus 432–467 ms in the unhooked observations, so these diagnostics are not primary performance comparisons or overhead-free method estimates.
- The two browser diagnostic patches had no Long Tasks entries overlapping the work; native-task positive controls separately verified the observer. The patch entry itself was invoked through inspector evaluation, so its initial segment has the inspector-attribution limitation demonstrated above. Absence of entries is not complete proof that every segment stayed below 50 ms. Existing-renderer process CPU increased by **2.981 / 3.014 seconds** across their inclusive sampling windows. This includes renderer work beyond exclusive K-Plex JavaScript and must not be summed with method timings.

A further deliberately synchronous **80 ms `Atomics.wait` sleep in Node** produced an **85.85 ms timer gap** but only **0.374 ms main-thread CPU** in its observed interval. The elapsed guard correctly rejects this positive blocking control; a CPU-only 50 ms replacement would incorrectly pass it. No SharedArrayBuffer/Atomics code was added to the application or committed tests.

## Validation and limits

- Unchanged `node tests/indexing.test.mjs`: pass.
- Six observed full indexing-file runs and seven isolated runs: all original P15 correctness/timing/cancellation/identity/search assertions passed; the full-file parser guards passed too. Six additional Node diagnostic runs passed. Browser checks verified actual patch result, final URL, canonical managed-page identity and URL search.
- First `npm run verify` attempt: P15 passed; later **47 browser tests failed because the sandbox prohibited `127.0.0.1` listening**. Preserved as an environmental failure, not reported as green.
- Unrestricted Node 22.22.2 `npm run verify`: **pass**, including 7 architecture, 130 core, 1,417 main, 227 DOM, 357 portable-source and **736 real-IDB browser tests**, zero failures/skips, official lint and the real TypeScript/production build. The real-IDB group took 868.6 seconds; this required suite was not a new optimization campaign.
- GitHub [CI432](https://github.com/zsviczian/kplex/actions/runs/40070654483): **green for the exact accepted main `894437d`**, confirmed via GitHub. This is baseline evidence, not a candidate correction's CI. No final implementation or correction PR exists, and no candidate remote CI is claimed.
- Temporary test modules were copied into the raw packet and removed from `tests/` before final normal verification. Their wrappers/ports/GC observers were retired; browser profiles/servers were cleaned in `finally`. Process-suspension children resumed only their owned processes and exited. No Obsidian vault was opened, changed, staged or deployed to.
- No runtime, dependency, architecture, identity, provenance, scheduler or performance threshold changed. No native/popout/mobile acceptance is claimed or necessary for an unchanged application. This bounded local series cannot establish a low shared-CI failure rate, universal hardware budget or absolute wall-clock guarantee.

## One proposed next experiment

Run one **predeclared five-pair series (ten fresh processes)** of the complete indexing file on the existing Ubuntu/Node 22.22.2 CI runner. Alternate an original invocation with a separate lightweight diagnostic invocation. Keep the exact accepted source, dependencies, workload/order and `<50 ms` assertion in both arms. Retain every result and upload artifacts **even on assertion failure**; a failed assertion keeps the job red. This is a fixed diagnostic series, not retries until green.

The diagnostic arm should forward only existing host-yield post/delivery and synchronous publication/search boundaries, recording bounded elapsed/main-thread CPU coordinates plus GC performance entries and completion/tail coordinates. Do not use the demonstrably expensive per-Promise `async_hooks` probe in the primary arm. Compare observer overhead in the paired receipts, and never use diagnostic numbers as uninstrumented timing or as attribution for a different sample. If only an original invocation fails, preserve that failure as unproven; a diagnostic pass does not explain it. Stop after this bounded series if no natural failure reproduces rather than expanding into a benchmark campaign.

A naturally failing diagnostic sample can direct one narrowly targeted V8 trace if its coarse boundaries remain ambiguous. The failure's attribution should choose the next correction:

- One high-CPU synchronous interval in publication/preparation: inspect that exact stack/owner and propose the smallest safe boundary-level change, preserving atomic publication.
- Timer gap spanning cooperative deliveries with no comparable CPU interval: evaluate a deterministic yield/work contract plus a separately labeled environment-sensitive renderer measurement. Do not equate CPU time with elapsed responsiveness.
- GC overlap or elapsed/CPU divergence within a task: retain it as mixed/uncertain and capture a single targeted V8 trace of that interval; do not silently remove GC/outliers or raise limits.

This experiment targets the missing evidence: **a naturally failing sample with attribution on the actual failing platform**. Broad indexing optimization is outside scope.

## Delivery state and evidence packet

Recorded as two validation documents on `main`, based on accepted source `894437d97bd0e21733e9072fcbecafa7e5d46e0e`: this report and its companion JSON. The documentation commit is identified by Git history. Source, committed tests, dependencies and historical evidence are unchanged. No correction was established, so no correction branch or implementation PR was created; candidate CI and a merge recommendation remain unavailable. HANDOFF and the paused architecture plan are untouched.

Raw synthetic observations, successful/failed logs, timing scripts, run order, controls and input hashes are preserved in `/private/tmp/kplex-timer-investigation-evidence.zip`; unpack its README for the original execution order and reproduction limits. The companion JSON retains every valid primary sample's distribution, separate diagnostic/control results, setup-failure ordering and build artifact hashes. The raw packet is local, not a GitHub artifact or CI publication. It contains the original precommit report/JSON snapshots; only their delivery notes were subsequently updated for the documentation commit. No manual/device test is needed for unchanged product code; the specified CI experiment remains outstanding.
