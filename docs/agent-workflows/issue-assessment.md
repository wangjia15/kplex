# Issue assessment

Use this template for a source-based GitHub issue assessment intended for a separate implementation agent working on K-Plex. Post the completed assessment as an issue comment only when authorized. Investigation does not authorize code changes.

Before writing, read the issue and comments, related PRs and commits, and K-Plex's `AGENTS.md`, `CONTRIBUTING.md` and `docs/AGENT_WORKFLOW.md`, plus any relevant companion repository instructions. Trace the affected code and callers at known revisions. Link to commit-pinned source where useful. Keep verified evidence separate from hypotheses; omit sections that do not apply.

## Triage and handoff

1. Investigate each issue; check open/closed duplicates, linked PRs, commits and whether a fix already exists. Publish the assessment in an issue comment only when authorized.
2. Return a short prioritized shortlist to the maintainer, including issues ready for implementation, items needing more evidence and already-addressed items. Use existing K-Plex priority labels and explain dependencies; do not confuse issue priority with the runtime indexing scheduler's P0–P4 levels.
3. Only after the maintainer selects specific issues, prepare implementation branches and draft PRs using [issue resolution](issue-resolution.md). An assessment alone does not authorize them.

## GitHub issue comment template

### Technical assessment — Zsolt's Codex Agent

**Scope and baseline:** K-Plex issue #…; `zsviczian/kplex` `main@SHA` (or named active branch at SHA); related plugin/library revisions if relevant.

**Observed behavior and evidence**
- Reproduction conditions, vault size/state, device/workspace context and expected versus actual behavior:
- Relevant code paths, issue discussions, and existing fix attempts (links):

**Root-cause assessment**
- Verified facts:
- Most likely explanation and confidence (**high / medium / low**):
- What would confirm or disprove it:

**Recommended resolution**
- Smallest safe change and owning K-Plex layer/module (core, application, UI, Obsidian adapter) and repository/repositories:
- Dependencies, existing shared components/contracts, related PRs, or coordinated release requirements:
- Important alternatives or trade-offs, if any:

**Validation and acceptance**
- Focused regression tests to add or update; relevant `npm run verify` checks and host tests if applicable:
- Manual/native checks appropriate to the risk (small/large vault, cold/warm index, main window, popout, reload, mobile, offline, as relevant):
- Acceptance criteria:

**Risks and remaining questions**
- Compatibility, indexing/search/rendering performance, persistence, lifecycle, localization, and unresolved evidence as relevant:

**Disposition**
- **Implement / review existing fix / investigate further / defer**, with priority and reason:
- Prerequisites for an implementation handoff:

Do not describe a hypothesis as a proven cause, or a proposed test as an executed test. Pin code links to inspected commits, distinguish reported from reproduced symptoms, and keep the assessment actionable without prescribing an unnecessary refactor. An assessment is not permission to commit code, open a branch/PR or change the issue's status.
