# Mind Map onward navigation during editor admission

Base: `7a88af087b9ab439b95772b7ba7d70dbe66ebd1d`. This follow-up changes only Mind Map's pending center-editor handoff. Startup completion, source acquisition, graph compilation and cache formats are outside its scope. Exact source/artifact identities and results are in the [companion receipt](mindmap-pending-editor-handoff-2026-10-29.json).

## Reproduction and correction

After A's native editor saves and closes, B can be central while its root occurrence is not yet admitted. The saved editor presentation then belongs to PlexGraph rather than a live editor binding. A subsequent explicit destination C previously bypassed App's preflight because no binding remained. B's pending intent was rejected against root C, leaving C compact.

App now also queries the graph's current pending editor-transition capability. An onward destination joins the already-saved intent through the same coalesced navigation owner. A short navigation phase prevents recursive preflight and obsolete admission during synchronous root notifications. Accepted navigation reacquires C's exact native file/root occurrence before opening the editor. A rejected onward request preserves the valid current intent; retired views, replaced files, unsupported destinations and newer explicit editors retain their existing guards. No second save, new scheduler, timer or persisted state is introduced.

An actual-callback before/after comparison uses the original App callback and the updated callback against the same delayed-root fixture. Both end at root C and save A once. The original callback leaves zero editors; the corrected callback opens one C editor in preview mode.

## Validation

The complete `npm run verify:obsidian` passed under Node 22.22.3 and Obsidian 1.15.0 (installer 1.14.0): architecture **9**, core **130**, main **1,692**, UI browser **419**, portable sources **357**, and source browser **855**. Total: **3,462 tests, zero failures**. Release checks, official Obsidian scanner, installed-type production build, standard native smoke and whitespace checks passed. Source-browser elapsed time was 1,023.97 seconds; no production performance claim is made. The final built/staged artifacts match the targeted native acceptance hashes exactly.

Focused editor/navigation tests passed **97/97**, including seven new integrated cases that wire actual App and graph callbacks to one session and native close transaction. They cover source/preview modes, B → C and B → C → D while admission is delayed, late intermediate scene publication, synchronous root notification, stale file incarnation, declined preflight, retired view and unsupported targets. Installed-type checking and a real production build passed.

The exact build passed all four native `center-navigation` groups in the existing disposable `kplex-test-small` vault. The added group holds P's scene read proof unavailable after R's editor closes, then uses the actual Search control to navigate onward to C. C receives the saved native preview editor, 640 × 380 dimensions and unchanged original-host save count. The other groups retain dirty-save failure recovery, normal trusted node-click transfer, folding isolation and native preview-mode handoff. The delay uses a restored test-only read-proof wrapper; production logic and semantic/index data are not replaced.

Native cleanup passed exact settings/enablement-byte checks, restored workspace/document sessions, viewport and wrappers, and removed owned fixture files and its controller. Production vaults were not accessed. Physical mobile/Windows behavior and actual paint/performance were not measured.

## Review

The important boundaries are reuse of already-saved state, preventing stale root admission, and rejecting an invalid newer destination without discarding the current intent. Integrated tests and the native delayed-root scenario exercise those boundaries. The full suites passed with the frozen runtime/test source identities in the receipt. A post-native check found zero owned fixture files, no controller, a ready index and zero active/waiting scheduler lanes. Review found no further confirmed introduced regression or merge blocker in this follow-up. Unrelated concurrent Help-authoring documentation edits are excluded from this correction.
