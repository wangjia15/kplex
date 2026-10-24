# PR210 indexing event convergence — validation and review

**Disposition:** recommend merging as a scoped improvement after maintainer review.
The PR remains draft and is not merged. Final implementation/tooling CI430 passed
at `f4c9073c22109d7f61eb1c512e3a3192bb183acc`; final documentation-checkpoint CI
and remote publication are recorded on the PR. Runtime bytes remain those of
`a61b92485102ac6483a37dc0a63e17bbfaa59908`, artifact `6400bb47…` below.
All required applicable Windows lanes pass, including natural event convergence,
recovery and exact configuration restoration. This does not establish that every
historical #202 symptom is fixed, nor complete the broader indexing CPU objective.

Prepared by Zsolt's Codex Agent. Accepted comparison baseline:
`90032c6d7499fa4e40179110f7b5672d356aa390`, including accepted #206/#207.
Initial branch head: `162f10b16c13d35444609314e44323738723c257`, initially clean.
Fetched main subsequently contains only release-metadata commit `6295b329…` beyond
that baseline. It is preserved; comparisons do not silently adopt a new baseline.

## Historical evidence and current reproduction

The two #202 reports cited in the PR have no exact source/artifact identity.
Their dictionaries distinguish overlapping activity intervals, checks from unique
owners, and full-build starts from completed builds. They motivate these tests;
they do not prove the same multi-hour symptom survives current accepted code.

The corrected deterministic real Chromium IndexedDB fixture starts from 24
authenticated source owners and complete dependency authority. An actual unscoped
resolver close starts broad validation. Three modify/metadata/known-resolver waves
are delivered at fixed owner boundaries 6, 12 and 18, targeting the last, first,
then last owner. Cardinality, order and final content are identical in both arms.

| Result | Accepted baseline | Initial correction |
| --- | --- | --- |
| Inventory outcomes | false / false / false / true | true |
| Markdown inventories | 4 | 1 |
| Dependency ensures | 65 | 28 |
| Delivered mutations | 3 | 3 |
| Authenticated final values | changed-1 / changed-2 | changed-1 / changed-2 |

This is work-count/causal evidence, not comparative CPU or native throughput. Both
arms eventually close. The baseline test intentionally fails the predeclared
one-sweep-plus-repair allowance of 36 ensures; the candidate passes. The initial
62-ensure characterization used an event trigger based on repeated ensure counts.
It reproduced cancellation, but the faster candidate received only two events.
That candidate attempt failed the cardinality check. It is retained as a harness
failure and is excluded from equal-input comparisons, not reported as a speedup.
Corrected baseline receipt: private `%TEMP%/kplex-210-causal-lryPQb/baseline.log`.

The causal chain is known native source event → exact inventory revision advance
→ broad callback cancellation → global/local authority remains incomplete → next
broad admission revisits the completed prefix. Existing durable source facts and
parser input survive, but they do not themselves certify dependency completion.

## Correction and validity contract

The acquisition owner retains its exact inventory revision. One additional scalar
scope revision distinguishes known same-incarnation Markdown source events from
topology, unknown/global resolver, environment, pause and unload invalidation.
Broad work can retain the former scope; each source still checks native identity,
path, stat, event revision, metadata identity, environment and repository selection.
An edit to an in-flight selected owner remains conservatively cancelled.

After captured dependency coverage closes, existing pending-source/referrer repair
drains known events without exposing semantic readiness. A final exact event
revision and existing repository projection/independent-writer fence are required.
Failure cannot retain temporary broad lookup authority. No schema, repository
read/lease/count mechanism, scheduling policy, timeout, feature flag, retained
proof cache or decoded-family store is added. Exact seam was posted on #210 before
changing restart-inventory callback fencing. No Mac work or private data is used.

Separately, actual coordinator callbacks reproduce metadata changed(A), then
delete(A), leaving zero dirty paths and mixed startup/metadata reasons. The real
interval admits one competing full builder on baseline. The narrow correction
extends #206's guard only to explicitly recognized startup and harmless covered
patch/scheduling reasons during incomplete source-backed eager startup. The
candidate admits zero. Dirty owners, real structural/unknown reasons, manual,
forced, cold, completed startup and On-demand controls retain admission.
This does not establish or claim a fix for repeated incomplete full-build results.

