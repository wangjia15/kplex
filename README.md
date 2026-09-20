# K-Plex

K-Plex (Knowledge Plex) is a ground-up React successor to ExcaliBrain for Obsidian. The plugin keeps the original ExcaliBrain graph semantics and persisted settings keys while replacing the Excalidraw/Dataview rendering stack with a dedicated, TheBrain-inspired visual application.

## Requirements

- Node.js **22.22.2** (project baseline)
- npm
- Obsidian 1.6+

## Build

```bash
npm i
npm run build
```

The installable plugin artifacts are written to `./build/`:

- `build/main.js`
- `build/manifest.json`
- `build/styles.css`

Copy those three files to `.obsidian/plugins/k-plex/` in a test vault and enable **K-Plex** in Obsidian. K-Plex uses its own plugin id so it can run beside legacy ExcaliBrain for one-time settings migration.

## Development

```bash
npm run dev
```

The development bundle is also written to `./build/` and rebuilt on source changes.

## Architecture

- `src/main.ts` — Obsidian plugin lifecycle, commands, view registration and index refresh scheduling.
- `src/index/GraphIndex.ts` — vault graph, relationship reconciliation, folders/tags/ghosts/URLs and legacy ontology semantics.
- `src/index/fieldParser.ts` — YAML/frontmatter and Dataview-style inline field compatibility without a Dataview runtime dependency.
- `src/index/style.ts` — legacy node/link style inheritance.
- `src/ui/` — React application, Plex renderer, search, navigation history and content pane.
- `src/settings.ts` — settings schema, migration and Obsidian settings tab.

## Legacy compatibility

The plugin intentionally retains the original `data.json` keys, including:

- hierarchy ontology (`parents`, `children`, `leftFriends`, `rightFriends`, `previous`, `next`, `hidden`, exclusions)
- inferred-link behavior (`inferAllLinksAsFriends`, `inverseInfer`, `showInferredNodes`)
- node visibility (files, attachments, folders, tags, URLs and unresolved links)
- node styles, tag-specific styles and link styles
- alias rendering, custom node-title script, max item count and sibling rendering
- navigation history and legacy UI options

Old `hierarchy.friends` data is migrated to `hierarchy.leftFriends`, matching the prior plugin's migration behavior.

The rebuilt plugin no longer requires Dataview or Excalidraw. It reads Obsidian metadata directly and parses common `Field:: [[Link]]` Dataview-style inline fields itself.

## Interaction model

- Single-click a thought to activate it in the Plex.
- Double-click a thought to open its Obsidian note/attachment or URL.
- Use the search box for instant thought activation.
- Pan by dragging empty graph space and zoom with the mouse wheel.
- Parents are north, children south, jumps/friends west, next/right-friends east, and optional siblings appear on the eastern periphery.
- Folder and tag thoughts can become the central Plex thought; structural folder/tag relationships are read-only in drag-linking.
- K-Plex can link to an Obsidian document leaf so graph navigation and note navigation stay synchronized.
- Past thoughts remain available in the footer for fast navigation.

## Status

This repository is a fresh implementation intended as the new architectural baseline. The compatibility layer is deliberately concentrated in `settings.ts` and `GraphIndex.ts` so future UI work can proceed without changing the graph contract.
