# Reader-first Help review - October 20, 2026

Authoring record for maintainers; this is not an article to copy into the consumer vault.

## Scope and outcome

Help base: `70127fd` on `2026-10-19-help-use-cases` (existing Help PR #2). K-Plex source base: `873eafd` on `main`. Both working trees contain uncommitted documentation changes; no publication, merge, release or new plugin deployment was performed.

Reviewed the complete Help vault and gave each article a reader-oriented opening. Simplified instructions, removed developer-oriented implementation/provenance text from living guides, corrected obsolete multi-Plex synchronization claims, and kept the published release archive's original text attributed and intact. The 0.2.0 page is explicitly a draft; README explains the existing development-build/published-release boundary.

Home now leads through Get started and subject hubs. Choose a topic groups the thirteen paths into three outcomes. Recently added features and the draft release connect through subject hubs. Companion links and release source URLs have explicit related roles so they do not inflate inferred Child lists. Inverse Guide/Parent children are retained as hierarchy rather than accidentally overridden by a companion assignment.

Added focused tag/folder guides and live workshop/thumbnail examples. Added the missing daily note for the Date demonstration, then verified real `date-property` evidence between it and the existing example. Existing filenames, aliases, all eleven `Note type: Use case` classifications and the original Excalidraw drawing payload are preserved.

## Actual checks

- 121 Markdown notes parsed by Obsidian: no missing/invalid frontmatter and no unresolved cached local links or image embeds.
- Actual `GraphIndex.neighbours(page, 'child')` audit after the content refresh: maximum twelve children, including inferred relationships. This is stronger than counting only authored frontmatter entries.
- Final native status: ready, 121/121 files. A full content refresh and a final refresh after reference corrections were functional authoring validation, not performance experiments or an indexing implementation change.
- 33 new genuine Windows/Electron app screenshots (about 3.6 MB). All 54 local PNGs decoded successfully in the native renderer. Existing illustration assets were retained.
- 53 of 54 feature/concept guides have relevant app screenshots; all eleven use cases have screenshots. Mobile and touch remains the physical-device screenshot gap. Desktop screenshots are not presented as physical phone/tablet validation.
- Six representative pages were checked in native Markdown reading view: Home, relationship creation, hierarchical tags, themes, device indexing and the grouped learning path. No broken displayed images or horizontal overflow. Home's body was also checked after scrolling past Obsidian's property block; its first heading rendered correctly.
- Actual native interactions covered searching tags/folders, the shared folder suggester, local Find, type-to-select, command/keyboard help, creation (cancelled), node/link styling pages, semantic style manager, tint editor (cancelled), Sidecar, central reading, two independent Plexes, Wander, expanded children, Excalidraw, fullscreen/Zen and diagnostics. File move/delete/tag-writing confirmations were not submitted for screenshots.
- `git diff --check` passed in both repositories. No runtime source, dependency, build, CSS or index schema change; no runtime CI/benchmark campaign was added for this documentation task.

## Restoration and evidence

Original Help `data.json`, workspace/recent-file list, one-Plex layout, central 0.2.0 draft and window geometry were restored. `.obsidian` has no final Git diff; plugin binaries and other vaults were untouched. Temporary tabs and the authoring controller were removed. Private native receipts, rendered-page captures and original configuration copies remain under `%LOCALAPPDATA%/KplexValidation/help-reader-review-2026-10-20`.

Opening **Report a bug** automatically copied its diagnostic report to the clipboard; the documentation now states this accurately. The previous clipboard content was not captured, so it could not be restored. No report was submitted or published.

## Reusable templates

Updated the feature, use-case and release templates. Added topic-hub, troubleshooting, reference and live-example templates. The playbook now covers reader need/outcome openings, authentic screenshots, true and inferred child bounds, incoming hierarchy, and preserving published history. Keep authoring instructions and evidence in the source repository rather than the Help articles.

## Feature screenshot coverage

| Guide in kplex-help | App screenshot(s) |
| --- | --- |
| `01 Core concepts/Idea Compass.md` | `Screenshot - Excalidraw idea compass.png` |
| `01 Core concepts/Node types.md` | `Screenshot - Search tags.png` |
| `01 Core concepts/Ontology and relationship fields.md` | `Screenshot - Ontology pairs.png` |
| `01 Core concepts/Relationship roles.md` | `Screenshot - Reading relationships.png` |
| `01 Core concepts/Relationship sources and inference.md` | `Screenshot - Reading relationships.png` |
| `01 Core concepts/The spatial relationship model.md` | `Screenshot - Reading relationships.png` |
| `01 Core concepts/What K-Plex is not.md` | `Screenshot - Reading relationships.png` |
| `01 Core concepts/What K-Plex is.md` | `Screenshot - Reading relationships.png` |
| `02 Navigate and explore/Editor node and web pages.md` | `Screenshot - Read inside the center.png` |
| `02 Navigate and explore/Explore folders.md` | `Screenshot - Folder navigation.png`; `Screenshot - Search folders.png` |
| `02 Navigate and explore/Explore hierarchical tags.md` | `Screenshot - Search tags.png`; `Screenshot - Tag hierarchy.png` |
| `02 Navigate and explore/Footprints and breadcrumbs.md` | `Screenshot - Footprints trail.png` |
| `02 Navigate and explore/K-Plex command palette.md` | `Screenshot - Command palette.png` |
| `02 Navigate and explore/Keyboard navigation.md` | `Screenshot - Keyboard help.png` |
| `02 Navigate and explore/Keyboard shortcuts reference.md` | `Screenshot - Keyboard help.png` |
| `02 Navigate and explore/Mobile and touch.md` | Physical phone/tablet capture pending; no desktop stand-in. |
| `02 Navigate and explore/Navigating the Plex.md` | `Screenshot - Reading relationships.png` |
| `02 Navigate and explore/Past nodes and pins.md` | `Screenshot - Past nodes.png`; `Screenshot - Pins.png` |
| `02 Navigate and explore/Tags and folders.md` | `Screenshot - Search folders.png` |
| `02 Navigate and explore/Type to select visible nodes.md` | `Screenshot - Type to select.png` |
| `02 Navigate and explore/Vault Search vs Find in this Plex.md` | `Screenshot - Find on this map.png` |
| `02 Navigate and explore/Wander.md` | `Screenshot - Wander controls.png` |
| `03 Build and edit/Connection details and evidence.md` | `Screenshot - Connection Details Context Menu.png`; `Screenshot - Connection Details.png` |
| `03 Build and edit/Create a relationship.md` | `Screenshot - Create a related note.png` |
| `03 Build and edit/Create notes and placeholders.md` | `Screenshot - Choose a folder.png` |
| `03 Build and edit/Date properties and daily notes.md` | `Screenshot - Date connections.png` |
| `03 Build and edit/Drag drop and reclassify.md` | `Screenshot - Two independent Plexes.png` |
| `03 Build and edit/Excalidraw integration.md` | `Screenshot - Excalidraw idea compass.png` |
| `03 Build and edit/Manage and clean up ontology.md` | `Screenshot - Ontology documents.png`; `Screenshot - Ontology pairs.png` |
| `03 Build and edit/Ontology autocomplete.md` | `Screenshot - Ontology suggestions.png` |
| `03 Build and edit/Remove one relationship source.md` | `Screenshot - Connection Details.png` |
| `03 Build and edit/Unlink and delete.md` | `Screenshot - Connection Details Context Menu.png` |
| `04 Filter and focus/Expand a note into sections.md` | `Screenshot - Section outline.png` |
| `04 Filter and focus/Expanded relationship view.md` | `Screenshot - Expanded neighbors.png` |
| `04 Filter and focus/Graph Lenses are local.md` | `Screenshot - Quick filters and lenses.png` |
| `04 Filter and focus/Graph Lenses.md` | `Screenshot - Quick filters and lenses.png`; `Screenshot - Filters and Lenses.png` |
| `04 Filter and focus/Keep layout vs Reflow.md` | `Screenshot - Quick filters and lenses.png` |
| `04 Filter and focus/Quick Filter.md` | `Screenshot - Quick filters and lenses.png` |
| `05 Personalize and workspace/Actions and shortcuts.md` | `Screenshot - Action preferences.png` |
| `05 Personalize and workspace/Colors and themes.md` | `Screenshot - Directional tint.png`; `Screenshot - Named themes.png` |
| `05 Personalize and workspace/Fullscreen and Zen mode.md` | `Screenshot - Focus without toolbars.png` |
| `05 Personalize and workspace/Images in nodes.md` | `Screenshot - A note with a thumbnail.png` |
| `05 Personalize and workspace/Layout density and typography.md` | `Screenshot - Layout controls.png`; `Screenshot - Node styling.png` |
| `05 Personalize and workspace/Node styles from help tags.md` | `Screenshot - Node style rules.png` |
| `05 Personalize and workspace/Note-tab synchronization.md` | `Screenshot - Two independent Plexes.png` |
| `05 Personalize and workspace/Sidecar.md` | `Screenshot - Read beside the map.png` |
| `05 Personalize and workspace/Visibility and connector styling.md` | `Screenshot - Connector styling.png` |
| `06 Indexing and troubleshooting/How indexing works.md` | `Screenshot - Index status.png` |
| `06 Indexing and troubleshooting/Large vault behavior.md` | `Screenshot - Index status.png` |
| `06 Indexing and troubleshooting/On demand vs Eager.md` | `Screenshot - Device indexing.png` |
| `06 Indexing and troubleshooting/Rebuild purge and diagnostics.md` | `Screenshot - Report a problem.png` |
| `06 Indexing and troubleshooting/Troubleshooting checklist.md` | `Screenshot - Report a problem.png` |
| `06 Indexing and troubleshooting/Understanding index status.md` | `Screenshot - Index status.png` |
| `06 Indexing and troubleshooting/Web link indexing.md` | `Screenshot - Index status.png` |
