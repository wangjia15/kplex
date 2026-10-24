/**
 * Read-only, bounded file metadata diagnostics for this harness's disposable Chromium IndexedDB
 * directory. Never reads database contents or another profile. Optional Windows allocation queries
 * use one isolated Python process with read-attributes-only handles, outside measured intervals.
 * File sizes/allocation are filesystem observations, not live database data, cache equivalence or
 * evidence of a particular storage-engine cause. Callers own timing separation and private receipts.
 */
import * as nativeFs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";

const MAX_FILES = 4096, MAX_DIRECTORIES = 128, MAX_DEPTH = 16;

/** Public provenance for the exact Windows metadata APIs; none are write or content-read APIs. */
export const INDEXED_DB_ALLOCATION_REFERENCES = Object.freeze([
  "https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_standard_info",
  "https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex",
  "https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew",
  "https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfinalpathnamebyhandlew",
]);

// Static helper program; JSON paths arrive on stdin, never through command interpolation. -B avoids
// bytecode writes and -I/-S avoid environment/site customization. No ReadFile or content parser exists.
const WINDOWS_ALLOCATION_PROGRAM = String.raw`import ctypes, json, os, re, stat, sys, tempfile
from ctypes import wintypes

def normalized(path):
    """Normalize only for exact owned-path comparisons, never to discover another destination."""
    return os.path.normcase(os.path.abspath(path))

def main():
    """Read bounded owned-file metadata through existing read-attributes-only handles."""
    if sys.platform != "win32":
        return {"version": 1, "status": "unsupported", "reason": "Python is not running on Windows", "files": []}
    payload = json.loads(sys.stdin.buffer.read(2 * 1024 * 1024).decode("utf-8"))
    profile, entries = payload["profile"], payload["files"]
    temp = normalized(tempfile.gettempdir())
    if normalized(os.path.dirname(os.path.dirname(profile))) != temp or os.path.basename(profile) != "profile" or not re.fullmatch(r"kplex-source-idb-[A-Za-z0-9_-]+", os.path.basename(os.path.dirname(profile))):
        raise ValueError("Unowned profile")
    if not isinstance(entries, list) or len(entries) > 4096:
        raise ValueError("File bound exceeded")
    root = os.path.join(profile, "Default", "IndexedDB")
    for path in [os.path.dirname(profile), profile, os.path.join(profile, "Default"), root]:
        info = os.lstat(path)
        if not stat.S_ISDIR(info.st_mode) or info.st_file_attributes & 0x400:
            raise ValueError("Directory alias rejected")

    class StandardInfo(ctypes.Structure):
        """FILE_STANDARD_INFO uses 64-bit sizes, a DWORD link count, then two BOOLEAN fields."""
        _fields_ = [("AllocationSize", ctypes.c_longlong), ("EndOfFile", ctypes.c_longlong), ("NumberOfLinks", wintypes.DWORD), ("DeletePending", ctypes.c_ubyte), ("Directory", ctypes.c_ubyte)]

    class AttributeTagInfo(ctypes.Structure):
        """FileAttributeTagInfo exposes reparse status on the opened handle itself."""
        _fields_ = [("FileAttributes", wintypes.DWORD), ("ReparseTag", wintypes.DWORD)]

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    create = kernel.CreateFileW
    create.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
    create.restype = wintypes.HANDLE
    query = kernel.GetFileInformationByHandleEx
    query.argtypes = [wintypes.HANDLE, ctypes.c_int, wintypes.LPVOID, wintypes.DWORD]
    query.restype = wintypes.BOOL
    final = kernel.GetFinalPathNameByHandleW
    final.argtypes = [wintypes.HANDLE, wintypes.LPWSTR, wintypes.DWORD, wintypes.DWORD]
    final.restype = wintypes.DWORD
    close = kernel.CloseHandle
    close.argtypes = [wintypes.HANDLE]
    close.restype = wintypes.BOOL
    rows, seen = [], set()
    for entry in entries:
        name = entry["path"]
        parts = name.split("/")
        if name in seen or len(parts) > 17 or any(not part or part in (".", "..") or any(char in part for char in ("\\", ":", "\x00")) for part in parts):
            raise ValueError("Invalid relative file")
        seen.add(name)
        path = os.path.join(root, *parts)
        if os.path.commonpath([normalized(root), normalized(path)]) != normalized(root):
            raise ValueError("Root escape rejected")
        row, handle = {"path": name, "status": "error", "allocationBytes": None, "endOfFile": None, "errorCode": None}, None
        try:
            # Check every owned descendant directory before opening the final regular file.
            parent = root
            for part in parts[:-1]:
                parent = os.path.join(parent, part)
                info = os.lstat(parent)
                if not stat.S_ISDIR(info.st_mode) or info.st_file_attributes & 0x400:
                    raise ValueError("Descendant directory alias rejected")
            info = os.lstat(path)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_file_attributes & 0x400:
                raise ValueError("Regular single-link file required")
            # FILE_READ_ATTRIBUTES=0x80, sharing=read|write|delete, OPEN_EXISTING=3,
            # FILE_FLAG_OPEN_REPARSE_POINT=0x00200000. Never create, write or read file contents.
            handle = create(path, 0x80, 7, None, 3, 0x00200000, None)
            if handle == ctypes.c_void_p(-1).value:
                handle = None
                raise ctypes.WinError(ctypes.get_last_error())
            tag, standard = AttributeTagInfo(), StandardInfo()
            if not query(handle, 9, ctypes.byref(tag), ctypes.sizeof(tag)):
                raise ctypes.WinError(ctypes.get_last_error())
            if tag.FileAttributes & 0x400:
                raise ValueError("Opened reparse point rejected")
            buffer = ctypes.create_unicode_buffer(32768)
            length = final(handle, buffer, len(buffer), 0)
            if not length or length >= len(buffer):
                raise ctypes.WinError(ctypes.get_last_error())
            opened = buffer.value
            if opened.startswith("\\\\?\\"):
                opened = opened[4:]
            if normalized(opened) != normalized(path):
                raise ValueError("Opened handle escaped exact file identity")
            if not query(handle, 1, ctypes.byref(standard), ctypes.sizeof(standard)):
                raise ctypes.WinError(ctypes.get_last_error())
            if standard.Directory or standard.DeletePending or standard.NumberOfLinks != 1 or standard.AllocationSize < 0 or standard.EndOfFile < 0:
                raise ValueError("Opened file is not stable single-link regular data")
            row.update(status="ok", allocationBytes=standard.AllocationSize, endOfFile=standard.EndOfFile)
        except (OSError, ValueError) as error:
            row.update(errorCode=getattr(error, "winerror", None), error=type(error).__name__ + ": " + (str(error) if isinstance(error, ValueError) else "Windows metadata query failed"))
        finally:
            if handle is not None and not close(handle):
                row.update(status="error", allocationBytes=None, errorCode=ctypes.get_last_error(), error="CloseHandle failed")
        rows.append(row)
    return {"version": 1, "status": "complete", "files": rows}

try:
    print(json.dumps(main(), ensure_ascii=True))
except Exception as error:
    print(json.dumps({"version": 1, "status": "error", "reason": type(error).__name__ + ": " + str(error), "files": []}, ensure_ascii=True))
`;

