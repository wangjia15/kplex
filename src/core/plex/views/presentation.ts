/** Bounded text/action validation shared by view output admission and host UI contributions.
 * Text carries explicit literal/catalog intent, never HTML, native callbacks or semantic roles. */
import type {CanvasViewText, PlexViewStateAction} from "./contracts";
import {boundedViewState} from "./state";

/** Empty literal text deliberately suppresses a caption; unknown catalog keys remain host copy. */
export function validCanvasViewText(value: unknown): value is CanvasViewText {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const literal: unknown = Reflect.get(value, "literal"), key: unknown = Reflect.get(value, "key");
  return typeof literal === "string" && literal.length <= 512 && key === undefined
    || typeof key === "string" && key.length > 0 && key.length <= 128 && literal === undefined;
}

/** State commands are finite JSON requests, not executable callbacks from persisted data. */
export function validPlexViewStateAction(value: unknown): value is PlexViewStateAction {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const id: unknown = Reflect.get(value, "id"), args: unknown = Reflect.get(value, "args");
  return typeof id === "string" && /^[a-z][a-z0-9.-]{0,79}$/.test(id)
    && (args === undefined || args === null || boundedViewState(args) !== null);
}
