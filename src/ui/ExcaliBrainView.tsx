import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import type ExcaliBrainPlugin from "../main";
import { ExcaliBrainApp } from "./App";

export const EXCALIBRAIN_VIEW_TYPE = "excalibrain-react-view";

export class ExcaliBrainView extends ItemView {
  private root: Root | null = null;
  constructor(leaf: WorkspaceLeaf, private plugin: ExcaliBrainPlugin) { super(leaf); }

  getViewType(): string { return EXCALIBRAIN_VIEW_TYPE; }
  getDisplayText(): string { return "K-Plex"; }
  getIcon(): string { return "brain-circuit"; }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("excalibrain-view-host");
    this.root = createRoot(this.contentEl);
    this.root.render(<ExcaliBrainApp plugin={this.plugin} />);
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }
}
