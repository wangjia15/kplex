# Navigation and embedded drawing fit — 2026-10-11

Maintainer-requested follow-up to [Wander](wander-2026-10-11.md) and [shared tooltips/canvas menu](control-tooltips-and-canvas-menu-2026-10-11.md). Return remains uncommitted on `plex-wandering`, base `85edbbc8ea505651610674bded3375764ad690fa`. C14 remains accepted; C15–C26 remain paused. No commit, publication, dependency/version change or release was requested.

## Behavior and ownership

- **Auto fit on navigation** centers the central node and fits symmetric displayed extents around that node. Asymmetric neighborhoods no longer center their bounding-box midpoint. Bounded zone viewports contribute their visible boxes, rather than the coordinates of offscreen overflow rows. Automatic fit can go below the manual wheel minimum when necessary to contain a large scene/editor.
- Navigation and explicit **Fit graph** establish automatic camera ownership for that center. Subsequent geometry publications and ordinary pane resizes follow that fit while the camera remains unchanged. Manual camera application retires ownership, including zoom buttons, pan actions, wheel and drag/pinch paths through the existing camera owner. Returning to the old coordinates does not renew it. Manual input during an initially empty neighborhood survives its first loaded nodes. Fluid editor-frame changes do not revive retired ownership.
- With auto fit disabled, navigation retains the existing zoom and recenters. Deliberate display/presentation transitions preserve their existing camera policy; maximized editors retain their separate sizing behavior.
- With **Fit drawings when opening an editor node** enabled, an untouched normal editor-node drawing in actual Excalidraw view mode requests the companion's native fit again when its native API viewport changes size. Two owning-window frames coalesce resize and let native layout settle. The coordinator checks the exact current view, readiness, mode, dimensions and live setting before fitting.
- Pointer, wheel or keyboard input within the native drawing conservatively retires resize fitting until another opening/representation session. A changed native drawing camera also retires it, covering programmatic manual zoom/pan. Own fit recording is generation-fenced so a superseding resize does not mistake the fit for manual input. Edit mode, disabled fitting, maximized editor and native fullscreen are excluded. Original opening fit and the companion's own resize preferences remain intact.
- `PlexGraph` retains the camera/layout owner; pure focal-point math lives in `src/ui/components/viewportFit.ts`. `EmbeddedDrawingFit` owns only cancellable native resize-fit state. `embeddedMarkdownLeaf` supplies existing native view/Automate capabilities, registers exact input listeners and disposes them with the mount. No index scheduler, graph meaning, store/schema, persisted key, network request or product diagnostic API was added.

**Customized native transforms and pointer mapping were preserved.** `syncCentralEditorOverlay`, `toWorld` and all three native-fullscreen geometry functions have identical bodies to HEAD. Styles are unchanged from the preceding tooltip return. Native Excalidraw and Obsidian Canvas remain outside the graph camera's scaled subtree; no Canvas adapter or native geometry formula was changed. AST/body comparison receipt: `/private/tmp/kplex-auto-fit-geometry-preserved.json`.

The existing companion Automate `getExcalidrawAPI()` and `viewZoomToFit()` implementation and loading preconditions were inspected locally. Current state comes from the public [Excalidraw imperative API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api). K-Plex reuses native scene-fitting/safety limits rather than duplicating drawing fit math. No new fork API or package handoff is required.

## Validation

Environment: Node **22.22.2**, macOS/Darwin 23.5.0, Obsidian **1.14.4 (installer 1.14.0)**, installed Obsidian API types 1.13.0 and real Chromium. Native drivers ran serially in the explicitly selected disposable `kplex-test-small` vault with original renderer throttling.

