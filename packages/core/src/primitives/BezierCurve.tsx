import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface BezierCurveProps extends AnimationProps, SpatialProps, BaseElementProps {
  /** Start point x */
  x1: number;
  /** Start point y */
  y1: number;
  /** First control point x */
  cx1: number;
  /** First control point y */
  cy1: number;
  /** Second control point x (cubic). If omitted, renders a quadratic Bezier. */
  cx2?: number;
  /** Second control point y (cubic). If omitted, renders a quadratic Bezier. */
  cy2?: number;
  /** End point x */
  x2: number;
  /** End point y */
  y2: number;
  /** Stroke color. Default: '#fff' */
  stroke?: string;
  /** Stroke width. Default: 2 */
  strokeWidth?: number;
  /** Fill color. Default: 'none' */
  fill?: string;
  /** Base opacity. Default: 1 */
  opacity?: number;
  /** SVG stroke-dasharray for dashed curves, e.g. "6 3" */
  strokeDasharray?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  startCap?: 'none' | 'arrow' | 'dot';
  endCap?: 'none' | 'arrow' | 'dot';
}

/**
 * Approximate the length of a cubic Bezier curve using line-segment subdivision.
 */
function approximateCubicLength(
  x1: number, y1: number,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  x2: number, y2: number,
  segments = 64,
): number {
  let length = 0;
  let prevX = x1;
  let prevY = y1;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const x = mt * mt * mt * x1 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x2;
    const y = mt * mt * mt * y1 + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * y2;
    length += Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
    prevX = x;
    prevY = y;
  }
  return length;
}

/**
 * Approximate the length of a quadratic Bezier curve using line-segment subdivision.
 */
function approximateQuadraticLength(
  x1: number, y1: number,
  cx: number, cy: number,
  x2: number, y2: number,
  segments = 64,
): number {
  let length = 0;
  let prevX = x1;
  let prevY = y1;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
    const y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
    length += Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
    prevX = x;
    prevY = y;
  }
  return length;
}

/**
 * SVG Bezier curve with animation support.
 *
 * Supports both quadratic (one control point) and cubic (two control points) Bezier curves.
 * When `cx2` and `cy2` are provided, a cubic Bezier is rendered; otherwise a quadratic Bezier.
 */
export function BezierCurve({
  x1,
  y1,
  cx1,
  cy1,
  cx2,
  cy2,
  x2,
  y2,
  stroke = '#fff',
  strokeWidth = 2,
  fill = 'none',
  opacity: baseOpacity = 1,
  strokeDasharray: userDasharray,
  lineStyle = 'solid',
  strokeLinecap = 'round',
  strokeLinejoin = 'round',
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
}: BezierCurveProps) {
  const isCubic = cx2 !== undefined && cy2 !== undefined;

  const curveLength = isCubic
    ? approximateCubicLength(x1, y1, cx1, cy1, cx2!, cy2!, x2, y2)
    : approximateQuadraticLength(x1, y1, cx1, cy1, x2, y2);

  const anim = useAnimation({ fadeIn, fadeOut, draw, easing }, curveLength);

  const d = isCubic
    ? `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
    : `M ${x1} ${y1} Q ${cx1} ${cy1}, ${x2} ${y2}`;

  // draw animation dasharray takes precedence; otherwise use user-provided
  const styleDasharray = lineStyle === 'dashed' ? '8 6' : lineStyle === 'dotted' ? '1 6' : undefined;
  const dasharray = anim.strokeDasharray ?? userDasharray ?? styleDasharray;

  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const controlX2 = cx2 ?? cx1;
  const controlY2 = cy2 ?? cy1;

  const finalOpacity = baseOpacity * anim.opacity;
  const capRadius = Math.max(2, strokeWidth * 1.7);
  const startTangent = isCubic ? { x: cx1 - x1, y: cy1 - y1 } : { x: cx1 - x1, y: cy1 - y1 };
  const startAngle = Math.atan2(startTangent.y, startTangent.x) + Math.PI;
  const endTangent = isCubic ? { x: x2 - cx2!, y: y2 - cy2! } : { x: x2 - cx1, y: y2 - cy1 };
  const endAngle = Math.atan2(endTangent.y, endTangent.x);
  const headSize = Math.max(8, strokeWidth * 4);
  const headAngle = Math.PI / 6;
  const s1x = x1 - headSize * Math.cos(startAngle - headAngle);
  const s1y = y1 - headSize * Math.sin(startAngle - headAngle);
  const s2x = x1 - headSize * Math.cos(startAngle + headAngle);
  const s2y = y1 - headSize * Math.sin(startAngle + headAngle);
  const p1x = x2 - headSize * Math.cos(endAngle - headAngle);
  const p1y = y2 - headSize * Math.sin(endAngle - headAngle);
  const p2x = x2 - headSize * Math.cos(endAngle + headAngle);
  const p2y = y2 - headSize * Math.sin(endAngle + headAngle);

  const el = (
    <g data-testid="elucim-bezier-curve" opacity={finalOpacity}>
      <path
        d={d}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={fill}
        strokeDasharray={dasharray}
        strokeDashoffset={anim.strokeDashoffset}
        strokeLinecap={strokeLinecap}
        strokeLinejoin={strokeLinejoin}
      />
      {startCap === 'dot' && <circle cx={x1} cy={y1} r={capRadius} fill={stroke} />}
      {endCap === 'dot' && <circle cx={x2} cy={y2} r={capRadius} fill={stroke} />}
      {startCap === 'arrow' && <polygon points={`${x1},${y1} ${s1x},${s1y} ${s2x},${s2y}`} fill={stroke} />}
      {endCap === 'arrow' && <polygon points={`${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`} fill={stroke} />}
    </g>
  );

  return withTransform(
    el,
    { rotation, rotationOrigin, scale, translate },
    [centerX, centerY],
    [Math.min(x1, cx1, controlX2, x2), Math.min(y1, cy1, controlY2, y2)]
  );
}
