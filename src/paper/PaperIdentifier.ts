import type { PaperId } from "./PaperTypes";

const DOI_PATTERN = /\b(10\.\d{4,9}\/[^\s"'<>]+)/i;
const NEW_ARXIV_PATTERN = /^(\d{4}\.\d{4,5})(v\d+)?$/i;
const OLD_ARXIV_PATTERN = /^([a-z-]+(?:\.[a-z]{2})?\/\d{7})(v\d+)?$/i;
const S2_PATTERN = /^[0-9a-f]{40}$/i;

function trimDoi(raw: string): string {
  // Trailing sentence punctuation is almost never part of a DOI written in prose/properties.
  return raw.replace(/[.,;:)\]}]+$/, "").toLowerCase();
}

/** Parse a bare arXiv identifier (new or legacy style), dropping any version suffix. */
export function normalizeArxivId(raw: string): string | null {
  const value = raw.trim().replace(/^arxiv:\s*/i, "").replace(/\.pdf$/i, "");
  const modern = NEW_ARXIV_PATTERN.exec(value);
  if (modern) return modern[1];
  const legacy = OLD_ARXIV_PATTERN.exec(value);
  if (legacy) return legacy[1].toLowerCase();
  return null;
}

/**
 * Parse one property value, URL or free-text token into a paper identifier.
 * Accepts `10.x/y`, `doi:10.x/y`, `https://doi.org/…`, `arXiv:2104.09864`, `2104.09864v2`,
 * `https://arxiv.org/abs|pdf/…`, `https://www.semanticscholar.org/paper/<title>/<hash>` and the
 * arXiv DataCite DOI `10.48550/arXiv.<id>` (normalized to the arXiv id, which resolves better).
 */
export function parsePaperId(raw: string): PaperId | null {
  const value = raw.trim();
  if (!value) return null;

  let url: URL | null = null;
  if (/^https?:\/\//i.test(value)) {
    try {
      url = new URL(value);
    } catch {
      url = null;
    }
  }

  if (url) {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = decodeURIComponent(url.pathname);
    if (host === "arxiv.org" || host === "export.arxiv.org" || host.endsWith(".arxiv.org")) {
      const match = /^\/(?:abs|pdf|html)\/(.+?)\/?$/.exec(path);
      const id = match ? normalizeArxivId(match[1]) : null;
      return id ? { kind: "arxiv", value: id } : null;
    }
    if (host === "doi.org" || host === "dx.doi.org") {
      return parsePaperId(path.replace(/^\//, ""));
    }
    if (host === "semanticscholar.org" || host === "api.semanticscholar.org") {
      const last = path.split("/").filter(Boolean).pop() ?? "";
      return S2_PATTERN.test(last) ? { kind: "s2", value: last.toLowerCase() } : null;
    }
    const embedded = DOI_PATTERN.exec(path);
    return embedded ? parsePaperId(embedded[1]) : null;
  }

  const unprefixed = value.replace(/^doi:\s*/i, "");
  if (/^arxiv:/i.test(unprefixed) || NEW_ARXIV_PATTERN.test(unprefixed) || OLD_ARXIV_PATTERN.test(unprefixed)) {
    const id = normalizeArxivId(unprefixed);
    if (id) return { kind: "arxiv", value: id };
  }

  const doi = DOI_PATTERN.exec(unprefixed);
  if (doi && doi.index === 0) {
    const normalized = trimDoi(doi[1]);
    const arxivDoi = /^10\.48550\/arxiv\.(.+)$/i.exec(normalized);
    if (arxivDoi) {
      const id = normalizeArxivId(arxivDoi[1]);
      if (id) return { kind: "arxiv", value: id };
    }
    return { kind: "doi", value: normalized };
  }

  if (S2_PATTERN.test(unprefixed)) return { kind: "s2", value: unprefixed.toLowerCase() };
  return null;
}

/** Collect identifiers from an arbitrary frontmatter value (string, number, list). */
export function paperIdsFromValue(value: unknown): PaperId[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((item) => paperIdsFromValue(item));
  if (typeof value === "string") {
    const id = parsePaperId(value);
    return id ? [id] : [];
  }
  if (typeof value === "number") {
    const id = parsePaperId(String(value));
    return id ? [id] : [];
  }
  return [];
}

export function paperKey(id: PaperId): string {
  return `${id.kind}:${id.kind === "title" ? id.value.toLowerCase() : id.value}`;
}

/** Title lookup hint; whitespace-normalized, null when too short to match reliably. */
export function titlePaperId(title: string): PaperId | null {
  const value = title.replace(/\s+/g, " ").trim();
  return value.length >= 8 ? { kind: "title", value } : null;
}

/** True for http(s) links that do not already carry a DOI/arXiv id (e.g. a conference PDF). */
export function isOtherPaperLink(value: unknown): boolean {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim()) && parsePaperId(value) === null;
}

export function uniquePaperIds(ids: readonly PaperId[]): PaperId[] {
  const seen = new Set<string>();
  const output: PaperId[] = [];
  for (const id of ids) {
    const key = paperKey(id);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(id);
  }
  return output;
}

/** Prefer identifiers that resolve most reliably at Semantic Scholar. */
export function preferredPaperId(ids: readonly PaperId[]): PaperId | null {
  return ids.find((id) => id.kind === "arxiv")
    ?? ids.find((id) => id.kind === "doi")
    ?? ids.find((id) => id.kind === "s2")
    ?? ids.find((id) => id.kind === "title")
    ?? null;
}

export function paperIdUrl(id: PaperId): string {
  if (id.kind === "arxiv") return `https://arxiv.org/abs/${id.value}`;
  if (id.kind === "doi") return `https://doi.org/${id.value}`;
  if (id.kind === "title") return `https://www.semanticscholar.org/search?q=${encodeURIComponent(id.value)}`;
  return `https://www.semanticscholar.org/paper/${id.value}`;
}

/** Split the comma-separated `paperIdFields` setting into normalized property names. */
export function parseFieldList(raw: string): string[] {
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}
