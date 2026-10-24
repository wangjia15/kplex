# Paired factory ontology defaults - 2026-10-20

Base: `f646c75bc7d2a4b8ca2f64af43cb8826a30afab9`; branch: `2026-10-20-paired-ontology-defaults`.

## Delivered behavior

Fresh/no-data settings declare nine inverse pairs through the existing version-1 grammar: Parent/Child, Parents/Children, up/down, u/d, North/South, Previous/Next, West/East, w/e and Before/After. Remaining aliases stay independent. Physical counterpart entries retain their existing ordering anchors. No additional ontology fields, source facts, index stores, scans or parsing are introduced.

Historical defaults remain separate: saved settings (including native-color settings with omitted ontology), literal slash fields and ExcaliBrain imports retain their ontology semantics. A partial foreign import over fresh settings still owns its explicitly replaced role lists. Default hierarchy copies are independent, and pairs survive JSON persistence/restart.

Three unrelated settings-policy fixtures previously compared a genuinely fresh installation with partial historical settings. They now compare equivalent historical inventories while retaining their exact invalidation assertions; no production policy or timing bounds were weakened.

## Verification

Node 22.22.2 on Windows. Final focused regression command:

```text
node --test tests/excalibrain-migration.test.mjs tests/ontology-configuration.test.mjs tests/ontology-presentation.test.mjs tests/date-property-relations.test.mjs tests/internal-hotkeys.test.mjs tests/ontology-suggester.test.mjs
```

135 passed. `npm run build` passed. The required `npm run verify` passed release metadata, architecture, core (130 tests) and Obsidian lint; final aggregate stopped at the existing snapshot-hydration watchdog assertion in `tests/indexing.test.mjs:3433` (`watchdogTimers.size`: 1 versus expected 0). It is not reported green. An earlier aggregate reached 1,255 portable assertions: its three fresh/legacy fixture mismatches were subsequently corrected and all affected files rerun successfully. No further indexing optimization or performance campaign was attempted.

Native exact-build smoke passed using the existing `runObsidianVerification` staging/rendering owner in `C:\Obsidian\kplex-test-small`: plugin command registered, `.kplex-app` rendered and no captured JavaScript errors. Its portable callback was deliberately empty because portable verification/build ran separately; this native receipt does not certify the failed full aggregate. Private receipt: `%LOCALAPPDATA%/KplexValidation/paired-defaults-2026-10-20/report.json`. No personal vault or Help-vault notes/settings were used for this check. Fresh-install and restart behavior were verified through the production migration function, not by removing an existing native vault's data.json.

Ontology browser command: `node --test --test-concurrency=1 tests/ontology-input.test.mjs tests/ontology-pair-modal.test.mjs`: 35/36 passed. The burst/caret row case failed during harness setup (`Production bundle did not load in Chromium`, document still loading, no captured script error), before the production scenario ran. All other cases, including the pair-manager/editor cases, passed. No browser harness, loading deadline or retry behavior was changed; the setup failure was not rerun.

## Source review

The change stays in the existing settings/default and migration owner. The existing ontology grammar supplies reciprocal display metadata; the regression verifies identical physical field/role inventories. Compiler, acquisition, persistence schema and runtime indexing code are unchanged. No user-interface copy, localization keys, components or CSS changed. The existing Help-repository working tree is preserved independently. Physical mobile and macOS first-install checks were not performed.
