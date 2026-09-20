import { App, PluginSettingTab, type SettingDefinitionItem } from "obsidian";
import type ExcaliBrainPlugin from "./main";
import type { Hierarchy, LinkStyle, NodeStyle } from "./types";

export const DEFAULT_LINK_STYLE: LinkStyle = {
  strokeColor: "#696969ff",
  strokeWidth: 1,
  strokeStyle: "solid",
  roughness: 0,
  startArrowHead: "none",
  endArrowHead: "none",
  showLabel: false,
  fontSize: 10,
  fontFamily: 3,
  textColor: "#ffffffff"
};

export const DEFAULT_NODE_STYLE: NodeStyle = {
  prefix: "",
  backgroundColor: "#00000066",
  fillStyle: "solid",
  textColor: "#ffffffff",
  borderColor: "#00000000",
  fontSize: 20,
  fontFamily: 3,
  maxLabelLength: 30,
  roughness: 0,
  strokeShaprness: "round",
  strokeWidth: 1,
  strokeStyle: "solid",
  padding: 10,
  gateRadius: 5,
  gateOffset: 15,
  gateStrokeColor: "#ffffffff",
  gateBackgroundColor: "#ffffffff",
  gateFillStyle: "solid"
};

export const DEFAULT_HIERARCHY_DEFINITION: Hierarchy = {
  exclusions: [
    "excalidraw-font", "excalidraw-font-color", "excalidraw-css", "excalidraw-plugin",
    "excalidraw-link-brackets", "excalidraw-link-prefix", "excalidraw-border-color", "excalidraw-default-mode",
    "excalidraw-export-dark", "excalidraw-export-transparent", "excalidraw-export-svgpadding", "excalidraw-export-pngscale",
    "excalidraw-url-prefix", "excalidraw-linkbutton-opacity", "excalidraw-onload-script", "kanban-plugin"
  ],
  parents: ["Parent", "Parents", "up", "u", "North", "origin", "inception", "source", "parent domain"],
  children: ["Children", "Child", "down", "d", "South", "leads to", "contributes to", "nurtures"],
  leftFriends: ["Friends", "Friend", "Jump", "Jumps", "j", "similar", "supports", "alternatives", "advantages", "pros"],
  rightFriends: ["opposes", "disadvantages", "missing", "cons"],
  previous: ["Previous", "Prev", "West", "w", "Before"],
  next: ["Next", "n", "East", "e", "After"],
  hidden: ["hidden"]
};

export interface ExcaliBrainSettings {
  compactView: boolean;
  compactingFactor: number;
  minLinkLength: number;
  excalibrainFilepath: string;
  indexUpdateInterval: number;
  hierarchy: Hierarchy;
  inferAllLinksAsFriends: boolean;
  inverseInfer: boolean;
  inverseArrowDirection: boolean;
  renderAlias: boolean;
  nodeTitleScript: string;
  backgroundColor: string;
  excludeFilepaths: string[];
  autoOpenCentralDocument: boolean;
  toggleEmbedTogglesAutoOpen: boolean;
  showInferredNodes: boolean;
  showAttachments: boolean;
  showURLNodes: boolean;
  showVirtualNodes: boolean;
  showFolderNodes: boolean;
  showTagNodes: boolean;
  showPageNodes: boolean;
  showNeighborCount: boolean;
  showFullTagName: boolean;
  maxItemCount: number;
  renderSiblings: boolean;
  applyPowerFilter: boolean;
  baseNodeStyle: NodeStyle;
  centralNodeStyle: NodeStyle;
  inferredNodeStyle: NodeStyle;
  urlNodeStyle: NodeStyle;
  virtualNodeStyle: NodeStyle;
  siblingNodeStyle: NodeStyle;
  attachmentNodeStyle: NodeStyle;
  folderNodeStyle: NodeStyle;
  tagNodeStyle: NodeStyle;
  tagNodeStyles: Record<string, NodeStyle>;
  tagStyleList: string[];
  primaryTagField: string;
  primaryTagFieldLowerCase: string;
  displayAllStylePrefixes: boolean;
  baseLinkStyle: LinkStyle;
  inferredLinkStyle: LinkStyle;
  folderLinkStyle: LinkStyle;
  tagLinkStyle: LinkStyle;
  hierarchyLinkStyles: Record<string, LinkStyle>;
  navigationHistory: string[];
  allowOntologySuggester: boolean;
  ontologySuggesterParentTrigger: string;
  ontologySuggesterChildTrigger: string;
  ontologySuggesterLeftFriendTrigger: string;
  ontologySuggesterRightFriendTrigger: string;
  ontologySuggesterPreviousTrigger: string;
  ontologySuggesterNextTrigger: string;
  ontologySuggesterTrigger: string;
  ontologySuggesterMidSentenceTrigger: string;
  boldFields: boolean;
  allowAutozoom: boolean;
  maxZoom: number;
  allowAutofocuOnSearch: boolean;
  defaultAlwaysOnTop: boolean;
  embedCentralNode: boolean;
  centerEmbedWidth: number;
  centerEmbedHeight: number;
  // New React UI preferences. Old data.json files simply omit these.
  showContentPane: boolean;
  followActiveFile: boolean;
  contentPaneWidth: number;
  graphDepth: 1 | 2;
  connectorStyle: "bezier" | "straight";
}

