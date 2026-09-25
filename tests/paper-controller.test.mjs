// Paper reading controller integration: vault detection (including the research vault's
// `doi: arXiv:…` / conference-PDF conventions), vault lookup, Add to vault deduplication, citation
// direction and abstract saving. Obsidian is a small in-memory fake; HTTP is fixture-backed.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-paper-controller-"));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

for (const sourcePath of [...walk(join(root, "src/paper")).filter((path) => path.endsWith(".ts")), join(root, "src/index/fieldParser.ts")]) {
  const outputPath = join(temp, relative(root, sourcePath).replace(/\.ts$/, ".js"));
  mkdirSync(dirname(outputPath), { recursive: true });
  const result = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: sourcePath,
  });
  writeFileSync(outputPath, result.outputText);
}

const obsidianDir = join(temp, "node_modules/obsidian");
mkdirSync(obsidianDir, { recursive: true });
writeFileSync(join(obsidianDir, "index.js"), `
class TFile {
  constructor(path) {
    this.path = path;
    this.name = path.split("/").pop();
    const dot = this.name.lastIndexOf(".");
    this.extension = dot >= 0 ? this.name.slice(dot + 1) : "";
    this.basename = dot >= 0 ? this.name.slice(0, dot) : this.name;
  }
}
const notices = [];
class Notice { constructor(message) { notices.push(message); } }
exports.TFile = TFile;
exports.Notice = Notice;
exports.notices = notices;
exports.normalizePath = (path) => path.replace(/\\/+/g, "/").replace(/^\\//, "").replace(/\\/$/, "");
exports.requestUrl = (request) => globalThis.__paperHttp(request);
`);
globalThis.window = globalThis;

const { TFile, notices } = require(join(obsidianDir, "index.js"));
const { PaperReadingController } = require(join(temp, "src/paper/obsidian/PaperReadingController.js"));

// ---------------------------------------------------------------------------------------------
// Fixtures: an S2 record for the center paper, its references and citing papers.
const s2 = (title, arxiv, extra = {}) => ({
  paperId: arxiv.replace(".", "").padEnd(40, "a"),
  title, year: 2021, authors: [{ name: "Jianlin Su" }], venue: "", citationCount: 10, referenceCount: 3,
  externalIds: { ArXiv: arxiv }, abstract: `${title} abstract. It has two sentences.`, ...extra,
});
const center = s2("RoFormer: Enhanced Transformer with Rotary Position Embedding", "2104.09864");
const refInVault = s2("Attention Is All You Need", "1706.03762");
const refNew = s2("Train Short, Test Long", "2108.12409");
const citing = s2("RoPE-ViT: Rotary Position Embedding for Vision Transformer", "2403.13298");
const requests = [];
globalThis.__paperHttp = async (request) => {
  requests.push(`${request.method} ${request.url}`);
  const url = request.url;
  // 3DET-Mamba: S2 knows the paper but has no reference list; OpenAlex has no match either.
  if (url.includes("/search/match?query=3DET")) return { status: 200, text: JSON.stringify({ data: [{ paperId: "f".repeat(40), title: "3DET-Mamba: State Space Model for End-to-End 3D Object Detection", externalIds: {} }] }) };
  if (url.includes(`/paper/${"f".repeat(40)}/references`)) return { status: 200, text: JSON.stringify({ data: [] }) };
  if (url.includes("openalex.org/works?filter=title.search")) return { status: 200, text: JSON.stringify({ results: [] }) };
  if (url.includes("/references")) return { status: 200, text: JSON.stringify({ data: [{ citedPaper: refInVault }, { citedPaper: refNew }] }) };
  if (url.includes("/citations")) return { status: 200, text: JSON.stringify({ data: [{ citingPaper: citing }] }) };
  if (url.includes("/search/match")) return { status: 200, text: JSON.stringify({ data: [center] }) };
  if (url.includes("arXiv%3A2104.09864")) return { status: 200, text: JSON.stringify(center) };
  if (url.includes("translate.googleapis.com")) {
    const text = decodeURIComponent(request.body.slice(2));
    return { status: 200, text: JSON.stringify([text.split("\n\n").map((line, index, all) => [`译${index}。${index < all.length - 1 ? "\n\n" : ""}`, line])]) };
  }
  return { status: 404, text: "" };
};

