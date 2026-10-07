import { TFile, type App, type WorkspaceLeaf } from "obsidian";

/** The Markdown Read Aloud (obtts) plugin's reading surface K-Plex calls. */
export interface ObttsReadApi {
  readText: (text: string, title: string, opts?: { docUri?: TFile; baseLine?: number; leaf?: WorkspaceLeaf }) => Promise<void>;
}

/**
 * Resolves obtts's public reading API. `app.plugins` is not part of App's public typings, so each
 * hop is narrowed at runtime; the instance itself is returned (never a wrapper of its methods) so
 * obtts's own state stays reachable through `this` when its methods run.
 */
export function obttsReadApi(app: App): ObttsReadApi | null {
  if (!("plugins" in app)) return null;
  const manager: unknown = app.plugins;
  if (!manager || typeof manager !== "object" || !("plugins" in manager)) return null;
  const registry: unknown = manager.plugins;
  if (!registry || typeof registry !== "object") return null;
  const registryRecord = registry as Record<string, unknown>;
  const plugin = registryRecord["obtts"];
  if (!plugin || typeof plugin !== "object") return null;
  const methods = plugin as Record<string, unknown>;
  if (typeof methods.readText !== "function") return null;
  return plugin as ObttsReadApi;
}
