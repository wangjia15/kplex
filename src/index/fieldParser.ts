import type { App, CachedMetadata, TFile } from "obsidian";

export const normalizeFieldName = (name: string): string => name.toLowerCase().replace(/\s+/g, "-").trim();

const WIKI_LINK_RE = /\[\[([^\]#|]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
const MARKDOWN_LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;
const URL_RE = /\bhttps?:\/\/[^\s<>()\u005B\u005D{}"']+/gi;
const MARKDOWN_URL_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi;

export type ExternalUrlReference = {
  url: string;
  label?: string;
  line?: number;
};

export type InlineFieldOccurrence = {
  name: string;
  normalizedName: string;
  value: string;
  line: number;
  start: number;
  end: number;
  syntax: "line" | "parenthesized" | "bracketed";
};

export type ParsedBodyMetadata = {
  inlineFields: Record<string, unknown[]>;
  inlineFieldOccurrences: InlineFieldOccurrence[];
  urls: ExternalUrlReference[];
};

export type ParsedFileMetadata = {
  frontmatter: Record<string, unknown>;
  inlineFields: Record<string, unknown[]>;
  inlineFieldOccurrences: InlineFieldOccurrence[];
  aliases: string[];
  tags: string[];
  urls: ExternalUrlReference[];
};

function flattenValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(flattenValue);
  if (value === null || value === undefined) return [];
  return [value];
}

function stringifyTag(value: unknown): string[] {
  return flattenValue(value)
    .filter((v): v is string => typeof v === "string")
    .flatMap((v) => v.split(/[\s,]+/g))
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => v.startsWith("#") ? v : `#${v}`);
}

/**
 * CPU-only parser intentionally kept as one self-contained function. MetadataParser serializes
 * this exact function into its Web Worker, so worker and fallback behavior cannot drift.
 */
export function parseBodyMetadataCore(content: string): ParsedBodyMetadata {
  const normalize = (name: string): string => name.toLowerCase().replace(/\s+/g, "-").trim();
  const inlineFields: Record<string, unknown[]> = {};
  const inlineFieldOccurrences: InlineFieldOccurrence[] = [];
  const urls: ExternalUrlReference[] = [];
  const seenUrls = new Set<string>();

  const stripFieldFormatting = (raw: string): string => {
    let text = raw.trim().replace(/^[-*+]\s+/, "").trim();
    const wrappers: Array<[string, string]> = [["**", "**"], ["__", "__"], ["~~", "~~"], ["==", "=="], ["*", "*"], ["_", "_"]];
    let changed = true;
    while (changed) {
      changed = false;
      for (const [open, close] of wrappers) {
        if (text.startsWith(open) && text.endsWith(close) && text.length > open.length + close.length) {
          text = text.slice(open.length, -close.length).trim();
          changed = true;
          break;
        }
      }
    }
    return text;
  };

  const addField = (rawName: string, rawValue: string, syntax: InlineFieldOccurrence["syntax"], line: number, start: number, end: number): void => {
    const name = stripFieldFormatting(rawName);
    const normalizedName = normalize(name);
    const value = rawValue.trim();
    if (!normalizedName || !value || /[\[\]()]/.test(name)) return;
    inlineFields[normalizedName] ??= [];
    inlineFields[normalizedName].push(value);
    inlineFieldOccurrences.push({ name, normalizedName, value, syntax, line, start, end });
  };

  const maskInlineCode = (text: string): string => {
    const chars = [...text];
    let i = 0;
    while (i < chars.length) {
      if (chars[i] !== "`") { i += 1; continue; }
      let run = 1;
      while (chars[i + run] === "`") run += 1;
      const marker = "`".repeat(run);
      const close = text.indexOf(marker, i + run);
      if (close < 0) {
        for (let j = i; j < chars.length; j += 1) chars[j] = " ";
        break;
      }
      for (let j = i; j < close + run; j += 1) chars[j] = " ";
      i = close + run;
    }
    return chars.join("");
  };

  const balancedClose = (text: string, start: number, open: "(" | "[", close: ")" | "]"): number => {
    let depth = 0;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === "\\") { i += 1; continue; }
      if (ch === open) depth += 1;
      else if (ch === close) {
        depth -= 1;
        if (depth === 0) return i;
      }
    }
    return -1;
  };

  const lines = content.split(/\r?\n/);
  let offset = 0;
  let inFrontmatter = lines[0]?.trim() === "---";
  let frontmatterClosed = !inFrontmatter;
  let fence: string | null = null;
  let inHtmlComment = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const originalLine = lines[lineIndex];
    const trimmed = originalLine.trim();
    const lineNumber = lineIndex + 1;

    if (inFrontmatter && !frontmatterClosed) {
      if (lineIndex > 0 && (trimmed === "---" || trimmed === "...")) {
        frontmatterClosed = true;
        inFrontmatter = false;
      }
      offset += originalLine.length + 1;
      continue;
    }

    const fenceMatch = originalLine.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
      offset += originalLine.length + 1;
      continue;
    }
    if (fence) {
      offset += originalLine.length + 1;
      continue;
    }

    let visible = maskInlineCode(originalLine);
    if (inHtmlComment) {
      const end = visible.indexOf("-->");
      if (end < 0) { offset += originalLine.length + 1; continue; }
      visible = " ".repeat(end + 3) + visible.slice(end + 3);
      inHtmlComment = false;
    }
    for (;;) {
      const start = visible.indexOf("<!--");
      if (start < 0) break;
      const end = visible.indexOf("-->", start + 4);
      if (end < 0) {
        visible = visible.slice(0, start) + " ".repeat(visible.length - start);
        inHtmlComment = true;
        break;
      }
      visible = visible.slice(0, start) + " ".repeat(end + 3 - start) + visible.slice(end + 3);
    }

    const claimed: Array<[number, number]> = [];

    // Dataview's parenthesized and square-bracket inline forms can occur mid-sentence.
    for (let i = 0; i < visible.length; i += 1) {
      const open = visible[i];
      if (open !== "(" && open !== "[") continue;
      if (open === "[" && visible[i + 1] === "[") { i += 1; continue; }
      const close = open === "(" ? ")" : "]";
      const end = balancedClose(visible, i, open, close);
      if (end < 0) continue;
      const inside = visible.slice(i + 1, end);
      const separator = inside.indexOf("::");
      if (separator <= 0 || separator > 120) { i = end; continue; }
      const name = stripFieldFormatting(inside.slice(0, separator));
      if (!name || /[\[\]()]/.test(name)) { i = end; continue; }
      const valueStart = i + 1 + separator + 2;
      addField(name, originalLine.slice(valueStart, end), open === "(" ? "parenthesized" : "bracketed", lineNumber, offset + i, offset + end + 1);
      claimed.push([i, end + 1]);
      i = end;
    }

    // Full-line Dataview fields. List markers and Markdown emphasis around the key are accepted.
    const firstNonSpace = visible.search(/\S/);
    const firstClaimed = claimed.some(([start]) => start === firstNonSpace);
    if (!firstClaimed) {
      const full = visible.match(/^\s*(?:[-*+]\s+)?(.{1,120}?)::\s*(.*)$/);
      if (full) {
        const name = stripFieldFormatting(full[1]);
        if (name && !/[\[\]()]/.test(name)) {
          const separatorAt = visible.indexOf("::");
          const value = originalLine.slice(separatorAt + 2);
          addField(name, value, "line", lineNumber, offset + Math.max(0, firstNonSpace), offset + originalLine.length);
        }
      }
    }

    // External URLs use the same Markdown-aware exclusions as ontology parsing.
    const aliasByUrl = new Map<string, string>();
    const markdownUrlRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi;
    let markdownUrl: RegExpExecArray | null;
    while ((markdownUrl = markdownUrlRe.exec(visible)) !== null) {
      const raw = markdownUrl[2].trim().replace(/[.,;:!?]+$/, "");
      if (raw) aliasByUrl.set(raw, markdownUrl[1].trim());
    }
    const urlRe = /\bhttps?:\/\/[^\s<>()\[\]{}"']+/gi;
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = urlRe.exec(visible)) !== null) {
      const raw = urlMatch[0].replace(/[.,;:!?]+$/, "");
      if (!raw || seenUrls.has(raw)) continue;
      seenUrls.add(raw);
      const label = aliasByUrl.get(raw);
      urls.push(label ? { url: raw, label, line: lineNumber } : { url: raw, line: lineNumber });
    }

    offset += originalLine.length + 1;
  }

  return { inlineFields, inlineFieldOccurrences, urls };
}

