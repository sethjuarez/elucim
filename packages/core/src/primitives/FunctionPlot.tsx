import React, { useId, useMemo } from 'react';
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
  const clipId = useId();

  // Generate the path data
  // Use a generous soft limit to prevent absurd SVG coordinates, while the
  // clipPath handles the precise visual clipping at yClamp boundaries.
  const softLimit = useMemo(() => {
    const range = yClamp[1] - yClamp[0];
    return [yClamp[0] - range * 2, yClamp[1] + range * 2] as [number, number];
  }, [yClamp]);

  const pathData = useMemo(() => {
    const [xMin, xMax] = domain;
    const step = (xMax - xMin) / samples;
    const [ox, oy] = origin;
    const points: string[] = [];
    let needsMove = true;

    for (let i = 0; i <= samples; i++) {
      const x = xMin + i * step;
      const y = fn(x);

      // Skip non-finite or extreme values; start a new sub-path after gaps
      if (!isFinite(y) || y < softLimit[0] || y > softLimit[1]) {
        needsMove = true;
        continue;
      }

      const svgX = ox + x * scale;
      const svgY = oy - y * scale;

      if (needsMove) {
        points.push(`M ${svgX} ${svgY}`);
        needsMove = false;
      } else {
        points.push(`L ${svgX} ${svgY}`);
      }
    }

    return points.join(' ');
  }, [fn, domain, softLimit, origin, scale, samples]);

  // Approximate total path length for draw animation
  const approxLength = useMemo(() => {
    const [xMin, xMax] = domain;
    const step = (xMax - xMin) / samples;
    let len = 0;
    let prevX = 0;
    let prevY = 0;
    let hasPrev = false;

    for (let i = 0; i <= samples; i++) {
      const x = xMin + i * step;
      const y = fn(x);
      if (!isFinite(y) || y < softLimit[0] || y > softLimit[1]) {
        hasPrev = false;
        continue;
      }

      const svgX = origin[0] + x * scale;
      const svgY = origin[1] - y * scale;

      if (hasPrev) {
        len += Math.sqrt((svgX - prevX) ** 2 + (svgY - prevY) ** 2);
      }
      prevX = svgX;
      prevY = svgY;
      hasPrev = true;
    }
    return len;
  }, [fn, domain, softLimit, origin, scale, samples]);

  // Clip rect: visible region based on domain and yClamp
  const clipRect = useMemo(() => {
    const [ox, oy] = origin;
    const [xMin, xMax] = domain;
    const svgLeft = ox + xMin * scale;
    const svgRight = ox + xMax * scale;
    const svgTop = oy - yClamp[1] * scale;
    const svgBottom = oy - yClamp[0] * scale;
    return { x: svgLeft, y: svgTop, width: svgRight - svgLeft, height: svgBottom - svgTop };
  }, [origin, domain, yClamp, scale]);

  // Compute draw progress
  let dashArray: string | undefined;
  let dashOffset: number | undefined;

  if (draw !== undefined && draw > 0) {
    const progress = interpolate(frame, [0, draw], [0, 1], { easing });
    dashArray = `${approxLength}`;
    dashOffset = approxLength * (1 - progress);
  }

  const el = (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={clipRect.x} y={clipRect.y} width={clipRect.width} height={clipRect.height} />
        </clipPath>
      </defs>
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
        clipPath={`url(#${clipId})`}
        data-testid="elucim-function-plot"
      />
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, translate }, origin);
}
