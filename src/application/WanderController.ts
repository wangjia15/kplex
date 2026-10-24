/**
 * Per-view Wander session and cycle owner. Injected projection/navigation, Zen and clock ports
 * keep host objects, timers and graph semantics outside this layer. One cancellable callback and
 * generation fence own anticipation, scene readiness, arrival and dwell; teardown restores entry Zen.
 */
import { beginWanderRoute, chooseWanderDestination, type WanderRoute } from "../core/plex/wanderRoute";
import type { NodeRef } from "../core/plex/actions";

export type WanderDestination = Readonly<{ node: NodeRef; occurrenceId: string }>;
export type WanderScene = Readonly<{ center: string | null; ready: boolean; candidates: readonly WanderDestination[] }>;
export type WanderState = Readonly<{ phase: "stopped" | "playing" | "paused" | "transitioning"; seconds: number; reason: "exhausted" | "unavailable" | null }>;
export interface WanderPorts {
  /** Read only the current displayed, locally available projection. */
  readScene(): WanderScene;
  /** Select/reveal an exact occurrence without taking focus from native editors. */
  highlight(destination: WanderDestination): boolean;
  /** Release only Wander's temporary selection and motion ownership. */
  clear(): void;
  /** Revalidate and synchronously accept a normal navigation with explicit Wander intent. */
  navigate(destination: WanderDestination): boolean;
  /** Read the current per-view Zen mode before entering the session. */
  readZen(): boolean;
  /** Set exact view-local Zen without touching fullscreen. */
  setZen(enabled: boolean): void;
  /** Read monotonic milliseconds for whole-cycle pacing. */
  now(): number;
  /** Schedule one callback and return its exact cancellation capability. */
  schedule(callback: () => void, milliseconds: number): () => void;
  /** Return a local/injectable random sample in the unit interval. */
  random(): number;
}

/** Coordinate a single session; Play retries exhaustion from the latest manually chosen center. */
export class WanderController {
  private state: WanderState = { phase: "stopped", seconds: 7, reason: null };
  private listeners = new Set<() => void>();
  private cancelTimer: (() => void) | null = null;
  private generation = 0;
  private entryZen = false;
  private route: WanderRoute | null = null;
  private disposed = false;

