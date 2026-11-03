/**
 * Host-side heading and transient section projection over indexed relationship evidence. Heading
 * slices retain physical LF/CRLF offsets to match native metadata positions. Transient explanation
 * codes reuse the UI language boundary without persisting section nodes. Projected/folded pairs
 * share the core defined-direction tier instead of independently merging arrow directions.
 * Cached physical link placements survive late target publication; each projection rebinds live
 * evidence/policy, with at most one native lookup per distinct lexical link and no body reads.
 */
import {ontologyConfiguration} from "../core/contracts/ontologyConfiguration";
import type { App, CachedMetadata, TFile } from "obsidian";
import type KplexPlugin from "../main";
import { LinkDirection, RelationType, type GraphPage, type Neighbour, type Neighborhood, type Relation, type Role } from "../types";
import { normalizeFieldName, type ParsedBodyMetadata } from "../core/parser/metadata";
import { extractLinksFromValue, parseBodyMetadataCooperative } from "./fieldParser";
import type { GraphIndex } from "./GraphIndex";
import { collectFootnotes, extractSectionContent, type SectionFigureRef, type SectionHighlight } from "./SectionContent";
import type { PdfCropRequest } from "./PdfCropRenderer";
import { applyEvidenceDecisionsToRelation, applyOntologyPrecedence, emptyRelation, type EvidenceRole, type RelationEvidence } from "./RelationEvidence";
import { classifyRelation, explainResolvedRelationship, type RelationshipExplanation } from "./RelationResolver";
import { canonicalWebUrl } from "../adapters/obsidian/urlIdentity";
import { projectSectionPreview, type SectionPreviewPlacement } from "./SectionPreview";

export type SectionFigure = {
  /** Browser-loadable source: a vault resource URL or the external image URL. Empty for a PDF crop. */
  src: string;
  /** Vault path of a local image, when it resolves. */
  path: string | null;
  caption: string;
  alt: string;
  /** 0-based line in the source note. */
  line: number;
  /** A PDF++ rectangular annotation: the image is rendered on demand from this page region. */
  crop?: PdfCropRequest;
};

/** A highlighted passage, with the image it wraps resolved for display. */
export type SectionContentHighlight = Omit<SectionHighlight, "figure"> & { figure?: SectionFigure };

/** Reading content shown under a section card. Presentation data only; never persisted. */
export type SectionContent = {
  highlights: SectionContentHighlight[];
  figures: SectionFigure[];
};

export type ExpandedSection = {
  id: string;
  /** Stable identity across edits: the heading path from the outline root (plus a duplicate index). */
  key: string;
  page: GraphPage;
  neighborhood: Neighborhood;
  level: number;
  parentId: string | null;
  childIds: string[];
  content: SectionContent;
};

type EvidenceTargetMap = Map<string, { target: GraphPage; evidence: RelationEvidence[] }>;

/** Physical body occurrence, retained even before its target has a published graph page. */
type LinkPlacement = {
  sectionId: string | null;
  line: number;
  rawLink: string;
  initialPath: string;
  file?: TFile | null;
};

export type SectionProjectionSource = {
  centerPage: GraphPage;
  centerEvidence: EvidenceTargetMap;
  sections: Array<{
    id: string;
    page: GraphPage;
    evidenceByTarget: EvidenceTargetMap;
    level: number;
    parentId: string | null;
    childIds: string[];
    content: SectionContent;
    key: string;
    line: number;
  }>;
  linkPlacements: LinkPlacement[];
  /** One-file native frontmatter declarations keep their note-header occurrence during preview. */
  headerTargets: ReadonlySet<string>;
};

export type CentralSectionExpansion = {
  centerPath: string;
  centerNeighborhood: Neighborhood;
  sections: ExpandedSection[];
  explanations: Map<string, RelationshipExplanation>;
  projectionSource: SectionProjectionSource;
  /** Captured source identity for optional revision-scoped view anchors. No content is retained. */
  sourceRevision?: Readonly<{file: TFile; path: string; mtime: number; size: number; cache?: CachedMetadata | null}>;
  /** Physical placements of existing saved relationships, never editable evidence declarations. */
  previewPlacements?: readonly SectionPreviewPlacement[];
};

type HeadingRange = { id: string; heading: string; level: number; line: number; start: number; end: number; subpath: string; parentId: string | null };

