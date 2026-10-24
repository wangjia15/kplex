# Unified ontology manager: implementation and local validation

Status: implemented locally on `2026-10-20-ontology-manager`, returned uncommitted under the standing handoff workflow. PR #194 remains draft at its planning head `8ea700c93ebda78cdc71d6132d656c8ac682b057`; no implementation publication, ready/merge, release or issue action was performed. Runtime baseline: `main@843e47f471f897951165b962e12a1d6a64ce089e`.

## Delivered behavior and ownership

- Ontology Settings opens one native searchable manager using `StyleManagerList`. All directional roles, Hidden, Excluded metadata and discovered Unassigned fields remain distinct. Pairs occupy one row, retain both names, orient to the selected role and match either name. Configured/pair/unassigned counts, bounded disclosure, incomplete-discovery empty state and explicit rescan are available. Discovered-field and Hidden entry points use the same manager.
- `AddToOntologyModal` remains the shared editor. It supports new/unpaired fields, two new paired names, eligible existing partners, replacement, explicit unpairing, derived reciprocal roles, explicit Save both directions and confirmed removal of one named assignment. Existing names are read-only. Former partners retain their assignments. Invalid, composed, failed and conflicted drafts do not enter live settings.
- `ontologyPresentation` supplies separate pair-row and physical-field option projections, role/status formatting and partner details for the manager, editor suggestions, Markdown suggester and React composer. Same-role pair endpoints remain independently selectable. Direct matches precede marked partner-only matches; insertion/writes use the primary physical field only.
- `OntologyEdit`, `applyOntologyEdit` and `ontologyEndpointState` extend the existing configuration owner. The narrow `editOntologyConfiguration` host operation rechecks affected raw endpoint declarations and the received hierarchy owner inside the existing settings queue. It performs one durable operation, merges unrelated edits, excludes duplicate submissions and preserves accepted operations after dismissal. Saved-refresh-pending is not an unsaved retry.
- No source acquisition, indexing scheduler, parser/compiler/resolver/evidence/snapshot schema, graph-layout or pair-wide style implementation changed. Existing raw grammar/version, escaping, physical style keys, field ordering/defaults, legacy imports and multiple-assignment precedence remain authoritative. No notes are renamed or rewritten by vocabulary management. All eight catalogs and the user guide were updated.

## Original manager validation environment and artifact

Local commands used Node **22.22.3**, with installed Obsidian types **1.13.0**. Native host: Windows x64, Obsidian **1.14.4**, installer **1.14.0**, Electron **43.3.0**, Chromium **150.0.7871.212**, embedded Node **24.18.1**. The repository's pinned Node **22.22.2** was not validated in this run.

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `7f538173df514535e638b8203e91cc5412e19612b642913b88d609f919bc0617` |
| `styles.css` | `8fd9dac8ebdafb07c38f82d74fdba5e3aa7ab3990a4348a6097c993f25d5c8a6` |
| `manifest.json` | `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c` |

Only explicitly selected `kplex-test-small` was used. No personal vault or comparative performance campaign was accessed/run.

## Automated results and aggregate-gate limitations

| Check | Actual result |
| --- | --- |
| Release metadata, architecture, host-free core | Passed; 7 architecture and 130 core tests, no boundary violations |
| Official Obsidian scanner | Passed, no findings in the final run |
| Real installed-type production build | Passed |
| Final focused configuration/presentation/suggester/action/locale/editor/UI command | 145 passed, no skips |
| Editor/manager suite after explicit-rescan coverage | 11 passed, no skips |
| Primary portable batch | Initially 1,232/1,234 passed; two narrow save-method doubles still used the old writer/control shape. Updated those doubles without weakening dismissal/retry assertions; all 35 tests in that file then passed. The entire batch was not repeated. |
| Shared UI batch | 210 passed, no skips |
| Portable source batch | 334 passed, no skips |
| Chromium source/storage/lifecycle batch | 645 passed, 1 failed, no skips |
| `npm run verify:obsidian` aggregate | **Failed at portable verification; not a green full gate.** Exact-build staging and native checks were subsequently performed separately. |

The aggregate run stopped on a nonzero timer-count assertion in the existing restore-watchdog fixture. An isolated archive of unchanged `main@843e47f`, using the same dependencies, also failed a timer-count assertion in that watchdog block. Targeted candidate runs also passed. The underlying intermittent timer cause was not diagnosed or changed here; its assertions remain intact.

