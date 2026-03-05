import React from 'react';
import { useAnimation, type AnimationProps } from './animation';

export interface PolygonProps extends AnimationProps {
  /** Array of [x, y] points */
  points: [number, number][];
  /** Fill color. Default: 'none' */
  fill?: string;
  /** Stroke color. Default: '#fff' */
  stroke?: string;
  /** Stroke width. Default: 2 */
  strokeWidth?: number;
  /** Base opacity. Default: 1 */
  opacity?: number;
  /** Close the polygon path. Default: true */
  closed?: boolean;
}

/**
 * SVG polygon or polyline with animation support.
 */
export function Polygon({
  points,
  fill = 'none',
  stroke = '#fff',
  strokeWidth = 2,
  opacity: baseOpacity = 1,
  closed = true,
  fadeIn,
  fadeOut,
  draw,
  easing,
}: PolygonProps) {
  // Compute perimeter for draw animation
  let perimeter = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  if (closed && points.length > 1) {
    const dx = points[0][0] - points[points.length - 1][0];
    const dy = points[0][1] - points[points.length - 1][1];
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  const anim = useAnimation({ fadeIn, fadeOut, draw, easing }, perimeter);
  const pointsStr = points.map(([x, y]) => `${x},${y}`).join(' ');

  const Element = closed ? 'polygon' : 'polyline';

  return (
    <Element
      points={pointsStr}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={baseOpacity * anim.opacity}
      strokeDasharray={anim.strokeDasharray}
      strokeDashoffset={anim.strokeDashoffset}
      strokeLinejoin="round"
      data-testid="elucim-polygon"
    />
  );
}
