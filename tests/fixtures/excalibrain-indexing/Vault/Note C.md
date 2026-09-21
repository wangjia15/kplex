---
tags:
  - project
  - fixture
Note type: "project"
Friend: "[D via frontmatter Markdown-link alias](Note%20D.md)"
milestone-date: 2026-10-01
---
# Note C

The `Friend` property above is intentionally a legacy-compatibility case.
Classic ExcaliBrain's Dataview value reader parses Markdown links from string-valued ontology fields,
but current Obsidian Properties/Bases does not treat Markdown formatting in properties as a native Link value.

The `Note type` property deliberately omits the leading `#`. K-Plex should normalize this to the same logical note type as `#project`; the separate `tags:` entry makes `project` an actual Obsidian tag.

`milestone-date: 2026-10-01` deliberately resolves to a daily-note path in a month/folder that does not exist in the fixture. It is the second placeholder-date fixture.
