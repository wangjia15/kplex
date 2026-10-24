# Startup source convergence — PR #206

Prepared by **Zsolt's Codex Agent**, 2026-10-23, Europe/Budapest.

**Review status: implementation and authorized native validation are complete on the pinned accepted baseline; this PR stays draft.**

A naturally stranded current-base startup now establishes the missing recovery continuation;
the exact candidate automatically recovers on the real-data copy in a controlled two-attempt test.
B removes proved unnecessary body/URL invalidation and competing startup rebuilding. Candidate
S2 closure is428.6/441.0s with693.78/728.23CPU-s through ten-minute quiet; the completed baseline
is1963.1s/4036.03CPU-s with its power qualification. The other baseline is censored/incomplete,
not another pair. No universal percentage or exact plugin-only CPU saving is claimed.

Normal-cache complete vocabularies and all seven strict target hashes match. The original broad
tag remains unresolved; full-reference label ordering and the first terminal two-row count remain
explicit qualifications. Final copy-content and protected-production-configuration hashes match;
K-Plex/writers are off, owned resources are removed, and source/reader/schema boundaries stay intact.

| Review checkpoint | Commit | Result |
| --- | --- | --- |
| A1: settled recovery continuation | `4407177ece2af255d265987fe5fdb6662db8b1dc` | Existing initial owner resumes after meaningful source/semantic recovery. |
| A2: settings-publication recovery | `91770e42947d49b543eb80e75e2b1b7fd5088c89` | Coherent presentation, alias and empty-demand semantic updates cannot strand adoption. |
| B: source event and startup ownership policy | `b38a8899b95b0acbf74349cbbe9a7e232fa5a56a` | Initial enumeration keeps normal validity checks without forced body work; startup-only automatic rebuilding cannot compete with source adoption. |

The combined exact runtime bundle is`6ad7c8165cfa0ad66448897aaf0c401b0ccf722702f3c7498c911348502d4a50`.
Subsequent changes are native-test tooling and evidence/documentation, not shipped runtime changes.


## Scope and checkpoints

This work starts from accepted runtime `0f94252aabb8b23458b5df192380854ea0bddd53`,
including merged #201 and #204. The historical [#203 report](mac-vault-indexing-203-2026-10-22.md)
remains evidence about its frozen older runtimes; its timings are not the baseline for this patch.

1. **A — recovery:** reproduce a failed initial source adoption, identify its failed prerequisite
   and recovery signal, then make the existing startup coordinator resume automatically.
2. **B — avoided work:** establish which startup observations change source validity and remove
   only demonstrated redundant acquisition/reconciliation. Measure avoided work separately from A.

SourceRepository validation, reader leases, schema and count-reuse/reclaim protocols belong to
the accepted base and Windows #205. The reserved adapter read-plumbing seam remains unchanged.
This branch does not import #205's unfinished implementation.

## Baseline and safety

The Node **22.22.2** real-dependency production build passed. Its `main.js` SHA-256 is
`46bcd36b14291169465f98f0c2635ffb331d576eb84177d1e030281a90dc15d1`, exactly matching
the final #204 recorded artifact. No new release version is assigned.

Fresh native inspection verified the existing `kplex-test-brain-mac` copy by actual vault name
and resolved path, with K-Plex and all community plugins off, Sync/Publish off, AC connected,
nominal thermal state and one Obsidian window. Historical controllers/debuggers and native-IDB
wrappers were absent. Every deployment/restoration remains explicitly target-guarded.

Fresh read-only hashing found **20,190 copied content files / 10,956,614,603 bytes**, identical
to the final #203 manifest. The protected original's **223 configuration files** also match that
retained final manifest. The original's full content was not hashed in #203 or this audit;
configuration comparison must not be described as full original-content verification.

Private starting configuration/artifact backups and new receipts use a separate private directory
identified as `kplex-206-l1y0aw88`. Historical evidence and seeds remain preserved. The relevant
retained S2 full-snapshot stream has SHA-256
`4e70e31200f9017642c7b2e509283910881fb718a99e17114f0c91205706f4c2`;
the A4 warm seed is a different checkpoint. A retained sidecar alone does not prove a successful
new import: decoded verification and the native committed receipt are required before activation.

## Checkpoint A1 — settled recovery continuation

The unchanged current-base coordinator fails controlled recovery regressions: initial adoption
returns incomplete after missing source metadata or a controlled storage-write failure; source
authority and requested semantics later recover, but the coordinator never adopts again. The
write-failure fixture explicitly injects post-eviction memory state; it does not test the eviction
algorithm itself. Recovery uses the actual source event/storage path and does not manually invoke
a second adoption.

A1 notifies the existing initial-index owner after source inventory ownership releases and after
requested semantic tasks settle. One coalesced continuation joins original preparation/adoption,
then rechecks captured lifetime, demand, source, publication and policy fences. Unchanged failure
signals do not spin. Notifications grant no readiness; actual adoption still owns completion.
Persistent failures, supersession, unloading, closed demand and genuine edit backlog remain explicit.
No timer, polling, watchdog change, storage-schema change or SourceRepository modification is added.

On Node22.22.2, all existing indexing fixtures, 58 startup-admission scenarios and 15 new coordinator
scenarios pass. The acquisition/real-IDB lane passes 46 tests, including two new real-storage
recovery cases. Full `npm run verify` passed with real dependencies, followed by exact-build Small
native command/render/no-captured-JavaScript-error smoke. That smoke does not establish native
fault recovery or complete interaction acceptance. The tested bundle is
`4b53d61d2ae7d1ff4a3a127b71c0d30036722e726559bf264113eaac4e39cf28`.

A separate settings-publication regression exposes three remaining cases: presentation facets,
legacy display-name policy and empty-demand semantic-policy refresh can supersede an initial
adopter without a later source/scope-finalizer signal. The A1 checkpoint retained these failing follow-up fixtures outside its test inventory; A2 corrects
and registers them below. Full fresh-process and real-copy acceptance remains separate. A1 is a correctness checkpoint, not measured CPU savings.

## Measurement plan and limits

- Capture one ordinary accepted-base warm control and one targeted S2 application-startup
  reproduction, retaining the existing 45-minute run cap and ten-minute quiet requirement.
- Develop controlled recovery/event-order regressions before another long reproduction.
- Iterate on reduced fixtures. Aim for three matched representative before/after pairs where
  feasible; retain incomplete, unmatched, route- or coverage-qualified observations explicitly.
- Keep builds, full tests, hashing/imports and heavy oracles outside timing windows. Measure whole
  process identities once, through actual source/URL/persistence closure and matched quiet.
- Keep broad-tag behavior as the original named unresolved control. No substituted leaf target,
  larger deadline, forced route, watchdog increase or control-CPU subtraction is authorized.

The first warm control completed at **806.345 seconds**, including **601.325 seconds** of
quiet after first observed ready/closure at **205.020 seconds**. It performed **zero** checked
sources, vault reads, parses, source repairs, activated replacements and unsaved masks. Optional
background URLs completed from the existing cache. This clean warm condition therefore realized
zero #204 replacement-count reuses; it is not evidence about an eligible replacement workload.
The end-to-end whole-process delta was **446.789 CPU-seconds**, explicitly **coverage-qualified**
by a **6.080-second** early native-sampler gap. AC, native foreground and unlock observations stayed
valid; no CPU subtraction or speedup comparison is drawn. Cleanup left the plugin off and the
community enabled set empty. The retained starting warm state was reused without a new seed import.

New optional diagnostic-only forwarding observers record bounded scalar adoption/flush/recovery
transitions, native event categories, inventory admissions versus joins and source acquisition
flags. They distinguish the actual ordinary activation private-reclaim branch (#204 realized
count reuse) from selected-count repair; matching digest eligibility alone is not counted as reuse.
They start no source work and perform no extra proof reads. The three observer tests and all 22 existing Mac-study tests passed under Node22.22.2.
Native observer forwarding completed without overflow in the targeted capture below. Diagnostic forwarding counts are not exclusive CPU attribution.

## First targeted current-base S2 result

The retained S2 stream was imported and decoded-readback verified: **15 stores / 1,537,552 rows**.
The atomic changed-store job exceeded two observation deadlines; subsequent observers joined the
same job, with no duplicate import or early activation. Approximately sixteen minutes of import
preparation are outside timing.

