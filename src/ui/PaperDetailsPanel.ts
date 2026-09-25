import { Notice, setIcon, type TFile } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { GraphPage } from "../types";
import type { PaperAbstractView } from "../settings";
import { paperIdUrl, paperKey, titlePaperId } from "../paper/PaperIdentifier";
import { languageLabel, sentenceJoiner } from "../paper/PaperNoteBuilder";
import { articleBrowserUrl, articleSourceUrls } from "../paper/ArticleSources";
import { isAbortError, type PaperId, type PaperListKind, type PaperListSource, type PaperRecord } from "../paper/PaperTypes";
import type { TranslationResult } from "../paper/translation/TranslationService";

/**
 * Serializable description of the paper shown in Paper details. It is also the persisted view
 * state of the sidecar paper view, so it contains identifiers and paths only.
 */
export type PaperTarget = {
  ids: PaperId[];
  title: string;
  /** Graph page this paper corresponds to (note or doi/arXiv link node), when known. */
  pagePath: string | null;
  /** The paper whose reference/citation list this one was opened from. */
  origin: { path: string; kind: PaperListKind } | null;
};

export type PaperPanelHost = {
  setTitle(title: string): void;
  /** Show a node in the Plex (the host decides whether it closes first). */
  showInPlex(page: GraphPage): void;
  /** Called after navigating to another paper so a view can persist its state. */
  targetChanged?(target: PaperTarget): void;
};

type ListState = {
  items: PaperRecord[];
  source: PaperListSource | null;
  next: number | null;
  total: number | null;
  loading: boolean;
  error: string;
  loaded: boolean;
};

const TAB_LABEL: Record<PaperListKind, string> = {
  references: "References",
  citations: "Cited by",
};

const SOURCE_LABEL: Record<PaperListSource, string> = {
  "semantic-scholar": "From Semantic Scholar",
  openalex: "From OpenAlex",
  note: "From the reference list in this paper's note",
};

const emptyList = (): ListState => ({ items: [], source: null, next: 0, total: null, loading: false, error: "", loaded: false });

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function authorLine(authors: readonly string[]): string {
  if (!authors.length) return "";
  if (authors.length <= 3) return authors.join(", ");
  return `${authors.slice(0, 3).join(", ")} et al.`;
}

function iconButton(parent: HTMLElement, icon: string, label: string, cls = ""): HTMLButtonElement {
  const button = parent.createEl("button", { cls: `kplex-paper-button ${cls}`.trim(), attr: { type: "button", "aria-label": label } });
  setIcon(button.createSpan({ cls: "kplex-paper-button-icon" }), icon);
  button.createSpan({ text: label });
  return button;
}

/** Target for a paper reached from a reference/citation list. */
export function paperTargetForRecord(record: PaperRecord, vaultPage: GraphPage | null, origin: PaperTarget["origin"]): PaperTarget {
  const hint = titlePaperId(record.title);
  return {
    ids: record.ids.length ? record.ids : hint ? [hint] : [],
    title: record.title,
    pagePath: vaultPage?.path ?? null,
    origin,
  };
}

/**
 * Paper details content shared by the sidecar view and the dialog: header metadata, abstract
 * (original / bilingual / translation only), paged references and citing papers, drill-down
 * history, and Add to vault / Link / Save to note actions.
 */
export class PaperDetailsPanel {
  private controller: AbortController;
  private target: PaperTarget;
  private readonly history: PaperTarget[] = [];
  private record: PaperRecord | null = null;
  private recordError = "";
  private lists: Record<PaperListKind, ListState> = { references: emptyList(), citations: emptyList() };
  private activeTab: PaperListKind = "references";
  private lookup: Map<string, TFile> | null = null;
  private filter = "";
  private readonly selected = new Set<string>();
  private readonly expanded = new Set<string>();
  private readonly busy = new Set<string>();
  private readonly titleTranslations = new Map<string, string>();
  private readonly titleRequests = new Set<string>();
  private bulkController: AbortController | null = null;
  private bulkStatus = "";
  private headerBusy = false;

  private readonly navEl: HTMLElement;
  private readonly headerEl: HTMLElement;
  private readonly abstractEl: HTMLElement;
  private readonly tabsEl: HTMLElement;
  private readonly toolbarEl: HTMLElement;
  private readonly listEl: HTMLElement;

