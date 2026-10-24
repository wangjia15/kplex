# Shared tooltips and canvas menu — 2026-10-11

Maintainer-requested follow-up to [Wander acceptance](wander-2026-10-11.md), returned uncommitted on `plex-wandering` at base `85edbbc8ea505651610674bded3375764ad690fa`. C14 remains accepted; C15–C26 remain paused. No commit, publication, PR, merge, version bump or release was requested.

The later [navigation/drawing fit return](adaptive-fit-2026-10-11.md) supersedes this record's final artifact and combined source inventory. Tooltip/menu evidence below remains historical; styles and custom native pointer geometry are unchanged in that follow-up.

## Delivered behavior and ownership

- Shared control hints wait **650 ms on every mouse hover**, including immediately after another hint. Obsidian's themed tooltip surface/arrow supplies appearance. Placement prefers below, flips above at the window or caller-marked canvas boundary, keeps an 8 px gap and cannot intercept input. When neither side fits, no hint covers the control.
- Exit, press, scroll, Escape, blur, resize, removal and final document release cancel hover work. Existing 450 ms touch long-press/synthesized-click suppression stays separate from ordinary clicks, taps and slider drags. Sliders use wrapper help while retaining a concise input name; portalled filters/suggesters share the owner. Participating controls have no competing browser `title`.
- The Plex region retains its accessible name through a clipped `aria-labelledby` label. Hovering the canvas no longer produces “K-Plex.”
- Bare-canvas native menu: **Wander**, **K-Plex settings**, checked **Zen mode**, checked **Full-screen mode** on desktop, **Set background color…**, separator, **Report a bug** last. Existing node/relationship menu ownership is preserved.
- The native color dialog has explicit **Save**/**Cancel**, a local draft and guarded async Save. Unchanged Save preserves existing alpha; changed colors follow the existing Settings opaque-color policy. Persistence uses the canonical presentation-settings writer. Cancel/close/detached callbacks cannot commit an unstarted draft; repeated Save cannot overlap writes.
- Settings, display-mode actions and support reuse existing flows. Report is invoked synchronously with the exact canvas/surface, preserving clipboard user activation. No report is submitted automatically.

**Fit graph**, **Configure layout**, and **Filters and Graph Lenses** were recommended as future menu additions and are outside this implementation.

The public [Obsidian API declarations](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts) expose tooltip `delay`, `placement`, `gap` and `classes`. Installed types and the Obsidian 1.14.4 runtime were inspected. In that runtime, a visible/recently closed hint bypasses the fresh-hover delay, and bottom positioning clamps within the window instead of flipping away from the control. The public display API returns no tooltip handle for owner teardown. These are observed runtime details, not guarantees about future hosts.

The existing `LongPressTooltip` document owner was extended with mouse timing and measured placement, reusing `.tooltip`/`.tooltip-arrow`. Scoped `--no-tooltip` suppresses competing automatic aria hints only on participating controls. The canvas uses accessible `aria-labelledby` naming instead. A graph-area boundary prevents bottom controls from treating the history bar beneath the canvas as available space. Reference-counted owning-document leases release exact listeners, timers, observer and tooltip DOM, including popout migration. No product debug accessor, new persisted key, semantic/index/store/schema change, dependency change or network call was introduced.

## Validation and exact scope

Environment: Node **22.22.2**, macOS/Darwin 23.5.0, Chrome 154, Obsidian **1.14.4 (installer 1.14.0)**, installed Obsidian API types 1.13.0. Native checks used only the explicitly selected disposable `kplex-test-small` vault.

| Check | Result / receipt |
| --- | --- |
| Full `npm run verify:obsidian` | PASS: architecture 7, core 88, aggregate 613, UI 52, portable sources 333, real IndexedDB 428, official lint, actual production build, exact staging/native smoke. `/private/tmp/kplex-tooltip-verify-3/report.json` and `-3.log`. |
| Final affected checks | PASS: tooltip browser 5 + menu/dialog 4 + localization 19 = **28/28**; `/private/tmp/kplex-tooltip-final-focused.log`. |
| Final architecture | PASS **7/7**, no violations; `/private/tmp/kplex-tooltip-final-architecture.log`. |
| Final official lint | PASS, no findings; `/private/tmp/kplex-tooltip-final-lint-2.log`. |
| Final real build | PASS installed-type check and production build; `/private/tmp/kplex-tooltip-final-build.log`. |
| Exact final staging | PASS; `/private/tmp/kplex-tooltip-final-stage/stage.json`. |
| Final native tooltip/menu | PASS **18/18**, cleanup true, no captured errors; `/private/tmp/kplex-tooltip-native-4/control-tooltips-native.json`. |
| Final native Wander | PASS **17/17**, cleaned true, no captured errors; `/private/tmp/kplex-tooltip-wander-regression/wander-native.json`. |
| Final read-only cleanup audit | PASS; `/private/tmp/kplex-tooltip-final-audit.json`. |

Full verification preceded the final caller-marked canvas-boundary correction, and its frozen aggregate arguments predated registration of four menu tests. Do not describe that full-suite receipt as an exact final-artifact run. Final affected tests, official lint, production build and native acceptance were rerun after the correction. Unaffected semantic/source/storage code was unchanged. Earlier broader UX results in the Wander record remain historical, not a new final-artifact run.

Browser tests compile the actual shared owner and use real DOM/geometry for fresh/warm timing, placement/bounds, canvas boundary, wrapper help, ordinary activation, touch long-press consumption, removal, leases and cleanup. Menu/dialog tests compile the actual builder/modal with finite native component doubles for order, platform availability, checked state, synchronous support routing, draft cancellation, retired callbacks, alpha preservation and serialized Save. The existing rename fixture now supplies the finite `renderedCenterGates` binding required by the earlier Wander readiness change; its original assertions are preserved.

Native acceptance used trusted Electron mouse input in each control's owning window. Measured appearances were **668–689 ms**. Top toolbar/portalled filter hints appeared below; zoom, Wander and layout hints appeared above without overlap, duplicate hints or input interception. Accessible canvas naming/no-tooltip and all menu flows passed. Background Cancel left settings intact; Save persisted and rendered the selected color. Popout and returned-main hints passed; retired documents retained no tooltip.

Context menus were opened through the production DOM callback with synthetic context input, using Obsidian's DOM menu backend; item selections used trusted pointer input. Color input/change events exercised the real native component; the OS color-picker window was not automated. Support was wrapped only at its existing entry point to assert synchronous origin/surface routing without clipboard/external navigation. This does not establish OS-native menu activation, physical touch or perceived paint.

Reproduce against an exactly staged build using Node 22.22.2 and a fresh report directory for each invocation:

```bash
KPLEX_TEST_VAULT_NAME=kplex-test-small \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test-small \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test-small/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-tooltip-native-new \
npm run verify:obsidian:tooltips

KPLEX_TEST_VAULT_NAME=kplex-test-small \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test-small \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test-small/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-tooltip-wander-new \
npm run verify:obsidian:wander
```

## Failed attempts retained

An initial type/lint failure from a misplaced observer declaration was fixed before deployment. Browser fixture binding failures and full-verification failures remain in `/private/tmp/kplex-tooltip-verify/report.json`, `/private/tmp/kplex-tooltip-verify-2/report.json` and their logs. The second full run found the wrong fixture bundle export and the missing earlier-Wander `renderedCenterGates` binding; correcting fixture dependencies preserved assertions, then the third full run passed.

- Native 1: canvas passed; an incorrect toolbar selector failed. Driver corrected; `/private/tmp/kplex-tooltip-native-1/control-tooltips-native.json`.
- Native 2: canvas/top passed; zoom placement used the whole-window budget. Product placement was corrected to honor the canvas boundary, with a browser regression, rebuild and exact stage; `/private/tmp/kplex-tooltip-native-2/control-tooltips-native.json`.
- Native 3: sixteen scenarios, including all menus and popout, passed; returned-main pointer entry timed out. The driver now awaits remount readiness/foreground and moves outside before re-entering the replacement control. No product workaround or relaxed timing/deadline assertions. Native 4 passed all eighteen; `/private/tmp/kplex-tooltip-native-3/control-tooltips-native.json`.

## Final identity and cleanup

Built and installed bytes match:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `e0bc3692cff008596c566ef48cf294f7f66d0a8cdabba9ebdd2d2a2c86fcbba0` |
| `styles.css` | `d15a037e214cab29e303054061b83b197701cfb7dfb2117308aeaa52e62765b2` |
| unchanged `manifest.json` / 0.1.2 | `0beacdb94adc4a0ec318d69dba87fcb4dc9c1a86784058db341fdefe0dfb4250` |

The combined uncommitted return has **30 runtime/test/config inputs**. Sorted path/content SHA-256 ledger: `/private/tmp/kplex-tooltip-source-ledger.json`; canonical input-list digest `96fffc7bb2381eeea098f46dc41a2c137e14df22cba8575b8b8476c4f2923aa5`. HEAD/base is unchanged; index empty. No generated output or ignored assignment is included.

The [original Wander inventory](wander-2026-10-11.md) contributes 20 inputs. Ten additional inputs are `scripts/testing/obsidian/controlTooltips.mjs`, `src/ui/LongPressTooltip.ts`, `src/ui/PlexBackgroundModal.ts`, `src/ui/PlexFilter.tsx`, `src/ui/components/FuzzySuggester.tsx`, `src/ui/components/LayoutSlider.tsx`, `src/ui/plexContextMenu.ts`, `tests/canvas-menu.test.mjs`, `tests/control-tooltips.test.mjs`, and `tests/ui-components.test.mjs`. Existing `package.json`, `App.tsx`, `PlexGraph.tsx`, `en.ts` and `styles.css` also changed in the follow-up. Eight documentation files make **38 deliverable files**: README, CONTRIBUTING, HANDOFF, Refactor plan, ACTION_INVENTORY, LOCALIZATION, the original Wander record and this record.

Final audit: K-Plex/Excalidraw loaded and enabled in live/persisted state; desktop 1440×875 at (0,25), original throttling true, 74 Markdown files, no owned fixtures, probe globals, Wander controls, tooltip DOM, dialogs, settings panel or fullscreen host. Original background `#0c3e6aff` is restored and matches persisted data. Per-driver workspace/display/settings cleanup passed. Installed/build byte check and whitespace check passed.

Implementation and available automated validation are complete. Remaining prioritized manual checks:

1. Physical Android/iOS: taps and slider drags versus stationary long-press hints, synthesized-click suppression and canvas-menu touch activation. Browser/Electron events do not prove native touch.
2. Windows/community themes and a narrow/docked Plex: bottom hints remain clear, OS-native menu/color picker activate, and main/popout motion looks correct. Native geometry is separate from perceived paint; the original Wander record retains its large-vault exploration limitation.
