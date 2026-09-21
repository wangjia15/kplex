import type { App } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { ExcaliBrainSettings } from "../settings";
import {
  RelationType,
  type GraphPage,
  type GateSide,
  type GateStats,
  type Neighbour,
  type Neighborhood,
  type Relation,
  type Role,
} from "../types";
import type { ParsedBodyMetadata } from "./fieldParser";
import { GraphBuilder, type FieldCacheEntry } from "./GraphBuilder";
import { createGraphState, getGraphPage } from "./GraphState";
import { MetadataParser } from "./MetadataParser";
import {
  classifyRelation,
  explainResolvedRelationship,
  type RelationshipExplanation,
} from "./RelationResolver";


type CachedRelationView = {
  signature: string;
  roles: Record<Exclude<Role, "sibling">, Neighbour[]>;
  gateStats: GateStats;
  neighbourCount: number;
};

type PersistedBodyCache = {
  version: 2;
  entries: Record<string, { mtime: number; body: ParsedBodyMetadata }>;
};

const BODY_CACHE_KEY = "k-plex:index-body-cache:v2";

type SearchEntry = {
  page: GraphPage;
  name: string;
  aliases: string[];
  path: string;
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
  private state = createGraphState();
  private listeners = new Set<() => void>();
  private fieldCache = new Map<string, FieldCacheEntry>();
  private generation = 0;
  private building = false;
  private rebuildQueued = false;
  private searchEntries: SearchEntry[] = [];
  private searchCandidateCache = new Map<string, SearchEntry[]>();
  private titleCache = new Map<string, { signature: string; title: string }>();
  private relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
  private metadataParser = new MetadataParser();
  private cachePersistTimer: number | null = null;
  private bodyCacheDirty = false;

  constructor(private plugin: ExcaliBrainPlugin, private app: App = plugin.app) {
    this.restoreBodyCache();
  }

  get pages(): Map<string, GraphPage> { return this.state.pages; }
  get lowercasePathMap(): Map<string, string> { return this.state.lowercasePathMap; }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(): void { for (const listener of this.listeners) listener(); }
  notify(): void { this.emit(); }

  get size(): number { return this.state.pages.size; }
  get(path: string): GraphPage | undefined { return getGraphPage(this.state, path); }
  allPages(): GraphPage[] { return [...this.state.pages.values()]; }

  destroy(): void {
    if (this.cachePersistTimer !== null) window.clearTimeout(this.cachePersistTimer);
    this.metadataParser.destroy();
  }

  private restoreBodyCache(): void {
    try {
      const raw = this.app.loadLocalStorage(BODY_CACHE_KEY) as PersistedBodyCache | null;
      if (!raw || raw.version !== 2 || !raw.entries || typeof raw.entries !== "object") return;
      for (const [path, value] of Object.entries(raw.entries)) {
        if (!value || typeof value.mtime !== "number" || !value.body || !Array.isArray(value.body.inlineFieldOccurrences)) continue;
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
        this.app.saveLocalStorage(BODY_CACHE_KEY, { version: 2, entries } satisfies PersistedBodyCache);
        this.bodyCacheDirty = false;
      } catch {
        // Cache persistence failure must never affect graph behavior.
      }
    }, 5000);
  }

  /** Build a complete graph off to the side, then atomically publish it. */
  async rebuild(): Promise<void> {
    if (this.building) {
      this.rebuildQueued = true;
      // Invalidate the in-flight snapshot immediately. The queued rebuild will
      // start from the newest vault state, so stale work must never publish.
      this.generation += 1;
      return;
    }
    this.building = true;
    const run = ++this.generation;
    try {
      const builder = new GraphBuilder(
        this.plugin,
        this.app,
        this.fieldCache,
        this.metadataParser,
        () => { this.bodyCacheDirty = true; },
        () => run === this.generation,
      );
      const next = await builder.build();
      if (!next || run !== this.generation) return;

      // Atomic graph-state swap: readers never observe a half-built graph.
      this.state = next;
      this.titleCache.clear();
      this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
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
    this.searchEntries = [...this.state.pages.values()].map((page) => ({
      page,
      name: page.name.toLowerCase(),
      aliases: page.aliases.map((alias) => alias.toLowerCase()),
      path: page.path.toLowerCase(),
    }));
  }

  explainRelationship(sourcePath: string, targetPath: string): RelationshipExplanation | null {
    const source = this.get(sourcePath);
    const target = this.get(targetPath);
    if (!source || !target) return null;
    return explainResolvedRelationship(
      source,
      target,
      this.state.evidence.between(source.path, target.path),
      this.plugin.settings.inferAllLinksAsFriends,
    );
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
        if (classifyRelation(relation, role, settings.inferAllLinksAsFriends) !== null) gateStats[roleGate(role)].hasAny = true;
      }

      if (!this.visibleTarget(relation.target, settings)) continue;
      for (const role of concreteRoles) {
        const relationType = classifyRelation(relation, role, settings.inferAllLinksAsFriends);
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
    const roleSets: Record<GateSide, Array<Exclude<Role, "sibling">>> = {
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
      if (roleSets[gate].some((role) => classifyRelation(relation, role, this.plugin.settings.inferAllLinksAsFriends) !== null)) paths.add(relation.target.path);
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

    // Custom JavaScript title expressions from legacy ExcaliBrain settings are intentionally not
    // executed. Community plugins must remain statically analyzable and must not execute user-provided JavaScript.
    const title = settings.renderAlias && page.aliases.length ? page.aliases[0] : page.name;
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
      const oldest: string | undefined = this.searchCandidateCache.keys().next().value;
      if (oldest === undefined) break;
      this.searchCandidateCache.delete(oldest);
    }

    return best.map((item) => item.page);
  }
}
