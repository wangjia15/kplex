# Implementing an internal canvas view

Use the [API reference](CANVAS_VIEW_API.md) for exact contracts and limits. This guide describes the current implementation, including optional section conformance; it does not authorize remote view loading or installation.

## Start with the executable example

Read the two complete examples:

- [`core/plex/views/example.ts`](../src/core/plex/views/example.ts): pure measured columns, canonical direct relationships, schema and state reducer.
- [`ui/plexViews/example.ts`](../src/ui/plexViews/example.ts): native settings, captured choices/menu commands and shared live rails.

They import the public entries exclusively and are intentionally absent from production registration. [`tests/support/sectionViewProbe.ts`](../tests/support/sectionViewProbe.ts) demonstrates the optional section boundary and is compiled by the same host-free ES2021 check as core. It is a conformance policy, not a shipping view.

Choose a stable owner-qualified ID such as `org.example.columns`. API version 1 is separate from your configuration and saved-state versions. The view's ID never becomes a module URL or filesystem path.

## Keep the four owners separate

| State | Owner | Example |
| --- | --- | --- |
| Durable view-type configuration | Existing K-Plex settings queue | Category definitions, default region width, schema migrations. |
| Per-canvas intent | Existing view/document session | Selected view/preset, root, bounded fold state and workspace restoration. |
| Temporary interaction/native state | Existing mounted owners | Hover, source leases, native editor, pending dialog and pointer capture. |
| Note content | Existing explicit native actions | Confirmed property assignment or recorded relationship edit. |

Never write `data.json`, read the vault body, create a private editor or start another source scheduler from a definition. A configuration change is presentation work; a genuine note edit retains the normal incremental index path.

## Define projection before layout

A minimal definition supplies identity, capabilities, default/restore state, projection and layout:

```ts
import {
  CANVAS_VIEW_API_VERSION,
  type PlexViewDefinition,
} from "../core/plex/views";

export const definition: PlexViewDefinition = {
  id: "org.example.columns",
  version: CANVAS_VIEW_API_VERSION,
  labelKey: "Example columns",
  icon: "columns-2",
  capabilities: {},
  defaultState: null,
  restoreState: value => value ?? null,
  project(input) {
    if (!input.read.node(input.attention)) return null;
    return {
      attention: input.attention,
      entry: "focus",
      frame: "focus",
      occurrences: [{
        id: "focus", nodeId: input.attention, representation: "thought",
      }],
      edges: [], truncated: false, coverage: input.read.coverage,
    };
  },
  layout(projection, measurements) {
    const focus = measurements.find(row => row.id === projection.entry);
    if (!focus) throw new Error("Missing focus measurement");
    return {
      positions: new Map([[projection.entry, {
        x: 0, y: 0, width: focus.width, height: focus.height,
      }]]),
      areas: [],
    };
  },
};
```

The complete columns example adds actual relations, editor-safe intent and controls. Use catalog keys for shipped copy; user labels use explicit literals. New product copy must be translated in all supported catalogs.

Projection chooses stable occurrences and canonical relationships. Layout places those measured occurrences. Keep node center coordinates distinct from top-left area bounds. Use actual measured editor/badge envelopes and preserve the frame anchor even when it is away from world origin.

## Read only admitted facts

Use `read.node`, bounded `relations`, optional cached `relation`/`scope` and pair `evidence`. Honor current/coverage/truncation. An unavailable scope is not an empty graph or a leaf. Corpus reads are unsupported.

Hierarchies may declare `hierarchy.maximumDepth` from 1 through 20; existing definitions retain 8 when omitted. This bounds displayed occurrence admission and shared ancestor visibility/reference walks. It does not change `maximumScopes`, acquisition or the reader signature. Keep an exposed terminal card visible when another scope/work budget prevents expanding it. Mind Map declares 20 and retains its eight non-root source scopes.

Request property capability only when needed. Available cached fields include a proven missing value; unavailable metadata cannot satisfy a negative condition. The optional field lifetime proof belongs to the current synchronous frame, not saved state.

For advanced rules, use the exported shared parser/compiler and `GraphPredicateEngine.evaluateAvailable`; `evaluatePortablePredicateContexts` implements any-match over actual canonical contexts. Preserve active/suppressed evidence. Do not infer an edge or a center self-link merely because a category needs relationship data.

Candidate fields use `note["phase"]`. The opt-in availability-aware API explicitly supports focused fields such as `this.phase`; fixed `this.name`/`this.path` attributes keep their original meaning. Legacy boolean `matches` retains its prior behavior. Strict equality and case-insensitive text methods are different operations; the new shared rule editor refuses lossy Simple conversion.

Declare bounded `propertyDependencies` if multi-field/evidence evaluation needs the existing read frame's optional budget extension. The host retains numeric argument five for hierarchy and provider argument six for properties. Declaring a dependency never prepares a source or reads its value.

## Retain canonical and occurrence identities

An occurrence ID identifies one displayed instance. A canonical node ID identifies the note. Do not parse IDs to infer paths, file types or semantic roles.

For every semantic connector:

1. Keep exact displayed source/target occurrences.
2. Keep canonical source/target notes and the admitted original relation.
3. Declare physical source/target ports separately.
4. Preserve those identities through filtering, grouping, overflow and clipping.

Decorative guides and hierarchy spines do not gain relationship-edit authority. Use `PlexDecoration` for phase/model guides; do not manufacture semantic evidence. Reuse shared node/link styles and the measured badge/color owners.

## Register once, contribute through the shared UI

Production composition is in `ui/plexViews/builtins.ts` and `settingsContributions.ts`. Add the definition to the existing `PlexViewRegistry` composition and its optional UI contribution to `CanvasViewSettingsRegistry(views, contributions)`. Do not instantiate a replacement registry per view or hard-code another selector option.

