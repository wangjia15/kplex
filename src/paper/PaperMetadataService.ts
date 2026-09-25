import { LruCache } from "./LruCache";
import { paperKey, preferredPaperId } from "./PaperIdentifier";
import {
  PaperServiceError,
  isAbortError,
  throwIfAborted,
  type HttpClient,
  type HttpResponse,
  type PaperId,
  type PaperListKind,
  type PaperListPage,
  type PaperRecord,
} from "./PaperTypes";
import { arxivQueryUrl, parseArxivFeed } from "./providers/Arxiv";
import { asArray, asRecord, parseJson } from "./providers/json";
import {
  openAlexCitingUrl,
  openAlexDetailUrl,
  openAlexShortId,
  openAlexTitleSearchUrl,
  openAlexWorksByIdsUrl,
  parseOpenAlexWork,
  pickOpenAlexTitleMatch,
} from "./providers/OpenAlex";
import { parseS2List, parseS2Match, parseS2Paper, s2DetailUrl, s2ListUrl, s2MatchUrl } from "./providers/SemanticScholar";

export type PaperServiceOptions = {
  semanticScholarApiKey: () => string;
  contactEmail: () => string;
  /** Abortable delay; injected so host-free code never touches timer globals directly. */
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  now: () => number;
};

const RETRY_DELAYS_MS = [1500, 4000];
const JSON_ACCEPT = "application/json";
// arXiv answers HTTP 406 to requests without an Accept header.
const ATOM_ACCEPT = "application/atom+xml, application/xml;q=0.9, */*;q=0.8";

/**
 * Resolves paper metadata, references and citations.
 *
 * Semantic Scholar is primary. Failures fall back by identifier type: DOI → OpenAlex, arXiv →
 * arXiv API (metadata/abstract only). Missing S2 abstracts are enriched from the same fallbacks.
 * Requests to one service are serialized with a minimum gap and retried on HTTP 429.
 */
export class PaperMetadataService {
  private readonly details = new LruCache<string, PaperRecord>(300);
  private readonly lists = new LruCache<string, PaperListPage>(120);
  private readonly inFlight = new Map<string, Promise<PaperRecord>>();
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly lastRequestAt = new Map<string, number>();

  constructor(private readonly http: HttpClient, private readonly options: PaperServiceOptions) {}

  clear(): void {
    this.details.clear();
    this.lists.clear();
    this.inFlight.clear();
  }

  peek(id: PaperId): PaperRecord | undefined {
    return this.details.get(paperKey(id));
  }

