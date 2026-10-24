/**
 * Deterministic safety/receipt contracts for owned-profile filesystem diagnostics. Metadata doubles
 * exercise path/alias/bound guards without requiring Windows symlink privileges, creating profiles,
 * opening production directories or spawning Python. Native allocation remains a separate Windows
 * diagnostic, never an inferred pass from these portable contracts.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { inventoryOwnedIndexedDbFiles, ownedIndexedDbProfile } from "./support/indexedDbFileInventory.mjs";

/** Model only the native metadata coordinates read by inventory; no file contents exist. */
function state(kind, size = 0, nlink = 1) {
  return { size, nlink,
    /** Distinguish a directory without following another path. */isDirectory: () => kind === "directory",
    /** Distinguish a regular file from links/devices. */isFile: () => kind === "file",
    /** Expose symbolic aliases through the same lstat contract used by native fs. */isSymbolicLink: () => kind === "link" };
}

/** Build a bounded isolated metadata tree below a lexical harness-owned temp profile. */
function tree(files = { "db.leveldb/0001.ldb": 10, "db.leveldb/0002.log": 20, "db.leveldb/CURRENT": 3 }) {
  const profile = join(tmpdir(), "kplex-source-idb-inventory-contract", "profile"), root = join(profile, "Default", "IndexedDB");
  const states = new Map(), aliases = new Map(), reads = [], opened = [], closed = [];
  for (const path of [dirname(profile), profile, join(profile, "Default"), root]) states.set(resolve(path), state("directory"));
  for (const [name, bytes] of Object.entries(files)) {
    const path = resolve(root, name); states.set(path, state("file", bytes));
    for (let parent = dirname(path); parent !== dirname(root); parent = dirname(parent)) states.set(parent, state("directory"));
  }
  const fs = {
    /** Resolve metadata by exact identity and preserve missing-directory errors. */
    lstat: async path => { path = resolve(path); reads.push(path); if (!states.has(path)) throw Object.assign(new Error("missing metadata"), { code: "ENOENT" }); return states.get(path); },
    /** Controlled path substitution exercises alias rejection without privileged symlink creation. */
    realpath: async path => aliases.get(resolve(path)) ?? resolve(path),
    /** Enumerate direct metadata children one at a time and retain closure evidence. */
    opendir: async path => {
      path = resolve(path); opened.push(path);
      const entries = [...states.keys()].filter(/** Enumerate only this directory's direct descendants. */candidate => dirname(candidate) === path)
        .map(/** Expose native Dirent's needed name field only. */candidate => ({ name: relative(path, candidate) }));
      let index = 0;
      return {
        /** Deliver one bounded metadata entry at a time. */read: async () => entries[index++] ?? null,
        /** Observe independent resource retirement even after traversal rejection. */close: async () => { closed.push(path); },
      };
    },
  };
  return { profile, root, states, aliases, reads, opened, closed, fs };
}

/** Logical stat sizes remain separate from unsupported allocation and retain stable extension totals. */
test("owned inventory lists relative regular-file sizes without inferring unsupported allocation", async () => {
  const f = tree();
  const result = await inventoryOwnedIndexedDbFiles(f.profile, { fileSystem: f.fs, platform: "linux" });
  assert.equal(result.status, "complete"); assert.equal(result.logicalBytes, 33); assert.equal(result.fileCount, 3);
  assert.equal(result.allocation.status, "unsupported"); assert.equal(result.allocation.allocationBytes, null);
  assert.deepEqual(result.files.map(/** Receipt paths must be relative and stable. */file => file.path), ["db.leveldb/0001.ldb", "db.leveldb/0002.log", "db.leveldb/CURRENT"]);
  assert.deepEqual(result.extensions.map(/** Unsupported native allocation must not appear as measured zero bytes. */row => [row.extension, row.logicalBytes, row.allocationBytes]), [[".ldb", 10, null], [".log", 20, null], ["<none>", 3, null]]);
  assert.deepEqual(f.opened, f.closed); assert.equal(Number.isFinite(result.elapsedMs), true);
});

