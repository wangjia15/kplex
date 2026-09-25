import { Modal, Setting, type App } from "obsidian";

/**
 * One-time explanation shown when paper reading mode is first enabled. It lists the external
 * services involved and the property K-Plex will use, and resolves with the user's decision.
 */
export class PaperReadingIntroModal extends Modal {
  private decided = false;

  constructor(app: App, private readonly referenceField: string, private readonly onDecision: (accepted: boolean) => void) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Enable paper reading");
    const { contentEl } = this;
    contentEl.addClass("kplex-paper-intro");
    contentEl.createEl("p", { text: "Paper reading adds Paper details to notes with a DOI or arXiv id. When you use it, K-Plex contacts:" });
    const list = contentEl.createEl("ul");
    list.createEl("li", { text: "Semantic Scholar, OpenAlex and arXiv — to load paper details, references and citing papers." });
    list.createEl("li", { text: "Google Translate or Bing Translator — only when you translate an abstract or title. The text is sent to that service." });
    contentEl.createEl("p", { text: "Nothing is sent until you open Paper details." });
    contentEl.createEl("p", {
      text: `Papers you add or link are stored in the “${this.referenceField}” property. It becomes a parent field, so cited papers appear above a paper and papers citing it appear below.`,
    });
    new Setting(contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.finish(false)))
      .addButton((button) => button.setButtonText("Enable").setCta().onClick(() => this.finish(true)));
  }

  private finish(accepted: boolean): void {
    this.decided = true;
    this.onDecision(accepted);
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.decided) this.onDecision(false);
  }
}
