import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface LineProps extends AnimationProps, SpatialProps, BaseElementProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  /** SVG stroke-dasharray for dashed lines, e.g. "6 3" */
  strokeDasharray?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  strokeLinecap?: 'butt' | 'round' | 'square';
  startCap?: 'none' | 'arrow' | 'dot';
  endCap?: 'none' | 'arrow' | 'dot';
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
  lineStyle = 'solid',
  strokeLinecap = lineStyle === 'dotted' ? 'round' : 'butt',
  startCap = 'none',
  endCap = 'none',
  fadeIn,
  fadeOut,
  draw,
  easing,
  rotation,
  rotationOrigin,
  scale,
  translate,
}: LineProps) {
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const anim = useAnimation({ fadeIn, fadeOut, draw, easing }, length);

  // draw animation dasharray takes precedence; otherwise use user-provided
  const styleDasharray = lineStyle === 'dashed' ? '8 6' : lineStyle === 'dotted' ? '1 6' : undefined;
  const dasharray = anim.strokeDasharray ?? userDasharray ?? styleDasharray;

  const finalOpacity = baseOpacity * anim.opacity;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const capRadius = Math.max(2, strokeWidth * 1.7);
  const arrowHead = (x: number, y: number, theta: number) => {
    const headSize = Math.max(8, strokeWidth * 4);
    const headAngle = Math.PI / 6;
    const p1x = x - headSize * Math.cos(theta - headAngle);
    const p1y = y - headSize * Math.sin(theta - headAngle);
    const p2x = x - headSize * Math.cos(theta + headAngle);
    const p2y = y - headSize * Math.sin(theta + headAngle);
    return `${x},${y} ${p1x},${p1y} ${p2x},${p2y}`;
  };

  const el = (
    <g data-testid="elucim-line" opacity={finalOpacity}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
        strokeDashoffset={anim.strokeDashoffset}
        strokeLinecap={strokeLinecap}
      />
      {startCap === 'dot' && <circle cx={x1} cy={y1} r={capRadius} fill={stroke} />}
      {endCap === 'dot' && <circle cx={x2} cy={y2} r={capRadius} fill={stroke} />}
      {startCap === 'arrow' && <polygon points={arrowHead(x1, y1, angle + Math.PI)} fill={stroke} />}
      {endCap === 'arrow' && <polygon points={arrowHead(x2, y2, angle)} fill={stroke} />}
    </g>
  );

  return withTransform(
    el,
    { rotation, rotationOrigin, scale, translate },
    [(x1 + x2) / 2, (y1 + y2) / 2],
    [Math.min(x1, x2), Math.min(y1, y2)]
  );
}
