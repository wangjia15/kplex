import { paperKey, parsePaperId, uniquePaperIds } from "../PaperIdentifier";
import type { PaperId, PaperRecord } from "../PaperTypes";
import { asArray, asNumber, asRecord, asString } from "./json";

export const OPENALEX_BASE = "https://api.openalex.org";
export const OPENALEX_SELECT = "id,doi,title,publication_year,authorships,primary_location,cited_by_count,referenced_works_count,abstract_inverted_index,ids,open_access";

function withMailto(url: string, email: string): string {
  return email ? `${url}&mailto=${encodeURIComponent(email)}` : url;
}

export function openAlexDetailUrl(doi: string, email: string): string {
  return withMailto(`${OPENALEX_BASE}/works/doi:${encodeURI(doi)}?select=${OPENALEX_SELECT},referenced_works`, email);
}

export function openAlexWorksByIdsUrl(ids: readonly string[], email: string): string {
  return withMailto(`${OPENALEX_BASE}/works?filter=openalex:${ids.join("|")}&per-page=${ids.length}&select=${OPENALEX_SELECT}`, email);
}

/** Title search; OpenAlex's search syntax treats ":" and "," as operators, so strip them. */
export function openAlexTitleSearchUrl(title: string, email: string): string {
  const query = title.replace(/[:,|"()]/g, " ").replace(/\s+/g, " ").trim();
  return withMailto(`${OPENALEX_BASE}/works?filter=title.search:${encodeURIComponent(query)}&per-page=5&select=${OPENALEX_SELECT},referenced_works`, email);
}

const normalizeTitle = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Best title-search result: the normalized titles must match (or one must extend the other, for
 * truncated vault titles); among matches prefer the version with the most references.
 */
export function pickOpenAlexTitleMatch(results: readonly unknown[], title: string): Record<string, unknown> | null {
  const wanted = normalizeTitle(title);
  if (wanted.length < 8) return null;
  let best: Record<string, unknown> | null = null;
  let bestReferences = -1;
  for (const raw of results) {
    const work = asRecord(raw);
    const candidate = normalizeTitle(asString(work?.title));
    if (!work || !candidate) continue;
    if (candidate !== wanted && !candidate.startsWith(wanted) && !wanted.startsWith(candidate)) continue;
    const references = asNumber(work.referenced_works_count) ?? asArray(work.referenced_works).length;
    if (references > bestReferences) {
      best = work;
      bestReferences = references;
    }
  }
  return best;
}

export function openAlexCitingUrl(workId: string, page: number, perPage: number, email: string): string {
  return withMailto(`${OPENALEX_BASE}/works?filter=cites:${workId}&sort=cited_by_count:desc&per-page=${perPage}&page=${page}&select=${OPENALEX_SELECT}`, email);
}

/** Rebuild plain text from OpenAlex's `abstract_inverted_index`. */
export function openAlexAbstract(index: unknown): string {
  const record = asRecord(index);
  if (!record) return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(record)) {
    for (const position of asArray(positions)) {
      const at = asNumber(position);
      if (at !== null && at >= 0 && at < 100000) words[at] = word;
    }
  }
  return words.filter((word) => word !== undefined).join(" ");
}

/** Short OpenAlex work id (`W123`) from a full `https://openalex.org/W123` URL. */
export function openAlexShortId(value: unknown): string {
  const text = asString(value);
  const match = /(W\d+)$/.exec(text);
  return match ? match[1] : "";
}

export function parseOpenAlexWork(raw: unknown): PaperRecord | null {
  const work = asRecord(raw);
  if (!work) return null;
  const title = asString(work.title).trim();
  if (!title) return null;

  const ids: PaperId[] = [];
  const doi = parsePaperId(asString(work.doi));
  if (doi) ids.push(doi);
  const arxiv = asString(asRecord(work.ids)?.arxiv);
  if (arxiv) {
    const parsed = parsePaperId(arxiv);
    if (parsed) ids.push(parsed);
  }
  const unique = uniquePaperIds(ids);
  const location = asRecord(work.primary_location);
  const venue = asString(asRecord(location?.source)?.display_name);
  const authors = asArray(work.authorships)
    .map((entry) => asString(asRecord(asRecord(entry)?.author)?.display_name).trim())
    .filter(Boolean);
  const shortId = openAlexShortId(work.id);

  return {
    key: unique.length ? paperKey(unique[0]) : `openalex:${shortId || title.toLowerCase()}`,
    ids: unique,
    title,
    authors,
    year: asNumber(work.publication_year),
    venue,
    abstract: openAlexAbstract(work.abstract_inverted_index),
    tldr: "",
    citationCount: asNumber(work.cited_by_count),
    referenceCount: asNumber(work.referenced_works_count),
    url: asString(work.doi) || asString(work.id),
    pdfUrl: asString(asRecord(work.open_access)?.oa_url),
    source: "openalex",
  };
}
