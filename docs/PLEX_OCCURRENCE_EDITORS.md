# Occurrence-based editor hosting prerequisite

Status: M0's capacity-one ordinary-Markdown host and production Mind Map integration are independently verified on corrected runtime `88c3f32`: shared-host12 and production-editor8 native cases, plus interaction7, clean local full verification (3,021 checks) at eac6dc0; runtime CI497 passes at `9e77bf3`, final CI not awaited. [Current evidence](validation/native-occurrence-drag-219-2026-10-25.md) retains failed/historical scopes. Wu Xing remains independent with its unchanged attention-following contract; no simultaneous-editor claim or adoption gate. Maintainer product review, combined integration and documented FileManager/Sidecar/physical-device limits remain open. Zsolt's Codex Agent,2026-10-25.

## Required behavior and current limit

An eligible displayed occurrence must be expandable into its own native document editor without rerooting the map. Layout root, attention/navigation target, selected occurrence, expanded editor bindings and keyboard focus owner are independent. Changing attention cannot retarget a live editor. Branch expansion and editor expansion have separate state and actions.

The first implementation may host **one live editor per Plex**. Its occurrence-keyed boundary must accommodate several bindings later, but simultaneous editors are outside this task. A second expansion request must return an explicit limit result rather than silently replacing a live editor or losing edits.

The current #215 runtime does **not** satisfy arbitrary-node editing. It hosts one attention-following editor, including when a non-Classic definition supplies its off-centre geometry. The existing probe uses different root and attention nodes, but its native editor still edits attention. It is not the required R/A/B proof.

## Why this is a separate native-host checkpoint

The verified extraction retains these concrete compatibility seams:

- `PlexProjection.editor` is a single occurrence anchor. `prepareViewScene()` requires its canonical node to equal attention when an expanded size is supplied, and exempts that anchor from filtering/grouping.
- `PlexGraph` derives eligibility and `centralEditorPage` from `persistentNeighborhood.center`, holds one editor size/maximize/overlay reference, and keys the mounted editor by document path.
- Opening or resizing that editor participates in the shared centre/automatic-fit policy. Attention changes participate in camera placement and retire attention-scoped transient state in `PlexViewSession`.
- `CentralNodeEditor` already accepts an explicit host-side page and owns the existing `mountEmbeddedMarkdownLeaf()` controller. Its file-change callback currently navigates the graph. The adapter owns native focus, link routing, saves, representation changes, window ownership and teardown; mobile/sidepanel activation has deliberate compatibility behavior.

Changing only the projection guard would allow geometry for B while opening A, and would leave camera, lifetime and focus ownership coupled. Do not remove the equality guard until validated occurrence/document bindings replace it. Do not add a plural DTO and describe the feature as implemented while the real native host still follows attention.

## Bounded implementation

### 1. Add binding state and shared actions

Introduce an occurrence-keyed editor-binding collection owned by the existing native Plex session. Keep it separate from view root/branch state, attention, graph selection and focus state. The initial collection enforces a capacity of one.

Each live binding identifies a stable binding incarnation, occurrence ID and intended canonical document. The host captures and revalidates actual native file identity; definitions receive plain identifiers, not a `TFile`, plugin, controller or WorkspaceLeaf. Serializable state contains only bounded intent/preferences; native identity is reacquired and checked after restart. Native editor buffers stay with the existing editor machinery.

Shared expand/collapse/resize actions accept the exact occurrence and document intent, use the existing ActionManager/lifetime fences, and report admission or capacity failures explicitly. Definitions may request those actions; they may not create leaves or editors. Preserve existing Classic command IDs and callbacks through a compatibility adapter.

### 2. Validate and resolve the exact document

For every binding, require a unique admitted occurrence whose canonical node matches the intended document. Reject synthetic groups, absent/filtered-out admission, unsupported targets and stale native file identity. Never substitute attention or another occurrence with the same canonical node.

Use the existing host-side eligibility and canonical lookup owners. The initial non-Classic proof uses genuine Markdown files. Preserve Classic's existing Markdown, attachment/drawing and URL-host behavior through its compatibility policy; do not claim arbitrary-node support for unvalidated target kinds.

