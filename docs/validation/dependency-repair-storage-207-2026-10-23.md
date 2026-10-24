# PR207 dependency-repair storage isolation

**Historical investigation return: keep draft.** No production correction is supported by this bounded causal study. Both partial reverts and both read-path controls retain the penalty. Browser-root CPU is implicated, but the physical backend cause is unproved; neither repeated history plateaus within three cycles. The substantial maintenance improvement remains intact.

Current disposition: the maintainer has accepted the documented limitation for a scoped merge, subject to CI and integration. The adverse findings and earlier investigation recommendation below are preserved. See the final acceptance section.

Zsolt's Codex Agent,2026-10-23. This report supplements [the original validation report](dependency-repair-batching-207-2026-10-23.md); historical measurements and failures remain intact. Draft PR207, branch2026-10-23-dependency-repair-batching. No automatic merge/release/production deployment; #206 untouched.

## Checkpoint and precollection protocol

Accepted baseline930747679894f003a2acf3b800df798826ee090c remains fixed. Local/remote reviewed head d6ef7f07b199e2eb2497f13148374f5edf6802d3 matches. Production source SHA256 d8d6d532bb711b3cb2bb5d0e55152392495533b8eb64c069158ca8b0e98809d8; main.js19d75415c69d8c77bbde934f618eeece2f0387459a49003090eedef61b9bb28f; manifest3395e425860e5068e9f3b3d9a0e3d58cefd2c11dededc690beb87f60e733ed7d; styles88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974. Baseline source534a061e64ddfe7a609cc774788567ec8ba6afc4c953ea556e7ff9834fe4c63e/main7fa00a354d38fb2cedecbb9d15c5277e0513813b7074d487f5ebda9820c2b79f. No production edit before first causal comparison. CI411 passed; independently checked diagnostic checkpoint CI412/run39986661351/job120527486343 is still running at protocol preparation, not presumed passed.

Finite source-override factory creates no production flag/settings/schema. A exact baseline; D exact frozen reviewed candidate. B retains D's grouped counts and changes only authenticated old-prefix reclamation to individual row deletes. C retains D's range reclamation and changes only grouped counts to ordered per-occurrence get/authenticate/check/write, one native request outstanding. B/C/D preserve D's bounded cursor prefix, byte/record limits, current fences and original atomic journal; A retains its original scaffold. Thus B-D isolates deletion strategy; C-D isolates grouped ledger work including request/continuation order. A-B/C is not an unqualified2x2 factorial because the read scaffold differs.

Four-way primary:256 owners, mixed distribution, complete original seed/deletion history, three serial quads in orders A/B/C/D;D/C/B/A;B/A/D/C. Fresh owned profile per arm, same source facts/settings, seed batches32 and measured transport batches8. Full actual source/membership/count oracle before measured work, after deletion, after real graceful restart, recreation and later edit. All selected maintenance, known family reclamation, journals, releases and debt close; native complete/abort drain, closed connection, acknowledged Browser.close, actual root exit0 and newPID required. No waits/GC/compaction/profile/global cache reset. Balanced power and unchanged headless/focus/throttling policy; no local builds/tests/native drivers overlap timing. Physical files/OS caches are not equivalent merely because logical states match.

Primary omits detailed request wrappers. A separate four-arm256-owner detailed cohort measures native calls/transactions/cursor advancement and logical rows, not counted as CPU acceptance. Root SystemInfo process snapshots outside renderer endpoints now work in the four-arm smoke: actual root PID verified, births/exits/gaps explicit. Renderer ProcessTime includes its threads; do not add it to SystemInfo renderer CPU again. Browser/storage utility CPU reported by identity/type, not inferred exclusive store CPU. Root connection/metrics overhead is included in its wider snapshot interval and comparable controls. No native allocation/peak claim from sampled heap endpoints.

Measure native open request-to-success, fixture open, lookup, closure/closeWork, shutdown-to-actual-exit, launch and outer transport separately. Restart/reopen sum includes post-exit file metadata observation; excludes intervening fixture binding and observer setup, so it is not continuous Obsidian startup. Profile regular-file totals remain separate from logical bytes/records; actual disk allocation is unmeasured unless a reliable platform-specific metric is established. No file content parsing is required for the causal comparison.

