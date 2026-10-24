/** Map bounded host neighborhoods to display-only groups. Synthetic pages never enter the index. */
import { groupRelations, type RelationGroupKind } from "../core/plex/relationGroups";
import type { Translator } from "../lang";
import { RelationType, type GraphPage, type Neighborhood, type Neighbour } from "../types";

/** Classify presentation facets explicitly, without interpreting an opaque path. */
function groupKind(page: GraphPage): RelationGroupKind {
  if (page.isFolder) return "folders";
  if (page.isTag) return "tags";
  if (page.url) return "links";
  if (!page.file) return "placeholders";
  return page.file.extension === "md" ? "notes" : "attachments";
}

/** Group one physical area, retaining original relations for in-place unfolding and filter evaluation. */
export function projectRelationGroups(items: Neighbour[], sourcePath: string, area: string, unfolded: ReadonlySet<string>, translate: Translator): Neighbour[] {
  // Heading containers retain their outline identity; only their ordinary relationship targets group.
  const headings = items.filter(item => item.page.transient?.kind === "section");
  items = items.filter(item => item.page.transient?.kind !== "section");
  const result: Neighbour[] = [];
  for (const group of groupRelations(items.map(value => ({ value, kind: groupKind(value.page), noteType: value.page.noteType })))) {
    const key = JSON.stringify([sourcePath, area, group.key]);
    if (group.members.length < 2 || unfolded.has(key)) { result.push(...group.members); continue; }
    const representative = group.members[0];
    const label = group.noteType ?? translate(`groups.${group.kind}`);
    const page: GraphPage = {
      ...representative.page,
      path: `\u0000kplex-group:${key}`,
      name: label, aliases: [], tags: [], styleTags: [], primaryStyleTag: null,
      noteType: group.noteType, neighbours: new Map(),
      transient: { kind: "group", sourcePath, sectionId: key, groupMembers: group.members },
    };
    result.push({ ...representative, page, relationType: RelationType.DEFINED, typeDefinition: undefined, linkDirection: null });
  }
  return [...result, ...headings];
}

/** Shared-left mode intentionally buckets friends/previous and challengers/next together. */
export function groupNeighborhood(neighborhood: Neighborhood, singleSided: boolean, unfolded: ReadonlySet<string>, translate: Translator): Neighborhood {
  const project = (items: Neighbour[], area: string) => projectRelationGroups(items, neighborhood.center.path, area, unfolded, translate);
  const lateral = singleSided ? project([...neighborhood.leftFriends, ...neighborhood.rightFriends], "left") : null;
  const rightRows = new Set(neighborhood.rightFriends);
  return {
    ...neighborhood,
    parents: project(neighborhood.parents, "parent"), children: project(neighborhood.children, "child"),
    leftFriends: lateral ? lateral.filter(row => !rightRows.has(row)) : project(neighborhood.leftFriends, "left"),
    rightFriends: lateral ? lateral.filter(row => rightRows.has(row)) : project(neighborhood.rightFriends, "right"),
    siblings: project(neighborhood.siblings, "sibling"),
  };
}
