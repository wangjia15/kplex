# Scroll continuations, uniform hierarchy rows and status alignment

Implementation[968c9b0](https://github.com/zsviczian/kplex/commit/968c9b00b56fffc563da84cb6f2cd366d672f7a1) replaces the overly coarse Facets hide-the-whole-connector policy with the common scroll continuation default. Visible counterpart cards retain their exact canonical links to offscreen cards. The hidden attachment clamps to its own aperture, with a facing tangent and read-only boundary circle; it has no note arrowhead or detached caption. The circle is not a gate, node, drag/drop or relationship-write target. Existing canonical path interaction/provenance owners remain. When both cards are wholly hidden only paint retires, not graph relationships. A visible card still supplies context if its protruding gate is clipped.

Existing Edge/areaVisibility owns this behavior for Compass, Facets and scrollable custom views. Internal routes use their area's SVG aperture; cross-area curves connect bounded continuation anchors under the canvas clip, avoiding cuts at a bounding union rectangle. Fixed Mind Map forests retain actual endpoints. The optional visible-endpoints suppression policy remains available to explicit consumers; Facets no longer opts in. Decorative guides remain separate. No new index/renderer/action/settings/editor/relationship owner.

The cycle-reference gap came from fold availability, not label height: only expandable rows reserved the48px touch-control clearance. All measured hierarchy occurrences now reserve the same clearance, including leaves/references with no button. Status strings do not enter that decision. Shared NodeStatus CSS and measured badge bounds align to the card's left edge; colored category chips retain their distinct presentation.

## Verification

Node22.22.2/real dependencies:109focused viewport/API/Facets/MindMap policy/scene checks PASS;24affected real-browser cases PASS in aggregate (22unchanged successes in the combined run, bounded fixture corrected/rerun, plus the dedicated Compass fixture). Total133distinct cases. Real build/installed Obsidian types and touched-source official scanner PASS. No full regression/CI.

Geometry covers above/below/left/right occlusion, facing tangents, two hidden cards, visible bodies with clipped gates, fixed forests and explicit suppression. Browser checks require all30Compass center/friend links to remain through top/bottom/top scroll, continuation marks exactly on the aperture, no hidden-note markers/captions/target authority, exact visible-child route IDs to an offscreen parent, canonical/no-source/camera/session/cleanup guards. A touch-layout fixture proves equal reference/expandable sibling gaps and left-edge status alignment while retaining the missing fold button on a reference. Desktop emulation is not physical touch acceptance.

The previous bounded fixture counted routes even when both cards were invisible. That obsolete paint-count assertion now explicitly tests exact routes for every actually visible child, boundary continuations to its hidden parent and retirement only when neither card is visible. The first run exposed the protruding-gate case; shared visibility now includes actual card bounds. One test-local name collided with the fixture visibility flag; corrected and rerun. No canonical identity, visible-route or no-extra-work assertion weakened.

Exact-build Windows native11PASS13/13, completed2026-10-27T09:03:31.223Z; Obsidian1.14.5 (installer 1.14.0)/Electron43.3.0/Chromium150.0.7871.212. All4Help classifications/status presentation and140canonical Child?12 pass. New native scroll case retains10direct canonical route IDs with2boundary continuations, suppresses hidden-note arrows/target authority, returns to original scroll and preserves canonical neighborhood. Native cleanup PASS; outer restoration PASS2026-10-27T09:03:37.005Z,9config/117content/original workspace/window/digest7bdaf015f88c6ee1945410755a5aaccf7e04408fe597e729cafca24c5bc332ba. Existing authorized Small fixture only.

Main SHA256:febd8d5a2ad5fce278f65c8684050855a278b228dfebc4aac89b8eadd8fcdb9a

Styles SHA256:44887d1951cdc3b418d3dc695d5236707211af457c58689a797653cfbcdf24e0

Manifest0.3.0 unchanged:49596950b87caaf2fddaf0f58e826287c67d0e0998d3b69905c2ec298fd8b350

Exact artifacts copied to verified Help checkout and only its K-Plex plugin reloaded. Actual Help native leaf/attention/view/root/preset/fold state preserved, no navigation or note edits. Before: Cycle reference left24px; after:0px with border-only offset. Startup initially showed32cards/Loading branch, then settled back to47cards; that transient is not claimed as complete hydration. User-owned settings/workspace/shortcut files excluded from commits. Production untouched.

Both PR222/Help4stay draft/open/unmerged; no release/merge. [Sanitized native/deployment receipts](scroll-continuations-222-native-summary.json).
