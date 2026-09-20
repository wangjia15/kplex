import { FileView, Notice, Plugin, TFile, normalizePath, type WorkspaceLeaf } from "obsidian";
import { GraphIndex } from "./index/GraphIndex";
import { DEFAULT_SETTINGS, ExcaliBrainSettingTab, migrateAndMergeSettings, type ExcaliBrainSettings } from "./settings";
import { EXCALIBRAIN_VIEW_TYPE, ExcaliBrainView } from "./ui/ExcaliBrainView";
import type { GraphPage } from "./types";
import { OntologySuggester } from "./editor/OntologySuggester";

export default class ExcaliBrainPlugin extends Plugin {
  settings: ExcaliBrainSettings = DEFAULT_SETTINGS;
  index!: GraphIndex;
  private rebuildTimer: number | null = null;
  private linkedDocumentLeaf: WorkspaceLeaf | null = null;
  private lastDocumentLeaf: WorkspaceLeaf | null = null;

  async onload(): Promise<void> {
    this.settings = migrateAndMergeSettings(await this.loadData());
    this.index = new GraphIndex(this);

    this.registerView(EXCALIBRAIN_VIEW_TYPE, (leaf: WorkspaceLeaf) => new ExcaliBrainView(leaf, this));
    this.addSettingTab(new ExcaliBrainSettingTab(this.app, this));
    this.registerEditorSuggest(new OntologySuggester(this));
    this.addRibbonIcon("brain-circuit", "Open K-Plex", () => void this.activateView());

    // Keep legacy command IDs so existing hotkeys continue to work.
    this.addCommand({ id: "excalibrain-start", name: "Open K-Plex", callback: () => void this.activateView() });
    this.addCommand({ id: "excalibrain-rebuild-index", name: "Rebuild K-Plex index", callback: () => void this.rebuildIndex(true) });
    this.addCommand({
      id: "excalibrain-focus-active-note",
      name: "Focus active note in K-Plex",
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) void this.focusInBrain(file.path);
        return true;
      }
    });

    const schedule = () => this.scheduleRebuild();
    this.registerEvent(this.app.vault.on("create", schedule));
    this.registerEvent(this.app.vault.on("delete", schedule));
    this.registerEvent(this.app.vault.on("rename", schedule));
    this.registerEvent(this.app.metadataCache.on("changed", schedule));
    this.registerEvent(this.app.metadataCache.on("resolved", schedule));
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      this.rememberDocumentLeaf(leaf);
      this.validateLinkedDocumentLeaf();
    }));

    if (this.settings.indexUpdateInterval > 0) {
      this.registerInterval(window.setInterval(() => void this.rebuildIndex(false), Math.max(5000, this.settings.indexUpdateInterval)));
    }

    this.app.workspace.onLayoutReady(() => {
      this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());
      void this.rebuildIndex(false);
    });
  }

  onunload(): void {
    if (this.rebuildTimer !== null) window.clearTimeout(this.rebuildTimer);
  }

  private scheduleRebuild(): void {
    if (this.rebuildTimer !== null) window.clearTimeout(this.rebuildTimer);
    this.rebuildTimer = window.setTimeout(() => {
      this.rebuildTimer = null;
      void this.rebuildIndex(false);
    }, 450);
  }

  async rebuildIndex(showNotice = false): Promise<void> {
    if (showNotice) new Notice("Rebuilding K-Plex index…", 1200);
    await this.index.rebuild();
    if (showNotice) new Notice(`K-Plex indexed ${this.index.size} thoughts.`, 1800);
  }

  async saveSettings(reindex = false): Promise<void> {
    this.settings.primaryTagFieldLowerCase = this.settings.primaryTagField.toLowerCase().replaceAll(" ", "-");
    await this.saveData(this.settings);
    if (reindex) await this.index.rebuild();
    else this.index.notify();
  }

  private isDocumentLeafCandidate(leaf: WorkspaceLeaf | null): leaf is WorkspaceLeaf {
    if (!leaf) return false;
    const viewState = leaf.getViewState();
    if (viewState.type === EXCALIBRAIN_VIEW_TYPE) return false;
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
    this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());
    let leaf = this.app.workspace.getLeavesOfType(EXCALIBRAIN_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: EXCALIBRAIN_VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  async focusInBrain(path: string): Promise<void> {
    if (!this.index.get(path)) await this.index.rebuild();
    if (!this.index.get(path)) return;
    const history = [...this.settings.navigationHistory.filter((p) => p !== path), path].slice(-40);
    this.settings.navigationHistory = history;
    await this.saveSettings(false);
    await this.activateView();
  }

  async openInDocumentLeaf(file: TFile): Promise<void> {
    this.validateLinkedDocumentLeaf();
    const leaf = this.linkedDocumentLeaf ?? this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(file, { active: true });
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
    const leafName = parts.length ? parts[parts.length - 1] : "New thought";
    const file = await this.app.vault.create(path, `# ${leafName.replace(/\.md$/i, "")}\n`);
    await this.rebuildIndex(false);
    await this.openInDocumentLeaf(file);
  }
}
