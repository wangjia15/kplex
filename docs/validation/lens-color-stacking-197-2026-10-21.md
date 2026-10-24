# Lens color editor stacking — issue #197

## Problem and change

Issue [#197](https://github.com/zsviczian/kplex/issues/197) reports that a Graph Lens color editor
opens behind **Filters and lenses**. At base `b0fc3cb`, the filter's body portal had a hard-coded
`z-index: 100000`; native Obsidian modal containers use `--layer-modal` (50 in the tested host).
Dragging the filter exposes the editor but does not correct the stacking order.

The filter now uses `var(--layer-popover, 30)`. It still escapes workspace-pane clipping through
its existing owning-document body portal, while native modals, backdrops and suggestion dialogs
retain their host-defined layers. No modal, focus, dismissal, graph or saved-settings behavior is
reimplemented. The existing tooltip rules are unchanged.

## Regression and native checks

The existing nested-editor Chromium regression in `tests/color-editors.test.mjs` now loads the
actual stylesheet and models a native modal container. It requires the lens panel and the color
input to overlap, then checks `elementFromPoint()` at the input before exercising pointer and
Escape ownership. It fails with **Lens panel covers the native color input** on the old CSS and
passes with the corrected layer, including on Node 22.22.2.

`scripts/testing/obsidian/lensColorStacking.mjs` uses the shared controlled native harness, explicit
Small-vault identity checks and exact artifact hashes. It reproduces **Lens panel overtook native
modal** against the installed baseline, with successful cleanup. The corrected build passes:

- Fill, border and text editors in both the main window and an independent native popout.
- Real native modal-container ordering and hit-tested controls activated by Electron mouse input.
- Theme chooser input and nested Escape, Use color applying the exact alpha value to the local lens
  draft, color Cancel/Escape, parent Escape and outside dismissal. Source modes and color text use
  DOM form events; actual pointer/key activation uses native Electron input.
- No saved lens changes, no note fixtures, restored workspace/settings/enablement and removed
  temporary controller ownership. The harness verifies the original settings/enablement bytes.

The settled main-window and popout screenshots were visually inspected: the complete color dialog and its
backdrop appear above the lens panel. Screenshots and reports remain private in the test receipts.

## Verification status

Windows, Obsidian 1.14.4 (installer 1.14.0), installed Obsidian typings 1.13.0. The native functional
runs passed on Node 22.22.3 and 22.22.2. A temporary official Node 22.22.2 executable was downloaded
and verified against the published SHA-256 manifest for the repository's exact acceptance lane.

- Real TypeScript/production build passed; official Obsidian lint, release, architecture and core
  checks passed before the aggregate test lane.
- Initial full verification attempts on Node 22.22.3 failed the unchanged snapshot watchdog cleanup
  assertion at `tests/indexing.test.mjs:3478` (one timer, expected zero). This assertion was already
  reproduced on unchanged source during the preceding task. No assertion or timing was weakened.
- Final `npm run verify:obsidian` passed on pinned Node 22.22.2, including the unchanged watchdog
  assertion. The four main test batches passed 1,267 / 227 / 334 / 654 tests; architecture/core add
  137, for 2,619 reported passing tests with no skips. The strengthened color-editor regression
  passed both independently and within that full run. Production build, exact-hash staging,
  plugin reload and native rendered-state/error assertions passed.
- The final focused native driver passed on Node 22.22.2 with all six main/popout color cases,
  successful local-draft application and successful cleanup. Earlier fixed-build native checks
  also passed on 22.22.3. These observations do not establish why the earlier intermittent
  watchdog assertion failed.
- `git diff --check` and native-driver syntax checks passed. Generated artifacts are not tracked.

Production main SHA-256: `3b96f51e8b734bd622fb0034f1e17682efb17eda8b6caed6e2d69ac7bd05e5f3`.
Styles SHA-256: `88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974`.

## Limits

This checks Windows native main/popout behavior. It does not establish physical mobile touch,
macOS behavior, custom community-theme overrides, or migration of an existing leaf between
windows. The browser fixture complements native checks; its modal shell is a finite test double.
