import { paperKey, parsePaperId, uniquePaperIds } from "../PaperIdentifier";
import type { PaperId, PaperListKind, PaperListPage, PaperRecord } from "../PaperTypes";
import { asArray, asNumber, asRecord, asString, parseJson } from "./json";

export const S2_BASE = "https://api.semanticscholar.org/graph/v1";
const DETAIL_FIELDS = "title,authors,year,venue,abstract,tldr,citationCount,referenceCount,externalIds,url,openAccessPdf";
const LIST_FIELDS = "title,authors,year,venue,citationCount,referenceCount,externalIds,url";

export function s2PaperRef(id: PaperId): string {
  if (id.kind === "arxiv") return `arXiv:${id.value}`;
  if (id.kind === "doi") return `DOI:${id.value}`;
  return id.value;
}

/** Best title match; used for notes that only have a title and a non-DOI/arXiv link. */
export function s2MatchUrl(title: string): string {
  return `${S2_BASE}/paper/search/match?query=${encodeURIComponent(title)}&fields=${DETAIL_FIELDS}`;
}

export function parseS2Match(text: string): PaperRecord | null {
  const first = asArray(asRecord(parseJson(text))?.data)[0];
  return parseS2Paper(first);
}

export function s2DetailUrl(id: PaperId): string {
  return `${S2_BASE}/paper/${encodeURIComponent(s2PaperRef(id))}?fields=${DETAIL_FIELDS}`;
}

export function s2ListUrl(id: PaperId, kind: PaperListKind, offset: number, limit: number): string {
  return `${S2_BASE}/paper/${encodeURIComponent(s2PaperRef(id))}/${kind}?fields=${LIST_FIELDS}&offset=${offset}&limit=${limit}`;
}

/** Convert one Semantic Scholar paper object into a PaperRecord, or null when it has no title. */
export function parseS2Paper(raw: unknown): PaperRecord | null {
  const paper = asRecord(raw);
  if (!paper) return null;
  const title = asString(paper.title).trim();
  if (!title) return null;

  const external = asRecord(paper.externalIds) ?? {};
  const ids: PaperId[] = [];
  const arxiv = asString(external.ArXiv);
  if (arxiv) {
    const parsed = parsePaperId(`arXiv:${arxiv}`);
    if (parsed) ids.push(parsed);
  }
  const doi = asString(external.DOI);
  if (doi) {
    const parsed = parsePaperId(doi);
    if (parsed) ids.push(parsed);
  }
  const s2 = asString(paper.paperId);
  if (s2) ids.push({ kind: "s2", value: s2.toLowerCase() });
  const unique = uniquePaperIds(ids);

  const authors = asArray(paper.authors)
    .map((author) => asString(asRecord(author)?.name).trim())
    .filter(Boolean);
  const tldr = asString(asRecord(paper.tldr)?.text);
  const pdf = asString(asRecord(paper.openAccessPdf)?.url);

  return {
    key: unique.length ? paperKey(unique[0]) : `title:${title.toLowerCase()}`,
    ids: unique,
    title,
    authors,
    year: asNumber(paper.year),
    venue: asString(paper.venue),
    abstract: asString(paper.abstract).trim(),
    tldr: tldr.trim(),
    citationCount: asNumber(paper.citationCount),
    referenceCount: asNumber(paper.referenceCount),
    url: asString(paper.url),
    pdfUrl: pdf,
    source: "semantic-scholar",
  };
}

export function parseS2List(text: string, kind: PaperListKind, offset: number, limit: number): PaperListPage {
  const body = asRecord(parseJson(text)) ?? {};
  const key = kind === "references" ? "citedPaper" : "citingPaper";
  const rows = asArray(body.data);
  const items = rows
    .map((row) => parseS2Paper(asRecord(row)?.[key]))
    .filter((item): item is PaperRecord => item !== null);
  const next = asNumber(body.next);
  return {
    items,
    source: "semantic-scholar",
    // S2 omits `next` at the end of the list. A short page also means the list is exhausted.
    next: next !== null ? next : rows.length >= limit ? offset + limit : null,
    total: null,
  };
}
