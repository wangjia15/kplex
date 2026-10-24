# Mac real-vault indexing study — PR #203

Zsolt's Codex Agent. **Final study record, 2026-10-23 Europe/Budapest.**
The report-only review snapshots `c99073b` and `6d3d19e` remain in Git history. This finalization
adds the guarded test harness and contributor workflow, removes the temporary plan marker and
records completed evidence retention. Historical sections below retain their dated partial states,
failed runs and qualifications; their old pending/authority notes do not describe the final state.

## Scope and outcome

**Capture, cleanup and evidence delivery are complete; current-main performance acceptance is
inconclusive.** The maintainer authorized finalizing and merging the report/tooling into `main`.
No production indexing algorithm, cache schema, scheduling, pacing or release-version change is
proposed by this study. The finalization tree incorporates existing `main` so it preserves PR201's
already-merged implementation. Its production source/styles/release metadata exactly match `main`.

Measured runtime A is `551a3b52895484de3dd41e5c6eb2fa8c6712fec4`; B is
`c4a656b54cfe66b686e662e4d8bbfa0536cc4149`. PR201 independently merged the newer runtime
`fa08e60e1a7122f8b37fcd11c943b883317b6ae8` at 2026-10-23 04:27:52 UTC. That newer runtime
is **not measured here**. Integrating its history for final repository verification does not change
these immutable Mac measurement identities or provide performance acceptance of current main.

The evidence covers four cold observations, earlier qualified warm runs, three later matched
full-snapshot warm timing pairs, two full-application startup cache lanes, separate profiles/resources,
active navigation, disabled controls and final content/configuration checks. The principal limits are:

- C3 has unresolved power comparability; C1/C2 have historical power snapshots rather than continuous
  power coverage. C4 has continuous native/external AC, but different A/B startup routes.
- All three later warm timing pairs have valid timing and seven-target bounded semantic parity.
  W4's additional broad-tag check times out in both arms after rendering, so only two pairs receive
  full functional acceptance for their declared workloads.
- Full-snapshot application startups in both frozen revisions remain incomplete at the 45-minute cap.
- Separate warm CPU profiles exceed the sampler-gap limit. Detailed warm resource phase tables hit
  their 256-bucket cap: grouped operation counts are lower bounds. Dedicated lease counters have
  complete coverage. The optional post-restore OFF control has a focus interruption and is qualified.

The strongest findings are:

- B-c4 removes nearly all repeated cold source reads/parses and roughly halves parser calls. That is
  work reduction, not a demonstrated 50% whole-process CPU reduction. Cold routes/history vary;
  C4's observed 32.22% closure CPU reduction is conditional on an asymmetric route.
- Graph readiness can precede observable source closure by five minutes and 545–586 CPU-seconds,
  including 11,823 later neutral reuses in strict-AC C4 without new source I/O, parsing, repair or masks.
  Revisions change, so same-revision replay is not established.
- The three later warm pairs do not demonstrate a uniform speedup. Readiness CPU medians are
  A222.985 / B233.176 seconds (+4.57% ratio); full intervals including quiet are A357.292 /
  B370.380 (+3.66%). A late scheduler pulse in W4 requires keeping readiness, last observable
  closure and full-interval metrics separate. Counts alone do not explain their CPU variation.
- Full-snapshot startup can regain authority and drain masks while retaining an initially incomplete
  adoption with no observed later retry. This is a bounded recovery/readiness failure in the frozen
  revisions; the latest runtime must be checked before proposing a correction.
- Source-local dependency rows/keys account for 78.45% of classified ObjectStore calls in the separate
  counts-only startup diagnostics, **not 78.45% of CPU**. Those tables do not overflow. The later
  detailed warm tables do overflow; their separate complete counters show 11,886 committed lease
  creations/retirements in each arm. Exact exclusive consumer/native CPU remains unresolved.
- A valid ordinary OFF control costs 8.802 CPU-seconds over ten minutes. The focus-qualified
  post-restore OFF capture costs 27.993 CPU-seconds, with early renderer activity before the later
  interruption. Restoration history can contribute to observations, but its cost is not subtracted
  from A/B timings and no exact GC/storage cause is established.

| Cold pair | Order | Observed route A / B | Closure CPU A / B (s) | B versus A | Qualification |
| --- | --- | --- | ---: | ---: | --- |
| C1 | A→B | catalog / catalog | 2,800.614 /2,770.907 | −1.06% | Historical power snapshots; two negligible idle renderers in both arms |
| C2 | B→A | progressive / progressive | 4,790.776 /4,150.398 | −13.37% | Historical power snapshots, no continuous power trace |
| C3 | A→B | progressive / progressive | 4,234.989 /4,862.508 | +14.82% | Power transition time unknown; not matched-power acceptance |
| C4 | B→A | progressive / catalog | 4,677.013 /3,170.257 | −32.22% | Continuous native/external AC; different routes within pair |

These are descriptive observations, not four repetitions of one fixed route. Earlier probes and
process/power conditions differ. Failed, excluded and censored evidence remains retained.

Final verification at **2026-10-23 10:56:31 Budapest / 08:56:31 UTC** finds all **20,190 copied
content files / 10,956,614,603 bytes** and all **223 protected production configuration files /
84,002,510 bytes** identical to starting hashes. No original full-content before-manifest was
acquired, so that audit remains configuration-scoped. No production write, plugin toggle, deployment,
database operation or note operation was performed. Copy data/property types match; K-Plex, Sync,
Publish and external/startup writers remain disabled, with study controllers/debugger removed.

Before any later warm activation, all declared restores select the same naturally complete A4 seed:
schema10,15 stores,1,537,695 rows,1,741,828,130 bytes, SHA-256
`2c1ec8518b8ca5969ebefea7d09092a7284d40daa48844c6939e2640cde0dfe8`.
It has 110,470 pages,498 snapshot chunks,11,839 source heads and URL owners, and zero pending
local dependency repairs. Native key/value decoding verifies. No store is stripped to force a route;
earlier source-only/A3 seeds remain separate. Raw notes, paths, configurations, profiles and row
streams stay outside Git. Final private retention verifies **1,103 files / 2,063,535,924 stored bytes**,
including exact source/artifact identities and all failed/qualified receipts. Working seeds remain intact;
no transient HANDOFF is archived.

## Identity, isolation and environment

The maintainer supplied an unopened, physically separate copy, `kplex-test-brain-mac`.
Offline preparation backed up the entire copied configuration, emptied the community-plugin
enabled list, disabled core Sync/Publish, and parked restored content/plugin panes. Other core
plugins, installed executables, K-Plex preferences, ontology and property types were retained.
Actual K-Plex absence and saved enablement were verified after normal user trust. Native
metadata discovery and its indexing notice finished before measurement. The copy's exact
K-Plex database was absent before first activation. No production deployment, toggle, cache
export/reset or note edit was performed.

Both real paths, every ancestor and the complete copied tree were checked: no aliases,
symlinks, hard-linked files, nested production/test roots or cloud-backed destination.
Private before/after manifests cover 20,190 non-configuration files / 10,956,614,603 bytes,
including hidden/trash content. Obsidian exposes 20,144 files / 11,839 Markdown files;
Markdown payload totals 200,112,904 bytes, largest 12,392,537 bytes. These inventories have
different scopes and must not be substituted for each other. Final integrity checks pass as recorded above.

Host: MacBookAir10,1, Apple M1, 8 GB RAM, macOS 14.5 (23F79), recorded power context below, bounded
keep-awake assertions. Obsidian 1.14.4; Electron 43.3.0 / Chromium 150.0.7871.212;
renderer Node 24.18.1. Installer version 1.14.0 is independently confirmed by the native sample
header and application bundle's `CFBundleShortVersionString`. Builds and
tool validation use Node 22.22.2 and the installed Obsidian typings. The saved desktop profile
is Eager, before-view indexing enabled, background URL discovery enabled, Responsive scheduling.
Only K-Plex is enabled during indexing; this does not test a production-like companion profile.

| Arm | Runtime commit | Production `main.js` SHA-256 |
| --- | --- | --- |
| A | `551a3b52895484de3dd41e5c6eb2fa8c6712fec4` | `3b96f51e8b734bd622fb0034f1e17682efb17eda8b6caed6e2d69ac7bd05e5f3` |
| B | `c4a656b54cfe66b686e662e4d8bbfa0536cc4149` | `7d5430e59b6f204df0d4564e8d7ecdaf0776e5ea85063dce54e2d179f4ce4687` |

Both pinned worktrees passed the real production build. The artifacts match the pinned
Windows report exactly. Shared manifest SHA-256:
`4d2783cf09dc3f39842e9c76604cfb6b413997287d3c8a361a6994b86fc8c619`;
stylesheet SHA-256: `88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974`.
Complete three-file installs are staged and byte-verified with the plugin stopped.

A later GitHub recheck finds #201 advanced to tooling head
`48e79706758e153cf46f1f073b9e964193078dc2`, describing runtime
`fa08e60e1a7122f8b37fcd11c943b883317b6ae8` / main SHA
`c39fb4876315a3348b782fe91400398faab1f98de8c0852eb9cc06bf24509a58`.
This Mac series deliberately remains frozen at B=`c4a656b…` / `7d5430e…`;
no newer runtime is mixed into it. These observations do not establish performance acceptance
or rejection of fa08e60/C39. #203 itself remains draft at 22b44d3, unchanged remotely.

## Measurement and limits

The serial driver verifies the explicit live vault path/name before work and derives the exact
database identity from the source-confirmed UTF-8 name encoding. Every native call selects that
vault. Reset/import refuses production, aliases, active plugins and pending storage ownership.
No origin-wide clearing, forced flush, scheduler holds, note fixtures, metadata reset or compiled
runtime hooks are used. Native Small-vault smoke and guard tests preceded the copy's first run.

The same forwarding observer is armed before `enablePlugin`. It attaches at native
`onLayoutReady` registration, before K-Plex's startup admission. This is verified in the actual
run rather than inferred from a successful enable. Observer SHA-256 for the cold pair:
`b72de45808627f02c267f381f67854617be27afb1baf53c8941e72ee65ca8116`.
One-second Electron cumulative CPU samples count each PID/creation-time identity once;
worker threads are already included. Five-second CLI polls save progress; full reports are
captured at the end. Maximum supported run is 45 minutes, with ten minutes of naturally drained
quiet after closure. Closure includes source authority, readiness, URL completion, no unsaved
owners, inventory/acquisition/repository writer/deletion work, body/snapshot persistence queues,
hydration/build work or active/waiting scheduler lanes. Readiness alone is insufficient.

CPU includes the Obsidian Browser, GPU, Utility and all application renderers. During A two other
idle test-vault renderers remained open; together they consumed 0.922152 CPU-s over the entire
36.6-minute observation. The maintainer reported closing the other vault windows before B;
native inspection later showed two test windows still present. Electron retained the
same two idle renderer identities throughout B (0.750034 CPU-s combined), with no births/exits
in either run. Native single-window isolation is independently checked before application quit.
The maintainer closed those two windows between the first warm A/B timings; the saved registry
then marked only the brain copy open. Their idle CPU was negligible in the cold pair, but the first
warm pair has a changed process roster. The maintainer subsequently removed the overall session
time limit; the 45-minute per-run cap and ten-minute quiet requirement remain in force.
Window-state changes, A→B order, memory/thermal history and uncontrolled native read caches
remain limits on causal interpretation. Native/OS read
caches are not controlled. These are **cold K-Plex / warm Obsidian** runs, not cold computer starts.

