# Section layout and native-base upgrade — PR #189

The implementation follows merged #149 (`a8e0efa`). Initial runtime checkpoint `0048964`
corrects canvas line-height; the follow-ups below add font-ink clearance, stationary modifier
previews, marker-driven startup adoption and its native notification modal. The final PR
description records the delivered head and artifacts.

| Request | Implemented behavior |
| --- | --- |
| Section density | Related pills gain meaningful horizontal/vertical whitespace below maximum density. Maximum-density endpoints and the independent empty inter-section gutter are retained. |
| Cropped text | Geometry reserves line boxes and border width. The more specific canvas `line-height: 1.02` override is removed, so native views inherit the same 1.2 line-height used by measurement. Wrapped labels reserve two lines. |
| Section gate counts | Visible section-target occurrences resolve their current canonical page for counts and finite cache-only presentation demand. Synthetic heading gates remain section-owned. Missing canonical pages remain unavailable. |
| Section previews | The existing native hover event includes the heading's existing Obsidian subpath. |
| 0.2.0 appearance | The existing queued appearance initializer adopts native base colors once, preserving current semantics, non-color styles and all saved themes. Selection, appearance and completion marker persist together. Later versions retain manual selection. |
| Fresh installs | A pristine install keeps Default theme only. First-run ExcaliBrain imports retain their User-theme backup. Neither first-install path displays an upgrade popup or migration message. Actual loaded K-Plex data determines notification eligibility. |
| Wheel over lists | Ctrl/Cmd-wheel uses existing focal-point zoom over both bounded-list types. Unmodified list scrolling and embedded editor/modal scrolling retain their native routing. |
| One-sided layout | Friends and challengers share one continuous left list, scroll position, count and filter. Semantic roles, connector styles and section provenance remain unchanged. Moving an existing challenger within that list does not relink it as a friend. |
| Parent tooltip | Top/parent gates prefer below; bottom/child gates prefer above. Existing delay, Alt/Option gating and edge fallback remain. |

The release version remains 0.1.3 in this feature branch. The follow-up below removes the
original running-version gate: the migration's durable marker owns completion, including for
development builds still labeled 0.1.3. This PR neither publishes a release nor changes release
metadata. All eight locales and `docs/APPEARANCE.md` are updated.

Validation performed:

- Real `npm run build` with installed Obsidian types: pass, including after the final CSS fix.
- `check:release`, `check:architecture` (7 cases), `check:core` (130 cases): pass.
- `lint:obsidian`: pass. Final configured ESLint scan of every changed runtime owner: pass.
- Established indexing fixture lane and primary regression lane: pass; primary reports
  **1,153 pass / 0 fail**. Established serial UI/browser lane: **192 pass / 0 fail**.
- Final theme/localization/layout/viewport checks: **73 pass / 0 fail**.
- Final complete affected `native-theme` and `ui-components` suites: **27 pass / 0 fail**.
  The new large-font regression fails before removing the canvas override and passes afterward,
  across ordinary/central nodes, font sizes, borders and wrapping.
- The configured native staging/command/render owner passed in `kplex-test-small`.
  Its verification hook checked the recorded scoped-suite results; the stock all-suite
  `verify:obsidian` command was not used. The unrelated #149 foreground-startup browser failure
  was not rerun, as requested. This is scoped validation, not a claim that every storage-browser
  test or an unmodified full `npm run verify` completed for this PR.
- Exact-build native `sectionExpansion.mjs`: **11 cases pass**: shared lateral list and challenger
  filtering, Ctrl/Cmd overflow-wheel routing, actual fold controls, ordinary/preamble grouping,
  canonical numeric counts, modified heading hover anchor, large-label line boxes, gate tooltip
  preferences, stationary inbound add/remove and visibility round trip. The presentation-only
  interval recorded **0 Markdown reads, 0 parses and 0 index rebuilds**.
- Exact-build native `themeUpgrade.mjs`: **4 cases pass**, using actual Visual styling controls:
  one-write adoption, selection/dismissal, later-version retention and fresh Default-only behavior
  without popup or visible migration row. Initial tests supplied prospective release versions;
  the follow-up verifies an actual plugin startup over 0.1.3 data, without a release-version gate.

The native large-label failure measured a 23px line box against 26px content. Removing the
specific override gives a 27px line box in the same fixture. Earlier failed probes are retained:
one staging receipt initially read a PowerShell UTF-16 log as UTF-8; native upgrade harness
corrections respected its simulated startup fence and the actual mounted Settings owner.
These harness corrections did not change production lifecycle or persistence behavior.

