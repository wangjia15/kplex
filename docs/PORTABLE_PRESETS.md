# Portable Facets and lens packages

Use **Settings → K-Plex → Canvas behavior → Views → Facets → Manage presets** to import a preset or export one row. In **Views and lenses → Graph lenses**, use **Import lens…**, the export icon on a lens, or **Copy AI authoring prompt**. These controls share one native transfer surface and one canonical validator: [`validatePortablePackage`](../src/core/plex/sharing/validation.ts). Future CLI callers must use this same function; no CLI import command ships here.

Export displays the exact JSON that Copy or Download will produce. A Facets export includes only its selected definition, effective literal labels/Help, referenced palette pairs and lens dependencies you explicitly check. A lens export excludes its enabled state. The privacy toggle is off initially: flagged path/name/source selectors or path-like text require deliberate review before export. Refusal never silently redacts a rule or changes its meaning. This is a bounded lexical privacy check, not a promise that arbitrary authored prose contains no private facts; review the visible package before sharing it.

Import accepts pasted JSON or a file you choose. The placeholder explains both paths; select Info for a native read-only guide to the workflow and versioned format. The adaptive dialog keeps Preview, Import and Cancel in one compact action row. Preview shows the full validated payload, target ID, collision consent, optional lens dependencies and palette choices. Choose a unique target ID for a new entry, or enter an installed ID and explicitly enable **Replace this installed entry**. Installed IDs are listed below the target. Dependencies arrive unchecked and disabled; a colliding dependency lens must be imported separately with its own explicit target. Palette pairs absent locally are added; existing pairs keep their installed values unless you select the package values. An unresolved reference blocks import.

Preview and Help preview do not write settings. Changing source/target choices invalidates the old plan. Save repeats validation against the latest settings queue; stale target entries or failed storage publish none of the preset, palette or lens changes. Unrelated installed presets and lenses survive. Import never selects a view/preset, activates a lens, edits note properties or relationships, or changes ontology/index policy. Authored Help source is saved intact. AI context is discarded from live settings.

## Schema, version 1

This is the documented schema for `format: "kplex-preset"`, `version: 1`. Unknown fields, prototype keys at any depth, executable payload fields and unsupported versions are refused. [`contracts.ts`](../src/core/plex/sharing/contracts.ts) supplies the exact TypeScript union; the canonical validator owns runtime admission. [Executable examples](../tests/fixtures/portable-presets/README.md) are validated and round-tripped by the repository checks.

| Envelope field | Required | Value |
| --- | --- | --- |
| `format` | yes | `"kplex-preset"` |
| `version` | yes | integer `1` |
| `kind` | yes | `"facets"` or `"lens"` |
| `id` | yes | stable ID, alphanumeric first; remaining letters/digits/`.`/`_`/`-`; at most 48 characters; no prototype names |
| `preset` | Facets only | the preset object below |
| `lens` | lens only | the lens object below |
| `lenses` | optional, Facets only | at most 16 unique explicitly selected lens definitions |
| `palette` | optional | at most 32 referenced `{id,name,light,dark}` pairs; literals only for light/dark |
| `aiContext` | yes | inert documentation string, at most 16,000 characters; may be blank; never evaluated or saved as live settings |

Total package limits: 65,536 UTF-16 characters, 8,192 JSON nodes, depth 12, finite numbers, JSON-only objects. Raw chosen files are bounded before reading and the canonical character limit is then enforced. The installed view library still has its original 16,384 encoded-character, 4,096-node, depth-8 limit, at most 16 known presets and 3–7 categories per preset. A valid package can therefore be previewed but refused if it would exceed the installed library's remaining capacity; that failure is atomic.

### Preset object

Required: `version:1`, `name` (1–100 characters), `source` (`property`, `type`, `tag`, `rules`), `field` (1–128), `categories`, `order`, `start`, `spacing` (24–200), `regionWidth` (200–640), `regionHeight` (160–600), `guides`, `tints`, `conflictingColor`, `unassignedColor`, and `helpMarkdown` (blank or safe Markdown, at most 4,096 characters).

`categories` maps stable IDs to exactly the 3–7 IDs in `order`, with no duplicates; `start` names an ordered category. Each category contains `label` (at most 80 characters), `color`, `values` (at most 512 nonblank aliases, each at most 1,024 characters); optional `assignment` (nonblank canonical value, at most 1,024) and `rule` (at most 2,048). Assignment remains separate from recognition and still requires the existing safe native property preview. Rules/type/tag presets do not acquire property-write authority. Translation keys are resolved to literal labels on export and are not portable fields.

Optional fields:

| Field | Value |
| --- | --- |
| `layout` | `circular`, `concentric`, `vertical`, `horizontal`, `quadrants` |
| `focusAnchor` | `top`, `bottom`, `left`, `right`; linear layouts only |
| `reverse` | boolean; changes geometry, not logical category sequence |
| `diagnostics` | only `combined`, `side`, `orientation`, `showEmpty`, `order` |
| `diagnostics.combined` | boolean, omitted inherits true |
| `diagnostics.side` | `top`, `right`, `bottom`, `left` |
| `diagnostics.orientation` | `horizontal`, `vertical` for separate areas |
| `diagnostics.order` | all four statuses exactly once: `unassigned`, `conflicting`, `checking`, `unresolved` |
| `areaSizes` | only `categories` and `diagnostics` maps; each entry only `width` (200–2,400), `height` (160–1,200) |
| `areaSizes.categories` | keys must name this preset's categories |
| `areaSizes.diagnostics` | keys `combined` or one of the four diagnostic statuses |
| `flow` | only `direction`, `style`, `caption`, `captionPosition` |
| `flow.direction` | `forward`, `backward`, `both` |
| `flow.style` | `arrow`, `line`, `none` |
| `flow.caption` | literal string, at most 80 characters; blank explicitly suppresses an inherited caption |
| `flow.captionPosition` | `start`, `middle`, `end` |
| `flowOverrides` | at most 21 unique unordered category pairs; flow fields plus distinct ordered-category IDs `source`, `target` |
| `interpretation` | only `wuxing` |
| `relativeLabels`, `regulatingGuides` | booleans for the optional Wu Xing interpretation |
| `helpSourceLocale` | language marker such as `en`, `de`, `zh-TW`; 2–3 letters plus up to two bounded subtags |

`diagnostics.showEmpty`, `guides`, `tints` and the model flags are booleans. `helpMarkdown` is end-user content, distinct from `aiContext`; round-trips preserve literal source and the source locale. Safe Help supports headings/lists/code/HTTPS links or local headings, with no HTML, embeds/images, unsafe links or executable code. The existing native Markdown owner neutralizes fence languages before rendering. Width-driven automatic measured columns are intrinsic; there is no portable `columns`, per-device camera/size map, selection or editor-binding field.

Quadrants requires four categories; other counts visibly fall back to circular. Concentric area sizes mean band thickness. Decorative workflow guides are linear only; circular Wu Xing has separate generating/regulating guides. None grants graph relationship editing authority.

### Lens object

Required fields: `id`, `name` (0–100; blank keeps the shared untitled display fallback), `scope` (`node`, `edge`, `evidence`), `mode` (`include`, `exclude`, `style`), `expression` (1–2,048). Optional `style`. `enabled` is deliberately unsupported; every import starts disabled, including explicit replacement of an enabled lens.

For node scope, `style` contains only `node`, whose allowed keys are `backgroundColor`, `textColor`, `borderColor`, `fillStyle`, `strokeWidth`, `strokeStyle`. For edge/evidence scope, `style` contains only `edge`, whose allowed keys are `strokeColor`, `textColor`, `strokeWidth`, `strokeStyle`, `showLabel`. Width must be 0.5–8; fill is `solid`, `hachure` or `cross-hatch`; stroke is `solid`, `dashed` or `dotted`; showLabel is boolean. Invalid style values are refused, not sanitized or clamped during import.

Expressions use the existing [predicate parser](../src/core/plex/predicateParser.ts) and [shared lens validation](../src/core/plex/lensValidation.ts). They need a namespace selector; arbitrary JavaScript, functions or literal-only predicates are unsupported. Edge roles are `parent`, `child`, `left`, `right`, `previous`, `next`, `sibling`; kinds `defined`, `inferred`; directions `from`, `to`, `both`. See the [authoring guide](FACETS_AUTHORING.md) for concrete examples and availability semantics.

Arbitrary focused-note properties such as `this.phase` are available in Facets' opt-in availability-aware rules. Ordinary lenses retain the existing fixed `this` attributes (for example `this.name`); do not assume that a custom focused-note property works in a standalone lens. `note` still addresses candidate properties.

### Colors and palette

A color is a valid hex/RGB(A)/`transparent` literal, `{ "kind":"theme", "variable":"--color-blue" }`, or `{ "kind":"palette", "id":"accent" }`. No arbitrary CSS expression or extra reference keys. Theme names use the existing bounded custom-property grammar. Palette IDs use the shared alphanumeric-first grammar, at most 64 characters; pair names are nonblank and at most 100 characters. Pairs have exactly `id`, `name`, `light`, `dark`; only referenced pairs may be supplied, with no duplicate IDs. Referenced IDs may instead resolve to explicitly previewed installed palette definitions.

## Validation and delivery

Focused checks cover both built-ins and all six archived portable presets, Help/locale/presentation round-trips, future/unknown/prototype input, grammar/style/color failures, privacy refusal and explicit consent, palette collisions, disabled dependencies, two independent imports, stale previews, failed storage and native controls. Final Windows/CI evidence is tracked in the #222 validation record. Do not interpret a portable/browser test as OS clipboard, Mac, physical mobile or minimum-host acceptance.
