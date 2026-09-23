import { App, Modal, Notice, PluginSettingTab, getIcon, type SettingDefinitionItem } from "obsidian";
import type ExcaliBrainPlugin from "./main";
import type { Arrowhead, Hierarchy, LinkStyle, NodeStyle } from "./types";
import { sanitizeGraphLensDefinitions, type GraphLensDefinition } from "./lens/GraphLens";

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
  rightFriends: ["Challenger", "opposes", "disadvantages", "missing", "cons"],
  previous: ["Previous", "Prev", "West", "w", "Before"],
  next: ["Next", "n", "East", "e", "After"],
  hidden: ["hidden"]
};

export type KplexViewSurface = "leaf" | "sidepanel" | "popout";
export type KplexDeviceClass = "desktop" | "tablet" | "mobile";
export type MouseInteractionMode = "smart" | "legacy" | "middle-only";
export type SidecarPosition = "right" | "left" | "above" | "below";
export type SidecarMarkdownMode = "preview" | "source";
export type DocumentSyncMode = "off" | "recent" | "pinned";
export type KplexLayoutProfile = {
  compactingFactor: number;
  parentColumns: number;
  childColumns: number;
};

export const DEFAULT_LAYOUT_PROFILES: Record<string, KplexLayoutProfile> = {
  "desktop:leaf": { compactingFactor: 2, parentColumns: 2, childColumns: 5 },
  "desktop:popout": { compactingFactor: 2, parentColumns: 2, childColumns: 5 },
  "desktop:sidepanel": { compactingFactor: 2.65, parentColumns: 1, childColumns: 2 },
  "tablet:leaf": { compactingFactor: 2.25, parentColumns: 2, childColumns: 4 },
  "tablet:popout": { compactingFactor: 2.25, parentColumns: 2, childColumns: 4 },
  "tablet:sidepanel": { compactingFactor: 2.7, parentColumns: 1, childColumns: 2 },
  "mobile:leaf": { compactingFactor: 2.55, parentColumns: 1, childColumns: 2 },
  "mobile:popout": { compactingFactor: 2.55, parentColumns: 1, childColumns: 2 },
  "mobile:sidepanel": { compactingFactor: 2.85, parentColumns: 1, childColumns: 2 },
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
  allowAutofocuOnSearch: boolean;
  defaultAlwaysOnTop: boolean;
  embedCentralNode: boolean;
  centerEmbedWidth: number;
  centerEmbedHeight: number;
  // React/K-Plex additions. Existing ExcaliBrain data.json files simply omit these.
  showContentPane: boolean;
  followActiveFile: boolean;
  contentPaneWidth: number;
  graphDepth: 1 | 2;
  connectorStyle: "bezier" | "straight";
  parentColumns: number;
  childColumns: number;
  friendMaxHeight: number;
  siblingMaxHeight: number;
  parentMaxHeight: number;
  childMaxHeight: number;
  noteTypeField: string;
  noteTypeStyles: Record<string, NodeStyle>;
  kplexInitialized: boolean;
  startInPopout: boolean;
  lastActivePath: string;
  pinnedNodes: string[];
  layoutProfiles: Record<string, KplexLayoutProfile>;
  mouseInteractionMode: MouseInteractionMode;
  toolbarExpanded: boolean;
  sidecarOpen: boolean;
  sidecarPosition: SidecarPosition;
  sidecarMarkdownMode: SidecarMarkdownMode;
  sidecarCondensedBreakpoint: number;
  /** Remember the last ontology field used by each add-relationship action. */
  relationDefaultFields: { parent: string; child: string; left: string; right: string };
  /** How K-Plex is paired with a note tab. */
  documentSyncMode: DocumentSyncMode;
  /** Animation speed multiplier: 0 disables motion; 1 is normal; 2 is very fast. */
  animationSpeed: number;
  /** Named local Graph Lenses. Definitions are persisted; evaluation is limited to the visible Plex. */
  graphLenses: GraphLensDefinition[];
}