/** Lexically restrict the destination to an immediate harness-owned profile below the OS temp root. */
export function ownedIndexedDbProfile(profile) {
  if (typeof profile !== "string" || !isAbsolute(profile)) throw new Error("IndexedDB inventory requires an absolute owned profile");
  const selected = resolve(profile), owned = dirname(selected), parent = dirname(owned);
  if (parent !== resolve(tmpdir()) || basename(selected) !== "profile" || !/^kplex-source-idb-[A-Za-z0-9_-]+$/.test(basename(owned)))
    throw new Error("Unowned IndexedDB inventory profile");
  return selected;
}

/** Reject unsafe names before any filesystem call can follow a readdir result outside its directory. */
function safeName(name) {
  if (typeof name !== "string" || !name || name === "." || name === ".." || /[\\/:\0]/.test(name))
    throw new Error("IndexedDB inventory child name escaped its root");
}

/** Reject directory aliases and exact-path substitutions before traversing owned file metadata. */
async function directoryIdentity(path, fs) {
  const state = await fs.lstat(path);
  if (state.isSymbolicLink() || !state.isDirectory() || resolve(await fs.realpath(path)) !== resolve(path))
    throw new Error("IndexedDB inventory directory alias rejected");
}

/** Bound scalar metadata before adding it to file or extension totals. */
function finiteBytes(value) { return Number.isSafeInteger(value) && value >= 0; }