export const DEFAULT_SETTINGS: ExcaliBrainSettings = {
  compactView: false,
  compactingFactor: 1.5,
  minLinkLength: 18,
  excalibrainFilepath: "excalibrain.md",
  indexUpdateInterval: 60000,
  hierarchy: DEFAULT_HIERARCHY_DEFINITION,
  inferAllLinksAsFriends: false,
  inverseInfer: false,
  inverseArrowDirection: true,
  renderAlias: true,
  nodeTitleScript: "",
  backgroundColor: "#0c3e6aff",
  excludeFilepaths: [],
  autoOpenCentralDocument: true,
  toggleEmbedTogglesAutoOpen: true,
  showInferredNodes: true,
  showAttachments: true,
  showURLNodes: true,
  showVirtualNodes: true,
  showFolderNodes: false,
  showTagNodes: false,
  showPageNodes: true,
  showNeighborCount: true,
  showFullTagName: false,
  maxItemCount: 30,
  renderSiblings: false,
  applyPowerFilter: false,
  baseNodeStyle: DEFAULT_NODE_STYLE,
  centralNodeStyle: { fontSize: 30, backgroundColor: "#b5b5b5ff", textColor: "#000000ff" },
  inferredNodeStyle: { backgroundColor: "#000005b3", textColor: "#95c7f3ff" },
  urlNodeStyle: { prefix: "🌐 " },
  virtualNodeStyle: { backgroundColor: "#ff000066", fillStyle: "hachure", textColor: "#ffffffff" },
  siblingNodeStyle: { fontSize: 15 },
  attachmentNodeStyle: { prefix: "📎 " },
  folderNodeStyle: { prefix: "📂 ", strokeShaprness: "sharp", borderColor: "#ffd700ff", textColor: "#ffd700ff" },
  tagNodeStyle: { prefix: "#", strokeShaprness: "sharp", borderColor: "#4682b4ff", textColor: "#4682b4ff" },
  tagNodeStyles: {},
  tagStyleList: [],
  primaryTagField: "Note type",
  primaryTagFieldLowerCase: "note-type",
  displayAllStylePrefixes: true,
  baseLinkStyle: DEFAULT_LINK_STYLE,
  inferredLinkStyle: { strokeStyle: "dashed" },
  folderLinkStyle: { strokeColor: "#ffd700ff" },
  tagLinkStyle: { strokeColor: "#4682b4ff" },
  hierarchyLinkStyles: {},
  navigationHistory: [],
  allowOntologySuggester: true,
  ontologySuggesterParentTrigger: "::p",
  ontologySuggesterChildTrigger: "::c",
  ontologySuggesterLeftFriendTrigger: "::l",
  ontologySuggesterRightFriendTrigger: "::r",
  ontologySuggesterPreviousTrigger: "::e",
  ontologySuggesterNextTrigger: "::n",
  ontologySuggesterTrigger: ":::",
  ontologySuggesterMidSentenceTrigger: "(",
  boldFields: false,
  allowAutozoom: true,
  maxZoom: 1,
  allowAutofocuOnSearch: true,
  defaultAlwaysOnTop: false,
  embedCentralNode: false,
  centerEmbedWidth: 550,
  centerEmbedHeight: 700,
  showContentPane: true,
  followActiveFile: true,
  contentPaneWidth: 38,
  graphDepth: 1,
  connectorStyle: "bezier"
};

const norm = (value: string) => value.toLowerCase().replaceAll(" ", "-").trim();