type CacheLink = { link: string; displayText?: string; original?: string; position?: { start: { line: number; col: number; offset: number }; end: { line: number; col: number; offset: number } } };

/** Section expansion is intentionally a view-local operation: only the real Markdown center note
 * may be expanded. Keeping this predicate explicit prevents transient/global graph nodes from
 * accidentally becoming section-expansion roots later. */
export function canExpandCentralSections(page: GraphPage | null | undefined, centerPath: string): boolean {
  return Boolean(page && page.path === centerPath && !page.transient && page.file?.extension === "md");
}

const clonePage = (page: GraphPage, path = page.path): GraphPage => ({
  ...page,
  path,
  neighbours: new Map<string, Relation>(),
  aliases: [...page.aliases],
  tags: [...page.tags],
  styleTags: [...page.styleTags],
});

/** Find heading ranges in the original body, preserving newline widths for slicing/cache offsets. */
function scanHeadings(content: string): HeadingRange[] {
  // Keep CR in each physical line: dropping it shifts every subsequent slice in Windows notes.
  const lines = content.split("\n");
  const output: HeadingRange[] = [];
  let offset = 0;
  let fence: "`" | "~" | null = null;
  let inFrontmatter = lines[0]?.trim() === "---";
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (inFrontmatter) {
      if (i > 0 && (trimmed === "---" || trimmed === "...")) inFrontmatter = false;
      offset += line.length + 1;
      continue;
    }
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as "`" | "~";
      fence = fence === marker ? null : (fence ?? marker);
      offset += line.length + 1;
      continue;
    }
    if (!fence) {
      const match = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (match) {
        const heading = match[2].trim();
        const id = `section:${i + 1}:${output.length}`;
        output.push({ id, heading, level: match[1].length, line: i + 1, start: offset, end: content.length, subpath: `#${heading}`, parentId: null });
      }
    }
    offset += line.length + 1;
  }
  for (let i = 0; i < output.length - 1; i += 1) output[i].end = output[i + 1].start;

  // Heading hierarchy is runtime view state only. The nearest preceding heading with a lower
  // Markdown heading level is the structural parent. Skipped levels are valid Markdown and are
  // intentionally attached to that nearest ancestor instead of synthesizing phantom sections.
  const stack: HeadingRange[] = [];
  for (const heading of output) {
    while (stack.length && stack[stack.length - 1].level >= heading.level) stack.pop();
    heading.parentId = stack[stack.length - 1]?.id ?? null;
    stack.push(heading);
  }
  return output;
}

function ontologyRole(plugin: KplexPlugin, name: string): EvidenceRole | null {
  const normalized = normalizeFieldName(name);
  const h = ontologyConfiguration(plugin.settings).hierarchy;
  const includes = (values: readonly string[]) => values.some((value) => normalizeFieldName(value) === normalized);
  if (includes(h.hidden)) return "hidden";
  if (includes(h.parents)) return "parent";
  if (includes(h.children)) return "child";
  if (includes(h.leftFriends)) return "left";
  if (includes(h.rightFriends)) return "right";
  if (includes(h.previous)) return "previous";
  if (includes(h.next)) return "next";
  return null;
}

function inferredRole(plugin: KplexPlugin): Exclude<EvidenceRole, "hidden"> {
  if (plugin.settings.inferAllLinksAsFriends) return "left";
  return plugin.settings.inverseInfer ? "parent" : "child";
}

function evidence(
  id: string,
  sourcePath: string,
  targetPath: string,
  role: EvidenceRole,
  relationType: RelationType,
  sourceKind: RelationEvidence["sourceKind"],
  declaredByPath: string,
  extra: Partial<RelationEvidence> = {},
): RelationEvidence {
  return {
    id, sourcePath, targetPath, role, relationType,
    direction: LinkDirection.FROM,
    declaredByPath, declaredTargetPath: extra.declaredTargetPath ?? targetPath,
    declaredRole: extra.declaredRole ?? role,
    sourceKind,
    definition: extra.definition,
    fieldName: extra.fieldName,
    rawValue: extra.rawValue,
    line: extra.line,
    start: extra.start,
    end: extra.end,
  };
}

