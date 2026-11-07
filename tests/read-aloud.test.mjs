/** Built-in speech behavior: Edge preference/fallback, bounded chunks, pause/abort and settings compatibility. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const temp = mkdtempSync(join(tmpdir(), "kplex-reader-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));
await build({ stdin: { contents: 'export * from "./src/readAloud"; export * from "./src/readAloudPreferences"; export * from "./src/settings"; export * from "./src/core/graph/settingsPolicy";', resolveDir: process.cwd() },
  outfile: join(temp, "reader.mjs"), bundle: true, platform: "node", format: "esm", plugins: [{ name: "host", setup(b) {
    b.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "host" }));
    b.onLoad({ filter: /.*/, namespace: "host" }, () => ({ contents: `export class Component {load(){} unload(){}} export const MarkdownRenderer={}; export class App {} export class Modal {} export class SuggestModal extends Modal {} export class ColorComponent {} export class Notice {} export class AbstractInputSuggest {} export class PluginSettingTab {} export class Scope {} export class SecretComponent {} export class Setting {} export class ButtonComponent {} export class ExtraButtonComponent {} export class SearchComponent {} export const setIcon=()=>{}; export const setTooltip=()=>{}; export const getIcon=()=>null; export const getIconIds=()=>[]; export const getLanguage=()=>"en"; export const Platform={};`, loader: "js" }));
  } }] });
const m = await import(pathToFileURL(join(temp, "reader.mjs")));

/** Advance promise continuations without delaying real audio/network or relying on a timing assertion. */
const turn = () => new Promise(resolve => setImmediate(resolve));

/** Model only speaker/media effects; the production player owns all ordering, cancellation and fallback. */
function fixture({ synthesize, audioFailure = false, heldSpeech = false } = {}) {
  const calls = [], states = [], urls = new Set();
  let utterance;
  const audio = {
    src: "", onended: null, onerror: null,
    pause() { calls.push("pause-audio"); },
    removeAttribute() { this.src = ""; }, load() {},
    async play() {
      calls.push("audio");
      if (audioFailure) throw new Error("Decoder blocked");
      queueMicrotask(() => this.onended?.());
    },
  };
  const speech = {
    getVoices: () => [{ lang: "en-US", name: "Test" }],
    speak(value) { utterance = value; calls.push(["system", value.text, value.lang]); if (!heldSpeech) queueMicrotask(() => value.onend?.()); },
    pause() { calls.push("pause-system"); }, resume() { calls.push("resume-system"); }, cancel() { calls.push("cancel-system"); },
  };
  const host = {
    synthesize: synthesize ?? (async text => { calls.push(["edge", text]); return new Blob(["audio"]); }),
    createAudio: () => audio, speech,
    createUtterance: text => ({ text }),
    createUrl: () => { const url = `blob:test-${urls.size}`; urls.add(url); return url; },
    revokeUrl: url => { assert(urls.delete(url)); },
    schedule: (callback, milliseconds) => setTimeout(callback, milliseconds),
    cancelTimer: timer => clearTimeout(timer),
  };
  const player = new m.ReadAloudPlayer(host, state => states.push(state), () => calls.push("fallback"));
  return { player, host, calls, states, urls, audio, get utterance() { return utterance; } };
}

test("Edge is first choice and completed chunks do not invoke system speech", async () => {
  const f = fixture();
  await f.player.play("Hello world.", "edge", "en-US");
  assert.equal(f.player.state, "finished");
  assert.equal(f.calls.filter(call => Array.isArray(call) && call[0] === "edge").length, 1);
  assert(!f.calls.some(call => Array.isArray(call) && call[0] === "system"));
  assert.equal(f.urls.size, 0);
  f.player.stop();
  assert(!f.calls.includes("cancel-system"), "Edge stop must not cancel another app's system utterance");
});

test("network and media failures fall back once, then continue in the system engine", async () => {
  for (const audioFailure of [false, true]) {
    let requested = 0;
    const f = fixture({ audioFailure, synthesize: async () => { requested++; if (!audioFailure) throw new Error("Offline"); return new Blob(["audio"]); } });
    await f.player.play("A".repeat(4000), "edge", "en-US");
    assert.equal(f.player.state, "finished");
    assert.equal(requested, 1);
    assert.equal(f.calls.filter(call => call === "fallback").length, 1);
    assert.equal(f.calls.filter(call => Array.isArray(call) && call[0] === "system").map(call => call[1]).join(""), "A".repeat(4000));
    assert.equal(f.urls.size, 0);
  }
});

