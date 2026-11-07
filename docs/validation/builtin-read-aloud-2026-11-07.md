# Built-in read-aloud validation — 2026-11-07

## Identity and scope

- Branch: `feat/builtin-read-aloud`.
- Base: `412c5e9ed3ed1c3966e550292585158af9cafded`.
- Delivery: uncommitted feature changes; no commit, push, PR or vault deployment.
- Feature patch SHA-256: `4f5fdfe77dac735f1b621b18bc24011fb3bd8a152f2780268c18dcb0a619c31f`.
  Identity hashes the binary Git diff from HEAD, excluding this record and the
  pre-existing `scripts/testing/obsidian/verify.mjs` change, followed by sorted
  untracked feature paths and contents, with NUL delimiters.
- Existing `scripts/testing/obsidian/verify.mjs` edits were preserved.

All existing reading entry points now use one built-in native reader. Desktop
prefers Edge TTS, with per-session system fallback; mobile uses system speech.
Explicit Play follows a network disclosure. Pause, resume, stop, replacement,
popout close and plugin unload retire their owned playback resources. Engine
and language choices use the existing settings writer; old settings default to
Edge/automatic, and foreign graph imports preserve local reading preferences.
No graph source, classifier, scheduler, persistent cache or semantic owner changed.

The desktop transport bundles `ws 8.22.1` behind a lazy desktop guard. The token
adaptation's upstream source and license texts are retained under
[licenses](../licenses/README.md) and embedded in the normal plugin bundle.

## Automated evidence

Acceptance checks used Node **22.22.2** on macOS (Darwin 27.2.0), with installed
Obsidian **1.13.0** typings. The initial transport investigation used Node 22.23.1;
its type/protocol checks were superseded by the required runtime lane below.

- `npm run test:read-aloud`: **21/21 passed** on final source. Exercises Edge
  preference, network/decoder fallback, remaining-text behavior, system-only
  mode, pause/resume, cancellation during synthesis/audio/native speech, silent
  system-service failure, Unicode chunking, old settings/non-default/unknown-key
  reload, foreign import preservation, native-shell controls and popout cleanup.
  The mobile bundle test loads real bundled transport code and refuses every
  Node module require, proving the desktop transport stays unevaluated.
- `node --test --test-concurrency=1 tests/read-aloud.test.mjs tests/read-aloud-shell.test.mjs tests/edge-tts.test.mjs tests/localization.test.mjs tests/release-build.test.mjs`:
  **47/47 passed** before the final typed-array transport cleanup. The affected
  21 speech tests were rerun afterward. Localization covers all eight supported
  catalogs. The release check retains hardening and compares clean, dirty and
  archive builds, including complete embedded speech license texts.
- `npm run check:architecture`: passed; **239 migrated roots, 471 reachable
  files, zero violations**; numeric-control fixtures/checks passed.
- `npm run check:release`: passed for **0.4.2 stable**.
- `npm run build`: passed on final source against the real repository and
  installed Obsidian types; produced all three installable artifacts.
- `npm run lint:obsidian`: passed with **zero warnings/errors** on final source.
- `git diff --check`: passed.
- Final production desktop transport, using synthetic Chinese text only, returned
  **19,872 bytes of `audio/mpeg`** through the live Edge service on Node 22.22.2.
  An earlier English synthetic probe returned 14,832 bytes. These are synthesis
  results, not evidence of native speaker output or UI interaction.

Final artifact SHA-256 values:

```text
a28be316fd72434ef4d76caa8615b65b0b50f318a57444583e44f884f81de7be  dist/main.js
60e99f1b8a2c771be4a79bf882322b7ca05bcb0a1f651e3e89e646c2dbdcf005  dist/manifest.json
93d9ceac073382dafad37ae905aa44b3ee8c420a2f6ab063178bd6cebc194463  dist/styles.css
```

## Limits and pending acceptance

