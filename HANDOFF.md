# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Assignment: stable gate counts - final runtime verification

Prepared by Zsolt's Codex Agent. Branch: 2026-10-24-stable-gate-counts; PR211 remains draft. Base894437d97bd0e21733e9072fcbecafa7e5d46e0e. No merge/release/production deployment authorized.

The requested two improvements are implemented. Read docs/validation/stable-gate-counts-2026-10-24.md for the exact source/freshness/display contracts, prior successful checks and retained failures. Existing read protection, repository/count maintenance, source authority and actual relationship edits remain intact.

Foreground validation found and corrected two additional causes of genuine count changes: a retained deleted virtual note was counted as a physical folder/tag member, and first-order host previews omitted already captured neighbors' native folder parents. GraphIndex now filters only nonphysical note members from structural reads without changing ordinary unresolved Markdown links or mutating cached incidence. HostMetadataPreview includes native folder facts for already captured owners, preserving center-scoped tags and existing read/record/byte/finality guards. No extra owner read or folder scan.

Focused real-IndexedDB controls13/13 pass, zero skips; actual-dependency production build and official scanner pass. Final runtime full verification PASSED via runPortableVerification (Node and shell exit0, suite totals7/130/1417/228/357/739, zero failures/cancellations/skips), with an explicit Node outcome receipt: %TEMP%/kplex-stable-gates-final-runtime-verification.json and final-runtime-verify.log. Earlier09b84be complete-suite results/CI436 do not silently validate the new corrections. Documentation-only CI438 on identical09b84be runtime failed the existing URL-heavy timer bound55.6ms/50ms. Preserve it as failed, unchanged assertion. No thresholds/deadlines weakened.

Current native-tested production main.js SHA-256 b808dd5f1bf3db150c66efe352b73fd0fb64b2f1528d58cad60547441d66cb32, version0.2.3. Manifest843d327e4a634a6e28cd645be8c533adc873a1ac1c6498502b5ca44e70120109; styles88b61aa508ede97b10fbd30c957d14ba19b257aa26f5ee9f547f13faa0f43974. Production build identity depends only on manifest version, not Git HEAD/dirty state; renewed full build reproduced all three exact native-tested hashes.

Guarded Small exact build passed three actual native-editor autosaves with zero observed badge/scene DOM mutations, retained editor focus, structural lateral0, real link removal/addition and exact cleanup (%TEMP%/kplex-stable-gates-editor-preview-fixed/stable-gate-counts.json). Foreground inventory lane passed all6 cases, zero manual flushes, background resumed and config restored (%TEMP%/kplex-stable-gates-final-foreground/report.json). Final inventory107 original files; controllers removed. Foreground access was explicitly released back to the maintainer for video editing: coordinate before any additional foreground operation. No CPU claim from this shared-host interval.

Qualification: older adaptiveFit Markdown-save lane still fails its unchanged zero-broad-semantic-notification assertion (3 callbacks/3 saves), with0 animations, mounted DOM retained and editor focus preserved. Focused canonical commits are semanticChanged:false/unchangedSource:true. Retained accepted-baseline two-note traces also contain callbacks, but an extra baseline adaptiveFit attempt failed a rendered-body-parent prerequisite, so there is no complete matched legacy-lane comparison. Do not label it passed/waived. Keep this separate failed qualification visible for review; no speculative notification redesign.

Runtime checkpoint15c6fdef144d329fba2d14ea1e4298850686bf09 is pushed and read back. Next: publish this documentation-only final local evidence, verify remote head, update PR211/checklist/comment and independently inspect implementation CI439 and final documentation CI. No further local runtime tests or foreground checks are needed absent a new finding. Keep raw traces private and sign GitHub comments Zsolt's Codex Agent. No benchmark campaign, Mac work, production vault or unrelated refactor.
