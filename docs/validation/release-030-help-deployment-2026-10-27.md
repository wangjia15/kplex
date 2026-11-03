# 0.3.0 preparation and Help deployment

Maintainer explicitly requested the next version0.3.0, latest main.js/styles.css deployed to the Help checkout, and replacement of its0.2.0release pin. This supersedes the prior preserve-Help-binaries boundary. No tag, GitHub release or PR merge is authorized.

Existing release:prepare owner updated manifest.json, manifest-beta.json, package.json, package-lock.json (root/version only), versions.json. Node22.22.2 actual installed-type/production build PASS; release metadata and built dist validation PASS. No runtime feature changes or full regression.

All3built artifacts copied byte-for-byte to kplex-help/.obsidian/plugins/k-plex:

- main.js SHA256:2f1b433be268edc7d657557ec6c30633bb460e617837ce252568184aa7603208
- styles.css SHA256:02cbb4724e9ba017333be0ed3fcfc44b0aa532e472353667296598cdaeb2a682
- manifest.json SHA256:49596950b87caaf2fddaf0f58e826287c67d0e0998d3b69905c2ec298fd8b350

CLI vault info verified exact C:/Users/viczi/GitHub/kplex-help before plugin:reload id=k-plex. CLI plugin inspection confirmed version0.3.0 and enabled=true. Eval is unavailable in that Help window, so no renderer/native functional acceptance is claimed. Prior native12remains runtime5cb0069/artifact1ba0edda, not this repackaged build.

Help release page renamed K-Plex0.3.0release notes, aliases preserve old descriptive name, hub/setup links updated, no draft/unreleased disclaimer. Existing pinnedNodes0.2.0entry replaced by the actual0.3.0note, other pins preserved. Help140-page YAML/link/image/semanticChild?12/encoding audit PASS22.22.2. Pre-existing groupRelations/lastActivePath settings, workspace changes and two shortcut.lnkfiles are preserved and excluded from commit. Only requested pin staged in data.json. Production vault untouched. Both PR222/Help4remain draft/open/unmerged.
