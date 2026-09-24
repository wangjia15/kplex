import { MarkdownRenderer, type Component } from "obsidian";
import { useEffect, useRef, useState } from "react";
import type ExcaliBrainPlugin from "../main";
import type { GraphPage } from "../types";
import type { GraphIndex } from "../index/GraphIndex";
import { ObsidianIcon } from "./ObsidianIcon";

export function ContentPane({ plugin, index, page, owner, onOpen, onActivate }: {
  plugin: ExcaliBrainPlugin;
  index: GraphIndex;
  page: GraphPage;
  owner: Component;
  onOpen: () => void;
  onActivate: (page: GraphPage) => void;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.replaceChildren();
    let cancelled = false;

    const render = async () => {
      if (!page.file || page.file.extension !== "md") return;
      setLoading(true);
      const markdown = await plugin.app.vault.cachedRead(page.file);
      if (cancelled) return;
      el.replaceChildren();
      await MarkdownRenderer.render(plugin.app, markdown, el, page.file.path, owner);
      if (!cancelled) setLoading(false);
    };
    void render();
    return () => { cancelled = true; };
  }, [page.path, page.file, owner, plugin]);

  const neighbours = [
    ...index.neighbours(page, "parent"),
    ...index.neighbours(page, "child"),
    ...index.neighbours(page, "left"),
    ...index.neighbours(page, "right"),
    ...index.neighbours(page, "previous"),
    ...index.neighbours(page, "next")
  ];
  const unique = [...new Map(neighbours.map((n) => [n.page.path, n])).values()].slice(0, 24);

  return <aside className="excalibrain-content-pane">
    <header className="excalibrain-content-header">
      <div className="excalibrain-content-kicker">ACTIVE THOUGHT</div>
      <h2>{index.titleFor(page)}</h2>
      <div className="excalibrain-content-path">{page.path}</div>
      <div className="excalibrain-content-actions">
        {(page.file || page.url) && <button onClick={onOpen}>Open</button>}
        {!page.file && !page.url && !page.isFolder && !page.isTag && <button onClick={() => void plugin.createGhostNote(page)}>Create note</button>}
      </div>
    </header>

    <div className="excalibrain-content-scroll">
      {page.url && <div className="excalibrain-special-content"><div className="excalibrain-special-icon"><ObsidianIcon name="globe" size={32} /></div><a href={page.url}>{page.url}</a></div>}
      {page.isFolder && <div className="excalibrain-special-content"><div className="excalibrain-special-icon"><ObsidianIcon name="folder" size={32} /></div><p>Folder thought</p></div>}
      {page.isTag && <div className="excalibrain-special-content"><div className="excalibrain-special-icon"><ObsidianIcon name="tag" size={32} /></div><p>Tag thought</p></div>}
      {page.file && page.file.extension !== "md" && <div className="excalibrain-special-content"><div className="excalibrain-special-icon"><ObsidianIcon name="paperclip" size={32} /></div><p>{page.file.name}</p></div>}
      {loading && <div className="excalibrain-loading">Rendering note…</div>}
      <div ref={contentRef} className="excalibrain-markdown markdown-rendered" />

      {unique.length > 0 && <section className="excalibrain-mapped-links">
        <h3>Mapped links</h3>
        <div className="excalibrain-mapped-list">
          {unique.map((n) => <button key={n.page.path} onClick={() => onActivate(n.page)}><span>{index.titleFor(n.page)}</span><small>{n.role}</small></button>)}
        </div>
      </section>}
    </div>
  </aside>;
}
