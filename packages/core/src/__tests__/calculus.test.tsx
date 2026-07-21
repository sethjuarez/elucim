import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ElucimContext } from '../context';
import {
  AccumulationArea,
  RiemannSum,
  SecantLine,
  TangentLine,
  type RiemannSumProps,
  type SecantLineProps,
  type TangentLineProps,
} from '../primitives/Calculus';

function renderPrimitive(element: React.ReactElement): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    <ElucimContext.Provider value={{ frame: 0, fps: 30, durationInFrames: 60, width: 800, height: 600 }}>
      <svg>{element}</svg>
    </ElucimContext.Provider>,
  );
  return container;
}

describe('calculus primitives', () => {
  it('exports secant, tangent, Riemann sum, and accumulation primitives', () => {
    expect(typeof SecantLine).toBe('function');
    expect(typeof TangentLine).toBe('function');
    expect(typeof RiemannSum).toBe('function');
    expect(typeof AccumulationArea).toBe('function');
  });

  it('supports secant line props as math-space inputs', () => {
    const props: SecantLineProps = {
      fn: x => x * x,
      x: 1,
      dx: 1,
      origin: [0, 0],
      scale: 10,
    };
    expect(props.fn(props.x + props.dx)).toBe(4);
  });

  it('renders a secant line between two sampled points', () => {
    const container = renderPrimitive(
      <SecantLine fn={x => x * x} x={1} dx={1} length={2} origin={[0, 0]} scale={10} showPoints />,
    );

    const line = container.querySelector('[data-testid="elucim-secant-line"] line');
    expect(line?.getAttribute('x1')).toBe('5');
    expect(line?.getAttribute('y1')).toBe('5');
    expect(line?.getAttribute('x2')).toBe('25');
    expect(line?.getAttribute('y2')).toBe('-55');
    expect(container.querySelectorAll('[data-testid="elucim-secant-line"] circle')).toHaveLength(2);
  });

  it('renders a tangent line from an exact derivative when supplied', () => {
    const props: TangentLineProps = {
      fn: Math.sin,
      derivative: Math.cos,
      x: 0,
      length: 2,
      origin: [0, 0],
      scale: 10,
    };
    const container = renderPrimitive(<TangentLine {...props} />);
    const line = container.querySelector('[data-testid="elucim-tangent-line"] line');

    expect(line?.getAttribute('x1')).toBe('-10');
    expect(line?.getAttribute('y1')).toBe('10');
    expect(line?.getAttribute('x2')).toBe('10');
    expect(line?.getAttribute('y2')).toBe('-10');
  });

  it('renders midpoint Riemann rectangles in math space', () => {
    const props: RiemannSumProps = {
      fn: x => x * x,
      interval: [0, 2],
      n: 2,
      method: 'midpoint',
      origin: [0, 100],
      scale: 10,
    };
    const container = renderPrimitive(<RiemannSum {...props} />);
    const rects = container.querySelectorAll('[data-testid="elucim-riemann-sum"] rect');

    expect(rects).toHaveLength(2);
    expect(rects[0].getAttribute('x')).toBe('0');
    expect(rects[0].getAttribute('y')).toBe('97.5');
    expect(rects[0].getAttribute('width')).toBe('10');
    expect(rects[0].getAttribute('height')).toBe('2.5');
    expect(rects[1].getAttribute('x')).toBe('10');
    expect(rects[1].getAttribute('y')).toBe('77.5');
    expect(rects[1].getAttribute('height')).toBe('22.5');
  });

  it('rounds fractional Riemann counts so timeline interpolation stays renderable', () => {
    const container = renderPrimitive(
      <RiemannSum fn={x => x} interval={[0, 3]} n={2.6} origin={[0, 100]} scale={10} />,
    );

    expect(container.querySelectorAll('[data-testid="elucim-riemann-sum"] rect')).toHaveLength(3);
  });

  it('renders an accumulation area path closed against the x-axis', () => {
    const container = renderPrimitive(
      <AccumulationArea fn={x => x} from={0} to={2} samples={2} origin={[0, 100]} scale={10} />,
    );
    const path = container.querySelector('[data-testid="elucim-accumulation-area"]');

    expect(path?.getAttribute('d')).toBe('M 0 100 L 0 100 L 10 90 L 20 80 L 20 100 Z');
  });

  it('preserves explicit stroke styling on accumulation areas', () => {
    const container = renderPrimitive(
      <AccumulationArea fn={x => x} from={0} to={2} samples={2} origin={[0, 100]} scale={10} strokeWidth={3} />,
    );
    const path = container.querySelector('[data-testid="elucim-accumulation-area"]');

    expect(path?.getAttribute('stroke-width')).toBe('3');
  });

  it('keeps sampled composites renderable when a function sample is non-finite', () => {
    const container = renderPrimitive(
      <>
        <RiemannSum fn={x => 1 / x} interval={[-1, 1]} n={2} origin={[0, 100]} scale={10} />
        <AccumulationArea fn={x => 1 / x} from={-1} to={1} samples={2} origin={[0, 100]} scale={10} />
      </>,
    );

    expect(container.querySelector('[data-testid="elucim-riemann-sum"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="elucim-accumulation-area"]')).toBeTruthy();
  });

  it('rejects invalid calculus inputs explicitly', () => {
    expect(() => renderToStaticMarkup(
      <ElucimContext.Provider value={{ frame: 0, fps: 30, durationInFrames: 60, width: 800, height: 600 }}>
        <svg><SecantLine fn={x => x} x={1} dx={0} /></svg>
      </ElucimContext.Provider>,
    )).toThrow('dx must be non-zero');
  });
});
