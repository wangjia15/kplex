import { getAllTags, TFile, TFolder, type App } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { ExcaliBrainSettings } from "../settings";
import {
  LinkDirection,
  RelationType,
  type GraphPage,
  type GateSide,
  type GateStats,
  type Neighbour,
  type Neighborhood,
  type Relation,
  type Role
} from "../types";
import {
  extractLinksFromValue,
  getNormalizedFieldValues,
  getNormalizedFrontmatterValues,
  getNormalizedInlineFieldValues,
  normalizeFieldName,
  parseFileMetadata,
  type ParsedFileMetadata
} from "./fieldParser";

const DEFAULT_RELATION = (): Omit<Relation, "target"> => ({
  direction: null,
  isHidden: false,
  isParent: false,
  isChild: false,
  isLeftFriend: false,
  isRightFriend: false,
  isNextFriend: false,
  isPreviousFriend: false
});

type FieldCacheEntry = { mtime: number; meta: ParsedFileMetadata; content: string };

type RelationVector = {
  pi: boolean; pd: boolean; ci: boolean; cd: boolean;
  lfd: boolean; rfd: boolean; pfd: boolean; nfd: boolean;
};

const concatDefinition = (newDef?: string, current?: string): string | undefined => {
  if (!newDef) return current;
  if (!current) return newDef;
  const values = new Set(current.split(",").map((x) => x.trim()).filter(Boolean));
  values.add(newDef);
  return [...values].join(", ");
};

const directionToSet = (current: LinkDirection | null, incoming: LinkDirection): LinkDirection => {
  if (!current) return incoming;
  if (current === LinkDirection.BOTH || current === incoming) return current;
  return LinkDirection.BOTH;
};

const relationTypeToSet = (current: RelationType | undefined, incoming: RelationType): RelationType => {
  if (current === RelationType.DEFINED || incoming === RelationType.DEFINED) return RelationType.DEFINED;
  return incoming;
};