The one browser failure was `visible presentation rejects stale unload across held durable cache availability`. Chromium remained `loading`, with no completed script resources or bundle exception, before the scenario began. The following case loaded the same shared bundle and passed. This bootstrap failure was retained and not rerun.

Initial obsolete standalone-manager assertions, the finite loader's missing module inventory and the old writer-method doubles were corrected to exercise the new owners. No semantic golden output, timing bound or failure guard was relaxed.

Final focused command:

```sh
node --test --test-concurrency=1 tests/ontology-configuration.test.mjs tests/ontology-presentation.test.mjs tests/ontology-suggester.test.mjs tests/action-settings.test.mjs tests/localization.test.mjs tests/ontology-pair-modal.test.mjs tests/ui-components.test.mjs
```

The real build and scanner commands were `npm run build` and `npm run lint:obsidian` (invoked through `npm.cmd` on Windows). Other recorded commands were `npm run check:architecture`, `npm run check:core`, `npm run verify:obsidian`, and the primary, shared-UI and source batches from the repository's `test` script. Individual batch logs retain their actual terminal outcomes; this report does not substitute them for a successful aggregate run.

## Original manager native acceptance on its exact build

| Lane | Result and scope |
| --- | --- |
| Unified manager, actual On-demand session | 12 cases passed on the final build, including visible native Settings owners at initial and no-Plex openings and the narrow-window case |
| Unified manager, actual reloaded Eager session | 11 cases passed; original saved mode/session restored |
| Narrow native Settings window | 12 cases passed at a 440-pixel viewport, including long field-name wrapping, no horizontal overflow and no nested list scroller; native minimum size/bounds restored |
| Existing ontology-pairs lane, adapted to the manager | 12 cases passed: stationary captions, physical-field styles, main/split/popout perspectives, reverse authoring/unlink, transient/folded sections, unchanged Save and unpairing |
| Pair reload lane | Passed actual disable/enable, view reopening, durable pairing, physical evidence and caption recovery |
| Real external-settings lane | 7 cases passed, including a dirty ontology draft retained through real hierarchy-file receipt, stale Save refused without an echo write, stationary graph updates and focus/caret preservation |
| Trusted native composer/folder workflow | All 12 scenarios passed, including All vocabulary/disclosure, physical selection, lazy note queries, creation, placeholders, Cancel and failure recovery |
| Cold Hidden shortcut, Settings initially closed | Opened the Hidden manager in the actual active native Settings window |

After the final preview refinement (Hidden/Excluded drafts keep the configured partner visible until explicit unpairing), the real build, scanner and 145-test focused command passed again. All six native lanes were then repeated serially on the final artifact above: narrow On-demand manager, Eager manager, pairs, reload, external settings and the trusted composer. The cold Hidden shortcut was checked before that refinement; its navigation code was unchanged.

Manager browsing/filtering/search/Show more/Cancel and new/fixed-target composer selection had zero additional note reads, parses, acquisitions, rebuilds, semantic invalidations, snapshot writes or settings writes in their isolated guard intervals. Compatible pairing/unpairing retained zero semantic/source work; pair-wide role changes and genuine membership edits used their required existing semantic refresh, one durable write per operation. These are functional operation counts, not CPU/latency/memory or performance-improvement claims.

Native harness failures and corrections remain in private evidence: declarative subpages live outside the tab's root container; Settings owners can initially have a zero-width viewport; their native window has a minimum size; a retained Electron bounds proxy cannot be serialized after its window closes. Geometry is now detached while its owner lives. Test restoration commits through the queue before restoring original bytes. A pending test-vault migration notice was dismissed for the trusted workflow. That workflow's idle predicate now includes the coordinator's queued rebuild timer/backlog, preventing prior fixture refreshes from entering typing/Cancel measurements; all zero-work assertions are unchanged. No runtime workaround or transport retry was retained for these harness issues.

## Restoration, evidence and remaining acceptance

Independent final audit passed: the original **107-file inventory**, exact native layout and exact data/enablement/workspace/appearance bytes were restored and rechecked after delayed native saves. There are **0 Plex views, 0 ontology managers, no known test controllers**, and Settings is closed. The original pending migration notification can reopen from the restored data. No native JavaScript errors were captured. The tested executable artifacts remain staged in Small.

Private originals, failed and passed reports, driver snapshots, logs and source hashes are retained outside temporary storage under `%LOCALAPPDATA%/KplexValidation/ontology-manager-194`. Original configuration/artifacts are in `native-baseline-1792477482962`. No raw vault/configuration files or traces are included in this repository report.

