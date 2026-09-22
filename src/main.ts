import { FileView, MarkdownView, Menu, Notice, Platform, Plugin, TFile, normalizePath, type Editor, type EventRef, type HoverParent, type WorkspaceLeaf } from "obsidian";
import { GraphIndex } from "./index/GraphIndex";
import { DEFAULT_SETTINGS, ExcaliBrainSettingTab, migrateAndMergeSettings, type DocumentSyncMode, type ExcaliBrainSettings, type KplexLayoutProfile, type KplexViewSurface, type SidecarPosition } from "./settings";
import { EXCALIBRAIN_VIEW_TYPE, KPLEX_SIDEPANEL_VIEW_TYPE, ExcaliBrainView, KplexSidepanelView } from "./ui/ExcaliBrainView";
import { RelationModal, type RelationModalOptions } from "./ui/RelationModal";
import { LinkDirection, type GateRole, type GraphPage } from "./types";
import { OntologySuggester } from "./editor/OntologySuggester";
import { extractLinksFromValue, normalizeFieldName, parseBodyMetadata } from "./index/fieldParser";
import { AddToOntologyModal, type OntologyAssignmentRole } from "./ui/AddToOntologyModal";
import { NoteTypeModal } from "./ui/NoteTypeModal";
import { activeLayoutProfile, currentDeviceClass, effectiveViewSettings, layoutProfileKey } from "./ui/viewProfile";
import { perfNow } from "./util/perf";

