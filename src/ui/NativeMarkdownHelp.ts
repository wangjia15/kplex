/** Reusable native Markdown help/preview owner. All callers share one bounded safe-source
 * profile, detached staging, native Component lifecycle and late-render retirement. No note,
 * graph, parser, custom HTML renderer, remote resource loader or durable writer is owned here. */
import {Component, MarkdownRenderer, type App} from "obsidian";
import {inertMarkdownHelpSource, markdownHelpLinkTarget} from "../core/contracts/markdownHelp";

export class NativeMarkdownHelp {
  private generation = 0;
  private component: Component | null = null;
  private disposed = false;
  /** The actual native container supplies its document/window; popouts never use a global host. */
  constructor(private readonly app: App, private readonly container: HTMLElement) {}
  /** A newer source or close retires the prior render before awaiting native post-processing. */
  async render(markdown: string, current: () => boolean = () => true): Promise<boolean> {
    if (this.disposed) return false;
    const source = inertMarkdownHelpSource(markdown), generation = ++this.generation;
    this.component?.unload();this.container.empty();
    const component = new Component();this.component = component;component.load();
    const staging = this.container.createDiv({cls: "markdown-rendered kplex-markdown-help-content"});staging.remove();
    try {
      await MarkdownRenderer.render(this.app, source, staging, "", component);
      if (this.disposed || generation !== this.generation || !current() || !this.container.isConnected) {component.unload();staging.empty();return false;}
      // Source admission excludes resource syntax. Defense in depth refuses any unexpected
      // active/media node from a native extension before attaching the completed tree.
      if (staging.querySelector("script,style,iframe,object,embed,img,video,audio,source,link,canvas,form,input,image,use,foreignObject,animate,set")) throw new Error("Unsupported rendered help content");
      for (const anchor of Array.from(staging.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
        const href = anchor.getAttribute("href") ?? "";
        if (!markdownHelpLinkTarget(href)) throw new Error("Unsupported rendered help link");
        anchor.rel = "noopener noreferrer";
      }
      this.container.append(staging);return true;
    } catch (error) {
      component.unload();staging.empty();if (this.component === component) this.component = null;
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
  /** Native close/unload is immediate and idempotent; pending render results cannot reattach. */
  dispose(): void {
    if (this.disposed) return;this.disposed = true;this.generation++;this.component?.unload();this.component = null;this.container.empty();
  }
}
