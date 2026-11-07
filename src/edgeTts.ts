/**
 * Edge read-aloud synthesis. Each call owns one bounded WebSocket and returns MP3 bytes;
 * callers own chunking and must disclose that speech text is sent to Microsoft. Desktop Node
 * transport loads lazily after the host guard; mobile rejects into the caller's system fallback.
 */
/*! Sec-MS-GEC v2 adapted from edge-tts by rany and contributors.
 * SPDX-License-Identifier: LGPL-3.0-only
 * Source: https://github.com/rany2/edge-tts/blob/bd44c1d1aaebdc1db7f47456ee12431b42ec7cac/src/edge_tts/drm.py
 * Modified for K-Plex: TypeScript token calculation, bounded synthesis and explicit cancellation.
 * Full license texts are retained under docs/licenses/ and embedded in the production bundle.
 */
import { Platform } from "obsidian";
import { sanitizeReadAloudEdgeVoice } from "./readAloudPreferences";

const TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const VERSION = "2-143.0.3650.75";
const MAX_TEXT = 2000;
const MAX_AUDIO = 8 * 1024 * 1024;
const TIMEOUT_MS = 30000;
// Sec-MS-GEC v2 starts from a protocol-specific partial hash and adds a checksum. These fixed
// constants are upstream protocol data, not credentials; ordinary SHA-256 is not interchangeable.
const INITIAL = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
const PARTIAL = [0xfd9fbea2,0x91243ce7,0xbe499094,0xcd2e1e0a,0x6c006f49,0x04bd35ab,0xfeb0a7e4,0x03effbd2];
const SCHEDULE = [0xeb24bf9e,0x1558691f,0xa0c09ee2,0x0cfa32ba,0xa622ee8c,0xd1dd9491,0xc0dd25a0,0xf9e70ab6,0xf0c31573,0x7058ce4e,0x7188e606,0x00e5ab33,0xd258b060,0x72766564];
const ROUNDS = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
const PAIRS = [0xe82e91b1,0xb32700d0,0x44de24c6,0x88dff51d,0x3beb65bc,0x29514038,0xc89c5933,0xb328cbdf,0x8d1ec211,0xd405b4d5,0x314ef5d5,0x26e55f3c,0xe92491b1,0x607801c6,0xf0a5b9d5,0x82b2c1fb,0x06064cf3,0xfa51a3da,0xda79fa60,0x207cc464,0xbed20560,0x3c3c74f3,0x89f9c9f8,0xd2d14b61,0x35fa38c6,0xbb04a2c1,0xcb49e3c6,0xc5626167];

