# Legacy compatibility notes

This rebuild was derived from the compatibility behavior documented in the supplied classic ExcaliBrain repository and `EXCALIBRAIN_DETAILED_SPECIFICATION.md`.

## Preserved graph inputs

- Obsidian resolved links
- unresolved links as virtual/ghost thoughts
- folder tree (`file-tree`)
- tag tree (`tag-tree`)
- YAML/frontmatter ontology fields
- Dataview-style inline fields (`Field:: value`)
- HTTP/HTTPS links and origin nodes

## Preserved role reconciliation

The role-classification logic in `GraphIndex.classify()` mirrors the classic `Page.isChild`, `Page.isParent`, `Page.isLeftFriend`, `Page.isRightFriend`, `Page.isPreviousFriend`, and `Page.isNextFriend` rules. In particular, mutual inferred links collapse to lateral friend relationships and conflicting/multiple explicit role definitions reconcile laterally rather than producing duplicated role nodes.

## Preserved display filters

Legacy visibility settings are applied before neighborhood construction. `maxItemCount` is applied per visible zone and siblings are only derived through visible parents.

## Known architectural differences

- Dataview is no longer required. The built-in parser covers common frontmatter values, arrays, wiki links, Markdown links, URLs, and `Field::` inline fields.
- Excalidraw is no longer the render surface. Styles are translated into CSS/SVG equivalents.
- Excalidraw-specific properties such as hachure rendering and roughness are retained in persisted settings but only approximated in the React renderer.
- Embedded central-note frames are represented by the dedicated content pane instead of Excalidraw embeddables.
