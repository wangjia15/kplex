/** Classic's ordered, capped local projection. Reads are already classified/admitted by the semantic owner. */
import {RelationType, type Role} from "../../../graph/relations";

/** Payloads stay opaque to policy; the host retains canonical objects and lazy presentation. */
export type ClassicRelation<P> = {page: P; role: Role; relationType: RelationType};
export type ClassicNeighborhood<P, R extends ClassicRelation<P>> = {
  center: P; parents: R[]; children: R[]; leftFriends: R[]; rightFriends: R[]; siblings: R[];
};
export type ClassicProjectionRead<P, R extends ClassicRelation<P>> = Readonly<{
  identity: (page: P) => string;
  neighbours: (page: P, role: Role) => R[];
  sort: (rows: R[]) => R[];
}>;

/** Bound a sorted parent candidate pool before Classic removes occupied direct zones.
 * Four direct zones can occupy at most `4 * maximum` nodes plus the center; retaining that
 * prefix and another `maximum` candidates preserves every possible displayed sibling without
 * requiring a complete parent graph. The final per-zone display cap remains unchanged. */
export function classicSiblingCandidateLimit(maximum: number): number {
  return 5 * Math.max(1, Math.floor(maximum)) + 1;
}

/** Preserve direct area order/caps before sibling assembly; stronger witnesses win without reclassification. */
export function projectClassicNeighborhood<P, R extends ClassicRelation<P>>(center: P,
  read: ClassicProjectionRead<P, R>, maximum: number, renderSiblings: boolean): ClassicNeighborhood<P, R> {
  const parents = read.neighbours(center, "parent").slice(0, maximum);
  const children = read.neighbours(center, "child").slice(0, maximum);
  const leftFriends = [...read.neighbours(center, "left"), ...read.neighbours(center, "previous")].slice(0, maximum);
  const rightFriends = [...read.neighbours(center, "right"), ...read.neighbours(center, "next")].slice(0, maximum);
  const occupied = new Set([read.identity(center), ...[...parents, ...children, ...leftFriends, ...rightFriends].map(row => read.identity(row.page))]);
  const parentIds = new Set(parents.map(row => read.identity(row.page)));
  const siblings = new Map<string, R>();
  if (renderSiblings) for (const parent of parents) for (const sibling of read.neighbours(parent.page, "child")) {
    const id = read.identity(sibling.page);
    if (occupied.has(id) || !parentIds.has(read.identity(parent.page))) continue;
    const previous = siblings.get(id);
    siblings.set(id, {...sibling, role: "sibling", relationType:
      previous?.relationType === RelationType.DEFINED || sibling.relationType === RelationType.DEFINED ? RelationType.DEFINED : RelationType.INFERRED});
  }
  return {center, parents, children, leftFriends, rightFriends, siblings: read.sort([...siblings.values()]).slice(0, maximum)};
}
