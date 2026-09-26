// Section reading content: highlight quotes, comments and figure captions. Host-free parser only.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-section-content-test-"));

try {
  const sourcePath = join(root, "src/index/SectionContent.ts");
  const source = readFileSync(sourcePath, "utf8");
  assert(!/from\s+["']obsidian["']/.test(source), "SectionContent must stay host-free");
  const out = join(temp, "SectionContent.js");
  writeFileSync(out, ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, strict: true },
    fileName: sourcePath,
  }).outputText);
  const { extractSectionContent, collectFootnotes, plainInlineText } = require(out);

  const note = [
    "## Method",
    "We use ==a **sparse** mixture of [[Experts|experts]]==[^1] for routing.",
    "Plain text and <mark style=\"background: #ffd700;\">coloured passage</mark>^[inline note] here.",
    "Also <span style=\"background:yellow\">span highlight</span> and <font color=\"#835cf5\">font one</font>.",
    "Code `==not a highlight==` stays out.",
    "```",
    "==inside fence==",
    "![[ignored.png]]",
    "```",
    "%%",
    "==hidden comment==",
    "%%",
    "![[figs/arch.png|600]]",
    "Figure 1: Overall architecture.",
    "",
    "![Refer to caption](https://arxiv.org/html/x1.png)",
    "",
    "*Attention map of layer 3*",
    "![[diagram.svg|System diagram]]",
    "Next paragraph is not a caption.",
    "![[notes.md]]",
    "![](<images/my plot.jpg>)",
    "图 2 训练曲线",
    "",
    "[^1]: Footnote comment",
    "    continued here",
    "",
    "    Second **paragraph** after a blank line.",
    "",
    "Unindented text ends the footnote with ==its own highlight==.",
  ].join("\n");
  const footnotes = collectFootnotes(note);
  assert.equal(footnotes.get("1"), "Footnote comment\ncontinued here\n\nSecond **paragraph** after a blank line.");

  const { highlights, figures } = extractSectionContent(note, footnotes);
  assert.deepEqual(highlights.map((item) => item.text), [
    "a sparse mixture of experts",
    "coloured passage",
    "span highlight",
    "font one",
    "its own highlight",
  ]);
  assert.deepEqual(highlights[0].comments, ["Footnote comment\ncontinued here\n\nSecond paragraph after a blank line."]);
  assert.equal(highlights[0].line, 1);
  assert.equal(highlights[1].color, "#ffd700");
  assert.deepEqual(highlights[1].comments, ["inline note"]);
  assert.equal(highlights[2].color, "yellow");
  assert.equal(highlights[3].color, "#835cf5");

  assert.deepEqual(figures.map((item) => [item.target, item.external, item.caption]), [
    ["figs/arch.png", false, "Figure 1: Overall architecture."],
    ["https://arxiv.org/html/x1.png", true, "Attention map of layer 3"],
    ["diagram.svg", false, "System diagram"],
    ["images/my plot.jpg", false, "图 2 训练曲线"],
  ]);
  assert.equal(figures[0].line, 12);

  // Unsafe CSS in highlight markup is never passed through as a colour.
  const unsafe = extractSectionContent("<mark style=\"background: url(x)\">x</mark>");
  assert.equal(unsafe.highlights[0].color, null);
  assert.equal(plainInlineText("see [link](http://a) and `code`"), "see link and code");

  const pdfQuote = '<mark style="background-color: #ffd000">[[paper.pdf#page=1&selection=69,0,75,29&color=yellow|Result &#91;25&#93;]]</mark>[^pdf]';
  const pdfContent = extractSectionContent(pdfQuote, new Map([["pdf", "AI comment"]]));
  assert.equal(pdfContent.highlights[0].text, "Result [25]");
  assert.equal(pdfContent.highlights[0].linkTarget, "paper.pdf#page=1&selection=69,0,75,29&color=yellow");
  assert.deepEqual(pdfContent.highlights[0].comments, ["AI comment"]);
  const markdownPdf = extractSectionContent('<mark>[Result](<folder/my%20paper.pdf#page=2&selection=1,0,2,3>)</mark>');
  assert.equal(markdownPdf.highlights[0].linkTarget, "folder/my paper.pdf#page=2&selection=1,0,2,3");
  assert.equal(extractSectionContent('<mark>[[Note|Text]]</mark>').highlights[0].linkTarget, undefined);
  assert.equal(extractSectionContent('<mark>[Text](https://example.com/paper.pdf#page=1)</mark>').highlights[0].linkTarget, undefined);

  const nativeCallout = [
    '> [!PDF|note] [[paper.pdf#page=1&selection=87,0,144,23&color=note|paper, p.1]]',
    '> > Present in 3D scenes [31].',
    '> > Point clouds are irregular.',
    '>',
    '> **AI · method**：VoteNet uses PointNet++.',
    '',
    '## Next section',
    '==another highlight==',
  ].join("\n");
  const nativeContent = extractSectionContent(nativeCallout);
  assert.equal(nativeContent.highlights.length, 2);
  assert.equal(nativeContent.highlights[0].text, 'Present in 3D scenes [31]. Point clouds are irregular.');
  assert.equal(nativeContent.highlights[0].linkTarget, 'paper.pdf#page=1&selection=87,0,144,23&color=note');
  assert.deepEqual(nativeContent.highlights[0].comments, ['AI · method：VoteNet uses PointNet++.']);
  assert.equal(nativeContent.highlights[1].text, 'another highlight');
  const adjacent = extractSectionContent(nativeCallout.split('\n\n')[0] + '\n' + nativeCallout.split('\n\n')[0]);
  assert.equal(adjacent.highlights.length, 2);
  assert.equal(extractSectionContent('> [!NOTE] Ordinary note\n> > Quote').highlights.length, 0);
  // A selection callout is text only: no page region to render.
  assert.equal(nativeContent.figures.length, 0);

  // PDF++ rectangular annotation: the region becomes a figure, captioned with its extracted text.
  const rectCallout = [
    '> [!PDF|yellow] [[papers/ar-mot.pdf#page=4&rect=42.84,372.24,569.16,736.56&color=yellow|ar-mot, p.4]]',
    '> 页面展示了一个多模块流水线示意图。',
    '> > Fig. 2. Framework of AR-MOT.',
    '>',
    '> **AI 精读 · Fig. 2**',
  ].join('\n');
  const rectContent = extractSectionContent(rectCallout);
  assert.equal(rectContent.figures.length, 1);
  assert.deepEqual(rectContent.figures[0].pdf, { page: 4, rect: [42.84, 372.24, 569.16, 736.56] });
  assert.equal(rectContent.figures[0].target, 'papers/ar-mot.pdf');
  assert.equal(rectContent.figures[0].external, false);
  assert.equal(rectContent.figures[0].caption, 'Fig. 2. Framework of AR-MOT.');
  assert.equal(rectContent.figures[0].alt, 'ar-mot, p.4');
  assert.equal(rectContent.figures[0].line, 0);
  // The annotation text and its comments stay visible as a quote as well.
  assert.equal(rectContent.highlights.length, 1);
  assert.equal(rectContent.highlights[0].text, 'Fig. 2. Framework of AR-MOT.');

  // A cropped embed outside a callout is a figure; a plain PDF embed is not.
  const embeds = extractSectionContent([
    '![[paper.pdf#page=3&rect=26,473,589,757|paper, p.3]]',
    '![[paper.pdf#page=3]]',
    '![[diagram.png|A diagram]]',
  ].join('\n'));
  assert.equal(embeds.figures.length, 2);
  assert.deepEqual(embeds.figures[0].pdf, { page: 3, rect: [26, 473, 589, 757] });
  assert.equal(embeds.figures[0].caption, 'paper, p.3');
  assert.equal(embeds.figures[1].target, 'diagram.png');
  assert.equal(embeds.figures[1].pdf, undefined);
  assert.equal(embeds.figures[1].alt, 'A diagram');
  // Malformed regions are ignored rather than rendered at a guessed position.
  assert.equal(extractSectionContent('![[paper.pdf#page=0&rect=1,2,3,4]]').figures.length, 0);
  assert.equal(extractSectionContent('![[paper.pdf#page=2&rect=1,2,3]]').figures.length, 0);

  // Formula segmentation for highlights and their comments (rendering itself needs Obsidian).
  const mathPath = join(root, "src/ui/mathSegments.ts");
  const mathSource = readFileSync(mathPath, "utf8");
  assert(!/from\s+["']obsidian["']/.test(mathSource), "mathSegments must stay host-free");
  const mathOut = join(temp, "mathSegments.js");
  writeFileSync(mathOut, ts.transpileModule(mathSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, strict: true },
    fileName: mathPath,
  }).outputText);
  const { splitMath, containsMath } = require(mathOut);

  assert.deepEqual(splitMath("plain text only"), [{ math: false, value: "plain text only" }]);
  assert.equal(containsMath("plain text only"), false);
  assert.deepEqual(splitMath("where $x_i$ is the token"), [
    { math: false, value: "where " },
    { math: true, value: "x_i", display: false },
    { math: false, value: " is the token" },
  ]);
  const block = splitMath("Given\n$$\ns_{j} = \\mathrm{Concat}(a,\\ b)\n$$\nwe obtain");
  assert.deepEqual(block.map((segment) => segment.math), [false, true, false]);
  assert.equal(block[1].display, true);
  assert.equal(block[1].value, "s_{j} = \\mathrm{Concat}(a,\\ b)");
  // Prices and lone dollars are text, not formulas.
  assert.equal(containsMath("costs $5 and $6 per run"), false);
  assert.equal(containsMath("a lone $ sign"), false);
  assert.equal(containsMath("$$ $$"), false);

  console.log("section content tests passed");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
