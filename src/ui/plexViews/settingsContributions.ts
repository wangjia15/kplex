/** Static native Settings and live canvas-rail composition share validated per-view configuration fields and the host queued writer. Pure view definitions never import Obsidian or receive host objects; this registry owns no session or acquisition lifecycle. */
import type {App, SettingDefinition, SettingDefinitionItem, SettingDefinitionPage} from "obsidian";
import type {CanvasViewManagerContext} from "./managerContracts";
import type {StyleEditorModal} from "../StyleEditorModal";
import type {DeclarativeSettingKey} from "../../settings";
import type {Translator} from "../../lang";
import type {PlexViewRegistry} from "../../core/plex/views/registry";
import type {PlexViewDefinition} from "../../core/plex/views/contracts";
import {readViewConfiguration, viewConfigurationKey} from "../../core/plex/views/configuration";
import {configurationRecord} from "../../core/plex/views/configurationValues";
import {boundedViewColors} from "../../core/plex/views/decorations";
import {builtInPlexViews} from "./builtins";
import {classicSettingsContribution} from "./classic/settings";
import {mindMapSettingsContribution} from "./mindmap/settings";
import {viewLabel} from "./labels";
import {wuXingSettingsContribution} from "./wuxing/settings";
import type {CanvasViewContributionContext, CanvasViewMenuItem, CanvasViewChoice, CanvasViewLayoutControl, CanvasViewHelp} from "./contributionContracts";
import {validateCanvasViewLayoutControl, contributionArray} from "./contributionValidation";
import {validViewConfigurationAddress} from "../../core/plex/views/configurationPaths";

export type CanvasViewSettingsContext = Readonly<{
  translate: Translator;
  areaTint: () => SettingDefinition<DeclarativeSettingKey>;
  key: (field: string, path?: readonly (string | number)[]) => `canvasView:${string}:${string}`;
  manage?: () => void;
}>;
export type CanvasViewSettingsContribution = Readonly<{
  id: string;
  manager?: (app: App, context: CanvasViewManagerContext, target?: string) => StyleEditorModal;
  items: (context: CanvasViewSettingsContext) => SettingDefinitionItem<DeclarativeSettingKey>[];
  /** Optional live canvas rails address the same registered type fields as native Settings. */
  layoutControls?: readonly CanvasViewLayoutControl[] | ((context: CanvasViewContributionContext) => readonly CanvasViewLayoutControl[]);
  menus?: (context: CanvasViewContributionContext) => readonly CanvasViewMenuItem[];
  choices?: (context: CanvasViewContributionContext) => readonly CanvasViewChoice[];
  /** Read-only, bounded help for an exact captured target; no renderer or native owner crosses. */
  help?: (context: CanvasViewContributionContext, target: string) => CanvasViewHelp | null;
}>;

/** Declarative keys contain only registered type/field identities, never saved payloads or runtime state. */
export function canvasViewControl(key: string): {id: string; field: string; path?: readonly (string | number)[]} | null {
  if (key.length > 768) return null;
  const match = /^canvasView:([a-z][a-z0-9.-]{0,79}):([a-z][a-zA-Z0-9-]{0,63})(?::(.+))?$/.exec(key);
  if (!match || !viewConfigurationKey(match[2])) return null;
  if (!match[3]) return {id: match[1], field: match[2]};
  const path = match[3].split("/").map(part => /^~(0|[1-9][0-9]*)$/.test(part) ? Number(part.slice(1)) : part);
  return validViewConfigurationAddress({field: match[2], path}) ? {id: match[1], field: match[2], path} : null;
}

