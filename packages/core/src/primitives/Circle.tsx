import React from 'react';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface CircleProps extends SpatialProps, BaseElementProps {
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
  rotation,
  rotationOrigin,
  scale,
  translate,
}: CircleProps) {
  const el = (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={baseOpacity}
      data-testid="elucim-circle"
    />
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate }, [cx, cy], [cx - r, cy - r]);
}
