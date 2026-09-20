# K-Plex

**K-Plex (Knowledge Plex)** is a spatial knowledge navigator for Obsidian. It gives you a focused view around one active node and places related nodes in predictable directions, so the position of a node carries meaning.

K-Plex is the successor architecture to ExcaliBrain. It preserves the relationship model and much of the ontology/settings compatibility of classic ExcaliBrain, but it has its own React-based interface and does **not** require Excalidraw or Dataview at runtime.

K-Plex is inspired by spatial knowledge interfaces such as TheBrain, but it is an independent implementation.

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
- Desktop or mobile for the main K-Plex view
- Desktop for Obsidian pop-out windows

Excalidraw and Dataview are not required.

## Opening K-Plex

You can open K-Plex from the ribbon or from the Command Palette with **Open K-Plex**.

Other useful commands include:

- **Focus active note in K-Plex**
- **Rebuild K-Plex index**
- **Open K-Plex settings**
- **Open K-Plex in pop-out window**

When K-Plex opens, it uses the active file when possible. Otherwise it restores the last displayed node, falling back to the vault root when needed.

## Navigating

- **Single-click** a node to make it the center of the Plex.
- **Double-click** a file-backed node to open it in Obsidian.
- Double-clicking a URL opens it in the browser.
- Double-clicking an unresolved/virtual node creates the corresponding Markdown note.
- Folder and tag nodes can become the center of the Plex.
- Drag empty Plex space to pan. Left, middle and right mouse dragging are supported for panning empty space.
- Use the mouse wheel or the zoom controls to zoom.
- Use **Fit graph** to bring the visible Plex back into view.

K-Plex keeps a persistent **Past nodes** history at the bottom of the view. The back/forward buttons step through that navigation history.

## Search

The search box finds nodes by title, alias and path. Matching is fuzzy, while stronger exact, prefix and substring matches are ranked ahead of looser matches.

Keyboard controls:

- **Up / Down** — move through results
- **Enter** — activate the selected result
- **Escape** — close the result list

Clicking elsewhere in the Plex also closes the search results.

## Document navigation and linking

K-Plex can work either as an independent graph navigator or together with an Obsidian document leaf.

The toolbar lets you:

- synchronize K-Plex navigation with document navigation
- link K-Plex to a specific/recent document leaf
- keep graph exploration decoupled from the document you are currently reading

When synchronization is enabled, selecting a file-backed node can open that node in the active or linked document leaf, and K-Plex can follow navigation in that leaf.

## Pins

The current node can be pinned from the toolbar. Pinned nodes are persistent quick-access bookmarks shown directly below the main toolbar.

Pins are independent of Past nodes/history, so they are useful for a small set of stable reference points that you want to keep available while exploring.

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

The toolbar also includes refresh, navigation synchronization, pinning and settings controls.

## Layout, scrolling and filtering

K-Plex keeps the graph readable by giving the major regions independent size limits.

Default layout values are:

| Setting | Default |
| --- | ---: |
| Parent columns | 2 |
| Child columns | 5 |
| Parent maximum height | 300 px |
| Friend / challenger maximum height | 350 px |
| Sibling maximum height | 250 px |
| Child maximum height | 400 px |
| Maximum nodes per zone | 100 |
| Density | 2 |

The maximum number of nodes per zone can be increased to **300**.

When a first-level zone becomes taller than its configured maximum, it gets its own scrollbar and a funnel control for filtering by name/path. Filtering repacks the matching nodes instead of leaving holes where hidden nodes used to be.

The Friend and Challenger regions are symmetrical. They may extend upward into otherwise unused parent-area space, but their lower edge stays above the child region with a small gap. Sparse Friend/Challenger lists remain bottom-aligned and grow upward as more nodes are added.

Siblings occupy a separate peripheral region and are rendered slightly smaller than normal first-level nodes.

The **Density** control changes spacing and label truncation. The **Columns** control changes the parent/child column combination without changing relationship semantics.

## Expanded view

Expanded view shows children beneath visible first-level nodes.

- expanded child nodes are approximately half normal node size
- text is smaller and visually subdued
- up to **3 columns × 2 visible rows** are shown below each first-level node
- additional children scroll inside that node's local expanded area
- nodes with no expanded children reserve no extra space
- siblings and their expanded descendants remain visually smaller than normal nodes

## Gates and connectors

Every visible node has four directional gates.

- **Top gate** — parent
- **Bottom gate** — child
- **Left gate** — friend
- **Right gate** — challenger

A hollow gate means there is no relationship through that gate. A filled gate means relationships exist, even when some related nodes are hidden by the current visibility settings. If gate counts are enabled, the number beside a gate reflects the currently visible relationships.

Connectors originate from the relevant gates rather than from node centers. They can be displayed as **Straight** or **Curved**, and optional arrowheads can show direction.

Generic labels such as Parent, Child, Friend, Challenger and structural file/tag-tree labels are suppressed. Custom ontology labels can be shown on connectors when relationship labels are enabled.

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

The default direction follows the gate you started from:

- top → Parent
- bottom → Child
- left → Friend
- right → Challenger

K-Plex writes editable relationships to YAML/frontmatter. It does not try to rewrite arbitrary prose or inline relationship text in a note body.

If the origin is not a Markdown note, the target must be a Markdown note; K-Plex stores the inverse relationship on the Markdown side.

Folder and tag relationships are structural, so drag-link creation involving folder/tag endpoints is disabled.

## Reclassifying an existing relationship

A node directly connected to the center can be dragged to another side of the Plex. Moving it between the top, bottom, left and right regions proposes changing the relationship class and opens the relationship dialog before committing the change.

The resulting YAML relationship takes precedence over an equivalent relationship discovered in body text. This keeps future layout deterministic without rewriting the body of the note.

## Ontology

K-Plex understands configurable field names for:

- Parent
- Child
- Friend / Jump
- Challenger
- Previous
- Next
- Hidden

For example, a vault can use frontmatter such as:

```yaml
Parent: "[[Project]]"
Children:
  - "[[Task A]]"
  - "[[Task B]]"
Friend: "[[Related idea]]"
Challenger: "[[Counterargument]]"
```

The exact field names are configurable in **Settings → K-Plex → Ontology**. K-Plex also understands common Dataview-style inline fields such as `Field:: [[Link]]` without requiring the Dataview plugin.

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

K-Plex is designed for large Obsidian vaults. Indexing, search and rendering use caching and incremental behavior so normal navigation does not require rebuilding or rescanning the entire vault.

If graph data appears stale, use the toolbar refresh button or the **Rebuild K-Plex index** command.

## Project links

[Buy me a coffee](https://ko-fi.com/zsolt) · [Read Sketch Your Mind](https://community.sketch-your-mind.com/book) · [Join SYM Community](https://community.sketch-your-mind.com)

For source development and contribution guidelines, see `CONTRIBUTING.md`.
