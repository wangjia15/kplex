import type { App } from "obsidian";
import { KplexModal, formActions } from "../adapters/obsidian/KplexModal";
import { createObsidianTranslator } from "../adapters/obsidian/localization";

/**
 * One-time explanation shown when paper reading mode is first enabled. It lists the external
 * services involved and the property K-Plex will use, and resolves with the user's decision.
 */
export class PaperReadingIntroModal extends KplexModal {
  private readonly translate = createObsidianTranslator();
  private decided = false;

  constructor(app: App, private readonly referenceField: string, private readonly onDecision: (accepted: boolean) => void) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.translate("paper.intro.title"));
    const { contentEl } = this;
    contentEl.addClass("kplex-paper-intro");
    contentEl.createEl("p", { text: this.translate("paper.intro.intro") });
    const list = contentEl.createEl("ul");
    list.createEl("li", { text: this.translate("paper.intro.servicesData") });
    list.createEl("li", { text: this.translate("paper.intro.servicesTranslation") });
    contentEl.createEl("p", { text: this.translate("paper.intro.privacy") });
    contentEl.createEl("p", {
      text: this.translate("paper.intro.property", { field: this.referenceField }),
    });
    formActions(contentEl)
      .addButton((button) => button.setButtonText(this.translate("paper.intro.cancel")).onClick(() => this.finish(false)))
      .addButton((button) => button.setButtonText(this.translate("paper.intro.enable")).setCta().onClick(() => this.finish(true)));
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
