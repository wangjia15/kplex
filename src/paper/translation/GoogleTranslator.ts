import { PaperServiceError, type HttpClient } from "../PaperTypes";
import { asArray, asString, parseJson } from "../providers/json";
import type { RawTranslator } from "./TranslationTypes";

const GOOGLE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";

export function googleLanguage(target: string): string {
  if (target === "zh-Hans") return "zh-CN";
  if (target === "zh-Hant") return "zh-TW";
  return target;
}

export function googleTranslateUrl(target: string): string {
  return `${GOOGLE_ENDPOINT}?client=gtx&sl=auto&tl=${encodeURIComponent(googleLanguage(target))}&dt=t`;
}

/** Join Google's `[[target, source, …], …]` sentence array back into one translated string. */
export function parseGoogleResponse(text: string): string {
  const body = asArray(parseJson(text));
  const segments = asArray(body[0]);
  if (!segments.length) throw new PaperServiceError("Google Translate returned no text.");
  return segments.map((segment) => asString(asArray(segment)[0])).join("");
}

export class GoogleTranslator implements RawTranslator {
  readonly id = "google" as const;
  readonly maxChunkChars = 4500;

  constructor(private readonly http: HttpClient) {}

  async translate(text: string, target: string): Promise<string> {
    const response = await this.http({
      url: googleTranslateUrl(target),
      method: "POST",
      contentType: "application/x-www-form-urlencoded;charset=UTF-8",
      body: `q=${encodeURIComponent(text)}`,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new PaperServiceError(`Google Translate returned HTTP ${response.status}.`, response.status);
    }
    return parseGoogleResponse(response.text);
  }
}
