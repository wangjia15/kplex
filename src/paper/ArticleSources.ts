import type { PaperRecord } from "./PaperTypes";

/**
 * Host-free helpers for importing a paper's full text. HTML parsing/conversion happens in the
 * Obsidian adapter; these functions decide sources, file names and placeholder substitution.
 */

/** Full-text HTML sources in preference order. arXiv's native HTML first, then ar5iv. */
export function articleSourceUrls(record: PaperRecord): string[] {
  const arxiv = record.ids.find((id) => id.kind === "arxiv");
  if (!arxiv) return [];
  return [`https://arxiv.org/html/${arxiv.value}`, `https://ar5iv.labs.arxiv.org/html/${arxiv.value}`];
}

/** Page to open for manual clipping (for example with Obsidian Web Clipper). */
export function articleBrowserUrl(record: PaperRecord): string {
  const [html] = articleSourceUrls(record);
  if (html) return html;
  const doi = record.ids.find((id) => id.kind === "doi");
  if (doi) return `https://doi.org/${doi.value}`;
  return record.url || record.pdfUrl;
}

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i;
const UNSAFE = /[\\/:*?"<>|#^[\]{}\s]+/g;

/** Short, filesystem-safe prefix for a paper's images (for example `2403.13298`). */
export function imagePrefix(record: PaperRecord, fallback: string): string {
  const id = record.ids.find((candidate) => candidate.kind === "arxiv" || candidate.kind === "doi");
  const raw = id ? id.value : fallback;
  return raw.replace(UNSAFE, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "paper";
}

/** Vault file name for a downloaded image: `<prefix>-<basename>.<ext>`. */
export function articleImageName(prefix: string, imageUrl: string, index: number, contentType = ""): string {
  let base = "";
  try {
    base = decodeURIComponent(new URL(imageUrl).pathname.split("/").pop() ?? "");
  } catch {
    base = "";
  }
  base = base.replace(UNSAFE, "-");
  if (!IMAGE_EXTENSION.test(base)) {
    const ext = (/image\/(png|jpe?g|gif|webp|svg|avif|bmp)/i.exec(contentType)?.[1] ?? "png").toLowerCase().replace("jpeg", "jpg");
    base = `${base || `figure-${index + 1}`}.${ext}`;
  }
  return `${prefix}-${base}`.slice(0, 120);
}

/** Placeholder tokens survive HTML→Markdown escaping (letters and digits only). */
export const mathToken = (index: number) => `KPLEXMATH${index}X`;
export const imageToken = (index: number) => `KPLEXIMG${index}X`;

/** Replace placeholder tokens after conversion. Unknown tokens are removed. */
export function replaceTokens(markdown: string, math: readonly string[], images: readonly string[]): string {
  return markdown
    .replace(/KPLEXMATH(\d+)X/g, (_match, index: string) => math[Number(index)] ?? "")
    .replace(/KPLEXIMG(\d+)X/g, (_match, index: string) => images[Number(index)] ?? "");
}

/** LaTeX for a formula: inline `$…$`, or a display block on its own lines. */
export function formatMath(tex: string, display: boolean): string {
  const clean = tex.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return display ? `\n\n$$\n${clean}\n$$\n\n` : `$${clean}$`;
}

/** Tidy converter output: collapse runs of blank lines and trim. */
export function tidyMarkdown(markdown: string): string {
  return markdown.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