  constructor(
    private readonly plugin: ExcaliBrainPlugin,
    private readonly containerEl: HTMLElement,
    private readonly host: PaperPanelHost,
    initial: PaperTarget,
  ) {
    this.controller = plugin.paperReading.createAbortController();
    this.target = initial;
    containerEl.addClass("kplex-paper-content");
    this.navEl = containerEl.createDiv({ cls: "kplex-paper-nav" });
    this.headerEl = containerEl.createDiv({ cls: "kplex-paper-header" });
    this.abstractEl = containerEl.createDiv({ cls: "kplex-paper-abstract-host" });
    this.tabsEl = containerEl.createDiv({ cls: "kplex-paper-tabs", attr: { role: "tablist" } });
    this.toolbarEl = containerEl.createDiv({ cls: "kplex-paper-toolbar" });
    this.listEl = containerEl.createDiv({ cls: "kplex-paper-list" });
    this.load();
  }

  private get paper() {
    return this.plugin.paperReading;
  }

  private get view(): PaperAbstractView {
    return this.plugin.settings.paperAbstractView;
  }

  private get translationOnly(): boolean {
    return this.view === "translation";
  }

  getTarget(): PaperTarget {
    return this.target;
  }

  destroy(): void {
    this.controller.abort();
    this.bulkController?.abort();
    this.paper.releaseAbortController(this.controller);
    this.containerEl.empty();
  }

  /** Show another paper. `push` records the current one for the Back button. */
  show(target: PaperTarget, push = true): void {
    if (push) this.history.push(this.target);
    this.controller.abort();
    this.bulkController?.abort();
    this.paper.releaseAbortController(this.controller);
    this.controller = this.paper.createAbortController();
    this.target = target;
    this.record = null;
    this.recordError = "";
    this.lists = { references: emptyList(), citations: emptyList() };
    this.activeTab = "references";
    this.filter = "";
    this.selected.clear();
    this.expanded.clear();
    this.busy.clear();
    this.containerEl.scrollTop = 0;
    this.host.targetChanged?.(target);
    this.load();
  }

  private load(): void {
    this.host.setTitle(this.target.title || "Paper details");
    this.renderAll();
    void this.loadRecord();
    void this.loadList(this.activeTab);
  }

  private renderAll(): void {
    this.renderNav();
    this.renderHeader();
    this.renderAbstractSection();
    this.renderTabs();
    this.renderToolbar();
    this.renderList();
  }

  // ------------------------------------------------------------------------------------------
  // Pages

  private vaultLookup(): Map<string, TFile> {
    this.lookup ??= this.paper.buildVaultLookup();
    return this.lookup;
  }

  /** Graph page for the shown paper: the known page, else a vault note matching the record. */
  private page(): GraphPage | null {
    const known = this.target.pagePath ? this.plugin.index.get(this.target.pagePath) ?? null : null;
    if (known?.file?.extension === "md") return known;
    const note = this.record ? this.paper.markdownPageFor(this.record, this.vaultLookup()) : null;
    return note ?? known;
  }

  private notePage(): GraphPage | null {
    const page = this.page();
    return page?.file?.extension === "md" ? page : null;
  }

  private originPage(): GraphPage | null {
    return this.target.origin ? this.plugin.index.get(this.target.origin.path) ?? null : null;
  }

  /** The page that relationships from the lists attach to. */
  private listCenter(kind: PaperListKind): GraphPage | null {
    const note = this.notePage();
    if (note) return note;
    // A doi/arXiv link node can be cited by a new note, but cannot store references itself.
    return kind === "citations" ? this.page() : null;
  }

  // ------------------------------------------------------------------------------------------
  // Data

  private async loadRecord(): Promise<void> {
    const controller = this.controller;
    try {
      this.record = await this.paper.metadata.lookup(this.target.ids, controller.signal);
      if (controller.signal.aborted) return;
      if (!this.target.pagePath) {
        const page = this.paper.vaultPageFor(this.record, this.vaultLookup());
        if (page) this.target = { ...this.target, pagePath: page.path };
      }
      this.host.setTitle(this.record.title);
      this.requestTitleTranslations([this.record]);
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      this.recordError = errorText(error);
    }
    this.renderHeader();
    this.renderAbstractSection();
    this.renderToolbar();
    this.renderList();
  }