/** Resolve native file identity without requiring that progressive graph publication reached it. */
function linkDestination(app: App, raw: string, hostPath: string): { path: string; file: TFile | null } {
  let candidate = raw.trim();
  try { candidate = decodeURIComponent(candidate); } catch { /* raw is still useful */ }
  const hash = candidate.indexOf("#");
  if (hash >= 0) candidate = candidate.slice(0, hash);
  const file = app.metadataCache.getFirstLinkpathDest(candidate, hostPath);
  return { path: file?.path ?? candidate, file };
}

function roleDefinition(relation: Relation, role: Exclude<Role, "sibling">): string | undefined {
  switch (role) {
    case "parent": return relation.parentTypeDefinition;
    case "child": return relation.childTypeDefinition;
    case "left": return relation.leftFriendTypeDefinition;
    case "right": return relation.rightFriendTypeDefinition;
    case "previous": return relation.previousFriendTypeDefinition;
    case "next": return relation.nextFriendTypeDefinition;
  }
}

function resolveNeighbourhood(
  plugin: KplexPlugin,
  index: GraphIndex,
  center: GraphPage,
  evidenceByTarget: Map<string, { target: GraphPage; evidence: RelationEvidence[] }>,
  inferAllLinksAsFriends = plugin.settings.inferAllLinksAsFriends,
): Neighborhood {
  const buckets: Record<Exclude<Role, "sibling">, Neighbour[]> = { parent: [], child: [], left: [], right: [], previous: [], next: [] };
  const max = plugin.settings.maxItemCount;
  for (const { target, evidence: items } of evidenceByTarget.values()) {
    const relation: Relation = { ...emptyRelation(), target };
    applyEvidenceDecisionsToRelation(relation, applyOntologyPrecedence(items));
    if (relation.isHidden || !index.isVisiblePage(target)) continue;
    center.neighbours.set(target.path, relation);
    for (const role of ["parent", "child", "left", "right", "previous", "next"] as const) {
      const relationType = classifyRelation(relation, role, inferAllLinksAsFriends);
      if (!relationType || (relationType === RelationType.INFERRED && !plugin.settings.showInferredNodes)) continue;
      buckets[role].push({ page: target, relationType, typeDefinition: roleDefinition(relation, role), linkDirection: relation.direction, role });
    }
  }
  const sort = (items: Neighbour[]) => index.sortNeighbours(items).slice(0, max);
  return {
    center,
    parents: sort(buckets.parent),
    children: sort(buckets.child),
    leftFriends: sort([...buckets.left, ...buckets.previous]),
    rightFriends: sort([...buckets.right, ...buckets.next]),
    siblings: [],
  };
}

function addEvidence(map: Map<string, { target: GraphPage; evidence: RelationEvidence[] }>, target: GraphPage, item: RelationEvidence): void {
  const current = map.get(target.path) ?? { target, evidence: [] };
  current.evidence.push(item);
  map.set(target.path, current);
}

/** Reuse one transient target per section bucket even when many occurrences share that target. */
function sectionTarget(page: GraphPage, sectionId: string, bucket?: EvidenceTargetMap): GraphPage {
  const path = `kplex-section-target:${sectionId}:${page.path}`;
  const retained = bucket?.get(path)?.target;
  if (retained) return retained;
  const clone = clonePage(page, path);
  clone.transient = { kind: "section-target", sourcePath: page.path, actualPath: page.path, sectionId };
  return clone;
}

/** Keys that survive edits elsewhere in the note: parent key + heading text (+ #n for repeats). */
function stableSectionKeys(headings: HeadingRange[]): Map<string, string> {
  const keys = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const heading of headings) {
    const parentKey = heading.parentId ? keys.get(heading.parentId) ?? "" : "";
    const base = `${parentKey}\u0000${heading.heading}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    keys.set(heading.id, count ? `${base}#${count}` : base);
  }
  return keys;
}

function resolveSectionFigure(app: App, sourcePath: string, figure: SectionFigureRef, line: number): SectionFigure | null {
  if (figure.external) return { src: figure.target, path: null, caption: figure.caption, alt: figure.alt, line };
  let target = figure.target;
  try { target = decodeURIComponent(target); } catch { target = figure.target; }
  const file = app.metadataCache.getFirstLinkpathDest(target, sourcePath);
  if (!file) return null;
  if (figure.pdf) {
    // The image is a region of the PDF page; rendering happens lazily in the view.
    return { src: "", path: file.path, caption: figure.caption, alt: figure.alt, line,
      crop: { path: file.path, mtime: file.stat.mtime, region: figure.pdf } };
  }
  return { src: app.vault.getResourcePath(file), path: file.path, caption: figure.caption, alt: figure.alt, line };
}

