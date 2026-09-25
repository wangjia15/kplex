import { LruCache } from "../LruCache";
import { PaperServiceError, isAbortError, throwIfAborted, type HttpClient } from "../PaperTypes";
import { BingTranslator } from "./BingTranslator";
import { GoogleTranslator } from "./GoogleTranslator";
import {
  SEGMENT_SEPARATOR,
  alignChunk,
  chunkSentences,
  splitSentences,
  splitTranslatedChunk,
  type TranslatedSegment,
} from "./SentenceAlign";
import type { RawTranslator, TranslatorId } from "./TranslationTypes";

export type TranslationResult = {
  provider: TranslatorId;
  segments: TranslatedSegment[];
  /** False when at least one chunk degraded to paragraph-level alignment. */
  aligned: boolean;
};

export type TranslationServiceOptions = {
  preferred: () => TranslatorId;
  target: () => string;
  now: () => number;
};

/**
 * Translates abstracts/titles with the preferred web translator and falls back to the other one.
 * Results are cached per text + provider order + target language for the session.
 */
export class TranslationService {
  private readonly translators: Record<TranslatorId, RawTranslator>;
  private readonly cache = new LruCache<string, TranslationResult>(200);
  private readonly titleCache = new LruCache<string, string>(2000);

  constructor(http: HttpClient, private readonly options: TranslationServiceOptions) {
    this.translators = {
      google: new GoogleTranslator(http),
      bing: new BingTranslator(http, options.now),
    };
  }

  /** Test seam: replace a provider with a fake. */
  setTranslator(translator: RawTranslator): void {
    this.translators[translator.id] = translator;
  }

  peek(text: string): TranslationResult | undefined {
    return this.cache.get(this.cacheKey(text));
  }

  private order(): RawTranslator[] {
    const preferred = this.options.preferred();
    const other: TranslatorId = preferred === "google" ? "bing" : "google";
    return [this.translators[preferred], this.translators[other]];
  }

  private cacheKey(text: string): string {
    return `${this.options.preferred()}|${this.options.target()}|${text}`;
  }

  async translate(text: string, signal?: AbortSignal): Promise<TranslationResult> {
    const trimmed = text.trim();
    if (!trimmed) throw new PaperServiceError("There is no text to translate.");
    const key = this.cacheKey(trimmed);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const sentences = splitSentences(trimmed);
    const target = this.options.target();
    const errors: string[] = [];
    for (const translator of this.order()) {
      try {
        const segments: TranslatedSegment[] = [];
        let aligned = true;
        for (const chunk of chunkSentences(sentences, translator.maxChunkChars)) {
          throwIfAborted(signal);
          const translated = await translator.translate(chunk.map((sentence) => sentence.text).join(SEGMENT_SEPARATOR), target, signal);
          const result = alignChunk(chunk, translated);
          aligned &&= result.aligned;
          segments.push(...result.segments);
        }
        const output: TranslationResult = { provider: translator.id, segments, aligned };
        this.cache.set(key, output);
        return output;
      } catch (error) {
        if (isAbortError(error)) throw error;
        errors.push(`${translator.id === "google" ? "Google" : "Bing"}: ${error instanceof Error ? error.message : "failed"}`);
      }
    }
    throw new PaperServiceError(`Translation failed. ${errors.join(" ")}`);
  }

  /**
   * Translate short lines (titles) in batches. Lines whose batch could not be aligned are left
   * untranslated rather than risk attaching a translation to the wrong title.
   */
  async translateLines(lines: readonly string[], signal?: AbortSignal): Promise<Map<string, string>> {
    const target = this.options.target();
    const output = new Map<string, string>();
    const pending: string[] = [];
    for (const line of new Set(lines.map((item) => item.trim()).filter(Boolean))) {
      const cached = this.titleCache.get(`${target}|${line}`);
      if (cached) output.set(line, cached);
      else pending.push(line);
    }

    for (let start = 0; start < pending.length; start += 40) {
      const batch = pending.slice(start, start + 40);
      let parts: string[] | null = null;
      for (const translator of this.order()) {
        try {
          throwIfAborted(signal);
          const translated = await translator.translate(batch.join(SEGMENT_SEPARATOR), target, signal);
          const split = splitTranslatedChunk(translated);
          if (split.length === batch.length) {
            parts = split;
            break;
          }
        } catch (error) {
          if (isAbortError(error)) throw error;
        }
      }
      if (!parts) continue;
      batch.forEach((line, index) => {
        const value = parts?.[index] ?? "";
        if (!value) return;
        this.titleCache.set(`${target}|${line}`, value);
        output.set(line, value);
      });
    }
    return output;
  }
}
