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
  mergeFileMetadata,
  type ParsedBodyMetadata,
  type ParsedFileMetadata
} from "./fieldParser";
import { MetadataParseWorker } from "./MetadataParseWorker";

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

type FieldCacheEntry = { mtime: number; body: ParsedBodyMetadata };

type CachedRelationView = {
  signature: string;
  roles: Record<Exclude<Role, "sibling">, Neighbour[]>;
  gateStats: GateStats;
  neighbourCount: number;
};

type PersistedBodyCache = {
  version: 1;
  entries: Record<string, { mtime: number; body: ParsedBodyMetadata }>;
};

const BODY_CACHE_KEY = "k-plex:index-body-cache:v1";
type SearchEntry = {
  page: GraphPage;
  name: string;
  aliases: string[];
  path: string;
};

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

const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const naturalCompare = (a: string, b: string) => naturalCollator.compare(a, b);

function subsequenceScore(text: string, query: string): number | null {
  if (!query) return 0;
  if (text === query) return 0;
  if (text.startsWith(query)) return 20 + Math.min(80, text.length - query.length);
  const containedAt = text.indexOf(query);
  if (containedAt >= 0) return 120 + containedAt * 4 + Math.min(120, text.length - query.length);

  let qi = 0;
  let first = -1;
  let last = -1;
  let gapPenalty = 0;
  let boundaryBonus = 0;
  for (let i = 0; i < text.length && qi < query.length; i += 1) {
    if (text[i] !== query[qi]) continue;
    if (first < 0) first = i;
    if (last >= 0) gapPenalty += Math.max(0, i - last - 1);
    if (i === 0 || /[\s_\-/.]/.test(text[i - 1])) boundaryBonus += 8;
    last = i;
    qi += 1;
  }
  if (qi !== query.length) return null;

  // Subsequence matches rank below exact/prefix/substring matches. Tight runs and word-boundary
  // hits rank higher, matching the way Obsidian-style fuzzy search feels in practice.
  return 1000 + first * 5 + gapPenalty * 12 + Math.max(0, text.length - query.length) - boundaryBonus;
}

function searchEntryScore(entry: SearchEntry, query: string): number | null {
  let best = subsequenceScore(entry.name, query);
  for (const alias of entry.aliases) {
    const score = subsequenceScore(alias, query);
    if (score !== null && (best === null || score + 8 < best)) best = score + 8;
  }
  const pathScore = subsequenceScore(entry.path, query);
  if (pathScore !== null && (best === null || pathScore + 240 < best)) best = pathScore + 240;
  return best;
}

export class GraphIndex {
  readonly pages = new Map<string, GraphPage>();
  readonly lowercasePathMap = new Map<string, string>();
  private listeners = new Set<() => void>();
  private fieldCache = new Map<string, FieldCacheEntry>();
  private generation = 0;
  private building = false;
  private rebuildQueued = false;
  private searchEntries: SearchEntry[] = [];
  private searchCandidateCache = new Map<string, SearchEntry[]>();
  private titleCache = new Map<string, { signature: string; title: string }>();
  private titleScriptSource = "";
  private titleScriptFn: ((dvPage: unknown, defaultName: string) => unknown) | null = null;
  private relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
  private metadataWorker = new MetadataParseWorker();
  private cachePersistTimer: number | null = null;
  private bodyCacheDirty = false;

  constructor(private plugin: ExcaliBrainPlugin, private app: App = plugin.app) {
    this.restoreBodyCache();
  }


  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(): void { for (const listener of this.listeners) listener(); }
  notify(): void { this.emit(); }

  get size(): number { return this.pages.size; }
  get(path: string): GraphPage | undefined { return this.pages.get(path) ?? this.pages.get(this.lowercasePathMap.get(path.toLowerCase()) ?? ""); }
  allPages(): GraphPage[] { return [...this.pages.values()]; }

  destroy(): void {
    if (this.cachePersistTimer !== null) window.clearTimeout(this.cachePersistTimer);
    this.metadataWorker.destroy();
  }

