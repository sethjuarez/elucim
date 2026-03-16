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

  it('un-rotates point for rotated bounds', () => {
    // A rect at (0,0) 100x10, rotated 90° around its center (50,5)
    // After rotation, the rect occupies roughly x=45..55, y=-45..55
    const rotBounds = { x: 0, y: 0, width: 100, height: 10, rotation: 90, rotationCenter: [50, 5] as [number, number] };
    // Point at (50, -30) is inside the rotated rect (maps to ~(35, 5) in local space)
    expect(isPointInBounds(50, -30, rotBounds, 4)).toBe(true);
    // Point at (50, 50) is outside — far from the rotated thin rect
    expect(isPointInBounds(80, 50, rotBounds, 4)).toBe(false);
  });
});

describe('getElementBounds rotation info', () => {
  it('includes rotation for rotated rect', () => {
    const rect: RectNode = { type: 'rect', x: 10, y: 20, width: 100, height: 80, rotation: 45 } as any;
    const bounds = getElementBounds(rect);
    expect(bounds).not.toBeNull();
    expect(bounds!.rotation).toBe(45);
    // Rect default origin = center
    expect(bounds!.rotationCenter).toEqual([60, 60]);
  });

  it('uses rotationOrigin when specified', () => {
    const rect = { type: 'rect', x: 0, y: 0, width: 100, height: 100, rotation: 30, rotationOrigin: [10, 20] } as any;
    const bounds = getElementBounds(rect);
    expect(bounds!.rotation).toBe(30);
    expect(bounds!.rotationCenter).toEqual([10, 20]);
  });

  it('omits rotation when not set', () => {
    const rect: RectNode = { type: 'rect', x: 10, y: 20, width: 100, height: 80 };
    const bounds = getElementBounds(rect);
    expect(bounds!.rotation).toBeUndefined();
    expect(bounds!.rotationCenter).toBeUndefined();
  });

  it('uses text anchor point as rotation center for text', () => {
    const text = { type: 'text', x: 50, y: 100, content: 'Hi', fontSize: 20, rotation: 90 } as any;
    const bounds = getElementBounds(text);
    expect(bounds!.rotation).toBe(90);
    expect(bounds!.rotationCenter).toEqual([50, 100]);
  });

  it('uses circle center as rotation center', () => {
    const circle = { type: 'circle', cx: 100, cy: 200, r: 50, rotation: 15 } as any;
    const bounds = getElementBounds(circle);
    expect(bounds!.rotation).toBe(15);
    expect(bounds!.rotationCenter).toEqual([100, 200]);
  });
});