/** Unsafe destinations fail before metadata enumeration, including sibling-prefix and nested escapes. */
test("inventory rejects unowned destinations before touching the filesystem", async () => {
  const f = tree();
  for (const path of ["relative/profile", join(tmpdir(), "production", "profile"), join(tmpdir(), "kplex-source-idb-safe", "extra", "profile"), join(tmpdir(), "kplex-source-idb-safe", "profile-other")]) {
    assert.throws(/** A lexical resemblance never establishes ownership. */() => ownedIndexedDbProfile(path), /owned profile|Unowned/);
    await assert.rejects(inventoryOwnedIndexedDbFiles(path, { fileSystem: f.fs }), /owned profile|Unowned/);
  }
  assert.deepEqual(f.reads, []); assert.deepEqual(f.opened, []);
});

/** Directory links, canonical aliases and hard-linked files cannot expand the observation scope. */
test("inventory rejects symbolic, canonical and hard-link aliases and closes opened directories", async () => {
  const link = tree(); link.states.set(resolve(join(link.profile, "Default")), state("link"));
  await assert.rejects(inventoryOwnedIndexedDbFiles(link.profile, { fileSystem: link.fs }), /alias rejected/);
  assert.deepEqual(link.opened, []);
  const canonical = tree(); canonical.aliases.set(resolve(canonical.root), join(tmpdir(), "other-directory"));
  await assert.rejects(inventoryOwnedIndexedDbFiles(canonical.profile, { fileSystem: canonical.fs }), /alias rejected/);
  const hard = tree(); hard.states.set(resolve(join(hard.root, "db.leveldb", "0001.ldb")), state("file", 10, 2));
  await assert.rejects(inventoryOwnedIndexedDbFiles(hard.profile, { fileSystem: hard.fs }), /alias rejected/);
  assert.deepEqual(hard.opened, hard.closed);
});

/** Malformed directory entries are rejected before their resolved target is ever inspected. */
test("directory-entry root escapes are rejected and the enumeration handle is retired", async () => {
  const f = tree({}); let retired = false;
  f.fs.opendir = /** Supply one hostile entry without allowing an actual outside filesystem lookup. */async () => ({
    /** A parent entry cannot be interpreted as an owned descendant. */read: async () => ({ name: ".." }),
    /** Retain closure evidence after the safety rejection. */close: async () => { retired = true; },
  });
  await assert.rejects(inventoryOwnedIndexedDbFiles(f.profile, { fileSystem: f.fs }), /escaped its root/);
  assert.equal(retired, true);
  assert.equal(f.reads.includes(resolve(dirname(f.root))), true); // The fixed Default ancestor is authenticated.
  assert.equal(f.reads.length, 5); // Owned/profile/Default/root plus root's pre-enumeration identity.
});

/** A missing database directory is an explicit absent observation rather than measured empty storage. */
test("missing IndexedDB retains unknown byte totals instead of reporting zero", async () => {
  const f = tree({}); f.states.delete(resolve(f.root));
  const result = await inventoryOwnedIndexedDbFiles(f.profile, { fileSystem: f.fs });
  assert.equal(result.status, "missing"); assert.equal(result.logicalBytes, null); assert.equal(result.allocation.allocationBytes, null);
});

/** Bounds stop unexpectedly large trees and cleanup still owns every opened enumeration handle. */
test("inventory enforces file and depth bounds without following an unbounded tree", async () => {
  const names = {};
  for (let index = 0; index < 4097; index += 1) names[`db/${index}.ldb`] = 1;
  const many = tree(names);
  await assert.rejects(inventoryOwnedIndexedDbFiles(many.profile, { fileSystem: many.fs, platform: "linux" }), /file bound exceeded/);
  assert.deepEqual(many.opened, many.closed);
  const deep = tree({ [`${"directory/".repeat(17)}one.ldb`]: 1 });
  await assert.rejects(inventoryOwnedIndexedDbFiles(deep.profile, { fileSystem: deep.fs, platform: "linux" }), /depth bound exceeded/);
  assert.deepEqual(deep.opened, deep.closed);
});

