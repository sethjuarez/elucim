import React, { useMemo } from 'react';
import { useCurrentFrame } from '../hooks/useCurrentFrame';
import { interpolate } from '../hooks/interpolate';
import type { EasingFunction } from '../easing/types';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface FunctionPlotProps extends SpatialProps, BaseElementProps {
  /** The function to plot: (x) => y */
  fn: (x: number) => number;
  /** X domain [min, max]. Default: [-5, 5] */
  domain?: [number, number];
  /** Y clamp range to avoid huge values. Default: [-10, 10] */
  yClamp?: [number, number];
  /** Position of the coordinate origin in SVG pixels [x, y] */
  origin?: [number, number];
  /** Pixels per unit. Default: 40 */
  scale?: number;
  /** Stroke color. Default: '#4a9eff' */
  color?: string;
  /** Stroke width. Default: 2 */
  strokeWidth?: number;
  /** Number of sample points. Default: 200 */
  samples?: number;
  /** Draw animation: progressively reveal the curve over N frames */
  draw?: number;
  /** Easing for the draw animation */
  easing?: EasingFunction;
  /** Base opacity. Default: 1 */
  opacity?: number;
}

/**
 * Plots a continuous mathematical function on Axes coordinates.
 * Supports progressive draw animation.
 */
export function FunctionPlot({
  fn,
  domain = [-5, 5],
  yClamp = [-10, 10],
  origin = [400, 300],
  scale = 40,
  color = '#4a9eff',
  strokeWidth = 2,
  samples = 200,
  draw,
  easing,
  opacity = 1,
  rotation,
  rotationOrigin,
  translate,
}: FunctionPlotProps) {
  const frame = useCurrentFrame();

  // Generate the path data
  const pathData = useMemo(() => {
    const [xMin, xMax] = domain;
    const step = (xMax - xMin) / samples;
    const [ox, oy] = origin;
    const points: string[] = [];

    for (let i = 0; i <= samples; i++) {
      const x = xMin + i * step;
      let y = fn(x);

      // Clamp y to avoid visual overflow
      if (y < yClamp[0]) y = yClamp[0];
      if (y > yClamp[1]) y = yClamp[1];
      if (!isFinite(y)) continue;

      const svgX = ox + x * scale;
      const svgY = oy - y * scale;

      if (points.length === 0) {
        points.push(`M ${svgX} ${svgY}`);
      } else {
        points.push(`L ${svgX} ${svgY}`);
      }
    }

    return points.join(' ');
  }, [fn, domain, yClamp, origin, scale, samples]);

  // Approximate total path length for draw animation
  const approxLength = useMemo(() => {
    const [xMin, xMax] = domain;
    const step = (xMax - xMin) / samples;
    let len = 0;
    let prevX = 0;
    let prevY = 0;

    for (let i = 0; i <= samples; i++) {
      const x = xMin + i * step;
      let y = fn(x);
      if (y < yClamp[0]) y = yClamp[0];
      if (y > yClamp[1]) y = yClamp[1];
      if (!isFinite(y)) continue;

      const svgX = origin[0] + x * scale;
      const svgY = origin[1] - y * scale;

      if (i > 0) {
        len += Math.sqrt((svgX - prevX) ** 2 + (svgY - prevY) ** 2);
      }
      prevX = svgX;
      prevY = svgY;
    }
    return len;
  }, [fn, domain, yClamp, origin, scale, samples]);

  // Compute draw progress
  let dashArray: string | undefined;
  let dashOffset: number | undefined;

  if (draw !== undefined && draw > 0) {
    const progress = interpolate(frame, [0, draw], [0, 1], { easing });
    dashArray = `${approxLength}`;
    dashOffset = approxLength * (1 - progress);
  }

  const el = (
    <path
      d={pathData}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      strokeDasharray={dashArray}
      strokeDashoffset={dashOffset}
      data-testid="elucim-function-plot"
    />
  );

  return withTransform(el, { rotation, rotationOrigin, translate }, origin);
}
