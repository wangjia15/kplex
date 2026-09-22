import { Platform } from "obsidian";
import type { ParsedBodyMetadata } from "./fieldParser";
import { perfElapsed, perfLog, perfNow } from "../util/perf";
import type { PersistedEvidenceDeclaration, PersistedPage } from "./IndexSnapshot";

const DB_VERSION = 3;
const BODY_CACHE_VERSION = 2;
const META_STORE = "meta";
const PAGE_STORE = "pages";
const EVIDENCE_STORE = "evidence";
const BODY_STORE = "bodies";
const GENERATION_INDEX = "generation";

export type IndexedDbSnapshotMeta = {
  key: "active";
  schema: 1 | 2;
  generation: string;
  createdAt: number;
  vaultSignature: string;
  settingsSignature: string;
  discoveredFields: Array<[string, { name: string; count: number }]>;
};

type PageRecord = { generation: string; path: string; value: PersistedPage };
type EvidenceRecord = { generation: string; key: string; value: PersistedEvidenceDeclaration };
type BodyRecord = { path: string; mtime: number; parserVersion: number; body: ParsedBodyMetadata };

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
    this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      try {
        const request = indexedDB.open(safeDbName(this.vaultName), DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
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
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            this.dbPromise = null;
          };
          resolve(db);
        };
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch {
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
    const db = await this.open();
    if (!db) return null;
    try {
      const tx = db.transaction(META_STORE, "readonly");
      const done = transactionDone(tx);
      const value = await requestResult(tx.objectStore(META_STORE).get("active"));
      await done;
      if (!value || typeof value !== "object") return null;
      const meta = value as Partial<IndexedDbSnapshotMeta>;
      if ((meta.schema !== 1 && meta.schema !== 2) || meta.key !== "active" || typeof meta.generation !== "string" ||
        typeof meta.createdAt !== "number" || typeof meta.vaultSignature !== "string" ||
        typeof meta.settingsSignature !== "string" || !Array.isArray(meta.discoveredFields)) return null;
      return meta as IndexedDbSnapshotMeta;
    } catch {
      return null;
    }
  }

  async iteratePages(generation: string, onPage: (page: PersistedPage) => void): Promise<boolean> {
    return this.iterateGeneration<PageRecord>(PAGE_STORE, generation, (record) => onPage(record.value));
  }

  async iterateEvidence(generation: string, onEvidence: (evidence: PersistedEvidenceDeclaration) => void): Promise<boolean> {
    return this.iterateGeneration<EvidenceRecord>(EVIDENCE_STORE, generation, (record) => onEvidence(record.value));
  }

  private async iterateGeneration<T>(storeName: string, generation: string, onValue: (value: T) => void): Promise<boolean> {
    const db = await this.open();
    if (!db) return false;
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
          onValue(cursor.value as T);
          cursor.continue();
        };
      });
      await done;
      return true;
    } catch {
      return false;
    }
  }

  async writeSnapshot(
    meta: Omit<IndexedDbSnapshotMeta, "key" | "schema" | "generation">,
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
    let pageCount = 0;
    let evidenceCount = 0;
    perfLog("snapshot.write.start", { previousGeneration: Boolean(previous?.generation), batchSize });
    const yieldBetweenBatches = async (): Promise<void> => {
      if (!Platform.isMobile) return;
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    };

    const pageBatch: PageRecord[] = [];
    const flushPages = async (): Promise<boolean> => {
      if (!pageBatch.length) return true;
      if (!isCurrent()) return false;
      const tx = db.transaction(PAGE_STORE, "readwrite");
      const store = tx.objectStore(PAGE_STORE);
      for (const record of pageBatch) store.put(record);
      pageBatch.length = 0;
      await transactionDone(tx);
      await yieldBetweenBatches();
      return isCurrent();
    };
    for (const page of pages) {
      pageCount += 1;
      pageBatch.push({ generation, path: page.path, value: page });
      if (pageBatch.length >= batchSize && !(await flushPages())) return false;
    }
    if (!(await flushPages())) return false;

    const evidenceBatch: EvidenceRecord[] = [];
    let evidenceOrdinal = 0;
    const flushEvidence = async (): Promise<boolean> => {
      if (!evidenceBatch.length) return true;
      if (!isCurrent()) return false;
      const tx = db.transaction(EVIDENCE_STORE, "readwrite");
      const store = tx.objectStore(EVIDENCE_STORE);
      for (const record of evidenceBatch) store.put(record);
      evidenceBatch.length = 0;
      await transactionDone(tx);
      await yieldBetweenBatches();
      return isCurrent();
    };
    for (const declaration of evidence) {
      evidenceCount += 1;
      const key = `${String(evidenceOrdinal++).padStart(10, "0")}:${declaration.sourcePath}:${declaration.targetPath}`;
      evidenceBatch.push({ generation, key, value: declaration });
      if (evidenceBatch.length >= batchSize && !(await flushEvidence())) return false;
    }
    if (!(await flushEvidence()) || !isCurrent()) return false;

    const active: IndexedDbSnapshotMeta = { key: "active", schema: 2, generation, ...meta };
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put(active);
    await transactionDone(tx);
    if (previous?.generation && previous.generation !== generation) void this.deleteGeneration(previous.generation);
    perfLog("snapshot.write.end", { elapsedMs: perfElapsed(startedAt), pages: pageCount, evidence: evidenceCount });
    return true;
  }

  private async deleteGeneration(generation: string): Promise<void> {
    const db = await this.open();
    if (!db) return;
    await Promise.all([PAGE_STORE, EVIDENCE_STORE].map(async (storeName) => {
      try {
        const tx = db.transaction(storeName, "readwrite");
        const done = transactionDone(tx);
        const index = tx.objectStore(storeName).index(GENERATION_INDEX);
        await new Promise<void>((resolve, reject) => {
          const request = index.openCursor(IDBKeyRange.only(generation));
          request.onerror = () => reject(request.error ?? new Error("IndexedDB cleanup cursor failed"));
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) { resolve(); return; }
            cursor.delete();
            cursor.continue();
          };
        });
        await done;
      } catch { /* cache cleanup only */ }
    }));
  }

  async getBodies(requests: ReadonlyArray<{ path: string; mtime: number }>): Promise<Map<string, ParsedBodyMetadata>> {
    const result = new Map<string, ParsedBodyMetadata>();
    if (!requests.length) return result;
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
    } catch { /* cache miss behaves like an empty batch */ }
    return result;
  }

  async bodyStoreReady(): Promise<boolean> {
    const db = await this.open();
    return Boolean(db?.objectStoreNames.contains(BODY_STORE));
  }

  async putBodies(records: ReadonlyArray<{ path: string; mtime: number; body: ParsedBodyMetadata }>): Promise<boolean> {
    if (!records.length) return true;
    const db = await this.open();
    if (!db || !db.objectStoreNames.contains(BODY_STORE)) return false;
    try {
      const tx = db.transaction(BODY_STORE, "readwrite");
      const done = transactionDone(tx);
      const store = tx.objectStore(BODY_STORE);
      for (const record of records) store.put({ ...record, parserVersion: BODY_CACHE_VERSION } satisfies BodyRecord);
      await done;
      return true;
    } catch {
      return false;
    }
  }

  async getBody(path: string, mtime: number): Promise<ParsedBodyMetadata | null> {
    const db = await this.open();
    if (!db) return null;
    try {
      const tx = db.transaction(BODY_STORE, "readonly");
      const done = transactionDone(tx);
      const value = await requestResult(tx.objectStore(BODY_STORE).get(path)) as BodyRecord | undefined;
      await done;
      return value && value.mtime === mtime && value.parserVersion === BODY_CACHE_VERSION && value.body && Array.isArray(value.body.inlineFieldOccurrences) ? value.body : null;
    } catch {
      return null;
    }
  }

  async putBody(path: string, mtime: number, body: ParsedBodyMetadata): Promise<boolean> {
    const db = await this.open();
    if (!db || !db.objectStoreNames.contains(BODY_STORE)) return false;
    try {
      const tx = db.transaction(BODY_STORE, "readwrite");
      const done = transactionDone(tx);
      tx.objectStore(BODY_STORE).put({ path, mtime, parserVersion: BODY_CACHE_VERSION, body } satisfies BodyRecord);
      await done;
      return true;
    } catch {
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
