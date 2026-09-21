import { FileView, MarkdownView, Menu, Notice, Platform, Plugin, TFile, normalizePath, type Editor, type EventRef, type HoverParent, type WorkspaceLeaf } from "obsidian";
import { GraphIndex } from "./index/GraphIndex";
import { DEFAULT_SETTINGS, ExcaliBrainSettingTab, migrateAndMergeSettings, type ExcaliBrainSettings, type KplexLayoutProfile, type KplexViewSurface } from "./settings";
import { EXCALIBRAIN_VIEW_TYPE, KPLEX_SIDEPANEL_VIEW_TYPE, ExcaliBrainView, KplexSidepanelView } from "./ui/ExcaliBrainView";
import { RelationModal, type RelationModalOptions } from "./ui/RelationModal";
import { LinkDirection, type GateRole, type GraphPage } from "./types";
import { OntologySuggester } from "./editor/OntologySuggester";
import { extractLinksFromValue, normalizeFieldName, parseBodyMetadata } from "./index/fieldParser";
import { AddToOntologyModal, type OntologyAssignmentRole } from "./ui/AddToOntologyModal";
import { NoteTypeModal } from "./ui/NoteTypeModal";
import { activeLayoutProfile, currentDeviceClass, effectiveViewSettings, layoutProfileKey } from "./ui/viewProfile";

export default class ExcaliBrainPlugin extends Plugin {
  settings: ExcaliBrainSettings = DEFAULT_SETTINGS;
  index!: GraphIndex;
  private rebuildTimer: number | null = null;
  private indexDirty = true;
  private linkedDocumentLeaf: WorkspaceLeaf | null = null;
  private lastDocumentLeaf: WorkspaceLeaf | null = null;
  private readonly hoverParent: HoverParent = { hoverPopover: null };
  private reactiveIndexListenersRegistered = false;
  private openKplexViews = 0;
  private layoutReady = false;
  private metadataStabilized = false;
  private metadataStabilityPromise: Promise<number> | null = null;
  private readonly indexBacklogReasons = new Set<string>();

  private runningExcaliBrainSettings(): unknown {
    // Obsidian does not currently expose the community-plugin registry as public API. The
    // legacy ExcaliBrain plugin does expose its loaded settings on the plugin instance, so keep
    // this guarded bridge isolated here. K-Plex has its own manifest id (k-plex), allowing both
    // plugins to run side by side during migration.
    type RuntimePlugin = Plugin & { settings?: unknown };
    type PluginManagerBridge = { plugins?: Record<string, RuntimePlugin> };
    const manager = (this.app as unknown as { plugins?: PluginManagerBridge }).plugins;
    const legacy = manager?.plugins?.excalibrain;
    if (!legacy || legacy === (this as unknown as RuntimePlugin)) return null;
    return legacy.settings ?? null;
  }