// ---------------------------------------------------------------------------------------------
// In-memory vault using the research vault's real frontmatter conventions.
const files = new Map();
const frontmatter = new Map();
const contents = new Map();
const addFile = (path, fm, body = "") => {
  const file = new TFile(path);
  files.set(path, file);
  frontmatter.set(path, fm);
  contents.set(path, body);
  return file;
};
addFile("notes/roformer.md", { title: "ROFORMER: ENHANCED TRANSFORMER WITH ROTARY", doi: "arXiv:2104.09864", source: "https://arxiv.org/abs/2104.09864" }, "Body text");
addFile("notes/attention.md", { title: "Attention", source: "https://arxiv.org/abs/1706.03762v7" });
addFile("notes/mi-detr.md", { title: "MI-DETR: An Object Detection Model with Multi-time Inquiries Mechanism", source: "https://openaccess.thecvf.com/content/CVPR2025/papers/Nan_MI-DETR.pdf" });
addFile("notes/plain.md", { title: "Meeting notes", status: "draft" });
addFile("notes/3det-mamba.md", { title: "3DET-Mamba: State Space Model for", source: "https://proceedings.neurips.cc/paper_files/paper/2024/file/x-Paper-Conference.pdf" }, [
  "Full text…",
  "References",
  "[1] G. Chen and L. Wang. Video mamba suite: State space model as a versatile alternative. arXiv preprint arXiv:2403.09626, 2024.",
  "[2] A. Vaswani and N. Shazeer. Attention is all you need. arXiv preprint arXiv:1706.03762, 2017.",
  "[3] A. Gu and T. Dao. Mamba: Linear-time sequence modeling with selective state spaces. In COLM, 2024.",
].join("\n"));

const pages = new Map();
const pageFor = (file) => {
  if (!pages.has(file.path)) pages.set(file.path, { path: file.path, file, url: null, isFolder: false, isTag: false, neighbours: new Map() });
  return pages.get(file.path);
};
for (const file of files.values()) pageFor(file);

const relationCalls = [];
const created = [];
const hierarchy = { parents: ["Parent"], children: ["Child"], leftFriends: [], rightFriends: [], previous: [], next: [], hidden: [], exclusions: [] };
const plugin = {
  settings: {
    paperReadingEnabled: true,
    paperIdFields: "doi, DOI, arxiv, arXiv, url, source",
    paperReferenceField: "References",
    paperFolder: "Papers",
    paperNoteType: "Paper",
    noteTypeField: "Note type",
    paperContactEmail: "",
    paperS2ApiKeySecret: "",
    paperTranslator: "google",
    paperTargetLanguage: "zh-CN",
    paperTranslateOnImport: true,
    paperNoteAbstractFormat: "sections",
    paperAbstractFields: "abstract_zh, abstract, summary",
    paperAbstractProperty: "abstract_zh",
    hierarchy,
  },
  app: {
    vault: {
      getMarkdownFiles: () => [...files.values()],
      getFileByPath: (path) => files.get(path) ?? null,
      process: async (file, fn) => { contents.set(file.path, fn(contents.get(file.path) ?? "")); },
      cachedRead: async (file) => contents.get(file.path) ?? "",
    },
    metadataCache: { getFileCache: (file) => ({ frontmatter: frontmatter.get(file.path) }) },
    fileManager: {
      getNewFileParent: () => ({ path: "/" }),
      processFrontMatter: async (file, fn) => { fn(frontmatter.get(file.path)); },
    },
    secretStorage: { getSecret: () => null },
  },
  index: {
    get: (path) => pages.get(path),
    insertCreatedFile: (file) => pageFor(file),
    isConnected: (source, path) => source.neighbours.has(path),
  },
  assignFieldToOntology: async (field, role) => {
    assert.equal(role, "parent");
    hierarchy.parents.push(field);
  },
  createRelationToPage: async (origin, role, target, field) => {
    relationCalls.push(["create", origin.path, role, target.path, field]);
    origin.neighbours.set(target.path, { isParent: true });
  },
  addOntologyToConnection: async (origin, target, role, field, storage) => {
    relationCalls.push(["add", origin.path, role, target.path, field, storage]);
    origin.neighbours.set(target.path, { isParent: true });
  },
  createPaperNoteFile: async (folder, stem, body, fm) => {
    const file = addFile(`${folder}/${stem}.md`, fm, body);
    created.push({ path: file.path, body, fm });
    return file;
  },
};

const controller = new PaperReadingController(plugin);