  private async loadList(kind: PaperListKind): Promise<void> {
    const state = this.lists[kind];
    const controller = this.controller;
    if (state.loading || state.next === null) return;
    state.loading = true;
    state.error = "";
    this.renderTabs();
    if (kind === this.activeTab) this.renderList();
    try {
      const known = this.target.pagePath ? this.plugin.index.get(this.target.pagePath) ?? null : null;
      const note = known?.file?.extension === "md" ? known : this.notePage();
      const page = await this.paper.listPapers(
        this.target.ids, note, this.record?.title ?? this.target.title,
        kind, state.next, this.plugin.settings.paperListLimit, controller.signal,
      );
      if (controller.signal.aborted) return;
      state.source = page.source;
      const seen = new Set(state.items.map((item) => item.key));
      state.items.push(...page.items.filter((item) => !seen.has(item.key)));
      state.next = page.next;
      state.total = page.total;
      state.loaded = true;
      this.requestTitleTranslations(page.items);
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      state.error = errorText(error);
    } finally {
      state.loading = false;
    }
    if (this.lists[kind] !== state) return;
    this.renderTabs();
    if (kind === this.activeTab) {
      this.renderToolbar();
      this.renderList();
    }
  }

  private wantsTitleTranslations(): boolean {
    return this.plugin.settings.paperTranslateTitles || this.translationOnly;
  }

  private requestTitleTranslations(records: readonly PaperRecord[]): void {
    if (!this.wantsTitleTranslations()) return;
    const pending = records.map((record) => record.title).filter((title) => !this.titleTranslations.has(title) && !this.titleRequests.has(title));
    if (!pending.length) return;
    for (const title of pending) this.titleRequests.add(title);
    const controller = this.controller;
    this.paper.translation.translateLines(pending, controller.signal).then((translated) => {
      for (const [title, value] of translated) this.titleTranslations.set(title, value);
      if (controller.signal.aborted) return;
      this.renderHeader();
      this.renderList();
    }).catch((error: unknown) => {
      if (!isAbortError(error)) console.debug("K-Plex: title translation failed", error);
    }).finally(() => {
      for (const title of pending) this.titleRequests.delete(title);
    });
  }

  /** Title to show: the translation only in translation-only view, when available. */
  private displayTitle(title: string): string {
    return this.translationOnly ? this.titleTranslations.get(title) ?? title : title;
  }

  // ------------------------------------------------------------------------------------------
  // Navigation bar, header and abstract

  private renderNav(): void {
    this.navEl.empty();
    this.navEl.toggleClass("is-empty", this.history.length === 0);
    if (!this.history.length) return;
    const back = iconButton(this.navEl, "arrow-left", "Back");
    back.addEventListener("click", () => {
      const previous = this.history.pop();
      if (previous) this.show(previous, false);
    });
    const origin = this.originPage();
    if (origin && this.target.origin) {
      this.navEl.createSpan({
        cls: "kplex-paper-muted",
        text: `${this.target.origin.kind === "references" ? "Cited by" : "Cites"} ${this.plugin.index.titleFor(origin)}`,
      });
    }
  }

  private renderHeader(): void {
    this.headerEl.empty();
    const record = this.record;
    if (!record) {
      if (this.recordError) this.headerEl.createDiv({ cls: "kplex-paper-error", text: this.recordError });
      else this.headerEl.createDiv({ cls: "kplex-paper-status", text: "Loading paper details…" });
      return;
    }

    const translated = this.titleTranslations.get(record.title);
    this.headerEl.createDiv({ cls: "kplex-paper-title", text: this.displayTitle(record.title) });
    if (translated && !this.translationOnly) this.headerEl.createDiv({ cls: "kplex-paper-title-translation", text: translated });
    const meta = [authorLine(record.authors), record.venue, record.year ? String(record.year) : ""].filter(Boolean).join(" · ");
    if (meta) this.headerEl.createDiv({ cls: "kplex-paper-meta", text: meta });
    const stats = this.headerEl.createDiv({ cls: "kplex-paper-stats" });
    if (record.citationCount !== null) stats.createSpan({ text: `${record.citationCount.toLocaleString()} citations` });
    if (record.referenceCount !== null) stats.createSpan({ text: `${record.referenceCount.toLocaleString()} references` });
    const links = this.headerEl.createDiv({ cls: "kplex-paper-links" });
    for (const id of record.ids.filter((candidate) => candidate.kind === "doi" || candidate.kind === "arxiv")) {
      links.createEl("a", { text: id.kind === "arxiv" ? `arXiv:${id.value}` : `DOI:${id.value}`, href: paperIdUrl(id), cls: "external-link" });
    }
    if (record.pdfUrl) links.createEl("a", { text: "PDF", href: record.pdfUrl, cls: "external-link" });
    if (record.url && record.source === "semantic-scholar") links.createEl("a", { text: "Semantic Scholar", href: record.url, cls: "external-link" });

    const actions = this.headerEl.createDiv({ cls: "kplex-paper-header-actions" });
    this.renderArticleAction(actions, record);
    const note = this.notePage();
    if (note) {
      const locate = iconButton(actions, "locate-fixed", "Show in Plex");
      locate.addEventListener("click", () => this.host.showInPlex(note));
      const save = iconButton(actions, "file-down", "Save to note");
      save.disabled = this.headerBusy;
      save.addEventListener("click", () => void this.saveToNote(note, record));
    } else {
      const origin = this.originPage();
      const label = origin && this.target.origin
        ? this.target.origin.kind === "references" ? "Add to vault as reference" : "Add to vault as citing paper"
        : "Add to vault";
      const add = iconButton(actions, "download", label, "mod-cta");
      add.disabled = this.headerBusy;
      add.addEventListener("click", () => void this.addShownPaper(record));
    }
  }

