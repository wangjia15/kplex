# Mind Map canvas view

Prepared by Zsolt's Codex Agent, 2026-10-25. **Revised implementation independently verified; maintainer product review remains open.** Latest [shared relink-feedback follow-up](validation/relink-feedback-219-2026-10-25.md) passes clean ef59f1c full3,021 and native3, including the actual parent→child Save roundtrip; Small retains its corrected test build. Clean eac6dc0 passes 3,021 TAP checks, real build/native smoke; runtime CI497 passes at `9e77bf3` and final CI is not awaited; corrected runtime `88c3f32` passes 27 native functional cases. [Current correction evidence](validation/native-occurrence-drag-219-2026-10-25.md) preserves all failures and exact scopes. Capacity one; combined Wu Xing integration, FileManager/fresh-popout Sidecar and physical-device limits remain explicit. No merge/release/additional production deployment is authorized.

## Maintainer interaction update (2026-10-26)

Plain click/tap and Enter center the selected note through the shared destination action; in Mind Map this also makes it the root, subject to existing native-editor safeguards. The separate lower-right corner chevron or Alt/Option+Enter folds/unfolds without navigating. Control/Command+Enter opens the selected note in a new native tab; explicitly customized bindings keep priority. Plain arrows stay within the current area when possible and cross its boundary without a modifier. Existing explicit area-jump actions remain available; the old stop-at-area-boundary setting is retained only as serialized compatibility.

Touch keeps the same small chevron while enlarging its transparent target. Opt-in measured controls reserve clearance outside the note body and gates, including during parent-area repacking and Fit. A pointer tap in that reserved area invokes the same fold action exactly once. Browser touch emulation is distinct from physical-device acceptance. Cycle references remain terminal copies in the current traversal; ordinary activation centers their canonical note. Legacy custom views with an explicit expand-primary policy retain ancestor-reveal behavior.

Parent-area columns expand outward: the left column goes left for two or three columns; the middle/right columns and the single-column arrangement go right. Their physical gates and measured subtree spacing follow the same direction, including filtered forests. The new interaction changes receive targeted checks; full regression is deferred until the maintainer requests final merge acceptance.

## Baseline and start gate

