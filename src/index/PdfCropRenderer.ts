/**
 * Render a region of a PDF page (a PDF++ rectangular annotation) into an image K-Plex can show
 * inside a section panel. Presentation only: results are cached in memory, never persisted, and
 * never added to GraphPage/snapshots.
 *
 * Obsidian hosts pdf.js for its own PDF viewer, so the render uses that host global rather than
 * bundling a second copy. When it is unavailable the figure simply stays unrendered.
 */

import type { App, TFile } from "obsidian";
import type { PdfRegion } from "./SectionContent";

/** Rendered width in device pixels: crisp in the hover/pinned figure card, small enough to cache. */
const RENDER_WIDTH = 640;
const MAX_CACHED_CROPS = 64;
/** Keep a document open while sibling crops of the same PDF are still being rendered. */
const DOCUMENT_IDLE_MS = 20_000;

type Viewport = { width: number; height: number; convertToViewportRectangle(rect: readonly number[]): number[] };
type PdfPage = {
  getViewport(options: { scale: number; offsetX?: number; offsetY?: number }): Viewport;
  render(options: { canvasContext: CanvasRenderingContext2D; viewport: Viewport }): { promise: Promise<void>; cancel?: () => void };
  cleanup?: () => void;
};
type PdfDocument = { numPages: number; getPage(page: number): Promise<PdfPage>; destroy(): Promise<void> };
type PdfjsLib = { getDocument(options: { data: Uint8Array }): { promise: Promise<PdfDocument> } };

function pdfjs(): PdfjsLib | null {
  const host = window as unknown as { pdfjsLib?: PdfjsLib };
  return typeof host.pdfjsLib?.getDocument === "function" ? host.pdfjsLib : null;
}

export type PdfCropRequest = { path: string; mtime: number; region: PdfRegion };

/** What UI components need: a synchronous cache hit, or an awaited render. */
export type PdfCropResolver = {
  peek(request: PdfCropRequest): string | null;
  resolve(request: PdfCropRequest): Promise<string | null>;
};

export class PdfCropRenderer implements PdfCropResolver {
  private readonly crops = new Map<string, string>();
  private readonly pending = new Map<string, Promise<string | null>>();
  private readonly documents = new Map<string, { document: Promise<PdfDocument | null>; timer: number }>();
  /** One crop at a time: a panel full of annotations must not monopolise the main thread. */
  private queue: Promise<void> = Promise.resolve();
  private disposed = false;

  constructor(private readonly app: App) {}

  private static key(request: PdfCropRequest): string {
    return `${request.path}${request.mtime}${request.region.page}${request.region.rect.join(",")}`;
  }

  peek(request: PdfCropRequest): string | null {
    return this.crops.get(PdfCropRenderer.key(request)) ?? null;
  }

  async resolve(request: PdfCropRequest): Promise<string | null> {
    const key = PdfCropRenderer.key(request);
    const cached = this.crops.get(key);
    if (cached) return cached;
    const running = this.pending.get(key);
    if (running) return running;

    const render = this.enqueue(() => this.renderCrop(request)).then((url) => {
      this.pending.delete(key);
      if (url && !this.disposed) {
        // Bounded, insertion-ordered cache: the oldest crop leaves when a new one arrives.
        if (this.crops.size >= MAX_CACHED_CROPS) {
          const oldest = this.crops.keys().next();
          if (!oldest.done) this.crops.delete(oldest.value);
        }
        this.crops.set(key, url);
      }
      return url;
    }, () => {
      this.pending.delete(key);
      return null;
    });
    this.pending.set(key, render);
    return render;
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      // Let the view paint between crops so a long annotation list stays responsive.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      return work();
    };
    const result = this.queue.then(run, run);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  /** Forget crops of one PDF, for example after it was edited or replaced. */
  invalidate(path: string): void {
    for (const key of [...this.crops.keys()]) {
      if (key.startsWith(`${path}`)) this.crops.delete(key);
    }
    this.releaseDocument(path);
  }

  dispose(): void {
    this.disposed = true;
    this.crops.clear();
    this.pending.clear();
    for (const path of [...this.documents.keys()]) this.releaseDocument(path);
  }

  private releaseDocument(key: string): void {
    const entry = this.documents.get(key);
    if (!entry) return;
    this.documents.delete(key);
    window.clearTimeout(entry.timer);
    void entry.document.then((document) => document?.destroy().catch(() => undefined));
  }

  private keepDocumentWarm(key: string, document: Promise<PdfDocument | null>): void {
    const existing = this.documents.get(key);
    if (existing) window.clearTimeout(existing.timer);
    this.documents.set(key, { document, timer: window.setTimeout(() => this.releaseDocument(key), DOCUMENT_IDLE_MS) });
  }

  /** Keyed by modification time as well, so an edited PDF is never served from an open copy. */
  private loadDocument(file: TFile): Promise<PdfDocument | null> {
    const key = `${file.path}\u0001${file.stat.mtime}`;
    const warm = this.documents.get(key);
    if (warm) {
      this.keepDocumentWarm(key, warm.document);
      return warm.document;
    }
    const library = pdfjs();
    if (!library) return Promise.resolve(null);
    const document = this.app.vault.readBinary(file)
      // pdf.js takes ownership of the buffer it is given, so hand it a private copy.
      .then((buffer) => library.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise)
      .catch(() => null);
    this.keepDocumentWarm(key, document);
    return document;
  }

  private async renderCrop(request: PdfCropRequest): Promise<string | null> {
    const file = this.app.vault.getFileByPath(request.path);
    if (!file || file.extension.toLowerCase() !== "pdf") return null;
    const document = await this.loadDocument(file);
    if (!document || this.disposed) return null;
    const { page: pageNumber, rect } = request.region;
    if (pageNumber > document.numPages) return null;

    const page = await document.getPage(pageNumber);
    const normalized = [Math.min(rect[0], rect[2]), Math.min(rect[1], rect[3]), Math.max(rect[0], rect[2]), Math.max(rect[1], rect[3])];
    const unscaled = page.getViewport({ scale: 1 });
    const [vx1, vy1, vx2, vy2] = unscaled.convertToViewportRectangle(normalized);
    const cropWidth = Math.abs(vx2 - vx1);
    const cropHeight = Math.abs(vy2 - vy1);
    if (cropWidth < 1 || cropHeight < 1) return null;

    const scale = Math.min(6, Math.max(0.5, RENDER_WIDTH / cropWidth));
    const canvas = createEl("canvas", { attr: { width: Math.ceil(cropWidth * scale), height: Math.ceil(cropHeight * scale) } });
    const context = canvas.getContext("2d");
    if (!context) return null;
    // PDF pages are drawn on paper white; without a fill the transparent canvas would encode black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const viewport = page.getViewport({
      scale,
      offsetX: -Math.min(vx1, vx2) * scale,
      offsetY: -Math.min(vy1, vy2) * scale,
    });
    try {
      await page.render({ canvasContext: context, viewport }).promise;
    } finally {
      page.cleanup?.();
    }
    if (this.disposed) return null;
    return canvas.toDataURL("image/jpeg", 0.82);
  }
}
