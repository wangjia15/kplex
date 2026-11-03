# Mind Map product correction — PR219

Zsolt's Codex Agent, 2026-10-25. **Interim correction; not final acceptance.** Existing branch `2026-10-24-canvas-mindmap`, parent `ba1d2f3`, accepted main `9987810`. PR219 is draft. Earlier [validation](mind-map-219-2026-10-25.md) and CI482 remain historical evidence for their narrower fixture; they do not certify these working changes.

## Diagnosis and correction

Read-only observation confirmed different current Compass attention A and dormant saved Mind Map root R. Selector entry restored R. R had no visible children and four parents; child-only projection discarded that navigation context, leaving a lone node. This was a real product/design defect missed by the earlier acceptance model. No causal indexing regression is claimed.

An actual observation also found the root below the viewport with automatic zoom disabled. Its translation was consistent with an earlier taller viewport; that earlier size was not captured, so causation remains an inference. An actual-layout callback fixture reproduces 2591→713 viewport settlement and verifies centering at unchanged scale, with manual/restored/editor guards. Final exact-build production visual verification remains pending.

Opt-in current-attention selector entry preserves ordinary rooted attention changes and workspace restoration. Primary clicks select/expand exact child/peer branches; the explicit shared editor control opens an occurrence editor. History/pin/search destinations reroot safely before changing attention/history. Root children default right, peers left and parents above; descendants retain side. Children leave bottom gates; peers outward side gates; root parents top. Canonical edges retain role/provenance. Bounds remain256 occurrences, depth8 and eight additional scopes.

Independent horizontal/vertical density (default1, range0.75–4) divides the corresponding gap without shrinking node/editor rectangles. Native Settings and bottom-left Configure layout use the same registered type fields, existing slider and queued writer. Compass preferences and canvas state remain separate. No alternate registry, selection store, editor, parser, index scheduler or storage path was added.

## Ordered evidence

Node22.22.2, real dependencies, existing Chromium and Obsidian1.15.0 on macOS. Sixteen final affected Chromium settings/selector/shared-renderer cases pass, including live density events, independent values, retained root/camera and unchanged frontier acquisitions. Full verification was attempted and failed as recorded below; no full-suite pass is claimed. Existing performance guards are unchanged; no separate benchmark/profiling campaign. Private reports preserve every failed sample and test ordering. No private note identity, content or screenshot is published.

| Sample | Actual outcome |
| --- | --- |
| Preparation | Refused expected-closed assumption: Small was open. Inspection found no competing controller/editor and exact original config/content bytes. Fresh backup preserves its open state. |
| navigation-1 | Rejected relative config path before native work; corrected to absolute path. |
| navigation-2 | Actual SVG gates and trusted expansion passed; trusted pin click missed measured element. Cleanup passed. |
| navigation-3 | Document capture showed trusted click hit surrounding pinned bar. Cleanup passed. |
| navigation-4 | Stable target rectangle required before single native input. Four cases passed: actual SVG routes, branch expansion without editor/attention/root change, current-note selector/history/pin roots, both durable bottom-left density rails. Cleanup passed. No in-scenario assertion retries. |
| editor-1 | Eight cases passed: duplicates/cycles, Find selection, explicit B1 editor/capacity, dirty resize/spacing/density/caret/focus/nonoverlap, removal guards, migration/durable close, bounded view restoration, explicit reroot. Cleanup passed. |
| sessions-1 | Stopped before test canvases: global semantic preparation pending after earlier serial fixture deletion, metadata-pending/activefalse. Cleanup passed; no fixture notes/controller remained, existing Markdown metadata available. No index fix or same-lifetime success claimed. |
| sessions-fresh-1 / fresh-2 / fresh-3 | Setup notice dismissal failed; cleanup passed. The notice belonged to a foreign/retired document with zero rectangle, so element.click was not evidence of native close. |
| sessions-notice-close-1 | Public Modal.close retires only the informational setup owner; no notice-input success claimed. Both independent main/popout cases passed with cleanup, retained drafts/filters/Sidecar and restoration. |
| settings-1 | Existing native range helper refused a non-endpoint density request; corrected fixture to Home/End endpoints, without changing production policy. Cleanup passed. |
| settings-2 | Native density/Settings persistence and strict zero-work assertions passed. OS selector step failed after CUA targeted identically titled popout rather than main; cleanup passed, no keyboard success claimed. |

**settings-3 passed**:25 native receipts, including both density fields, failed-save rollback/recovery, popout Settings, draft preservation, independent sessions and actual CUA Space/Down/Down/Return with a trusted owning-document select key/change. Cleanup passed. [Ordered native receipts](mind-map-correction-219-receipts.json) retain failed samples and source/artifact/driver hashes.

