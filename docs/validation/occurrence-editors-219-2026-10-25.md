# PR219 occurrence-editor host: interim evidence

Zsolt's Codex Agent. 2026-10-25 Budapest / 24 UTC. **M0 is implemented in part and remains under validation. Mind Map is not implemented.** Wu Xing is independent and keeps the unchanged attention-following editor contract.

## Artifact and scope

Branch `2026-10-24-canvas-mindmap`, accepted main `998781070a9382005154f4f884ed753280a9cf52`. Published foundation `726a057`, admission `9e7cb86`, rooted session `5cae146`; native integration was tested as uncommitted changes above that parent. All recorded runtime source hashes were compared with the checkpoint before publication and matched. Production builds embed the manifest version, not Git identity; source/artifact hashes establish attribution.

Native main.js SHA256: `b315d1cd1c86ed4df43b413b60858e047cbe5132c8618f88d09b4e92cd89f18a`; manifest: `c28f61576adfe73800994c8fd47671fcd5880c21809cac63595cfbe3715c7a01`; CSS: `ec5b05c72b5f97f005dd81a8d7b7eceffe003cc3e16b0f94b3a9e8a2ad96dc53`.

Node22.22.2 with real dependencies; macOS Darwin23.5.0, Obsidian1.15.0 / installer1.14.0. Installed declarations/minimum1.13.0. Only the already authorized disposable `kplex-test-small` was staged. Interim staging was not full verification. The production registry still exposes Compass only.

## Correction implemented

Optional occurrence hosting is additive. Omitted editor/navigation policies preserve Compass and unchanged non-Classic attention-following definitions. The existing per-canvas session owns capacity-one bindings, root, transient state and bounded restoration intent. Shared actions expand/collapse/resize the exact admitted occurrence; duplicates do not share expansion state. Native tokens and buffers are not serialized.

The shared renderer resolves the explicit canonical/native document, supplies occurrence dimensions through measurement/layout and retains its existing native component through ordinary attention, reflow and scroll geometry changes. Background admission does not navigate attention or Sidecar. Native links use shared navigation without incidentally retargeting the bound editor. Explicit collapse awaits the existing native save lifecycle; failed save retains the editor. Cross-definition transitions and branch removal that cannot retain it are refused explicitly.

## Actual automated results

- 116 focused tests passed: action foundation, view session/contracts/Compass golden, native controller doubles and all localization catalogs. Initial new English description failed the existing minimum-word assertion; copy corrected and affected checks rerun. No assertion weakened.
- 12 Chromium tests passed: actual shared non-Classic/rooted renderer plus existing canvas selector/settings suites.
- Real production build, complete Obsidian scanner, architecture checks (7 tests, zero violations) and whitespace check passed. An unsafe iterator `any` introduced in root eviction was corrected; scanner rules unchanged.
- Full `npm run verify`, final exact-build `verify:obsidian` and exact-head remote CI remain pending for this native integration. Earlier foundation checks and #218's successful final verification are not substitutes.

## Native observations, in order

Attempt1 passed all eight cases with normal probe cleanup:

1. Root R / attention A / native editor B1, with root, attention, Sidecar and native focus retained during background open.
2. Attention C retains R and the same B native instance. Opening B2 returns explicit capacity-one restriction.
3. Genuinely dirty B, caret/selection and native focus survive resize to660×410, nearby-node reflow and area scrolling. Observed clip: `inset(33.1617px 0px 0px)`.
4. Lens filtering pins B1 alone; branch removal is refused. The actual selector reflects rejected transitions and explains incompatibility.
5. Injected native save rejection retains B; restored save plus explicit collapse persists the marker to the Vault.
6. Bounded intent restores after owned native view recreation with fresh native identity. This is not a whole-application restart.
7. Genuinely dirty main→popout→main migration retains B content and persists it on explicit close.
8. An unchanged off-centre attention definition, with neither new policy, retains native editor/buffer/caret through compatible Compass switches.

Attempt2 strengthened the nonempty-selection precondition and required overlay placement within1 CSS pixel of B1's displayed rectangle, with positive clipping. Those checks and the first seven cases passed again. The run then **failed** before physical rename at `app.fileManager.renameFile(B, renamedPath)`. The native method was awaiting `runAsyncLinkUpdate` → `metadataCache.onCleanCache`; `inProgressTaskCount` was0, but the link-resolver runnable remained active and `isCacheClean()` was false. No physical rename or M0 deletion control completed. This observation alone does not establish an M0 regression or a baseline host fault.

The240-second experiment deadline and20-second normal cleanup deadline both failed because the foreign await did not settle. This is preserved as a failed sample, not discarded or retried into a pass. Independent path/PID/content-guarded cleanup closed the owned canvas, removed its four notes/folder, retired only the timed-out closed controller and terminated only Small's renderer through ordinary vault close. The renderer exit cancelled the unsettled realm. Independent restoration passed; normal attempt2 cleanup did not.

## Restoration and retained evidence

