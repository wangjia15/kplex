// Paper-reading mode: identifier parsing, provider parsing, translation alignment/fallback and
// note building. Host-free modules only; no network access (HTTP is always a fake).
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-paper-test-"));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const paperRoot = join(root, "src/paper");
const hostFree = walk(paperRoot).filter((path) => path.endsWith(".ts") && !path.includes(`${join("src", "paper", "obsidian")}`));
for (const sourcePath of hostFree) {
  const source = readFileSync(sourcePath, "utf8");
  assert(!/from\s+["']obsidian["']/.test(source), `${relative(root, sourcePath)} must stay host-free (no obsidian import)`);
  assert(!/\bglobalThis\b/.test(source), `${relative(root, sourcePath)} must not use globalThis`);
  assert(!/\b(?:window\.)?setTimeout\(/.test(source), `${relative(root, sourcePath)} must receive timers through injection`);
  const outputPath = join(temp, relative(root, sourcePath).replace(/\.ts$/, ".js"));
  mkdirSync(dirname(outputPath), { recursive: true });
  const result = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, esModuleInterop: true, strict: true },
    fileName: sourcePath,
  });
  writeFileSync(outputPath, result.outputText);
}

const load = (path) => require(join(temp, path));
const ids = load("src/paper/PaperIdentifier.js");
const s2 = load("src/paper/providers/SemanticScholar.js");
const openAlex = load("src/paper/providers/OpenAlex.js");
const arxiv = load("src/paper/providers/Arxiv.js");
const align = load("src/paper/translation/SentenceAlign.js");
const google = load("src/paper/translation/GoogleTranslator.js");
const bing = load("src/paper/translation/BingTranslator.js");
const { TranslationService } = load("src/paper/translation/TranslationService.js");
const { PaperMetadataService } = load("src/paper/PaperMetadataService.js");
const builder = load("src/paper/PaperNoteBuilder.js");
const refs = load("src/paper/ReferenceParser.js");
const articles = load("src/paper/ArticleSources.js");

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    console.error(`FAIL paper: ${name}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------
// P-ID: identifier parsing
await test("identifier formats", () => {
  const cases = [
    ["10.1038/nature14539", { kind: "doi", value: "10.1038/nature14539" }],
    ["doi:10.1038/Nature14539.", { kind: "doi", value: "10.1038/nature14539" }],
    ["https://doi.org/10.1145/3292500.3330701", { kind: "doi", value: "10.1145/3292500.3330701" }],
    ["https://dx.doi.org/10.1145/3292500.3330701", { kind: "doi", value: "10.1145/3292500.3330701" }],
    // The research vault stores arXiv ids inside the `doi` property with an `arXiv:` prefix.
    ["arXiv:2104.09864", { kind: "arxiv", value: "2104.09864" }],
    ["2306.14824v3", { kind: "arxiv", value: "2306.14824" }],
    ["https://arxiv.org/abs/2104.09864", { kind: "arxiv", value: "2104.09864" }],
    ["https://arxiv.org/pdf/2104.09864v2.pdf", { kind: "arxiv", value: "2104.09864" }],
    ["https://arxiv.org/abs/hep-th/9901001v1", { kind: "arxiv", value: "hep-th/9901001" }],
    ["10.48550/arXiv.1706.03762", { kind: "arxiv", value: "1706.03762" }],
    ["https://www.semanticscholar.org/paper/Attention/204e3073870fae3d05bcbc2f6a8e263d9b72e776", { kind: "s2", value: "204e3073870fae3d05bcbc2f6a8e263d9b72e776" }],
  ];
  for (const [input, expected] of cases) assert.deepEqual(ids.parsePaperId(input), expected, input);
  for (const input of ["", "hello world", "https://example.com/page", "2021", "https://github.com/foo/bar"]) {
    assert.equal(ids.parsePaperId(input), null, input);
  }
  assert.deepEqual(ids.paperIdsFromValue(["arXiv:2104.09864", 12, null, "https://arxiv.org/abs/2104.09864"]).map(ids.paperKey), ["arxiv:2104.09864", "arxiv:2104.09864"]);
  assert.equal(ids.preferredPaperId([{ kind: "s2", value: "x" }, { kind: "doi", value: "10.1/a" }, { kind: "arxiv", value: "1" }]).kind, "arxiv");
});

// ---------------------------------------------------------------------------------------------
// P-PROV: provider parsing fixtures (captured shapes from 2026-09-25 API responses)
const s2Paper = {
  paperId: "204E3073870FAE3D05BCBC2F6A8E263D9B72E776",
  title: "Attention is All you Need",
  authors: [{ name: "Ashish Vaswani" }, { name: "Noam Shazeer" }],
  year: 2017, venue: "NeurIPS", abstract: "The dominant sequence transduction models are based on RNNs.",
  tldr: { text: "A new simple network architecture." }, citationCount: 150000, referenceCount: 42,
  externalIds: { ArXiv: "1706.03762", DOI: "10.48550/arXiv.1706.03762", CorpusId: 13756489 },
  url: "https://www.semanticscholar.org/paper/204e", openAccessPdf: { url: "https://arxiv.org/pdf/1706.03762" },
};

await test("semantic scholar parsing", () => {
  const record = s2.parseS2Paper(s2Paper);
  assert.equal(record.key, "arxiv:1706.03762");
  assert.deepEqual(record.ids.map(ids.paperKey), ["arxiv:1706.03762", "s2:204e3073870fae3d05bcbc2f6a8e263d9b72e776"]);
  assert.deepEqual(record.authors, ["Ashish Vaswani", "Noam Shazeer"]);
  assert.equal(record.tldr, "A new simple network architecture.");
  assert.equal(s2.parseS2Paper({ paperId: null, title: "" }), null);
  const page = s2.parseS2List(JSON.stringify({ offset: 0, next: 2, data: [{ citedPaper: s2Paper }, { citedPaper: { paperId: null, title: "Unresolved ref" } }] }), "references", 0, 2);
  assert.equal(page.items.length, 2);
  assert.equal(page.items[1].key, "title:unresolved ref");
  assert.equal(page.next, 2);
  const last = s2.parseS2List(JSON.stringify({ offset: 0, data: [{ citingPaper: s2Paper }] }), "citations", 0, 50);
  assert.equal(last.next, null, "short final page ends the list");
  assert.equal(s2.s2DetailUrl({ kind: "doi", value: "10.1/x" }).includes("DOI%3A10.1%2Fx"), true);
});

await test("openalex parsing", () => {
  assert.equal(openAlex.openAlexAbstract({ Deep: [0], learning: [1, 3], is: [2] }), "Deep learning is learning");
  const record = openAlex.parseOpenAlexWork({
    id: "https://openalex.org/W2919115771", doi: "https://doi.org/10.1038/nature14539", title: "Deep learning",
    publication_year: 2015, authorships: [{ author: { display_name: "Yann LeCun" } }],
    primary_location: { source: { display_name: "Nature" } }, cited_by_count: 84961, referenced_works_count: 53,
    abstract_inverted_index: { Deep: [0], learning: [1] }, open_access: { oa_url: "" },
  });
  assert.equal(record.key, "doi:10.1038/nature14539");
  assert.equal(record.venue, "Nature");
  assert.equal(record.abstract, "Deep learning");
  assert.equal(openAlex.openAlexShortId("https://openalex.org/W123"), "W123");
});

await test("arxiv atom parsing", () => {
  const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry>
    <id>http://arxiv.org/abs/1706.03762v7</id><published>2017-06-12T17:57:34Z</published>
    <title>Attention Is All
      You Need</title><summary>  The dominant sequence &amp; transduction models.
    </summary><author><name>Ashish Vaswani</name></author><author><name>Noam Shazeer</name></author>
    <link href="https://arxiv.org/pdf/1706.03762v7" rel="related" type="application/pdf" title="pdf"/>
  </entry></feed>`;
  const record = arxiv.parseArxivFeed(xml, "1706.03762");
  assert.equal(record.title, "Attention Is All You Need");
  assert.equal(record.abstract, "The dominant sequence & transduction models.");
  assert.equal(record.year, 2017);
  assert.deepEqual(record.authors, ["Ashish Vaswani", "Noam Shazeer"]);
  assert.equal(record.pdfUrl, "https://arxiv.org/pdf/1706.03762v7");
  assert.equal(arxiv.parseArxivFeed("<feed><entry><title>Error</title></entry></feed>", "x"), null);
});

