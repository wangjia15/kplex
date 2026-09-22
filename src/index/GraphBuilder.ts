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
import type { MetadataParser } from "./MetadataParser";
import type { KplexIndexedDbCache } from "./IndexedDbCache";
import type { EvidenceProvenance, EvidenceRole, EvidenceSourceKind } from "./RelationEvidence";
import { resolveEvidencePair, resolveEvidenceStoreCooperative } from "./RelationResolver";
import { createGraphState, getGraphPage, type GraphState } from "./GraphState";
import { perfCount, perfDuration, perfElapsed, perfGauge, perfLog, perfNow } from "../util/perf";

export type FieldCacheEntry = { mtime: number; body: ParsedBodyMetadata };

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

/**
 * Builds a complete graph snapshot from vault inputs. It does not publish state or service UI
 * queries; those responsibilities belong to GraphIndex. All collectors emit provenance-bearing
 * evidence and relationship resolution happens once, after collection is complete.
 */
export class GraphBuilder {
  private sliceStartedAt = perfNow();
  private hostYieldCount = 0;
  private hostYieldWaitMs = 0;
  private hostYieldMaxMs = 0;

  constructor(
    private plugin: ExcaliBrainPlugin,
    private app: App,
    private fieldCache: Map<string, FieldCacheEntry>,
    private metadataParser: MetadataParser,
    private bodyCache: KplexIndexedDbCache,
    private isCurrent: () => boolean,
    private onProgress?: (phase: string, detail?: Record<string, unknown>) => void,
  ) {}

  async build(): Promise<GraphState | null> {
    const state = createGraphState();
    const startedAt = perfNow();
    const phase = async (name: string, work: () => Promise<boolean>): Promise<boolean> => {
      const phaseStartedAt = perfNow();
      this.onProgress?.(`${name}:start`);
      const ok = await work();
      const detail = {
        elapsedMs: perfElapsed(phaseStartedAt),
        nodes: state.pages.size,
        declarations: state.evidence.declarationCount,
        pairs: state.evidence.pairCount,
        hostYields: this.hostYieldCount,
        hostYieldWaitMs: Math.round(this.hostYieldWaitMs * 10) / 10,
        hostYieldMaxMs: Math.round(this.hostYieldMaxMs * 10) / 10,
      };
      this.onProgress?.(`${name}:end`, detail);
      perfLog(`build.${name}`, detail);
      return ok;
    };

    perfLog("build.start", { markdownFiles: this.app.vault.getMarkdownFiles().length, physicalFiles: this.app.vault.getFiles().length });
    if (!(await phase("vault-tree", () => this.addVaultTree(state)))) return null;
    if (!(await phase("tag-tree", () => this.addTagTree(state)))) return null;
    if (!(await phase("resolved-links", () => this.addResolvedLinks(state)))) return null;
    if (!(await phase("unresolved-links", () => this.addUnresolvedLinks(state)))) return null;
    if (!(await phase("metadata", () => this.enrichMarkdownPages(state)))) return null;
    if (!this.isCurrent()) return null;
    if (!(await phase("resolve", () => resolveEvidenceStoreCooperative(
      state.pages,
      state.evidence,
      this.isCurrent,
      Platform.isIosApp ? 96 : Platform.isMobile ? 160 : 400,
    )))) return null;
    perfLog("build.end", {
      elapsedMs: perfElapsed(startedAt),
      nodes: state.pages.size,
      declarations: state.evidence.declarationCount,
      pairs: state.evidence.pairCount,
      hostYields: this.hostYieldCount,
      hostYieldWaitMs: Math.round(this.hostYieldWaitMs * 10) / 10,
      hostYieldMaxMs: Math.round(this.hostYieldMaxMs * 10) / 10,
    });
    return state;
  }

  private async yieldToHost(force = false): Promise<boolean> {
    if (!this.isCurrent()) return false;
    const budgetMs = Platform.isIosApp ? 7 : Platform.isMobile ? 9 : 13;
    if (!force && perfNow() - this.sliceStartedAt < budgetMs) return true;
    const yieldStartedAt = perfNow();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    const yieldMs = perfNow() - yieldStartedAt;
    this.hostYieldCount += 1;
    this.hostYieldWaitMs += yieldMs;
    this.hostYieldMaxMs = Math.max(this.hostYieldMaxMs, yieldMs);
    perfCount("builder.hostYields");
    perfDuration("builder.hostYieldWait", yieldMs);
    this.sliceStartedAt = perfNow();
    return this.isCurrent();
  }