## Intermediate validation and failures (historical)

- Pinned Node 22.22.2 and real installed Obsidian declarations: affected typecheck
  passes. Targeted coordinator controls pass 24/24, zero failures/skips.
- Nine new real-IDB event controls pass, including extra/expired resolver, rename,
  delete/recreate, pause, unload, selected-owner same-stat and final-proof events.
- Independent review found temporary broad lookup authority could survive an
  exceptional final proof. The failure path now clears it. The independent-writer
  fixture initially used unchanged physical stats without an observed event, so
  acquisition legitimately reused the old head. Its unexpected completion is
  retained. Adding head assertions inside the intercepted production owner then
  produced a false positive: reconciliation caught the assertion as a failure.
  Consequently the published 80/80 aggregate does not establish independent-writer
  coverage. The corrected fixture changes physical input, retains actual selected
  sequences and the proof outcome, and asserts those facts outside the production
  catch boundary. The corrected control now passes, including an observed newer
  durable sequence and actual `superseded` proof result.
- A Date-registry change between owners could be absorbed by overwriting earlier
  observations. Acquisition now rejects contradictory observations before that
  overwrite, checking only the current owner's fields. Final/idle checks still
  validate the complete vocabulary; no new all-field scan per source is added.
- Current focused checkpoint: **80/80 passed, zero failures/skips**, including all
  12 event/proof/failure/environment real-IDB controls, 44 acquisition contracts
  and 24 coordinator controls. Private receipt: `%TEMP%/kplex-210-checkpoint-2.log`.
  Earlier broad run retained 185/186 passes; the writer-fixture qualifications above
  apply to that result and the later 80/80 aggregate. No result is discarded.
- Existing affected real-IDB/portable run: 150/151 passed. One old test required
  unconditional local-event cancellation. Its updated expectation requires the
  current scoped sweep to drain the event, retain exact durable values/body-work
  assertions and emit one readiness signal without a duplicate debounce. The two
  focused scheduling cases then pass. Original failed receipt is preserved at
  `%TEMP%/kplex-210-focused-rerun.log`; thresholds are unchanged.
- Full focused rerun, broader race controls, matched CPU/elapsed comparison,
  full verification/build, exact-build guarded Windows checks and remote CI are
  pending. No merge recommendation or completed implementation is claimed yet.

The PR remains draft. Raw receipts stay private. #207's accepted storage limitation
is not reopened. No merge, main write, release or production deployment.

## Bounded comparative protocol (declared before timing)

The separate `scripts/testing/indexing-event-convergence.mjs` runner compares exact
baseline source with the current acquisition source in otherwise identical browser
bundles. It pins source, tooling, oracle and executable bundle hashes. Main's narrow
admission guard has separate coordinator/native checks; it is outside this browser
CPU comparison. No runtime file is changed to select an arm.

After harness tests and a 16-owner smoke pair, collect one detailed native-request
diagnostic pair per cell, separately from timing. Timing uses a settled eight-owner
no-event control pair, three matched pairs with 16 owners and a broad pass but no
concurrent source events, and three matched pairs each at 96 and 384 owners with
exactly three fixed-position edit/metadata/known-resolver waves. Alternate arm order
between pairs. Every arm starts in a fresh owned Chromium profile/database with
closed seeded authority, and must deliver the same final documents and reach actual
source, journal, lease and semantic closure. Keep failures and partial receipts.

Measure each arm's cumulative renderer ProcessTime and main-thread TaskDuration
endpoints, elapsed work, last-event-to-closure interval and exact repeated work.
Browser/storage/utility CPU is unmeasured; do not add workers to renderer totals.
Equal bounded fixture counters and a 20 ms diagnostic heartbeat are included in
both timing arms. The independent semantic oracle/database enumeration is outside
timing. Heap endpoints are neither allocation nor peak memory. No other build,
test suite or native indexing run may overlap timing.

