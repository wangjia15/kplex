import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = join(root, "tests/fixtures/excalibrain-indexing/Vault");
const temp = mkdtempSync(join(tmpdir(), "kplex-index-test-"));

globalThis.window = globalThis;

function compile(relativePath) {
  const sourcePath = join(root, relativePath);
  const outputPath = join(temp, relativePath.replace(/\.ts$/, ".js"));
  mkdirSync(dirname(outputPath), { recursive: true });
  const source = readFileSync(sourcePath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2021,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      strict: true,
    },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    throw new Error(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  }
  writeFileSync(outputPath, result.outputText);
}

for (const file of [
  "src/types.ts",
  "src/util/perf.ts",
  "src/index/fieldParser.ts",
  "src/index/MetadataParser.ts",
  "src/index/RelationEvidence.ts",
  "src/index/RelationResolver.ts",
  "src/index/GraphState.ts",
  "src/index/IndexSnapshot.ts",
  "src/index/IndexedDbCache.ts",
  "src/index/GraphBuilder.ts",
  "src/index/GraphIndex.ts",
  "src/index/SectionExpansion.ts",
  "src/index/style.ts",
  "src/ui/layout.ts",
]) compile(file);

const obsidianModuleDir = join(temp, "node_modules/obsidian");
mkdirSync(obsidianModuleDir, { recursive: true });
writeFileSync(join(obsidianModuleDir, "index.js"), String.raw`
class TAbstractFile {
  constructor(path) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.parent = null;
  }
}
class TFile extends TAbstractFile {
  constructor(path, mtime = 1) {
    super(path);
    const dot = this.name.lastIndexOf('.');
    this.extension = dot >= 0 ? this.name.slice(dot + 1) : '';
    this.basename = dot >= 0 ? this.name.slice(0, dot) : this.name;
    this.stat = { mtime, ctime: mtime, size: 0 };
  }
}
class TFolder extends TAbstractFile {
  constructor(path) {
    super(path);
    this.children = [];
  }
}
function getAllTags(cache) {
  const tags = new Set((cache?.tags || []).map((x) => x.tag));
  const raw = cache?.frontmatter?.tags ?? cache?.frontmatter?.tag;
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    for (const token of value.split(/[\s,]+/)) if (token) tags.add(token.startsWith('#') ? token : '#' + token);
  }
  return [...tags];
}
function moment(value, inputFormat, strict) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const valid = Boolean(match) && (!strict || inputFormat === 'YYYY-MM-DD');
  return {
    isValid() { return valid; },
    format(fmt) {
      if (!valid) return 'Invalid date';
      const [, y, m, d] = match;
      const values = { YYYY: y, YY: y.slice(-2), MM: m, DD: d, M: String(Number(m)), D: String(Number(d)) };
      let out = '';
      for (let i = 0; i < fmt.length;) {
        if (fmt[i] === '[') {
          const close = fmt.indexOf(']', i + 1);
          if (close >= 0) { out += fmt.slice(i + 1, close); i = close + 1; continue; }
        }
        const token = ['YYYY', 'YY', 'MM', 'DD', 'M', 'D'].find((candidate) => fmt.startsWith(candidate, i));
        if (token) { out += values[token]; i += token.length; }
        else { out += fmt[i]; i += 1; }
      }
      return out;
    },
  };
}
const Platform = { isMobile: false };
module.exports = { TAbstractFile, TFile, TFolder, getAllTags, moment, Platform };
`);

const obsidianTestApi = require(join(obsidianModuleDir, "index.js"));
const { TFile, TFolder } = obsidianTestApi;
// Production K-Plex uses Obsidian's host-provided `window.moment`, just like the Tasks plugin.
// Install the test double on the fake window instead of pretending Moment is a production import.
globalThis.window.moment = obsidianTestApi.moment;
const { GraphIndex } = require(join(temp, "src/index/GraphIndex.js"));
const { persistedPageFromGraphPage, addPersistedPageToState, hydratePersistedRelations } = require(join(temp, "src/index/IndexSnapshot.js"));
const { createGraphState } = require(join(temp, "src/index/GraphState.js"));
const { buildCentralSectionExpansion, canExpandCentralSections } = require(join(temp, "src/index/SectionExpansion.js"));
const { parseBodyMetadata, parseBodyMetadataCore } = require(join(temp, "src/index/fieldParser.js"));
const { RelationType, LinkDirection } = require(join(temp, "src/types.js"));
const { RelationEvidenceStore } = require(join(temp, "src/index/RelationEvidence.js"));
const { buildSectionExpandedScene } = require(join(temp, "src/ui/layout.js"));

