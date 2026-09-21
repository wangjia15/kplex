import { Modal, Notice, TFile, getIcon } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { GateRole, GateSide, GraphPage, LinkDirection } from "../types";
import { NewRelatedNoteModal } from "./NewRelatedNoteModal";

export type RelationModalOptions = {
  mode: "create" | "relink";
  origin: GraphPage;
  semanticRole: GateRole;
  fixedTarget?: GraphPage;
  existingDirection?: LinkDirection | null;
  onCommitted?: () => void;
  onCommitStart?: (role: GateRole) => void;
  onCommitEnd?: (success: boolean) => void;
  allowRoleSelection?: boolean;
};

const ROLE_LABEL: Record<GateRole, string> = {
  parent: "Parent",
  child: "Child",
  left: "Friend",
  right: "Challenger",
};


function gateForRole(role: GateRole): GateSide {
  if (role === "parent") return "top";
  if (role === "child") return "bottom";
  if (role === "left") return "left";
  return "right";
}

function addIcon(el: HTMLElement, name: string): void {
  const icon = getIcon(name);
  if (!icon) return;
  icon.classList.add("kplex-lucide");
  el.prepend(icon);
}

export class RelationModal extends Modal {
  private selectedField: string;
  private semanticRole: GateRole;
  private selectedPath: string | null = null;
  private query = "";
  private activeIndex = 0;
  private busy = false;
  private resultsEl: HTMLDivElement | null = null;
  private saveButton: HTMLButtonElement | null = null;
  private searchInput: HTMLInputElement | null = null;

  constructor(private plugin: ExcaliBrainPlugin, private options: RelationModalOptions) {
    super(plugin.app);
    this.semanticRole = options.semanticRole;
    this.selectedField = plugin.defaultOntologyField(this.semanticRole);
  }

  private candidates(): TFile[] {
    if (this.options.fixedTarget) return [];
    const q = this.query.trim().toLowerCase();
    const blocked = this.plugin.index.gateNeighbourPaths(this.options.origin, gateForRole(this.semanticRole));
    return this.plugin.app.vault.getMarkdownFiles()
      .filter((file) => file.path !== this.options.origin.path)
      .filter((file) => !blocked.has(file.path))
      .filter((file) => !q || file.basename.toLowerCase().includes(q) || file.path.toLowerCase().includes(q))
      .sort((a, b) => a.basename.localeCompare(b.basename, undefined, { numeric: true, sensitivity: "base" }))
      .slice(0, 60);
  }

  private selectedFile(): TFile | null {
    if (!this.selectedPath) return null;
    const file = this.plugin.app.vault.getAbstractFileByPath(this.selectedPath);
    return file instanceof TFile ? file : null;
  }

  private canSave(): boolean {
    return Boolean(this.options.fixedTarget || this.selectedFile());
  }

  private updateSaveButton(): void {
    if (this.saveButton) this.saveButton.disabled = this.busy || !this.canSave();
  }