The selector is already under **Views and lenses → Canvas view**. Native pages are already under **Settings → K-Plex → Canvas behavior → Views**. Contributions can supply declarative settings, choices, finite native menus and sliders/checkboxes through `layoutControls`.

Commands address either the captured canvas state, this view's configuration or its Settings page. The existing controller captures the canvas that opened the panel; focus changes must not redirect it. Preserve filters, lens definitions and unsaved drafts across selection.

Schema fields declare defaults/validators. A keyed preset collection uses `entries: true` and optionally `inheritEntries: true`; updates address one stable entry with expected-value protection. Use the host queue's scoped writer, not a second save path. Migrations are pure, increasing and idempotent; preserve unknown/future data on failure.

Native managers compose `StyleEditorModal`, `StyleManagerList`, `StyleColorControls` and shared predicate controls through `CanvasViewManagerContext`. The host supplies current/received ownership, scoped saves and exact cleanup. Keep an unsaved draft after rejection; distinguish a durable save with pending refresh from an unsaved failure.

## Declare target meaning, then use existing actions

Area targets explicitly declare navigation, canonical relationship role/origin, property assignment ID or none. Empty geometry has no implied write meaning. Shared drag transport exports/imports native node/file/link payloads, validates exact source occurrence/current proof and routes meaningful center/relationship targets.

Property targets must match declared safe assignments. The shared native preview/effect protects dirty editors, reserved/current semantic fields and exact field values. Do not implement another YAML writer, relink controller or undo store. Classification can stand alone; Connect without assigning uses the existing additive-only composer. Native editor text drops yield to its native owner.

## Choose navigation and editor policies deliberately

Omitting `navigation` and `editorHosting` retains the existing attention-following behavior. Facets uses this policy. Selection, hover, layout, resize and reclassification never independently change the editor document or Sidecar.

The accepted rooted Mind Map policy retains its root for ordinary branch clicks. Explicit search destinations, history, pins, center drops and Alt/Option-click use existing destination navigation. Ctrl/Cmd placeholder creation keeps its reserved behavior. Cycle-reference clicks reveal the earlier occurrence and explain the cycle.

Only the accepted capacity-one Mind Map occurrence host opts into `editorHosting: "occurrence"`. Its native bindings and switching safeguards remain shared. Do not remove the attention-equality guard or invent multiple editors to implement a view. Retain both off-origin framing and rooted/manual/restored camera safeguards.

## Optional sections: reuse the source and renderer

Declare `capabilities.sections: true` and an optional `sectionSource` (`attention`, the compatibility default, or `layout-root` for rooted policies). Use `plexSectionDocument` to resolve the source and `appendPlexSections` for a central-root projection. The existing host owns explicit source loading, cancellation, folding, measurement, rendering and proven physical anchors. Compass follows attention; Mind Map's #222 integration follows only its pinned root, with native acceptance tracked separately. Facets deliberately keeps sections disabled and shows no section toggle. A new opt-in must prove source/geometry/folding/navigation/editor behavior before acceptance.

The host adapts one explicitly expanded document using `createPlexSectionViewContext`. It exposes current source-owned row IDs, hierarchy/ranges/visibility and projected canonical provenance, with native file/stat lifetime proof. It does not scan headings again. Missing/oversized/retired source remains unavailable; body acquisition occurs only through the existing explicit source operation.

Emit ordinary section occurrences using `section: {documentId, revision, sectionId}` and the snapshot document as canonical `nodeId`. Layout consumes their normal shared measurements. Repeated labels are not IDs. Section rows are not new persistent notes or native editor bindings.

For an outgoing root connector, `plexSectionAnchor(snapshot, target, role)` chooses the lowest common visible source ancestor. Preamble or separate-root declarations use the aggregate header. The adapter validates any `sourceSection` against this current provenance. Physical source occurrence changes never replace canonical occurrence/note/action identity. Initial support is root-source attachment on either physical side; reverse-target attachment is unavailable.

Reuse shared folding/tree drawing. Editing, rename, deletion, reused native identity and revision changes must retire or rebind anchors. Existing editor presence declines outline replacement without closing, retargeting or saving that editor. Full rooted Mind Map section/navigation/editor integration remains a separate production follow-up.

## Verification and review

Use Node **22.22.2**, installed dependencies and the real production build/scanner. The core check includes the executable section policy under ES2021 without DOM/Node globals. Run the affected API/configuration/selector/lifetime/rule/measurement tests, then repository `npm run verify` and applicable exact-build Windows lanes serially in the authorized disposable environment.

Review three risks first: stale captured canvas/configuration owners; wrong canonical/physical source identity; and editor/camera/Sidecar behavior across main/popout restoration. Assert bounded reads and zero source acquisition/body parsing/semantic rebuilds for presentation changes. Do not weaken existing scaling guards or hide known #215 baseline failures. Report missing Mac/physical-mobile/minimum-host coverage honestly.

[Current receipts and limitations](validation/facets-220-2026-10-25.md) distinguish browser conformance from Windows acceptance. Keep PR #220 draft/open until expanded implementation and validation are complete; no merge or release is authorized.


### Numeric configuration controls

Declare numeric native preferences as bounded `slider` controls with `min`, `max` and `step`. The shared Settings adapter mounts their permanent value readout and preserves the captured queued writer. React view contributions reuse `CanvasViewLayoutControls`/`LayoutSlider`; native custom preset editors reuse `numberSlider`. Optional overrides use `styleNumberSlider`, with an effective inherited value and explicit reset, never a blank number field. No custom numeric text box or private range input is permitted. The repository-wide guard in `npm run check:architecture` enforces the shared owners.