function resolveSectionContent(app: App, sourcePath: string, sectionText: string, lineOffset: number, footnotes: ReadonlyMap<string, string>): SectionContent {
  const raw = extractSectionContent(sectionText, footnotes);
  const figures: SectionFigure[] = [];
  for (const figure of raw.figures) {
    const resolved = resolveSectionFigure(app, sourcePath, figure, lineOffset + figure.line);
    if (resolved) figures.push(resolved);
  }
  const highlights: SectionContentHighlight[] = [];
  for (const { figure, ...item } of raw.highlights) {
    const line = lineOffset + item.line;
    const resolved = figure ? resolveSectionFigure(app, sourcePath, figure, lineOffset + figure.line) : null;
    // An image-only highlight whose image is missing has nothing left to show.
    if (!resolved && !item.text) continue;
    highlights.push({ ...item, line, ...(resolved ? { figure: resolved } : {}) });
  }
  return { highlights, figures };
}

function sourceLinks(cache: CachedMetadata | null): CacheLink[] {
  return cache?.links ?? [];
}

/**
 * Expand exactly one Markdown center note into transient heading nodes. No section is added to the
 * persistent GraphIndex; the file body is parsed on demand and discarded when the view collapses.
 */
export async function buildCentralSectionExpansion(
  plugin: KplexPlugin,
  index: GraphIndex,
  centerPage: GraphPage,
  shouldContinue: () => boolean = () => true,
): Promise<CentralSectionExpansion | null> {
  const file = centerPage.file;
  if (!file || file.extension !== "md") return null;
  const sourceRevision = file.stat ? {file, path: file.path, mtime: file.stat.mtime, size: file.stat.size} : undefined;
  const content = await plugin.app.vault.cachedRead(file);
  if (!shouldContinue()) return null;
  const headings = scanHeadings(content);
  if (!headings.length) return null;
  const firstHeadingLine = headings[0].line;
  const footnotes = collectFootnotes(content);
  const sectionKeys = stableSectionKeys(headings);
  const cache = plugin.app.metadataCache.getFileCache(file);
  const headerTargets = new Set<string>();
  for (const [name, value] of Object.entries(cache?.frontmatter ?? {})) {
    if (ontologyRole(plugin, name)) for (const path of extractLinksFromValue(plugin.app, value, file)) headerTargets.add(path);
  }
  const links = sourceLinks(cache);
  const preambleTargets = new Set<string>();
  const linksBySection = new Map<string, CacheLink[]>();
  const headingForLine = (line: number): HeadingRange | null => {
    let low = 0;
    let high = headings.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (headings[mid].line <= line) low = mid + 1;
      else high = mid;
    }
    return low > 0 ? headings[low - 1] : null;
  };
  const linkPlacements: LinkPlacement[] = [];
  // Capture and initial section construction share native resolution, including repeated links.
  const linkDestinations = new Map<string, ReturnType<typeof linkDestination>>();

  // Assign cached links to heading ranges once. The previous per-heading full link scan made an
  // expanded document with H headings and L links do O(H x L) projection work.
  for (const link of links) {
    const line = (link.position?.start.line ?? Number.MAX_SAFE_INTEGER) + 1;
    let destination = linkDestinations.get(link.link);
    if (!destination) {
      destination = linkDestination(plugin.app, link.link, file.path);
      linkDestinations.set(link.link, destination);
    }

    if (line < firstHeadingLine) {
      preambleTargets.add(destination.path);
      linkPlacements.push({
        sectionId: null,
        line,
        rawLink: link.link,
        initialPath: destination.path,
        file: destination.file,
      });
      continue;
    }
    const heading = headingForLine(line);
    if (!heading) continue;
    const offset = link.position?.start.offset;
    if (typeof offset === "number" && offset >= heading.end) continue;
    const bucket = linksBySection.get(heading.id) ?? [];
    bucket.push(link);
    linksBySection.set(heading.id, bucket);
    linkPlacements.push({
      sectionId: heading.id,
      line,
      rawLink: link.link,
      initialPath: destination.path,
      file: destination.file,
    });
  }

  // Preserve inbound/structural/frontmatter evidence on the real center, but move outgoing body
  // evidence under headings to the appropriate transient section.
  const centerEvidence = new Map<string, { target: GraphPage; evidence: RelationEvidence[] }>();
  const propertyUrlsBySection = new Map<string, Array<{ target: GraphPage; evidence: RelationEvidence }>>();
  for (const entry of index.evidenceFrom(centerPage.path)) {
    const target = index.get(entry.targetPath);
    if (!target) continue;
    // Reuse compiled physical inline URL provenance; frontmatter URLs stay on the real center.
    // Bucket once so dense expanded notes do not scan every property for each heading.
    for (const item of entry.evidence) {
      if (item.sourceKind !== "property-url" || item.declaredByPath !== centerPage.path || typeof item.line !== "number") continue;
      const heading = headingForLine(item.line);
      if (!heading) continue;
      const bucket = propertyUrlsBySection.get(heading.id) ?? [];
      bucket.push({ target, evidence: item }); propertyUrlsBySection.set(heading.id, bucket);
    }
    const kept = entry.evidence.filter((item) => {
      if (item.declaredByPath !== centerPage.path) return true;
      if (item.sourceKind === "frontmatter-ontology" || item.sourceKind === "date-property" || item.sourceKind === "file-tree" || item.sourceKind === "tag-tree") return true;
      if (item.sourceKind === "property-url") return typeof item.line !== "number" || item.line < firstHeadingLine;
      if (item.sourceKind === "inline-ontology" || item.sourceKind === "body-url") return (item.line ?? Number.MAX_SAFE_INTEGER) < firstHeadingLine;
      if (item.sourceKind === "obsidian-link" || item.sourceKind === "unresolved-link") return preambleTargets.has(item.declaredTargetPath);
      return true;
    });
    for (const item of kept) addEvidence(centerEvidence, target, item);
  }

  const center = clonePage(centerPage);
  const centerNeighborhood = resolveNeighbourhood(plugin, index, center, centerEvidence);
  // Siblings are derived structurally from the center's parents rather than direct pair evidence.
  // Preserve the persistent index result while section expansion only redistributes direct body evidence.
  centerNeighborhood.siblings = index.getNeighborhood(centerPage.path)?.siblings ?? [];
  const sections: ExpandedSection[] = [];
  const projectionSections: SectionProjectionSource["sections"] = [];
  const explanations = new Map<string, RelationshipExplanation>();
  for (const { target, evidence: items } of centerEvidence.values()) {
    if (!center.neighbours.has(target.path)) continue;
    explanations.set(`${center.path}\u0000${target.path}`, explainResolvedRelationship(center, target, items, plugin.settings.inferAllLinksAsFriends));
  }

  for (const heading of headings) {
    const sectionPath = `kplex-section:${centerPage.path}:${heading.id}`;
    const sectionPage = clonePage(centerPage, sectionPath);
    sectionPage.name = heading.heading;
    sectionPage.aliases = [];
    sectionPage.noteType = null;
    sectionPage.primaryStyleTag = null;
    sectionPage.styleTags = [];
    sectionPage.transient = {
      kind: "section", sourcePath: centerPage.path, sectionId: heading.id, heading: heading.heading, level: heading.level,
      subpath: heading.subpath, line: heading.line, start: heading.start, end: heading.end,
    };
    const sectionText = content.slice(heading.start, heading.end);
    let parsed: ParsedBodyMetadata;
    try {
      parsed = await parseBodyMetadataCooperative(sectionText, shouldContinue);
    } catch (error) {
      if (!shouldContinue()) return null;
      throw error;
    }
    const byTarget = new Map<string, { target: GraphPage; evidence: RelationEvidence[] }>();
    let counter = 0;
    for (const item of propertyUrlsBySection.get(heading.id) ?? []) {
      const target = sectionTarget(item.target, heading.id, byTarget);
      addEvidence(byTarget, target, { ...item.evidence, sourcePath: sectionPath, targetPath: target.path });
    }

    // Ordinary body wikilinks/Markdown links are still inferred evidence, even when the same text
    // also participates in a Dataview ontology field.
    for (const link of linksBySection.get(heading.id) ?? []) {
      const line = (link.position?.start.line ?? -1) + 1;
      const destination = linkDestinations.get(link.link);
      if (!destination) continue;
      const actual = index.get(destination.path);
      if (!actual) continue;
      const target = sectionTarget(actual, heading.id, byTarget);
      const role = inferredRole(plugin);
      addEvidence(byTarget, target, evidence(`section-${heading.id}-link-${counter++}`, sectionPath, target.path, role, RelationType.INFERRED, "obsidian-link", centerPage.path, {
        declaredTargetPath: actual.path, declaredRole: role, line,
      }));
    }

    for (const occurrence of parsed.inlineFieldOccurrences) {
      const role = ontologyRole(plugin, occurrence.name);
      if (!role) continue;
      for (const actualPath of extractLinksFromValue(plugin.app, occurrence.value, file)) {
        const actual = index.get(actualPath);
        if (!actual) continue;
        const target = sectionTarget(actual, heading.id, byTarget);
        addEvidence(byTarget, target, evidence(`section-${heading.id}-ontology-${counter++}`, sectionPath, target.path, role, RelationType.DEFINED, "inline-ontology", centerPage.path, {
          declaredTargetPath: actual.path,
          declaredRole: role,
          definition: normalizeFieldName(occurrence.name), fieldName: occurrence.name, rawValue: occurrence.value,
          line: heading.line + occurrence.line - 1, start: heading.start + occurrence.start, end: heading.start + occurrence.end,
        }));
      }
    }

    for (const reference of parsed.urls) {
      const actual = index.get(canonicalWebUrl(reference.url));
      if (!actual) continue;
      const target = sectionTarget(actual, heading.id, byTarget);
      const role = inferredRole(plugin);
      addEvidence(byTarget, target, evidence(`section-${heading.id}-url-${counter++}`, sectionPath, target.path, role, RelationType.INFERRED, "body-url", centerPage.path, {
        declaredTargetPath: actual.path, declaredRole: role, line: heading.line + (reference.line ?? 1) - 1,
      }));
    }

    const neighborhood = resolveNeighbourhood(plugin, index, sectionPage, byTarget);
    for (const { target, evidence: items } of byTarget.values()) {
      if (!sectionPage.neighbours.has(target.path)) continue;
      explanations.set(`${sectionPage.path}\u0000${target.path}`, explainResolvedRelationship(sectionPage, target, items, plugin.settings.inferAllLinksAsFriends));
    }
    // heading.line is 1-based; content lines are 0-based for editor navigation.
    const sectionContent = resolveSectionContent(plugin.app, file.path, sectionText, heading.line - 1, footnotes);
    const key = sectionKeys.get(heading.id) ?? heading.id;
    sections.push({ id: heading.id, key, page: sectionPage, neighborhood, level: heading.level, parentId: heading.parentId, childIds: [], content: sectionContent });
    projectionSections.push({
      id: heading.id, key, page: sectionPage, evidenceByTarget: byTarget, level: heading.level,
      parentId: heading.parentId, childIds: [], content: sectionContent, line: heading.line,
    });
  }

  const byId = new Map(sections.map((section) => [section.id, section] as const));
  const projectionById = new Map(projectionSections.map((section) => [section.id, section] as const));
  for (const section of sections) {
    if (section.parentId) {
      byId.get(section.parentId)?.childIds.push(section.id);
      projectionById.get(section.parentId)?.childIds.push(section.id);
    }
  }

  // Section headings themselves remain transient defined children in the compatibility
  // neighborhood. The renderer uses parentId/childIds to display the actual outline tree; keeping
  // these entries here preserves the existing section-expansion contract for non-layout callers.
  for (const section of sections) {
    centerNeighborhood.children.push({ page: section.page, role: "child", relationType: RelationType.DEFINED, typeDefinition: "section", linkDirection: LinkDirection.FROM });
    explanations.set(`${center.path}\u0000${section.page.path}`, {
      sourcePath: center.path,
      targetPath: section.page.path,
      resolvedRoles: [{ role: "child", relationType: RelationType.DEFINED }],
      hidden: false,
      summary: "transient-section",
      decisions: [],
    });
  }

  return {
    centerPath: centerPage.path, centerNeighborhood, sections, explanations, sourceRevision: sourceRevision && {...sourceRevision, cache},
    projectionSource: {
      centerPage, centerEvidence, sections: projectionSections,
      linkPlacements,
      headerTargets,
    },
  };
}

