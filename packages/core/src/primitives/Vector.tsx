import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface VectorProps extends AnimationProps, SpatialProps, BaseElementProps {
  /** Start point in math coordinates [x, y] */
  from?: [number, number];
  /** End point in math coordinates [x, y] */
  to: [number, number];
  /** Origin of coordinate system in SVG pixels */
  origin?: [number, number];
  /** Pixels per unit. Default: 40 */
  scale?: number;
  /** Arrow color. Default: '#ffe66d' */
  color?: string;
  /** Stroke width. Default: 2.5 */
  strokeWidth?: number;
  /** Arrowhead size. Default: 10 */
  headSize?: number;
  /** Optional label text */
  label?: string;
  /** Label offset from arrow tip [dx, dy] in px. Default: [8, -8] */
  labelOffset?: [number, number];
  /** Label color. Default: same as color */
  labelColor?: string;
  /** Label font size. Default: 16 */
  labelFontSize?: number;
}

/**
 * A mathematical vector arrow, rendered in Axes coordinate space.
 */
export function Vector({
  from = [0, 0],
  to,
  origin = [400, 300],
  scale = 40,
  color = '#ffe66d',
  strokeWidth = 2.5,
  headSize = 10,
  label,
  labelOffset = [8, -8],
  labelColor,
  labelFontSize = 16,
  fadeIn,
  fadeOut,
  draw,
  easing,
  rotation,
  rotationOrigin,
  translate,
}: VectorProps) {
  const [ox, oy] = origin;
  const x1 = ox + from[0] * scale;
  const y1 = oy - from[1] * scale;
  const x2 = ox + to[0] * scale;
  const y2 = oy - to[1] * scale;

  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  // Arrowhead geometry
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headAngle = Math.PI / 6;
  const p1x = x2 - headSize * Math.cos(angle - headAngle);
  const p1y = y2 - headSize * Math.sin(angle - headAngle);
  const p2x = x2 - headSize * Math.cos(angle + headAngle);
  const p2y = y2 - headSize * Math.sin(angle + headAngle);

  // Shorten line to stop at arrowhead base so the stroke doesn't poke through
  const baseOffset = headSize * Math.cos(headAngle);
  const showLine = length > baseOffset;
  const lineEndX = x2 - baseOffset * Math.cos(angle);
  const lineEndY = y2 - baseOffset * Math.sin(angle);

  const lineLength = showLine ? length - baseOffset : 0;
  const anim = useAnimation({ fadeIn, fadeOut, draw, easing }, lineLength);

  const el = (
    <g opacity={anim.opacity} data-testid="elucim-vector">
      {showLine && (
        <line
          x1={x1}
          y1={y1}
          x2={lineEndX}
          y2={lineEndY}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={anim.strokeDasharray}
          strokeDashoffset={anim.strokeDashoffset}
        />
      )}
      <polygon
        points={`${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`}
        fill={color}
      />
      {label && (
        <text
          x={x2 + labelOffset[0]}
          y={y2 + labelOffset[1]}
          fill={labelColor ?? color}
          fontSize={labelFontSize}
          fontFamily="serif"
          fontStyle="italic"
          data-testid="elucim-vector-label"
        >
          {label}
        </text>
      )}
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, translate }, [(x1 + x2) / 2, (y1 + y2) / 2]);
}
