import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Menu, type TFile, type WorkspaceLeaf } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { GraphPage } from "../types";
import type { DocumentSyncMode, KplexViewSurface, SidecarPosition } from "../settings";
import { SearchBox } from "./SearchBox";
import { PlexGraph } from "./PlexGraph";
import { ObsidianIcon } from "./ObsidianIcon";
import { EMPTY_PLEX_FILTER, PlexFilter, type GraphFilterLayoutMode, type PlexFilterState } from "./PlexFilter";
import { compilePlexFilter } from "../lens/SimplePlexFilter";
import { compileGraphLensDefinitions, type GraphLensDefinition } from "../lens/GraphLens";

type BooleanToolbarSetting =
  | "showAttachments"
  | "showVirtualNodes"
  | "showInferredNodes"
  | "showPageNodes"
  | "renderAlias"
  | "showFolderNodes"
  | "showTagNodes"
  | "showURLNodes"
  | "renderSiblings";

function IndexStatusIndicator({ upToDate, label }: { upToDate: boolean; label: string }) {
  return <span
    className={`kplex-index-status${upToDate ? " is-ready" : " is-updating"}`}
    title={label}
    aria-label={label}
  />;
}

function ToolButton({ icon, title, on, disabled, onClick }: {
  icon: string;
  title: string;
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return <button
    className={`excalibrain-icon-button${on ? " is-on" : ""}`}
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
  ><ObsidianIcon name={icon} size={17} /></button>;
}

export function ExcaliBrainApp({ plugin, surface, hostLeaf }: { plugin: ExcaliBrainPlugin; surface: KplexViewSurface; hostLeaf: WorkspaceLeaf }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [renderRevision, forceRender] = useState(0);
  const [plexFilter, setPlexFilter] = useState<PlexFilterState>(EMPTY_PLEX_FILTER);
  const [filterLayoutMode, setFilterLayoutMode] = useState<GraphFilterLayoutMode>("keep");
  const plexFilterPredicate = useMemo(() => compilePlexFilter(plexFilter), [plexFilter]);
  const [graphLenses, setGraphLensesState] = useState<GraphLensDefinition[]>(() => plugin.settings.graphLenses);
  const compiledGraphLenses = useMemo(() => compileGraphLensDefinitions(graphLenses), [graphLenses]);
  const [predicateRevision, refreshPredicates] = useState(0);
  const [hostWidth, setHostWidth] = useState(0);
  const [sidecarRevision, setSidecarRevision] = useState(0);
  const [searchFocusRequest, setSearchFocusRequest] = useState(0);
  const sidecarRestoreAttempted = useRef(false);
  const [activePath, setActivePath] = useState(() => {
    const active = plugin.app.workspace.getActiveFile();
    const history = plugin.settings.navigationHistory;
    return active?.path ?? (
      plugin.settings.lastActivePath
      || history[history.length - 1]
      || plugin.app.vault.getMarkdownFiles()[0]?.path
      || "folder:/"
    );
  });
  const [historyCursor, setHistoryCursor] = useState(() => Math.max(0, plugin.settings.navigationHistory.length - 1));

  const activate = useCallback((target: GraphPage, record = true) => {
    setActivePath(target.path);
    plugin.settings.lastActivePath = target.path;
    if (record) {
      const next = [...plugin.settings.navigationHistory.filter((path) => path !== target.path), target.path].slice(-40);
      plugin.settings.navigationHistory = next;
      setHistoryCursor(next.length - 1);
    }
    void plugin.saveSettings(false, false);
    void plugin.syncPageToDocumentLeaf(target);
    void plugin.syncSidecarToPage(hostLeaf, target);
  }, [plugin, hostLeaf]);

  useEffect(() => plugin.index.subscribe(() => forceRender((value) => value + 1)), [plugin]);
  useEffect(() => plugin.subscribeIndexStatus(() => forceRender((value) => value + 1)), [plugin]);
  useEffect(() => {
    if (!plexFilterPredicate?.dependencies.usesFrontmatter && !compiledGraphLenses.usesFrontmatter) return;
    const ref = plugin.app.metadataCache.on("changed", (file) => {
      if (file.extension === "md") refreshPredicates((value) => value + 1);
    });
    return () => plugin.app.metadataCache.offref(ref);
  }, [plugin, plexFilterPredicate, compiledGraphLenses.usesFrontmatter]);
  useEffect(() => plugin.subscribeGraphLenses((next) => setGraphLensesState(next)), [plugin]);
  useEffect(() => plugin.subscribeSidecar(() => setSidecarRevision((value) => value + 1)), [plugin]);
  useEffect(() => plugin.subscribeNavigation((path) => {
    const target = plugin.index.get(path);
    if (target) activate(target, true);
  }), [plugin, activate]);
  useEffect(
    () => plugin.subscribeSearchFocus(hostLeaf, () => setSearchFocusRequest((value) => value + 1)),
    [plugin, hostLeaf],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setHostWidth(el.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const followFile = (file: TFile | null) => {
      if (!file || !plugin.shouldFollowDocumentFile(file) || !plugin.index.get(file.path)) return;
      const target = plugin.index.get(file.path);
      if (target) activate(target, true);
    };

    const fileRef = plugin.app.workspace.on("file-open", followFile);
    const leafRef = plugin.app.workspace.on("active-leaf-change", () => {
      forceRender((value) => value + 1);
      followFile(plugin.app.workspace.getActiveFile());
    });
    return () => {
      plugin.app.workspace.offref(fileRef);
      plugin.app.workspace.offref(leafRef);
    };
  }, [plugin, activate]);

  const page = plugin.index.get(activePath)
    ?? (plugin.settings.lastActivePath ? plugin.index.get(plugin.settings.lastActivePath) : undefined)
    ?? plugin.index.get("folder:/");

  useEffect(() => {
    if (!page || plugin.settings.lastActivePath === page.path) return;
    plugin.settings.lastActivePath = page.path;
    void plugin.saveSettings(false, false);
  }, [page?.path, plugin]);

  useEffect(() => {
    // Restore a persisted sidecar once when this K-Plex surface materializes. After that, geometry
    // is user-owned: moving a pinned tab away must merely hide the controls, not recreate a pane.
    if (!page || sidecarRestoreAttempted.current) return;
    sidecarRestoreAttempted.current = true;
    if (surface === "sidepanel" || !plugin.settings.sidecarOpen || plugin.isSidecarOpen(hostLeaf)) return;
    void plugin.openSidecar(hostLeaf, page);
  }, [page?.path, surface, hostLeaf, plugin]);

  const open = useCallback((target: GraphPage) => { void plugin.openPage(target); }, [plugin]);

  const updateGraphLenses = useCallback((next: GraphLensDefinition[]) => {
    setGraphLensesState(next);
    void plugin.setGraphLenses(next);
  }, [plugin]);

  const goHistory = (delta: number) => {
    const list = plugin.settings.navigationHistory;
    if (!list.length) return;
    const cursor = Math.max(0, Math.min(list.length - 1, historyCursor + delta));
    setHistoryCursor(cursor);
    const target = plugin.index.get(list[cursor]);
    if (target) activate(target, false);
  };

  const toggleToolbarSetting = async (key: BooleanToolbarSetting) => {
    plugin.settings[key] = !plugin.settings[key];
    const requiresGraphRebuild = key === "showFolderNodes" || key === "showTagNodes";
    await plugin.saveSettings(requiresGraphRebuild, !requiresGraphRebuild);
    forceRender((value) => value + 1);
  };

  const setDocumentSyncMode = async (mode: DocumentSyncMode) => {
    await plugin.setDocumentSyncMode(mode, page);
    forceRender((value) => value + 1);
  };

  const showDocumentSyncMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const menu = new Menu();
    const current = plugin.getDocumentSyncMode();

    menu.addItem((item) => item
      .setTitle("Sync most recent note tab with K-Plex")
      .setIcon("arrow-right")
      .setDisabled(!page?.file)
      .onClick(() => { if (page) void plugin.syncMostRecentTabWithKplex(page).then(() => forceRender((value) => value + 1)); }));
    menu.addItem((item) => item
      .setTitle("Sync K-Plex with most recent note tab")
      .setIcon("arrow-left")
      .onClick(() => void plugin.syncKplexWithMostRecentTab().then((file) => {
        if (!file) return;
        const target = plugin.index.get(file.path);
        if (target) activate(target, true);
      })));

    menu.addSeparator();
    const choices: Array<[DocumentSyncMode, string, string]> = [
      ["off", "K-Plex not linked to a note tab", "unlink"],
      ["recent", "K-Plex linked to most recent note tab", "link"],
      ["pinned", "K-Plex pinned to one fixed note tab", "pin"],
    ];
    for (const [mode, title, icon] of choices) {
      menu.addItem((item) => item
        .setTitle(title)
        .setIcon(icon)
        .setChecked(current === mode)
        .onClick(() => void setDocumentSyncMode(mode)));
    }
    menu.showAtMouseEvent(event.nativeEvent);
  };

  const toggleExpandedView = async () => {
    plugin.settings.graphDepth = plugin.settings.graphDepth === 2 ? 1 : 2;
    await plugin.saveSettings(false, false);
    forceRender((value) => value + 1);
  };

  const toggleConnectorStyle = async () => {
    plugin.settings.connectorStyle = plugin.settings.connectorStyle === "straight" ? "bezier" : "straight";
    await plugin.saveSettings(false, false);
    forceRender((value) => value + 1);
  };

  const toggleToolbar = async () => {
    plugin.settings.toolbarExpanded = !plugin.settings.toolbarExpanded;
    await plugin.saveSettings(false, false);
    forceRender((value) => value + 1);
  };

  const activateSearch = () => setSearchFocusRequest((value) => value + 1);

  const handlePlexKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const isF4 = event.key === "F4";
    const isFindShortcut = event.key.toLocaleLowerCase() === "f" && (event.ctrlKey || event.metaKey) && !event.altKey;
    if (!isF4 && !isFindShortcut) return;
    event.preventDefault();
    event.stopPropagation();
    activateSearch();
  };

  const handlePlexPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    if (target?.closest("input, textarea, select, button, a, [contenteditable='true'], [role='button']")) return;
    rootRef.current?.focus({ preventScroll: true });
  };

  const indexStatus = plugin.getIndexStatus();

  if (!page) return <div className="excalibrain-app excalibrain-empty">
    <div className="kplex-index-status-empty"><IndexStatusIndicator {...indexStatus} /></div>
    <span>Building K-Plex index…</span>
  </div>;

  const linkedLabel = plugin.getLinkedDocumentLeafLabel();
  const syncMode = plugin.getDocumentSyncMode();
  const syncIcon = syncMode === "pinned" ? "pin" : syncMode === "recent" ? "link" : "unlink";
  const syncTitle = syncMode === "off"
    ? "K-Plex is not linked to a note tab"
    : syncMode === "recent"
      ? "K-Plex is linked to the most recent note tab"
      : `K-Plex is pinned to a fixed note tab${linkedLabel ? ` · ${linkedLabel}` : ""}`;
  const isPinned = plugin.isPinned(page.path);
  const pinnedPages = plugin.settings.pinnedNodes
    .map((path) => plugin.index.get(path))
    .filter((item): item is GraphPage => Boolean(item));
  const sidecarAvailable = surface !== "sidepanel";
  const sidecarPosition = sidecarAvailable ? plugin.getSidecarPosition(hostLeaf) : null;
  const sidecarOpen = Boolean(sidecarPosition);
  const foldPlexIcon = sidecarPosition === "left" ? "panel-right-close"
    : sidecarPosition === "above" ? "panel-bottom-close"
      : sidecarPosition === "below" ? "panel-top-close"
        : "panel-left-close";
  const closeSidecarIcon = sidecarPosition === "left" ? "panel-left-close"
    : sidecarPosition === "above" ? "panel-top-close"
      : sidecarPosition === "below" ? "panel-bottom-close"
        : "panel-right-close";
  const condensedBySidecar = sidecarAvailable && sidecarOpen && hostWidth > 0 && hostWidth <= plugin.settings.sidecarCondensedBreakpoint;
  const profileSurface: KplexViewSurface = condensedBySidecar ? "sidepanel" : surface;
  const viewSettings = plugin.getViewSettings(profileSurface);

  const togglePinned = async () => { await plugin.togglePinned(page.path); forceRender((value) => value + 1); };
  const unpin = async (path: string) => { if (plugin.isPinned(path)) await plugin.togglePinned(path); forceRender((value) => value + 1); };

  const showSidecarMoveMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const menu = new Menu();
    const options: Array<[SidecarPosition, string, string]> = [
      ["right", "Right", "panel-right"], ["left", "Left", "panel-left"], ["above", "Above", "panel-top"], ["below", "Below", "panel-bottom"],
    ];
    for (const [position, label, icon] of options) menu.addItem((item) => item
      .setTitle(label).setIcon(icon).setChecked((sidecarPosition ?? plugin.settings.sidecarPosition) === position)
      .onClick(() => void plugin.moveSidecar(hostLeaf, position, page)));
    menu.showAtMouseEvent(event.nativeEvent);
  };

  void sidecarRevision; // subscription is a render trigger; all state is owned by the plugin.

  return <div
    ref={rootRef}
    className={`excalibrain-app kplex-surface-${surface}${condensedBySidecar ? " is-sidecar-condensed" : ""}`}
    tabIndex={-1}
    onKeyDownCapture={handlePlexKeyDown}
    onPointerDownCapture={handlePlexPointerDown}
  >
    <div className="excalibrain-main-column">
      <div className="excalibrain-top-stack">
        <header className="excalibrain-topbar">
          <IndexStatusIndicator {...indexStatus} />
          <div className="excalibrain-brand"><ObsidianIcon name="brain-circuit" size={20} className="excalibrain-brand-mark" /><strong>K-Plex</strong></div>
          <ToolButton icon="arrow-big-left" title="Navigate back" onClick={() => goHistory(-1)} disabled={historyCursor <= 0} />
          <ToolButton icon="arrow-big-right" title="Navigate forward" onClick={() => goHistory(1)} disabled={historyCursor >= plugin.settings.navigationHistory.length - 1} />
          <SearchBox index={plugin.index} onActivate={activate} focusRequest={searchFocusRequest} />
          <PlexFilter index={plugin.index} center={page} revision={renderRevision} value={plexFilter} onChange={setPlexFilter} lenses={graphLenses} onLensesChange={updateGraphLenses} layoutMode={filterLayoutMode} onLayoutModeChange={setFilterLayoutMode} />
          <div className={`excalibrain-top-actions${plugin.settings.toolbarExpanded ? " is-expanded" : " is-compact"}`}>
            <button
              className={`excalibrain-icon-button${syncMode !== "off" ? " is-on" : ""}`}
              title={`${syncTitle}. Click for sync actions and link mode.`}
              aria-label={`${syncTitle}. Note tab sync actions.`}
              onClick={showDocumentSyncMenu}
            ><ObsidianIcon name={syncIcon} size={17} /></button>
            <ToolButton icon={isPinned ? "bookmark-check" : "bookmark"} title={isPinned ? "Unpin current node" : "Pin current node"} on={isPinned} onClick={() => void togglePinned()} />
            {sidecarAvailable && <ToolButton icon={sidecarOpen ? "panel-right-close" : "panel-right-open"} title={sidecarOpen ? "Close companion sidecar" : "Open companion sidecar"} on={sidecarOpen} onClick={() => void plugin.toggleSidecar(hostLeaf, page)} />}
            {plugin.settings.toolbarExpanded && <>
              <span className="excalibrain-toolbar-divider" />
              <ToolButton icon="refresh-cw" title="Refresh K-Plex" onClick={() => void plugin.rebuildIndex()} />
              <ToolButton icon="paperclip" title="Show or hide attachments" on={plugin.settings.showAttachments} onClick={() => void toggleToolbarSetting("showAttachments")} />
              <ToolButton icon="circle-minus" title="Show or hide virtual nodes" on={plugin.settings.showVirtualNodes} onClick={() => void toggleToolbarSetting("showVirtualNodes")} />
              <ToolButton icon="git-pull-request-draft" title="Show or hide inferred relationships" on={plugin.settings.showInferredNodes} onClick={() => void toggleToolbarSetting("showInferredNodes")} />
              <ToolButton icon="file-text" title="Show or hide Markdown page nodes" on={plugin.settings.showPageNodes} onClick={() => void toggleToolbarSetting("showPageNodes")} />
              <ToolButton icon="venetian-mask" title="Show aliases instead of file names" on={plugin.settings.renderAlias} onClick={() => void toggleToolbarSetting("renderAlias")} />
              <ToolButton icon="folder" title="Show or hide folder nodes" on={plugin.settings.showFolderNodes} onClick={() => void toggleToolbarSetting("showFolderNodes")} />
              <ToolButton icon="tag" title="Show or hide tag nodes" on={plugin.settings.showTagNodes} onClick={() => void toggleToolbarSetting("showTagNodes")} />
              <ToolButton icon="globe" title="Show or hide web link nodes" on={plugin.settings.showURLNodes} onClick={() => void toggleToolbarSetting("showURLNodes")} />
              <ToolButton icon="grip" title="Show or hide siblings" on={plugin.settings.renderSiblings} onClick={() => void toggleToolbarSetting("renderSiblings")} />
              <ToolButton icon={plugin.settings.graphDepth === 2 ? "list-chevrons-down-up" : "list-chevrons-up-down"} title={plugin.settings.graphDepth === 2 ? "Single-level view" : "Expanded view: show each node’s children"} on={plugin.settings.graphDepth === 2} onClick={() => void toggleExpandedView()} />
              <ToolButton icon="spline" title={plugin.settings.connectorStyle === "bezier" ? "Use straight connectors" : "Use curved connectors"} on={plugin.settings.connectorStyle === "bezier"} onClick={() => void toggleConnectorStyle()} />
            </>}
            <ToolButton icon={plugin.settings.toolbarExpanded ? "chevrons-right" : "ellipsis"} title={plugin.settings.toolbarExpanded ? "Use compact toolbar" : "Show full toolbar"} on={plugin.settings.toolbarExpanded} onClick={() => void toggleToolbar()} />
            <ToolButton icon="settings" title="Open K-Plex settings" onClick={() => plugin.openSettings()} />
          </div>
        </header>

        {pinnedPages.length > 0 && <div className="kplex-pinned-bar" aria-label="Pinned nodes">
          {pinnedPages.map((pinned) => {
            const title = plugin.index.titleFor(pinned);
            return <div key={pinned.path} className={`kplex-pinned-chip${pinned.path === page.path ? " is-active" : ""}`}>
              <button className="kplex-pinned-open" title={`${title}\n${pinned.path}`} onClick={() => activate(pinned)}><ObsidianIcon name="pin" size={12} /><span>{title}</span></button>
              <button className="kplex-pinned-remove" title={`Unpin ${title}`} aria-label={`Unpin ${title}`} onClick={() => void unpin(pinned.path)}><ObsidianIcon name="x" size={11} /></button>
            </div>;
          })}
        </div>}
      </div>

      <main className="excalibrain-workspace">
        <section className="excalibrain-graph-area">
          <div className="excalibrain-zone-label zone-parent">PARENTS</div>
          <div className="excalibrain-zone-label zone-left">FRIENDS / PREVIOUS</div>
          <div className="excalibrain-zone-label zone-right">CHALLENGERS / NEXT</div>
          <div className="excalibrain-zone-label zone-child">CHILDREN</div>
          <PlexGraph plugin={plugin} index={plugin.index} settings={viewSettings} surface={profileSurface} hostLeaf={hostLeaf} predicate={plexFilterPredicate} lenses={compiledGraphLenses} filterLayoutMode={filterLayoutMode} predicateRevision={predicateRevision} activePath={page.path} renderRevision={renderRevision} onActivate={activate} onOpen={open} />
        </section>
      </main>

      {sidecarOpen && sidecarPosition && <div className={`kplex-sidecar-controls is-${sidecarPosition}`} aria-label="Sidecar controls">
        <button title="Fold K-Plex and give the companion document the full split" onClick={() => void plugin.collapsePlexForSidecar(hostLeaf)}><ObsidianIcon name={foldPlexIcon} size={15} /></button>
        <button title="Close companion sidecar" onClick={() => void plugin.closeSidecar(hostLeaf)}><ObsidianIcon name={closeSidecarIcon} size={15} /></button>
        <button title="Move sidecar" onClick={showSidecarMoveMenu}><ObsidianIcon name="move" size={15} /></button>
        <button title="Detach sidecar — keep this tab open independently" onClick={() => void plugin.detachSidecar(hostLeaf)}><ObsidianIcon name="unlink" size={15} /></button>
      </div>}

      <footer className="excalibrain-history-bar">
        <span className="excalibrain-history-label">PAST NODES</span>
        <div className="excalibrain-history-list">
          {plugin.settings.navigationHistory.slice(-14).reverse().map((path, indexValue) => {
            const item = plugin.index.get(path);
            if (!item) return null;
            const title = plugin.index.titleFor(item);
            return <button key={`${path}:${indexValue}`} title={`${title}\n${path}`} className={path === page.path ? "is-active" : ""} onClick={() => activate(item)}>{title}</button>;
          })}
        </div>
      </footer>
    </div>
  </div>;
}
