import { describe, it, expect } from 'vitest';
import { BezierCurve } from '../primitives/BezierCurve';

describe('BezierCurve', () => {
  it('is exported as a function', () => {
    expect(typeof BezierCurve).toBe('function');
  });

  it('has the expected function name', () => {
    expect(BezierCurve.name).toBe('BezierCurve');
  });
});
