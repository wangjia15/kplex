/** Per-canvas occurrence intent. Native buffers, file validation and save/close remain host-owned. */
import type {NodeId} from "../core/graph/model";

export type PlexEditorDocument = Readonly<{nodeId: NodeId; path: string; fileIdentity: string}>;
export type PlexEditorDimensions = Readonly<{width: number; height: number}>;
export type PlexEditorIntent = Readonly<{viewId: string; occurrenceId: string; target: PlexEditorDocument;
  dimensions: PlexEditorDimensions; mode: "preview" | "source"}>;
export type PlexEditorBinding = PlexEditorIntent & Readonly<{id: string; closing: boolean}>;
/** Workspace intent excludes native incarnation tokens and editor buffers. The host must reacquire identity. */
export type SavedPlexEditorIntent = Omit<PlexEditorIntent, "target"> & Readonly<{target: Readonly<{nodeId: NodeId; path: string}>}>;
export type PlexEditorAdmission = Readonly<{status: "opened" | "existing"; binding: PlexEditorBinding}
  | {status: "unavailable"; reason: "closed" | "invalid-binding" | "capacity" | "closing"}>;

/** The initial native runtime supports exactly one live editor; collection shape is not multi-editor support. */
export class PlexEditorBindings {
  readonly capacity = 1;
  private current: readonly PlexEditorBinding[] = Object.freeze([]);
  private sequence = 0;
  private closed = false;
  private closeToken: object | null = null;
  /** Notify the owning native session after each actual intent/lifetime change; never own native effects here. */
  constructor(private readonly changed: () => void) {}
  /** Stable immutable snapshot, including while native close/save is pending. */
  get bindings(): readonly PlexEditorBinding[] { return this.current; }
  /** Call only after the host admits this exact displayed occurrence and canonical native file. */
  open(intent: PlexEditorIntent): PlexEditorAdmission {
    if (this.closed) return {status: "unavailable", reason: "closed"};
    /** Bound plain identifiers before retaining any caller-provided intent. */
    const text = (value: unknown, maximum = 4096): value is string => typeof value === "string" && value.length > 0 && value.length <= maximum;
    if (!intent || !text(intent.viewId, 80) || !/^[a-z][a-z0-9.-]*$/.test(intent.viewId) || !text(intent.occurrenceId)
      || !intent.target || !text(intent.target.nodeId) || !text(intent.target.path) || !text(intent.target.fileIdentity, 256)
      || !validDimensions(intent.dimensions) || !["preview", "source"].includes(intent.mode)) return {status: "unavailable", reason: "invalid-binding"};
    const previous = this.current[0];
    if (previous) {
      if (previous.closing) return {status: "unavailable", reason: "closing"};
      if (previous.viewId === intent.viewId && previous.occurrenceId === intent.occurrenceId
        && previous.target.nodeId === intent.target.nodeId && previous.target.path === intent.target.path
        && previous.target.fileIdentity === intent.target.fileIdentity) return {status: "existing", binding: previous};
      return {status: "unavailable", reason: "capacity"};
    }
    const binding: PlexEditorBinding = Object.freeze({viewId: intent.viewId, occurrenceId: intent.occurrenceId, mode: intent.mode,
      id: `occurrence-editor-${++this.sequence}`, closing: false,
      target: Object.freeze({nodeId: intent.target.nodeId, path: intent.target.path, fileIdentity: intent.target.fileIdentity}),
      dimensions: Object.freeze({width: intent.dimensions.width, height: intent.dimensions.height})});
    this.current = Object.freeze([binding]); this.changed(); return {status: "opened", binding};
  }
  /** Geometry cannot reopen/rebind a native editor or change its incarnation. */
  resize(id: string, dimensions: PlexEditorDimensions): boolean {
    const binding = this.current.find(item => item.id === id);
    if (this.closed || !binding || binding.closing || !validDimensions(dimensions)) return false;
    if (binding.dimensions.width === dimensions.width && binding.dimensions.height === dimensions.height) return true;
    this.current = Object.freeze([Object.freeze({...binding, dimensions: Object.freeze({width: dimensions.width, height: dimensions.height})})]); this.changed(); return true;
  }
  /** Native mode changes belong to the bound document, independently of attention/default settings. */
  setMode(id: string, mode: "preview" | "source"): boolean {
    const binding = this.current.find(item => item.id === id);
    if (this.closed || !binding || binding.closing || !["preview", "source"].includes(mode)) return false;
    if (binding.mode === mode) return true;
    this.current = Object.freeze([Object.freeze({...binding, mode})]); this.changed(); return true;
  }
  /** Capture document lifetime independently of ordinary geometry, attention and selection changes. */
  capture(id: string): () => boolean {
    const admitted = this.current.some(binding => binding.id === id);
    return () => admitted && !this.closed && this.current.some(binding => binding.id === id);
  }
  /** Keep the host mounted until its native save succeeds. A rejected save cancels this transaction. */
  beginClose(id: string): Readonly<{commit: () => boolean; cancel: () => void}> | null {
    const binding = this.current.find(item => item.id === id);
    if (this.closed || !binding || binding.closing) return null;
    const token = {}; this.closeToken = token;
    this.current = Object.freeze([Object.freeze({...binding, closing: true})]); this.changed();
    /** A retired or superseded close cannot remove an editor admitted later. */
    const live = (): boolean => !this.closed && this.closeToken === token && this.current[0]?.id === id;
    return {
      commit: () => {if (!live()) return false; this.closeToken = null; this.current = Object.freeze([]); this.changed(); return true;},
      cancel: () => {if (!live()) return; this.closeToken = null; this.current = Object.freeze([Object.freeze({...this.current[0], closing: false})]); this.changed();},
    };
  }
  /** Permanent native session retirement; existing native lifecycle owns final buffer persistence. */
  dispose(): void { if (this.closed) return; this.closed = true; this.closeToken = null; this.current = Object.freeze([]); this.changed(); }
}

/** Finite geometry intent is bounded independently of the stricter user-action resize range. */
function validDimensions(value: PlexEditorDimensions): boolean {
  return Boolean(value && [value.width, value.height].every(size => typeof size === "number" && Number.isFinite(size) && size > 0 && size <= 100_000));
}