The original manager's uncommitted runtime/test/tooling source manifest is `delivery-source-manifest.json` in that private directory; its SHA-256 is `d069f1ea58c82b23cfd3f51e92b730f063944aa8d1d9b21c9e0312a86379094b`. It records 32 touched/new code, test and tooling paths before the document-use extension below, with file bytes and hashes, independently of the transient handoff and this report. Original manager native reports use the `delivery-*` directories. All six were run serially with the explicit Small-vault environment from CONTRIBUTING; the manager used `KPLEX_ONTOLOGY_MANAGER_NARROW=true`, Eager used `KPLEX_ONTOLOGY_INPUT_MODE=eager`, and the composer used `KPLEX_ACTION_WORKFLOW_SCENARIO=folder-creation`. Test-only staging/restoration helpers and 67 passed/failed logs were retained privately, then the helpers were removed from the working tree.

Original manager source review covered C14 ownership/dependencies, actual component reuse, API/type discipline, TSDoc, raw identity/order preservation, queued publication/conflict/failure boundaries, owner-window cleanup, localization, native theme styling and the absence of indexing/source-write changes. The temporary plan marker was removed; the root handoff header is preserved. Independent reviewer acceptance and publication remain pending.

Remaining gates are the recorded aggregate failures, pinned-Node verification and minimum-host/device acceptance. Physical checks cannot be inferred from Windows DOM or native handler automation:

1. macOS: native Settings/popout focus, suggestion selection, Escape and owner teardown.
2. Physical phone/tablet: software keyboard/IME, touch selection, long names and single-surface scrolling without unintended Save.

No additional Windows manual test is requested for the workflows automated above. Keep #194 draft; do not merge/release or change #151's completed state automatically.

## Follow-up: documents using a physical ontology field

The accepted extension adds **Show documents** to the existing shared field editor. A native document list reuses `StyleManagerList` search/status/disclosure and ordinary `Setting` rows with separate, named Lucide actions. Keywords filter filenames/folder paths locally. **Copy as Markdown** copies every filtered result, including undisclosed rows, through the same `ClipboardSession` and `nodeMarkdownLink` owners as Footprints. Native tab/Plex opening uses existing host navigation, preserving the ontology editor draft. Parent dismissal and owner-window retirement cancel list presentation and retire clipboard feedback.

The strict prerequisite was verified before implementation: `SourceFacts.sourcePostingKeys()` already emits normalized `field` postings from field names and values; `sourceFieldNames()` retains every frontmatter/inline field, including unassigned scalar fields without links. `NeutralSourceRepository.querySources('field', key, ...)` already looks up source owners. Existing selected heads contain physical paths, and `readSelected()` authenticates metadata families under terminal selection fences. The adapter only reads these facts and rechecks native identity/mtime/size, including a final check after all asynchronous lookup work. Pair partners are deliberately separate physical-property queries. Failed, changed or missing inputs produce partial-coverage feedback without repair.

**No index extension was added.** There is no new posting, persisted field, schema, scan, source acquisition, parser, dependency derivative, scheduler, semantic compilation or background observer. The seven added lines in `GraphIndex.ts` are a module-header note, adapter import and read-only facade over the existing repository. Filtering and copying never query storage again. Only explicit **Refresh** repeats the lookup; explicit document/Plex navigation may perform its normal work. The dialog always explains that currently indexed uses may be incomplete.

Final extension artifact: `main.js` SHA-256 `da02f798de70cec58cb08017732449b13d44f74ec5cd44cda2a300775234264c`. CSS and manifest hashes are unchanged from the table above. All eight locales received the eleven new strings. User guidance and the reusable `verify:obsidian:ontology-usage` lane are documented in CONTRIBUTING.

| Extension check | Actual result |
| --- | --- |
| Production build / installed types | Passed on Node 22.22.3 |
| Official scanner | Passed without findings |
| Architecture | 7 passed; 148 migrated roots, 268 reachable files, 0 violations |
| Final affected ontology/configuration/presentation/usage/editor/action/localization/shared-UI command | **152 passed**, 0 skipped |
| Real Chromium IndexedDB usage case | Passed; unassigned scalar/inline field names, no duplicate document, physical declaring owner, unchanged source heads and acquisition counters, zero source replacements/acquisitions |
| Existing `node scripts/run-indexing-tests.mjs` | Passed, including the restore-watchdog block and all existing fixture assertions; no production timer fix or relaxed guard |
| Actual native Settings extension | 3 workflows passed on the final artifact: lookup/filter/copy, separate new Obsidian tab, separate Plex navigation with the editor retained |

