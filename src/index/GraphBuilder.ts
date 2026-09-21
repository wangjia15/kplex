import { getAllTags, TFile, TFolder, type App } from "obsidian";
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
import type { EvidenceProvenance, EvidenceRole, EvidenceSourceKind } from "./RelationEvidence";
import { resolveEvidenceStore } from "./RelationResolver";
import { createGraphState, getGraphPage, type GraphState } from "./GraphState";

export type FieldCacheEntry = { mtime: number; body: ParsedBodyMetadata };

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
  constructor(
    private plugin: ExcaliBrainPlugin,
    private app: App,
    private fieldCache: Map<string, FieldCacheEntry>,
    private metadataParser: MetadataParser,
    private markBodyCacheDirty: () => void,
    private isCurrent: () => boolean,
  ) {}

  async build(): Promise<GraphState | null> {
    const state = createGraphState();
    this.addVaultTree(state);
    this.addTagTree(state);
    this.addResolvedLinks(state);
    this.addUnresolvedLinks(state);
    if (!(await this.enrichMarkdownPages(state))) return null;
    if (!this.isCurrent()) return null;
    resolveEvidenceStore(state.pages, state.evidence);
    return state;
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

  private addVaultTree(state: GraphState): void {
    const root = this.createPage({ path: "folder:/", name: "/", isFolder: true });
    this.addPage(state, root);
    const visit = (folder: TFolder, parent: GraphPage): void => {
      for (const item of folder.children) {
        if (item instanceof TFolder) {
          const node = this.createPage({ path: `folder:${item.path}`, name: item.name, isFolder: true });
          this.addPage(state, node);
          this.addEvidencePair(state, parent, node, "child", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "file-tree", definition: "file-tree" });
          visit(item, node);
        } else if (item instanceof TFile) {
          const node = this.createPage({ path: item.path, name: item.extension === "md" ? item.basename : item.name, file: item });
          this.addPage(state, node);
          this.addEvidencePair(state, parent, node, "child", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "file-tree", definition: "file-tree" });
        }
      }
    };
    visit(this.app.vault.getRoot(), root);
  }

  private addTagTree(state: GraphState): void {
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
        let page = state.pages.get(path);
        if (!page) {
          page = this.createPage({ path, name: this.plugin.settings.showFullTagName ? tagPath : part, isTag: true });
          this.addPage(state, page);
        }
        if (parent) this.addEvidencePair(state, parent, page, "child", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "tag-tree", definition: "tag-tree" });
        parent = page;
      });
    }
  }

  private addResolvedLinks(state: GraphState): void {
    for (const [sourcePath, targets] of Object.entries(this.app.metadataCache.resolvedLinks)) {
      const source = getGraphPage(state, sourcePath);
      if (!source) continue;
      for (const targetPath of Object.keys(targets)) {
        const target = getGraphPage(state, targetPath);
        if (target) this.addInferredParentChild(state, source, target, "obsidian-link");
      }
    }
  }

  private addUnresolvedLinks(state: GraphState): void {
    for (const [sourcePath, targets] of Object.entries(this.app.metadataCache.unresolvedLinks)) {
      const source = getGraphPage(state, sourcePath);
      if (!source || sourcePath === this.plugin.settings.excalibrainFilepath) continue;
      for (const targetPath of Object.keys(targets)) {
        const target = this.ensureVirtual(state, targetPath);
        this.addInferredParentChild(state, source, target, "unresolved-link");
      }
    }
  }

  private async enrichMarkdownPages(state: GraphState): Promise<boolean> {
    const files = this.app.vault.getMarkdownFiles();
    const alive = new Set(files.map((file) => file.path));
    for (const cachedPath of this.fieldCache.keys()) {
      if (alive.has(cachedPath)) continue;
      this.fieldCache.delete(cachedPath);
      this.markBodyCacheDirty();
    }

    let processed = 0;
    for (const file of files) {
      if (!this.isCurrent()) return false;
      const page = getGraphPage(state, file.path);
      if (!page) continue;

      let entry = this.fieldCache.get(file.path);
      if (!entry || entry.mtime !== file.stat.mtime) {
        const content = await this.app.vault.cachedRead(file);
        if (!this.isCurrent()) return false;
        const body = await this.metadataParser.parse(content);
        if (!this.isCurrent()) return false;
        entry = { mtime: file.stat.mtime, body };
        this.fieldCache.set(file.path, entry);
        this.markBodyCacheDirty();
      }

      const meta = mergeFileMetadata(this.app.metadataCache.getFileCache(file), entry.body);
      this.applyMetadata(state, page, file, meta);

      processed += 1;
      if (processed % 250 === 0) await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
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
