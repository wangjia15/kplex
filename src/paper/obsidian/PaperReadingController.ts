import { Notice, TFile, normalizePath } from "obsidian";
import type ExcaliBrainPlugin from "../../main";
import type { GraphPage } from "../../types";
import { normalizeFieldName } from "../../index/fieldParser";
import { isOtherPaperLink, paperIdsFromValue, paperKey, parseFieldList, parsePaperId, titlePaperId, uniquePaperIds } from "../PaperIdentifier";
import { PaperMetadataService } from "../PaperMetadataService";
import { appendAbstractSections, missingPaperProperties, paperFileStem, paperFrontmatter, paperNoteBody, translatedParagraphs, uniqueStem } from "../PaperNoteBuilder";
import { isAbortError, PaperServiceError, throwIfAborted, type PaperId, type PaperListKind, type PaperListPage, type PaperRecord } from "../PaperTypes";
import { referencesFromNote } from "../ReferenceParser";
import { extractAbstract } from "../AbstractExtract";
import { LruCache } from "../LruCache";

export type AbstractPreview = {
  text: string;
  /** Property name or "note" when taken from the note body. */
  source: string;
  translated: boolean;
};
import { TranslationService, type TranslationResult } from "../translation/TranslationService";
import { obsidianHttp, windowSleep } from "./ObsidianHttp";
import { articleImageName, imagePrefix } from "../ArticleSources";
import { downloadImage, fetchArticle, replaceTokens, tidyMarkdown } from "./ArticleImporter";

export type ArticleImportProgress = (message: string) => void;

/**
 * Obsidian-side coordinator for paper reading mode. It owns the session caches, resolves paper
 * identifiers lazily from MetadataCache, and performs vault writes through the plugin's existing
 * relationship APIs so optimistic graph publication and managed-write suppression stay intact.
 * Nothing here is persisted into GraphIndex snapshots.
 */
export class PaperReadingController {
  readonly metadata: PaperMetadataService;
  readonly translation: TranslationService;
  private readonly controllers = new Set<AbortController>();
  private readonly abstractCache = new LruCache<string, AbstractPreview | null>(300);

  constructor(private readonly plugin: ExcaliBrainPlugin) {
    const now = () => Date.now();
    this.metadata = new PaperMetadataService(obsidianHttp, {
      semanticScholarApiKey: () => {
        const secret = plugin.settings.paperS2ApiKeySecret.trim();
        return secret ? plugin.app.secretStorage.getSecret(secret) ?? "" : "";
      },
      contactEmail: () => plugin.settings.paperContactEmail,
      sleep: windowSleep,
      now,
    });
    this.translation = new TranslationService(obsidianHttp, {
      preferred: () => plugin.settings.paperTranslator,
      target: () => plugin.settings.paperTargetLanguage,
      now,
    });
  }

  get enabled(): boolean {
    return this.plugin.settings.paperReadingEnabled;
  }

  /** Abort controller whose lifetime ends with the plugin (modal closes also abort their own). */
  createAbortController(): AbortController {
    const controller = new AbortController();
    this.controllers.add(controller);
    controller.signal.addEventListener("abort", () => this.controllers.delete(controller), { once: true });
    return controller;
  }

  releaseAbortController(controller: AbortController): void {
    this.controllers.delete(controller);
  }

  unload(): void {
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
    this.metadata.clear();
  }

  private idFields(): Set<string> {
    return new Set(parseFieldList(this.plugin.settings.paperIdFields).map(normalizeFieldName));
  }