The final focused command is the earlier focused command with `tests/ontology-usage.test.mjs` added. The real-IDB case ran through `node --test --test-concurrency=1 --test-name-pattern="ontology usage queries" tests/source-relationship-mutations-indexeddb.test.mjs`. The native lane used the three explicit Small-vault variables and `node scripts/testing/obsidian/ontologyUsage.mjs`; private report `usage-native-3/ontology-usage-194.json` records **0 reads, 0 parses, 0 acquisitions, 0 replacements and 0 settings writes** during listing/filtering/copying. Counters stop before explicit opening actions, which legitimately use existing navigation. No performance comparison was run.

Harness-only failures were retained and corrected: the new method-only cleanup double needed its owned child set; the native-shaped Setting double has no native `.setting-item` class; localized reference parameters quote filenames and require attribute equality rather than unescaped CSS selectors. The first native fixture used a cache-only body reader for a newly created note; it now uses the existing requested-body loader during setup only. With no Plex open, `indexDirty` can remain an unscheduled marker; setup quiescence now checks actual queued/build/semantic work and retains strict zero-work assertions. The real-IDB test distinguishes cache-read/decode diagnostics from acquisition counters. None of these changes alters runtime indexing or weakens an existing semantic/timing assertion.

Independent final restoration passed again: **107 original files**, exact configuration bytes and native layout, zero Plex views/managers/known controllers, Settings closed and no captured native JavaScript errors. The original pending migration notification can reopen. The final tested executable remains installed in Small. Original follow-up configuration/artifacts and final audit are private in `usage-baseline-1792483111484`; failed/passed extension reports and logs remain alongside the original manager evidence. Temporary staging/restoration helpers were removed after private retention.

The document-use version's complete runtime/test/tooling source identity is private `usage-delivery-source-manifest.json`, SHA-256 `5e3cb69b1eec995ad8602833a6e15701baeed1fd7fda7532ea0a8868dfe2ccdd`, covering 38 touched/new paths before the recount addition below. The original manager manifest remains preserved separately. The aggregate `verify`/`verify:obsidian` gate was not rerun or declared green: earlier failures remain recorded even though the isolated indexing fixture now passed. Pinned Node, minimum-host, macOS and physical-device limitations remain as above. Changes remain uncommitted; PR #194 remains draft.

## Follow-up: reconcile stale discovery counts on demand

The reported mismatch was traced to `GraphBuilder`'s existing `discoveryMode === "patch"` policy: incremental updates learn names but deliberately do not subtract prior per-file occurrence contributions. Exact discovery counts historically required a full build. The document-use lookup reads current field postings and can therefore correctly return zero while the historical discovery catalog still reports one. That indexing policy remains unchanged.

**Refresh counts** now recounts all fields matching the manager's role filter and search, including undisclosed entries and previously hidden zero-use names. It uses the existing `ontologyUsage` lookup serially and keeps only modal-local count scalars. A successful zero hides an Unassigned field from this manager session; assigned fields remain visible at zero. Partial/failed lookups remain visible with incomplete-count feedback. Rechecked values are explicitly labelled as document counts, distinct from historical occurrence counts. A later explicit refresh can restore a previously hidden field if it is used again.

The existing **Show documents** result, including its **Refresh** action, is also passed back through the owning field editor to the open manager. This requires no second lookup and preserves the draft. Search/filter/editor changes and closing retire pending count completions. No automatic lookup runs on manager open, typing or index publications; users explicitly request the recount instead of paying an ongoing update cost. Closing the manager discards the overlay. No index/catalog/schema/source-write change was added.

Validation on the final recount artifact:

