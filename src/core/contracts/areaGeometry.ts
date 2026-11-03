/** Shared optional physical area geometry. Layout declares a bounded rounded band; every host
 * uses the same containment and path for hit targets, counts, decorations and highlights.
 * Plain rectangular consumers retain their established inclusive rectangular behavior. */
export type AreaRect = Readonly<{x: number; y: number; width: number; height: number}>;
export type AreaPoint = Readonly<{x: number; y: number}>;
export type AreaBandShape = Readonly<{kind: "rounded-band"; inner: AreaRect; radius: number}>;

/** Shapes must have one strictly enclosed finite hole; malformed extension output is rejected. */
export function validAreaShape(bounds: AreaRect, shape: AreaBandShape): boolean {
  if (!shape || shape.kind !== "rounded-band" || !shape.inner || !Number.isFinite(shape.radius) || shape.radius < 0) return false;
  const inner = shape.inner;
  return [bounds, inner].every(/** Geometry never accepts empty or nonfinite rectangles. */ rect => Object.values(rect).every(Number.isFinite) && rect.width > 0 && rect.height > 0)
    && inner.x > bounds.x && inner.y > bounds.y && inner.x + inner.width < bounds.x + bounds.width && inner.y + inner.height < bounds.y + bounds.height
    && shape.radius <= Math.min(bounds.width, bounds.height, inner.width, inner.height) / 2;
}

/** Inclusive rounded-rectangle occupancy includes the straight edges and true corner arcs. */
function roundedContains(rect: AreaRect, point: AreaPoint, radius = 0): boolean {
  if (point.x < rect.x || point.x > rect.x + rect.width || point.y < rect.y || point.y > rect.y + rect.height) return false;
  const x = Math.max(rect.x + radius, Math.min(rect.x + rect.width - radius, point.x));
  const y = Math.max(rect.y + radius, Math.min(rect.y + rect.height - radius, point.y));
  return Math.hypot(point.x - x, point.y - y) <= radius;
}

/** An inner category or the focus never belongs to an enclosing band's physical target. */
export function areaContains(bounds: AreaRect, point: AreaPoint, shape?: AreaBandShape): boolean {
  return roundedContains(bounds, point, shape?.radius) && (!shape || !roundedContains(shape.inner, point, shape.radius));
}

/** A fixed finite SVG path paints exactly the same rounded boundary used by hit testing. */
function roundedPath(rect: AreaRect, radius: number): string {
  const {x, y, width, height} = rect, right = x + width, bottom = y + height;
  return `M ${x + radius} ${y} H ${right - radius} A ${radius} ${radius} 0 0 1 ${right} ${y + radius} V ${bottom - radius} A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom} H ${x + radius} A ${radius} ${radius} 0 0 1 ${x} ${bottom - radius} V ${y + radius} A ${radius} ${radius} 0 0 1 ${x + radius} ${y} Z`;
}

/** Callers use evenodd fill/clip rules so the enclosed hole stays transparent and inert. */
export function areaShapePath(bounds: AreaRect, shape: AreaBandShape): string {
  return `${roundedPath(bounds, shape.radius)} ${roundedPath(shape.inner, shape.radius)}`;
}

/** Camera conversion is presentation only and cannot alter the shape's world-space policy. */
export function transformAreaShape(shape: AreaBandShape | undefined, scale: number, x: number, y: number): AreaBandShape | undefined {
  return shape ? {...shape, radius: shape.radius * scale, inner: {x: x + shape.inner.x * scale, y: y + shape.inner.y * scale,
    width: shape.inner.width * scale, height: shape.inner.height * scale}} : undefined;
}
