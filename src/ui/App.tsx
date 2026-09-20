import { useCallback, useEffect, useState } from "react";
import type { TFile } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { GraphPage } from "../types";
import { SearchBox } from "./SearchBox";
import { PlexGraph } from "./PlexGraph";

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

  const toggleSetting = async (key: "followActiveFile" | "autoOpenCentralDocument" | "renderSiblings" | "showInferredNodes") => {
    plugin.settings[key] = !plugin.settings[key];
    await plugin.saveSettings(key === "showInferredNodes");
    forceRender((x) => x + 1);
  };

  const toggleDocumentLink = async () => {
    await plugin.setDocumentLeafLinked(!plugin.isDocumentLeafLinked(), page);
    forceRender((x) => x + 1);
  };

  if (!page) return <div className="excalibrain-app excalibrain-empty">Building K-Plex index…</div>;

  const linked = plugin.isDocumentLeafLinked();
  const linkedLabel = plugin.getLinkedDocumentLeafLabel();

  return <div className="excalibrain-app">
    <div className="excalibrain-main-column">
      <header className="excalibrain-topbar">
        <div className="excalibrain-brand"><span className="excalibrain-brand-mark">◉</span><strong>K-Plex</strong></div>
        <button className="excalibrain-icon-button" title="Back" onClick={() => goHistory(-1)} disabled={historyCursor <= 0}>←</button>
        <button className="excalibrain-icon-button" title="Forward" onClick={() => goHistory(1)} disabled={historyCursor >= plugin.settings.navigationHistory.length - 1}>→</button>
        <SearchBox index={plugin.index} onActivate={activate} />
        <div className="excalibrain-top-actions">
          <button className={plugin.settings.followActiveFile ? "is-on" : ""} onClick={() => void toggleSetting("followActiveFile")} title="Follow document navigation in K-Plex">◎ Follow</button>
          <button className={`kplex-auto-open${plugin.settings.autoOpenCentralDocument ? " is-on" : ""}`} onClick={() => void toggleSetting("autoOpenCentralDocument")} title="Open the selected K-Plex thought in the document leaf">🔌</button>
          <button
            className={`kplex-link${linked ? " is-on" : ""}`}
            onClick={() => void toggleDocumentLink()}
            disabled={!plugin.settings.autoOpenCentralDocument}
            title={linked ? `Unlink K-Plex from ${linkedLabel ?? "the document leaf"}` : "Link K-Plex to the most recent document leaf"}
          >{linked ? "📌 Linked" : "📌 Link"}</button>
          <button className={plugin.settings.renderSiblings ? "is-on" : ""} onClick={() => void toggleSetting("renderSiblings")}>Siblings</button>
          <button className={plugin.settings.showInferredNodes ? "is-on" : ""} onClick={() => void toggleSetting("showInferredNodes")}>Inferred</button>
          <button className="kplex-rebuild" onClick={() => void plugin.rebuildIndex()} title="Rebuild index">↻</button>
        </div>
      </header>

      <main className="excalibrain-workspace">
        <section className="excalibrain-graph-area">
          <div className="excalibrain-zone-label zone-parent">PARENTS</div>
          <div className="excalibrain-zone-label zone-left">JUMPS / FRIENDS</div>
          <div className="excalibrain-zone-label zone-right">NEXT / RELATED</div>
          <div className="excalibrain-zone-label zone-child">CHILDREN</div>
          <PlexGraph index={plugin.index} settings={plugin.settings} activePath={page.path} onActivate={activate} onOpen={open} />
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
