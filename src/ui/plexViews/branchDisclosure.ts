/** Shared disclosure footprint. The visible chevron stays small; touch hit-testing occupies a
 * measured corner outside the thought and gates. No input, source or view-session owner lives here. */
import type {PlexBranch} from "../../core/plex/views/contracts";

/** Uniform hierarchy rows reserve one body-external44px target plus4px gap, even when a leaf
 * or reference has no button. Fold availability/status text must not change sibling spacing. */
export function branchDisclosureReserve(branch: PlexBranch | undefined, touch: boolean): Readonly<{right: number; bottom: number}> | undefined {
  return touch && branch ? {right: 48, bottom: 48} : undefined;
}
