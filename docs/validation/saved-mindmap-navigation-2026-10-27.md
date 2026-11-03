# Saved destinations reroot Mind Map

Starting 1b0003f on the existing open PR #226 branch. Implementation [d2137ab](https://github.com/zsviczian/kplex/commit/d2137ab19cf6d39145cd85c3bdf4395877b6d961). No additional PR or merge is needed for this related view correction.

History, pin and native saved-picker controls already dispatch exact canonical targets through `node.activate`. The shared action's old fallback depended on `hierarchy.primary === "expand"`; current Mind Map uses a different branch-click policy, so those requests changed attention without using root-destination admission. F4 already supplied explicit destination intent and remained correct.

The shared action now recognizes an explicit canonical target without a displayed occurrence as a destination. It calls the existing `onActivate(page, "destination")` path, retaining exact native identity checks, captured canvas/root admission, editor refusal and save safeguards. No separate history/pin navigation handler, root writer or source acquisition policy was introduced. Displayed branch occurrences remain distinct, and existing implicit consumers keep their policy.

## Actual verification

Node 22.22.2 and real dependencies: **53/53 focused cases PASS**, covering actual shared browser interactions, saved-list rendering/mouse gestures, editor switching and area growth. New before/after cases reproduced a Mind Map failure with passing Compass/Facets controls; all three pass after the fix. They cover toolbar History/pin requests, local-menu saved-picker requests, choosing the current attention note when it differs from the retained root, and isolation of a second mounted canvas's root/attention/camera. Body reads and vault scans remain zero in that finite cached browser fixture. The initial two-canvas test used the fixture's default duplicate surface IDs; assigning distinct IDs corrected the harness before recording the Mind Map-only reproduction.

Real production build with installed Obsidian types, full official CodeScanner and architecture checks PASS: **9 tests**, 212 migrated roots, 393 reachable files, zero violations. Numeric controls remain audited across 183 UI/settings sources. Full regression/CI remains deferred; the three independently reproduced session-test baseline failures recorded with the earlier editor-area checkpoint are unchanged and are not claimed fixed here.

**Windows exact-build native sample 30: 4/4 PASS.** The actual History bar, pin bar, native History picker and native pins picker each change both the current native canvas center and its rendered Mind Map root to the selected saved note. Bar activation uses actual DOM controls; native pickers use trusted Electron Enter after filtering to the exact target. No notes are created/edited. This is navigation/host evidence, not OS-level pointer or physical-touch acceptance.

Small restoration completed **2026-10-27T19:01:26.423Z**: 9 configuration resources, 117 content resources, original workspace/window, content digest `7bdaf015f88c6ee1945410755a5aaccf7e04408fe597e729cafca24c5bc332ba`. No production vault was touched. Host: Obsidian 1.14.5 (installer 1.14.0), Electron 43.3.0, Chrome 150.0.7871.212. [Native/source/artifact/restoration receipt](saved-mindmap-navigation-native-summary.json).

Exact main SHA256 `f5a5301296cfa1155fee72ed6d95131670c57e15cf06ac5832bb3b633bba727b`; styles unchanged `f205d6e8b16494817de3abe8a07f15cfd1b96dec83fac6a772f5092d739d9857`; manifest remains 0.3.0, SHA256 `49596950b87caaf2fddaf0f58e826287c67d0e0998d3b69905c2ec298fd8b350`.

Keep PR #226 and Help #4 open and unmerged. No release. macOS/native popout and physical-touch acceptance remain separate. No extra manual Windows test is required for the four automated saved-navigation routes.

## Help deployment

[Help 1936c32](https://github.com/zsviczian/kplex-help/commit/1936c322c5fae0f56b0f6d0a49be1cb8746999ee) publishes the exact tested main.js and a sentence in the existing Past nodes and pins guide. Styles/manifest already match and are unchanged. Byte-for-byte hashes were verified. Help-only reload at **2026-10-27T19:02:36.950Z** retained the same leaf, center, live layout root, Facets/help-workbench, 37 cards and camera, without navigation or runtime note edits. No modal draft was open. The 142-page content/link/asset audit passes. User-owned data/workspace changes and shortcut-file deletions remain excluded and unmodified by this assignment.