Use existing production flush joins with an explicit 16-join/45-second fixture
bound, retaining every cancelled/incomplete outcome. These joins do not establish
automatic native convergence. A separate guarded Windows scenario uses real Vault
writes and MetadataCache notifications, passively observes natural completion and
does not call flush/reconcile/trigger. A declared dependency-await gate establishes
functional event ordering only. Keep responsiveness requirements unchanged.

After each measured work interval, observe a separate 500 ms quiet tail, perform
the same subsequent edit, reopen acquisition/connection on the same database and
verify full final semantics, cleanup and absence of shifted lease/journal debt.
This is not a browser-restart/storage-growth study or full application startup.
Accept useful reduction only with exact mutation equivalence, genuine final
closure, oracle parity, retained negative controls and applicable green checks;
better timing cannot excuse stale facts or false readiness. No numeric acceptance
threshold or production timeout is changed.

## Initial complete verification and CI failures (historical)

Published implementation checkpoint `a61b92485102ac6483a37dc0a63e17bbfaa59908`
failed CI426 in the existing URL-heavy post-parse graph-patch timer assertion:
64.8 ms against the unchanged 50 ms requirement. Causal reachability and an
appropriate unchanged-check follow-up are pending; this is not relabeled a pass.
Read-only review confirms that the fixture loads both changed production owners.
The timed block directly calls patchMarkdownPaths -> patchMarkdownFiles -> acquire;
that path, parser, repository, scheduler and test are unchanged against the fixed
baseline. Modified reconcile/admission methods are not directly called by that
block, but earlier fixture state/timers prevent claiming causal impossibility.
One unchanged-head CI retry is running. After the local suite, run the entire
unchanged indexing fixture in isolation; its top-level script has no case filter.
If the failure repeats, compare the identical accepted-baseline fixture before
attributing it or changing production code. The 50 ms assertion remains intact.
The full local run separately encountered a Chromium fixture bootstrap failure
before the production bundle loaded in the ontology-settings on-demand case.
The run continues to completion; preserve the failed receipt and rerun the exact
case before attributing it. Neither failure is silently excluded.
Native driver cleanup tests pass 5/5, including partial setup, independently failed
teardown and explicit absence of readiness-forcing calls. This is tooling evidence,
not native acceptance. The driver retains bounded partial event/writes/probe state
on failures and qualifies write acknowledgements by owner and event position.

The initial full local run completed its browser lane at **732/733**, zero skips;
the single failure was the bootstrap receipt above. Prior verification stages
passed, but npm verification exited failed before the final build. The entire
unchanged indexing fixture then passed in isolation, as did the exact ontology
case (1/1, no skipped cases in its filtered receipt). Corrected event controls and
both harnesses pass **19/19**, zero skips. Private receipts:
`%TEMP%/kplex-210-verify-a61.log`, `kplex-210-indexing-isolated.log`,
`kplex-210-ontology-isolated.log`, `kplex-210-tooling-controls.log`.
One passing isolated run does not replace final complete verification or CI.

The 16-owner tooling smoke pair passes both arms, including semantic oracle,
quiet tail, subsequent edit, connection/acquisition reopen and complete resource
retirement. Private receipts: `%TEMP%/kplex-source-event-210-64TRY5/`.
Its renderer CPU is 0.121754/0.106979 seconds and elapsed160.8/127.9 ms
(baseline/candidate); this is a single smoke pair, not the matched study claim.

Qualification limit: the source-event predicate proves current live Markdown
TFile equality, not historical incarnation membership by itself. Observed native
create/delete/rename notifications independently invalidate topology; captured old
TFiles also fail the Vault identity fence. The final dependency projection is not
an independent replacement for native topology notifications. No safety claim is
made for an entirely missing create/delete notification on a newly inserted or
replaced file. Supported ordering remains conservative in delete/recreate controls.


## Completed matched browser comparison