Environment: Windows, Node 22.22.3, Obsidian 1.14.4 (installer 1.14.0), explicitly selected
disposable `kplex-test-small`. Native probes restore their own settings, controls, leaves and note
fixtures. Private reports, original configuration backups and failures remain outside Git; the
PR description records final restoration and durable evidence verification. No personal vault
was accessed and no comparative performance experiments were run. The work-count assertion is
not a performance-improvement claim.

Remaining platform coverage: macOS, physical phones/tablets and physical trackpad/wheel gestures
were not tested. Ctrl and Cmd wheel routing used native DOM events on Windows. Popout tooltip
ownership retains the existing browser/owning-document coverage; the new native acceptance ran
in the main window. Recheck large glyphs under other fonts/themes and native hover popovers on
those platforms during hands-on acceptance.

## Follow-up: stationary preview, font ink and 0.1.3-data migration

Ctrl/Cmd now works after the pointer enters a node, including expanded mini rows. One
surface-owned preview intent retains the exact occurrence and current pointer coordinates;
it reuses the existing native hover path and heading anchors. Repeat keys do not reopen it.
Leave, pointer-down/drag, blur, hiding, navigation and teardown retire the candidate. Keyboard
shortcuts retain propagation and focus; popouts use their actual owning window.

The remaining cutoff reproduced with Segoe UI even after correcting line-height. Its font
bounds crossed the text span's own overflow clip. The span now has 0.2em padding above/below
its content; normal, wrapped and scaled-sibling geometry reserves that same ink clearance.
Ellipsis and the two-line limit remain. The stricter real React/CSS test checks text-range bounds
inside the clip rectangle across Arial, Georgia, Segoe UI and system fonts, font sizes, borders
and wrapping. It fails before this correction and passes afterward without the earlier one-pixel
overflow allowance.

The native-base initializer requests adoption whenever this implementation is present; only
the durable completion marker decides whether it runs. It no longer waits for the running
manifest to say 0.2.0. The original first-install notification distinction is unchanged.

Follow-up checks: 106 migration/legacy/layout cases and 51 theme/hover/React cases pass; the
final owner-window preview suite passes 10 cases. Real build and configured Obsidian scanning
pass. A real plugin reload over the restored Small-vault 0.1.3 data verifies native-base selection,
the persisted marker, visible migration notice, unchanged semantic appearance and preserved
prior themes. This is an actual startup path, not merely a simulated version argument.

The updated native section probe passes 12 cases, including stationary Ctrl/Cmd routing and an
actual Electron mouse-then-Control gesture that displays Obsidian's native preview popover.
The large-font native text span now measures 36px client/scroll height with font bounds wholly
inside its clip rectangle (previously 27px client / 28px scroll). Its presentation-only interval
still records zero reads, parses and rebuilds. The native Settings probe passes four cases on
the actual 0.1.3 manifest, including silent fresh installs and preservation on subsequent startup.
Final delivery head, restoration and private evidence identities are recorded in the PR.

## Follow-up: persistent notification dialog

Runtime checkpoint `87ef06c` replaces the short-lived migration Notice with a reusable
`NotificationModal`, using Obsidian's native modal, title, paragraph and CTA styling. It explains
the native base colors, preserved previous appearance and Visual styling location. Done, Escape
or native close queue acknowledgment through the existing library metadata action. Plugin
teardown does not acknowledge it, failed storage leaves acknowledgment pending, and duplicate
initialization cannot stack dialogs. No user acknowledgment is awaited inside the disk queue.

Previously migrated libraries with an undismissed message receive this modal without reapplying
colors or changing selection. Already acknowledged migrations, genuine fresh installations,
first-run ExcaliBrain imports and unsupported future appearance data do not display it. This
reuses the existing migration-message state; it adds no settings schema or alternate writer.

Focused theme/editor and external-settings browser checks pass **35 / 35**. Migration, legacy
import and layout checks pass **106 / 106**, and localization checks pass **23 / 23**.
Build and the configured Obsidian scanner pass.
Actual plugin startup over the restored 0.1.3 Small-vault data shows the modal and persists its
acknowledgment while preserving prior themes and semantic appearance. The updated native
Settings lane passes **six cases**, including single-dialog ownership, durable dismissal,
selection and later startup, and a silent fresh installation. An initial assertion expected a
dismissed Settings row to be removed; the corrected harness checks that the existing native
row is hidden. Its original failure remains in private evidence.

The previous final-stage attempt encountered the existing external-settings ownership fence
after a probe restored raw configuration. It was stopped before staging. The final modal stage
uses the restored original fixture and a real plugin reload, preserving that production fence.
No unrelated browser/storage lane or comparative performance experiment was run.