/** Rotate a 32-bit word as required by the token hash. */
function rotate(x: number, n: number): number { return (x >>> n) | (x << (32 - n)); }
/** Swap the halves of a 32-bit checksum word. */
function swap(x: number): number { return (x << 16) | (x >>> 16); }
/** Compute the first small SHA schedule transform. */
function sigma0(x: number): number { return rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3); }
/** Compute the second small SHA schedule transform. */
function sigma1(x: number): number { return rotate(x, 17) ^ rotate(x, 19) ^ (x >>> 10); }
/** Expand a token hash schedule to 64 words. */
function extend(words: number[], start: number): void {
  for (let i = start; i < 64; i++) words[i] = (sigma1(words[i-2]) + words[i-7] + sigma0(words[i-15]) + words[i-16]) >>> 0;
}
/** Run the protocol's SHA-like compression rounds. */
function compress(state: number[], words: number[], start: number): number[] {
  let [a,b,c,d,e,f,g,h] = state;
  for (let i = start; i < 64; i++) {
    const first = (h + (rotate(e,6)^rotate(e,11)^rotate(e,25)) + ((e&f)^(~e&g)) + (start === 14 && i === 14 ? 0xc9dc06a7 : ROUNDS[i]) + words[i]) >>> 0;
    const second = ((rotate(a,2)^rotate(a,13)^rotate(a,22)) + ((a&b)^(a&c)^(b&c))) >>> 0;
    [a,b,c,d,e,f,g,h] = [(first+second)>>>0,a,b,c,(d+first)>>>0,e,f,g];
  }
  return [a,b,c,d,e,f,g,h];
}
/** Produce Microsoft's current v2 authentication value for a Unix time in seconds. */
export function edgeToken(timestamp: number): string {
  const ticks = Math.floor((timestamp + 11644473600) / 300) * 300 * 10000000;
  const data = new TextEncoder().encode(ticks.toFixed(0) + TOKEN);
  const prefix = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const words = Array<number>(14).fill(0);
  words.push((data[0]<<16)|(data[1]<<8)|data[2], prefix.getUint32(3));
  for (let i=16;i<30;i++) {
    let value = SCHEDULE[i-16] + (sigma1(words[i-2]) ^ (i===16 ? 0x000b92c0 : 0));
    if (i>=21) value += words[i-7];
    if (i>=29) value += sigma0(words[i-15]) ^ 0x059c0b80;
    words.push(value >>> 0);
  }
  words.push((sigma1(words[28])+words[23]+sigma0(words[15])+words[14]+0xc9dc06a7-ROUNDS[14])>>>0);
  extend(words,31);
  let state = compress(PARTIAL,words,14).map((x,i)=>(x+INITIAL[i])>>>0);
  const length = 57 + data.length;
  const tail = new Uint8Array(data.length - 7 + 1 + ((55-length)%64+64)%64 + 8);
  tail.set(data.subarray(7)); tail[data.length-7] = 128;
  new DataView(tail.buffer).setUint32(tail.length-4,length*8);
  for (let offset=0;offset<tail.length;offset+=64) {
    const view = new DataView(tail.buffer,offset,64);
    const block = Array.from({length:16},(_,i)=>view.getUint32(i*4));
    extend(block,16);
    state = compress(state,block,0).map((x,i)=>(x+state[i])>>>0);
  }
  const digest = new Uint8Array(32); const digestView = new DataView(digest.buffer);
  state.forEach((value,i)=>digestView.setUint32(i*4,value));
  const keys = [digestView.getUint32(0,true)|1,digestView.getUint32(4,true)|1];
  const factors = keys.map(key=>Math.imul(key,0x82893933));
  const terms: number[] = []; const offsets: number[] = [];
  for (let i=0;i<PAIRS.length;i+=2) { terms.push(Math.imul(PAIRS[i],factors[(i/2)%2])); offsets.push(PAIRS[i+1]); }
  const input = new Uint8Array(Math.ceil((data.length+1)/8)*8); input.set(data,1);
  const inputView = new DataView(input.buffer);
  for (let i=0;i<input.length/4;i++) {
    const word = inputView.getUint32(i*4,true); const parity=i%2;
    terms.push((Math.imul(word,keys[parity])+(i===0?Math.imul(0xf2f90b1a,factors[0]):0))>>>0);
    offsets.push((Math.imul(swap(word),parity===0?0xef0569fb:0xc31713db)+(i===0?0x0b1a0000:0))>>>0);
  }
  let swappedTotal=0, swappedLast=0, current=0, total=0;
  for (let i=0;i<terms.length;i+=2) {
    let q=Math.imul(swap(offsets[i]+terms[i]),0x76f50f34);
    swappedTotal=(swappedTotal+Math.imul(swap(q),0xc3efea97)+q)>>>0;
    q=Math.imul(swap(offsets[i+1]+terms[i+1]),0x1881ce3c);
    swappedLast=(Math.imul(swap(q),0x35bd1ec9)+q)>>>0;
    swappedTotal=(swappedTotal+swappedLast)>>>0;
    current=(Math.imul(current,keys[0])+terms[i])>>>0;
    for (const multiplier of [0xcf98b111,0x87085b9f,0x12ceb96d,0x257e1d83]) current=Math.imul(swap(current),multiplier);
    total=(total+current)>>>0;
    current=(Math.imul(current,keys[1])+terms[i+1])>>>0;
    for (const multiplier of [0xa27416f5,0xd38396ff,0x7c932b89,0xbfa49f69]) current=Math.imul(swap(current),multiplier);
    total=(total+current)>>>0;
  }
  const checksum = new Uint8Array(8); const checksumView = new DataView(checksum.buffer);
  checksumView.setUint32(0,swappedLast^current,true); checksumView.setUint32(4,swappedTotal^total,true);
  const hex = (bytes: Uint8Array): string => Array.from(bytes, byte=>byte.toString(16).padStart(2,"0")).join("").toUpperCase();
  return `${hex(checksum)}-${hex(digest)}`;
}