// ---------------------------------------------------------------------------------------------
// P-META: metadata service fallback / retry / caching
function fakeClock() {
  let now = 1000;
  return {
    now: () => now,
    sleep: async (ms) => { now += ms; },
  };
}

await test("metadata service: s2 detail, cache and alias caching", async () => {
  const calls = [];
  const clock = fakeClock();
  const service = new PaperMetadataService(async (request) => {
    calls.push(request.url);
    return { status: 200, text: JSON.stringify(s2Paper) };
  }, { semanticScholarApiKey: () => "", contactEmail: () => "", ...clock });
  const first = await service.lookup([{ kind: "arxiv", value: "1706.03762" }]);
  assert.equal(first.title, "Attention is All you Need");
  await service.lookup([{ kind: "arxiv", value: "1706.03762" }]);
  await service.lookup([{ kind: "s2", value: "204e3073870fae3d05bcbc2f6a8e263d9b72e776" }]);
  assert.equal(calls.length, 1, "detail and alias lookups are cached");
});

await test("metadata service: 429 retry then arXiv abstract fallback", async () => {
  const calls = [];
  const clock = fakeClock();
  const service = new PaperMetadataService(async (request) => {
    calls.push(request.url);
    if (request.url.includes("semanticscholar")) return { status: 429, text: "" };
    return { status: 200, text: `<feed><entry><title>RoFormer</title><summary>Rotary.</summary><published>2021-04-20</published></entry></feed>` };
  }, { semanticScholarApiKey: () => "", contactEmail: () => "", ...clock });
  const record = await service.lookup([{ kind: "arxiv", value: "2104.09864" }]);
  assert.equal(record.source, "arxiv");
  assert.equal(record.abstract, "Rotary.");
  assert.equal(calls.filter((url) => url.includes("semanticscholar")).length, 1, "detail lookups with a fallback skip S2 backoff");
});