Fixed material criterion: >=10% AND >5ms paired excess in >=2/3 matched pairs, separately native open and restart/reopen sum. Expected interpretation: B~A,C~D implicates range reclamation; C~A,B~D implicates grouped ledger path; D alone implicates interaction; B/C/D all adverse leaves the shared scaffold unresolved. All unfavorable/incomplete runs retained; exclusions require protocol violation. No production correction until the full first comparison is complete and a mechanism isolated.

After isolation, bounded repeated lifecycle: three create/change/delete/reopen cycles in the same test-owned DB/profile, no reset between cycles, at256 owners for the implicated full variant and the selected correction/control. Repeat clean reopen without new source writes to distinguish transient/accumulating state. No extra scale campaign unless a meaningful remaining causal uncertainty requires it. If cause remains unresolved, preserve the current production implementation and return a precise decision.

Prerequisites passed:28 portable variant/lifecycle/observer contracts; four-way2-owner smoke all4 passed, root process CPU supported; focused real-IDB variant contracts44/44 (including4 factory contracts), zero failures/skips. Raw receipts/logs private under TEMP; exact source/bundle/tooling hashes recorded in each summary.


## First causal comparison: completed before any production edit

All12 arms passed,16:53:11-17:10:53UTC; private receipts `%TEMP%/kplex-repair-storage-207-causal-PsrFTk`. Full before/after/reopen/final-edit oracles and recreation/edit sequences match across all four variants in each quartet (sequences513/514). No exclusions/retries.

| Pair/variant | Wall ms | Renderer CPU s | Browser CPU s | Native open ms | closeWork ms | Reopen Browser CPU ms | Regular-file bytes after exit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
|1/A|48991.9|22.610|80.460|34.4|5.6|67.6|37618665|
|1/B|37011.7|15.259|88.910|572.9|68.1|347.4|52713243|
|1/C|32293.4|13.729|73.275|85.1|80.0|281.5|63502798|
|1/D|23392.7|10.229|58.242|102.7|85.4|312.1|54674241|
|2/D|23332.4|9.935|57.674|97.7|83.2|315.0|53433814|
|2/C|33229.6|14.117|73.640|97.3|92.6|315.4|47702208|
|2/B|35533.2|13.927|82.935|124.2|80.1|341.1|62336689|
|2/A|50657.4|23.021|84.909|37.1|5.9|69.9|38593493|
|3/B|34954.0|13.762|83.298|120.7|77.3|335.1|51618979|
|3/A|51034.6|22.872|84.495|33.5|3.5|55.3|32040650|
|3/D|24422.7|10.828|60.374|121.6|73.5|301.1|69250090|
|3/C|32207.9|13.741|73.063|82.2|74.5|264.3|57746429|

B,C,D each trigger the unchanged native-open criterion in all3 paired contrasts with A. Simply removing either grouped counts or range deletion does not resolve the regression. B-D and C-D retain the shared cursor-prefix path; no claim is made that these4 arms isolate that third factor. Browser-root process CPU now shows additional reopen cost (roughly264-347ms in altered variants versus55-70ms baseline), while renderer reopen CPU is about7ms. Storage utility CPU is separately recorded and small; these are whole-process counters, not sampled backend stacks. Maintenance Browser CPU is meaningful alongside renderer savings: grouping-only does not reproduce fullD Browser CPU reduction.

CI412/run39986661351/job120527486343 completed successfully, including complete npm verify. Published test-only protocol checkpoint979cefe7ec01f253b00869591d683c48d76d4953 is verified on the remote branch. Source/artifact D remain unchanged through this completed comparison.

## Bounded shared-read follow-up protocol (before collection)

The four-way result leaves the common bounded membership reader unresolved. E therefore keeps BOTH grouped counts and validated range deletion, but reads exact ordinal rows one at a time and proves exact primary-range cardinality with one scalar count per observed prefix. Proof includes any discarded byte-boundary lookahead. Point reads without this proof would skip corrupt fractional keys; that unsafe variant is not measured or proposed. Same transaction, bytes/records/singleton/current/native-error/journal contracts remain. F keeps the original cursor and adds E's identical proof, distinguishing read strategy from the extra proof request. E/F are isolated test-only source overrides; production remainsD. No schema, scheduler, GC, arbitrary delay or product flag. The scalar proof bounds retained memory, not arbitrary backend enumeration work in already corrupt storage.