Launch began **10:39:17.761 UTC**; forwarding attached **48.117 seconds late**, so its totals are
lower bounds since attachment. Unlike historical S2, this current-base run **completed**: ready at
approximately **1,829.121 seconds** after launch, final source/URL/persistence closure at
**1,963.121 seconds**, followed by **601.257 seconds** quiet. Whole-process external CPU delta
was **4,036.03 CPU-seconds**, sampled without reported process errors (maximum gap1.056s).
Native foreground, unlock and AC checks remained valid. No historical stranded outcome is claimed
for this native run; the current-base liveness defect is established by controlled regressions.

Independent external power polling was inadvertently not armed for the first warm/S2 captures.
Retained retrospective system-power logs and terminal AC state agree with native AC observations,
but are not a prearmed external power series. This remains a measurement qualification; later
matched captures must arm the independent power recorder.

Initial attached source flags were **11,819 body-dirty**, zero created, and 20 already repaired,
out of 11,839 Markdown owners. Final production counters checked11,840/repaired11,839 owners;
URL processing completed11,839 owners with11,819 reads. Late forwarding observed11,820 source
acquisitions,11,819 unique identities and **one same-revision revisit**. Near-vault-wide identical-
revision replay is therefore not established. Actual activated ordinary private-reclaim branches
realized **11,819 #204 count reuses** since attachment; eligibility alone is not counted, and these
savings belong to #204.

Installed Obsidian1.13.0 declarations document `Vault.create` for existing files during initial
loading. The pre-layout source fence currently treats these as body changes, and the independent
URL create listener retires cached owner data. The controlled discovery regression fails in both
eager and on-demand modes on this baseline. The subsequent B checkpoint qualifies discovery and passes the negative cases below;
no cached-source validity check is weakened.

One actual full semantic rebuild also occurred, marked `startup:stale-snapshot` with zero modified
paths. The source inventory was cancelled and restarted with revision1→2 and generation22→23,
while maintenance/host revisions remained1. The existing 120-second automatic dirty-index flush
can enter full rebuilding after snapshot hydration but before source adoption completes. This
caller attribution follows production call inventory/conditions and a controlled exact-interval
regression, not a captured native stack. Three startup-only ownership cases fail before correction;
seven genuine-change/cold/on-demand/explicit-demand controls pass. An empty later inventory was
small follow-up work, not another broad pass.

## Checkpoints A2 and B

A2 now also notifies after coherent non-paint settings publication, meaningful legacy display-name
publication and empty-demand semantic settings refresh. Alias-vocabulary lifetime joins the queued
recovery fence. All three formerly failing settings cases pass without body reads/parses. Combined A2/B full
`npm run verify` and exact-build Small smoke pass on Node22.22.2; the frozen combined bundle is
`6ad7c8165cfa0ad66448897aaf0c401b0ccf722702f3c7498c911348502d4a50`.
A1/A2 and B remain separate code checkpoints; this bundle tests their composition, not an isolated
A2-only installable artifact.

A new native Small recovery lane passed: actual metadata-unavailable reconciliation causes one
failed adoption, genuine metadata recovery triggers one successful automatic adoption, the scene
remains present, full-build count stays0 and unsaved masks stay0. Exactly two attempts were observed.
The probe reopens initial coordinator flags on an already settled source-backed index; it is **not**
a fresh-process route reproduction. Method descriptors, owned note, settings bytes and controller
cleanup passed. Before faults, the exact Small database was checkpointed across15 stores with
stream SHA-256`1b6c510db41387d1fc38a257af8286b3da05d5f7fcbc9a793870fac946fe3118`.
Exact-build SI4 Small settings/gates/search/provenance/stale-write acceptance also passed. Native
SI5 and foreground acceptance subsequently passed; live/startup qualifications are recorded below.
Fresh-process real-copy timing and final integrity audit are recorded below.
Forty-one driver/observer checks passed after registering the native recovery command.

B qualifies initial create enumeration at the existing lifecycle listeners rather than changing
source validation. Pre-layout creates remain native physical inventory inputs; the independent URL
owner does not retire its cache solely for enumeration. Real modifies/deletes/renames remain fenced
before layout, and post-layout creates remain ordinary changes even before preparation admission.
The controlled real-IDB suite passes18 cases across eager/on-demand modes: clean discovery, same-stat
modify, late create/recreation, offline alias/Date/path drift, missing metadata and corrupt metadata.
The clean two-owner fixture performs zero source acquisitions/reads/parses/replacements or URL reads;
negative cases retain actual repair, Date resolution, new URL incidence and tombstoned old paths.
These are controlled work results, not native CPU measurements.

The automatic rebuild guard applies only to incomplete eager source-backed startup, no edited
Markdown paths and exclusively startup-prefixed backlog. It preserves that backlog and completion
state for the existing initial owner. Ten actual-interval/coordinator cases pass, including the three
formerly failing startup-only cases and seven genuine-change/cold/on-demand/explicit controls.
The existing indexing suite now explicitly expects no pre-layout body invalidation and adds the
opposite post-layout-before-admission control. Existing watchdog and same-stat protections pass.
No SourceRepository algorithm or reserved read-plumbing loop changes.

The native ontology/editing-during-startup lane subsequently passed: stationary relationships
updated before the remaining source committed, with physical provenance preserved. Native startup
admission also passed dormant policy, all six device controls, concurrent opening, close/reopen,
closed explicit rebuilding and inactive live-surface admission. These are Mac desktop executions;
the inherited startup driver's returned limitation string says “Windows”, but is not host evidence.
They do not establish physical-mobile input or full application restart.

Small was closed after checking writer/controller/mask cleanup. Its19 original configuration files
and plugin bytes were restored offline and byte-compared; its original Sync setting and original
plugin-enabled list were restored only after native window/registry closure. Only the healthy
brain-copy window remained. The real-copy S2 restoration is active, with independent external AC
sampling armed; subsequent candidate CPU/work and unresolved broad-tag outcomes follow below.

## Native interaction follow-up and qualifications

The exact combined bundle passes native Small SI5 restart/corrupt acceleration/requested-source
repair/offline-edit acceptance, with settings restored, fixtures absent and throttling restored.
The ordinary foreground lane also passes while unrelated inventory is held.

The original very-early On-demand live-update lane has a **pre-existing recent-tab failure** on
both accepted baseline46bcd36b and candidate6ad7c816. Find, physical creation and local semantics
succeed, but a recent-tab activation at about1.9–2.0s occurs inside the existing three-second
workspace/history guard. The target is canonical and physically available; no semantic task is
pending, while the activation is absent from history and the explicit sync action does not center
it before the unchanged15s deadline. Source recovery is not the failed prerequisite. Both failures
and successful cleanup are retained. No navigation production code is changed for this unrelated
condition.

A **separate workspace-ready variant** waits for that existing guard while retaining the unrelated
P3 read. It passes on both immutable baseline and candidate, including physical Find, local explicit
relationships, recent-tab synchronization and actual owner/queue drain after release. This pass
does not erase the original early failure or prove availability during workspace reassociation.
The same pre-fault Small checkpoint was decoded-restored before each immutable arm; installed
artifact hashes remain verified. Forty-one driver/observer checks pass after the tooling extension.

One candidate hot activation after restoring that checkpoint crashed Small's renderer before the
live-update controller could install. Native inspection showed a crashed renderer(pid0), with the
brain-copy renderer healthy and K-Plex off. The retained macOS report records `EXC_BREAKPOINT` /
`SIGTRAP` on a renderer worker thread; it supplies no causal JavaScript stack. Reloading only that
positively identified crashed Small window restored access; the subsequent exact-build variant
passed. No application-wide restart occurred. The crash, transport-timeout receipt and isolated
recovery remain an **unresolved qualification**, not attributed to #206 or silently counted as a pass.

## First matched S2 observation — provisional performance result

The same original S2 stream was decoded-restored into the exact copy database:15 stores /
1,537,552 rows, nine atomically changed stores and verified native readback. Two bounded observer
deadlines expired while the single retained job continued; no duplicate import or early activation.
The candidate used exact bundle6ad7c816 / runtimeb38a889 and the same retained startup layout,
45-minute cap, diagnostic forwarding and ten-minute quiet requirement as the current-base capture.

