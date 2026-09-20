import { FileView, Notice, Plugin, TFile, normalizePath, type EventRef, type HoverParent, type WorkspaceLeaf } from "obsidian";
import { GraphIndex } from "./index/GraphIndex";
import { DEFAULT_SETTINGS, ExcaliBrainSettingTab, migrateAndMergeSettings, type ExcaliBrainSettings } from "./settings";
import { EXCALIBRAIN_VIEW_TYPE, ExcaliBrainView } from "./ui/ExcaliBrainView";
import { RelationModal, type RelationModalOptions } from "./ui/RelationModal";
import { LinkDirection, type GateRole, type GraphPage } from "./types";
import { OntologySuggester } from "./editor/OntologySuggester";
import { extractLinksFromValue, normalizeFieldName } from "./index/fieldParser";

export default class ExcaliBrainPlugin extends Plugin {
  settings: ExcaliBrainSettings = DEFAULT_SETTINGS;
  index!: GraphIndex;
  private rebuildTimer: number | null = null;
  private linkedDocumentLeaf: WorkspaceLeaf | null = null;
  private lastDocumentLeaf: WorkspaceLeaf | null = null;
  private readonly hoverParent: HoverParent = { hoverPopover: null };

  async onload(): Promise<void> {
    this.settings = migrateAndMergeSettings(await this.loadData());
    this.index = new GraphIndex(this);

    this.registerView(EXCALIBRAIN_VIEW_TYPE, (leaf: WorkspaceLeaf) => new ExcaliBrainView(leaf, this));
    this.registerHoverLinkSource(EXCALIBRAIN_VIEW_TYPE, { display: "K-Plex", defaultMod: false });
    this.addSettingTab(new ExcaliBrainSettingTab(this.app, this));
    this.registerEditorSuggest(new OntologySuggester(this));
    this.addRibbonIcon("brain-circuit", "Open K-Plex", () => void this.activateView());

    // Keep legacy command IDs so existing hotkeys continue to work.
    this.addCommand({ id: "excalibrain-start", name: "Open K-Plex", callback: () => void this.activateView() });
    this.addCommand({ id: "excalibrain-rebuild-index", name: "Rebuild K-Plex index", callback: () => void this.rebuildIndex(true) });
    this.addCommand({ id: "kplex-open-settings", name: "Open K-Plex settings", callback: () => this.openSettings() });
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

  private ontologyGroupForField(field: string): "parent" | "child" | "left" | "right" | "previous" | "next" | null {
    const normalized = normalizeFieldName(field);
    const h = this.settings.hierarchy;
    const has = (items: string[]) => items.some((item) => normalizeFieldName(item) === normalized);
    if (has(h.parents)) return "parent";
    if (has(h.children)) return "child";
    if (has(h.leftFriends)) return "left";
    if (has(h.rightFriends)) return "right";
    if (has(h.previous)) return "previous";
    if (has(h.next)) return "next";
    return null;
  }

  inverseOntologyField(field: string, semanticRole: GateRole): string {
    const group = this.ontologyGroupForField(field);
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
    await this.app.fileManager.processFrontMatter(storageFile, (frontmatter) => {
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
      if (Array.isArray(current)) frontmatter[desiredKey] = [...current, reference];
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
      new Notice("These thoughts are already connected through this gate.", 1800);
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
    await this.rebuildIndex(false);
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
    await this.rebuildIndex(false);
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
