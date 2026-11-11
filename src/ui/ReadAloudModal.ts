/**
 * Modeless built-in reader: an owning-document floating surface with shared drag mechanics. Explicit
 * Play follows the engine disclosure; close, replacement, popout teardown and unload cancel playback.
 * The retained class name preserves the plugin's existing reader entry point without a modal overlay.
 */
import { ButtonComponent, Notice, Platform, type App, type DropdownComponent } from "obsidian";
import { FormSetting } from "../adapters/obsidian/KplexModal";
import type { PlainTranslationKey, Translator } from "../lang";
import { browserReadAloudHost, ReadAloudPlayer, speechLanguage, speechParagraphs, type ReadAloudPreferences, type ReadAloudState } from "../readAloud";
import { EDGE_READ_ALOUD_VOICES, READ_ALOUD_LANGUAGES, sanitizeReadAloudRate } from "../readAloudPreferences";
import { enableDraggableDialog } from "./components/DraggableDialog";
import { numberSlider } from "./numberSlider";

/** Own one reading request while leaving native notes, tabs and editor selection interactive. */
export class ReadAloudModal {
  readonly modalEl: HTMLElement;
  readonly contentEl: HTMLElement;
  private player: ReadAloudPlayer | null = null;
  private paragraphs: string[];
  private paragraphIndex = 0;
  private paragraphLabel: HTMLElement | null = null;
  private preview: HTMLElement | null = null;
  private disclosure: HTMLElement | null = null;
  private playButton: ButtonComponent | null = null;
  private pauseButton: ButtonComponent | null = null;
  private stopButton: ButtonComponent | null = null;
  private previousButton: ButtonComponent | null = null;
  private nextButton: ButtonComponent | null = null;
  private status: HTMLElement | null = null;
  private didFallback = false;
  private opened = false;
  private retired = false;
  private dragCleanup: (() => void) | null = null;
  private sliderCleanup: (() => void) | null = null;
  private voicesCleanup: (() => void) | null = null;
  /** A closed popout cannot leave audio running in the surviving main plugin window. */
  private readonly closeForWindow = (): void => this.close();

  /** Capture supplied content, local preferences and the caller's native document; acquire no notes. */
  constructor(_app: App, private text: string, private title: string,
    private readonly preferences: ReadAloudPreferences, private readonly hostLanguage: string,
    private readonly translate: Translator, private readonly closed?: () => void,
    private readonly ownerDocument: Document = window.document,
    private readonly savePreferences?: (next: ReadAloudPreferences) => Promise<void>) {
    this.paragraphs = speechParagraphs(text);
    this.modalEl = ownerDocument.body.createDiv({ cls: "kplex-read-aloud", attr: { role: "region", "aria-label": translate("speech.title") } });
    this.contentEl = this.modalEl.createDiv({ cls: "kplex-read-aloud-content" });
  }

  /** Attach one persistent floating shell; outside clicks and Escape remain available to the editor. */
  open(): void {
    if (this.opened || this.retired) return;
    this.opened = true;
    const t = this.translate;
    this.ownerDocument.defaultView?.addEventListener("pagehide", this.closeForWindow, { once: true });
    const header = this.modalEl.createDiv({ cls: "kplex-read-aloud-header", attr: { "aria-label": t("speech.drag") } });
    this.modalEl.prepend(header);
    header.createSpan({ text: t("speech.title"), cls: "kplex-read-aloud-heading" });
    this.button(header, "speech.close", "x", /** Explicit close retires only this reader. */ () => this.close());
    this.contentEl.createDiv({ text: this.title, cls: "kplex-read-aloud-title" });
    this.paragraphLabel = this.contentEl.createDiv({ cls: "kplex-read-aloud-progress" });
    this.preview = this.contentEl.createDiv({ cls: "kplex-read-aloud-preview" });
    this.disclosure = this.contentEl.createEl("p", { cls: "kplex-read-aloud-disclosure" });
    this.status = this.contentEl.createEl("p", { cls: "kplex-read-aloud-status", attr: { role: "status", "aria-live": "polite" } });
    this.player = new ReadAloudPlayer(browserReadAloudHost(),
      /** Retired controls receive no late transport feedback. */ state => { if (!this.retired) this.update(state); },
      /** System fallback is local to this reading session. */ () => { this.didFallback = true; },
      /** Paragraph advancement follows completed audio, independently of transport chunk size. */ index => { this.paragraphIndex = index; this.updateParagraph(); });
    const controls = this.contentEl.createDiv({ cls: "kplex-read-aloud-controls" });
    this.previousButton = this.button(controls, "speech.previous", "skip-back", /** Move within this captured text only. */ () => this.move(-1));
    this.playButton = this.button(controls, "speech.play", "play", /** Replay from the beginning after completion. */ () => this.start(this.player?.state === "finished" ? 0 : this.paragraphIndex));
    this.playButton.setCta();
    this.pauseButton = this.button(controls, "speech.pause", "pause", /** Pausing also gates pending synthesis. */ () => {
      if (this.player?.state === "paused") this.player.resume(); else this.player?.pause();
    });
    this.stopButton = this.button(controls, "speech.stop", "square", /** Stop preserves the selected paragraph for replay. */ () => this.player?.stop());
    this.nextButton = this.button(controls, "speech.next", "skip-forward", /** No network starts when browsing an idle reader. */ () => this.move(1));
    const settings = this.contentEl.createDiv({ cls: "kplex-read-aloud-settings" });
    settings.hidden = true;
    let settingsMounted = false;
    const settingsButton = this.button(this.contentEl, "speech.voiceSettings", "sliders-horizontal", /** Build local voice controls only on disclosure. */ () => {
      if (!settingsMounted) { this.mountSettings(settings); settingsMounted = true; }
      settings.hidden = !settings.hidden;
      settingsButton.buttonEl.setAttribute("aria-expanded", String(!settings.hidden));
    });
    settingsButton.buttonEl.addClass("kplex-read-aloud-settings-toggle");
    settingsButton.buttonEl.setAttribute("aria-expanded", "false");
    this.contentEl.append(settings);
    this.dragCleanup = enableDraggableDialog({ modalEl: this.modalEl, handleEl: header, viewportMargin: 16 });
    this.updateDisclosure();
    this.updateParagraph();
    this.update("idle");
  }

