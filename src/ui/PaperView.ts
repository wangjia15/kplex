import { ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import { parsePaperId } from "../paper/PaperIdentifier";
import type { PaperId, PaperListKind } from "../paper/PaperTypes";
import { PaperDetailsPanel, paperTargetKey, type PaperTarget } from "./PaperDetailsPanel";

export const KPLEX_PAPER_VIEW_TYPE = "kplex-paper";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrow persisted view state back into a PaperTarget; invalid state yields null. */
export function paperTargetFromState(state: unknown): PaperTarget | null {
  if (!isRecord(state) || !Array.isArray(state.ids)) return null;
  const ids: PaperId[] = [];
  for (const item of state.ids) {
    if (!isRecord(item) || typeof item.value !== "string") continue;
    if (item.kind === "title") ids.push({ kind: "title", value: item.value });
    else if (item.kind === "s2") ids.push({ kind: "s2", value: item.value });
    else if (item.kind === "doi" || item.kind === "arxiv") {
      const parsed = parsePaperId(item.kind === "arxiv" ? `arXiv:${item.value}` : item.value);
      if (parsed) ids.push(parsed);
    }
  }
  if (!ids.length) return null;
  let origin: PaperTarget["origin"] = null;
  if (isRecord(state.origin) && typeof state.origin.path === "string") {
    const kind: PaperListKind = state.origin.kind === "citations" ? "citations" : "references";
    origin = { path: state.origin.path, kind };
  }
  return {
    ids,
    title: typeof state.title === "string" ? state.title : "",
    pagePath: typeof state.pagePath === "string" ? state.pagePath : null,
    origin,
  };
}

/**
 * Paper details as a native workspace view, normally hosted in the K-Plex sidecar. Clicking a
 * reference or citing paper shows it in the same view (with Back).
 */
export class PaperView extends ItemView {
  private panel: PaperDetailsPanel | null = null;
  private target: PaperTarget | null = null;
  private title = "Paper details";

  constructor(leaf: WorkspaceLeaf, private readonly plugin: ExcaliBrainPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return KPLEX_PAPER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.title;
  }

  getIcon(): string {
    return "book-open";
  }

  getState(): Record<string, unknown> {
    const target = this.panel?.getTarget() ?? this.target;
    return target ? { ...target } : {};
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    const target = paperTargetFromState(state);
    if (target) {
      this.title = target.title || "Paper details";
      const current = this.panel?.getTarget();
      this.target = target;
      // Our own navigation round-trips through setViewState so Obsidian refreshes the tab title
      // and saves the layout; do not reload the paper that is already shown.
      if (!current || paperTargetKey(current) !== paperTargetKey(target)) this.mount();
    }
    await super.setState(state, result);
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("kplex-paper-view");
    this.mount();
  }

  async onClose(): Promise<void> {
    this.panel?.destroy();
    this.panel = null;
  }

  private mount(): void {
    if (!this.target) {
      this.contentEl.empty();
      this.contentEl.createDiv({ cls: "kplex-paper-muted", text: "Open Paper details from a paper node in K-Plex." });
      return;
    }
    if (!this.plugin.settings.paperReadingEnabled) {
      this.panel?.destroy();
      this.panel = null;
      this.contentEl.empty();
      this.contentEl.createDiv({ cls: "kplex-paper-muted", text: "Paper reading is turned off in K-Plex settings." });
      return;
    }
    if (this.panel) {
      this.panel.show(this.target);
      return;
    }
    this.contentEl.empty();
    this.panel = new PaperDetailsPanel(this.plugin, this.contentEl, {
      setTitle: (title) => {
        this.title = title || "Paper details";
      },
      showInPlex: (page) => this.plugin.showInPlex(page.path),
      targetChanged: (target) => {
        const same = this.target !== null && paperTargetKey(this.target) === paperTargetKey(target);
        this.target = target;
        if (same) {
          this.app.workspace.requestSaveLayout();
          return;
        }
        this.title = target.title || "Paper details";
        void this.leaf.setViewState({ type: KPLEX_PAPER_VIEW_TYPE, state: { ...target }, active: false });
      },
    }, this.target);
  }
}
