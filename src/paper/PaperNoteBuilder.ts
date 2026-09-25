import type { PaperRecord } from "./PaperTypes";
import type { TranslationResult } from "./translation/TranslationService";
import { TRANSLATION_LANGUAGES } from "./translation/TranslationTypes";

export type AbstractNoteFormat = "sections" | "bilingual" | "translation";

const MAX_AUTHORS = 12;
const MAX_STEM_LENGTH = 90;
// Characters Obsidian/most filesystems reject in names, plus link-syntax characters.
const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|#^[\]{}]/g;

function lastName(author: string): string {
  const parts = author.trim().split(/\s+/);
  return parts.length ? parts[parts.length - 1] : "";
}

/** `Vaswani 2017 - Attention Is All You Need`, sanitized and length-limited. */
export function paperFileStem(record: PaperRecord): string {
  const author = record.authors.length ? lastName(record.authors[0]) : "";
  const prefix = [author, record.year ? String(record.year) : ""].filter(Boolean).join(" ");
  const title = record.title.replace(/\s+/g, " ").trim();
  const raw = prefix ? `${prefix} - ${title}` : title;
  let stem = raw.replace(UNSAFE_FILENAME_CHARS, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "");
  if (stem.length > MAX_STEM_LENGTH) {
    const cut = stem.slice(0, MAX_STEM_LENGTH);
    const space = cut.lastIndexOf(" ");
    stem = (space > MAX_STEM_LENGTH / 2 ? cut.slice(0, space) : cut).trim();
  }
  return stem || "Untitled paper";
}

/** Next free `stem`, `stem (2)`, `stem (3)`… given a predicate for existing stems. */
export function uniqueStem(stem: string, exists: (candidate: string) => boolean): string {
  if (!exists(stem)) return stem;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${stem} (${index})`;
    if (!exists(candidate)) return candidate;
  }
  return `${stem} (${Date.now()})`;
}

export function languageLabel(target: string): string {
  return TRANSLATION_LANGUAGES[target] ?? target;
}

export function translationHeading(target: string): string {
  const label = languageLabel(target);
  return target.startsWith("zh") ? `摘要（${label}）` : `Abstract (${label})`;
}

/** Frontmatter properties for a newly imported paper note (relationship fields are written separately). */
export function paperFrontmatter(record: PaperRecord, noteTypeField: string, noteType: string): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    title: record.title,
    aliases: [record.title],
  };
  if (record.authors.length) {
    properties.authors = record.authors.length > MAX_AUTHORS
      ? [...record.authors.slice(0, MAX_AUTHORS), "et al."]
      : [...record.authors];
  }
  if (record.year) properties.year = record.year;
  if (record.venue) properties.venue = record.venue;
  const doi = record.ids.find((id) => id.kind === "doi");
  const arxiv = record.ids.find((id) => id.kind === "arxiv");
  if (doi) properties.doi = doi.value;
  if (arxiv) properties.arxiv = arxiv.value;
  const url = arxiv ? `https://arxiv.org/abs/${arxiv.value}` : doi ? `https://doi.org/${doi.value}` : record.url;
  if (url) properties.url = url;
  if (record.pdfUrl) properties.pdf = record.pdfUrl;
  if (record.citationCount !== null) properties.citations = record.citationCount;
  if (noteTypeField.trim() && noteType.trim()) properties[noteTypeField.trim()] = noteType.trim();
  return properties;
}

/**
 * Paper properties an existing note does not have yet (compared case-insensitively). Existing
 * values, including the user's own title and style property, are never overwritten.
 */
export function missingPaperProperties(existing: Record<string, unknown>, record: PaperRecord): Record<string, unknown> {
  const present = new Set(Object.keys(existing).map((key) => key.trim().toLowerCase()));
  const candidate = paperFrontmatter(record, "", "");
  delete candidate.aliases;
  // A DOI/arXiv id already stored under another identifier property still counts as present.
  if (present.has("doi") || present.has("arxiv")) {
    delete candidate.doi;
    delete candidate.arxiv;
  }
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (!present.has(key.toLowerCase())) output[key] = value;
  }
  return output;
}

