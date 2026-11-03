# Investigation: ontology editing and prolonged index recovery

Investigation base: `17e39bf` (merged ontology-creation PR #228).
Branch: `2026-10-28-investigate-ontology-index-recovery`.

Status: the initial sections describe the observed baseline; the implementation and final validation checkpoint are recorded below.

The maintainer's supplied diagnostic report was generated at 2026-10-28 19:07:24 CET. Read-only CLI probes of the confirmed production vault reproduced its aggregate state. No production note, setting, plugin artifact or cache was changed by the investigation. No production rebuild, settings edit, navigation, cache reset or artificial event was requested.

## Conclusion

The captured recovery was primarily repeated **global source reconciliation**, not repeated whole-vault Markdown parsing. Ordinary file edits lost their local resolver-wave attribution after a **50 ms** deadline. A later native `metadataCache:resolved` therefore invalidated global source authority. Further delayed closes cancelled broad reconciliation; subsequent admissions continued globally because local authority was still unavailable.

The current-center compiler has foreground scheduling priority, but its contributor-discovery capability requires the global source-dependency inventory to be closed. With that authority unavailable, it returns `dependency-pending` instead of compiling a current neighborhood. Old coherent graph/scoped reads remain available, so a canvas can retain relationships compiled under a previous ontology policy while recovery runs.

These mechanisms are confirmed in source and a synthetic real-IndexedDB reproduction. The report records the same `expired-resolver`, cancellation and `dependency-pending` pattern. It does not identify which exact note/event produced each delayed close or provide an exclusive CPU profile of the incident.

## What the report establishes

| Evidence | Observation |
| --- | --- |
| Vault scale | 11,847 Markdown files; 110,513 graph nodes |
| Session source work | 13 global source inventory passes; 39,575 source checks |
| Reuse | 39,471 authenticated body reuses; 88 Vault reads and 88 parses |
| Resolver invalidations | Five recorded `expired-resolver` causes |
| Semantic preparation | 58 requests; 35 publications; 21 pending observations |
| Full graph work | Three full-build starts across the retained session, distinct from the 13 source inventory passes |
| Current state | Ready, source authority restored, no active work or pending source writes |

The last five captured global source attempts were:

| Selection reason | Outcome | Await-inclusive duration | Source checks | Vault reads |
| --- | --- | ---: | ---: | ---: |
| expired-resolver | cancelled | 581.382 s | 203 | 5 |
| expired-resolver | cancelled | 213.213 s | 117 | 3 |
| local-authority-unavailable | cancelled | 125.066 s | 34 | 2 |
| local-authority-unavailable | incomplete | 549.162 s | 11,735 | 54 |
| local-authority-unavailable | complete | 41.825 s | 129 | 0 |

Their observed start-to-final-completion span is about **25.3 minutes**; the three cancelled intervals total about **15.3 minutes**. This is a retained recovery tail, not an exclusive CPU measurement or a precise reconstruction of the maintainer's perceived 10–20 minute interval. Work counters can overlap other owners. The monotonic recorder explicitly cannot prove absence of suspend, and it recorded two long observation gaps. Do not derive absolute event times from its offsets.

Ontology changes logged between 18:38 and 18:50 CET were accepted as settings adaptation. Changes to effective role assignments require current semantic compilation; pairing-only caption changes do not invalidate semantics. Neither operation inherently requires rereading/reparsing every note. There is no justification for attributing all session full-build counts to these ontology edits.

## Exact source paths

1. `src/adapters/obsidian/sourceAcquisition.ts`: `KNOWN_RESOLVER_WAVE_RETIRE_MS = 50`; `noteResolverWaveCause()` retires the known wave, and `consumeKnownResolverWave()` labels a late close `expired-resolver`.
2. Its `start()` resolved-event handler calls `markContributorHostChange("resolution", true, ...)` when that proof is absent. This advances global revisions and clears `localDependenciesReady` and `localDependencyAuthorityReady`.
3. `reconcile()` selects global inventory when local authority is unavailable. An actual new unscoped resolver observation advances the captured scope revision and cancels the active broad pass. Later `local-authority-unavailable` passes are consequences of missing authority, not separate evidence of index corruption.
4. Broad reconciliation enumerates Markdown sources and checks physical/environment/head/dependency state. A new global host revision makes stored resolution observations stale. `loadBody()` / `readBody()` reconstruct authenticated cached parser inputs; `acquire()` validates metadata and compares freshly resolved output with the authenticated stored resolution. `SourceRepository.visitFamily()` validates frames, chunks, postings and digests. Body reuse therefore still consumes storage, decoding, hashing and resolver work.
5. `GraphIndex.ensureSemanticScope()` runs at P1, but `sourceAcquisition.localContributorDiscovery()` returns no capability unless `hasSemanticDependencies()` is true. Requested compilation returns `dependency-pending`. The code deliberately avoids waiting on P4 inventory while holding P1, which would deadlock scheduling.
6. Source closure invokes the existing readiness callback and retries demanded scopes. `GraphIndex.semanticPage()` and `semanticScopeForPath()` retain coherent predecessor reads before that replacement; those reads are not proof that the old relationships reflect the new policy.
7. `GraphIndex.usesLocalForeground()` also depends on `!fullSnapshotFresh`. The production instance retained `fullSnapshotFresh: true` while its full graph was at policy 1 and the active ontology policy was 7. Consequently the native/local foreground fallback was not selected during this warm-cache route. This is an important implementation seam for a follow-up fix, not a reason to promote stale data to authoritative.

## Why the scheduler did not solve it

`ForegroundWorkScheduler` already gives mutations P0, the current center P1, visible completion P2, and global inventory P4. Production diagnostics show P4 yielding behind higher lanes. The failure is a **prerequisite dependency**: P1 cannot obtain a valid complete contributor cover until P4 closes source authority. Raising the center's scheduler priority does not remove that prerequisite.

Exact document-pair mutations have a separate bounded contributor path that can work before global incidence closes. A successful edit therefore does not prove that the complete displayed neighborhood has been reclassified. Reuse that distinction when designing recovery; do not grant full-neighborhood completeness from a successful pair write.

The responsive policy also deliberately interleaves P3/P4 work with idle windows. The instance recorded 47,648 such windows across its session. Those counts are not exclusive CPU time: foreground admission can cancel a window, and IDB/resolver waits also contribute to elapsed intervals. Cached-data reconstruction, repeated invalidation and the global prerequisite explain the amplification; a historical CPU breakdown cannot be recovered from this report.

## Live production evidence

The confirmed production instance retained the same work counters as the supplied report during read-only probing:

- Policy revision 7; full graph policy revision 1.
- Source maintenance revision 135; full graph maintenance revision 73.
- One current prepared scope at policy 7 / maintenance 135, containing seven nodes.
- Six retained failure records with reason `dependency-pending`, policy 7 and older maintenance revisions 112, 121 or 129. No note identities were exported.
- Current source authority ready; no active scheduler lanes, source inventory, repository writes or pending known files.

This supports successful current-neighborhood recovery without a fresh full graph publication. No test build or diagnostic wrappers were needed in production.

## Other failures, kept separate

The hydration timeout began on **2026-10-27 at 21:52 CET**, before the reported editing session; it is not a new timeout caused by these ontology edits.

At **2026-10-28 19:01:17 CET**, an optional complete snapshot write failed after 8.926 seconds with generic `write-error`; the prior active generation remained available and was not marked invalid. `IndexedDbCache.writeSnapshot()` maps non-quota exceptions to that code, so the report cannot distinguish an IDB exception, producer exception or other write failure. This failure can harm the next warm startup, but does not establish the cause of the preceding repeated resolver invalidations.

The 19 source read failures (12 in metadata and one in resolution) also lack retained per-reason detail. They must not be described as 19 corrupted notes or used as proof of persistent DB corruption. No cache deletion/reset is indicated by the available evidence.

## Reproduction and verification

Run with Node 22 and installed dependencies:

```sh
node scripts/testing/ontologyRecoveryProbe.mjs
node --test --test-concurrency=1 --test-name-pattern='expired-resolver|finite native edits' tests/source-event-convergence-indexeddb.test.mjs
node --test tests/foreground-work-scheduler.test.mjs
```

The probe uses production acquisition/repository code and real Chromium IndexedDB with 32 synthetic notes. It accesses no Obsidian vault. It characterizes existing behavior; it is not an implemented fix or a large-vault benchmark.

| Synthetic event sequence | Inventory enumerations | Source checks | Local dependency checks | Outcomes |
| --- | ---: | ---: | ---: | --- |
| Known file edit, immediate resolver close | 0 | 2 | 2 | complete |
| Same edit, close delayed 75 ms | 1 | 34 | 34 | complete |
| Delayed close, then another during the sweep | 2 | 45 | 45 | cancelled, complete |

Only the changed notes required Vault reads/parses: one, one and two respectively. Creation of extra cached-source work is independent of reparsing all note bodies. Timings on this tiny fixture are not predictions for the production vault.

Actual validation on Node **22.22.3**: all three probe scenarios passed; **3/3** selected source-convergence tests and **17/17** scheduler tests passed. `node --check` and whitespace checks passed. There are no production runtime edits in this investigation.

## Recommended fix scope

1. Replace the fragile elapsed-time-only wave attribution with a stronger bounded native-causality proof, retaining conservative handling for genuinely unknown resolver/topology events. Simply increasing/removing the timeout or suppressing `resolved` is insufficient: it could hide real resolution changes.
2. Give warm-cache current-center recovery an independently authenticated finite path while broad recovery continues. Reuse the existing local/host foreground owners; review the `fullSnapshotFresh` admission rule against policy/maintenance freshness. Preserve incoming-contributor completeness, source identity, stale-write rejection and shared semantic compilation. Do not set global readiness early or present incomplete incidence as authoritative.
3. Bound repeated global work and preserve validated progress where its exact native/source fences still hold. Avoid redundant cached family reconstruction and head/dependency transactions. Validate with a genuine large fixture and separate CPU sampling from await-inclusive timing.
4. Distinguish stale-but-readable presentation from current ontology classification in the visible canvas, and retain bounded per-reason repair/write diagnostics so a later incident identifies its failed stage without logging note paths or contents.

These are coordinated behavior changes requiring targeted implementation and validation; none was silently applied to the production vault during this investigation. Highest-priority acceptance: delayed real native resolution after a Markdown edit and role/pair changes must leave the current canvas correct promptly, while genuinely unknown changes still invalidate appropriate authority. Test warm eager startup, repeated edits during recovery, current-center navigation, popout ownership and a separate physical mobile run.

## Follow-up: native file moves and disappearing folder members

The second supplied report, generated at **2026-10-28 19:49:06 CET**, adds four global source-inventory admissions. Three finished cancelled after **32.549 s**, **33.611 s** and **9.442 s** (75.602 s combined), checking 711, 656 and 381 sources respectively. The fourth remained active after **349.187 s**. Those cancelled attempts read and parsed no Markdown bodies. Two additional `expired-resolver` causes were recorded; later admissions again used `local-authority-unavailable`.

The session's full-build admission count stayed at four between the two captures. These new passes therefore show repeated source revalidation, not evidence that each file move rebuilt the entire interpreted graph. The earlier table's three full-build *starts* and the live coordinator's four full-build *admissions* are different counters and must not be conflated.

Direct folder membership belongs to **Obsidian's Vault `TFolder.children` / `parent` tree**, rather than Markdown MetadataCache or K-Plex's persistent source index. The existing folder compiler already reads only direct native members in bounded chunks, without note-body reads. The presentation lifecycle was weaker: note-source commits could retire a native folder preview, and On-demand's baseline could outrank a newer native folder cover. That allowed temporary empty/stale membership during source repair. The browser regression reproduces a destination retaining its old member list after native moves in On-demand mode.

## Implementation on this branch

- Native per-file `metadataCache:resolve` events now invalidate the exact source owner and provide a single-use receipt for their following all-files close, independent of the 50 ms generic-change guard.
- Exact native file create/delete/rename observations also provide a single-use topology receipt. Real Obsidian **1.15.0** pure moves in the disposable vault emitted `resolved` without a per-file `resolve`; this additional path is therefore necessary. Unknown folder/topology events and expired/retired folder-membership witnesses remain conservative. An additional unexplained close cannot reuse a consumed receipt.
- Warm Eager canvases acquire the center and currently materialized Markdown owners through the existing requested-body reader, at P1, then reuse `HostMetadataPreview`'s normalized collectors and canonical compiler. This read cover is independent of the global incoming-contributor catalog. It retains exact native identity/stat/event, source, host, policy and demand fences. Selected bodies stream one at a time under a 64 MiB input budget and existing compiler metadata/record/byte limits; unavailable selected input does not publish a misleading inferred replacement.
- Selected owners are captured before the first asynchronous read. Policy/source changes retry only against new observed tokens; retired demand and unobserved native replacement cannot publish old work. Newly materialized notes trigger finite additional work. A current complete canonical scope takes over normally.
- This finite cover does **not** set global readiness, replace the full graph, certify absence/completeness, or authorize writes. Full incoming-neighborhood discovery still requires its closed-world catalog, but classification/provenance among selected notes no longer waits for that catalog.
- Folder centers prefer the existing native direct-membership projection in both indexing strategies. Note metadata/source commits retain that projection; native topology refreshes replace it after private compilation. Folder relation and evidence readers select the same native owner. No whole folder tree or Markdown body inventory is needed for that presentation refresh.

No production data, settings, caches or executables were modified by implementation validation. Native changes were confined to the explicitly prepared disposable `kplex-test-small` vault, with original plugin artifacts/configuration restored.

## Implementation validation

Results below supplement the historical characterization above; the earlier statement that the investigation had no runtime edits refers to that completed investigation checkpoint.

- Focused Chromium/real-IndexedDB recovery tests: **10/10 passed** (frontmatter/inline policy changes without global closure, new materialized owners, canonical handover, demand release, policy supersession, same-stat edits, replacement identity, unavailable/guarded input, and repeated two-folder moves in both modes).
- Native controlled probe: **passed**, Obsidian **1.15.0**, Node **22.22.3**, an 80-Markdown-file disposable fixture. It opened two actual Plex views and used the production structural-drop action to move two files. Existing destination members remained present across **78** graph/presentation publications. The selected inline relationship adopted the new ontology while optional global inventory was paused, without replacing the full baseline. Fixture preparation initially collided with ordinary pending metadata work; waiting for that work before the controlled full build resolved the harness failure. Original artifacts/settings/layout were restored after both attempts.
- The native observations are functional evidence, not physical-pointer drag acceptance, actual-paint timing, exclusive CPU measurements or a reproduction at production-vault scale. Physical mobile acceptance and a production-scale CPU profile remain separate validation work.

Final checkpoint evidence:

- `npm run verify:obsidian`: stopped in its portable verification prerequisite, **1,661/1,666** tests passing. The remaining five failures are the two pre-existing workflow-preference expectations in `tests/action-host-integration.test.mjs` and three pre-existing editor-session expectations in `tests/plex-view-session.test.mjs`, previously reproduced on the untouched baseline during PR #228. Its architecture/core/scanner stages passed; it did not stage a build after the failed prerequisite.
- `npm run test:sources`: **357/357 passed**. The existing full-oracle semantic-refresh test also confirms no extra body work when canonical dependency authority is already ready; finite recovery is admitted only while that authority is pending.
- Current focused foreground/lifetime/large-native-inventory lane: **11/11 passed**, including a same-object rename during a held read. Exact physical paths and per-file observation revisions remain part of local publication and subsequent read selection.
- Combined passive coverage, source-event convergence and folder-wave lane: **60/60 passed**. The separate folder-wave process completed all 37 nested assertions successfully but remained idle afterward and was terminated; acceptance uses the combined lane's successful process exit.
- The synthetic 32-owner probe retains the unknown-close fallback: immediate/native-per-file delayed closes perform **0** inventories / **2** checks; a delayed close lacking a native receipt performs **1** inventory / **34** checks; another genuinely unscoped close during recovery produces cancelled/complete outcomes with **2** inventories / **45** checks.
- Final exact-build native probe: **passed**, including a real linked-note edit (`changed: 1`, `resolve: 1`, `resolved: 3`), **123** observed graph/presentation publications, and restoration of the original Small-vault artifacts, configuration and layout. This supersedes the earlier 78-publication checkpoint. A second harness attempt allowed an ordinary pending edit/recovery owner to close the synthetic prerequisite; waiting for its actual maintenance to finish and explicitly consuming any native receipt before the artificial unknown close made the fault injection deterministic. The final source/artifact hashes and cleanup receipt are saved in [native evidence](ontology-index-recovery-native-2026-10-28.json).

The implementation is a working-tree patch on the branch named above, based on `17e39bf`; it has not been committed, published or deployed to production. Remaining manual acceptance: repeat the original ontology and two-Plex drag workflows in the production vault with the test executable when desired; physical touch and a production-scale CPU profile are not established by these automated probes.

Final affected-browser run: **186/187 passed**. Its sole failure was the existing dense active URL-alias timer test, which observed **52.7 ms** against its unchanged **50 ms** limit while verification was concurrent. Re-running that exact test alone passed, with no source or threshold changes. Every affected check therefore passed at least once; the aggregate command is accurately retained as a timing failure rather than reported green. Final `npm run build`, `npm run lint:obsidian`, `node --check scripts/testing/ontologyRecoveryProbe.mjs`, source/native hash comparisons and `git diff --check` passed.

## Regression review corrections

The subsequent review found four implementation regressions. Five synthetic reproductions failed on the first patch; all four folder reproductions passed against the untouched `17e39bf` runtime, and the Markdown-center case passed when the competing center was released.

All four are corrected on the same working branch:

| Review finding | Correction | Permanent regression coverage |
| --- | --- | --- |
| One Markdown center borrowed another center's partial incoming cover and skipped preparation | An actively demanded center selects only its own recovery certificate. Noncentral endpoints can still borrow explicitly partial facts. | Two simultaneously demanded centers recover independently through `refreshSemanticSettings`, including an incoming owner absent from the other canvas's selected set. |
| Folder cap was applied in native enumeration order before display sorting | The native compiler retains a top candidate set across bounded windows using GraphIndex's existing sorter. Each window contains at most the cap plus one 64-member compiler chunk. | Complete-oracle comparisons for every supported sort order over 130 children in both indexing modes; opening a child folder does not distort its parent's connection ordering. |
| Limits and visibility changes left an obsolete native folder cover selected | Selection-affecting settings await a replacement native cover after the synchronous settings publication. The predecessor remains readable during preparation. Pure geometry/paint changes do not start a new cover. | Raising the cap and hiding attachments reveal the correct remaining members without a topology event or navigation; private cover selection honors caller policy cancellation. |
| A partial folder evidence store erased canonical provenance for an omitted member | Native folder evidence supplies only pairs it actually contains; omitted pairs continue through canonical evidence selection. Exact pair overlays retain first precedence. | A note outside the cap keeps its displayed parent relation and canonical `file-tree` explanation. |

Sorting remains a read-only operation over published facts. Native folder preparation captures degree counts; private candidate windows pass temporary counts to the existing sorter, and published counts are cached against the native structural revision. The renderer does not query the Vault. Initial broad source tests caught an attempted render-time host lookup; the corrected implementation passes the two source-only oracle cases and the complete 357-test source lane.

Additional checks verify that direct folder ordering works with Markdown metadata/body APIs forbidden, retains exact totals for all 130 direct members, and cancels a private cover when its caller policy changes. Native folder centers skip the duplicate semantic-recovery P1 preview and retain their dedicated sorted P2 owner.

The focused review lane passes **8/8** tests, and the host-preview lane passes **35/35**. An affected browser run passed **195/195** before the final cached-degree adjustment; the final affected run and final native/artifact receipts are recorded below when complete. No production vault data has been changed.

Final regression-fix results (Node22.22.3):

- Final affected browser lane: **197/197 passed**, including the eight review-fix regressions and both indexing modes' eight-order comparisons.
- Source lane: **357/357 passed**, including policy-only sorting with host acquisition forbidden.
- Native folder lifecycle and passive coverage: **44/44 passed** with a successful process exit.
- Host preview contracts: **35/35 passed**; the bounded top-candidate window and caller-policy cancellation tests are included in the197-test final browser lane.
- `npm run build`: passed against actual installed Obsidian typings.
- `npm run verify:obsidian`: architecture, core and scanner stages passed; its normal test prerequisite finished **1,663/1,668 passing**, with only the same two workflow-preference and three editor-session baseline failures. The wrapper stopped before deployment; its report is `/var/folders/b1/2dys0jfs7bq73whkl2qnyyym0000gn/T/kplex-obsidian-hyq4ag/report.json`.

The patch remains uncommitted on `2026-10-28-investigate-ontology-index-recovery`, based on `17e39bf`. Production remains untouched. The native controlled probe uses only the previously authorized disposable Small vault and restores its original executables, settings bytes and layout.

Final native confirmation: **passed**, Obsidian1.15.0 (installer1.14.0), Node22.22.3,94-Markdown-file disposable fixture. All four review fixes and real two-Plex moves passed, with existing destination members retained across61 observed publications. Source and artifact SHA-256 hashes match the final working tree/build; original artifacts/configuration/layout were restored. See [final native evidence](ontology-index-recovery-review-fixes-native-2026-10-28.json). These are functional assertions, not physical-pointer/touch acceptance or production-scale timing measurements.

## Second regression review corrections

The next review found four additional regressions in the uncommitted recovery patch. Their exact reproductions are now permanent browser tests in `tests/on-demand-indexing.test.mjs`:

| Finding | Correction | Regression assertion |
| --- | --- | --- |
| An unrelated source edit invalidated a stationary canvas's certificate without re-admitting its recovery | Every live center re-enters the existing P1 recovery owner after a source observation. Exact global source/policy/host/maintenance fences remain strict. | Two independent warm centers retain current-policy roles after an actual edit in one neighborhood. |
| Recovery selected bodies from all open canvases | Presentation leases explicitly associate finite paths with their owning canvas's attention, root, hierarchy and editor scopes. Per-center ownership revisions fence awaited reads. Legacy callers infer direct readable adjacency instead of a global union. | A separate canvas's failed body read or unavailable metadata cannot prevent the healthy canvas from recovering. |
| A retained native folder cover kept an obsolete sorted prefix after alias publication, and sparse children masked actual note aliases | Source commits mark demanded parent folders dirty. Drained host batches coalesce replacement sorting through the existing P2 scheduler; native membership remains readable. Sparse folder children cannot replace a canonical note's display facets. | A changed alias on an omitted member enters the alphabetical top ten after an ordinary source patch, and its alias/order survive global source unavailability. |
| Each displayed neighbor revalidated the whole recovery certificate | Actual centers retain full contributor validation; borrowed endpoints check their own captured native identity, path, stat and same-stat event in constant time. Global tokens still fence every read. | A fourfold increase in visible neighbors has linear, rather than quadratic, Vault lookup growth while retaining every current-policy role. |

The deterministic read-cost reproduction recorded 573 lookups for 40 neighbors and 2,253 for 160 neighbors, compared with the failing patch's 2,173 and 27,853. The existing On-demand control used zero lookups for both sizes. These are synchronous API-call counts, not production timings or paint measurements.

Final source checks pass **357/357**. The focused review and prior warm/folder regression selection passes **19/19**, including exact identity/stat/event retirement guards. The real repository production build passes against installed Obsidian typings. Full `npm run verify` remains subject to the five previously established workflow-preference/editor-session baseline failures; those tests and product behaviors are unchanged by this fix.

Native confirmation uses the existing `kplex-test-small` disposable vault only. It covers real two-Plex structural moves, ordinary alias edits, current ontology recovery with optional inventory paused, an unreadable body/missing metadata in a separate canvas, and stationary recovery after an unrelated native edit. Exact artifacts, settings bytes and layout are restored by the native driver. Production vault data remains untouched. Final receipt and remaining lane counts follow below.

Final second-review lane results (Node22.22.3): affected browser **227/227 passed**, source **357/357 passed**, UI lifecycle/frontier **9/9 passed**. Full `npm run verify` completed its normal test lane at **1,663/1,668 passing**, with exactly the two shortcut-default generation tests and three attention-editor switching tests already reproduced on the unchanged base. Architecture, core and scanner stages passed. Its normal `&&` chain therefore does not reach the build; the actual production build was run separately and passed.

The final alias-retention guard additionally requires the canonical and native-cover pages to refer to the same exact file object/path. The folder regression now deletes/recreates that native identity at the same coordinate before asserting that the new object wins; its final focused run passes. This preserves alias facets without resurrecting a retired file. Final build/scanner and native confirmation are repeated after that guard; unaffected broad lanes are not rerun unnecessarily.

Final exact-build native confirmation: **12/12 cases passed**, Obsidian1.15.0 (installer1.14.0),94-Markdown-file disposable fixture,48 observed publications with destination members retained. Source/artifact SHA-256 hashes match the final working tree and dist output. Original test-vault artifacts, settings bytes and layout were restored. Final production build, scanner, targeted identity guard and diff whitespace checks pass. See [second-review native receipt](ontology-index-recovery-second-review-fixes-native-2026-10-28.json). The patch remains uncommitted on `2026-10-28-investigate-ontology-index-recovery`; production data remains untouched.

## Resolving the five pre-existing test failures

The five failures were stale test expectations, rather than missing tooling, an unreliable test environment, or product defects established by these assertions. Source history identifies the intentional behavior changes:

- `c4e6c88` advanced shortcut defaults from generation2 to generation3 when separating new-tab opening from branch folding. `tests/action-foundation.test.mjs` already specifies generation3, migration of generations1/2, preservation of explicit shortcuts and rejection of generation4. The host integration tests still expected generation1 and used generation2 as an unsupported future version.
- `ca7220b` changed Compass to explicit editor bindings and introduced the captured asynchronous `requestSelection` save/close path. Its documented requirement is that selecting a different view saves/closes the embedded editor first and preserves the current editor/view when saving fails. Three older session tests still assumed Compass omitted `editorHosting` and attempted a direct synchronous view change with a retained editor.

The corrections are test-only. Host tests now assert generation3, exercise supported prior generations1/2 through real production save callbacks, and reject genuinely newer generations before memory, storage, command publication or subscriber notification change. Session tests assert Compass's actual editor policy and direct-selection guard. Explicitly named test-only legacy definitions retain the previous compatible-central-editor coverage without treating it as Compass behavior. Added current-Compass cases cover a pending save, successful close/switch, and failed-save retention of the exact original note binding. Existing native editor callback tests continue to cover saving content and retaining the editor on failure.

“Attention editor” was internal architectural terminology for the embedded editor associated with the currently central/focused note. User-facing reports should call it the central note editor (or embedded note editor where it can be noncentral), and explain save/close behavior directly.

Focused command: `node --test --test-concurrency=1 tests/action-host-integration.test.mjs tests/action-foundation.test.mjs tests/plex-view-session.test.mjs tests/canvas-view-api.test.mjs tests/editor-switch.test.mjs` under Node22.22.3: **184/184 passed**. Standard full portable verification and exact-build native smoke testing are being run through `scripts/testing/obsidian/verify.mjs`, with an outer disposable-vault artifact/settings/layout restoration wrapper. The final result is recorded below after completion.

With those five expectations corrected, the complete main test lane passes **1,672/1,672**. This allowed the standard command to reach its later browser lane, which exposed an additional genuine runtime failure: `a queued native scalar save survives Settings removal without touching its retired slider or accepting later events` in `tests/appearance-themes-ui.test.mjs`. The existing Settings owner correctly fences its save callback and peer refresh, but `numberSlider`'s own deferred draft-completion callback still wrote the retired native input after the accepted save finished.

The shared slider now accepts the caller's existing `isCurrent` row/document/generation guard. It gates new native events and deferred display updates, retaining local value bookkeeping and the lifetime of already accepted persistence. Both theme scalar rows and ordinary declarative numeric rows supply their established guards. No new settings writer, lifecycle scheduler or visibility observer is introduced. The original failure passes without changing its assertions; the full affected appearance/numeric/latest-value lane passes **28/28**. The two earlier selected lifecycle/adoption checks also pass. Installed-type checking passes. Full standard verification will be repeated on this runtime correction rather than accepting the first run's browser failure.

### Browser lane unblocked by the original five corrections

The first full browser aggregate completed **393/403 passing**. All ten failures were inspected rather than retained as a new baseline:

| Browser failure | Classification and correction |
| --- | --- |
| Queued scalar save touched removed Settings input | Actual runtime bug; shared numeric delivery now consults the existing caller lifetime guard, as described above. |
| Native preset rule editor could not find ARC | Stale fixture assumed an archived preset was still a shipped default. It now seeds the preserved ARC archive as explicit saved configuration, using the same archive helper as the preset-manager suite. Grammar/write assertions are unchanged. |
| Attachment rename reported repeated style-dictionary work | Incomplete extracted-renderer fixture omitted current native editor-eligibility functions; React failed/remounted, invalidating its cache observation. The fixture now extracts those actual production functions and supplies the inert host callback. Original no-repeat style-read, rename identity and cleanup assertions remain. |
| Keyboard selection expected plain arrows to stop at the center | Outdated behavior assertion. Current plain arrows cross an exhausted area; explicit area jumps, selection retirement, filtering and owning-realm cleanup remain covered. |
| Color-only publication had no embedded test editor | Extracted scene omitted current binding variables. Supplying explicit absent bindings restores the scene; original layout/image/editor/focus/camera preservation assertions remain. |
| Transient crosslink renderer failed | Extracted Edge fixture omitted the required viewport capability and actual continuation helpers. It now supplies explicit no-scroll areas and imports the real helpers. Original adjacency, paint, focus, layout and visibility assertions remain. |
| Directional caption renderer failed | Same missing viewport capability caused a renderer error before the label assertion. Wording, evidence-read limits and physical styling assertions are unchanged. |
| Fine-pointer control expected the touch-only hit-target class | Stale pointer expectation. Both lanes retain16px glyphs; fine pointer uses16px and coarse pointer44px hit targets. Existing touch isolation coverage remains. |
| Wander test expected ordinary Mind Map clicks to retain the root | Outdated behavior assertion. Ordinary note clicks now use accepted destination centering; the test reacquires the current occurrence before separately testing modified centering and editor/root protection. |
| Wu Xing drop target was outside the browser viewport | Fixture created a1200x900 canvas inside a smaller default browser viewport. It now explicitly sets1280x1000 before mounting. Actual `elementFromPoint` ownership, drop dispatch and all source-work/lifecycle assertions remain. |

The complete focused reproduction selection passes **11/11** (the ten failing cases plus the companion coarse-pointer control). The full appearance/numeric/latest-slider lane passes **28/28**. Temporary test-only style stack instrumentation was removed after diagnosis. No deadline, performance bound, error boundary or existing safety check was weakened. The final full portable/native run starts after these changes; its report supersedes the failed first aggregate rather than discarding it.

### Final clean verification

The final `scripts/testing/obsidian/verify.mjs` entrypoint (the `verify:obsidian` npm script) passed its complete `npm run verify` prerequisite and exact-build native smoke test under Node22.22.3 / Obsidian1.15.0 (installer1.14.0). All test lanes are green: architecture9/9, core130/130, main1,672/1,672, UI browser403/403, source357/357 and source browser807/807. Production build, installed-type checking and scanner passed. No failing-test baseline remains. The source-browser lane took1,161.9seconds, including the20,015-owner publication test and a worker which exited after a delayed cleanup without intervention; no timeout or cleanup code was changed.

The extra native lifecycle probe initially queried a retired declarative Settings container, then selected an inactive declarative control; those setup attempts did not exercise a save and each restored the vault. Its final same-document fixture creates a fresh real Obsidian Setting with the production Settings binder and uses a trusted Electron key. All three assertions pass: the accepted scalar reaches disk after the row is removed, completion writes no retired native input value, and later retired events cannot submit another write. One actual save and zero completion touches were recorded. This proves native component/writer lifecycle behavior; it does not certify declarative Settings-window migration or physical touch. The standard native canvas smoke test passed separately.

Final source/artifact SHA-256 hashes match the working tree and actual dist build. Original Small-vault executables, settings bytes and workspace layout were restored. All changes remain uncommitted on `2026-10-28-investigate-ontology-index-recovery`, based on17e39bf. Production data remains untouched. See [final clean verification receipt](ontology-index-recovery-test-corrections-2026-10-28.json). No additional manual check is required for the five original stale assertions or this narrow same-document slider lifetime fix; physical/mobile acceptance and declarative-window migration are not newly claimed.

## Third regression review follow-up

The next review identified same-center surface coupling, quadratic preparation guards, and an existing On-demand folder alias-ordering defect. The authorized fixes and current validation are recorded in [third-review fixes](ontology-index-recovery-third-review-fixes-2026-10-29.md). Its final receipt supersedes earlier source hashes for the runtime changed there.

## Final review-and-fix loop

The remaining sibling and metadata findings, subsequent publication/count/precedence fixes, and final repeated regression review are recorded in [final review loop](ontology-index-recovery-final-review-loop-2026-10-29.md). Its exact-source acceptance supersedes the third-review runtime hashes.
