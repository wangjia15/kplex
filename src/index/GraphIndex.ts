import { Platform, TFile, type App } from "obsidian";
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
  type Role,
} from "../types";
import { GraphBuilder, type FieldCacheEntry } from "./GraphBuilder";
import type { ParsedBodyMetadata } from "./fieldParser";
import { KplexIndexedDbCache, type IndexedDbSnapshotMeta } from "./IndexedDbCache";
import { createGraphState, getGraphPage } from "./GraphState";
import type { EvidenceRole, RelationEvidence } from "./RelationEvidence";
import { MetadataParser } from "./MetadataParser";
import {
  addPersistedEvidenceToState,
  addPersistedPageToState,
  computeIndexSettingsSignature,
  computeVaultSignature,
  finalizeHydratedGraphStateCooperative,
  hydrateGraphState,
  hydratePersistedPageRelations,
  isPersistedIndexManifestV2,
  isPersistedIndexSnapshot,
  persistedDeclarationFromEvidence,
  persistedPageFromGraphPage,
  type PersistedEvidenceDeclaration,
  type PersistedIndexManifestV2,
  type PersistedIndexSnapshot,
  type PersistedPage,
} from "./IndexSnapshot";
import {
  classifyRelation,
  explainResolvedRelationship,
  resolveEvidencePair,
  type RelationshipExplanation,
} from "./RelationResolver";


type CachedRelationView = {
  signature: string;
  roles: Record<Exclude<Role, "sibling">, Neighbour[]>;
  gateStats: GateStats;
  neighbourCount: number;
};

type SearchEntry = {
  page: GraphPage;
  name: string;
  aliases: string[];
  path: string;
};

