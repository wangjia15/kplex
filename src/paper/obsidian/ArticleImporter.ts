import { htmlToMarkdown, requestUrl, sanitizeHTMLToDom } from "obsidian";
import {
  articleSourceUrls,
  formatMath,
  imageToken,
  mathToken,
  replaceTokens,
  tidyMarkdown,
} from "../ArticleSources";
import { PaperServiceError, throwIfAborted, type PaperRecord } from "../PaperTypes";
import { obsidianHttp } from "./ObsidianHttp";

export type ConvertedArticle = {
  /** Page the HTML came from. */
  url: string;
  /** Markdown with image placeholders still in place. */
  markdown: string;
  /** Formula replacements, by placeholder index. */
  math: string[];
  /** Absolute image URLs and alt text, by placeholder index. */
  images: Array<{ url: string; alt: string }>;
};

// Page chrome that is not part of the article.
const REMOVE_SELECTORS = [
  "nav", "header.ltx_page_header", ".ltx_page_navbar", ".ltx_page_footer", ".ltx_TOC",
  ".ltx_role_footnote .ltx_tag", "button", "script", "style", "noscript", ".package-alerts", "#header", "#footer",
].join(", ");

/** Math in LaTeXML/MathML output carries its LaTeX source in `alttext`. */
function mathTex(element: Element): string {
  return element.getAttribute("alttext") ?? element.getAttribute("data-latex") ?? element.textContent ?? "";
}

/**
 * Convert full-text HTML (arXiv / ar5iv LaTeXML) to Markdown. Formulas and images become
 * placeholder tokens first so the HTML→Markdown converter cannot escape LaTeX or rewrite links.
 */
export function convertArticleHtml(html: string, pageUrl: string): ConvertedArticle {
  const fragment = sanitizeHTMLToDom(html);
  const root = fragment.querySelector("article.ltx_document")
    ?? fragment.querySelector("article")
    ?? fragment.querySelector("main")
    ?? fragment.querySelector(".ltx_page_content");
  if (!root) throw new PaperServiceError("The article page has no readable content.");

  root.querySelectorAll(REMOVE_SELECTORS).forEach((element) => element.remove());
  // In-page anchors (citations "[34]", equation refs) cannot be followed in a note: keep the text.
  root.querySelectorAll("a[href^='#']").forEach((anchor) => anchor.replaceWith(anchor.textContent ?? ""));
  // Icon-only links (ORCID badges and similar) become empty Markdown links.
  root.querySelectorAll("a").forEach((anchor) => {
    if (!(anchor.textContent ?? "").trim() && !anchor.querySelector("img")) anchor.remove();
  });
  // A line break inside a heading would split the Markdown heading.
  root.querySelectorAll("h1 br, h2 br, h3 br, h4 br, h5 br, h6 br").forEach((br) => br.replaceWith(" "));

  const math: string[] = [];
  // Display equations are laid out as tables; collapse each into one display block.
  root.querySelectorAll("table.ltx_equation, table.ltx_equationgroup, table.ltx_eqn_table").forEach((table) => {
    const parts = Array.from(table.querySelectorAll("math")).map(mathTex).filter(Boolean);
    if (!parts.length) return;
    math.push(formatMath(parts.join(" \\\\ "), true));
    table.replaceWith(mathToken(math.length - 1));
  });
  root.querySelectorAll("math").forEach((element) => {
    const tex = mathTex(element);
    math.push(formatMath(tex, element.getAttribute("display") === "block"));
    element.replaceWith(mathToken(math.length - 1));
  });

  const images: ConvertedArticle["images"] = [];
  root.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    if (!src || src.startsWith("data:")) {
      img.remove();
      return;
    }
    let absolute = "";
    try {
      absolute = new URL(src, pageUrl).href;
    } catch {
      img.remove();
      return;
    }
    const alt = (img.getAttribute("alt") ?? "").replace(/[[\]|]/g, " ").trim();
    images.push({ url: absolute, alt: alt === "Refer to caption" ? "" : alt });
    img.replaceWith(imageToken(images.length - 1));
  });

  return { url: pageUrl, markdown: htmlToMarkdown(root as HTMLElement), math, images };
}

/** Fetch and convert the first available full-text source for a paper. */
export async function fetchArticle(record: PaperRecord, signal?: AbortSignal): Promise<ConvertedArticle> {
  const sources = articleSourceUrls(record);
  if (!sources.length) throw new PaperServiceError("Full-text import currently supports arXiv papers. Use Web Clipper for other articles.");
  let lastError: Error = new PaperServiceError("No full-text version was found for this paper.");
  for (const url of sources) {
    throwIfAborted(signal);
    try {
      const response = await obsidianHttp({ url, headers: { Accept: "text/html" } });
      if (response.status < 200 || response.status >= 300) {
        lastError = new PaperServiceError(`The full-text page returned HTTP ${response.status}.`, response.status);
        continue;
      }
      return convertArticleHtml(response.text, url);
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
    }
  }
  throw lastError;
}

export type DownloadedImage = { data: ArrayBuffer; contentType: string };

/** Download one image; returns null for failures so one bad figure does not stop the import. */
export async function downloadImage(url: string): Promise<DownloadedImage | null> {
  try {
    const response = await requestUrl({ url, throw: false });
    if (response.status < 200 || response.status >= 300) return null;
    const contentType = response.headers["content-type"] ?? response.headers["Content-Type"] ?? "";
    if (contentType && !contentType.startsWith("image/")) return null;
    return { data: response.arrayBuffer, contentType };
  } catch {
    return null;
  }
}

export { replaceTokens, tidyMarkdown };