Run only3 matched256-owner quads A/E/F/D;D/F/E/A;E/A/D/F, using the same lifecycle/work/oracles/CPU observer and fixed criterion as the first comparison. This is the final read-path isolation step; if it remains unresolved, preserve production and return a precise no-go rather than expand into storage redesign/profiling. Four-arm read-control smoke passes;85 source/harness/native-IDB/inventory contracts pass, zero skips. E/F include ordinary and wide byte-lookahead fractional-neighbor failures, quota/cancellation/abort rollback and durable retries.

Repeated-cycle smokeD/E passes all create/change/delete and two real graceful reopens per DB. Windows read-attributes-only FILE_STANDARD_INFO AllocationSize observation succeeds through an isolated Python metadata process (about76-176ms in smoke), separately from reopen timing. It is used only in subsequent diagnostic counts/cycles, with its own elapsed and limitations; primary causal timing has no such allocation observer. Native reference: [FILE_STANDARD_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_standard_info). Per-file EOF lengths, filesystem allocation and actual source-record bytes are distinct; allocation omits directories and is not exclusive physical-device attribution.

## Repeated-history protocol (declared before the full cycles)

Use one owned database/profile for three complete 256-owner mixed create → genuine change → deletion cycles, without resetting between cycles. Recreate tombstone owners on the second and third cycles with increasing observations. After each deletion, verify the complete source/membership/ledger oracle, terminal native transactions and repository closure, then gracefully exit and reopen twice. The second reopen contains no source writes and tests what a normal additional reopen does to the observed cost. Track every phase's renderer and process CPU, elapsed time, logical counts, regular-file lengths, per-file Windows allocation and inventory changes. Do not add delays, force GC, compact or change durability.

Compare D with E only if the completed read-path comparison supports E as a correction; otherwise compare D with accepted A as the bounded historical control. Variant order is D then the selected control; these are diagnostic lifecycle sequences, not additional matched timing pairs. Each variant owns one fresh profile initially, then retains it through all three cycles. Physical storage and OS caches remain unmatched. Allocation metadata runs only after actual process exit and has its own clock; aggregate restart time includes that observer and is not pooled with the primary comparison. A three-cycle result can show growth or stabilization within that window, not a production-vault bound.

## Completed read-path controls

All 12 arms passed, 17:19:10–17:36:48 UTC, with no exclusions or retries. All quartet source/membership/ledger/recreation/edit oracles match, and every native close, graceful process exit, distinct replacement PID and owned cleanup is verified. Private receipts: `%TEMP%/kplex-repair-storage-207-point-GHx8mU`. E and F remain test-only; neither is adopted.

| Pair/variant | Maintenance wall ms | Renderer CPU s | Browser CPU s | Native open ms | closeWork ms | Reopen Browser CPU ms | Regular-file bytes after exit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
|1/A|52308.3|24.141|86.933|34.4|3.8|60.9|29567189|
|1/E|34018.0|16.526|79.139|111.3|81.2|325.0|70493938|
|1/F|25752.7|10.810|62.223|91.5|119.8|367.9|74170287|
|1/D|25129.3|11.141|61.189|174.8|136.2|554.7|81372207|
|2/D|25545.1|11.526|61.713|138.9|85.3|367.7|68546974|
|2/F|24653.1|10.799|61.091|80.2|72.6|257.0|68707481|
|2/E|32718.5|16.015|79.054|124.5|76.9|372.5|68668678|
|2/A|51581.1|23.798|83.578|32.9|3.4|55.1|29624554|
|3/E|33242.6|16.275|79.398|134.4|80.6|357.0|53392870|
|3/A|50124.8|23.463|82.466|32.1|6.8|64.6|30668715|
|3/D|24736.9|10.556|60.666|82.2|80.4|278.8|72138709|
|3/F|24973.0|10.524|60.397|88.0|71.3|275.0|70295148|

E and F each exceed the unchanged native-open material criterion in all three matched pairs against A. An ordinal point-read substitution with necessary coverage proof does not fix the penalty; the cursor-plus-proof control does not fix it either. E also sacrifices part of D’s maintenance savings. These results do not support changing production.