export function migrateAndMergeSettings(raw: unknown): ExcaliBrainSettings {
  const old = (raw && typeof raw === "object" ? raw : {}) as Partial<ExcaliBrainSettings> & { hierarchy?: Partial<Hierarchy> };
  const hierarchyRaw: Partial<Hierarchy> = old.hierarchy ?? {};
  const hierarchy: Hierarchy = {
    ...DEFAULT_HIERARCHY_DEFINITION,
    ...hierarchyRaw,
    leftFriends: hierarchyRaw.leftFriends ?? hierarchyRaw.friends ?? DEFAULT_HIERARCHY_DEFINITION.leftFriends,
    rightFriends: hierarchyRaw.rightFriends ?? DEFAULT_HIERARCHY_DEFINITION.rightFriends,
    previous: hierarchyRaw.previous ?? DEFAULT_HIERARCHY_DEFINITION.previous,
    next: hierarchyRaw.next ?? DEFAULT_HIERARCHY_DEFINITION.next,
    hidden: hierarchyRaw.hidden ?? DEFAULT_HIERARCHY_DEFINITION.hidden,
    exclusions: hierarchyRaw.exclusions ?? DEFAULT_HIERARCHY_DEFINITION.exclusions
  };

  // Mirror the classic initializeHierarchy() precedence rules. Hidden and parent fields may overlap;
  // lower-priority groups are filtered against all higher-priority normalized field names.
  const sortFields = (items: string[]) => [...items].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const normalized = (items: string[]) => items.map(norm);
  hierarchy.hidden = sortFields(hierarchy.hidden);
  hierarchy.parents = sortFields(hierarchy.parents);
  let master = [...normalized(hierarchy.hidden), ...normalized(hierarchy.parents)];
  const lowerPriority = (items: string[]) => {
    const output = sortFields(items.filter((item) => !master.includes(norm(item))));
    master = [...master, ...normalized(output)];
    return output;
  };
  hierarchy.children = lowerPriority(hierarchy.children);
  hierarchy.leftFriends = lowerPriority(hierarchy.leftFriends);
  hierarchy.rightFriends = lowerPriority(hierarchy.rightFriends);
  hierarchy.previous = lowerPriority(hierarchy.previous);
  hierarchy.next = lowerPriority(hierarchy.next);
  hierarchy.exclusions = sortFields(hierarchy.exclusions.filter((item) => !master.includes(norm(item))));

  return {
    ...DEFAULT_SETTINGS,
    ...old,
    hierarchy,
    baseNodeStyle: { ...DEFAULT_NODE_STYLE, ...(old.baseNodeStyle ?? {}) },
    baseLinkStyle: { ...DEFAULT_LINK_STYLE, ...(old.baseLinkStyle ?? {}) },
    centralNodeStyle: { ...DEFAULT_SETTINGS.centralNodeStyle, ...(old.centralNodeStyle ?? {}) },
    inferredNodeStyle: { ...DEFAULT_SETTINGS.inferredNodeStyle, ...(old.inferredNodeStyle ?? {}) },
    urlNodeStyle: { ...DEFAULT_SETTINGS.urlNodeStyle, ...(old.urlNodeStyle ?? {}) },
    virtualNodeStyle: { ...DEFAULT_SETTINGS.virtualNodeStyle, ...(old.virtualNodeStyle ?? {}) },
    siblingNodeStyle: { ...DEFAULT_SETTINGS.siblingNodeStyle, ...(old.siblingNodeStyle ?? {}) },
    attachmentNodeStyle: { ...DEFAULT_SETTINGS.attachmentNodeStyle, ...(old.attachmentNodeStyle ?? {}) },
    folderNodeStyle: { ...DEFAULT_SETTINGS.folderNodeStyle, ...(old.folderNodeStyle ?? {}) },
    tagNodeStyle: { ...DEFAULT_SETTINGS.tagNodeStyle, ...(old.tagNodeStyle ?? {}) },
    inferredLinkStyle: { ...DEFAULT_SETTINGS.inferredLinkStyle, ...(old.inferredLinkStyle ?? {}) },
    folderLinkStyle: { ...DEFAULT_SETTINGS.folderLinkStyle, ...(old.folderLinkStyle ?? {}) },
    tagLinkStyle: { ...DEFAULT_SETTINGS.tagLinkStyle, ...(old.tagLinkStyle ?? {}) },
    tagNodeStyles: old.tagNodeStyles ?? {},
    tagStyleList: old.tagStyleList ?? [],
    hierarchyLinkStyles: old.hierarchyLinkStyles ?? {},
    navigationHistory: old.navigationHistory ?? [],
    excludeFilepaths: old.excludeFilepaths ?? [],
    primaryTagFieldLowerCase: norm(old.primaryTagField ?? DEFAULT_SETTINGS.primaryTagField),
    connectorStyle: old.connectorStyle === "straight" ? "straight" : "bezier"
  };
}