| Check | Result / receipt |
| --- | --- |
| Full `npm run verify:obsidian` | PASS: architecture **7**, core **88**, aggregate **626**, UI **53**, portable sources **333**, real IndexedDB **428**, official lint, installed-type production build, exact stage/native smoke. `/private/tmp/kplex-auto-fit-full-2/report.json` and `-2.log`. |
| Final affected tests | PASS **83/83**: viewport fit **8**, native adapter wiring **29**, relationship actions **46**. `/private/tmp/kplex-auto-fit-final-focused-2.log`. |
| Final official lint | PASS, no findings; `/private/tmp/kplex-auto-fit-final-lint-2.log`. |
| Final real production build | PASS installed-type check and build; `/private/tmp/kplex-auto-fit-final-comment-build.log`. Final TSDoc-only edit emitted identical artifact bytes. |
| Native graph fit | PASS **7/7**, cleaned true, no captured errors; `/private/tmp/kplex-auto-fit-native-2/auto-fit-native.json`. |
| Native embedded drawing | PASS **27/27**, configuration/cleanup restored, no captured errors; `/private/tmp/kplex-auto-fit-embedded-2/report.json`. |
| Native Wander regression | PASS **17/17**, cleaned true, no captured errors; `/private/tmp/kplex-auto-fit-wander-final/wander-native.json`. |
| Final read-only audit | PASS exact installed/build bytes, restored native state and no owned fixtures/probes/UI; `/private/tmp/kplex-auto-fit-final-audit.json`. |

Full aggregate/UI arguments were frozen before the final initially-empty-camera, fluid-editor-resize and native-loading guards. Its later production build/stage/smoke consumed the final runtime implementation. The final affected 83 tests, lint and native lanes cover those guards; do not describe the frozen full-suite results as a complete rerun of final source. Semantic/source/storage implementations were unchanged. The subsequent comment-only edit was rebuilt and proved byte-identical. Historical tooltip/menu and broad UX evidence remains in its own records.

Pure tests compile actual focal-point math, graph camera/layout callbacks and the native coordinator. They cover asymmetric focus, bounded overflow, late growth, manual retirement/return to old coordinates, navigation/explicit-fit renewal, initially empty scenes, fluid editor frames, resize coalescing, post-fit recording races, current-owner eligibility, stale generations and disposal. Native adapter tests exercise actual mounting/wiring with finite host doubles. Existing relationship/display-mode assertions remain intact; explicit fixture bindings and indexing-test transpile dependencies were updated for the new owners.

Native graph testing uses ordinary frontmatter/metadata/source publication without forcing an index flush. Twelve late parents changed fitted scale from **1.206900 to 0.658763** while keeping the center at **(536, 315.5)**. Manual zoom/pan survived later friends. Explicit Fit and a new navigation renewed fitting. The final wheel gate requires actual zoom movement; its **2.941300** camera survived later children and pane resize. Auto-fit-off navigation retained scale. The bounded native list case retained the same extents after more rows; pure tests separately establish renewal when extents grow and ignore an overflow row at world y=50,000.

Native drawing testing retains all **21** opening/maximize/native-preference scenarios and adds **6** resize cases. Untouched reading-mode fits at **462.2578125 × 386** and **534 × 446** exactly matched the native fit reference at zoom **0.548931** and **0.634125**, including native scroll values. Manual API camera **0.55 / 123 / -47** survived Plex zoom. A trusted middle-button **30 × 10 px** pan at non-unit Plex zoom mapped to the expected native scroll change (under 1 px tolerance), and its camera survived a subsequent frame resize. Native canvas rectangles matched unscaled client dimensions and had no transformed ancestors. Edit and disabled-fit cases received no K-Plex resize fit. Companion-native resize preference remained separately covered.

Actual API/DOM geometry and Electron input establish functional behavior, not perceived paint, physical touch or every platform lifecycle. Preview switching uses the real toolbar callback; manual API pan is separately identified from trusted pointer pan. The new graph/drawing probes are main-window checks; the unchanged Wander regression supplies two-way popout retirement/navigation coverage. Owner-scoped scheduling and pure cancellation checks do not claim a new native popout drawing-resize test. No new large-vault native graph-fit benchmark was run; the full real IndexedDB lane is storage evidence, not native graph paint evidence.

