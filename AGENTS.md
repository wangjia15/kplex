# AGENTS.md

## Mission

Develop ExcaliBrain as a dedicated React application inside Obsidian while preserving the graph semantics and persisted settings contract of the classic ExcaliBrain plugin.

## Non-negotiable compatibility rules

1. Do not rename or remove legacy settings keys without an explicit migration.
2. Preserve relationship reconciliation behavior in `GraphIndex.classify()` unless a compatibility test proves a deliberate change.
3. Explicit ontology relationships take precedence over inferred parent/child relationships as in the classic implementation.
4. Preserve node visibility semantics for Markdown pages, attachments, folders, tags, URLs and virtual/ghost nodes.
5. Preserve classic style inheritance: folder/tag nodes use base → central/sibling → type style; regular nodes use base → inferred → URL → virtual → central → sibling → attachment → tag-specific style.
6. Keep the plugin ID `excalibrain` so existing Obsidian plugin data can be reused.
7. Build installable artifacts into `./dist/`.

## Architecture boundaries

- `src/index/` owns indexing, relationship semantics and compatibility.
- `src/ui/` owns React presentation and interaction only.
- `src/settings.ts` owns persistence compatibility and migrations.
- `src/main.ts` owns Obsidian lifecycle/integration.

Avoid moving Obsidian-specific APIs deep into presentational React components when a plugin/index method can provide the boundary instead.

## Toolchain

Baseline Node.js: **22.22.2**.

```bash
npm i
npm run build
```

A change is not complete if `npm run build` fails.

## UX direction

Use TheBrain as an interaction reference, not as source code or copied assets. ExcaliBrain should feel like a focused Plex: active thought centered, parents north, children south, lateral relationships west/east, instant activation search, persistent past-thought navigation and an adjacent content area.