  /** Import full text (built-in) or open the article for Obsidian Web Clipper. */
  private renderArticleAction(actions: HTMLElement, record: PaperRecord): void {
    if (this.plugin.settings.paperArticleImport === "web-clipper") {
      const url = articleBrowserUrl(record);
      if (!url) return;
      const clip = iconButton(actions, "scissors", "Clip with Web Clipper");
      clip.addEventListener("click", () => {
        window.open(url, "_blank", "noopener,noreferrer");
        new Notice("The article is open in your browser. Clip it with Obsidian Web Clipper; its template decides the note location.", 6000);
      });
      return;
    }
    if (!articleSourceUrls(record).length) return;
    const importButton = iconButton(actions, "file-text", this.articleStatus || "Import full text");
    importButton.disabled = this.headerBusy;
    importButton.addEventListener("click", () => void this.importArticle(record));
  }

  private articleStatus = "";

  private async importArticle(record: PaperRecord): Promise<void> {
    this.headerBusy = true;
    const controller = this.controller;
    const progress = (message: string) => {
      this.articleStatus = message;
      if (!controller.signal.aborted) this.renderHeader();
    };
    try {
      const lookup = this.vaultLookup();
      const note = this.notePage();
      const origin = this.originPage();
      const page = await this.paper.importArticle(
        record, note, !note && origin && this.target.origin ? { page: origin, kind: this.target.origin.kind } : null,
        lookup, progress, controller.signal,
      );
      if (page) {
        if (!note) {
          this.target = { ...this.target, pagePath: page.path };
          this.host.targetChanged?.(this.target);
        }
        new Notice(`Full text imported: ${page.path}`, 3500);
      }
    } catch (error) {
      if (!isAbortError(error)) new Notice(`Could not import the full text. ${errorText(error)}`, 5000);
    } finally {
      this.headerBusy = false;
      this.articleStatus = "";
      if (!controller.signal.aborted) {
        this.renderHeader();
        this.renderToolbar();
        this.renderList();
      }
    }
  }

  private async saveToNote(note: GraphPage, record: PaperRecord): Promise<void> {
    this.headerBusy = true;
    this.renderHeader();
    try {
      const translation = record.abstract ? this.paper.translation.peek(record.abstract) ?? null : null;
      const result = await this.paper.savePaperToNote(note, record, translation);
      const parts = [
        result.properties ? `${result.properties} propert${result.properties === 1 ? "y" : "ies"} added` : "",
        result.abstract ? "abstract saved" : "",
      ].filter(Boolean);
      new Notice(parts.length ? `Paper note updated: ${parts.join(", ")}.` : "The note already has this paper information.", 3000);
    } catch (error) {
      new Notice(`Could not update the note. ${errorText(error)}`, 4000);
    } finally {
      this.headerBusy = false;
      this.renderHeader();
    }
  }