All 20 timing arms and all 8 separate operation-diagnostic arms pass. Three pairs
alternate baseline/candidate order for each principal cell; every event-heavy arm
delivers exactly3 waves with the same final documents. No arm is excluded.
The native Windows validation remains separate and pending.
Private receipts: %TEMP%/kplex-source-event-210-UndSZN/ (timing) and
%TEMP%/kplex-source-event-210-CoGOyj/ (native-operation diagnostics).

Production-source comparison is fixed at90032c6d versus the unchanged a61b924
implementation, collected at tooling head dca8668a73321f5b7e06691374c01afe164ad847.
Exact sourceAcquisition SHA256:

- Baseline: 3743783a22db2a5c09a83b7c79d9bed8b7e6008148fd241a4326e505076979c6.
- Candidate: 35ad86c9061bde1a184d20923efcf3b3db38e6ca984711861318a6035d3b69a3.
- Baseline executable test bundle: 57d24a7887dd92073061b4592f92662860afebd65a0711040052c1c81550887b.
- Candidate executable test bundle: 133b3ce25b5b5b5253c122d2729a0c336a84218e2e043001df1a9e8f343cba7b.

These are browser test executables, not the installable production main.js.
Runner hash12ea00499d79eb011d83f447aa290dc6eb2a29c676527afd3ec4cc52c8bae756;
fixture1c88d1a47178563ddab3be7eff815bbb5555d04882dc78a2c8fb88b6e4fcdcda;
independent oracle9ce0471d6263b527f0ceae08abca03fa28051aa8eac472e305ef71e2b9f8a081.

Every CPU value below subtracts that arm's own raw cumulative metric endpoints.
Elapsed and last-event intervals are browser-side; CPU covers renderer process
threads only. Values are baseline / candidate, in pair order, with no subtraction
of independent medians to invent an individual-run interval.

| Owners / pair | Renderer CPU seconds | Work elapsed ms | Last event to closure ms | Event delivery span ms |
| --- | --- | --- | --- | --- |
|96 /1|0.428468 /0.380878|548.6 /473.6|182.3 /174.8|265.7 /199.6|
|96 /2|0.430809 /0.382929|540.6 /474.4|179.2 /157.5|261.8 /213.5|
|96 /3|0.440271 /0.382293|556.1 /474.2|179.8 /171.5|276.1 /199.0|
|384 /1|1.550262 /1.395461|1984.9 /1814.7|550.7 /473.3|1032.3 /937.4|
|384 /2|1.549199 /1.366638|1976.5 /1732.7|554.3 /447.5|1018.3 /887.4|
|384 /3|1.630634 /1.510776|2103.4 /1969.2|555.9 /466.5|1108.7 /1011.6|

Median renderer CPU:0.430809 ->0.382293 seconds (-11.3%) at 96 owners;
1.550262 ->1.395461 (-10.0%) at 384. Median work elapsed:548.6 ->474.2ms
(-13.6%) and1984.9 ->1814.7ms (-8.6%). Main-thread TaskDuration medians
are0.289676 /0.258733 and1.047071 /0.940510 seconds, separately from process CPU.
The third384 pair is slower in both builds than the first two and is retained.
These small deterministic fixtures do not establish production-vault scaling or
reproduce the historical multi-hour totals.

### Actual repeated work and native operations

| Same3-wave workload |96 baseline|96 candidate|384 baseline|384 candidate|
| --- | ---: | ---: | ---: | ---: |
|Broad inventories|4|1|4|1|
|Sweep owner visits / unique owners|240 /96|96 /96|960 /384|384 /384|
|Revisited sweep owners|144|0|576|0|
|Dependency ensures|243|102|963|390|
|Repeated ensures beyond unique owners|147|6|579|6|
|All repository inspections|341|198|1349|774|
|Body reads / parses / activations|3 /3 /3|2 /2 /2|3 /3 /3|2 /2 /2|
|Native requests (diagnostic)|3922|3041|13284|10243|
|Native transactions, all committed|1858|1563|7043|5884|
|Committed reader adds / releases|300 /300|302 /302|1164 /1164|1166 /1166|
|Family decodes|407|411|1559|1563|

