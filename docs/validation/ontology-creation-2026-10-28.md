# Ontology creation from pairing and connection dialogs

Branch: `2026-10-28-create-ontology-fields`, based on `34aedd4`.
The maintainer reported that both workflows passed manual testing and authorized PR creation and merge on 2026-10-28. No release or production-vault deployment was performed for this enhancement.

## Behavior

- Typing a valid new reciprocal name offers **Create … as paired field** in the existing native suggester. Selection changes only the local draft; Save persists both assignments through the existing atomic ontology writer.
- Existing, incompatible, self-paired and stale names cannot be created through that choice. Existing-field selection and the explicit creation toggle remain available.
- **Add connection ontology** and **Specify connection ontology** offer **Create ontology…**. Their child editor retains the captured relationship role and returns the accepted physical field to the picker.
- Vocabulary Save does not edit a note. The parent connection confirmation still owns the additive metadata write and reciprocal-storage choice. Child Cancel retains the previous selection; parent close retires its child.
- The new and revised copy is present in all eight supported languages. The paired-ontology guide documents both paths.

## Automated checks

Node `22.22.3`, installed repository dependencies and Obsidian declarations:

- Real production build and official Obsidian lint passed.
- `node --test --test-concurrency=1 tests/ontology-pair-modal.test.mjs tests/localization.test.mjs`: **48/48 passed**, including six new creation/lifecycle cases.
- Architecture/numeric-control checks and restricted core checks passed during `npm run verify`.
- The indexing fixture required its existing expression/editor/viewport dependencies and current Edge input to be supplied. The fixture now passes without changing its assertions or production behavior.
- The first broad test stage completed with **1,661/1,666 passed** and five failures in `action-host-integration.test.mjs` and `plex-view-session.test.mjs`. An untouched `git archive 34aedd4` using the same installed dependencies independently reproduced exactly those five failures: **96/101 passed**. The two action tests expect older workflow preference generations; three session tests expect the former attention-only editor contract. Those unrelated contracts were not changed here. `npm run verify` stopped there, so its later browser/source stages and final build were not reached. The focused browser checks and independent production build above passed; full verification is not reported as passing.

## Native functional acceptance

Prepared disposable `kplex-test-small`, macOS, Obsidian **1.15.0** / installer **1.14.0**, eager indexing:

1. Created a new reciprocal field from the actual native pairing dialog and verified both directions.
2. Cancelled connection-field creation and verified that the previous selection remained.
3. Saved new connection vocabulary, including its reciprocal partner, and verified that the note was still unchanged.
4. Confirmed the actual connection dialog and verified the added YAML property plus preservation of the existing Markdown-body link.

All four cases passed against the exact built artifacts. The child dialog was visually inspected in its owning window. The normal saved-refresh-pending notice appeared during the scenario; the accepted vocabulary remained available and the subsequent metadata write succeeded. No claim of a complete immediate scene refresh is made.

The probe removed its owned notes/folder and restored settings. Independent outer cleanup restored the original plugin artifacts, configuration bytes and workspace. The initial capture preceded dialog paint; the second capture waited for the owning window and showed the actual child dialog.

Candidate SHA-256:

- `main.js`: `8f4c29a50b82e0a74a59c31990c66a27999f1bf7d441b11b868f084aa8fbd8de`
- `styles.css`: `d7ed47e0720e607869e5cc40b94c32d9233272223d58d3e3b1bcb9c2dafa476e`
- `manifest.json`: `49596950b87caaf2fddaf0f58e826287c67d0e0998d3b69905c2ec298fd8b350`

Physical touch and native popout interaction remain separate coverage. Recommended follow-up: on a physical phone/tablet, select a creation suggestion, cancel the nested editor, and confirm that focus/scroll return to the invoking connection picker without applying a property.