Keep attention-following selection and legacy global editor-mode/dimension interpretation behind the compatibility path for Compass and unchanged non-Classic definitions. Opt-in occurrence definitions resolve explicit bindings across attention changes; they do not inherit global editor mode/dimensions.

### 3. Feed occurrence dimensions through shared layout

Supply each expanded occurrence's dimensions in the existing measurement collection before calling layout. Its normal and expanded sizes belong to that occurrence, not one scene-wide editor mode. Two occurrences of B remain independently collapsed/expanded.

Reuse the current native editor implementation/controller under a stable binding/occurrence host identity. Ordinary reflow, resize, camera movement and attention changes must update geometry without reopening the file or remounting the native editor. Host placement must use actual displayed occurrence coordinates, including area scrolling/clipping, rather than assuming a centre outside the scroll areas.

Opening/resizing may reflow nearby nodes. It must retain the map root, branch IDs and camera intent, without an automatic whole-map fit. Keep Classic's present framing behavior behind Classic policy. Rooted view state and root-relative camera/expansion state must not expire merely because attention changes; retain only bounded existing demand leases where necessary, with no new scanner or index scheduler.

### 4. Keep focus and document synchronization explicit

Background open, measurement and resize must not call graph activation, redirect Sidecar or steal focus. Record the actual graph/editor focus owner separately from attention and selected occurrence. Explicit user activation uses shared navigation policy and may change attention while retaining the rooted view and the editor's document.

Preserve the adapter's existing native activation, mobile and popout workarounds. Separate background admission from explicit activation where required; do not delete an existing workaround or make every open implicitly active. Route in-editor links through an explicit shared navigation/rebind policy, never an incidental retarget caused by attention.

### 5. Retire bindings safely

Collapse must flush/close through the existing native editor lifecycle and retire pending work exactly once. A filter may pin a live editor occurrence; an action that would remove it must explicitly collapse/flush it or refuse the removal. It cannot silently retarget or discard the editor. Branch collapse is distinct from editor collapse.

A compatible view transition may retain a binding only if the replacement admits that exact occurrence/document contract. Otherwise block the transition until explicit editor collapse, or perform an explicitly tested close/flush transaction. Teardown, rename, deletion and window migration must preserve existing native save/identity fences and must not resurrect a deleted document. A buffer retained after authoritative hiding and a failed save must remain mounted but concealed and inert, with an accessible shared Close action outside the hidden overlay; restoring visibility must reuse its native instance.

## Required proof before claiming support

Use the actual shared renderer and native host with disposable fixtures. A pure layout or mocked editor is insufficient.

1. Render root R, attention A and an editor bound to occurrence B and B's canonical Markdown file. Open B through a shared action; R and A remain unchanged and Sidecar does not redirect during background open/measurement.
2. Change attention to C. Verify the same R and branch state, B binding, canonical file and native editor instance remain. Graph selection and actual focus ownership are observed independently.
3. Make B genuinely dirty and capture its caret/selection. Reflow and resize B; verify identical native editor instance, unsaved value, caret and native focus, with no implicit whole-map fit or reroot.
4. Display B1 and B2 for the same canonical document. Expanding B1 leaves B2 collapsed. A second-live-editor request hits the explicit capacity-one limit; do not claim multiple simultaneous editors.
5. Exercise explicit collapse, filtering, branch removal, compatible/incompatible view switching, popout/main migration and teardown. Verify saved content, no accidental retarget, no duplicate save/resource ownership, correct cancellation and restored fixture resources.

Retain the existing Classic geometry golden and editor/action/Sidecar tests. Run focused contracts/session/browser tests, real build/types/scanner, applicable exact-build native checks and full verification/CI. Record actual desktop, popout and emulation coverage; physical Windows/phone/tablet acceptance remains separate and must not be inferred.

## Exit and exclusions

Publish a validated shared hosting commit and updated capability matrix before Mind Map/Ideaverse consume arbitrary-node editing. Wu Xing can complete its attention-following editor independently. Until the native proof passes, label it **unsupported / prerequisite pending** in the matrix and handoff.