Both arms do the same native mutations; the candidate can coalesce the superseded
first edit of owner0 with its third edit before durable acquisition. All final
facts agree with fresh host compilation. It does not skip a requested foreground
edit. Recorded checked/reused-body counters actually rise from101/98 to102/100
at 96 and389/386 to390/388 at 384 because they include local repair; they are not
unique sweep visits. Likewise candidate reader pairs and decodes rise slightly.
The improvement is elimination of repeated inventory prefixes, not universal
reduction of every counter or removal of leases. Both diagnostic arms have zero
aborted/pending transactions, balanced committed lease release, no observer
overflow, and no final reader/decode/journal/impact debt.

Baseline activity outcomes are cancelled/cancelled/cancelled/complete; candidate
has one complete activity. Explicit flush may join more than one activity, so
outcomes of a flush call are not activity counts. This synthetic joining protocol
still requires independent native automatic-convergence evidence.

### Controls, quiet tail and subsequent work

The settled8-owner no-event control performs zero inspections, ensures, native
requests or transactions in either arm. CPU0.000927 /0.001107s and elapsed0.2 /0.2ms
are transport/instrumentation-scale observations, not a meaningful idle-speed claim.
The16-owner broad/no-concurrent-edit control retains identical work:16 sweep visits,
16 ensures,32 inspections,424 native requests,248 committed transactions and48/48
reader add/release pairs. All three raw controls are retained:

|Pair|Renderer CPU seconds B /C|Work elapsed ms B /C|
| --- | --- | --- |
|1|0.057528 /0.058105|69.1 /68.5|
|2|0.058640 /0.059268|70.2 /67.7|
|3|0.059739 /0.060225|70.8 /72.4|

Candidate control CPU is consistently0.486?0.628ms higher; small additional exact
fences are not free. Do not present this as an improvement. All 500ms quiet tails
remain closed with zero additional inspections, ensures or completion calls.
Event-heavy quiet CPU ranges:96 baseline0.001658?0.002603s, candidate0.000881?0.001265s;
384 baseline0.002077?0.003215s, candidate0.000959?0.001239s.

|Subsequent phase median|96 B /C|384 B /C|
| --- | --- | --- |
|Identical later edit renderer CPU seconds|0.018867 /0.019644|0.021095 /0.020835|
|Later edit transport-inclusive wall ms|30.768 /31.681|30.777 /31.709|
|Same-DB acquisition/connection reopen CPU seconds|0.151604 /0.148091|0.502666 /0.506749|
|Reopen transport-inclusive wall ms|193.301 /190.827|680.763 /657.126|

The small adverse later-edit CPU at 96 and reopen CPU at 384 are retained. These
phases include IPC/metric transport in their wall observations and do not isolate
native indexedDB.open. They preserve exact final semantic digests and complete
cleanup; they are not #207 storage/restart measurements.

Diagnostic20ms heartbeat maximum gaps range20.1?21.5ms baseline and20.1?20.4ms
candidate at 96;50.2?55.7ms baseline and47.4?52.6ms candidate at 384. Those gaps
include the nominal20ms period and are not direct task-block durations, actual
paint, native interaction latency or a replacement for existing strict50ms tests.
Sampled heap endpoints span20.90?21.81MiB baseline /19.77?22.18MiB candidate at 96,
and19.41?40.83 /7.74?41.00MiB at 384. No allocation, true peak or GC attribution is
established. Browser/storage CPU and global OS cache/heap equivalence remain
unmeasured. No forced GC, global cache changes or altered scheduling were used.


Native tooling cleanup follow-up: restore the original own-property descriptor or
prototype location of workspace.onLayoutReady after the warm hook, in addition to
its function identity. A late activation failure control now reaches both installed
hooks and proves their retirement plus independent fixture/configuration cleanup.
Its first unit attempt failed before that boundary because the fake index omitted
getSourceAcquisitionCounters; the fixture was completed, not the assertion relaxed.
All 6 cleanup tests then pass, zero skips; private kplex-210-native-cleanup-late.log.
No production owner or matched-study executable changed. The running full local
verification began at dca8668; this added tooling case has separate focused evidence
and must also be included in final-head CI.