/** Use an inventoried voice when selected, otherwise map the caller-resolved language. */
export function edgeVoice(language: string, selectedVoice?: string): string {
  const selected = sanitizeReadAloudEdgeVoice(selectedVoice);
  if (selected !== "auto") return selected;
  const locale=language.toLowerCase().replaceAll("_","-");
  if (locale.startsWith("zh")) return /^(zh-tw|zh-hk|zh-hant)/.test(locale) ? "zh-TW-HsiaoChenNeural" : "zh-CN-XiaoxiaoNeural";
  const voices: Record<string,string> = {de:"de-DE-KatjaNeural",fr:"fr-FR-DeniseNeural",es:"es-ES-ElviraNeural",nl:"nl-NL-ColetteNeural",ja:"ja-JP-NanamiNeural",ru:"ru-RU-SvetlanaNeural"};
  return voices[locale.split("-")[0]] ?? "en-US-AriaNeural";
}
/** Escape XML text and replace XML-disallowed control characters. */
function xml(text: string): string {
  return Array.from(text, char => { const code=char.codePointAt(0) ?? 0; return (code<32 && code!==9 && code!==10 && code!==13) || code===0xfffe || code===0xffff ? " " : char; }).join("").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");
}
/** Return an AbortError that callers can distinguish from service failures. */
function aborted(): DOMException { return new DOMException("Speech synthesis aborted", "AbortError"); }
/** Generate a connection/request ID without exposing note content. */
function requestId(): string { return window.crypto.randomUUID().replaceAll("-",""); }

/**
 * Synthesize one short chunk as MPEG audio through Microsoft's read-aloud service.
 * Rejects on abort, timeout, malformed response, or empty audio; closes its socket in every case.
 */
export async function synthesizeEdgeSpeech(text: string, language: string, signal: AbortSignal, options?: { voice?: string }): Promise<Blob> {
  if (signal.aborted) throw aborted();
  if (!text.trim() || text.length > MAX_TEXT) throw new Error("Speech text must contain 1 to 2000 characters");
  if (!Platform.isDesktop) throw new Error("Edge speech is unavailable on mobile");
  const { openEdgeSocket } = await import("./edgeTtsDesktop");
  if (signal.aborted) throw aborted();
  const id=requestId();
  const url=`wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TOKEN}&ConnectionId=${id}&Sec-MS-GEC=${edgeToken(Date.now()/1000)}&Sec-MS-GEC-Version=${VERSION}`;
  return new Promise<Blob>((resolve,reject)=>{
    let socket: ReturnType<typeof openEdgeSocket>;
    try { socket=openEdgeSocket(url); } catch (error) { reject(error instanceof Error ? error : new Error("Speech connection failed")); return; }
    let done=false; let total=0; const chunks: ArrayBuffer[]=[];
    /** Settle once, release listeners/timer and close the owned connection. */
    function finish(error?: Error): void {
      if (done) return; done=true; window.clearTimeout(timer); signal.removeEventListener("abort",onAbort);
      socket.onopen=null; socket.onmessage=null; socket.onerror=null; socket.onclose=null;
      socket.close();
      if (error) reject(error); else resolve(new Blob(chunks,{type:"audio/mpeg"}));
    }
    /** Cancel the owned request immediately when the caller aborts. */
    function onAbort(): void { finish(aborted()); }
    const timer=window.setTimeout(()=>finish(new Error("Speech synthesis timed out")),TIMEOUT_MS);
    signal.addEventListener("abort",onAbort,{once:true});
    if (signal.aborted) { onAbort(); return; }
    socket.onopen=()=>{
      try {
        const stamp=new Date().toUTCString();
        socket.send(`X-Timestamp:${stamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);
        socket.send(`X-RequestId:${requestId()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${stamp}Z\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${edgeVoice(language, options?.voice)}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${xml(text)}</prosody></voice></speak>`);
      } catch { finish(new Error("Speech request failed")); }
    };
    socket.onerror=()=>finish(new Error("Speech connection failed"));
    socket.onclose=()=>finish(new Error("Speech connection closed before completion"));
    socket.onmessage=(event)=>{
      if (typeof event.data === "string") {
        const header=event.data.split("\r\n\r\n",1)[0];
        if (/(?:^|\r\n)Path:turn\.end(?:\r\n|$)/i.test(header)) finish(total ? undefined : new Error("Speech service returned no audio"));
        return;
      }
      if (!(event.data instanceof ArrayBuffer) || event.data.byteLength<2) { finish(new Error("Invalid speech response")); return; }
      const bytes=new Uint8Array(event.data); const headerLength=(bytes[0]<<8)|bytes[1];
      if (headerLength > bytes.length-2) { finish(new Error("Invalid speech response")); return; }
      const header=new TextDecoder().decode(bytes.subarray(2,headerLength+2));
      if (!/(?:^|\r\n)Path:audio(?:\r\n|$)/i.test(header)) { finish(new Error("Unexpected speech response")); return; }
      const audio=bytes.subarray(headerLength+2);
      if (audio.length && !/(?:^|\r\n)Content-Type:audio\/mpeg(?:\r\n|$)/i.test(header)) { finish(new Error("Invalid speech audio type")); return; }
      total+=audio.length;
      if (total>MAX_AUDIO) { finish(new Error("Speech audio exceeded size limit")); return; }
      if (audio.length) chunks.push(audio.slice().buffer);
    };
  });
}