Native staging is explicitly interim until current full verification. Drivers check installed/dist hashes. Later source changes require affected verification and exact final attribution. Earlier fixture failures (implicit balanced-default assumptions and wrong extracted source) and sandbox loopback EPERM are preserved privately with their corrected follow-ups.

## Complete verification attempt

`npm run verify:obsidian` under Node22.22.2 ran the real `npm run verify`:7 architecture and130 core tests plus scanner passed. The indexing runner then stopped at unchanged `tests/indexing.test.mjs:4060`: **Inline-field cooperative parser blocked timers for55.0ms**, with the existing strict45ms guard. The assertion was not modified by correction commit `d07f2a8`. This observation does not establish the cause or justify changing the threshold. Full verification and native staging from that runner failed; later stages were not run, and no check is waived. Failed log/runner receipt retained. No extra performance campaign or arbitrary passing retry was initiated.

Runtime checkpoint `d07f2a87be65c373b3f7b318bc9c8756f4b8f7ee` is pushed and remote PR head verified. Current-head CI is a separate pending gate. Partner #220 was reread at `272291cc911a13fb974a7b25fbe0d68028e2166e`; its autozoom-off framing-coordinate correction overlaps our rooted viewport-settlement block. Both behaviors must survive later accepted-main integration; no partner code was consumed.

## Safety and remaining acceptance

Production notes strictly read only. Maintainer authorized test main.js/styles.css and node/view changes only. Actual observer recorded zero create/modify/delete/rename and was removed; no native production editor opened. Original executables backed up privately. Installed production interim predates final density/descendant/camera changes and is not final acceptance.

Small owns synthetic writes. Scenarios restore settings/layout/demand/wrappers and remove fixtures independently of success. Outer restoration of eight config/plugin hashes,77 content files and original opening state remains pending. Earlier backups remain immutable.

Capacity one, ordinary Markdown. Native Electron automation does not establish physical touch/Windows/minimum-host behavior. View recreation is not whole-app restart. M0 FileManager cache-clean gate, fresh-popout Sidecar and older #215 combined-editor/two-Sidecar/extra-tab limits remain explicit. #220 is independent and uses unchanged attention-following hosting.

- [x] Diagnose real root/context mismatch without production note writes.
- [x] Implement root/navigation/context/gates and both density surfaces.
- [x] Native navigation/density and dirty-editor checks.
- [x] Independent sessions and native Settings on current staged runtime.
- [ ] Final compatibility/native attribution after complete verification.
- [ ] Affected browser checks, full verify/verify:obsidian and exact-head CI.
- [ ] Final read-only production visual check, restoration and published correction.

No merge219/220 or release authorized. Review recommendation remains pending actual remaining acceptance.

## Second-click folding and spacious density follow-up

The maintainer subsequently requested symmetric primary clicks and more spacious density. A second click now folds the exact branch through existing branch.toggle guards; a third reopens it. No root/attention/editor retargeting. Both density axes now admit0.1–4, default1; shared schema/Settings/live-rail metadata uses one finite range constant. Minimum0.1 gives960px horizontal and240px vertical base gaps while preserving measured note/editor rectangles. Previously saved values remain valid and Compass is unchanged.

Node22.22.2 real build,68 focused policy/navigation cases and13 Chromium settings/shared-renderer/control-input cases pass. Exact staged main85f16cf5a1c3dfad9319bfebebf73fc7d06f51488d7a7ebe2a892a964de48d84 passes native navigation4 (trusted folding/reopening, SVG gates, pins/history and both Home-key0.1 durable live rails), dirty editor8 (spacious0.2/0.1 reflow/caret/focus/instance/manual camera/guards/migration) and Settings/selector25 (both native Settings0.1 endpoints, trusted OS select, popout/draft/zero-work guards). The12-case M0/unchanged attention-host/Compass native compatibility lane also passes. Final clean full verification/CI and outer restoration still pending.

Ordered new failures are retained: toggle-editor-1 stopped on fixture preparation before opening editors, cleanup passed; a stronger pre-fixture requested-semantics readiness condition and owned-scope diagnostics preceded the passing editor case. spacious-settings-1 could not find a visible native page; the diagnostic follow-up exposed a retired popout document with defaultViewnull, cleanup passed. A normal reload of only Small's renderer established a fresh main Settings document, startupfalse/pendingfalse; the unchanged acceptance then passed. No production indexing/Settings architecture fix is claimed and no rejected action is retried inside a scenario.

The separately authorized [P13 timer follow-up](parser-responsiveness-followup-2026-10-25.md) completed its fixed primary/control/diagnostic series without reproducing55ms or establishing a justified correction. All failed generator attempts and controls remain recorded; production parser and45ms guards are unchanged. It does not convert the original failed full verification into a pass.