  /**
   * Paper identifiers for a Markdown file, read lazily from MetadataCache frontmatter. A note whose
   * identifier property only links a paper elsewhere (for example a conference PDF) falls back to
   * a title hint that is resolved by Semantic Scholar's title match.
   */
  idsForFile(file: TFile, fields = this.idFields()): PaperId[] {
    const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!frontmatter) return [];
    const found: PaperId[] = [];
    let otherLink = false;
    let title = "";
    for (const [key, value] of Object.entries(frontmatter)) {
      const normalized = normalizeFieldName(key);
      if (normalized === "title" && typeof value === "string") title = value;
      if (!fields.has(normalized)) continue;
      found.push(...paperIdsFromValue(value));
      if (Array.isArray(value) ? value.some(isOtherPaperLink) : isOtherPaperLink(value)) otherLink = true;
    }
    if (!found.length && otherLink) {
      const hint = titlePaperId(title);
      if (hint) found.push(hint);
    }
    return uniquePaperIds(found);
  }

  idsForPage(page: GraphPage): PaperId[] {
    if (page.transient || page.isFolder || page.isTag) return [];
    if (page.url) {
      const id = parsePaperId(page.url);
      return id ? [id] : [];
    }
    if (page.file?.extension === "md") return this.idsForFile(page.file);
    return [];
  }

  isPaperPage(page: GraphPage): boolean {
    return this.enabled && this.idsForPage(page).length > 0;
  }

  /**
   * Map every paper identifier in the vault to its note. Built on demand when Paper details opens
   * (never during rendering or indexing) and discarded with the modal.
   */
  buildVaultLookup(): Map<string, TFile> {
    const fields = this.idFields();
    const lookup = new Map<string, TFile>();
    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      for (const id of this.idsForFile(file, fields)) {
        if (!lookup.has(paperKey(id))) lookup.set(paperKey(id), file);
      }
    }
    return lookup;
  }

  vaultPageFor(record: PaperRecord, lookup: Map<string, TFile>): GraphPage | null {
    const title = titlePaperId(record.title);
    for (const id of title ? [...record.ids, title] : record.ids) {
      const file = lookup.get(paperKey(id));
      if (file) return this.plugin.index.get(file.path) ?? null;
    }
    return null;
  }

  /**
   * Abstract for the hover card, from local data only: the configured properties in order, then a
   * translated abstract section, then the note's own Abstract section. Cached per file revision.
   */
  async abstractPreview(page: GraphPage): Promise<AbstractPreview | null> {
    const file = page.file;
    if (!file || file.extension !== "md" || page.transient) return null;
    const key = `${file.path}|${file.stat.mtime}|${this.plugin.settings.paperAbstractFields}`;
    const cached = this.abstractCache.get(key);
    if (cached !== undefined) return cached;
    let result: AbstractPreview | null = null;
    const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    if (frontmatter) {
      const byName = new Map(Object.entries(frontmatter).map(([name, value]) => [normalizeFieldName(name), [name, value] as const]));
      for (const wanted of parseFieldList(this.plugin.settings.paperAbstractFields)) {
        const entry = byName.get(normalizeFieldName(wanted));
        const value = entry?.[1];
        const text = typeof value === "string" ? value.trim() : Array.isArray(value) ? value.filter((item) => typeof item === "string").join("\n\n").trim() : "";
        if (text) {
          result = { text, source: entry?.[0] ?? wanted, translated: /[\u3400-\u9fff]/.test(text) };
          break;
        }
      }
    }
    if (!result) {
      const extracted = extractAbstract(await this.plugin.app.vault.cachedRead(file));
      if (extracted) result = { text: extracted.text, source: "note", translated: extracted.translated };
    }
    this.abstractCache.set(key, result);
    return result;
  }

  /** Identifiers for a list record: its ids, or a title hint for title-only references. */
  lookupIds(record: PaperRecord): PaperId[] {
    if (record.ids.length) return record.ids;
    const hint = titlePaperId(record.title);
    return hint ? [hint] : [];
  }

  /**
   * References / citing papers for a paper. Online sources first (Semantic Scholar, then
   * OpenAlex); when they have no reference list, the reference section of the paper's own note
   * is parsed instead.
   */
  async listPapers(
    ids: readonly PaperId[],
    note: GraphPage | null,
    title: string,
    kind: PaperListKind,
    offset: number,
    limit: number,
    signal?: AbortSignal,
  ): Promise<PaperListPage> {
    let online: PaperListPage | null = null;
    let onlineError: unknown = null;
    if (ids.length) {
      try {
        online = await this.metadata.list(ids, kind, offset, limit, signal, title);
      } catch (error) {
        if (isAbortError(error)) throw error;
        onlineError = error;
      }
    }
    if (online && (online.items.length || offset > 0)) return online;
    if (kind === "references" && offset === 0 && note?.file?.extension === "md") {
      const markdown = await this.plugin.app.vault.cachedRead(note.file);
      const items = referencesFromNote(markdown);
      if (items.length) return { items, source: "note", next: null, total: items.length };
    }
    if (online) return online;
    if (onlineError instanceof Error) throw onlineError;
    throw new PaperServiceError("No reference information is available for this paper.");
  }

  /** True when `citing` already lists `cited` as a parent (any parent ontology counts). */
  isCitationLinked(citing: GraphPage, cited: GraphPage): boolean {
    return Boolean(citing.neighbours.get(cited.path)?.isParent);
  }

  /**
   * Make sure the reference property is a parent ontology field. Fields already assigned to another
   * role are respected and reported instead of being moved.
   */
  async ensureReferenceOntology(): Promise<boolean> {
    return this.ensureOntologyField(this.plugin.settings.paperReferenceField, "parent");
  }

  /** Register `field` for `role` unless the user already assigned it to another role. */
  private async ensureOntologyField(rawField: string, role: "parent" | "child"): Promise<boolean> {
    const field = rawField.trim();
    if (!field) return false;
    const normalized = normalizeFieldName(field);
    const h = this.plugin.settings.hierarchy;
    const own = role === "parent" ? h.parents : h.children;
    if (own.some((item) => normalizeFieldName(item) === normalized)) return true;
    const others = [h.parents, h.children, h.leftFriends, h.rightFriends, h.previous, h.next, h.hidden, h.exclusions].filter((list) => list !== own);
    if (others.some((list) => list.some((item) => normalizeFieldName(item) === normalized))) {
      new Notice(`“${field}” is already assigned to another relationship role. K-Plex will keep your ontology as it is.`, 5000);
      return false;
    }
    await this.plugin.assignFieldToOntology(field, role);
    return true;
  }

  /** Write `citing —References→ cited` using the plugin's relationship APIs. */
  async linkCitation(citing: GraphPage, cited: GraphPage): Promise<boolean> {
    if (citing.path === cited.path) return false;
    if (citing.file?.extension !== "md") {
      new Notice("Only Markdown notes can store references.", 2600);
      return false;
    }
    if (this.isCitationLinked(citing, cited)) return true;
    const field = this.plugin.settings.paperReferenceField.trim() || "References";
    if (this.plugin.index.isConnected(citing, cited.path)) {
      // Keep any existing user-authored relationship and add the reference ontology beside it.
      await this.plugin.addOntologyToConnection(citing, cited, "parent", field, citing.path);
    } else {
      await this.plugin.createRelationToPage(citing, "parent", cited, field);
    }
    return true;
  }

  private async translateForNote(record: PaperRecord, force: boolean, signal?: AbortSignal): Promise<TranslationResult | null> {
    if (!record.abstract) return null;
    const cached = this.translation.peek(record.abstract);
    if (cached) return cached;
    if (!force) return null;
    try {
      return await this.translation.translate(record.abstract, signal);
    } catch (error) {
      if (isAbortError(error)) throw error;
      new Notice(`Added without translation. ${error instanceof Error ? error.message : ""}`.trim(), 4000);
      return null;
    }
  }

  private paperFolder(source: GraphPage | null): string {
    const configured = this.plugin.settings.paperFolder.trim();
    if (configured) return normalizePath(configured);
    const sourcePath = source?.file?.path ?? "";
    const parent = this.plugin.app.fileManager.getNewFileParent(sourcePath);
    return parent.path === "/" ? "" : parent.path;
  }

  /** Record a newly created note under the paper's ids and title so later adds reuse it. */
  private rememberInLookup(record: PaperRecord, file: TFile, lookup: Map<string, TFile>): void {
    const title = titlePaperId(record.title);
    for (const id of title ? [...record.ids, title] : record.ids) lookup.set(paperKey(id), file);
  }

  /**
   * Create a paper note (metadata + abstract, translated when configured or already translated)
   * and publish it in the live index. `folderSource` only influences Obsidian's default location.
   */
  private async createPaperNote(record: PaperRecord, folderSource: GraphPage | null, lookup: Map<string, TFile>, signal?: AbortSignal): Promise<GraphPage | null> {
    let full = record;
    const ids = this.lookupIds(record);
    if (!full.abstract && ids.length) {
      try {
        // Title-only references (e.g. parsed from a note) resolve through title match. Keep the
        // parsed record when the match fails so the reader's choice is still added.
        full = await this.metadata.lookup(ids, signal);
      } catch (error) {
        if (isAbortError(error)) throw error;
      }
    }
    const translation = await this.translateForNote(full, this.plugin.settings.paperTranslateOnImport, signal);
    const folder = this.paperFolder(folderSource);
    const vault = this.plugin.app.vault;
    const stem = uniqueStem(paperFileStem(full), (candidate) =>
      Boolean(vault.getFileByPath(normalizePath(folder ? `${folder}/${candidate}.md` : `${candidate}.md`))));
    const body = paperNoteBody(full, translation, this.plugin.settings.paperNoteAbstractFormat, this.plugin.settings.paperTargetLanguage);
    const frontmatter = paperFrontmatter(full, this.plugin.settings.noteTypeField, this.plugin.settings.paperNoteType);
    const abstractProperty = this.plugin.settings.paperAbstractProperty.trim();
    if (translation && abstractProperty) {
      frontmatter[abstractProperty] = translatedParagraphs(translation, this.plugin.settings.paperTargetLanguage).join("\n\n");
    }
    const file = await this.plugin.createPaperNoteFile(folder, stem, body, frontmatter);
    if (!file) return null;
    const page = this.plugin.index.insertCreatedFile(file, [full.title]);
    this.rememberInLookup(full, file, lookup);
    return page;
  }

  /** Markdown page for a paper that is already in the vault (by id or title), if any. */
  markdownPageFor(record: PaperRecord, lookup: Map<string, TFile>): GraphPage | null {
    const page = this.vaultPageFor(record, lookup);
    return page?.file?.extension === "md" ? page : null;
  }

  /**
   * Add a reference (`kind === "references"`) or citing paper (`"citations"`) of `center` to the
   * vault and link it. An existing vault note for the same DOI/arXiv id is linked, never duplicated.
   */
  async addPaper(
    record: PaperRecord,
    center: GraphPage,
    kind: PaperListKind,
    lookup: Map<string, TFile>,
    signal?: AbortSignal,
  ): Promise<GraphPage | null> {
    const page = this.vaultPageFor(record, lookup) ?? await this.createPaperNote(record, center, lookup, signal);
    if (!page) return null;
    const citing = kind === "references" ? center : page;
    const cited = kind === "references" ? page : center;
    await this.linkCitation(citing, cited);
    return page;
  }

  /**
   * Import a paper's full text (arXiv HTML) as a Markdown note in the article folder, optionally
   * downloading figures into the image folder.
   * - When the paper already has a note, the article is a separate note linked from it through the
   *   full-text property (a child field).
   * - Otherwise the article note becomes the paper's note (metadata + full text); when the paper was
   *   reached from another paper's list it is linked like Add to vault.
   */
  async importArticle(
    record: PaperRecord,
    paperNote: GraphPage | null,
    origin: { page: GraphPage; kind: PaperListKind } | null,
    lookup: Map<string, TFile>,
    progress: ArticleImportProgress,
    signal?: AbortSignal,
  ): Promise<GraphPage | null> {
    const settings = this.plugin.settings;
    progress("Downloading the article…");
    const article = await fetchArticle(record, signal);

    const images: string[] = [];
    const prefix = imagePrefix(record, paperFileStem(record));
    const imageFolder = normalizePath(settings.paperImageFolder.trim() || "images");
    const vault = this.plugin.app.vault;
    if (settings.paperDownloadImages && article.images.length) await this.plugin.ensureVaultFolder(imageFolder);
    for (const [index, image] of article.images.entries()) {
      throwIfAborted(signal);
      if (!settings.paperDownloadImages) {
        images.push(`![${image.alt}](${image.url})`);
        continue;
      }
      progress(`Downloading figures ${index + 1} of ${article.images.length}…`);
      const downloaded = await downloadImage(image.url);
      if (!downloaded) {
        images.push(`![${image.alt}](${image.url})`);
        continue;
      }
      const name = articleImageName(prefix, image.url, index, downloaded.contentType);
      const path = normalizePath(`${imageFolder}/${name}`);
      const existing = vault.getFileByPath(path);
      const file = existing ?? await vault.createBinary(path, downloaded.data);
      images.push(`![[${file.path}]]`);
    }
    throwIfAborted(signal);

    const markdown = tidyMarkdown(replaceTokens(article.markdown, article.math, images));
    const folder = normalizePath(settings.paperArticleFolder.trim() || settings.paperFolder.trim() || "");
    const stemBase = paperNote ? `${paperFileStem(record)} (full text)` : paperFileStem(record);
    const stem = uniqueStem(stemBase, (candidate) =>
      Boolean(vault.getFileByPath(normalizePath(folder ? `${folder}/${candidate}.md` : `${candidate}.md`))));
    const frontmatter: Record<string, unknown> = paperNote
      ? { title: `${record.title} (full text)`, clipped_from: article.url }
      : { ...paperFrontmatter(record, settings.noteTypeField, settings.paperNoteType), clipped_from: article.url };
    progress("Saving the article…");
    const file = await this.plugin.createPaperNoteFile(folder, stem, markdown, frontmatter);
    if (!file) return null;
    const page = this.plugin.index.insertCreatedFile(file, paperNote ? [] : [record.title]);

    if (paperNote) {
      const field = settings.paperArticleField.trim() || "Full text";
      if (await this.ensureOntologyField(field, "child")) {
        await this.plugin.createRelationToPage(paperNote, "child", page, field);
      }
    } else {
      this.rememberInLookup(record, file, lookup);
      if (origin) {
        const citing = origin.kind === "references" ? origin.page : page;
        const cited = origin.kind === "references" ? page : origin.page;
        await this.linkCitation(citing, cited);
      }
    }
    return page;
  }

  /** Add the paper currently shown in Paper details as a standalone note (no relationship). */
  async addStandalonePaper(record: PaperRecord, lookup: Map<string, TFile>, signal?: AbortSignal): Promise<GraphPage | null> {
    return this.markdownPageFor(record, lookup) ?? await this.createPaperNote(record, null, lookup, signal);
  }

  /**
   * Save paper metadata and the abstract into an existing note: missing properties are added
   * (existing values are never overwritten) and missing abstract sections are appended.
   */
  async savePaperToNote(page: GraphPage, record: PaperRecord, translation: TranslationResult | null): Promise<{ properties: number; abstract: boolean }> {
    const file = page.file;
    if (!file || file.extension !== "md") return { properties: 0, abstract: false };
    const existing = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const missing = missingPaperProperties(existing, record);
    const abstractProperty = this.plugin.settings.paperAbstractProperty.trim();
    if (translation && abstractProperty && !Object.keys(existing).some((key) => key.toLowerCase() === abstractProperty.toLowerCase())) {
      missing[abstractProperty] = translatedParagraphs(translation, this.plugin.settings.paperTargetLanguage).join("\n\n");
    }
    const properties = Object.keys(missing).length;
    if (properties) {
      await this.plugin.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
        for (const [key, value] of Object.entries(missing)) {
          if (!(key in frontmatter)) frontmatter[key] = value;
        }
      });
    }
    let abstract = false;
    if (record.abstract) {
      await this.plugin.app.vault.process(file, (markdown) => {
        const next = appendAbstractSections(
          markdown,
          record.abstract,
          translation,
          this.plugin.settings.paperNoteAbstractFormat,
          this.plugin.settings.paperTargetLanguage,
        );
        if (next === null) return markdown;
        abstract = true;
        return next;
      });
    }
    return { properties, abstract };
  }
}