Operation counters count calls, UTF-16 input units and repository-method transactions, not CPU
exclusive to those operations or on-disk bytes. Direct native transactions are outside that
transaction counter. `inventoryStarts` counts reconcile invocations, which can join one actual
inventory; use lifecycle diagnostics for admissions. The low probe's legacy `fullBuilds` field
observes `index.rebuild()` calls, not every compiler entry such as `rebuildProgressively()`.
`sessionWork.fullBuildStarts` also undercounts the later progressive lane. Cross-check semantic
preparation's `fullBuilds` and explicit build decisions. The original cold pair's zero-full-build/
one-node-catalog classification is independently confirmed by those records; a zero call counter
alone is insufficient. Repeated acquisition owners are tracked
with weakly held private coordinates that are never exported by those counters. Zero observed same-revision revisits is inconclusive because the
first pre-call source state can be absent. Result/mask histograms retain finite categories only.
No observer-off matched timing series has yet quantified forwarding-counter overhead. Cold closure
does not sample a dedicated semantic-task getter; the final lifecycle snapshot records zero pending
semantic preparations, and scheduler/source activity and unchanged quiet counters provide supporting
evidence. Subsequent lanes also check pending known events and the dedicated semantic getter.
“Closure” and “quiet” refer to these observable K-Plex owners, not a proof that every native
storage cleanup, rendering task or garbage collection has ended. CPU continues to be accumulated
through the complete quiet interval; a post-ready burst cannot be discarded as zero work merely
because the sampled owners are drained.


Mean occupied cores are CPU-seconds divided by elapsed seconds, rather than wall time or
peak CPU percentage. Through closure, C1 A/B average 1.757 /1.792 cores, W1 average 1.352 /1.512,
and S1 approximately 2.388 /2.366 using CPU-bracket midpoints. These retain the same cohort and
comparability limits as their individual observations; they do not identify which threads or
consumers used the CPU.

## Controls and cold observations

The accepted K-Plex-disabled control accumulated **1.134889 CPU-s in 60 seconds**, 61 samples,
maximum gap 1,015.5 ms, no births/exits, hidden/unfocused samples or throttling changes. It uses
the same native sampler and CLI polling with no plugin work. It is a one-minute host control,
not a matched ten-minute idle subtraction. Initial hidden controls and the pre-B control that
lost foreground are retained privately and excluded from comparative timing.

| Outcome | Cold A | Cold B |
| --- | ---: | ---: |
| Status | Complete | Complete |
| CPU to graph readiness / closure, CPU-s | 2,800.613663 | 2,770.907259 |
| Elapsed to graph readiness / closure | 26:34.017 | 25:46.015 |
| Quiet observation | 10:01.223 | 10:03.740 |
| Final nodes | 110,435 | 110,435 |
| Shared parser submissions | 23,658 | 11,839 |
| Parser input, UTF-16 units | 399,693,181 | 199,867,318 |
| Source reads / parses | 11,820 / 11,820 | 1 / 1 |
| Source checks / repeated acquisition owners | 23,664 / 11,825 | 23,664 / 11,825 |
| Repository transactions, RO / RW | 481,885; 348,798 / 133,087 | 481,893; 348,798 / 133,095 |
| Hash calls / UTF-16 input | 512,522 / 584,934,092 | 512,522 / 584,934,092 |
| Unsaved owners / observed mask additions | 0 / 0 | 0 / 0 |

A is a source-backed startup: one actual inventory, no full rebuild or complete snapshot save.
Its two reconcile invocations are not two whole inventory admissions. Source writes progressed
through roughly 15 minutes, later validation/replay continued, then node vocabulary completed
at 26½ minutes. Graph readiness and route closure appeared in the same one-second sample.
All retained work counters remained unchanged during the following ten-minute quiet interval.
There was no observed persistent-unsaved tail. The historical production report's 110,464 nodes
is a different cache/runtime history and is not an equality oracle for this copied cold run.

At A's 5/15/30-minute horizons, accumulated CPU was respectively
558.701700 / 2,045.544269 / 2,806.877643 CPU-s. At 15 minutes all 11,839 sources had been
repaired but readiness had not been reached. At 30 minutes work was already quiet.

Across A including quiet, Browser CPU was 2,197.881281 CPU-s, measured-copy renderer
569.475007, GPU 46.511706 and Utility 0.157598. Browser dominance is measured; a claim that
all of that CPU belongs to IndexedDB requires separate native profiling. Threads must not be
added to these process totals again.

B accumulates **1.0607% less CPU** and reaches closure 48.002 seconds earlier in this single
pair. Parser submissions fall 49.9577%, while hash input is identical and transaction counts
are effectively unchanged. B also uses one actual inventory, no full rebuild, no snapshot save
and no pending semantic preparation at the end. Quiet counters stay unchanged. Full-run CPU
including quiet is 2,814.947744 / 2,785.481309 CPU-s for A/B. Browser/GPU/Utility/test-renderer
CPU for B is 2,176.998691 / 44.315447 / 0.091231 / 563.325906.
This is evidence of parser reuse with little observed end-to-end CPU reduction, not statistical
performance acceptance, a median over repetitions or the requested 50% CPU reduction.

## Later cold repetitions and ready-to-closure tail (C2, B→A)

B2 reaches graph readiness at 24:54.007 / 3,576.438797 CPU-s, then reaches observable
background closure at 30:06.009 / 4,150.397751 CPU-s. This is a **5:12.002 post-ready tail
using 573.958954 CPU-s**, with no unsaved masks or repository read failures. During that tail,
source checks and neutral body reuses each increase 11,822. There are no further Markdown
reads/parses, source repairs, resolution refreshes, acquisition failures or shared parser calls.
Repository-method transactions increase 200,536 (165,069 RO / 35,467 RW), and hashes
increase 177,976 calls /234,282,327 UTF-16 units. Repeated owner acquisitions increase 11,822,
but observed same-revision revisits do not increase: revisions changed during the tail, so this
is not established as replay of unchanged source revisions.

At first readiness source authority is still false, one source task is active, 3,318 known events
are pending and a snapshot is queued. The known-event backlog subsequently reaches 11,822
before draining. At closure source authority is true and all observed owners are drained.
Ten more quiet minutes (10:03.883) keep work counters unchanged; total CPU is 4,259.669102
at 40:09.009. The additional 109.271351 CPU-s after closure illustrates the limits of observable
owner closure. Foreground/CPU coverage is valid, with a maximum 3,143.4 ms sample gap, no
births/exits or transport errors, and final cleanup verifies the plugin absent and saved list empty.

This repetition takes a different route from C1. Hydration stalls in its metadata phase and
hits the 90-second watchdog; the explicit decision is
`cold-progressive:startup:no-snapshot|startup:partial-restore-incomplete`. Semantic diagnostics
confirm one full build, followed by one complete snapshot save (31.612 seconds). Both the
low forwarding counter and production `sessionWork.fullBuildStarts` report zero because they
omit this progressive entry. Final graph size is 110,470 nodes, versus 110,435 in C1. Source
checks/reuses/legacy reuses are 34,651 / 22,752 / 10,970; reads/parses 1 / 1; repairs 11,839.
The 36 source failures are 18 cancellations plus 18 activated-but-no-longer-live outcomes,
not 36 storage faults. Full-observation Browser/renderer/GPU/Utility CPU is
3,321.822482 / 895.265045 / 42.479205 / 0.102370 CPU-s.

A2 reaches readiness at 27:26.079 / 4,232.287075 CPU-s and observable closure at
32:36.010 / 4,790.776351 CPU-s. Its 5:09.931 tail uses 558.489276 CPU-s and adds the same
11,822 checks/body reuses, with zero new reads/parses/repairs/refreshes/masks and zero additional
observed same-revision revisits. Tail hashes match B2 exactly; repository-method transactions
are 210,750 (175,283 RO / 35,467 RW). A2 completes 10:00.523 quiet with unchanged work
counters and successful absent-instance/empty-list cleanup. Its maximum sample gap is 3,700.9 ms;
foreground and CPU coverage remain valid. It confirms the same metadata timeout, one progressive
full build, two actual inventories, one complete snapshot save and no node catalog. Its 48 source
failures are 29 cancellations plus 19 activated-but-no-longer-live outcomes.

| C2 result, B→A order | A2 | B2 |
| --- | ---: | ---: |
| CPU to ready / closure, CPU-s | 4,232.287075 / 4,790.776351 | 3,576.438797 / 4,150.397751 |
| Elapsed to ready / closure | 27:26.079 / 32:36.010 | 24:54.007 / 30:06.009 |
| CPU including ten quiet minutes | 4,904.391526 | 4,259.669102 |
| Shared parser calls / UTF-16 units | 23,712 / 402,209,279 | 11,839 / 199,867,318 |
| Source reads / parses | 10,981 / 10,981 | 1 / 1 |
| Repository transactions, RO / RW | 441,205; 297,236 / 143,969 | 441,144; 297,229 / 143,915 |
| Hash calls / UTF-16 units | 512,806 / 572,033,821 | 512,733 / 571,746,877 |
| Final source checks / body reuses | 34,661 / 22,749 | 34,651 / 22,752 |
| Peak masks / repository read failures | 0 / 0 | 0 / 0 |

B2 uses 13.367% less CPU to closure and 13.146% less including quiet in this pair. Shared parser
calls fall 50.072%, while repository transaction/hash counts remain close. Full-observation A2
Browser/renderer/GPU/Utility CPU is 3,565.249705 / 1,289.444600 / 49.537822 / 0.159399 CPU-s.
B2's renderer total is 394.179555 CPU-s lower and Browser total 243.427223 lower; these process
deltas do not establish exclusive parser or native-storage attribution. Both still perform the
post-ready validation tail. C2's progressive route must stay separate from C1's source-backed
node-catalog route; the third cold pair is running to examine repeatability. The metadata
watchdog/fallback cause is unresolved; no scheduler or validity guard is changed for this experiment.

## Third cold repetition and later warm seed (C3, A→B)

A3 completes the same metadata-timeout/progressive route: graph readiness at 25:32.014 /
3,689.771523 CPU-s, closure at 30:43.016 /4,234.988693 CPU-s, then 10:03.883 quiet with stable
work counters. The 5:11.002 tail uses 545.217170 CPU-s and adds 11,822 checks/neutral body reuses,
no new body I/O, repairs or masks, and no additional observed same-revision revisits. Tail hashes
again increase 177,976 /234,282,327 UTF-16 units; repository-method transactions increase 205,047
(169,580 RO /35,467 RW). Full CPU is 4,346.496004: Browser 3,354.136327, renderer 947.481425,
GPU 44.763523, Utility 0.114729. One CLI poll times out while the native sampler continues; native
coverage is valid/foreground with maximum 2,309.3 ms gap and no births/exits. Cleanup verifies off/[]
and controller removal. Source failures 53 are 38 cancellations and 15 activated-not-live outcomes;
there are no masks or repository read failures. Final semantic diagnostics confirm one full build,
two actual inventories, one snapshot save and no node catalog. B3 completes the same route, below.