Both causal cohorts identify additional Browser-root process CPU during reopen, alongside approximately unchanged renderer CPU. Stable root PID counters are used directly; process births/exits and unavailable endpoints remain in receipts. The process snapshot window also includes metric/observer IPC and has no terminal sample for exited children. It is not an exclusive storage-thread profile or a complete sum over every process lifetime. Workers already present in process CPU are not added again.

Remaining causal uncertainty: B–F retain page-wide membership preparation before ledger mutation and deferred old-row reclamation, byte accounting and changed request sequencing. A interleaves ordinal read, ledger read/mutation and individual retirement per occurrence. The experiment rules out either simple independent revert as a demonstrated correction, but cannot attribute the physical history to a single shared instruction, engine compaction, GC, cursor prefetch or an interaction between mechanisms. No speculative runtime correction is made.

CI413/run39990635875 passed complete verification at published checkpoint979cefe7ec01f253b00869591d683c48d76d4953. At that checkpoint, diagnostic contracts passed111/111, zero failures/skips; D/A cycle smokes passed. Deliberate two-owner driver failure exited1 as expected, retained its completed phase and error, and proved owned profile removal; it is a cleanup test, not an acceptance exclusion. The then-pending full cycles and six-variant detailed cohort are completed below. No new native deployment is needed for an unchanged production artifact.

## Retained incomplete repeated-history attempt

The first full D sequence in `%TEMP%/kplex-repair-cycles-207-full-Jkd4lM` completed cycle-one creation, genuine change, deletion CPU endpoints and the complete post-deletion logical oracle. It then failed in **post-window file metadata**, before either reopen: `ENOENT` when a listed `.ldb` file disappeared before `lstat`. The driver retained the failed result/phase and removed its owned profile. This is an observer race, not a demonstrated repository failure or a passing completed cycle. Its timings and error remain in private receipts. A continued in the same launch and is retained independently.

The existing stat helper assumed listed files remained present while Chromium was active. The narrow diagnostic correction records raced totals as **unknown**, with observed partial bytes/count and missing entries; only `ENOENT` is classified this way. Ownership/alias/error/entry bounds remain enforced. No retry, delay, backend change or runtime correction is introduced. Full per-file/allocation observations remain after verified process exit. Deterministic live-retirement, directory-retirement, unexpected-error, bound and alias tests are added before repeating the incomplete D history. Successful A data and the D retry have different post-work stat-helper versions; the workload, native oracles, CPU endpoints and post-exit allocation observer are unchanged. They remain a diagnostic growth sequence, not new pooled matched timing pairs.

All normal fixture source facts, memberships, counts, revisions and reclamation agree across variants. A deliberately retains the exact accepted baseline corruption contract: candidate-only fractional-neighbor negative fixtures are not claimed to pass on A's ordinal individual-deletion implementation. B–F preserve the stronger bounded-prefix authentication (including E/F byte-lookahead coverage). No corrupt fixture is used for the performance comparisons, and no variant gets less logical work in those comparisons.

The stat correction and independent review also close the touched helper's inherited directory-alias gap: authenticate `Default`, `IndexedDB` and traversed directories before enumeration; retain alias rejection and distinguish unexpected errors from retirement. A dedicated all-missing-entry case exercises the new entry bound rather than merely hitting the older regular-file bound. Focused contracts now pass **114/114**, zero failures/skips; robust D/A cycle smokes and deliberate failed-driver cleanup also pass. No safety assertion is relaxed.

A completed all three cycles in the retained first launch, with exact logical/oracle/closure checks and complete Windows allocation observations. Regular-file totals after the second reopen were 54,618,874 → 128,316,997 → 163,305,031 bytes. First/repeat native opens were 18.8/20.9, 97.6/82.2 and 38.6/21.7 ms. Physical-file growth and variable reopen cost therefore also occur in accepted baseline; these observations do not identify a candidate-specific leak or establish a growth bound. D's complete three-cycle repeat starts only after the corrected observer's 114 contracts and both smoke/cleanup checks pass. The original D incomplete attempt remains recorded, not converted to a pass.

## Complete repeated-history results

