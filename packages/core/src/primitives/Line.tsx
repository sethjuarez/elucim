import React from 'react';
import { useAnimation, type AnimationProps } from './animation';

export interface LineProps extends AnimationProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  /** SVG stroke-dasharray for dashed lines, e.g. "6 3" */
  strokeDasharray?: string;
}

export function Line({
  x1,
  y1,
  x2,
  y2,
  stroke = '#fff',
  strokeWidth = 2,
  opacity: baseOpacity = 1,
  strokeDasharray: userDasharray,
  fadeIn,
  fadeOut,
  draw,
  easing,
}: LineProps) {
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const anim = useAnimation({ fadeIn, fadeOut, draw, easing }, length);

  // draw animation dasharray takes precedence; otherwise use user-provided
  const dasharray = anim.strokeDasharray ?? userDasharray;

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={baseOpacity * anim.opacity}
      strokeDasharray={dasharray}
      strokeDashoffset={anim.strokeDashoffset}
      data-testid="elucim-line"
    />
  );
}
