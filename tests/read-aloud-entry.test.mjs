/** Focused observable checks for the built-in reader's editor entry points, read fences and persisted speech preferences. */
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const temp = mkdtempSync(join(tmpdir(), "kplex-reader-entry-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));

/** Host stand-in mirroring the parent reader harness; settings.ts only needs these members at import time. */
const OBSIDIAN_STUB = `export class Component {load(){} unload(){}} export const MarkdownRenderer={}; export class App {} export class Modal {} export class SuggestModal extends Modal {} export class ColorComponent {} export class Notice {} export class AbstractInputSuggest {} export class PluginSettingTab {} export class Scope {} export class SecretComponent {} export class Setting {} export class ButtonComponent {} export class ExtraButtonComponent {} export class SearchComponent {} export const setIcon=()=>{}; export const setTooltip=()=>{}; export const getIcon=()=>null; export const getIconIds=()=>[]; export const getLanguage=()=>"en"; export const Platform={};`;

await build({ stdin: { contents: 'export * from "./src/settings"; export * from "./src/core/graph/settingsPolicy";', resolveDir: process.cwd() },
  outfile: join(temp, "settings.mjs"), bundle: true, platform: "node", format: "esm",
  plugins: [{ name: "host", setup(b) {
    b.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "host" }));
    b.onLoad({ filter: /.*/, namespace: "host" }, () => ({ contents: OBSIDIAN_STUB, loader: "js" }));
  } }] });
const settings = await import(pathToFileURL(join(temp, "settings.mjs")).href);

/**
 * Bundling all of main.ts keeps the real entry-point methods under test instead of a copy. The host
 * module supplies only members needed at import time; getFrontMatterInfo is an explicit test double
 * of Obsidian's YAML bounds and Notice records instances so localized failure notices are observable.
 */
const CONSTRUCTOR_NAMES = new Set(["Plugin", "FileView", "TextFileView", "ItemView", "WorkspaceLeaf", "WorkspaceSplit",
  "EditorSuggest", "Modal", "SuggestModal", "App", "View", "Menu", "Scope", "Setting", "ButtonComponent",
  "ExtraButtonComponent", "SearchComponent", "AbstractInputSuggest", "PluginSettingTab", "SecretComponent",
  "MarkdownView", "TFile", "TFolder", "TAbstractFile", "FuzzySuggestModal", "TextAreaComponent", "TextComponent"]);
const MAIN_STUB = new Map([
  ["Component", "export class Component {load(){} unload(){}}"],
  ["MarkdownRenderer", "export const MarkdownRenderer={}"],
  ["App", "export class App {}"],
  ["Modal", "export class Modal {}"],
  ["SuggestModal", "export class SuggestModal extends Modal {}"],
  ["Notice", "export class Notice { constructor(message){ (globalThis.__kplexTestNotices ??= []).push(String(message)); } }"],
  ["ColorComponent", "export class ColorComponent {}"],
  ["AbstractInputSuggest", "export class AbstractInputSuggest {}"],
  ["PluginSettingTab", "export class PluginSettingTab {}"],
  ["Scope", "export class Scope {}"],
  ["SecretComponent", "export class SecretComponent {}"],
  ["Setting", "export class Setting {}"],
  ["ButtonComponent", "export class ButtonComponent {}"],
  ["ExtraButtonComponent", "export class ExtraButtonComponent {}"],
  ["SearchComponent", "export class SearchComponent {}"],
  ["MarkdownView", "export class MarkdownView {}"],
  ["TFile", "export class TFile {}"],
  ["TFolder", "export class TFolder {}"],
  ["TAbstractFile", "export class TAbstractFile {}"],
  ["View", "export class View {}"],
  ["Menu", "export class Menu {}"],
  ["setIcon", "export const setIcon=()=>{};"],
  ["setTooltip", "export const setTooltip=()=>{};"],
  ["getIcon", "export const getIcon=()=>null;"],
  ["getIconIds", "export const getIconIds=()=>[];"],
  ["getLanguage", "export const getLanguage=()=>\"en\";"],
  ["getAllTags", "export const getAllTags=()=>[];"],
  ["normalizePath", "export const normalizePath=p=>p;"],
  ["parseLinktext", "export const parseLinktext=t=>({path:t,subpath:\"\"});"],
  ["apiVersion", "export const apiVersion=\"1.13.0\";"],
  ["Platform", "export const Platform={isDesktop:true};"],
  ["getFrontMatterInfo", `export function getFrontMatterInfo(content){
  const m = /^---\\n([\\s\\S]*?)\\n---(?:\\n|$)/.exec(content);
  if (!m) return {exists:false, frontmatter:"", from:0, to:0, contentStart:0};
  return {exists:true, frontmatter:m[1], from:4, to:4+m[1].length, contentStart:m[0].length};
}`],
]);
let mainBundle;
{
  const stub = new Map(MAIN_STUB);
  let result;
  for (let pass = 0; pass < 8; pass++) {
    try {
      result = await build({ entryPoints: ["src/main.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
        plugins: [{ name: "host", setup(b) {
          b.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "host" }));
          b.onLoad({ filter: /.*/, namespace: "host" }, () => ({ contents: [...stub.values()].join("\n"), loader: "js" }));
        } }] });
      break;
    } catch (error) {
      const missing = [...String(error).matchAll(/import "(\w+)"/g)].map(match => match[1]).filter(name => !stub.has(name));
      if (!missing.length) throw error;
      for (const name of new Set(missing)) stub.set(name, CONSTRUCTOR_NAMES.has(name) ? `export class ${name} {}` : `export const ${name}=undefined;`);
    }
  }
  if (!result) throw new Error("main.ts bundle never succeeded");
  writeFileSync(join(temp, "main.mjs"), result.outputFiles[0].text);
  mainBundle = await import(pathToFileURL(join(temp, "main.mjs")).href);
}
const P = mainBundle.default.prototype;

