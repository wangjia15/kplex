# Device-specific indexing — PR #195

Implementation and finalization record, 2026-10-20. After reviewing the delivered scope and
disclosed validation limits, the maintainer requested removing the Web link indexing explanation,
then publishing/merging #195 and closing #191. The limitations below remain limitations.

## Identity and behavior

Branch: `2026-10-20-issue-191-startup-policy`, local integration commit
`289e10a29649a2c4bb8fbcb0439b27fbee7d3071`, plus the implementation published in
[PR #195](https://github.com/zsviczian/kplex/pull/195).
The integration retains main `50346338f7caf15ff5d27a3d11ff7022c78bcd3c` (merged #194),
without rewriting the planning branch. The original planning head was
`7e208f0a1a15676d37dcc9102a1a7590ff6488cd`; GitHub records the final publication and merge identity.
Related issue: #191. #192 is excluded.

| Device | Prepare before a Plex opens | Indexing strategy |
| --- | --- | --- |
| Desktop | On | Eager |
| Tablet | Off | On demand |
| Phone | Off | On demand |

These are explicit defaults for fresh installations and missing/malformed device fields on upgrade.
Saved device choices survive. The former global strategy remains compatibility data; it is not
copied into all three device choices. Native Settings and all eight locales explain restart/reload
application. Device selection reuses the existing main-host presentation environment and stored
phone-to-mobile mapping. Popout width and later local/external saves do not change the session.

Admission defers broad search, graph/source restoration and URL acquisition together. Lightweight
host registration, saved navigation and validity observations remain available. Actual opening
(including inactive views) or explicit rebuild joins one preparation task. Native view mounting
does not await full preparation. Existing scheduler, source/compiler/cache formats, relationship
semantics, URL behavior after admission, and post-opening cancellation remain unchanged.

Dormant observations reuse existing source/path owners. Deleted identities are discarded;
equal-stat body changes invalidate cached source and URL input. A reproduced first-explicit-work
double build was corrected: the explicit builder supplies initial work without a preliminary build.
Native drivers selecting a real desktop strategy now write its device field. Isolated GraphIndex
fixtures retain their explicit constructor strategy; older-build comparison drivers also retain
the legacy compatibility write. Reports describe the actual session mode.

## Automated results

Required Node **22.22.2** was downloaded in isolation and checked against its official checksum;
the machine-wide Node installation was unchanged. Installed Obsidian declarations: **1.13.0**.

- Real `npm run build`: pass. Output remains the three installable artifacts.
- `npm run check:architecture`: 149 migrated roots, 269 reachable files, zero violations.
- `npm run check:core`: 130 passing tests. `npm run lint:obsidian`: pass.
- Production startup fixture: 58 admission scenarios and 27 settings-independence scenarios pass.
  The standalone indexing fixture also passed its restore-watchdog and existing graph regressions.
- Device policy/localization/native-runner batch: 57 passing tests, including 13 device-policy cases.
- Existing migration/settings-controls suite: 69 passing tests. Its replacement-controls case checks
  all six native definitions and six saves with `(false, false)`, retaining the no-live-rebuild rule.
- External settings browser suite: 18 passing tests, including independent device roots, restart,
  failed persistence, foreign-import exclusion, unchanged themes and unchanged semantic policy.
- Actual IndexedDB foreground startup suite: 51 passing tests. Added cases cover dormant warm
  graph/URL/source caches, warm reuse without Markdown reads, cold first demand in both strategies,
  equal-stat body/URL invalidation and changed ontology policy without navigation away.
- Native tooling files pass Node syntax checks. No parser, compiler, schema or read-API replacement
  was introduced. No watchdog assertion or timing bound was weakened.

**The final aggregate gate is not green.** An earlier complete pinned-Node
`npm run verify:obsidian` passed, including 1,247 primary, 334 portable source and 652 browser-source
tests, build, staging and native rendering. That build had per-device admission but preceded the
additional per-device strategy controls. Do not treat it as final-head verification.

The first expanded-scope aggregate completed 1,253 primary tests: 1,252 passed and one old test
still submitted the retired global selectors. That test was updated to the six actual controls and
its complete 69-test suite passed. The next aggregate stopped at the existing restore-watchdog
timer-count assertion (`tests/indexing.test.mjs:3478`, actual 1, expected 0), after the 58 admission
and 27 independence scenarios passed. Related timer failures were observed earlier on the baseline.
The failure is preserved; its cause has not been repaired or waived here. There was no further
aggregate retry. A prior unpinned browser run also had a pre-bundle Chromium bootstrap failure;
it is retained separately and is not presented as a production regression or a passing lane.

## Native results and cleanup

Only the explicitly configured disposable `kplex-test-small` was targeted. It began with 107 files
(88 Markdown), no Plex and Settings closed. Windows 11 build 26200; Obsidian **1.14.4**, installer
**1.14.0**; Electron **43.3.0**, Chromium **150.0.7871.212**, embedded Node **24.18.1**.

The native admission, ontology and external-settings feature lanes below used this artifact
(before the final UI-only row removal):

| Artifact | SHA-256 |
| --- | --- |
| main.js | `b3b6e6f1b21a426e4580db4ae1431bf77c4faa5f156b11e004605d1c465f9620` |
| styles.css | `8fd9dac8ebdafb07c38f82d74fdba5e3aa7ab3990a4348a6097c993f25d5c8a6` |
| manifest.json | `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c` |

- New admission driver: seven native scenarios pass, including ten seconds dormant, actual native
  file/metadata activity while dormant, all six real Settings controls, concurrent main/sidebar
  opening, close/reopen reuse, enabled Eager preparation without a Plex, exactly one explicit first
  full build and admission by an inactive live Plex. Settings screenshots use the owning window.
- The stationary test center and connection appeared after **285.8 ms** from explicit opening.
  This is a DOM observation in this small fixture, not paint timing or a latency guarantee.
- Existing native startup-ontology driver: pass. The stationary graph and SVG adopt authored inverse
  ontology while the remaining progressive source is held; source provenance is preserved.
- Existing native external-settings driver: seven cases pass in each of actual On-demand and Eager
  sessions. Incoming saved strategy changes do not change the active index. Configuration restoration
  passes. These lanes also exercise actual Settings and multiple native views.

Failed native attempts remain private: an unloaded-plugin setup, a missing explanation caused by
unnamed declarative rows, and an opening fixture that incorrectly expected saved history to outrank
the active native document. The UI explanation was fixed with named native rows. The fixture now
opens its owned native document before testing normal explicit opening. No production navigation
behavior or deadline was changed to satisfy the test.

Original executables/configuration and all original file hashes have a durable local backup.
Final cleanup removed owned notes and controllers, left zero main/sidebar Plexes and restored all
107 original file hashes plus exact `data.json`, `workspace.json` and enabled-plugin-list bytes.
The candidate executable remains installed in Small. No personal-vault files were read or written.

## Final row removal and merge authorization

The final patch removes only the informational Web link indexing row from Indexing config.
URL discovery behavior and stored compatibility fields are unchanged. The maintainer then
explicitly authorized merging the PR and closing its related issue.

On Node 22.22.2, the final row-removal checks passed: 105 settings/migration, device-policy and
localization tests; real build; Obsidian scanner. Actual native Settings in Small confirmed the
row absent, all six device controls present and restart disclosure visible. All 107 files remain;
Settings and Plexes are closed; original settings/workspace/enabled-list bytes were restored.
Final `main.js` SHA-256 is
`ca7e60573a2fcb227e13f32bca4eb29cf6e43e49018b9fd6705385230fdb9b1b`;
styles and manifest are unchanged from the table above. The final native receipt is private under
`final-row-removal/report.json`. The aggregate watchdog limitation and unrun physical-device,
macOS and full-process-restart checks were not reclassified as passing. No new broad performance
experiment or aggregate retry was performed for the informational-row removal.

## Resource observation and limits

A single prior-main observation and candidate observation used the same small fixture and
On-demand strategy with no Plex. Prior main checked/restored 88 URL owners; candidate performed
zero URL checks/restores, source checks/reads/parses and graph hydration while dormant.
The prior graph cache was unavailable; the candidate's dormant graph cache was not inspected.
These are different cache conditions, not a matched warm-graph performance comparison.

Ten-second windows including plugin reload recorded 343,000 µs renderer CPU on prior main and
517,000 µs on candidate. Live heap after two forced collections outside the timing window was
634,543,996 and 670,634,260 bytes respectively. The renderer had other retained host work and a
different test history. These whole-renderer observations demonstrate **no CPU or retained-memory
improvement**, and cannot attribute a delta to this plugin. The established result is deferred
pipeline activity. No broad benchmark, reader-sharing or receipt experiment was started.

Remaining validation limits: the final aggregate watchdog failure; physical phone/
tablet cold/warm startup, restored views and suspend/resume; macOS; and full Obsidian process restart.
Native evidence here uses plugin reload and controlled progressive startup, not a full process restart.
No other vault/window was closed to manufacture that coverage.

Private reports, failed attempts, screenshots, logs, original backups and the source manifest remain
under `%LOCALAPPDATA%/KplexValidation/startup-policy-195`. They are not committed or published.
