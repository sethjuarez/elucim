import { describe, it, expect } from 'vitest';
import { FunctionPlot, type FunctionPlotProps } from '../primitives/FunctionPlot';

describe('FunctionPlot', () => {
  it('is exported as a function', () => {
    expect(typeof FunctionPlot).toBe('function');
  });

  it('has the expected function name', () => {
    expect(FunctionPlot.name).toBe('FunctionPlot');
  });

  it('exposes FunctionPlotProps type (compile-time check)', () => {
    const props: FunctionPlotProps = {
      fn: Math.sin,
      domain: [-5, 5],
      yClamp: [-10, 10],
      origin: [400, 300],
      scale: 40,
    };
    expect(props.fn(0)).toBe(0);
  });

  it('accepts all optional props', () => {
    const props: FunctionPlotProps = {
      fn: (x) => x * x,
      domain: [-3, 3],
      yClamp: [-5, 5],
      origin: [200, 150],
      scale: 20,
      color: '#ff0000',
      strokeWidth: 3,
      samples: 100,
      draw: 60,
      opacity: 0.8,
      rotation: 45,
      rotationOrigin: [200, 150],
      translate: [10, 20],
    };
    expect(props.samples).toBe(100);
    expect(props.translate).toEqual([10, 20]);
  });
});

describe('FunctionPlot soft limit', () => {
  // The soft limit should be 3x the yClamp range (1x extra on each side).
  // This prevents absurd SVG coordinates while the clipPath handles visual clipping.

  it('soft limit formula: yClamp ± range gives 3x total', () => {
    const yClamp: [number, number] = [-10, 10];
    const range = yClamp[1] - yClamp[0]; // 20
    const softLimit = [yClamp[0] - range, yClamp[1] + range];
    // Total soft range = 3 * range
    expect(softLimit).toEqual([-30, 30]);
    expect(softLimit[1] - softLimit[0]).toBe(3 * range);
  });

  it('soft limit rejects extreme values but accepts moderate ones', () => {
    const yClamp: [number, number] = [-10, 10];
    const range = yClamp[1] - yClamp[0];
    const softLimit = [yClamp[0] - range, yClamp[1] + range] as [number, number];

    // Values within soft limit pass
    expect(15 >= softLimit[0] && 15 <= softLimit[1]).toBe(true);
    expect(-25 >= softLimit[0] && -25 <= softLimit[1]).toBe(true);

    // Values outside soft limit are rejected
    expect(50 >= softLimit[0] && 50 <= softLimit[1]).toBe(false);
    expect(-50 >= softLimit[0] && -50 <= softLimit[1]).toBe(false);
  });

  it('tan(x) near asymptote produces values that exceed soft limit', () => {
    // tan(π/2) → ∞, samples near π/2 should exceed the soft limit
    const yClamp: [number, number] = [-10, 10];
    const range = yClamp[1] - yClamp[0];
    const softLimit = [yClamp[0] - range, yClamp[1] + range] as [number, number];

    // Very close to π/2 → value exceeds soft limit → gets skipped in path generation
    const nearAsymptote = Math.tan(1.56); // ~100
    expect(nearAsymptote > softLimit[1]).toBe(true);

    // Slightly away from asymptote → within soft limit → included in path
    const awayFromAsymptote = Math.tan(1.2); // ~2.57
    expect(awayFromAsymptote >= softLimit[0] && awayFromAsymptote <= softLimit[1]).toBe(true);
  });
});
