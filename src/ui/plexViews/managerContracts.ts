/** Narrow native manager effects. The registered UI receives only its own configuration and
 * existing color/modal lifetime capabilities, never a plugin, graph or alternate writer. */
import type {PlexViewConfiguration, ViewConfigurationAddress, ViewConfigurationEdit, ViewConfigurationExpected} from "../../core/plex/views/configuration";
import type {StyleColorContext} from "../StyleColorControls";
import type {StyleCommitResult} from "../StyleEditorModal";
import type {PredicateSuggestions} from "../predicates/PredicateRuleEditor";
import type {PortableSharingContext} from "../sharing/contracts";

export type CanvasViewManagerContext = Readonly<{
  colors: StyleColorContext;
  configuration: () => PlexViewConfiguration;
  read: (address: ViewConfigurationAddress) => ViewConfigurationExpected;
  capture: (address: ViewConfigurationAddress) => () => boolean;
  subscribe: (changed: () => void) => () => void;
  /** Optional bounded suggestions from the existing cached UI catalogue; no acquisition. */
  suggestions?: () => PredicateSuggestions;
  /** Optional host-owned atomic package operation; ordinary view managers retain existing defaults. */
  sharing?: PortableSharingContext;
  save: (address: ViewConfigurationAddress, edit: ViewConfigurationEdit, expected: ViewConfigurationExpected,
    current: () => boolean) => Promise<StyleCommitResult>;
  closed: () => void;
}>;