  private renderResults(): void {
    if (!this.resultsEl) return;
    this.resultsEl.empty();
    const files = this.candidates();
    if (this.activeIndex >= files.length) this.activeIndex = Math.max(0, files.length - 1);

    if (!files.length) {
      this.resultsEl.createDiv({ cls: "kplex-relation-empty", text: "No available Markdown notes match." });
      this.selectedPath = null;
      this.updateSaveButton();
      return;
    }

    if (!this.selectedPath || !files.some((file) => file.path === this.selectedPath)) {
      this.selectedPath = files[this.activeIndex]?.path ?? null;
    } else {
      this.activeIndex = Math.max(0, files.findIndex((file) => file.path === this.selectedPath));
    }

    files.forEach((file, index) => {
      const button = this.resultsEl!.createEl("button", {
        cls: index === this.activeIndex ? "is-selected" : "",
        attr: { type: "button", title: file.path },
      });
      addIcon(button, "file-text");
      button.createSpan({ cls: "kplex-relation-file-name", text: file.basename });
      button.createEl("small", { text: file.path });
      button.addEventListener("click", () => {
        const wasSelected = this.selectedPath === file.path && this.activeIndex === index;
        this.activeIndex = index;
        this.selectedPath = file.path;
        this.resultsEl?.querySelectorAll("button").forEach((item) => item.classList.remove("is-selected"));
        button.classList.add("is-selected");
        button.focus();
        this.updateSaveButton();
        // A second click on the selected result behaves like pressing Enter. This keeps the
        // explicit check button workflow while making an already-highlighted result actionable.
        if (wasSelected) void this.confirm();
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this.activeIndex = index;
          this.selectedPath = file.path;
          void this.confirm();
        }
      });
      button.addEventListener("dblclick", () => {
        this.activeIndex = index;
        this.selectedPath = file.path;
        void this.confirm();
      });
    });
    this.updateSaveButton();
  }

  private async confirm(): Promise<void> {
    if (this.busy || !this.canSave()) return;
    this.busy = true;
    this.updateSaveButton();
    let success = false;
    this.options.onCommitStart?.(this.semanticRole);
    // Moving an existing thought should feel immediate. The graph applies an optimistic overlay
    // and blocks accidental follow-up clicks while metadata/indexing catches up, so dismiss the
    // chooser as soon as the relink commit starts instead of leaving a seemingly frozen modal.
    if (this.options.mode === "relink") this.close();
    try {
      if (this.options.mode === "relink") {
        const target = this.options.fixedTarget;
        if (!target) return;
        await this.plugin.relinkCentralNeighbour(
          this.options.origin,
          target,
          this.semanticRole,
          this.selectedField,
          this.options.existingDirection ?? null,
        );
      } else if (this.options.fixedTarget) {
        await this.plugin.createRelationToPage(
          this.options.origin,
          this.semanticRole,
          this.options.fixedTarget,
          this.selectedField,
        );
      } else {
        const file = this.selectedFile();
        if (!file) return;
        await this.plugin.createRelationFromGate(this.options.origin, this.semanticRole, file, this.selectedField);
      }
      success = true;
      this.options.onCommitted?.();
      this.close();
    } catch (error) {
      new Notice(`Could not update relationship: ${error instanceof Error ? error.message : String(error)}`, 5000);
    } finally {
      this.options.onCommitEnd?.(success);
      this.busy = false;
      this.updateSaveButton();
    }
  }

  onOpen(): void {
    let roleName = ROLE_LABEL[this.semanticRole];
    this.titleEl.setText(this.options.mode === "relink" ? "Move relationship" : `Add ${roleName.toLowerCase()}`);
    this.modalEl.addClass("kplex-relation-modal");
    this.contentEl.addClass("kplex-relation-modal-content");

    let fieldSelect: HTMLSelectElement | null = null;
    const repopulateFields = () => {
      if (!fieldSelect) return;
      fieldSelect.empty();
      for (const field of this.plugin.ontologyFieldsForRole(this.semanticRole)) fieldSelect.createEl("option", { text: field, attr: { value: field } });
      this.selectedField = this.plugin.defaultOntologyField(this.semanticRole);
      fieldSelect.value = this.selectedField;
    };
    if (this.options.allowRoleSelection) {
      this.contentEl.createEl("label", { cls: "kplex-relation-label", text: "Direction / role", attr: { for: "kplex-relation-modal-role" } });
      const roleSelect = this.contentEl.createEl("select", { attr: { id: "kplex-relation-modal-role" } });
      for (const role of ["parent", "child", "left", "right"] as GateRole[]) roleSelect.createEl("option", { text: ROLE_LABEL[role], attr: { value: role } });
      roleSelect.value = this.semanticRole;
      roleSelect.addEventListener("change", () => {
        this.semanticRole = roleSelect.value as GateRole;
        roleName = ROLE_LABEL[this.semanticRole];
        this.selectedPath = null;
        this.activeIndex = 0;
        repopulateFields();
        this.renderResults();
      });
    }

    if (this.options.fixedTarget) {
      const summary = this.contentEl.createDiv({ cls: "kplex-relation-summary" });
      summary.createSpan({ cls: "kplex-relation-direction", text: roleName });
      summary.createSpan({ text: this.plugin.index.titleFor(this.options.fixedTarget), attr: { title: this.options.fixedTarget.path } });
    } else {
      this.contentEl.createEl("label", { cls: "kplex-relation-label", text: "Markdown note", attr: { for: "kplex-relation-modal-search" } });
      const searchWrap = this.contentEl.createDiv({ cls: "kplex-relation-search-wrap" });
      const searchIcon = searchWrap.createSpan({ cls: "kplex-icon" });
      addIcon(searchIcon, "search");
      const searchInput = searchWrap.createEl("input", {
        attr: { id: "kplex-relation-modal-search", type: "text", placeholder: "Search notes…", autocomplete: "off" },
      });
      this.searchInput = searchInput;
      this.resultsEl = this.contentEl.createDiv({ cls: "kplex-relation-results" });
      searchInput.addEventListener("input", () => {
        this.query = searchInput.value;
        this.activeIndex = 0;
        this.selectedPath = null;
        this.renderResults();
      });
      searchInput.addEventListener("keydown", (event) => {
        const files = this.candidates();
        if (event.key === "ArrowDown") {
          event.preventDefault();
          this.activeIndex = Math.min(Math.max(0, files.length - 1), this.activeIndex + 1);
          this.selectedPath = files[this.activeIndex]?.path ?? null;
          this.renderResults();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          this.activeIndex = Math.max(0, this.activeIndex - 1);
          this.selectedPath = files[this.activeIndex]?.path ?? null;
          this.renderResults();
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (!this.selectedPath && files[0]) this.selectedPath = files[0].path;
          void this.confirm();
        }
      });
      this.renderResults();
    }

    this.contentEl.createEl("label", { cls: "kplex-relation-label", text: "Document property", attr: { for: "kplex-relation-modal-field" } });
    const select = this.contentEl.createEl("select", { attr: { id: "kplex-relation-modal-field" } });
    fieldSelect = select;
    repopulateFields();

    const originIsMarkdown = this.options.origin.file?.extension === "md";
    const hint = !originIsMarkdown ? this.contentEl.createDiv({ cls: "kplex-relation-hint" }) : null;
    const updateInverseHint = () => {
      if (!hint) return;
      const inverseField = this.plugin.inverseOntologyField(this.selectedField, this.semanticRole);
      hint.setText(`The relationship is stored on the Markdown target using the inverse property ${inverseField}.`);
    };
    select.addEventListener("change", () => {
      this.selectedField = select.value;
      updateInverseHint();
    });
    updateInverseHint();

    if (!this.options.fixedTarget && this.options.mode === "create") {
      const newButton = this.contentEl.createEl("button", { cls: "kplex-relation-new-note", attr: { type: "button" } });
      addIcon(newButton, "file-plus-2");
      newButton.createSpan({ text: "Create new note…" });
      newButton.addEventListener("click", () => {
        new NewRelatedNoteModal(this.plugin, this.options.origin, this.semanticRole, this.selectedField, this.options.onCommitted).open();
        this.close();
      });
    }

    const actions = this.contentEl.createDiv({ cls: "kplex-relation-actions" });
    const cancel = actions.createEl("button", { attr: { type: "button", title: "Cancel", "aria-label": "Cancel" } });
    addIcon(cancel, "x");
    cancel.addEventListener("click", () => this.close());

    const saveButton = actions.createEl("button", { cls: "mod-cta", attr: { type: "button", title: "Save relationship", "aria-label": "Save relationship" } });
    this.saveButton = saveButton;
    addIcon(saveButton, "check");
    saveButton.addEventListener("click", () => void this.confirm());
    this.updateSaveButton();

    window.setTimeout(() => this.searchInput?.focus(), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