// Detection on the research vault conventions.
const roformer = pages.get("notes/roformer.md");
assert.deepEqual(controller.idsForPage(roformer), [{ kind: "arxiv", value: "2104.09864" }], "doi: arXiv:… and source arXiv URL collapse to one arXiv id");
assert.deepEqual(controller.idsForPage(pages.get("notes/mi-detr.md")), [{ kind: "title", value: "MI-DETR: An Object Detection Model with Multi-time Inquiries Mechanism" }], "conference-PDF notes fall back to a title hint");
assert.equal(controller.isPaperPage(pages.get("notes/plain.md")), false);
assert.equal(controller.isPaperPage({ path: "https://arxiv.org/abs/1706.03762", file: null, url: "https://arxiv.org/abs/1706.03762", isFolder: false, isTag: false, neighbours: new Map() }), true, "arXiv URL nodes are papers");
plugin.settings.paperReadingEnabled = false;
assert.equal(controller.isPaperPage(roformer), false, "the master switch hides paper features");
plugin.settings.paperReadingEnabled = true;

// Reference ontology registration.
assert.equal(await controller.ensureReferenceOntology(), true);
assert(hierarchy.parents.includes("References"));
assert.equal(await controller.ensureReferenceOntology(), true, "idempotent");
assert.equal(hierarchy.parents.filter((field) => field === "References").length, 1);
hierarchy.children.push("Cites");
plugin.settings.paperReferenceField = "Cites";
assert.equal(await controller.ensureReferenceOntology(), false, "a field owned by another role is left alone");
assert(notices.some((message) => message.includes("already assigned")));
plugin.settings.paperReferenceField = "References";

// Lookup + lists.
const lookup = controller.buildVaultLookup();
assert.equal(lookup.get("arxiv:1706.03762")?.path, "notes/attention.md");
const record = await controller.metadata.lookup(controller.idsForPage(roformer));
assert.equal(record.title, center.title);
const references = await controller.metadata.list(controller.idsForPage(roformer), "references", 0, 50);
assert.deepEqual(references.items.map((item) => item.title), [refInVault.title, refNew.title]);
assert.equal(controller.vaultPageFor(references.items[0], lookup)?.path, "notes/attention.md");
assert.equal(controller.vaultPageFor(references.items[1], lookup), null);

// Existing reference: linked on the center, no duplicate note.
await controller.addPaper(references.items[0], roformer, "references", lookup);
assert.deepEqual(relationCalls.at(-1), ["create", "notes/roformer.md", "parent", "notes/attention.md", "References"]);
assert.equal(created.length, 0, "an existing vault paper is linked, not duplicated");
assert.equal(controller.isCitationLinked(roformer, pages.get("notes/attention.md")), true);

// New reference: created with metadata, translated abstract, then linked from the center.
const refPage = await controller.addPaper(references.items[1], roformer, "references", lookup);
assert.equal(created.length, 1);
assert.equal(created[0].path, "Papers/Su 2021 - Train Short, Test Long.md");
assert.equal(created[0].fm.arxiv, "2108.12409");
assert.equal(created[0].fm["Note type"], "Paper");
assert(created[0].body.includes("## Abstract") && created[0].body.includes("## 摘要（简体中文）"), "translate-on-import writes both sections");
assert(typeof created[0].fm.abstract_zh === "string" && created[0].fm.abstract_zh.startsWith("译"), "the translated abstract is also stored in frontmatter");
assert.deepEqual(relationCalls.at(-1), ["create", "notes/roformer.md", "parent", refPage.path, "References"]);
await controller.addPaper(references.items[1], roformer, "references", lookup);
assert.equal(created.length, 1, "a second add reuses the note created a moment ago");

// Citing paper: the new note stores the reference to the center.
const citations = await controller.metadata.list(controller.idsForPage(roformer), "citations", 0, 50);
const citingPage = await controller.addPaper(citations.items[0], roformer, "citations", lookup);
assert.deepEqual(relationCalls.at(-1), ["create", citingPage.path, "parent", "notes/roformer.md", "References"]);

// Already connected some other way: additive ontology, preserving the existing relationship.
const other = pageFor(addFile("notes/other.md", { doi: "10.1000/other" }));
roformer.neighbours.set(other.path, { isParent: false, isChild: true });
await controller.linkCitation(roformer, other);
assert.deepEqual(relationCalls.at(-1), ["add", "notes/roformer.md", "parent", "notes/other.md", "References", "notes/roformer.md"]);

