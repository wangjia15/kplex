import { Platform } from "obsidian";
import { parseBodyMetadata, parseBodyMetadataCore, type ParsedBodyMetadata } from "./fieldParser";
import { perfCount, perfDuration, perfGauge, perfLog, perfNow, perfElapsed } from "../util/perf";

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
    const startedAt = perfNow();
    // WebKit/WebView worker message passing clones whole Markdown strings and parsed payloads.
    // On iOS this transient duplication can be more expensive than parsing one file at a time
    // on the renderer thread with GraphBuilder's cooperative yields, so prefer the low-memory path.
    if (Platform.isIosApp || typeof Worker === "undefined" || typeof Blob === "undefined") {
      this.disabled = true;
      perfLog("parser.init", { mode: Platform.isIosApp ? "main-thread-ios" : "main-thread-no-worker", elapsedMs: perfElapsed(startedAt) });
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
      perfLog("parser.init", { mode: "web-worker", elapsedMs: perfElapsed(startedAt) });
    } catch (error) {
      this.disabled = true;
      this.worker = null;
      perfLog("parser.init", { mode: "main-thread-worker-init-failed", elapsedMs: perfElapsed(startedAt), error: error instanceof Error ? error.message : String(error) });
    }
  }

  async parse(content: string): Promise<ParsedBodyMetadata> {
    const startedAt = perfNow();
    perfCount("parser.calls");
    perfCount("parser.characters", content.length);
    if (this.disabled || !this.worker) {
      const result = parseBodyMetadata(content);
      const elapsedMs = perfElapsed(startedAt);
      perfDuration("parser.mainThread", elapsedMs);
      return result;
    }
    const id = this.nextId++;
    perfGauge("parser.pending", this.pending.size + 1);
    try {
      const result = await new Promise<ParsedBodyMetadata>((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        try {
          this.worker!.postMessage({ id, content });
        } catch (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
      perfDuration("parser.workerRoundTrip", perfElapsed(startedAt));
      return result;
    } catch (error) {
      perfCount("parser.workerFallbacks");
      perfLog("parser.worker-fallback", { error: error instanceof Error ? error.message : String(error) });
      const fallbackStartedAt = perfNow();
      const result = parseBodyMetadata(content);
      perfDuration("parser.fallback", perfElapsed(fallbackStartedAt));
      return result;
    } finally {
      perfGauge("parser.pending", this.pending.size);
    }
  }

  destroy(): void {
    perfLog("parser.destroy", { pending: this.pending.size, worker: Boolean(this.worker), disabled: this.disabled });
    this.worker?.terminate();
    this.worker = null;
    for (const pending of this.pending.values()) pending.reject(new Error("K-Plex metadata parser stopped"));
    this.pending.clear();
  }

  private disableWorker(): void {
    perfLog("parser.worker-disabled", { pending: this.pending.size });
    this.disabled = true;
    this.worker?.terminate();
    this.worker = null;
    for (const pending of this.pending.values()) pending.reject(new Error("K-Plex metadata parser worker disabled"));
    this.pending.clear();
  }
}
