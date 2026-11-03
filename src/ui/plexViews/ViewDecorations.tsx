/** Input-transparent scene decoration renderer. It paints bounded policy geometry using host theme tokens; marks have no graph endpoints, hit targets, listeners or write actions. */
import type {PlexDecoration} from "../../core/plex/views/contracts";
import type {Translator} from "../../lang";
import {viewLabel, canvasViewText} from "./labels";
import type {PositionedNode} from "../../types";
import {colorValueCss} from "../../adapters/obsidian/colorPresentation";
import {useId} from "react";
import {areaContains, areaShapePath} from "../../core/contracts/areaGeometry";

/** Count admitted filtered rows, including offscreen overflow, without invoking node/relationship readers. Ungrouped fixed occurrences can sit inside a region without belonging to its scroll surface. */
export function viewDecorationCounts(decorations: readonly PlexDecoration[], nodes: readonly PositionedNode[], admitted: ReadonlySet<string>,
  areaRows: Readonly<Record<string, {nodes: readonly PositionedNode[]} | undefined>>): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const mark of decorations) {
    if (mark.kind !== "region" || !mark.areaId || !mark.count) continue;
    const rows = areaRows[mark.areaId]?.nodes ?? nodes.filter(node => node.areaId === mark.areaId);
    const fixed = nodes.filter(node => !node.areaId && areaContains(mark.bounds, node, mark.shape));
    counts.set(mark.areaId, [...rows, ...fixed].reduce((count, node) => count + (admitted.has(node.page.path) ? node.page.transient?.groupMembers?.length ?? 1 : 0), 0));
  }
  return counts;
}

/** Render local shown counts supplied by the shared visible-occurrence owner, including expanded group membership. */
export function ViewDecorations({decorations, counts, translate}: {decorations: readonly PlexDecoration[]; counts: ReadonlyMap<string, number>; translate: Translator}) {
  const prefix = useId();
  return <svg className="kplex-view-decorations" aria-hidden="true" focusable="false">
    {decorations.some(mark => mark.kind === "guide" && (mark.directed || mark.direction)) && <defs>
      <marker id={`${prefix}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--text-muted)" />
      </marker>
    </defs>}
    {decorations.map(/** Regions and guides are deliberately outside the interactive semantic edge renderer. */ (mark, index) => mark.kind === "guide"
      ? <g key={mark.id}>
        <polyline className={`kplex-view-guide${mark.variant ? ` is-${mark.variant}` : ""}${mark.stroke === "none" ? " is-no-line" : ""}`} points={mark.points.map(point => `${point.x},${point.y}`).join(" ")} fill="none"
          markerStart={mark.direction === "backward" || mark.direction === "both" ? `url(#${prefix}-arrow)` : undefined}
          markerEnd={mark.directed || mark.direction === "forward" || mark.direction === "both" ? `url(#${prefix}-arrow)` : undefined} />
        {mark.caption && <g className="kplex-view-guide-caption" aria-label={canvasViewText(mark.caption.label, translate)}>
          <defs><clipPath id={`${prefix}-caption-${index}`}><rect x={mark.caption.bounds.x + 6} y={mark.caption.bounds.y} width={Math.max(0, mark.caption.bounds.width - 12)} height={mark.caption.bounds.height} /></clipPath></defs>
          <rect x={mark.caption.bounds.x} y={mark.caption.bounds.y} width={mark.caption.bounds.width} height={mark.caption.bounds.height} rx="4" />
          <text x={mark.caption.bounds.x + mark.caption.bounds.width / 2} y={mark.caption.bounds.y + mark.caption.bounds.height / 2}
            clipPath={`url(#${prefix}-caption-${index})`} textAnchor="middle" dominantBaseline="central" style={{fontSize: mark.caption.fontSize}}>{canvasViewText(mark.caption.label, translate)}</text>
        </g>}
      </g>
      : <g key={mark.id} data-kplex-decoration={mark.id} className={`kplex-view-region${mark.tint ? ` is-${mark.tint}` : ""}`}>
        <defs><clipPath id={`${prefix}-${index}`}><rect x={mark.bounds.x + 12} y={mark.bounds.y + 4} width={Math.max(0, mark.bounds.width - 24)} height={mark.description ? 68 : 44} /></clipPath></defs>
        {mark.shape ? <path d={areaShapePath(mark.bounds, mark.shape)} fillRule="evenodd"
          style={mark.color ? {fill: colorValueCss(mark.color, "var(--background-secondary)"), stroke: colorValueCss(mark.color, "var(--background-modifier-border)")} : undefined} />
          : <rect x={mark.bounds.x} y={mark.bounds.y} width={mark.bounds.width} height={mark.bounds.height} rx="14"
            style={mark.color ? {fill: colorValueCss(mark.color, "var(--background-secondary)"), stroke: colorValueCss(mark.color, "var(--background-modifier-border)")} : undefined} />}
        <text clipPath={`url(#${prefix}-${index})`} x={mark.bounds.x + 16} y={mark.bounds.y + 25}>{mark.label ?? viewLabel(mark.labelKey, translate)}</text>
        {mark.description && <text clipPath={`url(#${prefix}-${index})`} className="kplex-view-region-description" x={mark.bounds.x + 16} y={mark.bounds.y + 44}>{canvasViewText(mark.description, translate)}</text>}
        {mark.count && <text className="kplex-view-region-count" x={mark.bounds.x + 16} y={mark.bounds.y + (mark.description ? 64 : 44)}>
          {translate("view.shownLocally", {count: counts.get(mark.areaId ?? "") ?? 0})}
        </text>}
      </g>)}
  </svg>;
}