A3 uses 11.601% less CPU to closure than the same A build in C2, despite nearly identical
observed work: 23,727 versus 23,712 shared parser calls and 440,956 versus 441,205 repository
transactions. Both have valid foreground/CPU coverage. This same-build variation is material;
C2's single paired reduction cannot be treated as a stable causal estimate. Native/OS cache,
memory, power, scheduling and rendering history remain uncontrolled; this observation does not identify
which of them caused the difference.

The already-required stopped-owner checkpoint after A3 becomes the later warm common seed.
It is a naturally completed **full snapshot**, preserved without stripping stores: schema 10,
15 stores,1,537,617 rows /1,741,567,690 bytes. It contains 110,470 pages,498 snapshot chunks,
11,839 source heads/bodies/URL owners and zero pending local dependency repairs. All native
store/key/value digests, a second consistent scan, decoded transport verification and the
pre-reset independent stream SHA check pass. SHA-256:
`5dd1a481541c1182f1c31a3439399485abad898bf72be174f4e7cd92c9b1330f`.
All twelve later warm/profile/resource/navigation arm restores point to this identical seed.
This later full-snapshot/current-host cohort stays separate from the original source-only seed
and earlier warm observations. Later warm outcomes and three-pair summaries remain pending.

### B3 completion and cold-pair summary

B3 reaches readiness at 27:35.010 /4,292.837130 CPU-s and closure at 32:37.013 /
4,862.507861 CPU-s, then completes 10:02.291 quiet with stable work counters. Its 5:02.603 tail
uses 569.670731 CPU-s and again adds 11,822 neutral checks/reuses with no new reads/parses,
repairs, refreshes, failures or masks. Tail hashes match the other progressive arms exactly;
repository transactions are 189,884 (154,417 RO /35,467 RW). Final checked/reused/legacy counts
are 34,662 /22,763 /10,981, with 1 read/parse,11,839 repairs and 33 source failure outcomes
(13 cancellations /20 activated-not-live). There are no repository read failures or masks.
Two CLI polls time out while native sampling continues; maximum native gap is 2,598.8 ms,
with valid foreground/CPU coverage and no process births/exits. Cleanup passes off/[]/removed.
Full CPU is 4,981.281661: Browser 3,557.888273, renderer 1,373.868417, GPU 49.353271,
Utility 0.171700. Semantic diagnostics confirm the same one progressive build/two inventories/
one snapshot save/no node catalog, despite zero simple full-build counters.

| Cold pair / order | Route | A CPU to closure | B CPU to closure | B−A CPU | B−A elapsed |
| --- | --- | ---: | ---: | ---: | ---: |
| C1 A→B | Source-backed node catalog | 2,800.613663 | 2,770.907259 | −1.061% | −48.002 s |
| C2 B→A | Progressive full build | 4,790.776351 | 4,150.397751 | −13.367% | −150.001 s |
| C3 A→B | Progressive full build | 4,234.988693 | 4,862.507861 | +14.817% | +113.997 s |

All six arms complete quiet and cleanup with valid native timing. **Power qualification is
unresolved for C3:** a21:27 UTC untimed check finds battery power at 60%, discharging, after the
last independently recorded AC reading at 19:23 UTC. Continuous power coverage was not collected.
The maintainer is asked when it disconnected and to reconnect before further timing. Until that
is resolved, C3's percentage is arithmetic observation, not a matched-power acceptance result.
Across all three empty-store
pairs, descriptive CPU medians are A4,234.988693 (range 2,800.613663–4,790.776351) and
B4,150.397751 (2,770.907259–4,862.507861); the median within-pair percentage is−1.061%.
The ratio of these mixed-route medians is−1.997%, not a causal pooled estimate. Keeping only
the two progressive pairs gives medians A4,512.882522 /B4,506.452806 (−0.142% ratio),
with opposing paired changes−13.367% /+14.817% (median+0.725%). Two samples per arm
are insufficient for a stable progressive-route effect. The parser-call reduction is repeatable;
a large end-to-end CPU reduction is not demonstrated. Browser and renderer both vary materially.
The four later arms reproduce ready-to-closure work without masks; the original full-snapshot
unsaved case remains separately represented by S2 and its diagnostic runs.

## Warm checkpoint and first warm pair

After disabling A, all 15 test K-Plex stores were exported under one consistent read transaction
and independently scanned again for every store/key/value count and digest. Format 2 hashes
typed structured values; V8 encoding is transport only because equivalent native clones can
have different V8 byte encodings. The private 1,023,954,073-byte stream contains 1,426,595
records. Its database schema is version 10. Full graph `pages`, `evidence` and `snapshotChunks`
stores are empty: this seed tests **source-backed warm reload**, not restoration of the original
production graph snapshot.

Dominant stores: source-local dependencies 745,330 rows, dependency keys 260,306, postings
325,997, chunks 47,602; bodies, source heads, dependency owners and URL owners each 11,839;
metadata 4. The export size is an encoded test receipt, not the database's physical disk footprint.
Warm A/B must each restore this same seed, schema and independently verified value digests.
Natural reloads without this restore are aging observations and cannot substitute for that pair.

The first full A import verified decoded transport before clearing, restored all stores in one
atomic transaction, then independently scanned every store. It took about nine minutes, exceeding
the external five-minute wait. The original failed receipt remains; `resume-restore` observed only
the same native job to terminal completion and verified all 1,426,595 returned records against the
seed. The plugin stayed off throughout. Peak requests were 64, peak encoded in-flight payload
1,983,352 bytes, largest encoded row 398,923 bytes. These are transport bounds, not total native
transaction/heap memory. Later restores first scan every current store: exact matching stores can
be retained, changed stores are atomically reset, and the final complete schema/count/value digest
must still equal the seed. This changes fixture setup only. Native storage/heap/compaction history
is not made physically identical by a matching logical checkpoint.

The first large export's CLI poll timed out while the native job continued. The failed transport
receipt is retained; subsequent native state proved successful terminal completion, all store
counts/digests matched its sidecar, and an external streaming SHA-256 matched the full file.
It was recovered explicitly rather than restarted or called a successful CLI run. A reset guard
also safely refused a receipt whose database name was incorrectly compared to a vault label;
the guard was corrected and regression-tested before exact test-only reset succeeded.

| Outcome | Warm A1 | Warm B1 |
| --- | ---: | ---: |
| Primary timing / quiet | Complete / complete | Complete / complete |
| CPU to readiness / closure, CPU-s | 582.759142 | 669.656625 |
| Elapsed to readiness / closure | 7:11.016 | 7:23.015 |
| Observed quiet interval | 10:01.712 | 10:04.683 |
| Full CPU including quiet, CPU-s | 612.686473 | 690.650234 |
| Parser calls / source reads / source repairs | 0 / 0 / 0 | 0 / 0 / 0 |
| Hash calls / UTF-16 units | 202,887 / 194,036,391 | 202,887 / 194,036,391 |
| Repository transactions; RO / RW | 202,671; 178,904 / 23,767 | 202,671; 178,904 / 23,767 |
| Final nodes / unsaved owners | 110,435 / 0 | 110,435 / 0 |

Both runs restored the exact logical A seed, attached before admission and retained complete,
foreground one-second CPU samples, with no process births/exits during either timed run. B1
used **14.9114% more CPU** to closure and took 11.999 seconds longer. Work counts are identical,
including 20 source checks, 21 body requests, no body-dirty requests, two reconcile calls and no
full build. URL ownership restored all 11,839 entries without reads. Native full-store import for A1
versus changed-store restoration for B1, the process-roster change and accumulated native/heap
history limit causal interpretation; alternating repetitions remain necessary.

Full-run Browser / renderer CPU was 430.387020 / 168.061716 CPU-s for A1 and
417.988447 / 258.037761 for B1. The increase is concentrated in the renderer, while the Browser
uses less CPU. Renderer heap at closure differs substantially (approximately 2.24 GB versus
0.66 GB); these are sampled heap values, not retained plugin memory or proof of a leak/GC cause.

The quiet interval includes a short post-closure CPU burst with unchanged indexing counters.
At closure +30 seconds, cumulative additional CPU is 18.737083 / 12.084176 CPU-s for A1/B1;
at +60 seconds, 19.341252 / 12.542215; at the first sample at/after +600 seconds,
29.912163 / 20.950607. Observable owner closure therefore does not mean zero subsequent host work.

The separate post-timing navigation oracle succeeded for the saved center and another Markdown
note, then hit its 30-second tag timeout in both arms. A folder was **not selected** by that first
oracle; folder coverage cannot be claimed. The whole driver correctly reports failure for this
auxiliary check while preserving the completed primary timing and quiet results. Both final
cleanup receipts show plugin absent, saved enabled list empty and owned globals removed.
The original targets/failures remain private; matched seven-kind oracle parity remains pending.

A separate two-minute, unmatched warm-B diagnostic captured Browser/renderer native stacks,
then stopped incomplete by design. Native symbol offsets and opaque JIT frames do not establish
precise JavaScript consumer attribution; no cold CPU attribution is inferred from that warm window.
The reversed warm B2 attempt stopped after an external CLI timeout around 40 seconds; its native
sampler still retained 41 valid foreground samples. Cleanup passed. It is an interrupted result,
not a successful repetition. The driver now retains polling timeouts and retries under the original
observation deadline; the native sampler remains armed. A fresh common restore precedes the retry.

Alternating repetitions, bounded semantic navigation/provenance checks, diagnostic CPU profiles,
full-snapshot application startup, companion profile and final content-integrity checks remain pending.
The original snapshot→full-rebuild→long-unsaved symptom is not reproduced by the fresh source-backed
runs. That observation does not explain or disprove the original state.

The restarted reversed B2 primary observation completed at 416,015.1 ms / 662.356302 CPU-s,
with ten quiet minutes, valid foreground CPU coverage and identical warm operation counts.
One external poll timed out; the already-armed native samples remained complete and foreground.
Its post-timing v2 oracle then failed because the CLI evaluation realm cannot import `obsidian`.
The oracle now obtains the real folder constructor from the existing native root instead; the
failed receipt remains. This post-timing harness correction does not alter B2's recorded timing.

Reversed A2 reached readiness/closure at 406,010.9 ms / 663.913765 CPU-s, again with identical
warm operation counts. **A2 is excluded from strict foreground comparisons:** it lost focus and
visibility briefly before readiness, then had a 96,781.4 ms native sampling gap and prolonged
focus loss during quiet. Its cumulative CPU is retained, but the gap prevents a continuous
ten-minute quiet claim. The superficially close A2/B2 totals are qualified observations, not a
validated paired performance percentage. Subsequent samplers reset quiet on a long
gap and reject such coverage for strict CPU eligibility; recorded older observations are not rewritten.