This task does not implement Mind Map, Ideaverse, a multi-editor workspace, external view loading, new graph/index/storage machinery or a production deployment. It does not resume C15–C26.

## M0 implementation checkpoint — intent owner only

#219 now contains an optional `editorHosting: "occurrence"` policy and per-native-session `PlexEditorBindings`. Omitted policy preserves attention-following definitions. Bindings carry a stable incarnation, exact occurrence, canonical target/native-file token, opening mode and dimensions; capacity is exactly one. Native save success commits explicit close; rejected or stale close transactions retain/cannot retire the wrong binding. Definition changes are conservatively blocked until explicit collapse.

This is not native editor support: shared actions, admitted scene/native validation, rooted geometry/camera/demand and actual native lifecycle remain to be wired and proved. No renderer path is allowed to infer arbitrary-node support merely from the plural collection or policy. Serializable restoration/native reacquisition is also pending.

The next shared scene checkpoint adds `admitOccurrenceEditors` and an optional host proof to `prepareViewScene`: unique occurrence, canonical node/path/native-file token, current cache visibility and native eligibility must all agree. Only the bound occurrence receives expanded measurement (`PlexMeasurement.editor`); duplicate notes remain normal. Lens filtering pins only that occurrence, while authoritative visibility still rejects it. The legacy attention-equality guard and legacy layout boolean remain unchanged; occurrence layouts receive their per-measurement marker instead. Native rendering/lifecycle is still pending.19 focused contract/session/Compass tests, real build, architecture and scanner pass.

The rooted-session checkpoint adds optional `navigation: "rooted"` independently of editor hosting. `PlexViewSession` owns bounded per-definition workspace roots; ordinary attention changes retain the root, camera, selection, grouping and scroll scope. Explicit reroot refuses a live editor. A mounted host can guard proposed branch state before publication; without a current guard, state changes with a live binding are refused. The shared renderer retains one existing root demand lease independently of attention and releases it on scope retirement. `PlexViewInput.layoutRoot` and scene admission enforce the root; root-sized thought styling no longer follows attention in an opted-in rooted scene.

21 focused checks and the actual shared Chromium renderer probe pass, including all previous legacy assertions and explicit useful selection/camera observations through attention change, plus balanced root/attention demand teardown. Actual build/scanner/architecture pass. This is browser/portable rooted-state evidence, not the outstanding native occurrence-editor proof. Native actions/host, close/save/link routing, binding restoration and real R/A/B/C dirty-state acceptance remain pending.


## Native integration interim checkpoint

The optional host now routes shared `editor.expand`, `editor.collapse` and `editor.resize` through the existing session/action/native-controller owners. It validates the exact occurrence and current canonical/native file, measures only that occurrence, keeps a stable native component through ordinary geometry changes, and serializes bounded intent without native tokens. Explicit collapse awaits native save; a rejected save retains the binding. Legacy attention-following definitions need no changes.

Eight actual Mac native cases pass on the runtime identified in the [interim report](validation/occurrence-editors-219-2026-10-25.md). A stronger second run passed the first seven cases and precise clipped placement, then stalled before physical rename inside Obsidian FileManager's metadata-cache-clean gate. Its normal cleanup also timed out; independent guarded restoration succeeded. This is not a passing rename/deletion/teardown result or full M0 acceptance. The next bounded experiment compares that host gate with accepted main; no indexing scheduler change is justified. Full verification and exact-head CI remain pending.


## Validated bounded proof at905b777

Full exact-head `verify:obsidian` and CI475 pass. A fresh-renderer twelve-case native probe passes with exact runtime source hashes, capacity one, ordinary Markdown and normal cleanup. The shared native host is validated for that bounded scope; no production definition opts into it yet. The intermittent native FileManager cache-clean condition after a longer sequence remains causally unproven and is not counted as a passing workflow. See the [final checkpoint and minimized receipts](validation/occurrence-editors-219-2026-10-25.md). Mind Map implementation/actual workflow acceptance follows; Wu Xing remains independent.
