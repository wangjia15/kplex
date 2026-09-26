/**
 * Split annotation text into plain runs and LaTeX formulas. Host-free so the rules can be tested
 * without Obsidian; rendering lives in MathText.tsx.
 */

type Segment = { math: false; value: string } | { math: true; value: string; display: boolean };

// Obsidian's own rule: `$$…$$` is a display formula, and `$…$` is inline only when the dollars hug
// the formula, so prices such as "$5 and $6 per run" stay ordinary text.
const MATH_PATTERN = /\$\$([\s\S]+?)\$\$|\$(?!\s)([^$\n]+?)(?<!\s)\$/g;

/** Split annotation text into plain runs and the formulas written between dollar signs. */
export function splitMath(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(MATH_PATTERN)) {
    const source = (match[1] ?? match[2] ?? "").trim();
    if (!source) continue;
    if (match.index > cursor) segments.push({ math: false, value: text.slice(cursor, match.index) });
    segments.push({ math: true, value: source, display: match[1] !== undefined });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) segments.push({ math: false, value: text.slice(cursor) });
  return segments;
}

export function containsMath(text: string): boolean {
  return splitMath(text).some((segment) => segment.math);
}