await test("metadata service: missing S2 abstract is enriched from OpenAlex", async () => {
  const clock = fakeClock();
  const service = new PaperMetadataService(async (request) => {
    if (request.url.includes("semanticscholar")) return { status: 200, text: JSON.stringify({ ...s2Paper, abstract: null, externalIds: { DOI: "10.1038/nature14539" } }) };
    return { status: 200, text: JSON.stringify({ id: "https://openalex.org/W1", title: "Deep learning", abstract_inverted_index: { Deep: [0], learning: [1] } }) };
  }, { semanticScholarApiKey: () => "", contactEmail: () => "me@example.com", ...clock });
  const record = await service.lookup([{ kind: "doi", value: "10.1038/nature14539" }]);
  assert.equal(record.source, "semantic-scholar");
  assert.equal(record.abstract, "Deep learning");
});

await test("metadata service: list requests retry 429 before failing", async () => {
  let attempts = 0;
  const service = new PaperMetadataService(async () => {
    attempts += 1;
    return attempts < 3 ? { status: 429, text: "" } : { status: 200, text: JSON.stringify({ data: [{ citedPaper: s2Paper }] }) };
  }, { semanticScholarApiKey: () => "", contactEmail: () => "", ...fakeClock() });
  const page = await service.list([{ kind: "arxiv", value: "2104.09864" }], "references", 0, 50);
  assert.equal(page.items.length, 1);
  assert.equal(attempts, 3);
});

await test("title hints resolve through S2 title match", async () => {
  assert.deepEqual(ids.titlePaperId("  MI-DETR:   An Object Detection Model "), { kind: "title", value: "MI-DETR: An Object Detection Model" });
  assert.equal(ids.titlePaperId("short"), null);
  assert.equal(ids.isOtherPaperLink("https://openaccess.thecvf.com/content/CVPR2025/papers/x.pdf"), true);
  assert.equal(ids.isOtherPaperLink("https://arxiv.org/abs/2104.09864"), false);
  assert.equal(ids.preferredPaperId([{ kind: "title", value: "Some title" }, { kind: "doi", value: "10.1/a" }]).kind, "doi");
  const calls = [];
  const service = new PaperMetadataService(async (request) => {
    calls.push(request.url);
    if (request.url.includes("/paper/search/match")) {
      return { status: 200, text: JSON.stringify({ data: [{ ...s2Paper, matchScore: 130 }] }) };
    }
    if (request.url.includes("/references")) return { status: 200, text: JSON.stringify({ data: [{ citedPaper: s2Paper }] }) };
    return { status: 404, text: "" };
  }, { semanticScholarApiKey: () => "", contactEmail: () => "", ...fakeClock() });
  const hint = [{ kind: "title", value: "Attention is all you" }];
  const record = await service.lookup(hint);
  assert.equal(record.key, "arxiv:1706.03762");
  const page = await service.list(hint, "references", 0, 50);
  assert.equal(page.items.length, 1);
  assert(calls.some((url) => url.includes("/paper/arXiv%3A1706.03762/references")), "lists use the matched paper's real id");
  assert.equal(calls.filter((url) => url.includes("/search/match")).length, 1, "title match is cached");
});

