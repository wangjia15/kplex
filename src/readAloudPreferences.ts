/** Local reader preferences and validation. These values never participate in semantic indexing or foreign graph imports. */
export type ReadAloudEngine = "edge" | "system";
export type ReadAloudPreferences = {
  readAloudEngine: ReadAloudEngine;
  readAloudLanguage: string;
  readAloudEdgeVoice?: string;
  readAloudSystemVoice?: string;
  readAloudRate?: number;
};
export const READ_ALOUD_LANGUAGES = ["auto", "zh-CN", "zh-TW", "en-US", "de-DE", "fr-FR", "es-ES", "nl-NL", "ja-JP", "ru-RU"] as const;

/** Supported Edge voice IDs; this finite inventory also guards SSML attributes. */
export const EDGE_READ_ALOUD_VOICES: readonly { readonly id: string; readonly locale: string; readonly displayName: string }[] = [
  { id: "zh-CN-XiaoxiaoNeural", locale: "zh-CN", displayName: "Xiaoxiao" },
  { id: "zh-CN-YunxiNeural", locale: "zh-CN", displayName: "Yunxi" },
  { id: "zh-TW-HsiaoChenNeural", locale: "zh-TW", displayName: "HsiaoChen" },
  { id: "zh-TW-YunJheNeural", locale: "zh-TW", displayName: "YunJhe" },
  { id: "en-US-AriaNeural", locale: "en-US", displayName: "Aria" },
  { id: "en-US-GuyNeural", locale: "en-US", displayName: "Guy" },
  { id: "de-DE-KatjaNeural", locale: "de-DE", displayName: "Katja" },
  { id: "fr-FR-DeniseNeural", locale: "fr-FR", displayName: "Denise" },
  { id: "es-ES-ElviraNeural", locale: "es-ES", displayName: "Elvira" },
  { id: "nl-NL-ColetteNeural", locale: "nl-NL", displayName: "Colette" },
  { id: "ja-JP-NanamiNeural", locale: "ja-JP", displayName: "Nanami" },
  { id: "ru-RU-SvetlanaNeural", locale: "ru-RU", displayName: "Svetlana" },
];

/** Clamp finite playback rates to the supported interval; invalid values use normal speed. */
export function sanitizeReadAloudRate(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(2, Math.max(0.5, value)) : 1;
}

/** Accept only inventoried Edge IDs, falling back to automatic language selection. */
export function sanitizeReadAloudEdgeVoice(value: unknown): string {
  return typeof value === "string" && EDGE_READ_ALOUD_VOICES.some(voice => voice.id === value) ? value : "auto";
}

/** Retain a bounded native voice URI or name, or use automatic voice selection. */
export function sanitizeReadAloudSystemVoice(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 256 ? value : "auto";
}

/** Keep persisted language preferences finite; unsupported incoming values use automatic detection. */
export function readAloudLanguagePreference(value: unknown): string {
  return typeof value === "string" && READ_ALOUD_LANGUAGES.some(language => language === value) ? value : "auto";
}
