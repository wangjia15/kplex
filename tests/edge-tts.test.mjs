/** Focused protocol and cancellation checks against the production Edge speech module. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { webcrypto } from "node:crypto";
import { builtinModules, createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { readFileSync } from "node:fs";

const result = await build({ entryPoints: ["src/edgeTts.ts"], bundle: true, write: false, format: "esm", platform: "browser", plugins: [{ name: "transport-mocks", setup(build) {
  build.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "test" }));
  build.onResolve({ filter: /^\.\/edgeTtsDesktop$/ }, () => ({ path: "desktop", namespace: "test" }));
  build.onLoad({ filter: /.*/, namespace: "test" }, args => ({ contents: args.path === "obsidian" ? "export const Platform = globalThis.edgeTestPlatform;" : "export const openEdgeSocket = url => new WebSocket(url);", loader: "js" }));
} }] });
globalThis.edgeTestPlatform = { isDesktop: true };
const { edgeToken, edgeVoice, synthesizeEdgeSpeech } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString("base64")}`);
const preferencesResult = await build({ entryPoints: ["src/readAloudPreferences.ts"], bundle: true, write: false, format: "esm" });
const { EDGE_READ_ALOUD_VOICES, READ_ALOUD_LANGUAGES, sanitizeReadAloudEdgeVoice, sanitizeReadAloudSystemVoice, sanitizeReadAloudRate } = await import(`data:text/javascript;base64,${Buffer.from(preferencesResult.outputFiles[0].contents).toString("base64")}`);
globalThis.window = { crypto: webcrypto, setTimeout, clearTimeout };

class Socket {
  static CLOSING = 2;
  static instances = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; Socket.instances.push(this); }
  send(value) { this.sent.push(value); }
  close() { this.readyState = 3; this.closed = true; }
  open() { this.readyState = 1; this.onopen?.(); }
  message(data) { this.onmessage?.({data}); }
}
globalThis.WebSocket = Socket;

/** Create a server-format binary audio frame. */
function frame(contentType, audio) {
  const header = new TextEncoder().encode(`Path:audio\r\n${contentType ? `Content-Type:${contentType}\r\n` : ""}`);
  const bytes = new Uint8Array(2 + header.length + audio.length);
  bytes[0] = header.length >>> 8; bytes[1] = header.length & 255;
  bytes.set(header, 2); bytes.set(audio, 2 + header.length);
  return bytes.buffer;
}

test("v2 authentication matches upstream and maps supported voices", () => {
  assert.equal(edgeToken(1700000000), "2CD23A2CA0B2595A-F3C846C370E05F9CC83ACC5F995C5F5D87A4D0F14CE8936A0F902E64099E38A2");
  assert.equal(edgeVoice("en-US", "hello"), "en-US-AriaNeural");
  assert.equal(edgeVoice("en"), "en-US-AriaNeural", "The transport must honor the caller's explicit language choice");
  assert.equal(edgeVoice("zh-TW", "你好"), "zh-TW-HsiaoChenNeural");
  for (const locale of ["de", "fr", "es", "nl", "ja", "ru"]) assert.ok(edgeVoice(locale, "test").startsWith(`${locale}-`));
});

test("voice and playback preferences validate bounded inputs", () => {
  for (const locale of READ_ALOUD_LANGUAGES.filter(value => value !== "auto")) {
    assert(EDGE_READ_ALOUD_VOICES.some(voice => voice.locale === locale && voice.displayName));
  }
  for (const voice of ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"]) {
    assert.equal(sanitizeReadAloudEdgeVoice(voice), voice);
    assert.equal(edgeVoice("en-US", voice), voice);
  }
  const injection = "zh-CN-YunxiNeural'><evil attr='";
  assert.equal(sanitizeReadAloudEdgeVoice(injection), "auto");
  assert.equal(edgeVoice("zh-CN", injection), "zh-CN-XiaoxiaoNeural");
  assert.equal(sanitizeReadAloudSystemVoice("native voice URI"), "native voice URI");
  for (const value of [undefined, "", "   ", "x".repeat(257), 1]) assert.equal(sanitizeReadAloudSystemVoice(value), "auto");
  assert.equal(sanitizeReadAloudSystemVoice("x".repeat(256)).length, 256);
  for (const [value, expected] of [[0, 0.5], [0.5, 0.5], [1.25, 1.25], [2, 2], [3, 2], [NaN, 1], [Infinity, 1], ["1", 1], [undefined, 1]]) {
    assert.equal(sanitizeReadAloudRate(value), expected);
  }
});

test("selected voices reach SSML and unrecognized values fall back safely", async () => {
  for (const [voice, expected] of [
    ["zh-CN-XiaoxiaoNeural", "zh-CN-XiaoxiaoNeural"],
    ["zh-CN-YunxiNeural", "zh-CN-YunxiNeural"],
    ["zh-CN-YunxiNeural'><evil attr='", "en-US-AriaNeural"],
  ]) {
    const promise = synthesizeEdgeSpeech("text", "en-US", new AbortController().signal, { voice });
    await new Promise(resolve => setImmediate(resolve));
    const socket = Socket.instances.at(-1); socket.open();
    assert(socket.sent[1].includes(`<voice name='${expected}'>`));
    assert(!socket.sent[1].includes("<evil"));
    assert(socket.sent[1].includes("rate='+0%'"));
    socket.message(frame("audio/mpeg", [1]));
    socket.message("Path:turn.end\r\n\r\n");
    await promise;
  }
});

test("sends escaped SSML and collects MPEG frames through turn end", async () => {
  const promise = synthesizeEdgeSpeech(`A < B & 'C'`, "en", new AbortController().signal);
  await new Promise(resolve => setImmediate(resolve));
  const socket = Socket.instances.at(-1); socket.open();
  assert.match(socket.url, /Sec-MS-GEC-Version=2-143/);
  assert.match(socket.sent[0], /audio-24khz-48kbitrate-mono-mp3/);
  assert.match(socket.sent[1], /A &lt; B &amp; &apos;C&apos;/);
  assert.match(socket.sent[1], /<voice name='en-US-AriaNeural'>/);
  socket.message(frame("audio/mpeg", [1,2,3]));
  socket.message(frame("audio/mpeg", [4,5]));
  socket.message("Path:turn.end\r\n\r\n");
  const blob = await promise;
  assert.equal(blob.type, "audio/mpeg");
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [1,2,3,4,5]);
  assert.equal(socket.closed, true);
});

test("the bundled mobile import never evaluates desktop Node built-ins or ws", async () => {
  const require = createRequire(import.meta.url);
  const compiled = await build({ entryPoints: ["src/edgeTts.ts"], bundle: true, write: false, format: "cjs", platform: "browser",
    external: ["obsidian", ...builtinModules], plugins: [{ name: "production-desktop-transport", setup(b) {
      b.onResolve({ filter: /^ws$/ }, () => ({ path: require.resolve("ws") }));
    } }] });
  const loaded = [];
  const module = { exports: {} };
  runInNewContext(compiled.outputFiles[0].text, { module, exports: module.exports, require(name) {
    loaded.push(name);
    if (name === "obsidian") return { Platform: { isDesktop: false } };
    throw new Error(`Mobile must not require ${name}`);
  } });
  await assert.rejects(module.exports.synthesizeEdgeSpeech("Mobile test", "en-US", new AbortController().signal), /unavailable on mobile/);
  assert.deepEqual(loaded, ["obsidian"]);
});

test("speech licenses are embedded by the production build and retained with source", () => {
  for (const path of ["docs/licenses/ws-MIT.txt", "docs/licenses/edge-tts-LGPL-3.0.txt", "docs/licenses/GPL-3.0.txt"]) assert(readFileSync(path, "utf8").length > 1000);
  const source = readFileSync("esbuild.config.mjs", "utf8");
  assert(source.includes("${speechNotices}"));
});

test("mobile rejects before opening a desktop transport", async () => {
  globalThis.edgeTestPlatform.isDesktop = false;
  const count = Socket.instances.length;
  try {
    await assert.rejects(synthesizeEdgeSpeech("text", "en", new AbortController().signal), /unavailable on mobile/);
    assert.equal(Socket.instances.length, count);
  } finally { globalThis.edgeTestPlatform.isDesktop = true; }
});

test("abort, invalid frames, early close and oversized input fail and release sockets", async () => {
  const controller = new AbortController();
  const promise = synthesizeEdgeSpeech("text", "en", controller.signal);
  await new Promise(resolve => setImmediate(resolve));
  const socket = Socket.instances.at(-1); controller.abort();
  await assert.rejects(promise, {name:"AbortError"}); assert.equal(socket.closed,true);
  await assert.rejects(synthesizeEdgeSpeech("text", "en", controller.signal), {name:"AbortError"});
  await assert.rejects(synthesizeEdgeSpeech("x".repeat(2001), "en", new AbortController().signal));
  const malformed = synthesizeEdgeSpeech("text", "en", new AbortController().signal);
  await new Promise(resolve => setImmediate(resolve));
  const bad = Socket.instances.at(-1); bad.message(new Uint8Array([255,255]).buffer);
  await assert.rejects(malformed, /Invalid speech response/); assert.equal(bad.closed,true);
  const closed = synthesizeEdgeSpeech("text", "en", new AbortController().signal);
  await new Promise(resolve => setImmediate(resolve));
  const early = Socket.instances.at(-1); early.onclose();
  await assert.rejects(closed, /closed before completion/);
});
