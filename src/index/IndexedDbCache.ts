import { Platform } from "obsidian";
import type { ParsedBodyMetadata } from "./fieldParser";
import { perfCount, perfDuration, perfElapsed, perfLog, perfNow } from "../util/perf";
import type { PersistedEvidenceDeclaration, PersistedPage } from "./IndexSnapshot";

const DB_VERSION = 4;
const BODY_CACHE_VERSION = 2;
const META_STORE = "meta";
const PAGE_STORE = "pages";
const EVIDENCE_STORE = "evidence";
const BODY_STORE = "bodies";
const SNAPSHOT_CHUNK_STORE = "snapshotChunks";
const GENERATION_INDEX = "generation";

export type IndexedDbSnapshotMeta = {
  key: "active";
  schema: 1 | 2 | 3;
  generation: string;
  createdAt: number;
  vaultSignature: string;
  settingsSignature: string;
  discoveredFields: Array<[string, { name: string; count: number }]>;
  /** Present for schema 3 snapshots. Older generations fall back to per-record cursors. */
  pageChunkCount?: number;
  evidenceChunkCount?: number;
};

type PageRecord = { generation: string; path: string; value: PersistedPage };
type EvidenceRecord = { generation: string; key: string; value: PersistedEvidenceDeclaration };
type BodyRecord = { path: string; mtime: number; parserVersion: number; body: ParsedBodyMetadata };
type SnapshotChunkRecord = {
  generation: string;
  kind: "pages" | "evidence";
  index: number;
  values: PersistedPage[] | PersistedEvidenceDeclaration[];
};

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}


function roundForLog(value: number): number {
  return Math.round(value * 10) / 10;
}

function safeDbName(vaultName: string): string {
  const encoded = Array.from(new TextEncoder().encode(vaultName))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 96);
  return `k-plex-index-v1-${encoded || "vault"}`;
}

/** Durable K-Plex cache backed by IndexedDB. */
export class KplexIndexedDbCache {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor(private vaultName: string) {}