export const DEFAULT_SETTINGS: ExcaliBrainSettings = {
  compactView: false,
  compactingFactor: 2,
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
  maxItemCount: 100,
  renderSiblings: false,
  applyPowerFilter: false,
  baseNodeStyle: DEFAULT_NODE_STYLE,
  centralNodeStyle: { fontSize: 30, backgroundColor: "#b5b5b5ff", textColor: "#000000ff" },
  inferredNodeStyle: { backgroundColor: "#000005b3", textColor: "#95c7f3ff" },
  urlNodeStyle: { icon: "globe" },
  virtualNodeStyle: { backgroundColor: "#ff000066", fillStyle: "hachure", textColor: "#ffffffff" },
  siblingNodeStyle: { fontSize: 15 },
  attachmentNodeStyle: { icon: "paperclip" },
  folderNodeStyle: { icon: "folder", strokeShaprness: "sharp", borderColor: "#ffd700ff", textColor: "#ffd700ff" },
  tagNodeStyle: { icon: "tag", strokeShaprness: "sharp", borderColor: "#4682b4ff", textColor: "#4682b4ff" },
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
  allowAutofocuOnSearch: true,
  defaultAlwaysOnTop: false,
  embedCentralNode: false,
  centerEmbedWidth: 550,
  centerEmbedHeight: 700,
  showContentPane: false,
  followActiveFile: true,
  contentPaneWidth: 38,
  graphDepth: 1,
  connectorStyle: "bezier",
  parentColumns: 2,
  childColumns: 5,
  friendMaxHeight: 350,
  siblingMaxHeight: 250,
  parentMaxHeight: 300,
  childMaxHeight: 400,
  noteTypeField: "Note type",
  noteTypeStyles: {},
  kplexInitialized: false,
  startInPopout: false,
  lastActivePath: "",
  pinnedNodes: [],
  layoutProfiles: DEFAULT_LAYOUT_PROFILES,
  mouseInteractionMode: "smart",
  toolbarExpanded: false,
  sidecarOpen: false,
  sidecarPosition: "right",
  sidecarMarkdownMode: "preview",
  sidecarCondensedBreakpoint: 560,
  relationDefaultFields: { parent: "Parent", child: "Child", left: "Friend", right: "Challenger" },
  documentSyncMode: "off",
  animationSpeed: 1,
  graphLenses: []
};

const norm = (value: string) => value.toLowerCase().replaceAll(" ", "-").trim();

function mergeLegacyIconStyle(defaultStyle: NodeStyle, saved: NodeStyle | undefined, legacyPrefix: string): NodeStyle {
  const merged = { ...defaultStyle, ...(saved ?? {}) };
  // Classic ExcaliBrain used emoji/text prefixes as built-in icons. K-Plex renders built-in
  // UI/node icons through Obsidian getIcon(), while preserving genuinely custom prefixes.
  if (merged.prefix === legacyPrefix) {
    delete merged.prefix;
    merged.icon ??= defaultStyle.icon;
  }
  return merged;
}

