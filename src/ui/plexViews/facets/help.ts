/** Effective Facets help is inert source, separate from AI authoring context. Built-in help
 * stays lazy/localized; explicit user source, including blank, always wins without rewriting it. */
import type {FacetPreset} from "../../../core/plex/views/facets/contracts";
import type {CanvasViewText} from "../../../core/plex/views/contracts";
import type {Translator} from "../../../lang";
import {validMarkdownHelp} from "../../../core/contracts/markdownHelp";

/** Retired built-ins may still be saved user entries. Preserve their lazy localized Help without
 * reinstating their definitions, manager entries or reset-template actions. */
const HELP_KEYS = {arc: "facets.help.arc", para: "facets.help.para", wuxing: "facets.help.wuxing", gtd: "facets.help.gtd",
  eaccess: "facets.help.eaccess", sensemaking: "facets.help.sensemaking", publishing: "facets.help.publishing", "map-roles": "facets.help.map-roles"} as const;

/** A renamed/edited built-in keeps its contextual default until the author explicitly edits Help. */
export function facetHelpText(id: string, preset: FacetPreset): CanvasViewText {
  return preset.helpMarkdown !== undefined ? {literal: preset.helpMarkdown}
    : Object.prototype.hasOwnProperty.call(HELP_KEYS, id) ? {key: `facets.help.${id}`} : {literal: ""};
}

/** Export/preview uses the same resolved source as Info. No default is persisted by reading it. */
export function effectiveFacetHelp(id: string, preset: FacetPreset, translate: Translator): string {
  const source = facetHelpText(id, preset);
  // The finite built-in key table is code-owned; avoid treating a user literal as a catalog key.
  const known = Object.keys(HELP_KEYS).find(/** Translate only a declared legacy/current help identity. */ key => key === id) as keyof typeof HELP_KEYS | undefined;
  const value = "literal" in source ? source.literal : known ? translate(HELP_KEYS[known]) : "";
  if (!validMarkdownHelp(value)) throw new Error("Invalid preset Markdown help");return value;
}
