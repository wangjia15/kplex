import { LinkDirection, RelationType, type Relation, type Role } from "../types";

export type EvidenceRole = Exclude<Role, "sibling"> | "hidden";

export type EvidenceSourceKind =
  | "obsidian-link"
  | "unresolved-link"
  | "frontmatter-ontology"
  | "inline-ontology"
  | "body-url"
  | "date-property"
  | "file-tree"
  | "tag-tree"
  | "url-origin";

export type EvidenceProvenance = {
  sourceKind: EvidenceSourceKind;
  definition?: string;
  fieldName?: string;
  rawValue?: string;
  line?: number;
  /** Character offsets in the declaring Markdown file when the evidence came from a body field. */
  start?: number;
  end?: number;
};

export type RelationEvidence = EvidenceProvenance & {
  id: string;
  sourcePath: string;
  targetPath: string;
  role: EvidenceRole;
  relationType: RelationType;
  direction: LinkDirection;
  /** The note/node that originally declared the relationship before the inverse view was generated. */
  declaredByPath: string;
  /** The original declaration target before the inverse view was generated. */
  declaredTargetPath: string;
  declaredRole: EvidenceRole;
};

export type EvidenceDecision = {
  evidence: RelationEvidence;
  active: boolean;
  suppressionReason?: string;
};

const inverseDirection = (direction: LinkDirection): LinkDirection => {
  if (direction === LinkDirection.FROM) return LinkDirection.TO;
  if (direction === LinkDirection.TO) return LinkDirection.FROM;
  return direction;
};

const inverseRole = (role: EvidenceRole): EvidenceRole | null => {
  switch (role) {
    case "parent": return "child";
    case "child": return "parent";
    case "left": return "left";
    case "right": return "right";
    case "previous": return "next";
    case "next": return "previous";
    case "hidden": return null;
  }
};

const pairKey = (a: string, b: string): string => a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
const splitPairKey = (key: string): [string, string] => {
  const splitAt = key.indexOf("\u0000");
  return [key.slice(0, splitAt), key.slice(splitAt + 1)];
};

/**
 * Stores immutable graph evidence separately from the resolved relationship model.
 * This deliberately preserves evidence that loses a precedence decision so K-Plex can explain
 * the visible result and can later edit the original source instead of relying on hidden state.
 */
export class RelationEvidenceStore {
  private nextId = 1;
  /**
   * Store each original declaration exactly once, keyed by the unordered node pair.
   *
   * Earlier K-Plex builds materialized a second RelationEvidence object and a second relation-map
   * bucket for every inverse view. Large vaults therefore paid almost 2x evidence-object memory
   * before relationship resolution even began — a poor tradeoff on iOS where WebKit may reload
   * the process under memory pressure. Perspective-specific inverse records are now derived only
   * when a caller asks for `between()`/`entries()`.
   */
  private readonly byPair = new Map<string, RelationEvidence[]>();
  /** Pair keys touched by each declaring/target path. Keeps incremental note edits O(local evidence). */
  private readonly pairsByPath = new Map<string, Set<string>>();
  private declarationTotal = 0;

  get declarationCount(): number { return this.declarationTotal; }
  get pairCount(): number { return this.byPair.size; }

  addPair(
    sourcePath: string,
    targetPath: string,
    role: Exclude<EvidenceRole, "hidden">,
    relationType: RelationType,
    direction: LinkDirection,
    provenance: EvidenceProvenance,
  ): void {
    if (sourcePath === targetPath) return;
    const declarationId = `ev-${this.nextId++}`;
    this.addDeclarationRecord({
      id: `${declarationId}:forward`,
      sourcePath,
      targetPath,
      role,
      relationType,
      direction,
      declaredByPath: sourcePath,
      declaredTargetPath: targetPath,
      declaredRole: role,
      ...provenance,
    });
  }

  addHidden(sourcePath: string, targetPath: string, provenance: EvidenceProvenance): void {
    if (sourcePath === targetPath) return;
    const declarationId = `ev-${this.nextId++}`;
    this.addDeclarationRecord({
      id: `${declarationId}:forward`,
      sourcePath,
      targetPath,
      role: "hidden",
      relationType: RelationType.DEFINED,
      direction: LinkDirection.FROM,
      declaredByPath: sourcePath,
      declaredTargetPath: targetPath,
      declaredRole: "hidden",
      ...provenance,
    });
  }

  /**
   * Rehydrate one original declaration from a persisted compact snapshot. Perspective-specific
   * inverse evidence remains virtual and is regenerated on demand.
   */
  addDeclaration(
    sourcePath: string,
    targetPath: string,
    role: EvidenceRole,
    relationType: RelationType,
    direction: LinkDirection,
    provenance: EvidenceProvenance,
  ): void {
    if (role === "hidden") {
      this.addHidden(sourcePath, targetPath, provenance);
      return;
    }
    this.addPair(sourcePath, targetPath, role, relationType, direction, provenance);
  }

