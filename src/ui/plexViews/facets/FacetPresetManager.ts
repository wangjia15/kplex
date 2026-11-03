/** Searchable native preset library. This composes existing manager/modal mechanics; view
 * intent remains in each canvas and every durable operation returns to the shared writer. */
import {getLanguage, type App} from "obsidian";
import {StyleEditorModal} from "../../StyleEditorModal";
import {StyleManagerList} from "../../StyleManagerList";
import type {CanvasViewManagerContext} from "../managerContracts";
import {facetLibrary} from "../../../core/plex/views/facets/configuration";
import {orderedFacetPresets} from "../../../core/plex/views/facets/state";
import {facetPresetLabel} from "../../../core/plex/views/facets/labels";
import {FACET_STATE_EXAMPLE} from "../../../core/plex/views/facets/templates";
import {canvasViewText} from "../labels";
import type {FacetPreset} from "../../../core/plex/views/facets/contracts";
import {FacetPresetEditor} from "./FacetPresetEditor";
import {isFacetPreset} from "../../../core/plex/views/facets/validation";
import {effectiveFacetHelp} from "./help";
import {PortablePackageModal} from "../../sharing/PortablePackageModal";
import {facetPortablePackage} from "./facetSharing";

export class FacetPresetManager extends StyleEditorModal {
  private list: StyleManagerList | null = null;
  private release: (() => void) | null = null;
  private readonly children = new Set<StyleEditorModal>();
  private query = "";
  /** The native composition root supplies the sole configuration/color/lifetime capabilities. */
  constructor(app: App, private readonly options: CanvasViewManagerContext, private readonly initialId?: string) {super(app);}
  /** Opening and filtering never create settings records or change a canvas's chosen preset. */
  onOpen(): void {
    const t = this.translate;
    this.beginEditor(this.options.colors.sourceScope, this.options.colors.bindEditor);
    this.titleEl.setText(t("facets.manage"));this.modalEl.addClass("kplex-style-manager-modal");
    this.contentEl.createEl("p", {text: t("facets.managerHelp")});
    this.list = new StyleManagerList(this.contentEl, t, {placeholder: t("facets.search"), aria: t("facets.search")}, query => {this.query = query;this.render();});
    this.list.action(t("facets.create"), "plus", () => this.edit(null, {...structuredClone(FACET_STATE_EXAMPLE), name: t("facets.newPreset")}));
    if (this.options.sharing) {
      this.list.action(t("sharing.importPreset"), "import", () => this.share("import"));
      this.list.action(t("sharing.copyPrompt"), "copy", () => this.share("prompt"));
    }
    this.release = this.options.subscribe(() => this.render());this.render();
    const preset = this.initialId && facetLibrary(this.options.configuration())?.presets[this.initialId];
    if (this.initialId && isFacetPreset(preset)) this.edit(this.initialId, preset);
    else this.focusAfterAttachment(this.list.search);
  }
  /** Resolve only bounded saved entries; native search/windowing owns list presentation. */
  private render(): void {
    if (!this.list || !this.canEdit()) return;
    this.list.list.empty();const library = facetLibrary(this.options.configuration());
    if (!library) {this.list.status.setText(this.translate("view.settingsUnavailable"));return;}
    const presets = orderedFacetPresets(library), matches = presets.filter(({preset}) => !this.query
      || canvasViewText(facetPresetLabel(preset), this.translate).toLocaleLowerCase().includes(this.query));
    this.list.status.setText(this.translate("styles.resultCount", {count: presets.length, results: matches.length}));
    const windowed = this.list.window(matches);
    for (const {id, preset} of windowed.visible) {
      const row = this.list.row(() => this.edit(id, preset)), name = canvasViewText(facetPresetLabel(preset), this.translate);
      const copy = row.createDiv({cls: "kplex-style-manager-copy"});copy.createSpan({cls: "kplex-style-manager-name", text: name});
      copy.createDiv({cls: "kplex-style-manager-summary", text: this.translate("facets.summary", {count: preset.order.length, field: preset.field})});
      const controls = this.list.list.createDiv({cls: "kplex-style-manager-controls"});
      if (this.options.sharing) controls.createEl("button", {text: this.translate("sharing.exportPreset"), attr: {type: "button"}})
        .addEventListener("click", () => this.share("export", id, preset));
      for (const [offset, label] of [[-1, "facets.moveUp"], [1, "facets.moveDown"]] as const) {
        const index = presets.findIndex(item => item.id === id), target = presets[index + offset];
        const button = controls.createEl("button", {text: this.translate(label), attr: {type: "button", "aria-label": `${name}: ${this.translate(label)}`}});
        button.disabled = !target;button.addEventListener("click", () => {
          if (!this.canEdit() || !target || !button.isConnected) return;
          const address = {field: "presetOrder"}, expected = this.options.read(address), owner = this.options.capture(address);
          const latest = facetLibrary(this.options.configuration());if (!latest) return;
          const current = orderedFacetPresets(latest), index = current.findIndex(entry => entry.id === id), neighbour = current[index + offset];
          if (!neighbour) return;
          const order = [...new Set([...latest.order, ...Object.keys(latest.presets)])], a = order.indexOf(id), b = order.indexOf(neighbour.id);
          if (a < 0 || b < 0) return;
          [order[a], order[b]] = [order[b], order[a]];
          this.runOperation(current => this.options.save(address, {kind: "set", value: order}, expected, () => owner() && current()));
        });
      }
    }
    this.list.more(windowed, () => this.render());
    if (!matches.length) this.list.list.createDiv({text: this.translate("styles.noMatches")});
  }
  /** The shared transfer surface captures one preset, explicit dependencies and this manager's lifetime. */
  private share(mode: "import" | "export" | "prompt", id?: string, preset?: FacetPreset): void {
    const sharing = this.options.sharing;if (!sharing || !this.canEdit()) return;
    const context = {...sharing, current: () => this.canEdit() && sharing.current()};
    const child = new PortablePackageModal(this.app, {kind: "facets", mode, context,
      build: id && preset ? (selected, privateContent) => facetPortablePackage(id, preset, sharing, this.translate, selected, privateContent)
        : undefined, closed: () => this.children.delete(child)});
    this.children.add(child);child.open();
  }
  /** Duplicates get new stable identity only in the draft, with no implicit preset activation. */
  private edit(id: string | null, preset: FacetPreset): void {
    if (!this.canEdit()) return;
    const key = id ?? `preset-${this.modalEl.ownerDocument.defaultView?.crypto.randomUUID() ?? ""}`;
    if (key === "preset-") return;
    const child = new FacetPresetEditor(this.app, this.options, key, preset, id !== null,
      draft => this.edit(null, {...structuredClone(draft), name: this.translate("facets.copyName", {name: canvasViewText(facetPresetLabel(draft), this.translate)}),
        helpMarkdown: draft.helpMarkdown ?? effectiveFacetHelp(key, draft, this.translate), helpSourceLocale: (draft.helpSourceLocale ?? getLanguage()) || "en"}),
      () => {this.children.delete(child);this.render();});
    this.children.add(child);child.open();
  }
  /** Closing/unload/migration retires every exact child and subscription. */
  onClose(): void {
    super.onClose();this.release?.();this.release = null;for (const child of this.children) child.retire();this.children.clear();
    this.list = null;this.contentEl.empty();this.options.closed();
  }
}
