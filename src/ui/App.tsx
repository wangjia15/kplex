import { useCallback, useEffect, useState } from "react";
import type { TFile } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { GraphPage } from "../types";
import { SearchBox } from "./SearchBox";
import { PlexGraph } from "./PlexGraph";
import { ObsidianIcon } from "./ObsidianIcon";

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

export function ExcaliBrainApp({ plugin }: { plugin: ExcaliBrainPlugin }) {
  const [renderRevision, forceRender] = useState(0);
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
  }, [plugin]);

  useEffect(() => plugin.index.subscribe(() => forceRender((value) => value + 1)), [plugin]);

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

  const open = useCallback((target: GraphPage) => { void plugin.openPage(target); }, [plugin]);

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
    await plugin.saveSettings(false, false);
    forceRender((value) => value + 1);
  };

  const toggleDocumentLink = async () => {
    await plugin.setDocumentLeafLinked(!plugin.isDocumentLeafLinked(), page);
    forceRender((value) => value + 1);
  };

  const toggleNavigationSync = async () => {
    const enabled = !(plugin.settings.autoOpenCentralDocument && plugin.settings.followActiveFile);
    plugin.settings.autoOpenCentralDocument = enabled;
    plugin.settings.followActiveFile = enabled;
    if (!enabled && plugin.isDocumentLeafLinked()) await plugin.setDocumentLeafLinked(false);
    await plugin.saveSettings(false, false);
    forceRender((value) => value + 1);
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

  if (!page) return <div className="excalibrain-app excalibrain-empty">Building K-Plex index…</div>;

  const linked = plugin.isDocumentLeafLinked();
  const linkedLabel = plugin.getLinkedDocumentLeafLabel();
  const syncOn = plugin.settings.autoOpenCentralDocument && plugin.settings.followActiveFile;
  const isPinned = plugin.settings.pinnedNodes.includes(page.path);
  const pinnedPages = plugin.settings.pinnedNodes
    .map((path) => plugin.index.get(path))
    .filter((item): item is GraphPage => Boolean(item));

  const togglePinned = async () => {
    if (isPinned) plugin.settings.pinnedNodes = plugin.settings.pinnedNodes.filter((path) => path !== page.path);
    else plugin.settings.pinnedNodes = [...plugin.settings.pinnedNodes.filter((path) => path !== page.path), page.path];
    await plugin.saveSettings(false, false);
    forceRender((value) => value + 1);
  };

  const unpin = async (path: string) => {
    plugin.settings.pinnedNodes = plugin.settings.pinnedNodes.filter((item) => item !== path);
    await plugin.saveSettings(false, false);
    forceRender((value) => value + 1);
  };

  return <div className="excalibrain-app">
    <div className="excalibrain-main-column">
      <div className="excalibrain-top-stack">
        <header className="excalibrain-topbar">
          <div className="excalibrain-brand"><ObsidianIcon name="brain-circuit" size={20} className="excalibrain-brand-mark" /><strong>K-Plex</strong></div>
          <ToolButton icon="arrow-big-left" title="Navigate back" onClick={() => goHistory(-1)} disabled={historyCursor <= 0} />
          <ToolButton icon="arrow-big-right" title="Navigate forward" onClick={() => goHistory(1)} disabled={historyCursor >= plugin.settings.navigationHistory.length - 1} />
          <SearchBox index={plugin.index} onActivate={activate} />
          <div className="excalibrain-top-actions">
            <ToolButton icon="refresh-cw" title="Refresh K-Plex" onClick={() => void plugin.rebuildIndex()} />
            <ToolButton
              icon={linked ? "pin" : "pin-off"}
              title={linked ? `Unlink K-Plex from ${linkedLabel ?? "the document leaf"}` : "Link K-Plex to the most recent document leaf"}
              on={linked}
              disabled={!plugin.settings.autoOpenCentralDocument}
              onClick={() => void toggleDocumentLink()}
            />
            <ToolButton
              icon={syncOn ? "link" : "unlink"}
              title="Synchronize K-Plex navigation with the active or linked document leaf"
              on={syncOn}
              onClick={() => void toggleNavigationSync()}
            />
            <span className="excalibrain-toolbar-divider" />
            <ToolButton icon="paperclip" title="Show or hide attachments" on={plugin.settings.showAttachments} onClick={() => void toggleToolbarSetting("showAttachments")} />
            <ToolButton icon="circle-minus" title="Show or hide virtual nodes" on={plugin.settings.showVirtualNodes} onClick={() => void toggleToolbarSetting("showVirtualNodes")} />
            <ToolButton icon="git-pull-request-draft" title="Show or hide inferred relationships" on={plugin.settings.showInferredNodes} onClick={() => void toggleToolbarSetting("showInferredNodes")} />
            <ToolButton icon="file-text" title="Show or hide Markdown page nodes" on={plugin.settings.showPageNodes} onClick={() => void toggleToolbarSetting("showPageNodes")} />
            <ToolButton icon="venetian-mask" title="Show aliases instead of file names" on={plugin.settings.renderAlias} onClick={() => void toggleToolbarSetting("renderAlias")} />
            <ToolButton icon="folder" title="Show or hide folder nodes" on={plugin.settings.showFolderNodes} onClick={() => void toggleToolbarSetting("showFolderNodes")} />
            <ToolButton icon="tag" title="Show or hide tag nodes" on={plugin.settings.showTagNodes} onClick={() => void toggleToolbarSetting("showTagNodes")} />
            <ToolButton icon="globe" title="Show or hide web link nodes" on={plugin.settings.showURLNodes} onClick={() => void toggleToolbarSetting("showURLNodes")} />
            <ToolButton icon="grip" title="Show or hide siblings" on={plugin.settings.renderSiblings} onClick={() => void toggleToolbarSetting("renderSiblings")} />
            <ToolButton
              icon={plugin.settings.graphDepth === 2 ? "list-chevrons-down-up" : "list-chevrons-up-down"}
              title={plugin.settings.graphDepth === 2 ? "Single-level view" : "Expanded view: show each node’s children"}
              on={plugin.settings.graphDepth === 2}
              onClick={() => void toggleExpandedView()}
            />
            <ToolButton
              icon="spline"
              title={plugin.settings.connectorStyle === "bezier" ? "Use straight connectors" : "Use curved connectors"}
              on={plugin.settings.connectorStyle === "bezier"}
              onClick={() => void toggleConnectorStyle()}
            />
            <ToolButton
              icon={isPinned ? "bookmark-check" : "bookmark"}
              title={isPinned ? "Unpin current node" : "Pin current node"}
              on={isPinned}
              onClick={() => void togglePinned()}
            />
            <span className="excalibrain-toolbar-divider" />
            <ToolButton icon="settings" title="Open K-Plex settings" onClick={() => plugin.openSettings()} />
          </div>
        </header>

        {pinnedPages.length > 0 && <div className="kplex-pinned-bar" aria-label="Pinned nodes">
          {pinnedPages.map((pinned) => {
            const title = plugin.index.titleFor(pinned);
            return <div key={pinned.path} className={`kplex-pinned-chip${pinned.path === page.path ? " is-active" : ""}`}>
              <button className="kplex-pinned-open" title={`${title}\n${pinned.path}`} onClick={() => activate(pinned)}>
                <ObsidianIcon name="pin" size={12} /><span>{title}</span>
              </button>
              <button className="kplex-pinned-remove" title={`Unpin ${title}`} aria-label={`Unpin ${title}`} onClick={() => void unpin(pinned.path)}>
                <ObsidianIcon name="x" size={11} />
              </button>
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
          <PlexGraph plugin={plugin} index={plugin.index} settings={plugin.settings} activePath={page.path} renderRevision={renderRevision} onActivate={activate} onOpen={open} />
        </section>
      </main>

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