  between(sourcePath: string, targetPath: string): RelationEvidence[] {
    if (sourcePath === targetPath) return [];
    const declarations = this.byPair.get(pairKey(sourcePath, targetPath));
    if (!declarations?.length) return [];
    const output: RelationEvidence[] = [];
    for (const item of declarations) {
      if (item.declaredByPath === sourcePath && item.declaredTargetPath === targetPath) {
        output.push(item);
        continue;
      }
      if (item.declaredByPath !== targetPath || item.declaredTargetPath !== sourcePath) continue;
      const role = inverseRole(item.declaredRole);
      if (!role) continue; // Hidden evidence is intentionally directional.
      output.push({
        ...item,
        id: item.id.replace(/:forward$/, ":reverse"),
        sourcePath,
        targetPath,
        role,
        direction: inverseDirection(item.direction),
      });
    }
    return output;
  }

  from(sourcePath: string): Array<{ targetPath: string; evidence: RelationEvidence[] }> {
    const output: Array<{ targetPath: string; evidence: RelationEvidence[] }> = [];
    const keys = this.pairsByPath.get(sourcePath);
    if (!keys?.size) return output;
    // Keep deterministic pair insertion order while visiting only evidence local to this node.
    // The previous global byPair scan made every neighborhood/explanation query O(vault evidence).
    for (const key of keys) {
      const [left, right] = splitPairKey(key);
      const targetPath = left === sourcePath ? right : left;
      const evidence = this.between(sourcePath, targetPath);
      if (evidence.length) output.push({ targetPath, evidence });
    }
    return output;
  }

  /** Original declarations whose unordered pair touches one path. */
  declarationsTouching(path: string): RelationEvidence[] {
    const keys = this.pairsByPath.get(path);
    if (!keys?.size) return [];
    const output: RelationEvidence[] = [];
    for (const key of keys) {
      const list = this.byPair.get(key);
      if (list) output.push(...list);
    }
    return output;
  }

  /** Remove complete original declarations matching a predicate. */
  removeDeclarations(predicate: (evidence: RelationEvidence) => boolean): number {
    let removed = 0;
    for (const [key, list] of [...this.byPair.entries()]) {
      const next = list.filter((item) => {
        if (!predicate(item)) return true;
        removed += 1;
        this.declarationTotal = Math.max(0, this.declarationTotal - 1);
        return false;
      });
      if (next.length) this.byPair.set(key, next);
      else {
        this.byPair.delete(key);
        this.unindexPairKey(key);
      }
    }
    return removed;
  }

  /** Fast path used by per-file incremental indexing. */
  removeDeclarationsTouching(path: string, predicate: (evidence: RelationEvidence) => boolean): number {
    const keys = [...(this.pairsByPath.get(path) ?? [])];
    let removed = 0;
    for (const key of keys) {
      const list = this.byPair.get(key);
      if (!list) continue;
      const next = list.filter((item) => {
        if (!predicate(item)) return true;
        removed += 1;
        this.declarationTotal = Math.max(0, this.declarationTotal - 1);
        return false;
      });
      if (next.length) this.byPair.set(key, next);
      else {
        this.byPair.delete(key);
        this.unindexPairKey(key);
      }
    }
    return removed;
  }

  /**
   * Iterate the two possible source perspectives for every unordered pair. The arrays yielded here
   * are short-lived resolver views; only original declarations are retained by the store.
   */
  *entries(): IterableIterator<[string, string, RelationEvidence[]]> {
    for (const [key] of this.byPair) {
      const [left, right] = splitPairKey(key);
      const leftEvidence = this.between(left, right);
      if (leftEvidence.length) yield [left, right, leftEvidence];
      const rightEvidence = this.between(right, left);
      if (rightEvidence.length) yield [right, left, rightEvidence];
    }
  }

  /** Original declarations only. */
  *declarations(): IterableIterator<RelationEvidence> {
    for (const list of this.byPair.values()) for (const item of list) yield item;
  }

  private addDeclarationRecord(evidence: RelationEvidence): void {
    const key = pairKey(evidence.declaredByPath, evidence.declaredTargetPath);
    const list = this.byPair.get(key) ?? [];
    const isNewPair = list.length === 0;
    list.push(evidence);
    this.byPair.set(key, list);
    this.declarationTotal += 1;
    if (isNewPair) {
      this.indexPairKey(evidence.declaredByPath, key);
      this.indexPairKey(evidence.declaredTargetPath, key);
    }
  }

