import { parseBodyMetadata, type ParsedBodyMetadata } from "./fieldParser";
import { perfLog } from "../util/perf";

type Pending = {
  resolve: (value: ParsedBodyMetadata) => void;
  reject: (reason?: unknown) => void;
  started: number;
};

type WorkerResponse = {
  id: number;
  ok: boolean;
  result?: ParsedBodyMetadata;
  error?: string;
};

/**
 * Offloads the CPU-only markdown body scan from the Obsidian renderer thread.
 * Obsidian API access and graph mutations deliberately stay on the main thread.
 */
export class MetadataParseWorker {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private disabled = false;

  constructor() {
    try {
      const source = `
        const normalizeFieldName = (name) => name.toLowerCase().replaceAll(" ", "-").trim();
        const URL_RE = /\\bhttps?:\\/\\/[^\\s<>()\\[\\]{}"']+/gi;
        const MARKDOWN_URL_RE = /\\[([^\\]]+)\\]\\((https?:\\/\\/[^)]+)\\)/gi;
        function parseBodyMetadata(content) {
          const inlineFields = {};
          for (const line of content.split(/\\r?\\n/)) {
            const match = line.match(/(?:^|\\s)([^:\\n][^:\\n]{0,80}?)::\\s*(.+)$/);
            if (!match) continue;
            const key = normalizeFieldName(match[1].trim());
            if (!key) continue;
            (inlineFields[key] ||= []).push(match[2].trim());
          }
          const aliases = new Map();
          MARKDOWN_URL_RE.lastIndex = 0;
          for (const match of content.matchAll(MARKDOWN_URL_RE)) {
            const raw = match[2].trim().replace(/[.,;:!?]+$/, "");
            if (raw) aliases.set(raw, match[1].trim());
          }
          const urls = [];
          const seen = new Set();
          URL_RE.lastIndex = 0;
          for (const match of content.matchAll(URL_RE)) {
            const raw = match[0].replace(/[.,;:!?]+$/, "");
            if (!raw || seen.has(raw)) continue;
            seen.add(raw);
            const label = aliases.get(raw);
            urls.push(label ? { url: raw, label } : { url: raw });
          }
          return { inlineFields, urls };
        }
        self.onmessage = (event) => {
          const { id, content } = event.data;
          try {
            self.postMessage({ id, ok: true, result: parseBodyMetadata(content) });
          } catch (error) {
            self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
          }
        };
      `;
      const blob = new Blob([source], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      this.worker = new Worker(url, { name: "k-plex-metadata-parser" });
      URL.revokeObjectURL(url);
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.ok && message.result) pending.resolve(message.result);
        else pending.reject(new Error(message.error || "Metadata worker failed"));
      };
      this.worker.onerror = (event) => {
        perfLog("index.worker.error", { message: event.message || "unknown worker error" });
        this.disableWorker();
      };
      perfLog("index.worker.ready", { enabled: true });
    } catch (error) {
      this.disabled = true;
      this.worker = null;
      perfLog("index.worker.ready", { enabled: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  async parse(content: string): Promise<ParsedBodyMetadata> {
    if (this.disabled || !this.worker) return parseBodyMetadata(content);
    const id = this.nextId++;
    return new Promise<ParsedBodyMetadata>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, started: performance.now() });
      try {
        this.worker!.postMessage({ id, content });
      } catch (error) {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    }).catch((error) => {
      perfLog("index.worker.parse-fallback", { error: error instanceof Error ? error.message : String(error) });
      return parseBodyMetadata(content);
    });
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const pending of this.pending.values()) pending.reject(new Error("K-Plex metadata worker stopped"));
    this.pending.clear();
  }

  private disableWorker(): void {
    this.disabled = true;
    this.worker?.terminate();
    this.worker = null;
    for (const pending of this.pending.values()) pending.reject(new Error("K-Plex metadata worker disabled"));
    this.pending.clear();
  }
}
