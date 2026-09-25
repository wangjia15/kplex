import type { PaperRecord } from "../PaperTypes";

export function arxivQueryUrl(id: string): string {
  return `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}&max_results=1`;
}

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

const collapse = (text: string) => decodeXml(text).replace(/\s+/g, " ").trim();

function tag(entry: string, name: string): string {
  const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(entry);
  return match ? collapse(match[1]) : "";
}

/**
 * Parse the first `<entry>` of an arXiv Atom feed. The Atom subset used here is small and
 * regular, so a tag scanner avoids depending on a host DOMParser.
 */
export function parseArxivFeed(xml: string, id: string): PaperRecord | null {
  const entryMatch = /<entry>([\s\S]*?)<\/entry>/.exec(xml);
  if (!entryMatch) return null;
  const entry = entryMatch[1];
  const title = tag(entry, "title");
  // arXiv reports unknown ids as an entry titled "Error".
  if (!title || title === "Error") return null;
  const authors = [...entry.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)].map((match) => collapse(match[1]));
  const published = tag(entry, "published");
  const year = /^\d{4}/.test(published) ? Number(published.slice(0, 4)) : null;
  const pdf = /<link[^>]*title="pdf"[^>]*href="([^"]+)"/.exec(entry)?.[1]
    ?? /<link[^>]*href="([^"]+)"[^>]*title="pdf"/.exec(entry)?.[1]
    ?? "";
  const doi = tag(entry, "arxiv:doi");
  const ids: PaperRecord["ids"] = [{ kind: "arxiv", value: id }];
  if (doi) ids.push({ kind: "doi", value: doi.toLowerCase() });
  return {
    key: `arxiv:${id}`,
    ids,
    title,
    authors,
    year,
    venue: tag(entry, "arxiv:journal_ref") || "arXiv",
    abstract: tag(entry, "summary"),
    tldr: "",
    citationCount: null,
    referenceCount: null,
    url: `https://arxiv.org/abs/${id}`,
    pdfUrl: pdf,
    source: "arxiv",
  };
}
