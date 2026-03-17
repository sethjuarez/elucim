import { describe, it, expect } from 'vitest';
import { renderToPng } from '../renderer/renderToPng';
import { renderToSvgString } from '../renderer/renderToSvgString';

const doc = {
  version: '1.0' as const,
  root: {
    type: 'scene' as const,
    durationInFrames: 30,
    width: 400,
    height: 300,
    children: [{ type: 'circle' as const, cx: 200, cy: 150, r: 50, fill: '#ff0000' }],
  },
};

describe('renderToPng', () => {
  // renderToPng needs browser APIs (Image, Canvas/OffscreenCanvas) which
  // aren't available in Node/vitest. We can only test that the export exists
  // and that the SVG string step works. The full rasterization pipeline is
  // covered by Playwright e2e tests.

  it('is exported and is a function', () => {
    expect(typeof renderToPng).toBe('function');
  });

  it('renderToSvgString (used internally) produces valid SVG for the same doc', () => {
    const svg = renderToSvgString(doc as any, 0);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<circle');
  });
});