await test("metadata service: DOI references fall back to OpenAlex", async () => {
  const clock = fakeClock();
  const service = new PaperMetadataService(async (request) => {
    if (request.url.includes("semanticscholar")) return { status: 500, text: "" };
    if (request.url.includes("/works/doi:")) return { status: 200, text: JSON.stringify({ id: "https://openalex.org/W1", title: "Root", referenced_works: ["https://openalex.org/W2", "https://openalex.org/W3"] }) };
    if (request.url.includes("filter=openalex:W2|W3")) return { status: 200, text: JSON.stringify({ results: [{ id: "https://openalex.org/W2", title: "Ref A" }, { id: "https://openalex.org/W3", title: "Ref B" }] }) };
    return { status: 404, text: "" };
  }, { semanticScholarApiKey: () => "", contactEmail: () => "", ...clock });
  const page = await service.list([{ kind: "doi", value: "10.1/root" }], "references", 0, 50);
  assert.deepEqual(page.items.map((item) => item.title), ["Ref A", "Ref B"]);
  assert.equal(page.next, null);
  assert.equal(page.total, 2);
});

await test("metadata service: abort is not swallowed by fallback", async () => {
  const controller = new AbortController();
  const service = new PaperMetadataService(async () => {
    controller.abort();
    return { status: 200, text: JSON.stringify(s2Paper) };
  }, { semanticScholarApiKey: () => "", contactEmail: () => "", ...fakeClock() });
  await assert.rejects(service.lookup([{ kind: "arxiv", value: "1706.03762" }], controller.signal), (error) => error.name === "AbortError");
});

// ---------------------------------------------------------------------------------------------
// P-TR: sentence alignment and translation providers
await test("sentence splitting protects scholarly abbreviations", () => {
  const sentences = align.splitSentences("We propose a new model, e.g. a transformer. It achieves 28.4 BLEU on WMT 2014 (Vaswani et al. 2017). See Fig. 2 for details.\n\nCode is available.");
  assert.deepEqual(sentences.map((sentence) => sentence.text), [
    "We propose a new model, e.g. a transformer.",
    "It achieves 28.4 BLEU on WMT 2014 (Vaswani et al. 2017).",
    "See Fig. 2 for details.",
    "Code is available.",
  ]);
  assert.deepEqual(sentences.map((sentence) => sentence.paragraph), [0, 0, 0, 1]);
});

await test("chunking and alignment degrade safely", () => {
  const sentences = align.splitSentences("A one. B two. C three.");
  const chunks = align.chunkSentences(sentences, 14);
  assert.deepEqual(chunks.map((chunk) => chunk.length), [2, 1]);
  const ok = align.alignChunk(sentences, "甲。\n\n乙。\n\n丙。");
  assert.equal(ok.aligned, true);
  assert.deepEqual(ok.segments.map((segment) => segment.target), ["甲。", "乙。", "丙。"]);
  const merged = align.alignChunk(sentences, "甲乙丙。");
  assert.equal(merged.aligned, false);
  assert.equal(merged.segments.length, 1);
  assert.equal(merged.segments[0].target, "甲乙丙。");
});

await test("google response parsing", () => {
  const body = JSON.stringify([[["我们提出了一个新模型，例如", "We propose a new model, e.g. "], ["变压器。\n\n", "a transformer.\n\n"], ["代码可用。", "Code is available."]], null, "en"]);
  assert.equal(google.parseGoogleResponse(body), "我们提出了一个新模型，例如变压器。\n\n代码可用。");
  assert.equal(google.googleLanguage("zh-Hans"), "zh-CN");
  assert(google.googleTranslateUrl("zh-CN").includes("tl=zh-CN"));
});

await test("bing session and response parsing", () => {
  const html = `<div id="rich_tta" data-iid="translator.5023"></div><script>_G={IG:"70488595732E4C4EBA376B561B9CFCC8"};var params_AbusePreventionHelper = [1790317798396,"qPov_CL7exMNK2eZiuW3_Os0c4shxRTI",3600000];</script>`;
  const session = bing.parseBingSession(html, "cn.bing.com", 0);
  assert.equal(session.ig, "70488595732E4C4EBA376B561B9CFCC8");
  assert.equal(session.key, "1790317798396");
  assert.equal(session.token, "qPov_CL7exMNK2eZiuW3_Os0c4shxRTI");
  assert.equal(session.expiresAt, 3600000 - 60000);
  assert.equal(bing.parseBingSession("<html></html>", "www.bing.com", 0), null);
  assert.equal(bing.parseBingResponse(JSON.stringify([{ translations: [{ text: "你好", to: "zh-Hans" }] }])), "你好");
  assert.throws(() => bing.parseBingResponse(JSON.stringify({ statusCode: 205 })), /status 205/);
  assert(bing.bingFormBody(session, "a&b", "zh-CN").includes("to=zh-Hans&text=a%26b"));
});

