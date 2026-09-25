/**
 * Locate an abstract inside a paper note's Markdown (host-free). Used by the hover card when the
 * note has no abstract property. Mirrors the kplex-vault-organize skill's extraction rules.
 */

const TRANSLATED_HEAD = /^\s*#{1,6}\s*(?:摘要|abstract\s*\()/i;
const ABSTRACT_HEAD = /^\s*(?:#{1,6}\s*)?(?:abstract|摘要)\s*[:.]?\s*$/i;
const ABSTRACT_INLINE = /^\s*(?:>\s*)?(?:\*\*)?abstract(?:\*\*)?\s*[:.—-]\s*(.+)$/i;
const SECTION_START = /^\s*(?:#{1,6}\s+\S|(?:\d+|[IVX]+)\.?\s+[A-Z][A-Za-z ,:-]{2,60}$|(?:#{1,6}\s*)?(?:\d+\.?\s*)?introduction\s*$)/i;
const MAX_CHARS = 2400;

function sectionAfter(lines: readonly string[], start: number): string {
  const out: string[] = [];
  let size = 0;
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (out.length && SECTION_START.test(line)) break;
    const trimmed = line.trim().replace(/^>\s?/, "");
    if (trimmed) {
      out.push(trimmed);
      size += trimmed.length;
    } else if (out.length) {
      out.push("");
    }
    if (size >= MAX_CHARS) break;
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type ExtractedAbstract = { text: string; translated: boolean };

/**
 * A translated abstract section written by K-Plex (`## 摘要（…）` / `## Abstract (Language)`) is
 * preferred; then a labelled `Abstract` section or inline `Abstract: …` line in the first part of the note.
 */
export function extractAbstract(markdown: string): ExtractedAbstract | null {
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const lines = body.split(/\r?\n/).slice(0, 800);
  for (let index = 0; index < lines.length; index += 1) {
    if (TRANSLATED_HEAD.test(lines[index])) {
      const text = sectionAfter(lines, index + 1);
      if (text) return { text, translated: true };
    }
  }
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (ABSTRACT_HEAD.test(line)) {
      const text = sectionAfter(lines, index + 1);
      if (text) return { text, translated: false };
    }
    // Crawled abstract pages put the whole abstract on one "> Abstract: …" line; what follows is
    // page metadata (Comments, Subjects, …), so only that line is used.
    const inline = ABSTRACT_INLINE.exec(line);
    if (inline) return { text: inline[1].trim().slice(0, MAX_CHARS), translated: false };
  }
  return null;
}