The bounded seven-kind v2 oracle subsequently passed on A2: saved center, Markdown, real folder,
leaf tag, URL, unresolved/virtual and attachment. Every eligible kind was found by native vault
search; virtual-node exclusion matched the established search contract. DOM detection took
137–604 ms in this observation, with zero body reads/parses. This proves those selected existing
targets' API/DOM behavior after indexing, not actual paint, physical input or all possible targets.
Per-kind relation/provenance multiset hashes and gates are retained for a matched B check.
The original first-tag timeout is still an unresolved separate case; selecting a bounded leaf tag
does not erase or resolve that failure.

## Application startup from the source-backed common seed (S1)

Both arms restored the original source-backed seed at the same path, staged their pinned build,
verified exactly one native test window and one saved open vault, quit normally, and waited for
all selected application processes to disappear. An independent Darwin `ps` recorder armed with
Obsidian absent before ordinary launch with saved K-Plex enablement and the same retained active
layout. Four new process identities appeared. The recorder includes early CPU with centisecond
precision and retains exited identities' final observed CPU; unobserved terminal fractions remain
a limitation. Native scalar observation attaches after CLI reconnect and cannot claim complete
early parser/transaction counters or foreground observations. Its epoch aligns closure to external CPU.

The primary scalar probe is identical in A/B:
`a3d01c37fc50792de9bd2ec0c745db2cd0f317a5c69e96fe8b31443d7916331a`.
The startup driver changes between arms only to correct saved-enable cleanup; storage preparation
also gains bounded decoded verification and normal foreground checks. Those changes are outside
primary timing. Subsequent diagnostic additions do not rewrite these receipts or artifact identities.

| Outcome | Startup A1 | Startup B1 |
| --- | ---: | ---: |
| Primary timing / quiet | Complete / complete | Complete / complete |
| Original whole-tool status | Failed cleanup; separately recovered | Complete |
| Closure from application launch | 34:06.058 | 34:16.437 |
| External CPU bracket at closure, CPU-s | 4,886.17–4,887.71 | 4,864.80–4,865.79 |
| CPU-bracket observation span | 1,001 ms | 1,002 ms |
| Observed quiet interval | 10:03.428 | 10:03.821 |
| Full external CPU including quiet, CPU-s | 4,912.74 | 4,909.66 |
| First observed saved-center DOM / metadata upper bound | 14,062 ms | 25,450 ms |
| Sources repaired | 11,839 | 11,839 |
| Acquisition reads / parses | 11,828 / 11,828 | 1 / 1 |
| Acquisition legacy-body reuse calls | 0 | 11,823 |
| Independent URL discovery reads | 11,819 | 11,819 |
| Full builds / complete snapshot saves | 1 / 1 | 0 / 0 |
| Final nodes / unsaved owners | 110,470 / 0 | 110,470 / 0 |
| Maximum native / external sampling gap | 1,793.1 / 1,071 ms | 1,113.5 / 1,069 ms |

Each arm records one actual source inventory and one node-catalog admission. Both external streams
have no errors; native samples have no focus/visibility/throttling changes, unsupported CPU values,
process births/exits after attachment, or large gaps. The initial DOM figures are upper bounds from
CLI polling, not actual paint or input latency. B's initial eval command was not yet available; a
later CLI poll timed out while native sampling continued without a coverage gap. Early native
observation gaps differ and remain explicit. Late forwarding counters are unavailable for early
work; their zeros must not override cumulative production lifecycle diagnostics.

B avoids A's late rebuild/save and reduces acquisition parsing, but total CPU including quiet is
only 3.08 CPU-s lower (0.0627%) in this single observation. Closure is 10.379 seconds later and its
CPU bracket is slightly lower. These descriptive values are not a causal performance guarantee or
a 50% improvement. Independent URL parsing remains present; acquisition counts alone are not the
shared parser total. The roughly equal totals make Browser/native attribution material.

| Launch horizon | A CPU-s | B CPU-s |
| --- | ---: | ---: |
| 5 minutes | 574.81 | 567.10 |
| 15 minutes | 2,168.78 | 2,142.01 |
| 30 minutes | 4,480.74 | 4,444.19 |

These are first external samples at/after each horizon, with offsets below 0.9 seconds. At A's
nearest native samples, repaired-source counts were 748 / 4,465 / 11,839 and unsaved owners were
zero. Neither readiness nor closure had been reached at these horizons. Full-run Browser /
renderer / GPU / Utility CPU was 4,240.56 / 615.22 / 56.83 / 0.13 CPU-s for A and
4,264.46 / 587.25 / 57.81 / 0.14 for B. Most CPU belongs to the Browser process; precise native
consumers cannot be inferred from renderer profiles or transaction counts alone.

A's late decision reason is
`full-rebuild:startup:post-initial-backlog|vault:create|vault:create-markdown`.
At that decision (33:17.971 after launch), external CPU is bracketed at 4,780.68–4,783.73 CPU-s;
at the complete-save decision (34:05.566), it is 4,886.17–4,887.71. Roughly 97.8% of closure CPU
had already accumulated before the late rebuild. The intervening approximately 102–107 CPU-s
includes concurrent host work, rebuilding and persistence; it is not exclusive rebuild CPU.
Eliminating only that route cannot account for a 50% reduction in this workload.

All 11,839 original seed source heads were compared with native files after each restart:
zero missing files, invalid heads or mtime/size/ctime differences; all heads complete, parser version 3.
This excludes physical-coordinate mismatch for those heads. It does not certify absence of native
create/metadata events or explain parser-input rejection. Source acquisition failures remain zero;
A's separate family-read cancellation diagnostic is not evidence of durable corruption. The 110,470
startup node count is shared by both arms and differs from the earlier source-backed cold/reload
count of 110,435. Count equality within a lane does not replace the selected semantic oracle.

During B, AC power/100% charge was independently confirmed. The queried macOS thermal/performance
interface returned unsupported errors, not a successful no-throttling observation. No power,
security, sleep, pacing or background-throttling policy was changed.

### Untimed setup, retention and cleanup receipts

A's original whole-tool receipt remains failed: runtime disable removed the instance but left a
saved enabled-set entry. Separate normal saved-disable recovery verified absent instance/empty
saved enablement, Sync/Publish off, no owned global/debugger, and exact original data/workspace bytes.
B positively validates the corrected saved-disable path: instance absent, saved list empty,
configuration restored and no cleanup errors. The original failed receipt is not rewritten.

A's completed cache is retained in a verified private 1,741,617,888-byte checkpoint with
1,537,552 rows, including 110,470 pages and 499 snapshot chunks. Both native scans, full decoded
verification and an independent streaming SHA-256 passed. Its first complete export hit the
original 32 MiB decoder bound on a 43,713,798-byte snapshot frame; no reset followed that failure.
The revised reader explicitly caps frames at 64 MiB, scans each input chunk once and yields between
verification batches outside live IDB transactions while retaining exclusive ownership. Fourteen
current tool tests pass, including accepted large rows, oversized refusal before native storage,
source-state scope and constant-time resource phase labels. Original exports/errors remain private.

The fresh checkpoint's five-minute wait and first continuation expired while the same native job
remained owned. A second continuation observed terminal success. A read-only descriptor check
confirmed decoding progress and found the maintenance window hidden/unfocused with ordinary
throttling enabled. Normal focus was restored; the retained job completed. Future storage actions
request and verify ordinary foreground without changing throttling.

B's common-seed restore also required two continuation receipts after external waits expired.
The original atomic import was never restarted. Final complete native verification matches all
1,426,595 seed records. Changed stores: metadata, pages, snapshot chunks, source chunks/heads,
three local-dependency stores, postings and URL ownership; parser bodies already matched.
Peak admitted requests were 64, peak encoded in-flight bytes 1,501,600, largest encoded row 398,923.
A's pre-start restore changed only metadata and URL ownership. Exact logical equality is verified;
physical database/compaction history is not matched. Those transport bounds are not total heap,
native transaction or disk-footprint bounds.

## Full-snapshot application startup (S2, B→A)

Both arms restored the same completed A full-snapshot checkpoint at the same test path and
retained active layout. All 1,537,552 restored records passed native readback. Peak admitted
requests were 64; a single 43,713,797-byte encoded row was admitted alone. These transport
bounds do not bound total native/heap memory or on-disk storage, and logical equality does
not make physical database history identical.

| Outcome | Startup A2 | Startup B2 |
| --- | ---: | ---: |
| Launch, UTC | 14:02:52.025 | 12:58:55.314 |
| Observation / readiness / closure | Censored at 45 min / absent / absent | Censored at 45 min / absent / absent |
| External CPU through cap, CPU-s | 4,739.69 | 4,771.13 |
| First observed unsaved owners after launch | 8:17.395 | 8:10.972 |
| Peak unsaved owners | 18 | 32 |
| Last positive unsaved sample after launch | 32:48.380 | 32:25.968 |
| Final source checks / repairs | 11,857 / 11,839 | 11,870 / 11,839 |
| Acquisition reads / parses | 11,827 / 11,827 | 32 / 32 |
| Legacy-body reuse calls | 0 | 11,792 |
| Neutral-body reuse / resolution refreshes | 18 / 18 | 31 / 31 |
| Actual inventories / full builds / snapshot saves | 3 / 1 / 1 | 3 / 1 / 1 |
| Maximum native sample gap | 2,732.4 ms | 1,357.6 ms |
| Cleanup / exact configuration restoration | Passed / passed | Passed / passed |

Both runs retained valid native foreground and external CPU coverage. Neither reached readiness
or formal closure, so there is no CPU-to-ready, CPU-to-closure or formal ten-minute quiet result.
The censored CPU totals are descriptive observations at the cap, not equivalent-completion
speedups. The final external samples are at launch +45:05.426 (A) and +45:01.013 (B);
bounded polling/final capture crosses the nominal cap by those small amounts. Recording stops
before plugin-disable/layout cleanup. Transport timeouts remain in the private receipts. The strict workflow originally stopped
before A because B was incomplete; an explicit continuation retained B's cache and performed A
under the unchanged cap. Workflow continuation did not convert either result to acceptance.

The transient but prolonged unsaved condition occurred in **both baseline and candidate**.
B remained mostly at 31 owners after its peak; A retained 18. Masks cleared naturally, coinciding
with their respective resolution-refresh/neutral-reuse counts. Final acquisition failures were zero;
independent URL discovery performed 11,819 reads in each arm. Each repository diagnostic retains
one body-URL family read failure. B's earlier last-reason scalar was `cancelled`, later `activated`;
that scalar does not establish the masks' entry reasons or durable corruption. No force flush,
mask clearing, fault injection, profile or detailed forwarding observer was used in these primary runs.

Existing cumulative lifecycle diagnostics record three inventory admissions, one full build and
one complete snapshot save in each arm. Full-snapshot hydration completed on its second attempt.
The first attempt was `publication-superseded` during pages/checkpoint: expected publication 1,
actual 22, cause `file-patch`. Subsequent cached presentation reported zero added/removed/modified
files. B then recorded `full-rebuild:startup:stale-snapshot`; A recorded
`full-rebuild:startup:stale-snapshot|vault:create|vault:create-markdown`.
The stale-snapshot route remains present in B; its reason no longer includes A's create backlog.
This differs from S1's source-backed seed and cannot be pooled with it as one startup condition.

