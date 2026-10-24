/** Shared real-browser discovery for DOM and IndexedDB tests on desktop operating systems. */
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

/** Honor explicit browser paths, then discover Chromium, Chrome or Edge without launching a shell. */
export function browserExecutable(env = process.env, platform = process.platform, exists = existsSync) {
  if (env.KPLEX_CHROMIUM || env.KPLEX_TEST_BROWSER) return env.KPLEX_CHROMIUM || env.KPLEX_TEST_BROWSER;
  const names = ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "chrome", "msedge"];
  const pathCandidates = (env.PATH ?? "").split(platform === "win32" ? ";" : delimiter).filter(Boolean)
    .flatMap(directory => names.map(name => join(directory, platform === "win32" ? `${name}.exe` : name)));
  const known = platform === "win32"
    ? [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA].filter(Boolean)
      .flatMap(directory => [join(directory, "Google", "Chrome", "Application", "chrome.exe"),
        join(directory, "Microsoft", "Edge", "Application", "msedge.exe")])
    : ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"];
  return [...pathCandidates, ...known].find(exists) ?? null;
}
