import { Modal, Notice, Setting, type App } from "obsidian";

export type GhostMaterializationKind = "markdown" | "excalidraw";

export type GhostMaterializationLocation = {
  folderPath: string;
  label: string;
};

export class MaterializeGhostModal extends Modal {
  private selectedFolderPath: string;
  private creating = false;

  constructor(
    app: App,
    private readonly noteName: string,
    private readonly locations: readonly GhostMaterializationLocation[],
    private readonly excalidrawAvailable: boolean,
    private readonly defaultKind: GhostMaterializationKind,
    private readonly onCreate: (kind: GhostMaterializationKind, folderPath: string) => Promise<boolean>,
  ) {
    super(app);
    this.selectedFolderPath = locations[0]?.folderPath ?? "";
  }

  private async create(kind: GhostMaterializationKind): Promise<void> {
    if (this.creating) return;
    this.creating = true;
    try {
      if (await this.onCreate(kind, this.selectedFolderPath)) this.close();
    } catch (error) {
      new Notice(`Could not create note: ${error instanceof Error ? error.message : String(error)}`, 5000);
    } finally {
      this.creating = false;
    }
  }

  onOpen(): void {
    const effectiveDefault = this.defaultKind === "excalidraw" && this.excalidrawAvailable ? "excalidraw" : "markdown";
    this.titleEl.setText(`Create “${this.noteName}”`);
    this.contentEl.createEl("p", {
      text: this.excalidrawAvailable
        ? "Choose where to create this note and whether it should be Markdown or an Excalidraw drawing."
        : "Choose where to create this note.",
      cls: "setting-item-description",
    });

    if (this.locations.length > 1) {
      new Setting(this.contentEl)
        .setName("Location")
        .setDesc("Its parent notes resolve to different new-note folders. Choose the location to use.")
        .addDropdown((dropdown) => {
          for (const location of this.locations) {
            const value = location.folderPath || "/";
            dropdown.addOption(value, location.label);
          }
          dropdown.setValue(this.selectedFolderPath || "/");
          dropdown.onChange((value) => { this.selectedFolderPath = value === "/" ? "" : value; });
        });
    } else {
      new Setting(this.contentEl)
        .setName("Location")
        .setDesc(this.locations[0]?.label ?? "Vault root");
    }

    const actionSetting = new Setting(this.contentEl);
    actionSetting.addButton((button) => {
      button
        .setButtonText("Markdown")
        .setIcon("file-text")
        .onClick(() => { void this.create("markdown"); });
      if (effectiveDefault === "markdown") button.setCta();
    });

    if (this.excalidrawAvailable) {
      actionSetting.addButton((button) => {
        button
          .setButtonText("Excalidraw")
          .setIcon("palette")
          .onClick(() => { void this.create("excalidraw"); });
        if (effectiveDefault === "excalidraw") button.setCta();
      });
    }

    actionSetting.addButton((button) => button
      .setButtonText("Cancel")
      .onClick(() => this.close()));

    this.scope.register(["Mod"], "Enter", (event) => {
      event.preventDefault();
      void this.create(effectiveDefault);
      return true;
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
