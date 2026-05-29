import { describe, expect, it } from 'vitest';
import { measureTextLayout, measureTextWidth } from '../text/measureText';

describe('measureTextWidth', () => {
  it('returns deterministic widths for common glyph classes', () => {
    expect(measureTextWidth('Hi', { fontSize: 10 })).toBe(9.6);
    expect(measureTextWidth('WWW', { fontSize: 10 })).toBe(27);
    expect(measureTextWidth('Hi', { fontSize: 10, fontWeight: 700 })).toBe(10.176);
  });

  it('uses a deterministic monospace bucket for monospace font families', () => {
    expect(measureTextWidth('Hi', { fontSize: 10, fontFamily: 'monospace' })).toBe(12.4);
  });

  it('throws for invalid font sizes', () => {
    expect(() => measureTextWidth('bad', { fontSize: 0 })).toThrow(
      'fontSize must be a positive finite number'
    );
  });

  it('throws for non-string content at runtime', () => {
    // @ts-expect-error Runtime callers may bypass TypeScript.
    expect(() => measureTextWidth(123)).toThrow('content must be a string');
  });
});

describe('measureTextLayout', () => {
  it('measures a single line by default', () => {
    expect(measureTextLayout('hello', { fontSize: 20 })).toEqual({
      width: 44.8,
      height: 24,
      lineHeight: 24,
      wrap: 'none',
      lines: [{ text: 'hello', width: 44.8 }],
    });
  });

  it('resolves small lineHeight values as font-size ratios', () => {
    expect(measureTextLayout('a\nb', { fontSize: 10, lineHeight: 1.5 })).toMatchObject({
      height: 30,
      lineHeight: 15,
    });
  });

  it('returns zero height for empty content', () => {
    expect(measureTextLayout('', { fontSize: 20 })).toEqual({
      width: 0,
      height: 0,
      lineHeight: 24,
      wrap: 'none',
      lines: [],
    });
  });

  it('wraps words within maxWidth', () => {
    expect(
      measureTextLayout('alpha beta gamma', {
        fontSize: 10,
        maxWidth: 60,
      })
    ).toEqual({
      width: 50.9,
      height: 24,
      lineHeight: 12,
      wrap: 'word',
      lines: [
        { text: 'alpha beta', width: 50.9 },
        { text: 'gamma', width: 34.8 },
      ],
    });
  });

  it('keeps overlong words intact when word wrapping', () => {
    const layout = measureTextLayout('supercalifragilistic', {
      fontSize: 10,
      maxWidth: 30,
    });

    expect(layout.lines).toEqual([{ text: 'supercalifragilistic', width: 95.2 }]);
  });

  it('can wrap by character for overlong labels', () => {
    expect(
      measureTextLayout('abcdef', {
        fontSize: 10,
        maxWidth: 20,
        wrap: 'char',
      }).lines
    ).toEqual([
      { text: 'abc', width: 16.8 },
      { text: 'def', width: 16.8 },
    ]);
  });

  it('preserves explicit line breaks', () => {
    expect(measureTextLayout('a\nb', { fontSize: 10 }).lines).toEqual([
      { text: 'a', width: 5.6 },
      { text: 'b', width: 5.6 },
    ]);
  });

  it('preserves Windows line breaks', () => {
    expect(measureTextLayout('a\r\nb', { fontSize: 10 }).lines).toEqual([
      { text: 'a', width: 5.6 },
      { text: 'b', width: 5.6 },
    ]);
  });

  it('preserves a trailing explicit line break', () => {
    expect(measureTextLayout('a\n', { fontSize: 10 })).toMatchObject({
      height: 24,
      lines: [
        { text: 'a', width: 5.6 },
        { text: '', width: 0 },
      ],
    });
  });

  it('keeps whitespace-only wrapped content as one visual line', () => {
    expect(measureTextLayout('   ', { fontSize: 10, maxWidth: 20 })).toMatchObject({
      height: 12,
      lines: [{ text: '', width: 0 }],
    });
  });

  it('drops wrap-boundary whitespace instead of creating blank character-wrap lines', () => {
    expect(
      measureTextLayout('ab cd ef', {
        fontSize: 10,
        maxWidth: 16,
        wrap: 'char',
      }).lines
    ).toEqual([
      { text: 'ab', width: 11.2 },
      { text: 'cd', width: 11.2 },
      { text: 'ef', width: 11.2 },
    ]);
  });
});
