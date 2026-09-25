/**
 * Host-free paper-reading types. Nothing in `src/paper/` (outside `obsidian/`) may import
 * Obsidian; network access is injected through `HttpClient`.
 */

/** `title` is a lookup hint for notes that only link a conference PDF; it resolves via title match. */
export type PaperIdKind = "doi" | "arxiv" | "s2" | "title";

export type PaperId = {
  kind: PaperIdKind;
  /** Normalized value: lowercase DOI without resolver prefix, arXiv id without version, S2 hash, or title text. */
  value: string;
};

export type PaperRecord = {
  /** Stable dedupe key (see `paperKey`). */
  key: string;
  ids: PaperId[];
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  abstract: string;
  tldr: string;
  citationCount: number | null;
  referenceCount: number | null;
  url: string;
  pdfUrl: string;
  /** Provider that produced the record, for diagnostics in the UI. */
  source: "semantic-scholar" | "openalex" | "arxiv" | "note";
};

export type PaperListKind = "references" | "citations";

export type PaperListSource = "semantic-scholar" | "openalex" | "note";

export type PaperListPage = {
  items: PaperRecord[];
  /** Where this page came from, shown to the reader. */
  source: PaperListSource;
  /** Offset for the next page, or null when the list is exhausted. */
  next: number | null;
  /** Total when the provider reports one. */
  total: number | null;
};

export type HttpRequest = {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  contentType?: string;
};

export type HttpResponse = {
  status: number;
  text: string;
};

export type HttpClient = (request: HttpRequest) => Promise<HttpResponse>;

export class PaperServiceError extends Error {
  constructor(message: string, readonly status: number | null = null) {
    super(message);
    this.name = "PaperServiceError";
  }
}

export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : "Unknown error");
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function abortError(): Error {
  const error = new Error("Cancelled");
  error.name = "AbortError";
  return error;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}