const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const naturalCompare = (a: string, b: string) => naturalCollator.compare(a, b);
const SNAPSHOT_EDIT_IDLE_MS = 5 * 60 * 1000;
const SNAPSHOT_MAINTENANCE_IDLE_MS = 5 * 60 * 1000;

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
  private searchEntryByPath = new Map<string, SearchEntry>();
  private searchCandidateCache = new Map<string, SearchEntry[]>();
  private titleCache = new Map<string, { signature: string; title: string }>();
  private relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
  private metadataParser = new MetadataParser();
  private snapshotPersistTimer: number | null = null;
  private orphanCleanupTimer: number | null = null;
  private snapshotPersistGeneration = 0;
  private bodyWarmGeneration = 0;
  private readonly indexedDb: KplexIndexedDbCache;
  private searchEntryPointPaths: string[] = [];
  private restoredModifiedMarkdownPaths: string[] = [];
  private restoredStructuralMismatch = false;
  private restoredPatchPlanAvailable = false;
  private snapshotHydrationTask: Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }> | null = null;
  private snapshotHydrationRun = 0;
  private fullSnapshotHydrated = false;
  private fullSnapshotFresh = false;
  private previewSnapshotPublished = false;
  private activeSnapshotGeneration: string | null = null;

  constructor(private plugin: ExcaliBrainPlugin, private app: App = plugin.app) {
    this.indexedDb = new KplexIndexedDbCache(app.vault.getName());
    // Remove the old parsed-body localStorage payload. IndexedDB is now the only durable index
    // cache; localStorage is a poor fit for large vaults because serialization duplicates memory.
    void this.indexedDb.clearLegacyLocalStorage(app);
  }

  get pages(): Map<string, GraphPage> { return this.state.pages; }
  get lowercasePathMap(): Map<string, string> { return this.state.lowercasePathMap; }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
  notify(): void { this.emit(); }

  get size(): number { return this.state.pages.size; }
  get(path: string): GraphPage | undefined { return getGraphPage(this.state, path); }
  allPages(): GraphPage[] { return [...this.state.pages.values()]; }

  setSearchEntryPoints(paths: string[]): void {
    this.searchEntryPointPaths = [...new Set(paths)];
  }

  evidenceFrom(sourcePath: string): Array<{ targetPath: string; evidence: RelationEvidence[] }> {
    return this.state.evidence.from(sourcePath);
  }

  evidenceBetween(sourcePath: string, targetPath: string): RelationEvidence[] {
    return this.state.evidence.between(sourcePath, targetPath);
  }

  discoveredFields(): Array<{ normalized: string; name: string; count: number }> {
    return [...this.state.discoveredFields.entries()]
      .map(([normalized, value]) => ({ normalized, ...value }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  unassignedOntologyFields(): Array<{ normalized: string; name: string; count: number }> {
    const h = this.plugin.settings.hierarchy;
    const assigned = new Set([
      ...h.hidden, ...h.parents, ...h.children, ...h.leftFriends, ...h.rightFriends, ...h.previous, ...h.next, ...h.exclusions,
      this.plugin.settings.noteTypeField, this.plugin.settings.primaryTagField,
    ].map((name) => name.toLowerCase().replaceAll(" ", "-").trim()));
    return this.discoveredFields().filter((field) => !assigned.has(field.normalized));
  }

  cancelRebuild(): void {
    this.bodyWarmGeneration += 1;
    if (!this.building) return;
    this.generation += 1;
    this.rebuildQueued = false;
  }

  /**
   * Prime the durable parsed-body cache before a large iOS cold build.
   *
   * Obsidian's own metadata cache already gives K-Plex the vault tree and ordinary links, but
   * inline ontology/URL parsing still requires Markdown bodies. Reading ten thousand files while
   * simultaneously retaining a complete second graph snapshot is a poor iOS memory pattern. This
   * pass therefore does only I/O + parsing + small transactional IndexedDB checkpoints. The full
   * GraphBuilder then consumes durable hits without re-reading the vault. Interrupted runs resume
   * from the committed body records rather than starting from file zero.
   */
  async prewarmBodyCache(isCurrent: () => boolean = () => true): Promise<boolean> {
    const run = ++this.bodyWarmGeneration;
    const current = () => run === this.bodyWarmGeneration && isCurrent();
    const files = this.app.vault.getMarkdownFiles();
    if (!files.length) return true;

    const storeReady = await this.indexedDb.bodyStoreReady();
    if (!storeReady || !current()) return false;

    const lookupBatchSize = Platform.isIosApp ? 96 : Platform.isMobile ? 160 : 384;
    const readConcurrency = Platform.isIosApp ? 4 : Platform.isMobile ? 4 : 8;
    const writeBatchSize = Platform.isIosApp ? 24 : Platform.isMobile ? 64 : 160;
    const pendingWrites: Array<{ path: string; mtime: number; body: ParsedBodyMetadata }> = [];

    const flush = async (): Promise<boolean> => {
      if (!pendingWrites.length) return current();
      const batch = pendingWrites.splice(0, pendingWrites.length);
      return (await this.indexedDb.putBodies(batch)) && current();
    };

    for (let batchStart = 0; batchStart < files.length; batchStart += lookupBatchSize) {
      if (!current()) return false;
      const batch = files.slice(batchStart, batchStart + lookupBatchSize);
      const lookupRequests: Array<{ path: string; mtime: number }> = [];
      const needsLookup: TFile[] = [];
      for (const file of batch) {
        const hot = this.fieldCache.get(file.path);
        if (hot?.mtime === file.stat.mtime) continue;
        needsLookup.push(file);
        lookupRequests.push({ path: file.path, mtime: file.stat.mtime });
      }

      const durable = await this.indexedDb.getBodies(lookupRequests);
      if (!current()) return false;
      const misses = needsLookup.filter((file) => !durable.has(file.path));

      for (let readStart = 0; readStart < misses.length; readStart += readConcurrency) {
        if (!current()) return false;
        const group = misses.slice(readStart, readStart + readConcurrency);
        // Parallelize only native file reads. Parsing remains sequential and low-memory on iOS.
        const contents = await Promise.all(group.map(async (file) => ({ file, content: await this.app.vault.read(file) })));
        if (!current()) return false;
        for (const { file, content } of contents) {
          const body = await this.metadataParser.parse(content);
          if (!current()) return false;
          pendingWrites.push({ path: file.path, mtime: file.stat.mtime, body });
          if (pendingWrites.length >= writeBatchSize && !(await flush())) return false;
        }
      }

      // Give WebKit a real paint/autorelease opportunity between native I/O waves rather than
      // one long chain of micro-yields. This is intentionally longer than setTimeout(0).
      if (Platform.isIosApp) await new Promise<void>((resolve) => window.setTimeout(resolve, 24));
      else if (Platform.isMobile) await new Promise<void>((resolve) => window.setTimeout(resolve, 8));
    }

    return (await flush()) && current();
  }

  /** Stop deferred/full-cache writes when no K-Plex surface is visible. A stale complete snapshot
   * remains safe because the next startup reconciles changed Markdown mtimes incrementally. */
  cancelPendingPersistence(): void {
    if (this.snapshotPersistTimer !== null) {
      window.clearTimeout(this.snapshotPersistTimer);
      this.snapshotPersistTimer = null;
    }
    this.snapshotPersistGeneration += 1;
  }

  destroy(): void {
    this.bodyWarmGeneration += 1;
    this.snapshotHydrationRun += 1;
    this.snapshotHydrationTask = null;
    if (this.snapshotPersistTimer !== null) window.clearTimeout(this.snapshotPersistTimer);
    if (this.orphanCleanupTimer !== null) window.clearTimeout(this.orphanCleanupTimer);
    this.searchCandidateCache.clear();
    this.searchEntryByPath.clear();
    this.titleCache.clear();
    this.listeners.clear();
    this.indexedDb.close();
    this.metadataParser.destroy();
  }

  private snapshotPath(): string | null {
    const dir = this.plugin.manifest?.dir;
    return dir ? `${dir}/kplex-index-snapshot-v1.json` : null;
  }

  private snapshotManifestPath(): string | null {
    const dir = this.plugin.manifest?.dir;
    return dir ? `${dir}/kplex-index-snapshot-v2.json` : null;
  }

  private snapshotChunkPath(generation: string, kind: "pages" | "evidence", index: number): string | null {
    const dir = this.plugin.manifest?.dir;
    return dir ? `${dir}/kplex-index-${generation}-${kind}-${String(index).padStart(4, "0")}.json` : null;
  }

  private async yieldSnapshotWork(): Promise<void> {
    if (!Platform.isMobile) return;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }

  private publishRestoredState(next: ReturnType<typeof createGraphState>, rebuildSearch = true): void {
    this.state = next;
    this.titleCache.clear();
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    if (rebuildSearch) this.rebuildSearchIndex();
    this.emit();
  }

  private async publishSnapshotPreview(meta: IndexedDbSnapshotMeta, seedPaths: readonly string[]): Promise<boolean> {
    if (meta.schema < 2) return false;
    const seeds = [...new Set([
      ...seedPaths,
      this.plugin.settings.lastActivePath,
      ...this.plugin.settings.pinnedNodes,
    ].filter((path): path is string => typeof path === "string" && path.length > 0))];
    if (!seeds.length) {
      return false;
    }

    const savedByPath = new Map<string, PersistedPage>();
    let frontier = [...(await this.indexedDb.getPages(meta.generation, seeds)).values()];
    for (const page of frontier) savedByPath.set(page.path, page);
    if (!frontier.length) {
      return false;
    }

    // One relation hop is enough for the central note and its direct neighbours. Keeping the startup
    // preview to that first hop avoids a second targeted IndexedDB fetch delaying first paint;
    // the complete graph continues hydrating immediately in the background.
    const maxItems = Math.max(8, this.plugin.settings.maxItemCount);
    const previewLimit = Platform.isMobile ? Math.max(120, Math.min(480, maxItems * 10)) : Math.max(240, Math.min(900, maxItems * 16));
    for (let depth = 0; depth < 1 && frontier.length && savedByPath.size < previewLimit; depth += 1) {
      const wanted: string[] = [];
      const seenWanted = new Set<string>();
      for (const page of frontier) {
        for (const relation of page.relations ?? []) {
          if (savedByPath.has(relation.targetPath) || seenWanted.has(relation.targetPath)) continue;
          seenWanted.add(relation.targetPath);
          wanted.push(relation.targetPath);
          if (savedByPath.size + wanted.length >= previewLimit) break;
        }
        if (savedByPath.size + wanted.length >= previewLimit) break;
      }
      if (!wanted.length) break;
      const fetched = await this.indexedDb.getPages(meta.generation, wanted);
      frontier = [...fetched.values()];
      for (const page of frontier) savedByPath.set(page.path, page);
    }

    const next = createGraphState();
    for (const saved of savedByPath.values()) addPersistedPageToState(next, saved, this.app);
    for (const saved of savedByPath.values()) hydratePersistedPageRelations(next, saved);
    next.discoveredFields = new Map(meta.discoveredFields);
    this.fullSnapshotHydrated = false;
    this.previewSnapshotPublished = true;
    this.restoredPatchPlanAvailable = false;
    this.publishRestoredState(next);
    return true;
  }

  private async restoreFullIndexedDbSnapshot(
    meta: IndexedDbSnapshotMeta,
    fresh: boolean,
    run: number,
  ): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }> {
    const isCurrent = () => run === this.snapshotHydrationRun;
    const next = createGraphState();
    const persistedPhysicalPaths = new Set<string>();
    const modifiedMarkdownPaths = new Set<string>();
    let persistedFilePages = 0;
    let reboundFilePages = 0;
    const missingFileBindings = new Set<string>();
    // Old schema-2 desktop snapshots use one slow page cursor. Retain those decoded records so we
    // do not pay the same cursor cost twice. Chunked snapshots are cheap to stream a second time,
    // so avoid retaining 100k+ duplicate serialized page objects in memory.
    const retainedPages = !Platform.isMobile && !this.indexedDb.snapshotUsesChunks(meta) ? [] as PersistedPage[] : null;

    const pagesOk = await this.indexedDb.iterateSnapshotPages(meta, (page) => {
      retainedPages?.push(page);
      addPersistedPageToState(next, page, this.app);
      if (page.filePath) {
        persistedPhysicalPaths.add(page.filePath);
        persistedFilePages += 1;
        const rebound = next.pages.get(page.path)?.file;
        if (rebound) {
          reboundFilePages += 1;
          if (rebound.extension === "md" && typeof page.mtime === "number" && rebound.stat.mtime !== page.mtime) modifiedMarkdownPaths.add(rebound.path);
        } else missingFileBindings.add(page.path);
      }
    });
    if (!pagesOk || !isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };

    if (missingFileBindings.size) {
      const delays = Platform.isMobile ? [120, 320, 700] : [80];
      for (const delay of delays) {
        if (!missingFileBindings.size || !isCurrent()) break;
        await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
        for (const path of [...missingFileBindings]) {
          const page = next.pages.get(path);
          const file = this.app.vault.getAbstractFileByPath(path);
          if (!page || !(file instanceof TFile)) continue;
          page.file = file;
          if (file.extension === "md" && typeof page.mtime === "number" && file.stat.mtime !== page.mtime) modifiedMarkdownPaths.add(file.path);
          missingFileBindings.delete(path);
          reboundFilePages += 1;
        }
      }
    }

    const currentPhysicalPaths = new Set(this.app.vault.getFiles().map((file) => file.path));
    let structuralMismatch = currentPhysicalPaths.size !== persistedPhysicalPaths.size;
    if (!structuralMismatch) {
      for (const path of currentPhysicalPaths) {
        if (!persistedPhysicalPaths.has(path)) { structuralMismatch = true; break; }
      }
    }

    // Persisted page records already carry resolved neighbour relations. Hydrate those before the
    // much larger evidence store so a complete navigable graph can be published as soon as the
    // page snapshot is available. Evidence/provenance continues loading in the background.
    let relationsHydrated = meta.schema >= 2;
    let hydratedPageCount = 0;
    let hydratedRelationCount = 0;
    if (relationsHydrated) {
      let relationsComplete = true;
      if (retainedPages) {
        for (const saved of retainedPages) {
          hydratedPageCount += 1;
          hydratedRelationCount += saved.relations?.length ?? 0;
          if (!hydratePersistedPageRelations(next, saved)) relationsComplete = false;
        }
      } else {
        const relationPassOk = await this.indexedDb.iterateSnapshotPages(meta, (saved) => {
          hydratedPageCount += 1;
          hydratedRelationCount += saved.relations?.length ?? 0;
          if (!hydratePersistedPageRelations(next, saved)) relationsComplete = false;
        });
        relationsHydrated = relationPassOk && relationsComplete;
      }
      if (retainedPages) relationsHydrated = relationsComplete;
    }
    if (!isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };

    if (relationsHydrated) {
      // Publish a page-only state with complete resolved relations and empty provenance. This is a
      // deliberate progressive-hydration boundary: navigation/search can work immediately while
      // the private `next` state continues loading evidence. Do not expose partially-loaded
      // evidence itself.
      next.discoveredFields = new Map(meta.discoveredFields);
      const pagePreview = createGraphState();
      pagePreview.pages = next.pages;
      pagePreview.lowercasePathMap = next.lowercasePathMap;
      pagePreview.discoveredFields = next.discoveredFields;
      this.fullSnapshotHydrated = false;
      this.fullSnapshotFresh = false;
      this.previewSnapshotPublished = true;
      this.restoredPatchPlanAvailable = false;
      this.publishRestoredState(pagePreview);
    }

    const evidenceOk = await this.indexedDb.iterateSnapshotEvidence(meta, (item) => addPersistedEvidenceToState(next, item));
    if (!evidenceOk || !isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };
    next.discoveredFields = new Map(meta.discoveredFields);

    // Schema-1/early schema-2 snapshots without cached relations still need the authoritative
    // resolver after evidence has loaded. New schema-3 snapshots take the fast relation path above.
    if (!relationsHydrated) {
      const resolved = await finalizeHydratedGraphStateCooperative(
        next,
        isCurrent,
        Platform.isIosApp ? 96 : Platform.isMobile ? 160 : 400,
      );
      if (!resolved) return { restored: false, fresh: false, createdAt: meta.createdAt };
    }
    if (!isCurrent()) return { restored: false, fresh: false, createdAt: meta.createdAt };

    const authoritativeFresh = fresh && !structuralMismatch && missingFileBindings.size === 0;
    // The earlier page-only publication uses this same `next.pages` map. Evidence hydration does
    // not alter searchable page metadata, so avoid allocating/sorting the 100k+ search index a
    // second time when promoting the fully hydrated state.
    this.publishRestoredState(next, !relationsHydrated);
    this.fullSnapshotHydrated = true;
    this.fullSnapshotFresh = authoritativeFresh;
    this.previewSnapshotPublished = false;
    this.restoredModifiedMarkdownPaths = [...modifiedMarkdownPaths];
    this.restoredStructuralMismatch = structuralMismatch || missingFileBindings.size > 0;
    this.restoredPatchPlanAvailable = !this.restoredStructuralMismatch;

    if (!relationsHydrated) this.scheduleSnapshotPersist(5000);
    else if (!this.indexedDb.snapshotUsesChunks(meta) && !Platform.isIosApp) {
      // One background migration turns the old 356k-record cursor restore into a few hundred
      // chunk reads on the next launch. Delay it so first paint and Obsidian startup stay quiet.
      this.scheduleSnapshotPersist(8000);
    }
    // Previous builds could leave incomplete generations behind when a snapshot write was
    // cancelled by another edit. Discover/clean those only after the active graph is usable.
    this.scheduleOrphanCleanup(meta.generation);

    return { restored: true, fresh: authoritativeFresh, createdAt: meta.createdAt };
  }

  private async restoreIndexedDbSnapshot(seedPaths: readonly string[] = []): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null; partial?: boolean }> {
    const meta = await this.indexedDb.readSnapshotMeta();
    this.activeSnapshotGeneration = meta?.generation ?? null;
    if (!meta) return { restored: false, fresh: false, createdAt: null };
    if (meta.settingsSignature !== computeIndexSettingsSignature(this.plugin.settings)) {
      return { restored: false, fresh: false, createdAt: meta.createdAt };
    }

    const currentVaultSignature = computeVaultSignature(this.app);
    const fresh = meta.vaultSignature === currentVaultSignature;

    const previewPublished = await this.publishSnapshotPreview(meta, seedPaths);
    const run = ++this.snapshotHydrationRun;
    this.fullSnapshotHydrated = false;
    this.fullSnapshotFresh = false;
    const task = this.restoreFullIndexedDbSnapshot(meta, fresh, run).catch((error) => {
      return { restored: false, fresh: false, createdAt: meta.createdAt };
    });
    this.snapshotHydrationTask = task;
    void task.finally(() => {
      if (run === this.snapshotHydrationRun && this.snapshotHydrationTask === task) this.snapshotHydrationTask = null;
    }).catch(() => { /* task is normalized above; finalizer must never surface */ });

    if (previewPublished) {
      return { restored: true, fresh, createdAt: meta.createdAt, partial: true };
    }

    const full = await task;
    return full;
  }

  hasPendingSnapshotHydration(): boolean {
    return this.snapshotHydrationTask !== null;
  }

  isFullSnapshotHydrated(): boolean {
    return this.fullSnapshotHydrated;
  }

  async waitForSnapshotHydration(): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }> {
    const task = this.snapshotHydrationTask;
    if (!task) return { restored: this.fullSnapshotHydrated, fresh: this.fullSnapshotFresh, createdAt: null };
    return task;
  }

  hasIncrementalRestorePatch(): boolean {
    return this.restoredPatchPlanAvailable && !this.restoredStructuralMismatch;
  }

  /** Patch modified Markdown sources into a restored snapshot without rebuilding the whole vault. */
  async reconcileRestoredSnapshot(): Promise<{ reconciled: boolean; patched: number }> {
    if (!this.restoredPatchPlanAvailable || this.restoredStructuralMismatch) return { reconciled: false, patched: 0 };
    const paths = [...this.restoredModifiedMarkdownPaths];
    if (!paths.length) return { reconciled: true, patched: 0 };
    if (this.building) return { reconciled: false, patched: 0 };

    const files: TFile[] = [];
    for (const path of paths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile) || file.extension !== "md") return { reconciled: false, patched: 0 };
      files.push(file);
    }

    this.building = true;
    const run = ++this.generation;
    try {
      const builder = new GraphBuilder(
        this.plugin,
        this.app,
        this.fieldCache,
        this.metadataParser,
        this.indexedDb,
        () => run === this.generation,
      );
      const result = await builder.patchMarkdownFiles(this.state, files, { useDurableCache: true, awaitBodyWrite: false });
      if (!result.ok || run !== this.generation) return { reconciled: false, patched: 0 };
      this.invalidatePatchedPages(result.touchedPagePaths);
      this.patchSearchIndex(result.touchedPagePaths);
      this.restoredModifiedMarkdownPaths = [];
      this.restoredPatchPlanAvailable = false;
      if (result.semanticChanges > 0) this.emit();
      this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
      this.deferOrphanCleanup();
        return { reconciled: true, patched: files.length };
    } finally {
      this.building = false;
    }
  }

  /** Incrementally replace declarations owned by already-indexed Markdown files.
   * Used for normal metadataCache.changed events so editing one note does not rebuild a large vault. */
  async patchMarkdownPaths(paths: readonly string[]): Promise<{ patched: boolean; count: number }> {
    if (this.building || !paths.length) return { patched: false, count: 0 };
    // User activity outranks background snapshot maintenance. Incomplete snapshot generations are
    // unreachable and are removed later during a long quiet period instead of blocking this edit.
    this.cancelPendingPersistence();
    this.deferOrphanCleanup();
    const files: TFile[] = [];
    for (const path of [...new Set(paths)]) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile) || file.extension !== "md" || !this.get(path)) return { patched: false, count: 0 };
      files.push(file);
    }
    if (!files.length) return { patched: true, count: 0 };

    this.building = true;
    const run = ++this.generation;
    try {
      const builder = new GraphBuilder(
        this.plugin, this.app, this.fieldCache, this.metadataParser, this.indexedDb,
        () => run === this.generation,
      );
      const result = await builder.patchMarkdownFiles(this.state, files, { useDurableCache: false, awaitBodyWrite: false });
      if (!result.ok || run !== this.generation) return { patched: false, count: 0 };
      this.invalidatePatchedPages(result.touchedPagePaths);
      this.patchSearchIndex(result.touchedPagePaths);
      if (result.semanticChanges > 0) this.emit();
      this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
      this.deferOrphanCleanup();
        return { patched: true, count: files.length };
    } finally {
      this.building = false;
    }
  }

  private async restoreChunkedSnapshot(): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null }> {
    const manifestPath = this.snapshotManifestPath();
    if (!manifestPath || !(await this.app.vault.adapter.exists(manifestPath))) {
      return { restored: false, fresh: false, createdAt: null };
    }
    try {
      const raw = await this.app.vault.adapter.read(manifestPath);
      const parsed: unknown = JSON.parse(raw);
      if (!isPersistedIndexManifestV2(parsed)) return { restored: false, fresh: false, createdAt: null };
      const manifest = parsed as PersistedIndexManifestV2;
      if (manifest.settingsSignature !== computeIndexSettingsSignature(this.plugin.settings)) {
        return { restored: false, fresh: false, createdAt: manifest.createdAt };
      }

      const next = createGraphState();
      for (let i = 0; i < manifest.pageChunkCount; i += 1) {
        const path = this.snapshotChunkPath(manifest.generation, "pages", i);
        if (!path || !(await this.app.vault.adapter.exists(path))) throw new Error("Missing K-Plex page snapshot chunk");
        const chunk = JSON.parse(await this.app.vault.adapter.read(path)) as PersistedPage[];
        if (!Array.isArray(chunk)) throw new Error("Invalid K-Plex page snapshot chunk");
        for (const saved of chunk) addPersistedPageToState(next, saved, this.app);
        await this.yieldSnapshotWork();
      }
      for (let i = 0; i < manifest.evidenceChunkCount; i += 1) {
        const path = this.snapshotChunkPath(manifest.generation, "evidence", i);
        if (!path || !(await this.app.vault.adapter.exists(path))) throw new Error("Missing K-Plex evidence snapshot chunk");
        const chunk = JSON.parse(await this.app.vault.adapter.read(path)) as PersistedEvidenceDeclaration[];
        if (!Array.isArray(chunk)) throw new Error("Invalid K-Plex evidence snapshot chunk");
        for (const declaration of chunk) addPersistedEvidenceToState(next, declaration);
        await this.yieldSnapshotWork();
      }
      next.discoveredFields = new Map(manifest.discoveredFields);
      const resolved = await finalizeHydratedGraphStateCooperative(
        next,
        () => true,
        Platform.isIosApp ? 50 : Platform.isMobile ? 100 : 240,
      );
      if (!resolved) return { restored: false, fresh: false, createdAt: manifest.createdAt };
      this.publishRestoredState(next);
      const fresh = manifest.vaultSignature === computeVaultSignature(this.app);
      // A previous iOS/WebView termination may have interrupted a new generation after some
      // chunks were written but before its manifest became authoritative. Remove those orphaned
      // chunks now so repeated crashes can never accumulate stale cache generations forever.
      void this.cleanupSnapshotOrphans(manifest.generation);
      return { restored: true, fresh, createdAt: manifest.createdAt };
    } catch {
      // A cache is never authoritative. Missing/corrupt chunks fall through to the legacy cache
      // or a normal rebuild without preventing K-Plex from opening.
      return { restored: false, fresh: false, createdAt: null };
    }
  }

  /**
   * Restore the last complete semantic graph before any expensive Markdown parsing. Snapshot v2
   * is chunked so iOS never has to parse/stringify the entire graph as one enormous temporary
   * string/object. A v1 file is still accepted once for seamless migration.
   */
  async restorePersistedSnapshot(seedPaths: readonly string[] = []): Promise<{ restored: boolean; fresh: boolean; createdAt: number | null; partial?: boolean }> {
    // IndexedDB is the sole active graph cache. A small neighborhood is published first from
    // targeted page reads; full graph hydration continues independently in the background.
    const indexed = await this.restoreIndexedDbSnapshot(seedPaths);
    void this.cleanupLegacySnapshotFiles();
    return indexed;
  }

  private async cleanupLegacySnapshotFiles(): Promise<void> {
    try {
      const legacyManifest = await this.readSnapshotManifest();
      await this.removeSnapshotGeneration(legacyManifest);
      for (const path of [this.snapshotManifestPath(), this.snapshotPath()]) {
        if (!path) continue;
        try { if (await this.app.vault.adapter.exists(path)) await this.app.vault.adapter.remove(path); } catch { /* migration cleanup only */ }
      }
      if (legacyManifest) await this.cleanupSnapshotOrphans(legacyManifest.generation);
    } catch {
      // Cache housekeeping is best-effort and must never delay graph restoration.
    }
  }

  private async cleanupSnapshotOrphans(activeGeneration: string): Promise<void> {
    const dir = this.plugin.manifest?.dir;
    if (!dir) return;
    try {
      const listing = await this.app.vault.adapter.list(dir);
      const activePrefix = `${dir}/kplex-index-${activeGeneration}-`;
      for (const path of listing.files) {
        if (!path.startsWith(`${dir}/kplex-index-`) || path.startsWith(`${dir}/kplex-index-snapshot-`)) continue;
        if (!/-(?:pages|evidence)-\d+\.json$/.test(path)) continue;
        if (path.startsWith(activePrefix)) continue;
        try { await this.app.vault.adapter.remove(path); } catch { /* orphan cleanup only */ }
      }
    } catch {
      // Cache housekeeping must never interfere with index restoration.
    }
  }

  private async removeSnapshotGeneration(manifest: PersistedIndexManifestV2 | null): Promise<void> {
    if (!manifest) return;
    for (let i = 0; i < manifest.pageChunkCount; i += 1) {
      const path = this.snapshotChunkPath(manifest.generation, "pages", i);
      if (path) try { if (await this.app.vault.adapter.exists(path)) await this.app.vault.adapter.remove(path); } catch { /* cache cleanup only */ }
    }
    for (let i = 0; i < manifest.evidenceChunkCount; i += 1) {
      const path = this.snapshotChunkPath(manifest.generation, "evidence", i);
      if (path) try { if (await this.app.vault.adapter.exists(path)) await this.app.vault.adapter.remove(path); } catch { /* cache cleanup only */ }
    }
  }

  private async readSnapshotManifest(): Promise<PersistedIndexManifestV2 | null> {
    const path = this.snapshotManifestPath();
    if (!path) return null;
    try {
      if (!(await this.app.vault.adapter.exists(path))) return null;
      const parsed: unknown = JSON.parse(await this.app.vault.adapter.read(path));
      return isPersistedIndexManifestV2(parsed) ? parsed : null;
    } catch { return null; }
  }

  private async persistIndexedDbSnapshot(run: number): Promise<void> {
    if (run !== this.snapshotPersistGeneration || this.state.pages.size === 0) return;
    const pages = function* (state: typeof this.state): IterableIterator<PersistedPage> {
      for (const page of state.pages.values()) {
        if (!page.transient) yield persistedPageFromGraphPage(page);
      }
    }.call(this, this.state);

    const evidence = function* (state: typeof this.state): IterableIterator<PersistedEvidenceDeclaration> {
      for (const item of state.evidence.declarations()) yield persistedDeclarationFromEvidence(item);
    }.call(this, this.state);

    const vaultSignature = computeVaultSignature(this.app);
    const settingsSignature = computeIndexSettingsSignature(this.plugin.settings);
    const persisted = await this.indexedDb.writeSnapshot({
      createdAt: Date.now(),
      vaultSignature,
      settingsSignature,
      discoveredFields: [...this.state.discoveredFields.entries()],
    }, pages, evidence, () => run === this.snapshotPersistGeneration);

    if (!persisted || run !== this.snapshotPersistGeneration) {
      return;
    }
    const latestMeta = await this.indexedDb.readSnapshotMeta();
    if (latestMeta?.generation) this.scheduleOrphanCleanup(latestMeta.generation);
    // Clean legacy file-based snapshots only after IndexedDB has had a chance to become
    // authoritative. Failures are harmless; they are ignored on the next startup once IDB loads.
    const legacyManifest = await this.readSnapshotManifest();
    await this.removeSnapshotGeneration(legacyManifest);
    for (const path of [this.snapshotManifestPath(), this.snapshotPath()]) {
      if (!path) continue;
      try { if (await this.app.vault.adapter.exists(path)) await this.app.vault.adapter.remove(path); } catch { /* migration cleanup only */ }
    }
  }

  private scheduleSnapshotPersist(delayOverride?: number): void {
    if (this.snapshotPersistTimer !== null) {
      window.clearTimeout(this.snapshotPersistTimer);
    }
    const run = ++this.snapshotPersistGeneration;
    const delay = delayOverride ?? (Platform.isIosApp ? 12000 : Platform.isMobile ? 8000 : 5000);
    this.snapshotPersistTimer = window.setTimeout(() => {
      this.snapshotPersistTimer = null;
      void this.persistIndexedDbSnapshot(run).catch(() => { /* persistence is an optimization only */ });
    }, delay);
  }

  /** Build a complete graph off to the side, then atomically publish it. */
  async rebuild(): Promise<boolean> {
    if (this.building) {
      // Main.ts coalesces dirty events and will request one follow-up rebuild after this one.
      // Never invalidate useful work merely because MetadataCache emitted another startup event:
      // that cancellation loop was particularly harmful on slower mobile devices.
      this.rebuildQueued = true;
      return false;
    }
    this.building = true;
    const run = ++this.generation;
    try {
      const builder = new GraphBuilder(
        this.plugin,
        this.app,
        this.fieldCache,
        this.metadataParser,
        this.indexedDb,
        () => run === this.generation,
      );
      const next = await builder.build();
      if (!next || run !== this.generation) {
        return false;
      }

      // Atomic graph-state swap: readers never observe a half-built graph.
      this.state = next;
      this.fullSnapshotHydrated = true;
      this.fullSnapshotFresh = true;
      this.previewSnapshotPublished = false;
      this.titleCache.clear();
      this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
        this.rebuildSearchIndex();
        this.emit();
        this.scheduleSnapshotPersist();
        return true;
    } finally {
      this.building = false;
      this.rebuildQueued = false;
    }
  }

  private makeSearchEntry(page: GraphPage): SearchEntry {
    return {
      page,
      name: page.name.toLowerCase(),
      aliases: page.aliases.map((alias) => alias.toLowerCase()),
      path: page.path.toLowerCase(),
    };
  }

  private rebuildSearchIndex(): void {
    this.searchCandidateCache.clear();
    this.searchEntryByPath.clear();
    this.searchEntries = [];
    for (const page of this.state.pages.values()) {
      const entry = this.makeSearchEntry(page);
      this.searchEntries.push(entry);
      this.searchEntryByPath.set(page.path, entry);
    }
  }

  /** Update only entries whose source/target page may have changed during a Markdown patch. */
  private patchSearchIndex(paths: Iterable<string>): void {
    this.searchCandidateCache.clear();
    for (const path of new Set(paths)) {
      const page = this.get(path);
      if (!page) continue;
      const existing = this.searchEntryByPath.get(page.path);
      if (existing) {
        const next = this.makeSearchEntry(page);
        existing.page = next.page;
        existing.name = next.name;
        existing.aliases = next.aliases;
        existing.path = next.path;
      } else {
        const entry = this.makeSearchEntry(page);
        this.searchEntries.push(entry);
        this.searchEntryByPath.set(page.path, entry);
      }
    }
  }

  private invalidatePatchedPages(paths: Iterable<string>): void {
    for (const path of paths) {
      this.titleCache.delete(path);
      const page = this.get(path);
      if (page) this.relationViewCache.delete(page);
    }
  }

  private scheduleOrphanCleanup(activeGeneration: string): void {
    this.activeSnapshotGeneration = activeGeneration;
    if (this.orphanCleanupTimer !== null) window.clearTimeout(this.orphanCleanupTimer);
    this.orphanCleanupTimer = window.setTimeout(() => {
      this.orphanCleanupTimer = null;
      const generation = this.activeSnapshotGeneration;
      if (!generation || this.building || this.snapshotPersistTimer !== null) {
        if (generation) this.scheduleOrphanCleanup(generation);
        return;
      }
      void this.indexedDb.cleanupOrphanGenerations(generation);
    }, SNAPSHOT_MAINTENANCE_IDLE_MS);
  }

  private deferOrphanCleanup(): void {
    if (this.activeSnapshotGeneration) this.scheduleOrphanCleanup(this.activeSnapshotGeneration);
  }

  relationshipStorageCandidates(sourcePath: string, targetPath: string): string[] {
    const editable = new Set<string>();
    for (const path of [sourcePath, targetPath]) {
      const page = this.get(path);
      if (page?.file?.extension === "md") editable.add(path);
    }
    if (!editable.size) return [];

    const evidence = this.state.evidence.between(sourcePath, targetPath);
    const rank = new Map<string, number>();
    const scoreKind = (kind: RelationEvidence["sourceKind"]): number => {
      if (kind === "frontmatter-ontology") return 0;
      if (kind === "inline-ontology") return 1;
      if (kind === "obsidian-link" || kind === "unresolved-link") return 2;
      return 4;
    };
    for (const item of evidence) {
      const declarer = item.declaredByPath;
      if (!editable.has(declarer)) continue;
      const score = scoreKind(item.sourceKind);
      rank.set(declarer, Math.min(rank.get(declarer) ?? Number.POSITIVE_INFINITY, score));
    }
    return [...editable].sort((a, b) => (rank.get(a) ?? 9) - (rank.get(b) ?? 9) || (a === sourcePath ? -1 : 1));
  }

  /**
   * Apply a relationship frontmatter edit directly to the live semantic graph. The subsequent
   * Obsidian metadata event is only a consistency signal; a one-property move must not rebuild a
   * 20k-note index or make the optimistic node jump back while a full scan runs.
   */
  applyRelationshipEdit(storagePath: string, targetPath: string, role: Exclude<EvidenceRole, "hidden">, field: string): boolean {
    const source = this.get(storagePath);
    const target = this.get(targetPath);
    if (!source || !target) return false;

    const pair = new Set([storagePath, targetPath]);
    this.state.evidence.removeDeclarationsTouching(storagePath, (item) =>
      item.sourceKind === "frontmatter-ontology" &&
      pair.has(item.declaredByPath) && pair.has(item.declaredTargetPath) &&
      item.declaredByPath !== item.declaredTargetPath
    );
    this.state.evidence.addPair(storagePath, targetPath, role, RelationType.DEFINED, LinkDirection.FROM, {
      sourceKind: "frontmatter-ontology",
      definition: field.toLowerCase().replaceAll(" ", "-").trim(),
      fieldName: field,
    });
    resolveEvidencePair(this.state.pages, this.state.evidence, storagePath, targetPath);
    resolveEvidencePair(this.state.pages, this.state.evidence, targetPath, storagePath);
    if (source.file) source.mtime = source.file.stat.mtime;
    this.relationViewCache = new WeakMap<GraphPage, CachedRelationView>();
    this.emit();
    this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
    return true;
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

  isVisiblePage(page: GraphPage, settings: ExcaliBrainSettings = this.plugin.settings): boolean {
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

      if (!this.isVisiblePage(relation.target, settings)) continue;
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
    const result = { center, parents, children, leftFriends, rightFriends, siblings };
    return result;
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
      const seen = new Set<string>();
      const preferred = [...this.searchEntryPointPaths, ...this.plugin.settings.pinnedNodes];
      for (const path of preferred) {
        const page = this.get(path);
        if (!page || seen.has(page.path) || !this.isVisiblePage(page, settings)) continue;
        seen.add(page.path);
        output.push(page);
        if (output.length >= max) return output;
      }
      for (const entry of this.searchEntries) {
        if (seen.has(entry.page.path) || !this.isVisiblePage(entry.page, settings)) continue;
        seen.add(entry.page.path);
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
      if (!this.isVisiblePage(entry.page, settings)) continue;
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