Planning branch: `2026-10-24-canvas-mindmap`, created from `main@659697a686f341497725dfb31e94a8bc2bcf2b25`. Reviewed foundation: [#215 at 030d0f0](https://github.com/zsviczian/kplex/pull/215). Depends on [Canvas settings #218](https://github.com/zsviczian/kplex/pull/218).

**Before implementing, fetch and integrate latest accepted main into this existing branch. Confirm #215 and #218 have landed, record the actual base, reread repository instructions and the accepted view/settings contracts, and revise this draft where those contracts changed.** A planning branch is not a frozen implementation base. Preserve concurrent changes and use normal commits; no force-push, merge, release or production deployment without authorization.

**Current maintainer direction: #219 and #220 are independent feature jobs after #218 merges. Neither feature PR depends on the other.** This supersedes earlier statements in PRs, comments and #215 planning documents requiring M0 before both views' native integration. The [occurrence-editor task](https://github.com/zsviczian/kplex/blob/030d0f0558c78b25be0d27fba40caca60b9361cd/docs/PLEX_OCCURRENCE_EDITORS.md) remains M0 and is required for Mind Map's arbitrary-node editing. Wu Xing's first version uses the existing attention-following native editor and may complete its full production/native integration without M0.

Keep M0 independently reviewable and reusable, but do not require Windows to consume it, acknowledge a checkpoint or wait before completing #220. Preserve the existing view/editor contract through an additive capability or compatibility adapter so existing consumers can keep working unchanged. #218 stays focused on settings/selection and must not absorb this host work.

The running #218 agent remains authorized to merge #218 after successful automated validation and immediately start this PR with M0. That continuation is unchanged; merging #219/#220 and release remain unauthorized. The maintainer subsequently authorized read-only observation, node/view navigation and temporary `main.js`/`styles.css` deployment in the production vault; production notes must never be edited.

## Product goal and source basis

Keep a stable map of a subject while moving attention between its notes and expanding an eligible node into an editor **in that occurrence's place**. Changing the edited/inspected note must not implicitly change the map root.

The maintainer supplied TheBrain 14 User Guide, printed pp.147–152 (PDF pp.154–159). It distinguishes a horizontally expanding symmetrical Mind Map, graphical Outline, individual branch expansion, generation-wide expansion/collapse, and changing focus/content while retaining the map layout. The public [official help](https://help.thebrain.com/ipad/index.html) provides the supporting illustration below. Its platform-specific gestures are reference material, not K-Plex shortcut requirements.

![Official TheBrain Mind Map reference: horizontal branches on both sides of a root](https://help.thebrain.com/ipad/images/0aa2e44a-2fdc-5284-a9cf-35be54aa7803.png)

*Source: TheBrain official help. Visual reference only; no affiliation or exact behavior/styling parity is claimed. The in-place native editor requirement comes from the maintainer, not from this screenshot.*

Outline can later reuse this hierarchy projection with a one-sided layout. A compact sidebar Tree view is another later surface. Neither is an additional deliverable in this PR; do not conflate document-heading expansion with a hierarchy between notes.

## Required interaction model

| Intent | Result |
| --- | --- |
| Enter Mind Map through the selector | Capture that canvas’s current attention as root, including when re-entering a previously used Mind Map. Native workspace restoration independently retains its saved root. Show children to the right, peers to the left and parents above. |
| Primary click/tap on an eligible occurrence | Center it through the accepted destination action and make it the map root. Refuse a root change that would remove a live editor; preserve placeholder materialization and drag/control ownership. |
| Select the lower-right chevron or use modified Enter in graph focus | Fold/unfold its bounded branch through the shared editor-safe action; retain root, attention, camera and native document identity. |
| Select the explicit editor control | Request that exact occurrence’s in-place native editor through shared actions. Branch expansion is independent. |
| Select through arrows, typing or Find | Select/reveal the exact occurrence without opening an editor or rerooting. |
| Press Enter after keyboard selection | Center the selected note; on the existing center, remain centered rather than starting rename. Rename remains its own action. |
| Click within an expanded editor | Focus its existing native editor. Never toggle-collapse it because the click bubbles to the node. |
| Expand/collapse branch | Change that occurrence's displayed descendants; independent of editor expansion. |
| Expand/collapse one generation | Bounded frontier operation over current expansion, not an unbounded recursive scan. |
| Use as map root | Explicit reroot through the shared navigation owner, with safe handling of any editor that would be removed. |
| Close node editor | Collapse only that binding through the shared save/teardown path. |
| Explicitly select a history, pin or search destination | Make that destination the map root through the owning session; refuse unsafe editor removal before changing navigation/history. Ordinary attention updates remain independent and retain the root. |

Initial editor capacity is **one per canvas**, using an occurrence-keyed collection designed to allow more later. A second request has an explicit capacity result and clear recovery (close the current editor first); no silent replacement. Multiple simultaneous editors are tentative follow-up work, not an overnight acceptance criterion.

Unsupported targets retain their existing open/inspect behavior and never acquire a fake editable document. The first arbitrary-occurrence native proof is Markdown. Preserve all currently supported Compass editor/attachment/drawing/URL behavior; do not claim new target support without testing it.

## M0 — Shared occurrence editor and rooted-session prerequisite for Mind Map

Implement the bounded occurrence-editor behavior and native proof in `docs/PLEX_OCCURRENCE_EDITORS.md`. Its earlier blanket scheduling restriction on both feature jobs is superseded by the maintainer direction above; the actual editor safety and native-proof requirements remain intact. Reconcile that scheduling wording and the capability matrix in your branch after updating from main, without rewriting historical validation records.

The reviewed #215 runtime still has a single `PlexProjection.editor`; `prepareViewScene()` requires its node to equal attention, and `PlexGraph` derives the actual editor page from `persistentNeighborhood.center`. Its `PlexViewSession` transient state is attention-scoped. These must change together behind a compatibility policy. Do not only remove the equality guard.

Required ownership:

- Stable binding incarnation + exact occurrence ID + canonical document identity; native identity revalidated by the host. Definitions receive plain IDs, never TFile/WorkspaceLeaf/controller objects.
- Root, attention, selected occurrence, expanded editor bindings and actual keyboard focus owner are independent. Rooted state survives inspection of another branch.
- Explicit shared expand/collapse/resize actions reuse ActionManager, existing editor/controller and lifecycle fences. Background admission/measurement does not activate notes, steal focus or redirect Sidecar.
- Per-occurrence dimensions feed shared measurement before layout. Ordinary resize/reflow/pan and attention changes preserve the live native editor, file, dirty text, caret and selection.
- A filter/branch collapse/view switch that would remove a live editor pins it according to the approved filter policy, refuses the operation, or performs an explicit tested close/flush transaction. No hidden retargeting or discarded edits; authoritative visibility restrictions still apply.
- Preserve established attention-following hosting for Compass and every definition using the accepted legacy editor contract, including an off-centre attention anchor. Introduce independent binding support as opt-in or behind a compatible adapter, with regression tests proving an unchanged non-Classic attention-following definition still works. Do not require all views to migrate to Mind Map bindings together.
- Classic's saved keys, commands, framing, one-sided layout, section expansion and all existing editor target kinds remain regression-covered.

**Native proof gate for Mind Map:** root R, attention A, editor bound to B; move attention to C and retain R/B and the same native editor; genuinely dirty B and resize/reflow while retaining text/caret; render B1/B2 and expand only B1; exercise capacity-one, filtering/collapse, compatible/incompatible switch, popout migration and teardown. Retain exact built/staged artifact identity and cleanup receipts.

Publish M0 as a separate, self-contained, tested commit sequence with the capability matrix updated. Mind Map must pass this proof before claiming its in-place editor feature is complete. If M0 cannot pass, return that limitation and keep #219 draft; do not substitute Sidecar-only inspection for the requested in-place editor. This does not block #220 from completing its different, attention-following scope.

## M1 — Bounded hierarchy data and projection

Use resolved child relationships from the canonical compiler/resolver and current ontology. The same child semantic role can be physically left or right. Do not change global ontology settings to change the layout.

A bounded application adapter must prepare requested frontiers through existing demand/source owners. #215's cache-only `PlexViewRead` is not a general multihop acquisition API. Start with one generation; each branch/generation action requests only its explicit next frontier. Keep total occurrences, edges, depth, outstanding preparation and retained scopes bounded by the accepted host budgets. Surface truncation/loading/unavailable states. Do not describe cached empty incidence as a proven leaf.

Support eager and on-demand indexing. Root demand may remain while another visible node receives attention; release only the leases no longer needed by live root/expansion/editor owners. Cancellation, root/view replacement, rename/deletion and late publication retain source/policy/native/view fences. Never start acquisition during pure project/layout or add a second scheduler/scanner.

Occurrence IDs encode stable traversal identity, not sorted-array position. Repeated canonical notes under different parents have independent occurrences and expansion. Track ancestry per branch to terminate cycles while still allowing the same note in separate branches. Reference/cycle indicators do not invent semantic edges or writable nodes. Preserve provenance, actual endpoints, hidden-link handling and defined/inferred distinctions.

Read the root’s canonical parents, children, friends/challengers and previous/next relationships. Every expanded descendant reads its children and four peer roles through the existing bounded reader/demand owner. Parents are root context, not a recursive ancestor traversal. Deduplicate a target per parent using deterministic role precedence; separate lineages remain distinct. Keep the same occurrence/depth/frontier budgets. All displayed edges retain their actual canonical semantic role and provenance; no synthetic writable relationship is introduced.

## M2 — Stable horizontal layout

Use the existing measured thought/editor rectangles, node/link styling and physical-port renderer. Default root children to the right, all four peer roles to the left and parents above. Previously saved balanced/left child arrangements remain supported. Descendants retain their branch side across attention changes; avoid global rebalancing when an editor opens. Preserve root-relative branch identity when new data arrive.

At every expanded occurrence, child connectors leave the bottom gate. Peer connectors leave the outward side gate (right on right-hand branches, left on left-hand branches); root peers leave the left gate. Root parents use the top gate. Preserve the canonical semantic role independently of physical routing. Layout must account for editor dimensions and avoid overlaps with neighboring branches. Opening/resizing can move nearby nodes; ordinary attention changes must not trigger a new whole-map fit or large center-style size changes. Preserve manual camera intent; reroot/Fit remain deliberate framing operations.

Validate link clipping and scene extents for large horizontal/deep layouts, including outside Classic's typical bounds, scrolled/clipped editor occurrences and popout resizing. No force simulation or frame-by-frame source/layout recomputation. Automatic placement may follow initial viewport settlement while its authority remains current, including preserving scale when autozoom is disabled. Manual/restored cameras and live editor bindings retain priority.

Filtering, grouping, Find and keyboard navigation use shared owners. Specify how a filtered branch affects descendants and keep it deterministic; never turn a hidden ancestor into an invented direct semantic link. Keep/Reflow retains its advertised meaning. Group only appropriate branch partitions, never the root or a live editor; unfold through the shared mechanism. Same-note occurrences must remain independently selectable and discoverable.

Horizontal and vertical density are independent Mind Map type settings (default 1, range 0.1–4). Both appear under **Settings → K-Plex → Canvas behavior → Views → Mind Map** and in the bottom-left **Configure layout** panel. Both surfaces use the same validated queued writer; density divides the corresponding gap, never note/editor dimensions. Compass density and per-canvas root/expansion/camera/editor state remain independent.

## Shared interaction/area correction, 2026-10-25

Explicit F4 search results, history, pins, and file/link/node center drops choose the new root in the opening rooted canvas. Ordinary branch clicks toggle that exact occurrence and keep its root; ordinary attention, passive native follow and background editor measurement do not reroot. Admission rejects an editor-removing destination before history, attention, document synchronization or provisional-file insertion. Unknown/stale native files cannot acquire a root. Existing attention-following definitions use the same activation owner unchanged.

All views reuse native `nodeLinkDrag`, canonical file/URL/tag readers, captured source ownership, shared gate/area hit-testing and existing relationship/structural composers. A view declares physical ports and meaningful `PlexArea.dropRole`; optional `dropOrigin` names an exact admitted canonical occurrence, otherwise root/entry owns the area. Screen position/classification is never evidence. A nested hierarchy copy cannot move an unrelated ancestor's relation. Pointer drags retain exact occurrence identity. Occurrence-editor text drops stay with their existing native editor and cannot retarget the independent map root. Existing Compass/attention-host center-editor navigation policy remains unchanged.

Parents occupy a bottom-aligned measured grid above the root. **Parent columns** remains in native Mind Map Settings and bottom-left Configure layout (1?3/default2). Parent subtree/editor rectangles determine aligned columns and area width; that width reserves the lateral branch baseline. The area's bottom stays above the fixed root; unused height lies above the parent forest. Its per-canvas height preference (140?800/default300) is a **minimum**, with the measured area growing upward beyond that minimum as branches or native editors require. There is no internally scrolling canvas area in Mind Map. The shared area filter, resize frame and keyboard controls remain; matching parent descendants retain their exact ancestors and measured positions instead of repacking into a scrollable list. Wheel/touch input on this fixed area follows the shared canvas policy. Native editor document scrolling remains native. Child-left/child-right and peer regions keep their existing root-relative drop meaning. No second settings, area renderer, source reader or editor owner is introduced.

Non-Classic views share one bounded cached `visibleRelationshipsWithin` cross-link adapter. It retains exact canonical pairs, real role/type/direction and declared physical gates: children bottom, parents at their declared parent port, peers on the aggregate/outward side. Primary semantic pairs win; repeated notes use one nearest compatible admitted occurrence pair with stable scene-order ties. Group/derived/decorative endpoints do not gain canonical write authority. Rendering and connection actions share actual extra semantic edges. Under a global filter, the same bounded pass supplies represented pairs to existing gate numerators independently of viewport clipping. No source acquisition/rebuild is added; unavailable cached incidence is not a completeness claim. The connector pass caps work at16384 adapter operations/4096 added edges and reports limitation; these caps do not bound GraphIndex's existing cached incidence lookup time.

Normal queued post-save refreshes stay quiet; only actual refresh rejection reports existing recovery copy once per failure episode. Persistence/conflict/modal outcomes remain unchanged. Focused/native evidence and preserved failed samples: [interaction correction](validation/mind-map-interactions-219-2026-10-25.md). Final complete verification/CI is recorded there separately. Capacity remains one live occurrence editor; no multi-editor claim.

## M3 — View settings, selection and actions

Register `mindmap` with user-facing **Mind Map** in the accepted #218 contribution system under Canvas behavior > Views. Registration must also expose Mind Map in **Views and lenses → Canvas view** through the existing registry; no duplicate toolbar/settings framework or hard-coded selector options.

Type settings: child branch arrangement (right by default; saved balanced/left remain valid), horizontal and vertical spacing/density, parent columns (1–3, default2), initial visible generations, and bounded depth/occurrence preferences constrained by shared safety caps. Reuse common typography, styling, node-editor default mode, visibility/lenses and input preferences; do not clone them into mindmap settings. Selected view, root, branch fold state, occurrence side assignment and editor bindings are session state, not global settings.

The selector targets the canvas that opened the panel, including after focus moves to another window. Compass and Mind Map can be open simultaneously with independent view choice, roots, cameras, editors and Sidecars. Preserve filters, lens definitions/drafts and per-canvas workspace restoration. Test with Compass and Mind Map; use test-only definitions where helpful, without requiring Wu Xing's implementation.

Shared actions: expand/collapse branch, expand/collapse one generation, explicit reroot, open/collapse node editor and focus/reveal. Keep existing platform modifier/open behavior and native editor key ownership. Branch disclosure must be a separate accessible target from editor opening. Add all user-facing text to the shipped catalogs; retain stable action IDs and update action inventory only for implemented actions.

## M4 — Acceptance and validation

- Root remains fixed while inspecting/editing several admitted notes; branch expansion, canonical endpoints, camera intent and shared history/Footprints semantics remain correct.
- A clicked arbitrary eligible occurrence opens its actual document in place. M0's native R/A/B/C, dirty-state, duplicate and teardown proof passes. Capacity one is visible and truthful.
- An unchanged non-Classic definition using the prior attention-following editor contract remains supported. M0 does not require #220 to adopt a new API or wait for #219 to merge.
- Multi-parent diamonds, self-links, longer cycles, filtered ancestors, missing/renamed roots, unknown settings and high-degree graphs terminate deterministically with bounded work.
- On-demand expansion works from genuinely cold/unprepared branches, not only a fully cached test graph. Collapse/root/view retirement rejects late results.
- View-only geometry/configuration changes add no body reads, parsing or semantic rebuilds. Actual note edits follow ordinary incremental indexing. Expand requests acquire only approved bounded scope.
- Shared grouping, Keep/Reflow, Find, keyboard, actual semantic cross-links, appearance, selector and independent canvas/Sidecar sessions work; Compass baseline goldens/assertions are retained.
- Run required Node22.22.2 `npm run verify`, focused hierarchy/editor/session/browser/source-demand checks, exact-build native editor/actions/Sidecar/popout scenarios and exact-head CI. Record physical Windows/mobile gaps separately from emulation.

Priority manual tests: edit B while changing attention and resizing; duplicate/cyclic branches with keyboard and modifiers; independent canvas/Sidecar pairs across switch/restart with content verified. #215 records baseline-native combined-editor and extra-tab failures; preserve those observations and do not claim they are fixed without a controlled comparison.

## Parallel work and communication

The Mac agent owns M0, rooted navigation, the shared occurrence-action/editor extension and Mind Map's bounded frontier adapter. The Windows agent owns Wu Xing phase classification/layout and narrow cached-property/background contributions. Prefer focused new modules and additive capabilities with safe defaults. Coordinate overlapping functions/interfaces in contracts, PlexGraph, prepareScene, ActionManager and session owners; do not reserve whole shared files until a feature finishes.

After #218 lands, both update from accepted main and can complete production/native implementation independently. Windows uses the existing attention-following editor; it does not wait for M0, consume #219 commits or stop at fixtures. Mac must not depend on #220's property/decorations changes. Keep each PR independently reviewable, with no prescribed feature merge order; the second integration reconciles current main and reruns affected checks.

Commit and push coherent checkpoints: additive contract, editor extension, working vertical slice and validation. Confirm branch reachability. Post a short PR message signed **Zsolt's Codex Agent** with commit SHA/link, capability, actual tests and any specific overlap. Read the other PR at kickoff, before overlapping shared-interface edits and before integration; fetch its branch read-only when helpful. A pushed commit is visibility, not acceptance. No timer-driven churn, automatic mutual branch merges, unapproved cherry-picks or shared HANDOFF overwrites.

A missing partner response is not a blanket block on independent work. Preserve accepted APIs, avoid the partner's owned modules, and flag only concrete unavoidable conflicts. Later adoption of a merged shared enhancement is optional follow-up, not a hidden completion gate. Keep each branch's HANDOFF current; cross-agent decisions belong on the PRs.

## Exclusions and return

No simultaneous-editor workspace, native Obsidian Canvas replacement, manual branch-position persistence/reordering, whole-vault metrics, Ideaverse, external plugins, heading-node system, full Outline/Tree view, unrelated indexing/storage refactor or C15–C26 work.

Return actual implementation/files, validated editor checkpoint, compatibility/configuration contracts, source/build identities, tests/failures/limits, cleanup and remaining decisions. Keep this PR draft until the complete Mind Map feature and its own M0 requirements are validated. Do not merge the planning document as a completed view. #220's readiness is independent of this PR.

## Historical checkpoints — acceptance superseded

The checkpoint notes below preserve the earlier implementation history. Their delivery/authorization statements describe that time, not current acceptance. The requirements above and the [correction report](validation/mind-map-correction-219-2026-10-25.md) govern current work.

### Accepted implementation baseline and prior checkpoint

2026-10-25 Budapest / 2026-10-24 UTC: #218 merged as `998781070a9382005154f4f884ed753280a9cf52` after exact-head Node22.22.2 full/native verification and green CI467. This existing branch includes its latest specification `67885e6` and normally integrates accepted main. No local work was discarded.

Use the accepted `PlexViewDefinition.configuration`, effective input/layout configuration and `CanvasViewSettingsRegistry`/`updateCanvasViewSetting()` interfaces documented in `CANVAS_VIEW_SETTINGS.md`. The existing registry automatically supplies Views and lenses → Canvas view. Do not add a selector/store or copy type settings into session state.

M0 checkpoints, each independently reviewable:

1. Opt-in occurrence-host contract and bounded per-session binding owner, with explicit capacity one, exact occurrence/document/incarnation and per-binding dimensions. Unchanged definitions retain the attention-following contract.
2. Shared action admission, exact host file validation, per-occurrence scene measurement and stable native host geometry. Rooted navigation/camera/demand policy is separate from editor expansion.
3. Native lifecycle integration: background ownership, retained dirty buffer/caret/focus, explicit link routing and close/save boundaries, removal/switch/migration guards.
4. Actual R/A/B/C and duplicate-occurrence native probe plus unchanged off-centre attention-host regression. Until this passes, capability remains unsupported.

Then implement M1–M3 using only accepted canonical demand/source owners and complete M4. #220 proceeds independently on its accepted attention editor; no unmerged partner code or acknowledgement is required. Mac owns only the concrete editor/root/frontier additions, not whole shared files. Final #219 merge remains unauthorized.

M0 rooted interface now implemented: optional `navigation: "rooted"`, per-session `layoutRoot()`/initial capture/explicit `setRoot()`, bounded `roots` in the existing workspace payload, and `PlexViewInput.layoutRoot`. This is separate from `editorHosting`. Rooted state survives attention updates in the actual Chromium renderer; existing attention-scoped definitions/goldens remain covered. Native occurrence hosting subsequently passed the bounded905b777 proof described below.


M0 native integration is implemented and twelve actual Mac native cases pass, including external-Vault mutation and teardown; the FileManager cache-gate limitation remains open; final M0 full verification subsequently passed at905b777. See [the interim evidence and preserved failed sample](validation/occurrence-editors-219-2026-10-25.md). No production definition opts into occurrence hosting yet. The following M1 checkpoint starts hierarchy implementation; this is not a completed Mind Map.


M0 source905b777 passed full `verify:obsidian`, CI475 and the isolated fresh-renderer twelve-case ordinary-Markdown proof. [Ordered receipts and limits](validation/occurrence-editors-219-receipts.json) include the real authoritative-hide correction and preserved failed controls. The longer-sequence native FileManager cache-gate cause remains unproven. This is a validated shared-host checkpoint, not completed Mind Map acceptance. Continue M1 with explicit bounded frontier preparation, stable session-owned sides/folds and shared actions/settings, retaining the open native limit through M4.

## M1 hierarchy foundation checkpoint

Optional finite frontier demand, cache-only coverage/pair reads, bounded canonical child projection, stable occurrence sides/folds, cycle references, measured subtree layout and real shared-renderer integration are implemented. No production registry exposure yet. See [the Mind Map checkpoint report](validation/mind-map-219-2026-10-25.md) for actual42 focused/core130/architecture/Chromium/build/scanner evidence and failed samples. Genuine cold acquisition, shared actions/settings/primary editor UI and complete native/full/CI acceptance remain pending. #220 remains independent.

## M1–M3 integrated candidate, native acceptance pending

The existing production registry now includes `mindmap`, and the existing settings registry contributes six localized fields under Canvas behavior → Views → Mind Map. Branch/generation/reroot actions reuse the catalog/manager; primary pointer activation requests the exact occurrence editor, while Find/keyboard selection does not. Future/invalid state stays inert. Native editor-host policy transitions are guarded separately from the broad editor capability. Existing attention-following definitions remain unchanged.

Shared occurrence-path filtering retains genuine ancestors in Keep/Reflow without revealing another same-note copy. Rooted edge styles/evidence keep real endpoints/root context. A hierarchy's native link export cannot borrow Compass's attention-neighbor move authority. Lowering type limits retains a live editor's genuine ancestry within the hard safety bounds. The current-note root button makes outside attention an explicit reroot choice.

Actual GraphIndex/IndexedDB tests start with an unprepared branch in both on-demand and source-ready Eager mode, admit only its requested frontier, and reject held publication after retirement. These use real source/demand/cache owners with finite native file/metadata inputs, not a fully prepared DTO fixture or a native disk-cache benchmark. Production selector/settings tests cover two documents, independent restoration, incoming merges and unchanged source signatures. All29 new strings are localized in every shipped catalog.

Native acceptance uses `verify:obsidian:mindmap` with `KPLEX_MINDMAP_LANE=editor` and `sessions` separately, through the existing guarded Small transport. They now pass bounded production editor and main/popout session acceptance; the latter preserves a loaded main-window Sidecar and does not certify fresh-popout Sidecar creation. Full verification found an omitted explicit transpilation inventory and four extracted-fixture dependencies; original assertions are retained and131 focused correction tests pass. Fresh complete verification is underway. Keep the PR draft; no merge/release/production deployment is authorized. See the checkpoint report for actual evidence and remaining limits.


### Production native evidence checkpoint

Source932ddae passes eight production editor cases (including explicit camera retention), two independent main/popout session cases,25 native settings/selector receipts and the12-case M0/legacy-host regression. Hierarchy Find now selects/reveals through the existing owner without activation; Compass remains reveal-only. Geometry proof waits for current post-edit frontier admission and rechecks genuinely unsaved text before its single resize. The host can withhold scene admission during source preparation; continuous scene availability is not claimed. Fresh-popout Sidecar creation remained empty and is not a passing workflow; independence uses a real main-window Sidecar. All failed observations are retained in the [validation record](validation/mind-map-219-2026-10-25.md) and [ordered receipts](validation/mind-map-219-receipts.json). e4ec8b3 full verify:obsidian and CI478 passed; corrected-head final full/CI remains the next gate. No merge authorized.

Final lifecycle review also corrects unavailable projection being mistaken for empty frontier demand. Last admitted bounded leases now survive unavailable output without granting stale scene authority; valid collapse/root/view/unmount still retire them. Actual callback/Chromium negatives reproduce the old release/reacquisition; corrected renderer and33 focused checks/build/scanner pass. The33bfd56 full attempt was intentionally interrupted and is not a pass; final corrected-source full/native/CI follows.


### Local validation complete

Runtime342ad13571a0f36dd2f20314940fe29ee6db175c passes clean full verify:obsidian7/130/1483/244/357/777, zero failures/skips, scanner/build/native smoke. Exact artifact5d0e3b5b passes production editor8, independent-session2, native settings/selector25 and M0/unchanged attention-host12, with cleanup. Small original8 files/77 content hashes and closed state are restored. Final architecture/lifecycle review confirmed admitted-only frontier retirement: unavailable output retains bounded leases without stale scene authority; valid collapse/root/view/unmount still retire them. [Final evidence and limits](validation/mind-map-219-2026-10-25.md), [all ordered receipts](validation/mind-map-219-receipts.json). Publication-head CI/completion is recorded on PR219. No merge/release/production deployment authorized; #220 remains independent.

Refresh feedback ownership: saved/pending-result dialogs retain their existing localized notice. Only settings callers without that feedback request the generic actual-failure callback; a normal coalesced/short-wait result never triggers it. Existing modal single-notice regression remains protected.

## Mind Map limit update (2026-10-25)

Mind Map's maximum depth defaults to 10 and accepts up to 20. Maximum displayed notes defaults to 500 and accepts up to 2,000. Native Settings and configuration validation share the same upper bounds. Existing saved values remain valid; these defaults apply when values are absent. Compass/Facets and the shared per-area node limit are unchanged. The maintainer explicitly requested this configuration-only change without additional retesting; existing range expectations are updated to the new contract.

## Maintainer depth admission correction

Mind Map declares its existing hard maximum of 20 through optional hierarchy.maximumDepth; its configured default remains 10. Shared scene admission, ancestor visibility/selection and cycle-reference reveal honor that declaration. Other definitions retain 8 when omitted. The separate eight non-root source-scope budget is unchanged and may stop expansion earlier; its terminal frontier remains visible. See [depth correction evidence](validation/facets-222-depth-correction.json).

### Gate counts and branch metadata

Gate totals use the same canonical count owner as Compass, mapped to Mind Map's physical ports. Its combined peer port adds the disjoint left/previous and right/next totals; a traversal prefix is not a count. Exact counts can be known before the full branch metadata is loaded. Missing count inputs retain the shared unavailable/cached/local presentation and never become a certified zero or relationship-edit permission.

**Incomplete metadata** means known children are usable, but the full branch has not been certified. **Metadata unavailable** means no usable branch metadata is available for that expansion; it does not prove the note has no children. Their tooltips explain this distinction. **Expansion limit** remains separate: configured depth/display limits and the bounded source-scope budget can stop expansion. Counts describe canonical notes, independently of display truncation and folding.

**Cycle reference** means the note appears earlier on this same branch. An ordinary click reveals that nearest earlier occurrence and explains the cycle. A note appearing on a different branch is an independent occurrence, not automatically a cycle reference.

The branch disclosure uses a chevron and the labels **Expand branch** / **Collapse branch**. Its click and double-click are isolated from note-body activation and file opening. Markdown sections use a separate plus/minus on the root note only. Heading rows have their own section-fold controls; branch folding and heading folding remain independent.

Mind Map declares `sections: true` and `sectionSource: "layout-root"`. Explicit expansion uses the existing single-document section reader and shared tree renderer. Stored relationships, note identities and the pinned root stay unchanged; proven heading provenance may move only a connector's physical source. Attention may move to another note while the root outline remains open. Rerooting closes the old outline and does not read another body until the new root is explicitly expanded. Opening the root editor closes its outline; an editor on another note retains its document, buffer, geometry and save lifecycle alongside the outline. Facets deliberately does not support Markdown sections for now. Native/final verification of this #222 addition is recorded separately from earlier receipts.

Current keyboard defaults: plain arrows select across areas; Enter centers the selected note and makes it the map root; Control/Command+Enter opens it in a new native tab; Alt/Option+Enter folds/unfolds. Explicit custom shortcuts remain authoritative. Clicking another note?s editor button saves/closes the current editor and opens the chosen occurrence, keeping one native editor and preserving root/attention. Save failures retain the original editor for recovery. Area-hosted toolbars stay inside the visible editor area.


Shared node statuses align to the card?s left edge. Measured disclosure clearance is uniform for every hierarchy occurrence, including leaves and cycle references that have no fold button; the presence of status text does not change sibling spacing.
