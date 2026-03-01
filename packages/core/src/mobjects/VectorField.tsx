import React, { useMemo } from 'react';
import { useAnimation, type AnimationProps } from './animation';

export interface VectorFieldProps extends AnimationProps {
  /** Function mapping (x, y) → [dx, dy] direction vector */
  fn: (x: number, y: number) => [number, number];
  /** X domain [min, max]. Default: [-4, 4] */
  domain?: [number, number];
  /** Y range [min, max]. Default: [-4, 4] */
  range?: [number, number];
  /** Grid spacing in math units. Default: 1 */
  step?: number;
  /** Origin in SVG coordinates. Default: [400, 300] */
  origin?: [number, number];
  /** Pixels per unit. Default: 40 */
  scale?: number;
  /** Arrow length scale factor. Default: 0.8 */
  arrowScale?: number;
  /** Arrow color. Default: '#4a9eff' */
  color?: string;
  /** Stroke width. Default: 1.5 */
  strokeWidth?: number;
  /** Arrowhead size. Default: 4 */
  headSize?: number;
  /** Whether to normalize arrow lengths. Default: false */
  normalize?: boolean;
  /** Max arrow length in math units (for clamping). Default: 1.5 */
  maxLength?: number;
}

/**
 * Renders a grid of arrows representing a 2D vector field.
 */
export function VectorField({
  fn,
  domain = [-4, 4],
  range = [-4, 4],
  step = 1,
  origin = [400, 300],
  scale = 40,
  arrowScale = 0.8,
  color = '#4a9eff',
  strokeWidth = 1.5,
  headSize = 4,
  normalize = false,
  maxLength = 1.5,
  fadeIn,
  fadeOut,
  easing,
}: VectorFieldProps) {
  const anim = useAnimation({ fadeIn, fadeOut, easing });
  const [ox, oy] = origin;

  const arrows = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number; mag: number }[] = [];

    for (let x = domain[0]; x <= domain[1]; x += step) {
      for (let y = range[0]; y <= range[1]; y += step) {
        const [dx, dy] = fn(x, y);
        if (!isFinite(dx) || !isFinite(dy)) continue;

        let mag = Math.sqrt(dx * dx + dy * dy);
        if (mag === 0) continue;

        let ndx = dx;
        let ndy = dy;

        if (normalize) {
          ndx = dx / mag;
          ndy = dy / mag;
          mag = 1;
        }

        // Clamp length
        if (mag > maxLength) {
          const ratio = maxLength / mag;
          ndx *= ratio;
          ndy *= ratio;
          mag = maxLength;
        }

        const svgX = ox + x * scale;
        const svgY = oy - y * scale;
        const svgDx = ndx * scale * arrowScale;
        const svgDy = -ndy * scale * arrowScale;

        result.push({
          x1: svgX,
          y1: svgY,
          x2: svgX + svgDx,
          y2: svgY + svgDy,
          mag,
        });
      }
    }

    return result;
  }, [fn, domain, range, step, ox, oy, scale, arrowScale, normalize, maxLength]);

  return (
    <g opacity={anim.opacity} data-testid="elucim-vector-field">
      {arrows.map((a, i) => {
        const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
        const ha = Math.PI / 6;
        const p1x = a.x2 - headSize * Math.cos(angle - ha);
        const p1y = a.y2 - headSize * Math.sin(angle - ha);
        const p2x = a.x2 - headSize * Math.cos(angle + ha);
        const p2y = a.y2 - headSize * Math.sin(angle + ha);

        return (
          <g key={i}>
            <line
              x1={a.x1}
              y1={a.y1}
              x2={a.x2}
              y2={a.y2}
              stroke={color}
              strokeWidth={strokeWidth}
              opacity={0.6 + 0.4 * Math.min(a.mag / maxLength, 1)}
            />
            <polygon
              points={`${a.x2},${a.y2} ${p1x},${p1y} ${p2x},${p2y}`}
              fill={color}
              opacity={0.6 + 0.4 * Math.min(a.mag / maxLength, 1)}
            />
          </g>
        );
      })}
    </g>
  );
}
