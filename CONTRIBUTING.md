# Contributing to K-Plex

Thanks for helping improve K-Plex.

K-Plex is a deterministic spatial knowledge graph for Obsidian, not a generic force-directed network. Contributions should preserve its semantic layout, ExcaliBrain compatibility model and large-vault responsiveness.

## Setup

Use Node.js **22.22.2** where possible.

```bash
npm i
npm run build
```

For watch-mode development:

```bash
npm run dev
```

Build output must appear in `dist/` and contain:

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`

The plugin ID is `k-plex`.

Do not consider a change complete until it builds against the real installed Obsidian typings. A local stub harness is useful for fast checks but is not authoritative.

## Before changing Obsidian integration

Read the current Obsidian API/type declarations first.

Do not assume an API exists because it sounds plausible. In particular, use public typed helpers such as `getFileCache()` / `getAllTags()` rather than inventing metadata methods.

UI conventions:

- use Obsidian `Modal` for centered modal workflows
- use Obsidian's declarative settings API for settings pages
- use Lucide icons through `getIcon()` for plugin UI icons
- prefer typed workspace APIs for leaves/windows/pop-outs

## Design principles

### Relationship semantics are spatial semantics

The core layout is deterministic:

- parents: north/top
- children: south/bottom
- friends / previous: west/left
- challengers / next: east/right
- siblings: separate peripheral region

A contribution that changes where a relationship appears is a graph-contract change, not merely a visual tweak.

### Preserve legacy compatibility

Before changing settings, ontology or graph reconciliation:

1. review `src/settings.ts` and `src/index/GraphIndex.ts`
2. assume users may have legacy ExcaliBrain data/settings
3. prefer additive settings with defaults
4. add explicit migration logic for renamed/reshaped data
5. preserve explicit-over-inferred relationship precedence
6. keep old ontology field names meaningful
7. remember that document-property links override duplicates discovered in note body text

Folder and tag nodes may be central, but structural folder/tag connections are not editable with drag-linking.

### Keep the UI on top of normalized graph APIs

React components should not independently classify relationships or rescan the vault.

- indexing/relationship logic belongs in `src/index/`
- persistence/migration belongs in `src/settings.ts`
- Obsidian lifecycle/workspace integration belongs in `src/main.ts`
- React components render and interact with normalized data

## Performance rules

K-Plex is expected to work in vaults with tens of thousands of files and over 100,000 graph/search entries.

Performance regressions are considered functional bugs.

### Avoid full rebuild storms

Do not rebuild on every startup `vault:create`/metadata event.

Changes that touch indexing should preserve:

- startup metadata stabilization
- event coalescing/debouncing
- dirty-index checks
- skipped periodic refresh when nothing changed

### Reuse caches

Do not reread/reparse every Markdown body on every startup.

The persistent body metadata cache should be reused when the file modification time is unchanged.

When adding new expensive derived data, ask whether it can be:

- cached per node
- cached per relationship view
- pre-normalized once for search
- persisted safely between sessions

### Do not repeat expensive work inside render loops

Bad patterns include:

- calling `titleFor()` repeatedly inside a sort comparator
- scanning the full graph for every node render
- compiling user scripts per node
- rebuilding the graph because camera/history/UI state changed

Compute expensive values once and pass/cache them.

### Worker use

CPU-heavy Markdown text parsing may be offloaded to a Web Worker.

Do not call Obsidian APIs from the worker. Keep vault/metadata access and graph mutation on the main thread.

### Search

Search should use pre-normalized data and ordered-subsequence fuzzy matching with ranking roughly:

1. exact
2. prefix
3. full substring
4. fuzzy subsequence

Reuse the previous query's matching candidate set for longer query prefixes when possible.

### Debug logging

Do not leave detailed `[K-Plex PERF]` instrumentation enabled in production.

If you need to profile a regression, gate detailed string-only logs behind a development/debug flag and remove/disable them before merging.

## Current Plex layout requirements

Default settings:

| Setting | Default | Range / notes |
| --- | ---: | --- |
| Parent columns | 2 | max 2 |
| Child columns | 5 | max 7 |
| Parent height | 300 px | own scroll region |
| Friend/challenger height | 350 px | shared setting for left/right |
| Child height | 400 px | own scroll region |
| Sibling height | 250 px | separate region |
| Density | 2 | changes spacing/truncation, not padding |
| Max nodes per zone | 100 | configurable up to 300 |

Layout rules:

- left/right primary zones should be symmetrical
- siblings are the deliberate asymmetry
- lateral and sibling regions may extend into unused parent vertical space
- lateral/sibling bottoms must not overlap the child region
- leave a small gap before children
- when a friend/challenger strip fits within its lateral band, bottom-align it and let it grow upward; sparse lists must not be vertically centered or stranded near the top
- overflowing lateral lists remain scrollable; if filtering reduces an overflowed friend/challenger zone to a result set that fits, bottom-align the filtered results too
- siblings render at 85% normal scale and sit slightly higher
- sibling expanded descendants inherit the 0.85 multiplier
- density uses the same tight node interior padding at every setting

When overflow requires a scroll zone, first-level zones expose a funnel/name filter. Filtering must repack matching nodes rather than hiding nonmatches in place.

## Expanded view

Expanded mode shows children beneath first-level nodes.

Preserve these rules:

- ~50% child node size
- ~70% opacity
- smaller font
- 3 columns × 2 visible rows max per first-level node
- overflow scrolls; no filter in these small scrollers
- nodes with no children reserve no expanded space
- row height is based on the largest descendant cluster in the row

## Gates, lines and labels

- gates sit outside node bounds
- hollow gate = no relationships
- filled gate = relationships exist even when hidden/filtered
- count near gate reflects filtered/visible relationship count
- connectors originate at the correct gate
- connector setting is **Straight** or **Curved** in user-facing UI
- curved lines should be broad and relatively flat
- arrowheads may express direction
- custom ontology labels may be shown over a small break in the line
- suppress generic labels such as parent/child/friend/challenger/file-tree

Hover behavior:

- relationship/node highlight delay target: **750 ms**
- normal hover does not open note preview
- Ctrl/Cmd + hover opens Obsidian preview immediately

## Navigation and history

Test all navigation changes against these expectations:

- Markdown, folder and tag nodes can become central
- clicking nodes navigates
- background drag pans and uses a panning cursor
- activatable nodes use a pointer-like cursor
- wheel zoom works without another mouse button
- left/middle/right drag on empty Plex may pan
- K-Plex can synchronize to a linked/pinned Obsidian leaf or remain decoupled
- startup center = active file leaf when available, otherwise last displayed node
- Past nodes/history persists across restarts
- pinned nodes are persistent quick-access bookmarks beneath the toolbar
- command palette includes opening K-Plex in a pop-out window

## Search interaction checklist

When touching search, verify:

- focus opens instantly
- Up/Down visibly moves selected result
- Enter activates the selection
- Escape closes the result list
- clicking the Plex/outside search closes it
- typing after a previous completed search remains responsive
- large paths/titles remain readable
- fuzzy ordered-subsequence matches work and rank below stronger matches

## Relationship editing checklist

### New relationship from a gate

Verify:

- modal is an Obsidian `Modal`
- default relationship matches source gate
- target gate can refine/invert the offered direction
- already-connected targets are excluded
- folder/tag targets are disabled
- Markdown origin writes YAML on origin
- non-Markdown origin requires Markdown target and writes inverse relation on target
- confirm/cancel icons use `getIcon()`

### Relink an existing direct neighbor

Verify moving a direct neighbor across top/bottom/left/right regions proposes the corresponding relation change.

Write/update frontmatter rather than trying to rewrite arbitrary body text. Frontmatter relationship values intentionally take precedence.

## Settings UX checklist

Settings should be grouped into pages (Graph, Ontology, Compatibility, Appearance, etc.).

The root K-Plex settings page begins with a compact centered link row:

[Buy me a coffee](https://ko-fi.com/zsolt) | [Read Sketch Your Mind](https://community.sketch-your-mind.com/sym) | [Join SYM Community](https://community.sketch-your-mind.com)

Keep that row concise; do not add extra explanatory text around it.

For bounded numeric settings, prefer a slider plus current-value display over an oversized number field.

## Naming and copy

Use **K-Plex** in user-facing strings.

Use **node** rather than **thought** in new user-facing UI/copy. "ExcaliBrain" should appear only when discussing legacy compatibility/migration.

Use **Curved**, not **Bézier**, in settings text.

## Manual regression test matrix

Before submitting a significant change, test the relevant subset of:

- cold start in a small vault
- warm start with persistent body cache
- large vault (20k+ files)
- Markdown central node
- folder central node
- tag central node
- attachment / URL / virtual nodes
- parent/child/friend/challenger/sibling layouts
- scroll-zone filters and repacking
- expanded view and overflow
- straight and curved connectors
- arrow direction
- gate counts/fill state
- linked and unlinked leaf navigation
- pop-out window
- persistent history
- pinned nodes
- search keyboard controls
- Ctrl/Cmd hover preview
- drag-create relationship
- drag-relink direct neighbor
- legacy ExcaliBrain settings import

## Pull requests / patches

Include:

- what changed
- whether legacy compatibility is affected
- whether indexing/search/rendering performance is affected
- manual test steps
- confirmation that `npm run build` succeeds

If the requested deliverable is a patch ZIP, include **only modified/new files** in their repository-relative paths.