/** Query all selected Windows files once; missing Python/platform/API failures remain explicit unknowns. */
function allocationSnapshot(profile, files, options) {
  const started = performance.now();
  const receipt = { status: "unsupported", reason: null, method: "GetFileInformationByHandleEx(FileStandardInfo=1).AllocationSize",
    allocationBytes: null, knownAllocationBytes: 0, observedFiles: 0, elapsedMs: null, errors: [], references: INDEXED_DB_ALLOCATION_REFERENCES };
  try {
    if ((options.platform ?? process.platform) !== "win32") { receipt.reason = "Windows AllocationSize API unavailable on this platform"; return receipt; }
    if (options.allocation === false) { receipt.reason = "Windows allocation query explicitly disabled"; return receipt; }
    const execute = options.execute ?? spawnSync;
    const result = execute(options.pythonExecutable ?? "python", ["-I", "-S", "-B", "-c", WINDOWS_ALLOCATION_PROGRAM],
      { input: JSON.stringify({ profile, files: files.map(/** Pass only already guarded relative identities. */file => ({ path: file.path })) }),
        encoding: "utf8", timeout: 15000, maxBuffer: 2 * 1024 * 1024, windowsHide: true, shell: false });
    if (result.error?.code === "ENOENT") { receipt.reason = "Python executable unavailable; allocation was not measured"; return receipt; }
    if (result.error || result.status !== 0) throw new Error(`Allocation helper failed: ${result.error?.code ?? result.signal ?? result.status}`);
    const parsed = JSON.parse(result.stdout);
    if (parsed.version !== 1 || !Array.isArray(parsed.files)) throw new Error("Allocation helper protocol invalid");
    if (parsed.status === "unsupported") { receipt.reason = String(parsed.reason); return receipt; }
    if (parsed.status !== "complete" || parsed.files.length !== files.length) throw new Error(`Allocation helper incomplete: ${parsed.reason ?? parsed.status}`);
    const expected = new Map(files.map(/** Join native results only to a previously guarded relative identity. */file => [file.path, file]));
    for (const row of parsed.files) {
      const file = expected.get(row.path); if (!file) throw new Error("Allocation helper returned duplicate/unowned file identity");
      expected.delete(row.path);
      if (row.status === "ok" && finiteBytes(row.allocationBytes) && finiteBytes(row.endOfFile) && row.endOfFile === file.logicalBytes) {
        if (!finiteBytes(receipt.knownAllocationBytes + row.allocationBytes)) throw new Error("Allocation helper byte total invalid");
        file.allocationBytes = row.allocationBytes; receipt.knownAllocationBytes += row.allocationBytes; receipt.observedFiles += 1;
      } else {
        file.allocationError = row.status === "ok" ? "File size changed or native size invalid between metadata observations" : String(row.error ?? "Windows metadata query failed");
        receipt.errors.push({ path: file.path, code: row.errorCode ?? null, message: file.allocationError });
      }
    }
    receipt.status = receipt.observedFiles === files.length ? "complete" : "partial";
    if (receipt.status === "complete") receipt.allocationBytes = receipt.knownAllocationBytes;
    return receipt;
  } catch (error) {
    receipt.status = "error"; receipt.reason = String(error.message ?? error); receipt.allocationBytes = null; return receipt;
  } finally { receipt.elapsedMs = performance.now() - started; }
}

/**
 * List only regular-file stat sizes and optional Windows AllocationSize in the owned IndexedDB tree.
 * Rejects links, aliases, escapes and unbounded trees; missing IndexedDB remains explicit missing.
 * Native fs/execute/platform injection exists only for deterministic safety/error contracts. This
 * observation is not atomic against a live writer; mismatched native EOF sizes are reported unknown.
 */
