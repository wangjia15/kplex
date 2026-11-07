# Built-in speech third-party notices

K-Plex remains AGPL-3.0-only. The components below retain their own licenses.
The build embeds these notices and license texts in `dist/main.js`, preserving
license information in the normal three-file plugin distribution.

- **edge-tts** by rany and contributors: the Sec-MS-GEC v2 token algorithm in
  `src/edgeTts.ts` is a TypeScript adaptation of
  [`src/edge_tts/drm.py`](https://github.com/rany2/edge-tts/blob/bd44c1d1aaebdc1db7f47456ee12431b42ec7cac/src/edge_tts/drm.py),
  inspected at revision `bd44c1d1aaebdc1db7f47456ee12431b42ec7cac`.
  The original and adapted token code are LGPL-3.0-only. K-Plex adds the native
  desktop transport, bounded protocol validation, cancellation and playback.
  The upstream [license](edge-tts-LGPL-3.0.txt) includes an MIT exception for its
  unrelated subtitle composer; that composer is not included here. The LGPL
  incorporates [GPL version 3](GPL-3.0.txt). Corresponding source and the build
  scripts remain in this repository, allowing the modified token implementation
  to be rebuilt with K-Plex.
- **ws 8.22.1**, copyright Einar Otto Stangvik, Arnout Kazemier, Luigi Pinca and
  contributors: bundled solely inside the lazy desktop speech transport under
  the [MIT license](ws-MIT.txt). Mobile does not load this transport.

The Microsoft speech service is remote infrastructure, not bundled software.
Its endpoint may change independently of K-Plex. No Microsoft browser executable,
Python package, native speech executable or external Obsidian plugin is bundled.