await test("bing translator: www redirect falls back to cn host and refreshes stale token", async () => {
  const html = (token) => `<i data-iid="translator.5023"></i>IG:"ABC"; params_AbusePreventionHelper = [1,"${token}",3600000]`;
  const calls = [];
  let cnPosts = 0;
  const http = async (request) => {
    calls.push(`${request.method ?? "GET"} ${request.url}`);
    if (request.url === "https://www.bing.com/translator") return { status: 200, text: html("www") };
    if (request.url.startsWith("https://www.bing.com/ttranslatev3")) return { status: 200, text: "<html>Object moved</html>" };
    if (request.url === "https://cn.bing.com/translator") return { status: 200, text: html(`cn${cnPosts}`) };
    if (request.url.startsWith("https://cn.bing.com/ttranslatev3")) {
      assert.equal(request.headers.Referer, "https://cn.bing.com/translator", "Bing posts must carry the translator-page referer");
      cnPosts += 1;
      return cnPosts === 1 ? { status: 401, text: "" } : { status: 200, text: JSON.stringify([{ translations: [{ text: "好" }] }]) };
    }
    return { status: 404, text: "" };
  };
  const translator = new bing.BingTranslator(http, () => 0);
  assert.equal(await translator.translate("Good", "zh-CN"), "好");
  const before = calls.length;
  assert.equal(await translator.translate("Good", "zh-CN"), "好");
  assert(calls.slice(before).every((call) => call.includes("cn.bing.com")), "the working host is remembered");
});

await test("translation service: fallback, cache and title batches", async () => {
  let preferred = "google";
  const service = new TranslationService(async () => ({ status: 500, text: "" }), { preferred: () => preferred, target: () => "zh-CN", now: () => 0 });
  let googleCalls = 0;
  let bingCalls = 0;
  service.setTranslator({ id: "google", maxChunkChars: 4500, translate: async () => { googleCalls += 1; throw new Error("blocked"); } });
  service.setTranslator({ id: "bing", maxChunkChars: 900, translate: async (text) => { bingCalls += 1; return text.split("\n\n").map((line) => `译:${line}`).join("\n\n"); } });
  const result = await service.translate("First one. Second one.");
  assert.equal(result.provider, "bing");
  assert.equal(result.aligned, true);
  assert.deepEqual(result.segments.map((segment) => segment.target), ["译:First one.", "译:Second one."]);
  await service.translate("First one. Second one.");
  assert.equal(bingCalls, 1, "cached");
  assert.equal(googleCalls, 1);
  const titles = await service.translateLines(["Attention", "Deep learning", "Attention"]);
  assert.equal(titles.get("Deep learning"), "译:Deep learning");
  preferred = "bing";
  service.setTranslator({ id: "bing", maxChunkChars: 900, translate: async () => { throw new Error("down"); } });
  await assert.rejects(service.translate("Brand new text."), /Bing: down Google: blocked/);
});

// ---------------------------------------------------------------------------------------------
// P-REF: offline reference extraction (shapes copied from PDF-converted notes in the research vault)
await test("numbered reference lists", () => {
  const note = [
    "Body text mentioning references in passing.",
    "References",
    "[1] G. Chen, Y. Huang, and L. Wang. Video mamba suite: State space model as a versatile alternative for video understanding. arXiv preprint arXiv:2403.09626,",
    "2024.",
    "[2] S. Chen, H. Zhu, X. Chen, and T. Chen. End-to-end 3d dense captioning with vote2cap-",
    "detr. In CVPR, pages 11124–11133, 2023.",
    "[3] A. Dosovitskiy, L. Beyer, M. Min-",
    "derer, and N. Houlsby. An image is worth 16x16 words: Transformers for image recognition at",
    "scale. In ICLR, 2021.",
    "12",
    "---",
    "3DET-Mamba",
    "[4] Y. Carion. End-to-",
    "end object detection with transformers. In ECCV, 2020.",
    "A Appendix",
    "[5] Not a reference. Should be ignored after the appendix, 2020.",
  ].join("\n");
  const parsed = refs.referencesFromNote(note);
  assert.deepEqual(parsed.map((item) => item.title), [
    "Video mamba suite: State space model as a versatile alternative for video understanding",
    "End-to-end 3d dense captioning with vote2cap-detr",
    "An image is worth 16x16 words: Transformers for image recognition at scale",
    "End-to-end object detection with transformers",
  ]);
  assert.deepEqual(parsed[0].ids, [{ kind: "arxiv", value: "2403.09626" }]);
  assert.equal(parsed[0].key, "arxiv:2403.09626");
  assert.equal(parsed[0].year, 2024);
  assert.deepEqual(parsed[0].authors, ["G. Chen", "Y. Huang", "L. Wang"]);
  assert.deepEqual(parsed[2].authors, ["A. Dosovitskiy", "L. Beyer", "M. Minderer", "N. Houlsby"], "word-split hyphens are re-joined");
  assert.equal(parsed[1].source, "note");
  assert.equal(parsed[1].key, "title:end-to-end 3d dense captioning with vote2cap-detr");
});

