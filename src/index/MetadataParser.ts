import { parseBodyMetadata, parseBodyMetadataCore, type ParsedBodyMetadata } from "./fieldParser";

type Pending = {
  resolve: (value: ParsedBodyMetadata) => void;
  reject: (reason?: unknown) => void;
};

type WorkerResponse = {
  id: number;
  ok: boolean;
  result?: ParsedBodyMetadata;
  error?: string;
};

/**
 * Single parsing boundary for GraphBuilder. When Web Workers are available, parsing runs off the
 * renderer thread using the exact same self-contained parser function as the fallback path.
 * There is deliberately no second parser grammar to keep synchronized.
 */
export class MetadataParser {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private disabled = false;

  constructor() {
    if (typeof Worker === "undefined" || typeof Blob === "undefined") {
      this.disabled = true;
      return;
    }
    try {
      const parserSource = parseBodyMetadataCore.toString();
      const source = `
        const parseBodyMetadataCore = ${parserSource};
        self.onmessage = (event) => {
          const { id, content } = event.data;
          try {
            self.postMessage({ id, ok: true, result: parseBodyMetadataCore(content) });
          } catch (error) {
            self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
          }
        };
      `;
      const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
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
      this.worker.onerror = () => this.disableWorker();
    } catch {
      this.disabled = true;
      this.worker = null;
    }
  }

  async parse(content: string): Promise<ParsedBodyMetadata> {
    if (this.disabled || !this.worker) return parseBodyMetadata(content);
    const id = this.nextId++;
    return new Promise<ParsedBodyMetadata>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.worker!.postMessage({ id, content });
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      }
    }).catch(() => parseBodyMetadata(content));
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const pending of this.pending.values()) pending.reject(new Error("K-Plex metadata parser stopped"));
    this.pending.clear();
  }

  private disableWorker(): void {
    this.disabled = true;
    this.worker?.terminate();
    this.worker = null;
    for (const pending of this.pending.values()) pending.reject(new Error("K-Plex metadata parser worker disabled"));
    this.pending.clear();
  }
}
