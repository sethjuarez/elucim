import React from 'react';
import { useAnimation, type AnimationProps } from './animation';

export interface RectProps extends AnimationProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  ry?: number;
  opacity?: number;
}

export function Rect({
  x,
  y,
  width,
  height,
  fill = 'none',
  stroke = '#fff',
  strokeWidth = 2,
  rx = 0,
  ry = 0,
  opacity: baseOpacity = 1,
  fadeIn,
  fadeOut,
  draw,
  easing,
}: RectProps) {
  const perimeter = 2 * (width + height);
  const anim = useAnimation({ fadeIn, fadeOut, draw, easing }, perimeter);

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      ry={ry}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={baseOpacity * anim.opacity}
      strokeDasharray={anim.strokeDasharray}
      strokeDashoffset={anim.strokeDashoffset}
      data-testid="elucim-rect"
    />
  );
}
