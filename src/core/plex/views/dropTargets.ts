/** Finite area target interpretation. Compatibility dropRole retains its established semantic
 * meaning; scrollability, resize handles and decorative marks never imply any edit authority. */
import type {PlexArea, PlexDropMeaning} from "./contracts";
import {configurationRecord} from "./configurationValues";

/** Runtime extension output is checked before it reaches shared native action owners. */
export function validPlexDropMeaning(value: unknown): value is PlexDropMeaning {
  if (!configurationRecord(value)) return false;
  return value.kind === "none" || value.kind === "navigation"
    || value.kind === "property" && typeof value.assignmentId === "string" && value.assignmentId.length > 0 && value.assignmentId.length <= 128
    || value.kind === "relationship" && ["parent", "child", "left", "right"].includes(String(value.role))
      && (value.origin === undefined || typeof value.origin === "string" && value.origin.length > 0 && value.origin.length <= 4096);
}
/** New explicit metadata takes precedence, including a deliberate unsupported target. */
export function plexAreaDropMeaning(area: Pick<PlexArea, "dropRole" | "dropOrigin" | "dropTarget">): PlexDropMeaning {
  return area.dropTarget ?? (area.dropRole ? {kind: "relationship", role: area.dropRole, origin: area.dropOrigin} : {kind: "none"});
}
