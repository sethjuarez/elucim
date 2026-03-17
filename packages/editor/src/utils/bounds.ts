import type { ElementNode } from '@elucim/dsl';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Rotation in degrees (matches element's `rotation` prop). */
  rotation?: number;
  /** Center of rotation [cx, cy] in scene coords. */
  rotationCenter?: [number, number];
}

// ─── Property helpers ──────────────────────────────────────────────────────

type AnyEl = Record<string, any>;

function hasNum(el: AnyEl, ...keys: string[]): boolean {
  return keys.every(k => k in el && typeof el[k] === 'number');
}

function boundsFromPoints(pts: [number, number][]): { x: number; y: number; width: number; height: number } | null {
  if (pts.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of pts) {
    if (typeof px !== 'number' || typeof py !== 'number') continue;
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  }
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 };
}

function estimateTextBounds(el: AnyEl): { x: number; y: number; width: number; height: number } {
  const fontSize = (el.fontSize as number) ?? 16;
  const content = (el.content ?? el.expression ?? '') as string;
  const textLen = typeof content === 'string' ? content.length : 5;
  const estWidth = Math.max(textLen * fontSize * 0.6, fontSize);
  const estHeight = fontSize * 1.4;

  const anchor = (el.textAnchor as string) ?? 'start';
  let bx = el.x as number;
  if (anchor === 'middle') bx -= estWidth / 2;
  else if (anchor === 'end') bx -= estWidth;

  const baseline = (el.dominantBaseline as string) ?? 'auto';
  let by = (el.y as number) - fontSize;
  if (baseline === 'hanging') by = el.y as number;
  else if (baseline === 'middle' || baseline === 'central') by = (el.y as number) - estHeight / 2;

  return { x: bx, y: by, width: estWidth, height: estHeight };
}

function originBasedBounds(el: AnyEl): { x: number; y: number; width: number; height: number } {
  const [ox, oy] = el.origin as [number, number];
  const s = (typeof el.scale === 'number' ? el.scale : 40);
  const domain = Array.isArray(el.domain) ? el.domain as [number, number] : [-5, 5];
  const range = Array.isArray(el.range) ? el.range as [number, number] : domain;
  const w = (domain[1] - domain[0]) * s;
  const h = (range[1] - range[0]) * s;
  return { x: ox - w / 2, y: oy - h / 2, width: w, height: h };
}

function matrixBounds(el: AnyEl): { x: number; y: number; width: number; height: number } {
  const mx = (el.x as number) ?? 0;
  const my = (el.y as number) ?? 0;
  const cellSize = (el.cellSize as number) ?? 48;
  const values = el.values as any[][];
  const rows = values?.length ?? 2;
  const cols = values?.[0]?.length ?? 2;
  // Match Matrix.tsx: bracketWidth=8, padding=4, brackets on both sides
  const bracketWidth = 8;
  const padding = 4;
  return {
    x: mx,
    y: my - padding,
    width: cols * cellSize + (bracketWidth + padding) * 2,
    height: rows * cellSize + padding * 2,
  };
}

// ─── Rotation center (property-based) ──────────────────────────────────────

function getRotationInfo(
  el: AnyEl,
  aabb: { x: number; y: number; width: number; height: number },
): Pick<BoundingBox, 'rotation' | 'rotationCenter'> {
  const rotation = el.rotation as number | undefined;
  if (!rotation) return {};

  if (Array.isArray(el.rotationOrigin)) {
    return { rotation, rotationCenter: el.rotationOrigin as [number, number] };
  }

  // Derive center from positioning properties
  if (hasNum(el, 'cx', 'cy')) return { rotation, rotationCenter: [el.cx, el.cy] };
  if (Array.isArray(el.origin)) return { rotation, rotationCenter: el.origin as [number, number] };
  if (hasNum(el, 'x1', 'y1', 'x2', 'y2')) {
    return { rotation, rotationCenter: [(el.x1 + el.x2) / 2, (el.y1 + el.y2) / 2] };
  }
  if (hasNum(el, 'x', 'y') && ('content' in el || 'expression' in el)) {
    return { rotation, rotationCenter: [el.x, el.y] };
  }
  return { rotation, rotationCenter: [aabb.x + aabb.width / 2, aabb.y + aabb.height / 2] };
}

