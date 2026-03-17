import { describe, it, expect } from 'vitest';
import { renderToPng, stripCssFunctions } from '../renderer/renderToPng';
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
    expect(svg).toContain(`var(--elucim-foreground, ${SEMANTIC_TOKENS.foreground.fallback})`);
    expect(svg).not.toContain('$foreground');
    expect(svg).not.toContain('$background');
  });
});

describe('stripCssFunctions', () => {
  it('strips simple var() to fallback', () => {
    expect(stripCssFunctions('var(--elucim-foreground, #c8d6e5)')).toBe('#c8d6e5');
  });

  it('strips nested var() from innermost out', () => {
    expect(stripCssFunctions('var(--elucim-scene-bg, var(--elucim-background, #0a0a1e))'))
      .toBe('#0a0a1e');
  });

  it('strips bare var() with no fallback to none', () => {
    expect(stripCssFunctions('var(--elucim-custom)')).toBe('none');
  });

  it('strips light-dark() to dark value (second arg)', () => {
    expect(stripCssFunctions('light-dark(#333, #e0e0e0)')).toBe('#e0e0e0');
  });

  it('strips var() wrapping light-dark()', () => {
    expect(stripCssFunctions('var(--elucim-scene-fg, light-dark(#333, #e0e0e0))'))
      .toBe('#e0e0e0');
  });

  it('leaves plain hex values unchanged', () => {
    expect(stripCssFunctions('#ff0000')).toBe('#ff0000');
  });

  it('handles multiple var() refs in one string', () => {
    const input = 'fill="var(--elucim-accent, #4fc3f7)" stroke="var(--elucim-border, #334155)"';
    expect(stripCssFunctions(input)).toBe('fill="#4fc3f7" stroke="#334155"');
  });
});