test("system selection makes no Edge request and pause/resume preserve the owned utterance", async () => {
  const f = fixture({ heldSpeech: true, synthesize: () => { throw new Error("Must not contact Edge"); } });
  const task = f.player.play("Hello", "system", "en-US");
  await turn();
  f.player.pause(); assert.equal(f.player.state, "paused");
  f.player.resume(); assert.equal(f.player.state, "playing");
  assert(f.calls.includes("pause-system")); assert(f.calls.includes("resume-system"));
  f.utterance.onend(); await task;
  assert.equal(f.player.state, "finished");
});

test("stopping a system engine that emits no cancellation event still settles playback", async () => {
  const f = fixture({ heldSpeech: true });
  const task = f.player.play("Hello", "system", "en-US");
  await turn(); f.player.stop(); await task;
  assert.equal(f.player.state, "idle");
  assert.equal(f.utterance.onend, null); assert.equal(f.utterance.onerror, null);
  assert(f.calls.includes("cancel-system"));
});

test("pause during synthesis prevents eventual audio until resumed", async () => {
  let complete;
  const f = fixture({ synthesize: () => new Promise(resolve => { complete = resolve; }) });
  const task = f.player.play("Hello", "edge", "en-US");
  await turn(); f.player.pause(); complete(new Blob(["audio"])); await turn();
  assert.equal(f.player.state, "paused"); assert(!f.calls.includes("audio"));
  f.player.resume(); await task;
  assert(f.calls.includes("audio")); assert.equal(f.player.state, "finished");
});

test("late synthesis after close/replacement cannot play or change the new request", async () => {
  let complete, signal;
  const f = fixture({ synthesize: (_text, _language, captured) => { signal = captured; return new Promise(resolve => { complete = resolve; }); } });
  const old = f.player.play("Old", "edge", "en-US");
  await turn(); f.player.stop(); assert(signal.aborted);
  await f.player.play("New", "system", "en-US");
  complete(new Blob(["audio"])); await old;
  assert.equal(f.player.state, "finished"); assert(!f.calls.includes("audio"));
});

test("unavailable system engine fails visibly and bounded text preserves Unicode", async () => {
  const f = fixture(); f.host.speech = undefined;
  await f.player.play("Hello", "system", "en-US"); assert.equal(f.player.state, "failed");
  const text = "x".repeat(1799) + "😀" + "中文。".repeat(2000);
  const chunks = [...m.speechChunks(text)];
  assert.equal(chunks.join(""), text);
  assert(chunks.every(chunk => chunk.length <= 1800 && !/[\ud800-\udbff]$/u.test(chunk)));
  assert.throws(() => [...m.speechChunks(text, 1)]);
  assert.equal(m.speechLanguage("你好", "auto", "en"), "zh-CN");
  assert.equal(m.speechLanguage("你好", "auto", "zh-TW"), "zh-TW");
  assert.equal(m.speechLanguage("日本語です", "auto", "en"), "ja-JP");
  assert.equal(m.speechLanguage("Hello", "de-DE", "en"), "de-DE");
});

test("existing settings load with Edge default; explicit system/language and unknown data survive reload/import", () => {
  const old = m.migrateAndMergeSettings({ lastActivePath: "Existing.md", futureSetting: { keep: true } });
  assert.equal(old.readAloudEngine, "edge"); assert.equal(old.readAloudLanguage, "auto");
  const saved = m.migrateAndMergeSettings({ ...old, readAloudEngine: "system", readAloudLanguage: "zh-TW" });
  const reload = m.migrateAndMergeSettings(JSON.parse(JSON.stringify(saved)));
  assert.equal(reload.readAloudEngine, "system"); assert.equal(reload.readAloudLanguage, "zh-TW");
  assert.deepEqual(reload.futureSetting, { keep: true }); assert.equal(reload.lastActivePath, "Existing.md");
  const foreign = m.importExcaliBrainGraphSettings({ readAloudEngine: "edge", readAloudLanguage: "en-US" }, reload);
  assert.equal(foreign.readAloudEngine, "system"); assert.equal(foreign.readAloudLanguage, "zh-TW");
  const effects = m.classifySettingsChange(m.captureSettingsPolicy(old), m.captureSettingsPolicy(saved));
  assert.equal(effects.semanticInvalidation, false);
  assert.deepEqual(effects.changedKeys, []);
  assert.equal(m.migrateAndMergeSettings({ readAloudEngine: 12, readAloudLanguage: "bad" }).readAloudLanguage, "auto");
});

