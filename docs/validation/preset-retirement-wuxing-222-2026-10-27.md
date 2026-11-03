# Facets preset library and Wu Xing alignment

Starting source: 809510f3edb5027848ea3cd6bcbf929dc051031d, existing PR #222 branch. Archive checkpoint: [0a1365e](https://github.com/zsviczian/kplex/commit/0a1365e820d343c2cf8708c66eeea8417f77cbc7).

## Result

ARC, PARA, GTD horizons, eACCESS, Sensemaking and Publishing pipeline are complete, independently importable version-1 JSON packages in [presets/facets](../../presets/facets/README.md). Their definitions and English help were exported through the production portable-package owner before removal. Publishing's previously missing label translations are readable English in its export. Fresh installations inherit only Wu Xing and Local map roles. Saved user definitions remain intact, including saved former built-ins; their historical help remains available. An inherited-only removed selection retains its requested ID and falls back safely until its JSON is imported. Opening Settings does not materialize defaults.

Wu Xing was reviewed against Dumo's fixed [fa038f0af796a9a6f42e6f8eb91e44c13ba3e067](https://github.com/dumodal/kplex-wuxing/commit/fa038f0af796a9a6f42e6f8eb91e44c13ba3e067), still the fork's main head at review. The default Markdown field is now `status`: Wood 🟢, Fire 🔴, Earth 🟤, Metal 🟡, Water 🔵. Canonical assignments write those emojis; presentation-selector variants and English phase IDs are aliases. Wood starts at the top, followed clockwise by Fire, Earth, Metal and Water, using green/red/brown/yellow/blue. Existing saved `phase` configurations are not rewritten.

Our centered attention note, configurable Facets classifier/layout, canonical relationship evidence, diagnostics, relative roles and separate generating/regulating decorative guides remain authoritative. No parser, renderer, index or metadata writer was introduced. The generic classifier still allows a recognized alias alongside an unknown list value; Dumo's stricter mixed-list policy is not silently substituted. The fork's balance star, perspective tilt and bilingual preference remain future opportunities, as previously directed. Its proposed holding area, drag assignment and initial Wood opening are distinguished from implemented behavior in the Facets specification.

A focused sharing fix prevents `https://` in preset help from being mistaken for a Windows drive path (`s:/`). Real drive paths and private selectors still require the existing privacy consent. Source URLs remain literal and visible; no scanner rule was suppressed.

## Verification

Node 22.22.2 and real dependencies: **162/162 focused tests passed**, covering all six archive validator/import round trips; exactly two fresh defaults; saved legacy definitions and selection recovery; emoji, scalar/list/variation-selector/conflict/unassigned metadata; bounded reads; Wood-to-Metal relative roles; fixed phase positions and canonical/decorative separation; manager/editor/import/export browser workflows; protected property assignment; localization and view contracts. Existing legacy workflows now explicitly load their archived or saved configurations rather than assuming removed defaults. Existing ownership, cancellation, canonical evidence and no-extra-work assertions remain.

Real production build with installed Obsidian types, full official CodeScanner and architecture checks passed: 9 architecture tests, 211 migrated roots, 392 reachable files, zero violations. The numeric UI audit still covers 182 settings/UI sources. Full regression and CI remain deferred by maintainer instruction.

**Windows exact-build native sample 20: 17/17 passed.** The actual fresh manager shows only Wu Xing and Local map roles, uses the status/emoji defaults and performs no opening settings write. [Reviewed screenshot](preset-retirement-wuxing-222-native.png). Existing four custom Help demonstrations still classify; shared statuses, scroll continuations, canonical child bounds, preset keyboard/reset/Cancel, rule Code field, import review and Compass/Mind Map switching pass. This is controlled desktop acceptance, not physical touch or paint timing proof.

Disposable Small restoration completed at **2026-10-27T12:50:01.480Z**: 9 configuration resources, 117 content resources, original workspace/window, content digest `7bdaf015f88c6ee1945410755a5aaccf7e04408fe597e729cafca24c5bc332ba`. Production vault untouched. Host: Obsidian 1.14.5 (installer 1.14.0), Electron 43.3.0, Chrome 150.0.7871.212; host Node 24.18.1, test driver Node 22.22.2.

Runtime main SHA256: `5a32c460a951df1f7d517fd939de0d0fcd425455f3962b10623658988afef1e0`. Styles: `f8731d83ca2d163a3c706d731dd419442e83d7bdbbbdc1415855737bc0925a33`. Manifest 0.3.0: `49596950b87caaf2fddaf0f58e826287c67d0e0998d3b69905c2ec298fd8b350`. [Sanitized native receipt](preset-retirement-wuxing-222-native-summary.json).

Later acceptance should cover a fresh Wu Xing status-property workflow and an existing saved phase-property workflow on macOS, minimum-host and physical mobile. Full regression remains a separate final gate. PR #222 and Help #4 stay draft, open and unmerged; no release is performed.

## Published Help deployment

Implementation [8cd3f60](https://github.com/zsviczian/kplex/commit/8cd3f60bea6921918ba35e7c137eb406fbb8608f) is pushed and remote-verified. [Help 294b662](https://github.com/zsviczian/kplex-help/commit/294b662270712e27c192f53cd9afc176f51c5e6b) publishes the same tested main.js and updates three existing guides. Styles and manifest already match and are unchanged. Byte-for-byte artifact hashes were verified before a Help-only plugin reload, completed at 2026-10-27T12:57:15.238Z.

The reload preserved the current leaf, K-Plex Help center, Facets view, help-workbench preset and camera. The original root was visible without navigation. The initial card count is a hydration transient, not a complete-count claim. No modal/draft was open. No runtime note edits were performed; the three authorized documentation edits are separate. User-owned data.json and workspace.json remain excluded from Git. The public Help configuration still intentionally contains its four custom demonstrations; retirement changes the inherited product library, not those saved examples.
