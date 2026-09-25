import { Modal } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { GraphPage } from "../types";
import { PaperDetailsPanel, type PaperTarget } from "./PaperDetailsPanel";

/** Dialog host for Paper details, used when no K-Plex sidecar is available. */
export class PaperDetailsModal extends Modal {
  private panel: PaperDetailsPanel | null = null;

  constructor(
    private readonly plugin: ExcaliBrainPlugin,
    private readonly target: PaperTarget,
    private readonly onShowInPlex?: (page: GraphPage) => void,
  ) {
    super(plugin.app);
  }

  onOpen(): void {
    this.modalEl.addClass("kplex-paper-modal");
    this.panel = new PaperDetailsPanel(this.plugin, this.contentEl, {
      setTitle: (title) => this.setTitle(title),
      showInPlex: (page) => {
        this.close();
        if (this.onShowInPlex) this.onShowInPlex(page);
        else this.plugin.showInPlex(page.path);
      },
    }, this.target);
  }

  onClose(): void {
    this.panel?.destroy();
    this.panel = null;
  }
}
