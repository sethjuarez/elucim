import { describe, it, expect } from 'vitest';
import { getElementBounds, mergeBounds, isPointInBounds } from '../utils/bounds';
import type { CircleNode, RectNode, LineNode, PolygonNode, TextNode } from '@elucim/dsl';

describe('getElementBounds', () => {
  it('computes rect bounds', () => {
    const rect: RectNode = { type: 'rect', x: 10, y: 20, width: 100, height: 80 };
    expect(getElementBounds(rect)).toEqual({ x: 10, y: 20, width: 100, height: 80 });
  });

  it('computes circle bounds', () => {
    const circle: CircleNode = { type: 'circle', cx: 100, cy: 200, r: 50 };
    expect(getElementBounds(circle)).toEqual({ x: 50, y: 150, width: 100, height: 100 });
  });

  it('computes line bounds', () => {
    const line: LineNode = { type: 'line', x1: 10, y1: 20, x2: 110, y2: 120 };
    expect(getElementBounds(line)).toEqual({ x: 10, y: 20, width: 100, height: 100 });
  });

  it('computes polygon bounds', () => {
    const polygon: PolygonNode = {
      type: 'polygon',
      points: [[0, 0], [100, 0], [50, 80]],
    };
    expect(getElementBounds(polygon)).toEqual({ x: 0, y: 0, width: 100, height: 80 });
  });

  it('computes text bounds (approximate)', () => {
    const text: TextNode = { type: 'text', x: 50, y: 100, content: 'Hello', fontSize: 20 };
    const bounds = getElementBounds(text);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(50);
    expect(bounds!.width).toBeGreaterThan(0);
    expect(bounds!.height).toBeGreaterThan(0);
  });

  it('returns null for animation wrappers', () => {
    expect(getElementBounds({ type: 'fadeIn', children: [] })).toBeNull();
    expect(getElementBounds({ type: 'stagger', children: [] })).toBeNull();
  });
});

describe('mergeBounds', () => {
  it('merges multiple boxes', () => {
    const merged = mergeBounds([
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 100, y: 100, width: 50, height: 50 },
    ]);
    expect(merged).toEqual({ x: 0, y: 0, width: 150, height: 150 });
  });

  it('returns null for empty array', () => {
    expect(mergeBounds([])).toBeNull();
  });
});

describe('isPointInBounds', () => {
  const bounds = { x: 10, y: 10, width: 100, height: 80 };

  it('detects point inside', () => {
    expect(isPointInBounds(50, 50, bounds)).toBe(true);
  });

  it('detects point outside', () => {
    expect(isPointInBounds(200, 200, bounds)).toBe(false);
  });

  it('respects padding', () => {
    expect(isPointInBounds(8, 50, bounds, 4)).toBe(true); // within padding
    expect(isPointInBounds(3, 50, bounds, 4)).toBe(false); // outside padding
  });
});