export async function inventoryOwnedIndexedDbFiles(profile, options = {}) {
  const started = performance.now(), selected = ownedIndexedDbProfile(profile), fs = options.fileSystem ?? nativeFs;
  const root = join(selected, "Default", "IndexedDB");
  const receipt = { status: "incomplete", scope: "Owned profile Default/IndexedDB regular files only; no file contents or directory allocation",
    logicalBytes: null, files: [], fileCount: 0, directoryCount: 0, extensions: [], allocation: null, elapsedMs: null,
    limitation: "Stat and Windows AllocationSize are not live DB bytes, fsync proof, disk-I/O cost, OS-cache equivalence or backend causation; live-writer snapshots are non-atomic" };
  try {
    for (const path of [dirname(selected), selected, join(selected, "Default")]) await directoryIdentity(path, fs);
    try { await directoryIdentity(root, fs); }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      receipt.status = "missing"; receipt.allocation = { status: "unsupported", allocationBytes: null, reason: "Owned IndexedDB directory is absent" }; return receipt;
    }
    const stack = [{ path: root, depth: 0 }]; let logicalBytes = 0;
    while (stack.length) {
      const item = stack.pop();
      if (++receipt.directoryCount > MAX_DIRECTORIES || item.depth > MAX_DEPTH) throw new Error("IndexedDB inventory directory/depth bound exceeded");
      await directoryIdentity(item.path, fs);
      const directory = await fs.opendir(item.path);
      try {
        for (;;) {
          const entry = await directory.read(); if (!entry) break;
          safeName(entry.name);
          const path = join(item.path, entry.name), pathFromRoot = relative(root, path);
          if (isAbsolute(pathFromRoot) || pathFromRoot.startsWith(".." + sep) || pathFromRoot === "..") throw new Error("IndexedDB inventory root escape rejected");
          const state = await fs.lstat(path);
          if (state.isSymbolicLink()) throw new Error("IndexedDB inventory file alias rejected");
          if (state.isDirectory()) { stack.push({ path, depth: item.depth + 1 }); if (stack.length > MAX_DIRECTORIES) throw new Error("IndexedDB inventory directory bound exceeded"); }
          else if (state.isFile()) {
            if (state.nlink !== 1 || resolve(await fs.realpath(path)) !== resolve(path)) throw new Error("IndexedDB inventory regular-file alias rejected");
            if (!finiteBytes(state.size) || !finiteBytes(logicalBytes + state.size)) throw new Error("IndexedDB inventory byte size invalid");
            if (++receipt.fileCount > MAX_FILES) throw new Error("IndexedDB inventory file bound exceeded");
            logicalBytes += state.size;
            receipt.files.push({ path: pathFromRoot.split(sep).join("/"), logicalBytes: state.size, allocationBytes: null, allocationError: null });
          } else throw new Error("IndexedDB inventory non-regular entry rejected");
        }
      } finally { await directory.close(); }
    }
    receipt.files.sort(/** Keep snapshots comparable independently of filesystem enumeration order or OS locale. */(left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
    receipt.logicalBytes = logicalBytes;
    receipt.allocation = allocationSnapshot(selected, receipt.files, options);
    const extensions = new Map();
    for (const file of receipt.files) {
      const extension = extname(file.path).toLowerCase() || "<none>";
      const total = extensions.get(extension) ?? { extension, files: 0, logicalBytes: 0, allocationBytes: 0, unknownAllocationFiles: 0 };
      total.files += 1; total.logicalBytes += file.logicalBytes;
      if (file.allocationBytes === null) { total.allocationBytes = null; total.unknownAllocationFiles += 1; }
      else if (total.allocationBytes !== null) total.allocationBytes += file.allocationBytes;
      extensions.set(extension, total);
    }
    receipt.extensions = [...extensions.values()].sort(/** Extension totals retain stable locale-independent receipt ordering. */(left, right) => left.extension < right.extension ? -1 : left.extension > right.extension ? 1 : 0);
    receipt.status = "complete"; return receipt;
  } finally { receipt.elapsedMs = performance.now() - started; }
}