  private async addShownPaper(record: PaperRecord): Promise<void> {
    this.headerBusy = true;
    this.renderHeader();
    try {
      const lookup = this.vaultLookup();
      const origin = this.originPage();
      const page = origin && this.target.origin
        ? await this.paper.addPaper(record, origin, this.target.origin.kind, lookup, this.controller.signal)
        : await this.paper.addStandalonePaper(record, lookup, this.controller.signal);
      if (page) {
        this.target = { ...this.target, pagePath: page.path };
        this.host.targetChanged?.(this.target);
        new Notice(`Added to vault: ${this.plugin.index.titleFor(page)}`, 2500);
      }
    } catch (error) {
      if (!isAbortError(error)) new Notice(`Could not add the paper. ${errorText(error)}`, 4000);
    } finally {
      this.headerBusy = false;
      this.renderHeader();
      this.renderToolbar();
      this.renderList();
    }
  }

  private renderAbstractSection(): void {
    this.abstractEl.empty();
    if (this.record) this.renderAbstract(this.abstractEl, this.record);
  }

  /** Abstract with an Original / Bilingual / translation-only toggle. */
  private renderAbstract(container: HTMLElement, record: PaperRecord): void {
    container.empty();
    const block = container.createDiv({ cls: "kplex-paper-abstract" });
    const bar = block.createDiv({ cls: "kplex-paper-abstract-bar" });
    bar.createSpan({ cls: "kplex-paper-abstract-label", text: "Abstract" });
    const body = block.createDiv({ cls: "kplex-paper-abstract-body" });

    if (!record.abstract) {
      body.createDiv({ cls: "kplex-paper-muted", text: record.tldr ? `TL;DR: ${record.tldr}` : "No abstract is available for this paper." });
      return;
    }

    const toggle = bar.createDiv({ cls: "kplex-paper-view-toggle", attr: { role: "group", "aria-label": "Abstract language" } });
    const views: Array<[PaperAbstractView, string]> = [
      ["original", "Original"],
      ["bilingual", "Bilingual"],
      ["translation", languageLabel(this.plugin.settings.paperTargetLanguage)],
    ];
    const buttons = views.map(([view, label]) => {
      const button = toggle.createEl("button", { text: label, attr: { type: "button", "aria-pressed": "false" } });
      button.addEventListener("click", () => this.setView(view));
      return [view, button] as const;
    });

    const paint = (): void => {
      const view = this.view;
      for (const [candidate, button] of buttons) {
        button.setAttr("aria-pressed", String(candidate === view));
        button.toggleClass("is-active", candidate === view);
      }
      body.empty();
      if (view === "original") {
        for (const paragraph of record.abstract.split(/\n\s*\n/)) body.createEl("p", { text: paragraph.trim() });
        return;
      }
      const cached = this.paper.translation.peek(record.abstract);
      if (cached) {
        this.renderTranslation(body, cached, view);
        return;
      }
      body.createDiv({ cls: "kplex-paper-muted", text: "Translating…" });
      const controller = this.controller;
      this.paper.translation.translate(record.abstract, controller.signal).then((result) => {
        if (this.view !== "original" && body.isConnected) this.renderTranslation(body, result, this.view);
      }).catch((error: unknown) => {
        if (isAbortError(error) || !body.isConnected) return;
        body.empty();
        body.createDiv({ cls: "kplex-paper-error", text: errorText(error) });
        const retry = iconButton(body, "rotate-ccw", "Retry");
        retry.addEventListener("click", () => paint());
      });
    };
    paint();
  }

  /** Switching views is global: it re-renders the header, abstracts and list titles. */
  private setView(view: PaperAbstractView): void {
    if (this.plugin.settings.paperAbstractView === view) return;
    this.plugin.settings.paperAbstractView = view;
    void this.plugin.saveSettings(false, false);
    if (this.record) this.requestTitleTranslations([this.record]);
    this.requestTitleTranslations(this.lists.references.items);
    this.requestTitleTranslations(this.lists.citations.items);
    this.renderHeader();
    this.renderAbstractSection();
    this.renderList();
  }