export const parseBodyMetadata = (content: string): ParsedBodyMetadata => parseBodyMetadataCore(content);

export function mergeFileMetadata(cache: CachedMetadata | null, body: ParsedBodyMetadata): ParsedFileMetadata {
  const frontmatter = { ...(cache?.frontmatter ?? {}) } as Record<string, unknown>;
  delete frontmatter.position;

  const aliases = flattenValue(frontmatter.aliases ?? frontmatter.alias)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);

  const tags = new Set<string>();
  for (const tag of stringifyTag(frontmatter.tags ?? frontmatter.tag)) tags.add(tag);
  for (const item of cache?.tags ?? []) tags.add(item.tag);

  return {
    frontmatter,
    inlineFields: body.inlineFields,
    inlineFieldOccurrences: body.inlineFieldOccurrences,
    aliases,
    tags: [...tags],
    urls: body.urls,
  };
}

export function parseFileMetadata(cache: CachedMetadata | null, content: string): ParsedFileMetadata {
  return mergeFileMetadata(cache, parseBodyMetadata(content));
}

function resolveLink(app: App, raw: string, hostPath: string): string {
  let candidate = raw.trim();
  try { candidate = decodeURIComponent(candidate); } catch { /* keep raw */ }
  const hash = candidate.indexOf("#");
  if (hash >= 0) candidate = candidate.slice(0, hash);
  const dest = app.metadataCache.getFirstLinkpathDest(candidate, hostPath);
  return dest?.path ?? candidate;
}