await test("author-year reference lists with page noise", () => {
  const note = [
    "References",
    "Jonas Gehring, Michael Auli, and Yann N Dauphin. Convolutional sequence to sequence",
    "learning. In International Conference on Machine Learning, pages 1243–1252. PMLR, 2017.",
    "Md. Amirul Islam, Sen Jia, and Neil D. B. Bruce. How much position information do convolutional neural networks",
    "encode? ArXiv, abs/2001.08248, 2020.",
    "Ashish Vaswani, Noam Shazeer, and Illia Polosukhin.",
    "Attention is all you need.",
    "In Advances in Neural Information Processing Systems,",
    "12",
    "",
    "---",
    "",
    "RoFormer",
    "volume 30. Curran Associates, Inc., 2017.",
    "URL https://proceedings.neurips.cc/paper/2017/file/",
    "3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf.",
    "J. Devlin, Ming-Wei Chang, and Kristina Toutanova. Bert: Pre-training of deep bidirectional transformers",
    "for language understanding. In NAACL-HLT, 2019.",
  ].join("\n");
  const parsed = refs.referencesFromNote(note);
  assert.deepEqual(parsed.map((item) => item.title), [
    "Convolutional sequence to sequence learning",
    "How much position information do convolutional neural networks encode?",
    "Attention is all you need",
    "Bert: Pre-training of deep bidirectional transformers for language understanding",
  ]);
  assert.deepEqual(parsed[1].ids, [{ kind: "arxiv", value: "2001.08248" }]);
  assert.equal(parsed[2].year, 2017);
  assert.deepEqual(refs.referencesFromNote("No reference section here."), []);
});

await test("references in imported (HTML→Markdown) articles, LNCS style", () => {
  const note = [
    "## References",
    "",
    "-   \\[1\\] Beyer, L., Izmailov, P., Minderer, M.: Flexivit: One model for all patch sizes. In: CVPR. pp. 14496–14506 (2023)",
    "-   \\[2\\] Cheng, B., Misra, I.: Masked-attention mask transformer for universal image segmentation (2022)",
    "-   \\[3\\] Chu, X., Tian, Z.: Conditional positional encodings for vision transformers. arXiv preprint arXiv:2102.10882 (2021)",
  ].join("\n");
  const parsed = refs.referencesFromNote(note);
  assert.deepEqual(parsed.map((item) => item.title), [
    "Flexivit: One model for all patch sizes",
    "Masked-attention mask transformer for universal image segmentation",
    "Conditional positional encodings for vision transformers",
  ]);
  assert.deepEqual(parsed[0].authors, ["L. Beyer", "P. Izmailov", "M. Minderer"]);
  assert.equal(parsed[0].year, 2023);
  assert.deepEqual(parsed[2].ids, [{ kind: "arxiv", value: "2102.10882" }]);
});

