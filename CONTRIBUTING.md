# Contributing to ExcaliBrain

Thanks for helping improve ExcaliBrain.

## Setup

Use Node.js **22.22.2** where possible.

```bash
npm i
npm run build
```

Build output must appear in `dist/` and contain `main.js`, `manifest.json`, and `styles.css`.

## Design principles

ExcaliBrain is not a generic graph view. Its defining behavior is deterministic spatial semantics:

- parents north
- children south
- jumps/left friends west
- next/right friends east
- siblings on the periphery

Preserve these semantics and the legacy settings contract. New UI features should consume the normalized graph API rather than infer their own relationship meanings.

## Compatibility

Before changing settings or relationship logic:

1. Review `src/settings.ts` and `src/index/GraphIndex.ts`.
2. Assume users may already have an old ExcaliBrain `data.json`.
3. Prefer additive settings with defaults.
4. Add migration logic for renamed/reshaped data.
5. Do not silently reinterpret old ontology fields.

## Code organization

- Keep React components focused on rendering and interaction.
- Put vault/index logic under `src/index/`.
- Keep persistence and migration in `src/settings.ts`.
- Keep Obsidian workspace actions in `src/main.ts`.

## Pull requests

Please include:

- what changed
- whether legacy compatibility is affected
- manual test steps in Obsidian
- confirmation that `npm run build` succeeds