  private restoreBodyCache(): void {
    try {
      const raw = this.app.loadLocalStorage(BODY_CACHE_KEY) as PersistedBodyCache | null;
      if (!raw || raw.version !== 1 || !raw.entries || typeof raw.entries !== "object") return;
      for (const [path, value] of Object.entries(raw.entries)) {
        if (!value || typeof value.mtime !== "number" || !value.body) continue;
        this.fieldCache.set(path, { mtime: value.mtime, body: value.body });
      }
    } catch {
      // Cache is an optimization only; rebuild from the vault when it cannot be restored.
    }
  }

  private scheduleBodyCachePersist(): void {
    if (!this.bodyCacheDirty) return;
    if (this.cachePersistTimer !== null) window.clearTimeout(this.cachePersistTimer);
    this.cachePersistTimer = window.setTimeout(() => {
      this.cachePersistTimer = null;
      try {
        const entries: PersistedBodyCache["entries"] = {};
        for (const [path, entry] of this.fieldCache) entries[path] = { mtime: entry.mtime, body: entry.body };
        this.app.saveLocalStorage(BODY_CACHE_KEY, { version: 1, entries } satisfies PersistedBodyCache);
        this.bodyCacheDirty = false;
      } catch {
        // Cache persistence failure must never affect graph behavior.
      }
    }, 5000);
  }

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
      this.titleCache.clear();
      this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();

      this.addVaultTree();
      this.addTagTree();
      this.addResolvedLinks();
      this.addUnresolvedLinks();
      await this.enrichMarkdownPages(run);
      if (run !== this.generation) return;

