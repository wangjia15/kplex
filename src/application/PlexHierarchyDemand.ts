/** Bounded per-view frontier leases. Existing host acquisition owns parsing/publication and cancellation; this owner only diffs explicit demand. */
import type {NodeId} from "../core/graph/model";

export type PlexHierarchyDemandSnapshot = Readonly<{
  status: "ready" | "limited" | "unavailable" | "invalid" | "closed";
  held: readonly NodeId[]; unavailable: readonly NodeId[];
}>;
type Lease = {active: boolean; release?: () => void};

/** One selected view owns at most eight additional frontier scopes by default; its root/attention/editor retain their existing independent owners. */
export class PlexHierarchyDemand {
  private acquire: ((id: NodeId) => (() => void)) | null;
  private readonly leases = new Map<NodeId, Lease>();
  private readonly failed = new Set<NodeId>();
  private scope: string | null = null;
  private operation = 0;
  private closed = false;
  private limited = false;

  /** The host supplies its existing synchronous lease entry point, never a graph repository or scheduler. */
  constructor(acquire: (id: NodeId) => (() => void), readonly capacity = 8) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 16) throw new Error("Invalid hierarchy scope capacity");
    this.acquire = acquire;
  }

  /** Detach bounded plain status from mutable resource bookkeeping. No coverage or successful publication is implied by owning a lease. */
  snapshot(status?: PlexHierarchyDemandSnapshot["status"]): PlexHierarchyDemandSnapshot {
    return Object.freeze({status: status ?? (this.closed ? "closed" : this.failed.size ? "unavailable" : this.limited ? "limited" : "ready"),
      held: Object.freeze([...this.leases.keys()]), unavailable: Object.freeze([...this.failed])});
  }

  /** Reconcile explicit admitted parents, without reacquiring unchanged scopes. Failed admission is terminal until request/scope retirement. */
  synchronize(viewId: string, root: NodeId, requested: readonly NodeId[]): PlexHierarchyDemandSnapshot {
    if (this.closed) return this.snapshot("closed");
    if (!/^[a-z][a-z0-9.-]{0,79}$/.test(viewId) || !validIdentity(root) || !Array.isArray(requested)
      || requested.slice(0, 512).some(id => !validIdentity(id))) return this.snapshot("invalid");
    const operation = ++this.operation, scope = JSON.stringify([viewId, root]);
    if (this.scope !== scope) {
      this.scope = scope; this.failed.clear();
      for (const [id, lease] of [...this.leases]) {
        this.leases.delete(id); retire(lease);
        if (this.operation !== operation) return this.snapshot();
      }
    }
    const bounded: readonly unknown[] = requested.slice(0, 512);
    const unique = [...new Set(bounded.filter(validIdentity).filter(id => id !== root))];
    this.limited = requested.length > 512 || unique.length > this.capacity;
    const wanted = new Set(unique.slice(0, this.capacity));
    for (const id of this.failed) if (!wanted.has(id)) this.failed.delete(id);
    for (const [id, lease] of [...this.leases]) if (!wanted.has(id)) {
      this.leases.delete(id); retire(lease);
      if (this.operation !== operation) return this.snapshot();
    }
    for (const id of wanted) {
      if (this.operation !== operation || this.closed) break;
      if (this.leases.has(id) || this.failed.has(id)) continue;
      const lease: Lease = {active: true}; this.leases.set(id, lease);
      let release: () => void;
      try {
        release = this.acquire!(id);
        if (typeof release !== "function") throw new Error("Hierarchy acquisition did not return a lease");
      } catch {
        if (this.leases.get(id) === lease) {this.leases.delete(id); this.failed.add(id);}
        lease.active = false; continue;
      }
      lease.release = once(release);
      if (!lease.active || this.closed || this.leases.get(id) !== lease) lease.release();
    }
    return this.snapshot();
  }

  /** A capture cannot gain authority from a later reacquisition of the same canonical node. */
  capture(id: NodeId): () => boolean {
    const lease = this.leases.get(id);
    return () => Boolean(lease?.active && !this.closed && this.leases.get(id) === lease);
  }

  /** Retire every scope once, including a lease whose synchronous acquisition reentered disposal. Release host closures permanently. */
  dispose(): void {
    if (this.closed) return;
    this.closed = true; this.operation++; this.acquire = null; this.scope = null; this.failed.clear();
    const errors: unknown[] = [];
    for (const [id, lease] of [...this.leases]) {
      this.leases.delete(id);
      try {retire(lease);} catch (error) {errors.push(error);}
    }
    if (errors.length) throw new AggregateError(errors, "Failed to release hierarchy demand");
  }
}

/** Opaque identities retain their exact case/spelling; no native path or type is inferred. */
function validIdentity(value: unknown): value is NodeId { return typeof value === "string" && value.length > 0 && value.length <= 4096; }

/** Native/source release callbacks are terminal, even when their caller reenters retirement. */
function once(release: () => void): () => void {
  let released = false;
  return () => {if (!released) {released = true; release();}};
}

/** Mark retirement before calling the existing source owner, so synchronous reentry cannot reuse the old token. */
function retire(lease: Lease): void { lease.active = false; lease.release?.(); }