/**
 * Resolves the nearest preceding section heading for a 1-based physical line number using binary search.
 * Returns null when the line falls in the preamble before the first heading.
 *
 * @param ordered Headings sorted ascending by physical start line.
 * @param line 1-based line number in the declaring file.
 */
function sectionForLine(
  ordered: SectionProjectionSource["sections"],
  line: number,
): SectionProjectionSource["sections"][number] | null {
  let low = 0;
  let high = ordered.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (ordered[mid].line <= line) low = mid + 1;
    else high = mid;
  }
  return low > 0 ? ordered[low - 1] : null;
}

/**
 * Rebinds persistent index evidence and active relationship roles to cached heading and preamble
 * placements without rereading Markdown from disk.
 *
 * Ordinary body links and unresolved links lack physical line numbers in index declarations, so
 * their heading assignment is established from cached link locations while their live evidence, roles,
 * precedence, multiplicity and target rebinding are derived from the current GraphIndex.
 *
 * @param plugin Native link resolution for rebinding previously unresolved lexical targets.
 * @param index The authoritative persistent GraphIndex.
 * @param source Cached section projection source captured when the center was expanded.
 * @returns Re-projected center and section evidence maps ready for neighborhood evaluation.
 */
function currentSectionEvidence(
  plugin: KplexPlugin,
  index: GraphIndex,
  source: SectionProjectionSource,
): Readonly<{
  center: EvidenceTargetMap; sections: ReadonlyMap<string, EvidenceTargetMap>; indexedTargets: ReadonlySet<string>;
}> {
  const center: EvidenceTargetMap = new Map();
  const sections = new Map<string, EvidenceTargetMap>(source.sections.map(/** Allocate one current evidence bucket per cached physical heading. */
    (section) => [section.id, new Map()]));
  // buildCentralSectionExpansion retains physical heading order; do not sort it on every update.
  const orderedSections = source.sections;
  const sectionById = new Map(source.sections.map(/** Resolve cached occurrences without scanning headings. */
    (section) => [section.id, section] as const));

  const placementsByFile = new Map<TFile, LinkPlacement[]>();
  const placementsByPath = new Map<string, LinkPlacement[]>();
  const currentPaths = new Map<string, string>();
  const indexedTargets = new Set<string>();

  for (const placement of source.linkPlacements) {
    if (placement.file) {
      const bucket = placementsByFile.get(placement.file) ?? [];
      bucket.push(placement);
      placementsByFile.set(placement.file, bucket);
    }
    let currentPath = currentPaths.get(placement.rawLink);
    if (currentPath === undefined) {
      currentPath = linkDestination(plugin.app, placement.rawLink, source.centerPage.file?.path ?? source.centerPage.path).path;
      currentPaths.set(placement.rawLink, currentPath);
    }
    // A resolved link can become an unresolved link whose path equals its raw spelling. Aliases
    // are lookup keys, not additional occurrences; append each placement once per distinct key.
    for (const path of new Set([placement.initialPath, currentPath])) {
      const bucket = placementsByPath.get(path) ?? [];
      bucket.push(placement);
      placementsByPath.set(path, bucket);
    }
  }

  for (const entry of index.evidenceFrom(source.centerPage.path)) {
    if (entry.evidence.length) indexedTargets.add(entry.targetPath);
    const actual = index.get(entry.targetPath);
    if (!actual) continue;

    for (const item of entry.evidence) {
      // 1. Inbound evidence: declared by another note targeting center.
      // Retain on center so note edits in another note update center neighborhood immediately.
      if (item.declaredByPath !== source.centerPage.path) {
        addEvidence(center, actual, item);
        continue;
      }

      // 2. Frontmatter and structural hierarchy belong to center.
      if (
        item.sourceKind === "frontmatter-ontology" ||
        item.sourceKind === "date-property" ||
        item.sourceKind === "file-tree" ||
        item.sourceKind === "tag-tree"
      ) {
        addEvidence(center, actual, item);
        continue;
      }

      // 3. Body items with explicit line numbers (inline-ontology, body-url, property-url).
      if (typeof item.line === "number") {
        const section = sectionForLine(orderedSections, item.line);
        if (!section) {
          addEvidence(center, actual, item);
        } else {
          const target = sectionTarget(actual, section.id, sections.get(section.id));
          const projected: RelationEvidence = {
            ...item,
            sourcePath: section.page.path,
            targetPath: target.path,
          };
          addEvidence(sections.get(section.id)!, target, projected);
        }
        continue;
      }

      // 4. Ordinary links and unresolved links without line numbers.
      // Rebind to cached heading placement or preamble, retaining active evidence and roles from index.
      if (item.sourceKind === "obsidian-link" || item.sourceKind === "unresolved-link") {
        const placements = (actual.file ? placementsByFile.get(actual.file) : undefined)
          ?? placementsByPath.get(actual.path)
          ?? placementsByPath.get(entry.targetPath)
          ?? placementsByPath.get(item.declaredTargetPath);

        if (placements && placements.length > 0) {
          for (const placement of placements) {
            if (!placement.sectionId) {
              addEvidence(center, actual, { ...item, line: placement.line });
            } else {
              const section = sectionById.get(placement.sectionId);
              const sectionMap = sections.get(placement.sectionId);
              if (section && sectionMap) {
                const target = sectionTarget(actual, placement.sectionId, sectionMap);
                const projected: RelationEvidence = {
                  ...item,
                  sourcePath: section.page.path,
                  targetPath: target.path,
                  line: placement.line,
                };
                addEvidence(sectionMap, target, projected);
              }
            }
          }
        } else {
          addEvidence(center, actual, item);
        }
        continue;
      }

      addEvidence(center, actual, item);
    }
  }

  return { center, sections, indexedTargets };
}