const naturalCompare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export class GraphIndex {
  readonly pages = new Map<string, GraphPage>();
  readonly lowercasePathMap = new Map<string, string>();
  private listeners = new Set<() => void>();
  private fieldCache = new Map<string, FieldCacheEntry>();
  private generation = 0;
  private building = false;
  private rebuildQueued = false;

  constructor(private plugin: ExcaliBrainPlugin, private app: App = plugin.app) {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(): void { for (const listener of this.listeners) listener(); }
  notify(): void { this.emit(); }

  get size(): number { return this.pages.size; }
  get(path: string): GraphPage | undefined { return this.pages.get(path) ?? this.pages.get(this.lowercasePathMap.get(path.toLowerCase()) ?? ""); }
  allPages(): GraphPage[] { return [...this.pages.values()]; }

  async rebuild(): Promise<void> {
    if (this.building) {
      this.rebuildQueued = true;
      return;
    }
    this.building = true;
    const run = ++this.generation;
    try {
      this.pages.clear();
      this.lowercasePathMap.clear();
      this.addVaultTree();
      this.addTagTree();
      this.addResolvedLinks();
      this.addUnresolvedLinks();
      await this.enrichMarkdownPages(run);
      if (run !== this.generation) return;
      this.emit();
    } finally {
      this.building = false;
      if (this.rebuildQueued) {
        this.rebuildQueued = false;
        void this.rebuild();
      }
    }
  }

  private createPage(params: Partial<GraphPage> & Pick<GraphPage, "path" | "name">): GraphPage {
    return {
      path: params.path,
      file: params.file ?? null,
      name: params.name,
      url: params.url ?? null,
      isFolder: params.isFolder ?? false,
      isTag: params.isTag ?? false,
      mtime: params.mtime ?? params.file?.stat.mtime ?? null,
      neighbours: params.neighbours ?? new Map(),
      aliases: params.aliases ?? [],
      tags: params.tags ?? [],
      noteType: params.noteType ?? null,
      primaryStyleTag: params.primaryStyleTag ?? null,
      styleTags: params.styleTags ?? [],
      frontmatter: params.frontmatter ?? {},
      inlineFields: params.inlineFields ?? {},
      maxLabelLength: params.maxLabelLength ?? this.plugin.settings.baseNodeStyle.maxLabelLength ?? 30
    };
  }

  private addPage(page: GraphPage): void {
    this.pages.set(page.path, page);
    this.lowercasePathMap.set(page.path.toLowerCase(), page.path);
  }

  private addVaultTree(): void {
    const root = this.createPage({ path: "folder:/", name: "/", isFolder: true });
    this.addPage(root);
    const visit = (folder: TFolder, parent: GraphPage): void => {
      for (const item of folder.children) {
        if (item instanceof TFolder) {
          const node = this.createPage({ path: `folder:${item.path}`, name: item.name, isFolder: true });
          this.addPage(node);
          this.addPair(parent, node, "child", RelationType.DEFINED, LinkDirection.FROM, "file-tree");
          visit(item, node);
        } else if (item instanceof TFile) {
          const node = this.createPage({ path: item.path, name: item.extension === "md" ? item.basename : item.name, file: item });
          this.addPage(node);
          this.addPair(parent, node, "child", RelationType.DEFINED, LinkDirection.FROM, "file-tree");
        }
      }
    };
    visit(this.app.vault.getRoot(), root);
  }

  private addTagTree(): void {
    const tagNames = new Set<string>();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) continue;
      for (const tag of getAllTags(cache) ?? []) tagNames.add(tag);
    }

    for (const rawTag of tagNames) {
      const parts = rawTag.slice(1).split("/").filter(Boolean);
      let parent: GraphPage | null = null;
      parts.forEach((part, index) => {
        const tagPath = parts.slice(0, index + 1).join("/");
        const path = `tag:${tagPath}`;
        let page = this.pages.get(path);
        if (!page) {
          page = this.createPage({
            path,
            name: this.plugin.settings.showFullTagName ? tagPath : part,
            isTag: true
          });
          this.addPage(page);
        }
        if (parent) this.addPair(parent, page, "child", RelationType.DEFINED, LinkDirection.FROM, "tag-tree");
        parent = page;
      });
    }
  }

  private addResolvedLinks(): void {
    const resolved = this.app.metadataCache.resolvedLinks as Record<string, Record<string, number>>;
    for (const [parentPath, children] of Object.entries(resolved)) {
      const parent = this.get(parentPath);
      if (!parent) continue;
      for (const childPath of Object.keys(children)) {
        const child = this.get(childPath);
        if (child) this.addInferredParentChild(parent, child);
      }
    }
  }

  private addUnresolvedLinks(): void {
    const unresolved = this.app.metadataCache.unresolvedLinks as Record<string, Record<string, number>>;
    for (const [parentPath, children] of Object.entries(unresolved)) {
      const parent = this.get(parentPath);
      if (!parent || parentPath === this.plugin.settings.excalibrainFilepath) continue;
      for (const childPath of Object.keys(children)) {
        const child = this.ensureVirtual(childPath);
        this.addInferredParentChild(parent, child);
      }
    }
  }

  private async enrichMarkdownPages(run: number): Promise<void> {
    const files = this.app.vault.getMarkdownFiles() as TFile[];
    const alive = new Set(files.map((f) => f.path));
    for (const cachedPath of this.fieldCache.keys()) if (!alive.has(cachedPath)) this.fieldCache.delete(cachedPath);

    for (const file of files) {
      if (run !== this.generation) return;
      const page = this.get(file.path);
      if (!page) continue;
      let entry = this.fieldCache.get(file.path);
      if (!entry || entry.mtime !== file.stat.mtime) {
        const content = await this.app.vault.cachedRead(file);
        entry = {
          mtime: file.stat.mtime,
          content,
          meta: parseFileMetadata(this.app.metadataCache.getFileCache(file), content)
        };
        this.fieldCache.set(file.path, entry);
      }
      this.applyMetadata(page, file, entry.meta, entry.content);
    }
  }

  private applyMetadata(page: GraphPage, file: TFile, meta: ParsedFileMetadata, content: string): void {
    page.aliases = meta.aliases;
    page.tags = meta.tags;
    page.frontmatter = meta.frontmatter;
    page.inlineFields = meta.inlineFields;

    // Note type is deliberately a document property (YAML frontmatter), not an inline field.
    // It is the primary style discriminator in K-Plex.
    const noteTypeField = normalizeFieldName(this.plugin.settings.noteTypeField);
    const noteTypeValue = getNormalizedFrontmatterValues(meta, noteTypeField)[0];
    const unwrapNoteType = (value: unknown): string | null => {
      const first = Array.isArray(value) ? value[0] : value;
      if (typeof first !== "string" && typeof first !== "number") return null;
      let text = String(first).trim();
      const wiki = text.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]$/);
      if (wiki) text = wiki[1].trim();
      return text || null;
    };
    page.noteType = unwrapNoteType(noteTypeValue);

    const styleTags = page.tags.filter((tag) => this.plugin.settings.tagStyleList.some((prefix) => tag.startsWith(prefix)));
    const primaryField = normalizeFieldName(this.plugin.settings.primaryTagField);
    const primaryValues = getNormalizedFieldValues(meta, primaryField).flatMap((v) => typeof v === "string" ? v.match(/#[^\s\])$"'\\]+/g) ?? [] : []);
    page.primaryStyleTag = primaryValues.find((tag) => styleTags.some((s) => s.startsWith(tag))) ?? styleTags[0] ?? null;
    page.styleTags = styleTags.filter((tag) => tag !== page.primaryStyleTag);

    for (const tag of page.tags) {
      const tagPage = this.get(`tag:${tag.replace(/^#/, "")}`);
      if (tagPage) this.addPair(tagPage, page, "child", RelationType.DEFINED, LinkDirection.TO, "tag-tree");
    }

    const hierarchy = this.plugin.settings.hierarchy;
    const groups: Array<[string[], Role]> = [
      [hierarchy.hidden, "parent"],
      [hierarchy.parents, "parent"],
      [hierarchy.children, "child"],
      [hierarchy.leftFriends, "left"],
      [hierarchy.rightFriends, "right"],
      [hierarchy.previous, "previous"],
      [hierarchy.next, "next"]
    ];

    // Frontmatter relationship fields take priority over inline Dataview fields. This is
    // especially important for drag-relinking: adding a document property must be able to
    // override a stale relation that still exists in the body of the note.
    const frontmatterTargets = new Set<string>();
    const applyValues = (values: unknown[], role: Role, groupIndex: number, field: string, inline: boolean): void => {
      for (const value of values) {
        for (const path of extractLinksFromValue(this.app, value, file)) {
          if (inline && frontmatterTargets.has(path)) continue;
          const target = this.ensureTarget(path);
          if (!inline) frontmatterTargets.add(target.path);
          if (groupIndex === 0) this.addHidden(page, target);
          else this.addExplicitPair(page, target, role, field);
        }
      }
    };

    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const [fieldNames, role] = groups[groupIndex];
      for (const originalName of fieldNames) {
        const field = normalizeFieldName(originalName);
        applyValues(getNormalizedFrontmatterValues(meta, field), role, groupIndex, field, false);
      }
    }
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const [fieldNames, role] = groups[groupIndex];
      for (const originalName of fieldNames) {
        const field = normalizeFieldName(originalName);
        applyValues(getNormalizedInlineFieldValues(meta, field), role, groupIndex, field, true);
      }
    }

    // URL nodes are inferred children, plus an origin/domain parent hierarchy. Markdown labels become the URL thought title.
    const urlRegex = /\bhttps?:\/\/[^\s<>()\[\]{}"']+/gi;
    const markdownUrlRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi;
    const aliases = new Map<string, string>();
    for (const match of content.matchAll(markdownUrlRegex)) {
      const raw = match[2].trim().replace(/[.,;:!?]+$/, "");
      if (raw) aliases.set(raw, match[1].trim());
    }
    const seen = new Set<string>();
    for (const match of content.matchAll(urlRegex)) {
      const raw = match[0].replace(/[.,;:!?]+$/, "");
      if (seen.has(raw)) continue;
      seen.add(raw);
      const urlPage = this.ensureUrl(raw, aliases.get(raw) || raw);
      this.addInferredParentChild(page, urlPage);
      try {
        const origin = new URL(raw).origin;
        const originPage = this.ensureUrl(origin, origin);
        this.addPair(originPage, urlPage, "child", RelationType.INFERRED, LinkDirection.TO);
      } catch { /* malformed URL - keep the raw URL node */ }
    }
  }

  private ensureVirtual(path: string): GraphPage {
    const existing = this.get(path);
    if (existing) return existing;
    const name = path.split("/").pop()?.replace(/\.md$/i, "") || path;
    const page = this.createPage({ path, name });
    this.addPage(page);
    return page;
  }

  private ensureUrl(url: string, alias?: string): GraphPage {
    const existing = this.pages.get(url);
    if (existing) {
      if (alias && existing.name === existing.url) existing.name = alias;
      return existing;
    }
    const page = this.createPage({ path: url, name: alias || url, url });
    this.addPage(page);
    return page;
  }

  private ensureTarget(path: string): GraphPage {
    if (/^https?:\/\//i.test(path)) return this.ensureUrl(path);
    return this.get(path) ?? this.ensureVirtual(path);
  }

  private addInferredParentChild(parent: GraphPage, child: GraphPage): void {
    const settings = this.plugin.settings;
    if (settings.inferAllLinksAsFriends) {
      this.addPair(parent, child, "left", RelationType.INFERRED, LinkDirection.FROM);
    } else if (settings.inverseInfer) {
      this.addPair(parent, child, "parent", RelationType.INFERRED, LinkDirection.FROM);
    } else {
      this.addPair(parent, child, "child", RelationType.INFERRED, LinkDirection.FROM);
    }
  }

  private addExplicitPair(source: GraphPage, target: GraphPage, role: Role, definition: string): void {
    switch (role) {
      case "parent": this.addPair(target, source, "child", RelationType.DEFINED, LinkDirection.TO, definition); break;
      case "child": this.addPair(source, target, "child", RelationType.DEFINED, LinkDirection.FROM, definition); break;
      case "left":
      case "right": this.addPair(source, target, role, RelationType.DEFINED, LinkDirection.FROM, definition); break;
      case "previous":
        this.addOne(source, target, "previous", RelationType.DEFINED, LinkDirection.FROM, definition);
        this.addOne(target, source, "next", RelationType.DEFINED, LinkDirection.TO, definition);
        break;
      case "next":
        this.addOne(source, target, "next", RelationType.DEFINED, LinkDirection.FROM, definition);
        this.addOne(target, source, "previous", RelationType.DEFINED, LinkDirection.TO, definition);
        break;
      case "sibling": break;
    }
  }

  private addPair(parent: GraphPage, child: GraphPage, role: Role, type: RelationType, direction: LinkDirection, definition?: string): void {
    if (role === "child") {
      this.addOne(parent, child, "child", type, direction, definition);
      this.addOne(child, parent, "parent", type, direction === LinkDirection.FROM ? LinkDirection.TO : direction === LinkDirection.TO ? LinkDirection.FROM : direction, definition);
    } else if (role === "parent") {
      this.addOne(parent, child, "parent", type, direction, definition);
      this.addOne(child, parent, "child", type, direction === LinkDirection.FROM ? LinkDirection.TO : direction === LinkDirection.TO ? LinkDirection.FROM : direction, definition);
    } else if (role === "left" || role === "right") {
      this.addOne(parent, child, role, type, direction, definition);
      this.addOne(child, parent, role, type, direction === LinkDirection.FROM ? LinkDirection.TO : direction === LinkDirection.TO ? LinkDirection.FROM : direction, definition);
    }
  }

  private addHidden(source: GraphPage, target: GraphPage): void {
    if (target.path === this.plugin.settings.excalibrainFilepath || target.path === source.path) return;
    const relation = source.neighbours.get(target.path) ?? { ...DEFAULT_RELATION(), target };
    relation.isHidden = true;
    source.neighbours.set(target.path, relation);
  }

  private addOne(source: GraphPage, target: GraphPage, role: Role, type: RelationType, direction: LinkDirection, definition?: string): void {
    if (source.path === target.path || target.path === this.plugin.settings.excalibrainFilepath) return;
    const relation = source.neighbours.get(target.path) ?? { ...DEFAULT_RELATION(), target };
    relation.direction = directionToSet(relation.direction, direction);
    switch (role) {
      case "parent":
        relation.isParent = true;
        relation.parentType = relationTypeToSet(relation.parentType, type);
        relation.parentTypeDefinition = concatDefinition(definition, relation.parentTypeDefinition);
        break;
      case "child":
        relation.isChild = true;
        relation.childType = relationTypeToSet(relation.childType, type);
        relation.childTypeDefinition = concatDefinition(definition, relation.childTypeDefinition);
        break;
      case "left":
        relation.isLeftFriend = true;
        relation.leftFriendType = relationTypeToSet(relation.leftFriendType, type);
        relation.leftFriendTypeDefinition = concatDefinition(definition, relation.leftFriendTypeDefinition);
        break;
      case "right":
        relation.isRightFriend = true;
        relation.rightFriendType = relationTypeToSet(relation.rightFriendType, type);
        relation.rightFriendTypeDefinition = concatDefinition(definition, relation.rightFriendTypeDefinition);
        break;
      case "previous":
        relation.isPreviousFriend = true;
        relation.previousFriendType = relationTypeToSet(relation.previousFriendType, type);
        relation.previousFriendTypeDefinition = concatDefinition(definition, relation.previousFriendTypeDefinition);
        break;
      case "next":
        relation.isNextFriend = true;
        relation.nextFriendType = relationTypeToSet(relation.nextFriendType, type);
        relation.nextFriendTypeDefinition = concatDefinition(definition, relation.nextFriendTypeDefinition);
        break;
      case "sibling": break;
    }
    source.neighbours.set(target.path, relation);
  }

  private relationVector(r: Relation): RelationVector {
    const settings = this.plugin.settings;
    return {
      pi: r.isParent && r.parentType === RelationType.INFERRED,
      pd: r.isParent && r.parentType === RelationType.DEFINED,
      ci: r.isChild && r.childType === RelationType.INFERRED,
      cd: r.isChild && r.childType === RelationType.DEFINED,
      lfd: (!settings.inferAllLinksAsFriends && r.isLeftFriend) ||
        (settings.inferAllLinksAsFriends && r.isLeftFriend && ![
          r.parentType === RelationType.DEFINED,
          r.childType === RelationType.DEFINED,
          r.rightFriendType === RelationType.DEFINED,
          r.nextFriendType === RelationType.DEFINED,
          r.previousFriendType === RelationType.DEFINED
        ].some(Boolean)),
      rfd: r.isRightFriend && r.rightFriendType === RelationType.DEFINED,
      pfd: r.isPreviousFriend && r.previousFriendType === RelationType.DEFINED,
      nfd: r.isNextFriend && r.nextFriendType === RelationType.DEFINED
    };
  }

  private classify(r: Relation, role: Role): RelationType | null {
    const { pi, pd, ci, cd, lfd, rfd, nfd, pfd } = this.relationVector(r);
    switch (role) {
      case "child":
        return cd && !pd && !lfd && !rfd && !nfd && !pfd
          ? RelationType.DEFINED
          : !pi && !pd && ci && !cd && !lfd && !rfd && !nfd && !pfd ? RelationType.INFERRED : null;
      case "parent":
        return !cd && pd && !lfd && !rfd && !nfd && !pfd
          ? RelationType.DEFINED
          : pi && !pd && !ci && !cd && !lfd && !rfd && !nfd && !pfd ? RelationType.INFERRED : null;
      case "left":
        return lfd
          ? RelationType.DEFINED
          : ((pi && !pd && ci && !cd && !lfd && !rfd && !nfd && !pfd) || [pd, cd, lfd, rfd, nfd, pfd].filter(Boolean).length >= 2)
            ? RelationType.INFERRED : null;
      case "right": return !pd && !cd && !lfd && rfd && !nfd && !pfd ? RelationType.DEFINED : null;
      case "previous": return !pd && !cd && !lfd && !rfd && pfd && !nfd ? RelationType.DEFINED : null;
      case "next": return !pd && !cd && !lfd && !rfd && !pfd && nfd ? RelationType.DEFINED : null;
      case "sibling": return null;
    }
  }

  private visibleTarget(page: GraphPage, settings: ExcaliBrainSettings): boolean {
    if (settings.excludeFilepaths.some((prefix) => page.path.startsWith(prefix))) return false;
    const isVirtual = !page.file && !page.isFolder && !page.isTag && !page.url;
    const isAttachment = Boolean(page.file && page.file.extension !== "md");
    if (!settings.showVirtualNodes && isVirtual) return false;
    if (!settings.showAttachments && isAttachment) return false;
    if (!settings.showFolderNodes && page.isFolder) return false;
    if (!settings.showTagNodes && page.isTag) return false;
    if (!settings.showPageNodes && !page.isFolder && !page.isTag && !isAttachment && !page.url) return false;
    if (!settings.showURLNodes && page.url) return false;
    return true;
  }

  neighbours(page: GraphPage, role: Role): Neighbour[] {
    const settings = this.plugin.settings;
    const output: Neighbour[] = [];
    for (const relation of page.neighbours.values()) {
      if (relation.isHidden || !this.visibleTarget(relation.target, settings)) continue;
      let relationType = this.classify(relation, role);
      if (role === "left" && relationType && !relation.leftFriendType) {
        relationType = relation.parentType === RelationType.DEFINED && relation.childType === RelationType.DEFINED
          ? RelationType.DEFINED
          : RelationType.INFERRED;
      }
      if (!relationType || (relationType === RelationType.INFERRED && !settings.showInferredNodes)) continue;
      let typeDefinition: string | undefined;
      switch (role) {
        case "parent": typeDefinition = relation.parentTypeDefinition; break;
        case "child": typeDefinition = relation.childTypeDefinition; break;
        case "left": typeDefinition = relation.leftFriendTypeDefinition; break;
        case "right": typeDefinition = relation.rightFriendTypeDefinition; break;
        case "previous": typeDefinition = relation.previousFriendTypeDefinition; break;
        case "next": typeDefinition = relation.nextFriendTypeDefinition; break;
        case "sibling": break;
      }
      output.push({ page: relation.target, relationType, typeDefinition, linkDirection: relation.direction, role });
    }
    return output.sort((a, b) => naturalCompare(this.titleFor(a.page), this.titleFor(b.page)));
  }

  isConnected(source: GraphPage, targetPath: string): boolean {
    if (source.neighbours.has(targetPath)) return true;
    const target = this.get(targetPath);
    return target?.neighbours.has(source.path) ?? false;
  }

  gateStats(page: GraphPage): GateStats {
    const roleSets: Record<GateSide, Role[]> = {
      top: ["parent"],
      bottom: ["child"],
      left: ["left", "previous"],
      right: ["right", "next"],
    };

    const result: GateStats = {
      top: { visibleCount: 0, hasAny: false },
      bottom: { visibleCount: 0, hasAny: false },
      left: { visibleCount: 0, hasAny: false },
      right: { visibleCount: 0, hasAny: false },
    };

    for (const [gate, roles] of Object.entries(roleSets) as Array<[GateSide, Role[]]>) {
      const visible = new Set<string>();
      for (const role of roles) {
        for (const neighbour of this.neighbours(page, role)) visible.add(neighbour.page.path);
      }
      result[gate].visibleCount = visible.size;

      for (const relation of page.neighbours.values()) {
        if (relation.isHidden) continue;
        if (roles.some((role) => this.classify(relation, role) !== null)) {
          result[gate].hasAny = true;
          break;
        }
      }
    }

    return result;
  }

  gateNeighbourPaths(page: GraphPage, gate: GateSide): Set<string> {
    const roleSets: Record<GateSide, Role[]> = {
      top: ["parent"],
      bottom: ["child"],
      left: ["left", "previous"],
      right: ["right", "next"],
    };
    const paths = new Set<string>();
    // Relationship editing must honor the semantic connection even when its target is
    // hidden by the current inferred/type visibility filters. This is the same distinction
    // used by gateStats(): gate fill represents all relationships, while the count represents
    // only the currently visible ones.
    for (const relation of page.neighbours.values()) {
      if (relation.isHidden) continue;
      if (roleSets[gate].some((role) => this.classify(relation, role) !== null)) paths.add(relation.target.path);
    }
    return paths;
  }

  getNeighborhood(path: string): Neighborhood | null {
    const center = this.get(path);
    if (!center) return null;
    const max = this.plugin.settings.maxItemCount;
    const parents = this.neighbours(center, "parent").slice(0, max);
    const children = this.neighbours(center, "child").slice(0, max);
    const leftFriends = [...this.neighbours(center, "left"), ...this.neighbours(center, "previous")].slice(0, max);
    const rightFriends = [...this.neighbours(center, "right"), ...this.neighbours(center, "next")].slice(0, max);

    const occupied = new Set([center.path, ...parents.map((n) => n.page.path), ...children.map((n) => n.page.path), ...leftFriends.map((n) => n.page.path), ...rightFriends.map((n) => n.page.path)]);
    const parentPaths = new Set(parents.map((n) => n.page.path));
    const siblingsMap = new Map<string, Neighbour>();
    if (this.plugin.settings.renderSiblings) {
      for (const parent of parents) {
        for (const sibling of this.neighbours(parent.page, "child")) {
          if (occupied.has(sibling.page.path) || !parentPaths.has(parent.page.path)) continue;
          const previous = siblingsMap.get(sibling.page.path);
          siblingsMap.set(sibling.page.path, {
            ...sibling,
            role: "sibling",
            relationType: previous?.relationType === RelationType.DEFINED || sibling.relationType === RelationType.DEFINED ? RelationType.DEFINED : RelationType.INFERRED
          });
        }
      }
    }
    const siblings = [...siblingsMap.values()].sort((a, b) => naturalCompare(this.titleFor(a.page), this.titleFor(b.page))).slice(0, max);
    return { center, parents, children, leftFriends, rightFriends, siblings };
  }

  titleFor(page: GraphPage): string {
    const settings = this.plugin.settings;
    let title = settings.renderAlias && page.aliases.length ? page.aliases[0] : page.name;
    if (settings.nodeTitleScript && page.file) {
      try {
        const normalizedFields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(page.frontmatter)) normalizedFields[normalizeFieldName(key)] = value;
        const dvPage = {
          ...normalizedFields,
          file: {
            path: page.file.path,
            name: page.file.name,
            basename: page.file.basename,
            ext: page.file.extension,
            aliases: page.aliases,
            tags: page.tags,
            etags: page.tags
          }
        };
        // Compatibility with the legacy custom label setting. The user supplied this script in their own vault settings.
        const fn = new Function("dvPage", "defaultName", `return ${settings.nodeTitleScript}`) as (dvPage: unknown, defaultName: string) => unknown;
        const result = fn(dvPage, title);
        if (typeof result === "string" && result.trim()) title = result;
      } catch { /* fall back to the standard title */ }
    }
    return title;
  }

  neighbourCount(page: GraphPage): number {
    const roles: Role[] = ["parent", "child", "left", "right", "previous", "next"];
    const unique = new Set<string>();
    for (const role of roles) for (const n of this.neighbours(page, role)) unique.add(n.page.path);
    return unique.size;
  }

  search(query: string, limit = 40): GraphPage[] {
    const q = query.trim().toLowerCase();
    const candidates = [...this.pages.values()].filter((page) => this.visibleTarget(page, this.plugin.settings));
    const scored = candidates.map((page) => {
      const title = this.titleFor(page).toLowerCase();
      const path = page.path.toLowerCase();
      const score = !q ? 5 : title === q ? 0 : title.startsWith(q) ? 1 : title.includes(q) ? 2 : path.includes(q) ? 3 : 99;
      return { page, score };
    }).filter((x) => x.score < 99)
      .sort((a, b) => a.score - b.score || naturalCompare(this.titleFor(a.page), this.titleFor(b.page)));
    return scored.slice(0, limit).map((x) => x.page);
  }
}
