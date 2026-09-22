# K-Plex

![KPLEX Screenshot](docs/KPlex-Screenshot-3.png)

**K-Plex (Knowledge Plex)** is a spatial knowledge navigator for Obsidian. It gives you a focused view around one active node and places related nodes in predictable directions, so the position of a node carries meaning.

K-Plex is the successor architecture to ExcaliBrain. It preserves the relationship model and much of the ontology/settings compatibility of classic ExcaliBrain, but it has its own React-based interface and does **not** require Excalidraw or Dataview at runtime.

K-Plex is inspired by spatial knowledge interfaces such as TheBrain, but it is an independent implementation.

> Warning: K-Plex is a new plugin and is still undergoing real-world testing. Bugs and unexpected behavior are possible. Before using K-Plex to create or modify relationships between important notes, I strongly recommend trying it first on a small set of test notes. As with any plugin that can modify your vault, keep a current backup of your data.

![KPlex overview](./docs/KPlex-Screenshot-1.png)

## The Plex at a glance

K-Plex is deliberately **not** a force-directed graph. Relationships are arranged deterministically around the current node:

| Relationship | Position |
| --- | --- |
| Parents | above |
| Children | below |
| Friends / Previous | left |
| Challengers / Next | right |
| Siblings | separate peripheral area on the right |

Friends and challengers grow **upward from the bottom of their lateral area**. This keeps a sparse side — for example a single Challenger — close to the central working area instead of leaving it isolated near the top of the Plex.

## Requirements

- Obsidian **1.13.0 or newer**
- Desktop, tablet or mobile
- Desktop for Obsidian pop-out windows

On phones and tablets, **Open K-Plex** opens the dedicated K-Plex sidepanel by default. The regular leaf and pop-out views remain available where supported.

Excalidraw and Dataview are not required.

![KPLEX Screenshot](docs/KPlex-Screenshot-2.png)

## Opening K-Plex

You can open K-Plex from the ribbon or from the Command Palette with **Open K-Plex**.

Other useful commands include:

- **Focus active note in K-Plex**
- **Rebuild K-Plex index**
- **Open K-Plex settings**
- **Open K-Plex in pop-out window**
- **Open K-Plex in side panel**

When K-Plex opens, it uses the active file when possible. Otherwise it restores the last displayed node, falling back to the vault root when needed. On phones, the normal **Open K-Plex** action routes to the sidepanel for a more natural navigation surface. On tablets, **Open graph** opens a normal K-Plex tab while **Open in side panel** remains available separately. Phone command palettes intentionally expose only the sidepanel opening action; pop-out windows remain desktop-only.

## Navigating

- **Single-click** a node to make it the center of the Plex.
- **Double-click** a file-backed node to open it in Obsidian.
- Double-clicking a URL opens it in the browser.
- Double-clicking an unresolved/virtual node creates the corresponding Markdown note.
- Folder and tag nodes can become the center of the Plex.
- With the default **Smart** mouse controls, left-drag empty Plex space to pan, middle-drag anywhere to pan, and right-click nodes/connectors for context menus. A Legacy preset can restore all-button panning.
- Use the mouse wheel or the zoom controls to zoom; no modifier key is required.
- On touch devices, drag with **one finger** to pan and use **two-finger pinch** to zoom. K-Plex owns these gestures inside the graph so Obsidian Mobile does not interpret graph navigation as workspace edge/top swipes.
- Long-press a node or connector on touch devices to open the same context menu available with right-click on desktop.
- Use **Fit graph** to bring the visible Plex back into view.

K-Plex keeps a persistent **Past nodes** history at the bottom of the view. The back/forward buttons step through that navigation history.

## Search

The search box finds nodes by title, alias and path. Matching is fuzzy, while stronger exact, prefix and substring matches are ranked ahead of looser matches.

Keyboard controls:

- **Up / Down** — move through results
- **Enter** — activate the selected result
- **Escape** — close the result list

Clicking elsewhere in the Plex also closes the search results.

When the search field is empty, K-Plex prioritizes Obsidian **Bookmarks** (or legacy Starred entries), followed by K-Plex pins, before the normal node list.

## Note-tab synchronization

K-Plex can be independent from Obsidian note tabs, linked to whichever note tab was used most recently, or pinned to one fixed note tab. The toolbar deliberately uses the same **tab** and **note** language as Obsidian rather than Workspace API terminology.

Two one-shot actions are available both from the sync menu and the Command Palette:

