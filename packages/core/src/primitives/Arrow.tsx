import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface ArrowProps extends AnimationProps, SpatialProps, BaseElementProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
  headSize?: number;
  opacity?: number;
  /** SVG stroke-dasharray for dashed arrows, e.g. "6 3" */
  strokeDasharray?: string;
}

export function Arrow({
  x1,
  y1,
  x2,
  y2,
  stroke = '#fff',
  strokeWidth = 2,
  headSize = 10,
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
}: ArrowProps) {
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const anim = useAnimation({ fadeIn, fadeOut, draw, easing }, length);

  // Compute arrowhead points
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headAngle = Math.PI / 6; // 30 degrees
  const p1x = x2 - headSize * Math.cos(angle - headAngle);
  const p1y = y2 - headSize * Math.sin(angle - headAngle);
  const p2x = x2 - headSize * Math.cos(angle + headAngle);
  const p2y = y2 - headSize * Math.sin(angle + headAngle);

  const finalOpacity = baseOpacity * anim.opacity;
  const dasharray = anim.strokeDasharray ?? userDasharray;

  const el = (
    <g data-testid="elucim-arrow" opacity={finalOpacity}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
        strokeDashoffset={anim.strokeDashoffset}
      />
      <polygon
        points={`${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`}
        fill={stroke}
      />
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate }, [(x1 + x2) / 2, (y1 + y2) / 2]);
}
