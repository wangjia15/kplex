import { paperKey, parsePaperId, uniquePaperIds } from "./PaperIdentifier";
import type { PaperId, PaperRecord } from "./PaperTypes";

/**
 * Offline reference extraction from a paper note's own text (for example a PDF converted to
 * Markdown). Used when online services have no reference list for a paper.
 */

const REFERENCE_HEADING = /^\s*(?:#{1,6}\s*)?(?:\d+\.?\s*)?(?:references|bibliography|works cited|参考文献)\s*:?\s*$/i;
const SECTION_END = /^\s*(?:#{1,6}\s*)?(?:(?:[A-Z]|\d+)[.:]?\s+)?(?:appendix|appendices|supplementary(?: material)?|checklist|neurips paper checklist)\b/i;
// "[1] …", "1. …", and Markdown list items such as "- \[1\] …" produced by HTML→Markdown.
const NUMBERED_ENTRY = /^\s*(?:[-*+]\s+)?(?:\\?\[(\d{1,4})\\?\]|(\d{1,4})\.\s)/;
const YEAR = /\b(19[5-9]\d|20\d{2})[a-z]?\b/g;
const ARXIV_IN_TEXT = /arxiv[:\s/,]*(?:abs\/)?(\d{4}\.\d{4,5})(?:v\d+)?/i;
/** An unnumbered entry usually ends with its year: "…, 2017." */
const ENTRY_END = /\b(?:19|20)\d{2}[a-z]?\.\s*$/;
/** Lines that continue the previous entry after its year (URLs, DOIs, wrapped URL fragments). */
const TRAILING_CONTINUATION = /^(?:URL\s|doi:|https?:\/\/|[\w./?=&%-]+\.(?:pdf|html?)\.?$|[0-9a-f]{12,}\S*$)/i;
const DOI_IN_TEXT = /\b(10\.\d{4,9}\/[^\s,;]+)/;
const MAX_SECTION_LINES = 4000;
const MAX_ENTRIES = 500;

/** Text of the last reference section in `markdown`, or null. */
export function extractReferenceSection(markdown: string): string | null {
  const lines = markdown.split(/\r?\n/);
  let start = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (REFERENCE_HEADING.test(lines[index])) {
      start = index + 1;
      break;
    }
  }
  if (start < 0) return null;
  const body: string[] = [];
  for (let index = start; index < lines.length && body.length < MAX_SECTION_LINES; index += 1) {
    const line = lines[index];
    // Stop at an appendix heading, but not at an entry that merely contains the word.
    if (SECTION_END.test(line) && !NUMBERED_ENTRY.test(line) && line.trim().length < 80) break;
    body.push(line);
  }
  const text = body.join("\n").trim();
  return text || null;
}

function joinLines(lines: readonly string[]): string {
  let output = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!output) {
      output = line;
    } else if (/[A-Za-z0-9]-$/.test(output) && /^[a-z]/.test(line)) {
      // PDF line breaks split words ("Min-\nderer" → "Minderer") but also real compounds
      // ("end-to-\nend", "vote2cap-\ndetr"). Keep the hyphen when the word already has one or a digit.
      const word = /(\S+)-$/.exec(output)?.[1] ?? "";
      output = /[-\d]/.test(word) ? output + line : output.slice(0, -1) + line;
    } else {
      output += ` ${line}`;
    }
  }
  return output;
}

/** Drop page numbers, page-break rules and the running header that follows a page break. */
function withoutPageNoise(lines: readonly string[]): string[] {
  const output: string[] = [];
  let afterBreak = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^-{3,}$|^\*{3,}$/.test(trimmed)) {
      afterBreak = true;
      continue;
    }
    if (/^\d{1,4}$/.test(trimmed)) continue;
    if (afterBreak && trimmed) {
      afterBreak = false;
      if (trimmed.length < 60 && !/[.,;:]/.test(trimmed)) continue;
    }
    output.push(line);
  }
  return output;
}

/** Unnumbered (author-year) lists: an entry ends at a line ending with its year. */
function splitByYearEndings(lines: readonly string[]): string[] {
  const entries: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!current.length && entries.length && TRAILING_CONTINUATION.test(trimmed)) {
      entries[entries.length - 1].push(trimmed);
      continue;
    }
    current.push(trimmed);
    if (ENTRY_END.test(trimmed)) {
      entries.push(current);
      current = [];
    }
  }
  if (current.length) entries.push(current);
  return entries.map(joinLines);
}

/** Split a reference section into entries: numbered (`[1]`, `1.`) or blank-line separated. */
export function splitReferenceEntries(section: string): string[] {
  const lines = withoutPageNoise(section.split(/\r?\n/));
  const numbered = lines.filter((line) => NUMBERED_ENTRY.test(line)).length;
  const entries: string[] = [];
  if (numbered >= 3) {
    let current: string[] = [];
    for (const line of lines) {
      if (NUMBERED_ENTRY.test(line)) {
        if (current.length) entries.push(joinLines(current));
        current = [line.replace(NUMBERED_ENTRY, "")];
      } else if (current.length) {
        current.push(line);
      }
    }
    if (current.length) entries.push(joinLines(current));
  } else if (lines.filter((line) => ENTRY_END.test(line.trim())).length >= 3) {
    entries.push(...splitByYearEndings(lines));
  } else {
    let current: string[] = [];
    for (const line of lines) {
      if (!line.trim()) {
        if (current.length) entries.push(joinLines(current));
        current = [];
      } else {
        current.push(line);
      }
    }
    if (current.length) entries.push(joinLines(current));
  }
  return entries.filter((entry) => entry.length >= 20).slice(0, MAX_ENTRIES);
}