- **Sync most recent note tab with K-Plex** — load the current central K-Plex note into the most recently used note tab.
- **Sync K-Plex with most recent note tab** — make the note in the most recently used note tab the K-Plex center.

For persistent behavior choose **not linked**, **linked to most recent note tab**, or **pinned to one fixed note tab**. A pinned note tab is considered a companion sidecar whenever it is physically adjacent to K-Plex; moving it elsewhere hides the sidecar controls without breaking the pin, and moving it back beside K-Plex restores those controls. Opening the companion sidecar creates or reuses an adjacent visible note tab and switches K-Plex to pinned mode. Closing the sidecar closes that pinned tab, while Detach leaves it open and removes synchronization.


## Companion sidecar

K-Plex can manage a **companion sidecar** next to a normal K-Plex leaf. The sidecar is intentionally implemented as a real adjacent Obsidian `WorkspaceLeaf`, not as a faux leaf mounted inside React. This keeps native Obsidian resizing, view persistence and third-party plugin rendering intact.

- The sidecar can be placed to the right, left, above or below K-Plex. Adjacency is measured from the containing workspace tab-group geometry rather than only the inner view body, so stacked panes remain recognizable even though Obsidian's tab header creates a visual gap between `ItemView.containerEl` rectangles.
- Its native Obsidian divider controls the relative size of the two areas.
- It stays hard-linked to the current K-Plex center and updates automatically as you navigate.
- Markdown defaults to the configured reading/preview or source mode; plugin-owned file views such as Excalidraw remain native.
- URL centers are sent to Obsidian's built-in Web Viewer when available.
- Edge controls beside the Plex collapse the sidecar, move it, or **detach** it. The controls are positioned against the complete K-Plex leaf rather than only the graph canvas, so they remain visible on the actual divider edge for above/below as well as left/right sidecars. Detach stops K-Plex synchronization but leaves the native Obsidian tab open exactly where it is, so it becomes an ordinary independent document/view.
- At workspace startup K-Plex prefers an already-visible adjacent document tab over Obsidian's sometimes misleading deferred “most recent” tab, so a restored sidecar reconnects to the pane the user actually sees.
- If the remaining K-Plex width becomes smaller than the configured condensed breakpoint, K-Plex switches to the current device's sidepanel density/column profile.
- The companion sidecar is unavailable when K-Plex itself is already running in an Obsidian sidepanel.

This feature complements rather than replaces K-Plex's pinned nodes and linked-document-leaf behavior.

## Pins

The current node can be pinned from the toolbar. Pinned nodes are persistent quick-access bookmarks shown directly below the main toolbar.

Pins are independent of Past nodes/history, so they are useful for a small set of stable reference points that you want to keep available while exploring. Nodes can also be pinned/unpinned from their context menu.

## Toolbar visibility controls

The toolbar provides quick toggles for the node types and relationship views that are most useful during exploration, including:

- attachments
- unresolved/virtual nodes
- inferred relationships
- Markdown pages
- aliases
- folders
- tags
- web links
- siblings
- single-level vs expanded view
- straight vs curved connectors

The toolbar also includes refresh, navigation synchronization, pinning and settings controls. The toolbar has two presentation modes: a compact mode with the core navigation/link/pin/sidecar/settings actions, and an expanded mode containing the full visibility/layout control suite. The mode is persisted.

## Layout, scrolling and filtering

K-Plex keeps the graph readable by giving the major regions independent size limits.

Density and parent/child column counts are stored as **per-view profiles**. K-Plex keeps separate values for desktop, tablet and mobile, and separately for normal leaves, pop-outs and sidepanels. Sidepanel/mobile profiles default to denser layouts with fewer columns, while the normal desktop leaf defaults to 2 parent / 5 child columns at density 2.

Shared zone limits default to:

| Setting | Default |
| --- | ---: |
| Parent maximum height | 300 px |
| Friend / challenger maximum height | 350 px |
| Sibling maximum height | 250 px |
| Child maximum height | 400 px |
| Maximum nodes per zone | 100 |

The maximum number of nodes per zone can be increased to **300**.

When a first-level zone becomes taller than its configured maximum, it gets its own scrollbar and a funnel control for filtering by name/path. Filtering repacks the matching nodes instead of leaving holes where hidden nodes used to be.

The toolbar also has a **Plex filter** that filters all visible graph elements by keyword, tag and note type. Keyword matching includes title, path, alias and relationship definition.

The Friend and Challenger regions are symmetrical. They may extend upward into otherwise unused parent-area space, but their lower edge stays above the child region with a small gap. Sparse Friend/Challenger lists remain bottom-aligned and grow upward as more nodes are added.

