# Sidecar viewport centering

Prepared by Zsolt's Codex Agent. Accepted base: d48f76641df149dd5bb4d000fe9764251ece9807 (merged PR213). Branch: 2026-10-24-sidecar-viewport-center.

## Cause and change

Ordinary pane resizing intentionally preserves a manually positioned camera. Autozoom resize handling also requires an existing automatic-fit certificate; manual pan/zoom retires that certificate. Consequently opening or closing Sidecar does not reliably center the Plex in its changed viewport.

App now supplies its existing per-view Sidecar open/closed state to PlexGraph. Only a state transition requests framing, after two animation frames in the viewport's owning window so native layout and ResizeObserver can publish new geometry. The callback reads the latest composed scene/settings. Autozoom enabled reuses the existing fit owner; disabled preserves the exact camera scale and translates the central occurrence to the viewport midpoint, including nonzero focal coordinates.

Pointer, wheel or keyboard input cancels the pending request. Navigation, a superseding transition and unmount cancel the original window's frames and listeners. Completion removes those listeners immediately. Initial mounting, unrelated Sidecar notifications, graph publications and ordinary splitter drags do not initiate this request. Disconnected or zero-size viewports do not write a camera. Existing display transitions, native document/fold ownership, indexing and storage paths are unchanged. No new setting or user-facing string is needed.

## Actual validation

Node22.22.2, actual installed dependencies:

- Focused production camera/Sidecar callbacks: `node --test --test-concurrency=1 tests/viewport-fit.test.mjs tests/sidecar-fold-ui.test.mjs`:18/18 pass, no failures/cancellations/skips. Cases cover narrower/wider/shorter/taller viewports, manual prior cameras, autozoom on/off, latest-render framing, input/navigation retirement, hidden geometry, cleanup and ordinary-resize controls.
- Headless Chromium UI checks: `node --test --test-concurrency=1 tests/display-modes.test.mjs tests/sidecar-attach-controls.test.mjs`:8/8 pass. These retain display-mode camera/root/state preservation and Sidecar control geometry; they are not native Obsidian acceptance of the new behavior.
- `npm run check:architecture`:7/7 pass;151 migrated roots,273 reachable files,0 violations.
- `npm run lint:obsidian`:exit0.
- `npm run build`:exit0, including TypeScript against installed Obsidian declarations and the actual production bundle.
- `git diff --check`:pass.

First focused attempt:17/18, because a new strict floating-point equality compared449.99999999999994 with450. The new geometric assertion now uses1e-9 numeric precision; exact zoom equality remains. No existing assertion or performance threshold changed. The original log is retained privately. First sandboxed build could not resolve the source because esbuild was denied ancestor-directory access; the normal build rerun outside that sandbox passed with the pinned Node directory first on PATH. Neither unsuccessful attempt is represented as a pass.

Final production SHA-256:

- main.js: e197ef623724d3271bfafbd5459152653d00f63f182b8a218fe00c660d1ec1f9
- manifest.json:843d327e4a634a6e28cd645be8c533adc873a1ac1c6498502b5ca44e70120109
- styles.css:0ece0916859bcda0203dc5dcbb3906ce1d932a2fbceb47a5dccd4076cd83f381

Private logs under %TEMP% use prefix kplex-sidecar-center-. No indexing benchmark, performance campaign or complete broad verification was run for this UI-only change.

## Additional visibility-grid improvement

The maintainer also requested three columns for the nine visibility toggles when space permits. One CSS declaration now uses auto-fit columns with a160px minimum, bounded by available width; the existing560px panel displays3 columns and3 rows. Narrower panels retain2 columns and the existing small-screen1-column override. Toggle order, labels, handlers and settings are unchanged.

A private headless Chromium check loaded production CSS with explicit host-theme tokens and all9 native toggle labels. At panel widths560/440/320px and viewports1000/700/375px, measured columns were3/2/1, all switches visible and contained, with no horizontal overflow. The560px screenshot was visually inspected. This isolated CSS check does not claim foreground/native Obsidian acceptance. The official scanner and real production build were rerun successfully; main.js and manifest hashes remain unchanged, and the updated styles hash is recorded above. No permanent test or performance campaign was added for the reversible CSS change.

Subtle vertical dividers now use the native background-modifier-border theme token in the column gaps. First-column rules are clipped;2px padding preserves the existing switch focus rings. No pointer targets or control handlers change. The same Chromium checks measured2/1/0 visible divider positions for3/2/1 columns, retained focus-ring space and no overflow; the wide screenshot was inspected. Scanner and real build pass again; final styles hash above includes the dividers.

## Remaining native evidence

Foreground access remains on hold until the maintainer explicitly says ready. No staging, reload, foreground Obsidian operation or native acceptance has run. After ready, use existing guarded disposable Small and the exact artifact above: test ordinary open/close in all four positions after manual pan/zoom, with autozoom both enabled and disabled; verify focal centering and unchanged scale when disabled. Check modifier fold/unfold-close, rapid toggle/input cancellation and retained editor/focus/layout cleanup. Approximately5-10minutes of foreground work remains. Main-window/popout native layout timing and physical Mac/mobile behavior remain unverified. No merge, release or production deployment is authorized.

## Central-editor modifier opening and tooltip audit

