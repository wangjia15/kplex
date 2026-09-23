import { getAllTags, Platform, TFile, TFolder, type App } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import { LinkDirection, RelationType, type GraphPage, type Relation } from "../types";
import {
  extractLinksFromValue,
  getInlineFieldOccurrences,
  getNormalizedFieldValues,
  getNormalizedFrontmatterValues,
  getNormalizedInlineFieldValues,
  mergeFileMetadata,
  normalizeFieldName,
  type ParsedBodyMetadata,
  type ParsedFileMetadata,
} from "./fieldParser";
import { MetadataParseCancelledError, type MetadataParser } from "./MetadataParser";
import type { KplexIndexedDbCache } from "./IndexedDbCache";
import type { EvidenceProvenance, EvidenceRole, EvidenceSourceKind } from "./RelationEvidence";
import { resolveEvidencePair, resolveEvidenceStoreCooperative } from "./RelationResolver";
import { createGraphState, getGraphPage, type GraphState } from "./GraphState";
import { perfNow } from "../util/perf";

export type FieldCacheEntry = {
  mtime: number;
  body: ParsedBodyMetadata;
  /** Runtime-only semantic fingerprint used to suppress graph work for drawing-only/format-only edits. */
  semanticSignature?: string;
};

export type PatchMarkdownResult = {
  ok: boolean;
  cancelled: boolean;
  touchedPagePaths: Set<string>;
  semanticChanges: number;
  semanticNoops: number;
};

export type PatchFileCommit = {
  sourcePath: string;
  touchedPagePaths: Set<string>;
  semanticChanged: boolean;
};

type FileRevision = {
  mtime: number;
  size: number;
};

const FILE_OWNED_EVIDENCE = new Set<EvidenceSourceKind>([
  "obsidian-link",
  "unresolved-link",
  "frontmatter-ontology",
  "inline-ontology",
  "body-url",
  "date-property",
]);

function flatten(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value === null || value === undefined) return [];
  return [value];
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

type ObsidianMomentInstance = {
  isValid(): boolean;
  format(format: string): string;
};

type ObsidianMomentFactory = (value: string, inputFormat: string, strict: boolean) => ObsidianMomentInstance;

/**
 * Render an Obsidian Date property with the vault's configured Daily Notes Moment format.
 *
 * Obsidian provides Moment at runtime on `window`. Do not import Moment into production code:
 * doing so either hits Obsidian's namespace-style typing mismatch or bundles a library that the
 * host already provides. This mirrors the long-standing approach used by Obsidian Tasks.
 */
function formatDailyDate(isoDate: string, format: string): string | null {
  const obsidianMoment = (window as unknown as { moment: ObsidianMomentFactory }).moment;
  const parsed = obsidianMoment(isoDate, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed.format(format) : null;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableSemanticValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSemanticValue);
  if (!isUnknownRecord(value)) return value;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    if (key === "position") continue;
    output[key] = stableSemanticValue(value[key]);
  }
  return output;
}

/** A compact, versioned equality token for semantic inputs. Four independent 32-bit lanes plus
 * the serialized byte/character length make accidental collisions impractical without retaining
 * the full per-file JSON in memory. This is deliberately wider than a single short hash because
 * fingerprint equality suppresses graph work after the body LRU has been evicted. */
function compactFingerprint(serialized: string): string {
  let a = 2166136261 >>> 0;
  let b = 3339675911 >>> 0;
  let c = 374761393 >>> 0;
  let d = 668265263 >>> 0;
  for (let i = 0; i < serialized.length; i += 1) {
    const code = serialized.charCodeAt(i);
    a = Math.imul(a ^ code, 16777619) >>> 0;
    b = Math.imul(b ^ (code + i), 2246822519) >>> 0;
    c = Math.imul(c ^ (code + (i << 1)), 3266489917) >>> 0;
    d = Math.imul(d ^ (code + (i >>> 1)), 2654435761) >>> 0;
  }
  return [serialized.length, a, b, c, d].map((value) => value.toString(36)).join(":");
}

/**
 * Builds a complete graph snapshot from vault inputs. It does not publish state or service UI
 * queries; those responsibilities belong to GraphIndex. All collectors emit provenance-bearing
 * evidence and relationship resolution happens once, after collection is complete.
 */
export class GraphBuilder {
  private sliceStartedAt = perfNow();
  private patchTouchedPagePaths: Set<string> | null = null;
  private readonly semanticFrontmatterFields: Set<string>;
  private readonly semanticInlineFields: Set<string>;

  constructor(
    private plugin: ExcaliBrainPlugin,
    private app: App,
    private fieldCache: Map<string, FieldCacheEntry>,
    private metadataParser: MetadataParser,
    private bodyCache: KplexIndexedDbCache,
    private isCurrent: () => boolean,
    private semanticFingerprints: Map<string, string> = new Map(),
  ) {
    const hierarchy = plugin.settings.hierarchy;
    this.semanticFrontmatterFields = new Set([
      "aliases", "alias", "tags", "tag",
      plugin.settings.noteTypeField,
      plugin.settings.primaryTagField,
      plugin.settings.thumbnailProperty,
      plugin.settings.nodeImageProperty,
      ...hierarchy.hidden,
      ...hierarchy.parents,
      ...hierarchy.children,
      ...hierarchy.leftFriends,
      ...hierarchy.rightFriends,
      ...hierarchy.previous,
      ...hierarchy.next,
    ].map(normalizeFieldName).filter(Boolean));
    this.semanticInlineFields = new Set([
      plugin.settings.noteTypeField,
      plugin.settings.primaryTagField,
      plugin.settings.thumbnailProperty,
      plugin.settings.nodeImageProperty,
      ...hierarchy.hidden,
      ...hierarchy.parents,
      ...hierarchy.children,
      ...hierarchy.leftFriends,
      ...hierarchy.rightFriends,
      ...hierarchy.previous,
      ...hierarchy.next,
    ].map(normalizeFieldName).filter(Boolean));
  }


