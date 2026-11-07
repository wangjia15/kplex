/**
 * Built-in, host-owned speech playback for reading surfaces. Edge synthesis is attempted on explicit
 * playback and falls back to the system speech engine. Each player owns its audio, cancellation and
 * temporary object URLs; it never reads notes, navigates leaves or changes the semantic index.
 */
import { synthesizeEdgeSpeech } from "./edgeTts";

import { READ_ALOUD_LANGUAGES, sanitizeReadAloudRate, type ReadAloudEngine } from "./readAloudPreferences";
export type { ReadAloudPreferences } from "./readAloudPreferences";
export type ReadAloudState = "idle" | "loading" | "playing" | "paused" | "finished" | "failed";

/** Prefer distinctive scripts, then the host language, without sending text to a language service. */
export function speechLanguage(text: string, preference: string, hostLanguage: string): string {
  if (preference !== "auto") return preference;
  if (/[぀-ヿ]/u.test(text)) return "ja-JP";
  if (/[㐀-鿿]/u.test(text)) return /^(zh-tw|zh-hk)/i.test(hostLanguage) ? "zh-TW" : "zh-CN";
  if (/[Ѐ-ӿ]/u.test(text)) return "ru-RU";
  const base = hostLanguage.toLowerCase().split(/[-_]/)[0];
  return READ_ALOUD_LANGUAGES.find(language => language.toLowerCase().startsWith(`${base}-`)) ?? "en-US";
}

/** Yield bounded speech chunks at punctuation/whitespace when possible, preserving surrogate pairs. */
export function* speechChunks(text: string, limit = 1800): Generator<string> {
  if (!Number.isInteger(limit) || limit < 2) throw new Error("Invalid speech chunk limit");
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + limit, text.length);
    if (end < text.length) {
      for (let index = end - 1; index > start + limit / 2; index--) {
        if (/[\s。！？.!?;]/u.test(text[index])) { end = index + 1; break; }
      }
      const previous = text.charCodeAt(end - 1);
      if (previous >= 0xd800 && previous <= 0xdbff) end--;
    }
    const chunk = text.slice(start, end).trim();
    start = end;
    if (chunk) yield chunk;
  }
}

/** Divide supplied reading text at blank lines; transport chunk limits never become paragraph boundaries. */
export function speechParagraphs(text: string): string[] {
  return text.split(/\r?\n[\t ]*\r?\n(?:[\t ]*\r?\n)*/u).map(/** Discard empty blocks without interpreting Markdown. */ block => block.trim()).filter(Boolean);
}

/** Per-request voice choices and paragraph position; speed can also change during decoded playback. */
export interface ReadAloudOptions {
  edgeVoice?: string;
  systemVoice?: string;
  rate?: number;
  startParagraph?: number;
}

/** Narrow injectable host effects keep lifecycle/fallback behavior executable without a real speaker. */
export interface ReadAloudHost {
  synthesize: typeof synthesizeEdgeSpeech;
  createAudio: () => HTMLAudioElement;
  speech: SpeechSynthesis | undefined;
  createUtterance: (text: string) => SpeechSynthesisUtterance;
  createUrl: (blob: Blob) => string;
  revokeUrl: (url: string) => void;
  schedule: (callback: () => void, milliseconds: number) => number;
  cancelTimer: (timer: number) => void;
}

/** Bind playback resources to the plugin's main window so closing a popout cannot strand cleanup. */
export function browserReadAloudHost(): ReadAloudHost {
  return {
    synthesize: synthesizeEdgeSpeech,
    createAudio: /** Create only on an explicit user Play gesture. */ () => new window.Audio(),
    speech: window.speechSynthesis,
    createUtterance: /** The system engine receives text only when selected or after Edge failure. */ text => new window.SpeechSynthesisUtterance(text),
    createUrl: /** Audio exists only in this temporary session. */ blob => URL.createObjectURL(blob),
    revokeUrl: /** Retire decoded/network audio after each chunk. */ url => URL.revokeObjectURL(url),
    schedule: /** Speech initialization watchdog survives native window migration. */ (callback, milliseconds) => window.setTimeout(callback, milliseconds),
    cancelTimer: /** Remove the watchdog when its utterance retires. */ timer => window.clearTimeout(timer),
  };
}

/** Own exactly one speech session; stop and replacement settle all in-flight waits before retirement. */
export class ReadAloudPlayer {
  private controller: AbortController | null = null;
  private audio: HTMLAudioElement | null = null;
  private systemActive = false;
  private rate = 1;
  private paused = false;
  paragraphIndex = 0;

