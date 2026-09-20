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
  const [, forceRender] = useState(0);
  const [activePath, setActivePath] = useState(() => {
    const active = plugin.app.workspace.getActiveFile();
    const history = plugin.settings.navigationHistory;
    return active?.path ?? [...history].reverse().find((path) => plugin.index.get(path)) ?? plugin.app.vault.getMarkdownFiles()[0]?.path ?? "folder:/";
  });
  const [historyCursor, setHistoryCursor] = useState(() => Math.max(0, plugin.settings.navigationHistory.length - 1));

  useEffect(() => plugin.index.subscribe(() => forceRender((x) => x + 1)), [plugin]);

  useEffect(() => {
    const followFile = (file: TFile | null) => {
      if (!file || !plugin.shouldFollowDocumentFile(file) || !plugin.index.get(file.path)) return;
      setActivePath(file.path);
    };

    const fileRef = plugin.app.workspace.on("file-open", followFile);
    const leafRef = plugin.app.workspace.on("active-leaf-change", () => {
      forceRender((x) => x + 1);
      followFile(plugin.app.workspace.getActiveFile());
    });
    return () => {
      plugin.app.workspace.offref(fileRef);
      plugin.app.workspace.offref(leafRef);
    };
  }, [plugin]);

  const page = plugin.index.get(activePath) ?? plugin.index.get("folder:/");

  const activate = useCallback((target: GraphPage, record = true) => {
    setActivePath(target.path);
    if (record) {
      const next = [...plugin.settings.navigationHistory.filter((p) => p !== target.path), target.path].slice(-40);
      plugin.settings.navigationHistory = next;
      setHistoryCursor(next.length - 1);
      void plugin.saveSettings(false);
    }
    void plugin.syncPageToDocumentLeaf(target);
  }, [plugin]);

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
    await plugin.saveSettings(false);
    forceRender((x) => x + 1);
  };

  const toggleDocumentLink = async () => {
    await plugin.setDocumentLeafLinked(!plugin.isDocumentLeafLinked(), page);
    forceRender((x) => x + 1);
  };

  const toggleNavigationSync = async () => {
    const enabled = !(plugin.settings.autoOpenCentralDocument && plugin.settings.followActiveFile);
    plugin.settings.autoOpenCentralDocument = enabled;
    plugin.settings.followActiveFile = enabled;
    if (!enabled && plugin.isDocumentLeafLinked()) await plugin.setDocumentLeafLinked(false);
    await plugin.saveSettings(false);
    forceRender((x) => x + 1);
  };

  const toggleExpandedView = async () => {
    plugin.settings.graphDepth = plugin.settings.graphDepth === 2 ? 1 : 2;
    await plugin.saveSettings(false);
    forceRender((x) => x + 1);
  };

  if (!page) return <div className="excalibrain-app excalibrain-empty">Building K-Plex index…</div>;

  const linked = plugin.isDocumentLeafLinked();
  const linkedLabel = plugin.getLinkedDocumentLeafLabel();
  const syncOn = plugin.settings.autoOpenCentralDocument && plugin.settings.followActiveFile;

  return <div className="excalibrain-app">
    <div className="excalibrain-main-column">
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
          <ToolButton icon="circle-minus" title="Show or hide virtual thoughts" on={plugin.settings.showVirtualNodes} onClick={() => void toggleToolbarSetting("showVirtualNodes")} />
          <ToolButton icon="git-pull-request-draft" title="Show or hide inferred relationships" on={plugin.settings.showInferredNodes} onClick={() => void toggleToolbarSetting("showInferredNodes")} />
          <ToolButton icon="file-text" title="Show or hide Markdown page thoughts" on={plugin.settings.showPageNodes} onClick={() => void toggleToolbarSetting("showPageNodes")} />
          <ToolButton icon="venetian-mask" title="Show aliases instead of file names" on={plugin.settings.renderAlias} onClick={() => void toggleToolbarSetting("renderAlias")} />
          <ToolButton icon="folder" title="Show or hide folder thoughts" on={plugin.settings.showFolderNodes} onClick={() => void toggleToolbarSetting("showFolderNodes")} />
          <ToolButton icon="tag" title="Show or hide tag thoughts" on={plugin.settings.showTagNodes} onClick={() => void toggleToolbarSetting("showTagNodes")} />
          <ToolButton icon="globe" title="Show or hide web link thoughts" on={plugin.settings.showURLNodes} onClick={() => void toggleToolbarSetting("showURLNodes")} />
          <ToolButton icon="grip" title="Show or hide siblings" on={plugin.settings.renderSiblings} onClick={() => void toggleToolbarSetting("renderSiblings")} />
          <ToolButton
            icon={plugin.settings.graphDepth === 2 ? "list-chevrons-down-up" : "list-chevrons-up-down"}
            title={plugin.settings.graphDepth === 2 ? "Single-level view" : "Expanded view: show each thought’s children"}
            on={plugin.settings.graphDepth === 2}
            onClick={() => void toggleExpandedView()}
          />
          <span className="excalibrain-toolbar-divider" />
          <ToolButton icon="settings" title="Open K-Plex settings" onClick={() => plugin.openSettings()} />
        </div>
      </header>

      <main className="excalibrain-workspace">
        <section className="excalibrain-graph-area">
          <div className="excalibrain-zone-label zone-parent">PARENTS</div>
          <div className="excalibrain-zone-label zone-left">JUMPS / FRIENDS</div>
          <div className="excalibrain-zone-label zone-right">NEXT / RELATED</div>
          <div className="excalibrain-zone-label zone-child">CHILDREN</div>
          <PlexGraph plugin={plugin} index={plugin.index} settings={plugin.settings} activePath={page.path} onActivate={activate} onOpen={open} />
        </section>
      </main>

      <footer className="excalibrain-history-bar">
        <span className="excalibrain-history-label">PAST THOUGHTS</span>
        <div className="excalibrain-history-list">
          {plugin.settings.navigationHistory.slice(-14).map((path, index) => {
            const item = plugin.index.get(path);
            if (!item) return null;
            const title = plugin.index.titleFor(item);
            return <button key={`${path}:${index}`} title={`${title}\n${path}`} className={path === page.path ? "is-active" : ""} onClick={() => activate(item)}>{title}</button>;
          })}
        </div>
      </footer>
    </div>
  </div>;
}
