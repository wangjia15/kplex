/**
 * Desktop-only Edge WebSocket transport. This module is loaded only after the
 * Obsidian desktop guard; ws supplies the required Edge User-Agent header.
 */
import WebSocket, { type RawData } from "ws";

/** Normalize ws payloads using typed arrays; this adapter needs no additional Node buffer import. */
function messageBytes(data: RawData): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (!Array.isArray(data)) return data;
  const length = data.reduce(/** Fragment lengths are bounded by ws maxPayload. */ (total, chunk) => total + chunk.byteLength, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of data) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

/** A minimal transport shared with the synthesis protocol owner. */
export interface EdgeSocket {
  onopen: (() => void) | null;
  onmessage: ((event: { data: string | ArrayBuffer }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
}

/** Open a header-capable desktop socket, adapting ws events to bounded protocol messages. */
export function openEdgeSocket(url: string): EdgeSocket {
  const socket = new WebSocket(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
      Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold"
    },
    maxPayload: 8 * 1024 * 1024
  });
  const result: EdgeSocket = {
    onopen: null, onmessage: null, onerror: null, onclose: null,
    send: data => socket.send(data),
    close: () => { if (socket.readyState === WebSocket.CONNECTING) socket.terminate(); else if (socket.readyState === WebSocket.OPEN) socket.close(); }
  };
  socket.on("open", () => result.onopen?.());
  socket.on("error", () => result.onerror?.());
  socket.on("close", () => result.onclose?.());
  socket.on("message", (data, binary) => {
    const bytes = messageBytes(data);
    if (binary) {
      const copy = new Uint8Array(bytes.length); copy.set(bytes);
      result.onmessage?.({ data: copy.buffer });
    } else result.onmessage?.({ data: new TextDecoder().decode(bytes) });
  });
  return result;
}
