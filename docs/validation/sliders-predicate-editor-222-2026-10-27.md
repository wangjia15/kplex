# Latest slider values and shared predicate expression editor

Starting checkpoint c18efc89a7dc5d76d161174d0772078f48e38d43 on the existing PR222 branch. No change to classification, predicate parsing, source acquisition, measurements, canonical relationships or native editor ownership.

## Behavior

The shared LayoutSlider immediately displays its newest local input. An asynchronous callback finishes before another begins; only the newest unstarted value is retained. Intermediate positions do not enter the existing settings writer. Axes remain independent; synchronous controls retain synchronous callbacks. Closing the rail retires UI updates but finishes its latest explicit intent when its captured canvas/view target is still current. View/root/state retirement rejects stale work through the existing writer guard. Normal save errors keep their existing actionable Notice and committed value; no automatic retry loop or competing persistence owner.

CanvasViewLayoutControls keeps registered numeric limits/formatters, shared controls and queued settings writes. Compass's existing synchronous/debounced local preview path remains. All registered view sliders use the same delivery component; browser cases cover both Mind Map density axes and Facets region width.

PredicateExpressionField is the shared Code field for lenses and Facets category rules: label above a full-width, vertically resizable, themed monospace textarea. The original Simple/Code editor, parser, validation, native preset draft and atomic writer remain. Property name/assignment and value mapping controls appear only for relevant sources, retaining hidden draft values when switching back. No new strings or translations.

## Checks

Node22.22.2 / real installed dependencies:

- 48 focused tests PASS: latest-slider-value, layout-control-touch, layout-control-touch-browser, canvas-view-settings, facets-manager-browser, predicate-conditions-browser.
- Three actual shared-renderer browser cases PASS: Mind Map vertical/horizontal density and Facets region width. Eight trusted native range key events produce exactly first/latest writes; older completion cannot rewind the thumb. Final focus, center DOM, attention, camera and body/scan/source acquisition counters remain unchanged.
- Native-manager browser checks at960/620/360px verify full width below the label, monospace/readable height, mounted typing/focus, hidden source field restoration and Cancel without save.
- Real production build / installed Obsidian types, full official Obsidian scanner and architecture7tests/211roots/391reachable files/0violations PASS.

The first scanner run found a Promise-returning discrete checkbox callback; the callback now explicitly discards its already-owned promise, then build/scanner/architecture pass. Earlier fixture setup corrections are test-only (native dropdown change event and initial view-session revision synchronization); no production assertions/deadlines weakened.

Implementation [982969f](https://github.com/zsviczian/kplex/commit/982969f4ad420a83daef7220366bafc8ea57f72f) is pushed and remote-verified. Exact-build Windows native13 PASS14/14 on Obsidian1.14.5 (installer1.14.0), Electron43.3.0 / Chromium150.0.7871.212 / hostNode24.18.1. The registered rule preset modal has a full-width monospace editor below its label. Its [native screenshot](sliders-predicate-editor-222-native.png) was visually reviewed; no preset saved. Four Help classifiers, canonical Child?12 for140notes, shared statuses and continuations also pass.

Native12 queried React controls immediately after the native modal appeared, before Code mounting. The driver now waits for the actual shared rule editor, retaining deadlines/assertions and the same runtime artifact. Native13 passes. Both attempts restored test-owned resources; final restoration2026-10-27T10:12:43.246Z,9config/117content/original workspace/window/digest7bdaf015f88c6ee1945410755a5aaccf7e04408fe597e729cafca24c5bc332ba.

Main SHA2564510b41b55ba4fb70c82f30c5e0c6523513b70adc9ba33e1605e08f57e4300ac; styles3ba547e73c2d7bd155c01ade34d0ee0711960e4c672ebef71b37d5a41d663c19; manifest0.3.0 unchanged49596950b87caaf2fddaf0f58e826287c67d0e0998d3b69905c2ec298fd8b350.

Exact artifacts copied byte-for-byte to verified Help checkout and only K-Plex reloaded. No open modal/draft existed. Current leaf/center/Facets/help-workbench preset and camera retained; root visible without navigation. Initial35cards is a hydration transient, not a complete count claim. User-owned Help settings/workspace and all notes preserved/excluded. Production untouched. [Sanitized receipts](sliders-predicate-editor-222-native-summary.json). Full regression/CI remains deferred. Both source222 and Help4 remain draft/open/unmerged. Physical mobile/macOS/minimum-host and known215 limitations remain separate; these checks do not certify those environments.


Help artifact checkpoint [399be1c](https://github.com/zsviczian/kplex-help/commit/399be1c21cabf6b3781a2a7b5c15f6a47291cbc0) is pushed and remote-verified. Only main.js/styles.css changed; manifest already matches0.3.0. User-owned data.json/workspace.json remain outside the commit.