By the later samples, unsaved owners were zero, source authority was true, and observed acquisition,
persistence, hydration, semantic and scheduler work had drained. Status nevertheless remained
`incomplete`, with `initialIndexComplete=false`, through each cap, while CPU accumulation slowed.
Durability recovered with a remaining readiness condition. This reproduces a substantial unsaved
tail on both builds, but does not reproduce the original report's ready-then-background-tail order
or establish a permanent write failure. Separate diagnostic event traces are needed to explain
mask entry, source-adoption results and the retained readiness flags.

## Separate full-snapshot diagnostics

Eighteen focused harness tests pass on Node 22.22.2. Coverage includes target/staging/storage
guards, complete-value codec/large-frame checks, explicit late-observer opt-in, original promise
identity, bounded private events, retained-state observation without invoking validity predicates,
debugger failure cleanup, pure-read timeout/deadline handling and failed-startup evidence capture.
The native K-Plex-disabled and two-minute startup smokes validate native stacks/CDP capture,
resource counters, partial-coverage labels and cleanup. Neither is an acceptance timing.

The matched diagnostic arms use the same full-snapshot seed, active layout, pinned artifacts,
45-minute cap, late forwarding observer and counts-only native resource observer. Capture begins
near native minute 10: separate five-second Browser and renderer native samples, then a five-second
renderer CDP profile. One additional aggregate-only memory/outcome query per arm follows natural
recovery after native minute 35; it reuses existing observers without note/storage I/O or new hooks.
Operation coverage is explicitly `since-late-attachment`, with `preAdmission=false`. Early startup
operation totals are unavailable. Both diagnostic runs remain censored/incomplete; neither supplies
CPU-to-readiness, CPU-to-closure or a formal quiet result.

| Diagnostic observation | A | B retry |
| --- | ---: | ---: |
| External CPU through capped window, CPU-s | 5,012.67 | 4,684.83 |
| Browser / renderer CPU-s | 4,401.27 / 557.38 | 4,098.44 / 537.77 |
| GPU / Utility CPU-s | 53.83 / 0.19 | 48.45 / 0.17 |
| Peak unsaved owners | 949 | 1,045 |
| First positive mask sample from launch | 8:18.030 | 8:18.738 |
| Last positive mask sample from launch | 33:55.031 | 31:46.736 |
| Retained / absent payloads at profile | 573 / 376 | 451 / 594 |
| Accounted retained payload bytes at profile | 16,777,064 | 16,749,968 |
| Final checks / repairs | 12,788 / 12,215 | 12,884 / 12,433 |
| Acquisition reads / parses | 11,827 / 11,827 | 1,638 / 1,638 |
| Neutral reuse / resolution refreshes | 573 / 573 | 451 / 451 |
| Legacy-body reuse calls | 376 | 10,781 |
| Native transactions; RO / RW | 383,941; 196,302 / 187,639 | 376,147; 199,392 / 176,755 |
| Native request calls | 7,613,254 | 7,615,311 |
| Repository-method transactions; RO / RW | 320,202; 194,933 / 125,269 | 311,084; 186,421 / 124,663 |
| Observed shared parser calls / UTF-16 units | 35,476 / 599,516,593 | 13,469 / 223,073,683 |
| Observed source hash calls / UTF-16 units | 399,498 / 422,846,222 | 397,206 / 422,938,292 |
| Retained events / dropped events | 128 / 2,724 | 128 / 3,013 |
| Final unsaved / retained payloads | 0 / 0 | 0 / 0 |
| Initial readiness after durability recovery | Incomplete | Incomplete |
| CPU coverage / foreground / cleanup / configuration | Valid / valid / passed / passed | Valid / valid / passed / passed |

These diagnostic peaks materially exceed the unprofiled primary peaks of 18/32. Counts-only
observation avoids payload serialization but still adds unisolated overhead. Native event ordering,
physical database/heap history and host conditions also differ. The diagnostic totals cannot replace
primary timings or supply a causal paired speedup. B observes fewer parser calls while native request
volume is almost unchanged; calls and UTF-16 units remain distinct from exclusive parser CPU and bytes.
All observed A RW transactions complete; one RO transaction aborts. B records one aborted RW
transaction and no RO aborts. Counts-only request success callbacks are not observed; per-request
failure zeros cannot certify success. Direct native operations explain the gap from repository-method
transaction counts. These are not physical disk/WAL bytes or a complete attribution of Browser CPU.

### Where the observed request volume goes

The two local-dependency stores dominate observed object-store API calls: `sourceLocalDependencies`
and `sourceLocalDependencyKeys` together account for 5,972,339 /5,973,798 calls in A/B, about 78.45%
of each observed total. Each store performs approximately 1.49 million readwrite `get` calls. The
first additionally records about 745,000 `put` and 745,000 `delete` calls; the keys store records about
1.275 million `put` and 215,000 `delete` calls. The volume remains similar despite markedly fewer
parser calls in B. This is evidence for examining dependency projection staging/activation and
repeated validation before prioritizing an unmeasured adjacency-copy hypothesis.

The observer covers native transactions and selected object-store request methods. It does not
count every index method or cursor continuation, and these call shares are **not CPU shares**.
Payload size, engine batching/compaction and wait time differ by operation. Exact exclusive CPU
and per-consumer revision overlap remain unavailable. No schema/budget/fence change is made here.

Source review connects this volume to `SourceRepository.repairLocalDependencies`: each old/new
membership reads its immutable row and selected key count, then updates that count; old rows are
also deleted. Ordinary `activate` schedules a decrement/increment journal whenever either owner
has records. The existing alias-upgrade path already preserves selected counts when authenticated
record counts/digests match and retires old rows through private reclamation. A bounded follow-up
could first count exact old/new projection equality, then consider the same proof for ordinary
reauthorization. That is a proposed reuse of an existing boundary, not an implemented optimization
or a measured equality rate. It must retain head/sequence/current-owner, unsaved/deletion,
crash-resume and multiplicity guarantees; 78.45% of requests is not a forecast of CPU savings.

### Mask entry, recovery and readiness

A records 949 unique additions through `rememberMemory`,949 removals through `forgetMemory` and
949 unsaved write/replace outcomes labelled `storage-unavailable`. B records 1,045 unique additions,
one repeated addition and 1,045 removals. Its retained sequence begins with `write-error`, followed
by `storage-unavailable`; write/replace outcomes contain 1,046 unsaved results (one `write-error`,
1,045 `storage-unavailable`). The repeated addition explains why results exceed unique masks.
These are protocol outcomes, not proof of physical media failure, quota exhaustion or corruption.
The existing shared cache owner retires failed handles and uses bounded open/backoff. The trace
does not distinguish native request error, transaction timeout, open timeout or cancellation/error
attribution as the original trigger. Source acquisition failure counters stay zero despite these
storage fallback outcomes; zero acquisition failures must not be read as zero storage errors.

At profile time retained expectations are all `unavailable`, with no active source lane or pending
deletion. The repository's16 MiB retained-byte budget is near its cap; this accounting is **not measured
heap/RSS**. Some masked owners have no retained payload. Retry failures advance while masks remain,
but the diagnostic never calls stored `current()` predicates to speculate about their acceptance.
Source-confirmed bounded retention permits payload eviction while conservatively keeping masks.
Normal later work recovers all masks. A's949 revisits split into 573 neutral refreshes and 376 additional
legacy-body repairs. B's1,045 revisits split into 451 neutral refreshes and 594 additional repairs;
its reads/parses rise by 593 during recovery. No masks are cleared by the harness, and no force flush,
priority hold, fault injection, pacing change or deadline increase is used.

The supplemental readings occur at native 37:38.951 (A) and 35:28.901 (B), after recovery. Both show
zero dirty/body-dirty/resolution-dirty source states, zero masks/retained bytes/pending deletion,
no retry timer/task/failures, `initial=false`, `initialSourceIncomplete=true`, `dirty=false`, and false
semantic/search-pending/local-count-unavailable flags. Each observed one `adoptStartupSources`
returning false, two false and two true reconcile outcomes, and no later adoption attempt. Final
source authority is true and all observed work owners are drained. Source-confirmed coordinator
behavior assigns initial completeness from adoption's boolean; later durable recovery does not
itself set that flag. This narrows the readiness investigation to adoption/resumption coordination
without proving which adoption precondition failed or authorizing a fence-relaxing fix.

The first 128 fixed-label events are preserved; later events overflow explicitly. Aggregate outcome
and mask counters continue after history fills. Event-by-event causal ordering after overflow is
unavailable. Neither these runs nor the primary pair establishes the original report's exact
ready-then-hot-tail order or reproduces the original aged production runtime state.

### CPU attribution and interrupted diagnostic

Native Browser/renderer samples return success in both completed diagnostic arms. A's CDP profile
has 3,972 samples (3,535 idle-labelled); B has 3,318 (2,846 idle-labelled). These are sequential windows,
not simultaneous CPU accounting. Browser worker stacks include native `pread` while its main thread
is mostly waiting. Stripped Electron symbol offsets cannot identify an exact storage consumer.
Together with primary Browser CPU dominance and millions of native requests, this supports
investigating source persistence/validation/native storage work. It does not attribute all Browser
CPU to IndexedDB or treat an idle renderer profile as a whole-application explanation.

The first B diagnostic fails at its pre-profile flag query after a CLI timeout; no profiler starts.
The retained scalar progress reports 603 samples through native 10.04 min,32 masks,33 acquisition
reads/parses and one repository read failure. The old failure path did not save the full native
sample history before removing the probe; that evidence gap cannot be reconstructed from its
aggregate count. External CPU and partial reports remain private. Exact configuration restoration
and disabled-instance/empty saved enablement pass. The original failed receipt remains unchanged.

The driver then gains at most two attempts for pure flag reads under the original deadline,
without retrying functional errors or profiler ownership/start operations. It also attempts full
probe capture before failed-run cleanup. Those error paths pass focused unit checks. B's fresh
retry validates normal native capture with the correction; no flag-query timeout occurs in that
successful retry. Native observer/resource wrappers are identical across A/B; the startup driver's
error handling differs and is recorded by its manifest hash. No runtime optimization is introduced.

## Host context and remaining observations

A later concurrent comparison finds conflicting `pmset -g batt` output: default execution says
AC Power while the same command in the native-runner execution context says Battery Power;
both report 57% and discharging. The cause is unresolved. Default-context AC readings and the
three-sample default power smoke cannot certify the native runner's power condition. The new
external observer uses the same execution context as the native pipeline, samples every 15 seconds,
retains gaps/errors and query overhead, and refuses activation without AC. A replacement C4 attempt
completes only its guarded reset, then correctly refuses before plugin activation; no C4 timing is
created. Subsequent cleanup verifies K-Plex off, saved enablement empty and controller removed.
The test database is currently absent/empty, with verified complete A/B checkpoints retained.
The five pure power-observer tests pass; the default-context smoke remains a query/cadence check,
not a successful native-runner AC qualification. Further timing is pending reliable native-context AC
or an explicit revised condition from the maintainer.

