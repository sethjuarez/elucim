import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect } from 'vitest';
import { BezierCurve, type BezierCurveProps } from '../primitives/BezierCurve';
import { ElucimContext } from '../context';

async function renderCurve(props: BezierCurveProps): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    ReactDOM.createRoot(container).render(
      <ElucimContext.Provider value={{ frame: 0, fps: 30, durationInFrames: 60, width: 800, height: 600 }}>
        <svg><BezierCurve {...props} /></svg>
      </ElucimContext.Provider>,
    );
  });
  return container;
}

function polygonPoints(polygon: Element): Array<{ x: number; y: number }> {
  const points = polygon.getAttribute('points');
  if (!points) throw new Error('Expected polygon points.');
  return points.split(' ').map(point => {
    const [x, y] = point.split(',').map(Number);
    return { x, y };
  });
}

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

  it('accepts line styling and caps', () => {
    const props: BezierCurveProps = {
      x1: 0, y1: 0, cx1: 40, cy1: 0, cx2: 60, cy2: 100, x2: 100, y2: 100,
      lineStyle: 'dashed',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      endCap: 'arrow',
    };
    expect(props.endCap).toBe('arrow');
  });

  it('renders dot and arrow caps', async () => {
    const container = await renderCurve({
      x1: 0, y1: 0, cx1: 40, cy1: 0, cx2: 60, cy2: 100, x2: 100, y2: 100,
      stroke: '#fff',
      startCap: 'dot',
      endCap: 'arrow',
    });

    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(container.querySelectorAll('polygon')).toHaveLength(1);
  });

  it('orients arrow caps from fallback tangents when handles sit on endpoints', async () => {
    const container = await renderCurve({
      x1: 0, y1: 0, cx1: 0, cy1: 0, cx2: 100, cy2: 100, x2: 100, y2: 100,
      stroke: '#fff',
      strokeWidth: 2,
      startCap: 'arrow',
      endCap: 'arrow',
    });

    const [startArrow, endArrow] = Array.from(container.querySelectorAll('polygon'));
    const startPoints = polygonPoints(startArrow);
    const endPoints = polygonPoints(endArrow);

    expect(startPoints[0]).toEqual({ x: 0, y: 0 });
    expect(endPoints[0]).toEqual({ x: 100, y: 100 });
    expect(startPoints.slice(1).every(point => point.x > 0 && point.y > 0)).toBe(true);
    expect(endPoints.slice(1).every(point => point.x < 100 && point.y < 100)).toBe(true);
  });
});