/** True when the word before a period is an author initial / abbreviation, not a sentence end. */
function isAbbreviation(word: string): boolean {
  return /^(?:[A-Z]|[A-Z][a-z]|[A-Z]\.[A-Z]|al|et|vs|eds?|pp|vol|no|Proc|Conf|Int|Jr|Sr|St|Dr|Inc|Ltd)$/.test(word);
}

/** Split an entry at sentence-ending periods that are not initials/abbreviations. */
function sentences(entry: string): string[] {
  const parts: string[] = [];
  let start = 0;
  const pattern = /([.?!])\s+/g;
  for (let match = pattern.exec(entry); match; match = pattern.exec(entry)) {
    const before = entry.slice(start, match.index);
    const word = /([A-Za-z.]+)$/.exec(before)?.[1] ?? "";
    if (match[1] === "." && isAbbreviation(word.replace(/\.$/, ""))) continue;
    parts.push(entry.slice(start, match.index + 1).trim());
    start = match.index + match[0].length;
  }
  if (start < entry.length) parts.push(entry.slice(start).trim());
  return parts.filter(Boolean);
}

function splitAuthors(text: string): string[] {
  return text
    .replace(/\bet al\.?/g, "")
    .split(/,\s*(?:and\s+)?|\s+and\s+|;\s*|\s*&\s*/)
    .map((name) => name.trim().replace(/\.$/, ""))
    .filter((name) => name.length > 1 && /[A-Za-z]/.test(name))
    .slice(0, 20);
}

/** "Beyer, L., Izmailov, P., et al." → ["L. Beyer", "P. Izmailov"]. */
function splitLncsAuthors(text: string): string[] {
  const names: string[] = [];
  const pattern = /([^,]+?),\s*((?:[A-Z][a-z]?\.[-\s]?)+)/g;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const surname = match[1].replace(/^\s*(?:and|&)\s+/, "").trim();
    if (surname) names.push(`${match[2].trim()} ${surname}`);
  }
  return names.slice(0, 20);
}

/** Parse one reference entry into a title-level PaperRecord (ids when the entry cites them). */
export function parseReferenceEntry(entry: string): PaperRecord | null {
  const text = entry.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const ids: PaperId[] = [];
  const arxiv = ARXIV_IN_TEXT.exec(text);
  if (arxiv) {
    const id = parsePaperId(`arXiv:${arxiv[1]}`);
    if (id) ids.push(id);
  }
  const doi = DOI_IN_TEXT.exec(text);
  if (doi) {
    const id = parsePaperId(doi[1]);
    if (id) ids.push(id);
  }

  let authors: string[] = [];
  let title = "";
  let rest = "";
  // APA-like: "Authors (2020). Title. Venue."
  const apa = /^(.+?)\s*\((?:19|20)\d{2}[a-z]?\)\.?\s+(.+)$/.exec(text);
  // LNCS/Springer: "Beyer, L., Minderer, M.: Title. In: CVPR. pp. 1–2 (2023)"
  const lncs = /^(.{3,400}?\b[A-Z][a-z]?\.(?:,?\s*et al\.)?):\s+(.+)$/.exec(text);
  if (lncs && !apa?.[1].includes(":")) {
    authors = splitLncsAuthors(lncs[1]);
    const parts = sentences(lncs[2]);
    title = parts[0] ?? "";
    rest = parts.slice(1).join(" ");
  } else if (apa) {
    authors = splitAuthors(apa[1]);
    const parts = sentences(apa[2]);
    title = parts[0] ?? "";
    rest = parts.slice(1).join(" ");
  } else {
    // Numeric/IEEE/ACL-like: "Authors. Title. Venue, year."
    const parts = sentences(text);
    if (parts.length >= 2) {
      authors = splitAuthors(parts[0]);
      title = parts[1];
      rest = parts.slice(2).join(" ");
    } else {
      title = parts[0] ?? "";
    }
  }
  title = title.replace(/^["“'‘]+|["”'’]+$/g, "").replace(/[.,]$/, "").replace(/\s*\((?:19|20)\d{2}[a-z]?\)$/, "").trim();
  // Guard against author lists or venues mistaken for titles.
  if (title.length < 8 || /^(?:in|arxiv preprint|proceedings)\b/i.test(title)) return null;

  const years = [...text.matchAll(YEAR)].map((match) => Number(match[1]));
  const year = years.length ? years[years.length - 1] : null;
  const venue = rest.replace(YEAR, "").replace(/\b(?:pages?|pp\.)\s*[\d–-]+/gi, "").replace(/[,.\s]+$/, "").replace(/^[,.\s]+/, "").slice(0, 160);
  const unique = uniquePaperIds(ids);
  return {
    key: unique.length ? paperKey(unique[0]) : `title:${title.toLowerCase()}`,
    ids: unique,
    title,
    authors,
    year,
    venue,
    abstract: "",
    tldr: "",
    citationCount: null,
    referenceCount: null,
    url: "",
    pdfUrl: "",
    source: "note",
  };
}

/** All references parsed from a paper note, de-duplicated by key. */
export function referencesFromNote(markdown: string): PaperRecord[] {
  const section = extractReferenceSection(markdown);
  if (!section) return [];
  const seen = new Set<string>();
  const output: PaperRecord[] = [];
  for (const entry of splitReferenceEntries(section)) {
    const record = parseReferenceEntry(entry);
    if (!record || seen.has(record.key)) continue;
    seen.add(record.key);
    output.push(record);
  }
  return output;
}
