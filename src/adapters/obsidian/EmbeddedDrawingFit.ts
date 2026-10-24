/**
 * Native embedded-drawing resize-fit lifetime. The caller supplies the exact current view, its
 * actual canvas geometry/camera and the existing companion fit action. Two owning-window frames
 * let native layout settle; direct input and camera changes retire automatic fitting until reset.
 * This coordinator never opens files, changes drawing mode, reads settings or calculates scene fit.
 */
import { sameFitCamera, type FitCamera } from "../../ui/components/viewportFit";

export type DrawingFitSnapshot = Readonly<{
  owner: object;
  width: number;
  height: number;
  camera: FitCamera;
  eligible: boolean;
}>;

/** Coalesce resize work and preserve manual drawing intent for one opening/representation session. */
export class EmbeddedDrawingFit {
  private frame: number | null = null;
  private generation = 0;
  private interrupted = false;
  private disposed = false;
  private baseline: DrawingFitSnapshot | null = null;
  private recordingFit = false;

  /** Capture only owner-scoped scheduling and narrow live read/fit capabilities. */
  constructor(private readonly ownerWindow: Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame">,
    private readonly read: () => DrawingFitSnapshot | null, private readonly fit: () => void) {}

  /** A new drawing or explicit representation opening renews fitting without retaining prior views. */
  reset(): void {
    this.cancel(); this.baseline = null; this.interrupted = false; this.recordingFit = false;
  }

  /** Direct pointer/wheel/keyboard input retires fitting, even if the camera later returns to its old value. */
  interrupt(): void {
    this.cancel(); this.interrupted = true; this.recordingFit = false;
  }

  /** Retire pending callbacks before a replacement, interaction or owning-window teardown. */
  private cancel(): void {
    this.generation += 1;
    if (this.frame !== null) this.ownerWindow.cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  /** Refit changed native canvas dimensions only while its camera and input remain untouched. */
  resize(): void {
    if (this.disposed || this.interrupted) return;
    this.cancel();
    const generation = this.generation;
    this.frame = this.ownerWindow.requestAnimationFrame(/** Wait through native view layout before measuring its actual API viewport. */ () => {
      if (this.disposed || this.interrupted || generation !== this.generation) return;
      this.frame = this.ownerWindow.requestAnimationFrame(/** Fence every deferred fit against newer input/opening/resize generations. */ () => {
        this.frame = null;
        if (this.disposed || this.interrupted || generation !== this.generation) return;
        const next = this.read();
        if (!next || !next.eligible || next.width <= 0 || next.height <= 0) return;
        const prior = this.baseline;
        // Another ResizeObserver callback may supersede our post-fit recording frame. That camera
        // change belongs to our fit, not user input; input still retires the generation immediately.
        if (!this.recordingFit && prior?.owner === next.owner && !sameFitCamera(prior.camera, next.camera)) {
          this.interrupt(); return;
        }
        this.recordingFit = false;
        this.baseline = next;
        if (!prior || prior.owner !== next.owner || (prior.width === next.width && prior.height === next.height)) return;
        this.fit();
        this.recordingFit = true;
        this.frame = this.ownerWindow.requestAnimationFrame(/** Record the completed native fit without reopening ownership after input or navigation. */ () => {
          this.frame = null;
          if (this.disposed || this.interrupted || generation !== this.generation) return;
          const fitted = this.read();
          if (fitted?.eligible && fitted.owner === next.owner) this.baseline = fitted;
          this.recordingFit = false;
        });
      });
    });
  }

  /** Disposal is idempotent and releases the last native view snapshot and scheduled work. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.cancel(); this.baseline = null; this.recordingFit = false;
  }
}