  /** Use native accessible buttons and Lucide icons, fencing retained DOM handlers after close. */
  private button(parent: HTMLElement, key: PlainTranslationKey, icon: string, action: () => void): ButtonComponent {
    return new ButtonComponent(parent).setButtonText(this.translate(key)).setIcon(icon)
      .setTooltip(this.translate(key)).onClick(/** Removed buttons cannot restart speech or write settings. */ () => { if (!this.retired) action(); });
  }

  /** Restart only the chosen paragraph and its successors, preserving a user pause across navigation. */
  private start(index: number, paused = false): void {
    if (!this.player || this.retired || !this.paragraphs.length) return;
    this.didFallback = false;
    void this.player.play(this.text, this.preferences.readAloudEngine,
      speechLanguage(this.text, this.preferences.readAloudLanguage, this.hostLanguage), {
        startParagraph: index, edgeVoice: this.preferences.readAloudEdgeVoice,
        systemVoice: this.preferences.readAloudSystemVoice, rate: this.preferences.readAloudRate,
      });
    if (paused) this.player.pause(); else this.update("loading");
  }

  /** Idle navigation selects silently; active navigation aborts the old audio before replacing it. */
  private move(delta: number): void {
    const index = this.paragraphIndex + delta;
    if (index < 0 || index >= this.paragraphs.length || this.retired) return;
    const state = this.player?.state ?? "idle";
    this.paragraphIndex = index;
    this.updateParagraph();
    if (state === "loading" || state === "playing" || state === "paused") this.start(index, state === "paused");
    else this.update("idle");
  }

  /** Keep long paragraphs bounded in the visible preview without truncating the text sent to speech. */
  private updateParagraph(): void {
    this.paragraphLabel?.setText(this.translate("speech.paragraph", { current: this.paragraphs.length ? this.paragraphIndex + 1 : 0, total: this.paragraphs.length }));
    const paragraph = this.paragraphs[this.paragraphIndex] ?? "";
    this.preview?.setText(paragraph.length > 800 ? `${paragraph.slice(0, 800)}…` : paragraph);
    this.previousButton?.setDisabled(this.paragraphIndex <= 0);
    this.nextButton?.setDisabled(this.paragraphIndex >= this.paragraphs.length - 1);
  }

  /** Reflect the configured engine's privacy disclosure before another explicit Play. */
  private updateDisclosure(): void {
    this.disclosure?.setText(this.translate(this.preferences.readAloudEngine === "edge" ? "speech.edgeDisclosure" : "speech.systemDisclosure"));
  }

  /** Persist accepted edits through the plugin writer; failures remain visible without private service text. */
  private async changePreferences(next: Partial<ReadAloudPreferences>): Promise<void> {
    if (this.retired) return;
    const previousEngine = this.preferences.readAloudEngine;
    const state = this.player?.state;
    const systemActive = this.player?.usesSystemSpeech;
    Object.assign(this.preferences, next);
    this.updateDisclosure();
    if (previousEngine !== this.preferences.readAloudEngine) this.player?.stop();
    else if (next.readAloudRate !== undefined && !systemActive) this.player?.setRate(next.readAloudRate);
    else if (state === "playing" || state === "loading" || state === "paused") this.start(this.paragraphIndex, state === "paused");
    try { await this.savePreferences?.({ ...this.preferences }); }
    catch { if (!this.retired) new Notice(this.translate("speech.saveFailed")); }
  }