  /** Bind narrow live capabilities; no setting snapshots or mutable graph repositories are retained. */
  constructor(private readonly ports: WanderPorts) {}
  /** Return a stable immutable React snapshot until the session actually changes. */
  getSnapshot = (): WanderState => this.state;
  /** Release exactly the subscribing surface on unmount. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return /** Retire this exact subscription. */ () => { this.listeners.delete(listener); };
  };
  /** Publish state after synchronous ownership changes. */
  private publish(phase: WanderState["phase"], reason: WanderState["reason"] = null): void {
    this.state = { ...this.state, phase, reason };
    for (const listener of this.listeners) listener();
  }
  /** Invalidate callbacks even if cancellation races an already queued timer delivery. */
  private cancel(): void {
    this.generation++;
    this.cancelTimer?.(); this.cancelTimer = null;
  }
  /** Maintain a single scheduled callback and fence every delivery against Stop/Pause/restart. */
  private later(callback: () => void, milliseconds: number): void {
    this.cancelTimer?.();
    const generation = this.generation;
    this.cancelTimer = this.ports.schedule(/** Retired callbacks cannot clear or replace a newer generation's timer. */ () => {
      if (generation !== this.generation || this.disposed) return;
      this.cancelTimer = null; callback();
    }, Math.max(0, milliseconds));
  }
  /** Snapshot entry Zen once, or resume the existing session without another timer owner. */
  start(): void {
    if (this.disposed) return;
    if (this.state.phase === "stopped") {
      this.entryZen = this.ports.readZen(); this.ports.setZen(true); this.route = null; this.publish("paused");
    } else if (this.state.phase !== "paused") return;
    this.play();
  }
  /** Resume from the actual center; retry a completed route while retaining decay-weighted recency. */
  play(): void {
    if (this.disposed) return;
    if (this.state.phase === "stopped") { this.start(); return; }
    if (this.state.phase !== "paused" && this.cancelTimer) return;
    const center = this.ports.readScene().center;
    if (!center) { this.pause("unavailable"); return; }
    if (!this.route || this.route.trail[this.route.trail.length - 1]?.identity !== center || this.state.reason) {
      this.route = beginWanderRoute(center, this.route?.recent);
    }
    this.cancel(); this.publish("playing");
    const deadline = this.ports.now() + 30_000;
    this.later(/** Wait for the Zen resize and current local scene before choosing. */ () => this.choose(deadline), 100);
  }
  /** Auto-pause and explicit Pause share cleanup; the center, route and entry Zen remain intact. */
  pause(reason: WanderState["reason"] = null): void {
    if (this.state.phase === "stopped" || this.disposed) return;
    if (this.state.phase === "paused" && this.state.reason === reason) return;
    this.cancel(); this.ports.clear(); this.publish("paused", reason);
  }
  /** Stop immediately and restore exactly the entry Zen state, independently of fullscreen. */
  stop(): void {
    if (this.state.phase === "stopped") return;
    this.cancel(); this.ports.clear(); this.route = null;
    this.ports.setZen(this.entryZen); this.publish("stopped");
  }
  /** A changed slider affects the next complete cycle, leaving an in-flight schedule undisturbed. */
  setSeconds(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    this.state = { ...this.state, seconds: Math.max(3, Math.min(15, Math.round(seconds))) };
    for (const listener of this.listeners) listener();
  }
  /** Wait only for the current scene; no global acquisition or eager indexing is requested. */
  private choose(deadline: number, rejected: readonly string[] = []): void {
    if (this.ports.now() >= deadline) { this.pause("unavailable"); return; }
    const scene = this.ports.readScene();
    if (!scene.ready || !scene.center) {
      if (this.ports.now() >= deadline) { this.pause("unavailable"); return; }
      this.later(/** Retry local readiness within this bounded cycle. */ () => this.choose(deadline, rejected), 100); return;
    }
    if (!this.route || this.route.trail[this.route.trail.length - 1]?.identity !== scene.center) {
      this.route = beginWanderRoute(scene.center, this.route?.recent);
    }
    const decision = chooseWanderDestination(this.route, scene.center, scene.candidates.filter(/** A stale incarnation is skipped for this cycle, not repeatedly selected. */ target => !rejected.includes(target.node.identity)).map(/** Projection eligibility remains caller-owned. */ target => target.node.identity), /** Retain the injected RNG's receiver. */ () => this.ports.random());
    const destination = decision && scene.candidates.find(/** Capture the chosen exact occurrence and native incarnation. */ target => target.node.identity === decision.identity);
    if (!decision || !destination) { this.pause(rejected.length ? "unavailable" : "exhausted"); return; }
    if (!this.ports.highlight(destination)) {
      this.later(/** A removed occurrence can be reselected from the next projection. */ () => this.choose(deadline, [...rejected, destination.node.identity]), 100); return;
    }
    const started = this.ports.now(), cycle = this.state.seconds * 1000;
    this.later(/** Revalidate after anticipation; commit the route only after synchronous acceptance. */ () => {
      const current = this.ports.readScene();
      if (current.center !== scene.center || !current.ready || !this.ports.navigate(destination)) {
        this.ports.clear(); this.later(/** Rechoose stale candidates without hydrating unrelated nodes. */ () => this.choose(deadline, [...rejected, destination.node.identity]), 100); return;
      }
      this.route = decision.route; this.publish("transitioning");
      this.later(/** Scene readiness and animation completion gate the reading interval. */ () => this.arrive(destination.node.identity, started + cycle, this.ports.now() + 30_000), 100);
    }, Math.max(550, Math.min(1200, cycle * 0.18)));
  }
  /** Wait for actual arrival; a slow index/animation extends the cycle instead of overlapping moves. */
  private arrive(identity: string, nextAt: number, deadline: number): void {
    const scene = this.ports.readScene();
    if (scene.center === identity && scene.ready) {
      this.ports.clear(); this.publish("playing");
      this.later(/** Dwell uses the captured whole-cycle pace and a minimum readable settled interval. */ () => this.choose(this.ports.now() + 30_000), Math.max(600, nextAt - this.ports.now()));
      return;
    }
    if (this.ports.now() >= deadline) { this.pause("unavailable"); return; }
    this.later(/** Keep only one readiness observer while the normal scene prepares. */ () => this.arrive(identity, nextAt, deadline), 100);
  }
  /** View close, plugin unload and window migration make callbacks permanently inert. */
  dispose(): void {
    if (this.disposed) return;
    this.stop(); this.disposed = true; this.cancel(); this.listeners.clear();
  }
}
