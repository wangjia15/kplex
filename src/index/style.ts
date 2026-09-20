import type { ExcaliBrainSettings } from "../settings";
import type { GraphPage, LinkStyle, Neighbour, NodeStyle, Role } from "../types";
import { RelationType } from "../types";

export const alphaHexToCss = (color?: string, fallback = "transparent"): string => {
  if (!color) return fallback;
  if (/^#[0-9a-fA-F]{8}$/.test(color)) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const a = parseInt(color.slice(7, 9), 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return color;
};


function tagStyle(page: GraphPage, settings: ExcaliBrainSettings): NodeStyle {
  if (!page.primaryStyleTag) return {};
  const key = settings.tagStyleList.find((tag) => page.primaryStyleTag?.startsWith(tag));
  if (!key) return {};
  const primary = settings.tagNodeStyles[key] ?? {};
  if (!settings.displayAllStylePrefixes) return primary;
  const prefixes = new Set<string>();
  if (primary.prefix) prefixes.add(primary.prefix);
  for (const tag of page.styleTags) {
    const match = settings.tagStyleList.find((candidate) => tag.startsWith(candidate));
    const prefix = match ? settings.tagNodeStyles[match]?.prefix : undefined;
    if (prefix) prefixes.add(prefix);
  }
  return prefixes.size ? { ...primary, prefix: [...prefixes].join("") } : primary;
}

export function resolveNodeStyle(page: GraphPage, relation: Neighbour | null, role: Role | "center", settings: ExcaliBrainSettings): NodeStyle {
  const central = role === "center" ? settings.centralNodeStyle : {};
  const sibling = role === "sibling" ? settings.siblingNodeStyle : {};
  if (page.isFolder) {
    return { ...settings.baseNodeStyle, ...central, ...sibling, ...settings.folderNodeStyle };
  }
  if (page.isTag) {
    return { ...settings.baseNodeStyle, ...central, ...sibling, ...settings.tagNodeStyle };
  }
  return {
    ...settings.baseNodeStyle,
    ...(relation?.relationType === RelationType.INFERRED ? settings.inferredNodeStyle : {}),
    ...(page.url ? settings.urlNodeStyle : {}),
    ...(!page.file && !page.url ? settings.virtualNodeStyle : {}),
    ...central,
    ...sibling,
    ...(page.file && page.file.extension !== "md" ? settings.attachmentNodeStyle : {}),
    ...tagStyle(page, settings),
    embedHeight: settings.centerEmbedHeight,
    embedWidth: settings.centerEmbedWidth
  };
}

export function resolveLinkStyle(neighbour: Neighbour, settings: ExcaliBrainSettings): LinkStyle {
  let layered: LinkStyle = {};
  const definitions = neighbour.typeDefinition?.split(",").map((x) => x.trim()).filter(Boolean) ?? [];
  for (const definition of definitions) {
    if (definition === "file-tree") layered = { ...layered, ...settings.folderLinkStyle };
    else if (definition === "tag-tree") layered = { ...layered, ...settings.tagLinkStyle };
    const normalized = definition.toLowerCase().replaceAll(" ", "-");
    layered = {
      ...layered,
      ...(settings.hierarchyLinkStyles[definition] ?? settings.hierarchyLinkStyles[normalized] ?? {})
    };
  }
  return {
    ...settings.baseLinkStyle,
    ...(neighbour.relationType === RelationType.INFERRED ? settings.inferredLinkStyle : {}),
    ...layered
  };
}
