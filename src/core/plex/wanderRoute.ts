/**
 * Bounded, semantic-free Wander route policy over caller-provided displayed identities. The
 * projection owns eligibility; this policy owns weighted recency and branch retracing only.
 * Decisions are immutable and committed only after the host accepts the captured destination.
 */
export type WanderRoute = Readonly<{
  trail: readonly Readonly<{ identity: string; tried: readonly string[] }>[];
  recent: readonly string[];
  moves: number;
}>;
export type WanderDecision = Readonly<{ identity: string; route: WanderRoute }>;
const TRAIL_LIMIT = 64;
const RECENT_LIMIT = 40;
const MOVE_LIMIT = 256;

/** Begin a fresh finite exploration epoch at the actual center, retaining bounded recency on Play. */
export function beginWanderRoute(center: string, recent: readonly string[] = []): WanderRoute {
  return { trail: [{ identity: center, tried: [] }], recent: [...recent, center].slice(-RECENT_LIMIT), moves: 0 };
}

/** Weight recent repeats smoothly; the immediate predecessor receives the strongest penalty. */
export function wanderWeight(identity: string, recent: readonly string[]): number {
  let penalty = 0;
  for (let index = 0; index < recent.length; index++) {
    if (recent[index] === identity) penalty += Math.pow(0.82, recent.length - 1 - index);
  }
  return 1 / (1 + 12 * penalty);
}

/**
 * Prefer an untried forward branch using weighted randomness, otherwise unwind one trail frame.
 * Ancestors remain available for backtracking; recent identities outside the trail can recur.
 * Exhaustion, a lost predecessor or the bounded exploration budget pauses rather than teleports.
 */
export function chooseWanderDestination(route: WanderRoute, center: string, candidates: readonly string[], random: () => number): WanderDecision | null {
  const current = route.trail[route.trail.length - 1];
  if (!current || current.identity !== center || route.moves >= MOVE_LIMIT) return null;
  const eligible = [...new Set(candidates)].filter(/** The current center cannot be its own move. */ identity => identity !== center);
  const ancestors = new Set(route.trail.map(/** Retain opaque identities without deriving paths or roles. */ frame => frame.identity));
  const forward = eligible.filter(/** Exhausted branches and ancestors are revisited only by explicit retracing. */ identity => !current.tried.includes(identity) && !ancestors.has(identity));
  let identity: string;
  let trail: WanderRoute["trail"];
  if (forward.length && route.trail.length < TRAIL_LIMIT) {
    const weights = forward.map(/** Recent visits are penalized, never permanently blacklisted. */ candidate => wanderWeight(candidate, route.recent));
    const sample = random();
    let choice = (Number.isFinite(sample) ? Math.max(0, Math.min(0.999999999, sample)) : 0) * weights.reduce(/** Sum the finite displayed weights. */ (sum, weight) => sum + weight, 0);
    let index = 0;
    while (index < weights.length - 1 && choice >= weights[index]) choice -= weights[index++];
    identity = forward[index];
    trail = [...route.trail.slice(0, -1), { ...current, tried: [...current.tried, identity] }, { identity, tried: [] }];
  } else {
    const parent = route.trail[route.trail.length - 2];
    if (!parent || !eligible.includes(parent.identity)) return null;
    identity = parent.identity;
    trail = route.trail.slice(0, -1);
  }
  return { identity, route: { trail, recent: [...route.recent, identity].slice(-RECENT_LIMIT), moves: route.moves + 1 } };
}