## Full build, CI retry and additional cold control

Complete pinned-Node local verification through verify:obsidian passes: architecture,
core, official scanner, general/UI/portable/source tests,735/735 browser assertions
with zero failures/skips, real installed Obsidian declarations and production build.
Strict staging hashes match all three files and native open/command/DOM/error smoke
passes on Windows10.0.26200, Obsidian1.14.5(installer1.14.0), Node 22.22.2.
The invocation started clean at dca8668; later commits change only tooling/reporting,
while both production owner bytes remain identical to a61b924. Added tooling/cold
cases have separate focused evidence and final-head CI remains required.
Private full receipt: %TEMP%/kplex-210-final-verify-native.log;
native root: %TEMP%/kplex-210-native-dca8668-20261024/.

Exact installable SHA256 identities:

- main.js:6400bb47c719da4cca9736c98ec6b0f56c55d211a1cbbf42751c66d5caf852bf.
- manifest.json:3395e425860e5068e9f3b3d9a0e3d58cefd2c11dededc690beb87f60e733ed7d.
- styles.css:88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974.

CI426 unchanged-head retry (job120781059688) completed success, including complete
npm run verify and build. Its original64.8ms failure remains above. Passing retry,
full local verification and isolated unchanged fixture show no repeatable candidate
regression in that unchanged timed patch path; they do not erase the adverse sample.

The additional fresh-storage control has no earlier complete source/dependency
inventory. Same 24 owners and fixed3 waves: baseline4 broad inventories/63 sweep
visits/87 ensures versus candidate1 inventory/24 sweep visits/72 ensures, all final
values correct. Candidate post-sweep ensures include24 initial resolution repairs
and24 retained known-owner validations; baseline has24 resolution repairs and no
separate local drain. This remains conservative repeated local work, not a claimed
universal O(N+events) or one-ensure-per-owner bound. No additional runtime correction
is made to discard those pending observations.

The first new cold test incorrectly reused the warm36-ensure allowance and failed
in both builds. Those receipts remain kplex-210-final-focused.log and
kplex-210-fresh-baseline.log / kplex-210-fresh-candidate.log. The corrected cold
control asserts the relevant one-inventory/one-sweep property directly and retains
all ensure totals and phase partitioning; the original warm36 bound is unchanged.
Accepted baseline fails that new property; candidate passes. Independent exact-source
private receipts: kplex-210-cold-characterized-baseline.log and
kplex-210-cold-characterized-candidate.log, each with adjacent test-source identities.
All21 event/work/native-tooling controls then pass, no skips, at
kplex-210-cold-corrected-focused.log. This is focused correctness/work evidence,
not an extension or pooling of the already completed warm CPU cohort.

## Native event probe: retained first failure

The initial Windows event receipt is failed: event-convergence/
indexing-event-convergence-210.json. It retains exactly3 real modify/metadata/resolved
waves during inventory and sourceAtExit shows zero active/pending/tasks/writes.
Finally failed deleting the empty owned folder through Vault.delete without force
(ERR_FS_EISDIR). The overall result is not called a pass. Configuration/enablement
restoration and controller removal passed, but one empty owned folder remained.
A separate read-only realpath/symlink/empty-directory check verified that exact
Kplex210-Events-1792819177087 directory inside Small, then guarded Vault.delete(true)
removed it; ordinary inventory remains107 files.

The driver now checks exact native folder identity/path, resolved physical child
location and actual physical emptiness before that Windows force API, including
hidden entries. Eight cleanup controls pass: partial creation, deletion failure,
escaped physical target, hidden child, post-hook activation failure and no forced
readiness calls. It also preserves functional-completion and original scenario-error
facts before finally, so a later cleanup error cannot erase earlier evidence.
Private focused receipt: kplex-210-native-cleanup-physical-final.log.
At that checkpoint the unchanged-artifact native rerun was in progress; its
subsequent passing result and the remaining native acceptance are recorded below.


## Completed exact-build Windows acceptance

