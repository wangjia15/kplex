import { Modal, Setting, TFile, normalizePath } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { GateRole, GraphPage } from "../types";

export class NewRelatedNoteModal extends Modal {
  constructor(
    private plugin: ExcaliBrainPlugin,
    private origin: GraphPage,
    private role: GateRole,
    private field: string,
    private onCommitted?: () => void,
  ) { super(plugin.app); }

  onOpen(): void {
    this.titleEl.setText("Create related note");
    let path = this.origin.file?.parent?.path ? `${this.origin.file.parent.path}/New note` : "New note";
    let kind: "markdown" | "excalidraw" = "markdown";
    new Setting(this.contentEl).setName("Path / name").setDesc("Folder is optional. K-Plex creates missing folders.").addText((text) => {
      text.setValue(path).setPlaceholder("Projects/New note").onChange((value) => { path = value.trim(); });
    });
    const excalidrawAvailable = this.plugin.isExcalidrawAvailable();
    new Setting(this.contentEl).setName("Note type").addDropdown((dropdown) => {
      dropdown.addOption("markdown", "Markdown note");
      if (excalidrawAvailable) dropdown.addOption("excalidraw", "Excalidraw drawing");
      dropdown.setValue(kind).onChange((value) => { kind = value as "markdown" | "excalidraw"; });
    });
    if (excalidrawAvailable) {
      this.contentEl.createEl("p", { cls: "setting-item-description", text: "Excalidraw drawings use the Excalidraw plugin's standard configured-template prompt." });
    }
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Create & link").setCta().onClick(() => void this.create(path, kind)))
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }

  private async create(rawPath: string, kind: "markdown" | "excalidraw"): Promise<void> {
    const clean = normalizePath(rawPath || "New note");
    const file = await this.plugin.createNewRelatedFile(clean, kind);
    if (!(file instanceof TFile)) return;
    await this.plugin.rebuildIndex(false, true, "new-related-note");
    await this.plugin.createRelationFromGate(this.origin, this.role, file, this.field);
    this.onCommitted?.();
    this.close();
  }

  onClose(): void { this.contentEl.empty(); }
}
