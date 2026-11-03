# P13 parser timer follow-up

Zsolt's Codex Agent,2026-10-25. Targeted follow-up requested after PR219 full verification failed the existing inline-parser timer guard at55.0ms. **Cause remains unproven; no parser or timer-guard correction is claimed.** The original45ms assertions and parser production code remain unchanged.

## Fixed scope and method

Required Node22.22.2, real installed dependencies, macOS. Three isolated fresh-process primary runs, three complete-indexing-file primary runs and separate isolated/full diagnostic runs. No concurrent test/build/native lane. No repetitions selected by success and no retries inside a sample. Preserve all failed setup/process outcomes. This is a bounded parser experiment, not an indexing benchmark campaign.

Each parser operation retains its original4MiB fixture construction inside the measured callback, real cooperative facade/core,4ms budget, actual MessageChannel host yield and original timer scheduling/drain semantics. Isolated execution bundles those exact production owners with real esbuild; full-file copies retain all preceding test ordering and subsequent assertions. Controls follow the two parser observations:200ms without application work and deliberate80ms synchronous blocking. The former must satisfy45ms; the latter must exceed it.

Primary observation adds only summary recording after the original timing/drain. Diagnostics separately add phase transitions, actual yield-post/delivery boundaries, main-thread CPU coordinates, callback distributions/completion coordinates and GC performance entries. They preserve the facade's Date.now clock, real yield helper and cancellation result. They are instrumented observations, not exact uninstrumented task/CPU attribution.

The initial full-file generator accidentally removed the helper still used later by P15. Its three primary and one diagnostic processes reached and recorded P13, then failed with ReferenceError in P15. Those are **not complete-file passes**. All four are retained. The corrected generator preserves the original P15 helper; the predeclared three primary/full and one diagnostic/full executions then completed all assertions. No timer threshold or production input changed between these generator versions.

## Results

Milliseconds, in execution order. The complete raw/sanitized receipt retains earlier generator failures and separate diagnostics.

| Primary context | Inline-field maximum gaps | Whitespace maximum gaps |
| --- | --- | --- |
| Isolated fresh process,3 |21.999,13.898,12.952 |7.755,7.458,7.731 |
| Complete indexing file,3 |12.697,18.122,10.289 |7.604,7.856,9.036 |

All six primary no-application controls passed (maximum1.234–1.267ms). All six80ms positive controls exceeded45ms (80.203–80.637ms), so the protected criterion rejects them. Primary helper still has the existing post-completion-tail limitation; no CPU-only replacement was introduced.

Separate diagnostics: isolated inline13.114ms / whitespace7.872ms; corrected full inline13.174ms / whitespace7.975ms. Parser windows had40–60 callback observations. Largest recorded delivery-to-next-post interval8.574ms; largest post-to-delivery wait9.914ms; largest reported GC entry9.046ms across valid diagnostic windows. An earlier incomplete full-file diagnostic also recorded an8.284ms GC entry near a16.367ms inline gap and is retained separately. GC-entry duration is not an exclusive stop-the-world attribution and a dispatch interval can include other runtime work. No observed sample explains the earlier55.0ms failure.

Source hashes for core parser, host facade, host-yield helper and original indexing test remained identical throughout the series. The original failed full invocation remains red and documented in the [Mind Map correction report](mind-map-correction-219-2026-10-25.md); later passes do not erase it.

## Conclusion and next experiment

The parser yielded frequently in these samples, idle controls passed and deliberate blocking was detected. This provides no evidence justifying a parser optimization, relaxed limit or replacement assertion. It also does not prove the timer guard reliable: callback spacing still includes descheduling/GC/other callbacks and the pending post-completion tick, as established by the [earlier investigation](url-heavy-timer-investigation-2026-10-24.md).

Retain the existing guard. If the natural failure recurs, capture one bounded phase/yield/GC trace on that failing platform with all failed artifacts retained. A slow parser interval would justify fixing its exact owner; scheduling between cooperative deliveries would justify validating deterministic cooperative-work contracts separately from an environment-sensitive integration measurement. Stop this local series here rather than expanding repetitions until a desired result appears. Full normal verification for the actual feature changes is a separate gate, not another timing experiment.

[Ordered receipts](parser-responsiveness-followup-2026-10-25.json) include source identities, all12 process outcomes, every timer observation and separate instrumentation. Private reproduction scripts/logs/plan and both generator versions remain under /private/tmp/kplex-parser-followup-20261025; the owned temporary test was removed. No Obsidian note or configuration was changed by the parser experiment.