  private renderTranslation(body: HTMLElement, result: TranslationResult, view: PaperAbstractView): void {
    body.empty();
    const joiner = sentenceJoiner(this.plugin.settings.paperTargetLanguage);
    if (view === "translation") {
      const paragraphs = new Map<number, string[]>();
      for (const segment of result.segments) {
        if (!segment.target) continue;
        const list = paragraphs.get(segment.paragraph) ?? [];
        list.push(segment.target.split("\n").join(joiner));
        paragraphs.set(segment.paragraph, list);
      }
      for (const sentences of paragraphs.values()) body.createEl("p", { cls: "kplex-paper-translation", text: sentences.join(joiner) });
    } else {
      const list = body.createDiv({ cls: "kplex-paper-bilingual" });
      let paragraph = -1;
      let paragraphEl: HTMLElement | null = null;
      for (const segment of result.segments) {
        if (segment.paragraph !== paragraph || !paragraphEl) {
          paragraph = segment.paragraph;
          paragraphEl = list.createDiv({ cls: "kplex-paper-bilingual-paragraph" });
        }
        const pair = paragraphEl.createDiv({ cls: "kplex-paper-bilingual-pair" });
        pair.createDiv({ cls: "kplex-paper-bilingual-source", text: segment.source });
        if (segment.target) pair.createDiv({ cls: "kplex-paper-bilingual-target", text: segment.target.split("\n").join(joiner) });
      }
    }
    body.createDiv({
      cls: "kplex-paper-provider",
      text: `Translated by ${result.provider === "google" ? "Google Translate" : "Bing Translator"}${result.aligned ? "" : " · some sentences are shown by paragraph"}`,
    });
  }

  // ------------------------------------------------------------------------------------------
  // Tabs, toolbar and list

  private renderTabs(): void {
    this.tabsEl.empty();
    for (const kind of ["references", "citations"] as const) {
      const state = this.lists[kind];
      const count = state.total ?? (state.loaded ? state.items.length : null);
      const suffix = count !== null ? ` (${count.toLocaleString()}${state.next !== null && state.total === null ? "+" : ""})` : "";
      const tab = this.tabsEl.createEl("button", {
        cls: "kplex-paper-tab",
        text: `${TAB_LABEL[kind]}${suffix}`,
        attr: { type: "button", role: "tab", "aria-selected": String(kind === this.activeTab) },
      });
      tab.toggleClass("is-active", kind === this.activeTab);
      tab.addEventListener("click", () => {
        if (this.activeTab === kind) return;
        this.activeTab = kind;
        this.selected.clear();
        this.renderTabs();
        this.renderToolbar();
        this.renderList();
        if (!this.lists[kind].loaded) void this.loadList(kind);
      });
    }
  }

  private rowState(record: PaperRecord, center: GraphPage | null): { vaultPage: GraphPage | null; linked: boolean } {
    const vaultPage = this.paper.vaultPageFor(record, this.vaultLookup());
    if (!vaultPage || !center) return { vaultPage, linked: false };
    const linked = this.activeTab === "references"
      ? this.paper.isCitationLinked(center, vaultPage)
      : this.paper.isCitationLinked(vaultPage, center);
    return { vaultPage, linked };
  }

  private visibleItems(): PaperRecord[] {
    const query = this.filter.trim().toLowerCase();
    const items = this.lists[this.activeTab].items;
    if (!query) return items;
    return items.filter((item) =>
      item.title.toLowerCase().includes(query) ||
      item.authors.some((author) => author.toLowerCase().includes(query)) ||
      String(item.year ?? "").includes(query) ||
      (this.titleTranslations.get(item.title) ?? "").toLowerCase().includes(query));
  }

  private renderToolbar(): void {
    this.toolbarEl.empty();
    const search = this.toolbarEl.createEl("input", {
      cls: "kplex-paper-filter",
      attr: { type: "search", placeholder: "Filter by title, author or year", "aria-label": "Filter papers" },
    });
    search.value = this.filter;
    search.addEventListener("input", () => {
      this.filter = search.value;
      this.renderList();
    });

    const actions = this.toolbarEl.createDiv({ cls: "kplex-paper-bulk" });
    if (this.bulkController) {
      actions.createSpan({ cls: "kplex-paper-muted", text: this.bulkStatus });
      const cancel = iconButton(actions, "x", "Cancel");
      cancel.addEventListener("click", () => this.bulkController?.abort());
      return;
    }
    const center = this.listCenter(this.activeTab);
    if (!center) {
      actions.createSpan({ cls: "kplex-paper-muted", text: "Add this paper to the vault to add its references." });
      return;
    }
    const addSelected = iconButton(actions, "download", this.selected.size ? `Add selected (${this.selected.size})` : "Add selected");
    addSelected.disabled = this.selected.size === 0;
    addSelected.addEventListener("click", () => void this.runBulk("add"));
    const linkable = this.lists[this.activeTab].items.filter((item) => {
      const state = this.rowState(item, center);
      return state.vaultPage && !state.linked;
    }).length;
    const linkAll = iconButton(actions, "link", linkable ? `Link all in vault (${linkable})` : "Link all in vault");
    linkAll.disabled = linkable === 0;
    linkAll.addEventListener("click", () => void this.runBulk("link"));
  }