const csv = (value: string[]) => value.join(", ");
const fromCsv = (value: string) => value.split(",").map((x) => x.trim()).filter(Boolean);

type DeclarativeSettingKey =
  | keyof ExcaliBrainSettings
  | "hierarchy.parents"
  | "hierarchy.children"
  | "hierarchy.leftFriends"
  | "hierarchy.rightFriends"
  | "hierarchy.previous"
  | "hierarchy.next"
  | "hierarchy.hidden"
  | "excludeFilepathsCsv"
  | "backgroundColorHex";

const HIERARCHY_KEY_MAP: Record<string, keyof Hierarchy> = {
  "hierarchy.parents": "parents",
  "hierarchy.children": "children",
  "hierarchy.leftFriends": "leftFriends",
  "hierarchy.rightFriends": "rightFriends",
  "hierarchy.previous": "previous",
  "hierarchy.next": "next",
  "hierarchy.hidden": "hidden"
};

const REINDEX_SETTING_KEYS = new Set<string>([
  "inferAllLinksAsFriends",
  "inverseInfer",
  "showFullTagName",
  "primaryTagField",
  ...Object.keys(HIERARCHY_KEY_MAP)
]);

export class ExcaliBrainSettingTab extends PluginSettingTab {
  constructor(app: App, private ebPlugin: ExcaliBrainPlugin) {
    super(app, ebPlugin);
    this.containerEl.addClass("kplex-settings");
  }

