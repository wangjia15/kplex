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

const relationKey = (sourcePath: string, targetPath: string): string => `${sourcePath}\u0000${targetPath}`;

/**
 * Stores immutable graph evidence separately from the resolved relationship model.
 * This deliberately preserves evidence that loses a precedence decision so K-Plex can explain
 * the visible result and can later edit the original source instead of relying on hidden state.
 */
export class RelationEvidenceStore {
  private nextId = 1;
  private readonly byRelation = new Map<string, RelationEvidence[]>();

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
    const common = {
      relationType,
      declaredByPath: sourcePath,
      declaredTargetPath: targetPath,
      declaredRole: role,
      ...provenance,
    };
    this.add({
      ...common,
      id: `${declarationId}:forward`,
      sourcePath,
      targetPath,
      role,
      direction,
    });
    const reverseRole = inverseRole(role);
    if (reverseRole) {
      this.add({
        ...common,
        id: `${declarationId}:reverse`,
        sourcePath: targetPath,
        targetPath: sourcePath,
        role: reverseRole,
        direction: inverseDirection(direction),
      });
    }
  }

  addHidden(sourcePath: string, targetPath: string, provenance: EvidenceProvenance): void {
    if (sourcePath === targetPath) return;
    const declarationId = `ev-${this.nextId++}`;
    this.add({
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

  between(sourcePath: string, targetPath: string): RelationEvidence[] {
    return [...(this.byRelation.get(relationKey(sourcePath, targetPath)) ?? [])];
  }

  *entries(): IterableIterator<[string, string, RelationEvidence[]]> {
    for (const [key, evidence] of this.byRelation) {
      const splitAt = key.indexOf("\u0000");
      yield [key.slice(0, splitAt), key.slice(splitAt + 1), evidence];
    }
  }

  private add(evidence: RelationEvidence): void {
    const key = relationKey(evidence.sourcePath, evidence.targetPath);
    const list = this.byRelation.get(key) ?? [];
    list.push(evidence);
    this.byRelation.set(key, list);
  }
}

const declarationKey = (evidence: RelationEvidence): string =>
  `${evidence.declaredByPath}\u0000${evidence.declaredTargetPath}`;

/**
 * K-Plex's deliberate compatibility deviation: frontmatter ontology wins when body ontology on
 * the same declaring note conflicts for the same target. Importantly, body evidence is retained
 * and merely marked suppressed; it is never discarded from the evidence store.
 */
export function applyOntologyPrecedence(evidence: RelationEvidence[]): EvidenceDecision[] {
  const frontmatterRoles = new Map<string, Set<EvidenceRole>>();
  for (const item of evidence) {
    if (item.sourceKind !== "frontmatter-ontology" || item.relationType !== RelationType.DEFINED) continue;
    const key = declarationKey(item);
    const roles = frontmatterRoles.get(key) ?? new Set<EvidenceRole>();
    roles.add(item.declaredRole);
    frontmatterRoles.set(key, roles);
  }

  return evidence.map((item) => {
    if (item.sourceKind !== "inline-ontology" || item.relationType !== RelationType.DEFINED) {
      return { evidence: item, active: true };
    }
    const roles = frontmatterRoles.get(declarationKey(item));
    if (!roles?.size || roles.has(item.declaredRole)) return { evidence: item, active: true };
    return {
      evidence: item,
      active: false,
      suppressionReason: "Conflicting body ontology is overridden by frontmatter ontology for the same note and target.",
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
