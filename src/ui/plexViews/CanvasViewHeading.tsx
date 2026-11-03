/** Optional presentation heading. It never replaces semantic roles, node labels or gate copy. */
import type {CanvasViewText} from "../../core/plex/views/contracts";
import type {Translator} from "../../lang";
import {canvasViewText} from "./labels";

/** Undefined inherits the host's existing canvas presentation; null/empty deliberately render none. */
export function CanvasViewHeading({heading, translate}: Readonly<{heading?: CanvasViewText | null; translate: Translator}>) {
  const label = heading ? canvasViewText(heading, translate) : "";
  return label ? <div className="kplex-view-heading" role="heading" aria-level={2}>{label}</div> : null;
}