  private renderList(): void {
    // Re-rendering replaces rows; keep the reader's position in whichever element scrolls.
    const scrollers = [this.containerEl, this.containerEl.parentElement].filter((element): element is HTMLElement => element !== null);
    const positions = scrollers.map((element) => element.scrollTop);
    this.listEl.empty();
    const state = this.lists[this.activeTab];
    const items = this.visibleItems();
    const center = this.listCenter(this.activeTab);

    if (state.error && !state.items.length) {
      this.listEl.createDiv({ cls: "kplex-paper-error", text: state.error });
      const retry = iconButton(this.listEl, "rotate-ccw", "Retry");
      retry.addEventListener("click", () => void this.loadList(this.activeTab));
    } else {
      if (state.source && state.items.length) {
        this.listEl.createDiv({ cls: "kplex-paper-provider", text: SOURCE_LABEL[state.source] });
      }
      if (!items.length && state.loaded && !state.loading) {
        this.listEl.createDiv({ cls: "kplex-paper-muted", text: this.filter ? "No papers match the filter." : `No ${TAB_LABEL[this.activeTab].toLowerCase()} found.` });
      }
      for (const record of items) this.renderRow(record, center);
      const footer = this.listEl.createDiv({ cls: "kplex-paper-list-footer" });
      if (state.loading) footer.createSpan({ cls: "kplex-paper-muted", text: "Loading…" });
      else if (state.error) footer.createSpan({ cls: "kplex-paper-error", text: state.error });
      if (!state.loading && state.next !== null && state.loaded) {
        const more = iconButton(footer, "chevrons-down", "Load more");
        more.addEventListener("click", () => void this.loadList(this.activeTab));
      }
    }
    scrollers.forEach((element, index) => { element.scrollTop = positions[index]; });
  }

