/**
 * Reading content of one expanded heading section: highlighted passages (with their comments)
 * and embedded figures (with captions). Host-free and pure so it can be tested without Obsidian.
 *
 * Highlight syntax follows what Sidebar Highlights and Obsidian write into the note itself:
 * `==text==`, `<mark>`, `<span style="background…">` and `<font color>`, optionally followed by
 * inline `^[comment]` and footnote `[^id]` comments.
 */

export type SectionHighlight = {
  text: string;
  /** PDF selection target carried by the highlighted passage, when present. */
  linkTarget?: string;
  /** CSS colour from the markup, when one is given. */
  color: string | null;
  comments: string[];
  /** 0-based line relative to the section start. */
  line: number;
};

export type SectionFigureRef = {
  /** Link target as written: a vault link path or an external URL. */
  target: string;
  external: boolean;
  caption: string;
  alt: string;
  /** 0-based line relative to the section start. */
  line: number;
};

export type SectionContentRaw = {
  highlights: SectionHighlight[];
  figures: SectionFigureRef[];
};

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif", "tif", "tiff"]);
const CAPTION_START = /^(?:figure|fig\.?|table|tab\.?|图|表)\s*(?:[\dIVX]+|[一二三四五六七八九十]+)/i;
const PLACEHOLDER_ALT = /^(?:refer to caption|image|img|figure|picture|screenshot|alt text)$/i;

const FOOTNOTE_START = /^\[\^([^\]\s]+)\]:[ \t]*(.*)$/;
const FOOTNOTE_CONTINUATION = /^(?:\t| {4,})/;

/**
 * Collect footnote definitions (`[^id]: text`) from the whole note, since they live at its end.
 * Follows Obsidian (and Sidebar Highlights): indented lines continue a definition, and blank lines
 * continue it only when a further indented paragraph follows. Paragraph breaks are kept.
 */
export function collectFootnotes(content: string): Map<string, string> {
  const notes = new Map<string, string>();
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(FOOTNOTE_START);
    if (!match || !match[2].trim()) {
      i += 1;
      continue;
    }
    const parts = [match[2].trim()];
    let j = i + 1;
    while (j < lines.length) {
      if (FOOTNOTE_CONTINUATION.test(lines[j])) {
        parts.push(lines[j].replace(/^(?:\t| {1,4})/, ""));
        j += 1;
        continue;
      }
      if (!lines[j].trim()) {
        let k = j;
        while (k < lines.length && !lines[k].trim()) k += 1;
        if (k < lines.length && FOOTNOTE_CONTINUATION.test(lines[k])) {
          for (let blank = j; blank < k; blank += 1) parts.push("");
          j = k;
          continue;
        }
      }
      break;
    }
    notes.set(match[1], parts.join("\n"));
    i = j;
  }
  return notes;
}

/** Plain text for a comment, keeping its line and paragraph breaks. */
export function plainCommentText(value: string): string {
  return value
    .split("\n")
    .map((line) => plainInlineText(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Reduce inline Markdown/HTML to readable plain text for a quote. */
export function plainInlineText(value: string): string {
  return value
    .replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/!?\[\[([^\]]+)\]\]/g, (_, target: string) => target.split("#").pop() ?? target)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/(\*\*|__|~~|==)/g, "")
    .replace(/(^|\s)[*_](\S(?:.*?\S)?)[*_](?=\s|$|[.,;:!?)])/g, "$1$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#91;/g, "[").replace(/&#93;/g, "]").replace(/&#124;/g, "|")
    .replace(/\s+/g, " ")
    .trim();
}

function styleColor(attributes: string, properties: string[]): string | null {
  const style = attributes.match(/style\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
  for (const property of properties) {
    const match = style.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i"));
    if (match) return safeColor(match[1]);
  }
  return null;
}

/** Accept only plain colour values; never pass arbitrary CSS through. */
function safeColor(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim().replace(/\s*!important$/i, "");
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return trimmed;
  if (/^(?:rgb|rgba|hsl|hsla)\(\s*[\d.,%\s/]+\)$/i.test(trimmed)) return trimmed;
  if (/^[a-z]{3,20}$/i.test(trimmed) && !/^(?:inherit|initial|unset|transparent|none|currentcolor)$/i.test(trimmed)) return trimmed;
  return null;
}

/** Comments that immediately follow a highlight: `^[inline]` and `[^footnote]` references. */
function trailingComments(line: string, from: number, footnotes: ReadonlyMap<string, string>): string[] {
  const comments: string[] = [];
  let cursor = from;
  for (;;) {
    const rest = line.slice(cursor);
    const inline = rest.match(/^\s?\^\[([^\]]*)\]/);
    if (inline) {
      const text = plainInlineText(inline[1]);
      if (text) comments.push(text);
      cursor += inline[0].length;
      continue;
    }
    const reference = rest.match(/^\s?\[\^([^\]\s]+)\]/);
    if (reference) {
      const text = plainCommentText(footnotes.get(reference[1]) ?? "");
      if (text) comments.push(text);
      cursor += reference[0].length;
      continue;
    }
    return comments;
  }
}

