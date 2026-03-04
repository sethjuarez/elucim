import { describe, it, expect } from 'vitest';
import { resolveEasing, VALID_EASING_NAMES } from '../renderer/resolveEasing';

describe('Easing Resolver', () => {
  it('returns undefined for undefined input', () => {
    expect(resolveEasing(undefined)).toBeUndefined();
  });

  it('resolves all named easings', () => {
    for (const name of VALID_EASING_NAMES) {
      const fn = resolveEasing(name as any);
      expect(fn).toBeDefined();
      expect(typeof fn).toBe('function');
      expect(fn!(0)).toBeCloseTo(0, 1);
      expect(fn!(1)).toBeCloseTo(1, 1);
    }
  });

  it('resolves linear correctly', () => {
    const fn = resolveEasing('linear')!;
    expect(fn(0)).toBe(0);
    expect(fn(0.5)).toBe(0.5);
    expect(fn(1)).toBe(1);
  });

  it('resolves spring easing', () => {
    const fn = resolveEasing({ type: 'spring', stiffness: 100, damping: 10 });
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
  });

  it('resolves cubicBezier easing', () => {
    const fn = resolveEasing({ type: 'cubicBezier', x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 });
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
    expect(fn!(0)).toBeCloseTo(0, 1);
    expect(fn!(1)).toBeCloseTo(1, 1);
  });

  it('throws for unknown easing name', () => {
    expect(() => resolveEasing('unknownEasing' as any)).toThrow("Unknown easing 'unknownEasing'");
  });

  it('throws for unknown easing type object', () => {
    expect(() => resolveEasing({ type: 'bounce' } as any)).toThrow('Unknown easing type');
  });
});
