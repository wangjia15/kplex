/** Attached measured node decoration. The ThoughtNode owns movement/identity; the existing
 * ColorScope owns theme/palette context. This component has no action, focus or source reader. */
import {useLayoutEffect, useRef, useState} from "react";
import type {PositionedNode} from "../../types";
import {ColorSampleReader} from "../../adapters/obsidian/colorSample";
import {colorValueCss} from "../../adapters/obsidian/colorPresentation";
import {colorContrastRatio, compositeColor} from "../../core/plex/colorContrast";
import {NodeStatus} from "../features/NodeStatus";

/** Category chips follow the measured top-left attachment; status delegates to the same
 * below-card component as hierarchy references. Accessible copy belongs to the owning node. */
export function MeasuredNodeBadge({badge, colorRevision}: Readonly<{badge: NonNullable<PositionedNode["viewBadge"]>; colorRevision: number}>) {
  const element = useRef<HTMLSpanElement>(null), [foreground, setForeground] = useState<string | undefined>();
  const background = colorValueCss(badge.background, "var(--background-secondary)");
  useLayoutEffect(/** Sample only this bounded decoration after the shared color scope changes, never on pointer/camera movement. */ () => {
    const node = element.current, owner = node?.ownerDocument.defaultView;if (!node || !owner || badge.presentation === "status") return;
    const reader = new ColorSampleReader(node.ownerDocument);
    try {
      const base = reader.read(node, "var(--background-primary)"), surface = node.closest<HTMLElement>(".kplex-plex");
      const canvas = surface && reader.read(node, owner.getComputedStyle(surface).backgroundColor);
      const fill = reader.read(node, owner.getComputedStyle(node).backgroundColor);
      const backdrop = base && (canvas ? compositeColor(canvas, base) : base), displayed = fill && backdrop && compositeColor(fill, backdrop);
      const black = {red: 0, green: 0, blue: 0, alpha: 1}, white = {red: 255, green: 255, blue: 255, alpha: 1};
      const dark = displayed && colorContrastRatio(black, displayed), light = displayed && colorContrastRatio(white, displayed);
      setForeground(typeof dark === "number" && typeof light === "number" ? dark >= light ? "#000000" : "#ffffff" : undefined);
    } finally {reader.dispose();}
  }, [background, colorRevision, badge.presentation]);
  if (badge.presentation === "status") return <NodeStatus label={badge.label} description={badge.description} />;
  return <span ref={element} className="kplex-node-badge" aria-hidden="true" style={{left: 0, top: -badge.height - 12,
    width: badge.width, height: badge.height, fontSize: badge.fontSize, background, color: foreground}}><span>{badge.label}</span></span>;
}