/** Remove inline code spans so highlight markers inside them are ignored; keeps column offsets. */
function maskInlineCode(line: string): string {
  return line.replace(/`[^`\n]*`/g, (match) => " ".repeat(match.length));
}

/** Preserve a PDF anchor from a link inside the highlight for direct quote navigation. */
function pdfHighlightTarget(raw: string): string | undefined {
  const wiki = raw.match(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/);
  const markdown = raw.match(/\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))\s*\)/);
  const target = wiki?.[1] ?? markdown?.[1] ?? markdown?.[2];
  if (!target) return undefined;
  let decoded = target;
  try { decoded = decodeURIComponent(target); } catch { /* Keep a valid unencoded vault target. */ }
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return undefined;
  return decoded.includes("#") && decoded.split("#")[0].toLowerCase().endsWith(".pdf") ? decoded : undefined;
}

type Match = { start: number; end: number; text: string; color: string | null; linkTarget?: string };

function lineHighlights(line: string): Match[] {
  const masked = maskInlineCode(line);
  const found: Match[] = [];
  const push = (start: number, end: number, raw: string, color: string | null) => {
    if (found.some((item) => start < item.end && end > item.start)) return;
    const text = plainInlineText(raw);
    if (text) {
      const linkTarget = pdfHighlightTarget(raw);
      found.push({ start, end, text, color, ...(linkTarget ? { linkTarget } : {}) });
    }
  };
  for (const match of masked.matchAll(/<mark\b([^>]*)>(.*?)<\/mark>/gi)) {
    const start = match.index;
    push(start, start + match[0].length, line.slice(start, start + match[0].length).replace(/^<mark\b[^>]*>|<\/mark>$/gi, ""), styleColor(match[1], ["background-color", "background"]));
  }
  for (const match of masked.matchAll(/<span\b([^>]*)>(.*?)<\/span>/gi)) {
    const color = styleColor(match[1], ["background-color", "background"]);
    if (!color) continue;
    const start = match.index;
    push(start, start + match[0].length, line.slice(start, start + match[0].length).replace(/^<span\b[^>]*>|<\/span>$/gi, ""), color);
  }
  for (const match of masked.matchAll(/<font\b([^>]*)>(.*?)<\/font>/gi)) {
    const color = safeColor(match[1].match(/color\s*=\s*["']?([^"'\s>]+)/i)?.[1]);
    const start = match.index;
    push(start, start + match[0].length, line.slice(start, start + match[0].length).replace(/^<font\b[^>]*>|<\/font>$/gi, ""), color);
  }
  for (const match of masked.matchAll(/==(?=\S)(.+?)(?<=\S)==/g)) {
    const start = match.index;
    push(start, start + match[0].length, line.slice(start + 2, start + match[0].length - 2), null);
  }
  return found.sort((a, b) => a.start - b.start);
}

function isImageTarget(target: string, external: boolean): boolean {
  const clean = target.split(/[?#]/)[0];
  const ext = clean.includes(".") ? clean.slice(clean.lastIndexOf(".") + 1).toLowerCase() : "";
  if (IMAGE_EXTENSIONS.has(ext)) return true;
  // Remote Markdown images often have no extension (CDNs, arXiv figure endpoints).
  return external && ext !== "md" && ext !== "pdf" && ext !== "html";
}

function meaningfulAlt(alt: string, target: string): string {
  const text = plainInlineText(alt);
  if (!text || PLACEHOLDER_ALT.test(text) || /^\d+(?:x\d+)?$/.test(text)) return "";
  const base = target.split("/").pop()?.split(/[?#]/)[0] ?? "";
  if (text === base || text === base.replace(/\.[^.]+$/, "")) return "";
  return text;
}

/** A caption line directly below an image: "Figure 3: …", "图 2 …" or a fully italic line. */
function captionBelow(lines: string[], index: number): string {
  for (let i = index + 1; i < Math.min(lines.length, index + 3); i += 1) {
    const raw = lines[i].replace(/^\s*>\s?/, "").trim();
    if (!raw) continue;
    if (/^!\[|^#{1,6}\s/.test(raw)) return "";
    const plain = plainInlineText(raw);
    if (CAPTION_START.test(plain)) return plain;
    if (/^(\*|_)(?!\1).+\1$/.test(raw) || /^<figcaption>/i.test(raw)) return plain;
    return "";
  }
  return "";
}

/** PDF++ callout: header anchor, nested blockquote passage, then outer comment text. */
function pdfCallout(lines: string[], start: number): { highlight: SectionHighlight; end: number } | null {
  const header = lines[start].match(/^\s*>\s*\[!([^\]|]+)(?:\|([^\]]+))?\][+-]?\s*(.*)$/i);
  if (!header) return null;
  const linkTarget = pdfHighlightTarget(header[3]);
  if (header[1].toLowerCase() !== "pdf" && !linkTarget) return null;
  const quote: string[] = [];
  const comments: string[] = [];
  let end = start;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*>\s*\[!/.test(lines[i])) break;
    const outer = lines[i].match(/^\s*>\s?(.*)$/);
    if (!outer) break;
    end = i;
    const nested = outer[1].match(/^>\s?(.*)$/);
    if (nested) quote.push(nested[1]);
    else comments.push(outer[1]);
  }
  if (!quote.some((part) => part.trim())) return null;
  const comment = plainCommentText(comments.join("\n"));
  const name = header[2]?.trim().toLowerCase();
  const color = name && /^(?:yellow|red|green|blue|purple|orange|pink|cyan)$/.test(name) ? name : null;
  return { highlight: { text: plainInlineText(quote.join(" ")), color, comments: comment ? [comment] : [],
    line: start, ...(linkTarget ? { linkTarget } : {}) }, end };
}

export function extractSectionContent(sectionText: string, footnotes: ReadonlyMap<string, string> = new Map()): SectionContentRaw {
  const highlights: SectionHighlight[] = [];
  const figures: SectionFigureRef[] = [];
  const lines = sectionText.split(/\r?\n/);
  let fence: string | null = null;
  let inComment = false;
  let inFootnote = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      fence = fence === marker ? null : (fence ?? marker);
      continue;
    }
    if (fence) continue;
    // Obsidian %% comments are hidden from reading; skip their content.
    const commentMarks = (line.match(/%%/g) ?? []).length;
    if (inComment || (commentMarks % 2 === 1 && line.trim().startsWith("%%"))) {
      if (commentMarks % 2 === 1) inComment = !inComment;
      continue;
    }
    if (FOOTNOTE_START.test(line)) {
      inFootnote = true;
      continue;
    }
    if (inFootnote) {
      if (FOOTNOTE_CONTINUATION.test(line) || !line.trim()) continue;
      inFootnote = false;
    }

    const callout = pdfCallout(lines, index);
    if (callout) {
      highlights.push(callout.highlight);
      index = callout.end;
      continue;
    }

    for (const match of lineHighlights(line)) {
      highlights.push({ text: match.text, color: match.color, comments: trailingComments(line, match.end, footnotes), line: index, ...(match.linkTarget ? { linkTarget: match.linkTarget } : {}) });
    }

    for (const match of line.matchAll(/!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g)) {
      const target = match[1].trim();
      if (!isImageTarget(target, false)) continue;
      const alt = meaningfulAlt(match[2] ?? "", target);
      figures.push({ target, external: false, alt, caption: captionBelow(lines, index) || alt, line: index });
    }
    for (const match of line.matchAll(/!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+["']([^"']*)["'])?\s*\)/g)) {
      const target = (match[2] ?? match[3]).trim();
      const external = /^[a-z][a-z0-9+.-]*:\/\//i.test(target);
      if (!isImageTarget(target, external)) continue;
      const alt = meaningfulAlt(match[1], target) || meaningfulAlt(match[4] ?? "", target);
      figures.push({ target, external, alt, caption: captionBelow(lines, index) || alt, line: index });
    }
  }
  return { highlights, figures };
}
