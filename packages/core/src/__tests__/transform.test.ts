import { describe, it, expect } from 'vitest';
import React from 'react';
import { buildTransform, sortByZIndex } from '../primitives/transform';

describe('buildTransform', () => {
  it('returns undefined when no props set', () => {
    expect(buildTransform({})).toBeUndefined();
  });

  it('with rotation only', () => {
    expect(buildTransform({ rotation: 45 })).toBe('rotate(45, 0, 0)');
  });

  it('with rotation + custom origin', () => {
    expect(buildTransform({ rotation: 90, rotationOrigin: [50, 60] })).toBe(
      'rotate(90, 50, 60)'
    );
  });

  it('with rotation + defaultOrigin (no rotationOrigin)', () => {
    expect(buildTransform({ rotation: 30 }, [100, 200])).toBe(
      'rotate(30, 100, 200)'
    );
  });

  it('rotationOrigin takes precedence over defaultOrigin', () => {
    expect(
      buildTransform({ rotation: 30, rotationOrigin: [5, 5] }, [100, 200])
    ).toBe('rotate(30, 5, 5)');
  });

  it('with uniform scale', () => {
    expect(buildTransform({ scale: 2 })).toBe('scale(2)');
  });

  it('with scale array', () => {
    expect(buildTransform({ scale: [2, 3] })).toBe('scale(2, 3)');
  });

  it('with scale=1 returns undefined (no-op)', () => {
    expect(buildTransform({ scale: 1 })).toBeUndefined();
  });

  it('with translate', () => {
    expect(buildTransform({ translate: [10, 20] })).toBe('translate(10, 20)');
  });

  it('combines all transforms in order: translate → rotate → scale', () => {
    const result = buildTransform({
      translate: [10, 20],
      rotation: 45,
      rotationOrigin: [50, 50],
      scale: 2,
    });
    expect(result).toBe('translate(10, 20) rotate(45, 50, 50) scale(2)');
  });

  it('combines translate + scale (no rotation)', () => {
    expect(buildTransform({ translate: [5, 10], scale: 0.5 })).toBe(
      'translate(5, 10) scale(0.5)'
    );
  });

  it('scale=0 is kept (not treated as no-op)', () => {
    expect(buildTransform({ scale: 0 })).toBe('scale(0)');
  });
});

describe('sortByZIndex', () => {
  it('preserves order when all same zIndex', () => {
    const children = [
      React.createElement('circle', { key: 'a', r: 1 }),
      React.createElement('rect', { key: 'b', width: 2 }),
      React.createElement('line', { key: 'c', x1: 0 }),
    ];
    const sorted = sortByZIndex(children);
    expect(sorted).toHaveLength(3);
    expect((sorted[0] as React.ReactElement).type).toBe('circle');
    expect((sorted[1] as React.ReactElement).type).toBe('rect');
    expect((sorted[2] as React.ReactElement).type).toBe('line');
  });

  it('sorts higher zIndex later', () => {
    const children = [
      React.createElement('circle', { key: 'a', zIndex: 3 }),
      React.createElement('rect', { key: 'b', zIndex: 1 }),
      React.createElement('line', { key: 'c', zIndex: 2 }),
    ];
    const sorted = sortByZIndex(children);
    expect((sorted[0] as React.ReactElement).type).toBe('rect');
    expect((sorted[1] as React.ReactElement).type).toBe('line');
    expect((sorted[2] as React.ReactElement).type).toBe('circle');
  });

  it('handles empty children', () => {
    expect(sortByZIndex([])).toEqual([]);
  });

  it('handles non-element children gracefully', () => {
    const children = [
      'plain text',
      React.createElement('circle', { key: 'a', zIndex: 1 }),
      null,
      React.createElement('rect', { key: 'b', zIndex: 0 }),
    ];
    const sorted = sortByZIndex(children);
    // null is filtered by React.Children.toArray; text + elements remain
    // Non-elements get zIndex 0, so they sort alongside zIndex-0 elements
    expect(sorted.length).toBeGreaterThanOrEqual(2);
  });

  it('treats missing zIndex as 0', () => {
    const children = [
      React.createElement('circle', { key: 'a', zIndex: 1 }),
      React.createElement('rect', { key: 'b' }), // no zIndex → 0
    ];
    const sorted = sortByZIndex(children);
    expect((sorted[0] as React.ReactElement).type).toBe('rect');
    expect((sorted[1] as React.ReactElement).type).toBe('circle');
  });
});
