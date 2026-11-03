/** Deterministic measured Wu Xing packing. Five collision-free phase regions surround a ring; bounded native scrollers contain dense lists and unclassified notes remain outside the cycle. */
import type {PlexProjection, PlexMeasurement, PlexViewLayout, PlexArea, PlexDecoration, ViewRect, OccurrenceId} from "../contracts";
import type {WuXingConfiguration} from "./configuration";
import {WUXING_PHASES} from "./configuration";

/** Pack one measured column. The first attention/editor row stays visible; the shared scroller owns subsequent overflow and filtering. */
function packArea(id: string, bounds: ViewRect, projection: PlexProjection, measurements: ReadonlyMap<OccurrenceId, PlexMeasurement>,
  positions: Map<OccurrenceId, ViewRect>, labelKey: string, label?: string): PlexArea {
  let y = bounds.y + 84;
  const attention = projection.occurrences.find(row => row.id === projection.entry && row.groupingPartition === id);
  const attentionSize = attention && measurements.get(attention.id);
  if (attention && attentionSize) {
    // Keep the attention/editor outside the scroller, at its phase occurrence. Scrolling dense neighbors must not detach the native overlay from its card or gates.
    positions.set(attention.id, {x: bounds.x + bounds.width / 2, y: y + attentionSize.height / 2, width: attentionSize.width, height: attentionSize.height});
    y += attentionSize.height + 18;
  }
  const viewportTop = attentionSize ? y : bounds.y + 44;
  if (attentionSize) y += 40;
  for (const row of projection.occurrences.filter(occurrence => occurrence.areaId === id)) {
    const size = measurements.get(row.id);
    if (!size) continue;
    positions.set(row.id, {x: bounds.x + bounds.width / 2, y: y + size.height / 2, width: size.width, height: size.height});
    y += size.height + 18;
  }
  const viewport = {x: bounds.x, y: viewportTop, width: bounds.width, height: bounds.y + bounds.height - viewportTop,
    contentTop: viewportTop, contentHeight: Math.max(bounds.y + bounds.height - viewportTop, y - viewportTop), initialScrollTop: 0};
  return {id, bounds, labelKey, label, viewport, reflow: {columns: 1, columnGap: 0, rowGap: 18, paddingTop: 40, paddingBottom: 18}};
}

/** Radius uses the largest region diagonal: adjacent rectangles cannot overlap even when an editor or large themed node changes the measured envelope. */
export function layoutWuXing(projection: PlexProjection, measured: readonly PlexMeasurement[], configuration: WuXingConfiguration): PlexViewLayout {
  const measurements = new Map(measured.map(size => [size.id, size]));
  const width = Math.max(configuration.regionWidth, ...measured.map(size => size.width + 40));
  const attentionHeight = measurements.get(projection.entry)?.height ?? 0;
  const height = Math.max(configuration.regionHeight, attentionHeight + 260, ...measured.map(size => size.height + 104));
  const radius = (Math.hypot(width, height) + configuration.spacing) / (2 * Math.sin(Math.PI / 5));
  const start = configuration.order.indexOf(configuration.start);
  const order = [...configuration.order.slice(start), ...configuration.order.slice(0, start)];
  const positions = new Map<OccurrenceId, ViewRect>(), areas: PlexArea[] = [], decorations: PlexDecoration[] = [], centers: {x: number; y: number}[] = [];
  for (let index = 0; index < order.length; index++) {
    const phase = order[index], angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
    const center = {x: Math.cos(angle) * radius, y: Math.sin(angle) * radius}; centers.push(center);
    const bounds = {x: center.x - width / 2, y: center.y - height / 2, width, height}, id = `wuxing.${phase}`;
    const labelKey = `wuxing.${phase}`, label = configuration.labels[phase].trim() || undefined;
    areas.push(packArea(id, bounds, projection, measurements, positions, labelKey, label));
    decorations.push({id, kind: "region", bounds, labelKey, label, areaId: id, count: true, ...(configuration.tints ? {tint: phase} : {})});
  }
  if (configuration.guides) for (let index = 0; index < centers.length; index++) {
    const source = centers[index], target = centers[(index + 1) % centers.length];
    // Stop at each region's enclosing circle. Guides stay beneath cards and carry no note endpoints.
    const length = Math.hypot(target.x - source.x, target.y - source.y), inset = Math.hypot(width, height) / 2;
    const dx = (target.x - source.x) / length, dy = (target.y - source.y) / length;
    decorations.push({id: `wuxing.guide.${index}`, kind: "guide", points: [
      {x: source.x + dx * inset, y: source.y + dy * inset}, {x: target.x - dx * inset, y: target.y - dy * inset},
    ]});
  }
  let top = -height / 2;
  for (const membership of ["unmapped", "conflicting", "unavailable"] as const) {
    const id = `wuxing.${membership}`;
    const members = projection.occurrences.filter(row => row.areaId === id || row.id === projection.entry && row.groupingPartition === id);
    const regionHeight = Math.max(160, Math.min(220, configuration.regionHeight), ...members.map(row => (measurements.get(row.id)?.height ?? 0) + (row.id === projection.entry ? 260 : 104)));
    const bounds = {x: radius + width / 2 + configuration.spacing, y: top, width, height: regionHeight};
    areas.push(packArea(id, bounds, projection, measurements, positions, `wuxing.${membership}`));
    decorations.push({id, kind: "region", bounds, labelKey: `wuxing.${membership}`, areaId: id, count: true});
    top += regionHeight + 20;
  }
  // Every admitted occurrence must have a known phase/status. Never substitute an origin position for invalid membership.
  if (positions.size !== measured.length || order.length !== WUXING_PHASES.length) throw new Error("Invalid Wu Xing layout membership");
  return {positions, areas, decorations};
}