| Observation | Current base46bcd36b | Candidate6ad7c816 |
| --- | ---: | ---: |
| Launch → first observed ready | 1,829.1s | 428.6s |
| Launch → final source/URL/persistence closure | 1,963.1s | 428.6s |
| Quiet after final closure | 601.3s | 602.3s |
| Whole-process external CPU through quiet | 4,036.03 CPU-s | 693.78 CPU-s |
| Production checked-source counter | 11,840 | 11,839 |
| Production source reads / parses | 1 /1 | 0 /0 |
| Production source repairs / resolution refreshes | 11,839 /0 | 0 /1 |
| Actual source-head activations | 11,839 | 1 |
| Logical source chunks / payload bytes written | 47,606 /76,946,676 | 1 /4,881 |
| Late forwarding parser submissions | 11,819 | 0 |
| Late forwarding inventory admissions | 3 (one cancelled) | 2 (none cancelled) |
| Late forwarding full builders | 1 | 0 |
| Final unsaved masks | 0 | 0 |

This is **one power-qualified diagnostic pair**, not a universal speedup or distribution. The
candidate independently sampled external AC throughout; the baseline lacks that prearmed external
series as already recorded. Native foreground/unlock/AC and process coverage stayed valid in both;
candidate maximum native sample gap1.145s. Forwarding attached about48.1s late in base and38.6s
late in candidate: forwarded work counts are lower bounds, not interchangeable whole-run totals.
No control CPU is subtracted, and no CPU share is attributed exclusively to a parser/reader.

The candidate still performs the existing cached-owner validity pass. Its11,839 forwarded
acquisitions are **validation calls**, not avoided source reads/replacements; do not claim a
near-vault-wide identical-revision duplicate was removed. Dirty-body requests fall to0, payload
rewrites fall to one genuine resolution update, and the cancelled inventory/full-builder sequence
is absent. The two candidate inventories are one broad pass plus a roughly0.3s follow-up, with
unchanged inventory revision1 and generation2. Initial cached hydration completes in one attempt;
the baseline's first hydration was superseded by file patches and later ran the full builder.
This is a natural cache/work-path consequence of event qualification, not a forced route.

Actual #204 branch observation is separate: base realized11,819 ordinary count reuses since
attachment; candidate observed one selected-count repair and **zero realized count reuses**, with
one total activation. Avoiding replacements removes reuse opportunities; this is not a #204
regression or another saving to add. The candidate also accumulated about134 native CPU-seconds
after logical closure, included in its ten-minute total; that tail is not hidden or exclusively
attributed to source work.

A first post-timing functional observer hit a transport timeout before its assertions; cleanup
passed and the receipt remains. A bounded transport-tolerant retry completed without transport
errors and passed all seven retained bounded semantic/provenance targets. The original broad-tag
sub-call was rejected by the helper's required seven-kind inventory, so it **did not execute**:
this is a retained harness error, not a broad-tag pass or product failure. The next full-eight-target
call keeps the original target and unchanged deadline. Current candidate base and served vocabulary
both contain110,470 nodes; baseline's full rebuild reported110,472. Whole-vocabulary and target
parity against the next current-baseline run is established below; the first terminal count
difference itself remains unclassified and is not erased by those later observations.

The reverse repetition subsequently ran with independent power observation on both, but its
baseline ended incomplete as recorded below. It is not a second completed pair. Broad-tag/parity,
ordinary warm control and final audit outcomes follow; the three-pair target was not achieved. A's recovery correctness remains separately established by controlled real-IDB and
native Small tests; this naturally fresh full-snapshot candidate run did not need source-adoption
resumption and is not a current native stranded-startup reproduction.

## Second candidate S2 repetition

A second independent restore of the original S2 stream completed decoded verification before
activation. Its first observer expired while the same native import remained owned; two resume
observers joined that job. No duplicate import or activation during storage ownership occurred.
Preparation took about13.6 minutes and is outside timing.

The same runtime/artifact/layout and observer configuration launched at **14:04:44.478 UTC**.
Forwarding attached about47.0s late. Ready and actual source/URL/persistence closure were both
**441.0s after launch**, followed by **603.9s quiet**. Whole-process external CPU was **728.23
CPU-seconds**, with valid process coverage (maximum external gap1.037s; native1.620s). Independent
external AC sampling was valid throughout (71 samples, maximum gap15.143s), agreeing with native
AC/foreground/unlock observations. Cleanup passed, restored configuration and left K-Plex off
with an empty community enabled set.

The repeated work result is identical in its material counts: checked11,839; reads/parses/repairs0;
one genuine resolution refresh, one source activation, one chunk/4,881 logical payload bytes;
11,839 cached validation acquisitions with no revisited owner; no full builder or unsaved mask.
One broad inventory was followed by a roughly0.12s empty completion, both successful at unchanged
host/maintenance/inventory revisions. Actual #204 observation again records one selected-count
repair and zero realized ordinary count reuse. This repeats avoided replacement/parser work;
it does not remove the existing near-vault-wide cached validity pass.

The two candidate totals are428.6/441.0s to closure and693.78/728.23CPU-s through quiet. These are
not two complete matched pairs: the reverse-order baseline later ends incomplete. Post-timing full
eight-target checks, global vocabulary parity, ordinary warm control and final audit follow below.

## Retained broad-tag control on the current candidate

The corrected full-eight-target post-timing call actually executed the original broad tag.
All seven bounded targets again pass with identical semantic/provenance hashes; both candidate
repetitions also export byte-identical complete base/URL/served vocabularies (served110,470nodes,
SHA-256`757a297f478716577bf95f2f2ea7945e119c0d81f7b77ab792299f8d5225450c`).

The **original broad tag does not pass**: it renders and is canonically ready, but the unchanged
oracle times out after30.308s with active semantics, two pending scopes and256 dependency visits.
This matches the historical failure shape, not a substituted leaf target. Startup had already
completed (`initial=true`, incomplete=false), source activity/pending-known/repository writes were0,
and hydration was complete. There is no evidence here that the pending broad-tag work shares A's
missing initial-adoption continuation; it remains unresolved and outside the measured CPU claim.
One CLI transport timeout occurred during this separate functional lane; the bounded observer
continued, captured the broad failure and passed cleanup. A completed observation receipt means
the observer/cleanup finished, not that the broad-tag assertion passed.

The current-baseline repeat subsequently exercises the same target and whole-vocabulary parity
is established below. To keep ordinary warm behavior separate from this interrupted broad
workload, the candidate warm control restores the retained A4 stream (15stores/1,537,695rows,
SHA-256`2c1ec8518b8ca5969ebefea7d09092a7284d40daa48844c6939e2640cde0dfe8`).
The initial baseline warm control reused its then-current post-#203 state without a new import;
row-for-row equality to this imported A4 state is not established, so no clean warm CPU percentage
will be inferred.

## Ordinary candidate warm control

The retained A4 seed completed decoded native verification across15stores/1,537,695rows. The
atomic changed-store import took about17m41s outside timing; three resume observers joined the
same retained job after their deadlines. The control then used the original baseline warm profile:
plugin-level activation in the running isolated copy, forwarding observers disabled, no forced
route or rebuild, and independent external AC polling.

Actual ready/source/URL/persistence closure was **192.021s**, followed by **600.235s quiet**;
last observed cumulative whole-application native CPU was **397.542CPU-s**. Native CPU/process,
AC/foreground/unlock coverage was valid (maximum sample gap1.034s), agreeing with independent
external AC. Source reads/parses/repairs/activated replacements/chunks/payload bytes/masks were
all0. URL ownership completed11,839 owners from cache with0reads. Cleanup removed the controller,
restored owned configuration and left K-Plex off with an empty community enabled set.

The earlier current-base warm control observed205.020s closure/601.325s quiet/446.789CPU-s,
also with0reads/parses/repairs/replacements. Its early6.080s sampling gap, missing prearmed external
power series and non-reimported starting state remain qualifications. The candidate follows a
verified import with no full app restart; setup-related host/GC work cannot be excluded. Therefore
these observations show retained zero-repair warm behavior, **not a clean matched warm CPU
percentage**. No OFF-control subtraction or exact plugin-only CPU attribution is made.