  /** Report the actual engine so system rate changes can restart the current paragraph explicitly. */
  get usesSystemSpeech(): boolean { return this.systemActive; }

  /** Apply rate immediately to Edge audio and retain it for subsequent native utterances. */
  setRate(value: number): void {
    this.rate = sanitizeReadAloudRate(value);
    if (this.audio) this.audio.playbackRate = this.rate;
  }
  private readonly resumeWaiters = new Set<() => void>();
  state: ReadAloudState = "idle";

  /** Capture bounded host capabilities and UI feedback without acquiring plugin or graph state. */
  constructor(private readonly host: ReadAloudHost, private readonly changed: (state: ReadAloudState) => void,
    private readonly fallback: () => void,
    private readonly paragraphChanged: (index: number) => void = /** Existing single-text consumers need no progress callback. */ () => {}) {}

  /** Publish state only for the current live request. */
  private setState(state: ReadAloudState): void { this.state = state; this.changed(state); }

  /** Stop current speech before starting another; completed chunks are never replayed on fallback. */
  async play(text: string, engine: ReadAloudEngine, language: string, options: ReadAloudOptions = {}): Promise<void> {
    this.stop();
    const paragraphs = speechParagraphs(text);
    if (!paragraphs.length) return;
    this.setRate(options.rate ?? this.rate);
    const requested = options.startParagraph ?? 0;
    const start = Number.isFinite(requested) ? Math.min(paragraphs.length - 1, Math.max(0, Math.trunc(requested))) : 0;
    const controller = new AbortController();
    this.controller = controller;
    const { signal } = controller;
    let currentEngine = engine;
    try {
      // Allocation stays inside the user gesture. Network/decoder playback may still be refused by
      // a mobile host; that refusal follows the same bounded system fallback as a network failure.
      if (engine === "edge") {
        try { this.audio = this.host.createAudio(); }
        catch { currentEngine = "system"; this.fallback(); }
      }
      for (let index = start; index < paragraphs.length; index++) {
        if (signal.aborted) return;
        this.paragraphIndex = index;
        this.paragraphChanged(index);
        for (const chunk of speechChunks(paragraphs[index])) {
          if (signal.aborted) return;
          await this.waitForResume(signal);
          if (signal.aborted) return;
          if (currentEngine === "edge") {
            this.setState("loading");
            try {
              const blob = await this.host.synthesize(chunk, language, signal, { voice: options.edgeVoice });
              if (signal.aborted) return;
              await this.waitForResume(signal);
              if (signal.aborted) return;
              await this.playAudio(blob, signal);
              continue;
            } catch {
              if (signal.aborted) return;
              currentEngine = "system";
              this.fallback();
            }
          }
          for (const part of speechChunks(chunk, 300)) {
            await this.waitForResume(signal);
            if (signal.aborted) return;
            await this.speakSystem(part, language, signal, options.systemVoice);
          }
        }
      }
      if (!signal.aborted) this.setState("finished");
    } catch {
      if (!signal.aborted) this.setState("failed");
    } finally {
      if (this.controller === controller) {
        this.releaseAudio();
        this.controller = null;
      }
    }
  }

  /** Pause both active playback and a still-pending synthesis request's eventual playback. */
  pause(): void {
    if (!this.controller || this.paused) return;
    this.paused = true;
    this.audio?.pause();
    if (this.systemActive) this.host.speech?.pause();
    this.setState("paused");
  }

  /** Resume this session only; a finished/stopped player cannot restart itself. */
  resume(): void {
    if (!this.controller || !this.paused) return;
    this.paused = false;
    if (this.systemActive) this.host.speech?.resume();
    if (this.audio?.src) {
      const controller = this.controller;
      void this.audio.play().catch(/** Decoder refusal must settle the active chunk rather than hang. */ () => {
        if (this.controller === controller) this.audio?.dispatchEvent(new Event("error"));
      });
    }
    for (const resolve of this.resumeWaiters) resolve();
    this.setState("playing");
  }

  /** Abort network, decoder and utterance waits, revoking audio without touching unrelated system speech. */
  stop(): void {
    this.controller?.abort();
    this.controller = null;
    this.paused = false;
    for (const resolve of this.resumeWaiters) resolve();
    this.resumeWaiters.clear();
    if (this.systemActive) this.host.speech?.cancel();
    this.systemActive = false;
    this.releaseAudio();
    this.setState("idle");
  }