test("a silent system service fails after its initialization deadline, while a user pause retains the wait", async () => {
  const f = fixture({ heldSpeech: true });
  let deadline;
  f.host.schedule = callback => { deadline = callback; return 1; };
  f.host.cancelTimer = () => {};
  const task = f.player.play("Hello", "system", "en-US");
  await turn(); f.player.pause(); deadline(); assert.equal(f.player.state, "paused");
  f.player.resume(); deadline(); await task;
  assert.equal(f.player.state, "failed"); assert(f.calls.includes("cancel-system"));
});

test("fallback after a completed Edge chunk reads only the remaining text", async () => {
  let count = 0;
  const text = "A".repeat(1800) + "B".repeat(1800);
  const f = fixture({ synthesize: async () => { if (++count === 2) throw new Error("Lost connection"); return new Blob(["audio"]); } });
  await f.player.play(text, "edge", "en-US");
  const systemText = f.calls.filter(call => Array.isArray(call) && call[0] === "system").map(call => call[1]).join("");
  assert.equal(systemText, "B".repeat(1800)); assert.equal(f.player.state, "finished");
});

test("stop during active audio revokes the URL and settles even without a native ended event", async () => {
  const f = fixture(); f.audio.play = async () => {};
  const task = f.player.play("Hello", "edge", "en-US");
  await turn(); assert.equal(f.urls.size, 1);
  f.player.pause(); f.player.stop(); await task;
  assert.equal(f.player.state, "idle"); assert.equal(f.urls.size, 0);
  assert.equal(f.audio.onended, null); assert.equal(f.audio.onerror, null);
});

test("paragraph progress follows blank-line blocks rather than long-paragraph audio chunks", async () => {
  const f = fixture(), positions = [], text = "A".repeat(3600) + "\r\n \r\nSecond\nsoft line\n\n\nThird";
  const player = new m.ReadAloudPlayer(f.host, () => {}, () => {}, index => positions.push(index));
  await player.play(text, "edge", "en-US");
  assert.deepEqual(positions, [0, 1, 2]);
  assert.equal(f.calls.filter(call => Array.isArray(call) && call[0] === "edge").length, 4);
  assert.deepEqual(m.speechParagraphs("\n\nFirst\nsoft\n \nSecond\n\n"), ["First\nsoft", "Second"]);
  f.calls.length = 0; positions.length = 0;
  await player.play(text, "system", "en-US", { startParagraph: 1 });
  assert.deepEqual(positions, [1, 2]);
  assert.deepEqual(f.calls.filter(call => Array.isArray(call) && call[0] === "system").map(call => call[1]), ["Second\nsoft line", "Third"]);
});

test("selected Edge voice and live rate reach synthesis and native audio without resynthesis", async () => {
  const requests = [];
  const f = fixture({ synthesize: async (...args) => { requests.push(args); return new Blob(["audio"]); } });
  f.audio.play = async () => {};
  const task = f.player.play("Synthetic paragraph", "edge", "zh-CN", { edgeVoice: "zh-CN-YunxiNeural", rate: 1.25 });
  await turn();
  assert.equal(requests[0][3].voice, "zh-CN-YunxiNeural");
  assert.equal(f.audio.playbackRate, 1.25);
  f.player.setRate(1.75);
  assert.equal(f.audio.playbackRate, 1.75);
  assert.equal(requests.length, 1);
  f.player.setRate(30); assert.equal(f.audio.playbackRate, 2);
  f.audio.onended(); await task;
});

test("explicit installed voice and bounded rate reach the system utterance", async () => {
  const f = fixture({ heldSpeech: true });
  f.host.speech.getVoices = () => [{ name: "Default", lang: "en-US", voiceURI: "default" }, { name: "Selected", lang: "en-US", voiceURI: "chosen" }];
  const task = f.player.play("Text", "system", "en-US", { systemVoice: "chosen", rate: 1.4 });
  await turn();
  assert.equal(f.utterance.voice.voiceURI, "chosen");
  assert.equal(f.utterance.rate, 1.4);
  assert.equal(f.player.usesSystemSpeech, true);
  f.player.stop(); await task;
  assert.equal(f.player.usesSystemSpeech, false);
});

test("all existing reading surfaces use the built-in shell and unload closes its owner", () => {
  const main = readFileSync("src/main.ts", "utf8");
  assert(!main.includes("obttsReadApi"));
  assert(main.includes("new ReadAloudModal("));
  assert(main.includes("this.readAloudModal?.close(); this.readAloudModal = null;"));
  const modal = readFileSync("src/ui/ReadAloudModal.ts", "utf8");
  assert(modal.includes('"speech.edgeDisclosure"'));
  assert(modal.includes("this.player?.stop()"));
});
