/** Presentation-only buckets over an already selected relationship area. No graph reads or mutation. */
export type RelationGroupKind = "notes" | "attachments" | "links" | "placeholders" | "tags" | "folders";
export type RelationGroupCandidate<T> = Readonly<{ value: T; kind: RelationGroupKind; noteType?: string | null }>;
export type RelationGroup<T> = Readonly<{ key: string; kind: RelationGroupKind; noteType: string | null; members: readonly T[] }>;

/** Preserve first-occurrence ordering and singleton identity; only Markdown notes use note types. */
export function groupRelations<T>(candidates: readonly RelationGroupCandidate<T>[]): readonly RelationGroup<T>[] {
  const buckets = new Map<string, { key: string; kind: RelationGroupKind; noteType: string | null; members: T[] }>();
  for (const candidate of candidates) {
    const noteType = candidate.kind === "notes" ? candidate.noteType?.trim().replace(/^#/, "") || null : null;
    const key = JSON.stringify([candidate.kind, noteType?.toLowerCase() ?? null]);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, kind: candidate.kind, noteType, members: [] };
      buckets.set(key, bucket);
    }
    bucket.members.push(candidate.value);
  }
  return [...buckets.values()];
}
