# Startup progress and centered editor navigation

Base: `6596f689c07f1b8c9ba84d09b7cf9c01f929a568`. Branch: `2026-10-29-fix-startup-and-center-editor`. The [companion receipt](startup-progress-center-editor-2026-10-29.json) records runtime source hashes, build artifacts and native results.

## Startup completion

A failed graph-cache restore could cancel its initial progressive build and later complete through an automatic full rebuild. That later builder cleared the dirty backlog without completing the plugin's separate initial-startup flag. Source verification could then finish without notifying status subscribers: the last per-note notification remained at 99%.

`performRebuild` now captures its index owner and completes startup only after a successful complete publication from that still-current index. Cancelled, partial, source-backed, replaced and unloaded results cannot establish completion. Newer source edits retain their dirty backlog. A retired source adopter's false result cannot undo an already completed canonical fallback. Source closure sends an unthrottled final progress notification; per-note updates remain throttled and no trailing timer is added.

The original incident's missing saved graph chunk is separate and remains unexplained. This correction does not clear caches, change persistence formats or modify hydration/compiler authority.

## Mind Map center navigation

Mind Map's primary click already requested centering, but older graph/App guards still rejected the root change while an occurrence editor was open. The graph action now delegates that transition to App's shared save/close preflight. Multiple requests during saving accept only the latest current destination, including when native close has finished before its navigation continuation.

A centered hierarchy editor carries one transient presentation intent containing its previous mode and dimensions. After accepted rerooting, PlexGraph reacquires the exact native file and actually displayed root occurrence before opening its replacement host. A failed save retains the original buffer/root/attention. A retired view, stale file, changed root, hidden/unsupported target or newer explicit editor cannot receive a late replacement. A noncentral editor is saved without being promoted to the new center. Capacity remains one.

Fold/unfold controls stay independent. A fold that would conceal an editor retains its guard and uses specific folding copy; the separate root-only command has separate wording. Both notices are localized in all eight supported languages. Definitions, persisted editor intent, ontology and graph semantics are unchanged.

## Verification

The complete `npm run verify:obsidian` passed under Node 22.22.3 and Obsidian 1.15.0 (installer 1.14.0): architecture **9**, core **130**, main **1,692**, UI browser **412**, portable sources **357**, and source browser **855**. Total: **3,455 tests, zero failures**. Release checks, the official Obsidian scanner, the real production build against installed typings and the standard exact-build native smoke passed. The source-browser lane took 964.57 seconds. The final build and staged artifacts match the targeted native acceptance artifact hashes exactly.

Focused checks passed: startup recovery **38**, final navigation/editor tests **90**. The actual production build passed against installed Obsidian typings. Architecture and the official Obsidian scanner were rerun after the final navigation changes.

The exact built artifact passed three native `center-navigation` groups in the existing disposable `kplex-test-small` vault:

- A rejected native save retains the dirty editor, root and attention.
- A trusted node click saves dirty source text and transfers the editor to the clicked center with its mode, size and capacity preserved.
- Actual fold/unfold controls retain the root editor; the actual toolbar preview action and subsequent center click preserve native reading mode after host readiness.

A separate bounded native startup check reproduced the incomplete coordinator flag on a settled eager baseline, ran the actual fallback builder, and verified complete startup, terminal source notification, rendered ready indicator, unchanged source revision and stable graph cardinality. It used 74 Markdown files and 175 graph nodes; it is functional acceptance, not a production-vault startup-time measurement.

Early native probes used a stored-mode setter rather than the actual toolbar and observed file binding before native mode readiness; those failed attempts are not acceptance evidence. The passing scenario uses the real toolbar and waits for native readiness. The first indicator comparison after fixture removal changed graph cardinality during its rebuild and was not used as stable-baseline acceptance; its receipt is retained separately. The passing check ran on the rebuilt stable baseline. No production-vault writes or deployments were performed.

The native Mind Map scenario restored settings bytes, workspace/document sessions, viewport and wrappers, deleted its owned files/folder and removed its controller. A post-check confirmed no controllers or owned fixture files, a ready indicator and zero active/waiting scheduler lanes. Test-vault executables contain the candidate build. No temporary diagnostic code was added to shipped source.

## Risk and manual coverage

The highest-risk boundaries are native save failure and late navigation/editor admission. They have actual-method tests and macOS native acceptance. The full source/browser suites passed cancellation, topology, cached-source and semantic authority coverage. Final affected navigation tests, architecture checks and scanner checks were also rerun after the last navigation condition changed. Review found no further confirmed introduced regression or push blocker; this is not a guarantee for untested environments. No additional maintainer manual check is needed for the reproduced desktop workflows. Physical mobile touch/IME, a Windows host, whole-application restart, production thermal behavior and actual paint are separate environments or measurements and were not claimed.
