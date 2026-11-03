/** Classic chooses grouping partitions; shared projection/unfolding mechanics retain canonical member facts. */
import {projectRelationGroups} from "../groupRelations";
import type {Neighborhood, Neighbour} from "../../../types";
import type {Translator} from "../../../lang";
/** Shared-left mode intentionally buckets friends/previous and challengers/next together. */
export function groupNeighborhood(neighborhood: Neighborhood, singleSided: boolean, unfolded: ReadonlySet<string>, translate: Translator, pinned?: string): Neighborhood {
  const project = (items: Neighbour[], area: string) => projectRelationGroups(items, neighborhood.center.path, area, unfolded, translate).flatMap(row => row.page.transient?.kind === "group" && row.page.transient.groupMembers?.some(member => (member.page.transient?.actualPath ?? member.page.path) === pinned) ? row.page.transient.groupMembers : [row]);
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
