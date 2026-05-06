import { describe, it, expect } from 'vitest';
import { getElementBounds, mergeBounds, isPointInBounds } from '../utils/bounds';
import type { AxesNode, CircleNode, LaTeXNode, RectNode, LineNode, PolygonNode, TextNode, FunctionPlotNode, VectorFieldNode } from '@elucim/dsl';

describe('getElementBounds', () => {
  it('computes rect bounds', () => {
    const rect: RectNode = { type: 'rect', x: 10, y: 20, width: 100, height: 80 };
    expect(getElementBounds(rect)).toEqual({ x: 10, y: 20, width: 100, height: 80 });
  });

  it('computes circle bounds', () => {
    const circle: CircleNode = { type: 'circle', cx: 100, cy: 200, r: 50 };
    expect(getElementBounds(circle)).toEqual({ x: 50, y: 150, width: 100, height: 100 });
  });

  it('includes top-left anchored scale in rect bounds', () => {
    const rect: RectNode = { type: 'rect', x: 10, y: 20, width: 100, height: 80, scale: 2 };
    expect(getElementBounds(rect)).toEqual({ x: 10, y: 20, width: 200, height: 160 });
  });

  it('includes top-left anchored scale in matrix bounds', () => {
    const matrix = { type: 'matrix', x: 100, y: 120, cellSize: 48, values: [[1, 2], [3, 4]], scale: 1.5 } as any;
    expect(getElementBounds(matrix)).toEqual({ x: 100, y: 114, width: 180, height: 156 });
  });

  it('includes top-left anchored scale in graph bounds', () => {
    const graph = {
      type: 'graph',
      nodes: [
        { id: 'a', x: 100, y: 100, radius: 10 },
        { id: 'b', x: 200, y: 160 },
      ],
      edges: [{ from: 'a', to: 'b' }],
      nodeRadius: 8,
      scale: 2,
    } as any;
    expect(getElementBounds(graph)).toEqual({ x: 90, y: 90, width: 236, height: 156 });
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

  it('computes tighter LaTeX bounds from foreignObject sizing', () => {
    const latex: LaTeXNode = { type: 'latex', x: 200, y: 120, expression: 'x^2', fontSize: 24 };
    const bounds = getElementBounds(latex);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeCloseTo(170, 1);
    expect(bounds!.width).toBeCloseTo(60, 1);
    expect(bounds!.height).toBe(96);
  });

  it('returns null for animation wrappers', () => {
    expect(getElementBounds({ type: 'fadeIn', children: [] })).toBeNull();
    expect(getElementBounds({ type: 'stagger', children: [] })).toBeNull();
  });

  it('computes functionPlot bounds from the visible sin(x) curve', () => {
    const fp: FunctionPlotNode = {
      type: 'functionPlot',
      fn: 'sin(x)',
      origin: [400, 300],
      scale: 40,
      domain: [-5, 5],
      yClamp: [-10, 10],
      strokeWidth: 2,
    };
    const bounds = getElementBounds(fp);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(199);
    expect(bounds!.width).toBe(402);
    expect(bounds!.y).toBeCloseTo(259, 0);
    expect(bounds!.height).toBeCloseTo(82, 0);
  });

  it('functionPlot with narrow yClamp uses the visible clipped curve', () => {
    const fp: FunctionPlotNode = {
      type: 'functionPlot',
      fn: 'x',
      origin: [400, 300],
      scale: 40,
      domain: [-5, 5],
      yClamp: [-3, 3],
      strokeWidth: 2,
    };
    const bounds = getElementBounds(fp);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(279);
    expect(bounds!.width).toBe(242);
    expect(bounds!.height).toBe(242);
  });

  it('functionPlot without yClamp uses the default visible y clamp', () => {
    const fp = {
      type: 'functionPlot',
      fn: 'sin(x)',
      origin: [400, 300],
      scale: 40,
      domain: [-5, 5],
      strokeWidth: 2,
    } as FunctionPlotNode;
    const bounds = getElementBounds(fp);
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBe(402);
    expect(bounds!.height).toBeCloseTo(82, 0);
  });

  it('functionPlot x^2 bounds only include the visible parabola segment', () => {
    const fp = {
      type: 'functionPlot',
      fn: 'x^2',
      origin: [400, 300],
      scale: 40,
      domain: [-5, 5],
      yClamp: [-10, 10],
      strokeWidth: 2,
    } as FunctionPlotNode;
    const bounds = getElementBounds(fp);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeCloseTo(272.5, 0);
    expect(bounds!.width).toBeCloseTo(255, 0);
    expect(bounds!.y).toBe(-101);
    expect(bounds!.height).toBe(402);
  });

  it('computes asymmetric functionPlot bounds from math coordinates', () => {
    const fp: FunctionPlotNode = {
      type: 'functionPlot',
      fn: 'x',
      origin: [100, 300],
      scale: 20,
      domain: [0, 10],
      yClamp: [-2, 6],
    };
    expect(getElementBounds(fp)).toMatchObject({
      x: 99,
      y: 179,
      width: 122,
      height: 122,
    });
  });

  it('computes axes bounds from domain and range around origin', () => {
    const axes: AxesNode = {
      type: 'axes',
      origin: [320, 240],
      scale: 30,
      domain: [-2, 8],
      range: [-1, 5],
    };
    expect(getElementBounds(axes)).toMatchObject({
      x: 260,
      y: 90,
      width: 300,
      height: 180,
    });
  });

  it('includes visible origin axes when domain and range exclude zero', () => {
    const axes: AxesNode = {
      type: 'axes',
      origin: [100, 100],
      scale: 10,
      domain: [1, 5],
      range: [1, 5],
    };
    expect(getElementBounds(axes)).toMatchObject({
      x: 100,
      y: 50,
      width: 50,
      height: 50,
    });
  });

  it('pads vectorField bounds for arrow extents', () => {
    const vf: VectorFieldNode = {
      type: 'vectorField',
      fn: '[-y, x]',
      origin: [100, 100],
      scale: 10,
      domain: [0, 2],
      range: [0, 2],
      maxLength: 1,
      arrowScale: 0.5,
      headSize: 2,
    };
    expect(getElementBounds(vf)).toMatchObject({
      x: 93,
      y: 73,
      width: 34,
      height: 34,
    });
  });

  it('functionPlot uses origin as rotation center', () => {
    const fp = {
      type: 'functionPlot',
      fn: 'sin(x)',
      origin: [400, 300],
      scale: 40,
      domain: [-5, 5],
      yClamp: [-10, 10],
      rotation: 45,
    } as any;
    const bounds = getElementBounds(fp);
    expect(bounds!.rotation).toBe(45);
    expect(bounds!.rotationCenter).toEqual([400, 300]);
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
