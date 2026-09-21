# AGENTS.md

## Mission

Develop **K-Plex (Knowledge Plex)** as a dedicated React application inside Obsidian while preserving the relationship semantics, ontology model and useful settings compatibility of classic ExcaliBrain.

K-Plex is not an Excalidraw extension. Excalidraw and Dataview must not be runtime requirements.

The plugin ID is **`k-plex`** so K-Plex can coexist with legacy ExcaliBrain during migration.

## Build contract

Baseline Node.js: **22.22.2**.

```bash
npm i
npm run build
```

Use `npm run dev` for watch-mode development.

A change is not complete if the real repository does not build successfully.

Installable output must be written to `./dist/`:

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`

Do not claim a successful build from a stub-only/type-harness check. When Obsidian APIs are involved, validate against the actual installed `obsidian` type package.

## Obsidian API discipline

This project has already lost time to invented/assumed APIs. Do not guess Obsidian methods.

Rules:

1. Check the installed Obsidian type declarations and current official documentation before using an unfamiliar API.
2. Prefer public typed APIs.
3. Example: `MetadataCache.getFileCache(file)` is valid and `getAllTags(cache)` is exported; do **not** invent `metadataCache.getTags()`.
4. Use Obsidian `Modal` for centered modal dialogs.
5. Use `workspace.getLeaf("window")` for pop-out workflows when supported by the installed API.
6. Use the Obsidian declarative settings API for settings UI.
7. All plugin UI icons must be Lucide icons obtained through Obsidian `getIcon()` (or a thin React wrapper around it). Do not ship hand-coded icon SVGs or unrelated icon libraries.
8. Moment is host-provided by Obsidian. Do not runtime-import `moment` or call the `moment` export from `obsidian`; production code should use Obsidian's `window.moment` through narrow local typing. Tests may install a Moment test double on `window`.

## Non-negotiable compatibility rules

1. Preserve classic ExcaliBrain ontology semantics unless a deliberate migration/change is documented.
2. Explicit document-property relationships take precedence over inferred/body relationships.
3. Preserve parent / child / left-friend / right-friend / previous / next reconciliation behavior.
4. Preserve support for Markdown notes, attachments, folders, tags, URLs and virtual/unresolved nodes.
5. Preserve legacy style inheritance as closely as possible without relying on Excalidraw rendering.
6. Preserve/migrate legacy persisted settings instead of silently reinterpreting them.
7. Migrate old `hierarchy.friends` to `hierarchy.leftFriends`.
8. If legacy ExcaliBrain is installed and running, automatically import compatible settings the first time K-Plex runs in that vault. Keep a manual import path as well.
9. Folder and tag nodes may be central nodes, but drag-link creation/relinking involving folder/tag endpoints is disabled.
10. A Markdown document property overrides an equivalent relationship discovered in body text. This rule is important for deterministic relinking.

## Architecture boundaries

- `src/index/` owns graph construction, relationship semantics, search data, caches and compatibility.
- `src/ui/` owns React presentation and interaction.
- `src/settings.ts` owns settings schema/defaults, persistence compatibility and migration.
- `src/main.ts` owns Obsidian lifecycle, commands, workspace/window/leaf integration and rebuild scheduling.

Do not reimplement relationship classification inside React components. UI code should consume normalized index APIs.

Keep Obsidian-specific side effects behind clear boundaries. Presentational components should not reach deeply into workspace/vault APIs when plugin/index services can perform the operation.

## Performance is a product requirement

The plugin must remain responsive in vaults with 20,000+ files and 100,000+ graph/search entries.

### Startup

Obsidian emits large numbers of file events while initializing a vault. Never trigger a full rebuild for every startup `vault:create` or metadata event.

Required strategy:

- wait until layout is ready and metadata is sufficiently stable before the initial full graph build
- register/coalesce normal rebuild listeners only after startup initialization is under control
- mark the index dirty on changes and skip periodic refreshes when it is clean
- collapse event bursts into at most one rebuild/catch-up rebuild

### Persistent parsing cache

Markdown body parsing is expensive and should not repeat on every startup.

- persist parsed inline-field / external-link body metadata in vault-local storage
- key cache records by path + modification time (or an equivalent safe invalidation key)
- restore the cache before the first graph build
- write cache updates lazily/debounced

### Worker boundary

CPU-heavy Markdown-body text parsing may run in a Web Worker.

Do not attempt to use Obsidian APIs inside the worker. Vault/metadata access, graph mutation and Obsidian object handling remain on the main thread.

### Derived-data caching

Avoid repeated global work while rendering one scene.

Cache or precompute:

- relationship classifications / normalized neighbor views
- node titles
- title-script results
- sort keys
- gate counts where safe
- search-normalized strings

Compile user title scripts once, not per node.

Never call `titleFor()` repeatedly from an `Array.sort()` comparator. Compute titles/sort keys once and sort on the cached keys.

UI-only actions such as pan, zoom, hover, history updates and density changes must not trigger index rebuilds.

### Search

Search must feel immediate in large vaults.

- normalize search text ahead of time
- use exact > prefix > substring > fuzzy ranking
- fuzzy matching is ordered subsequence matching
- search aliases and paths
- reuse previous-query candidate sets for longer prefixes rather than rescanning the entire index on every keystroke
- do not globally sort all search entries at startup just to support query-time ranking

### Instrumentation

Detailed `[K-Plex PERF]` instrumentation was useful during optimization but should be removed from normal production output.

If profiling is needed again, add it behind an explicit development/debug flag and emit copy-friendly string lines. Do not leave high-volume console logging enabled by default.

## Plex layout contract

K-Plex is not a force-directed graph. Spatial meaning is deterministic.

### Zones

- parents: top / center
- children: bottom / center
- friends + previous: left
- challengers + next: right
- siblings: separate right-side peripheral zone

Left and right primary zones should be symmetrical. Siblings are the intentional asymmetry.

The zones must not visually overlap one another in normal use.

Current target defaults:

- parent columns: **2**
- child columns: **5**
- parent max height: **300 px**
- friend/challenger max height: **350 px**
- child max height: **400 px**
- sibling max height: **250 px**
- density: **2**
- max nodes per zone: **100**, configurable up to **300**

Parent columns must not exceed 2. Children may be configured up to 7 columns.

Friends/challengers and siblings may extend upward into otherwise unused parent-area space. They should not be artificially clipped by the parent's vertical boundary.

When their occupied strip fits, Friends/Previous and Challengers/Next are **bottom-aligned** within their shared-height lateral bands and grow upward. A sparse lateral list (including a single node) must stay near the lower edge of the lateral region instead of being centered high in the available band. Overflowing strips remain scrollable; if filtering reduces an overflowed lateral zone to a result set that fits, preserve the same bottom-aligned behavior.

Leave a small vertical gap between the bottom of lateral zones and the start of children; children should sit slightly lower than in the earlier layout.

Siblings:

- move slightly upward relative to the current layout
- render at `0.85` normal scale
- expanded-view descendants of sibling nodes inherit the same `0.85` multiplier

### Scroll zones

Each major zone has its own maximum height.

When the node list exceeds that height:

- make the zone internally scrollable
- show a funnel/filter control for first-level friend/challenger/sibling/parent/child scroll regions where applicable
- filtering must remove and repack nonmatching items; invisible placeholders that preserve whitespace are a bug
- the count above the funnel shows the total/current visible item count even when the text filter is closed

Expanded-descendant scrollers do not get filter controls.

### Density

Density/compactness affects:

- inter-node spacing
- label truncation / maximum displayed characters
- overall layout density

Density must **not** change node interior padding. Use the tight padding from the compact design at every density.

## Expanded view contract

Expanded mode shows children of visible first-level nodes.

- child-of-node display is approximately 50% normal node size
- smaller font
- approximately 70% opacity
- maximum 3 columns × 2 visible rows per first-level node
- overflow is scrollable
- no filter UI in the small expanded-child scroller
- do not reserve descendant space for a first-level node with no children
- when multiple nodes share a row, row height equals the maximum descendant-space requirement among nodes in that row
- sibling-node expanded descendants inherit sibling's 0.85 scale multiplier

## Gates and connectors

Every visible node has four gates.

Gate semantics:

- hollow = no connected relationships
- filled = relationships exist, even if related nodes are hidden/filtered
- displayed count = relationships represented under the active filter/visibility rules

Connectors must originate/terminate at the relevant gates, never at node centers.

Connector styles:

- `straight`
- `curved` (user-facing wording; do not call it Bézier in settings)

Curved connectors should be broad/flatter rather than excessively bowed.

Relationship labels should sit over a small break in the connector line. Suppress generic labels such as parent, child, friend, challenger and file-tree; show meaningful custom ontology labels.

Optional arrowheads indicate link direction and must preserve legacy direction/reversal semantics.

## Hover behavior

Do not cause the graph to flash as the pointer crosses dense scenes.

- relationship/node/gate highlight delay target: **750 ms**
- hover preview only while Ctrl (Windows/Linux) or Cmd (macOS) is held
- modifier-assisted preview should appear immediately
- normal hover without Ctrl/Cmd must not trigger Obsidian page preview

Use context-appropriate cursors: nodes/links that can be activated use pointer-style feedback; empty canvas uses panning/grab feedback.

## Navigation and state

- clicking a node activates/navigates it
- folders and tags are navigable and may be central
- graph navigation can be synchronized to an active or pinned Obsidian leaf, or decoupled
- if an active file leaf exists at K-Plex startup, use it as center
- otherwise restore the last displayed node
- persist Past nodes/history across sessions
- add command palette action to open K-Plex in a pop-out window
- pinned nodes are persistent bookmarks/quick-access entries displayed beneath the main toolbar

## Search behavior

Search dropdown must support full keyboard interaction:

- Up/Down moves selection
- Enter activates selection
- Escape closes
- clicking the Plex/outside the dropdown closes
- opening a new query after a previous search must be immediate

Use a wide dropdown and do not allow long paths/titles to make results unreadable.

## Panning and zoom

- wheel scrolling zooms without requiring another mouse button
- dragging empty Plex space may pan with left, middle/wheel, or right mouse buttons
- context menus must not accidentally fire during right-drag panning
- zoom is hard-capped at 300%; do not expose a separate max-zoom setting

## Drag-connect and relinking

### Create relationship from gate

Dragging from a gate and releasing on empty Plex opens an Obsidian `Modal`.

The modal provides:

- Markdown target selection
- ontology/document-property dropdown appropriate to the relationship direction
- check/confirm and X/cancel Lucide buttons via `getIcon()`

Only targets not already connected in the relevant way are selectable.

Default relation by gate:

- top → parent
- bottom → child
- left → friend
- right → challenger

Dropping onto a specific target gate must also influence the proposed relationship direction.

If origin is Markdown, write YAML relationship on origin.

If origin is non-Markdown, target must be Markdown and write the inverse relationship on target.

While drag-connecting, only nodes already connected through the origin gate should be visually de-emphasized as invalid/redundant; other valid targets remain available.

Disable drag-linking to/from folder and tag nodes.

### Move an existing direct neighbor

Dragging a node directly connected to the center across top/bottom/left/right regions may propose changing its relationship class.

When rewriting relationship data, prefer adding/updating document properties because document-property relationships override duplicate body relationships.

## Styling

A `Note type` frontmatter/document property may drive a note's primary node style. Settings must allow defining styles per note type.

Continue supporting legacy tag-specific style compatibility where feasible.

## Settings UX

Use grouped declarative settings pages such as:

- Graph
- Ontology
- Compatibility
- Appearance

The root K-Plex settings page begins with a compact centered row:

`Buy me a coffee | Read Sketch Your Mind | Join SYM Community`

with links:

- https://ko-fi.com/zsolt
- https://community.sketch-your-mind.com/sym
- https://community.sketch-your-mind.com

Do not place these links inside the Graph page and do not add explanatory marketing copy around them.

Use sliders where a bounded numeric range is meaningful (zone heights, gate radius, etc.) and show the current value next to the slider.

## Naming

Use **K-Plex**, not ExcaliBrain, in user-facing UI and docs except when explicitly discussing compatibility/migration.

Use **nodes**, not "thoughts", in user-facing terminology. Legacy internal names can be migrated gradually, but new UI strings should say nodes.

## Testing expectations

Before returning a patch:

1. run `npm test` when indexing, ontology, provenance, folders, tags, URLs, Date properties or relationship classification changed
2. build against the actual repository and Obsidian typings
3. test startup with an existing K-Plex data file
4. test a large-vault path if the change affects indexing/search/rendering
5. verify Markdown, folder, tag, attachment, URL and virtual-node navigation as relevant
6. verify linked/unlinked leaf behavior for navigation changes
7. verify no new high-volume console logging
8. package only requested modified/new files when the user asks for a patch ZIP
