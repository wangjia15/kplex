import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";
import { copyFile, mkdir } from "node:fs/promises";

const prod = process.argv[2] === "production";

const copyArtifacts = async () => {
  await mkdir("dist", { recursive: true });
  await Promise.all([
    copyFile("manifest.json", "dist/manifest.json"),
    copyFile("styles.css", "dist/styles.css")
  ]);
};

const context = await esbuild.context({
  banner: { js: "/* ExcaliBrain - generated bundle */" },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules
  ],
  format: "cjs",
  target: "es2021",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "dist/main.js",
  minify: prod,
  plugins: [{
    name: "copy-plugin-artifacts",
    setup(build) {
      build.onEnd(async () => { await copyArtifacts(); });
    }
  }]
});

if (prod) {
  await context.rebuild();
  await context.dispose();
  process.exit(0);
} else {
  await copyArtifacts();
  await context.watch();
}