  /** Mark a real asynchronous I/O/IDB boundary as a host scheduling opportunity so its wait
   * time is not mistaken for synchronous CPU time by the time-slice budget. */
  private markHostOpportunity(): void {
    this.sliceStartedAt = perfNow();
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
  }

  private async addVaultTree(state: GraphState): Promise<boolean> {
    const root = this.createPage({ path: "folder:/", name: "/", isFolder: true });
    this.addPage(state, root);
    const indexFolders = this.plugin.settings.showFolderNodes;
    const stack: Array<{ folder: TFolder; parent: GraphPage }> = [{ folder: this.app.vault.getRoot(), parent: root }];
    let processed = 0;
    let folders = 0;
    let files = 0;
    while (stack.length) {
      if (!this.isCurrent()) return false;
      const { folder, parent } = stack.pop()!;
      for (const item of folder.children) {
        if (item instanceof TFolder) {
          folders += 1;
          if (indexFolders) {
            const node = this.createPage({ path: `folder:${item.path}`, name: item.name, isFolder: true });
            this.addPage(state, node);
            this.addEvidencePair(state, parent, node, "child", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "file-tree", definition: "file-tree" });
            stack.push({ folder: item, parent: node });
          } else {
            // We still need to discover every physical file, but avoid allocating tens of
            // thousands of folder/file-tree evidence records when folder thoughts are disabled.
            stack.push({ folder: item, parent: root });
          }
        } else if (item instanceof TFile) {
          files += 1;
          const node = this.createPage({ path: item.path, name: item.extension === "md" ? item.basename : item.name, file: item });
          this.addPage(state, node);
          if (indexFolders) this.addEvidencePair(state, parent, node, "child", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "file-tree", definition: "file-tree" });
        }
        processed += 1;
        if (!(await this.yieldToHost())) return false;
      }
    }
    perfLog("build.vault-tree.detail", { processed, folders, files, indexFolders });
    return this.isCurrent();
  }

  private async addTagTree(state: GraphState): Promise<boolean> {
    // Tags still get attached to individual GraphPages during metadata enrichment for filtering
    // and styling. The separate hierarchical tag-node graph is expensive and unnecessary when
    // tag thoughts are hidden, so build it only when the feature is enabled.
    if (!this.plugin.settings.showTagNodes) return this.isCurrent();
    const tagNames = new Set<string>();
    let processed = 0;
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!this.isCurrent()) return false;
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) continue;
      for (const tag of getAllTags(cache) ?? []) tagNames.add(tag);
      processed += 1;
      if (!(await this.yieldToHost())) return false;
    }

    const scannedMarkdown = processed;
    processed = 0;
    for (const rawTag of tagNames) {
      const parts = rawTag.slice(1).split("/").filter(Boolean);
      let parent: GraphPage | null = null;
      parts.forEach((part, index) => {
        const tagPath = parts.slice(0, index + 1).join("/");
        const path = `tag:${tagPath}`;
        let page = state.pages.get(path);
        if (!page) {
          page = this.createPage({ path, name: this.plugin.settings.showFullTagName ? tagPath : part, isTag: true });
          this.addPage(state, page);
        }
        if (parent) this.addEvidencePair(state, parent, page, "child", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "tag-tree", definition: "tag-tree" });
        parent = page;
      });
      processed += 1;
      if (!(await this.yieldToHost())) return false;
    }
    perfLog("build.tag-tree.detail", { scannedMarkdown, uniqueTags: tagNames.size, createdTagPaths: processed });
    return this.isCurrent();
  }

  private async addResolvedLinks(state: GraphState): Promise<boolean> {
    let processed = 0;
    let linkCount = 0;
    for (const [sourcePath, targets] of Object.entries(this.app.metadataCache.resolvedLinks)) {
      if (!this.isCurrent()) return false;
      const source = getGraphPage(state, sourcePath);
      if (!source) continue;
      for (const targetPath of Object.keys(targets)) {
        linkCount += 1;
        const target = getGraphPage(state, targetPath);
        if (target) this.addInferredParentChild(state, source, target, "obsidian-link");
      }
      processed += 1;
      if (!(await this.yieldToHost())) return false;
    }
    perfLog("build.resolved-links.detail", { sources: processed, links: linkCount });
    return this.isCurrent();
  }

  private async addUnresolvedLinks(state: GraphState): Promise<boolean> {
    let processed = 0;
    let linkCount = 0;
    let virtualCreated = 0;
    for (const [sourcePath, targets] of Object.entries(this.app.metadataCache.unresolvedLinks)) {
      if (!this.isCurrent()) return false;
      const source = getGraphPage(state, sourcePath);
      if (!source || sourcePath === this.plugin.settings.excalibrainFilepath) continue;
      for (const targetPath of Object.keys(targets)) {
        linkCount += 1;
        const existed = Boolean(getGraphPage(state, targetPath));
        const target = this.ensureVirtual(state, targetPath);
        if (!existed) virtualCreated += 1;
        this.addInferredParentChild(state, source, target, "unresolved-link");
      }
      processed += 1;
      if (!(await this.yieldToHost())) return false;
    }
    perfLog("build.unresolved-links.detail", { sources: processed, links: linkCount, virtualCreated });
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

    const startedAt = perfNow();
    let processed = 0;
    let hotHits = 0;
    let durableHits = 0;
    let bodyReads = 0;
    let bytesRead = 0;
    let readMs = 0;
    let parseMs = 0;
    let idbLookupMs = 0;
    let idbWriteMs = 0;
    let mergeMs = 0;
    let applyMetadataMs = 0;
    let idbWriteFailures = 0;
    // A handful of medium IDB transactions is much cheaper than one transaction per note. iOS
    // still uses conservative batches to cap temporary decoded-object retention.
    const lookupBatchSize = Platform.isIosApp ? 64 : Platform.isMobile ? 96 : 256;
    const writeBatchSize = Platform.isIosApp ? 48 : Platform.isMobile ? 64 : 128;
    const pendingWrites: Array<{ path: string; mtime: number; body: ParsedBodyMetadata }> = [];

    const flushWrites = async (): Promise<boolean> => {
      if (!pendingWrites.length) return true;
      const batch = pendingWrites.splice(0, pendingWrites.length);
      const writeStartedAt = perfNow();
      const stored = await this.bodyCache.putBodies(batch);
      if (!stored) idbWriteFailures += batch.length;
      idbWriteMs += perfElapsed(writeStartedAt);
      this.markHostOpportunity();
      return this.isCurrent();
    };

    for (let batchStart = 0; batchStart < files.length; batchStart += lookupBatchSize) {
      if (!this.isCurrent()) return false;
      const batchFiles = files.slice(batchStart, batchStart + lookupBatchSize);
      const misses = batchFiles.filter((file) => {
        const hot = this.fieldCache.get(file.path);
        if (hot?.mtime === file.stat.mtime) {
          hotHits += 1;
          return false;
        }
        return true;
      });
      const lookupStartedAt = perfNow();
      const durable = await this.bodyCache.getBodies(misses.map((file) => ({ path: file.path, mtime: file.stat.mtime })));
      idbLookupMs += perfElapsed(lookupStartedAt);
      this.markHostOpportunity();
      durableHits += durable.size;
      if (!this.isCurrent()) return false;

      for (const file of batchFiles) {
        if (!this.isCurrent()) return false;
        const page = getGraphPage(state, file.path);
        if (!page) continue;

        let entry = this.fieldCache.get(file.path);
        if (!entry || entry.mtime !== file.stat.mtime) {
          const cachedBody = durable.get(file.path);
          if (cachedBody) {
            entry = { mtime: file.stat.mtime, body: cachedBody };
          } else {
            const readStartedAt = perfNow();
            const content = Platform.isMobile ? await this.app.vault.read(file) : await this.app.vault.cachedRead(file);
            readMs += perfElapsed(readStartedAt);
            this.markHostOpportunity();
            bodyReads += 1;
            bytesRead += content.length;
            if (!this.isCurrent()) return false;
            const parseStartedAt = perfNow();
            const body = await this.metadataParser.parse(content);
            parseMs += perfElapsed(parseStartedAt);
            if (!this.isCurrent()) return false;
            entry = { mtime: file.stat.mtime, body };
            pendingWrites.push({ path: file.path, mtime: file.stat.mtime, body });
            if (pendingWrites.length >= writeBatchSize && !(await flushWrites())) return false;
          }
          this.fieldCache.set(file.path, entry);
          const hotLimit = Platform.isIosApp ? 48 : Platform.isMobile ? 160 : 1200;
          while (this.fieldCache.size > hotLimit) {
            const oldest = this.fieldCache.keys().next().value as string | undefined;
            if (!oldest) break;
            this.fieldCache.delete(oldest);
          }
        }

        const mergeStartedAt = perfNow();
        const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), entry.body);
        mergeMs += perfNow() - mergeStartedAt;
        const applyStartedAt = perfNow();
        this.applyMetadata(state, page, file, meta);
        applyMetadataMs += perfNow() - applyStartedAt;

        processed += 1;
        if (processed % 250 === 0) {
          this.onProgress?.("metadata:progress", {
            processed,
            total: files.length,
            hotHits,
            durableHits,
            bodyReads,
            idbWriteFailures,
            elapsedMs: perfElapsed(startedAt),
            rateFilesPerSecond: perfElapsed(startedAt) > 0 ? Math.round(processed * 10000 / perfElapsed(startedAt)) / 10 : 0,
          });
        }
        if (!(await this.yieldToHost())) return false;
      }
    }
    if (!(await flushWrites())) return false;
    perfLog("build.metadata.detail", {
      elapsedMs: perfElapsed(startedAt),
      processed,
      hotHits,
      durableHits,
      bodyReads,
      bytesRead,
      readMs: Math.round(readMs * 10) / 10,
      parseMs: Math.round(parseMs * 10) / 10,
      idbLookupMs: Math.round(idbLookupMs * 10) / 10,
      idbWriteMs: Math.round(idbWriteMs * 10) / 10,
      mergeMs: Math.round(mergeMs * 10) / 10,
      applyMetadataMs: Math.round(applyMetadataMs * 10) / 10,
      hostYieldWaitMs: Math.round(this.hostYieldWaitMs * 10) / 10,
      hostYieldMaxMs: Math.round(this.hostYieldMaxMs * 10) / 10,
      idbWriteFailures,
      fieldCacheSize: this.fieldCache.size,
      rateFilesPerSecond: perfElapsed(startedAt) > 0 ? Math.round(processed * 10000 / perfElapsed(startedAt)) / 10 : 0,
    });
    perfGauge("builder.fieldCacheSize", this.fieldCache.size);
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
  async patchMarkdownFiles(state: GraphState, files: readonly TFile[]): Promise<boolean> {
    const startedAt = perfNow();
    let processed = 0;
    let bodyCacheHits = 0;
    let bodyReads = 0;
    let readMs = 0;
    let parseMs = 0;
    let writeMs = 0;
    let applyMs = 0;
    let resolveMs = 0;
    let affectedPairs = 0;
    perfLog("patch.builder.start", { files: files.length, nodes: state.pages.size, declarations: state.evidence.declarationCount });
    for (const file of files) {
      if (!this.isCurrent()) return false;
      const page = getGraphPage(state, file.path);
      if (!page) return false;

      const affected = new Set<string>();
      for (const item of state.evidence.declarationsTouching(file.path)) {
        const ownedByFile = item.declaredByPath === file.path && FILE_OWNED_EVIDENCE.has(item.sourceKind);
        const tagMembership = item.sourceKind === "tag-tree" && item.declaredTargetPath === file.path && item.declaredByPath.startsWith("tag:");
        if (!ownedByFile && !tagMembership) continue;
        affected.add(item.declaredByPath);
        affected.add(item.declaredTargetPath);
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

      let body = await this.bodyCache.getBody(file.path, file.stat.mtime);
      this.markHostOpportunity();
      if (body) bodyCacheHits += 1;
      if (!body) {
        const readStartedAt = perfNow();
        const content = Platform.isMobile ? await this.app.vault.read(file) : await this.app.vault.cachedRead(file);
        readMs += perfNow() - readStartedAt;
        bodyReads += 1;
        this.markHostOpportunity();
        if (!this.isCurrent()) return false;
        const parseStartedAt = perfNow();
        body = await this.metadataParser.parse(content);
        parseMs += perfNow() - parseStartedAt;
        if (!this.isCurrent()) return false;
        const writeStartedAt = perfNow();
        await this.bodyCache.putBody(file.path, file.stat.mtime, body);
        writeMs += perfNow() - writeStartedAt;
        this.markHostOpportunity();
      }
      this.fieldCache.set(file.path, { mtime: file.stat.mtime, body });
      const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), body);
      const applyStartedAt = perfNow();
      this.applyMetadata(state, page, file, meta);
      applyMs += perfNow() - applyStartedAt;
      page.mtime = file.stat.mtime;

      // Capture new targets after applying metadata and resolve just the touched relationship
      // pairs. resolveEvidencePair also removes a now-empty old relation from page.neighbours.
      for (const item of state.evidence.declarationsTouching(file.path)) {
        affected.add(item.declaredByPath);
        affected.add(item.declaredTargetPath);
      }
      const resolveStartedAt = perfNow();
      for (const targetPath of affected) {
        if (targetPath === file.path) continue;
        affectedPairs += 2;
        resolveEvidencePair(state.pages, state.evidence, file.path, targetPath);
        resolveEvidencePair(state.pages, state.evidence, targetPath, file.path);
      }
      resolveMs += perfNow() - resolveStartedAt;

      processed += 1;
      this.onProgress?.("patch:progress", { processed, total: files.length });
      if (!(await this.yieldToHost())) return false;
    }
    const elapsedMs = perfElapsed(startedAt);
    perfDuration("patch.builder", elapsedMs);
    perfLog("patch.builder.end", {
      files: files.length,
      processed,
      elapsedMs,
      bodyCacheHits,
      bodyReads,
      readMs: Math.round(readMs * 10) / 10,
      parseMs: Math.round(parseMs * 10) / 10,
      writeMs: Math.round(writeMs * 10) / 10,
      applyMs: Math.round(applyMs * 10) / 10,
      resolveMs: Math.round(resolveMs * 10) / 10,
      affectedPairs,
      declarations: state.evidence.declarationCount,
    });
    return this.isCurrent();
  }

  private applyMetadata(state: GraphState, page: GraphPage, file: TFile, meta: ParsedFileMetadata): void {
    page.aliases = meta.aliases;
    page.tags = meta.tags;

    const recordField = (name: string): void => {
      const normalized = normalizeFieldName(name);
      if (!normalized) return;
      const current = state.discoveredFields.get(normalized);
      state.discoveredFields.set(normalized, { name: current?.name ?? name.trim(), count: (current?.count ?? 0) + 1 });
    };
    Object.keys(meta.frontmatter).forEach(recordField);
    meta.inlineFieldOccurrences.forEach((occurrence) => recordField(occurrence.name));

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

    for (const tag of page.tags) {
      const tagPage = getGraphPage(state, `tag:${tag.replace(/^#/, "")}`);
      if (tagPage) this.addEvidencePair(state, tagPage, page, "child", RelationType.DEFINED, LinkDirection.TO, { sourceKind: "tag-tree", definition: "tag-tree" });
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
        this.addEvidencePair(state, originPage, urlPage, "child", RelationType.INFERRED, LinkDirection.TO, { sourceKind: "url-origin", definition: "url-origin" });
      } catch { /* malformed URL - keep the raw URL node */ }
    }
  }

  private addOntologyEvidence(state: GraphState, source: GraphPage, target: GraphPage, role: EvidenceRole, provenance: EvidenceProvenance): void {
    if (role === "hidden") {
      if (target.path !== this.plugin.settings.excalibrainFilepath && target.path !== source.path) state.evidence.addHidden(source.path, target.path, provenance);
      return;
    }
    this.addEvidencePair(state, source, target, role, RelationType.DEFINED, LinkDirection.FROM, provenance);
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
