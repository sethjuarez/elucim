import type { ElementNode } from '@elucim/dsl';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute the bounding box for an element based on its type and properties.
 * Returns null for elements that don't have easily computable bounds (e.g., animation wrappers).
 */
export function getElementBounds(element: ElementNode): BoundingBox | null {
  switch (element.type) {
    case 'rect':
    case 'image':
      return { x: element.x, y: element.y, width: element.width, height: element.height };

    case 'circle':
      return {
        x: element.cx - element.r,
        y: element.cy - element.r,
        width: element.r * 2,
        height: element.r * 2,
      };

    case 'line':
    case 'arrow': {
      const minX = Math.min(element.x1, element.x2);
      const minY = Math.min(element.y1, element.y2);
      const maxX = Math.max(element.x1, element.x2);
      const maxY = Math.max(element.y1, element.y2);
      return { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 };
    }

    case 'text':
    case 'latex':
      // Approximate text bounds — real measurement requires DOM
      return {
        x: element.x,
        y: element.y - (('fontSize' in element ? element.fontSize : 16) ?? 16),
        width: ('content' in element ? element.content.length : 5) * (('fontSize' in element ? element.fontSize : 16) ?? 16) * 0.6,
        height: (('fontSize' in element ? element.fontSize : 16) ?? 16) * 1.2,
      };

    case 'polygon': {
      if (!element.points || element.points.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [px, py] of element.points) {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
      return { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 };
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
      return { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 };
    }

    case 'barChart':
      return { x: element.x, y: element.y, width: element.width, height: element.height };

    case 'axes':
    case 'functionPlot':
    case 'vector':
    case 'vectorField':
    case 'matrix':
      // Matrix uses x/y positioning with cellSize-based dimensions
      if ('x' in element || 'y' in element) {
        const mx = (element as any).x ?? 0;
        const my = (element as any).y ?? 0;
        const cellSize = (element as any).cellSize ?? 40;
        const values = (element as any).values as any[][] | undefined;
        const rows = values?.length ?? 2;
        const cols = values?.[0]?.length ?? 2;
        return { x: mx, y: my, width: cols * cellSize + 20, height: rows * cellSize + 10 };
      }
      if ('origin' in element && element.origin) {
        const [ox, oy] = element.origin;
        const s = ('scale' in element ? (element.scale as number) : 40) ?? 40;
        return { x: ox - s * 2, y: oy - s * 2, width: s * 4, height: s * 4 };
      }
      return null;

    case 'graph':
      // Math components use origin/scale — approximate a region
      if ('origin' in element && element.origin) {
        const origin = element.origin as [number, number];
        const [ox, oy] = origin;
        const s = ('scale' in element ? (element.scale as number) : 40) ?? 40;
        const d = ('domain' in element && element.domain) ? element.domain as [number, number] : [-5, 5];
        const width = (d[1] - d[0]) * s;
        const height = width;
        return { x: ox - width / 2, y: oy - height / 2, width, height };
      }
      return null;

    default:
      // Animation wrappers, groups, sequences — skip
      return null;
  }
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

/** Check if a point (in SVG coordinates) is inside a bounding box */
export function isPointInBounds(px: number, py: number, bounds: BoundingBox, padding = 4): boolean {
  return (
    px >= bounds.x - padding &&
    px <= bounds.x + bounds.width + padding &&
    py >= bounds.y - padding &&
    py <= bounds.y + bounds.height + padding
  );
}