Full indexing/aggregate suites were intentionally omitted: the feature consumes
already supplied reading text and has no semantic/indexing path. The existing
indexing test module inventory was extended so future aggregate runs can load
the new imports. No large-vault performance claim is made.

No explicit `KPLEX_TEST_VAULT_NAME`, `KPLEX_TEST_VAULT_PATH` or
`KPLEX_TEST_CONFIG_DIR` was configured. No vault was created or modified, and no
exact-build native Obsidian acceptance was run. Settings reload evidence is an
executable serialization/migration round trip, not a native plugin restart.
Native voice availability, actual audible playback, native UI geometry and
physical mobile operation remain pending.

Prioritized native checks once an approved disposable vault is configured:

1. Open a Chinese abstract/section reader. Play should use Edge online; Pause
   silences it, Resume continues, and Stop ends playback. An unavailable Edge
   service should continue through an installed system voice with visible status.
2. Select System speech and an explicit voice language, then reload the plugin.
   The preferences should persist; playback should make no Edge request and use
   the selected system language when an appropriate installed voice exists.
3. Close an active reader, its popout, or unload the plugin during synthesis and
   playback. Sound should stop, queued text should not restart, and ordinary
   workspace tabs, sidecars, graph center and camera should retain their state.

## Follow-up: user-authorized deployment and native playback

After the implementation report, the maintainer explicitly authorized deployment
and a trial in their existing Obsidian vault. This supersedes the implementation
phase's no-deployment/no-native-playback limitation above. No disposable fixture
was created and no notes were edited or used as remote speech input.

- Verified the CLI-reported vault path against the exact user-supplied destination.
- Backed up the existing three plugin files, settings and enabled-plugin list to
  a private directory outside the repository/vault, then installed the exact
  built artifacts listed above. `plugin:reload id=k-plex` succeeded on Obsidian
  **1.15.1**. The CLI reported an older installer; its native commands still worked.
- Reacquired the loaded plugin and opened its real native reader with synthetic
  Chinese text. Edge MP3 loaded with native media `readyState: 4` and a duration
  of **8.928 seconds**, without system fallback.
- Real native Modal button activation confirmed playback progression, stable
  paused time, resumed progression and Stop releasing the audio. A second pass
  delivered Electron mouse events and verified **`isTrusted: true`** on all four
  Play/Pause/Resume/Stop button clicks.
- Initial pointer attempts failed because this vault uses a **0.9128709291752769**
  Obsidian zoom factor. The one-off driver was corrected to transform CSS
  coordinates into native input coordinates; no production code was changed.
- A foreground capture of the actual reader was inspected. The window showed the
  title, synthetic test label, Microsoft network disclosure, status and controls.
  Early captures while Obsidian was hidden were stale and are not visual evidence.
- Foreground native Modal/media checks passed. The later trusted-pointer run's
  renderer was hidden; its event/media observations establish functional routing,
  not foreground performance or physical mouse acceptance.
- Final file hashes matched the built artifacts. Plugin settings and the enabled
  plugin list remained **byte-for-byte unchanged** after deployment/reload/trials.
- The reader was left idle with no retained audio for the user to try. All probe
  scripts/reports/screenshots and executable/settings backups remain private and
  outside the Git checkout. No runtime wrapper or global controller was installed.

This acceptance covers desktop Edge playback and the live reader controls. Native
system fallback, preferences across native restart, physical mobile, and native
popout/unload cancellation remain separate checks; their automated contracts
passed in the earlier focused lane.

## Follow-up: floating player, Markdown entry points and playback preferences

The maintainer requested a draggable player, Markdown selection/whole-note reading,
previous/next paragraph controls, and voice/speed settings. The reader is now a
modeless owning-document surface, retaining the `ReadAloudModal` class name for
existing callers. It reuses `enableDraggableDialog`, native Obsidian controls and
`numberSlider`; opening it leaves notes editable and sends no text. Blank lines
separate paragraphs; transport chunk limits do not change paragraph boundaries.
Idle navigation selects silently, active navigation cancels/replaces playback,
and paused navigation preserves the pause. Engine switches stop playback until
another explicit Play follows the updated disclosure. Edge rate changes apply to
live audio; system-rate/voice changes restart the current paragraph.

