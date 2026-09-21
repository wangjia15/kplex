---
aliases:
  - Alpha Hub
tags:
  - fixture
Parent: "[[Note B|B via YAML wikilink alias]]"
---
This content deliberately appears **before the first heading**. In the proposed expanded-central-note view, relationships found here remain attached to the central `Note A` node.

Note Type:: #project

#project #body-tag #taxonomy/body/leaf

Child:: [C via Markdown-link alias](Note%20C.md)

This is an ordinary, non-ontology wikilink to [[Note H|H mutual-link test]]. Because Note H links back to Note A, this remains an inferred friend on the central node even in expanded mode.

source:: [Source URL full-line ontology alias](https://source.com/ontology-full-line)

## Friend and challenger cases

This sentence contains (Friend:: [[Note D|D via parenthesized inline field]], [[Note X|X second friend in the same inline field]]) but [[Note Y|Y ordinary inferred link outside the field]] is only an inferred ordinary link.

This sentence contains [Challenger:: [[Note E|E via square-bracket inline field]]] in the middle of ordinary prose.

## Inference and conflict cases

This is an ordinary, non-ontology Markdown link to [F inferred child](Note%20F.md).

Parent:: [[Note G|G declared as parent]]

Child:: [G declared as child](Note%20G.md)

## External URL cases

This sentence contains (source:: [Source URL inline ontology alias](https://source.com/ontology-inline)) in ordinary prose.

This is an ordinary, non-ontology external URL with an alias: [Source URL inferred alias](https://source.com/inferred).

This image-style external embed is also intentionally outside ontology and should remain inferred:

![](https://youtu.be/excalibrain-fixture-video)
