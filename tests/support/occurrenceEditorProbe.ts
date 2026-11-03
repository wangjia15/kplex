/** Native M0 consumer only; never imported by production registration. Legacy probe remains unchanged. */
import type {PlexViewDefinition} from "../../src/core/plex/views/contracts";
import {nodeId} from "../../src/core/graph/model";
import {createProbeViewDefinition} from "./plexViewProbe";

export function createOccurrenceEditorProbe(paths: {root: string; repeated: string; next: string}): PlexViewDefinition {
  const legacy = createProbeViewDefinition(paths);
  return {...legacy, id: "test.occurrence", labelKey: "Occurrence editor probe", editorHosting: "occurrence", navigation: "rooted",
    defaultState: {hideRepeated: false, reflowOffset: 0},
    restoreState(value) {
      const offset: unknown = value && typeof value === "object" ? Reflect.get(value, "reflowOffset") : 0;
      return {hideRepeated: Boolean(value && typeof value === "object" && Reflect.get(value, "hideRepeated") === true),
        reflowOffset: typeof offset === "number" && Number.isFinite(offset) && Math.abs(offset) <= 100 ? offset : 0};
    },
    project(input) {
      const projection = legacy.project(input), next = input.read.node(nodeId(paths.next));
      if (!projection || !next) return null;
      const hide = Boolean(input.state && typeof input.state === "object" && Reflect.get(input.state, "hideRepeated") === true);
      const occurrences = [...projection.occurrences.filter(row => !hide || row.nodeId !== paths.repeated),
        {id: "target-C", nodeId: next.id, areaId: "harbor", representation: "thought" as const}];
      const ids = new Set(occurrences.map(row => row.id));
      return {...projection, editor: undefined, frame: "layout-root", occurrences,
        edges: projection.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target))};
    },
    layout(projection, measurements, state, legacyEditor, context) {
      if (legacyEditor) throw new Error("Occurrence editor dimensions cannot use the legacy scene boolean");
      const expanded = measurements.find(row => row.id === "repeat-above");
      const offset = state && typeof state === "object" ? Number(Reflect.get(state, "reflowOffset") ?? 0) : 0;
      const width = Math.max(260, (expanded?.width ?? 220) + 40), contentTop = -230;
      const height = Math.max(200, context?.areaHeights.groveHeight ?? (expanded?.height ?? 140) + 90);
      const points: Record<string, {x: number; y: number}> = {"look-here": {x: 190, y: 70}, "layout-root": {x: -180, y: 40},
        "repeat-above": {x: -30 + offset + width / 2, y: contentTop + 42 + (expanded?.height ?? 140) / 2},
        "repeat-below": {x: 260, y: Math.max(180, contentTop + 102 + (expanded?.height ?? 140))}, "target-C": {x: -120, y: 300}};
      return {positions: new Map(measurements.map(row => [row.id, {...points[row.id], width: row.width, height: row.height}])), areas: [
        {id: "harbor", labelKey: "Harbor", bounds: {x: 100, y: 0, width: 300, height: 440}},
        {id: "ridge", labelKey: "Ridge", bounds: {x: -300, y: -40, width: 260, height: 240}},
        {id: "grove", labelKey: "Grove", bounds: {x: -30 + offset, y: -250, width, height},
          viewport: {x: -30 + offset, y: contentTop, width, height: height - 40, contentTop, contentHeight: (expanded?.height ?? 140) + 500, initialScrollTop: 0},
          reflow: {columns: 1, rowGap: 10, columnGap: 12}},
      ]};
    },
  };
}