// ─── Main bounds computation (property-based) ──────────────────────────────

/**
 * Property-based bounds detection. Inspects which positioning properties
 * exist rather than switching on element.type — works uniformly for all
 * current and future element types.
 */
export function getElementBounds(element: ElementNode): BoundingBox | null {
  const el = element as AnyEl;
  let aabb: { x: number; y: number; width: number; height: number } | null = null;

  // 1. Explicit x/y/width/height (rect, image, barChart)
  if (hasNum(el, 'x', 'y', 'width', 'height')) {
    aabb = { x: el.x, y: el.y, width: el.width, height: el.height };
  }
  // 2. Center + radius (circle)
  else if (hasNum(el, 'cx', 'cy', 'r')) {
    aabb = { x: el.cx - el.r, y: el.cy - el.r, width: el.r * 2, height: el.r * 2 };
  }
  // 3. Endpoints (line, arrow, bezierCurve — includes control points)
  else if (hasNum(el, 'x1', 'y1', 'x2', 'y2')) {
    const pts: [number, number][] = [[el.x1, el.y1], [el.x2, el.y2]];
    if (hasNum(el, 'cx1', 'cy1')) pts.push([el.cx1, el.cy1]);
    if (hasNum(el, 'cx2', 'cy2')) pts.push([el.cx2, el.cy2]);
    aabb = boundsFromPoints(pts);
  }
  // 4. Points array (polygon)
  else if (Array.isArray(el.points) && el.points.length > 0) {
    aabb = boundsFromPoints(el.points);
  }
  // 5. Text/LaTeX at x,y (estimate from content + fontSize)
  else if (hasNum(el, 'x', 'y') && ('content' in el || 'expression' in el)) {
    aabb = estimateTextBounds(el);
  }
  // 6. Graph nodes → derive bounds from vertex positions
  else if (Array.isArray(el.nodes) && el.nodes.length > 0) {
    const pts = (el.nodes as any[])
      .filter((n: any) => typeof n.x === 'number' && typeof n.y === 'number')
      .map((n: any) => [n.x, n.y] as [number, number]);
    const r = (el.nodeRadius as number) ?? 8;
    aabb = boundsFromPoints(pts);
    if (aabb) { aabb.x -= r; aabb.y -= r; aabb.width += r * 2; aabb.height += r * 2; }
  }
  // 7. Matrix (values array + optional x/y/cellSize)
  else if (Array.isArray(el.values)) {
    aabb = matrixBounds(el);
  }
  // 8. Origin-based math elements (axes, functionPlot, vector, vectorField)
  else if (Array.isArray(el.origin)) {
    aabb = originBasedBounds(el);
  }
  // 9. Positioned with x/y only (fallback)
  else if (hasNum(el, 'x', 'y')) {
    aabb = { x: el.x, y: el.y, width: 40, height: 40 };
  }

  if (!aabb) return null;
  return { ...aabb, ...getRotationInfo(el, aabb) };
}

// ─── Utilities ─────────────────────────────────────────────────────────────

/** Merge multiple bounding boxes into one containing all */
export function mergeBounds(boxes: BoundingBox[]): BoundingBox | null {
  if (boxes.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Check if a point (in SVG coordinates) is inside a bounding box.
 * When the bounds include rotation, the point is un-rotated into the
 * element's local coordinate space before the axis-aligned check.
 */
export function isPointInBounds(px: number, py: number, bounds: BoundingBox, padding = 4): boolean {
  let testX = px;
  let testY = py;

  if (bounds.rotation && bounds.rotationCenter) {
    const [cx, cy] = bounds.rotationCenter;
    const rad = (-bounds.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = px - cx;
    const dy = py - cy;
    testX = cx + dx * cos - dy * sin;
    testY = cy + dx * sin + dy * cos;
  }

  return (
    testX >= bounds.x - padding &&
    testX <= bounds.x + bounds.width + padding &&
    testY >= bounds.y - padding &&
    testY <= bounds.y + bounds.height + padding
  );
}
