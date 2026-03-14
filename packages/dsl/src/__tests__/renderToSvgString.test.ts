import { describe, it, expect } from 'vitest';
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

describe('renderToSvgString', () => {
  it('returns a string containing <svg', () => {
    const svg = renderToSvgString(doc as any, 0);
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
  });

  it('renders a circle element into the SVG output', () => {
    const svg = renderToSvgString(doc as any, 0);
    expect(svg).toContain('<circle');
  });

  it('renders at a different frame without error', () => {
    const svgFrame0 = renderToSvgString(doc as any, 0);
    const svgFrame15 = renderToSvgString(doc as any, 15);
    const svgFrame29 = renderToSvgString(doc as any, 29);

    expect(svgFrame0).toContain('<svg');
    expect(svgFrame15).toContain('<svg');
    expect(svgFrame29).toContain('<svg');
  });

  it('throws on invalid DSL', () => {
    const bad = { version: '1.0', root: { type: 'scene', children: [] } };
    expect(() => renderToSvgString(bad as any, 0)).toThrow('DSL validation failed');
  });

  it('accepts width/height overrides via options', () => {
    const svg = renderToSvgString(doc as any, 0, { width: 800, height: 600 });
    expect(svg).toContain('<svg');
  });
});
