/** Shared bounded hierarchy visibility and reference reveal. Declared depth never enlarges source demand;
 * omitted capabilities preserve eight-level ancestry without inventing semantic shortcuts. */

/** Admit one finite optional hierarchy depth; registry and ancestry walks use the same bound. */
export function validHierarchyDepth(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 20;
}

/** Retain only genuine displayed ancestor paths, within the declared depth or the legacy default. */
export function hierarchyPathClosure(rows: readonly Readonly<{id: string; parent?: string}>[], matched: Iterable<string>, root?: string,
  maximumDepth = 8): ReadonlySet<string> {
  const nodes = new Map(rows.map(/** Index occurrence identity, never canonical document identity. */ row => [row.id, row]));
  const keep = new Set<string>(root && nodes.has(root) ? [root] : []);
  if (!validHierarchyDepth(maximumDepth)) return keep;
  for (const id of matched) {
    const path: string[] = []; let current: string | undefined = id;
    while (current && path.length <= maximumDepth && nodes.has(current) && !path.includes(current)) {path.push(current);current = nodes.get(current)?.parent;}
    if (current || root && path[path.length - 1] !== root) continue;
    for (const member of path) keep.add(member);
  }
  return keep;
}

/** Find only the nearest genuine earlier occurrence on this reference's own admitted ancestor
 * chain. Opaque IDs are never decoded; same-note copies on another branch confer no authority. */
export function hierarchyReferenceAncestor(rows: readonly Readonly<{id: string; canonical: string; parent?: string; reference?: boolean}>[], referenceId: string,
  maximumDepth = 8): string | null {
  if (rows.length > 2048 || !validHierarchyDepth(maximumDepth)) return null;
  const nodes = new Map(rows.map(row => [row.id, row]));
  if (nodes.size !== rows.length) return null;
  const reference = nodes.get(referenceId);
  if (!reference?.reference) return null;
  let parent = reference.parent;const visited = new Set([referenceId]);
  for (let depth = 0; parent && depth < maximumDepth && !visited.has(parent); depth++) {
    visited.add(parent);const row = nodes.get(parent);if (!row) return null;
    if (row.canonical === reference.canonical && !row.reference) return row.id;
    parent = row.parent;
  }
  return null;
}