## Reverse baseline: genuine recovery without convergence on the accepted code

The second original-S2 restore completed decoded verification at15:17:14.985UTC across the same
15stores/1,537,552rows. Reverse baseline launched at15:18:43.202UTC, with independent external AC
and the unchanged45-minute cap. Its terminal status is **incomplete**, not a second matched pass.
The final observation is2703.1s after launch, including bounded polling/IPC overrun of the nominal
cap; whole-process external CPU is **5,214.95CPU-s**. External process coverage is valid (maximum
gap1.200s); native maximum gap1.648s and independent AC182samples/maxgap15.322s agree. Cleanup
restored configuration and left K-Plex off/enabled set empty.

Unlike the first current-base run, this repeat naturally reproduces the missing continuation.
All times below are after launch, derived from the retained native epoch rather than rounded IPC
return timestamps; no forwarding or owner-event overflow occurred.

| Boundary | Time | Observed state |
| --- | ---: | --- |
| Initial adoption begins | 129.2s | Source authority unavailable; initial inventory active. |
| Inventory superseded | 164.1s | Inventory revision1→2/generation23→24; host and maintenance remain1. |
| Initial adoption's source flush returns false | 2163.6s | 719 unsaved masks; no requested semantic task; adoption returns false. |
| Genuine authority recovery | 2436.1s | 0masks/0pending-known; authority true; coordinator still incomplete. |
| Source/URL/persistence/scheduler owners drained | 2436.7s | No active build/hydration/semantic/cache/source owner or queued snapshot. |
| Final observation | 2703.1s | Initial=false/incomplete=true; no second adoption for the remaining266.4s. |

The failed condition is the actual source flush returning false while unsaved recovery is owed.
The later source-ready callback and a successful inventory completion prove recovery, yet the old
coordinator never reconsiders its failed result. This confirms A's relevant mechanism on the
accepted baseline, independently of the older #203 runtimes. It is a correctness/liveness defect;
changing completion after work has already drained is not CPU savings.

Initial late flags show11,820body-dirty/19already repaired. Final production counters are:
checked12,558; legacyBodies11,106; reads/parses821; reusedBodies619; repairs11,939;
resolutionRefreshes619; pendingMetadata/failures0. Actual durable activations are11,839,
with47,602logical chunks/76,944,951payload bytes. Repair-path counters include live unsaved
outcomes and must not be substituted for persisted replacements. Recovery adds100reads/parses
beyond the initial721, plus619body reuses/resolution refreshes; all719masks genuinely drain.

