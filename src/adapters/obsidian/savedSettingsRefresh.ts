/**
 * Owns optional post-save completion, never settings persistence. One refresh flight and a
 * coalesced newer obligation bound retained work when a host refresh does not settle. A short
 * UI wait reports saved/pending; normal waiting is not failure and never requests a reload.
 * The plugin supplies existing refresh owners plus one optional failure-episode callback for
 * submissions without their own saved/pending UI feedback. Dialogs keep that feedback role;
 * the plugin retires this adapter on unload. Persistence is never cancelled or replayed here.
 */
import {yieldToHostTask} from "./yieldToHostTask";

/** Durable callers need only know whether optional consumers still require recovery. */
type RefreshResult = Readonly<{refreshPending: boolean}>;

/** Single-flight completion lease shared by actual appearance and compatibility saves. */
export class SavedSettingsRefresh {
  private flight: Promise<RefreshResult> | null = null;
  private revision = 0;
  private semanticPending = false;
  private semanticRevision = 0;
  private closed = false;
  private failureReported = false;
  private failureFeedbackPending = false;

  /** Refresh retains publication fences and never writes settings; failure feedback remains owned by the plugin and may arrive after the short UI wait. */
  constructor(private readonly refresh: (semantic: boolean, current: () => boolean) => Promise<void>,
    private readonly failed?: () => void) {}

  /** Coalesce accepted settings without retaining drafts. Only fire-and-forget callers request host failure feedback; dialogs already own their saved/pending result. */
  request(semantic: boolean, notifyFailure = false): Promise<RefreshResult> {
    if (this.closed) return Promise.resolve({refreshPending: true});
    this.revision += 1;
    this.failureFeedbackPending ||= notifyFailure;
    this.semanticPending ||= semantic;
    if (semantic) this.semanticRevision += 1;
    if (this.flight) return Promise.resolve({refreshPending: true});
    // Install the lease before invoking the callback, including callbacks that throw synchronously.
    const flight = Promise.resolve().then(/** Construction ordering only; retry fairness uses host tasks below. */ () => this.run());
    this.flight = flight;
    return new Promise<RefreshResult>(/** Bound UI waiting after durable/live publication, not the disk writer. */ resolve => {
      const timer = window.setTimeout(/** The existing saved/pending UX makes a submitted editor dismissible. */ () => resolve({refreshPending: true}), 200);
      void flight.then(/** Fast normal refreshes close without a pending warning; late completion cannot re-close UI. */ result => {
        window.clearTimeout(timer);
        resolve(result);
      });
    });
  }

  /** Process only actual newer save intent; retries cannot build an unbounded optional work queue. */
  private async run(): Promise<RefreshResult> {
    try {
      for (let attempt = 0; attempt < 8 && !this.closed; attempt += 1) {
        const revision = this.revision, semantic = this.semanticPending, semanticRevision = this.semanticRevision;
        await this.refresh(semantic, /** Unload fences follow-up effects without pretending to cancel storage. */ () => !this.closed);
        // A later paint/workflow save cannot manufacture another semantic refresh. A genuinely
        // newer ontology obligation still survives the earlier semantic completion.
        if (semantic && semanticRevision === this.semanticRevision) this.semanticPending = false;
        if (revision === this.revision) {this.failureReported = false; return {refreshPending: this.closed};}
        await yieldToHostTask();
      }
    } catch (error) {
      console.error("K-Plex saved settings refresh remains pending", error);
      if (!this.closed && this.failureFeedbackPending && !this.failureReported) {
        this.failureReported = true;
        try {this.failed?.();} catch (feedbackError) {console.error("K-Plex settings refresh feedback failed", feedbackError);}
      }
    }
    finally {this.flight = null; this.failureFeedbackPending = false;}
    return {refreshPending: true};
  }

  /** Retire follow-up work; already submitted native I/O remains owned by its original provider. */
  close(): void {this.closed = true; this.revision += 1;}
}