/** Recompute only the visible section projection from cached evidence. No Markdown is read or parsed. */
export function projectCentralSectionExpansion(
  plugin: KplexPlugin,
  index: GraphIndex,
  expansion: CentralSectionExpansion,
): CentralSectionExpansion {
  const source = expansion.projectionSource;
  const currentEvidence = currentSectionEvidence(plugin, index, source);
  const currentCenter = index.get(source.centerPage.path) ?? source.centerPage;
  const inferAllLinksAsFriends = index.publishedInferAllLinksAsFriends(source.centerPage.path);
  const center = clonePage(currentCenter);
  const centerNeighborhood = resolveNeighbourhood(plugin, index, center, currentEvidence.center, inferAllLinksAsFriends);
  // Siblings are structurally derived from the center's *currently visible* parents. Recompute
  // them from the persistent graph on every presentation projection so showing/hiding folder/tag
  // parents (or toggling sibling rendering) can both add and remove eligible siblings without
  // rereading Markdown or rebuilding section evidence.
  centerNeighborhood.siblings = index.getNeighborhood(source.centerPage.path)?.siblings ?? [];
  const explanations = new Map<string, RelationshipExplanation>();
  for (const { target, evidence: items } of currentEvidence.center.values()) {
    if (!center.neighbours.has(target.path)) continue;
    explanations.set(`${center.path}\u0000${target.path}`, explainResolvedRelationship(center, target, items, inferAllLinksAsFriends));
  }

  const sections: ExpandedSection[] = source.sections.map((raw) => {
    const page = clonePage(raw.page, raw.page.path);
    const evidenceByTarget = currentEvidence.sections.get(raw.id) ?? new Map<string, { target: GraphPage; evidence: RelationEvidence[] }>();
    const neighborhood = resolveNeighbourhood(plugin, index, page, evidenceByTarget, inferAllLinksAsFriends);
    for (const { target, evidence: items } of evidenceByTarget.values()) {
      if (!page.neighbours.has(target.path)) continue;
      explanations.set(`${page.path}\u0000${target.path}`, explainResolvedRelationship(page, target, items, inferAllLinksAsFriends));
    }
    return {
      id: raw.id, key: raw.key, page, neighborhood, level: raw.level, parentId: raw.parentId, childIds: [...raw.childIds], content: raw.content,
    };
  });

  const previewPlacements = projectSectionPreview(plugin, index, expansion, centerNeighborhood, sections, currentEvidence.indexedTargets);

  for (const section of sections) {
    centerNeighborhood.children.push({
      page: section.page, role: "child", relationType: RelationType.DEFINED,
      typeDefinition: "section", linkDirection: LinkDirection.FROM,
    });
    explanations.set(`${center.path}\u0000${section.page.path}`, {
      sourcePath: center.path, targetPath: section.page.path,
      resolvedRoles: [{ role: "child", relationType: RelationType.DEFINED }], hidden: false,
      summary: "transient-section",
      decisions: [],
    });
  }

  return { centerPath: expansion.centerPath, centerNeighborhood, sections, explanations, projectionSource: source, sourceRevision: expansion.sourceRevision, previewPlacements };
}
