import { Modal, Setting } from "obsidian";
import type ExcaliBrainPlugin from "../main";

export type OntologyAssignmentRole = "parent" | "child" | "left" | "right" | "previous" | "next" | "hidden" | "excluded";

const ROLE_LABELS: Record<OntologyAssignmentRole, string> = {
  parent: "Parent",
  child: "Child",
  left: "Friend / left",
  right: "Challenger / right",
  previous: "Previous",
  next: "Next",
  hidden: "Hidden",
  excluded: "Excluded / metadata only",
};

export class AddToOntologyModal extends Modal {
  constructor(
    private plugin: ExcaliBrainPlugin,
    private fieldName: string,
    private onSaved?: () => void,
  ) { super(plugin.app); }

  onOpen(): void {
    this.titleEl.setText(`Add “${this.fieldName}” to K-Plex ontology`);
    this.contentEl.createEl("p", {
      text: "Choose how links stored in this field should appear in K-Plex. The field is removed from any previous ontology group first.",
      cls: "setting-item-description",
    });
    let selected: OntologyAssignmentRole = this.plugin.ontologyRoleForField(this.fieldName) ?? "child";
    new Setting(this.contentEl)
      .setName("Relationship role")
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(ROLE_LABELS)) dropdown.addOption(value, label);
        dropdown.setValue(selected).onChange((value) => { selected = value as OntologyAssignmentRole; });
      });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Save").setCta().onClick(() => {
        void this.plugin.assignFieldToOntology(this.fieldName, selected).then(() => {
          this.onSaved?.();
          this.close();
        });
      }))
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void { this.contentEl.empty(); }
}
