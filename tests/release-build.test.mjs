/** Exercise the real production bundler across clean Git, dirty Git and source-archive inputs. */
import assert from "node:assert/strict";
import test from "node:test";
import {copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

/** Fail with captured build/Git diagnostics instead of accepting a missing tool or partial build. */
function run(root, executable, args) {
  const result = spawnSync(executable, args, {cwd: root, encoding: "utf8", timeout: 30000});
  assert.equal(result.status, 0, String(result.error ?? result.stderr ?? result.stdout));
}

test("production artifacts are identical with clean, dirty and absent Git metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "kplex-release-build-"));
  try {
    await mkdir(join(root, "src"));
    await mkdir(join(root, "empty-hooks"));
    await copyFile(new URL("../esbuild.config.mjs", import.meta.url), join(root, "esbuild.config.mjs"));
    await writeFile(join(root, "manifest.json"), JSON.stringify({id: "k-plex", version: "3.2.1"}));
    await writeFile(join(root, "styles.css"), ".test { display: block; }\n");
    await writeFile(join(root, ".gitignore"), "node_modules/\ndist/\n");
    await writeFile(join(root, "src/main.ts"), 'export const build = __KPLEX_BUILD_ID__; export const script = () => document.createElement("script");');
    await symlink(fileURLToPath(new URL("../node_modules", import.meta.url)), join(root, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    run(root, "git", ["init", "--quiet"]);
    run(root, "git", ["add", "."]);
    run(root, "git", ["-c", "user.name=Release test", "-c", "user.email=release@example.invalid", "-c", "commit.gpgsign=false",
      "-c", `core.hooksPath=${join(root, "empty-hooks")}`, "commit", "--quiet", "-m", "Fixture"]);
    run(root, process.execPath, ["esbuild.config.mjs", "production"]);
    const clean = await readFile(join(root, "dist/main.js"));
    assert.match(clean.toString(), /3\.2\.1/);
    assert.doesNotMatch(clean.toString(), /source-archive|\.dirty|createElement\(["']script["']\)/);
    assert.match(clean.toString(), /createElement\("template"\)/, "Reproducibility must preserve React script hardening");
    await writeFile(join(root, "untracked.txt"), "Unrelated checkout change\n");
    run(root, process.execPath, ["esbuild.config.mjs", "production"]);
    assert.deepEqual(await readFile(join(root, "dist/main.js")), clean);
    await rm(join(root, ".git"), {recursive: true});
    run(root, process.execPath, ["esbuild.config.mjs", "production"]);
    assert.deepEqual(await readFile(join(root, "dist/main.js")), clean);
    assert.deepEqual(await readFile(join(root, "dist/manifest.json")), await readFile(join(root, "manifest.json")));
    assert.deepEqual(await readFile(join(root, "dist/styles.css")), await readFile(join(root, "styles.css")));
  } finally {await rm(root, {recursive: true, force: true});}
});