Siblings occupy a separate peripheral region and are rendered slightly smaller than normal first-level nodes.

The **Density** control changes spacing and label truncation and can be increased up to **4.0** for very compact layouts. The **Columns** control changes the parent/child column combination without changing relationship semantics.

Scene changes use positional animation rather than a simple fade: thoughts that exist in both scenes visibly migrate to their new location, the newly selected center arrives a little faster, and genuinely new thoughts enter from the direction of their gate. **Settings → Appearance → Animation speed** controls the effect from **0 (off)** through slow/normal to **2×** speed. Section fold/unfold is treated as an outline operation and deliberately preserves the current camera instead of auto-fitting the graph.

## Expanded view

Expanded view shows children beneath visible first-level nodes.

- expanded child nodes are approximately half normal node size
- text is smaller and visually subdued
- up to **3 columns × 2 visible rows** are shown below each first-level node
- additional children scroll inside that node's local expanded area
- nodes with no expanded children reserve no extra space
- siblings and their expanded descendants remain visually smaller than normal nodes

## Expanding the central note into sections

For a Markdown central node, right-click (or long-press on touch) and choose **Expand note to sections**. K-Plex parses the current document on demand; headings become transient outline nodes and are **not** added to the persistent vault index.

- Section nodes use compact theme-aware outline cards and a separate **solid orthogonal folder-tree connector**, so Markdown structure remains visually distinct from semantic K-Plex relationships.
- The outline spine leaves a small square structural port near the lower-left of the parent and enters each child at its **left-center edge**. The resulting vertical-spine + horizontal-branch “L” geometry never routes through the normal top/bottom relationship gates.
- Nested headings form a foldable tree. A small square fold handle shows whether a section with descendants is expanded or folded. Section spacing uses a deliberately steeper density curve than the ordinary Plex: density 1 is already compact, while density 4 reduces vertical gaps and tree-branch indentation to a very tight outline.
- Folding a section hides its descendant headings and projects the hidden descendants' semantic relationships onto the nearest visible folded ancestor. Explainability still identifies the exact hidden section that originally declared each projected relationship.
- Section context menus provide one-level and recursive fold/unfold actions; the central node also offers **Fold all sections** / **Unfold all sections** while expanded.
- YAML/frontmatter relationships and links before the first heading stay attached to the central note.
- Body relationships below a heading attach to that section's gates.
- Section relationship connectors retain the same explainability/provenance model as normal graph links.
- Double-clicking a section on desktop opens the source note focused on that heading using Obsidian's subpath state; a stationary touch tap performs the equivalent action on mobile.
- Collapsing the note discards the transient section scene and restores the unchanged note-level index.

## Gates and connectors

Every visible node has four directional gates.

- **Top gate** — parent
- **Bottom gate** — child
- **Left gate** — friend
- **Right gate** — challenger

A hollow gate means there is no relationship through that gate. A filled gate means relationships exist, even when some related nodes are hidden by the current visibility settings. If gate counts are enabled, the number beside a gate reflects the currently visible relationships.

Connectors originate from the relevant gates rather than from node centers. They can be displayed as **Straight** or **Curved**, and optional arrowheads can show direction.

Generic labels such as Parent, Child, Friend, Challenger and structural file/tag-tree labels are suppressed. Custom ontology labels can be shown on connectors when relationship labels are enabled.

### Explain relationships

Right-click a visible connector and choose **Explain relationship** to see why K-Plex placed that relationship where it did. The explanation shows the resolved role plus the underlying evidence, such as frontmatter ontology, body ontology, ordinary Obsidian links, folder/tag structure, URLs or Date-property links.

When frontmatter deliberately overrides conflicting body ontology, the body evidence is retained and shown as **OVERRIDDEN** rather than discarded. This makes the visible result deterministic while keeping the source conflict inspectable.

### Node context menu

Right-click a node (or long-press on touch) for actions appropriate to that node. Markdown notes can **Link to note…** and **Set note type…**; persistent nodes can be pinned/unpinned; and the Markdown center node can expand/collapse its heading sections. Structural or non-Markdown nodes do not offer write actions that would be invalid for them.

## Hover and preview

Relationship highlighting is intentionally delayed so the Plex does not flash while you move the pointer across a dense graph.

To open Obsidian's hover preview immediately, hold:

- **Cmd** on macOS, or
- **Ctrl** on Windows/Linux

while hovering a node.

Normal hover does not open page preview.

## Creating relationships

