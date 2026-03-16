import { describe, it, expect } from 'vitest';
import { computeSnap } from '../utils/snap';
import type { BoundingBox } from '../utils/bounds';

describe('computeSnap', () => {
  const sceneWidth = 800;
  const sceneHeight = 600;

  it('snaps to scene center X', () => {
    const moving: BoundingBox = { x: 350, y: 100, width: 100, height: 50 };
    // Center = 400, moving center = 400 → already aligned
    const { snapDx, guides } = computeSnap(moving, [], sceneWidth, sceneHeight);
    expect(snapDx).toBe(0);
    expect(guides.some(g => g.type === 'vertical' && g.label === 'center')).toBe(true);
  });

  it('snaps to scene center Y', () => {
    const moving: BoundingBox = { x: 100, y: 275, width: 100, height: 50 };
    // Center Y = 300, moving center = 300 → aligned
    const { snapDy, guides } = computeSnap(moving, [], sceneWidth, sceneHeight);
    expect(snapDy).toBe(0);
    expect(guides.some(g => g.type === 'horizontal' && g.label === 'center')).toBe(true);
  });

  it('snaps to left edge', () => {
    const moving: BoundingBox = { x: 3, y: 100, width: 50, height: 50 };
    const { snapDx, guides } = computeSnap(moving, [], sceneWidth, sceneHeight);
    expect(snapDx).toBe(-3);
    expect(guides.some(g => g.type === 'vertical' && g.position === 0)).toBe(true);
  });

  it('snaps to right edge', () => {
    const moving: BoundingBox = { x: 745, y: 100, width: 50, height: 50 };
    // right edge = 795, scene = 800
    const { snapDx, guides } = computeSnap(moving, [], sceneWidth, sceneHeight);
    expect(snapDx).toBe(5);
    expect(guides.some(g => g.type === 'vertical' && g.position === 800)).toBe(true);
  });

  it('snaps to another element center', () => {
    const moving: BoundingBox = { x: 145, y: 100, width: 100, height: 50 };
    // moving center x = 195
    const target: BoundingBox = { x: 150, y: 300, width: 100, height: 50 };
    // target center x = 200, diff = 5 < threshold 8
    const { snapDx, guides } = computeSnap(moving, [target], sceneWidth, sceneHeight);
    expect(snapDx).toBe(5);
    expect(guides.some(g => g.type === 'vertical' && g.position === 200)).toBe(true);
  });

  it('does not snap when far from any target', () => {
    const moving: BoundingBox = { x: 100, y: 100, width: 50, height: 50 };
    const target: BoundingBox = { x: 500, y: 500, width: 50, height: 50 };
    const { snapDx, snapDy, guides } = computeSnap(moving, [target], sceneWidth, sceneHeight);
    // Should not snap to target, but might snap to edges — check no target guide
    const targetGuides = guides.filter(g => g.position === 525); // target center x
    expect(targetGuides).toHaveLength(0);
  });
});
