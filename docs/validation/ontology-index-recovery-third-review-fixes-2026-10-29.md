# Third indexing regression review fixes

Branch: `2026-10-28-investigate-ontology-index-recovery`, uncommitted patch against `17e39bf`. Node: 22.22.3. This extends the [earlier investigation and verification record](ontology-index-recovery-2026-10-28.md); those historical receipts do not certify the source changed here.

## Fixes

1. **Independent recovery inputs for canvases sharing a center.** The existing local compiler now extends the last successful cover one presentation surface at a time. A failed selected body or an oversized surface cannot veto a healthy peer. Successful extensions retain previously certified, still-visible owners. The 64 MiB requested-body budget belongs to each surface; peers stream through the same compiler under the unchanged metadata/record limits. No second map of all parsed bodies is retained. Exact source, policy, host, maintenance, demand, file identity/stat and same-stat event fences remain in force; finite presentation grants neither global completeness nor write authority.

   A certificate also records the actual input groups attempted under that observation. Replacing page objects/leases on a presentation render cannot repeatedly acquire the same unavailable input or publish new page incarnations. Comparing groups, rather than only their combined paths, still admits a newly visible healthy subset of a formerly failing group. A real source observation invalidates the certificate and retries through the existing owner. Closing a presentation surface re-admits the remaining demand.

2. **Linear native validation during recovery preparation.** Compiler record guards inspect scalar epochs. Selected body reads check their own exact file identity/stat/event before and after awaits, and the complete selected set closes immediately before publication. Host preview compilation closes its captured physical owners in a final linear pass before binding; mutations to earlier owners during later awaits still reject the entire private result. The existing compiler, resolver, scheduler and synchronous publication owner are retained.

   In the real Chromium synthetic-host reproduction, 40/160 selected neighbors required 252,834/3,887,076 native file lookups before this fix and 1,395/5,475 afterward. The ratio for four times the input falls from about 15.4 to 3.9. These are preparation API-call counts, not native elapsed-time, actual-paint or production-vault heat measurements. The prior linear neighborhood-read regression remains covered separately.

3. **On-demand folder ordering after canonical source patches.** `refreshOnDemandGraph` now awaits the existing coalesced P2 dirty-folder refresh after its source owners drain, matching the refresh already invoked by Eager batch acknowledgment. Native membership remains readable while sorting prepares. This does not acknowledge global semantic authority. The regression patches an alias on a child initially omitted by the ten-member cover and checks that the child becomes first after the On-demand batch, while the canonical alias is current. The original failure also reproduced on unchanged `17e39bf`; it was a genuine pre-existing behavior defect.

## Validation

The initial two complete indexing/host-preview suites passed 194 tests before the expanded cases. The final focused regressions pass the shared-center success, unavailable-body and oversized-input cases in both orders, independent byte budgets, presentation-only lease replacement without repeated body reads, newly independent healthy input groups, omitted-child alias ordering and silent late native stat/replacement/rename rejection. No prior assertion, timing bound or compiler safety condition was weakened.

The first full verification was deliberately interrupted during the passing main lane to add the presentation-only retry guard found during implementation review. Its outer wrapper restored the disposable vault. It is not counted as a completed verification. The complete standard portable/native driver was then rerun against the final patch and passed. Final source/artifact identities and receipts are saved in the [companion JSON receipt](ontology-index-recovery-third-review-fixes-2026-10-29.json).

Only the existing disposable `kplex-test-small` vault is used for native tests. Its executable artifacts, settings bytes and workspace layout are backed up and restored. Production vaults are not accessed. Native functional assertions are method/publication observations; no physical-device touch or actual-paint performance acceptance is claimed.

### Final acceptance

The standard `scripts/testing/obsidian/verify.mjs` entrypoint completed its full `npm run verify` prerequisite and exact-build native smoke under Node 22.22.3 / Obsidian 1.15.0 (installer 1.14.0). Architecture 9/9, core 130/130, main 1,675/1,675, UI browser 403/403, source 357/357 and source browser 818/818 passed: **3,392 tests, zero failures**. Production build, installed-type checking, scanner and diff whitespace checks passed. Source-browser verification took 893.2 seconds with the existing 20,015-owner case and all existing deadlines unchanged.

All four additional exact-build native cases passed: an unavailable body on one same-center surface did not block its healthy peer; a real source observation re-admitted the recovered peer and retained both surfaces' body semantics; finite recovery preserved the canonical graph and closed global authority; and the On-demand alias patch brought a previously omitted child into the sorted native folder cover. Native source/artifact hashes match the final working tree and built files. The controller removed its global and restored its wrapped method; its settings/enablement checks passed.

The outer driver restored original disposable-vault executable files, settings bytes and workspace layout. Executable restoration was independently hash-checked afterward, and the owned native fixture directory is absent. Production vaults were not accessed. No additional manual check is required for these bounded regressions; physical touch and actual-paint performance are not part of this acceptance. Changes remain uncommitted on the branch identified above.
