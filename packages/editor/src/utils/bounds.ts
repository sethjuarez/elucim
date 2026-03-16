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

/**
 * Extract rotation info from an element. Returns the element's rotation
 * and its rotation center — mirroring the defaultOrigin logic in core's
 * withTransform calls for each primitive type.
 */
function getRotationInfo(
  element: ElementNode,
  aabb: { x: number; y: number; width: number; height: number },
): Pick<BoundingBox, 'rotation' | 'rotationCenter'> {
  const rotation = ('rotation' in element ? (element.rotation as number) : undefined);
  if (!rotation) return {};

  // Explicit rotationOrigin always wins (matches core's withTransform)
  const explicitOrigin = ('rotationOrigin' in element ? element.rotationOrigin : undefined) as
    | [number, number]
    | undefined;
  if (explicitOrigin) {
    return { rotation, rotationCenter: explicitOrigin };
  }

  // Default origin per type — matches core primitive defaults
  const cx = aabb.x + aabb.width / 2;
  const cy = aabb.y + aabb.height / 2;

  switch (element.type) {
    case 'circle':
      return { rotation, rotationCenter: [element.cx, element.cy] };
    case 'text':
    case 'latex':
      return { rotation, rotationCenter: [element.x, element.y] };
    case 'line':
    case 'arrow':
      return { rotation, rotationCenter: [(element.x1 + element.x2) / 2, (element.y1 + element.y2) / 2] };
    case 'matrix':
      return { rotation, rotationCenter: [(element as any).x ?? 0, (element as any).y ?? 0] };
    case 'axes':
    case 'functionPlot':
    case 'vector':
    case 'vectorField':
      if ('origin' in element && element.origin) {
        return { rotation, rotationCenter: element.origin as [number, number] };
      }
      return { rotation, rotationCenter: [cx, cy] };
    case 'graph':
      if ('origin' in element && element.origin) {
        return { rotation, rotationCenter: element.origin as [number, number] };
      }
      return { rotation, rotationCenter: [cx, cy] };
    default:
      return { rotation, rotationCenter: [cx, cy] };
  }
}

/**
 * Compute the bounding box for an element based on its type and properties.
 * Includes rotation info so overlays and hit-tests can rotate with the element.
 * Returns null for elements that don't have easily computable bounds.
 */
export function getElementBounds(element: ElementNode): BoundingBox | null {
  let aabb: { x: number; y: number; width: number; height: number } | null = null;

  switch (element.type) {
    case 'rect':
    case 'image':
      aabb = { x: element.x, y: element.y, width: element.width, height: element.height };
      break;

    case 'circle':
      aabb = {
        x: element.cx - element.r,
        y: element.cy - element.r,
        width: element.r * 2,
        height: element.r * 2,
      };
      break;

    case 'line':
    case 'arrow': {
      const minX = Math.min(element.x1, element.x2);
      const minY = Math.min(element.y1, element.y2);
      const maxX = Math.max(element.x1, element.x2);
      const maxY = Math.max(element.y1, element.y2);
      aabb = { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 };
      break;
    }

    case 'text':
    case 'latex': {
      const fontSize = ('fontSize' in element ? element.fontSize : 16) ?? 16;
      const content = ('content' in element ? element.content : '') ?? '';
      const textLen = typeof content === 'string' ? content.length : 5;
      const estWidth = textLen * fontSize * 0.6;
      const estHeight = fontSize * 1.4;

      const anchor = ('textAnchor' in element ? element.textAnchor : 'start') ?? 'start';
      let bx = element.x;
      if (anchor === 'middle') bx = element.x - estWidth / 2;
      else if (anchor === 'end') bx = element.x - estWidth;

      const baseline = ('dominantBaseline' in element ? element.dominantBaseline : 'auto') ?? 'auto';
      let by = element.y - fontSize;
      if (baseline === 'hanging') by = element.y;
      else if (baseline === 'middle' || baseline === 'central') by = element.y - estHeight / 2;

      aabb = { x: bx, y: by, width: estWidth, height: estHeight };
      break;
    }

    case 'polygon': {
      if (!element.points || element.points.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [px, py] of element.points) {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
      aabb = { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 };
      break;
    }

    case 'bezierCurve': {
      const pts = [
        [element.x1, element.y1],
        [element.cx1, element.cy1],
        [element.x2, element.y2],
      ];
      if (element.cx2 != null && element.cy2 != null) {
        pts.push([element.cx2, element.cy2]);
      }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [px, py] of pts) {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
      aabb = { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 };
      break;
    }

    case 'barChart':
      aabb = { x: element.x, y: element.y, width: element.width, height: element.height };
      break;

    case 'axes':
    case 'functionPlot':
    case 'vector':
    case 'vectorField':
    case 'matrix':
      if ('x' in element || 'y' in element) {
        const mx = (element as any).x ?? 0;
        const my = (element as any).y ?? 0;
        const cellSize = (element as any).cellSize ?? 40;
        const values = (element as any).values as any[][] | undefined;
        const rows = values?.length ?? 2;
        const cols = values?.[0]?.length ?? 2;
        aabb = { x: mx, y: my, width: cols * cellSize + 20, height: rows * cellSize + 10 };
      } else if ('origin' in element && element.origin) {
        const [ox, oy] = element.origin;
        const s = ('scale' in element ? (element.scale as number) : 40) ?? 40;
        aabb = { x: ox - s * 2, y: oy - s * 2, width: s * 4, height: s * 4 };
      }
      break;

    case 'graph':
      if ('origin' in element && element.origin) {
        const origin = element.origin as [number, number];
        const [ox, oy] = origin;
        const s = ('scale' in element ? (element.scale as number) : 40) ?? 40;
        const d = ('domain' in element && element.domain) ? element.domain as [number, number] : [-5, 5];
        const width = (d[1] - d[0]) * s;
        const height = width;
        aabb = { x: ox - width / 2, y: oy - height / 2, width, height };
      }
      break;

    default:
      return null;
  }

  if (!aabb) return null;

  // Attach rotation info so overlays/hit-tests rotate with the element
  const rot = getRotationInfo(element, aabb);
  return { ...aabb, ...rot };
}

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
    // Un-rotate the point around the rotation center
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