type LoadAwareView = FileView & { _loaded?: boolean };

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
  private indexDirtyRevision = 0;
  private rebuildTask: Promise<void> | null = null;
  private initialIndexTask: Promise<void> | null = null;
  private initialIndexComplete = false;
  private snapshotRestoreTask: Promise<{ restored: boolean; fresh: boolean; createdAt: number | null; partial?: boolean }> | null = null;
  private readonly sidecarLeaves = new Map<WorkspaceLeaf, WorkspaceLeaf>();
  private readonly sidecarListeners = new Set<() => void>();
  private readonly navigationListeners = new Set<(path: string) => void>();
  private readonly managedMetadataWrites = new Map<string, number>();
  /** Markdown files whose metadata/body changed since the last published graph. */
  private readonly dirtyMarkdownPaths = new Set<string>();

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

    // Keep legacy command IDs so existing hotkeys continue to work, but expose only actions that
    // make sense for the current form factor. Phones use the sidepanel as their primary K-Plex
    // surface; tablets can choose between a normal tab and the sidepanel; pop-out windows are
    // desktop-only. Obsidian evaluates checkCallback while building the command palette, so a
    // false result keeps unavailable actions out of the list instead of merely disabling them.
    this.addCommand({
      id: "excalibrain-start",
      name: "Open graph",
      checkCallback: (checking) => {
        if (currentDeviceClass() === "mobile") return false;
        if (!checking) void this.activateView();
        return true;
      },
    });
    this.addCommand({ id: "excalibrain-rebuild-index", name: "Rebuild index", callback: () => void this.rebuildIndex(true) });
    this.addCommand({
      id: "kplex-open-popout",
      name: "Open in pop-out window",
      checkCallback: (checking) => {
        if (currentDeviceClass() !== "desktop") return false;
        if (!checking) void this.activateViewInPopout();
        return true;
      },
    });
    this.addCommand({ id: "kplex-open-sidepanel", name: "Open in side panel", callback: () => void this.activateSidepanel() });
    this.addCommand({
      id: "kplex-sync-tab-from-plex",
      name: "Sync most recent note tab with K-Plex",
      callback: () => {
        const page = this.index.get(this.settings.lastActivePath);
        if (page) void this.syncMostRecentTabWithKplex(page);
      },
    });
    this.addCommand({
      id: "kplex-sync-plex-from-tab",
      name: "Sync K-Plex with most recent note tab",
      callback: () => void this.syncKplexWithMostRecentTab(),
    });
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
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      let changed = false;
      for (const [host, sidecar] of [...this.sidecarLeaves.entries()]) {
        if (!this.leafIsAttached(host) || !this.leafIsAttached(sidecar)) {
          this.sidecarLeaves.delete(host);
          if (this.linkedDocumentLeaf === sidecar && !this.leafIsAttached(sidecar)) {
            this.linkedDocumentLeaf = null;
            this.settings.documentSyncMode = "off";
          }
          changed = true;
        }
      }
      this.validateLinkedDocumentLeaf();
      if (this.settings.documentSyncMode === "pinned" && this.linkedDocumentLeaf) {
        const adjacent = this.isLeafAdjacentToAnyKplex(this.linkedDocumentLeaf);
        if (this.settings.sidecarOpen !== adjacent) {
          this.settings.sidecarOpen = adjacent;
          changed = true;
        }
      }
      if (changed) void this.saveSettings(false, false);
      // Adjacency itself is UI state. Moving a pinned tab away must hide sidecar controls without
      // breaking the pin, and moving it back beside K-Plex must make them reappear immediately.
      if (changed || this.settings.documentSyncMode === "pinned") this.notifySidecar();
    }));

    if (this.settings.indexUpdateInterval > 0) {
      const interval = Math.max(5000, this.settings.indexUpdateInterval);
      this.registerInterval(window.setInterval(() => {
        // Event-driven dirty tracking is authoritative. The legacy interval may flush a pending
        // backlog while a Plex is open, but it must never make a closed/clean index dirty merely
        // because a minute passed.
        if (this.openKplexViews > 0 && this.indexDirty) void this.rebuildIndex(false, false, "interval");
      }, interval));
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

        // Restore only after Obsidian's workspace/vault layout is ready. Restoring earlier can
        // temporarily hydrate real files as virtual nodes on mobile while the vault tree is still
        // settling, producing the misleading "ghost then real" startup scene.
        const startupSeedPaths = this.startupGraphSeedPaths();
        this.snapshotRestoreTask ??= this.index.restorePersistedSnapshot(startupSeedPaths);
        const restored = await this.snapshotRestoreTask;
        if (restored.restored) {
          await this.refreshBookmarkedEntryPoints();
        }
        this.indexDirty = !restored.fresh;
        if (!restored.fresh) {
          this.indexDirtyRevision += 1;
          this.indexBacklogReasons.add(restored.restored ? "startup:stale-snapshot" : "startup:no-snapshot");
        }

        this.layoutReady = true;
        this.registerReactiveIndexListeners();
        this.registerOntologyContextMenu();
        // Prewarm exactly once per Obsidian session when it is safe to do so. A fresh persisted
        // semantic snapshot makes this effectively free. On iOS, a first-ever large-vault cold
        // scan is deferred until K-Plex is actually opened: repeatedly rebuilding 20k notes in a
        // hidden WebView was responsible for a restart loop on iPad. The per-file IndexedDB body
        // checkpoints still let an interrupted first scan resume instead of starting at file zero.
        const noteCount = this.app.vault.getMarkdownFiles().length;
        const largeIosExpensiveRebuild = Platform.isIosApp && !restored.fresh && !this.index.hasPendingSnapshotHydration() &&
          (!restored.restored || !this.index.hasIncrementalRestorePatch()) && noteCount > 5000;
        if (!largeIosExpensiveRebuild) void this.ensureInitialIndex();
      })();
    });
  }

  private startupGraphSeedPaths(): string[] {
    const paths: string[] = [];
    const active = this.app.workspace.getActiveFile();
    if (active) paths.push(active.path);
    const recentLeaf = this.findRecentDocumentLeaf();
    const recentFile = this.fileForLeaf(recentLeaf);
    if (recentFile) paths.push(recentFile.path);
    if (this.settings.lastActivePath) paths.push(this.settings.lastActivePath);
    paths.push(...this.settings.pinnedNodes);
    return [...new Set(paths.filter(Boolean))];
  }

  onunload(): void {
    if (this.rebuildTimer !== null) window.clearTimeout(this.rebuildTimer);
    for (const leaf of this.sidecarLeaves.values()) {
      try { leaf.detach(); } catch { /* workspace is already closing */ }
    }
    this.sidecarLeaves.clear();
    this.index?.destroy();
  }

  private pruneManagedMetadataWrites(now = Date.now()): void {
    for (const [path, until] of this.managedMetadataWrites) {
      if (until > now) continue;
      this.managedMetadataWrites.delete(path);
    }
  }

  private registerReactiveIndexListeners(): void {
    if (this.reactiveIndexListenersRegistered) return;
    this.reactiveIndexListenersRegistered = true;

    this.registerEvent(this.app.vault.on("create", () => {
      this.scheduleRebuild("vault:create");
    }));
    this.registerEvent(this.app.vault.on("delete", () => {
      this.scheduleRebuild("vault:delete");
    }));
    this.registerEvent(this.app.vault.on("rename", () => {
      this.scheduleRebuild("vault:rename");
    }));
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      this.pruneManagedMetadataWrites();
      const until = this.managedMetadataWrites.get(file.path) ?? 0;
      if (until > Date.now()) {
        return;
      }
      this.managedMetadataWrites.delete(file.path);
      if (file.extension === "md") {
        this.dirtyMarkdownPaths.add(file.path);
      }
      this.scheduleRebuild("metadata:changed");
    }));
    // metadataCache.resolved fires in large waves during startup and after a single link edit.
    // `changed`, vault create/delete/rename and explicit K-Plex edits already cover semantic
    // invalidation without turning one relationship move into a whole-vault rebuild storm.
  }

  private async waitForMetadataCacheStability(): Promise<number> {
    const started = perfNow();
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
    let stableSince = perfNow();

    while (perfNow() - started < maxWaitMs) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, pollMs));
      const now = perfNow();
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

  private runtimePatchDelayMs(reason: string): number {
    if (reason !== "metadata:changed" && reason !== "coalesced-backlog" && reason !== "interval") return 1100;
    let maxDirtyBytes = 0;
    for (const path of this.dirtyMarkdownPaths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) maxDirtyBytes = Math.max(maxDirtyBytes, file.stat.size ?? 0);
    }
    // Large Excalidraw Markdown files can be megabytes even when only a tiny semantic fragment is
    // relevant to K-Plex. Give bursts of autosaves a slightly longer quiet window so we parse the
    // final state once instead of repeatedly cloning/scanning a large drawing payload.
    const delayMs = maxDirtyBytes >= 1024 * 1024 ? 2400
      : maxDirtyBytes >= 512 * 1024 ? 1800
        : maxDirtyBytes >= 128 * 1024 ? 1400
          : 1100;
    return delayMs;
  }

  private scheduleRebuild(reason = "unknown"): void {
    this.indexDirty = true;
    this.indexDirtyRevision += 1;
    this.indexBacklogReasons.add(reason);
    if (this.openKplexViews <= 0 || !this.initialIndexComplete || this.rebuildTask) return;
    if (this.rebuildTimer !== null) {
      window.clearTimeout(this.rebuildTimer);
    }
    const delayMs = this.runtimePatchDelayMs(reason);
    this.rebuildTimer = window.setTimeout(() => {
      this.rebuildTimer = null;
      void this.rebuildIndex(false, false, reason);
    }, delayMs);
  }

  async onKplexViewOpened(): Promise<void> {
    this.openKplexViews += 1;
    if (!this.layoutReady) return;
    await this.ensureIndexReady("view-open");
  }

  onKplexViewClosed(hostLeaf?: WorkspaceLeaf): void {
    if (hostLeaf) void this.closeSidecar(hostLeaf, false);
    this.openKplexViews = Math.max(0, this.openKplexViews - 1);
    if (this.openKplexViews > 0) return;
    if (this.rebuildTimer !== null) {
      window.clearTimeout(this.rebuildTimer);
      this.rebuildTimer = null;
    }
    // Desktop/Android may finish the once-per-session prewarm in the background. On iOS a large
    // first-ever build is intentionally demand-driven: if the user closes the last Plex, cancel
    // the in-memory graph build immediately. Parsed-body IndexedDB checkpoints already completed
    // remain useful, so reopening resumes with less work instead of keeping a hidden iPad WebView
    // under memory pressure.
    if (this.initialIndexComplete || Platform.isIosApp) this.index.cancelRebuild();
    this.index.cancelPendingPersistence();
  }

  private async ensureInitialIndex(): Promise<void> {
    if (this.initialIndexTask) {
      return this.initialIndexTask;
    }
    this.initialIndexTask = (async () => {
      if (!this.layoutReady) {
        return;
      }

      // A preview neighborhood can already be on screen while the complete persisted graph is
      // still hydrating. Keep the UI usable, but do not declare the authoritative index ready
      // (or allow persistence/reconciliation against the preview) until that background restore
      // finishes. View rendering itself does not await this task.
      if (this.index.hasPendingSnapshotHydration()) {
        const hydrated = await this.index.waitForSnapshotHydration();
        if (!hydrated.restored) {
          this.indexDirty = true;
          this.indexDirtyRevision += 1;
          this.indexBacklogReasons.add("startup:partial-restore-incomplete");
        } else {
          await this.refreshBookmarkedEntryPoints();
          if (!hydrated.fresh) {
            this.indexDirty = true;
            this.indexBacklogReasons.add("startup:stale-snapshot");
          }
        }
      } else if (this.index.size > 0 && !this.index.isFullSnapshotHydrated()) {
        // The preview task failed after it had already returned a usable partial scene. Fall back
        // to a normal rebuild instead of ever treating that partial scene as the complete index.
        this.indexDirty = true;
        this.indexDirtyRevision += 1;
        this.indexBacklogReasons.add("startup:partial-restore-incomplete");
      }

      // A fresh, fully hydrated semantic snapshot is already the initial index. Do not make mobile
      // users wait for MetadataCache's startup quiet window when there is literally nothing to
      // reconcile. Reactive listeners will mark the snapshot dirty if a real change arrives.
      if (!this.indexDirty && this.index.size > 0 && this.index.isFullSnapshotHydrated()) {
        this.initialIndexComplete = true;
        return;
      }
      if (!this.metadataStabilized) {
        this.metadataStabilityPromise ??= this.waitForMetadataCacheStability();
        await this.metadataStabilityPromise;
        this.metadataStabilized = true;
      }

      // Warm startup: a semantic IndexedDB snapshot already contains the entire graph. When the
      // physical vault structure is unchanged, patch only Markdown files whose mtimes differ from
      // the snapshot instead of reparsing/re-resolving every note. This is the common case after
      // editing a few notes between Obsidian sessions and is especially important for 20k+ vaults.
      if (this.indexDirty && this.index.size > 0 && this.index.hasIncrementalRestorePatch()) {
        const patchRevision = this.indexDirtyRevision;
        const patched = await this.index.reconcileRestoredSnapshot();
        if (patched.reconciled && patchRevision === this.indexDirtyRevision) {
          this.indexDirty = false;
          this.indexBacklogReasons.clear();
          this.initialIndexComplete = true;
          return;
        }
      }
      // Give iOS one paint/GC opportunity after Obsidian's own startup metadata wave before
      // allocating a second graph snapshot. This is deliberately small; it is not a polling loop.
      if (Platform.isIosApp) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 450));
      }

      // Large iOS cold start: prime parsed Markdown bodies in small transactional IndexedDB
      // checkpoints before allocating the complete semantic graph. The previous architecture read
      // ~12k files while retaining the growing graph and could push WebKit over its memory limit
      // near the end of the pass. Prewarming keeps that phase low-memory, survives interruption,
      // and makes the subsequent authoritative GraphBuilder run almost entirely durable-cache hits.
      const noteCount = this.app.vault.getMarkdownFiles().length;
      const needsIosBodyPrewarm = Platform.isIosApp && this.index.size === 0 && noteCount > 5000;
      if (needsIosBodyPrewarm) {
        const warmed = await this.index.prewarmBodyCache(() => this.openKplexViews > 0);
        if (!warmed && this.openKplexViews <= 0) {
          return;
        }
      }

      if (this.indexDirty || this.index.size === 0) {
        await this.performRebuild(false, this.index.size === 0, "startup:initial-index", true);
      }
      this.initialIndexComplete = this.index.size > 0;

      // Changes that arrived while the initial build was running are coalesced. Only reconcile
      // them immediately when the user currently has a Plex open; otherwise keep the backlog.
      if (this.indexDirty && this.openKplexViews > 0) this.scheduleRebuild("startup:post-initial-backlog");
    })().finally(() => {
      // Keep the resolved promise only after a complete initial index. If iOS work was cancelled
      // because the last K-Plex view closed, reopening must be able to resume the durable prewarm.
      if (!this.initialIndexComplete) this.initialIndexTask = null;
    });
    return this.initialIndexTask;
  }

  async ensureIndexReady(reason = "view-open"): Promise<void> {
    if (!this.layoutReady) return;
    await this.ensureInitialIndex();
    await this.rebuildIndex(false, this.index.size === 0, reason);
  }

  async rebuildIndex(showNotice = false, force = false, reason = "direct"): Promise<void> {
    await this.performRebuild(showNotice, force, reason, false);
  }

  private async performRebuild(showNotice: boolean, force: boolean, reason: string, allowClosed: boolean): Promise<void> {
    const explicitlyRequested = showNotice;
    if (this.openKplexViews <= 0 && !allowClosed && !explicitlyRequested) {
      return;
    }

    if (this.rebuildTask) {
      // Do not invalidate an in-flight graph. Metadata events already mark indexDirty and will be
      // folded into one follow-up rebuild when the current snapshot has published.
      await this.rebuildTask;
      return;
    }

    const shouldSkip = !force && !showNotice && !this.indexDirty && this.index.size > 0;
    if (shouldSkip) {
      return;
    }

    if (force || showNotice) {
      this.indexDirty = true;
      this.indexDirtyRevision += 1;
      this.indexBacklogReasons.add(reason);
    }
    const startRevision = this.indexDirtyRevision;

    const task = (async () => {
      // Ordinary edits are file-owned evidence changes. Patch those files directly rather than
      // rebuilding the vault. Folder/tag topology and explicit/manual rebuilds remain full scans.
      const structuralDirty = [...this.indexBacklogReasons].some((item) => item !== "metadata:changed" && item !== "coalesced-backlog" && item !== "interval");
      const canIncrementalPatch = !force && !showNotice && this.index.size > 0 && !structuralDirty &&
        !this.settings.showTagNodes && this.dirtyMarkdownPaths.size > 0;
      if (canIncrementalPatch) {
        const paths = [...this.dirtyMarkdownPaths];
        const result = await this.index.patchMarkdownPaths(paths);
        if (result.patched) {
          if (this.indexDirtyRevision === startRevision) {
            for (const path of paths) this.dirtyMarkdownPaths.delete(path);
          } else {
            // A metadata event arrived while the patch was running. Keep the original paths in the
            // backlog too: the same file may have changed again. Deleting them here previously left
            // indexDirty=true with zero paths, which forced an unnecessary full-vault rebuild.
          }
          if (this.indexDirtyRevision === startRevision && this.dirtyMarkdownPaths.size === 0) {
            this.indexDirty = false;
            this.indexBacklogReasons.clear();
          }
          await this.refreshBookmarkedEntryPoints();
          return;
        }
        // Any uncertainty falls back to the authoritative full builder below.
      }
      if (showNotice) new Notice("Rebuilding K-Plex index…", 1200);
      const published = await this.index.rebuild();
      if (!published) {
        this.indexDirty = true;
        this.indexBacklogReasons.add(reason);
        return;
      }

      // Only clear the backlog that this build actually covered. If a vault/metadata event fired
      // while GraphBuilder was working, keep the index dirty and coalesce one follow-up pass.
      if (this.indexDirtyRevision === startRevision) {
        this.indexDirty = false;
        this.indexBacklogReasons.clear();
        this.dirtyMarkdownPaths.clear();
      } else {
        this.indexDirty = true;
      }
      await this.refreshBookmarkedEntryPoints();
      if (showNotice) new Notice(`K-Plex indexed ${this.index.size} nodes.`, 1800);
    })();
    this.rebuildTask = task;
    try {
      await task;
    } finally {
      if (this.rebuildTask === task) this.rebuildTask = null;
    }


    if (this.indexDirty && this.initialIndexComplete && this.openKplexViews > 0 && this.rebuildTimer === null) {
      this.rebuildTimer = window.setTimeout(() => {
        this.rebuildTimer = null;
        void this.rebuildIndex(false, false, "coalesced-backlog");
      }, 1100);
    }
  }

  async saveSettings(reindex = false, notifyIndex = true): Promise<void> {
    this.settings.primaryTagFieldLowerCase = this.settings.primaryTagField.toLowerCase().replaceAll(" ", "-");
    await this.saveData(this.settings);
    if (reindex) this.scheduleRebuild("settings");
    else if (notifyIndex) this.index.notify();
  }

  private isDocumentLeafCandidate(leaf: WorkspaceLeaf | null): leaf is WorkspaceLeaf {
    if (!leaf || this.isManagedSidecarLeaf(leaf)) return false;
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

  private leafRect(leaf: WorkspaceLeaf | null): DOMRect | null {
    if (!leaf) return null;
    // ItemView.containerEl excludes the tab header. That is harmless for left/right splits, but
    // for an above/below split it creates a ~tab-height gap between the two measured rectangles,
    // so a genuinely adjacent pane was misclassified as non-adjacent and its sidecar controls
    // disappeared. Prefer the containing workspace tab-group chrome when available; fall back to
    // the leaf/view containers for compatibility with non-standard views and older Obsidian builds.
    const workspaceLeaf = leaf as WorkspaceLeaf & {
      containerEl?: HTMLElement;
      parent?: { containerEl?: HTMLElement } | null;
    };
    const candidates = [workspaceLeaf.parent?.containerEl, workspaceLeaf.containerEl, leaf.view?.containerEl];
    for (const element of candidates) {
      if (!element?.isConnected) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width > 8 && rect.height > 8) return rect;
    }
    return null;
  }

  private leafIsVisible(leaf: WorkspaceLeaf | null): boolean {
    return Boolean(this.leafRect(leaf));
  }

  private leafViewIsLoaded(leaf: WorkspaceLeaf | null): boolean {
    if (!leaf) return false;
    const view = leaf.view as LoadAwareView;
    if (typeof view?._loaded === "boolean") return view._loaded;
    // `_loaded` is an intentionally isolated compatibility hint for Deferred/FileView startup.
    // Public signals remain the primary criteria, so views without that private property work too.
    return leaf.view instanceof FileView ? Boolean(leaf.view.file) : this.leafIsVisible(leaf);
  }

  private adjacentPosition(hostLeaf: WorkspaceLeaf, otherLeaf: WorkspaceLeaf): SidecarPosition | null {
    if (hostLeaf === otherLeaf) return null;
    // DOMRect coordinates are local to a window. A pinned tab moved to a pop-out must therefore
    // never be considered geometrically adjacent just because its separate window happens to use
    // similar viewport coordinates.
    const hostDocument = hostLeaf.view?.containerEl?.ownerDocument;
    const otherDocument = otherLeaf.view?.containerEl?.ownerDocument;
    if (hostDocument && otherDocument && hostDocument !== otherDocument) return null;
    const host = this.leafRect(hostLeaf);
    const other = this.leafRect(otherLeaf);
    if (!host || !other) return null;
    const tolerance = 24;
    const minOverlap = 32;
    const verticalOverlap = Math.min(host.bottom, other.bottom) - Math.max(host.top, other.top);
    const horizontalOverlap = Math.min(host.right, other.right) - Math.max(host.left, other.left);
    if (verticalOverlap >= minOverlap) {
      if (Math.abs(other.right - host.left) <= tolerance) return "left";
      if (Math.abs(other.left - host.right) <= tolerance) return "right";
    }
    if (horizontalOverlap >= minOverlap) {
      if (Math.abs(other.bottom - host.top) <= tolerance) return "above";
      if (Math.abs(other.top - host.bottom) <= tolerance) return "below";
    }
    return null;
  }

  private isLeafAdjacentToAnyKplex(leaf: WorkspaceLeaf): boolean {
    return this.app.workspace.getLeavesOfType(EXCALIBRAIN_VIEW_TYPE)
      .some((host) => this.adjacentPosition(host, leaf) !== null);
  }

  private findVisibleAdjacentDocumentLeaf(hostLeaf: WorkspaceLeaf): WorkspaceLeaf | null {
    let best: WorkspaceLeaf | null = null;
    let bestScore = -1;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!this.isDocumentLeafCandidate(leaf)) return;
      const position = this.adjacentPosition(hostLeaf, leaf);
      if (!position) return;
      const score = (this.leafViewIsLoaded(leaf) ? 10 : 0) + (leaf === this.lastDocumentLeaf ? 4 : 0) + (leaf === this.app.workspace.getMostRecentLeaf() ? 2 : 0);
      if (score > bestScore) { best = leaf; bestScore = score; }
    });
    return best;
  }

  private rememberDocumentLeaf(leaf: WorkspaceLeaf | null): void {
    if (this.isDocumentLeafCandidate(leaf) && this.leafIsVisible(leaf)) this.lastDocumentLeaf = leaf;
  }

  private validateLinkedDocumentLeaf(): void {
    if (this.linkedDocumentLeaf && !this.leafIsAttached(this.linkedDocumentLeaf)) this.linkedDocumentLeaf = null;
    if (this.lastDocumentLeaf && !this.leafIsAttached(this.lastDocumentLeaf)) this.lastDocumentLeaf = null;
  }

  private findRecentDocumentLeaf(): WorkspaceLeaf | null {
    this.validateLinkedDocumentLeaf();
    if (this.isDocumentLeafCandidate(this.lastDocumentLeaf) && this.leafIsVisible(this.lastDocumentLeaf)) return this.lastDocumentLeaf;

    const recent = this.app.workspace.getMostRecentLeaf();
    if (this.isDocumentLeafCandidate(recent) && this.leafIsVisible(recent) && this.leafViewIsLoaded(recent)) {
      this.lastDocumentLeaf = recent;
      return recent;
    }

    // At workspace startup Obsidian can report the first serialized tab as "most recent" while it
    // is still a deferred, hidden view. Prefer a visible/materialized document tab instead.
    let candidate: WorkspaceLeaf | null = null;
    let bestScore = -1;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!this.isDocumentLeafCandidate(leaf) || !this.leafIsVisible(leaf)) return;
      const score = (this.leafViewIsLoaded(leaf) ? 10 : 0) + (leaf === recent ? 2 : 0);
      if (score > bestScore) { candidate = leaf; bestScore = score; }
    });
    if (candidate) {
      this.lastDocumentLeaf = candidate;
      return candidate;
    }

    // Last-resort fallback for workspaces with no currently visible document tab.
    if (this.isDocumentLeafCandidate(recent)) return recent;
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

  getDocumentSyncMode(): DocumentSyncMode { return this.settings.documentSyncMode; }

  private syncKplexToLeafEnabled(): boolean { return this.settings.documentSyncMode !== "off"; }
  private syncLeafToKplexEnabled(): boolean { return this.settings.documentSyncMode !== "off"; }

  shouldFollowDocumentFile(file: TFile): boolean {
    if (!this.syncLeafToKplexEnabled()) return false;
    this.validateLinkedDocumentLeaf();
    const leaf = this.settings.documentSyncMode === "pinned" ? this.linkedDocumentLeaf : this.findRecentDocumentLeaf();
    return this.fileForLeaf(leaf)?.path === file.path;
  }

  private targetNoteLeaf(createIfMissing = true): WorkspaceLeaf | null {
    this.validateLinkedDocumentLeaf();
    if (this.settings.documentSyncMode === "pinned" && this.linkedDocumentLeaf) return this.linkedDocumentLeaf;
    const recent = this.findRecentDocumentLeaf();
    if (recent) return recent;
    return createIfMissing ? this.app.workspace.getLeaf("split") : null;
  }

  async relinkDocumentLeafToMostRecent(page?: GraphPage): Promise<void> {
    const candidate = this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.linkedDocumentLeaf = candidate;
    this.lastDocumentLeaf = candidate;
    this.settings.documentSyncMode = "pinned";
    if (page?.file) await candidate.openFile(page.file, { active: false });
    this.settings.sidecarOpen = this.isLeafAdjacentToAnyKplex(candidate);
    await this.saveSettings(false, false);
    this.notifySidecar();
  }

  async setDocumentSyncMode(mode: DocumentSyncMode, page?: GraphPage): Promise<TFile | null> {
    this.settings.documentSyncMode = mode;
    this.settings.autoOpenCentralDocument = mode !== "off";
    this.settings.followActiveFile = mode !== "off";

    if (mode === "off") {
      const released = this.linkedDocumentLeaf;
      this.linkedDocumentLeaf = null;
      if (released) {
        for (const [host, managed] of [...this.sidecarLeaves.entries()]) if (managed === released) this.sidecarLeaves.delete(host);
      }
      this.settings.sidecarOpen = false;
      await this.saveSettings(false, false);
      this.notifySidecar();
      return null;
    }

    if (mode === "recent") {
      this.linkedDocumentLeaf = null;
      this.settings.sidecarOpen = false;
      await this.saveSettings(false, false);
      this.notifySidecar();
      return null;
    }

    // Pinned means one fixed note tab. If a sidecar is open it is already the obvious fixed tab;
    // otherwise pin the most recently used note tab.
    const candidate = this.linkedDocumentLeaf ?? this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.linkedDocumentLeaf = candidate;
    this.lastDocumentLeaf = candidate;
    if (page?.file) await candidate.openFile(page.file, { active: false });
    this.settings.sidecarOpen = this.isLeafAdjacentToAnyKplex(candidate);
    await this.saveSettings(false, false);
    this.notifySidecar();
    return null;
  }

  async setDocumentLeafLinked(linked: boolean, page?: GraphPage): Promise<void> {
    await this.setDocumentSyncMode(linked ? "recent" : "off", page);
  }

  async syncMostRecentTabWithKplex(page: GraphPage): Promise<void> {
    if (!page.file) return;
    const leaf = this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(page.file, { active: false });
  }

  async syncKplexWithMostRecentTab(): Promise<TFile | null> {
    const leaf = this.findRecentDocumentLeaf();
    const file = this.fileForLeaf(leaf);
    if (!file || !this.index.get(file.path)) return null;
    this.settings.lastActivePath = file.path;
    const history = [...this.settings.navigationHistory.filter((path) => path !== file.path), file.path].slice(-40);
    this.settings.navigationHistory = history;
    await this.saveSettings(false, false);
    this.notifyNavigation(file.path);
    this.index.notify();
    return file;
  }

  async showPageInDocumentLeaf(page: GraphPage): Promise<void> {
    await this.syncMostRecentTabWithKplex(page);
  }

  async syncPageToDocumentLeaf(page: GraphPage): Promise<void> {
    if (!this.syncKplexToLeafEnabled() || !page.file) return;
    const leaf = this.targetNoteLeaf(true);
    if (!leaf) return;
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(page.file, { active: false });
  }

  subscribeNavigation(listener: (path: string) => void): () => void {
    this.navigationListeners.add(listener);
    return () => this.navigationListeners.delete(listener);
  }

  private notifyNavigation(path: string): void {
    for (const listener of this.navigationListeners) listener(path);
  }

  subscribeSidecar(listener: () => void): () => void {
    this.sidecarListeners.add(listener);
    return () => this.sidecarListeners.delete(listener);
  }

  private notifySidecar(): void {
    for (const listener of this.sidecarListeners) listener();
  }

  private isManagedSidecarLeaf(leaf: WorkspaceLeaf | null | undefined): boolean {
    if (!leaf) return false;
    for (const managed of this.sidecarLeaves.values()) if (managed === leaf) return true;
    return false;
  }

  private validateSidecarLeaf(hostLeaf: WorkspaceLeaf): WorkspaceLeaf | null {
    const leaf = this.sidecarLeaves.get(hostLeaf) ?? null;
    if (!leaf) return null;
    if (!this.leafIsAttached(leaf)) {
      this.sidecarLeaves.delete(hostLeaf);
      return null;
    }
    return leaf;
  }

  getSidecarPosition(hostLeaf: WorkspaceLeaf): SidecarPosition | null {
    if (hostLeaf.view.getViewType() === KPLEX_SIDEPANEL_VIEW_TYPE || this.settings.documentSyncMode !== "pinned") return null;
    this.validateLinkedDocumentLeaf();
    if (!this.linkedDocumentLeaf) return null;
    return this.adjacentPosition(hostLeaf, this.linkedDocumentLeaf);
  }

  isSidecarOpen(hostLeaf: WorkspaceLeaf): boolean {
    return this.getSidecarPosition(hostLeaf) !== null;
  }

  private createSidecarLeaf(hostLeaf: WorkspaceLeaf, position: SidecarPosition): WorkspaceLeaf {
    const direction = position === "left" || position === "right" ? "vertical" : "horizontal";
    const before = position === "left" || position === "above";
    return this.app.workspace.createLeafBySplit(hostLeaf, direction, before);
  }

  private async openPageInSidecarLeaf(leaf: WorkspaceLeaf, page: GraphPage): Promise<void> {
    if (page.url) {
      try {
        await leaf.setViewState({ type: "webviewer", state: { url: page.url, navigate: true }, active: false });
      } catch {
        new Notice("Obsidian's Web viewer is not available. Open the link from the node instead.", 2600);
      }
      return;
    }
    if (!page.file) {
      await leaf.setViewState({ type: "empty", active: false });
      return;
    }
    await leaf.openFile(page.file, { active: false });
    const state = leaf.getViewState();
    if (state.type === "markdown") {
      await leaf.setViewState({
        ...state,
        active: false,
        state: { ...state.state, mode: this.settings.sidecarMarkdownMode === "preview" ? "preview" : "source" },
      });
    }
  }

  async openSidecar(hostLeaf: WorkspaceLeaf, page: GraphPage): Promise<void> {
    if (hostLeaf.view.getViewType() === KPLEX_SIDEPANEL_VIEW_TYPE) return;
    let leaf = this.validateSidecarLeaf(hostLeaf);
    if (!leaf && this.settings.documentSyncMode === "pinned" && this.linkedDocumentLeaf && this.adjacentPosition(hostLeaf, this.linkedDocumentLeaf)) {
      leaf = this.linkedDocumentLeaf;
    }
    // On workspace restore prefer the already-visible adjacent document pane. This avoids binding
    // to Obsidian's arbitrary deferred "most recent" first tab and recreates the prior sidecar.
    if (!leaf) leaf = this.findVisibleAdjacentDocumentLeaf(hostLeaf);
    if (!leaf) {
      leaf = this.createSidecarLeaf(hostLeaf, this.settings.sidecarPosition);
      this.sidecarLeaves.set(hostLeaf, leaf);
    }
    this.settings.sidecarOpen = true;
    this.settings.documentSyncMode = "pinned";
    this.linkedDocumentLeaf = leaf;
    this.lastDocumentLeaf = leaf;
    await this.openPageInSidecarLeaf(leaf, page);
    const actualPosition = this.adjacentPosition(hostLeaf, leaf);
    if (actualPosition) this.settings.sidecarPosition = actualPosition;
    await this.saveSettings(false, false);
    this.notifySidecar();
  }

  async closeSidecar(hostLeaf: WorkspaceLeaf, persist = true): Promise<void> {
    const managed = this.sidecarLeaves.get(hostLeaf) ?? null;
    const adjacentPinned = this.settings.documentSyncMode === "pinned" && this.linkedDocumentLeaf && this.adjacentPosition(hostLeaf, this.linkedDocumentLeaf)
      ? this.linkedDocumentLeaf
      : null;
    const leaf = managed ?? adjacentPinned;
    this.sidecarLeaves.delete(hostLeaf);
    if (leaf) {
      try { leaf.detach(); } catch { /* already detached */ }
    }
    if (this.linkedDocumentLeaf === leaf) {
      this.linkedDocumentLeaf = null;
      this.settings.documentSyncMode = "off";
    }
    if (persist) {
      this.settings.sidecarOpen = false;
      await this.saveSettings(false, false);
    }
    this.notifySidecar();
  }

  /**
   * Stop managing/synchronizing the companion leaf but leave that native Obsidian leaf open.
   * From this point it behaves exactly like any ordinary workspace leaf and no longer follows
   * K-Plex navigation. This is intentionally simpler than the old "open copy in…" workflow.
   */
  async detachSidecar(hostLeaf: WorkspaceLeaf): Promise<void> {
    const managed = this.sidecarLeaves.get(hostLeaf) ?? null;
    const adjacentPinned = this.settings.documentSyncMode === "pinned" && this.linkedDocumentLeaf && this.adjacentPosition(hostLeaf, this.linkedDocumentLeaf)
      ? this.linkedDocumentLeaf
      : null;
    const leaf = managed ?? adjacentPinned;
    if (!leaf) return;
    this.sidecarLeaves.delete(hostLeaf);
    this.settings.sidecarOpen = false;
    if (this.linkedDocumentLeaf === leaf) this.linkedDocumentLeaf = null;
    this.settings.documentSyncMode = "off";
    await this.saveSettings(false, false);
    this.lastDocumentLeaf = leaf;
    this.notifySidecar();
  }

  async toggleSidecar(hostLeaf: WorkspaceLeaf, page: GraphPage): Promise<void> {
    if (this.isSidecarOpen(hostLeaf)) await this.closeSidecar(hostLeaf);
    else await this.openSidecar(hostLeaf, page);
  }

  async moveSidecar(hostLeaf: WorkspaceLeaf, position: SidecarPosition, page: GraphPage): Promise<void> {
    if (hostLeaf.view.getViewType() === KPLEX_SIDEPANEL_VIEW_TYPE) return;
    const wasOpen = this.isSidecarOpen(hostLeaf);
    if (wasOpen) await this.closeSidecar(hostLeaf, false);
    this.settings.sidecarPosition = position;
    await this.saveSettings(false, false);
    if (wasOpen) await this.openSidecar(hostLeaf, page);
    this.notifySidecar();
  }

  async syncSidecarToPage(hostLeaf: WorkspaceLeaf, page: GraphPage): Promise<void> {
    const managed = this.validateSidecarLeaf(hostLeaf);
    const leaf = managed ?? (this.getSidecarPosition(hostLeaf) ? this.linkedDocumentLeaf : null);
    if (!leaf) return;
    await this.openPageInSidecarLeaf(leaf, page);
  }


  async activateView(): Promise<void> {
    // Phones intentionally route the generic/open-ribbon action to the sidepanel. Tablets retain
    // the normal graph tab because there is enough screen real-estate to make that useful.
    const device = currentDeviceClass();
    if (device === "mobile") {
      await this.activateSidepanel();
      return;
    }
    this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());
    let leaf = this.app.workspace.getLeavesOfType(EXCALIBRAIN_VIEW_TYPE)[0];
    if (!leaf) {
      if (this.settings.startInPopout && device === "desktop") {
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
    let leaf: WorkspaceLeaf | null = this.app.workspace.getLeavesOfType(KPLEX_SIDEPANEL_VIEW_TYPE)[0] ?? null;
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      if (!leaf) {
        new Notice("The Obsidian sidepanel is not available in this workspace.", 2200);
        return;
      }
      await leaf.setViewState({ type: KPLEX_SIDEPANEL_VIEW_TYPE, active: true });
    }

    // Match Excalidraw's proven mobile sidepanel lifecycle. During Obsidian startup a leaf can
    // already have the right serialized type while leaf.view is still a generic ItemView. A
    // second active setViewState materializes the registered view constructor on that first tap.
    let view = leaf.view;
    if (!(view instanceof KplexSidepanelView)) {
      await leaf.setViewState({ type: KPLEX_SIDEPANEL_VIEW_TYPE, active: true });
      view = leaf.view;
    }
    await this.app.workspace.revealLeaf(leaf);
    if (Platform.isMobile) {
      // Mobile sidebars sometimes commit their expanded/collapsed state one frame after the view
      // state changes. Revealing again on the next frame makes the first command invocation
      // deterministic instead of requiring a second tap.
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      await this.app.workspace.revealLeaf(leaf);
    }
    if (!(view instanceof KplexSidepanelView)) {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      await leaf.setViewState({ type: KPLEX_SIDEPANEL_VIEW_TYPE, active: true });
      view = leaf.view;
      await this.app.workspace.revealLeaf(leaf);
    }
    if (view instanceof KplexSidepanelView) await view.waitUntilReady();
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
        if (item.type === "file" && item.path && item.path !== this.settings.excalibrainFilepath && this.app.vault.getAbstractFileByPath(item.path)) {
          // Keep entry-point paths even while startup is displaying only a partial graph. search()
          // resolves them against the current index later, after full hydration has completed.
          paths.push(item.path);
        } else if (item.type === "folder" && item.path && this.app.vault.getAbstractFileByPath(item.path)) {
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
    // Mark before processFrontMatter so our own metadataCache.changed event is not interpreted as
    // an external vault edit that requires a 20k-note rebuild.
    // Large vaults can deliver metadataCache.changed several seconds after processFrontMatter.
    // Keep our own write suppressed long enough that it cannot accidentally trigger a full-vault
    // backlog rebuild after the live semantic pair has already been patched in memory.
    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(storageFile.path, Date.now() + 15000);
    const ontologyFields = new Set(this.allOntologyFields().map(normalizeFieldName));
    const desiredNormalized = normalizeFieldName(field);
    const reference = this.referenceForPage(target, storageFile);

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
  }

  private async clearFrontmatterRelationship(storageFile: TFile, target: GraphPage): Promise<void> {
    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(storageFile.path, Date.now() + 15000);
    const ontologyFields = new Set(this.allOntologyFields().map(normalizeFieldName));
    await this.app.fileManager.processFrontMatter(storageFile, (frontmatter: Record<string, unknown>) => {
      for (const key of Object.keys(frontmatter)) {
        if (!ontologyFields.has(normalizeFieldName(key))) continue;
        const next = this.removeTargetFromValue(frontmatter[key], storageFile, target);
        if (next === undefined) delete frontmatter[key];
        else frontmatter[key] = next;
      }
    });
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
      this.index.applyRelationshipEdit(origin.path, target.path, semanticRole, selectedField);
    } else if (target.file?.extension === "md") {
      const inverseRole = this.inverseGateRole(semanticRole);
      const inverseField = this.inverseOntologyField(selectedField, semanticRole);
      await this.writeRelationship(target.file, origin, inverseField);
      this.index.applyRelationshipEdit(target.path, origin.path, inverseRole, inverseField);
    } else {
      new Notice("When the drag origin is not a Markdown note, the target must be a Markdown note.", 2800);
      return;
    }
  }

  async relinkCentralNeighbour(
    center: GraphPage,
    neighbour: GraphPage,
    semanticRole: GateRole,
    selectedField: string,
    existingDirection: LinkDirection | null = null,
    storagePathOverride: string | null = null,
  ): Promise<void> {
    const centerFile = center.file?.extension === "md" ? center.file : null;
    const neighbourFile = neighbour.file?.extension === "md" ? neighbour.file : null;
    if (!centerFile && !neighbourFile) {
      new Notice("At least one side of the relationship must be a Markdown note.", 2600);
      return;
    }

    const inverseField = this.inverseOntologyField(selectedField, semanticRole);
    const candidates = this.index.relationshipStorageCandidates(center.path, neighbour.path);
    let storagePath: string | null = storagePathOverride && candidates.includes(storagePathOverride)
      ? storagePathOverride
      : (candidates.length > 0 ? candidates[0] : null);
    if (!storagePath) storagePath = centerFile?.path ?? neighbourFile?.path ?? null;

    // Prefer the note that already owns the defining relationship evidence. If both Markdown
    // notes are valid declarers, RelationModal exposes a small "Store relationship in" chooser
    // with this intelligent choice preselected. We update one canonical frontmatter declaration,
    // rather than duplicating metadata in both notes. If the relationship previously had YAML on
    // the opposite note, remove that stale declaration first; body ontology is retained and the
    // resolver records it as overridden evidence when it conflicts with the new YAML authority.
    const existingFrontmatterOwners = new Set(
      this.index.evidenceBetween(center.path, neighbour.path)
        .filter((item) => item.sourceKind === "frontmatter-ontology")
        .map((item) => item.declaredByPath),
    );
    const cleanup: Promise<void>[] = [];
    if (centerFile && storagePath !== centerFile.path && existingFrontmatterOwners.has(centerFile.path)) {
      cleanup.push(this.clearFrontmatterRelationship(centerFile, neighbour));
    }
    if (neighbourFile && storagePath !== neighbourFile.path && existingFrontmatterOwners.has(neighbourFile.path)) {
      cleanup.push(this.clearFrontmatterRelationship(neighbourFile, center));
    }
    if (cleanup.length) await Promise.all(cleanup);
    if (storagePath === centerFile?.path && centerFile) {
      await this.writeRelationship(centerFile, neighbour, selectedField);
      this.index.applyRelationshipEdit(center.path, neighbour.path, semanticRole, selectedField);
    } else if (storagePath === neighbourFile?.path && neighbourFile) {
      const inverseRole = this.inverseGateRole(semanticRole);
      await this.writeRelationship(neighbourFile, center, inverseField);
      this.index.applyRelationshipEdit(neighbour.path, center.path, inverseRole, inverseField);
    } else if (centerFile) {
      await this.writeRelationship(centerFile, neighbour, selectedField);
      this.index.applyRelationshipEdit(center.path, neighbour.path, semanticRole, selectedField);
    } else if (neighbourFile) {
      const inverseRole = this.inverseGateRole(semanticRole);
      await this.writeRelationship(neighbourFile, center, inverseField);
      this.index.applyRelationshipEdit(neighbour.path, center.path, inverseRole, inverseField);
    }
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