  async onload(): Promise<void> {
    const ownData: unknown = await this.loadData();
    const ownRecord = ownData && typeof ownData === "object" ? ownData as Record<string, unknown> : null;
    const alreadyKplex = Boolean(
      ownRecord?.kplexInitialized ||
      ownRecord?.connectorStyle ||
      ownRecord?.graphDepth ||
      ownRecord?.parentColumns ||
      ownRecord?.childColumns ||
      ownRecord?.noteTypeField
    );
    this.settings = migrateAndMergeSettings(ownData);
    if (alreadyKplex && !ownRecord?.kplexInitialized) {
      this.settings.kplexInitialized = true;
      await this.saveData(this.settings);
    }

    this.index = new GraphIndex(this);

    this.registerView(EXCALIBRAIN_VIEW_TYPE, (leaf: WorkspaceLeaf) => new ExcaliBrainView(leaf, this));
    this.registerView(KPLEX_SIDEPANEL_VIEW_TYPE, (leaf: WorkspaceLeaf) => new KplexSidepanelView(leaf, this));
    this.registerHoverLinkSource(EXCALIBRAIN_VIEW_TYPE, { display: "K-Plex", defaultMod: false });
    this.registerHoverLinkSource(KPLEX_SIDEPANEL_VIEW_TYPE, { display: "K-Plex", defaultMod: false });
    this.addSettingTab(new ExcaliBrainSettingTab(this.app, this));
    this.registerEditorSuggest(new OntologySuggester(this));
    this.addRibbonIcon("brain-circuit", "Open K-Plex", () => void this.activateView());

    // Keep legacy command IDs so existing hotkeys continue to work.
    this.addCommand({ id: "excalibrain-start", name: "Open graph", callback: () => void this.activateView() });
    this.addCommand({ id: "excalibrain-rebuild-index", name: "Rebuild index", callback: () => void this.rebuildIndex(true) });
    this.addCommand({ id: "kplex-open-settings", name: "Open settings", callback: () => this.openSettings() });
    this.addCommand({ id: "kplex-open-popout", name: "Open in pop-out window", callback: () => void this.activateViewInPopout() });
    this.addCommand({ id: "kplex-open-sidepanel", name: "Open in side panel", callback: () => void this.activateSidepanel() });
    this.registerOntologyCommands();
    this.addCommand({
      id: "excalibrain-focus-active-note",
      name: "Focus active note",
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) void this.focusInBrain(file.path);
        return true;
      }
    });

    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      this.rememberDocumentLeaf(leaf);
      this.validateLinkedDocumentLeaf();
    }));

    if (this.settings.indexUpdateInterval > 0) {
      const interval = Math.max(5000, this.settings.indexUpdateInterval);
      this.registerInterval(window.setInterval(() => void this.rebuildIndex(false, false, "interval"), interval));
    }

    this.app.workspace.onLayoutReady(() => {
      void (async () => {
        this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());

        if (!alreadyKplex) {
          const legacySettings = this.runningExcaliBrainSettings();
          if (legacySettings) {
            this.settings = migrateAndMergeSettings(legacySettings);
            new Notice("Imported ExcaliBrain settings into K-Plex.", 2600);
          }
          this.settings.kplexInitialized = true;
          await this.saveData(this.settings);
        }

        this.layoutReady = true;
        this.registerReactiveIndexListeners();
        this.registerOntologyContextMenu();
        // Opening/restoring a K-Plex view is the demand signal for expensive indexing. Vault
        // events while no view is open simply accumulate in indexBacklogReasons.
        if (this.openKplexViews > 0) await this.ensureIndexReady("layout-ready-view-open");
      })();
    });
  }

  onunload(): void {
    if (this.rebuildTimer !== null) window.clearTimeout(this.rebuildTimer);
    this.index?.destroy();
  }

  private registerReactiveIndexListeners(): void {
    if (this.reactiveIndexListenersRegistered) return;
    this.reactiveIndexListenersRegistered = true;

    this.registerEvent(this.app.vault.on("create", () => this.scheduleRebuild("vault:create")));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRebuild("vault:delete")));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRebuild("vault:rename")));
    this.registerEvent(this.app.metadataCache.on("changed", () => this.scheduleRebuild("metadata:changed")));
    this.registerEvent(this.app.metadataCache.on("resolved", () => this.scheduleRebuild("metadata:resolved")));
  }

  private async waitForMetadataCacheStability(): Promise<number> {
    const started = performance.now();
    const markdownFiles = this.app.vault.getMarkdownFiles().length;
    if (markdownFiles === 0) {
      return 0;
    }

    // `resolvedLinks` is public API and, after the initial metadata pass, normally contains an
    // entry for essentially every Markdown source. Do not require exactly 100% because plugins,
    // ignored files, and timing differences can make the counts differ slightly. We additionally
    // require the count to stay unchanged for a short quiet window.
    const maxWaitMs = 4000;
    const quietWindowMs = 350;
    const pollMs = 100;
    const minimumCoverage = 0.95;
    let lastCount = Object.keys(this.app.metadataCache.resolvedLinks).length;
    let stableSince = performance.now();

    while (performance.now() - started < maxWaitMs) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, pollMs));
      const now = performance.now();
      const count = Object.keys(this.app.metadataCache.resolvedLinks).length;
      if (count !== lastCount) {
        lastCount = count;
        stableSince = now;
      }
      const coverage = markdownFiles > 0 ? count / markdownFiles : 1;
      if (coverage >= minimumCoverage && now - stableSince >= quietWindowMs) {
        break;
      }
    }

    return lastCount;
  }

  private scheduleRebuild(reason = "unknown"): void {
    this.indexDirty = true;
    this.indexBacklogReasons.add(reason);
    if (this.openKplexViews <= 0) return;
    if (this.rebuildTimer !== null) window.clearTimeout(this.rebuildTimer);
    this.rebuildTimer = window.setTimeout(() => {
      this.rebuildTimer = null;
      void this.rebuildIndex(false, false, reason);
    }, 900);
  }

  async onKplexViewOpened(): Promise<void> {
    this.openKplexViews += 1;
    if (!this.layoutReady) return;
    await this.ensureIndexReady("view-open");
  }

  onKplexViewClosed(): void {
    this.openKplexViews = Math.max(0, this.openKplexViews - 1);
    if (this.openKplexViews > 0) return;
    if (this.rebuildTimer !== null) {
      window.clearTimeout(this.rebuildTimer);
      this.rebuildTimer = null;
    }
    this.index.cancelRebuild();
  }

  async ensureIndexReady(reason = "view-open"): Promise<void> {
    if (!this.layoutReady) return;
    if (!this.metadataStabilized) {
      this.metadataStabilityPromise ??= this.waitForMetadataCacheStability();
      await this.metadataStabilityPromise;
      this.metadataStabilized = true;
      this.indexDirty = true;
    }
    await this.rebuildIndex(false, this.index.size === 0, reason);
  }

  async rebuildIndex(showNotice = false, force = false, reason = "direct"): Promise<void> {
    const explicitlyRequested = showNotice;
    if (this.openKplexViews <= 0 && !explicitlyRequested) {
      this.indexDirty = true;
      this.indexBacklogReasons.add(reason);
      return;
    }
    const shouldSkip = !force && !showNotice && !this.indexDirty && this.index.size > 0;
    if (shouldSkip) return;
    if (showNotice) new Notice("Rebuilding K-Plex index…", 1200);
    const published = await this.index.rebuild();
    if (!published) {
      this.indexDirty = true;
      this.indexBacklogReasons.add(reason);
      return;
    }
    this.indexDirty = false;
    this.indexBacklogReasons.clear();
    await this.refreshBookmarkedEntryPoints();
    if (showNotice) new Notice(`K-Plex indexed ${this.index.size} nodes.`, 1800);
  }

  async saveSettings(reindex = false, notifyIndex = true): Promise<void> {
    this.settings.primaryTagFieldLowerCase = this.settings.primaryTagField.toLowerCase().replaceAll(" ", "-");
    await this.saveData(this.settings);
    if (reindex) this.scheduleRebuild("settings");
    else if (notifyIndex) this.index.notify();
  }

  private isDocumentLeafCandidate(leaf: WorkspaceLeaf | null): leaf is WorkspaceLeaf {
    if (!leaf) return false;
    const viewState = leaf.getViewState();
    if (viewState.type === EXCALIBRAIN_VIEW_TYPE || viewState.type === KPLEX_SIDEPANEL_VIEW_TYPE) return false;
    if (viewState.type === "empty" || leaf.view instanceof FileView) return true;

    // Background tabs can be DeferredView instances. Inspect serialized view state instead
    // of assuming leaf.view is already a FileView (Obsidian 1.7.2+ deferred views).
    const state = viewState.state as { file?: unknown } | undefined;
    return typeof state?.file === "string";
  }

  private leafIsAttached(leaf: WorkspaceLeaf): boolean {
    let attached = false;
    this.app.workspace.iterateAllLeaves((candidate) => {
      if (candidate === leaf) attached = true;
    });
    return attached;
  }

  private rememberDocumentLeaf(leaf: WorkspaceLeaf | null): void {
    if (this.isDocumentLeafCandidate(leaf)) this.lastDocumentLeaf = leaf;
  }

  private validateLinkedDocumentLeaf(): void {
    if (this.linkedDocumentLeaf && !this.leafIsAttached(this.linkedDocumentLeaf)) this.linkedDocumentLeaf = null;
    if (this.lastDocumentLeaf && !this.leafIsAttached(this.lastDocumentLeaf)) this.lastDocumentLeaf = null;
  }

  private findRecentDocumentLeaf(): WorkspaceLeaf | null {
    this.validateLinkedDocumentLeaf();
    if (this.isDocumentLeafCandidate(this.lastDocumentLeaf)) return this.lastDocumentLeaf;

    const recent = this.app.workspace.getMostRecentLeaf();
    if (this.isDocumentLeafCandidate(recent)) {
      this.lastDocumentLeaf = recent;
      return recent;
    }

    let candidate: WorkspaceLeaf | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!candidate && this.isDocumentLeafCandidate(leaf)) candidate = leaf;
    });
    if (candidate) this.lastDocumentLeaf = candidate;
    return candidate;
  }

  private fileForLeaf(leaf: WorkspaceLeaf | null): TFile | null {
    if (!leaf) return null;
    if (leaf.view instanceof FileView && leaf.view.file) return leaf.view.file;

    const state = leaf.getViewState().state as { file?: unknown } | undefined;
    if (typeof state?.file !== "string") return null;
    const abstractFile = this.app.vault.getAbstractFileByPath(state.file);
    return abstractFile instanceof TFile ? abstractFile : null;
  }

  isDocumentLeafLinked(): boolean {
    this.validateLinkedDocumentLeaf();
    return this.linkedDocumentLeaf !== null;
  }

  getLinkedDocumentFile(): TFile | null {
    this.validateLinkedDocumentLeaf();
    return this.fileForLeaf(this.linkedDocumentLeaf);
  }

  getLinkedDocumentLeafLabel(): string | null {
    this.validateLinkedDocumentLeaf();
    if (!this.linkedDocumentLeaf) return null;
    const file = this.getLinkedDocumentFile();
    return file?.basename ?? this.linkedDocumentLeaf.getDisplayText();
  }

  shouldFollowDocumentFile(file: TFile): boolean {
    if (!this.settings.followActiveFile || !this.settings.autoOpenCentralDocument) return false;
    this.validateLinkedDocumentLeaf();
    const leaf = this.linkedDocumentLeaf ?? this.findRecentDocumentLeaf();
    return this.fileForLeaf(leaf)?.path === file.path;
  }

  async setDocumentLeafLinked(linked: boolean, page?: GraphPage): Promise<void> {
    this.validateLinkedDocumentLeaf();
    if (!linked) {
      this.linkedDocumentLeaf = null;
      return;
    }

    const candidate = this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.linkedDocumentLeaf = candidate;
    this.lastDocumentLeaf = candidate;

    if (this.settings.autoOpenCentralDocument && page?.file) {
      await candidate.openFile(page.file, { active: false });
    }
  }

  async syncPageToDocumentLeaf(page: GraphPage): Promise<void> {
    if (!this.settings.autoOpenCentralDocument || !page.file) return;
    this.validateLinkedDocumentLeaf();
    const leaf = this.linkedDocumentLeaf ?? this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(page.file, { active: false });
  }

  async activateView(): Promise<void> {
    if (Platform.isMobile) {
      await this.activateSidepanel();
      return;
    }
    this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());
    let leaf = this.app.workspace.getLeavesOfType(EXCALIBRAIN_VIEW_TYPE)[0];
    if (!leaf) {
      if (this.settings.startInPopout) {
        try { leaf = this.app.workspace.getLeaf("window"); }
        catch { leaf = this.app.workspace.getLeaf(true); }
      } else {
        leaf = this.app.workspace.getLeaf(true);
      }
      await leaf.setViewState({ type: EXCALIBRAIN_VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  async activateSidepanel(): Promise<void> {
    this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());
    let leaf = this.app.workspace.getLeavesOfType(KPLEX_SIDEPANEL_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: KPLEX_SIDEPANEL_VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  async activateViewInPopout(): Promise<void> {
    this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());
    try {
      const leaf = this.app.workspace.getLeaf("window");
      await leaf.setViewState({ type: EXCALIBRAIN_VIEW_TYPE, active: true });
      await this.app.workspace.revealLeaf(leaf);
    } catch {
      new Notice("Pop-out windows are not available on this platform.", 2200);
    }
  }

  async focusInBrain(path: string): Promise<void> {
    await this.activateView();
    await this.ensureIndexReady("focus-active-note");
    if (!this.index.get(path)) return;
    const history = [...this.settings.navigationHistory.filter((p) => p !== path), path].slice(-40);
    this.settings.navigationHistory = history;
    this.settings.lastActivePath = path;
    await this.saveSettings(false, false);
  }

  async openInDocumentLeaf(file: TFile): Promise<void> {
    this.validateLinkedDocumentLeaf();
    const leaf = this.linkedDocumentLeaf ?? this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(file, { active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  async openSection(page: GraphPage): Promise<void> {
    const sourcePath = page.transient?.sourcePath;
    const subpath = page.transient?.subpath;
    if (!sourcePath || !subpath) return;
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) return;
    this.validateLinkedDocumentLeaf();
    const leaf = this.linkedDocumentLeaf ?? this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(file, { active: true, eState: { subpath } });
    await this.app.workspace.revealLeaf(leaf);
  }

  async openPage(page: GraphPage): Promise<void> {
    if (page.url) {
      window.open(page.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (page.file) {
      await this.openInDocumentLeaf(page.file);
      return;
    }
    if (page.isFolder || page.isTag) {
      new Notice(page.isFolder ? `Folder: ${page.name}` : `Tag: #${page.name}`, 1600);
      return;
    }
    await this.createGhostNote(page.path);
  }

  getViewSettings(surface: KplexViewSurface): ExcaliBrainSettings {
    return effectiveViewSettings(this.settings, surface);
  }

  getActiveLayoutProfile(surface: KplexViewSurface): KplexLayoutProfile {
    return activeLayoutProfile(this.settings, surface);
  }

  async updateLayoutProfile(surface: KplexViewSurface, patch: Partial<KplexLayoutProfile>): Promise<void> {
    const key = layoutProfileKey(surface, currentDeviceClass());
    const current = this.getActiveLayoutProfile(surface);
    this.settings.layoutProfiles[key] = { ...current, ...patch };
    await this.saveSettings(false, false);
    this.index.notify();
  }

  isPinned(path: string): boolean { return this.settings.pinnedNodes.includes(path); }

  async togglePinned(path: string): Promise<void> {
    this.settings.pinnedNodes = this.isPinned(path)
      ? this.settings.pinnedNodes.filter((item) => item !== path)
      : [...this.settings.pinnedNodes.filter((item) => item !== path), path];
    await this.saveSettings(false, false);
    this.index.notify();
  }

  openNoteTypeModal(page: GraphPage): void {
    if (!page.file || page.file.extension !== "md") return;
    new NoteTypeModal(this, page.file, page.noteType).open();
  }

  openAddToOntologyModal(field: string): void {
    if (!field.trim()) return;
    new AddToOntologyModal(this, field.trim()).open();
  }

  async assignFieldToOntology(field: string, role: OntologyAssignmentRole): Promise<void> {
    const normalized = normalizeFieldName(field);
    const h = this.settings.hierarchy;
    const remove = (items: string[]) => items.filter((item) => normalizeFieldName(item) !== normalized);
    h.hidden = remove(h.hidden);
    h.parents = remove(h.parents);
    h.children = remove(h.children);
    h.leftFriends = remove(h.leftFriends);
    h.rightFriends = remove(h.rightFriends);
    h.previous = remove(h.previous);
    h.next = remove(h.next);
    h.exclusions = remove(h.exclusions);
    const target = role === "parent" ? h.parents
      : role === "child" ? h.children
      : role === "left" ? h.leftFriends
      : role === "right" ? h.rightFriends
      : role === "previous" ? h.previous
      : role === "next" ? h.next
      : role === "hidden" ? h.hidden : h.exclusions;
    target.push(field.trim());
    target.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    await this.saveSettings(true);
  }

  private fieldAtEditorCursor(editor: Editor): string | null {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    // Match classic ExcaliBrain's supported Dataview wrappers, but prefer the actual field whose
    // source span contains the cursor when K-Plex's parser can identify it.
    const parsed = parseBodyMetadata(line);
    const occurrence = parsed.inlineFieldOccurrences.find((item) => cursor.ch >= item.start && cursor.ch <= item.end)
      ?? parsed.inlineFieldOccurrences[parsed.inlineFieldOccurrences.length - 1];
    if (occurrence?.name) return occurrence.name;
    const re = /(?:^|[([])(?:==|\*\*|~~|\*|_|__)?([^:\]()]*?)(?:==|\*\*|~~|\*|_|__)?::/g;
    let match: RegExpExecArray | null;
    let last: RegExpExecArray | null = null;
    while ((match = re.exec(line)) !== null) last = match;
    if (last?.[1]?.trim()) return last[1].trim();
    // YAML property under the cursor is also eligible for ontology management.
    const yaml = line.match(/^\s*([^:#][^:]{0,120}):(?:\s|$)/);
    return yaml?.[1]?.trim() ?? null;
  }

  private registerOntologyContextMenu(): void {
    this.registerEvent(this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
      if (!(view instanceof MarkdownView)) return;
      const field = this.fieldAtEditorCursor(editor);
      if (!field) return;
      menu.addItem((item) => item
        .setTitle(`Add/change “${field}” in K-Plex ontology`)
        .setIcon("network")
        .onClick(() => this.openAddToOntologyModal(field)));
    }));
  }

  private registerOntologyCommands(): void {
    const roles: Array<[string, string, OntologyAssignmentRole | "select"]> = [
      ["kplex-ontology-select", "Assign field to K-Plex ontology…", "select"],
      ["kplex-ontology-parent", "Assign field as Parent ontology", "parent"],
      ["kplex-ontology-child", "Assign field as Child ontology", "child"],
      ["kplex-ontology-left", "Assign field as Friend / left ontology", "left"],
      ["kplex-ontology-right", "Assign field as Challenger / right ontology", "right"],
      ["kplex-ontology-previous", "Assign field as Previous ontology", "previous"],
      ["kplex-ontology-next", "Assign field as Next ontology", "next"],
      ["kplex-ontology-hidden", "Assign field as Hidden ontology", "hidden"],
      ["kplex-ontology-excluded", "Assign field as Excluded / metadata-only ontology", "excluded"],
    ];
    for (const [id, name, role] of roles) {
      this.addCommand({
        id,
        name,
        editorCheckCallback: (checking: boolean, editor: Editor) => {
          const field = this.fieldAtEditorCursor(editor);
          if (!field) return false;
          if (!checking) {
            if (role === "select") this.openAddToOntologyModal(field);
            else void this.assignFieldToOntology(field, role);
          }
          return true;
        },
      });
    }
  }

  private async refreshBookmarkedEntryPoints(): Promise<void> {
    const paths: string[] = [];
    type BookmarkItem = { type?: string; path?: string; items?: BookmarkItem[] };
    type InternalPlugin = {
      enabled?: boolean;
      _loaded?: boolean;
      instance?: { items?: BookmarkItem[] };
      loadData?: () => Promise<{ items?: BookmarkItem[] }>;
    };
    type Registry = { getPluginById?: (id: string) => InternalPlugin | undefined; plugins?: Record<string, InternalPlugin> };
    const registry = (this.app as unknown as { internalPlugins?: Registry }).internalPlugins;

    const collect = (items: BookmarkItem[] | undefined): void => {
      for (const item of items ?? []) {
        if (item.type === "file" && item.path && item.path !== this.settings.excalibrainFilepath && this.index.get(item.path)) {
          paths.push(item.path);
        } else if (item.type === "folder" && item.path && this.index.get(`folder:${item.path}`)) {
          paths.push(`folder:${item.path}`);
        }
        if (item.type === "group" || item.items) collect(item.items);
      }
    };

    try {
      const bookmarks = registry?.getPluginById?.("bookmarks") ?? registry?.plugins?.bookmarks;
      if (bookmarks && bookmarks.enabled !== false) {
        // Obsidian lazily loads the internal Bookmarks plugin. Match classic ExcaliBrain: load
        // its persisted data before inspecting nested groups rather than assuming instance.items
        // is already populated.
        if (!bookmarks._loaded && bookmarks.loadData) await bookmarks.loadData();
        collect(bookmarks.instance?.items);
      } else {
        // Older Obsidian releases used the Starred internal plugin. Its persisted format only
        // supplied file entry points in classic ExcaliBrain, but `collect` safely accepts groups
        // and folders too if they are present.
        const starred = registry?.getPluginById?.("starred") ?? registry?.plugins?.starred;
        if (starred?.loadData) collect((await starred.loadData())?.items);
      }
    } catch (error) {
      console.warn("K-Plex: unable to load Obsidian bookmarks", error);
    }

    this.index.setSearchEntryPoints([...new Set(paths)]);
    this.index.notify();
  }

  openSettings(): void {
    // Obsidian currently has no public Plugin API method for programmatically opening a
    // specific settings tab. Keep the internal bridge isolated and guarded so the rest of
    // K-Plex only relies on the public API surface.
    type SettingsController = { open?: () => void; openTabById?: (id: string) => void };
    const controller = (this.app as unknown as { setting?: SettingsController }).setting;
    if (controller?.open && controller.openTabById) {
      controller.open();
      controller.openTabById(this.manifest.id);
      return;
    }
    new Notice("Open Settings → Community plugins → K-Plex.", 3000);
  }

  openRelationModal(options: RelationModalOptions): void {
    new RelationModal(this, options).open();
  }

  triggerHoverPreview(page: GraphPage, targetEl: HTMLElement, event: MouseEvent | PointerEvent, sourcePath = ""): void {
    if (!page.file) return;
    this.app.workspace.trigger("hover-link", {
      event,
      source: EXCALIBRAIN_VIEW_TYPE,
      hoverParent: this.hoverParent,
      targetEl,
      linktext: page.file.path,
      sourcePath,
    });
  }

  ontologyFieldsForRole(role: GateRole): string[] {
    const h = this.settings.hierarchy;
    switch (role) {
      case "parent": return [...h.parents];
      case "child": return [...h.children];
      // Previous/next occupy the same physical gates as the lateral ontologies, so they
      // belong in the chooser for that direction even though they are asymmetric pairs.
      case "left": return [...h.leftFriends, ...h.previous];
      case "right": return [...h.rightFriends, ...h.next];
    }
  }

  inverseGateRole(role: GateRole): GateRole {
    if (role === "parent") return "child";
    if (role === "child") return "parent";
    return role;
  }

  ontologyRoleForField(field: string): OntologyAssignmentRole | null {
    const normalized = normalizeFieldName(field);
    const h = this.settings.hierarchy;
    const has = (items: string[]) => items.some((item) => normalizeFieldName(item) === normalized);
    if (has(h.hidden)) return "hidden";
    if (has(h.parents)) return "parent";
    if (has(h.children)) return "child";
    if (has(h.leftFriends)) return "left";
    if (has(h.rightFriends)) return "right";
    if (has(h.previous)) return "previous";
    if (has(h.next)) return "next";
    if (has(h.exclusions)) return "excluded";
    return null;
  }

  inverseOntologyField(field: string, semanticRole: GateRole): string {
    const group = this.ontologyRoleForField(field);
    const h = this.settings.hierarchy;
    switch (group) {
      case "parent": return this.defaultOntologyField("child");
      case "child": return this.defaultOntologyField("parent");
      case "previous": return h.next[0] ?? "Next";
      case "next": return h.previous[0] ?? "Previous";
      // Friend/challenger ontologies are symmetric in classic ExcaliBrain. Keep the same
      // property name when the relationship has to be stored on the opposite Markdown note.
      case "left":
      case "right": return field;
      default: return this.defaultOntologyField(this.inverseGateRole(semanticRole));
    }
  }

  defaultOntologyField(role: GateRole): string {
    const fields = this.ontologyFieldsForRole(role);
    const preferred: Record<GateRole, string[]> = {
      parent: ["parent", "parents"],
      child: ["child", "children"],
      left: ["friend", "friends", "jump", "jumps"],
      right: ["challenger", "opposes"],
    };
    for (const candidate of preferred[role]) {
      const found = fields.find((field) => normalizeFieldName(field) === candidate);
      if (found) return found;
    }
    return fields[0] ?? (role === "parent" ? "Parent" : role === "child" ? "Child" : role === "left" ? "Friend" : "Challenger");
  }

  private allOntologyFields(): string[] {
    const h = this.settings.hierarchy;
    return [...h.parents, ...h.children, ...h.leftFriends, ...h.rightFriends, ...h.previous, ...h.next];
  }

  private referenceForPage(page: GraphPage, storageFile: TFile): string {
    if (page.file) return this.app.fileManager.generateMarkdownLink(page.file, storageFile.path);
    if (page.url) return page.url;
    return `[[${page.path}]]`;
  }

  private valueContainsTarget(value: unknown, storageFile: TFile, target: GraphPage): boolean {
    return extractLinksFromValue(this.app, value, storageFile).some((path) => path === target.path || (target.url !== null && path === target.url));
  }

  private stripTargetFromScalar(value: string, storageFile: TFile, target: GraphPage): string | null {
    if (!this.valueContainsTarget(value, storageFile, target)) return value;
    const tokens = /(\[\[[^\]]+\]\]|\[[^\]]*\]\([^)]+\)|https?:\/\/[^\s,;]+)/gi;
    const stripped = value.replace(tokens, (token) => this.valueContainsTarget(token, storageFile, target) ? "" : token)
      .replace(/\s*[,;]\s*[,;]+/g, ", ")
      .replace(/^\s*[,;]\s*|\s*[,;]\s*$/g, "")
      .trim();
    return stripped || null;
  }

  private removeTargetFromValue(value: unknown, storageFile: TFile, target: GraphPage): unknown {
    if (Array.isArray(value)) {
      const kept = value.filter((item) => !this.valueContainsTarget(item, storageFile, target));
      return kept.length ? kept : undefined;
    }
    if (typeof value === "string") return this.stripTargetFromScalar(value, storageFile, target) ?? undefined;
    return value;
  }

  private async waitForMetadataChange(file: TFile, timeoutMs = 1200): Promise<void> {
    await new Promise<void>((resolve) => {
      let ref: EventRef | null = null;
      let timer = 0;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timer) window.clearTimeout(timer);
        if (ref) this.app.metadataCache.offref(ref);
        resolve();
      };
      ref = this.app.metadataCache.on("changed", (changedFile) => {
        if (changedFile.path === file.path) finish();
      });
      timer = window.setTimeout(finish, timeoutMs);
    });
  }

  private async writeRelationship(storageFile: TFile, target: GraphPage, field: string): Promise<void> {
    const ontologyFields = new Set(this.allOntologyFields().map(normalizeFieldName));
    const desiredNormalized = normalizeFieldName(field);
    const reference = this.referenceForPage(target, storageFile);

    const metadataWait = this.waitForMetadataChange(storageFile);
    await this.app.fileManager.processFrontMatter(storageFile, (frontmatter: Record<string, unknown>) => {
      let desiredKey = field;
      for (const key of Object.keys(frontmatter)) {
        const normalizedKey = normalizeFieldName(key);
        if (!ontologyFields.has(normalizedKey)) continue;
        if (normalizedKey === desiredNormalized) desiredKey = key;
        const next = this.removeTargetFromValue(frontmatter[key], storageFile, target);
        if (next === undefined) delete frontmatter[key];
        else frontmatter[key] = next;
      }

      const current = frontmatter[desiredKey];
      if (current === undefined || current === null || current === "") {
        frontmatter[desiredKey] = [reference];
        return;
      }
      if (this.valueContainsTarget(current, storageFile, target)) return;
      if (Array.isArray(current)) frontmatter[desiredKey] = [...(current as unknown[]), reference];
      else frontmatter[desiredKey] = [current, reference];
    });
    await metadataWait;
  }

  async createRelationFromGate(origin: GraphPage, semanticRole: GateRole, selectedFile: TFile, selectedField: string): Promise<void> {
    const selectedPage = this.index.get(selectedFile.path);
    if (!selectedPage) {
      new Notice("The selected note is not in the K-Plex index yet.", 2200);
      return;
    }
    await this.createRelationToPage(origin, semanticRole, selectedPage, selectedField);
  }

  async createRelationToPage(origin: GraphPage, semanticRole: GateRole, target: GraphPage, selectedField: string): Promise<void> {
    if (origin.path === target.path) return;
    const gate = semanticRole === "parent" ? "top" : semanticRole === "child" ? "bottom" : semanticRole === "left" ? "left" : "right";
    if (this.index.gateNeighbourPaths(origin, gate).has(target.path)) {
      new Notice("These nodes are already connected through this gate.", 1800);
      return;
    }

    // A target connected through another gate remains a valid drag target. Treat that gesture
    // as a relink so the new YAML relationship becomes authoritative over any stale body link.
    if (this.index.isConnected(origin, target.path)) {
      await this.relinkCentralNeighbour(origin, target, semanticRole, selectedField, origin.neighbours.get(target.path)?.direction ?? null);
      return;
    }

    if (origin.file?.extension === "md") {
      await this.writeRelationship(origin.file, target, selectedField);
    } else if (target.file?.extension === "md") {
      await this.writeRelationship(target.file, origin, this.inverseOntologyField(selectedField, semanticRole));
    } else {
      new Notice("When the drag origin is not a Markdown note, the target must be a Markdown note.", 2800);
      return;
    }
    await this.rebuildIndex(false, true);
  }

  async relinkCentralNeighbour(
    center: GraphPage,
    neighbour: GraphPage,
    semanticRole: GateRole,
    selectedField: string,
    existingDirection: LinkDirection | null = null,
  ): Promise<void> {
    const centerFile = center.file?.extension === "md" ? center.file : null;
    const neighbourFile = neighbour.file?.extension === "md" ? neighbour.file : null;
    if (!centerFile && !neighbourFile) {
      new Notice("At least one side of the relationship must be a Markdown note.", 2600);
      return;
    }

    const inverseField = this.inverseOntologyField(selectedField, semanticRole);

    // Preserve which note owns the relationship whenever the existing link direction tells
    // us that unambiguously. Adding the new relationship as YAML makes it authoritative over
    // any stale inline/body ontology link without rewriting prose in the note body.
    if (centerFile && neighbourFile && existingDirection === LinkDirection.TO) {
      await this.writeRelationship(neighbourFile, center, inverseField);
    } else if (centerFile && neighbourFile && existingDirection === LinkDirection.BOTH) {
      await this.writeRelationship(centerFile, neighbour, selectedField);
      await this.writeRelationship(neighbourFile, center, inverseField);
    } else if (centerFile) {
      await this.writeRelationship(centerFile, neighbour, selectedField);
    } else if (neighbourFile) {
      await this.writeRelationship(neighbourFile, center, inverseField);
    }
    await this.rebuildIndex(false, true);
  }

  isExcalidrawAvailable(): boolean {
    type RuntimePlugin = Plugin & { createDrawing?: (filename: string, foldername?: string) => Promise<TFile> };
    type PluginManagerBridge = { plugins?: Record<string, RuntimePlugin> };
    const manager = (this.app as unknown as { plugins?: PluginManagerBridge }).plugins;
    return typeof manager?.plugins?.["obsidian-excalidraw-plugin"]?.createDrawing === "function";
  }

  private async ensureFolderPath(folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath);
    if (!normalized || normalized === "/") return;
    let current = "";
    for (const part of normalized.split("/").filter(Boolean)) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        try { await this.app.vault.createFolder(current); } catch { /* concurrent creation */ }
      }
    }
  }

  async createNewRelatedFile(rawPath: string, kind: "markdown" | "excalidraw"): Promise<TFile | null> {
    const normalized = normalizePath(rawPath);
    const slash = normalized.lastIndexOf("/");
    const folder = slash >= 0 ? normalized.slice(0, slash) : "";
    let name = slash >= 0 ? normalized.slice(slash + 1) : normalized;
    if (!name) name = "New note";
    if (kind === "excalidraw") {
      type RuntimePlugin = Plugin & { createDrawing?: (filename: string, foldername?: string) => Promise<TFile> };
      type PluginManagerBridge = { plugins?: Record<string, RuntimePlugin> };
      const manager = (this.app as unknown as { plugins?: PluginManagerBridge }).plugins;
      const excalidraw = manager?.plugins?.["obsidian-excalidraw-plugin"];
      if (!excalidraw?.createDrawing) {
        new Notice("Excalidraw is not available.", 2200);
        return null;
      }
      return excalidraw.createDrawing(name, folder || undefined);
    }

    await this.ensureFolderPath(folder);
    if (!name.toLowerCase().endsWith(".md")) name += ".md";
    let path = normalizePath(folder ? `${folder}/${name}` : name);
    if (this.app.vault.getAbstractFileByPath(path)) {
      const stem = path.replace(/\.md$/i, "");
      let i = 2;
      while (this.app.vault.getAbstractFileByPath(`${stem} ${i}.md`)) i += 1;
      path = `${stem} ${i}.md`;
    }
    return this.app.vault.create(path, `# ${name.replace(/\.md$/i, "")}\n`);
  }

  async createGhostNote(rawPath: string): Promise<void> {
    let path = normalizePath(rawPath);
    if (!/\.[^/]+$/.test(path)) path += ".md";
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await this.openInDocumentLeaf(existing);
      return;
    }
    const parts = path.split("/");
    if (parts.length > 1) {
      let current = "";
      for (const part of parts.slice(0, -1)) {
        current = current ? `${current}/${part}` : part;
        if (!this.app.vault.getAbstractFileByPath(current)) {
          try { await this.app.vault.createFolder(current); } catch { /* another process may have created it */ }
        }
      }
    }
    const leafName = parts.length ? parts[parts.length - 1] : "New node";
    const file = await this.app.vault.create(path, `# ${leafName.replace(/\.md$/i, "")}\n`);
    await this.rebuildIndex(false, true);
    await this.openInDocumentLeaf(file);
  }
}
