import { Modal, Notice, Setting, type TFile, normalizePath } from "obsidian";
import type ExcaliBrainPlugin from "../main";

function fileSuffix(file: TFile): string {
  if (file.name.toLocaleLowerCase().endsWith(".excalidraw.md")) return ".excalidraw.md";
  return file.extension ? `.${file.extension}` : "";
}

function editableStem(file: TFile, suffix: string): string {
  return suffix && file.name.toLocaleLowerCase().endsWith(suffix.toLocaleLowerCase())
    ? file.name.slice(0, -suffix.length)
    : file.basename;
}

export class RenameNoteModal extends Modal {
  constructor(private plugin: ExcaliBrainPlugin, private file: TFile) {
    super(plugin.app);
  }

  onOpen(): void {
    this.titleEl.setText("Rename note");
    this.modalEl.addClass("kplex-rename-note-modal");
    const suffix = fileSuffix(this.file);
    let value = editableStem(this.file, suffix);
    let input: HTMLInputElement | null = null;

    const rename = async () => {
      let stem = value.trim();
      if (suffix && stem.toLocaleLowerCase().endsWith(suffix.toLocaleLowerCase())) {
        stem = stem.slice(0, -suffix.length).trim();
      }
      if (!stem) {
        new Notice("Enter a note name.", 1800);
        input?.focus();
        return;
      }
      if (/[\\/]/.test(stem)) {
        new Notice("Rename changes the note name only. Folder separators are not allowed.", 2600);
        input?.focus();
        return;
      }

      const folder = this.file.parent?.path && this.file.parent.path !== "/" ? this.file.parent.path : "";
      const newPath = normalizePath(folder ? `${folder}/${stem}${suffix}` : `${stem}${suffix}`);
      if (newPath === this.file.path) {
        this.close();
        return;
      }
      if (this.plugin.app.vault.getAbstractFileByPath(newPath)) {
        new Notice(`A file already exists at ${newPath}.`, 3000);
        input?.focus();
        return;
      }

      try {
        await this.plugin.app.fileManager.renameFile(this.file, newPath);
        this.close();
      } catch (error) {
        new Notice(`Could not rename note: ${error instanceof Error ? error.message : String(error)}`, 5000);
      }
    };

    const nameSetting = new Setting(this.contentEl)
      .setName("Name")
      .addText((text) => {
        input = text.inputEl;
        text.setValue(value).setPlaceholder("Note name").onChange((next) => { value = next; });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          void rename();
        });
        window.setTimeout(() => {
          text.inputEl.focus();
          text.inputEl.select();
        }, 0);
      });
    nameSetting.settingEl.addClass("kplex-rename-note-name-setting");

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Rename").setCta().onClick(() => void rename()))
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