Source-mode selections reuse the existing plain-text helper. Reading-mode native
selections remain verbatim and must belong entirely to the invoking Markdown
view. Whole-note source reads include unsaved editor content and use Obsidian's
frontmatter bounds. Reading-mode file reads fence request generation, unload,
mode/view/file identity, connection, mtime and size. Neither entry point changes
notes, navigation or graph semantics. All eight language catalogs and the README
were updated. Existing abstract/paper/section entry points share this reader and
retain their invoking document, including popout callers.

### Final identity and automated results

- Branch remains `feat/builtin-read-aloud`, base
  `412c5e9ed3ed1c3966e550292585158af9cafded`; changes are uncommitted.
- Final feature patch SHA-256:
  `c27dc8d79ccdf2891c7f2e8fa61ac592f6ffe30ae9798ca97d82b2e896fed5e2`.
  This hashes the binary diff from HEAD excluding this record and the existing
  `scripts/testing/obsidian/verify.mjs` change, then sorted untracked feature paths
  and contents with NUL delimiters. The existing driver edits remain untouched.
- Acceptance runtime: Node **22.22.2**, macOS Darwin 27.2.0; actual installed
  Obsidian **1.13.0** typings. Supporting agent checks on Node 22.23.1 were
  superseded by the equipped environment's required-runtime results.
- `npm run test:read-aloud`: **32/32 passed**. Includes **six real Chromium DOM
  scenarios** for modeless editing, paragraph navigation/cancellation, active and
  paused speed changes, shared dragging/clamping, owning-document retirement,
  disclosure gating and a 375 × 540 viewport without horizontal overflow.
  Controller/transport checks cover selected voices, SSML validation, rate bounds,
  paragraph progress, fallback and late-work cancellation. New executable main
  entry-point checks cover source/rendered selection differences, unsaved text,
  native-frontmatter seam, stale reads, read failures and preference round trips.
- `node --test --test-concurrency=1 tests/localization.test.mjs tests/release-build.test.mjs`:
  **26/26 passed**. Together with the speech lane, **58 focused tests passed**.
- `npm run build`: passed after integration settled, against the real repository
  and installed Obsidian types; all three installable files were produced.
- `npm run lint:obsidian`: passed on final production source, zero warnings/errors.
- `npm run check:architecture`: passed, **239 migrated roots / 471 reachable files /
  zero violations**, including shared numeric-control checks.
- `npm run check:release`: passed, **0.4.2 stable**.
- `git diff --check`: passed. Full indexing/aggregate suites remain intentionally
  omitted: this feature has no semantic/indexing path. No indexing, large-vault
  performance, or physical-device claim is made.

Final built and installed SHA-256 values match:

```text
44c4ab5774551d92bb6e1a0d3281c7303a5f390ad0a3fe8bd7e8df7b93d1a91d  main.js
60e99f1b8a2c771be4a79bf882322b7ca05bcb0a1f651e3e89e646c2dbdcf005  manifest.json
250c92398a93b824a773a11d2e7aa2110fca333e7412101d87591a7552501463  styles.css
```

### Exact-build native results

Deployed/reloaded only the executable artifacts into the previously authorized
existing vault, with fresh private executable/settings backups and CLI path
verification. Obsidian reports **1.15.1**, installer **1.8.10**. Native drivers used
the shared process helpers, bounded argument-array calls and synthetic speech.

- Trusted Electron mouse events (`isTrusted: true`) exercised Play, Pause, Resume,
  Previous, Next, Stop, settings disclosure and Close. Native media progressed,
  paused stably and released on Stop. Paragraph positions advanced/reversed as
  requested. The default Chinese Edge audio was **7.128 seconds** with no fallback.
