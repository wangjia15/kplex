/** Latest-value delivery for native slider callbacks. This UI primitive owns no timer, settings
 * or persistence queue: one accepted callback finishes, then only the newest pending input runs.
 * Callback owners report persistence failures; completion always restores their committed value. */
type SliderChange = Readonly<{value: number; apply: (value: number) => void | Promise<void>}>;

export class LatestSliderValue {
  private busy = false;
  private closed = false;
  private pending: SliderChange | null = null;
  /** The mounted slider owns its immediate draft; null returns to caller-owned committed props. */
  constructor(private readonly draft: (value: number | null) => void, private readonly failed: (error: unknown) => void) {}

  /** Replace only work that has not started. Independent sliders keep independent latest values. */
  submit(value: number, apply: SliderChange["apply"]): void {
    if (this.closed) return;
    this.draft(value);
    const change = {value, apply};
    if (this.busy) this.pending = change;
    else this.run(change);
  }

  /** Synchronous controls retain synchronous delivery; async callbacks never overlap in this rail. */
  private run(change: SliderChange): void {
    this.busy = true;
    let result: void | Promise<void>;
    try {result = change.apply(change.value);}
    catch (error) {this.failed(error); this.complete(); return;}
    if (result && typeof result.then === "function") {
      // The caller reports save/conflict failures. Either outcome releases this rail, without
      // retrying the failed value or leaving its thumb stuck on an uncommitted draft.
      void result.then(() => this.complete(), error => {this.failed(error); this.complete();});
    } else this.complete();
  }

  /** An older completion cannot replace a newer draft or replay intermediate pointer positions. */
  private complete(): void {
    this.busy = false;
    const next = this.pending;
    this.pending = null;
    if (next) this.run(next);
    else if (!this.closed) this.draft(null);
  }

  /** Detach UI updates, retaining the last explicit intent when a rail closes. Callback owners
   * must reject retired canvas/view targets before submitting persistence; no new input is accepted. */
  dispose(): void {this.closed = true;}

  /** An explicit reset supersedes unsent gesture values; an already accepted save still settles. */
  cancelPending(): void {this.pending = null;if (!this.closed) this.draft(null);}
}