- Real production build and official scanner passed on Node 22.22.3, installed Obsidian types 1.13.0.
- Architecture passed: 7 tests, 148 migrated roots, 268 reachable files, 0 violations.
- Final affected focused command: **156 passed, 0 skipped**. New cases cover assigned zeroes, Unassigned complete/partial zeroes, filter/search scope, undisclosed/previously hidden entries, duplicate refresh, field reuse, Show documents count sharing, failed storage and stale/closed completions. The historical catalog remains unchanged.
- The existing native usage lane now passed **5 workflows**, adding actual property cleanup, shared zero counts for an assigned field and a fresh Unassigned manager with its historical stale entry. **Refresh counts** removed that entry with **0 note reads, 0 parses, 0 acquisitions, 0 source replacements and 0 settings writes**. Existing tab/Plex/copy cases passed too. A deliberate existing discovery rescan seeded the disposable fixture before cleanup; it was not part of the measured recount and was not added to production refresh behavior.
- The test-vault restoration audit passed: original 107-file inventory, native layout and exact configuration bytes restored; zero Plex views/managers/known controllers, Settings closed, no native JavaScript errors. The original pending migration notification can reopen. Temporary staging/restoration helpers were removed after private retention.

Final `main.js` SHA-256: `be45d7d89644de8e7ae3d8388f1055cde859db2a534f0d11cb7ea3c53217b524`; CSS/manifest hashes are unchanged. Private exact source manifest: `counts-delivery-source-manifest.json`, SHA-256 `7b0c869d92ec8b87048308a4aa137eae23163eeb14d925194114c7ae80234dfa`, 38 code/test/tooling paths. Native evidence: `counts-native-1/ontology-usage-194.json`; backup/final audit: `usage-baseline-1792491707167`. All eight locales and documentation were updated. The earlier full-gate/platform limitations remain; no new aggregate-green or performance claim is made. Branch and uncommitted/draft status are unchanged.

## Policy correction: hide Unassigned zeroes under incomplete coverage

The maintainer's screenshot showed a retained Unassigned row with “At least 0 indexed documents (incomplete).” The explicit requirement is now to hide any Unassigned row with a returned numeric zero, regardless of the partial-coverage flag. **This supersedes the prior partial-zero preservation rule above.** Named/configured assignments remain visible at zero, including partial zeroes. This applies to both Refresh counts and results shared from Show documents. Recounting a restored stale discovery entry after reopening produces the same result; the stored historical catalog remains unchanged.

An exception from the lookup is distinguished from a returned numeric zero. Failed recounts store an incomplete result with no numeric count and leave the historical row visible. This avoids inventing a zero after a thrown error. The incomplete-count message no longer promises that all incomplete fields remain visible; that copy was updated in all eight locales. No automatic recount, persistent deletion, source/schema extension or acquisition was added.

Final focused checks: **45 passed, 0 skipped** using `node --test --test-concurrency=1 tests/ontology-presentation.test.mjs tests/ontology-pair-modal.test.mjs tests/localization.test.mjs`. Cases include partial-zero removal, configured partial-zero retention, field reuse, thrown errors, cancellation, count sharing and reloading an unchanged stale catalog into a new manager. The real installed-type build and official scanner passed on Node 22.22.3. The earlier broader 156-test result belongs to the prior count version; it was not repeated for this narrow policy correction.

The exact-build native usage lane passed all five workflows with `KPLEX_ONTOLOGY_USAGE_PARTIAL_ZERO=true`. For its final fixture field only, the test delegates to the real cached posting lookup and then returns incomplete coverage; it does not invent documents or alter stored source facts. The Unassigned zero row disappeared, assigned-zero preservation passed, and read-only actions recorded **0 reads/parses/acquisitions/source replacements/settings writes**. Evidence: `partial-zero-native-1/ontology-usage-194.json`. The wrapper was restored on exit. Final audit in `usage-baseline-1792493313874` passed: original 107 files, exact configuration/layout, zero Plex views/managers/controllers and no native JavaScript errors. The final build remains staged in Small.

Current `main.js` SHA-256: `82b95d35e4178829bb2c75c0377510b66d14542700e1e55f31b9d992ad592010`; CSS and manifest hashes unchanged. Current private source identity: `zero-delivery-source-manifest.json`, SHA-256 `f0e9cad97e3555ea21cd7ced44e7b972eec4283e082b00681b72294d601e62aa`, 38 code/test/tooling paths. Temporary test helpers were retained privately and removed locally. Branch/head, uncommitted/draft state and the earlier aggregate/platform limitations remain unchanged.

## Maintainer publication acceptance

After hands-on review of the manager, document-use list and cleanup behavior, the maintainer explicitly requested merging #194 to main and proceeding to #195. The tested runtime/source identities above remain unchanged. The documented earlier aggregate and platform limitations are retained; no additional full-gate pass is implied by merge authorization. Final publication/CI/merge details are recorded in PR #194.
