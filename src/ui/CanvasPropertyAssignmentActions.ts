/** Shared canvas property effects. Native FileManager/convergence and ordinary incremental
 * indexing remain the established owners. A receipt retains one bounded field per live canvas. */
import {Notice, type App, type TFile} from "obsidian";
import type {GraphPage} from "../types";
import type {Translator} from "../lang";
import {assignmentField, applyPropertyField, samePropertyField, planPropertyAssignment, writableAssignmentField,
  validPropertyAssignment, type PlexPropertyAssignment, type PropertyFieldValue} from "../core/plex/views/propertyAssignment";
import {markdownBuffersMatchSaved} from "../adapters/obsidian/embeddedMarkdownLeaf";
import {SavedRelationshipPendingError} from "../adapters/obsidian/relationshipMetadataWrite";
import {SOURCE_DECODE_BUDGET_BYTES} from "../index/SourceFacts";
import {CanvasPropertyAssignmentModal} from "./CanvasPropertyAssignmentModal";
import {canvasViewText} from "./plexViews/labels";

export type CanvasPropertyAssignmentRequest = Readonly<{scope: HTMLElement; page: GraphPage; assignment: PlexPropertyAssignment;
  current: () => boolean; unrelated: boolean; connect?: () => void}>;
type Receipt = Readonly<{file: TFile; path: string; field: string; category: string; before: PropertyFieldValue; after: PropertyFieldValue; current: () => boolean}>;
type MetadataWrite = (file: TFile, field: string, mutate: (frontmatter: Record<string, unknown>) => void, current: () => boolean) => Promise<void>;

export class CanvasPropertyAssignmentActions {
  private disposed = false;
  private readonly dialogs = new Set<CanvasPropertyAssignmentModal>();
  private receipts = new WeakMap<HTMLElement, Receipt>();
  /** The composition root supplies its existing writer and current semantic-field protection. */
  constructor(private readonly app: App, private readonly translate: Translator, private readonly protectedFields: () => readonly string[],
    private readonly write: MetadataWrite) {}
  /** Eligibility is cache/identity-only. Hover/action availability never reads a note body. */
  eligible(page: GraphPage, assignment: PlexPropertyAssignment): boolean {
    return !this.disposed && validPropertyAssignment(assignment) && writableAssignmentField(assignment.field, this.protectedFields())
      && !page.transient && !page.isFolder && !page.isTag && !page.url && page.file?.extension === "md"
      && this.app.vault.getFileByPath(page.file.path) === page.file;
  }
  /** Preview the selected field without another parser, source acquisition or relationship action. */
  open(request: CanvasPropertyAssignmentRequest): boolean {
    if (!request.current() || !this.eligible(request.page, request.assignment)) return false;
    const file = request.page.file;if (!file) return false;
    const path = file.path, document = request.scope.ownerDocument, cache = this.app.metadataCache.getFileCache(file);
    const selected = cache && assignmentField(cache.frontmatter ?? {}, request.assignment.field);
    if (!selected) {new Notice(this.translate("assignment.unavailable"));return true;}
    const assignment = structuredClone(request.assignment), plan = planPropertyAssignment(selected.snapshot, assignment);
    if (plan.status === "unsupported") {new Notice(this.translate("assignment.unsupported"));return true;}
    if (plan.status === "unchanged") return true;
    const before = structuredClone(plan.before), after = structuredClone(plan.after), category = canvasViewText(assignment.label, this.translate);
    const current = (): boolean => !this.disposed && request.current() && request.scope.isConnected && request.scope.ownerDocument === document
      && !document.defaultView?.closed && file.path === path && this.app.vault.getFileByPath(path) === file
      && writableAssignmentField(assignment.field, this.protectedFields());
    const dialog = new CanvasPropertyAssignmentModal(this.app, {sourceScope: request.scope, translate: this.translate,
      note: request.page.name, field: assignment.field, category, before, after, unrelated: request.unrelated,
      connect: request.connect ? () => {if (current()) request.connect?.();} : undefined,
      commit: async modalCurrent => {
        const result = await this.commit(file, assignment.field, before, after, () => current() && modalCurrent());
        if (!this.disposed) this.receipts.set(request.scope, {file, path, field: assignment.field, category, before, after, current});
        return result;
      }, closed: () => this.dialogs.delete(dialog)});
    this.dialogs.add(dialog);dialog.open();return true;
  }
  /** A receipt is useful only while its exact applied field and owning session remain current. */
  canUndo(scope: HTMLElement): boolean {
    const receipt = this.receipts.get(scope);if (!receipt || this.disposed || !receipt.current()) return false;
    const selected = this.app.metadataCache.getFileCache(receipt.file);
    const field = selected && assignmentField(selected.frontmatter ?? {}, receipt.field);
    return !!field && samePropertyField(field.snapshot, receipt.after);
  }
  /** Explicit undo reuses the same preview/writer and rechecks applied value inside FileManager. */
  undo(scope: HTMLElement): boolean {
    if (!this.canUndo(scope)) return false;
    const receipt = this.receipts.get(scope);if (!receipt) return false;
    const dialog = new CanvasPropertyAssignmentModal(this.app, {sourceScope: scope, translate: this.translate, undo: true,
      note: receipt.file.basename, field: receipt.field, category: receipt.category, before: receipt.after, after: receipt.before,
      commit: async current => {
        const result = await this.commit(receipt.file, receipt.field, receipt.after, receipt.before, () => current() && receipt.current());
        if (this.receipts.get(scope) === receipt) this.receipts.delete(scope);return result;
      }, closed: () => this.dialogs.delete(dialog)});
    this.dialogs.add(dialog);dialog.open();return true;
  }
  /** Read saved text only for this explicit mutation to guard native buffers, then delegate to
   * the established metadata observer. No optimistic classification or semantic rebuild occurs. */
  private async commit(file: TFile, field: string, before: PropertyFieldValue, after: PropertyFieldValue, current: () => boolean): Promise<{refreshPending: boolean}> {
    if (!current() || 4 * file.stat.size > SOURCE_DECODE_BUDGET_BYTES) throw new Error(this.translate("assignment.unavailable"));
    const path = file.path, revision = {mtime: file.stat.mtime, size: file.stat.size}, body = await this.app.vault.cachedRead(file);
    const guarded = (): boolean => current() && file.path === path && this.app.vault.getFileByPath(path) === file
      && file.stat.mtime === revision.mtime && file.stat.size === revision.size && writableAssignmentField(field, this.protectedFields())
      && markdownBuffersMatchSaved(this.app, file, body);
    if (!guarded()) throw new Error(this.translate("assignment.saveEditor"));
    try {
      await this.write(file, field, frontmatter => applyPropertyField(frontmatter, field, before, after), guarded);
      return {refreshPending: false};
    } catch (error) {
      if (error instanceof SavedRelationshipPendingError) return {refreshPending: true};
      throw error;
    }
  }
  /** Plugin unload retires unsubmitted dialogs and all bounded receipts; native writes retain
   * the existing plugin-owned cancellation/convergence lifetime rather than a new scheduler. */
  dispose(): void {
    if (this.disposed) return;this.disposed = true;for (const dialog of this.dialogs) dialog.retire();this.dialogs.clear();this.receipts = new WeakMap();
  }
}