// Save to an existing note: missing properties are added, existing ones kept, abstract appended once.
const translation = await controller.translation.translate(record.abstract);
const saved = await controller.savePaperToNote(roformer, record, translation);
assert.equal(saved.abstract, true);
assert(saved.properties > 0);
assert.equal(frontmatter.get("notes/roformer.md").title, "ROFORMER: ENHANCED TRANSFORMER WITH ROTARY", "the note's own title is kept");
assert.equal(frontmatter.get("notes/roformer.md").doi, "arXiv:2104.09864");
assert.equal(frontmatter.get("notes/roformer.md").arxiv, undefined, "an id already stored under doi is not duplicated");
assert.deepEqual(frontmatter.get("notes/roformer.md").authors, ["Jianlin Su"]);
assert(contents.get("notes/roformer.md").startsWith("Body text\n\n## Abstract\n\n"));
assert.deepEqual(await controller.savePaperToNote(roformer, record, translation), { properties: 0, abstract: false });

// The paper currently shown (e.g. a doi/arXiv link node) can be added on its own, without a link.
const relationCount = relationCalls.length;
const standalone = await controller.addStandalonePaper(citations.items[0], lookup);
assert.equal(standalone.path, citingPage.path, "an existing note is reused");
const fresh = (await controller.metadata.list(controller.idsForPage(roformer), "citations", 0, 50)).items[0];
const freshRecord = { ...fresh, key: "arxiv:2501.00001", ids: [{ kind: "arxiv", value: "2501.00001" }], title: "Standalone Paper About Rotary Embeddings" };
const freshPage = await controller.addStandalonePaper(freshRecord, lookup);
assert.equal(freshPage.path, "Papers/Su 2021 - Standalone Paper About Rotary Embeddings.md");
assert.equal(relationCalls.length, relationCount, "standalone adds write no relationship");

// Title-hint center resolves through the match endpoint.
const matched = await controller.metadata.lookup(controller.idsForPage(pages.get("notes/mi-detr.md")));
assert.equal(matched.title, center.title);
assert(requests.some((request) => request.includes("/paper/search/match?query=MI-DETR")));

// No online reference list: references are parsed from the note's own reference section, and a
// parsed reference with an arXiv id is recognised as already being in the vault.
const mamba = pages.get("notes/3det-mamba.md");
const mambaIds = controller.idsForPage(mamba);
const offline = await controller.listPapers(mambaIds, mamba, "", "references", 0, 50);
assert.equal(offline.source, "note");
assert.deepEqual(offline.items.map((item) => item.title), [
  "Video mamba suite: State space model as a versatile alternative",
  "Attention is all you need",
  "Mamba: Linear-time sequence modeling with selective state spaces",
]);
assert.equal(controller.vaultPageFor(offline.items[1], controller.buildVaultLookup())?.path, "notes/attention.md");
assert.deepEqual(controller.lookupIds(offline.items[2]), [{ kind: "title", value: "Mamba: Linear-time sequence modeling with selective state spaces" }]);
await controller.addPaper(offline.items[1], mamba, "references", controller.buildVaultLookup());
assert.deepEqual(relationCalls.at(-1), ["create", "notes/3det-mamba.md", "parent", "notes/attention.md", "References"], "Link from a parsed reference");
const citingOnline = await controller.listPapers(controller.idsForPage(roformer), roformer, "", "citations", 0, 50);
assert.equal(citingOnline.source, "semantic-scholar");

// Hover abstract: properties in order, then the note body; results cached per file revision.
const hoverFile = addFile("notes/hover.md", { summary: "短摘要", abstract_zh: "中文摘要。第二句。" }, "Body");
hoverFile.stat = { mtime: 1 };
const hoverPage = pageFor(hoverFile);
assert.deepEqual(await controller.abstractPreview(hoverPage), { text: "中文摘要。第二句。", source: "abstract_zh", translated: true });
const bodyOnly = addFile("notes/body-only.md", { title: "X" }, "Intro\n\n> Abstract:We study rotary embeddings.\nComments: 12 pages\n");
bodyOnly.stat = { mtime: 1 };
assert.deepEqual(await controller.abstractPreview(pageFor(bodyOnly)), { text: "We study rotary embeddings.", source: "note", translated: false });
const translatedSection = addFile("notes/translated.md", {}, "## Abstract\n\nEnglish.\n\n## 摘要（简体中文）\n\n中文段落。\n");
translatedSection.stat = { mtime: 1 };
assert.equal((await controller.abstractPreview(pageFor(translatedSection))).text, "中文段落。", "a saved translated section is preferred over the original");
assert.equal(await controller.abstractPreview({ ...hoverPage, file: null }), null);
assert.equal(frontmatter.get("notes/roformer.md").abstract_zh.length > 0, true, "Save to note stores the translated abstract property");

// Unload aborts outstanding modal work.
const abort = controller.createAbortController();
controller.unload();
assert.equal(abort.signal.aborted, true);

rmSync(temp, { recursive: true, force: true });
console.log("paper controller integration PASS");
