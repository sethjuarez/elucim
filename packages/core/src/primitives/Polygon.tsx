import React from 'react';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface PolygonProps extends SpatialProps, BaseElementProps {
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
 * SVG polygon or polyline.
 */
export function Polygon({
  points,
  fill = 'none',
  stroke = '#fff',
  strokeWidth = 2,
  opacity: baseOpacity = 1,
  closed = true,
  rotation,
  rotationOrigin,
  scale,
  translate,
}: PolygonProps) {
  const pointsStr = points.map(([x, y]) => `${x},${y}`).join(' ');

  const Element = closed ? 'polygon' : 'polyline';

  const xs = points.map(([px]) => px);
  const ys = points.map(([, py]) => py);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const topLeftX = Math.min(...xs);
  const topLeftY = Math.min(...ys);

  const el = (
    <Element
      points={pointsStr}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={baseOpacity}
      strokeLinejoin="round"
      data-testid="elucim-polygon"
    />
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate }, [centerX, centerY], [topLeftX, topLeftY]);
}