  /** Mount native engine/language/voice selects and the shared bounded, permanently labelled rate slider. */
  private mountSettings(container: HTMLElement): void {
    const t = this.translate;
    new FormSetting(container).setName(t("speech.engine")).addDropdown(/** Mobile has no Edge transport. */ control => {
      if (Platform.isDesktop) control.addOption("edge", t("speech.edge"));
      control.addOption("system", t("speech.system")).setValue(this.preferences.readAloudEngine)
        .onChange(/** An engine switch stops playback until Play follows the updated disclosure. */ value => { void this.changePreferences({ readAloudEngine: value === "edge" ? "edge" : "system" }); });
    });
    new FormSetting(container).setName(t("speech.language")).addDropdown(/** Reuse the finite persisted language inventory. */ control => {
      for (const language of READ_ALOUD_LANGUAGES) control.addOption(language, language === "auto" ? t("speech.auto") : language);
      control.setValue(this.preferences.readAloudLanguage).onChange(/** Apply the chosen language from the current paragraph. */ value => { void this.changePreferences({ readAloudLanguage: value }); });
    });
    if (Platform.isDesktop) new FormSetting(container).setName(t("speech.voice")).addDropdown(/** Voice IDs are protocol data, never arbitrary SSML. */ control => {
      control.addOption("auto", t("speech.auto"));
      for (const voice of EDGE_READ_ALOUD_VOICES) control.addOption(voice.id, `${voice.displayName} · ${voice.locale}`);
      control.setValue(this.preferences.readAloudEdgeVoice ?? "auto").onChange(/** A selected timbre applies at the current paragraph boundary. */ value => { void this.changePreferences({ readAloudEdgeVoice: value }); });
    });
    let systemControl: DropdownComponent | null = null;
    /** Voices may arrive after panel mount; preserve a saved unavailable voice until the user changes it. */
    const refreshVoices = (): void => {
      if (!systemControl || this.retired) return;
      systemControl.selectEl.empty();
      systemControl.addOption("auto", t("speech.auto"));
      const voices = window.speechSynthesis?.getVoices() ?? [];
      const selected = this.preferences.readAloudSystemVoice ?? "auto";
      const options = new Set<string>();
      for (const voice of voices) {
        const id = voice.voiceURI || voice.name;
        if (!id || id.length > 256 || options.has(id)) continue;
        options.add(id);
        systemControl.addOption(id, `${voice.name} · ${voice.lang}`);
      }
      if (selected !== "auto" && !options.has(selected)) systemControl.addOption(selected, selected);
      systemControl.setValue(selected);
    };
    new FormSetting(container).setName(t("speech.systemVoice")).addDropdown(/** Only this device's installed voices are enumerated. */ control => {
      systemControl = control;
      refreshVoices();
      control.onChange(/** Local voice selection also applies to Edge fallback. */ value => { void this.changePreferences({ readAloudSystemVoice: value }); });
    });
    const speech = window.speechSynthesis;
    speech?.addEventListener("voiceschanged", refreshVoices);
    this.voicesCleanup = /** Remove the exact native inventory listener on retirement. */ () => speech?.removeEventListener("voiceschanged", refreshVoices);
    const slider = numberSlider(new FormSetting(container).setName(t("speech.rate")), {
      label: t("speech.rate"), value: sanitizeReadAloudRate(this.preferences.readAloudRate), min: 0.5, max: 2, step: 0.05,
      format: /** Keep the multiplier visible beside the native control. */ value => `${value.toFixed(2)}×`,
      isCurrent: /** Retained events cannot persist settings after close. */ () => !this.retired,
      onChange: /** Native utterances restart at the current paragraph; Edge rate changes in place. */ value => this.changePreferences({ readAloudRate: value }),
    });
    this.sliderCleanup = /** Retire pending UI delivery while preserving already accepted saves. */ () => slider.dispose();
  }

  /** Publish concise localized transport state and native disabled/pressed control states. */
  private update(state: ReadAloudState): void {
    const active = state === "loading" || state === "playing" || state === "paused";
    this.playButton?.setDisabled(active || !this.paragraphs.length);
    this.pauseButton?.setDisabled(!active).setButtonText(this.translate(state === "paused" ? "speech.resume" : "speech.pause"))
      .setIcon(state === "paused" ? "play" : "pause").setTooltip(this.translate(state === "paused" ? "speech.resume" : "speech.pause"));
    this.stopButton?.setDisabled(!active);
    this.status?.setText(this.translate(state === "failed" ? "speech.failed"
      : state === "finished" ? "speech.finished" : state === "paused" ? "speech.paused"
      : state === "loading" ? "speech.loading" : state === "playing"
        ? (this.didFallback ? "speech.fallback" : "speech.playing") : "speech.ready"));
  }

  /** Idempotent retirement releases text, all native listeners, drag state, pending speech and detached DOM. */
  close(): void {
    if (this.retired) return;
    this.retired = true;
    this.ownerDocument.defaultView?.removeEventListener("pagehide", this.closeForWindow);
    this.player?.stop();
    this.player = null;
    this.dragCleanup?.(); this.dragCleanup = null;
    this.sliderCleanup?.(); this.sliderCleanup = null;
    this.voicesCleanup?.(); this.voicesCleanup = null;
    this.contentEl.empty(); this.modalEl.remove(); this.modalEl.empty();
    this.paragraphs = []; this.text = ""; this.title = "";
    this.paragraphLabel = null; this.preview = null; this.disclosure = null; this.status = null;
    this.playButton = null; this.pauseButton = null; this.stopButton = null;
    this.previousButton = null; this.nextButton = null;
    this.closed?.();
  }
}
