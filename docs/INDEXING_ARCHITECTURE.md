# K-Plex indexing architecture

K-Plex deliberately separates **what the vault says** from **how K-Plex resolves that evidence into a visible graph**.

## Pipeline

```text
Vault tree / tag tree / Obsidian links / frontmatter / body fields / Date properties / URLs
                                  │
                                  ▼
                          RelationEvidence[]
                     (with source provenance)
                                  │
                                  ▼
                         RelationResolver
                 precedence + relationship truth table
                                  │
                                  ▼
                        resolved GraphState
                                  │
                       atomic snapshot swap
                                  │
                                  ▼
                         GraphIndex queries
                   neighbourhood / search / explain
```

The main boundaries are:

- `fieldParser.ts` — one canonical parser for legacy Dataview-style body fields and body URLs.
- `MetadataParser.ts` — parsing abstraction used by the builder; no duplicated parser grammar.
- `RelationEvidence.ts` — immutable relationship evidence and source provenance.
- `RelationResolver.ts` — precedence and ExcaliBrain-compatible relationship classification.
- `GraphState.ts` — one graph snapshot.
- `GraphBuilder.ts` — collects all vault evidence and builds a complete private snapshot.
- `GraphIndex.ts` — publishes snapshots atomically and serves neighbourhood/search/explanation queries.

## Frontmatter precedence

K-Plex intentionally differs from classic ExcaliBrain here.

If the **same declaring note** has a frontmatter ontology relationship and a conflicting body ontology relationship to the **same target**, frontmatter wins.

Example:

```yaml
---
Parent: "[[B]]"
---
```

```md
Child:: [[B]]
```

The visible result is `B = Parent — DEFINED`.

The important architectural rule is that the body `Child` evidence is **not deleted during collection**. Both declarations enter `RelationEvidenceStore`. `RelationResolver.applyOntologyPrecedence()` marks the body declaration overridden when resolving the pair. Explainability can therefore show:

```text
USED        Frontmatter ontology · Parent — Defined
OVERRIDDEN  Body ontology · Child — Defined
```

If frontmatter and body declare the **same** role, both may remain active because there is no conflict. Conflicts wholly within one source tier continue through the normal ExcaliBrain-compatible classifier.

## Evidence provenance

Evidence records retain enough context to answer “why is this relationship here?” and to support future source-aware editing:

- source and target paths;
- semantic role;
- defined/inferred type;
- link direction;
- source kind (`frontmatter-ontology`, `inline-ontology`, `obsidian-link`, `date-property`, etc.);
- ontology/property field name;
- raw field value where available;
- body line number and source-range offsets where available;
- original declaring note, target and role before the inverse view is generated.

Right-clicking a visible graph connector exposes this information through **Explain relationship**.

## Body fields

The parser supports the legacy Dataview forms exercised by `tests/fixtures/excalibrain-indexing`:

```md
Parent:: [[B]]
(Parent:: [[B]])
[Parent:: [[B]]]
**Parent**:: [[B]]
- Parent:: [[B]]
Text (Friend:: [[B]], [[C]]) and [[D]] remains an ordinary link.
```

Multiple inline fields on one physical line are parsed independently. YAML/frontmatter, fenced code and inline code are excluded from body-field parsing.

## Date properties

Obsidian properties configured as type **Date** are mapped through the enabled Daily Notes configuration using Obsidian's Moment formatter, so customized Daily Notes formats are honored rather than being limited to a small token subset. Existing daily notes resolve to physical Markdown files; missing dates become virtual targets. The Date-property name and raw value remain provenance on the inferred relationship.

This is different from interpreting every ISO-looking string as a date: K-Plex checks the Obsidian property type registry first.

## Snapshot publication

`GraphBuilder` constructs a graph privately. `GraphIndex` publishes only a fully collected and resolved state. A rebuild requested while another build is running invalidates the in-flight generation, so stale partial work cannot replace the live graph before the queued rebuild completes.

The persisted body parse cache is keyed by file path + mtime and is an optimization only. It does not contain resolved graph semantics.

## Compatibility fixture

Run:

```bash
npm test
```

The golden fixture is `tests/fixtures/excalibrain-indexing`.

The current automated baseline covers README assertions **1–33 plus P1–P2**, including parsing, explicit/inferred reconciliation, K-Plex frontmatter precedence, Previous/Next, Hidden, note type, folders, tags, URLs, Date → Daily Notes, placeholders, and explanation provenance.

Assertions **34–42** describe the planned central-note heading/section expansion and are intentionally pending until that feature is implemented.
