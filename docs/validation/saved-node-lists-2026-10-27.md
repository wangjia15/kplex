# History and Pinned Nodes

PR #222 was merged by explicit maintainer instruction at 35dccd595861406d31e4f8a709def4c225cb13e1, from head 22e06ff. GitHub reported clean/mergeable and no final-head check runs; previous focused/native results and the deferred full regression remain accurately attributed. This enhancement starts from that accepted main on `2026-10-27-history-pins-node-styles`, initial checkpoint 782ee8e.

History and pins now pass live paint settings to the existing saved-row presentation owner. It reuses `resolveNodeStyle`, `nodePaint` and native kind fallbacks, preserving type/tag precedence, colors, patterns, borders, prefixes and configured icons. Saved references have no invented relationship/central treatment. Compact dimensions remain list-owned. Active and hover affordances remain separate from configured paint; the existing relationship-drop box shadow remains visible.

History's shared horizontal scroll component admits only plain primary-mouse gestures after 5px of horizontal movement. It captures committed drags, suppresses their pointer-generated click, and retires on release/cancel/lost capture, owner-window blur and unmount. Native touch/pen, wheel, keyboard and stationary clicks remain available. A new pointer press retires stale click suppression, including touch after a cancelled mouse gesture. Listeners belong to the mounted element's document, including secondary-window documents. No source reader, parser, renderer application, settings writer or navigation owner was introduced.

## Actual checks

Node 22.22.2, real dependencies: **42/42 focused tests pass** across saved-node lists, center recovery/loading history slots, structural saved-list drops and Footprints. Five new browser cases render production History/pin JSX and actual presentation/scroll owners; verify kind/type/tag precedence, inherited prefix after override removal, live paint, 180px history width, trusted mouse drag versus click/Enter, touch passthrough, cancellation/unmount, a second document's listener cleanup and mouse-to-touch cancellation recovery. Existing saved identity, navigation and structural relationship assertions remain unchanged.

Final real production build and installed Obsidian types, full official CodeScanner and architecture checks pass: 9 architecture tests, 212 migrated roots, 393 reachable files, zero violations. The numeric-controls audit still covers 183 UI/settings sources. Full regression remains deferred under the maintainer's focused-change instruction; no unavailable run is represented as a pass.

**Exact-build Windows native sample 26: 3/3 passed.** Actual App History/pin chips show the configured type fill, text, border, icon and prefix; a trusted primary-mouse drag scrolls 60px without changing the center or retaining pointer capture; the existing style writer updates both lists without navigation. No notes were created or edited. [Reviewed native screenshot](saved-node-lists-native.png) and [sanitized receipt](saved-node-lists-native-summary.json).

Earlier native setup/capture corrections are not product passes: sample 22 accidentally chose a Help-specific staging lane without its payload; 23/24 omitted Electron's required held-button modifier during mouse movement; 25 asserted capture retirement before its queued mouse-up was delivered. Sample 26 uses the explicit held-button modifier and waits for actual release before checking navigation. Each attempt restored Small independently. Final restoration at **2026-10-27T15:25:57.919Z**: 9 configuration resources, 117 content resources, original workspace/window, content digest `7bdaf015f88c6ee1945410755a5aaccf7e04408fe597e729cafca24c5bc332ba`.

Main SHA256: `f797c965f47afcf9eda0b2af12c1094335e026be7448429e740ea5aa7a731f65`. Styles: `f205d6e8b16494817de3abe8a07f15cfd1b96dec83fac6a772f5092d739d9857`. Manifest remains 0.3.0, SHA256 `49596950b87caaf2fddaf0f58e826287c67d0e0998d3b69905c2ec298fd8b350`.

Keep enhancement PR #225 and Help #4 open and unmerged. No release or production-vault deployment. Later platform acceptance should check real mouse grabbing in a macOS popout and physical touch scrolling after mouse cancellation on a hybrid device. Browser secondary-document coverage is not a native popout migration claim.

## Help deployment

Implementation [9b38d81](https://github.com/zsviczian/kplex/commit/9b38d81bbcca8eeb6dc5e6d18d2cac052c48b1f7) is pushed and remote-verified. [Help 366b263](https://github.com/zsviczian/kplex-help/commit/366b2631217696bc0666a8cdd02f18cd3010b07c) contains the exact final main.js/styles.css and a short explanation in the existing Past nodes and pins guide. Manifest already matches 0.3.0.

Help-only plugin reload completed at 2026-10-27T15:27:29.003Z after verifying no open modal draft. Current leaf, center, Facets/help-workbench, 37 cards and camera x/scale were retained. Native pane height settled from 954.23 to 952.57px; the shared automatic camera settled y from 477 to 476.5px. No navigation or runtime note edits occurred. User-owned data.json/workspace.json remain excluded. This is deployment/reload evidence; the 3-case interaction acceptance belongs to disposable Small.
