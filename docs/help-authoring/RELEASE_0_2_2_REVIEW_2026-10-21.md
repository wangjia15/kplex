# Help update for planned 0.2.2

## Release assessment

Reviewed the actual merged PRs and `0.2.1..551a3b5`. The range contains two feature/fix commits
and their two merges, with no additional user-facing change:

- [PR #199](https://github.com/zsviczian/kplex/pull/199), `b0fc3cb`: optional grouping by Markdown
  note type or item kind, per relationship area; shared-left grouping; styled names and external
  counts; singletons remain individual; unfold in place, regroup on navigation, and unfold all
  when disabled. This is presentation, not note reclassification or a whole-vault query.
- [PR #200](https://github.com/zsviczian/kplex/pull/200), `551a3b5`: native lens color dialogs and
  their choosers stay above the Filters and lenses portal. The reader outcome is direct access to
  fill/border/text controls, without moving the parent panel.

Both PRs' `verify` checks completed successfully on GitHub. The preceding implementation work
also passed the full pinned Node 22.22.2 suite (2,619 reported tests), production build, exact-build
native smoke and focused Windows main/popout checks. Documentation makes no new performance,
physical-mobile or macOS acceptance claim.

GitHub lists 0.2.0 as published October 20, 2026, followed by 0.2.1 that evening. Per the maintainer,
0.2.1 is a technical republication after a release hiccup, not another feature release. No 0.2.1
Help page was created. At final release-status check, 0.2.2 was not published, so its new page is
explicitly a draft with `kplex/unreleased` and merged-PR sources.

## Help changes

Owning repository: `C:\Users\viczi\GitHub\kplex-help`, branch
`2026-10-21-help-0.2.2`, base `ba9c5f1`. The earlier Help PR #2 is merged; work did not resume its
old branch. Changes remain uncommitted; no PR publication or release was requested.

- New 0.2.2 draft release page with meaningful `Explains` edges to grouping and Graph Lenses.
- New evergreen grouping guide covering the actual toggle, property, item classes, singleton
  behavior, area boundaries, counts, navigation, independent unfolding and view-only effects.
- Two genuine screenshots of a workshop example, grouped and with Source unfolded, reused in
  the release page. These demonstrate desktop behavior and do not pretend the example notes
  are shipped as new Help fixtures.
- Feature hub, adjacent Expanded view guide and the clutter-reduction learning path link the new
  guide. Home/recent-features/opening guidance and the release archive reflect the current boundary.
- Existing 0.2.0 summary is marked published with its verified date and original-release link;
  its existing feature prose is retained, explicitly labeled as a reader-facing summary.
- Setup references on Help Home have explicit companion roles to avoid extra inferred Children.

The bundled Help manifest says 0.2.1, and its executable lacks the grouping control's catalog text.
The opening guidance therefore says grouping requires a newer build. No Help binaries, plugin
settings or hotkeys were updated.

## Screenshots and rendering

Captured real K-Plex UI in a fresh native popout of the existing disposable `kplex-test-small`,
using the already verified merged-code build. Native `capturePage` captured the app rectangle;
no fabricated or composited UI was used. Both PNGs were visually inspected:

| Help asset | What it demonstrates |
| --- | --- |
| `Assets/Screenshot - Grouped workshop relations.png` | Source 3, Idea 3, Task 2, Attachments 2 and Placeholder notes 2; an untyped singleton stays individual; active toolbar toggle and outside counts |
| `Assets/Screenshot - Unfolded source group.png` | Three source notes unfold without changing the center or unfolding the other groups |

Temporary notes/styles existed only in Small. Its original settings/enablement bytes and layout
were restored, the fixture subtree removed, and the temporary controller retired. Initial capture
readiness failed on an empty-frontmatter fixture; correcting that fixture and foregrounding the
selected native window produced a passing capture. Production code was unchanged.

The changed Help notes/images were temporarily copied into Small for native review and restored
afterward. Grouping guide and release draft rendered in native Markdown preview; their two/one
image occurrences decoded, their links resolved, and the release draft callout rendered. Graph
checks confirmed filter-hub/release-hub children and inverse grouping-guide parents. Tested hubs
stayed at or below twelve visible note Children with inferred notes enabled and non-note kinds
hidden. This is bounded changed-page acceptance in the prepared Small vault, not a full native
comparison of every current Help note; older archive targets remained unresolved in that copy.

Initial native-review setup needed an owned release-notes directory, and a later assertion needed
to await normal on-demand preparation rather than cached initial paint. Files were restored after
each attempt. The final passing review used Help's actual ontology configuration, then restored
Small's original configuration bytes and all twelve copied files and removed the owned directory.

## Validation and limits

- All Help Markdown frontmatter parsed; changed-page wikilinks and image targets resolved statically.
- Static note-link audit includes inverse Guide/Parent and inferred body-note links, with explicit
  companion roles excluded from Child; no note exceeds twelve note Children after the update.
- Native rendering, image decoding, link resolution and new inverse relationships passed in
  Obsidian 1.14.4 on Windows, using Node 22.22.3 for authoring transport.
- `git diff --check` passed in both repositories. No production source changed, so the build/test
  pipeline was not repeated for this documentation assignment.
- Help's open Obsidian window auto-added the four new files to workspace history. Before restoring
  exact original workspace bytes, cleanup verified the entire file differed only by those four
  entries and the corresponding bounded-history eviction; no unrelated edit was overwritten.
- Temporary authoring drivers were removed from the source checkout. Private receipts remain
  outside the consumer vault. Physical-device screenshots and every community theme are untested.

Private capture receipt: `kplex-help-022-capture-a9fc0b5250464873b4ba8e7cdfd1d86a`.
Private final native-review receipt: `kplex-help-022-render-final-9bdf0baaa6fc49b39262cbd8078dee31`.
Both are under the user's temporary directory and record exact artifact hashes and cleanup results.