Small was restored and closed at `2026-10-24T23:41:20.309Z`; renderer37228 exited. All eight original configuration/plugin files and all77 content files match the backup. Content:74 Markdown files /362132 bytes; sorted-entry digest `36372292bd7d6d60f52dfe7eccacc4e56d223bdf602c8f0f8614502357cff162`. No personal-vault deployment or new vault was used.

Private evidence remains under `/private/tmp/kplex-219-native`: `attempt-1/occurrence-editors-219.json`, `attempt-2/occurrence-editors-219.json`, failed staging receipts, attempt2 independent abort/retirement receipts and `restoration.json`. Logs: `/private/tmp/kplex-219-native-attempt-1.log`, `...attempt-2.log`, `...host-focused-3.log`, `...host-browser.log`, `...host-scanner-2.log`, `...host-architecture.log` and `...native-probe-build.log`. Private backups remain intact and are not committed.

## Remaining proof and next experiment

Run one bounded accepted-main native editor/migration control observing the cache-clean gate. Keep foreign operations bounded and preserve their ordering/outcomes; do not change scheduler/cache flags to manufacture completion. External Vault rename can separately represent an external filesystem producer, but cannot count as a passing FileManager workflow.

Complete external rename/deletion/recreation identity and durable teardown controls, plus authoritative hiding combined with failed save. Then run full verification, exact-build native acceptance and final-head CI before marking M0 accepted or shipping a production occurrence definition. Existing #215 combined-editor/two-Sidecar and extra-tab limitations remain documented. Physical Windows/mobile, full application restart and simultaneous editors are unproven; capacity is exactly one. No manual performance campaign is requested.


## Follow-up controls before final verification

The isolated accepted-main9987810 production build reproduced main.js SHA `d50c54d4c6a051467d543e92c143f5b430ac097be1003fadd41c3b2e0a5cbd82`. Its existing editor-only native lane, augmented only with bounded cache-gate observations, passed with normal cleanup. Cache remained clean before/after migration. This simpler control did not reproduce the stalled gate; it does not isolate M0 as the cause because it does not reproduce the full save-failure/restoration sequence. Evidence: `baseline-cache-gate/accepted-main-cache-gate-editor.json`. Small restored afterward.

Attempt3 used `Vault.rename` as a separately labelled external producer and passed11 cases with normal cleanup, including dirty rename, deletion without resurrection, stale binding rejection after recreation and durable teardown. Its gate was unclean before mutation (zero tasks/queued, runnable active), so the FileManager workflow remains unpassed. No runtime change was needed for these cases.

Attempt4 added authoritative exclusion while native save was rejected. It retained the same dirty buffer, root/attention and native instance and recovered visibility; the following reopening action failed before source maintenance had settled. Normal cleanup passed. Attempt5 adds a concrete pending/active-source-work settlement prerequisite before that reopen, with no action retries, and passes all12 cases with normal cleanup. The dirty/source boundary is checked explicitly. Evidence: `attempt-3-external-vault`, `attempt-4-removal-save`, `attempt-5-removal-settled`. Small was again restored and closed at23:50:34.902UTC, all original hashes matched.

The first local full-verification attempt encountered sandbox `listen EPERM 127.0.0.1` failures in existing browser server setup and was stopped. The log remains `/private/tmp/kplex-219-m0-verify-17b7bc4.log`. Full verification is rerunning with the local socket permissions required by the repository's real Chromium environment; no test guard changed. Final result remains pending.


Remote CI run40144149938/job121021821018 on17b7bc4 failed nine extracted-callback harness checks: new production scope dependencies (`sceneScope`/`rooted`) were absent, an outline-effect selector still searched its former activePath spelling, and the corner callback assertion expected the old direct function reference. Existing camera/navigation/Sidecar/modifier assertions are retained; the harness now supplies explicit scope context and executes both legacy corner opening and exact occurrence-action routing. The permitted local run encountered the same missing display scope; its first functional batch completed1457/1458, with no skips, while the other harness corrections were already present when those files loaded. This mixed timing is not final acceptance; focused checks and a fresh complete exact-head run are required.


The complete affected harness batch now passes78/78 with zero skips: `node --test --test-concurrency=1 tests/display-modes.test.mjs tests/viewport-fit.test.mjs tests/relationship-actions.test.mjs`. Log: `/private/tmp/kplex-219-m0-extracted-context-tests.log`. Production runtime is unchanged from17b7bc4/native artifactb315. The next exact-head `verify:obsidian` reruns all repository checks before native staging/smoke; no check is bypassed.


## Authoritative-hide correction and final-check candidate

The clean4b3addf full `verify:obsidian` run passed7 architecture,130 core and1458 functional tests, then failed2 of241 browser checks. Group unfolding lacked injected `sceneScope`; the attachment reconciliation fixture lacked the explicit legacy `occurrenceEditorPolicy=false`, causing a React render error that surfaced in its retained style-work assertion. Both fixture contexts were corrected. All8 group checks and the focused attachment case pass; no style-work/rename/gesture assertion changed. No native staging occurred in that failed full run because portable verification failed first.

