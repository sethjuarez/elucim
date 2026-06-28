/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DslRenderer } from '../renderer/DslRenderer';
import { validate } from '../validator/validate';
import { applyTimelineFrame, type ElucimDocument } from '../document';

describe('calculus DSL nodes', () => {
  const wrap = (child: unknown) => ({
    version: 'render-tree',
    root: { type: 'scene', durationInFrames: 60, children: [child] },
  });

  it('validates calculus math nodes', () => {
    expect(validate(wrap({ type: 'secantLine', fn: 'x^2', x: 1, dx: 0.5 })).valid).toBe(true);
    expect(validate(wrap({ type: 'tangentLine', fn: 'sin(x)', derivative: 'cos(x)', x: 0 })).valid).toBe(true);
    expect(validate(wrap({ type: 'riemannSum', fn: 'x^2', interval: [0, 2], n: 4, method: 'midpoint' })).valid).toBe(true);
    expect(validate(wrap({ type: 'accumulationArea', fn: 'x', from: 0, to: 2 })).valid).toBe(true);
  });

  it('rejects invalid calculus node inputs', () => {
    const badDx = validate(wrap({ type: 'secantLine', fn: 'x^2', x: 1, dx: 0 }));
    const badMethod = validate(wrap({ type: 'riemannSum', fn: 'x^2', interval: [0, 2], n: 4, method: 'trapezoid' }));

    expect(badDx.valid).toBe(false);
    expect(badDx.errors.some(error => error.path.endsWith('.dx'))).toBe(true);
    expect(badMethod.valid).toBe(false);
    expect(badMethod.errors.some(error => error.path.endsWith('.method'))).toBe(true);
  });

  it('renders calculus nodes through the DSL renderer', () => {
    const { container } = render(
      <DslRenderer
        dsl={{
          version: 'render-tree',
          root: {
            type: 'scene',
            durationInFrames: 60,
            width: 400,
            height: 300,
            children: [
              { type: 'secantLine', fn: 'x^2', x: 1, dx: 1, length: 2, origin: [0, 0], scale: 10, showPoints: true },
              { type: 'tangentLine', fn: 'x^2', derivative: '2*x', x: 1, length: 2, origin: [0, 0], scale: 10 },
              { type: 'riemannSum', fn: 'x^2', interval: [0, 2], n: 2, origin: [0, 100], scale: 10 },
              { type: 'accumulationArea', fn: 'x', from: 0, to: 2, samples: 2, origin: [0, 100], scale: 10 },
            ],
          },
        }}
      />,
    );

    expect(container.querySelector('[data-testid="dsl-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="elucim-secant-line"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="elucim-tangent-line"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="elucim-riemann-sum"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="elucim-accumulation-area"]')).toBeTruthy();
  });

  it('animates calculus parameters in canonical document timelines', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 400, height: 300, children: ['secant'] },
      elements: {
        secant: {
          id: 'secant',
          type: 'secantLine',
          props: { type: 'secantLine', fn: 'x^2', x: 1, dx: 1, length: 2, origin: [0, 0], scale: 10 },
        },
      },
      timelines: {
        shrink: {
          id: 'shrink',
          duration: 20,
          tracks: [{ target: 'secant', property: 'dx', keyframes: [{ frame: 0, value: 1 }, { frame: 20, value: 0.1 }] }],
        },
      },
    };

    const patched = applyTimelineFrame(doc, 'shrink', 10);
    expect(patched.elements.secant.props.dx).toBeCloseTo(0.55);
  });

  it('renders interpolated Riemann rectangle counts from canonical timelines', () => {
    const { container } = render(
      <DslRenderer
        poster={5}
        dsl={{
          version: '2.0',
          scene: { type: 'player', width: 400, height: 300, children: ['sum'] },
          elements: {
            sum: {
              id: 'sum',
              type: 'riemannSum',
              props: { type: 'riemannSum', fn: 'x', interval: [0, 3], n: 2, origin: [0, 100], scale: 10 },
            },
          },
          timelines: {
            refine: {
              id: 'refine',
              duration: 10,
              tracks: [{ target: 'sum', property: 'n', keyframes: [{ frame: 0, value: 2 }, { frame: 10, value: 5 }] }],
            },
          },
        }}
      />,
    );

    expect(container.querySelector('[data-testid="dsl-error"]')).toBeNull();
    expect(container.querySelectorAll('[data-testid="elucim-riemann-sum"] rect')).toHaveLength(4);
  });
});