Drag from a gate to create a relationship.

If you release on empty Plex space, K-Plex opens a relationship dialog where you can choose a target Markdown note and ontology field. If you release on a specific node/gate, that target and gate help determine the proposed relationship.

The relationship dialog also offers **Create new note…**. K-Plex can create a Markdown note and immediately connect it. If the Excalidraw plugin is installed, **Excalidraw drawing** is also available; K-Plex delegates drawing creation to Excalidraw so its normal configured-template prompt is preserved.

The default direction follows the gate you started from:

- top → Parent
- bottom → Child
- left → Friend
- right → Challenger

K-Plex writes editable relationships to YAML/frontmatter. It does not try to rewrite arbitrary prose or inline relationship text in a note body.

If the origin is not a Markdown note, the target must be a Markdown note; K-Plex stores the inverse relationship on the Markdown side.

Folder and tag relationships are structural, so drag-link creation involving folder/tag endpoints is disabled.

## Reclassifying an existing relationship

A node directly connected to the center can be dragged to another side of the Plex. Moving it between the top, bottom, left and right regions proposes changing the relationship class and opens the relationship dialog before committing the change. K-Plex applies the accepted move optimistically so the node changes position immediately. The YAML write is then patched directly into the live semantic pair—there is no full-vault rebuild for a one-relationship move—and a short **Updating relationship…** guard prevents accidental follow-up clicks while the write completes. If the write fails, the optimistic state is discarded.

When both endpoints are Markdown notes, K-Plex ranks where the relationship should be stored by the existing provenance: an existing frontmatter declaration is preferred, then body ontology, then the note that supplied the ordinary link. The relationship dialog exposes **Write property to note** only when there is a meaningful choice, so the recommended source can still be overridden without forcing every move through an extra decision.

When the same note contains conflicting ontology for the same target, a YAML/frontmatter ontology written by K-Plex takes precedence over the body ontology. The body declaration is not deleted from the index; it remains available to **Explain relationship** as overridden evidence. This keeps future layout deterministic without silently losing provenance or rewriting arbitrary prose.

## Ontology

K-Plex understands configurable field names for:

- Parent
- Child
- Friend / Jump
- Challenger
- Previous
- Next
- Hidden

The ontology workflow also includes:

- configurable full-line and mid-sentence ontology suggester triggers
- optional bold field insertion
- editor context-menu **Add/change … in K-Plex ontology**
- commands to assign the field at the cursor directly to Parent, Child, Friend, Challenger, Previous, Next, Hidden or Excluded
- an Add-to-Ontology modal
- discovery of unassigned YAML/Dataview-style field names in K-Plex settings

For example, a vault can use frontmatter such as:

```yaml
Parent: "[[Project]]"
Children:
  - "[[Task A]]"
  - "[[Task B]]"
Friend: "[[Related idea]]"
Challenger: "[[Counterargument]]"
```

The exact field names are configurable in **Settings → K-Plex → Ontology**. K-Plex also understands legacy Dataview-style body fields without requiring the Dataview plugin, including full-line fields, parenthesized inline fields, square-bracket inline fields, Markdown emphasis around field names, list items and multiple inline fields on one physical line. Examples include `Field:: [[Link]]`, `(Friend:: [[A]], [[B]])`, `[Challenger:: [[C]]]` and `**Parent**:: [[D]]`. YAML/frontmatter, fenced code, inline code and HTML comments are excluded from body-field parsing.

## Supported node types

Depending on visibility settings, K-Plex can include:

- Markdown notes
- attachments
- folders
- tags
- web URLs
- unresolved/virtual links

Normal Obsidian links can also be interpreted as inferred relationships according to your K-Plex settings.

## Note type styling

A Markdown document property can define the node's primary visual type. By default the property is **Note type**.

In **Settings → K-Plex → Appearance** you can create styles for individual Note type values, including:

- Lucide icon
- background color
- text color
- border color
- font size

Legacy tag-specific styling remains part of the ExcaliBrain compatibility model.

## Index lifecycle and startup cache

K-Plex performs one initial index per Obsidian session. If a persisted semantic snapshot is still current, startup restores that snapshot instead of rereading every Markdown body. After the initial pass, K-Plex avoids continuously rebuilding a graph that nobody is viewing: vault/metadata changes are recorded as a dirty backlog while no K-Plex tab or sidepanel is open, and that backlog is reconciled when K-Plex is opened again. Later in-flight rebuilds are cancelled when the final K-Plex view closes; on iOS even a first cold build is cancelled when the user closes K-Plex, because keeping a large hidden WebView build alive is a poor memory tradeoff. Completed per-file cache checkpoints remain reusable on the next attempt.