function walk(dir) {
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

function unquote(value) {
  const text = value.trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { frontmatter: {}, body: content };
  const frontmatter = {};
  let i = 1;
  for (; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "---" || line.trim() === "...") { i += 1; break; }
    const match = line.match(/^([^:#][^:]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const rest = match[2].trim();
    if (rest) {
      frontmatter[key] = unquote(rest);
      continue;
    }
    const values = [];
    while (i + 1 < lines.length) {
      const list = lines[i + 1].match(/^\s+-\s+(.*)$/);
      if (!list) break;
      values.push(unquote(list[1]));
      i += 1;
    }
    frontmatter[key] = values;
  }
  return { frontmatter, body: lines.slice(i).join("\n") };
}

function maskInlineCode(text) {
  return text.replace(/`+[^`]*`+/g, "");
}

const filePaths = walk(fixtureRoot).filter((path) => path.endsWith(".md"));
const contents = new Map();
const files = new Map();
let mtime = 1;
for (const absolute of filePaths) {
  const path = relative(fixtureRoot, absolute).replaceAll("\\", "/");
  contents.set(path, readFileSync(absolute, "utf8"));
  files.set(path, new TFile(path, mtime++));
}

const folders = new Map();
const rootFolder = new TFolder("");
rootFolder.name = "";
folders.set("", rootFolder);
function ensureFolder(path) {
  if (folders.has(path)) return folders.get(path);
  const parentPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const parent = ensureFolder(parentPath);
  const folder = new TFolder(path);
  folder.parent = parent;
  parent.children.push(folder);
  folders.set(path, folder);
  return folder;
}
for (const [path, file] of files) {
  const folderPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const folder = ensureFolder(folderPath);
  file.parent = folder;
  folder.children.push(file);
}

function positionAt(content, offset) {
  const before = content.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return { line: lines.length - 1, col: lines[lines.length - 1].length, offset };
}

function cacheLinks(content) {
  const links = [];
  const push = (link, start, end, original) => links.push({
    link, original, displayText: original,
    position: { start: positionAt(content, start), end: positionAt(content, end) },
  });
  for (const match of content.matchAll(/\[\[([^\]#|]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) {
    push(match[1], match.index, match.index + match[0].length, match[0]);
  }
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if (!/^https?:\/\//i.test(match[1])) push(match[1], match.index, match.index + match[0].length, match[0]);
  }
  return links;
}

const caches = new Map();
for (const [path, content] of contents) {
  const { frontmatter, body } = parseFrontmatter(content);
  const bodyWithoutCode = maskInlineCode(body);
  const bodyTags = [...bodyWithoutCode.matchAll(/(^|[^\w])#([A-Za-z0-9_/-]+)/g)].map((m) => ({ tag: `#${m[2]}` }));
  caches.set(path, { frontmatter, tags: bodyTags, links: cacheLinks(content) });
}

function resolveCandidate(raw) {
  let candidate = raw.trim();
  try { candidate = decodeURIComponent(candidate); } catch {}
  candidate = candidate.split("#")[0].split("|")[0].replace(/^\.\//, "");
  if (/^https?:\/\//i.test(candidate)) return null;
  const direct = candidate.toLowerCase().endsWith(".md") ? candidate : `${candidate}.md`;
  if (files.has(direct)) return direct;
  const lowerDirect = direct.toLowerCase();
  for (const path of files.keys()) if (path.toLowerCase() === lowerDirect) return path;
  const base = candidate.replace(/\.md$/i, "").toLowerCase();
  for (const path of files.keys()) {
    const basename = path.split("/").pop().replace(/\.md$/i, "").toLowerCase();
    if (basename === base) return path;
  }
  return null;
}

const resolvedLinks = {};
const unresolvedLinks = {};
for (const [sourcePath, content] of contents) {
  const resolved = {};
  const unresolved = {};
  const candidates = [];
  for (const match of content.matchAll(/\[\[([^\]#|]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) candidates.push(match[1]);
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) if (!/^https?:\/\//i.test(match[1])) candidates.push(match[1]);
  for (const candidate of candidates) {
    const target = resolveCandidate(candidate);
    if (target) resolved[target] = (resolved[target] ?? 0) + 1;
    else unresolved[candidate] = (unresolved[candidate] ?? 0) + 1;
  }
  resolvedLinks[sourcePath] = resolved;
  unresolvedLinks[sourcePath] = unresolved;
}

const metadataCache = {
  resolvedLinks,
  unresolvedLinks,
  getFileCache(file) { return caches.get(file.path) ?? null; },
  getFirstLinkpathDest(candidate) {
    const target = resolveCandidate(candidate);
    return target ? files.get(target) : null;
  },
};

const app = {
  vault: {
    getName() { return "K-Plex test vault"; },
    getRoot() { return rootFolder; },
    getMarkdownFiles() { return [...files.values()]; },
    getFiles() { return [...files.values()]; },
    cachedRead(file) { return Promise.resolve(contents.get(file.path) ?? ""); },
    getAbstractFileByPath(path) { return files.get(path) ?? folders.get(path) ?? null; },
  },
  metadataCache,
  metadataTypeManager: {
    getPropertyInfo(name) {
      return ["date", "review-date", "follow-up-date", "milestone-date"].includes(name) ? { widget: "date" } : { widget: "text" };
    },
    getAssignedWidget(name) {
      return ["date", "review-date", "follow-up-date", "milestone-date"].includes(name) ? "date" : "text";
    },
  },
  internalPlugins: {
    getPluginById(id) {
      if (id !== "daily-notes") return null;
      return { enabled: true, instance: { options: { folder: "Daily", format: "YYYY/MM/YYYYMMDD" } } };
    },
  },
  loadLocalStorage() { return null; },
  saveLocalStorage() {},
};

const hierarchy = {
  hidden: ["hidden"],
  parents: ["Parent", "Parents", "up", "u", "North", "origin", "inception", "source", "parent domain"],
  children: ["Children", "Child", "down", "d", "South", "leads to", "contributes to", "nurtures"],
  leftFriends: ["Friends", "Friend", "Jump", "Jumps", "j", "similar", "supports", "alternatives", "advantages", "pros"],
  rightFriends: ["opposes", "disadvantages", "missing", "cons", "Challenger"],
  previous: ["Previous", "Prev", "West", "w", "Before"],
  next: ["Next", "n", "East", "e", "After"],
  exclusions: [],
};

const settings = {
  hierarchy,
  excalibrainFilepath: "Excalibrain.md",
  noteTypeField: "Note type",
  primaryTagField: "Note type",
  tagStyleList: ["#project", "#person"],
  tagNodeStyles: {},
  noteTypeStyles: {},
  displayAllStylePrefixes: true,
  baseNodeStyle: { maxLabelLength: 30, fontSize: 20, padding: 10, gateRadius: 5 },
  centralNodeStyle: { fontSize: 30 },
  siblingNodeStyle: {},
  inferredNodeStyle: {},
  urlNodeStyle: {},
  virtualNodeStyle: {},
  attachmentNodeStyle: {},
  folderNodeStyle: {},
  tagNodeStyle: {},
  baseLinkStyle: {},
  inferredLinkStyle: {},
  folderLinkStyle: {},
  tagLinkStyle: {},
  hierarchyLinkStyles: {},
  centerEmbedHeight: 700,
  centerEmbedWidth: 550,
  compactingFactor: 2,
  minLinkLength: 18,
  parentColumns: 2,
  childColumns: 5,
  friendMaxHeight: 350,
  siblingMaxHeight: 250,
  parentMaxHeight: 300,
  childMaxHeight: 400,
  graphDepth: 1,
  inferAllLinksAsFriends: false,
  inverseInfer: false,
  showFullTagName: true,
  showInferredNodes: true,
  showVirtualNodes: true,
  showAttachments: true,
  showFolderNodes: true,
  showTagNodes: true,
  showPageNodes: true,
  showURLNodes: true,
  renderAlias: true,
  nodeTitleScript: "",
  excludeFilepaths: [],
  maxItemCount: 500,
  renderSiblings: true,
};

const plugin = { app, settings, recordDiagnostic() {}, manifest: { dir: "" } };
const index = new GraphIndex(plugin, app);

function expectRole(sourcePath, role, targetPath, type) {
  const source = index.get(sourcePath);
  assert(source, `Missing source ${sourcePath}`);
  const found = index.neighbours(source, role).find((item) => item.page.path === targetPath);
  assert(found, `Expected ${sourcePath} -> ${targetPath} as ${role}`);
  assert.equal(found.relationType, type, `${sourcePath} -> ${targetPath} ${role} type`);

  // Every asserted visible relationship must also be explainable from stored provenance.
  const explanation = index.explainRelationship(sourcePath, targetPath);
  assert(explanation, `Expected explanation for ${sourcePath} -> ${targetPath}`);
  assert(
    explanation.resolvedRoles.some((item) => item.role === role && item.relationType === type),
    `Explanation did not resolve ${sourcePath} -> ${targetPath} as ${role}`,
  );
  assert(explanation.decisions.some((item) => item.active), `Explanation has no active evidence for ${sourcePath} -> ${targetPath}`);
  return found;
}
function expectNoRole(sourcePath, role, targetPath) {
  const source = index.get(sourcePath);
  assert(source, `Missing source ${sourcePath}`);
  assert(!index.neighbours(source, role).some((item) => item.page.path === targetPath), `Did not expect ${sourcePath} -> ${targetPath} as ${role}`);
}

try {
  // Parser contract first: these cases failed in the old single-regex implementation.
  const parsed = parseBodyMetadata([
    "---",
    "Parent: \"[[IgnoredFrontmatter]]\"",
    "---",
    "Parent:: [[A]]",
    "Text before (Friend:: [[B]], [[C]]) but [[D]] stays outside.",
    "Text before [Challenger:: [[E]]] after.",
    "**source**:: [Alias](https://example.com/x)",
    "- Previous:: [[P]]",
    "Text (Friend:: [[F1]]) then [Challenger:: [[F2]]] on one line.",
    "`Fake:: [[Ignored]]`",
    "<!-- (Parent:: [[IgnoredComment]]) -->",
    "<!--",
    "Child:: [[IgnoredMultilineComment]]",
    "-->",
    "```",
    "Hidden:: [[Ignored2]]",
    "```",
  ].join("\n"));
  assert.deepEqual(parsed.inlineFields.parent, ["[[A]]"]);
  assert.deepEqual(parsed.inlineFields.source, ["[Alias](https://example.com/x)"]);
  assert.deepEqual(parsed.inlineFields.previous, ["[[P]]"]);
  assert.deepEqual(parsed.inlineFields.friend, ["[[B]], [[C]]", "[[F1]]"]);
  assert.deepEqual(parsed.inlineFields.challenger, ["[[E]]", "[[F2]]"]);
  assert.equal(parsed.inlineFields.fake, undefined);
  assert.equal(parsed.inlineFields.hidden, undefined);
  assert.equal(parsed.inlineFields.child, undefined);
  assert.equal(parsed.inlineFields["ignoredfrontmatter"], undefined);

  // MetadataParser serializes this exact function into its Web Worker. Verify the function is
  // genuinely self-contained so worker and fallback parsing cannot silently diverge.
  const isolatedParser = Function(`return (${parseBodyMetadataCore.toString()})`)();
  assert.deepEqual(isolatedParser([
    "Parent:: [[A]]",
    "Text (Friend:: [[B]]) then [Challenger:: [[C]]]",
  ].join("\n")), parseBodyMetadata([
    "Parent:: [[A]]",
    "Text (Friend:: [[B]]) then [Challenger:: [[C]]]",
  ].join("\n")));

  await index.rebuild();

  const A = index.get("Note A.md");
  assert(A);
  const neighborhoodA = index.getNeighborhood("Note A.md");
  assert(neighborhoodA);
  expectRole("Note A.md", "parent", "Note B.md", RelationType.DEFINED);
  expectRole("Note A.md", "parent", "https://source.com/ontology-full-line", RelationType.DEFINED);
  expectRole("Note A.md", "parent", "https://source.com/ontology-inline", RelationType.DEFINED);

  expectRole("Note A.md", "child", "Note C.md", RelationType.DEFINED);
  expectRole("Note A.md", "child", "Note F.md", RelationType.INFERRED);
  expectRole("Note A.md", "child", "Note Y.md", RelationType.INFERRED);
  expectRole("Note A.md", "child", "https://source.com/inferred", RelationType.INFERRED);
  expectRole("Note A.md", "child", "https://youtu.be/excalibrain-fixture-video", RelationType.INFERRED);

  expectRole("Note A.md", "left", "Note D.md", RelationType.DEFINED);
  expectRole("Note A.md", "left", "Note X.md", RelationType.DEFINED);
  expectRole("Note A.md", "left", "Note G.md", RelationType.DEFINED);
  expectRole("Note A.md", "left", "Note H.md", RelationType.INFERRED);
  expectRole("Note A.md", "right", "Note E.md", RelationType.DEFINED);

  assert.equal(index.get("https://source.com/ontology-full-line")?.name, "Source URL full-line ontology alias");
  assert.equal(index.get("https://source.com/ontology-inline")?.name, "Source URL inline ontology alias");
  assert.equal(index.get("https://source.com/inferred")?.name, "Source URL inferred alias");
  assert.equal(index.get("Note C.md")?.path, "Note C.md", "Markdown-link alias/%20 must resolve to canonical Note C identity");
  assert.equal(index.get("C via Markdown-link alias.md"), undefined, "Alias text must never become target identity");

  // P1–P2: deliberate K-Plex deviation. Frontmatter Parent overrides conflicting body Child,
  // while the losing body evidence survives for explainability.
  expectRole("Note X.md", "parent", "Note Y.md", RelationType.DEFINED);
  expectNoRole("Note X.md", "child", "Note Y.md");
  const explainXY = index.explainRelationship("Note X.md", "Note Y.md");
  assert(explainXY);
  assert.match(explainXY.summary, /Frontmatter ontology takes precedence/i);
  assert(explainXY.decisions.some((d) => d.active && d.evidence.sourceKind === "frontmatter-ontology" && d.evidence.declaredRole === "parent"));
  assert(explainXY.decisions.some((d) => !d.active && d.evidence.sourceKind === "inline-ontology" && d.evidence.declaredRole === "child"));
  assert(explainXY.decisions.some((d) => d.active && d.evidence.sourceKind === "obsidian-link"));
  assert.equal(explainXY.decisions.filter((d) => d.evidence.sourceKind === "obsidian-link").length, 1);

  // The same precedence decision must survive the inverse perspective.
  expectRole("Note Y.md", "child", "Note X.md", RelationType.DEFINED);
  expectNoRole("Note Y.md", "parent", "Note X.md");
  const explainYX = index.explainRelationship("Note Y.md", "Note X.md");
  assert(explainYX);
  assert.match(explainYX.summary, /Frontmatter ontology takes precedence/i);
  assert(explainYX.decisions.some((d) => d.active && d.evidence.sourceKind === "frontmatter-ontology" && d.evidence.declaredRole === "parent"));
  assert(explainYX.decisions.some((d) => !d.active && d.evidence.sourceKind === "inline-ontology" && d.evidence.declaredRole === "child"));

  // Same-tier explicit conflict still resolves laterally.
  expectRole("Note A.md", "left", "Note G.md", RelationType.DEFINED);
  const explainAG = index.explainRelationship("Note A.md", "Note G.md");
  assert(explainAG);
  assert.match(explainAG.summary, /Multiple active defined ontology roles conflict/i);
  assert.equal(explainAG.decisions.filter((d) => !d.active).length, 0);

  // Reciprocal ordinary links become inferred friends.
  expectRole("Note A.md", "left", "Note H.md", RelationType.INFERRED);
  expectRole("Note H.md", "left", "Note A.md", RelationType.INFERRED);

  // Previous / next inverse semantics.
  expectRole("Note F.md", "previous", "Note D.md", RelationType.DEFINED);
  expectRole("Note D.md", "next", "Note F.md", RelationType.DEFINED);
  expectRole("Note F.md", "next", "Note E.md", RelationType.DEFINED);
  expectRole("Note E.md", "previous", "Note F.md", RelationType.DEFINED);

  // Hidden is indexed and explainable, but not visible from F.
  for (const role of ["parent", "child", "left", "right", "previous", "next"]) expectNoRole("Note F.md", role, "Note X.md");
  const explainFX = index.explainRelationship("Note F.md", "Note X.md");
  assert(explainFX?.hidden);
  assert(explainFX.decisions.some((d) => d.evidence.role === "hidden" && d.active));

  // Note type compatibility: frontmatter and body Dataview field normalize #type/type identically.
  assert.equal(index.get("Note A.md")?.noteType, "project");
  assert.equal(index.get("Note B.md")?.noteType, "person");
  assert.equal(index.get("Note C.md")?.noteType, "project");

  // Legacy Markdown link inside string-valued YAML ontology remains supported.
  expectRole("Note C.md", "left", "Note D.md", RelationType.DEFINED);

  // Tags and hierarchical tag tree.
  expectRole("tag:body-tag", "child", "Note A.md", RelationType.DEFINED);
  expectRole("tag:project", "child", "Note A.md", RelationType.DEFINED);
  expectRole("tag:project", "child", "Note C.md", RelationType.DEFINED);
  expectRole("tag:person", "child", "Note B.md", RelationType.DEFINED);
  expectRole("tag:taxonomy", "child", "tag:taxonomy/body", RelationType.DEFINED);
  expectRole("tag:taxonomy/body", "child", "tag:taxonomy/body/leaf", RelationType.DEFINED);
  expectRole("tag:taxonomy/body/leaf", "child", "Note A.md", RelationType.DEFINED);
  expectRole("tag:taxonomy", "child", "tag:taxonomy/frontmatter", RelationType.DEFINED);
  expectRole("tag:taxonomy/frontmatter", "child", "tag:taxonomy/frontmatter/leaf", RelationType.DEFINED);
  expectRole("tag:taxonomy/frontmatter/leaf", "child", "Note D.md", RelationType.DEFINED);

  // Physical folder tree, with no synthetic folder for an unresolved October daily note.
  expectRole("folder:/", "child", "folder:Daily", RelationType.DEFINED);
  expectRole("folder:Daily", "child", "folder:Daily/2026", RelationType.DEFINED);
  expectRole("folder:Daily/2026", "child", "folder:Daily/2026/09", RelationType.DEFINED);
  expectRole("folder:Daily/2026/09", "child", "Daily/2026/09/20260918.md", RelationType.DEFINED);
  expectRole("folder:Daily/2026/09", "child", "Daily/2026/09/20260919.md", RelationType.DEFINED);
  expectRole("folder:/", "child", "Note A.md", RelationType.DEFINED);
  assert.equal(index.get("folder:Daily/2026/10"), undefined);

  // Native Date properties resolve through Daily Notes settings, including virtual targets.
  for (const target of [
    "Daily/2026/09/20260918.md",
    "Daily/2026/09/20260919.md",
    "Daily/2026/09/20260920.md",
  ]) expectRole("Note B.md", "child", target, RelationType.INFERRED);
  expectRole("Note C.md", "child", "Daily/2026/10/20261001.md", RelationType.INFERRED);
  assert(index.get("Daily/2026/09/20260920.md") && !index.get("Daily/2026/09/20260920.md").file);
  assert(index.get("Daily/2026/10/20261001.md") && !index.get("Daily/2026/10/20261001.md").file);
  assert.equal(index.get("2026-09-20"), undefined, "Raw ISO Date property values are not graph filenames");
  const explainDate = index.explainRelationship("Note B.md", "Daily/2026/09/20260920.md");
  assert(explainDate?.decisions.some((d) => d.evidence.sourceKind === "date-property" && d.evidence.fieldName === "follow-up-date"));
  assert.match(explainDate?.summary ?? "", /Date property/i);

  // URL frontmatter ontology and reverse/secondary cases.
  expectRole("Note B.md", "parent", "https://source.com/frontmatter", RelationType.DEFINED);
  expectRole("Note B.md", "child", "Note C.md", RelationType.DEFINED);
  expectRole("Note C.md", "parent", "Note B.md", RelationType.DEFINED);
  expectRole("Note Y.md", "parent", "Note A.md", RelationType.INFERRED);

  // Line-level provenance is present for body ontology.
  const explainAD = index.explainRelationship("Note A.md", "Note D.md");
  assert(explainAD?.decisions.some((d) =>
    d.evidence.sourceKind === "inline-ontology" &&
    d.evidence.fieldName === "Friend" &&
    Number.isInteger(d.evidence.line) &&
    Number.isInteger(d.evidence.start) &&
    Number.isInteger(d.evidence.end) &&
    d.evidence.end > d.evidence.start
  ));

  // Assertion 33: display formatting must never alter canonical tag identity.
  settings.showFullTagName = false;
  await index.rebuild();
  assert(index.get("tag:taxonomy/body/leaf"), "Canonical hierarchical tag path must survive showFullTagName=false");
  assert.equal(index.get("tag:taxonomy/body/leaf")?.name, "leaf");
  expectRole("tag:taxonomy/body/leaf", "child", "Note A.md", RelationType.DEFINED);
  settings.showFullTagName = true;
  await index.rebuild();

  // Assertions 34–42: central-note section expansion remains runtime-only.
  assert.equal(canExpandCentralSections(index.get("Note B.md"), "Note A.md"), false, "Non-central Markdown note must not be expandable");
  assert.equal(canExpandCentralSections(index.get("https://source.com/inferred"), "https://source.com/inferred"), false, "Non-Markdown nodes must not be expandable");
  assert.equal(canExpandCentralSections(index.get("Note A.md"), "Note A.md"), true);

  const expandedA = await buildCentralSectionExpansion(plugin, index, index.get("Note A.md"));
  assert(expandedA, "Expected Note A section expansion");
  assert.equal(expandedA.sections.length, 3, "Note A fixture must create exactly three transient sections");
  assert.deepEqual(expandedA.sections.map((section) => section.page.name), [
    "Friend and challenger cases",
    "Inference and conflict cases",
    "External URL cases",
  ]);
  for (const section of expandedA.sections) {
    assert.equal(index.get(section.page.path), undefined, `Transient section leaked into persistent index: ${section.page.path}`);
    assert.equal(section.page.transient?.kind, "section");
  }

  function expandedHas(neighborhood, role, actualPath, type) {
    const list = role === "parent" ? neighborhood.parents
      : role === "child" ? neighborhood.children
      : role === "left" ? neighborhood.leftFriends
      : neighborhood.rightFriends;
    const found = list.find((item) => (item.page.transient?.actualPath ?? item.page.path) === actualPath);
    assert(found, `Expanded view missing ${role} ${actualPath}`);
    assert.equal(found.relationType, type, `Expanded ${role} ${actualPath} type`);
    return found;
  }
  function expandedLacks(neighborhood, actualPath) {
    const all = [...neighborhood.parents, ...neighborhood.children, ...neighborhood.leftFriends, ...neighborhood.rightFriends];
    assert(!all.some((item) => (item.page.transient?.actualPath ?? item.page.path) === actualPath), `Expanded center unexpectedly retains ${actualPath}`);
  }

  expandedHas(expandedA.centerNeighborhood, "parent", "Note B.md", RelationType.DEFINED);
  expandedHas(expandedA.centerNeighborhood, "parent", "https://source.com/ontology-full-line", RelationType.DEFINED);
  expandedHas(expandedA.centerNeighborhood, "child", "Note C.md", RelationType.DEFINED);
  expandedHas(expandedA.centerNeighborhood, "left", "Note H.md", RelationType.INFERRED);
  expandedHas(expandedA.centerNeighborhood, "parent", "folder:/", RelationType.DEFINED);
  expandedHas(expandedA.centerNeighborhood, "parent", "tag:body-tag", RelationType.DEFINED);
  for (const moved of ["Note D.md", "Note X.md", "Note Y.md", "Note E.md", "Note F.md", "Note G.md", "https://source.com/ontology-inline", "https://source.com/inferred", "https://youtu.be/excalibrain-fixture-video"]) expandedLacks(expandedA.centerNeighborhood, moved);

  const friends = expandedA.sections.find((section) => section.page.name === "Friend and challenger cases");
  const conflict = expandedA.sections.find((section) => section.page.name === "Inference and conflict cases");
  const urls = expandedA.sections.find((section) => section.page.name === "External URL cases");
  assert(friends && conflict && urls);
  expandedHas(friends.neighborhood, "left", "Note D.md", RelationType.DEFINED);
  expandedHas(friends.neighborhood, "left", "Note X.md", RelationType.DEFINED);
  expandedHas(friends.neighborhood, "child", "Note Y.md", RelationType.INFERRED);
  expandedHas(friends.neighborhood, "right", "Note E.md", RelationType.DEFINED);
  expandedHas(conflict.neighborhood, "child", "Note F.md", RelationType.INFERRED);
  expandedHas(conflict.neighborhood, "left", "Note G.md", RelationType.DEFINED);
  expandedHas(urls.neighborhood, "parent", "https://source.com/ontology-inline", RelationType.DEFINED);
  expandedHas(urls.neighborhood, "child", "https://source.com/inferred", RelationType.INFERRED);
  expandedHas(urls.neighborhood, "child", "https://youtu.be/excalibrain-fixture-video", RelationType.INFERRED);

  // Section-target explanations use transient pair identity but retain original body provenance.
  const dTarget = friends.neighborhood.leftFriends.find((item) => item.page.transient?.actualPath === "Note D.md");
  assert(dTarget);
  const sectionExplanation = expandedA.explanations.get(`${friends.page.path}\u0000${dTarget.page.path}`);
  assert(sectionExplanation?.decisions.some((decision) => decision.active && decision.evidence.sourceKind === "inline-ontology" && decision.evidence.fieldName === "Friend"));

  // Collapsing is a pure view-state operation: the persistent whole-note graph was never changed.
  expectRole("Note A.md", "left", "Note D.md", RelationType.DEFINED);
  expectRole("Note A.md", "child", "Note F.md", RelationType.INFERRED);
  assert.equal(index.get(friends.page.path), undefined);

  // Assertions 43–47: nested headings form a runtime outline tree. This is the structural input
  // used by the fold/unfold renderer; it must not create persistent section identities.
  const sectionTree = await buildCentralSectionExpansion(plugin, index, index.get("Section Tree.md"));
  assert(sectionTree);
  assert.equal(sectionTree.sections.length, 5);
  const rootOne = sectionTree.sections.find((section) => section.page.name === "Root One");
  const childA = sectionTree.sections.find((section) => section.page.name === "Child A");
  const grandchild = sectionTree.sections.find((section) => section.page.name === "Grandchild");
  const childB = sectionTree.sections.find((section) => section.page.name === "Child B");
  const rootTwo = sectionTree.sections.find((section) => section.page.name === "Root Two");
  assert(rootOne && childA && grandchild && childB && rootTwo);
  assert.equal(rootOne.parentId, null);
  assert.deepEqual(rootOne.childIds, [childA.id, childB.id]);
  assert.equal(childA.parentId, rootOne.id);
  assert.deepEqual(childA.childIds, [grandchild.id]);
  assert.equal(grandchild.parentId, childA.id);
  assert.equal(rootTwo.parentId, null);
  for (const section of sectionTree.sections) assert.equal(index.get(section.page.path), undefined);

  // Assertions 48–50: folding is layout/view state only. A folded outline parent becomes the
  // visible projection source for all hidden-descendant relations, while provenance still points
  // back to the exact hidden section that declared each relation.
  const allExpandedIds = new Set(sectionTree.sections.filter((section) => section.childIds.length).map((section) => section.id));
  const fullTreeScene = buildSectionExpandedScene(sectionTree, index, settings, allExpandedIds);
  const fullSectionNodes = fullTreeScene.nodes.filter((node) => node.page.transient?.kind === "section");
  assert.equal(fullSectionNodes.length, 5);
  const foldedIds = new Set([...allExpandedIds].filter((id) => id !== rootOne.id));
  const foldedTreeScene = buildSectionExpandedScene(sectionTree, index, settings, foldedIds);
  const foldedSectionNodes = foldedTreeScene.nodes.filter((node) => node.page.transient?.kind === "section");
  assert.deepEqual(foldedSectionNodes.map((node) => node.page.name).sort(), ["Root One", "Root Two"]);
  const projectedGrandchild = foldedTreeScene.edges.find((edge) =>
    edge.sourcePath === rootOne.page.path && edge.explanationSourcePath === grandchild.page.path
  );
  assert(projectedGrandchild, "Folded Root One must project Grandchild relationship evidence upward");
  assert.equal(index.get(rootOne.page.path), undefined);

  // Assertions 51–53: warm-start cache and runtime patching. Resolved relations are persisted
  // alongside evidence so IndexedDB restore does not replay the full truth table, while a normal
  // single-note metadata change can be reconciled without rebuilding the vault.
  const savedPages = index.allPages().filter((page) => !page.transient).map(persistedPageFromGraphPage);
  const warmState = createGraphState();
  for (const saved of savedPages) addPersistedPageToState(warmState, saved, app);
  assert.equal(hydratePersistedRelations(warmState, savedPages), true);
  assert.equal(warmState.pages.get("Note A.md")?.neighbours.get("Note B.md")?.isParent, true);
  const runtimePatch = await index.patchMarkdownPaths(["Note A.md"]);
  assert.deepEqual(runtimePatch, { patched: true, count: 1 });
  expectRole("Note A.md", "parent", "Note B.md", RelationType.DEFINED);

  // Assertion 54: evidence storage is declaration-compact. One original fact is retained once,
  // while both source perspectives remain queryable for classification/explainability. This is a
  // deliberate iOS memory safeguard for large vaults.
  const compactEvidence = new RelationEvidenceStore();
  compactEvidence.addPair("A.md", "B.md", "parent", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "frontmatter-ontology", fieldName: "Parent" });
  assert.equal([...compactEvidence.declarations()].length, 1);
  assert.equal(compactEvidence.between("A.md", "B.md")[0]?.role, "parent");
  assert.equal(compactEvidence.between("B.md", "A.md")[0]?.role, "child");

  console.log("K-Plex indexing fixture: assertions 1–33 + P1–P2 PASS");
  console.log("Central section expansion fixture: assertions 34–50 PASS");
  console.log("Warm cache + incremental runtime patch: assertions 51–54 PASS");
} finally {
  index.destroy();
  rmSync(temp, { recursive: true, force: true });
}