A separately labelled healthy M0 control omitted native save-fault injection while retaining restoration and dirty migration. It passed, its cache gate was clean and both actual FileManager renames completed. This narrows the earlier gate stall to the longer sequence containing save fault injection; it does not establish the exact causal step. The production index/source/scheduler is unchanged. Evidence: `healthy-cache-control/occurrence-editors-219-healthy-cache-control.json`.

Attempt6 added an explicit visibility requirement and **failed** on runtimeb315: authoritative exclusion plus rejected save retained the native buffer visibly, without an accessible external Close action. Cleanup passed. This was a real M0 integration defect, not scheduling noise or a baseline indexing issue.

The correction shares `resolveOccurrenceEditorPage` between admission and removal, checking canonical identity, physical path, native token and eligibility. A retained excluded/stale editor stays mounted with `visibility:hidden` and `inert`; the recovery status offers the existing localized shared `editor.collapse` action. A failed retry retains the same buffer; restoring visibility reuses the same native instance. No independent writer/editor, new lifecycle or new copy was added.

Corrected main.js SHA256: `4687f9b7854e08947cce40f20a0bf9b5774556fbbf6719c8019ee9a2594c0877`. Attempt7 passed12 cases but overlapped an unfinished staging command and is exploratory only. That staging command timed out; its log is retained. Staging was then completed serially and attempt8 passed all12 cases with normal cleanup, including actual concealment/inert state, shared recovery Close reaching native save, retained dirty state and all mutation/migration/legacy controls. Evidence: `attempt-6-hidden-buffer-negative`, `attempt-7-hidden-buffer-correction`, `attempt-8-hidden-buffer-serial`; staging logs retain both outcomes. No overlapping sample is final acceptance.

The correction also passes49 focused document/native/group checks,12 actual shared renderer/selector/settings browser checks, the real build, scanner and architecture (299 reachable files, zero violations). Additional comments document existing M0 intent/admission helpers; final build hash is rechecked before publication. Full exact-head verification/native smoke and CI are rerun for the correction; until then M0 remains under validation. Small is currently open only for those authorized checks with original backups intact; final full restoration/close remains pending.


## Validated M0 source boundary and remaining native limit

Clean source `905b7776ba1db1a58e598b3c53f5f267a5430731` passed complete Node22.22.2 `verify:obsidian`:7 architecture,130 core,1459 functional,241 browser,357 source and775 source/browser checks, zero failures/skips; real build/scanner and native open/render/no-captured-error smoke passed. The exact same head passed [CI475](https://github.com/zsviczian/kplex/actions/runs/40145615501), job121026189703, including real `npm ci`; no step was skipped. Main.js remains4687f9b7 (full hash above).

After closing/restoring the earlier realm, a fresh Small renderer was staged from that hash-verified full-validation receipt. The twelve-case occurrence probe ran alone and passed with normal cleanup; every recorded runtime source hash matches905b777. Its gate was clean at observation. This validates the bounded ordinary-Markdown root/attention/binding/native-state proof, including authoritative hiding and recovery, and preserves the unchanged off-centre attention host. Production Mind Map and simultaneous editors remain unimplemented.

The separate fresh healthy control **failed** its20-second cache-clean precondition before FileManager, with normal cleanup. It contains no save-fault injection, so the earlier fault-specific attribution was too narrow. Read-only inspection found the native resolver running with queued work and no parser tasks. Small was already visible/focused; foregrounding it and20 further bounded observations did not clear the gate. No errors were captured. Neither scheduler/cache flags nor native resolver code were changed. The exact causal step remains **unproven**.

A further accepted-main dirty main/popout control completed with normal cleanup: cache clean before migration, briefly unclean after main return (one parser task), then clean within the bounded observation. Its first attempt stopped on a fixture collision (attention plus two repeats gave three occurrences); that failed sample is retained. The corrected input preserved the original two-repeat assertion and waited for the real popout editor before making it dirty. This baseline does not reproduce the full longer M0 sequence and cannot establish that the condition is absent from accepted main.

The actual FileManager rename workflow after the longer sequence remains an open native validation limit. External Vault rename/deletion/recreation and durable edits pass the occurrence proof; they do not substitute for FileManager. If the condition recurs in Mind Map's actual native workflow, the next bounded experiment is to cut the same fixed-artifact sequence after view recreation and after each window migration, capturing the first non-draining resolver state and native rejection/error events. Do not reset the native queue to force a pass. No indexing optimization/profiling campaign is justified.

All final native resources were restored and Small closed at `2026-10-25T00:43:56.630Z`: original8 file hashes,77 content files/74 Markdown/362132 bytes and original closed flag match; exact renderer exited, controllers0. The fresh native proof is not a whole-application restart. Physical Windows/mobile, existing215 combined-editor/extra-tab limitations and the native gate investigation remain explicit. #219 stays draft while Mind Map M1–M4 and final feature acceptance proceed; #220 remains independent.

[Minimized ordered receipts](occurrence-editors-219-receipts.json) publish source/artifact/driver hashes, case IDs, failures, controls, exact-head full/CI outcomes and restoration without vault contents or private logs. Logs for final verification, fresh healthy/final occurrence and corrected baseline remain under `/private/tmp/kplex-219-native` and the corresponding `/private/tmp/kplex-219-*.log` names.
