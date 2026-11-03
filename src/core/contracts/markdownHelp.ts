/** Bounded inert-help safety profile. This is a lexical admission/neutralization boundary, not
 * a Markdown parser or renderer. The native host retains all Markdown syntax and lifecycle work.
 * Source is preserved; rendering never enables raw HTML, embeds, media or executable fences. */
export const MARKDOWN_HELP_LIMIT = 4096;

/** Ordinary explicit links use HTTPS or a local heading. Other targets are refused before
 * native rendering; reference-link definitions receive the same bounded lexical check. */
export function markdownHelpLinkTarget(value: string): boolean {
  if (/^#[A-Za-z0-9_%\p{L}\p{N}-]+$/u.test(value)) return true;
  const match = /^https:\/\/([^\s/\\<>"'`:@?#]+)(?::([0-9]{1,5}))?(?:[/?#][^\s\\<>"'`]*)?$/i.exec(value);
  return !!match && match[1].length <= 253 && (match[2] === undefined || Number(match[2]) <= 65535)
    && match[1].split(".").every(/** Explicit hostname labels exclude credentials, encoded authority and malformed empty labels. */ label => label.length <= 63
      && /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u.test(label));
}

/** Reject active/resource syntax rather than silently changing saved or imported source.
 * Plain headings/lists/emphasis/code/HTTPS links remain native Markdown-rendered content. */
export function validMarkdownHelp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MARKDOWN_HELP_LIMIT || /<(?:[A-Za-z][A-Za-z0-9:-]*[\s/>]|!|\/|\?)/.test(value)
    || /!\s*\[|&#|&(?:colon|tab|newline);/i.test(value)) return false;
  for (const character of value) {const code = character.charCodeAt(0);if (code < 32 && character !== "\n" && character !== "\r" && character !== "\t" || code === 127) return false;}
  for (const match of value.matchAll(/\]\s*\(\s*([^\s)]+)/g)) if (!markdownHelpLinkTarget(match[1])) return false;
  for (const match of value.matchAll(/(?:^|\n)[ \t]{0,3}\[[^\]\n]+\]:[ \t]*(\S+)/g)) if (!markdownHelpLinkTarget(match[1])) return false;
  return true;
}

/** Clear every fenced-code language before the native renderer sees it, preventing runnable
 * code-block processors. Neutralize inline expression prefixes without evaluating or parsing them.
 * The original source remains the stored/exported value; only a temporary presentation is changed. */
export function inertMarkdownHelpSource(value: string): string {
  if (!validMarkdownHelp(value)) throw new Error("Unsupported Markdown help content");
  return value.replace(/^([ \t]*)(`{3,}|~{3,})[^\r\n]*$/gm, "$1$2")
    .replace(/(`+)(?=\$?=)/g, "$1\u200b");
}
