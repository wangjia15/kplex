import { Modal } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import { RelationType, type Role } from "../types";
import type { EvidenceDecision, EvidenceSourceKind, RelationEvidence } from "../index/RelationEvidence";
import type { RelationshipExplanation } from "../index/RelationResolver";

const ROLE_LABEL: Record<string, string> = {
  parent: "Parent",
  child: "Child",
  left: "Friend",
  right: "Challenger",
  previous: "Previous",
  next: "Next",
  hidden: "Hidden",
};

const SOURCE_LABEL: Record<EvidenceSourceKind, string> = {
  "obsidian-link": "Resolved note link",
  "unresolved-link": "Unresolved note link",
  "frontmatter-ontology": "Frontmatter ontology",
  "inline-ontology": "Body ontology",
  "body-url": "Body URL",
  "date-property": "Date property",
  "file-tree": "Physical folder tree",
  "tag-tree": "Tag tree",
  "url-origin": "URL origin hierarchy",
};

function relationTypeLabel(type: RelationType): string {
  return type === RelationType.DEFINED ? "Defined" : "Inferred";
}

function evidenceDescription(decision: EvidenceDecision): string {
  const item = decision.evidence;
  const pieces = [
    SOURCE_LABEL[item.sourceKind],
    `${ROLE_LABEL[item.role] ?? item.role} — ${relationTypeLabel(item.relationType)}`,
  ];
  if (item.fieldName) pieces.push(`field: ${item.fieldName}`);
  if (item.line) pieces.push(`line ${item.line}`);
  return pieces.join(" · ");
}

export class RelationshipExplanationModal extends Modal {
  private closed = false;

  constructor(
    private plugin: ExcaliBrainPlugin,
    private explanation: RelationshipExplanation,
    private displayContext?: { role: Role; centerPath?: string; sourceTitle?: string; targetTitle?: string },
  ) {
    super(plugin.app);
  }

  private async addNavigationActions(row: HTMLElement, evidence: RelationEvidence): Promise<void> {
    const locations = await this.plugin.relationshipEvidenceLocations(evidence);
    if (this.closed || !row.isConnected || !locations.length) return;

    const actions = row.createDiv({ cls: "kplex-explanation-actions" });
    for (const location of locations) {
      const button = actions.createEl("button", {
        cls: "kplex-explanation-navigate",
        text: location.label,
        attr: { type: "button", title: `${location.path}:${location.line + 1}` },
      });
      button.addEventListener("click", () => {
        void this.plugin.openRelationshipEvidenceLocation(location).then(() => this.close());
      });
    }
  }

  onOpen(): void {
    this.closed = false;
    const source = this.plugin.index.get(this.explanation.sourcePath);
    const target = this.plugin.index.get(this.explanation.targetPath);
    const sourceTitle = this.displayContext?.sourceTitle
      ?? (source ? this.plugin.index.titleFor(source) : this.explanation.sourcePath);
    const targetTitle = this.displayContext?.targetTitle
      ?? (target ? this.plugin.index.titleFor(target) : this.explanation.targetPath);

    this.titleEl.setText("Why is this relationship here?");
    this.modalEl.addClass("kplex-explanation-modal");

    const pair = this.contentEl.createDiv({ cls: "kplex-explanation-pair" });
    pair.createEl("strong", { text: sourceTitle, attr: { title: this.explanation.sourcePath } });
    pair.createSpan({ text: " → " });
    pair.createEl("strong", { text: targetTitle, attr: { title: this.explanation.targetPath } });

    if (this.displayContext?.role === "sibling") {
      const center = this.displayContext.centerPath ? this.plugin.index.get(this.displayContext.centerPath) : null;
      const centerTitle = center ? this.plugin.index.titleFor(center) : this.displayContext.centerPath;
      this.contentEl.createDiv({
        cls: "kplex-explanation-display-context",
        text: centerTitle
          ? `Displayed as a sibling of ${centerTitle}. The connector shown here is the underlying parent → child relationship that makes the sibling derivation possible.`
          : "Displayed as a sibling. The connector shown here is the underlying parent → child relationship that makes the sibling derivation possible.",
      });
    }

    if (this.explanation.resolvedRoles.length) {
      const roles = this.explanation.resolvedRoles
        .map((item) => `${ROLE_LABEL[item.role]} — ${relationTypeLabel(item.relationType)}`)
        .join(", ");
      this.contentEl.createDiv({ cls: "kplex-explanation-result", text: `Resolved as: ${roles}` });
    } else if (this.explanation.hidden) {
      this.contentEl.createDiv({ cls: "kplex-explanation-result", text: "Resolved as: Hidden" });
    }

    this.contentEl.createDiv({ cls: "kplex-explanation-summary", text: this.explanation.summary });
    this.contentEl.createEl("h4", { text: "Evidence" });

    const list = this.contentEl.createDiv({ cls: "kplex-explanation-evidence" });
    if (!this.explanation.decisions.length) {
      list.createDiv({ cls: "kplex-explanation-empty", text: "No stored evidence was found for this pair." });
      return;
    }

    for (const decision of this.explanation.decisions) {
      const row = list.createDiv({ cls: `kplex-explanation-evidence-row${decision.active ? " is-active" : " is-suppressed"}` });
      const state = row.createSpan({ cls: "kplex-explanation-state", text: decision.active ? "USED" : "OVERRIDDEN" });
      state.setAttr("aria-label", decision.active ? "Evidence used by the resolver" : "Evidence overridden by precedence");
      row.createSpan({ cls: "kplex-explanation-description", text: evidenceDescription(decision) });
      if (decision.evidence.rawValue) row.createEl("code", { text: decision.evidence.rawValue });
      if (decision.suppressionReason) row.createDiv({ cls: "kplex-explanation-reason", text: decision.suppressionReason });
      void this.addNavigationActions(row, decision.evidence);
    }
  }

  onClose(): void {
    this.closed = true;
    this.contentEl.empty();
  }
}