export function migrateAndMergeSettings(raw: unknown): ExcaliBrainSettings {
  const rawSettings = (raw && typeof raw === "object" ? raw : {}) as Partial<ExcaliBrainSettings> & { hierarchy?: Partial<Hierarchy>; maxZoom?: unknown };
  const { maxZoom: _legacyMaxZoom, ...old } = rawSettings;
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
  // K-Plex adds Challenger as the canonical right-gate ontology while retaining every
  // legacy right-friend field. Existing vaults therefore gain the requested default without
  // losing any ExcaliBrain ontology aliases.
  if (!hierarchy.rightFriends.some((field) => norm(field) === "challenger")) {
    hierarchy.rightFriends = ["Challenger", ...hierarchy.rightFriends];
  }

  // Mirror classic initializeHierarchy() precedence rules.
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

  const finite = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const sanitizeProfile = (candidate: Partial<KplexLayoutProfile> | undefined, fallback: KplexLayoutProfile): KplexLayoutProfile => ({
    compactingFactor: Math.max(0.75, Math.min(4, finite(candidate?.compactingFactor, fallback.compactingFactor))),
    parentColumns: Math.max(1, Math.min(3, Math.round(finite(candidate?.parentColumns, fallback.parentColumns)))),
    childColumns: Math.max(1, Math.min(7, Math.round(finite(candidate?.childColumns, fallback.childColumns)))),
  });
  const legacyProfile = sanitizeProfile({
    compactingFactor: old.compactingFactor,
    parentColumns: old.parentColumns,
    childColumns: old.childColumns,
  }, DEFAULT_LAYOUT_PROFILES["desktop:leaf"]);
  const migratedProfiles = Object.fromEntries(
    Object.entries(DEFAULT_LAYOUT_PROFILES).map(([key, fallback]) => [
      key,
      sanitizeProfile(old.layoutProfiles?.[key], key === "desktop:leaf" || key === "desktop:popout" ? legacyProfile : fallback),
    ]),
  ) as Record<string, KplexLayoutProfile>;

  const oldSyncMode = old.documentSyncMode;
  const documentSyncMode: DocumentSyncMode = oldSyncMode === "recent" || oldSyncMode === "pinned" || oldSyncMode === "off"
    ? oldSyncMode
    : oldSyncMode === "kplex-to-leaf" || oldSyncMode === "leaf-to-kplex" || oldSyncMode === "two-way" || Boolean(old.autoOpenCentralDocument) || Boolean(old.followActiveFile)
      ? "recent" : "off";

  return {
    ...DEFAULT_SETTINGS,
    ...old,
    hierarchy,
    baseNodeStyle: { ...DEFAULT_NODE_STYLE, ...(old.baseNodeStyle ?? {}) },
    baseLinkStyle: { ...DEFAULT_LINK_STYLE, ...(old.baseLinkStyle ?? {}) },
    centralNodeStyle: { ...DEFAULT_SETTINGS.centralNodeStyle, ...(old.centralNodeStyle ?? {}) },
    inferredNodeStyle: { ...DEFAULT_SETTINGS.inferredNodeStyle, ...(old.inferredNodeStyle ?? {}) },
    urlNodeStyle: mergeLegacyIconStyle(DEFAULT_SETTINGS.urlNodeStyle, old.urlNodeStyle, "🌐 "),
    virtualNodeStyle: { ...DEFAULT_SETTINGS.virtualNodeStyle, ...(old.virtualNodeStyle ?? {}) },
    siblingNodeStyle: { ...DEFAULT_SETTINGS.siblingNodeStyle, ...(old.siblingNodeStyle ?? {}) },
    attachmentNodeStyle: mergeLegacyIconStyle(DEFAULT_SETTINGS.attachmentNodeStyle, old.attachmentNodeStyle, "📎 "),
    folderNodeStyle: mergeLegacyIconStyle(DEFAULT_SETTINGS.folderNodeStyle, old.folderNodeStyle, "📂 "),
    tagNodeStyle: mergeLegacyIconStyle(DEFAULT_SETTINGS.tagNodeStyle, old.tagNodeStyle, "#"),
    inferredLinkStyle: { ...DEFAULT_SETTINGS.inferredLinkStyle, ...(old.inferredLinkStyle ?? {}) },
    folderLinkStyle: { ...DEFAULT_SETTINGS.folderLinkStyle, ...(old.folderLinkStyle ?? {}) },
    tagLinkStyle: { ...DEFAULT_SETTINGS.tagLinkStyle, ...(old.tagLinkStyle ?? {}) },
    tagNodeStyles: old.tagNodeStyles ?? {},
    tagStyleList: old.tagStyleList ?? [],
    noteTypeStyles: old.noteTypeStyles ?? {},
    hierarchyLinkStyles: old.hierarchyLinkStyles ?? {},
    navigationHistory: old.navigationHistory ?? [],
    excludeFilepaths: old.excludeFilepaths ?? [],
    primaryTagFieldLowerCase: norm(old.primaryTagField ?? DEFAULT_SETTINGS.primaryTagField),
    connectorStyle: old.connectorStyle === "straight" ? "straight" : "bezier",
    graphDepth: old.graphDepth === 2 ? 2 : 1,
    parentColumns: legacyProfile.parentColumns,
    childColumns: legacyProfile.childColumns,
    maxItemCount: Math.max(10, Math.min(300, Number(old.maxItemCount ?? DEFAULT_SETTINGS.maxItemCount))),
    compactingFactor: legacyProfile.compactingFactor,
    friendMaxHeight: Math.max(120, Math.min(900, Number(old.friendMaxHeight ?? old.siblingMaxHeight ?? DEFAULT_SETTINGS.friendMaxHeight))),
    siblingMaxHeight: Math.max(120, Math.min(900, Number(old.siblingMaxHeight ?? DEFAULT_SETTINGS.siblingMaxHeight))),
    parentMaxHeight: Math.max(120, Math.min(900, Number(old.parentMaxHeight ?? DEFAULT_SETTINGS.parentMaxHeight))),
    childMaxHeight: Math.max(120, Math.min(900, Number(old.childMaxHeight ?? DEFAULT_SETTINGS.childMaxHeight))),
    noteTypeField: String(old.noteTypeField ?? DEFAULT_SETTINGS.noteTypeField),
    kplexInitialized: Boolean(old.kplexInitialized),
    startInPopout: Boolean(old.startInPopout),
    lastActivePath: String(old.lastActivePath ?? ""),
    pinnedNodes: Array.isArray(old.pinnedNodes) ? old.pinnedNodes.filter((value): value is string => typeof value === "string") : [],
    layoutProfiles: migratedProfiles,
    mouseInteractionMode: old.mouseInteractionMode === "legacy" || old.mouseInteractionMode === "middle-only" ? old.mouseInteractionMode : "smart",
    toolbarExpanded: Boolean(old.toolbarExpanded),
    sidecarOpen: Boolean(old.sidecarOpen),
    sidecarPosition: old.sidecarPosition === "left" || old.sidecarPosition === "above" || old.sidecarPosition === "below" ? old.sidecarPosition : "right",
    sidecarMarkdownMode: old.sidecarMarkdownMode === "source" ? "source" : "preview",
    sidecarCondensedBreakpoint: Math.max(360, Math.min(900, finite(old.sidecarCondensedBreakpoint, 560))),
    relationDefaultFields: {
      parent: String(old.relationDefaultFields?.parent ?? DEFAULT_SETTINGS.relationDefaultFields.parent),
      child: String(old.relationDefaultFields?.child ?? DEFAULT_SETTINGS.relationDefaultFields.child),
      left: String(old.relationDefaultFields?.left ?? DEFAULT_SETTINGS.relationDefaultFields.left),
      right: String(old.relationDefaultFields?.right ?? DEFAULT_SETTINGS.relationDefaultFields.right),
    },
    documentSyncMode,
    animationSpeed: Math.max(0, Math.min(2, finite(old.animationSpeed, 1))),
    graphLenses: sanitizeGraphLensDefinitions(old.graphLenses),
    // Keep legacy flags coherent for imported settings and older code paths.
    autoOpenCentralDocument: documentSyncMode !== "off",
    followActiveFile: documentSyncMode !== "off",
  };
}

