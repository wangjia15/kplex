export type TranslatorId = "google" | "bing";

/** A provider that translates one pre-chunked string. Alignment is handled by the service. */
export interface RawTranslator {
  readonly id: TranslatorId;
  readonly maxChunkChars: number;
  translate(text: string, target: string, signal?: AbortSignal): Promise<string>;
}

export const TRANSLATION_LANGUAGES: Record<string, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  ru: "Русский",
};