/** One isolated argument-array helper supplies actual allocation metadata independently of logical sizes. */
test("Windows allocation uses one bounded process with no shell or content-reading file arguments", async () => {
  const f = tree(); let calls = 0;
  const execute = /** Inspect process ownership/protocol and supply deterministic native metadata. */(executable, args, options) => {
    calls += 1; assert.equal(executable, "owned-python"); assert.deepEqual(args.slice(0, 4), ["-I", "-S", "-B", "-c"]);
    assert.equal(options.shell, false); assert.equal(options.timeout, 15000); assert.equal(options.windowsHide, true);
    const input = JSON.parse(options.input); assert.equal(input.profile, f.profile); assert.equal(input.files.length, 3);
    return { status: 0, stdout: JSON.stringify({ version: 1, status: "complete", files: input.files.map(/** Link exact selected paths to observed native allocation and EOF sizes. */file => ({ ...file, status: "ok", allocationBytes: 4096, endOfFile: file.path.endsWith(".ldb") ? 10 : file.path.endsWith(".log") ? 20 : 3 })) }) };
  };
  const result = await inventoryOwnedIndexedDbFiles(f.profile, { fileSystem: f.fs, platform: "win32", pythonExecutable: "owned-python", execute });
  assert.equal(calls, 1); assert.equal(result.logicalBytes, 33); assert.equal(result.allocation.status, "complete");
  assert.equal(result.allocation.allocationBytes, 12288); assert.equal(result.allocation.observedFiles, 3);
  assert.equal(result.files.every(/** Every reported allocation belongs to one authenticated relative file. */file => file.allocationBytes === 4096), true);
});

/** Missing Python and native errors remain explicit unsupported/partial results, never manufactured zeros. */
test("allocation preserves missing tools, failed files and live-file size changes as unknown", async () => {
  const missing = tree();
  const unsupported = await inventoryOwnedIndexedDbFiles(missing.profile, { fileSystem: missing.fs, platform: "win32",
    /** No fallback to logical size is allowed when the metadata tool is unavailable. */execute: () => ({ error: { code: "ENOENT" }, status: null }) });
  assert.equal(unsupported.allocation.status, "unsupported"); assert.equal(unsupported.allocation.allocationBytes, null);
  const partial = tree({ "one.ldb": 10, "two.log": 20, "three.tmp": 5 });
  const result = await inventoryOwnedIndexedDbFiles(partial.profile, { fileSystem: partial.fs, platform: "win32",
    /** Preserve one valid file, a changed EOF and an actual API error in the same snapshot. */execute: (_executable, _args, options) => ({ status: 0, stdout: JSON.stringify({ version: 1, status: "complete", files: JSON.parse(options.input).files.map(/** Distinguish unstable/native-failed files without guessing their allocation. */file => ({ ...file, status: file.path === "two.log" ? "error" : "ok", allocationBytes: 4096, endOfFile: file.path === "one.ldb" ? 10 : 999, errorCode: file.path === "two.log" ? 32 : null, error: "Windows metadata query failed" })) }) }) });
  assert.equal(result.allocation.status, "partial"); assert.equal(result.allocation.allocationBytes, null);
  assert.equal(result.allocation.knownAllocationBytes, 4096); assert.equal(result.allocation.observedFiles, 1);
  assert.equal(result.allocation.errors.length, 2);
  assert.equal(result.files.find(/** Failed file identity remains explicit in the receipt. */file => file.path === "two.log").allocationBytes, null);
});

/** A malformed, duplicated or foreign helper identity is not accepted as native evidence. */
test("allocation rejects malformed helper results and retains error status", async () => {
  const f = tree({ "one.ldb": 10, "two.ldb": 20 });
  const result = await inventoryOwnedIndexedDbFiles(f.profile, { fileSystem: f.fs, platform: "win32",
    /** Duplicate response identities cannot be joined twice to the same owned file. */execute: () => ({ status: 0, stdout: JSON.stringify({ version: 1, status: "complete", files: [
      { path: "one.ldb", status: "ok", allocationBytes: 4096, endOfFile: 10 },
      { path: "one.ldb", status: "ok", allocationBytes: 4096, endOfFile: 10 },
    ] }) }) });
  assert.equal(result.allocation.status, "error"); assert.match(result.allocation.reason, /duplicate\/unowned/);
  assert.equal(result.allocation.allocationBytes, null);
});