/** Minimal plugin stand-in supplying exactly the members the reader entry-point methods consume. */
function harness({ content = "Cached body", current } = {}) {
  const state = { reads: [], cachedReads: 0 };
  const file = { path: "Notes/A.md", basename: "A", name: "A.md", stat: { mtime: 1, size: 10 } };
  const h = {
    readAloudRequestToken: 0,
    unloading: false,
    translator: key => key,
    readAloudDocumentText: P.readAloudDocumentText,
    readAloudSelectionText: P.readAloudSelectionText,
    app: { vault: {
      cachedRead: async () => { state.cachedReads += 1; return content; },
      getFileByPath: () => current === undefined ? file : current,
    } },
    readFromEditorView: (text, view) => state.reads.push({ text, view }),
  };
  return { h, file, state };
}

/** Markdown view stand-in with a mode, captured file, editor and a native selection inside/outside its container. */
function selectionView({ mode = "preview", selected = "", inside = true, file } = {}) {
  const contained = { node: true };
  const outside = { node: false };
  const view = {
    file: file ?? { path: "Notes/A.md", basename: "A", name: "A.md", stat: { mtime: 1, size: 10 } },
    leaf: { view: { containerEl: { ownerDocument: {} } } },
    getMode: () => mode,
    editor: { getSelection: () => selected, getValue: () => selected },
    containerEl: {
      isConnected: true,
      ownerDocument: { getSelection: () => ({ rangeCount: selected ? 1 : 0, isCollapsed: !selected, anchorNode: inside ? contained : outside, focusNode: contained, toString: () => selected }) },
      contains: node => node === contained,
    },
  };
  return view;
}

test("speech preference fields persist, sanitize and stay out of graph signatures", () => {
  const fresh = settings.migrateAndMergeSettings({ lastActivePath: "A.md", unknown: { keep: 1 } });
  assert.equal(fresh.readAloudEdgeVoice, "auto");
  assert.equal(fresh.readAloudSystemVoice, "auto");
  assert.equal(fresh.readAloudRate, 1);
  assert.deepEqual(fresh.unknown, { keep: 1 });

  const saved = settings.migrateAndMergeSettings({ ...fresh, readAloudEdgeVoice: "zh-CN-YunxiNeural", readAloudSystemVoice: "Microsoft Zira", readAloudRate: 1.5 });
  const reload = settings.migrateAndMergeSettings(JSON.parse(JSON.stringify(saved)));
  assert.equal(reload.readAloudEdgeVoice, "zh-CN-YunxiNeural");
  assert.equal(reload.readAloudSystemVoice, "Microsoft Zira");
  assert.equal(reload.readAloudRate, 1.5);
  assert.equal(reload.readAloudEngine, "edge");
  assert.deepEqual(reload.unknown, { keep: 1 });

  const sanitized = settings.migrateAndMergeSettings({ readAloudEdgeVoice: "zh-CN-XiaoxiaoNeural'><svg onload=alert(1)>", readAloudSystemVoice: "x".repeat(300), readAloudRate: 12 });
  assert.equal(sanitized.readAloudEdgeVoice, "auto");
  assert.equal(sanitized.readAloudSystemVoice, "auto");
  assert.equal(sanitized.readAloudRate, 2);
  assert.equal(settings.migrateAndMergeSettings({ readAloudRate: -3 }).readAloudRate, 0.5);
  assert.equal(settings.migrateAndMergeSettings({ readAloudRate: "fast" }).readAloudRate, 1);

  const effects = settings.classifySettingsChange(settings.captureSettingsPolicy(fresh), settings.captureSettingsPolicy(saved));
  assert.equal(effects.semanticInvalidation, false);
  assert.deepEqual(effects.changedKeys, []);
});

