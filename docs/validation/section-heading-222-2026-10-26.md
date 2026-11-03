# PR222: readable Markdown headings

Baseline6f630d967c03862fe8c7f87a0254a32e6f026a3a. Maintainer reported short section names clipped in Mind Map while Compass displayed them. Mind Map's ordinary note-pill measurement omitted the heading marker/padding and readable minimum used by Compass.

The shared sectionNodeSize helper now supplies those dimensions to both host paths. Compass passes its existing density adjustments, preserving its exact previous geometry; the generic section adapter supplies full measured heading rectangles to all opt-in view policies. Existing maximum width and character budgets remain authoritative. Source text/provenance, graph relationships, parser/index ownership, camera/editor lifecycles and styles.css are unchanged.

Actual Node22.22.2 checks:55 focused section/browser/geometry/editor-admission tests PASS, including Summary/Links/Notes/Reference details text clientWidth versus scrollWidth at three text sizes, unchanged Compass dimensions across densities and configured maximum. Official scanner and real production build PASS.

Native UX28 PASS31, pairs6 PASS13, editor-lifecycle5 PASS11 =55 on identical mainSHA2566c56ff064a927ad5b43bffc4958409c1a9630f48a2d72cacfd67e8d3980a05dd / styles19a1bb1a25bfbc6db417420e2a07a281e50b48cb5f121ff52d486d9cc3dd47d5. Includes actual unclipped headings, shared sections, strict native content/caret/DOM focus/command ownership/saving, manual camera, independent windows/Sidecars and workspace restoration. All lanes restored9configs/117contents/live workspace/window/digest; final13:49:46.496Z. [Native55](section-heading-222-native-summary.json).

Earlier full3223/native54 receipts apply to their explicit pre-heading source, not this new artifact. Pre-heading CI554 ultimately succeeded; new artifact requires its own clean full verification and exact-head CI. No weakened assertions/deadlines or source-performance guards. No production files/settings/workspace/deployment changed. Keep222 draft/open/unmerged.


## Delivery source and evidence

Runtime checkpointcd82da8d95acf69446f0fa4fa5b8b83107127768 contains the measurement fix,55 focused passing tests and native55 evidence. The final documentation checkpoint changes no production source/tests/scripts/packages/styles. Clean runtime-head verify:obsidian and exact final-head CI run concurrently with this documentation-only publication; their actual conclusions, suite counts, artifact equality and final resource restoration are recorded in [PR222](https://github.com/zsviczian/kplex/pull/222) before delivery. This record does not assert an unfinished check passed. No further source change is planned unless verification finds a failure.