A completed17:41–17:52 UTC in the retained first launch; corrected-observer D completed17:54:30–18:01:57 UTC. Same source workload/observations, same database per variant through three cycles, no reset. These are separate diagnostic sequences, not alternating primary timing pairs. The D failed attempt and observer-version difference are retained above. Every phase/reopen source-membership-ledger oracle matches A against D at the corresponding cycle. Every final close, native drain, actual graceful exit/new PID and owned-profile removal passes. Windows per-file AllocationSize observations are complete, with no unknown files.

| Variant/cycle | File lengths after first / second reopen (bytes) | File allocation after second reopen (bytes) | Native open first / second (ms) | closeWork first / second (ms) | Browser CPU first / second reopen (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
|A/1|54876402 / 54618874|54677520|18.8 / 20.9|4.0 / 4.2|30.8 / 36.0|
|A/2|128682908 / 128316997|128450576|97.6 / 82.2|5.6 / 5.2|129.3 / 114.8|
|A/3|165602106 / 163305031|163475760|38.6 / 21.7|11.2 / 12.6|55.8 / 47.8|
|D/1|67547835 / 67158041|67227664|18.4 / 16.8|130.5 / 30.5|189.1 / 58.4|
|D/2|144749739 / 132370130|132485136|92.0 / 119.1|56.8 / 52.8|239.1 / 258.5|
|D/3|186821367 / 187876686|188080840|107.5 / 107.5|126.2 / 62.5|381.8 / 262.3|

| Variant/cycle | Create+change+delete elapsed s | Renderer CPU s | Browser CPU s |
| --- | ---: | ---: | ---: |
|A/1|210.323|99.868|386.895|
|A/2|219.242|100.720|434.044|
|A/3|235.491|103.090|546.197|
|D/1|128.135|56.758|260.181|
|D/2|132.731|60.422|325.111|
|D/3|141.547|59.475|375.018|

Phase sums include complete selected maintenance, known old-family reclamation and closure within each ordinary workload. They exclude intervening semantic oracles, restarts and metadata observations. The primary matched CPU study remains the acceptance source; diagnostic sequence sums are not pooled with it. Known post-deletion logical state at every cycle:256 tombstone owners,0 selected memberships/bytes,0 count keys,0 repairs/pending/impact journals/primary dirty work,0 retired source chunks/postings and0 reader/lease/decode reservations. This is not a byte census of every metadata store or a verified total live database payload.

Both variants grow across these three histories; neither shows a plateau. D ends about24.6MB above A in regular-file lengths, while both retain substantially more filesystem allocation than after cycle one. That does not prove an indefinitely growing leak or a candidate-only growth mechanism, but it does not establish the requested no-accumulation bound. Additional graceful reopen sometimes decreases file totals without reducing latency (D cycle2:144.7→132.4MB;92.0→119.1ms native open), so neither cleanup nor performance can be inferred from the other. No scaling extrapolation is made.

A fast native open is also insufficient: D cycle1 opens in18.4ms but closeWork costs130.5ms; its repeat opens in16.8ms and closure still costs30.5ms. D cycle3 native open remains107.5ms on both reopens, with closure126.2→62.5ms. Normal repeated reopen does not reliably remove the measured cost.

### Expensive interval located in retained transaction receipts

In cycle1, both variants finish completeInventory in roughly1–2ms. The following readonly `meta` transaction (two protection-lease prefix counts plus two state gets) lasts about128.5ms in D versus2.5ms in A; the subsequently queued sourceImpacts count completes with it. Existing bounded receipts have first-success/terminal timestamps for transactions, not every request, so they do not isolate which of those meta operations or backend work accounts for the delay. Browser-root reopen CPU is189.1ms versus30.8ms; renderer counters do not explain it. These are retained receipt observations, not a new profiling run.

The expensive closure counts are this diagnostic harness’s proof of released leases, not a measured production startup feature. completeInventory performs the same ordinary meta-state put in both variants, including the repeat reopen; “without source writes” does not mean literally no metadata write. Zero count-ledger writes and repair entries do not prove absence of backend work. The source/physical-history mechanism and exclusive backend stack remain unknown.

## Separate detailed native-operation cohort

All six256-owner mixed-deletion arms passed18:03:02–18:11:36UTC, with no retry/exclusion. Source facts, membership/count oracles, committed sequences513/514, complete known reclamation and later recreation/edit match across A–F. Every observer retires with zero pending/aborted native transactions; every graceful close/new-PID/owned cleanup passes. Private receipts: `%TEMP%/kplex-repair-storage-207-counts-87XBkC`. Detailed timing/CPU is not pooled with primary acceptance.

| Variant | Selected RW transactions | Membership gets | Cursor opens / continues | Ledger gets | Ledger put+delete | Old membership delete requests | Coverage counts | Native API attempts | Created IDB requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
|A|768|159488|0 / 0|159488|159488|159488|0|640512|640512|
|B|768|0|768 / 158720|115456|115456|159488|0|552448|393728|
|C|768|0|768 / 158720|159488|159488|768|0|481792|323072|
|D|768|0|768 / 158720|115456|115456|768|0|393728|235008|
|E|768|159488|0 / 0|115456|115456|768|768|394496|394496|
|F|768|0|768 / 158720|115456|115456|768|768|394496|235776|

Native API attempts include cursor.continue; a continuation reuses a cursor request, so it is separated from newly created requests. Transaction creation is a separate column. The legacy “native request” metric includes these continuation attempts; no historical value is erased or silently redefined. Every variant authenticates159,488 membership occurrences across768 selected-repair transactions; there are115,456 page-distinct keys. D eliminates44,032 duplicate ledger reads and44,032 ledger mutations, and replaces159,488 old-row deletes with768 authenticated range deletes. Journal/transaction counts remain unchanged. E/F each add768 scalar coverage counts; neither is adopted. These deterministic operation counts do not attribute CPU savings by themselves.

### Exact isolated source/build identities

These are browser TypeScript fixture bundles, not installed alternative Obsidian packages. Each source changes only SourceRepository through the pinned test-only transforms; every summary retains exact source/bundle/tool hashes. Production D main.js remains the reviewed19d75415… artifact.

| Variant | Source SHA-256 | Fixture bundle SHA-256 |
| --- | --- | --- |
|A|534a061e64ddfe7a609cc774788567ec8ba6afc4c953ea556e7ff9834fe4c63e|0a5005f3350f0f68e3bcc9f0779b18c861090907466bf0acb168b3a0db1d5add|
|B|39b1b914e6e67316b1b0e295a65a11e37bd7a0379cb21e6dd14c9c63c5000e66|ee0540739cdba72a38a7f57da8650ac12b936a0412a10acb7781e01813585bf7|
|C|16eafc6852cfa47d50014ded456285774c329a231711433056040261279eec00|f6a207393e997b65b180871328bb700eb06b0d0fd1b3d267680ba39e363b5a4b|
|D|d8d6d532bb711b3cb2bb5d0e55152392495533b8eb64c069158ca8b0e98809d8|343bec7712a7b5c7f9a9f0a7cd1cd98907c92e8ce7ab2cbb16d1aebf0b10dc76|
|E|1d06f632c0a68b9ad4379ba19a6931238d29d964b244617825553ea37588ded3|2820809bc26a0a9e01b209db9b202580ff4ce656c37045452e68112f1a88235b|
|F|ce7ea408c86ee0482f9520c64f88755a67e82fb3468b7a0b5abaab289f884c5e|0eca894dd40669ba071bea166865a6363c169b554842e66ee1774f166c539624|

## Separated lifecycle and later-work endpoints

All variants’ full separated clocks and metric endpoints are retained in their arm receipts. The following table shows the accepted A/D production contrast in both primary cohorts. The restart/reopen sum includes post-exit metadata and excludes intervening fixture/observer binding; it is not continuous Obsidian startup. No allocation observer ran in these primary cohorts. Subsequent recreation and genuine-edit CPU includes their ordinary complete known closure, with a source oracle afterward.

| Cohort/pair/variant | Shutdown ms | Launch ms | Outer reopen ms | Restart+reopen sum ms | Recreation ms / renderer CPU s | Later edit ms / renderer CPU s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
|causal/1/A|128.8|324.4|45.6|502.3|205.5 / 0.122|389.0 / 0.196|
|causal/1/D|120.2|315.6|193.6|633.0|226.3 / 0.085|229.6 / 0.118|
|causal/2/D|115.8|323.8|186.3|628.5|251.9 / 0.103|352.6 / 0.126|
|causal/2/A|127.7|337.2|49.7|517.3|210.9 / 0.124|387.0 / 0.204|
|causal/3/A|135.6|328.6|42.2|509.1|206.7 / 0.125|390.0 / 0.202|
|causal/3/D|128.5|356.7|200.5|688.5|252.1 / 0.100|478.8 / 0.132|
|point/1/A|125.8|351.0|43.4|523.5|211.9 / 0.126|423.2 / 0.211|
|point/1/D|139.0|327.8|316.2|787.8|246.5 / 0.091|317.7 / 0.121|
|point/2/D|140.1|339.4|230.1|716.1|244.0 / 0.086|252.6 / 0.124|
|point/2/A|117.3|344.2|40.9|506.6|212.9 / 0.130|450.1 / 0.229|
|point/3/A|126.1|334.6|45.0|508.7|186.9 / 0.116|402.2 / 0.206|
|point/3/D|115.7|329.7|167.4|617.0|230.2 / 0.083|228.1 / 0.120|

## Decision: keep draft; no supported narrow correction

Both requested optimizations remain in production. Removing either one independently does not resolve the material penalty. Alternative bounded read mechanics also do not resolve it. The results permit a common phase-organization effect, multiple independent effects, or interactions with physical backend history; they do not isolate one as the cause. Additional Browser-root CPU is established, including costly closure metadata transactions, but no engine-level compaction/GC/storage-stack diagnosis is proved.

The maintenance improvement is preserved. In the first fresh256-owner matched deletion cohort D uses10.229/9.935/10.828 renderer CPU seconds versus A22.610/23.021/22.872:54.8%/56.8%/52.7% less by individual pair. Complete workload wall savings are25.6/27.3/26.6s. The original representative equal-operation mix remains42.6% less renderer CPU (mostly-distinct31.9%); those earlier sizes/artifacts and all failures stay in the original report and are not pooled with this cohort.

Against those savings, the original candidate-specific graceful-reopen cost is repeatable and remains above the unchanged criterion. Both repeated histories continue growing through three cycles, and a normal additional reopen does not reliably remove D’s cost. These bounded observations establish neither unlimited growth nor the requested no-accumulation bound. I therefore recommend **keep #207 draft**, rather than accept an unproved storage tradeoff or change production speculatively. A maintainer could explicitly accept the measured cost and unresolved scaling risk, but this investigation does not supply evidence for an unqualified merge. No additional campaign is started. If continued separately, the unresolved prerequisite is attribution of the owned Browser/backend interval to the physical write/read path, not another renderer-only profile or tolerance change.

## Verification, reuse and limits

- Node22.22.2, Windows, Chromium155.0.8059.82. All24 primary causal/read-control arms and all6 detailed arms pass, with exact facts/counts/revisions/recreation/edit parity. Six complete repeated cycles pass across A and D; one earlier D cycle is retained incomplete due the diagnosed post-work stat race. Smoke and deliberate-failure probes remain separate.
- 114 focused real-IndexedDB/factory/lifecycle/harness/inventory tests pass, zero failures/skips. This includes every test-only variant’s ordinary work, intermediate underflow/overflow, native quota/abort attribution, malformed/gapped rows, bounded-page cancellation and reopen recovery. Added count-proof/fractional-lookahead negatives preserve the stated candidate authentication contract.
- Production source, schemas, defaults, scheduling, GC, admission, readiness/retry, unsaved recovery, #204 count reuse and #205 protection are unchanged. Reuse the exact19d75415… real-dependency build/full verification and applicable Windows interaction/recovery evidence from the original report, including early tags/folders/search/gates/editing, foreground, SI4/5 and cleanup. No new Obsidian deployment, application restart or production-vault experiment is represented as having run in this storage-only assignment. Obsidian’s Electron43/Chrome150 host differs from this deterministic Chrome155 fixture.
- CI411 and independently checked final reviewed diagnostic CI412 passed; CI413 passed on isolation checkpoint979cefe7…. CI414/run39996991127 passed complete verification at464779c572756a2d0cf25570aa10004d6e6bb177. Later checkpoint CI416 is checked independently and its actual final status is recorded in PR checks/comments; in-progress status is not counted as a pass.
- Physical storage and OS caches remain unmatched despite equal logical inputs and fresh per-arm profiles. File lengths, Windows per-file filesystem allocation and known logical record counts are separate. Allocation omits directory/device-exclusive effects. Three cycles establish only this finite history. CPU snapshots have observer overhead and no terminal sample for exited children; shutdown/launch CPU and exclusive backend stacks are not established. Endpoint heaps are not allocation or true peaks. No baseline/candidate medians are subtracted to infer individual-run CPU.
- No manual/device check is needed for these test-only changes. The remaining blocker is performance acceptance, not an unrun automation that can substitute for causal evidence. #206 branch, implementation, fixtures, startup owners and retained data are untouched. No merge/release/production deployment.

## Maintainer-accepted limitation and scoped merge authorization

On 2026-10-23, after reviewing this return, the maintainer explicitly stopped the causal investigation and accepted the documented reopening-latency and physical-storage tradeoff for a scoped merge of #207. This acceptance includes the unresolved backend cause and lack of a production-vault scaling bound. It supersedes the earlier merge hold as a maintainer risk decision; it does not supersede or relabel any measurement.

The predeclared material-regression criterion remains unchanged. The adverse reopen results remain adverse, the incomplete metadata-race attempt remains incomplete, and the observed growth is not recast as a plateau or a performance pass. Preserve the validated implementation and all earlier source/artifact identities. No speculative storage correction, new benchmark campaign, schema/scheduling change, release or production deployment is authorized.

The authorized merge is conditional on final CI, reconciliation with current accepted main, and affected integration checks finding no new correctness or substantive integration regression. Only accepted main may be incorporated; no unmerged #206 branch, fixture, implementation or retained evidence is an integration input. Actual integration and merge receipts are recorded with the final PR checkpoint/comment.

### Open follow-up: baseline-and-candidate physical storage growth

Retain this separately from scoped merge acceptance. Across the three complete repeated histories, post-second-reopen regular-file lengths were 54.6 → 128.3 → 163.3 MB for baseline and 67.2 → 132.4 → 187.9 MB for candidate. Per-file filesystem allocation approximately matched lengths, while the known logical repair/reclaim/lease debt closed. Neither sequence reached a plateau in this window; a second graceful reopen did not reliably eliminate the candidate cost.

The backend mechanism, eventual growth bound, complete live-payload census and production-vault scaling remain unresolved. Both variants' growth, all timing variation, differing observer versions and the retained failed attempt remain part of this follow-up. This is an open engineering question, not an active assignment or authorization for more measurements, storage redesign, changed thresholds or a #206 measurement request.

### Accepted-main reconciliation and affected integration

CI417/run40002619982 completed full verification successfully at afb0a1d1e0bf9a5b4250a9f693c20e1fc25fea14. Only after that gate, fetched origin/main was reconciled normally: git merge --no-edit origin/main returned Already up to date. Accepted main remained930747679894f003a2acf3b800df798826ee090c; no source/dependency/build/default change or unmerged #206 input was introduced.

Affected integration was rerun under Node22.22.2 after reconciliation:

- Real Chromium IndexedDB: source-local dependencies, contributor journal recovery, contributor lease protection and foreground startup: **125/125 passed, zero failures/skips**. These run current production sources, not experimental variant overrides.
- Existing guarded kplex-test-small, unchanged installed/built19d75415… artifact: native foreground inventory/interaction passed with zero owned fixtures and controller removed; configuration restored.
- Native SI5 changed-policy, missing-cache, corrupt-cache, corrupt-source and offline-edit recovery passed. Settings, fixtures and throttling were restored. No application-wide restart, new vault, production install or performance comparison was performed. Informational timings in these functional receipts are not new acceptance CPU evidence.

Private integration receipts: %TEMP%/kplex-207-merge-3JHTTZ. SourceRepository SHA256 remains d8d6d532bb711b3cb2bb5d0e55152392495533b8eb64c069158ca8b0e98809d8; main.js remains19d75415c69d8c77bbde934f618eeece2f0387459a49003090eedef61b9bb28f. No new correctness or substantive integration regression was found. The acceptance/integration documentation checkpoint has its own CI gate before merge; its actual result and verified merge commit are recorded in the PR's final comment. No performance assertion or adverse result is relabeled.