  private open(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    const startedAt = perfNow();
    perfLog("idb.open.start", { dbVersion: DB_VERSION });
    this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      if (typeof indexedDB === "undefined") {
        perfLog("idb.open.end", { ok: false, reason: "indexeddb-unavailable", elapsedMs: perfElapsed(startedAt) });
        resolve(null);
        return;
      }
      try {
        const request = indexedDB.open(safeDbName(this.vaultName), DB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = request.result;
          perfLog("idb.open.upgrade", { oldVersion: event.oldVersion, newVersion: DB_VERSION });
          if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "key" });
          if (!db.objectStoreNames.contains(PAGE_STORE)) {
            const store = db.createObjectStore(PAGE_STORE, { keyPath: ["generation", "path"] });
            store.createIndex(GENERATION_INDEX, "generation", { unique: false });
          }
          if (!db.objectStoreNames.contains(EVIDENCE_STORE)) {
            const store = db.createObjectStore(EVIDENCE_STORE, { keyPath: ["generation", "key"] });
            store.createIndex(GENERATION_INDEX, "generation", { unique: false });
          }
          if (!db.objectStoreNames.contains(BODY_STORE)) db.createObjectStore(BODY_STORE, { keyPath: "path" });
          if (!db.objectStoreNames.contains(SNAPSHOT_CHUNK_STORE)) {
            const store = db.createObjectStore(SNAPSHOT_CHUNK_STORE, { keyPath: ["generation", "kind", "index"] });
            store.createIndex(GENERATION_INDEX, "generation", { unique: false });
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            perfLog("idb.versionchange", { version: db.version });
            db.close();
            this.dbPromise = null;
          };
          perfLog("idb.open.end", { ok: true, version: db.version, elapsedMs: perfElapsed(startedAt) });
          resolve(db);
        };
        request.onerror = () => {
          perfLog("idb.open.end", { ok: false, reason: request.error?.message ?? "request-error", elapsedMs: perfElapsed(startedAt) });
          resolve(null);
        };
        request.onblocked = () => {
          perfLog("idb.open.end", { ok: false, reason: "blocked", elapsedMs: perfElapsed(startedAt) });
          resolve(null);
        };
      } catch (error) {
        perfLog("idb.open.end", { ok: false, reason: error instanceof Error ? error.message : String(error), elapsedMs: perfElapsed(startedAt) });
        resolve(null);
      }
    });
    return this.dbPromise;
  }


  close(): void {
    const pending = this.dbPromise;
    this.dbPromise = null;
    void pending?.then((db) => {
      try { db?.close(); } catch { /* shutdown only */ }
    });
  }

  async readSnapshotMeta(): Promise<IndexedDbSnapshotMeta | null> {
    const startedAt = perfNow();
    const db = await this.open();
    if (!db) return null;
    try {
      const tx = db.transaction(META_STORE, "readonly");
      const done = transactionDone(tx);
      const value = await requestResult(tx.objectStore(META_STORE).get("active"));
      await done;
      if (!value || typeof value !== "object") {
        perfDuration("idb.readSnapshotMeta", perfElapsed(startedAt));
        return null;
      }
      const meta = value as Partial<IndexedDbSnapshotMeta>;
      if ((meta.schema !== 1 && meta.schema !== 2 && meta.schema !== 3) || meta.key !== "active" || typeof meta.generation !== "string" ||
        typeof meta.createdAt !== "number" || typeof meta.vaultSignature !== "string" ||
        typeof meta.settingsSignature !== "string" || !Array.isArray(meta.discoveredFields) ||
        (meta.schema === 3 && (!Number.isInteger(meta.pageChunkCount) || !Number.isInteger(meta.evidenceChunkCount) ||
          (meta.pageChunkCount ?? -1) < 0 || (meta.evidenceChunkCount ?? -1) < 0))) {
        perfLog("idb.meta.invalid", { elapsedMs: perfElapsed(startedAt) });
        return null;
      }
      perfDuration("idb.readSnapshotMeta", perfElapsed(startedAt));
      return meta as IndexedDbSnapshotMeta;
    } catch (error) {
      perfLog("idb.meta.error", { elapsedMs: perfElapsed(startedAt), error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  async getPages(generation: string, paths: readonly string[]): Promise<Map<string, PersistedPage>> {
    const unique = [...new Set(paths.filter(Boolean))];
    const result = new Map<string, PersistedPage>();
    if (!unique.length) return result;
    const startedAt = perfNow();
    const db = await this.open();
    if (!db) return result;
    try {
      const tx = db.transaction(PAGE_STORE, "readonly");
      const done = transactionDone(tx);
      const store = tx.objectStore(PAGE_STORE);
      const values = await Promise.all(unique.map((path) => requestResult(store.get([generation, path])) as Promise<PageRecord | undefined>));
      await done;
      for (const record of values) if (record?.value) result.set(record.path, record.value);
      const elapsedMs = perfElapsed(startedAt);
      perfCount("idb.getPages.calls");
      perfCount("idb.getPages.requested", unique.length);
      perfCount("idb.getPages.hits", result.size);
      perfDuration("idb.getPages", elapsedMs);
      perfLog("idb.pages.targeted", { requested: unique.length, hits: result.size, elapsedMs });
    } catch (error) {
      perfCount("idb.getPages.errors");
      perfLog("idb.pages.targeted", { requested: unique.length, hits: result.size, elapsedMs: perfElapsed(startedAt), error: error instanceof Error ? error.message : String(error) });
    }
    return result;
  }

  snapshotUsesChunks(meta: IndexedDbSnapshotMeta): boolean {
    return meta.schema >= 3 && Number.isInteger(meta.pageChunkCount) && Number.isInteger(meta.evidenceChunkCount);
  }

  async iterateSnapshotPages(meta: IndexedDbSnapshotMeta, onPage: (page: PersistedPage) => void): Promise<boolean> {
    if (meta.schema >= 3 && Number.isInteger(meta.pageChunkCount)) {
      return this.iterateChunks(meta.generation, "pages", meta.pageChunkCount ?? 0, (value) => onPage(value as PersistedPage));
    }
    return this.iteratePages(meta.generation, onPage);
  }

  async iterateSnapshotEvidence(meta: IndexedDbSnapshotMeta, onEvidence: (evidence: PersistedEvidenceDeclaration) => void): Promise<boolean> {
    if (meta.schema >= 3 && Number.isInteger(meta.evidenceChunkCount)) {
      return this.iterateChunks(meta.generation, "evidence", meta.evidenceChunkCount ?? 0, (value) => onEvidence(value as PersistedEvidenceDeclaration));
    }
    return this.iterateEvidence(meta.generation, onEvidence);
  }

  private async iterateChunks(
    generation: string,
    kind: "pages" | "evidence",
    chunkCount: number,
    onValue: (value: PersistedPage | PersistedEvidenceDeclaration) => void,
  ): Promise<boolean> {
    const startedAt = perfNow();
    const db = await this.open();
    if (!db || !db.objectStoreNames.contains(SNAPSHOT_CHUNK_STORE)) return false;
    let records = 0;
    let callbackMs = 0;
    try {
      // Read a handful of chunk records per transaction. This avoids hundreds of thousands of
      // cursor continuations while also avoiding one enormous getAll() allocation on iOS.
      const readBatch = Platform.isIosApp ? 4 : Platform.isMobile ? 8 : 12;
      for (let start = 0; start < chunkCount; start += readBatch) {
        const end = Math.min(chunkCount, start + readBatch);
        const tx = db.transaction(SNAPSHOT_CHUNK_STORE, "readonly");
        const done = transactionDone(tx);
        const store = tx.objectStore(SNAPSHOT_CHUNK_STORE);
        const chunks = await Promise.all(Array.from({ length: end - start }, (_, offset) =>
          requestResult(store.get([generation, kind, start + offset])) as Promise<SnapshotChunkRecord | undefined>
        ));
        await done;
        for (const chunk of chunks) {
          if (!chunk || chunk.generation !== generation || chunk.kind !== kind || !Array.isArray(chunk.values)) {
            perfLog("idb.chunk-read.invalid", { kind, index: chunk?.index ?? -1, start, end, chunkCount });
            return false;
          }
          const callbackStartedAt = perfNow();
          for (const value of chunk.values) { onValue(value); records += 1; }
          callbackMs += perfNow() - callbackStartedAt;
        }
        if (Platform.isMobile) await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        if (end === chunkCount || end % Math.max(readBatch, 48) === 0) {
          perfLog("idb.chunk-read.progress", { kind, chunks: end, chunkCount, records, elapsedMs: perfElapsed(startedAt), callbackMs: roundForLog(callbackMs) });
        }
      }
      const elapsedMs = perfElapsed(startedAt);
      perfDuration(`idb.chunkRead.${kind}`, elapsedMs);
      perfLog("idb.chunk-read.end", { kind, ok: true, chunks: chunkCount, records, elapsedMs, callbackMs: roundForLog(callbackMs), storageOverheadMs: roundForLog(Math.max(0, elapsedMs - callbackMs)) });
      return true;
    } catch (error) {
      perfLog("idb.chunk-read.end", { kind, ok: false, chunks: chunkCount, records, elapsedMs: perfElapsed(startedAt), error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async iteratePages(generation: string, onPage: (page: PersistedPage) => void): Promise<boolean> {
    return this.iterateGeneration<PageRecord>(PAGE_STORE, generation, (record) => onPage(record.value));
  }

  async iterateEvidence(generation: string, onEvidence: (evidence: PersistedEvidenceDeclaration) => void): Promise<boolean> {
    return this.iterateGeneration<EvidenceRecord>(EVIDENCE_STORE, generation, (record) => onEvidence(record.value));
  }

  private async iterateGeneration<T>(storeName: string, generation: string, onValue: (value: T) => void): Promise<boolean> {
    const startedAt = perfNow();
    const db = await this.open();
    if (!db) return false;
    let count = 0;
    let callbackMs = 0;
    let lastProgressAt = startedAt;
    try {
      const tx = db.transaction(storeName, "readonly");
      const done = transactionDone(tx);
      const index = tx.objectStore(storeName).index(GENERATION_INDEX);
      await new Promise<void>((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.only(generation));
        request.onerror = () => reject(request.error ?? new Error("IndexedDB cursor failed"));
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) { resolve(); return; }
          const callbackStartedAt = perfNow();
          onValue(cursor.value as T);
          callbackMs += perfNow() - callbackStartedAt;
          count += 1;
          if (count % 25000 === 0) {
            const now = perfNow();
            perfLog("idb.cursor.progress", {
              store: storeName,
              records: count,
              elapsedMs: perfElapsed(startedAt),
              recent25kMs: roundForLog(now - lastProgressAt),
              callbackMs: roundForLog(callbackMs),
            });
            lastProgressAt = now;
          }
          cursor.continue();
        };
      });
      await done;
      const elapsedMs = perfElapsed(startedAt);
      perfDuration(`idb.cursor.${storeName}`, elapsedMs);
      perfLog("idb.cursor.end", {
        store: storeName,
        ok: true,
        records: count,
        elapsedMs,
        callbackMs: roundForLog(callbackMs),
        cursorOverheadMs: roundForLog(Math.max(0, elapsedMs - callbackMs)),
        recordsPerSecond: elapsedMs > 0 ? roundForLog(count * 1000 / elapsedMs) : 0,
      });
      return true;
    } catch (error) {
      perfLog("idb.cursor.end", { store: storeName, ok: false, records: count, elapsedMs: perfElapsed(startedAt), error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async writeSnapshot(
    meta: Omit<IndexedDbSnapshotMeta, "key" | "schema" | "generation" | "pageChunkCount" | "evidenceChunkCount">,
    pages: Iterable<PersistedPage>,
    evidence: Iterable<PersistedEvidenceDeclaration>,
    isCurrent: () => boolean = () => true,
  ): Promise<boolean> {
    const db = await this.open();
    if (!db) return false;
    const previous = await this.readSnapshotMeta();
    const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = perfNow();
    const batchSize = Platform.isIosApp ? 120 : Platform.isMobile ? 240 : 700;
    const pageChunkSize = Platform.isIosApp ? 256 : Platform.isMobile ? 384 : 512;
    const evidenceChunkSize = Platform.isIosApp ? 512 : Platform.isMobile ? 768 : 1024;
    const evidenceChunkBatchSize = Platform.isIosApp ? 2 : Platform.isMobile ? 4 : 12;
    let pageCount = 0;
    let evidenceCount = 0;
    let pageBatches = 0;
    let evidenceBatches = 0;
    let pageChunkCount = 0;
    let evidenceChunkCount = 0;
    let pageTransactionMs = 0;
    let evidenceTransactionMs = 0;
    let maxPageBatchMs = 0;
    let maxEvidenceBatchMs = 0;
    let published = false;
    perfLog("snapshot.write.start", {
      previousGeneration: Boolean(previous?.generation),
      batchSize,
      pageChunkSize,
      evidenceChunkSize,
      evidenceMode: "chunk-only",
      evidenceChunkBatchSize,
    });
    const yieldBetweenBatches = async (): Promise<void> => {
      if (!Platform.isMobile) return;
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    };
    const cancelAndCleanup = async (stage: string): Promise<boolean> => {
      perfLog("snapshot.write.cancel", { stage, generation, pages: pageCount, evidence: evidenceCount, elapsedMs: perfElapsed(startedAt) });
      await this.deleteGeneration(generation, "cancelled-write");
      return false;
    };

    try {
      const pageBatch: PageRecord[] = [];
      let pageChunkValues: PersistedPage[] = [];
      const pageChunks: SnapshotChunkRecord[] = [];
      const finishPageChunk = (): void => {
        if (!pageChunkValues.length) return;
        pageChunks.push({ generation, kind: "pages", index: pageChunkCount++, values: pageChunkValues });
        pageChunkValues = [];
      };
      const flushPages = async (): Promise<boolean> => {
        if (!pageBatch.length && !pageChunks.length) return true;
        if (!isCurrent()) return false;
        const batchStartedAt = perfNow();
        const tx = db.transaction([PAGE_STORE, SNAPSHOT_CHUNK_STORE], "readwrite");
        const store = tx.objectStore(PAGE_STORE);
        const chunkStore = tx.objectStore(SNAPSHOT_CHUNK_STORE);
        for (const record of pageBatch) store.put(record);
        for (const chunk of pageChunks) chunkStore.put(chunk);
        pageBatch.length = 0;
        pageChunks.length = 0;
        await transactionDone(tx);
        const batchMs = perfElapsed(batchStartedAt);
        pageBatches += 1;
        pageTransactionMs += batchMs;
        maxPageBatchMs = Math.max(maxPageBatchMs, batchMs);
        await yieldBetweenBatches();
        return isCurrent();
      };
      for (const page of pages) {
        pageCount += 1;
        pageBatch.push({ generation, path: page.path, value: page });
        pageChunkValues.push(page);
        if (pageChunkValues.length >= pageChunkSize) finishPageChunk();
        if (pageCount % 25000 === 0) perfLog("snapshot.write.pages.progress", { pages: pageCount, chunks: pageChunkCount, elapsedMs: perfElapsed(startedAt) });
        if (pageBatch.length >= batchSize && !(await flushPages())) return await cancelAndCleanup("pages");
      }
      finishPageChunk();
      if (!(await flushPages())) return await cancelAndCleanup("pages-final");

      // Schema-3 restore reads evidence exclusively from snapshotChunks. Writing the same 249k
      // declarations again as individual EVIDENCE_STORE records doubled the I/O and made every
      // cache refresh needlessly expensive. Keep the legacy store for schema-1/2 migration only.
      let evidenceChunkValues: PersistedEvidenceDeclaration[] = [];
      const evidenceChunks: SnapshotChunkRecord[] = [];
      const finishEvidenceChunk = (): void => {
        if (!evidenceChunkValues.length) return;
        evidenceChunks.push({ generation, kind: "evidence", index: evidenceChunkCount++, values: evidenceChunkValues });
        evidenceChunkValues = [];
      };
      const flushEvidenceChunks = async (): Promise<boolean> => {
        if (!evidenceChunks.length) return true;
        if (!isCurrent()) return false;
        const batchStartedAt = perfNow();
        const tx = db.transaction(SNAPSHOT_CHUNK_STORE, "readwrite");
        const chunkStore = tx.objectStore(SNAPSHOT_CHUNK_STORE);
        for (const chunk of evidenceChunks) chunkStore.put(chunk);
        evidenceChunks.length = 0;
        await transactionDone(tx);
        const batchMs = perfElapsed(batchStartedAt);
        evidenceBatches += 1;
        evidenceTransactionMs += batchMs;
        maxEvidenceBatchMs = Math.max(maxEvidenceBatchMs, batchMs);
        await yieldBetweenBatches();
        return isCurrent();
      };
      for (const declaration of evidence) {
        evidenceCount += 1;
        evidenceChunkValues.push(declaration);
        if (evidenceChunkValues.length >= evidenceChunkSize) {
          finishEvidenceChunk();
          if (evidenceChunks.length >= evidenceChunkBatchSize && !(await flushEvidenceChunks())) return await cancelAndCleanup("evidence");
        }
        if (evidenceCount % 25000 === 0) perfLog("snapshot.write.evidence.progress", { evidence: evidenceCount, chunks: evidenceChunkCount, elapsedMs: perfElapsed(startedAt) });
      }
      finishEvidenceChunk();
      if (!(await flushEvidenceChunks()) || !isCurrent()) return await cancelAndCleanup("evidence-final");

      const active: IndexedDbSnapshotMeta = {
        key: "active",
        schema: 3,
        generation,
        pageChunkCount,
        evidenceChunkCount,
        ...meta,
      };
      const tx = db.transaction(META_STORE, "readwrite");
      tx.objectStore(META_STORE).put(active);
      await transactionDone(tx);
      published = true;
      if (previous?.generation && previous.generation !== generation) void this.deleteGeneration(previous.generation, "superseded");
      const elapsedMs = perfElapsed(startedAt);
      perfDuration("idb.snapshotWrite", elapsedMs);
      perfLog("snapshot.write.end", {
        elapsedMs,
        pages: pageCount,
        evidence: evidenceCount,
        pageBatches,
        evidenceBatches,
        pageChunks: pageChunkCount,
        evidenceChunks: evidenceChunkCount,
        pageTransactionMs: roundForLog(pageTransactionMs),
        evidenceTransactionMs: roundForLog(evidenceTransactionMs),
        maxPageBatchMs: roundForLog(maxPageBatchMs),
        maxEvidenceBatchMs: roundForLog(maxEvidenceBatchMs),
      });
      return true;
    } catch (error) {
      perfLog("snapshot.write.error", {
        generation,
        published,
        pages: pageCount,
        evidence: evidenceCount,
        elapsedMs: perfElapsed(startedAt),
        error: error instanceof Error ? error.message : String(error),
      });
      if (!published) await this.deleteGeneration(generation, "failed-write");
      return false;
    }
  }

  private generationRange(storeName: string, generation: string): IDBKeyRange | IDBKeyRange[] {
    if (storeName === SNAPSHOT_CHUNK_STORE) {
      return [
        IDBKeyRange.bound([generation, "evidence", 0], [generation, "evidence", Number.MAX_SAFE_INTEGER]),
        IDBKeyRange.bound([generation, "pages", 0], [generation, "pages", Number.MAX_SAFE_INTEGER]),
      ];
    }
    return IDBKeyRange.bound([generation, ""], [generation, "\uffff"]);
  }

  private async deleteGeneration(generation: string, reason = "superseded"): Promise<void> {
    const startedAt = perfNow();
    const db = await this.open();
    if (!db) return;
    perfLog("snapshot.cleanup.start", { generation, reason, mode: "key-range-delete" });
    const results = await Promise.all([PAGE_STORE, EVIDENCE_STORE, SNAPSHOT_CHUNK_STORE].map(async (storeName) => {
      const storeStartedAt = perfNow();
      try {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const ranges = this.generationRange(storeName, generation);
        for (const range of Array.isArray(ranges) ? ranges : [ranges]) store.delete(range);
        await transactionDone(tx);
        const elapsedMs = perfElapsed(storeStartedAt);
        perfDuration(`idb.cleanup.${storeName}`, elapsedMs);
        perfLog("snapshot.cleanup.store.end", { store: storeName, ok: true, mode: "key-range-delete", elapsedMs });
        return { storeName, elapsedMs, ok: true };
      } catch (error) {
        const elapsedMs = perfElapsed(storeStartedAt);
        perfCount(`idb.cleanup.${storeName}.errors`);
        perfLog("snapshot.cleanup.store.end", { store: storeName, ok: false, mode: "key-range-delete", elapsedMs, error: error instanceof Error ? error.message : String(error) });
        return { storeName, elapsedMs, ok: false };
      }
    }));
    const elapsedMs = perfElapsed(startedAt);
    perfDuration("idb.cleanup.total", elapsedMs);
    perfLog("snapshot.cleanup.end", {
      generation,
      reason,
      mode: "key-range-delete",
      elapsedMs,
      pagesOk: results.find((item) => item.storeName === PAGE_STORE)?.ok ?? false,
      evidenceOk: results.find((item) => item.storeName === EVIDENCE_STORE)?.ok ?? false,
      chunksOk: results.find((item) => item.storeName === SNAPSHOT_CHUNK_STORE)?.ok ?? false,
    });
  }

  async cleanupOrphanGenerations(activeGeneration: string): Promise<void> {
    const startedAt = perfNow();
    const db = await this.open();
    if (!db || !db.objectStoreNames.contains(SNAPSHOT_CHUNK_STORE)) return;
    try {
      const tx = db.transaction(SNAPSHOT_CHUNK_STORE, "readonly");
      const done = transactionDone(tx);
      const index = tx.objectStore(SNAPSHOT_CHUNK_STORE).index(GENERATION_INDEX);
      const generations: string[] = [];
      await new Promise<void>((resolve, reject) => {
        const request = index.openKeyCursor(null, "nextunique");
        request.onerror = () => reject(request.error ?? new Error("IndexedDB generation scan failed"));
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) { resolve(); return; }
          if (typeof cursor.key === "string") generations.push(cursor.key);
          cursor.continue();
        };
      });
      await done;
      const stale = generations.filter((generation) => generation !== activeGeneration);
      perfLog("snapshot.orphan-scan", {
        elapsedMs: perfElapsed(startedAt),
        generations: generations.length,
        stale: stale.length,
        activeGeneration,
      });
      for (const generation of stale) await this.deleteGeneration(generation, "orphan");
    } catch (error) {
      perfLog("snapshot.orphan-scan.error", {
        elapsedMs: perfElapsed(startedAt),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getBodies(requests: ReadonlyArray<{ path: string; mtime: number }>): Promise<Map<string, ParsedBodyMetadata>> {
    const result = new Map<string, ParsedBodyMetadata>();
    if (!requests.length) return result;
    const startedAt = perfNow();
    perfCount("idb.getBodies.calls");
    perfCount("idb.getBodies.requested", requests.length);
    const db = await this.open();
    if (!db) return result;
    try {
      const tx = db.transaction(BODY_STORE, "readonly");
      const done = transactionDone(tx);
      const store = tx.objectStore(BODY_STORE);
      const values = await Promise.all(requests.map(({ path }) => requestResult(store.get(path)) as Promise<BodyRecord | undefined>));
      await done;
      for (let i = 0; i < requests.length; i += 1) {
        const request = requests[i];
        const value = values[i];
        if (value && value.mtime === request.mtime && value.parserVersion === BODY_CACHE_VERSION && value.body && Array.isArray(value.body.inlineFieldOccurrences)) result.set(request.path, value.body);
      }
    } catch (error) {
      perfCount("idb.getBodies.errors");
      perfLog("idb.getBodies.error", { requested: requests.length, elapsedMs: perfElapsed(startedAt), error: error instanceof Error ? error.message : String(error) });
    }
    perfCount("idb.getBodies.hits", result.size);
    perfCount("idb.getBodies.misses", requests.length - result.size);
    perfDuration("idb.getBodies", perfElapsed(startedAt));
    return result;
  }

  async bodyStoreReady(): Promise<boolean> {
    const startedAt = perfNow();
    const db = await this.open();
    const ready = Boolean(db?.objectStoreNames.contains(BODY_STORE));
    perfLog("idb.body-store-ready", { ready, elapsedMs: perfElapsed(startedAt) });
    return ready;
  }

  async putBodies(records: ReadonlyArray<{ path: string; mtime: number; body: ParsedBodyMetadata }>): Promise<boolean> {
    if (!records.length) return true;
    const startedAt = perfNow();
    perfCount("idb.putBodies.calls");
    perfCount("idb.putBodies.records", records.length);
    const db = await this.open();
    if (!db || !db.objectStoreNames.contains(BODY_STORE)) return false;
    try {
      const tx = db.transaction(BODY_STORE, "readwrite");
      const done = transactionDone(tx);
      const store = tx.objectStore(BODY_STORE);
      for (const record of records) store.put({ ...record, parserVersion: BODY_CACHE_VERSION } satisfies BodyRecord);
      await done;
      perfDuration("idb.putBodies", perfElapsed(startedAt));
      return true;
    } catch (error) {
      perfCount("idb.putBodies.errors");
      perfLog("idb.putBodies.error", { records: records.length, elapsedMs: perfElapsed(startedAt), error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async getBody(path: string, mtime: number): Promise<ParsedBodyMetadata | null> {
    const startedAt = perfNow();
    perfCount("idb.getBody.calls");
    const db = await this.open();
    if (!db) return null;
    try {
      const tx = db.transaction(BODY_STORE, "readonly");
      const done = transactionDone(tx);
      const value = await requestResult(tx.objectStore(BODY_STORE).get(path)) as BodyRecord | undefined;
      await done;
      const hit = Boolean(value && value.mtime === mtime && value.parserVersion === BODY_CACHE_VERSION && value.body && Array.isArray(value.body.inlineFieldOccurrences));
      perfCount(hit ? "idb.getBody.hits" : "idb.getBody.misses");
      perfDuration("idb.getBody", perfElapsed(startedAt));
      return hit ? value!.body : null;
    } catch (error) {
      perfCount("idb.getBody.errors");
      perfLog("idb.getBody.error", { elapsedMs: perfElapsed(startedAt), error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  async putBody(path: string, mtime: number, body: ParsedBodyMetadata): Promise<boolean> {
    const startedAt = perfNow();
    perfCount("idb.putBody.calls");
    const db = await this.open();
    if (!db || !db.objectStoreNames.contains(BODY_STORE)) return false;
    try {
      const tx = db.transaction(BODY_STORE, "readwrite");
      const done = transactionDone(tx);
      tx.objectStore(BODY_STORE).put({ path, mtime, parserVersion: BODY_CACHE_VERSION, body } satisfies BodyRecord);
      await done;
      perfDuration("idb.putBody", perfElapsed(startedAt));
      return true;
    } catch (error) {
      perfCount("idb.putBody.errors");
      perfLog("idb.putBody.error", { elapsedMs: perfElapsed(startedAt), error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async deleteBody(path: string): Promise<void> {
    const db = await this.open();
    if (!db) return;
    try {
      const tx = db.transaction(BODY_STORE, "readwrite");
      const done = transactionDone(tx);
      tx.objectStore(BODY_STORE).delete(path);
      await done;
    } catch { /* cache cleanup only */ }
  }

  async clearLegacyLocalStorage(app: { saveLocalStorage(key: string, value: unknown): void }): Promise<void> {
    for (const key of [
      "k-plex:index-body-cache:v1",
      "k-plex:index-body-cache:v2",
      "k-plex:index-cache:v1",
      "k-plex:index-snapshot:v1",
      "excalibrain:index-body-cache:v2",
      "k-plex:mobile-diagnostics:v1",
    ]) {
      try { app.saveLocalStorage(key, null); } catch { /* migration only */ }
    }
  }
}
