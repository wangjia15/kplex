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

  console.log("section content tests passed");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