The central thought's Use editor as central node corner action now forwards its original stopped click event. Any Alt, Control, Meta or Shift flag, including combinations, invokes the existing camera-preserving expanded-editor owner before enabling the existing view-local editor representation. Ordinary clicks retain normal editor opening. Existing sidepanel restrictions remain and unsupported expansion does not advertise the hint. The English tooltip reads: Use editor as central node. ALT/Opt to open in expanded editor mode. All8 catalogs maintain the new key; literal ALT/Opt is the maintainer's explicit task-specific copy choice.

The editor toolbar now uses a shared host-free TooltipButton. Its accessible name is a stable referenced hidden label; only K-Plex's existing delegated tooltip owner renders its hover/long-press hint. No aria-label or HTML title remains on those buttons or their toolbar, removing the competing native Obsidian aria-label tooltip path independently of CSS suppression. The shared owner resolves referenced labels in the control's actual document. Button actions, disabled/pressed semantics, native editor lifetimes and camera restoration remain with their existing owners.

The source audit covered native JSX title attributes, custom ToolButton title props, imperative tooltip calls and shared hover/long-press targets. It found one additional overlapping native path: expanded mini-thought rows had both aria-label and title. Those rows retain the existing full filename/path title and use a separate referenced full accessible name. Existing compact thought/image titles, filter select help, relation filenames and iframe accessibility titles remain; ToolButton's title prop already maps to one aria-label, and native setTooltip calls use the native owner's own aria-label mechanism. The final JSX audit reviews7 native title elements and finds0 overlapping aria-label/shared-tooltip markers. This is a source audit plus headless evidence, not a claim to have enumerated every live third-party tooltip in Obsidian.

Actual additional checks on Node22.22.2:

- `node --test --test-concurrency=1 tests/viewport-fit.test.mjs tests/localization.test.mjs`:40/40 pass. Tests include all16 modifier combinations, original event forwarding, sidepanel negative controls, expansion/restoration camera ownership and exact hint copy across8 locales.
- `node --test --test-concurrency=1 tests/control-tooltips.test.mjs`:10/10 pass in real Chromium. A production TooltipButton exposes1 shared tooltip, no native aria/title candidate, updates its label, and retains its correct accessible button name verified through Chromium's accessibility tree. Existing delayed hover, owning-document, long-press and cleanup controls remain green.
- Affected `tests/ui-components.test.mjs` cases selected by attachment rename collision, Editor shared menu, nodes retain compact and long node titles:4/4 pass. They preserve editor-menu delegation, mini-row full accessibility/title, stationary modifier previews, dragging/rename and truncation behavior.
- Architecture:7/7,152 migrated roots,274 reachable files,0 violations. Official scanner and final actual-dependency build/types pass. No full broad verification or performance campaign.

One retained initial affected-browser attempt was3/4: its source-extraction fixture found9 owners instead of8 because the prior Sidecar effect introduced another nested cancel callback. That new cleanup now has the precise name retireSidecarFraming; unchanged source-owner assertions pass4/4. The editor-menu fixture intentionally reads the referenced accessible name instead of the removed aria-label and still checks the exact icon, real button/document and delegated action. Original and corrected receipts remain private under kplex-editor-*. The earlier Sidecar-only main artifact f43871726a44a8b033f45854fb3ce4f3dfbd4138610abe3a3e50e2b30d79c8a9 remains historical; the final combined artifact above includes these editor changes.

Remaining native checks also include normal versus modifier editor opening, restore/collapse, and a single tooltip in main-window/popout editor controls. Foreground WAIT persists; no such native result is claimed.


## Accepted-main integration and merge authorization

The maintainer explicitly requested conflict resolution and merging PR214, followed by switching/fetching main. Accepted main a57f5109e75678bbb9b13eb55bbd4c29c85938f4 includes merged PR212. A normal non-rewriting merge produced only a conflict in the transient HANDOFF assignment; its standing header and current UI assignment were retained with the new authorization. All PR212 production code and durable reports are preserved. The integrated UI/lang/styles and focused-test inputs exactly match validated PR head6e8116e; SourceRepository and sourceAcquisition exactly match accepted main. No runtime conflict resolution or speculative code change was needed.

Integrated Node22.22.2 real-dependency production build/types and40 focused camera/modifier/localization tests pass. Architecture also passes7/7 with0 violations. The merged accepted-main files retain two pre-existing blank-at-EOF whitespace notices; their contents are preserved rather than folded into an unrelated cleanup. Existing headless tooltip/UI/CSS evidence is reused because those implementation inputs are unchanged. PR212 validation evidence remains in its accepted reports; no indexing/performance campaign or new foreground operation was run. Native checks remain unrun and are not relabeled as passes.

Integrated artifact SHA-256: main.js797072ba2bb04fd672f8af2fc633d59a5dfefeb7df0eee931154130c487260fd; manifest843d327e4a634a6e28cd645be8c533adc873a1ac1c6498502b5ca44e70120109; styles0ece0916859bcda0203dc5dcbb3906ce1d932a2fbceb47a5dccd4076cd83f381. Earlier e197 combined UI and f438 Sidecar-only artifacts remain historical identities, not native-tested integrated artifacts. No release or production deployment is authorized.