At 21:27 UTC, before any later warm activation, the Mac reports **Battery Power,60%, discharging**,
with 3,206.44 MiB swap used /4,096 MiB allocated and about 15.31 GiB disk available. The latest default-context AC/charging snapshot was 19:23 UTC; that execution context
is subsequently shown to disagree with native power observations. This does not establish when the transition occurred or
that it caused the CPU variation. New timing is held pending restored AC and clarification of
which cold arms may have crossed the transition. Existing CPU/sample validity is separate from
power comparability; no battery run is silently labelled AC.

An untimed restore-context snapshot at 16:57-16:58 UTC records AC power,44% charge and charging,
a20 W connected adapter, Low Power Mode off for AC and battery, about 2,193.69 MiB swap in use,
and about 13.2 GiB available disk. VM compression is substantial during that restore. Earlier AC
snapshots reported 100% charge. These are context snapshots, not continuous primary-run power,
thermal or memory-pressure measurements, and do not establish a cause for storage failure or an
A/B delta. Host policies remain unchanged. Verified lossless compression of unused completed
checkpoints subsequently increases available disk to about 18 GiB, outside measurement windows;
active common seeds remain directly available. A read-only context snapshot at 19:23 UTC shows
AC power, 77% charge and charging, with about 15 GiB disk available. This is a default-context
snapshot, subject to the execution-context qualification above. Private retention and interim integrity
are completed below; end-of-study integrity remains pending. No raw profiles, rows, credentials or private target identities enter Git.

The observer-off A control ends incomplete by its declared 180-second horizon, with 301.144082
CPU-s, valid foreground coverage and successful cleanup. It performs 59 source checks,60 neutral
body reuses and 39 resolution refreshes, with no acquisition reads/parses/repairs or masks. The
first warm pair had 20 checks/21 reuses/zero resolution refreshes. B's observer-off control ends
at 180.009 seconds /295.045027 CPU-s with the same 59/60/39 counts, no body I/O or masks, valid
foreground/CPU coverage and successful cleanup. These are fixed-horizon diagnostics, not completed
warm comparisons or a measured forwarding-overhead subtraction. The later host-resolution state
must not be silently pooled with the original warm observation; the same restored physical files
and raw seed do not imply unchanged host metadata.

C2/C3 are now complete, with C3 power-qualified. A replacement C4 is prepared but has not
activated: only its guarded reset completed before the power refusal. After reliable AC, resume
that cold continuation if still needed, then warm pairs 3/4/5, separate warm profiles/resources,
active navigation and the final ten-minute disabled host control. The already-verified A3 full
checkpoint is the currently configured common warm seed (schema 10,15 stores,1,537,617 rows,
SHA`5dd1a481541c1182f1c31a3439399485abad898bf72be174f4e7cd92c9b1330f`). A healthy
completed A4 may replace it only before any later warm activation, with all natural stores preserved.
Three matched pairs are still required for the later-host warm summary. Original qualified or
interrupted observations remain separate.

Warm pair 4's post-timing oracle uses the same eight targets in both arms: seven bounded kinds plus
the original timed-out tag. Private comparison confirms original A1/B1 tags are identical and differ
from the bounded leaf. Its retest remains pending; original failures remain. Exact per-consumer
revision/family overlap, exclusive native CPU and adjacency/evidence traversal counts remain
unmeasured; generic family deliveries or inclusive method durations cannot substitute for them.
No new indexing optimization is part of this branch.

## Retained primary horizons and sampled memory

CPU values use the first retained sample at or after each horizon, without interpolation. Startup
horizons use launch-relative external process CPU; other rows use native pre-enable elapsed time.
A dash means the horizon was not reached. These include any quiet work present at that horizon;
they are not exclusive indexing CPU. Earlier foreground, cleanup, oracle and power qualifications
remain applicable, especially excluded warm A2 and unresolved C3 power.

| Retained observation | CPU at 5 / 15 / 30 min, s | Max observed renderer heap / RSS, MiB |
| --- | ---: | ---: |
| cold-A-1 | 558.702 / 2045.544 / 2806.878 | 1913.3 / 1843.0 |
| cold-B-1 | 595.884 / 2049.214 / 2778.631 | 2211.9 / 2357.2 |
| cold-A-2 | 678.786 / 2318.162 / 4572.185 | 2569.9 / 2479.9 |
| cold-B-2 | 684.214 / 2223.840 / 4140.902 | 2589.7 / 2653.5 |
| cold-A-3 | 683.383 / 2220.461 / 4178.432 | 2610.4 / 2691.0 |
| cold-B-3 | 674.054 / 2324.919 / 4635.208 | 1820.8 / 2118.5 |
| warm-A-1 | 389.540 / 610.065 / — | 2137.5 / 1755.1 |
| warm-B-1 | 418.467 / 688.413 / — | 829.2 / 1285.6 |
| warm-A-2-continued | 479.108 / 677.966 / — | 903.1 / 1411.1 |
| warm-B-2-retry 1 | 460.383 / 691.666 / — | 869.7 / 1320.5 |
| startup-A-matched-1 | 574.810 / 2168.780 / 4480.740 | 2449.5 / 2962.3 |
| startup-B-matched-1 | 567.100 / 2142.010 / 4444.190 | 2351.2 / 2373.4 |
| startup-snapshot-A-1 | 507.970 / 2022.020 / 4259.830 | 2725.7 / 2647.6 |
| startup-snapshot-B-1 | 513.030 / 2039.810 / 4325.800 | 2467.3 / 2971.7 |

Heap is the sampled renderer V8 isolate, excluding other worker heaps. RSS is process residency,
not total device memory; macOS compression/swap and shared/native allocations complicate a direct
heap/RSS comparison. Startup memory is observed only after CLI attachment and can miss early peaks.
These maxima do not prove retained memory or a leak. Raw per-sample data and process identities
remain private.


## Validation and power-pause return

At 22:37 UTC, Obsidian's Electron power monitor independently reports battery, an idle but unlocked
session and nominal thermal state. The single test window is visible and focused. K-Plex is unloaded,
saved enablement is empty, Sync/Publish are disabled, both study controllers are absent, and the
native debugger and DevTools are closed. No measurement or keep-awake child remains running.
Strict future runs now require app-observed AC/unlocked state before activation and record native
power, lock and thermal facts with every sample. Power changes, battery under the AC condition,
locks or unsupported required facts qualify the result. This observer change occurred between
completed cold and future cohorts; per-run hashes retain the historical versions. The current probe
SHA is `804f06a0c9c3fdd06dc2a725c5795e8575891a313d73788d627f7906c560b3be`.
A separate 60-second plugin-disabled diagnostic explicitly permits battery:61 samples, zero locks,
nominal thermal state, maximum gap 1,014.6 ms and 0.979066 CPU-s. It validates observation/cleanup;
it does not replace the AC condition or final ten-minute host control.

The 22 focused study tests pass on Node 22.22.2. The root real production build and official Obsidian
lint pass; both pinned A/B production builds pass. These results validate the harness and compiled
artifacts, not the unperformed remaining study lanes. No runtime source or algorithm is changed.

An interim read-only comparison at 22:36 UTC hashes all 20,190 copied non-configuration files /
10,956,614,603 bytes with zero additions, removals or content changes. The protected production
configuration's223 files /84,002,510 bytes are also byte-identical to their starting manifest. No full
original-content before-manifest was acquired, so that comparison is limited to configuration.
The copy's K-Plex settings and property types retain their original bytes. This is a power-pause
integrity check; repeat final verification after the remaining runs.

The private durable snapshot contains 834 verified files /1,789,978,510 stored bytes outside Temp,
Git and vaults. Active working seeds and pinned worktrees remain intact. Retained checkpoint
compression verifies decompressed SHA-256 as well as compressed-file hashes. Two incomplete
Small-vault exports lack native metadata; their bytes are retained and explicitly ineligible as
validated restore seeds. HANDOFF is excluded from the archive. Supplemental pause receipts and
updated delivery sources are retained separately after this snapshot. At that pause, nothing was committed or pushed and #203 remained draft. The next action then
required reliable native-context AC and a fresh continuation log directory. The contemporary forecast
was roughly 5–6 hours after that prerequisite,
subject to the existing 45-minute per-run cap and ten-minute quiet requirement.


## Resumption after power pause

At 2026-10-23 04:13 UTC (06:13 Budapest), the maintainer reports power connected and cannot identify
the disconnect time. Both native-runner pmset and Obsidian Electron now confirm AC. C3 retains its
power qualification. Exact test identity/isolation and database absence pass a fresh guarded inspect.
The replacement C4 resumes B→A under a fresh plan/log name, without repeating the completed reset
or overwriting its refusal receipt. The driver restores the initially hidden window to foreground
before activation; early samples show no hidden/unfocused/battery/locked intervals. No runtime
revision, observer hook or scheduling policy changes during this pair.


### Replacement C4, first arm B

B4 completes with actual/native-external AC coverage throughout:2,051 native samples and 138
external power observations, maximum gaps 1,104.1 ms/15.39 s. No battery, lock, focus, identity or
process-roster qualification occurs. Readiness and observable closure coincide at 24:07.013 /
3,170.257188 CPU-s. The observed quiet interval is 10:03.344, ending at 34:10.012 /
3,264.594752 CPU-s. The additional 94.337564 CPU-s during quiet is retained, despite unchanged
K-Plex work counters; observable owner closure does not certify immediate native CPU idleness.
Final process CPU: Browser 2,618.831770, copy renderer 607.186848, GPU 38.475048, Utility 0.101086.

Final semantic diagnostics confirm zero full builds, one inventory, one source-backed node catalog
and zero complete-snapshot/checkpoint saves. Both observed initial source adoptions return true.
This is the source-vocabulary route, rather than C2/C3's metadata-watchdog/progressive route.
The graph has 110,470 nodes. Source checks/reuses are 23,664/11,825, legacy reuse 11,819,
acquisition reads/parses 1/1, repairs 11,839 and failures 0. Shared parser calls/UTF-16 units are
11,839/199,867,318; repository-method transactions 481,890(348,799 RO/133,091 RW), hashes
512,522/584,939,365 UTF-16 units. Masks, repository read failures and late source work are zero.
K-Plex unload and empty saved enablement pass. At the completion of this first arm, A4 and the paired percentage were pending. The completed
paired result follows below; this arm alone established no comparative CPU effect.


### Completed replacement C4: A and paired interpretation

A4 also completes native quiet and normal cleanup. The observed route differs from B4: metadata
hydration times out after the 90-second watchdog, admitting
`cold-progressive:startup:no-snapshot|startup:partial-restore-incomplete`. Semantic full builds 1,
inventories 2, catalogs 0 and complete-snapshot saves 1. The low forwarding full-build counter and
`sessionWork.fullBuildStarts` are both 0 because they omit this progressive entry; those zeros must
not replace the explicit semantic build/decision evidence. Both arms finish with 110,470 nodes.