  /**
   * Fingerprint only metadata that can affect K-Plex graph semantics. Arbitrary frontmatter
   * property names and values are intentionally excluded: lenses read them lazily from
   * MetadataCache, while field discovery is maintained separately from relationship invalidation.
   */
  private semanticSourceSignature(file: TFile, body: ParsedBodyMetadata): string {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter: Record<string, unknown> = { ...(cache?.frontmatter ?? {}) };
    delete frontmatter.position;

    const semanticFrontmatter: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(frontmatter)) {
      if (this.semanticFrontmatterFields.has(normalizeFieldName(key)) || this.isDateProperty(key)) {
        semanticFrontmatter[key] = stableSemanticValue(value);
      }
    }

    const tags = (cache?.tags ?? []).map((item: { tag: string }) => item.tag).sort();
    // Counts matter for presentation-only image suppression: one thumbnail link plus one ordinary
    // link must remain graph-semantic, while a single thumbnail-only link is suppressed.
    const resolved = Object.entries(this.app.metadataCache.resolvedLinks[file.path] ?? {}).sort(([a], [b]) => a.localeCompare(b));
    const unresolved = Object.entries(this.app.metadataCache.unresolvedLinks[file.path] ?? {}).sort(([a], [b]) => a.localeCompare(b));
    const relevantOccurrences = body.inlineFieldOccurrences
      .filter((item) => this.semanticInlineFields.has(item.normalizedName));
    const topologyBody = {
      fields: relevantOccurrences.map((item) => [item.normalizedName, item.value]),
      urls: body.urls.map((item) => [item.url, item.label ?? ""]),
    };
    const provenanceBody = {
      fields: relevantOccurrences.map((item) => [item.normalizedName, item.value, item.syntax, item.line, item.start, item.end]),
      urls: body.urls.map((item) => [item.url, item.label ?? "", item.line ?? 0]),
    };

