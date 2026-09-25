/**
 * Sentence splitting shared by every translation provider so the bilingual view is identical
 * regardless of which service produced the translation.
 */

export type SourceSentence = { text: string; paragraph: number };

export type TranslatedSegment = {
  source: string;
  target: string;
  /** Index of the source paragraph the segment belongs to. */
  paragraph: number;
};

/** Separator both Google and Bing preserve verbatim (single newlines are dropped by Bing). */
export const SEGMENT_SEPARATOR = "\n\n";

const PROTECTED_ENDINGS = /(?:\b(?:e\.g|i\.e|et al|cf|vs|etc|resp|approx|Fig|Figs|Eq|Eqs|Sec|Secs|Tab|Ref|Refs|No|Dr|Prof|Mr|Ms|Mrs|St|Jr|Sr)\.|\b[A-Z]\.)\s*$/;

function fallbackSplit(paragraph: string): string[] {
  const parts: string[] = [];
  let start = 0;
  const pattern = /[.!?](?:["')\]]*)\s+(?=[A-Z0-9("[])/g;
  for (let match = pattern.exec(paragraph); match; match = pattern.exec(paragraph)) {
    const end = match.index + match[0].length;
    parts.push(paragraph.slice(start, end));
    start = end;
  }
  if (start < paragraph.length) parts.push(paragraph.slice(start));
  return parts;
}

/** `Intl.Segmenter` is ES2022; the project compiles against ES2021 typings, so type it narrowly. */
type SentenceSegmenter = new (locale: string, options: { granularity: "sentence" }) => {
  segment(input: string): Iterable<{ segment: string }>;
};

function rawSegments(paragraph: string): string[] {
  const Segmenter = (Intl as { Segmenter?: SentenceSegmenter }).Segmenter;
  if (typeof Segmenter === "function") {
    const segmenter = new Segmenter("en", { granularity: "sentence" });
    return [...segmenter.segment(paragraph)].map((part) => part.segment);
  }
  return fallbackSplit(paragraph);
}

/** Split one paragraph into sentences, re-joining splits after common scholarly abbreviations. */
export function splitParagraph(paragraph: string): string[] {
  const merged: string[] = [];
  for (const piece of rawSegments(paragraph)) {
    const previous = merged.length ? merged[merged.length - 1] : null;
    if (previous !== null && PROTECTED_ENDINGS.test(previous)) merged[merged.length - 1] = previous + piece;
    else merged.push(piece);
  }
  return merged.map((sentence) => sentence.replace(/\s+/g, " ").trim()).filter(Boolean);
}

export function splitSentences(text: string): SourceSentence[] {
  const paragraphs = text.split(/\n\s*\n/).map((paragraph) => paragraph.replace(/\s+/g, " ").trim()).filter(Boolean);
  const output: SourceSentence[] = [];
  paragraphs.forEach((paragraph, index) => {
    for (const sentence of splitParagraph(paragraph)) output.push({ text: sentence, paragraph: index });
  });
  return output;
}

/** Pack sentences into request-sized chunks without splitting a sentence. */
export function chunkSentences(sentences: readonly SourceSentence[], maxChars: number): SourceSentence[][] {
  const chunks: SourceSentence[][] = [];
  let current: SourceSentence[] = [];
  let size = 0;
  for (const sentence of sentences) {
    const added = sentence.text.length + (current.length ? SEGMENT_SEPARATOR.length : 0);
    if (current.length && size + added > maxChars) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(sentence);
    size += sentence.text.length + (current.length > 1 ? SEGMENT_SEPARATOR.length : 0);
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export function splitTranslatedChunk(text: string): string[] {
  return text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}

/**
 * Pair a translated chunk with its source sentences. If the service merged or split sentences,
 * degrade that chunk to paragraph-level pairs instead of mis-pairing sentences.
 */
export function alignChunk(sources: readonly SourceSentence[], translated: string): { segments: TranslatedSegment[]; aligned: boolean } {
  const parts = splitTranslatedChunk(translated);
  if (parts.length === sources.length) {
    return {
      segments: sources.map((source, index) => ({ source: source.text, target: parts[index], paragraph: source.paragraph })),
      aligned: true,
    };
  }
  const byParagraph = new Map<number, string[]>();
  for (const source of sources) {
    const list = byParagraph.get(source.paragraph) ?? [];
    list.push(source.text);
    byParagraph.set(source.paragraph, list);
  }
  const paragraphs = [...byParagraph.entries()];
  const target = parts.join(" ");
  return {
    segments: paragraphs.map(([paragraph, texts], index) => ({
      source: texts.join(" "),
      // Without alignment the full translation is attached to the first paragraph of the chunk.
      target: index === 0 ? target : "",
      paragraph,
    })),
    aligned: false,
  };
}