  getSettingDefinitions(): SettingDefinitionItem<DeclarativeSettingKey>[] {
    return [
      {
        name: "K-Plex",
        desc: "Knowledge Plex visual navigation. Legacy ExcaliBrain data.json setting keys remain supported for compatibility.",
        searchable: false
      },
      {
        type: "group",
        heading: "Graph",
        items: [
          {
            name: "Follow document navigation",
            desc: "When enabled, K-Plex follows navigation in the active document leaf. If a leaf is linked in the K-Plex toolbar, only that linked leaf is followed.",
            control: { type: "toggle", key: "followActiveFile" }
          },
          {
            name: "Open selected thought in document leaf",
            desc: "Legacy autoOpenCentralDocument behavior. When enabled, navigating K-Plex opens the central thought in the active or linked document leaf.",
            control: { type: "toggle", key: "autoOpenCentralDocument" }
          },
          {
            name: "Show siblings",
            desc: "Display other children of the visible parents.",
            control: { type: "toggle", key: "renderSiblings" }
          },
          {
            name: "Show inferred links",
            control: { type: "toggle", key: "showInferredNodes" }
          },
          {
            name: "Infer all normal links as friends",
            control: { type: "toggle", key: "inferAllLinksAsFriends" }
          },
          {
            name: "Inverse inferred parent/child direction",
            control: { type: "toggle", key: "inverseInfer" }
          },
          {
            name: "Maximum thoughts per zone",
            control: { type: "slider", key: "maxItemCount", min: 5, max: 100, step: 5 }
          },
          {
            name: "Compact view",
            desc: "Uses the legacy compactView and compactingFactor settings to tighten the Plex layout.",
            control: { type: "toggle", key: "compactView" }
          },
          {
            name: "Compacting factor",
            control: { type: "slider", key: "compactingFactor", min: 0.75, max: 3, step: 0.05 }
          },
          {
            name: "Minimum link length",
            desc: "Legacy spacing control, translated to Plex spacing in the React renderer.",
            control: { type: "slider", key: "minLinkLength", min: 6, max: 40, step: 1 }
          },
          {
            name: "Connector style",
            desc: "Choose curved Bézier connectors or straight connectors. Both attach to the relevant node gates.",
            control: {
              type: "dropdown",
              key: "connectorStyle",
              defaultValue: "bezier",
              options: { bezier: "Bézier", straight: "Straight" }
            }
          },
          {
            name: "Auto fit on navigation",
            control: { type: "toggle", key: "allowAutozoom" }
          },
          {
            name: "Maximum zoom",
            control: { type: "slider", key: "maxZoom", min: 0.5, max: 2, step: 0.05 }
          }
        ]
      },
      {
        type: "group",
        heading: "Visibility",
        items: [
          { name: "Ghost / unresolved thoughts", control: { type: "toggle", key: "showVirtualNodes" } },
          { name: "Web links", control: { type: "toggle", key: "showURLNodes" } },
          { name: "Attachments", control: { type: "toggle", key: "showAttachments" } },
          { name: "Folders", control: { type: "toggle", key: "showFolderNodes" } },
          { name: "Tags", control: { type: "toggle", key: "showTagNodes" } },
          { name: "Markdown pages", control: { type: "toggle", key: "showPageNodes" } }
        ]
      },
      {
        type: "group",
        heading: "Ontology (legacy compatible)",
        cls: "kplex-ontology-settings",
        items: [
          { name: "Parent fields", control: { type: "textarea", key: "hierarchy.parents", rows: 3 } },
          { name: "Child fields", control: { type: "textarea", key: "hierarchy.children", rows: 3 } },
          { name: "Left friend / jump fields", control: { type: "textarea", key: "hierarchy.leftFriends", rows: 3 } },
          { name: "Right friend fields", control: { type: "textarea", key: "hierarchy.rightFriends", rows: 3 } },
          { name: "Previous fields", control: { type: "textarea", key: "hierarchy.previous", rows: 3 } },
          { name: "Next fields", control: { type: "textarea", key: "hierarchy.next", rows: 3 } },
          { name: "Hidden fields", control: { type: "textarea", key: "hierarchy.hidden", rows: 3 } }
        ]
      },
      {
        type: "group",
        heading: "Appearance",
        items: [
          { name: "Plex background", control: { type: "color", key: "backgroundColorHex" } },
          { name: "Render aliases", control: { type: "toggle", key: "renderAlias" } },
          { name: "Neighbor counts", control: { type: "toggle", key: "showNeighborCount" } },
          { name: "Show full tag names", control: { type: "toggle", key: "showFullTagName" } },
          {
            name: "Primary tag field",
            desc: "Legacy primaryTagField used to select tag-specific node styles.",
            control: { type: "text", key: "primaryTagField" }
          },
          {
            name: "Custom node title script",
            desc: "Legacy expression evaluated with dvPage and defaultName variables.",
            control: { type: "textarea", key: "nodeTitleScript", rows: 5 }
          },
          {
            name: "Excluded path prefixes",
            desc: "Comma separated; matches the legacy excludeFilepaths behavior.",
            control: { type: "textarea", key: "excludeFilepathsCsv", rows: 4 }
          }
        ]
      }
    ];
  }

  getControlValue(key: string): unknown {
    const hierarchyKey = HIERARCHY_KEY_MAP[key];
    if (hierarchyKey) return csv(this.ebPlugin.settings.hierarchy[hierarchyKey] as string[]);
    if (key === "excludeFilepathsCsv") return csv(this.ebPlugin.settings.excludeFilepaths);
    if (key === "backgroundColorHex") return this.ebPlugin.settings.backgroundColor.slice(0, 7).toLowerCase();
    return this.ebPlugin.settings[key as keyof ExcaliBrainSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const hierarchyKey = HIERARCHY_KEY_MAP[key];
    if (hierarchyKey) {
      this.ebPlugin.settings.hierarchy[hierarchyKey] = fromCsv(String(value)) as never;
      await this.ebPlugin.saveSettings(true);
      return;
    }

    if (key === "excludeFilepathsCsv") {
      this.ebPlugin.settings.excludeFilepaths = fromCsv(String(value));
      await this.ebPlugin.saveSettings(false);
      return;
    }

    if (key === "backgroundColorHex") {
      const hex = String(value).slice(0, 7).toLowerCase();
      this.ebPlugin.settings.backgroundColor = `${hex}ff`;
      await this.ebPlugin.saveSettings(false);
      return;
    }

    const settingKey = key as keyof ExcaliBrainSettings;
    (this.ebPlugin.settings as unknown as Record<string, unknown>)[settingKey] = value;
    await this.ebPlugin.saveSettings(REINDEX_SETTING_KEYS.has(key));
  }
}