  private renderRow(record: PaperRecord, center: GraphPage | null): void {
    const { vaultPage, linked } = this.rowState(record, center);
    const row = this.listEl.createDiv({ cls: "kplex-paper-row" });
    row.toggleClass("is-linked", linked);

    const check = row.createEl("input", { cls: "kplex-paper-check", attr: { type: "checkbox", "aria-label": `Select ${record.title}` } });
    check.checked = this.selected.has(record.key);
    check.disabled = linked || !center || Boolean(this.bulkController);
    check.addEventListener("change", () => {
      if (check.checked) this.selected.add(record.key);
      else this.selected.delete(record.key);
      this.renderToolbar();
    });

    const main = row.createDiv({ cls: "kplex-paper-row-main" });
    // The title opens this paper's details (abstract, its own references and citing papers).
    const title = main.createEl("a", { cls: "kplex-paper-row-title", text: this.displayTitle(record.title), attr: { href: "#" } });
    title.addEventListener("click", (event) => {
      event.preventDefault();
      const origin = center ? { path: center.path, kind: this.activeTab } : null;
      this.show(paperTargetForRecord(record, vaultPage, origin));
    });
    const translated = this.titleTranslations.get(record.title);
    if (translated && !this.translationOnly) main.createDiv({ cls: "kplex-paper-row-translation", text: translated });

    const meta = main.createDiv({ cls: "kplex-paper-row-meta" });
    const firstAuthor = record.authors.length ? `${record.authors[0]}${record.authors.length > 1 ? " et al." : ""}` : "";
    meta.createSpan({ text: [record.year ? String(record.year) : "", firstAuthor, record.venue].filter(Boolean).join(" · ") });
    if (record.citationCount !== null) meta.createSpan({ cls: "kplex-paper-count", text: `${record.citationCount.toLocaleString()} cited` });
    if (vaultPage) meta.createSpan({ cls: "kplex-paper-badge", text: linked ? "Linked" : "In vault" });

    const actions = row.createDiv({ cls: "kplex-paper-row-actions" });
    if (vaultPage) {
      const locate = iconButton(actions, "locate-fixed", "Show in Plex", "kplex-paper-icon-only");
      locate.addEventListener("click", () => this.host.showInPlex(vaultPage));
    }
    const isExpanded = this.expanded.has(record.key);
    const toggle = iconButton(actions, isExpanded ? "chevron-up" : "chevron-down", "Abstract", "kplex-paper-icon-only");
    toggle.setAttr("aria-expanded", String(isExpanded));
    const lookupIds = this.paper.lookupIds(record);
    toggle.disabled = !lookupIds.length && !record.abstract;
    toggle.addEventListener("click", () => {
      if (this.expanded.has(record.key)) this.expanded.delete(record.key);
      else this.expanded.add(record.key);
      this.renderList();
    });

    if (center && !linked) {
      const busy = this.busy.has(record.key);
      const action = vaultPage ? iconButton(actions, "link", "Link") : iconButton(actions, "download", "Add to vault");
      action.disabled = busy || Boolean(this.bulkController);
      if (busy) action.addClass("is-busy");
      action.addEventListener("click", () => void this.addOne(record));
    }

    if (isExpanded) {
      const detail = row.createDiv({ cls: "kplex-paper-row-detail" });
      const cached = lookupIds.length ? this.paper.metadata.peek(lookupIds[0]) : undefined;
      const full = cached ?? (record.abstract ? record : null);
      if (full) {
        this.renderAbstract(detail, full);
      } else {
        detail.createDiv({ cls: "kplex-paper-muted", text: "Loading abstract…" });
        this.paper.metadata.lookup(lookupIds, this.controller.signal).then((loaded) => {
          if (detail.isConnected) this.renderAbstract(detail, loaded);
        }).catch((error: unknown) => {
          if (isAbortError(error) || !detail.isConnected) return;
          detail.empty();
          detail.createDiv({ cls: "kplex-paper-error", text: errorText(error) });
        });
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // Actions

  private async addOne(record: PaperRecord): Promise<void> {
    const center = this.listCenter(this.activeTab);
    if (!center || this.busy.has(record.key)) return;
    this.busy.add(record.key);
    this.renderList();
    const controller = this.controller;
    try {
      const page = await this.paper.addPaper(record, center, this.activeTab, this.vaultLookup(), controller.signal);
      if (page) new Notice(`${this.activeTab === "references" ? "Reference" : "Citing paper"} linked: ${this.plugin.index.titleFor(page)}`, 2500);
    } catch (error) {
      if (!isAbortError(error)) new Notice(`Could not add the paper. ${errorText(error)}`, 4000);
    } finally {
      this.busy.delete(record.key);
      this.selected.delete(record.key);
      if (!controller.signal.aborted) {
        this.renderToolbar();
        this.renderList();
      }
    }
  }

  private async runBulk(mode: "add" | "link"): Promise<void> {
    const kind = this.activeTab;
    const center = this.listCenter(kind);
    if (!center) return;
    const targets = this.lists[kind].items.filter((item) => {
      const state = this.rowState(item, center);
      if (state.linked) return false;
      return mode === "add" ? this.selected.has(item.key) : Boolean(state.vaultPage);
    });
    if (!targets.length) return;
    const bulk = new AbortController();
    this.bulkController = bulk;
    const panelSignal = this.controller.signal;
    const abortBulk = () => bulk.abort();
    panelSignal.addEventListener("abort", abortBulk, { once: true });
    let done = 0;
    let failed = 0;
    try {
      for (const record of targets) {
        if (bulk.signal.aborted) break;
        this.bulkStatus = `${mode === "add" ? "Adding" : "Linking"} ${done + failed + 1} of ${targets.length}…`;
        this.renderToolbar();
        try {
          await this.paper.addPaper(record, center, kind, this.vaultLookup(), bulk.signal);
          done += 1;
        } catch (error) {
          if (isAbortError(error)) break;
          failed += 1;
        }
        this.selected.delete(record.key);
        this.renderList();
      }
    } finally {
      panelSignal.removeEventListener("abort", abortBulk);
      if (this.bulkController === bulk) this.bulkController = null;
      this.bulkStatus = "";
    }
    if (panelSignal.aborted) return;
    new Notice(`${done} paper${done === 1 ? "" : "s"} ${mode === "add" ? "added" : "linked"}${failed ? `, ${failed} failed` : ""}.`, 3000);
    this.renderToolbar();
    this.renderList();
  }
}

/** Stable key for comparing two targets (used to avoid reloading the same paper). */
export function paperTargetKey(target: PaperTarget): string {
  return target.ids.map(paperKey).join("|") || target.title.toLowerCase();
}