  /** Native media cleanup releases decoder memory as well as preventing further audio. */
  private releaseAudio(): void {
    this.audio?.pause();
    this.audio?.removeAttribute("src");
    this.audio?.load();
    this.audio = null;
  }

  /** Wait for resume or abort; cleanup always settles the promise and removes the abort listener. */
  private waitForResume(signal: AbortSignal): Promise<void> {
    if (!this.paused || signal.aborted) return Promise.resolve();
    return new Promise(resolve => {
      /** A retired pause gate must not retain a signal or modal. */
      const finish = () => { this.resumeWaiters.delete(finish); signal.removeEventListener("abort", finish); resolve(); };
      this.resumeWaiters.add(finish);
      signal.addEventListener("abort", finish, { once: true });
    });
  }

  /** Play one decoded Edge chunk and release its object URL on completion, error or cancellation. */
  private playAudio(blob: Blob, signal: AbortSignal): Promise<void> {
    const audio = this.audio;
    if (!audio || signal.aborted) return Promise.resolve();
    const url = this.host.createUrl(blob);
    return new Promise((resolve, reject) => {
      let settled = false;
      /** Event ownership ends before removing media so cleanup events cannot change the outcome. */
      const finish = (failed = false) => {
        if (settled) return;
        settled = true;
        audio.onended = null; audio.onerror = null;
        signal.removeEventListener("abort", abort);
        audio.pause(); audio.removeAttribute("src"); audio.load();
        this.host.revokeUrl(url);
        if (failed) reject(new Error("Audio playback failed")); else resolve();
      };
      /** Cancellation is a settled neutral result; the caller fences the aborted session. */
      const abort = () => finish();
      audio.onended = /** Only a complete chunk advances the reader. */ () => finish();
      audio.onerror = /** Decoder errors permit system speech fallback. */ () => finish(true);
      signal.addEventListener("abort", abort, { once: true });
      audio.src = url;
      audio.playbackRate = this.rate;
      this.setState("playing");
      void audio.play().catch(/** Treat blocked autoplay as an ordinary playback failure. */ () => { if (audio.onerror) finish(true); });
    });
  }

  /** Speak a bounded chunk using the best matching installed voice; unavailable engines fail visibly. */
  private speakSystem(text: string, language: string, signal: AbortSignal, selectedVoice?: string): Promise<void> {
    const speech = this.host.speech;
    if (!speech) return Promise.reject(new Error("System speech unavailable"));
    const utterance = this.host.createUtterance(text);
    utterance.lang = language;
    utterance.rate = this.rate;
    const voices = speech.getVoices();
    const base = language.split("-")[0].toLowerCase();
    const voice = voices.find(item => !!selectedVoice && selectedVoice !== "auto" && (item.voiceURI === selectedVoice || item.name === selectedVoice))
      ?? voices.find(item => item.lang.toLowerCase() === language.toLowerCase())
      ?? voices.find(item => item.lang.toLowerCase().split(/[-_]/)[0] === base);
    if (voice) utterance.voice = voice;
    return new Promise((resolve, reject) => {
      let settled = false;
      let startTimer: number | null = null;
      /** Remove native callbacks even on cancellation, where some hosts omit end/error events. */
      const finish = (failed = false) => {
        if (settled) return;
        settled = true;
        if (startTimer !== null) this.host.cancelTimer(startTimer);
        utterance.onstart = null; utterance.onend = null; utterance.onerror = null;
        signal.removeEventListener("abort", abort);
        this.systemActive = false;
        if (failed) reject(new Error("System speech failed")); else resolve();
      };
      /** Some hosts expose speechSynthesis without an installed service and emit no native events. */
      const checkStarted = () => {
        if (this.paused) { startTimer = this.host.schedule(checkStarted, 15000); return; }
        finish(true);
        speech.cancel();
      };
      startTimer = this.host.schedule(checkStarted, 15000);
      utterance.onstart = /** Native start removes the initialization deadline; user pauses have no deadline. */ () => {
        if (startTimer !== null) this.host.cancelTimer(startTimer);
        startTimer = null;
      };
      /** Stop settles before the controller cancels its owned native utterance. */
      const abort = () => { speech.cancel(); finish(); };
      signal.addEventListener("abort", abort, { once: true });
      utterance.onend = /** Finished speech advances to the next bounded part. */ () => finish();
      utterance.onerror = /** Host errors must surface rather than silently ending the reader. */ () => finish(true);
      this.systemActive = true;
      this.setState("playing");
      try { speech.speak(utterance); } catch { finish(true); }
    });
  }
}
