import { PaperServiceError, throwIfAborted, type HttpClient } from "../PaperTypes";
import { asArray, asRecord, asString, parseJson } from "../providers/json";
import type { RawTranslator } from "./TranslationTypes";

export const BING_HOSTS = ["www.bing.com", "cn.bing.com"] as const;
const BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

export type BingSession = {
  host: string;
  ig: string;
  iid: string;
  key: string;
  token: string;
  expiresAt: number;
};

export function bingLanguage(target: string): string {
  if (target === "zh-CN") return "zh-Hans";
  if (target === "zh-TW") return "zh-Hant";
  return target;
}

/** Extract the anti-abuse parameters Bing's translator page embeds in its HTML. */
export function parseBingSession(html: string, host: string, now: number): BingSession | null {
  const ig = /IG:"([0-9A-Fa-f]+)"/.exec(html)?.[1];
  const iid = /data-iid="(translator\.[^"]+)"/.exec(html)?.[1] ?? "translator.5023";
  const params = /params_AbusePreventionHelper\s*=\s*\[\s*(\d+)\s*,\s*"([^"]+)"\s*,\s*(\d+)/.exec(html);
  if (!ig || !params) return null;
  const ttl = Number(params[3]);
  return {
    host,
    ig,
    iid,
    key: params[1],
    token: params[2],
    // Refresh a minute early so a long abstract never straddles expiry.
    expiresAt: now + (Number.isFinite(ttl) && ttl > 0 ? ttl : 3600000) - 60000,
  };
}

export function parseBingResponse(text: string): string {
  const body = parseJson(text);
  const first = asRecord(asArray(body)[0]);
  const translation = asString(asRecord(asArray(first?.translations)[0])?.text);
  if (!translation) {
    const status = asRecord(body)?.statusCode;
    throw new PaperServiceError(`Bing Translator returned no text${status ? ` (status ${String(status)})` : ""}.`);
  }
  return translation;
}

export function bingFormBody(session: BingSession, text: string, target: string): string {
  const fields: Record<string, string> = {
    fromLang: "auto-detect",
    to: bingLanguage(target),
    text,
    key: session.key,
    token: session.token,
  };
  return Object.entries(fields).map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("&");
}

/**
 * Bing's public web translator. Mainland-China networks are redirected from www to cn, and a
 * redirected POST loses its body, so each host keeps its own session and the working host is
 * remembered for later calls.
 */
export class BingTranslator implements RawTranslator {
  readonly id = "bing" as const;
  readonly maxChunkChars = 900;
  private readonly sessions = new Map<string, BingSession>();
  private preferredHost: string = BING_HOSTS[0];

  constructor(private readonly http: HttpClient, private readonly now: () => number) {}

  private orderedHosts(): string[] {
    return [this.preferredHost, ...BING_HOSTS.filter((host) => host !== this.preferredHost)];
  }

  private async session(host: string, refresh: boolean): Promise<BingSession | null> {
    const cached = this.sessions.get(host);
    if (cached && !refresh && cached.expiresAt > this.now()) return cached;
    const response = await this.http({ url: `https://${host}/translator`, headers: { "User-Agent": BROWSER_USER_AGENT } });
    if (response.status < 200 || response.status >= 300) return null;
    const session = parseBingSession(response.text, host, this.now());
    if (session) this.sessions.set(host, session);
    return session;
  }

  private async post(session: BingSession, text: string, target: string): Promise<{ status: number; text: string }> {
    return this.http({
      url: `https://${session.host}/ttranslatev3?isVertical=1&IG=${session.ig}&IID=${encodeURIComponent(`${session.iid}.1`)}`,
      method: "POST",
      contentType: "application/x-www-form-urlencoded",
      // Bing rejects translation posts (HTTP 401) that do not come from its translator page.
      headers: { "User-Agent": BROWSER_USER_AGENT, Referer: `https://${session.host}/translator` },
      body: bingFormBody(session, text, target),
    });
  }

  async translate(text: string, target: string, signal?: AbortSignal): Promise<string> {
    let lastError: Error = new PaperServiceError("Bing Translator is unavailable.");
    for (const host of this.orderedHosts()) {
      for (const refresh of [false, true]) {
        throwIfAborted(signal);
        let session: BingSession | null;
        try {
          session = await this.session(host, refresh);
        } catch (error) {
          lastError = error instanceof Error ? error : lastError;
          break;
        }
        if (!session) break;
        let response: { status: number; text: string };
        try {
          response = await this.post(session, text, target);
        } catch (error) {
          lastError = error instanceof Error ? error : lastError;
          break;
        }
        if (response.status >= 200 && response.status < 300) {
          try {
            const translated = parseBingResponse(response.text);
            this.preferredHost = host;
            return translated;
          } catch (error) {
            lastError = error instanceof Error ? error : lastError;
            // A JSON status body means a stale token: refresh once. An empty/HTML body means the
            // POST was redirected to another Bing host (and lost its body): try the next host.
            if (response.text.trim().startsWith("{")) continue;
            break;
          }
        }
        lastError = new PaperServiceError(`Bing Translator returned HTTP ${response.status}.`, response.status);
        if (response.status !== 401 && response.status !== 429) break;
      }
    }
    throw lastError;
  }
}