Every lane below used installed main.js6400bb47c719da4cca9736c98ec6b0f56c55d211a1cbbf42751c66d5caf852bf,
serially, in the existing guarded Small vault. They are functional/interaction
checks, not native CPU comparisons. No production code changed after a61b924.

| Lane | Actual result / private receipt under the native root |
| --- | --- |
| Strict full verification, production build, staging and native smoke | Pass; verify/report.json and kplex-210-final-verify-native.log.735/735 browser assertions, zero failures/skips; real installed dependencies/types. |
| Final event/proof/diagnostic/native-cleanup controls | Pass23/23, zero skips; kplex-210-final-all-focused.log. Includes the additional fresh inventory and physical target guards. |
| Real finite source events and natural completion | Pass; event-convergence-fixed-cleanup/indexing-event-convergence-210.json. Three actual modify, three metadata and three resolved notifications occurred during inventory. |
| Metadata-unavailable recovery | Pass; recovery-profile-visible/driver/startup-source-recovery-206.json. False adoption followed by automatic true adoption after actual metadata restoration; zero full builds. |
| Startup admission, including before-view controls | Pass seven cases; admission-profile/driver/startup-admission-195.json plus profile-restoration.json. Actual disabled/eligible sessions, real Settings controls, native dormant events, concurrent main/sidebar opening and explicit closed rebuild remain distinct. |
| SI4 settings | Pass14 steps; si4/si4-native.json. Existing documented required-files0 Small mode,88 ordinary Markdown plus five owned fixtures; this is functional evidence, not20,015-note native scale acceptance. Zero reads/parses/acquisitions/full builds; actual gates, labels, search, policy/provenance and stale writes remain checked. |
| SI5 reload/recovery | Pass; si5/report.json. Changed policy, missing/corrupt acceleration and corrupt requested source recover with zero semantic body reads/parses; offline edit reads/parses exactly one changed source. |
| Held-inventory foreground | Pass; foreground/report.json. Real navigation, relationship create/remove, node creation, visible editing and folder/gate consumers work while unrelated inventory is held; no broad flush used. |
| Folder / Excalidraw / create-fill-rename | Pass; folder-wave/report.json. Includes actual ordinary Markdown, valid Excalidraw scene loaded in its real companion view, and native create/fill/rename with preserved object identity. No Templater-plugin claim. |
| Rename and recovery | Pass; rename/rename-identity.json. Both Eager and On-demand, native FileManager and K-Plex modal, aliases/titles, host link rewrites, repeated move, warm reload and original state restoration. |
| Tags, folders, exact gates and search | Pass; gates-owned-copy/report.json. Existing root fixtures differed from the checked-in originals, so an owned prefixed copy was used. Existing notes were not overwritten. |
| Ontology edits during remaining startup work | Pass; ontology/ontology-startup-updates-190.json. Stationary view, actual native writes and owned semantic commits precede release of the remaining source, with physical provenance intact. |
| On-demand / background URL / Responsive live updates | Pass; live-profile/driver/report.json plus profile-restoration.json. Find, physical creation, local explicit relationships, recent sync and genuine queue drain while unrelated P3 work remains held. |

The native event trace retains one genuine global resolution invalidation and one
false inventory result; cancellation was not suppressed or reclassified as success.
There are three inventory admissions (one false, two true) and successful adoption.
After the last of the fixed three writes, all asserted source/semantic/URL/cache
conditions close naturally at9973.7ms; write delivery span299.3ms. The declared
selected-owner await establishes event ordering only. This is not pooled with the
headless renderer timing cohort or described as a ten-second throughput benchmark.
New warm-plugin counters are reported in that receipt; the older plugin instance's
preparation counters are not subtracted across the reload.

Held-inventory foreground wall observations: folder/gates35.1ms, navigation6.9ms,
create-link161.0ms, remove-link117.6ms, create-node24.0ms and visible-edit122.8ms.
These include awaited native operations, not task-block durations or actual paint.
Existing functional deadlines and the separate strict URL-heavy50ms assertion
remain unchanged. The live-update lane uses the already documented workspace-ready
variant while holding P3. The original very-early recent-tab guard limitation from
#206/#207 remains a limitation; this does not claim acceptance during workspace
reassociation or physical-device input/paint.

