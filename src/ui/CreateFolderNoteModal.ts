import { Modal, Notice, Setting, type ButtonComponent, type WorkspaceLeaf } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { GraphPage } from "../types";
import type { GhostMaterializationKind } from "./MaterializeGhostModal";

export class CreateFolderNoteModal extends Modal {
  private noteName = "";
  private creating = false;
  private readonly createButtons: ButtonComponent[] = [];

  constructor(
    private readonly plugin: ExcaliBrainPlugin,
    private readonly folder: GraphPage,
    private readonly hostLeaf?: WorkspaceLeaf,
  ) {
    super(plugin.app);
  }

  private folderLabel(): string {
    if (this.folder.path === "folder:/") return "Vault root";
    return this.folder.path.startsWith("folder:") ? this.folder.path.slice("folder:".length) : this.folder.name;
  }

  private refreshButtons(): void {
    const validation = this.plugin.validateRelatedNoteName(this.noteName);
    const enabled = !this.creating && validation.valid && !validation.existing;
    for (const button of this.createButtons) button.setDisabled(!enabled);
  }

  private async create(kind: GhostMaterializationKind): Promise<void> {
    if (this.creating) return;
    const validation = this.plugin.validateRelatedNoteName(this.noteName);
    if (!validation.valid) {
      new Notice(validation.error ?? "Enter a valid note name.", 2800);
      return;
    }
    if (validation.existing) {
      new Notice(`A note named “${validation.stem}” already exists in the vault.`, 2800);
      return;
    }

    this.creating = true;
    this.refreshButtons();
    try {
      const page = await this.plugin.createNewNodeInFolder(this.folder, validation.stem, kind);
      if (!page) return;
      await this.plugin.rememberNewNodeDefaultType(kind);
      this.close();
      if (this.plugin.settings.editNewNodeAfterCreate) {
        await this.plugin.finishNewRelatedNode(page, this.hostLeaf, true);
      }
    } catch (error) {
      new Notice(`Could not create note: ${error instanceof Error ? error.message : String(error)}`, 5000);
    } finally {
      this.creating = false;
      this.refreshButtons();
    }
  }

  onOpen(): void {
    const excalidrawAvailable = this.plugin.isExcalidrawAvailable();
    const defaultKind: GhostMaterializationKind = this.plugin.settings.newNodeDefaultType === "excalidraw" && excalidrawAvailable
      ? "excalidraw"
      : "markdown";

    this.titleEl.setText("Add note to folder");
    this.modalEl.addClass("kplex-create-folder-note-modal");
    this.contentEl.createEl("p", {
      text: `Create a file in ${this.folderLabel()}. Its folder location defines the relationship, so no note-to-note link will be added.`,
      cls: "setting-item-description",
    });

    const nameSetting = new Setting(this.contentEl)
      .setName("Note name")
      .addText((text) => {
        text
          .setPlaceholder("New note")
          .onChange((value) => {
            this.noteName = value;
            this.refreshButtons();
          });
        text.inputEl.focus();
      });
    nameSetting.settingEl.addClass("kplex-create-folder-note-name-setting");

    new Setting(this.contentEl)
      .setName("Open for editing")
      .setDesc("Center the new note and open it in the Sidecar.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.editNewNodeAfterCreate)
        .onChange((enabled) => {
          this.plugin.settings.editNewNodeAfterCreate = enabled;
          void this.plugin.saveSettings(false, false);
        }));

    const actions = new Setting(this.contentEl);
    actions.addButton((button) => {
      this.createButtons.push(button);
      button
        .setButtonText("Markdown")
        .setIcon("file-text")
        .onClick(() => { void this.create("markdown"); });
      if (defaultKind === "markdown") button.setCta();
    });

    if (excalidrawAvailable) {
      actions.addButton((button) => {
        this.createButtons.push(button);
        button
          .setButtonText("Excalidraw")
          .setIcon("palette")
          .onClick(() => { void this.create("excalidraw"); });
        if (defaultKind === "excalidraw") button.setCta();
      });
    }

    actions.addButton((button) => button
      .setButtonText("Cancel")
      .onClick(() => this.close()));

    this.refreshButtons();
    this.scope.register(["Mod"], "Enter", (event) => {
      const validation = this.plugin.validateRelatedNoteName(this.noteName);
      if (!validation.valid || validation.existing || this.creating) return false;
      event.preventDefault();
      void this.create(defaultKind);
      return true;
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