await test("article import helpers", () => {
  const record = { ...s2.parseS2Paper(s2Paper) };
  assert.deepEqual(articles.articleSourceUrls(record), ["https://arxiv.org/html/1706.03762", "https://ar5iv.labs.arxiv.org/html/1706.03762"]);
  assert.equal(articles.articleBrowserUrl(record), "https://arxiv.org/html/1706.03762");
  const doiOnly = { ...record, ids: [{ kind: "doi", value: "10.1038/nature14539" }] };
  assert.deepEqual(articles.articleSourceUrls(doiOnly), [], "built-in import is arXiv-only");
  assert.equal(articles.articleBrowserUrl(doiOnly), "https://doi.org/10.1038/nature14539", "Web Clipper can still open DOI papers");
  assert.equal(articles.imagePrefix(record, "x"), "1706.03762");
  assert.equal(articles.imagePrefix(doiOnly, "x"), "10.1038-nature14539");
  assert.equal(articles.articleImageName("1706.03762", "https://arxiv.org/html/1706.03762v7/Figures/ModalNet-21.png", 0), "1706.03762-ModalNet-21.png");
  assert.equal(articles.articleImageName("p", "https://example.com/render?id=3", 2, "image/jpeg"), "p-render.jpg");
  assert.equal(articles.articleImageName("p", "https://example.com/", 2, ""), "p-figure-3.png");
  const math = [articles.formatMath("x_{0}\\in  R", false), articles.formatMath("a=b", true)];
  assert.equal(articles.replaceTokens(`Let ${articles.mathToken(0)} be. ${articles.mathToken(1)} ${articles.imageToken(0)} ${articles.mathToken(9)}`, math, ["![[images/a.png]]"]),
    "Let $x_{0}\\in R$ be. \n\n$$\na=b\n$$\n\n ![[images/a.png]] ");
  assert.equal(articles.tidyMarkdown("a\n\n\n\nb\n"), "a\n\nb\n");
});

await test("openalex title match picks the fullest matching version", () => {
  const results = [
    { id: "https://openalex.org/W1", title: "RoFormer: Enhanced transformer with Rotary Position Embedding", referenced_works_count: 56 },
    { id: "https://openalex.org/W2", title: "RoFormer: Enhanced Transformer with Rotary Position Embedding", referenced_works_count: 35 },
    { id: "https://openalex.org/W3", title: "Something else entirely", referenced_works_count: 99 },
  ];
  assert.equal(openAlex.pickOpenAlexTitleMatch(results, "RoFormer: Enhanced Transformer with Rotary Position Embedding").id, "https://openalex.org/W1");
  assert.equal(openAlex.pickOpenAlexTitleMatch(results, "ROFORMER: ENHANCED TRANSFORMER WITH ROTARY").id, "https://openalex.org/W1", "truncated vault titles match");
  assert.equal(openAlex.pickOpenAlexTitleMatch(results, "Unrelated paper title"), null);
  assert(!openAlex.openAlexTitleSearchUrl("A: B, C", "").includes("%3A"), "search operators are stripped");
});

await test("metadata service: empty S2 references fall back to OpenAlex title search; Accept headers", async () => {
  const seen = [];
  const service = new PaperMetadataService(async (request) => {
    seen.push(request);
    if (request.url.includes("semanticscholar") && request.url.includes("/references")) return { status: 200, text: JSON.stringify({ data: [] }) };
    if (request.url.includes("semanticscholar")) return { status: 200, text: JSON.stringify(s2Paper) };
    if (request.url.includes("title.search")) return { status: 200, text: JSON.stringify({ results: [{ id: "https://openalex.org/W9", title: "Attention is All you Need", referenced_works: ["https://openalex.org/W2"] }] }) };
    if (request.url.includes("filter=openalex:W2")) return { status: 200, text: JSON.stringify({ results: [{ id: "https://openalex.org/W2", title: "Neural machine translation" }] }) };
    return { status: 404, text: "" };
  }, { semanticScholarApiKey: () => "", contactEmail: () => "", ...fakeClock() });
  const ids = [{ kind: "arxiv", value: "1706.03762" }];
  await service.lookup(ids);
  const page = await service.list(ids, "references", 0, 50);
  assert.equal(page.source, "openalex");
  assert.deepEqual(page.items.map((item) => item.title), ["Neural machine translation"]);
  assert(seen.every((request) => request.headers.Accept), "every request declares Accept");
  const arxivService = new PaperMetadataService(async (request) => {
    seen.push(request);
    if (request.url.includes("arxiv.org")) {
      assert(request.headers.Accept.includes("atom+xml"), "arXiv needs an Accept header (HTTP 406 otherwise)");
      return { status: 200, text: "<feed><entry><title>RoFormer</title><summary>Rotary.</summary></entry></feed>" };
    }
    return { status: 429, text: "" };
  }, { semanticScholarApiKey: () => "", contactEmail: () => "", ...fakeClock() });
  assert.equal((await arxivService.lookup([{ kind: "arxiv", value: "2104.09864" }])).abstract, "Rotary.");
});