    const topology = JSON.stringify({
      frontmatter: stableSemanticValue(semanticFrontmatter),
      tags,
      resolved,
      unresolved,
      body: topologyBody,
    });
    const provenance = JSON.stringify(provenanceBody);
    return `v2:${compactFingerprint(topology)}~${compactFingerprint(provenance)}`;
  }

  private topologySignature(signature: string | undefined): string | null {
    if (!signature?.startsWith("v2:")) return signature ?? null;
    const splitAt = signature.indexOf("~");
    return splitAt < 0 ? signature : signature.slice(0, splitAt);
  }

  private rememberFieldCache(path: string, entry: FieldCacheEntry): void {
    // Refresh insertion order so this remains a true small hot working set during long sessions.
    this.fieldCache.delete(path);
    this.fieldCache.set(path, entry);
    const hotLimit = Platform.isIosApp ? 48 : Platform.isMobile ? 160 : 1200;
    while (this.fieldCache.size > hotLimit) {
      const oldest = this.fieldCache.keys().next().value;
      if (!oldest) break;
      this.fieldCache.delete(oldest);
    }
  }

  async build(): Promise<GraphState | null> {
    const state = createGraphState();
    if (!(await this.addVaultTree(state))) return null;
    if (!(await this.addTagTree(state))) return null;
    if (!(await this.addResolvedLinks(state))) return null;
    if (!(await this.addUnresolvedLinks(state))) return null;
    if (!(await this.enrichMarkdownPages(state))) return null;
    if (!this.isCurrent()) return null;
    if (!(await resolveEvidenceStoreCooperative(
      state.pages,
      state.evidence,
      this.isCurrent,
      Platform.isIosApp ? 96 : Platform.isMobile ? 160 : 400,
    ))) return null;
    return state;
  }

  private async yieldToHost(force = false): Promise<boolean> {
    if (!this.isCurrent()) return false;
    const budgetMs = Platform.isIosApp ? 7 : Platform.isMobile ? 9 : 13;
    if (!force && perfNow() - this.sliceStartedAt < budgetMs) return true;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    this.sliceStartedAt = perfNow();
    return this.isCurrent();
  }

  private async parseBody(content: string): Promise<ParsedBodyMetadata | null> {
    try {
      return await this.metadataParser.parse(content);
    } catch (error) {
      if (error instanceof MetadataParseCancelledError || !this.isCurrent()) return null;
      throw error;
    }
  }

  private captureFileRevision(file: TFile): FileRevision {
    return { mtime: file.stat.mtime, size: file.stat.size };
  }

  private fileRevisionMatches(file: TFile, revision: FileRevision): boolean {
    return file.stat.mtime === revision.mtime && file.stat.size === revision.size;
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
      neighbours: params.neighbours ?? new Map<string, Relation>(),
      aliases: params.aliases ?? [],
      tags: params.tags ?? [],
      noteType: params.noteType ?? null,
      primaryStyleTag: params.primaryStyleTag ?? null,
      styleTags: params.styleTags ?? [],
      maxLabelLength: params.maxLabelLength ?? this.plugin.settings.baseNodeStyle.maxLabelLength ?? 30,
    };
  }

  private addPage(state: GraphState, page: GraphPage): void {
    state.pages.set(page.path, page);
    state.lowercasePathMap.set(page.path.toLowerCase(), page.path);
    this.patchTouchedPagePaths?.add(page.path);
  }

  private async addVaultTree(state: GraphState): Promise<boolean> {
    // Folder topology is a cheap structural layer sourced directly from Obsidian's in-memory
    // Vault tree. Keep it indexed regardless of current visibility so the toolbar can reveal or
    // hide folders instantly without scheduling a semantic rebuild.
    const root = this.createPage({ path: "folder:/", name: "/", isFolder: true });
    this.addPage(state, root);
    const stack: Array<{ folder: TFolder; parent: GraphPage }> = [{ folder: this.app.vault.getRoot(), parent: root }];
    let visited = 0;
    while (stack.length) {
      if (!this.isCurrent()) return false;
      const { folder, parent } = stack.pop()!;
      for (const item of folder.children) {
        if (item instanceof TFolder) {
          const node = this.createPage({ path: `folder:${item.path}`, name: item.name, isFolder: true });
          this.addPage(state, node);
          this.addEvidencePair(state, parent, node, "child", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "file-tree", definition: "file-tree" });
          stack.push({ folder: item, parent: node });
        } else if (item instanceof TFile) {
          const node = this.createPage({ path: item.path, name: item.extension === "md" ? item.basename : item.name, file: item });
          this.addPage(state, node);
          this.addEvidencePair(state, parent, node, "child", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "file-tree", definition: "file-tree" });
        }
        visited += 1;
        if (visited % 64 === 0 && !(await this.yieldToHost())) return false;
      }
      if (!(await this.yieldToHost())) return false;
    }
    return this.isCurrent();
  }

  private async addTagTree(state: GraphState): Promise<boolean> {
    // Tag topology comes entirely from Obsidian's MetadataCache; no Markdown body read or K-Plex
    // parser pass is needed. Build each unique hierarchy once, then attach cached memberships.
    // This keeps the structural layer cheap even when thousands of notes share the same tags.
    const membersByTag = new Map<string, GraphPage[]>();
    let scannedFiles = 0;
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!this.isCurrent()) return false;
      const page = getGraphPage(state, file.path);
      const cache = this.app.metadataCache.getFileCache(file);
      if (page && cache) {
        for (const rawTag of getAllTags(cache) ?? []) {
          const members = membersByTag.get(rawTag);
          if (members) members.push(page);
          else membersByTag.set(rawTag, [page]);
        }
      }
      scannedFiles += 1;
      if (scannedFiles % 128 === 0 && !(await this.yieldToHost())) return false;
    }

    let attached = 0;
    for (const [rawTag, members] of membersByTag) {
      if (!this.isCurrent()) return false;
      const tagPage = this.ensureTagPath(state, rawTag);
      if (!tagPage) continue;
      for (const page of members) {
        this.addEvidencePair(state, tagPage, page, "child", RelationType.DEFINED, LinkDirection.TO, { sourceKind: "tag-tree", definition: "tag-tree" });
        attached += 1;
        if (attached % 256 === 0 && !(await this.yieldToHost())) return false;
      }
    }
    return this.isCurrent();
  }

  private async addResolvedLinks(state: GraphState): Promise<boolean> {
    let visitedTargets = 0;
    for (const [sourcePath, targets] of Object.entries(this.app.metadataCache.resolvedLinks)) {
      if (!this.isCurrent()) return false;
      const source = getGraphPage(state, sourcePath);
      if (!source) continue;
      for (const targetPath of Object.keys(targets)) {
        const target = getGraphPage(state, targetPath);
        if (target) this.addInferredParentChild(state, source, target, "obsidian-link");
        visitedTargets += 1;
        if (visitedTargets % 64 === 0 && !(await this.yieldToHost())) return false;
      }
      if (!(await this.yieldToHost())) return false;
    }
    return this.isCurrent();
  }

  private async addUnresolvedLinks(state: GraphState): Promise<boolean> {
    let visitedTargets = 0;
    for (const [sourcePath, targets] of Object.entries(this.app.metadataCache.unresolvedLinks)) {
      if (!this.isCurrent()) return false;
      const source = getGraphPage(state, sourcePath);
      if (!source || sourcePath === this.plugin.settings.excalibrainFilepath) continue;
      for (const targetPath of Object.keys(targets)) {
        const target = this.ensureVirtual(state, targetPath);
        this.addInferredParentChild(state, source, target, "unresolved-link");
        visitedTargets += 1;
        if (visitedTargets % 64 === 0 && !(await this.yieldToHost())) return false;
      }
      if (!(await this.yieldToHost())) return false;
    }
    return this.isCurrent();
  }

  private async enrichMarkdownPages(state: GraphState): Promise<boolean> {
    const files = this.app.vault.getMarkdownFiles();
    const alive = new Set(files.map((file) => file.path));
    for (const cachedPath of this.fieldCache.keys()) {
      if (alive.has(cachedPath)) continue;
      this.fieldCache.delete(cachedPath);
      void this.bodyCache.deleteBody(cachedPath);
    }

    // A handful of medium IDB transactions is much cheaper than one transaction per note. Keep
    // native file reads bounded by both count and bytes so desktop cold start can overlap I/O
    // without retaining a whole vault of Markdown strings. iOS intentionally remains serial.
    const lookupBatchSize = Platform.isIosApp ? 64 : Platform.isMobile ? 96 : 256;
    const writeBatchSize = Platform.isIosApp ? 48 : Platform.isMobile ? 64 : 128;
    const readConcurrency = Platform.isIosApp ? 1 : Platform.isMobile ? 2 : 6;
    const readByteBudget = Platform.isIosApp ? 1.5 * 1024 * 1024 : Platform.isMobile ? 3 * 1024 * 1024 : 8 * 1024 * 1024;
    const pendingWrites: Array<{ path: string; mtime: number; body: ParsedBodyMetadata }> = [];

    const flushWrites = async (): Promise<boolean> => {
      if (!pendingWrites.length) return true;
      const batch = pendingWrites.splice(0, pendingWrites.length);
      await this.bodyCache.putBodies(batch);
      return this.isCurrent();
    };

    const readGroups = (input: TFile[]): TFile[][] => {
      const groups: TFile[][] = [];
      let current: TFile[] = [];
      let bytes = 0;
      for (const file of input) {
        const size = Math.max(1, file.stat.size || 0);
        if (current.length && (current.length >= readConcurrency || bytes + size > readByteBudget)) {
          groups.push(current);
          current = [];
          bytes = 0;
        }
        current.push(file);
        bytes += size;
        // A single huge file is allowed to exceed the byte budget, but never shares its group.
        if (bytes >= readByteBudget || current.length >= readConcurrency) {
          groups.push(current);
          current = [];
          bytes = 0;
        }
      }
      if (current.length) groups.push(current);
      return groups;
    };

    for (let batchStart = 0; batchStart < files.length; batchStart += lookupBatchSize) {
      if (!this.isCurrent()) return false;
      const batchFiles = files.slice(batchStart, batchStart + lookupBatchSize);
      const revisions = new Map(batchFiles.map((file) => [file.path, this.captureFileRevision(file)] as const));
      const misses = batchFiles.filter((file) => {
        const revision = revisions.get(file.path)!;
        const hot = this.fieldCache.get(file.path);
        return hot?.mtime !== revision.mtime;
      });
      const durable = await this.bodyCache.getBodies(misses.map((file) => ({
        path: file.path,
        mtime: revisions.get(file.path)!.mtime,
      })));
      if (!this.isCurrent()) return false;
      // TFile.stat is mutable. Never let an old body read be committed under a newer revision.
      // Abort this private full build if a source changed while the durable lookup was in flight;
      // Main.ts retains the dirty backlog and coalesces the replacement build.
      if (batchFiles.some((file) => !this.fileRevisionMatches(file, revisions.get(file.path)!))) return false;

      const fresh = new Map<string, ParsedBodyMetadata>();
      const needsRead = misses.filter((file) => !durable.has(file.path));
      for (const group of readGroups(needsRead)) {
        if (!this.isCurrent()) return false;
        const contents = await Promise.all(group.map(async (file) => ({
          file,
          revision: revisions.get(file.path)!,
          content: Platform.isMobile ? await this.app.vault.read(file) : await this.app.vault.cachedRead(file),
        })));
        if (!this.isCurrent()) return false;
        // One worker services parser requests serially. Awaiting each result avoids retaining cloned
        // payloads while still benefiting from overlapped native reads above.
        for (const { file, revision, content } of contents) {
          if (!this.fileRevisionMatches(file, revision)) return false;
          const body = await this.parseBody(content);
          if (!body || !this.isCurrent() || !this.fileRevisionMatches(file, revision)) return false;
          fresh.set(file.path, body);
          pendingWrites.push({ path: file.path, mtime: revision.mtime, body });
          if (pendingWrites.length >= writeBatchSize && !(await flushWrites())) return false;
        }
        if (!(await this.yieldToHost())) return false;
      }

      for (const file of batchFiles) {
        if (!this.isCurrent()) return false;
        const revision = revisions.get(file.path)!;
        if (!this.fileRevisionMatches(file, revision)) return false;
        const page = getGraphPage(state, file.path);
        if (!page) continue;

        let entry = this.fieldCache.get(file.path);
        if (!entry || entry.mtime !== revision.mtime) {
          const body = durable.get(file.path) ?? fresh.get(file.path);
          if (!body) return false;
          entry = { mtime: revision.mtime, body };
          this.rememberFieldCache(file.path, entry);
        }

        const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), entry.body);
        entry.semanticSignature = this.semanticSourceSignature(file, entry.body);
        this.semanticFingerprints.set(file.path, entry.semanticSignature);
        this.applyMetadata(state, page, file, meta);
        if (!(await this.yieldToHost())) return false;
      }
    }
    if (!(await flushWrites())) return false;
    return this.isCurrent();
  }

  /**
   * Re-index only modified Markdown sources on top of a hydrated semantic snapshot.
   *
   * This is the normal warm-start path for a large vault: restore the last complete graph from
   * IndexedDB, then replace declarations owned by the handful of files whose mtimes changed while
   * K-Plex was closed. Incoming declarations from other notes remain untouched. Structural vault
   * changes (create/delete/rename) are intentionally handled by a full rebuild instead.
   */
  async patchMarkdownFiles(
    state: GraphState,
    files: readonly TFile[],
    options: {
      useDurableCache?: boolean;
      awaitBodyWrite?: boolean;
      onFileCommitted?: (commit: PatchFileCommit) => void;
    } = {},
  ): Promise<PatchMarkdownResult> {
    const touchedPagePaths = new Set<string>();
    let semanticChanges = 0;
    let semanticNoops = 0;
    const useDurableCache = options.useDurableCache === true;
    const awaitBodyWrite = options.awaitBodyWrite === true;


    for (const file of files) {
      if (!this.isCurrent()) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      const fileTouchedPagePaths = new Set<string>();
      this.patchTouchedPagePaths = fileTouchedPagePaths;
      const publishFileCommit = (semanticChanged: boolean): void => {
        fileTouchedPagePaths.add(file.path);
        for (const path of fileTouchedPagePaths) touchedPagePaths.add(path);
        options.onFileCommitted?.({ sourcePath: file.path, touchedPagePaths: new Set(fileTouchedPagePaths), semanticChanged });
      };
      const page = getGraphPage(state, file.path);
      if (!page) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      const revision = this.captureFileRevision(file);

      // Live metadata events imply a new mtime, so a durable lookup is normally guaranteed to
      // miss and can be badly delayed by unrelated IndexedDB maintenance. Startup reconciliation
      // opts into durable lookup because it can legitimately hit a body written in the prior run.
      const previousEntry = this.fieldCache.get(file.path);
      let body: ParsedBodyMetadata | null = null;
      if (previousEntry && previousEntry.mtime === revision.mtime) {
        body = previousEntry.body;
      } else if (useDurableCache) {
        body = await this.bodyCache.getBody(file.path, revision.mtime);
        if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        }
      }

      if (!body) {
        const content = Platform.isMobile ? await this.app.vault.read(file) : await this.app.vault.cachedRead(file);
        if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        }

        body = await this.parseBody(content);
        if (!body || !this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
          return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        }

        if (awaitBodyWrite) {
          await this.bodyCache.putBody(file.path, revision.mtime, body);
          if (!this.isCurrent() || !this.fileRevisionMatches(file, revision)) {
            return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
          }
        } else {
          this.bodyCache.queueBodyWrite(file.path, revision.mtime, body);
        }
      }

      if (!this.fileRevisionMatches(file, revision)) {
        return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
      }
      const signature = this.semanticSourceSignature(file, body);
      const previousSignature = this.semanticFingerprints.get(file.path) ?? previousEntry?.semanticSignature;
      if (previousSignature === signature) {
        // Drawing data / prose / arbitrary frontmatter changed, but nothing K-Plex consumes
        // semantically or for provenance changed. Field-name discovery is deliberately separate
        // from relationship invalidation so a newly introduced lens property never tears down
        // and re-resolves evidence.
        const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), body);
        this.recordDiscoveredFields(state, meta, "patch");
        this.rememberFieldCache(file.path, { mtime: revision.mtime, body, semanticSignature: signature });
        this.semanticFingerprints.set(file.path, signature);
        page.mtime = revision.mtime;
        semanticNoops += 1;
        publishFileCommit(false);
        if (!(await this.yieldToHost())) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
        continue;
      }

      const topologyChanged = this.topologySignature(previousSignature) !== this.topologySignature(signature);
      const affected = new Set<string>();
      const oldTagPaths = new Set<string>();
      const oldUrlPaths = new Set<string>();
      touchedPagePaths.add(file.path);
      for (const item of state.evidence.declarationsTouching(file.path)) {
        const ownedByFile = item.declaredByPath === file.path && FILE_OWNED_EVIDENCE.has(item.sourceKind);
        const tagMembership = item.sourceKind === "tag-tree" && item.declaredTargetPath === file.path && item.declaredByPath.startsWith("tag:");
        if (!ownedByFile && !tagMembership) continue;
        affected.add(item.declaredByPath);
        affected.add(item.declaredTargetPath);
        if (tagMembership) oldTagPaths.add(item.declaredByPath);
        if (item.sourceKind === "body-url") oldUrlPaths.add(item.declaredTargetPath);
      }
      state.evidence.removeDeclarationsTouching(file.path, (item) => {
        if (item.declaredByPath === file.path && FILE_OWNED_EVIDENCE.has(item.sourceKind)) return true;
        return item.sourceKind === "tag-tree" && item.declaredTargetPath === file.path && item.declaredByPath.startsWith("tag:");
      });

      // Rebuild Obsidian's ordinary link declarations for this source note.
      for (const targetPath of Object.keys(this.app.metadataCache.resolvedLinks[file.path] ?? {})) {
        const target = getGraphPage(state, targetPath);
        if (!target) continue;
        this.addInferredParentChild(state, page, target, "obsidian-link");
        affected.add(target.path);
      }
      for (const targetPath of Object.keys(this.app.metadataCache.unresolvedLinks[file.path] ?? {})) {
        if (file.path === this.plugin.settings.excalibrainFilepath) continue;
        const target = this.ensureVirtual(state, targetPath);
        this.addInferredParentChild(state, page, target, "unresolved-link");
        affected.add(target.path);
      }

      this.rememberFieldCache(file.path, { mtime: revision.mtime, body, semanticSignature: signature });
      this.semanticFingerprints.set(file.path, signature);
      const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), body);
      this.applyMetadata(state, page, file, meta, "patch");
      page.mtime = revision.mtime;

      // Capture new targets after applying metadata and resolve just the touched relationship
      // pairs. resolveEvidencePair also removes a now-empty old relation from page.neighbours.
      for (const item of state.evidence.declarationsTouching(file.path)) {
        affected.add(item.declaredByPath);
        affected.add(item.declaredTargetPath);
        if (item.sourceKind === "body-url") oldUrlPaths.add(item.declaredTargetPath);
      }
      this.pruneEmptyTagNodes(state, oldTagPaths, affected);
      this.refreshDerivedUrlOrigins(state, oldUrlPaths, affected);
      for (const targetPath of affected) {
        fileTouchedPagePaths.add(targetPath);
        if (targetPath === file.path) continue;
        resolveEvidencePair(state.pages, state.evidence, file.path, targetPath);
        resolveEvidencePair(state.pages, state.evidence, targetPath, file.path);
      }
      this.pruneUnusedUrlNodes(state, oldUrlPaths, affected);
      for (const targetPath of affected) fileTouchedPagePaths.add(targetPath);

      if (topologyChanged) semanticChanges += 1;
      else semanticNoops += 1; // provenance-only refresh; relationship topology is unchanged
      publishFileCommit(topologyChanged);
      if (!(await this.yieldToHost())) return { ok: false, cancelled: true, touchedPagePaths, semanticChanges, semanticNoops };
    }

    this.patchTouchedPagePaths = null;
    return { ok: this.isCurrent(), cancelled: !this.isCurrent(), touchedPagePaths, semanticChanges, semanticNoops };
  }

  private recordDiscoveredFields(
    state: GraphState,
    meta: ParsedFileMetadata,
    discoveryMode: "rebuild" | "patch",
  ): void {
    const recordField = (name: string): void => {
      const normalized = normalizeFieldName(name);
      if (!normalized) return;
      const current = state.discoveredFields.get(normalized);
      if (discoveryMode === "patch") {
        // Incremental edits must not inflate counts every time the same note is saved. Exact counts
        // are rebuilt on an authoritative full build; during patches we only discover new fields.
        if (!current) state.discoveredFields.set(normalized, { name: name.trim(), count: 1 });
        return;
      }
      state.discoveredFields.set(normalized, { name: current?.name ?? name.trim(), count: (current?.count ?? 0) + 1 });
    };
    Object.keys(meta.frontmatter).forEach(recordField);
    meta.inlineFieldOccurrences.forEach((occurrence) => recordField(occurrence.name));
  }

  private applyMetadata(
    state: GraphState,
    page: GraphPage,
    file: TFile,
    meta: ParsedFileMetadata,
    discoveryMode: "rebuild" | "patch" = "rebuild",
  ): void {
    page.aliases = meta.aliases;
    page.tags = meta.tags;
    this.recordDiscoveredFields(state, meta, discoveryMode);

    const noteTypeField = normalizeFieldName(this.plugin.settings.noteTypeField);
    const frontmatterNoteType = getNormalizedFrontmatterValues(meta, noteTypeField)[0];
    const inlineNoteType = getNormalizedInlineFieldValues(meta, noteTypeField)[0];
    const unwrapNoteType = (value: unknown): string | null => {
      const first: unknown = Array.isArray(value) ? (value as unknown[])[0] : value;
      if (typeof first !== "string" && typeof first !== "number") return null;
      let text = String(first).trim();
      const wiki = text.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]$/);
      if (wiki) text = wiki[1].trim();
      text = text.replace(/^#/, "").trim();
      return text || null;
    };
    // Frontmatter wins when both forms are present, but classic Dataview body fields remain valid.
    page.noteType = unwrapNoteType(frontmatterNoteType ?? inlineNoteType);

    const styleTags = page.tags.filter((tag) => this.plugin.settings.tagStyleList.some((prefix) => tag.startsWith(prefix)));
    const primaryField = normalizeFieldName(this.plugin.settings.primaryTagField);
    const primaryValues = getNormalizedFieldValues(meta, primaryField)
      .flatMap((v) => typeof v === "string" ? v.match(/#[^\s\])$"'\\]+/g) ?? [] : []);
    page.primaryStyleTag = primaryValues.find((tag) => styleTags.some((s) => s.startsWith(tag))) ?? styleTags[0] ?? null;
    page.styleTags = styleTags.filter((tag) => tag !== page.primaryStyleTag);

    if (discoveryMode === "patch") {
      for (const tag of page.tags) {
        const tagPage = this.ensureTagPath(state, tag);
        if (tagPage) this.addEvidencePair(state, tagPage, page, "child", RelationType.DEFINED, LinkDirection.TO, { sourceKind: "tag-tree", definition: "tag-tree" });
      }
    }

    const hierarchy = this.plugin.settings.hierarchy;
    const groups: Array<[string[], EvidenceRole]> = [
      [hierarchy.hidden, "hidden"],
      [hierarchy.parents, "parent"],
      [hierarchy.children, "child"],
      [hierarchy.leftFriends, "left"],
      [hierarchy.rightFriends, "right"],
      [hierarchy.previous, "previous"],
      [hierarchy.next, "next"],
    ];

    // Record all ontology evidence. Precedence belongs to the resolver, not the collector.
    for (const [fieldNames, role] of groups) {
      for (const originalName of fieldNames) {
        const field = normalizeFieldName(originalName);
        for (const value of getNormalizedFrontmatterValues(meta, field)) {
          for (const path of extractLinksFromValue(this.app, value, file)) {
            const target = this.ensureTarget(state, path);
            this.addOntologyEvidence(state, page, target, role, {
              sourceKind: "frontmatter-ontology",
              definition: field,
              fieldName: originalName,
              rawValue: typeof value === "string" ? value : JSON.stringify(value),
            });
          }
        }

        for (const occurrence of getInlineFieldOccurrences(meta, field)) {
          for (const path of extractLinksFromValue(this.app, occurrence.value, file)) {
            const target = this.ensureTarget(state, path);
            this.addOntologyEvidence(state, page, target, role, {
              sourceKind: "inline-ontology",
              definition: field,
              fieldName: occurrence.name,
              rawValue: occurrence.value,
              line: occurrence.line,
              start: occurrence.start,
              end: occurrence.end,
            });
          }
        }
      }
    }

    this.addDatePropertyEvidence(state, page, meta);

    for (const reference of meta.urls) {
      const urlPage = this.ensureUrl(state, reference.url, reference.label || reference.url);
      this.addInferredParentChild(state, page, urlPage, "body-url", reference.line ? { line: reference.line } : undefined);
      try {
        const origin = new URL(reference.url).origin;
        const originPage = this.ensureUrl(state, origin, origin);
        const hasOriginEvidence = state.evidence.between(originPage.path, urlPage.path)
          .some((item) => item.sourceKind === "url-origin");
        if (!hasOriginEvidence) {
          this.addEvidencePair(state, originPage, urlPage, "child", RelationType.INFERRED, LinkDirection.TO, { sourceKind: "url-origin", definition: "url-origin" });
        }
      } catch { /* malformed URL - keep the raw URL node */ }
    }

    this.suppressPresentationOnlyImageLinks(state, page, file, meta);
  }

  /**
   * `thumbnail` / `node-image` are presentation metadata, not graph semantics. Obsidian's
   * resolvedLinks includes links stored in those fields, so without this small reconciliation an
   * image used only to decorate a thought also appears as an inferred child. Compare Obsidian's
   * occurrence count with the links K-Plex can account for inside the two visual fields: only when
   * every occurrence is presentation-only do we remove the generic inferred-link declaration.
   * A second prose/ontology link therefore keeps the attachment visible in the Plex as expected.
   */
  private suppressPresentationOnlyImageLinks(
    state: GraphState,
    page: GraphPage,
    file: TFile,
    meta: ParsedFileMetadata,
  ): void {
    const fields = [this.plugin.settings.thumbnailProperty, this.plugin.settings.nodeImageProperty]
      .map(normalizeFieldName)
      .filter(Boolean);
    if (!fields.length) return;

    const visualCounts = new Map<string, number>();
    for (const field of new Set(fields)) {
      const values = [
        ...getNormalizedFrontmatterValues(meta, field),
        ...getNormalizedInlineFieldValues(meta, field),
      ];
      for (const value of values) {
        for (const targetPath of extractLinksFromValue(this.app, value, file)) {
          visualCounts.set(targetPath, (visualCounts.get(targetPath) ?? 0) + 1);
        }
      }
    }
    if (!visualCounts.size) return;

    const resolved = this.app.metadataCache.resolvedLinks[file.path] ?? {};
    for (const [targetPath, visualCount] of visualCounts) {
      const totalCount = resolved[targetPath] ?? 0;
      if (totalCount <= 0 || totalCount > visualCount) continue;
      state.evidence.removeDeclarationsTouching(file.path, (item) =>
        item.declaredByPath === page.path &&
        item.declaredTargetPath === targetPath &&
        item.sourceKind === "obsidian-link",
      );
    }
  }

  private addOntologyEvidence(state: GraphState, source: GraphPage, target: GraphPage, role: EvidenceRole, provenance: EvidenceProvenance): void {
    if (role === "hidden") {
      if (target.path !== this.plugin.settings.excalibrainFilepath && target.path !== source.path) state.evidence.addHidden(source.path, target.path, provenance);
      return;
    }
    this.addEvidencePair(state, source, target, role, RelationType.DEFINED, LinkDirection.FROM, provenance);
  }

  private ensureTagPath(state: GraphState, rawTag: string): GraphPage | null {
    const parts = rawTag.replace(/^#/, "").split("/").map((part) => part.trim()).filter(Boolean);
    let parent: GraphPage | null = null;
    let leaf: GraphPage | null = null;
    for (let index = 0; index < parts.length; index += 1) {
      const tagPath = parts.slice(0, index + 1).join("/");
      const path = `tag:${tagPath}`;
      let page = state.pages.get(path);
      if (!page) {
        page = this.createPage({ path, name: this.plugin.settings.showFullTagName ? tagPath : parts[index], isTag: true });
        this.addPage(state, page);
      }
      if (parent) {
        const exists = state.evidence.between(parent.path, page.path).some((item) => item.sourceKind === "tag-tree");
        if (!exists) {
          this.addEvidencePair(state, parent, page, "child", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "tag-tree", definition: "tag-tree" });
          if (this.patchTouchedPagePaths) {
            resolveEvidencePair(state.pages, state.evidence, parent.path, page.path);
            resolveEvidencePair(state.pages, state.evidence, page.path, parent.path);
            this.patchTouchedPagePaths.add(parent.path);
            this.patchTouchedPagePaths.add(page.path);
          }
        }
      }
      parent = page;
      leaf = page;
    }
    return leaf;
  }

  /** Remove tag nodes made unreachable by an incremental tag edit. Only the edited tag's ancestor
   * chain is visited, so enabling tag thoughts no longer turns every metadata change into a full build. */
  private pruneEmptyTagNodes(state: GraphState, candidates: Iterable<string>, affected: Set<string>): void {
    const pending = new Set([...candidates].filter((path) => path.startsWith("tag:")));
    const ordered = () => [...pending].sort((a, b) => b.split("/").length - a.split("/").length || b.length - a.length);
    for (;;) {
      const paths = ordered();
      if (!paths.length) break;
      pending.clear();
      let removedAny = false;
      for (const path of paths) {
        const page = state.pages.get(path);
        if (!page?.isTag) continue;
        const local = state.evidence.declarationsTouching(path);
        const hasOutgoing = local.some((item) => item.sourceKind === "tag-tree" && item.declaredByPath === path);
        if (hasOutgoing) continue;
        const parents = local
          .filter((item) => item.sourceKind === "tag-tree" && item.declaredTargetPath === path && item.declaredByPath.startsWith("tag:"))
          .map((item) => item.declaredByPath);
        state.evidence.removeDeclarationsTouching(path, (item) =>
          item.sourceKind === "tag-tree" && item.declaredTargetPath === path && item.declaredByPath.startsWith("tag:"));
        for (const parentPath of parents) {
          const parent = state.pages.get(parentPath);
          parent?.neighbours.delete(path);
          affected.add(parentPath);
          pending.add(parentPath);
        }
        for (const targetPath of page.neighbours.keys()) state.pages.get(targetPath)?.neighbours.delete(path);
        state.pages.delete(path);
        state.lowercasePathMap.delete(path.toLowerCase());
        affected.add(path);
        removedAny = true;
      }
      if (!removedAny) break;
    }
  }

  /** URL-origin edges are derived from body URL references, not declarations owned by the origin
   * node. Recompute only the URL nodes touched by one edited Markdown file to prevent duplicate
   * declarations and stale derived relations from accumulating over long sessions. */
  private refreshDerivedUrlOrigins(state: GraphState, candidatePaths: Iterable<string>, affected: Set<string>): void {
    for (const urlPath of new Set(candidatePaths)) {
      if (!/^https?:\/\//i.test(urlPath)) continue;
      let origin: string;
      try { origin = new URL(urlPath).origin; } catch { continue; }
      if (origin === urlPath) continue;
      const references = state.evidence.declarationsTouching(urlPath)
        .filter((item) => item.sourceKind === "body-url" && item.declaredTargetPath === urlPath);
      const existing = state.evidence.between(origin, urlPath).filter((item) => item.sourceKind === "url-origin");
      if (!references.length) {
        if (existing.length) state.evidence.removeDeclarationsTouching(urlPath, (item) => item.sourceKind === "url-origin" && item.declaredTargetPath === urlPath);
      } else if (existing.length !== 1) {
        state.evidence.removeDeclarationsTouching(urlPath, (item) => item.sourceKind === "url-origin" && item.declaredTargetPath === urlPath);
        const urlPage = state.pages.get(urlPath);
        const originPage = this.ensureUrl(state, origin, origin);
        if (urlPage) this.addEvidencePair(state, originPage, urlPage, "child", RelationType.INFERRED, LinkDirection.TO, { sourceKind: "url-origin", definition: "url-origin" });
      }
      affected.add(urlPath);
      affected.add(origin);
      resolveEvidencePair(state.pages, state.evidence, origin, urlPath);
      resolveEvidencePair(state.pages, state.evidence, urlPath, origin);
    }
  }

  /** Release URL nodes that became purely derived and no longer have any declaration touching
   * them. Shared origins survive as long as any URL/referrer still owns evidence. */
  private pruneUnusedUrlNodes(state: GraphState, candidatePaths: Iterable<string>, affected: Set<string>): void {
    const candidates = new Set<string>();
    for (const urlPath of candidatePaths) {
      if (!/^https?:\/\//i.test(urlPath)) continue;
      candidates.add(urlPath);
      try { candidates.add(new URL(urlPath).origin); } catch { /* malformed external target */ }
    }
    // Child URL pages first, then origins. That lets an origin become removable after its final
    // derived child is released in the same patch.
    const ordered = [...candidates].sort((a, b) => b.length - a.length);
    for (const path of ordered) {
      const page = state.pages.get(path);
      if (!page?.url || page.file || state.evidence.declarationsTouching(path).length > 0) continue;
      for (const neighborPath of page.neighbours.keys()) {
        state.pages.get(neighborPath)?.neighbours.delete(path);
        affected.add(neighborPath);
      }
      state.pages.delete(path);
      state.lowercasePathMap.delete(path.toLowerCase());
      affected.add(path);
    }
  }

  private addDatePropertyEvidence(state: GraphState, source: GraphPage, meta: ParsedFileMetadata): void {
    const daily = this.dailyNotesSettings();
    if (!daily) return;
    for (const [fieldName, rawValue] of Object.entries(meta.frontmatter)) {
      if (!this.isDateProperty(fieldName)) continue;
      for (const value of flatten(rawValue)) {
        if (typeof value !== "string") continue;
        const rendered = formatDailyDate(value.trim(), daily.format);
        if (!rendered) continue;
        const relative = normalizePath([daily.folder, rendered].filter(Boolean).join("/"));
        const targetPath = relative.toLowerCase().endsWith(".md") ? relative : `${relative}.md`;
        const target = this.ensureVirtualOrExisting(state, targetPath);
        this.addEvidencePair(state, source, target, this.inferredRole(), RelationType.INFERRED, LinkDirection.FROM, {
          sourceKind: "date-property",
          definition: fieldName,
          fieldName,
          rawValue: value,
        });
      }
    }
  }

  private isDateProperty(fieldName: string): boolean {
    const app = this.app as App & {
      metadataTypeManager?: {
        getPropertyInfo?: (name: string) => { widget?: string } | null;
        getAssignedWidget?: (name: string) => string | null;
      };
    };
    const info = app.metadataTypeManager?.getPropertyInfo?.(fieldName);
    const widget = info?.widget ?? app.metadataTypeManager?.getAssignedWidget?.(fieldName);
    return widget === "date";
  }

  private dailyNotesSettings(): { folder: string; format: string } | null {
    const app = this.app as App & {
      internalPlugins?: {
        getPluginById?: (id: string) => unknown;
        plugins?: Record<string, unknown>;
      };
    };
    const registry = app.internalPlugins;
    const candidate = registry?.getPluginById?.("daily-notes") ?? registry?.plugins?.["daily-notes"];
    if (!candidate || typeof candidate !== "object") return null;
    const record = candidate as Record<string, unknown>;
    if (record.enabled === false) return null;
    const instance = record.instance && typeof record.instance === "object" ? record.instance as Record<string, unknown> : record;
    const options = instance.options && typeof instance.options === "object" ? instance.options as Record<string, unknown> : instance;
    const folder = typeof options.folder === "string" ? options.folder : "";
    const format = typeof options.format === "string" && options.format.trim() ? options.format : "YYYY-MM-DD";
    return { folder: normalizePath(folder), format };
  }

  private ensureVirtual(state: GraphState, path: string): GraphPage {
    const existing = getGraphPage(state, path);
    if (existing) return existing;
    const name = path.split("/").pop()?.replace(/\.md$/i, "") || path;
    const page = this.createPage({ path, name });
    this.addPage(state, page);
    return page;
  }

  private ensureVirtualOrExisting(state: GraphState, path: string): GraphPage {
    return getGraphPage(state, path) ?? this.ensureVirtual(state, path);
  }

  private ensureUrl(state: GraphState, url: string, alias?: string): GraphPage {
    const existing = state.pages.get(url);
    if (existing) {
      if (alias && existing.name === existing.url) existing.name = alias;
      return existing;
    }
    const page = this.createPage({ path: url, name: alias || url, url });
    this.addPage(state, page);
    return page;
  }

  private ensureTarget(state: GraphState, path: string): GraphPage {
    if (/^https?:\/\//i.test(path)) return this.ensureUrl(state, path);
    return getGraphPage(state, path) ?? this.ensureVirtual(state, path);
  }

  private inferredRole(): Exclude<EvidenceRole, "hidden"> {
    if (this.plugin.settings.inferAllLinksAsFriends) return "left";
    return this.plugin.settings.inverseInfer ? "parent" : "child";
  }

  private addInferredParentChild(
    state: GraphState,
    source: GraphPage,
    target: GraphPage,
    sourceKind: EvidenceSourceKind,
    extra?: Omit<EvidenceProvenance, "sourceKind">,
  ): void {
    this.addEvidencePair(state, source, target, this.inferredRole(), RelationType.INFERRED, LinkDirection.FROM, { sourceKind, ...extra });
  }

  private addEvidencePair(
    state: GraphState,
    source: GraphPage,
    target: GraphPage,
    role: Exclude<EvidenceRole, "hidden">,
    relationType: RelationType,
    direction: LinkDirection,
    provenance: EvidenceProvenance,
  ): void {
    if (source.path === target.path || target.path === this.plugin.settings.excalibrainFilepath) return;
    state.evidence.addPair(source.path, target.path, role, relationType, direction, provenance);
  }
}