export class CanvasViewSettingsRegistry {
  private readonly contributions = new Map<string, CanvasViewSettingsContribution>();
  /** Close registration before creating a Settings/native-session lifetime. Tests construct independent registries. */
  constructor(readonly views: PlexViewRegistry, contributions: readonly CanvasViewSettingsContribution[]) {
    for (const contribution of contributions) {
      if (!views.has(contribution.id) || this.contributions.has(contribution.id)) throw new Error("Invalid view settings contribution");
      if (typeof contribution.layoutControls !== "function") for (const control of contribution.layoutControls ?? [])
        validateCanvasViewLayoutControl(control, views.resolve(contribution.id).configuration?.fields ?? {});
      this.contributions.set(contribution.id, contribution);
    }
  }
  /** Never resolve an unknown settings write to the fallback definition. */
  definition(id: string): PlexViewDefinition | undefined { return this.views.has(id) ? this.views.resolve(id) : undefined; }
  /** Static control metadata supplies no source/selection capability and never resolves a foreign definition to Compass. */
  layoutControls(definition: PlexViewDefinition, context?: CanvasViewContributionContext): readonly CanvasViewLayoutControl[] {
    if (this.definition(definition.id) !== definition) return [];
    const contribution = this.contributions.get(definition.id)?.layoutControls;
    const controls = typeof contribution === "function" ? context ? contribution(context) : [] : contribution ?? [];
    if (!contributionArray(controls) || controls.length > 16) throw new Error("View layout controls exceed their bound");
    for (const control of controls) validateCanvasViewLayoutControl(control, definition.configuration?.fields ?? {});
    return controls;
  }
  /** Exact registered UI metadata only; an unknown ID never receives fallback contributions. */
  contribution(definition: PlexViewDefinition): CanvasViewSettingsContribution | undefined {
    return this.definition(definition.id) === definition ? this.contributions.get(definition.id) : undefined;
  }
  /** Palette deletion cannot silently strand references in another configuration owner.
   * Unknown/future namespaces stay inert and conservatively exclude destructive deletion. */
  paletteUsage(stored: unknown): Readonly<{available: boolean; uses: ReadonlyMap<string, number>}> {
    const uses = new Map<string, number>();
    if (!configurationRecord(stored) || Object.keys(stored).some(id => !this.views.has(id))) return {available: false, uses};
    try {
      for (const definition of this.views.available) {
        const configuration = readViewConfiguration(definition, stored);
        if (configuration.status !== "available") return {available: false, uses};
        for (const color of boundedViewColors(definition.colorReferences?.(configuration) ?? []))
          if (typeof color !== "string" && color.kind === "palette") uses.set(color.id, (uses.get(color.id) ?? 0) + 1);
      }
      return {available: true, uses};
    } catch {return {available: false, uses};}
  }
  /** New references must exist when the existing serialized writer accepts the operation.
   * Unchanged damaged identities remain repairable through other independent settings edits. */
  validatePaletteReferences(definition: PlexViewDefinition, before: unknown, after: unknown, palette: readonly {id: string}[]): void {
    if (!definition.colorReferences) return;
    const previous = boundedViewColors(definition.colorReferences(readViewConfiguration(definition, before)));
    const next = boundedViewColors(definition.colorReferences(readViewConfiguration(definition, after)));
    const old = new Set(previous.flatMap(color => typeof color !== "string" && color.kind === "palette" ? [color.id] : []));
    for (const color of next) if (typeof color !== "string" && color.kind === "palette" && !old.has(color.id) && !palette.some(pair => pair.id === color.id))
      throw new Error("Named view color no longer exists");
  }
  /** Native page/search rendering consumes the same finite contributions; no per-view branches in the tab. */
  pages(context: Omit<CanvasViewSettingsContext, "key" | "manage"> & {openManager?: (id: string) => void}): SettingDefinitionPage<DeclarativeSettingKey>[] {
    return this.views.available.flatMap(definition => {
      const contribution = this.contributions.get(definition.id);
      if (!contribution) return [];
      const key = (field: string, path?: readonly (string | number)[]): `canvasView:${string}:${string}` => {
        if (!viewConfigurationKey(field) || !definition.configuration || !Object.prototype.hasOwnProperty.call(definition.configuration.fields, field))
          throw new Error("Unknown view configuration field");
        if (!validViewConfigurationAddress({field, path})) throw new Error("Invalid view control address");
        return `canvasView:${definition.id}:${field}${path?.length ? `:${path.map(part => typeof part === "number" ? `~${part}` : part).join("/")}` : ""}`;
      };
      return [{type: "page", name: viewLabel(definition.labelKey, context.translate),
        ...(definition.configuration ? {desc: context.translate("view.settingsScope")} : {}), items: contribution.items({...context, key,
          ...(contribution.manager && context.openManager ? {manage: () => context.openManager?.(definition.id)} : {})})}];
    });
  }
}

export const builtInCanvasViewSettings = new CanvasViewSettingsRegistry(builtInPlexViews, [classicSettingsContribution, mindMapSettingsContribution, wuXingSettingsContribution]);