      this.rebuildSearchIndex();
      this.emit();
      this.scheduleBodyCachePersist();
    } finally {
      this.building = false;
      if (this.rebuildQueued) {
        this.rebuildQueued = false;
        void this.rebuild();
      }
    }
  }


  private rebuildSearchIndex(): void {
    this.searchCandidateCache.clear();
    // Do not globally locale-sort 100k+ graph thoughts here. In the instrumented large vault,
    // that sort alone took ~5.8 seconds. Ranked search already orders matches, and the empty
    // query only needs a small initial sample, so insertion order is sufficient and effectively
    // free to build.
    this.searchEntries = [...this.pages.values()].map((page) => ({
      page,
      name: page.name.toLowerCase(),
      aliases: page.aliases.map((alias) => alias.toLowerCase()),
      path: page.path.toLowerCase(),
    }));
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
    const alive = new Set(files.map((file) => file.path));
    for (const cachedPath of this.fieldCache.keys()) {
      if (alive.has(cachedPath)) continue;
      this.fieldCache.delete(cachedPath);
      this.bodyCacheDirty = true;
    }

    let processed = 0;
    for (const file of files) {
      if (run !== this.generation) return;
      const page = this.get(file.path);
      if (!page) continue;

      let entry = this.fieldCache.get(file.path);
      if (!entry || entry.mtime !== file.stat.mtime) {
        const content = await this.app.vault.cachedRead(file);
        const body = await this.metadataWorker.parse(content);
        entry = { mtime: file.stat.mtime, body };
        this.fieldCache.set(file.path, entry);
        this.bodyCacheDirty = true;
      }

      const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), entry.body);
      this.applyMetadata(page, file, meta);

      processed += 1;
      // Keep the renderer responsive during a warm-cache rebuild without paying the overhead
      // of yielding after every handful of files.
      if (processed % 250 === 0) await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  }

  private applyMetadata(page: GraphPage, file: TFile, meta: ParsedFileMetadata): void {
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

    // URL nodes are inferred children, plus an origin/domain parent hierarchy. Body URL
    // extraction is cached/worker-parsed; applying the graph relationships stays on the main thread.
    for (const reference of meta.urls) {
      const raw = reference.url;
      const urlPage = this.ensureUrl(raw, reference.label || raw);
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

  private relationViewSignature(): string {
    const settings = this.plugin.settings;
    return [
      settings.showInferredNodes ? "1" : "0",
      settings.showVirtualNodes ? "1" : "0",
      settings.showAttachments ? "1" : "0",
      settings.showFolderNodes ? "1" : "0",
      settings.showTagNodes ? "1" : "0",
      settings.showPageNodes ? "1" : "0",
      settings.showURLNodes ? "1" : "0",
      settings.renderAlias ? "1" : "0",
      settings.nodeTitleScript,
      settings.excludeFilepaths.join("\u0002"),
    ].join("\u0001");
  }

  private relationView(page: GraphPage): CachedRelationView {
    const signature = this.relationViewSignature();
    const cached = this.relationViewCache.get(page);
    if (cached?.signature === signature) return cached;

    const settings = this.plugin.settings;
    const roles: CachedRelationView["roles"] = {
      parent: [],
      child: [],
      left: [],
      right: [],
      previous: [],
      next: [],
    };
    const gateStats: GateStats = {
      top: { visibleCount: 0, hasAny: false },
      bottom: { visibleCount: 0, hasAny: false },
      left: { visibleCount: 0, hasAny: false },
      right: { visibleCount: 0, hasAny: false },
    };
    const visibleGatePaths: Record<GateSide, Set<string>> = {
      top: new Set<string>(),
      bottom: new Set<string>(),
      left: new Set<string>(),
      right: new Set<string>(),
    };
    const uniqueVisible = new Set<string>();

    const roleGate = (role: Exclude<Role, "sibling">): GateSide => {
      if (role === "parent") return "top";
      if (role === "child") return "bottom";
      if (role === "left" || role === "previous") return "left";
      return "right";
    };
    const typeDefinitionFor = (relation: Relation, role: Exclude<Role, "sibling">): string | undefined => {
      switch (role) {
        case "parent": return relation.parentTypeDefinition;
        case "child": return relation.childTypeDefinition;
        case "left": return relation.leftFriendTypeDefinition;
        case "right": return relation.rightFriendTypeDefinition;
        case "previous": return relation.previousFriendTypeDefinition;
        case "next": return relation.nextFriendTypeDefinition;
      }
    };

    const concreteRoles: Array<Exclude<Role, "sibling">> = ["parent", "child", "left", "right", "previous", "next"];
    for (const relation of page.neighbours.values()) {
      if (relation.isHidden) continue;

      // A filled gate represents semantic relationships even when the target is currently hidden.
      for (const role of concreteRoles) {
        if (this.classify(relation, role) !== null) gateStats[roleGate(role)].hasAny = true;
      }

      if (!this.visibleTarget(relation.target, settings)) continue;
      for (const role of concreteRoles) {
        let relationType = this.classify(relation, role);
        if (role === "left" && relationType && !relation.leftFriendType) {
          relationType = relation.parentType === RelationType.DEFINED && relation.childType === RelationType.DEFINED
            ? RelationType.DEFINED
            : RelationType.INFERRED;
        }
        if (!relationType || (relationType === RelationType.INFERRED && !settings.showInferredNodes)) continue;
        roles[role].push({
          page: relation.target,
          relationType,
          typeDefinition: typeDefinitionFor(relation, role),
          linkDirection: relation.direction,
          role,
        });
        visibleGatePaths[roleGate(role)].add(relation.target.path);
        uniqueVisible.add(relation.target.path);
      }
    }

    for (const role of concreteRoles) {
      const list = roles[role];
      if (list.length < 2) continue;
      // Compute each title once. Calling titleFor() from Array.sort's comparator made a single
      // neighborhood calculation invoke it tens or hundreds of thousands of times on large
      // sibling sets, even when every call was a cache hit.
      const keyed = list.map((item, index) => ({ item, index, title: this.titleFor(item.page) }));
      keyed.sort((a, b) => naturalCompare(a.title, b.title) || a.index - b.index);
      roles[role] = keyed.map((entry) => entry.item);
    }
    gateStats.top.visibleCount = visibleGatePaths.top.size;
    gateStats.bottom.visibleCount = visibleGatePaths.bottom.size;
    gateStats.left.visibleCount = visibleGatePaths.left.size;
    gateStats.right.visibleCount = visibleGatePaths.right.size;

    const result: CachedRelationView = { signature, roles, gateStats, neighbourCount: uniqueVisible.size };
    this.relationViewCache.set(page, result);
    return result;
  }

  neighbours(page: GraphPage, role: Role): Neighbour[] {
    return role === "sibling" ? [] : this.relationView(page).roles[role];
  }

  isConnected(source: GraphPage, targetPath: string): boolean {
    if (source.neighbours.has(targetPath)) return true;
    const target = this.get(targetPath);
    return target?.neighbours.has(source.path) ?? false;
  }

  gateStats(page: GraphPage): GateStats {
    return this.relationView(page).gateStats;
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
    const siblingList = [...siblingsMap.values()];
    const siblingKeys = siblingList.map((item, index) => ({ item, index, title: this.titleFor(item.page) }));
    siblingKeys.sort((a, b) => naturalCompare(a.title, b.title) || a.index - b.index);
    const siblings = siblingKeys.slice(0, max).map((entry) => entry.item);
    return { center, parents, children, leftFriends, rightFriends, siblings };
  }

  titleFor(page: GraphPage): string {
    const settings = this.plugin.settings;
    const signature = [
      page.mtime ?? 0,
      settings.renderAlias ? "1" : "0",
      settings.nodeTitleScript,
      page.aliases[0] ?? "",
      page.name,
    ].join("\u0001");
    const cached = this.titleCache.get(page.path);
    if (cached?.signature === signature) {
      return cached.title;
    }

    let title = settings.renderAlias && page.aliases.length ? page.aliases[0] : page.name;
    if (settings.nodeTitleScript && page.file) {
      try {
        if (this.titleScriptSource !== settings.nodeTitleScript) {
          this.titleScriptSource = settings.nodeTitleScript;
          // Compatibility with the legacy custom label setting. Compile once per script change
          // rather than once per node/render.
          this.titleScriptFn = new Function("dvPage", "defaultName", `return ${settings.nodeTitleScript}`) as (dvPage: unknown, defaultName: string) => unknown;
        }
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
        const result = this.titleScriptFn?.(dvPage, title);
        if (typeof result === "string" && result.trim()) title = result;
      } catch {
        this.titleScriptFn = null;
        /* fall back to the standard title */
      }
    }
    this.titleCache.set(page.path, { signature, title });
    return title;
  }

  neighbourCount(page: GraphPage): number {
    return this.relationView(page).neighbourCount;
  }

  search(query: string, limit = 40): GraphPage[] {
    const q = query.trim().toLowerCase();
    const settings = this.plugin.settings;
    const max = Math.max(1, limit);

    if (!q) {
      const output: GraphPage[] = [];
      for (const entry of this.searchEntries) {
        if (!this.visibleTarget(entry.page, settings)) continue;
        output.push(entry.page);
        if (output.length >= max) break;
      }
      return output;
    }

    // A match for a longer query must also match every prefix of that query. Reuse the longest
    // cached prefix so normal typing progressively searches a much smaller candidate set instead
    // of rescanning 100k+ thoughts on every keypress. Cache textual matches independently from
    // visibility so toggling graph filters cannot make the cache incorrect.
    let candidates = this.searchEntries;
    for (let length = q.length - 1; length >= 1; length -= 1) {
      const prefix = q.slice(0, length);
      const cached = this.searchCandidateCache.get(prefix);
      if (!cached) continue;
      candidates = cached;
      break;
    }

    const textualMatches: SearchEntry[] = [];
    const best: Array<{ page: GraphPage; score: number }> = [];
    for (const entry of candidates) {
      const score = searchEntryScore(entry, q);
      if (score === null) continue;
      textualMatches.push(entry);
      if (!this.visibleTarget(entry.page, settings)) continue;
      if (best.length >= max && score >= best[best.length - 1].score) continue;

      let at = best.length;
      while (at > 0 && score < best[at - 1].score) at -= 1;
      best.splice(at, 0, { page: entry.page, score });
      if (best.length > max) best.pop();
    }

    this.searchCandidateCache.set(q, textualMatches);
    // Keep a small LRU-ish working set. SearchBox queries are generally a single prefix chain;
    // retaining the most recent dozen prefixes gives fast typing and backspacing without keeping
    // large candidate arrays forever.
    while (this.searchCandidateCache.size > 12) {
      const oldest = this.searchCandidateCache.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.searchCandidateCache.delete(oldest);
    }

    return best.map((item) => item.page);
  }
}
