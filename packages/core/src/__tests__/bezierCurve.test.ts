import { describe, it, expect } from 'vitest';
import { BezierCurve, type BezierCurveProps } from '../primitives/BezierCurve';

describe('BezierCurve', () => {
  it('is exported as a function', () => {
    expect(typeof BezierCurve).toBe('function');
  });

  it('has the expected function name', () => {
    expect(BezierCurve.name).toBe('BezierCurve');
  });

  it('exposes BezierCurveProps type (compile-time check)', () => {
    // Verify the type can be used — purely a compile-time check
    const props: BezierCurveProps = {
      x1: 0, y1: 0, cx1: 50, cy1: 100, x2: 100, y2: 0,
    };
    expect(props.x1).toBe(0);
  });

  it('accepts cubic Bezier props (cx2/cy2)', () => {
    const props: BezierCurveProps = {
      x1: 0, y1: 0, cx1: 30, cy1: 80, cx2: 70, cy2: 80, x2: 100, y2: 0,
    };
    expect(props.cx2).toBe(70);
    expect(props.cy2).toBe(80);
  });
});
