import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import type ExcaliBrainPlugin from "../main";
import type { KplexViewSurface } from "../settings";
import { ExcaliBrainApp } from "./App";

export const EXCALIBRAIN_VIEW_TYPE = "k-plex-react-view";
export const KPLEX_SIDEPANEL_VIEW_TYPE = "k-plex-sidepanel-view";

abstract class BaseKplexView extends ItemView {
  private root: Root | null = null;
  private windowMigrationCleanup: (() => void) | null = null;

  constructor(leaf: WorkspaceLeaf, protected plugin: ExcaliBrainPlugin) { super(leaf); }

  getDisplayText(): string { return "K-Plex"; }
  getIcon(): string { return "brain-circuit"; }
  protected abstract getSurface(): KplexViewSurface;

  protected renderReact(): void {
    this.root?.unmount();
    this.root = createRoot(this.contentEl);
    this.root.render(<ExcaliBrainApp plugin={this.plugin} surface={this.getSurface()} hostLeaf={this.leaf} />);
  }

  async onOpen(): Promise<void> {
    await super.onOpen();
    this.contentEl.empty();
    this.contentEl.addClass("excalibrain-view-host");
    this.contentEl.toggleClass("kplex-sidepanel-host", this.getSurface() === "sidepanel");
    if (typeof this.containerEl.onWindowMigrated === "function") {
      this.windowMigrationCleanup = this.containerEl.onWindowMigrated(() => this.renderReact());
    }
    this.renderReact();
    await this.plugin.onKplexViewOpened();
  }

  async onClose(): Promise<void> {
    this.windowMigrationCleanup?.();
    this.windowMigrationCleanup = null;
    this.root?.unmount();
    this.root = null;
    this.plugin.onKplexViewClosed(this.leaf);
    await super.onClose();
  }
}

export class ExcaliBrainView extends BaseKplexView {
  getViewType(): string { return EXCALIBRAIN_VIEW_TYPE; }
  protected getSurface(): KplexViewSurface {
    // A regular leaf can migrate into a popout. Its document lives in a different window then.
    return this.contentEl.ownerDocument.defaultView === window ? "leaf" : "popout";
  }
}

export class KplexSidepanelView extends BaseKplexView {
  getViewType(): string { return KPLEX_SIDEPANEL_VIEW_TYPE; }
  protected getSurface(): KplexViewSurface { return "sidepanel"; }
}