| C4 measure | A4 baseline | B4 candidate |
| --- | ---: | ---: |
| Graph readiness | 26:01.043 | 24:07.013 |
| CPU through readiness | 4,090.793143 s | 3,170.257188 s |
| Observable source closure | 31:02.011 | 24:07.013 |
| CPU through closure | 4,677.012575 s | 3,170.257188 s |
| Observed quiet interval | 10:01.238 | 10:03.344 |
| Full observed elapsed | 41:03.010 | 34:10.012 |
| Full CPU including quiet | 4,831.541796 s | 3,264.594752 s |
| CPU after closure through quiet | 154.529221 s | 94.337564 s |
| Shared parser calls /UTF-16 units | 23,719 /402,411,623 | 11,839 /199,867,318 |
| Source acquisition reads /parses | 10,988 /10,988 | 1 /1 |
| Source checks /neutral body reuses | 34,669 /22,750 | 23,664 /11,825 |
| Source repairs | 11,839 | 11,839 |
| Repository-method transactions | 441,223 | 481,890 |
| Hash calls /UTF-16 units | 512,836 /571,540,561 | 512,522 /584,939,365 |
| Masks /repository read failures | 0 /0 | 0 /0 |

B4 closure CPU is 32.2162% lower, readiness CPU 22.5026% lower, and full CPU including quiet 32.4316%
lower. Closure wall time is 6:54.998 shorter. These are the actual pair's end-to-end observations;
the asymmetric route and historical variation preclude calling this a stable isolated parser effect.
The result does not establish performance acceptance for newer runtime fa08e60/C39.

A4's ready→closure tail is 5:00.968 /586.219432 CPU-s. It adds 11,823 source checks, neutral body
reuses, acquisitions and repeated-owner acquisitions, with no further source I/O/parsing/repair/
resolution refresh/failure. Tail shared parser calls are 0. Repository-method transactions increase
184,292(148,822 RO/35,470 RW), hashes 177,991 /234,285,124 UTF-16 units, with no new masks.
Observed same-revision revisits add 0 during this tail, even though the whole run records 10,995;
whole-run reuse and the specific post-ready mechanism must not be conflated. At an early post-ready
sample 11,602 known events remain, source work is active and authority is false; all drain by closure.

A4's 51 source acquisition failures categorize as 32 cancellations and 19 activated-not-live outcomes,
with zero repository read failures/masks. Those are not 51 storage failures. Native sampling remains
valid/comparable: 2,460 samples, maxgap 3,964.7 ms, no invalid identities, births/exits, hidden/unfocused,
locks, battery, unsupported required facts or throttle changes. Three bounded external CLI observation
timeouts are retained. Native sampling independently meets the coverage limit; the failed CLI
observations are not represented as successful reads.
External power records 166 AC samples, maxgap 15.25 s. External observer child CPU is 1.718803 s and
query wall time 4.146 s across the run; no overhead subtraction is applied. Final A4 process CPU is
Browser 3,398.730598, renderer 1,386.327027, GPU 46.322600, Utility 0.161571 CPU-s.

The exact B4 backup, guarded reset, A4 measurement and completed A4 export all pass the serial
workflow. A4 export retains every natural store and verifies structured key/value decoding. The newly
selected common warm seed is declared in the review summary above before any later warm activation.
At this interim snapshot the warm cohort has not started. The latest forecast is roughly 4–5 hours for
remaining planned measurement/report work, conditional on actual durations and the existing 45-minute
cap per run. Pending checks are not passes; the report-only Git checkpoint does not publish harness
source or raw private evidence and does not end the active study.

## Later working-tree update — A4-seeded warm cohort

This section was collected **after** the fixed interim review commit `c99073b` and is not part of
that committed snapshot. It retains frozen A/B runtime revisions and the A4 seed declared above.
The later #201 runtime `fa08e60` is still unmeasured. Final disabled controls and end-of-study
integrity are recorded in the closing sections below.

Three warm timing pairs now complete, in A→B, B→A, A→B order. Every selected arm restores the same
complete A4 seed, uses the same native probe, observes actual AC/unlocked/visible/focused conditions,
finishes at least ten minutes after the last observed drain and unloads K-Plex with saved enablement
empty. Native CPU coverage is valid in all six selected arms. Seven bounded navigation/oracle targets
pass in each, with exact within-pair semantic hash parity. Two pairs have full functional acceptance
for their declared workloads; W4 has an additional broad-tag semantic timeout in both arms.

An original W3 A arm is retained and excluded because it records two hidden/unfocused samples.
Its bounded oracles and cleanup pass; its readiness variation precedes the later focus interruption,
so the interruption does not explain all CPU variation. That excluded arm reaches readiness at
147,013.9 ms / 243.762226 CPU-s, compared with 155,010.9 ms / 222.985295 CPU-s for its accepted
fresh retry. Exclusion follows the foreground rule, not its CPU direction. A W5 restore first attempt fails a 30-second
foreground CLI transport call before storage maintenance starts. Its preflight remains K-Plex off
and storage not busy; a fresh restore receipt succeeds. Neither failure is overwritten by its retry.

| Warm pair | Ready CPU A / B (s) | Final closure CPU A / B (s) | Full interval CPU A / B (s) | Functional qualification |
| --- | ---: | ---: | ---: | --- |
| W3 | 222.985 / 233.176 | 222.985 / 233.176 | 357.292 / 370.274 | Seven bounded targets pass |
| W4 | 195.791 / 252.684 | 329.462 / 252.684 | 339.662 / 414.735 | Seven bounded targets pass; extra broad tag times out in both |
| W5 | 223.430 / 229.266 | 223.430 / 229.266 | 388.965 / 370.380 | Seven bounded targets pass |

| Metric | A median and range (CPU-s) | B median and range (CPU-s) | Median paired B−A | B/A median ratio change |
| --- | ---: | ---: | ---: | ---: |
| Ready | 222.985 [195.791, 223.430] | 233.176 [229.266, 252.684] | +4.57% | +4.57% |
| Final observable closure | 223.430 [222.985, 329.462] | 233.176 [229.266, 252.684] | +2.61% | +4.36% |
| Full interval including quiet | 357.292 [339.662, 388.965] | 370.380 [370.274, 414.735] | +3.63% | +3.66% |

The pairwise readiness changes are +4.57%, +29.06%, +2.61%; closure changes are +4.57%, −23.30%,
+2.61%; full-interval changes are +3.63%, +22.10%, −4.78%. These are three descriptive observations,
not a confidence interval. A single percentage would obscure both variation and the metric boundary.

W4 A first becomes ready at 145,017.9 ms / 195.790838 CPU-s. At 347,021.3 ms, one sample observes
one scheduler lane active, resetting the quiet clock; final observable closure is 348,016.9 ms /
329.461630 CPU-s. Parser/hash/transaction/source counters do not advance across that pulse. It is
not the continuously active post-ready source tail seen in cold progressive runs, and does not prove
new semantic preparation. The full interval reaches 339.661971 CPU-s. W4 B is ready/drained at
153,050.7 ms / 252.683545 CPU-s, then reaches 414.734983 CPU-s including quiet. Comparing readiness,
last observable closure and full interval therefore gives different directions in this pair.

All six selected arms have identical forwarded work counts: parser calls 0, hash calls 48,173 over
41,518,128 UTF-16 units, transactions 71,872 (59,984 readonly / 11,888 readwrite), body requests 1,
source acquisitions/checks/reads/parses/repairs 0 and body reuse 1. Actual semantic full builds are 0,
the hydration route is full snapshot, nodes are 110,470 and actual restart inventory count is 1.
Forwarded inventory-start count 2 is a different boundary. Failures, repository read failures and
unsaved masks remain 0. These equal low-level counts do not establish equal native physical cost.

Index diagnostics persist inside the checkpoint. The old cold A4 build entry at `1792731131148`
appears in every restored warm diagnostic history; it is not a new warm build. Derived summaries
separate decisions before the run start from current-run decisions, and use actual semantic full-build
counters and route state. Unfiltered persisted decision strings must not be counted as fresh work.

W4's extra broad-tag checks run outside the primary timing window. A times out after 31.1 seconds
and B after 32.2 seconds, both with the center rendered and canonical source ready, but semantic
preparation still active, one pending task and 256 dependency visits. No full build starts. This is a
bounded semantic-readiness failure, not evidence that the tag is absent or its kind unsupported.
The oracle's `kind` is a report label; navigation uses the generic path. The predeclared controller
tolerates this known post-timing oracle error for continuing timing work, while the cohort summary
explicitly withholds full functional acceptance. A rendered center alone is insufficient.

## Later warm diagnostic profiles and native resources

Separate A/B profile runs restore the same A4 seed and request profiling at 90 seconds, during the
observed warm hot phase before formal readiness. Both native Browser and renderer `sample` captures
exit successfully and produce files; renderer CDP profiles retain 2,510 / 2,751 samples. Native
sampler gaps grow to 5,486.6 / 6,468.0 ms, so **both instrumented CPU captures fail coverage** and
are excluded from primary CPU comparisons. Foreground/power conditions and cleanup pass.

The nominal five-second renderer profiles span 10.422 / 10.741 seconds of recorded sample deltas,
with substantial unattributed program gaps. Program/GC/idle wall-weighted fractions are respectively
58.8%/20.9%/16.1% in A and 60.7%/16.2%/19.4% in B; they are not exclusive CPU shares. Sparse active
frames include `sendSync`, `transaction`, `n.onsuccess` and `reconcileRestartHostInventory`. Native
wall-thread samples contain no usable LevelDB/IndexedDB/IDB symbols; a few deserialization/GC mentions
do not permit exact native storage attribution. These traces are qualitative supporting evidence.

Separate resource runs are deliberately capped near eight minutes and finish with only about five
quiet minutes; their `incomplete` status is expected and is not ten-minute timing acceptance. Both
have valid native CPU coverage (maximum gaps 3,038.4 / 3,353.1 ms), actual AC/foreground coverage,
zero source I/O/parsing/checks/repairs/masks/read failures, complete-snapshot hydration and clean unload.

The detailed phase table reaches its 256-bucket limit in both arms. Its `other` bucket merges
206,225 / 205,554 later method/request/transaction events, preventing their classification by native
operation. The following are **explicitly classified lower bounds**, not total native activity:

| Classified native resource boundary (lower bounds) | A | B |
| --- | ---: | ---: |
| Readonly transactions, all complete | 60,260 | 60,493 |
| Readwrite transactions, all complete | 23,686 | 23,686 |
| Readonly `get` calls | 143,431 | 143,588 |
| Readonly `getAll` calls | 11,959 | 11,959 |
| Readonly `openCursor` / `getAllKeys` | 189 / 98 | 189 / 98 |
| Readwrite `get` / `add` / `delete` | 11,844 / 11,840 / 11,840 | 11,844 / 11,840 / 11,840 |
| Readwrite `put` / `count` | 4 / 2 | 4 / 2 |