test("reading-mode selections stay rendered plain text; source-mode selections convert through the shared helper", () => {
  const rendered = harness();
  const renderedView = selectionView({ selected: "Prefix <value> [A] **bold**   " });
  P.readAloudViewSelection.call(rendered.h, renderedView);
  assert.equal(rendered.state.reads.length, 1);
  assert.equal(rendered.state.reads[0].text, "Prefix <value> [A] **bold**", "rendered selection keeps literal markup and is only trimmed");
  assert.equal(rendered.state.reads[0].view, renderedView);

  const markdown = harness();
  P.readAloudViewSelection.call(markdown.h, selectionView({ mode: "source", selected: "**bold** and [[Link|alias]]" }));
  assert.equal(markdown.state.reads.length, 1);
  assert.equal(markdown.state.reads[0].text, "bold and alias");

  const outside = harness();
  P.readAloudViewSelection.call(outside.h, selectionView({ selected: "other pane selection", inside: false }));
  assert.equal(outside.state.reads.length, 0);
  assert.equal(outside.h.app.vault.cachedReads ?? 0, 0);

  const editorMenu = harness();
  P.readAloudEditorDocument.call(editorMenu.h, { getValue: () => "---\nkey: value\n---\nBody **b** Unsaved tail" }, selectionView({ mode: "source" }));
  assert.equal(editorMenu.state.reads.length, 1);
  assert.equal(editorMenu.state.reads[0].text, "Body b Unsaved tail", "whole-note reads include unsaved editor text without frontmatter");
});

test("reading-view full-note reads use one cached read fenced against supersession and drift", async () => {
  const success = harness({ content: "---\nfront: matter\n---\nCached **body**" });
  const view = selectionView({ file: success.file });
  await P.readAloudActiveNote.call(success.h, view);
  assert.equal(success.state.cachedReads, 1);
  assert.equal(success.state.reads.length, 1);
  assert.equal(success.state.reads[0].text, "Cached body");
  assert.equal(success.state.reads[0].view.file, success.file);

  const superseded = harness();
  const pendingView = selectionView({ file: superseded.file });
  const pending = P.readAloudActiveNote.call(superseded.h, pendingView);
  superseded.h.readAloudRequestToken += 1;
  await pending;
  assert.equal(superseded.state.reads.length, 0, "an older read must not replace a newer request");

  const replaced = harness({ current: {} });
  await P.readAloudActiveNote.call(replaced.h, selectionView({ file: replaced.file }));
  assert.equal(replaced.state.reads.length, 0, "a replaced or moved vault file is never read aloud");

  const modified = harness();
  const modifiedView = selectionView({ file: modified.file });
  const pendingModified = P.readAloudActiveNote.call(modified.h, modifiedView);
  modified.file.stat.mtime = 2;
  await pendingModified;
  assert.equal(modified.state.reads.length, 0, "a note modified during the read is skipped");

  const navigated = harness();
  const navigatedView = selectionView({ file: navigated.file });
  const pendingNavigated = P.readAloudActiveNote.call(navigated.h, navigatedView);
  navigatedView.file = { path: "Notes/B.md", basename: "B", name: "B.md", stat: { mtime: 5, size: 5 } };
  await pendingNavigated;
  assert.equal(navigated.state.reads.length, 0, "navigation to another file during the read discards it");

  const disconnected = harness();
  const disconnectedView = selectionView({ file: disconnected.file });
  const pendingDisconnected = P.readAloudActiveNote.call(disconnected.h, disconnectedView);
  disconnectedView.containerEl.isConnected = false;
  await pendingDisconnected;
  assert.equal(disconnected.state.reads.length, 0, "a closed pane never publishes a late read");

  const switched = harness();
  const switchedView = selectionView({ file: switched.file });
  const pendingSwitched = P.readAloudActiveNote.call(switched.h, switchedView);
  switchedView.getMode = () => "source";
  await pendingSwitched;
  assert.equal(switched.state.reads.length, 0, "a mode switch to source with possible unsaved text discards the cached read");

  globalThis.__kplexTestNotices = [];
  const failed = harness();
  failed.h.app.vault.cachedRead = async () => { throw new Error("disk gone"); };
  await P.readAloudActiveNote.call(failed.h, selectionView({ file: failed.file }));
  assert.equal(failed.state.reads.length, 0);
  assert.ok(globalThis.__kplexTestNotices.includes("speech.failed"), "read failure surfaces a localized notice");
  const staleFailed = harness();
  staleFailed.h.app.vault.cachedRead = async () => { throw new Error("stale disk gone"); };
  const pendingStaleFailed = P.readAloudActiveNote.call(staleFailed.h, selectionView({ file: staleFailed.file }));
  staleFailed.h.readAloudRequestToken += 1;
  globalThis.__kplexTestNotices = [];
  await pendingStaleFailed;
  assert.equal(globalThis.__kplexTestNotices.length, 0, "a superseded failure reports nothing");
  delete globalThis.__kplexTestNotices;

  const sourceMode = harness();
  P.readAloudActiveNote.call(sourceMode.h, selectionView({ mode: "source", selected: "Editor body", file: sourceMode.file }));
  assert.equal(sourceMode.state.cachedReads, 0, "source mode reads the editor, never the file");
  assert.equal(sourceMode.state.reads.length, 1);
  assert.equal(sourceMode.state.reads[0].text, "Editor body");
});
