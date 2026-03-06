import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface CircleProps extends AnimationProps, SpatialProps, BaseElementProps {
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export function Circle({
  cx,
  cy,
  r,
  fill = 'none',
  stroke = '#fff',
  strokeWidth = 2,
  opacity: baseOpacity = 1,
  fadeIn,
  fadeOut,
  draw,
  easing,
  rotation,
  rotationOrigin,
  scale,
  translate,
}: CircleProps) {
  const circumference = 2 * Math.PI * r;
  const anim = useAnimation({ fadeIn, fadeOut, draw, easing }, circumference);

  const el = (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={baseOpacity * anim.opacity}
      strokeDasharray={anim.strokeDasharray}
      strokeDashoffset={anim.strokeDashoffset}
      data-testid="elucim-circle"
    />
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate }, [cx, cy]);
}