### Native preparation failures and restoration

The first recovery attempt refused the existing profile before fixture creation:
Sync and the Excalidraw companion were enabled. A proposed batch isolation command
was rejected by automatic approval review because its finally would leave Sync
disabled; it did not execute. Revised per-lane isolation restores both original
modules and configuration independently on every exit, using the documented
[Obsidian CLI core/community filters](https://obsidian.md/help/cli).

The first isolated functional recovery assertions succeeded, but its overall
Enablement-bytes guard failed: actual disabled modules and the saved profile were
not yet aligned. Its failed receipt remains recovery-profile-restored/. A second
attempt first stabilized that saved profile, but normal plugin reload had closed
all Plex surfaces; fixture settlement then failed its unchanged45-second prerequisite.
That failure remains recovery-profile-stable/. Both attempts restored all module
flags, original configuration bytes and107 files; no failed result becomes a pass.

The final preparation verifies the actual isolated profile on disk and in memory,
then opens the real Plex surface before starting the unchanged driver. It passes
all fault/recovery assertions and its enablement/data guards; the independent outer
finally restores Sync, Excalidraw, layout and original configuration. See
recovery-profile-visible/restoration.json. This preparation/reload is functional
setup, not a measured startup/CPU arm and not a policy change.

Final audit: final-audit.json and workspace-restoration.json. Native inventory is
107 files /88 Markdown; Eager and genuine initial/source/URL readiness are true.
Pending known/resolution/impact work, fan-out, source/repository/cache writers,
unsaved sources, pending deletes, in-process readers/decode reservations, snapshot
persist timer, scheduler lanes and test controllers are all zero. Durable local
count state is complete with pending0; repair/impact stores and primary dirty count
are zero. The audit observes two conservative persisted family leases, consistent
with the count in prior reports; their identities were not rechecked. No
expiry/reset/deletion was introduced to remove them.

Core-plugin, community-plugin and K-Plex data bytes exactly match the first recovery
preparation backup. Sync is enabled and both original community plugins are enabled.
Workspace pane/session/active identities and the prior recent-file list are restored;
only eight recent entries for the two explicitly owned event-probe directories are
removed. The saved workspace matches that exact cleanup target after ordinary host
saving; no unrelated historical entries are removed. All test-owned physical
artifacts are absent. Normal future polling/orphan maintenance remains scheduled;
this task is not a long idle/physical storage investigation.

## Review recommendation and limits

Recommend merging #210 as a scoped event-convergence improvement after maintainer
review. The reproduced defect is whole-inventory invalidation by unrelated known
source events. The correction retains that inventory lifetime while validating
individual owners and draining current pending work before an exact final fence.
Matched renderer CPU and actual repeated work improve, final semantics agree with
an independent host compilation, and required applicable Windows contracts pass.
CI430 passes at final implementation/tooling f4c9073; final documentation-checkpoint
CI/publication readback is linked on the PR. Do not merge automatically.

This does not prove all older #202 patterns survive or are fixed. Global resolver,
Date/Daily Notes, topology and selected in-flight owner changes remain conservative.
Unchanged missing metadata/storage or a genuinely endless mutation stream can remain
incomplete. First-time indexing retains conservative post-sweep validation; do not
claim a universal one-pass total or universal O(N+events) work bound. The mixed
backlog test proves one specific covered competing-build admission, not elimination
of all historical incomplete builds with real structural obligations.

Renderer-only synthetic CPU, bounded sample sizes, observer/transport overhead,
Small-vault functional scope, heap endpoint sampling, and unrun minimum-host/macOS/
physical mobile acceptance remain explicit limits. A useful manual cross-platform
check is a finite edit/metadata burst while initial source work is active, followed
by genuine completion and an immediate edit/navigation in main and popout contexts.
No new Mac experiment is assigned. No repository read/lease/count/schema/scheduler
redesign, #207 storage follow-up, main write, merge, release, #202 closure or production
deployment is included. The broader indexing CPU objective remains open.
