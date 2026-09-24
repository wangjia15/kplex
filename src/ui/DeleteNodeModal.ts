import { Modal, Setting, type App } from "obsidian";
import type { EvidenceSourceKind } from "../index/RelationEvidence";

export type DeleteNodeConfirmationOptions = {
  nodeName: string;
  hasFile: boolean;
  firstUse: boolean;
  confirmFileDelete: boolean;
  onConfirm: (confirmFileDelete: boolean) => void | Promise<void>;
  onCancel?: () => void;
};

export class DeleteNodeConfirmationModal extends Modal {
  private confirmed = false;
  constructor(app: App, private readonly options: DeleteNodeConfirmationOptions) {
    super(app);
  }

  onOpen(): void {
    const { nodeName, hasFile, firstUse } = this.options;
    this.titleEl.setText(hasFile ? "Delete note" : "Delete placeholder");
    this.contentEl.createEl("p", {
      text: hasFile
        ? `Delete “${nodeName}”? The file will be deleted using Obsidian's configured trash behavior. K-Plex will remove references stored in note properties and leave Markdown-body links for manual review.`
        : `Delete “${nodeName}”? K-Plex will remove references stored in note properties. Markdown-body links are left in place for manual review.`,
    });

    let confirmFileDelete = this.options.confirmFileDelete;
    if (hasFile) {
      new Setting(this.contentEl)
        .setName("I understand, don't ask me again")
        .setDesc("Skip this confirmation for future file deletions. You can turn confirmations back on in K-Plex settings.")
        .addToggle((toggle) => toggle
          .setValue(!confirmFileDelete)
          .onChange((dontAskAgain) => { confirmFileDelete = !dontAskAgain; }));
    } else if (firstUse) {
      new Setting(this.contentEl)
        .setName("Always confirm before deleting files")
        .setDesc("Choose whether K-Plex should ask before future file deletions. You can change this later in K-Plex settings.")
        .addToggle((toggle) => toggle
          .setValue(confirmFileDelete)
          .onChange((value) => { confirmFileDelete = value; }));
    }

    const actions = new Setting(this.contentEl);
    actions.addButton((button) => button
      .setButtonText("Cancel")
      .onClick(() => this.close()));
    actions.addButton((button) => button
      .setButtonText(hasFile ? "Delete file" : "Delete placeholder")
      .setCta()
      .onClick(() => {
        this.confirmed = true;
        this.close();
        void this.options.onConfirm(confirmFileDelete);
      }));
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.confirmed) this.options.onCancel?.();
  }
}

export type RemainingNodeReference = {
  path: string;
  line: number;
  label: string;
  sourceKind: EvidenceSourceKind;
};

const SOURCE_LABEL: Partial<Record<EvidenceSourceKind, string>> = {
  "obsidian-link": "Markdown link",
  "unresolved-link": "Unresolved Markdown link",
  "inline-ontology": "Inline relationship",
  "body-url": "Body URL",
};

export class RemainingNodeReferencesModal extends Modal {
  constructor(
    app: App,
    private readonly nodeName: string,
    private readonly references: readonly RemainingNodeReference[],
    private readonly onOpenLocation: (reference: RemainingNodeReference) => void | Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Remaining references");
    this.contentEl.createEl("p", {
      text: `K-Plex removed property references to “${this.nodeName}”. The links below are in Markdown content and are left for you to review manually.`,
    });

    const grouped = new Map<string, RemainingNodeReference[]>();
    for (const reference of this.references) {
      const items = grouped.get(reference.path) ?? [];
      items.push(reference);
      grouped.set(reference.path, items);
    }

    for (const [path, items] of grouped) {
      this.contentEl.createEl("h3", { text: path });
      for (const reference of items) {
        const source = SOURCE_LABEL[reference.sourceKind] ?? "Reference";
        const setting = new Setting(this.contentEl)
          .setName(reference.label || source)
          .setDesc(`${source} · line ${reference.line + 1}`);
        setting.addButton((button) => button
          .setButtonText("Open")
          .onClick(() => { void this.onOpenLocation(reference); }));
      }
    }

    const actions = new Setting(this.contentEl);
    actions.addButton((button) => button
      .setButtonText("Done")
      .setCta()
      .onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