export function extractLinksFromValue(app: App, value: unknown, file: TFile): string[] {
  const found = new Set<string>();

  const scan = (input: unknown): void => {
    if (Array.isArray(input)) { input.forEach(scan); return; }
    if (input && typeof input === "object") {
      for (const nested of Object.values(input as Record<string, unknown>)) scan(nested);
      return;
    }
    if (typeof input !== "string") return;

    WIKI_LINK_RE.lastIndex = 0;
    MARKDOWN_LINK_RE.lastIndex = 0;
    URL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WIKI_LINK_RE.exec(input)) !== null) found.add(resolveLink(app, m[1], file.path));
    while ((m = MARKDOWN_LINK_RE.exec(input)) !== null) {
      if (/^https?:\/\//i.test(m[1])) found.add(m[1]);
      else found.add(resolveLink(app, m[1], file.path));
    }
    while ((m = URL_RE.exec(input)) !== null) found.add(m[0].replace(/[.,;:!?]+$/, ""));
  };

  scan(value);
  return [...found].filter(Boolean);
}

export function getNormalizedFrontmatterValues(meta: ParsedFileMetadata, normalizedField: string): unknown[] {
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(meta.frontmatter)) {
    if (normalizeFieldName(key) === normalizedField) values.push(value);
  }
  return values;
}

export function getNormalizedInlineFieldValues(meta: ParsedFileMetadata, normalizedField: string): unknown[] {
  return meta.inlineFields[normalizedField] ? [...meta.inlineFields[normalizedField]] : [];
}

export function getInlineFieldOccurrences(meta: ParsedFileMetadata, normalizedField: string): InlineFieldOccurrence[] {
  return meta.inlineFieldOccurrences.filter((item) => item.normalizedName === normalizedField);
}

export function getNormalizedFieldValues(meta: ParsedFileMetadata, normalizedField: string): unknown[] {
  return [
    ...getNormalizedFrontmatterValues(meta, normalizedField),
    ...getNormalizedInlineFieldValues(meta, normalizedField),
  ];
}