Reproduce after exact staging with the three explicit disposable-vault variables documented in CONTRIBUTING and a fresh `KPLEX_HOST_REPORT_DIR` per run:

```bash
npm run verify:obsidian:adaptive-fit
KPLEX_EXPECT_ZOOM_POLICY=1 npm run verify:obsidian:embedded-zoom
npm run verify:obsidian:wander
```

## Failed or superseded attempts

- Initial focused browser tests hit sandbox loopback permission failures; actual Chromium reran with the needed environment capability. Callback extraction initially selected an unrelated layout binding; the test now selects the actual declaration/useLayoutEffect body. Original assertions remain intact.
- First full verify failed because the indexing fixture's explicit TypeScript input list omitted the two new imports. Added those dependencies and reran the full lane successfully. Failed receipt: `/private/tmp/kplex-auto-fit-full-1/report.json`.
- Native graph 1 passed seven scenarios, but wheel input could hit the zoom ceiling without moving. The final driver first zooms out and requires an observed wheel scale change; native 2 passed. Receipt 1 remains in `/private/tmp/kplex-auto-fit-native-1/auto-fit-native.json`.
- Native drawing 1 passed the first fifteen cases, then failed its input-location gate: the first static canvas/corner point was not the interactive hit target. The driver now chooses a verified interior native canvas hit target for the entire pan path. No product transform change, weakened pan assertion or deadline extension. Cleanup passed. Failed receipt: `/private/tmp/kplex-auto-fit-embedded-1/report.json`; native 2 passed all twenty-seven.

## Exact return and remaining checks

| Built/installed artifact | SHA-256 |
| --- | --- |
| `main.js` | `81c69f9799bc681766269bd8f2e9c01554479702eae270a196128027b9c794bf` |
| `styles.css` | `d15a037e214cab29e303054061b83b197701cfb7dfb2117308aeaa52e62765b2` |
| unchanged `manifest.json` / 0.1.2 | `0beacdb94adc4a0ec318d69dba87fcb4dc9c1a86784058db341fdefe0dfb4250` |

Combined return: **40 runtime/test/config inputs**, canonical path/content ledger digest **`438b66dce1bf3743fbec69037c1065b64e4c577fcc1aa4c7f2d07bbade383e3a`**, `/private/tmp/kplex-auto-fit-source-ledger.json`. Relative to the preceding 30-input return, ten additional inputs are the adaptive native driver, extended embeddedZoom driver, EmbeddedDrawingFit, embeddedMarkdownLeaf, CentralNodeEditor, viewportFit, viewport-fit tests, display-mode tests, embedded-Markdown tests and indexing tests. Existing graph, language, package and relationship-test inputs also changed. Nine documentation files make **49 deliverable files**. HEAD/base unchanged, index empty, whitespace check passed; generated and ignored artifacts are excluded.

Final audit: K-Plex and Excalidraw loaded/enabled in live and persisted state; desktop **1440 × 875 at (0,25)**, original throttling true, **74** Markdown files, original background **#0c3e6aff** restored, no owned fixtures, globals, Wander controls, tooltips, dialogs, Settings or fullscreen host. Per-driver workspace/settings/native-wrapper teardown passed. Implementation and available automated validation are complete; no remaining implementation ETA.

Prioritized manual checks:

1. Physical Android/iOS: navigate while neighbors load, manually pinch/pan Plex and a view-mode drawing, then resize; user-adjusted cameras must stay put. Confirm ordinary drawing/editor touch activation and existing long-press controls.
2. Windows/community themes, narrow/docked Plex and a popout drawing: untouched view-mode drawings refit on frame changes, manual drawing input stops fitting, and pointer placement stays aligned at non-unit Plex zoom. Inspect perceived movement; native main-window geometry does not prove subjective paint or physical platform behavior. Earlier OS menu/color-picker and Wander large-vault limits remain in their records.