await test("metadata service: S2 detail retried after fallbacks also fail", async () => {
  let s2Calls = 0;
  const service = new PaperMetadataService(async (request) => {
    if (request.url.includes("semanticscholar")) {
      s2Calls += 1;
      return s2Calls < 3 ? { status: 429, text: "" } : { status: 200, text: JSON.stringify(s2Paper) };
    }
    return { status: 503, text: "" };
  }, { semanticScholarApiKey: () => "", contactEmail: () => "", ...fakeClock() });
  const record = await service.lookup([{ kind: "arxiv", value: "1706.03762" }]);
  assert.equal(record.title, "Attention is All you Need");
  assert.equal(s2Calls, 3);
});

// ---------------------------------------------------------------------------------------------
// P-NOTE: note builder
await test("note builder", () => {
  const record = s2.parseS2Paper(s2Paper);
  assert.equal(builder.paperFileStem(record), "Vaswani 2017 - Attention is All you Need");
  assert.equal(builder.paperFileStem({ ...record, title: "A: B/C? [D] #E", authors: [] }), "2017 - A B C D E");
  const long = builder.paperFileStem({ ...record, title: "word ".repeat(40) });
  assert(long.length <= 90 && !long.endsWith(" "));
  assert.equal(builder.uniqueStem("X", (stem) => stem === "X" || stem === "X (2)"), "X (3)");

  const fm = builder.paperFrontmatter(record, "Note type", "Paper");
  assert.equal(fm.arxiv, "1706.03762");
  assert.equal(fm.url, "https://arxiv.org/abs/1706.03762");
  assert.equal(fm["Note type"], "Paper");
  assert.equal(fm.doi, undefined, "arXiv DataCite DOI is normalized into the arxiv id");
  const many = builder.paperFrontmatter({ ...record, authors: Array.from({ length: 20 }, (_, i) => `A ${i}`) }, "", "");
  assert.equal(many.authors.length, 13);
  assert.equal(many.authors[12], "et al.");

  const translation = { provider: "google", aligned: true, segments: [
    { source: "One.", target: "一。", paragraph: 0 },
    { source: "Two.", target: "二。", paragraph: 0 },
    { source: "Three.", target: "三。", paragraph: 1 },
  ] };
  assert.equal(builder.abstractMarkdown("One. Two.\n\nThree.", translation, "sections", "zh-CN"),
    "## Abstract\n\nOne. Two.\n\nThree.\n\n## 摘要（简体中文）\n\n一。二。\n\n三。\n");
  assert.equal(builder.abstractMarkdown("One. Two.", translation, "bilingual", "zh-CN"),
    "## Abstract\n\nOne.\n> 一。\n\nTwo.\n> 二。\n\nThree.\n> 三。\n");
  assert.equal(builder.translatedParagraphs(translation, "fr")[0], "一。 二。");

  assert.equal(builder.abstractMarkdown("One. Two.", translation, "translation", "zh-CN"),
    "## 摘要（简体中文）\n\n一。二。\n\n三。\n", "translation-only notes keep just the translated section");
  assert.equal(builder.abstractMarkdown("One.", null, "translation", "zh-CN"), "## Abstract\n\nOne.\n", "untranslated falls back to the original");
  const translatedOnly = builder.appendAbstractSections("Body", "One.", translation, "translation", "zh-CN");
  assert(translatedOnly.endsWith("## 摘要（简体中文）\n\n一。二。\n\n三。\n") && !translatedOnly.includes("## Abstract"));
  assert.equal(builder.appendAbstractSections(translatedOnly, "One.", translation, "translation", "zh-CN"), null);

  const missing = builder.missingPaperProperties({ Title: "Mine", doi: "arXiv:1706.03762", "Note type": "Idea" }, record);
  assert.equal(missing.title, undefined, "existing title is kept");
  assert.equal(missing.arxiv, undefined, "an id stored under doi counts as present");
  assert.equal(missing.year, 2017);
  assert.deepEqual(missing.authors, ["Ashish Vaswani", "Noam Shazeer"]);
  assert.equal(missing["Note type"], undefined, "the user's style property is never touched");
  assert.equal(missing.aliases, undefined);

  const appended = builder.appendAbstractSections("---\na: 1\n---\nBody", "One.", null, "sections", "zh-CN");
  assert.equal(appended, "---\na: 1\n---\nBody\n\n## Abstract\n\nOne.\n");
  const withTranslation = builder.appendAbstractSections(appended, "One.", translation, "sections", "zh-CN");
  assert(withTranslation.endsWith("## 摘要（简体中文）\n\n一。二。\n\n三。\n"));
  assert.equal(builder.appendAbstractSections(withTranslation, "One.", translation, "sections", "zh-CN"), null, "idempotent");
});

rmSync(temp, { recursive: true, force: true });
console.log(`paper tests passed (${passed})`);