The durable index is stored in **IndexedDB**, not browser local storage. K-Plex persists three complementary cache layers: parsed body metadata keyed by file mtime **and parser version**, provenance-bearing graph evidence, and the already-resolved neighbour maps used by the renderer. The last layer means a warm 20k-note startup does not need to replay the complete relationship truth table before the graph can appear. Snapshot generations are written transactionally and become active only after all page/evidence records have completed. Relationship evidence is declaration-compact in memory and also path-indexed, so changing one note can remove/re-resolve only evidence touching that note instead of scanning the whole evidence store. Legacy local-storage and file-snapshot index payloads are not used as active restore backends and are removed opportunistically.

When the physical vault structure is unchanged but a few Markdown files changed while K-Plex was closed, startup restores the semantic snapshot immediately and patches only those changed files. If files were created/deleted/renamed, or cached real files cannot yet bind to Obsidian `TFile` objects, K-Plex rejects the cached topology instead of briefly rendering a misleading half-stale/ghost graph while a second graph is built in memory. On iOS the hot in-memory parser cache is kept deliberately tiny. A large first-ever full rebuild is deferred until K-Plex is actually opened; before allocating the complete semantic graph, K-Plex prewarms parsed Markdown bodies into small transactional IndexedDB checkpoints. Native file reads are bounded and batched, the prewarm is cancellable when the last K-Plex view closes, and an interrupted run resumes from committed body records. Only after that low-memory prewarm does K-Plex allocate and atomically publish the complete graph. IndexedDB schema upgrades must bump the database version whenever a store/index changes so existing vault databases actually run `onupgradeneeded`.

On mobile, **Export mobile diagnostics** writes the recent K-Plex lifecycle/index/gesture trace to `K-Plex consolelog.md` in the vault root. The trace survives a WebView restart through plugin local storage and also records uncaught window errors/rejections. In addition, the developer console now receives content-free `[K-Plex index]` timing records for snapshot restore, vault-signature checks, page/evidence hydration, each cold-build phase, Markdown read/parse/cache time, host-yield counts, and snapshot persistence. Neither diagnostic path records note contents or paths.


## Settings

K-Plex settings are organized into four main pages:

- **Graph** — navigation, layout, visibility and connector behavior
- **Ontology** — relationship field names and ontology suggester triggers
- **Compatibility** — legacy ExcaliBrain import
- **Appearance** — Plex, gate and Note type styling

The Graph page also controls zone heights, parent/child columns, maximum nodes per zone, density, connector style, arrowheads and visibility of supported node types.

## ExcaliBrain migration

K-Plex uses the plugin ID **`k-plex`**, so it can coexist with classic ExcaliBrain during migration.

On the first K-Plex run in a vault, if legacy ExcaliBrain is installed and running, K-Plex automatically imports compatible settings. Existing K-Plex data takes precedence once K-Plex has been initialized.

A manual **Import ExcaliBrain settings** action is also available on the Compatibility settings page for importing a backed-up ExcaliBrain `data.json`.

Compatibility includes the classic hierarchy/ontology model, relationship reconciliation, visibility settings and a substantial portion of node/link styling. Some Excalidraw-specific rendering details are translated or approximated in the React renderer rather than reproduced exactly.

## Large vaults

K-Plex is designed for large Obsidian vaults. Parsed Markdown metadata is persisted per file/mtime/parser-version in IndexedDB on every platform so an interrupted cold build does not have to restart parsing at file zero. Desktop/Android can keep a larger hot parser cache and use a worker; iOS uses a tiny bounded in-memory hot cache and one-shot vault reads. Large collectors/resolvers use **time-budgeted cooperative slices** rather than yielding after an arbitrary tiny number of records; this avoids thousands of `setTimeout(0)` calls on iOS while still returning control to WebKit frequently enough to remain responsive. Deferred full-snapshot persistence is cancelled when the final K-Plex view closes, so hidden cache work cannot keep draining Obsidian after K-Plex has been dismissed. Normal navigation does not rescan the vault.

If graph data appears stale, use the toolbar refresh button or the **Rebuild K-Plex index** command.

## Project links

[Buy me a coffee](https://ko-fi.com/zsolt) · [Read Sketch Your Mind](https://community.sketch-your-mind.com/sym) · [Join SYM Community](https://community.sketch-your-mind.com)

For source development and contribution guidelines, see `CONTRIBUTING.md`.