  async lookup(ids: readonly PaperId[], signal?: AbortSignal): Promise<PaperRecord> {
    const id = preferredPaperId(ids);
    if (!id) throw new PaperServiceError("This node has no DOI or arXiv identifier.");
    const key = paperKey(id);
    const cached = this.details.get(key);
    if (cached) return cached;
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const task = this.resolveDetail(id, ids, signal).then((record) => {
      this.details.set(key, record);
      for (const alias of record.ids) this.details.set(paperKey(alias), record);
      return record;
    }).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, task);
    return task;
  }

  /**
   * One page of references or citing papers. Semantic Scholar first; when it fails, or has no
   * list for this paper, OpenAlex is tried by DOI or by title (`title` or the resolved record's).
   */
  async list(
    ids: readonly PaperId[],
    kind: PaperListKind,
    offset: number,
    limit: number,
    signal?: AbortSignal,
    title = "",
  ): Promise<PaperListPage> {
    let id = preferredPaperId(ids);
    if (!id) throw new PaperServiceError("This node has no DOI or arXiv identifier.");
    if (id.kind === "title") {
      // Resolve the title once, then page with the matched paper's real identifier.
      title ||= id.value;
      const resolved = await this.lookup(ids, signal);
      ids = resolved.ids;
      title = resolved.title || title;
      id = preferredPaperId(ids);
      if (!id) throw new PaperServiceError("No matching paper was found for this title.");
    }
    const cacheKey = `${paperKey(id)}|${kind}|${offset}|${limit}`;
    const cached = this.lists.get(cacheKey);
    if (cached) return cached;

    let page: PaperListPage | null = null;
    let s2Error: unknown = null;
    try {
      const response = await this.request("s2", { url: s2ListUrl(id, kind, offset, limit), headers: this.s2Headers() }, signal);
      page = parseS2List(response.text, kind, offset, limit);
    } catch (error) {
      if (isAbortError(error)) throw error;
      s2Error = error;
    }

    // S2 has no list (error, or an empty first page): try OpenAlex before giving up.
    if (!page || (offset === 0 && page.items.length === 0)) {
      try {
        const doi = ids.find((candidate) => candidate.kind === "doi");
        const fallbackTitle = title || this.details.get(paperKey(id))?.title || "";
        const work = doi ? await this.openAlexWorkByDoi(doi.value, signal) : fallbackTitle ? await this.openAlexWorkByTitle(fallbackTitle, signal) : null;
        const fallback = work ? await this.openAlexList(work, kind, offset, limit, signal) : null;
        if (fallback && (fallback.items.length || !page)) page = fallback;
      } catch (error) {
        if (isAbortError(error)) throw error;
      }
    }
    if (!page) {
      if (s2Error instanceof Error) throw s2Error;
      throw new PaperServiceError("No reference information is available for this paper.");
    }
    this.lists.set(cacheKey, page);
    return page;
  }

  private async resolveDetail(id: PaperId, ids: readonly PaperId[], signal?: AbortSignal): Promise<PaperRecord> {
    let record: PaperRecord | null = null;
    let firstError: unknown = null;
    if (id.kind === "title") {
      // Title hints have no other fallback, so the match request keeps the normal S2 backoff.
      const response = await this.request("s2", { url: s2MatchUrl(id.value), headers: this.s2Headers() }, signal);
      record = parseS2Match(response.text);
      if (!record) throw new PaperServiceError("No matching paper was found for this title.", 404);
    } else {
      // When arXiv/OpenAlex can answer, do not make the reader wait through S2 rate-limit backoff.
      const hasFallback = ids.some((candidate) => candidate.kind === "arxiv" || candidate.kind === "doi");
      try {
        const response = await this.request("s2", { url: s2DetailUrl(id), headers: this.s2Headers() }, signal, hasFallback ? 0 : RETRY_DELAYS_MS.length);
        record = parseS2Paper(parseJson(response.text));
      } catch (error) {
        if (isAbortError(error)) throw error;
        firstError = error;
      }
    }
    if (record?.abstract) return record;

    const known = [...ids, ...(record?.ids ?? [])];
    let fallback: PaperRecord | null = null;
    try {
      fallback = await this.fallbackDetail(known, signal);
    } catch (error) {
      if (isAbortError(error)) throw error;
      firstError ??= error;
    }

    if (!record && !fallback && id.kind !== "title" && firstError instanceof PaperServiceError && (firstError.status === 429 || (firstError.status ?? 0) >= 500)) {
      // Both the quick S2 attempt and the fallbacks failed: now wait out S2's rate limit.
      const response = await this.request("s2", { url: s2DetailUrl(id), headers: this.s2Headers() }, signal);
      record = parseS2Paper(parseJson(response.text));
    }

    if (record && fallback) {
      return {
        ...record,
        abstract: record.abstract || fallback.abstract,
        pdfUrl: record.pdfUrl || fallback.pdfUrl,
        venue: record.venue || fallback.venue,
        year: record.year ?? fallback.year,
      };
    }
    if (record) return record;
    if (fallback) return fallback;
    if (firstError instanceof Error) throw firstError;
    throw new PaperServiceError("Paper not found.");
  }

  /** arXiv API for arXiv ids, then OpenAlex for DOIs; used when S2 fails or lacks an abstract. */
  private async fallbackDetail(ids: readonly PaperId[], signal?: AbortSignal): Promise<PaperRecord | null> {
    const arxiv = ids.find((candidate) => candidate.kind === "arxiv");
    const doi = ids.find((candidate) => candidate.kind === "doi");
    let fallback: PaperRecord | null = null;
    if (arxiv) fallback = await this.arxivDetail(arxiv.value, signal);
    if (!fallback?.abstract && doi) fallback = await this.openAlexDetail(doi.value, signal) ?? fallback;
    return fallback;
  }

  private async arxivDetail(arxivId: string, signal?: AbortSignal): Promise<PaperRecord | null> {
    const response = await this.request("arxiv", { url: arxivQueryUrl(arxivId) }, signal);
    return parseArxivFeed(response.text, arxivId);
  }

  private async openAlexDetail(doi: string, signal?: AbortSignal): Promise<PaperRecord | null> {
    const work = await this.openAlexWorkByDoi(doi, signal);
    return work ? parseOpenAlexWork(work) : null;
  }

  private async openAlexWorkByDoi(doi: string, signal?: AbortSignal): Promise<Record<string, unknown> | null> {
    const response = await this.request("openalex", { url: openAlexDetailUrl(doi, this.options.contactEmail()) }, signal);
    return asRecord(parseJson(response.text));
  }

  private async openAlexWorkByTitle(title: string, signal?: AbortSignal): Promise<Record<string, unknown> | null> {
    const response = await this.request("openalex", { url: openAlexTitleSearchUrl(title, this.options.contactEmail()) }, signal);
    return pickOpenAlexTitleMatch(asArray(asRecord(parseJson(response.text))?.results), title);
  }

  private async openAlexList(work: Record<string, unknown>, kind: PaperListKind, offset: number, limit: number, signal?: AbortSignal): Promise<PaperListPage> {
    const email = this.options.contactEmail();
    const workId = openAlexShortId(work.id);
    if (!workId) throw new PaperServiceError("Paper not found in OpenAlex.");

    if (kind === "references") {
      const all = asArray(work.referenced_works).map(openAlexShortId).filter(Boolean);
      const slice = all.slice(offset, offset + limit);
      const items: PaperRecord[] = [];
      // OpenAlex filters accept at most 50 OR-ed ids.
      for (let start = 0; start < slice.length; start += 50) {
        const chunk = slice.slice(start, start + 50);
        const body = asRecord(parseJson((await this.request("openalex", { url: openAlexWorksByIdsUrl(chunk, email) }, signal)).text));
        for (const row of asArray(body?.results)) {
          const parsed = parseOpenAlexWork(row);
          if (parsed) items.push(parsed);
        }
      }
      const end = offset + slice.length;
      return { items, source: "openalex", next: end < all.length ? end : null, total: all.length };
    }

    // OpenAlex pages are 1-based; use the requested limit as page size.
    const page = Math.floor(offset / limit) + 1;
    const body = asRecord(parseJson((await this.request("openalex", { url: openAlexCitingUrl(workId, page, limit, email) }, signal)).text));
    const items = asArray(body?.results).map(parseOpenAlexWork).filter((item): item is PaperRecord => item !== null);
    const count = Number(asRecord(body?.meta)?.count);
    const total = Number.isFinite(count) ? count : null;
    const nextOffset = offset + limit;
    return { items, source: "openalex", next: total !== null && nextOffset < total ? nextOffset : null, total };
  }

  private s2Headers(): Record<string, string> {
    const key = this.options.semanticScholarApiKey().trim();
    return key ? { "x-api-key": key } : {};
  }

  private minGap(service: string): number {
    if (service === "s2") return this.options.semanticScholarApiKey().trim() ? 1050 : 350;
    if (service === "arxiv") return 1000;
    return 120;
  }

  /** Serialize requests per service, keep a polite gap, and retry 429/5xx with backoff. */
  private request(
    service: string,
    request: { url: string; headers?: Record<string, string> },
    signal?: AbortSignal,
    retries = RETRY_DELAYS_MS.length,
  ): Promise<HttpResponse> {
    const previous = this.queues.get(service) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(async () => {
      for (let attempt = 0; ; attempt += 1) {
        throwIfAborted(signal);
        const wait = (this.lastRequestAt.get(service) ?? 0) + this.minGap(service) - this.options.now();
        if (wait > 0) await this.options.sleep(wait, signal);
        this.lastRequestAt.set(service, this.options.now());
        const headers = { Accept: service === "arxiv" ? ATOM_ACCEPT : JSON_ACCEPT, ...(request.headers ?? {}) };
        const response = await this.http({ url: request.url, method: "GET", headers });
        throwIfAborted(signal);
        if (response.status >= 200 && response.status < 300) return response;
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < Math.min(retries, RETRY_DELAYS_MS.length)) {
          await this.options.sleep(RETRY_DELAYS_MS[attempt], signal);
          continue;
        }
        if (response.status === 404) throw new PaperServiceError("Paper not found.", 404);
        if (response.status === 429) throw new PaperServiceError("The paper service is rate limiting requests. Try again in a minute.", 429);
        throw new PaperServiceError(`Paper service returned HTTP ${response.status}.`, response.status);
      }
    });
    this.queues.set(service, run);
    return run;
  }
}