Observed native failures are zero; no transaction remains active/pending at the final snapshot, and
peak concurrent transactions are 36 in both arms. Classified ObjectStore calls are at least 191,207 /
191,364, with additional unclassified activity. The table cannot establish equality of total native
operation volumes. Phase-bucket labels describe the most recent scalar observation, not an exclusive
initiating call stack. ObjectStore instrumentation also does not cover every possible native
index/cursor continuation or measure CPU/physical disk I/O. This cap is a qualification of the later
detailed warm captures; the earlier counts-only startup diagnostics use 253 buckets and no `other`
events, so their reported 78.45% classified call share does not have this particular overflow.

The separate bounded reader/lease counters remain complete: **11,886 readers start/release, and
11,886 committed leases create/retire in each arm**, with zero unknown retirements, tracking overflow,
live leases or aborted creation/retirement. Peak live readers/leases are 1, decode peak is 246,537
bytes and every resource drain flag is true. Reader-wait union is 17.219 / 14.243 seconds; committed
lease-lifetime sums are 12.214 / 10.120 seconds. These are inclusive, overlapping elapsed-time
boundaries, not exclusive CPU or disk time. Detailed observation adds unisolated overhead.

Pinned A `SourceRepository.ts` lines 974–1064 connect the `meta.add` / `meta.delete` pattern to persistent
family read leases: pinning with `leaseFamilies=true` reads the source head and adds a lease in a
source-head/meta write transaction; releasing uses the original connection to delete it. A head-only
pin is readonly, but legacy primary-grammar candidates may repin to authenticate the body-URL family.
The classified 11,840 additions/removals are a lower bound; the independent complete counter records
11,886 committed creations/retirements in each revision. The classified native readwrite count alone
already exceeds the forwarded count because release operations can use the original connection,
outside that forwarding boundary.

These leases protect immutable-family readers against reclamation and preserve revision/CAS safety;
they are not established redundant writes. A future proposal should first prove safe scope reuse or
batching while preserving deletion, unsaved-source and current-owner guards. No lease removal,
algorithm change or exclusive per-consumer CPU attribution is performed in this study.

## Later active navigation diagnostic

Both arms restore the same A4 checkpoint. Before either activation, the workload is fixed to start
at 90 seconds, with the original broad tag first, then the seven bounded targets. This uses the existing
navigation driver and a three-minute diagnostic cap, with no runtime/probe change. Its purpose is to
observe navigation away from the broad tag while restart reconciliation is active; it cannot force
the same semantic-preparation state seen in W4's post-timing oracle.

All eight centers are available and rendered in both arms. Search results match all expectations,
including the virtual target's expected absence from search. Every target starts before formal ready
with one active source lane, adds no source reads/parses and finishes with semantic-active false.
The broad tag exposes 4,136 child gates in both arms. Its observed navigation-to-DOM interval is
508.2 / 475.3 ms; bounded targets range 190.6–238.3 ms in A and 135.1–185.1 ms in B. These few
programmatic intervals establish neither actual paint nor physical interaction latency, and no
speedup claim is made from this single instrumented pair. The workload does not reproduce W4's
still-pending broad-tag semantic task; that failure remains unresolved.

A ends as deliberately `incomplete` at the three-minute diagnostic cap, with clean unload. B captures
the complete workload with valid native CPU/foreground/power coverage, and its ordinary cleanup
records unloaded K-Plex and empty enablement. A redundant final-cleanup CLI call then times out,
leaving B's overall receipt `failed`; the parent correctly stops before controls. The failed receipt
and failed playlist are retained. A fresh standalone cleanup succeeds and independently confirms
off/empty enablement, and the copied settings match the diagnostic's saved original bytes. This
recovery permits the already-declared disabled controls; it does not turn the original B receipt into
a passed run. Maximum native sample gaps during navigation are 3,410.0 / 2,485.5 ms.

At that group boundary, only the private controller's disabled-control duration validation changes:
an OFF plugin never satisfies the loaded-plugin drain predicate, so its `quietMs` is naturally zero.
The native driver already correctly terminates controls after the requested `elapsedMs`; a prior
60-second OFF diagnostic confirms this. The private controller/final-integrity gate now require
completed status, `completedQuiet`, observed elapsed duration, valid CPU/foreground/power and clean
off/empty enablement. Native probes and all A/B timing receipts remain unchanged. The boundary
correction and cleanup recovery have separate private receipts; no prior failure is relabeled.

## Disabled controls and final safety verification

The ordinary disabled control completes at 601,492.0 ms / **8.801909 CPU-s**. Browser accounts for
4.874966, the selected renderer 3.821180, GPU 0.083990 and Utility 0.021773 CPU-s. All 602 samples
show K-Plex unloaded, with no process births/exits, unsupported/regressing counters, hidden/unfocused
samples, power changes or locks. Maximum gap is 1,022.0 ms; external AC has 42 samples and a
15.035-second maximum gap. It is a valid ten-minute disabled-host control, with off/empty enablement
and controller removal verified afterward.

Next, the same A4 checkpoint is restored while K-Plex stays disabled. The guarded restore completes;
one CLI polling timeout is retained while native storage maintenance continues to verified completion.
The post-restore OFF capture completes at 601,575.8 ms / **27.992692 CPU-s**, but has **29 unfocused
samples** from 330,017.2 to 358,016.9 ms. Its full interval is therefore **not timing-comparable**.
It has no hidden samples, power/lock/throttling changes, process births/exits or CPU counter errors;
maximum gap is 1,693.8 ms and all 602 samples show K-Plex unloaded. External AC again has 42 samples,
maximum gap 15.042 seconds. Cleanup is off/empty enablement. The strict parent and original final
timing gate remain failed; their receipts are preserved.

The post-restore CPU is principally renderer-side: renderer 22.196297, Browser 5.587920, GPU 0.166211,
Utility 0.042264 CPU-s. By the observed sample at/after 30 seconds, aggregate CPU is already 18.251164
versus 0.420057 in the ordinary control; at/after 120 seconds it is 19.758624 versus 1.796610. That
early burst precedes the later focus interruption. This is evidence that non-plugin activity after
fixture restoration can contribute to a subsequent observation. It does not identify GC,
deserialization, storage compaction or any other exclusive cause, nor quantify the carryover in any
particular warm arm. The full control is still qualified. No control cost is subtracted from A/B CPU,
and no ordinary-vs-post-restore matched percentage or observer-overhead estimate is claimed.

A separately labeled safety-only continuation verifies both terminal OFF captures and cleanup before
read-only integrity hashing. It does not waive the failed timing comparison. At **2026-10-23
08:56:31 UTC / 10:56:31 Budapest**:

- All **20,190 copied nonconfiguration files / 10,956,614,603 bytes** match the starting hashes:
  no added, removed or changed files.
- All **223 protected production configuration files / 84,002,510 bytes** match starting hashes:
  no added, removed or changed files. No original full-content before-manifest was acquired, so the
  original-vault integrity audit remains configuration-scoped. The agent performed no production
  writes, plugin toggles, deployment, database operations or note operations.
- Copied K-Plex `data.json` (97,681 bytes) and property `types.json` (2,060 bytes) match their original
  hashes. Saved community enablement is empty; Sync and Publish remain disabled.
- Native verification finds K-Plex unloaded, no study/startup controller, no debugger or DevTools,
  the original layout-ready method restored and all nine checked IndexedDB prototype methods native.
  No measurement driver or study `caffeinate` child remains. The copy and evidence are retained.

The focus requirement and vault-window isolation are released after these checks. No additional timing
run, production deployment, automatic optimization or refactor is queued. The real build, official
Obsidian lint and 22 focused harness tests previously passed on Node 22.22.2; only documentation and
private orchestration/aggregation changed afterward. Documentation whitespace/content checks apply
to this review update; a full runtime verification suite is not claimed as rerun.

## Review conclusion and next investigation

The frozen candidate reduces cold source reads/parses, but these observations do not establish a
uniform whole-process CPU reduction. Cold execution routes differ, C3 has unresolved power history,
and the fresh full-snapshot warm cohort has a +4.57% median readiness CPU change with material
within-revision variation. The quiet interval remains a separate metric. Host activity after fixture
restoration, incomplete profiling coverage and capped detailed phase buckets constrain attribution.
The original production cache/session is not reproduced merely by copying notes, and the later merged
runtime is not measured. This is not performance acceptance of current main.

The most useful review priorities are:

1. **Readiness/recovery after full-snapshot startup.** Both frozen revisions can drain masks and regain
   authority yet retain an initially incomplete adoption for the 45-minute cap. Trace the one-shot
   initial adoption and subsequent retry ownership against the newer merged runtime before proposing
   a correction. The observed failure is stronger evidence than a guessed cache-corruption diagnosis.
2. **Post-ready neutral reconciliation.** The cold progressive route repeats about 11,823 neutral
   source validations and spends another five minutes after readiness, without new parsing or repair.
   Revisions change, so same-revision replay is not established. Compare the newer bounded-head
   validation implementation before designing narrowly scoped reuse or batching; preserve revision,
   owner, unsaved-source, deletion and publication guards.
3. **Warm authorization/lease work and physical host history.** Zero body parsing still coexists with
   11,886 complete lease lifetimes in each separate detailed capture. Prove safe scope reuse before
   changing reader protection. Classified native counts are lower bounds, not exclusive consumer CPU;
   adjacency/copy/compaction costs cannot be ranked above measured work from these traces. Any new
   optimization proposal needs a better bounded attribution design and exact-current-runtime evidence.

The finalized deliverable is the guarded test harness, contributor workflow and this sanitized report.
The maintainer authorized their merge into main; that merge is not acceptance of a production
performance fix. Raw profiles/checkpoints/configurations/private identities remain outside Git.
Verified final retention is at `/Users/zsviczian/kplex-private-evidence/2026-10-23-pr203-final`,
with 1,103 files / 2,063,535,924 stored bytes, exact measurement source/artifact identities and failed/
qualified receipts. Earlier partial/pause snapshots and working seeds remain intact. Future experiments
or runtime fixes need their own scoped task. No release or further production action is queued.

## Repository finalization

On 2026-10-23 the maintainer authorized committing the remaining harness/documentation, finalizing
PR203, merging the useful contribution and returning the checkout to updated `main`. The later
instruction explicitly says **not to wait for CI before merging**. Pending CI is an accepted delivery
limitation, not a passed check or performance acceptance.

The guarded harness and 22 focused tests are committed in `fe77015`. Integration commit `ca5af58`
incorporates `main@cd12a857`, preserving PR201's tests, source and ledger entries. Production source,
styles and release metadata match that main revision exactly; the PR adds test tooling and evidence.
The temporary plan marker is removed, contributor documentation explains phase-bucket overflow and
independent timing validity, and the transient HANDOFF returns to an inactive completion note.

Finalization reruns the 22 focused Mac tests successfully on Node22.22.2. The full `npm run verify`
is in progress at publication: release, architecture, core and Obsidian lint checks have passed, as
have the earlier main/browser test batches; source-storage tests are still running. Its actual terminal
outcome is recorded in the PR conversation when available. Final-head GitHub CI is not awaited under
the maintainer's instruction. No passing result is inferred from an in-progress run.

This repository integration does not rerun Mac measurements or certify the newer production runtime.
The frozen artifact identities, retained failures and all scientific qualifications above remain intact.
