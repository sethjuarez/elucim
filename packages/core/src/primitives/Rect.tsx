import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface RectProps extends AnimationProps, SpatialProps, BaseElementProps {
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
  /** SVG stroke-dasharray for dashed rectangles, e.g. "6 3" */
  strokeDasharray?: string;
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
  strokeDasharray: userDasharray,
  fadeIn,
  fadeOut,
  draw,
  easing,
  rotation,
  rotationOrigin,
  scale,
  translate,
}: RectProps) {
  const perimeter = 2 * (width + height);
  const anim = useAnimation({ fadeIn, fadeOut, draw, easing }, perimeter);

  const dasharray = anim.strokeDasharray ?? userDasharray;

  const el = (
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
      strokeDasharray={dasharray}
      strokeDashoffset={anim.strokeDashoffset}
      data-testid="elucim-rect"
    />
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate }, [x + width / 2, y + height / 2]);
}
