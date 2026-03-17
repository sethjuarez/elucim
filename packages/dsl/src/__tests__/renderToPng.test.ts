import { describe, it, expect } from 'vitest';
import { renderToPng } from '../renderer/renderToPng';
import { renderToSvgString } from '../renderer/renderToSvgString';
import { SEMANTIC_TOKENS } from '../renderer/resolveColor';

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

const tokenDoc = {
  version: '1.0' as const,
  root: {
    type: 'scene' as const,
    durationInFrames: 30,
    width: 640,
    height: 360,
    background: '$background',
    children: [
      { type: 'text' as const, content: 'Hello', fill: '$foreground', x: 100, y: 100, fontSize: 32 },
    ],
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

  it('renderToSvgString resolves $tokens to var() with hex fallbacks', () => {
    const svg = renderToSvgString(tokenDoc as any, 0);
    // $foreground → var(--elucim-foreground, #c8d6e5)
    expect(svg).toContain(`var(--elucim-foreground, ${SEMANTIC_TOKENS.foreground.fallback})`);
    expect(svg).not.toContain('$foreground');
    expect(svg).not.toContain('$background');
  });
});
