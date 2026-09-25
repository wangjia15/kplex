import { requestUrl } from "obsidian";
import { abortError, type HttpClient } from "../PaperTypes";

/** `requestUrl` bypasses CORS and works on desktop and mobile. Non-2xx statuses are returned, not thrown. */
export const obsidianHttp: HttpClient = async (request) => {
  const response = await requestUrl({
    url: request.url,
    method: request.method ?? "GET",
    headers: request.headers,
    body: request.body,
    contentType: request.contentType,
    throw: false,
  });
  return { status: response.status, text: response.text };
};

export function windowSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(abortError());
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(0, ms));
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
