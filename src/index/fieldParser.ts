import type { App, CachedMetadata, TFile } from "obsidian";

export const normalizeFieldName = (name: string): string => name.toLowerCase().replaceAll(" ", "-").trim();

const WIKI_LINK_RE = /\[\[([^\]#|]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
const MARKDOWN_LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;
const URL_RE = /\bhttps?:\/\/[^\s<>()\[\]{}"']+/gi;
const MARKDOWN_URL_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi;

export type ExternalUrlReference = {
  url: string;
  label?: string;
};

export type ParsedBodyMetadata = {
  inlineFields: Record<string, unknown[]>;
  urls: ExternalUrlReference[];
};

export type ParsedFileMetadata = {
  frontmatter: Record<string, unknown>;
  inlineFields: Record<string, unknown[]>;
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

export function parseBodyMetadata(content: string): ParsedBodyMetadata {
  const inlineFields: Record<string, unknown[]> = {};
  // Dataview inline fields. This intentionally supports the common full-line and inline forms.
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/(?:^|\s)([^:\n][^:\n]{0,80}?)::\s*(.+)$/);
    if (!match) continue;
    const key = normalizeFieldName(match[1].trim());
    if (!key) continue;
    inlineFields[key] ??= [];
    inlineFields[key].push(match[2].trim());
  }

  // External URLs are body-derived and expensive to rediscover on every startup. Keep their
  // markdown labels with the parsed body metadata so this portion can be cached independently
  // of Obsidian's frontmatter/tag metadata cache.
  const aliases = new Map<string, string>();
  MARKDOWN_URL_RE.lastIndex = 0;
  for (const match of content.matchAll(MARKDOWN_URL_RE)) {
    const raw = match[2].trim().replace(/[.,;:!?]+$/, "");
    if (raw) aliases.set(raw, match[1].trim());
  }

  const urls: ExternalUrlReference[] = [];
  const seen = new Set<string>();
  URL_RE.lastIndex = 0;
  for (const match of content.matchAll(URL_RE)) {
    const raw = match[0].replace(/[.,;:!?]+$/, "");
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    const label = aliases.get(raw);
    urls.push(label ? { url: raw, label } : { url: raw });
  }

  return { inlineFields, urls };
}

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

export function getNormalizedFieldValues(meta: ParsedFileMetadata, normalizedField: string): unknown[] {
  return [
    ...getNormalizedFrontmatterValues(meta, normalizedField),
    ...getNormalizedInlineFieldValues(meta, normalizedField),
  ];
}