- Selected **zh-CN-YunxiNeural** synthesized **42,480 MPEG bytes** and played in the
  actual reader with no fallback, **7.08 seconds** duration and **1.25×** playback
  rate. Rate changes updated the native audio and permanent slider readout.
  Voice/rate edits in this control probe used an isolated save callback, restored
  independently in `finally`, so trial choices did not become user defaults.
- Trusted native header dragging moved the panel approximately **131 px left /
  66 px up**, keeping it in the viewport. Close removed the plugin-owned reader.
- A fresh visible-document capture of the real expanded player was inspected:
  title, paragraph preview/count, disclosure, five transport buttons, settings
  button, engine/language/voice selects and the visible speed readout all render.
  Earlier stale captures are rejected as visual evidence. Native pointer/media
  observations establish functional routing, not foreground performance or
  physical mouse/device acceptance.
- Real registered commands opened an idle reader for a **275-character native
  reading-mode selection** and a whole note yielding **40,016 text characters /
  162 paragraphs**. A revealed native source editor also opened an idle reader
  for a **20-character selection** and its **1,386-character body**. Native
  frontmatter was excluded from full-note reading. No real note was edited or
  played remotely; prior native selections and active leaf were restored.
- The actual serialized settings callback saved **Yunxi / Samantha / 1.25×**;
  plugin reload restored all three non-default values and preserved other
  settings. A compare-before-restore step then restored the exact original private
  settings bytes and reloaded again, returning to **auto / auto / 1×**. Final
  settings SHA-256 is
  `68dfb117be77a5c2b3062c3ba723bdd45f6947296ac8e55184c55030ba0ed4f3`,
  identical to the pre-enhancement-deployment snapshot. The enabled-plugin list
  also remained byte-for-byte unchanged.
- The final player is left idle with synthetic test text and no retained audio.
  Temporary synthesis/save wrappers were restored; native throttle settings were
  restored after capture. No diagnostic globals or production logging were added.

Initial native-driver failures were investigated and retained in private reports:
Obsidian adds measurement-only select elements, so positional DOM lookup selected
the language field instead of the voice field. Inventory-based lookup corrected
that probe. A separate production transport check confirmed both Xiaoxiao and
Yunxi return MPEG audio. Source-editor probes initially targeted hidden YAML;
Obsidian's selection guard collapsed those ranges. Revealing a native leaf and
selecting its body resolved that fixture issue. These investigations required no
production workaround or weakened assertions.

Private backups, reports (`validation.json`, `final-verification.json`,
`source-entry.json`, `preferences-reload.json`) and the accepted
`foreground-reader.png` remain outside the repository/vault. Physical mobile,
actual native popout interaction and native system-engine rate behavior remain
separate acceptance limits; Chromium/controller contracts passed. No additional
manual check is required for the delivered desktop flow.

## Release preparation: 0.5.0

The maintainer subsequently authorized committing, pushing, merging into the fork's
`main`, and publishing a release. The target is **wangjia15/kplex**; the upstream
repository is not the publication target. `npm run release:prepare -- 0.5.0`
updated both manifests, npm metadata/lock root and `versions.json`, retaining
Obsidian 1.13.0 as the minimum. Runtime behavior is unchanged from the native-tested
feature build above; artifact hashes above identify that earlier 0.4.2 build.

On Node 22.22.2, `npm run build` passed for the 0.5.0 candidate. The exact local
command below passed **102/102 tests**, including all 32 speech tests and release
metadata/preparation/reproducibility coverage:

```bash
node --test --test-concurrency=1 tests/release-metadata.test.mjs tests/release-build.test.mjs tests/read-aloud.test.mjs tests/read-aloud-entry.test.mjs tests/edge-tts.test.mjs tests/read-aloud-shell.test.mjs
```

The PR's established full `npm run verify` CI remains the merge gate. After it
passes, the release tag is to name the accepted `main` head; the existing tag
workflow builds, validates and publishes `main.js`, `manifest.json` and
`styles.css`. This preparation record does not claim pending CI or publication
completed; final run and asset evidence belongs on the PR/release.
