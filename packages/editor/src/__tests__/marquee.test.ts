import { describe, expect, it } from 'vitest';
import { screenToMarqueeScene } from '../canvas/useMarquee';

describe('camera-aware marquee coordinates', () => {
  it('maps a cropped camera viewport back to logical scene coordinates', () => {
    const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
    const viewport = { x: 0, y: 0, zoom: 1 };
    const camera = {
      coordinateSpace: 'scene' as const,
      fit: 'cover' as const,
      viewport: { x: 200, y: 150, width: 400, height: 300 },
    };

    expect(screenToMarqueeScene(400, 300, rect, viewport, 800, 600, camera)).toEqual({ x: 400, y: 300 });
  });
});