  private indexPairKey(path: string, key: string): void {
    const keys = this.pairsByPath.get(path) ?? new Set<string>();
    keys.add(key);
    this.pairsByPath.set(path, keys);
  }

  private unindexPairKey(key: string): void {
    const [left, right] = splitPairKey(key);
    for (const path of [left, right]) {
      const keys = this.pairsByPath.get(path);
      if (!keys) continue;
      keys.delete(key);
      if (!keys.size) this.pairsByPath.delete(path);
    }
  }
}

/**
 * K-Plex's deliberate compatibility deviation: frontmatter ontology wins when body ontology on
 * the same declaring note conflicts for the same target. Importantly, body evidence is retained
 * and merely marked suppressed; it is never discarded from the evidence store.
 */
export function applyOntologyPrecedence(evidence: RelationEvidence[]): EvidenceDecision[] {
  // K-Plex intentionally differs from classic ExcaliBrain here: explicit YAML/frontmatter is the
  // authoritative ontology tier for a note pair. Keep all body evidence for explainability, but
  // suppress a conflicting inline ontology whenever either declaring note supplies a frontmatter
  // role for this same relationship. `item.role` is already normalized to the current source
  // perspective, so this also works when the YAML declaration lives in the opposite note.
  const frontmatterRoles = new Set<EvidenceRole>();
  for (const item of evidence) {
    if (item.sourceKind === "frontmatter-ontology" && item.relationType === RelationType.DEFINED) frontmatterRoles.add(item.role);
  }

  return evidence.map((item) => {
    if (item.sourceKind !== "inline-ontology" || item.relationType !== RelationType.DEFINED || !frontmatterRoles.size || frontmatterRoles.has(item.role)) {
      return { evidence: item, active: true };
    }
    return {
      evidence: item,
      active: false,
      suppressionReason: "Conflicting body ontology is overridden by frontmatter ontology for this note pair.",
    };
  });
}

const concatDefinition = (newDef?: string, current?: string): string | undefined => {
  if (!newDef) return current;
  if (!current) return newDef;
  const values = new Set(current.split(",").map((x) => x.trim()).filter(Boolean));
  values.add(newDef);
  return [...values].join(", ");
};

const directionToSet = (current: LinkDirection | null, incoming: LinkDirection): LinkDirection => {
  if (!current) return incoming;
  if (current === LinkDirection.BOTH || current === incoming) return current;
  return LinkDirection.BOTH;
};

const relationTypeToSet = (current: RelationType | undefined, incoming: RelationType): RelationType => {
  if (current === RelationType.DEFINED || incoming === RelationType.DEFINED) return RelationType.DEFINED;
  return incoming;
};

export const emptyRelation = (): Omit<Relation, "target"> => ({
  direction: null,
  isHidden: false,
  isParent: false,
  isChild: false,
  isLeftFriend: false,
  isRightFriend: false,
  isNextFriend: false,
  isPreviousFriend: false,
});

export function applyEvidenceToRelation(relation: Relation, decision: EvidenceDecision): void {
  if (!decision.active) return;
  const item = decision.evidence;
  if (item.role === "hidden") {
    relation.isHidden = true;
    return;
  }
  relation.direction = directionToSet(relation.direction, item.direction);
  const definition = item.definition ?? item.fieldName;
  switch (item.role) {
    case "parent":
      relation.isParent = true;
      relation.parentType = relationTypeToSet(relation.parentType, item.relationType);
      relation.parentTypeDefinition = concatDefinition(definition, relation.parentTypeDefinition);
      break;
    case "child":
      relation.isChild = true;
      relation.childType = relationTypeToSet(relation.childType, item.relationType);
      relation.childTypeDefinition = concatDefinition(definition, relation.childTypeDefinition);
      break;
    case "left":
      relation.isLeftFriend = true;
      relation.leftFriendType = relationTypeToSet(relation.leftFriendType, item.relationType);
      relation.leftFriendTypeDefinition = concatDefinition(definition, relation.leftFriendTypeDefinition);
      break;
    case "right":
      relation.isRightFriend = true;
      relation.rightFriendType = relationTypeToSet(relation.rightFriendType, item.relationType);
      relation.rightFriendTypeDefinition = concatDefinition(definition, relation.rightFriendTypeDefinition);
      break;
    case "previous":
      relation.isPreviousFriend = true;
      relation.previousFriendType = relationTypeToSet(relation.previousFriendType, item.relationType);
      relation.previousFriendTypeDefinition = concatDefinition(definition, relation.previousFriendTypeDefinition);
      break;
    case "next":
      relation.isNextFriend = true;
      relation.nextFriendType = relationTypeToSet(relation.nextFriendType, item.relationType);
      relation.nextFriendTypeDefinition = concatDefinition(definition, relation.nextFriendTypeDefinition);
      break;
  }
}
