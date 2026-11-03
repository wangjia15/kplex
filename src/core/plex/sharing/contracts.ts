/** Versioned, data-only packages. Durable settings, activation and native UI remain outside this contract. */
import type {FacetPreset} from "../views/facets/contracts";
import type {PortableLensMode, PortableLensScope, PortableLensStyle} from "../lens";
import type {SemanticColorPair} from "../colorPreferences";

export const PORTABLE_PACKAGE_LIMITS = {characters: 65_536, nodes: 8192, depth: 12, lenses: 16, palette: 32, expression: 2048} as const;
/** Enabled state is intentionally absent: every imported lens begins disabled. */
export type SharedLens = Readonly<{id: string; name: string; scope: PortableLensScope; mode: PortableLensMode; expression: string; style?: PortableLensStyle}>;
/** Help is literal, localized text on export; code-owned translation keys never travel. */
export type SharedFacetPreset = FacetPreset & Readonly<{helpMarkdown: string}>;
export type PortablePackage = Readonly<{format: "kplex-preset"; version: 1; id: string;
  palette?: readonly SemanticColorPair[]; aiContext: string} & (
    {kind: "facets"; preset: SharedFacetPreset; lenses?: readonly SharedLens[]}
    | {kind: "lens"; lens: SharedLens})>;
export type PackageIssue = Readonly<{code: "size" | "json" | "version" | "unknown-field" | "invalid" | "rule" | "color" | "privacy"; path: string}>;
export type PackageValidation = Readonly<{status: "valid"; value: PortablePackage; paletteReferences: readonly string[]; privacy: readonly string[]}>
  | Readonly<{status: "invalid"; issues: readonly PackageIssue[]}>;
