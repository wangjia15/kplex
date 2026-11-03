/** Finite static internal registration; definitions carry policy, never per-window mutable instances. */
import {CANVAS_VIEW_API_VERSION, type PlexViewDefinition} from "./contracts";
import {validateViewConfigurationSchema} from "./configuration";
import {boundedViewState} from "./state";
import {validHierarchyDepth} from "./hierarchy";

export class PlexViewRegistry {
  private readonly definitions = new Map<string, PlexViewDefinition>();
  readonly available: readonly PlexViewDefinition[];
  /** Reject ambiguous IDs/versions and unsafe optional budgets before a native surface is constructed. */
  constructor(definitions: readonly PlexViewDefinition[], readonly fallbackId = "classic") {
    for (const definition of definitions) {
      if (!/^[a-z][a-z0-9.-]{0,79}$/.test(definition.id) || definition.version !== CANVAS_VIEW_API_VERSION || this.definitions.has(definition.id)) {
        throw new Error("Invalid or duplicate internal Plex view definition");
      }
      if (typeof definition.labelKey !== "string" || !definition.labelKey || definition.labelKey.length > 128
        || typeof definition.icon !== "string" || !/^[a-z][a-z0-9-]{0,79}$/.test(definition.icon)
        || !definition.capabilities || typeof definition.capabilities !== "object" || Array.isArray(definition.capabilities)
        || [definition.capabilities.sections, definition.capabilities.descendants, definition.capabilities.editor,
          definition.capabilities.compact, definition.capabilities.properties, definition.capabilities.badges].some(/** Omitted optional capabilities are unavailable. */ value => value !== undefined && typeof value !== "boolean")
        || typeof definition.restoreState !== "function" || typeof definition.project !== "function" || typeof definition.layout !== "function"
        || definition.reduceState !== undefined && typeof definition.reduceState !== "function"
        || definition.colorReferences !== undefined && typeof definition.colorReferences !== "function"
        || definition.propertyAssignments !== undefined && typeof definition.propertyAssignments !== "function"
        || definition.propertyDependencies !== undefined && typeof definition.propertyDependencies !== "function"
        || definition.decorationLabels !== undefined && typeof definition.decorationLabels !== "function"
        || definition.defaultState !== null && boundedViewState(definition.defaultState) === null) throw new Error("Invalid canvas view policy contract");
      if (definition.configuration) validateViewConfigurationSchema(definition.configuration);
      if (definition.badgeBudget !== undefined && (definition.capabilities.badges !== true || !Number.isInteger(definition.badgeBudget)
        || definition.badgeBudget < 1 || definition.badgeBudget > 2048)) throw new Error("Invalid view badge budget");
      if (definition.areaPreferenceBudget !== undefined && (!Number.isInteger(definition.areaPreferenceBudget)
        || definition.areaPreferenceBudget < 1 || definition.areaPreferenceBudget > 192)) throw new Error("Invalid area preference budget");
      if (definition.editorHosting !== undefined && (!["occurrence", "attention-and-occurrence"].includes(definition.editorHosting) || !definition.capabilities.editor)) {
        throw new Error("Unsupported internal editor hosting policy");
      }
      if (definition.navigation !== undefined && definition.navigation !== "rooted") throw new Error("Unsupported internal navigation policy");
      if (definition.sectionSource !== undefined && (definition.capabilities.sections !== true
        || !["attention", "layout-root"].includes(definition.sectionSource)
        || definition.sectionSource === "layout-root" && definition.navigation !== "rooted")) throw new Error("Unsupported section source policy");
      if (definition.navigationEntry !== undefined && (definition.navigationEntry !== "attention" || definition.navigation !== "rooted")) throw new Error("Unsupported rooted entry policy");
      if (definition.hierarchy && (definition.navigation !== "rooted" || !Number.isInteger(definition.hierarchy.maximumScopes)
        || definition.hierarchy.maximumScopes < 1 || definition.hierarchy.maximumScopes > 16
        || definition.hierarchy.maximumDepth !== undefined && !validHierarchyDepth(definition.hierarchy.maximumDepth)
        || typeof definition.hierarchy.reduce !== "function"
        || definition.hierarchy.relations !== undefined && definition.hierarchy.relations !== "child-and-peer"
        || !["activate", "activate-editor", "expand", "center"].includes(definition.hierarchy.primary)
        || definition.hierarchy.controls !== undefined && definition.hierarchy.controls !== "measured"
        || definition.hierarchy.primary === "activate-editor" && definition.editorHosting !== "occurrence")) throw new Error("Unsupported hierarchy policy");
      this.definitions.set(definition.id, definition);
    }
    if (!this.definitions.has(fallbackId)) throw new Error("Missing fallback Plex view definition");
    this.available = [...this.definitions.values()];
  }
  /** Unknown IDs preserve their saved payload in the session while using the built-in fallback. */
  resolve(id: string): PlexViewDefinition { return this.definitions.get(id) ?? this.definitions.get(this.fallbackId)!; }
  /** Registration is closed after construction; a lookup grants no native or mutation authority. */
  has(id: string): boolean { return this.definitions.has(id); }
}