Late forwarding observes12,539acquisitions/11,820unique owners/**719same-revision revisits**,
12,640parser submissions,350,321transactions and408,512hash calls. This proves a repeated subset,
not another near-vault-wide identical-revision pass. Four inventory admissions include two false
and two successful outcomes; one full builder was admitted. Actual #204 ordinary reuse is11,101
since attachment, separately from719selected-count repairs. URL reads are11,819. The candidate
repetitions avoid dirty-body replacement, cancellation/masks and these revisits while retaining
cached-owner validity checks. No mask clearing, forced flush/rebuild, watchdog change or timeout
extension is used to improve this run.

UI-ready and its required matched quiet interval never occur, so the5,214.95CPU-s censored total
is **not pooled with completed pairs** or used for a clean before/after percentage. Two candidate
repetitions and one complete power-qualified baseline remain fewer than the three-pair target.

The separate normal-cache baseline reload completes after timing and exports exactly the same
base110,470/URL86,593/served110,470path-kind vocabularies as both candidates; all seven bounded
relationship/provenance hashes and expected search eligibility match. The original broad tag again
fails after rendering with active semantics. This does not retroactively complete the censored
startup. The first baseline full-builder count110,472 is still being investigated by a separate
explicit full-builder semantic reference, outside CPU/recovery evidence.

## Post-timing semantic reference and strict-hash qualification

A separate accepted-baseline explicit rebuild used the existing owner (`rebuildIndex(true,false)`)
after normal startup settlement, outside performance and automatic-recovery evidence. It also
produced the same complete110,470-node vocabulary. It did **not** reproduce the first baseline's
110,472 terminal count. The identities of those original two extra rows were not captured, so that
first-run count remains unclassified; do not claim exact whole-graph equivalence for that terminal
state or erase its qualification from the CPU comparison. No additional historical matrix is run.

The reference renders/finds all seven bounded targets, but **only six strict hashes match**. The
saved-center digest is`69beac600dfff598c838fb1a9f8f3401b61c3b37d79e531d628c74f361c029a2`, versus
cached-route`cb03d2c6b3c5b4be54a21c6ed5f4a63b4f40aeaf491d8cca89ec1b26f6ed0278`.
An early progress message incorrectly called all seven reference hashes matched after checking
render/search success; this is corrected here and the raw diagnostic inputs remain preserved.

A paired cached-then-explicit-rebuild probe on **unchanged accepted0f** reproduces that digest
difference. Exact canonical inputs show26relation rows/26decision pairs and identical gates. All
complete decision/provenance arrays are byte-identical. The only three changed tuples reverse
the order of two names in the joined `typeDefinition` string; endpoints, role, relation type and
link direction are unchanged. This is existing route-dependent label ordering, not changed source
facts or provenance. The oracle and its strict hashes are retained without normalization.

Ordering is not declared universally cosmetic: the existing style owner layers named overrides
in order, and exact definition-text predicates can observe the string. Using that owner's exact,
normalized and imported-key lookup rules, the two relevant fixture overrides have no conflicting
fields (one matching override, the other absent), so the layered style is identical for this test.
This does not establish compatibility for arbitrary conflicting overrides or exact compound-string
predicates. Canonicalizing label order is a separate compatibility decision outside this startup
admission/event correction. Within the matched normal-cache baseline/candidate profiles, the full
strings and all seven strict hashes match exactly.

The original broad tag times out on both normal-cache profiles: rendered/canonical-ready,
2pending scopes/256dependency visits (base30.276s/candidate30.308s). After explicit full rebuilding
it instead reaches the unchanged1,000-relation oracle budget. That is a retained bounded-observer
failure, **not a broad-tag pass or proof the unresolved case is fixed**.

The first source-only recovery restore never began importing: its former temporary raw path was
absent while the preserved compressed checkpoint remained intact. A new private unpacked stream
was verified against original SHA-256`7bb3818fb6a40b54e1bab409ebccc97264d2ca3a67b1535536b37c288859b2df`
(897,030,856bytes), with original sidecar bytes retained. The failure receipt is preserved; the
retry is a new import only because the failed attempt never started a storage job. Subsequent
observer expirations join that same retry job. Native exact-candidate recovery confirmation and
final integrity audit are completed below.

## Exact-candidate recovery confirmation on the real-data copy

The source-only S1 import completed decoded verification at16:45:28.143UTC:15stores/1,426,582rows,
with0pages/0snapshot chunks. The wrapper reverified the live vault/database name, exact committed
rows, stopped plugin and disabled writers before staging the frozen candidate. Historical compressed
streams/sidecars are unchanged; the missing former raw path and same-job observer expirations remain
in their receipts.

Normal plugin enable/view activation naturally selected **source-backed eager startup**, loaded the
110,470-node vocabulary and reached actual ready state before the fault. It performed0source
activations/chunks/reads/parses/masks; the retained URL cache completed11,839owners without reads.
This is a functional source-only confirmation, not another CPU measurement or forced route.

The native five-second fault/recovery lane then reopened only initial coordinator flags on that
settled lifetime and withheld metadata for one existing bounded Markdown owner. **No real note was
created, modified or deleted.** One actual adoption returnedfalse with unavailable metadata;
restoring the real getter and its genuine metadata-change signal produced one successful automatic
adoption. Exactly **two attempts(false,true)** occurred and unchanged readiness did not spin.
The published scene remained present, full-build count stayed0, and no unsaved mask remained.

Across the controlled lane, checked sources increased20→22 and body reuse21→23, with one repair-path
operation and0vault reads/parses. The recorded missing-metadata counter is1after recovery; it counts
the observed failure, not current queued work. Actual authority and successful adoption prove
completion. Inner cleanup restored method descriptors/settings/controller; outer cleanup stopped
the reload, restored owned layout/settings bytes and left K-Plex off/enabled set empty. One earlier
CLI timeout during normal vocabulary preparation was retained and tolerated; the fault assertions
and cleanup completed. Native host reports Obsidian1.15.0(installer1.14.0), driverNode22.22.2.

**Limit:** coordinator flags were reopened after a naturally settled source-only startup. This is
not a naturally stranded fresh candidate startup. The accepted-base reverse S2 run supplies the
separate genuine first-startup failure/recovery trace; Small/real-IDB regressions and this exact
candidate real-copy test supply controlled correction evidence. A is correctness, not CPU credit.

## Preview and memory observation coverage

| Run | First observed center DOM after launch | Sampled probe-process heap maximum | Sampled probe-process RSS maximum |
| --- | ---: | ---: | ---: |
| Base S2 1 | 48.1s | 2425.8MiB | 2812.8MiB |
| Candidate S2 1 | 38.6s | 2312.4MiB | 1941.3MiB |
| Candidate S2 2 | 47.0s | 2288.7MiB | 2184.2MiB |
| Base S2 2 (incomplete) | 50.7s | 2556.0MiB | 1854.4MiB |

CLI forwarding attached late: these DOM times prove presence by that observation, not first paint,
physical input or an earlier absence. Memory is `process.memoryUsage()` from the process executing
the probe, sampled after attachment; it is not a whole-application peak, byte bound or exclusive
plugin allocation, and early peaks may be missed. No universal memory saving is inferred. Native
Small held-background interaction/editing/ontology tests supply the in-progress behavior evidence;
real-copy bounded navigation/gates/search/provenance runs are separate post-timing checks with0
body reads/parses. The unresolved original broad target is not counted as a passing interaction.

## Final integrity, cleanup and retained evidence

Independent read-only hashing after the native lanes found:

- Copied nonconfiguration content: **20,190files /10,956,614,603bytes**, all hashes identical;
  no added, removed or changed content.
- Protected production configuration: **223files /84,002,510bytes**, all hashes identical.
  No production full-content baseline exists; this is not a full original-content hash claim.
- All test-copy settings/community/core/workspace bytes match the starting configuration. The
  original existing active file-explorer leaf was restored through typed Workspace APIs and its
  saved workspace file is byte-identical. Only the intentionally retained exact candidate
  `main.js`/manifest differ; original artifact/configuration backups remain private.

Final native inspection verifies one foreground/unlocked copy window, K-Plex/community enabled
set empty, Sync/Publish off, no study/functional/recovery/indexing/startup controllers, no metadata
fault hook, no debugger/DevTools, restored layout observer, and native IndexedDB method prototypes.
The owned-process audit finds0live test processes; owned observers/caffeinate wrappers have ended.
Small remains closed with its original19configuration files restored offline. No release, merge,
main write or production deployment was performed.

`SourceRepository.ts` remains byte-identical to the accepted baseline, SHA-256
`951ce4e86ad1bea9b86a53d7efad1c2e4375e3eda38e220b4933409510a337ef`.
No reader/lease/validation/count-reuse/reclaim/schema change or reserved read-plumbing loop was made.
The full real-dependency `npm run verify:obsidian` run and exact-build smoke remain valid for this
unchanged runtime; subsequent native-driver-only changes have their41focused checks and paired
native controls. There is no reason to rerun the complete historical matrix.

Private raw receipts, configurations, checkpoint derivatives, canonical vocabulary/provenance
inputs, native failures and exact artifacts are retained in restricted archive identifier
**`2026-10-23-pr206-final`**. An independent per-file SHA-256 readback verified the archived evidence against its private source directory; the restricted archive manifest retains file identities/counts.
Historical #203 archives/checkpoints are preserved separately. No raw note paths/content or
configuration are added to Git; the archive index maps observations and their limitations for
independent review.

## Parallel coordination checkpoint

At the A1 checkpoint GitHub reports #205 and #207 open/draft. The maintainer has authorized the
Windows agent to merge #205 independently and then continue #207. This branch keeps accepted
runtime0f94252 and the recorded artifact identities; no Windows code is imported mid-experiment.
A later combined Mac validation against integrated code remains required once both threads are ready.

At the later native-acceptance checkpoint, #205 is verified merged at **12:30:42 UTC** as
`930747679894f003a2acf3b800df798826ee090c` (head`104a5837ca358238f2c3cbd5f7177516094ab138`).
Its protected cached-metadata read batching has therefore entered main. #207 remains draft/open,
now based on9307476, and owns the subsequent dependency-count maintenance optimization. Neither
change is imported into this branch or deployed in this experiment. All reported #206 runtime
artifacts remain against0f94252; later integrated Mac validation is still explicitly required.


## Remaining acceptance

- [x] Current-baseline controlled failure and targeted native causal sequence.
- [x] Checkpoint A implementation, bounded recovery/negative regressions and qualified native Small confirmation.
- [x] Checkpoint B demonstrated cause, independent implementation and regression evidence.
- [x] Before/after work and CPU receipts, interaction/recovery checks and realized #204 reuse, with censored/unmatched limits preserved.
- [x] Full real-dependency verification and applicable exact-build Small lanes, with the recorded recent-navigation/crash qualifications.
- [x] Final copy/original-configuration audit and independent owned-resource cleanup.
- [x] Validated checkpoints pushed; final review record is published and the remote draft checkpoint is independently verified at delivery.

No merge, release, main-branch write or production deployment is authorized.


## Integration validation — accepted main plus #206

This section is a new final-acceptance record. Every preceding result belongs to its explicitly
identified historical runtime and remains unchanged. The maintainer now authorizes integration
and merge only after final-head local, remote-CI and exact-build native gates pass; earlier
keep-draft/no-merge statements describe the completed independent study.

Remote #206 and clean local checkout both began at reviewed
`12c911a2b3fd9fed64e50a375d0d4ebcb9c91e0b`. Accepted main is
`930747679894f003a2acf3b800df798826ee090c`, including merged #205 and preserved #201/#203/#204.
A normal merge retains both histories. Only the transient HANDOFF and append-only architecture
ledger conflicted: the standing header/current #206 assignment and both historical inventories
are preserved. No runtime conflict, rebase, force-push or #207 import occurs.

The merged runtime preserves #205's protected bounded metadata fetch/reader reservation and
all digest, frame, posting, lease, current-selection and cancellation checks. #206 remains in
its existing startup/source-event owners. Schema/count maintenance/read-plumbing policy is not
changed during integration. The complete integrated diff and required verification are reviewed
below. A new Node22.22.2 production artifact is identified below; historical6ad7c816 is
never relabeled as this integrated build.

Initial guarded native inspection finds exactly one Brain-copy window, plugin/community off,
Sync/Publish off, no retained controller/debugger/fault hook and native IDB methods. AC connected,
thermal nominal. The window was visible but not focused; timed observations must establish and
retain foreground ownership. Native checks and one S2/warm confirmation were pending at this
initial preflight; their completed results follow. No merge is claimed while a gate is pending.


### Integrated artifact and completed verification checkpoint

The integrated runtime source is **`95b0093de529ab2825980974d311d592b02f0000`** (normal
merge parents reviewed12c911a and accepted main9307476). Production build Node22.22.2,
installed real Obsidian1.13.0 declarations; no version/dependency change or #207 import.

| Integrated artifact | SHA-256 |
| --- | --- |
| main.js | `08edf2b9d219c2e579b1644948ab34474c833b563127c618f5a2b542dc73b9df` |
| manifest.json | `3395e425860e5068e9f3b3d9a0e3d58cefd2c11dededc690beb87f60e733ed7d` |
| styles.css | `88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974` |

Full `npm run verify` passes: architecture self-tests7, core130, main1371, DOM227,
portable sources357 and real IndexedDB710 executions, zero failures/skips. The separate focused
startup/preferences/settings/ownership/discovery/recovery/observer run passes49/49. The existing
strict native staging/render owner consumes that already-completed full-verification receipt,
checks all three installed hashes and passes command/render/no-captured-JavaScript-error smoke;
the full suite is not redundantly rerun by that staging wrapper.
[CI415](https://github.com/zsviczian/kplex/actions/runs/39997178488) passes source95b0093.
Final documentary-head CI remains a separate pre-merge gate.

Complete integrated review confirms SourceRepository is byte-identical to accepted main
(SHA534a061e64ddfe7a609cc774788567ec8ba6afc4c953ea556e7ff9834fe4c63e), and the three
startup runtime files are byte-identical to reviewed B. Both test/script inventories are retained
(no missing main or reviewed206 entries). Protected metadata selection, bounded prepared decode,
original-connection reader leases, digest/frame/posting/finality checks and cancellation remain
#205's accepted implementation. No additional validation, dependency-count/reclaim/schema or
reserved read-plumbing changes occur. #206 remains in its existing startup/source-event owners.

### Exact-build native integration checks

Actual Mac host: Obsidian1.15.0(installer1.14.0), Electron43.3.0/Chrome150.0.7871.212;
drivers use Node22.22.2. Existing disposable Small has76native files/74Markdown notes.
The temporary functional profile selects actual Eager, then actual On-demand/background URLs/
Responsive for live work. Original Small configuration is preserved separately and restored
only after closing its native window; no mutating Small driver targets the Brain copy.

| Lane | Actual result |
| --- | --- |
| Strict exact staging/smoke | Three integrated hashes match; actual source-backed Eager startup completes;74URL owners reused,0URL reads. |
| SI4 | Settings, ontology/inference, rendered gates/labels, siblings, search/provenance and stale-write checks pass; owned cleanup passes. Small minimum-file prerequisite explicitly0. |
| SI5 | Saved-policy, missing/corrupt optional graph, requested-source repair and offline edit/reload pass. Source-backed restarts have0full builds; unchanged cases0canonical reads/parses, genuine offline edit1/1. Cleanup restores settings/fixtures/throttling. |
| Genuine recovery control | Actual adoption false with unavailable metadata, automatically true after genuine availability/change signal; exactly2attempts, full builds0, no unsaved mask, scene retained, cleanup passes. The historical settled-lifetime coordinator-flags qualification remains. |
| #205 protected caller |16saved owners,32transactions,80requests,16lease additions/deletions,48hashes. Exact heads/facts unchanged;0owned durable leases/readers/decode remain. Diagnostic counts, not CPU shares. |
| Held-background foreground | Navigation, editing, native creation/frontmatter updates, current pair evidence and real source closure pass while unrelated inventory is held. |
| Ontology during startup | Existing two-held-boundary native scenario passes: stationary relationships and physical provenance update before remaining work commits; configuration restored. |
| Rename/reload |36observations across actual On-demand and Eager: native FileManager/action rename, moves/case changes, retained identity/incidence, aliases and warm reload pass; configuration restored. |
| Small invalidation | Real late create, controlled native notification after a real equal-mtime/equal-size write, authenticated changed body-URL family, offline alias/reload, late rename/delete all pass; cleanup passes. See host-delivery control below. |
| Startup admission | All7case groups pass: dormant10seconds, six real device controls, dormant native edits/navigation, concurrent main/sidebar first opening and reuse, enabled pre-open Eager, explicit closed rebuilding, inactive live-Plex admission. Actual returned result and cleanup pass. |
| On-demand live/workspace-ready | Byte-identical native actions pass with unrelated P3 held: Find, physical creation, local explicit relationships, recent-tab sync, navigation and genuine owner/queue drain. Independent100ms heartbeat48ticks/maxgap107ms; completed at5.518s in this functional invocation. Cleanup passes. No physical-input/paint or comparative CPU claim. |

Native setup/observer failures remain failed receipts, not silently counted as passes:

- The staging wrapper rejected Obsidian's exact already-disabled response before copying/enabling;
  a guarded idempotent response handler then staged into a new receipt directory.
- SI5 detaches its owned Plex leaves. Invoking recovery next without opening a Plex intentionally
  retained a genuine edit backlog under existing demand policy. Diagnostic state and native
  inspection show0views, source authority/owners drained, initial completion already true. Normal
  activation restores the scenario's visible-Plex prerequisite; unchanged recovery assertions pass.
- The ontology driver rejects a precreated evidence directory; no native mutation began. Logs were
  moved outside a fresh directory. Rename initially rejects Small's owned theme notification;
  normal acknowledgment in its temporary profile allows the unchanged lane and its reloads.
- A supplementary private reader initially used an invalid family/DTO name. Correct `body-urls`
  authentication and stored URL facts pass; no product/storage correction was made.
- Two original policy observations lose results to CLI timeouts during reload/cleanup (the second
  has all7case groups recorded). Cleanup passes. An identical-scenario observer permits at most3
  read-only ETIMEDOUT queries inside unchanged15s-call/180s-owner bounds; its successful invocation
  needs0retries. It does not retry the scenario or grant readiness.
- The original live observer times out after Find and passes cleanup. A separate result-file
  observer retains byte-identical installation/actions/cleanup and all15s action/180s overall/
  90s cleanup deadlines. It avoids concurrent CLI polling and periodic resource sampling during
  interaction; native-owned result/cleanup files and the independent heartbeat verify completion.
  Resource/timing observations are therefore not pooled with other observer profiles.

**Host delivery is distinct from product invalidation.** A public Vault API write with deliberately
preserved mtime and size emits0modify/metadata events through45seconds in the first integrated
control. An independent owned-file control with K-Plex absent changes the real bytes, preserves
stat/identity and likewise sees0events during its two-second observation. The explicit native-event
control then verifies that actual K-Plex source/URL invalidation still runs for an equal-stat edit.
This does not promise detection of unnotified stat-identical writes. Offline Date/path environment
negatives remain covered by the full/focused real-IDB fixtures; no forced metadata readiness,
reader fallback, route or rebuild was introduced.

No new renderer crash/native crashed window is observed; the retained historical unattributed
crash remains unresolved. Original very-early recent-tab and broad-tag failures are not relabeled
fixed by the workspace-ready control. Main rechecked after native work remains9307476.

Small is now closed, original19configuration/artifact files restored byte-for-byte offline.
Native Brain preflight verifies one foreground/unlocked window, AC/nominal thermal, all community
plugins/Sync/Publish off, no owned controller/fault hook/debugger and native IDB methods restored.
Retained S2 hash/schema10/15stores/1,537,552rows match original metadata. Its guarded restore
completes at19:00:24.557UTC, with activation fenced until decoded native readback verifies every
store. The primary S2/warm observations and final integrity results follow below.

### Integrated retained-S2 application startup

Before activation, the existing guarded importer completed decoded native verification of all
15 stores /1,537,552 rows against the original S2 counts and digests. The three bounded observer
windows joined one owned restore job; they did not perform three imports. The exact vault/database,
unchanged schema compatibility and original stream SHA were checked before restoration. Historical
streams, sidecars and durable evidence remain unchanged. Preparation/import time is excluded below.

The single full-application launch starts at19:02:54.759UTC. Hydration takes its actual
`full-snapshot` route; no route is forced. Actual source authority, initial
completion, URL completion and persistence/semantic-owner drain coincide at **408.930seconds from
launch**. Observation continues through **602.128seconds of quiet**, ending at1010.932seconds.
No body-dirty enumeration, canonical body read, parse, source repair, activated replacement,
resolution refresh, source chunk/byte write or URL read occurs. Source checks11839 and body reuses
11840 remain real work: cached validity checking has not been removed. All11839URL owners finish,
11819 restored from the retained cache. Final node count110470, authority true, initial complete,
all five scheduler lanes/source owners/body writers empty, no queued snapshot and no unsaved source.

Initial sampled discovery flags show11839 total Markdown files,0dirty/body-dirty/created/resolution-
dirty/nonzero-revision entries. Forwarding observes11839 distinct acquisitions,0same-revision
revisits,2inventory admissions (one session inventory pass and an empty follow-up),0automatic
full builds/cancellations and0unsaved masks. Session full-builder starts are also0. The late observer
attaches38.923seconds after launch; forwarding counts cover that suffix and cannot prove absence
of every earlier operation. Fresh runtime source/repository/URL counters and the actual completion
state supply separate evidence. No observer overflow occurs.

The current inputs need **zero** source activations, unlike the historical candidate's one genuine
resolution update. This is not an exactly-one-activation requirement or a forced route. Genuine
offline/source changes still require their demonstrated work in the integrated Small lanes.
Realized #204 ordinary activation-count reuse and selected-count repair are both0 because this
run makes no replacement; digest eligibility is not counted as realized reuse.

Whole-application external process-family CPU is **620.420CPU-seconds**, including the quiet interval;
external maximum sampling gap1040ms, no recorder errors, native CPU coverage valid/maxgap1043.9ms,
AC/unlock/visibility/throttling conditions intact. There are12unfocused one-second native samples
at299.014-310.007seconds after attachment, during work; the complete subsequent quiet interval is
focused. Consequently the observer correctly reports `comparable:false`. This is a bounded
integration/work-completion confirmation, **not** a new controlled speedup estimate or an additional
historical matched pair. No build, test, hashing/import or heavy oracle overlaps the observation.
Normal cleanup disables K-Plex, empties community enablement and restores owned configuration.

### Integrated ordinary warm activation

The separately declared warm condition is the naturally completed/persisted integrated S2 state,
after its full quiet interval and normal disable. There is no A4 import, cache clear, application
restart, route override or forced rebuild between the two confirmations. This is not row-matched
to the historical warm controls.

| Confirmation | Actual closure | Subsequent quiet | Whole-application CPU through observation |
| --- | --- | --- | --- |
| Retained-S2 full-app startup |408.930s from launch|602.128s|620.420CPU-s, external process-family sampling; focus qualification above|
| Ordinary warm activation |153.016s from pre-admission probe arm|603.971s|267.606CPU-s, native cumulative application-process sampling|

Warm observation ends756.016seconds after arm. All757native samples retain valid CPU identity,
foreground, visibility, AC, unlock and throttling conditions; maximum gap1057.5ms, no dropped
forwarding events. Warm startup performs0checked-source acquisitions,1cached body request/reuse,
0canonical reads/parses/repairs/resolution refreshes/activated replacements/chunk writes/URL reads,
and0unsaved masks. All11839URL owners are restored from this completed cache. One session inventory
pass and an empty follow-up do not reacquire the vault: repeated owners/revisions and automatic
full builds/cancellations remain0. Hashing/validation and inventory work still exist; the warm
observer records48152hash calls and59968transactions, which are not exclusive CPU attribution.
Final authority/initial completion/URL completion are true, node count110470, all source/semantic/
persistence queues drained. Realized #204 ordinary reuse and selected-count repair are both0.

Both runs finish within their original45-minute cap and retain the600000ms quiet requirement.
Neither is pooled with the historical pairs, used to attribute an exact plugin-only CPU share,
or treated as a new statistically established speedup. Startup adoption completion is separately
established by real owner/readiness state; changing a coordinator flag is not credited as CPU work
avoided. The genuine-failure/recovery and invalidation lanes above remain separate correctness
evidence. No additional optimization or runtime change was introduced during this closeout.

### Integrated semantic parity, reload and cleanup

After both timing windows, a separate normal activation and the unchanged eight-target oracle
check the real-data copy. All seven bounded targets render and retain exact relationship/gate/
search/provenance hashes against both retained candidate2 and baseline2. Complete base, URL and
combined vocabularies are byte-equivalent as decoded records:110470base,86593URL-overlay and
110470combined entries; combined SHA-256
`757a297f478716577bf95f2f2ea7945e119c0d81f7b77ab792299f8d5225450c`.
The ordinary reload selects its actual full-snapshot route; no source-backed route is forced.
Source-backed startup and reload correctness are independently covered by the Small lanes.

The original broad-tag target still times out at30.639seconds with canonical data available,
2pending semantic tasks and256dependency visits. It is not a passing target or substituted with
the bounded tag. One30-second read-only CLI transport timeout is retained during this functional
invocation; the native-owned task continues under the unchanged observer/action bounds. The exact
returned result, strict comparisons and cleanup succeed. This transport observation is not pooled
with the timed CPU lanes and does not erase the historical observer failures.

Final native inspection after activation/reload finds one healthy isolated copy window, K-Plex
off/community enabled set empty, Sync/Publish off, no study/functional/recovery/indexing/startup
controllers, no metadata fault hook, debugger or DevTools, restored layout observer and all nine
checked native IndexedDB method prototypes restored. No new or changed Obsidian crash report
appears. Independent process audit finds0owned live processes. All test-owned fixture/resource
cleanup passes. Small remains closed and its complete19-file original configuration/artifact
inventory matches byte-for-byte, with0added/removed/changed files.

Independent post-observation hashing confirms:

- Copied nonconfiguration content:20190files /10,956,614,603bytes, identical,0added/removed/changed.
- Protected production configuration:223files /84,002,510bytes, identical. No original full-content
  baseline exists; this is not a full production-content hash claim. No original-vault operation
  writes, enables, stages, restores or queries its plugin database.
- Copied configuration:223files,0added/removed; all settings/community/core/workspace bytes match.
  The original existing file-explorer leaf and saved workspace bytes are restored through the
  typed Workspace owner. Only the intentionally retained integrated `main.js` differs from the
  integration-start configuration. Manifest/styles match the recorded integrated hashes.

At19:37:52UTC all native work/audits finish and the Mac is released for ordinary use. Further
report/GitHub/CI work requires no Obsidian focus or restart. Historical seeds, sidecars and private
archives are preserved; new integration evidence uses a separate restricted durable archive.

### Acceptance boundaries and final publication

The integrated implementation preserves accepted main9307476/#205 and #201/#203/#204, with
no #207 import or experiment/branch change. Runtime/build inputs remain those of95b0093 and the
three exact artifact hashes above; subsequent publication changes are documentary. Both
[CI415](https://github.com/zsviczian/kplex/actions/runs/39997178488) and
[CI418](https://github.com/zsviczian/kplex/actions/runs/40006531209) pass. The final documentary
head must also pass remote CI before the authorized ready/normal-merge operation. Its exact
remote checkpoint, final CI and verified merge reachability are recorded on #206 at delivery,
avoiding a self-referential report/commit/CI update loop. Main is rechecked before merging; any
intervening accepted change requires affected revalidation. No release, production deployment,
force-push, history rewrite or branch deletion is part of this closeout.

No new substantive semantic, recovery or responsiveness regression is demonstrated. Retain these
named follow-ups and the historical qualifications, without calling them fixed:

1. Broad-tag semantic completion failure on baseline and candidate, still present integrated.
2. Route-dependent joined relationship-type name ordering, not universally cosmetic; strict
   full-reference differences remain unnormalized.
3. First baseline's unexplained two-node terminal-count difference; later exact vocabularies do
   not retrospectively identify those original two rows.
4. Very-early recent-tab synchronization failure on both historical artifacts; workspace-ready
   passes are a separate, qualified lane.
5. Isolated unattributed historical candidate renderer crash; it does not recur during integrated
   staging, activation/reload, focused native checks or either confirmation.

Fewer historical completed pairs, power-qualified first baseline, censored second baseline and
controlled-versus-naturally-stranded-candidate recovery remain accepted measurement limits.
The integrated startup focus interruption and late operation attachment are additional explicit
observation limits; they do not establish a new CPU comparison or change the actual avoided-work,
completion, exact semantic parity or matched quiet-period results. No extra issues/PRs are created.

### Accepted-main advancement at final publication

The final19:41UTC fetch discovers accepted main **`ea89a831aee433bfcfa2847f710ff82ebcfe158c`**,
the normal merge of #207. This occurs after the native observations and Mac release above. The
95b0093/08edf2b9 evidence remains a completed, frozen integration checkpoint; it must not be
relabeled as a build of this newer source or silently used to waive affected checks.

The intervening production change is confined to selected local dependency-count repair in
SourceRepository: bounded authenticated membership cursor pages, one scalar ledger read/final
mutation per distinct key, ordered old/new intermediate count checks and atomic old-prefix range
deletion in the existing journal transaction. #205's protected metadata reader, #206's startup
owners and the storage schema are unchanged. Accepted #207 tests/tooling/reports and its explicit
storage/reopening limitations must be preserved; its stopped investigation is not resumed.

Current accepted main will be merged normally into #206, with a newly identified artifact, full
verification and affected recovery/count/invalidation/foreground/native checks before merge.
The completed S2/warm runs exercise0selected repairs/replacements: those observations remain
evidence about their exact frozen source, not timings of the forthcoming artifact. No historical
matrix repetition or new optimization is planned. #206 remains draft until the updated gates pass.

The new normal merge has only HANDOFF, append-only ledger and package test-list conflicts.
Resolution retains the active #206 assignment/standing header, every byte of the prior ledger
followed by the complete #207 tail, and the union of both package test inventories. Runtime merges
without conflict: SourceRepository exactly matches accepted #207 SHA-256
`d8d6d532bb711b3cb2bb5d0e55152392495533b8eb64c069158ca8b0e98809d8`; all three #206 startup runtime
files remain unchanged. Combined startup/discovery/recovery plus count/journal/lease/foreground
real-IndexedDB focus passes **174/174**, zero failures/skips, before publishing this integration.
New full verification/build, exact-build native acceptance and final-head CI remain pending.

### Current-accepted-main artifact and affected acceptance

Normal integration source **`823d1d3c8272be44ab5494af85445b66fd28f944`** has parents
cf14b1c (the frozen first-integration evidence) and accepted main ea89a83 (#207). No runtime
resolution/edit is needed: SourceRepository is exactly accepted d8d6d532 and the three #206
startup owners are unchanged. Both architecture histories, test/script inventories and reports
are retained. The root HANDOFF retains its standing header and current #206 assignment.

The newly built, frozen and natively staged Mac artifact is:

| Current artifact | SHA-256 |
| --- | --- |
| main.js | `9912395b8a7927067ba6d366e634e3839a0f374bc5473d4284291be63062b653` |
| manifest.json | `3395e425860e5068e9f3b3d9a0e3d58cefd2c11dededc690beb87f60e733ed7d` |
| styles.css | `88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974` |

Node22.22.2, real installed dependencies and Obsidian1.13.0 declarations. Full `npm run verify`
passes architecture7/core130/main1395/DOM227/portable-source357/real-IndexedDB721 executions,
zero failures/skips, followed by its actual TypeScript production build. The separate combined
174/174 focused run also passes. [CI421](https://github.com/zsviczian/kplex/actions/runs/40014412320)
passes this exact source. Later documentary-head CI is still required before merge.

Affected native checks run serially after all heavy local verification/builds finish. Small is
first verified closed, its fresh19-file original configuration backed up, and Sync/Publish/all
community plugins disabled offline before opening. Strict existing staging/render verification
checks the new three hashes; the loaded repository also exposes the new accepted repair method,
preventing old loaded code from being mistaken for the installed artifact.

| Current-build lane | Actual result |
| --- | --- |
| SI5 source/cache/reload | All five unchanged cases pass: changed policy, missing/corrupt optional graph, genuinely damaged source, offline edit. Source-backed restarts have0full builds; unchanged cases0canonical reads/parses. Damaged source repairs exactly1; offline edit requires1read/parse. Missing/corrupt cache restores global vocabulary. |
| Failed-adoption recovery | Genuine unavailable metadata causes false adoption; restored availability/change signal causes true adoption. Exactly2attempts, scene preserved,0full builds/unsaved masks, cleanup passes. Settled-lifetime coordinator-flag qualification remains explicit. |
| Native selected repair | Existing eight-note diagnostic passes creation, prose/label edits, changed membership, deletion and later edit; complete local dependency inventory reaches ready. Native selected repair opens34membership cursors.13/32projection attempts match the prior count/digest, but this is eligibility, **not** a realized #204 reuse counter or exclusive CPU attribution. Changed edit has2attempts/0matches, proving genuine fallback. |
| Foreground during held work | Navigation, editing, native creation/frontmatter and current pair provenance pass while unrelated work is held; actual authority/durability converge during cleanup. No owned fixture/controller remains. |
| Required invalidation | Late create, real same-stat bytes plus explicit native notification, authenticated changed body-URL family, offline alias/reload, rename and deletion pass. Unsaved0, cleanup passes. Independent host non-delivery qualification above is retained. |

The first current-build SI5 invocation remains a failed receipt: changed-policy completes, then a
CLI `eval` times out during missing-cache observation. Captured native state is ready, pending0,
full builds0, failures0; original cleanup restores settings/fixtures/throttling. A separately
identified invocation uses atomic native-owned result files instead of concurrent CLI status
polls. Its native scenario/cleanup tail is byte-identical (retained SHA and original driver bytes),
30-second CLI/300-second case bounds unchanged, with no per-case scenario replay or readiness
substitution. All five cases pass with0lost-install acknowledgements/transport retries. No product
or checked-in test driver is modified. Neither invocation is a CPU acceptance measurement.

The first close owner also retains its failed assertion: `disablePlugin` unloads the instance but
leaves persisted enablement. Native inspection proves loadedfalse, enabled[k-plex], no controller
and writers off. Normal CLI disable clears the preference; a separate positively guarded closure
then verifies the registry closed before all19original Small files are restored offline. The
final complete inventory has0added/removed/changed files. No product validity check is relaxed.

### Current-build real-copy confirmation and final cleanup

Before staging, native guard verifies exact Brain name/path, stopped plugin/all writers off and
existing database `k-plex-index-v1-6b706c65782d746573742d627261696e2d6d6163`, schema10. The current
223-file configuration is backed up. All three installed hashes match the new frozen artifact.
Normal activation verifies the newly loaded repair method and the **actual active connection's
database name**, then completes source authority/initial adoption/URL work through the ordinary
full-snapshot route. No checkpoint is restored, preferred route forced or full application restarted.

Current source counters are0checked acquisitions/canonical body reads/parses/repairs/resolution refreshes/failures,
1cached body reuse, with pending-known/impact/source/write/delete owners all0. Initial complete is
true and initial-source-incomplete false. All110470base/86593URL-overlay/110470combined vocabulary
records and all seven strict target/gate/search/provenance hashes exactly match both retained
controls; combined SHA remains757a297f...25450c. No strict difference is normalized away.
Cached validity/metadata/storage work still exists; these counters do not mean all startup work is0.
The unchanged original broad tag again times out at30.841seconds with canonical data available,
2pending tasks/256dependency visits. Functional observer transport errors0; native cleanup passes.

The two full startup/warm **CPU observations above remain source95b0093/main08edf2b9 only**.
Their zero selected-repair/replacement workload does not execute the intervening #207 production
change. Current-source full/focused tests, positive native selected repair, source-backed recovery,
foreground/invalidation and exact real-copy activation/parity validate the affected combination.
No new CPU figure, statistical speedup or full-app timing pair is assigned to main9912395b; no
historical matrix is rerun. Realized #204 reuse remains0 in the no-replacement real-copy runs;
the native diagnostic's matching projections are reported separately as eligibility.

After all native work, copied nonconfiguration content again matches **20190files /
10,956,614,603bytes**,0added/removed/changed, both against its current entry manifest and the
earlier unchanged fixture. Copied settings/community/core/workspace bytes match their fresh
pre-staging backup; only intentionally retained, disabled main9912395b differs. Small is closed
and its complete19-file original configuration matches. K-Plex/all community plugins/Sync/Publish
are off in Brain; no owned controller/fault hook/debugger/process remains; native IDB prototypes
are restored. No new or changed Obsidian crash report appears during either integration phase.

All native work/audits finish **20:27:16UTC** and the Mac is released again within the agreed
15–20minute window. No more focus/restart is needed. The protected original's configuration audit
was identical before the earlier19:37:52UTC release; later operations only target guarded test
vaults and never open its database or write/enable/stage/restore its files. No full original-content
hash claim is made. Historical seeds/sidecars/archives and all failed observers remain preserved.

Final publication changes only the current HANDOFF, append-only ledger and this report. Recheck
accepted main and exact remote head, pass final documentary-head CI, then perform the authorized
normal merge and verify GitHub merged plus main reachability. The five named #206 follow-ups and
all previous measurement qualifications remain. Accepted #207 reopening/storage cost, unresolved
backend cause and missing production-scale bound also remain; its investigation is not resumed.
No new issue/PR, optimization, release, production deployment, history rewrite or branch deletion.
