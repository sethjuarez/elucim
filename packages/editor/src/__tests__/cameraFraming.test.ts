import { describe, expect, it } from 'vitest';
import {
  constrainCameraFrame,
  focusCameraFrame,
  getSceneCameraViewport,
  resizeCameraFrame,
  toCameraViewport,
} from '../canvas/CameraFramingOverlay';

describe('camera framing geometry', () => {
  it('converts normalized cameras to and from scene coordinates', () => {
    const viewport = getSceneCameraViewport({
      coordinateSpace: 'normalized',
      viewport: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
    }, 800, 600);

    expect(viewport).toEqual({ x: 200, y: 150, width: 400, height: 300 });
    expect(toCameraViewport(viewport, 'normalized', 800, 600)).toEqual({
      x: 0.25,
      y: 0.25,
      width: 0.5,
      height: 0.5,
    });
  });

  it('keeps a focused selection visible while matching the scene aspect ratio', () => {
    const viewport = focusCameraFrame({ x: 300, y: 220, width: 120, height: 80 }, 800, 600, 24);

    expect(viewport.width / viewport.height).toBeCloseTo(800 / 600);
    expect(viewport.x).toBeLessThanOrEqual(300);
    expect(viewport.y).toBeLessThanOrEqual(220);
    expect(viewport.x + viewport.width).toBeGreaterThanOrEqual(420);
    expect(viewport.y + viewport.height).toBeGreaterThanOrEqual(300);
  });

  it('constrains framing rectangles to positive dimensions within the scene', () => {
    expect(constrainCameraFrame({ x: -20, y: 590, width: 900, height: 40 }, 800, 600))
      .toEqual({ x: 0, y: 560, width: 800, height: 40 });
  });

  it('keeps the opposite edge fixed when a free-aspect resize reaches a scene boundary', () => {
    expect(resizeCameraFrame(
      { x: 100, y: 100, width: 400, height: 300 },
      'e',
      500,
      0,
      800,
      600,
      false,
    )).toEqual({ x: 100, y: 100, width: 700, height: 300 });
  });

  it('keeps anchored edges fixed when an aspect-locked resize reaches a scene boundary', () => {
    expect(resizeCameraFrame(
      { x: 100, y: 150, width: 400, height: 300 },
      'se',
      500,
      500,
      800,
      600,
      true,
    )).toEqual({ x: 100, y: 150, width: 600, height: 450 });
  });
});