const csv = (value: string[]) => value.join(", ");
const fromCsv = (value: string) => value.split(",").map((x) => x.trim()).filter(Boolean);
const sixHex = (value?: string, fallback = "#000000") => /^#[0-9a-f]{6}/i.test(value ?? "") ? (value as string).slice(0, 7) : fallback;
const eightHex = (value: string) => `${value.slice(0, 7)}ff`;

function appendIcon(button: HTMLElement, name: string): void {
  const icon = getIcon(name);
  if (!icon) return;
  icon.classList.add("kplex-lucide");
  button.prepend(icon);
}

class NoteTypeStyleModal extends Modal {
  constructor(
    app: App,
    private initialName: string | null,
    private initialStyle: NodeStyle,
    private onSave: (name: string, style: NodeStyle, previousName: string | null) => Promise<void>,
    private onDelete?: (name: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(this.initialName ? "Edit note type style" : "Add note type style");
    this.contentEl.addClass("kplex-style-editor");

    const form = this.contentEl.createDiv({ cls: "kplex-style-form" });
    const field = (label: string, input: HTMLElement) => {
      const row = form.createDiv({ cls: "kplex-style-row" });
      row.createEl("label", { text: label });
      row.appendChild(input);
    };

    const nameInput = form.createEl("input");
    nameInput.type = "text";
    nameInput.value = this.initialName ?? "";
    nameInput.placeholder = "Project";
    field("Note type value", nameInput);

    const iconInput = form.createEl("input");
    iconInput.type = "text";
    iconInput.value = this.initialStyle.icon ?? "";
    iconInput.placeholder = "Lucide icon name, e.g. book-open";
    field("Lucide icon", iconInput);

    const background = form.createEl("input");
    background.type = "color";
    background.value = sixHex(this.initialStyle.backgroundColor, "#182433");
    field("Background", background);

    const text = form.createEl("input");
    text.type = "color";
    text.value = sixHex(this.initialStyle.textColor, "#ffffff");
    field("Text", text);

    const border = form.createEl("input");
    border.type = "color";
    border.value = sixHex(this.initialStyle.borderColor, "#6f849a");
    field("Border", border);

    const fontSize = form.createEl("input");
    fontSize.type = "number";
    fontSize.min = "8";
    fontSize.max = "40";
    fontSize.step = "1";
    fontSize.value = String(this.initialStyle.fontSize ?? 18);
    field("Font size", fontSize);

    const actions = this.contentEl.createDiv({ cls: "kplex-style-actions" });
    if (this.initialName && this.onDelete) {
      const remove = actions.createEl("button", { cls: "mod-warning", text: "Delete" });
      appendIcon(remove, "trash-2");
      remove.addEventListener("click", () => {
        void this.onDelete!(this.initialName!).then(() => this.close());
      });
    }
    const cancel = actions.createEl("button", { text: "Cancel" });
    appendIcon(cancel, "x");
    cancel.addEventListener("click", () => this.close());

    const save = actions.createEl("button", { cls: "mod-cta", text: "Save" });
    appendIcon(save, "check");
    save.addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        nameInput.classList.add("is-invalid");
        return;
      }
      const style: NodeStyle = {
        ...this.initialStyle,
        icon: iconInput.value.trim() || undefined,
        backgroundColor: eightHex(background.value),
        textColor: eightHex(text.value),
        borderColor: eightHex(border.value),
        fontSize: Math.max(8, Math.min(40, Number(fontSize.value) || 18)),
      };
      void this.onSave(name, style, this.initialName).then(() => this.close());
    });
    window.setTimeout(() => nameInput.focus(), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class LegacySettingsImportModal extends Modal {
  private rawText = "";

  constructor(app: App, private plugin: ExcaliBrainPlugin, private onImported: () => void) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Import ExcaliBrain settings");
    this.contentEl.addClass("kplex-import-settings-modal");

    this.contentEl.createEl("p", {
      text: "Choose an ExcaliBrain data.json backup. K-Plex will migrate compatible ontology, visibility, navigation and appearance settings, then rebuild the index."
    });

    const fileRow = this.contentEl.createDiv({ cls: "kplex-import-file-row" });
    const fileInput = fileRow.createEl("input", { attr: { type: "file", accept: "application/json,.json" } });
    const status = this.contentEl.createDiv({ cls: "kplex-import-status", text: "No file selected." });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) {
        this.rawText = "";
        status.setText("No file selected.");
        return;
      }
      void file.text().then((text) => {
        this.rawText = text;
        status.setText(file.name);
      }).catch((error: unknown) => {
        this.rawText = "";
        status.setText(`Could not read file: ${String(error)}`);
      });
    });

    const actions = this.contentEl.createDiv({ cls: "kplex-style-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    appendIcon(cancel, "x");
    cancel.addEventListener("click", () => this.close());

    const importButton = actions.createEl("button", { cls: "mod-cta", text: "Import" });
    appendIcon(importButton, "download");
    importButton.addEventListener("click", () => {
      if (!this.rawText) {
        status.setText("Choose an ExcaliBrain data.json file first.");
        return;
      }
      try {
        const parsed = JSON.parse(this.rawText) as unknown;
        // Import legacy keys without resetting K-Plex-only preferences that do not exist in an
        // ExcaliBrain data.json (layout columns, bounded-zone heights, connector style, etc.).
        const current = this.plugin.settings;
        const imported = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
        const importedHierarchy = imported.hierarchy && typeof imported.hierarchy === "object"
          ? imported.hierarchy as Record<string, unknown>
          : {};
        this.plugin.settings = migrateAndMergeSettings({
          ...current,
          ...imported,
          hierarchy: { ...current.hierarchy, ...importedHierarchy },
        });
      } catch (error) {
        status.setText(`Invalid JSON: ${String(error)}`);
        return;
      }
      importButton.disabled = true;
      void this.plugin.saveSettings(true).then(() => {
        new Notice("ExcaliBrain settings imported into K-Plex.", 2600);
        this.onImported();
        this.close();
      }).catch((error: unknown) => {
        importButton.disabled = false;
        status.setText(`Import failed: ${String(error)}`);
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

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
  | "backgroundColorHex"
  | "baseLinkStyle.startArrowHead"
  | "baseLinkStyle.endArrowHead"
  | "baseLinkStyle.showLabel"
  | "baseNodeStyle.gateRadius";

type EditableHierarchyKey = Exclude<keyof Hierarchy, "friends" | "exclusions">;

const HIERARCHY_KEY_MAP: Record<string, EditableHierarchyKey> = {
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
  "showFolderNodes",
  "showTagNodes",
  "primaryTagField",
  "noteTypeField",
  ...Object.keys(HIERARCHY_KEY_MAP)
]);

const ARROW_OPTIONS: Record<Arrowhead, string> = {
  none: "None",
  arrow: "Arrow",
  triangle: "Triangle",
  dot: "Dot",
  bar: "Bar",
};

export class ExcaliBrainSettingTab extends PluginSettingTab {
  constructor(app: App, private ebPlugin: ExcaliBrainPlugin) {
    super(app, ebPlugin);
    this.containerEl.addClass("kplex-settings");
  }

  private openNoteTypeStyleEditor(name: string | null): void {
    const style = name ? this.ebPlugin.settings.noteTypeStyles[name] ?? {} : {};
    new NoteTypeStyleModal(
      this.app,
      name,
      style,
      async (nextName, nextStyle, previousName) => {
        if (previousName && previousName !== nextName) delete this.ebPlugin.settings.noteTypeStyles[previousName];
        this.ebPlugin.settings.noteTypeStyles[nextName] = nextStyle;
        await this.ebPlugin.saveSettings(false);
        this.update();
      },
      async (removeName) => {
        delete this.ebPlugin.settings.noteTypeStyles[removeName];
        await this.ebPlugin.saveSettings(false);
        this.update();
      },
    ).open();
  }

  private openLegacySettingsImporter(): void {
    new LegacySettingsImportModal(this.app, this.ebPlugin, () => this.update()).open();
  }

  getSettingDefinitions(): SettingDefinitionItem<DeclarativeSettingKey>[] {
    const noteTypes = Object.keys(this.ebPlugin.settings.noteTypeStyles).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    const unassignedFields = this.ebPlugin.index.unassignedOntologyFields();
    return [
      {
        type: "group",
        heading: "",
        cls: "kplex-resource-links",
        items: [
          { name: "Buy me a coffee", action: () => { window.open("https://ko-fi.com/zsolt", "_blank", "noopener,noreferrer"); } },
          { name: "Read Sketch Your Mind", action: () => { window.open("https://community.sketch-your-mind.com/sym", "_blank", "noopener,noreferrer"); } },
          { name: "Join SYM Community", action: () => { window.open("https://community.sketch-your-mind.com", "_blank", "noopener,noreferrer"); } },
        ],
      },
      {
        type: "page",
        name: "Graph",
        desc: "Navigation, layout, visibility and connector behavior.",
        items: [
          {
            type: "group",
            heading: "Navigation",
            items: [
              {
                name: "Note tab link",
                desc: "Link K-Plex to the most recent note tab, pin it to one fixed note tab, or keep them independent. One-shot sync actions are available from the toolbar and command palette.",
                control: { type: "dropdown", key: "documentSyncMode", defaultValue: "off", options: {
                  off: "Not linked to a note tab",
                  recent: "Linked to most recent note tab",
                  pinned: "Pinned to one fixed note tab",
                } }
              },
              { name: "Animation speed", desc: "Speed multiplier: 0 = off, 0.5 = slow, 1 = normal, 1.5 = fast, 2 = very fast. Shared thoughts visibly migrate to their new position while the newly selected center arrives a little sooner.", control: { type: "slider", key: "animationSpeed", min: 0, max: 2, step: 0.1 } },
              { name: "Auto fit on navigation", control: { type: "toggle", key: "allowAutozoom" } },
              { name: "Open K-Plex in a pop-out window", desc: "When K-Plex is opened and no K-Plex view already exists, create it in a pop-out window. Desktop only.", control: { type: "toggle", key: "startInPopout" } },
              { name: "Expanded toolbar", desc: "Show the full visibility/layout toolbar. When disabled, K-Plex keeps only the most important navigation controls visible.", control: { type: "toggle", key: "toolbarExpanded" } },
              {
                name: "Mouse navigation",
                desc: "Smart reserves right-click for context menus: left-drag empty canvas or middle-drag anywhere to pan. Legacy allows any mouse button to pan. Wheel zoom never requires a modifier.",
                control: { type: "dropdown", key: "mouseInteractionMode", defaultValue: "smart", options: { smart: "Smart (recommended)", legacy: "Legacy: any button pans", "middle-only": "Middle button pans" } }
              },
            ]
          },
          {
            type: "group",
            heading: "Layout",
            items: [
              { name: "Per-view layout profiles", desc: "K-Plex stores density and parent/child columns separately for desktop, tablet and mobile, and separately for normal leaves, pop-outs and the sidepanel. Use the controls inside an open Plex to tune the active profile." },
              { name: "Parent maximum height", desc: "Parent rows become vertically scrollable above this height.", control: { type: "slider", key: "parentMaxHeight", min: 140, max: 800, step: 20 } },
              { name: "Friend / challenger maximum height", desc: "Friend and challenger lists become vertically scrollable above this height.", control: { type: "slider", key: "friendMaxHeight", min: 140, max: 800, step: 20 } },
              { name: "Sibling maximum height", desc: "Sibling lists become vertically scrollable above this height.", control: { type: "slider", key: "siblingMaxHeight", min: 120, max: 700, step: 10 } },
              { name: "Child maximum height", desc: "Child rows become vertically scrollable above this height.", control: { type: "slider", key: "childMaxHeight", min: 160, max: 900, step: 20 } },
              { name: "Maximum nodes per zone", control: { type: "slider", key: "maxItemCount", min: 10, max: 300, step: 10 } },
              { name: "Compact view", control: { type: "toggle", key: "compactView" } },
              { name: "Minimum link length", desc: "Legacy spacing control translated to Plex spacing.", control: { type: "slider", key: "minLinkLength", min: 6, max: 40, step: 1 } },
            ]
          },
          {
            type: "group",
            heading: "Visibility",
            items: [
              { name: "Show siblings", control: { type: "toggle", key: "renderSiblings" } },
              { name: "Show inferred relationships", control: { type: "toggle", key: "showInferredNodes" } },
              { name: "Ghost / unresolved nodes", control: { type: "toggle", key: "showVirtualNodes" } },
              { name: "Web links", control: { type: "toggle", key: "showURLNodes" } },
              { name: "Attachments", control: { type: "toggle", key: "showAttachments" } },
              { name: "Folders", control: { type: "toggle", key: "showFolderNodes" } },
              { name: "Tags", control: { type: "toggle", key: "showTagNodes" } },
              { name: "Markdown pages", control: { type: "toggle", key: "showPageNodes" } },
              { name: "Gate counts", desc: "Show the number of currently visible relationships beside each gate.", control: { type: "toggle", key: "showNeighborCount" } },
            ]
          },
          {
            type: "group",
            heading: "Relationships",
            items: [
              { name: "Infer normal links as friends", control: { type: "toggle", key: "inferAllLinksAsFriends" } },
              { name: "Inverse inferred parent/child direction", control: { type: "toggle", key: "inverseInfer" } },
              {
                name: "Connector style",
                control: { type: "dropdown", key: "connectorStyle", defaultValue: "bezier", options: { bezier: "Curved", straight: "Straight" } }
              },
              { name: "Start arrowhead", control: { type: "dropdown", key: "baseLinkStyle.startArrowHead", defaultValue: "none", options: ARROW_OPTIONS } },
              { name: "End arrowhead", control: { type: "dropdown", key: "baseLinkStyle.endArrowHead", defaultValue: "none", options: ARROW_OPTIONS } },
              { name: "Reverse arrow direction", desc: "Legacy inverseArrowDirection behavior.", control: { type: "toggle", key: "inverseArrowDirection" } },
              { name: "Show relationship labels", control: { type: "toggle", key: "baseLinkStyle.showLabel" } },
            ]
          },
        ]
      },
      {
        type: "page",
        name: "Ontology",
        desc: "Field names that place relationships around the Plex.",
        items: [
          {
            type: "group",
            heading: "Relationship fields",
            cls: "kplex-ontology-fields",
            items: [
              { name: "Parent fields", control: { type: "textarea", key: "hierarchy.parents", rows: 3 } },
              { name: "Child fields", control: { type: "textarea", key: "hierarchy.children", rows: 3 } },
              { name: "Left friend / jump fields", control: { type: "textarea", key: "hierarchy.leftFriends", rows: 3 } },
              { name: "Right friend / challenger fields", control: { type: "textarea", key: "hierarchy.rightFriends", rows: 3 } },
              { name: "Previous fields", control: { type: "textarea", key: "hierarchy.previous", rows: 3 } },
              { name: "Next fields", control: { type: "textarea", key: "hierarchy.next", rows: 3 } },
              { name: "Hidden fields", control: { type: "textarea", key: "hierarchy.hidden", rows: 3 } },
            ]
          },
          {
            type: "group",
            heading: "Ontology suggester",
            items: [
              { name: "Enable ontology suggester", control: { type: "toggle", key: "allowOntologySuggester" } },
              { name: "Parent trigger", control: { type: "text", key: "ontologySuggesterParentTrigger" } },
              { name: "Child trigger", control: { type: "text", key: "ontologySuggesterChildTrigger" } },
              { name: "Left friend trigger", control: { type: "text", key: "ontologySuggesterLeftFriendTrigger" } },
              { name: "Right friend trigger", control: { type: "text", key: "ontologySuggesterRightFriendTrigger" } },
              { name: "Previous trigger", control: { type: "text", key: "ontologySuggesterPreviousTrigger" } },
              { name: "Next trigger", control: { type: "text", key: "ontologySuggesterNextTrigger" } },
              { name: "All ontology trigger", desc: "Trigger that suggests fields from every ontology group.", control: { type: "text", key: "ontologySuggesterTrigger" } },
              { name: "Mid-sentence prefix", desc: "Prefix used before a trigger for Dataview-style inline fields, for example (::p → (Parent:: …).", control: { type: "text", key: "ontologySuggesterMidSentenceTrigger" } },
              { name: "Bold inserted field names", control: { type: "toggle", key: "boldFields" } },
            ]
          },
          {
            type: "group",
            heading: `Unassigned fields (${unassignedFields.length})`,
            cls: "kplex-unassigned-ontology",
            items: [
              { name: "Refresh discovered fields", desc: "Explicitly rebuild the index even when no K-Plex view is open.", action: () => void this.ebPlugin.rebuildIndex(true, true, "ontology-discovery") },
              ...(unassignedFields.length
                ? unassignedFields.slice(0, 120).map((field) => ({
                    name: field.name,
                    desc: `${field.count} occurrence${field.count === 1 ? "" : "s"} · assign this discovered property to an ontology role`,
                    action: () => this.ebPlugin.openAddToOntologyModal(field.name),
                  }))
                : [{ name: "No unassigned fields", desc: "Refresh discovered fields to scan YAML and Dataview-style properties in the vault." }]),
            ],
          },
        ]
      },
      {
        type: "page",
        name: "Appearance",
        desc: "Node, gate and note type styling.",
        items: [
          {
            type: "group",
            heading: "Plex",
            items: [
              { name: "Plex background", control: { type: "color", key: "backgroundColorHex" } },
              { name: "Render aliases", control: { type: "toggle", key: "renderAlias" } },
              { name: "Show full tag names", control: { type: "toggle", key: "showFullTagName" } },
              { name: "Gate radius", desc: "Legacy node gate radius, in pixels.", control: { type: "slider", key: "baseNodeStyle.gateRadius", min: 2, max: 8, step: 0.5 } },
              { name: "Primary tag field", desc: "Legacy primaryTagField used for tag-specific styles.", control: { type: "text", key: "primaryTagField" } },
              { name: "Custom node title script", desc: "Legacy setting retained for migration only. JavaScript expressions are not executed by K-Plex.", control: { type: "textarea", key: "nodeTitleScript", rows: 5 } },
              { name: "Excluded path prefixes", desc: "Comma separated; matches legacy excludeFilepaths behavior.", control: { type: "textarea", key: "excludeFilepathsCsv", rows: 4 } },
            ]
          },
          {
            type: "group",
            heading: "Note type",
            items: [
              { name: "Note property", desc: "The YAML property whose value selects the primary node style.", control: { type: "text", key: "noteTypeField" } },
            ]
          },
          {
            type: "group",
            heading: "Note type styles",
            items: [
              { name: "Add note type style", desc: "Create a primary visual style for a Note type document property value.", action: () => this.openNoteTypeStyleEditor(null) },
              ...noteTypes.map((name) => ({
                name,
                desc: this.ebPlugin.settings.noteTypeStyles[name]?.icon ? `Lucide icon: ${this.ebPlugin.settings.noteTypeStyles[name].icon}` : "Edit this note type style",
                action: () => this.openNoteTypeStyleEditor(name),
              })),
            ]
          },
        ]
      },

      {
        type: "page",
        name: "Sidecar",
        desc: "Companion document placement and behavior.",
        items: [
          {
            type: "group",
            heading: "Companion document",
            items: [
              {
                name: "Default position",
                desc: "Where a newly opened companion sidecar is placed relative to K-Plex.",
                control: { type: "dropdown", key: "sidecarPosition", defaultValue: "right", options: { right: "Right", left: "Left", above: "Above", below: "Below" } }
              },
              {
                name: "Default Markdown mode",
                desc: "Open Markdown notes in the sidecar in reading view or source/edit mode.",
                control: { type: "dropdown", key: "sidecarMarkdownMode", defaultValue: "preview", options: { preview: "Reading view", source: "Edit mode" } }
              },
              {
                name: "Condensed Plex breakpoint",
                desc: "When the remaining K-Plex width is at or below this value, use the compact sidecar toolbar layout.",
                control: { type: "slider", key: "sidecarCondensedBreakpoint", min: 280, max: 900, step: 20 }
              },
              {
                name: "Fold K-Plex",
                desc: "When a companion sidecar is open, use the fold button beside the graph to temporarily hide the entire K-Plex tab group. An unfold button remains on the document edge."
              },
            ],
          },
        ],
      },
      {
        type: "page",
        name: "Compatibility",
        desc: "Migration and legacy ExcaliBrain interoperability.",
        items: [
          {
            type: "group",
            heading: "ExcaliBrain",
            items: [
              {
                name: "Import ExcaliBrain settings",
                desc: "Import a backed-up ExcaliBrain data.json file and migrate compatible settings into K-Plex.",
                action: () => this.openLegacySettingsImporter(),
              },
            ],
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    const hierarchyKey = HIERARCHY_KEY_MAP[key];
    if (hierarchyKey) return csv(this.ebPlugin.settings.hierarchy[hierarchyKey]);
    if (key === "excludeFilepathsCsv") return csv(this.ebPlugin.settings.excludeFilepaths);
    if (key === "backgroundColorHex") return this.ebPlugin.settings.backgroundColor.slice(0, 7).toLowerCase();
    if (key === "baseLinkStyle.startArrowHead") return this.ebPlugin.settings.baseLinkStyle.startArrowHead ?? "none";
    if (key === "baseLinkStyle.endArrowHead") return this.ebPlugin.settings.baseLinkStyle.endArrowHead ?? "none";
    if (key === "baseLinkStyle.showLabel") return this.ebPlugin.settings.baseLinkStyle.showLabel ?? false;
    if (key === "baseNodeStyle.gateRadius") return this.ebPlugin.settings.baseNodeStyle.gateRadius ?? DEFAULT_NODE_STYLE.gateRadius ?? 5;
    return this.ebPlugin.settings[key as keyof ExcaliBrainSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const hierarchyKey = HIERARCHY_KEY_MAP[key];
    if (hierarchyKey) {
      this.ebPlugin.settings.hierarchy[hierarchyKey] = fromCsv(String(value));
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

    if (key === "baseLinkStyle.startArrowHead") {
      this.ebPlugin.settings.baseLinkStyle.startArrowHead = String(value) as Arrowhead;
      await this.ebPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.endArrowHead") {
      this.ebPlugin.settings.baseLinkStyle.endArrowHead = String(value) as Arrowhead;
      await this.ebPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.showLabel") {
      this.ebPlugin.settings.baseLinkStyle.showLabel = Boolean(value);
      await this.ebPlugin.saveSettings(false);
      return;
    }
    if (key === "baseNodeStyle.gateRadius") {
      this.ebPlugin.settings.baseNodeStyle.gateRadius = Number(value);
      await this.ebPlugin.saveSettings(false);
      return;
    }

    const settingKey = key as keyof ExcaliBrainSettings;
    (this.ebPlugin.settings as unknown as Record<string, unknown>)[settingKey] = value;
    await this.ebPlugin.saveSettings(REINDEX_SETTING_KEYS.has(key));
  }
}