function paragraphsOf(result: TranslationResult): Map<number, { source: string[]; target: string[] }> {
  const paragraphs = new Map<number, { source: string[]; target: string[] }>();
  for (const segment of result.segments) {
    const entry = paragraphs.get(segment.paragraph) ?? { source: [], target: [] };
    entry.source.push(segment.source);
    if (segment.target) entry.target.push(segment.target);
    paragraphs.set(segment.paragraph, entry);
  }
  return paragraphs;
}

/** CJK sentences are joined without spaces; other languages use a single space. */
export function sentenceJoiner(target: string): string {
  return /^(zh|ja)/.test(target) ? "" : " ";
}

export function translatedParagraphs(result: TranslationResult, target: string): string[] {
  const joiner = sentenceJoiner(target);
  return [...paragraphsOf(result).values()].map((paragraph) => paragraph.target.join(joiner)).filter(Boolean);
}

/**
 * Markdown for the abstract section(s).
 * - `sections`: `## Abstract` then a separate translated heading.
 * - `bilingual`: one `## Abstract` where every sentence is followed by its translation as a quote.
 * - `translation`: only the translated section (falls back to the original when untranslated).
 */
export function abstractMarkdown(
  abstract: string,
  translation: TranslationResult | null,
  format: AbstractNoteFormat,
  target: string,
): string {
  const text = abstract.trim();
  if (!text) return "";
  if (!translation) return `## Abstract\n\n${text}\n`;
  if (format === "translation") return `## ${translationHeading(target)}\n\n${translatedParagraphs(translation, target).join("\n\n")}\n`;
  if (format === "bilingual") {
    const blocks = translation.segments.map((segment) =>
      segment.target ? `${segment.source}\n> ${segment.target.replace(/\n+/g, " ")}` : segment.source);
    return `## Abstract\n\n${blocks.join("\n\n")}\n`;
  }
  return `## Abstract\n\n${text}\n\n## ${translationHeading(target)}\n\n${translatedParagraphs(translation, target).join("\n\n")}\n`;
}

function hasHeading(markdown: string, heading: string): boolean {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^#{1,6}\\s+${escaped}\\s*$`, "im").test(markdown);
}

/**
 * Append missing abstract/translation sections to an existing note. Existing headings are left
 * untouched so repeated saves never duplicate content. Returns null when nothing changes.
 */
export function appendAbstractSections(
  markdown: string,
  abstract: string,
  translation: TranslationResult | null,
  format: AbstractNoteFormat,
  target: string,
): string | null {
  const hasAbstract = hasHeading(markdown, "Abstract");
  const heading = translationHeading(target);
  let addition = "";
  if (format === "translation" && translation) {
    if (!hasHeading(markdown, heading)) addition = abstractMarkdown(abstract, translation, format, target);
  } else if (!hasAbstract) {
    addition = abstractMarkdown(abstract, translation, format, target);
  } else if (translation && format === "sections" && !hasHeading(markdown, heading)) {
    addition = `## ${heading}\n\n${translatedParagraphs(translation, target).join("\n\n")}\n`;
  }
  if (!addition) return null;
  const separator = markdown.length === 0 ? "" : markdown.endsWith("\n\n") ? "" : markdown.endsWith("\n") ? "\n" : "\n\n";
  return `${markdown}${separator}${addition}`;
}

export function paperNoteBody(
  record: PaperRecord,
  translation: TranslationResult | null,
  format: AbstractNoteFormat,
  target: string,
): string {
  const parts: string[] = [];
  if (record.tldr) parts.push(`> [!summary] TL;DR\n> ${record.tldr}\n`);
  const abstract = abstractMarkdown(record.abstract, translation, format, target);
  if (abstract) parts.push(abstract);
  return parts.join("\n");
}
