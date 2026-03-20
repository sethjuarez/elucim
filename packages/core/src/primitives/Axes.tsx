import React, { useMemo } from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface AxesProps extends AnimationProps, SpatialProps, BaseElementProps {
  /** X-axis domain [min, max]. Default: [-5, 5] */
  domain?: [number, number];
  /** Y-axis range [min, max]. Default: [-5, 5] */
  range?: [number, number];
  /** Position of origin in SVG coordinates [x, y] */
  origin?: [number, number];
  /** Pixels per unit. Default: 40 */
  scale?: number;
  /** Show grid lines. Default: false */
  showGrid?: boolean;
  /** Show tick marks. Default: true */
  showTicks?: boolean;
  /** Show tick labels. Default: true */
  showLabels?: boolean;
  /** Tick spacing. Default: 1 */
  tickStep?: number;
  /** Axis color. Default: '#888' */
  axisColor?: string;
  /** Grid color. Default: '#333' */
  gridColor?: string;
  /** Label color. Default: '#aaa' */
  labelColor?: string;
  /** Label font size. Default: 12 */
  labelFontSize?: number;
}

/**
 * Coordinate axes with ticks, labels, and optional grid.
 * Maps math coordinates to SVG space.
 */
export function Axes({
  domain = [-5, 5],
  range = [-5, 5],
  origin = [400, 300],
  scale = 40,
  showGrid = false,
  showTicks = true,
  showLabels = true,
  tickStep = 1,
  axisColor = '#888',
  gridColor = '#333',
  labelColor = '#aaa',
  labelFontSize = 12,
  fadeIn,
  fadeOut,
  draw,
  easing,
  rotation,
  rotationOrigin,
  translate,
}: AxesProps) {
  const anim = useAnimation({ fadeIn, fadeOut, draw, easing });
  const [ox, oy] = origin;

  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let x = Math.ceil(domain[0] / tickStep) * tickStep; x <= domain[1]; x += tickStep) {
      if (x !== 0) ticks.push(x);
    }
    return ticks;
  }, [domain, tickStep]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let y = Math.ceil(range[0] / tickStep) * tickStep; y <= range[1]; y += tickStep) {
      if (y !== 0) ticks.push(y);
    }
    return ticks;
  }, [range, tickStep]);

  // SVG bounds
  const xMin = ox + domain[0] * scale;
  const xMax = ox + domain[1] * scale;
  const yMin = oy - range[1] * scale;
  const yMax = oy - range[0] * scale;

  // Arrowhead size
  const arrowSize = 8;

  const el = (
    <g opacity={anim.opacity} data-testid="elucim-axes">
      {/* Grid lines */}
      {showGrid && (
        <g>
          {xTicks.map((x) => (
            <line
              key={`gx-${x}`}
              x1={ox + x * scale}
              y1={yMin}
              x2={ox + x * scale}
              y2={yMax}
              stroke={gridColor}
              strokeWidth={0.5}
            />
          ))}
          {yTicks.map((y) => (
            <line
              key={`gy-${y}`}
              x1={xMin}
              y1={oy - y * scale}
              x2={xMax}
              y2={oy - y * scale}
              stroke={gridColor}
              strokeWidth={0.5}
            />
          ))}
        </g>
      )}

      {/* X axis */}
      <line x1={xMin} y1={oy} x2={xMax - arrowSize} y2={oy} stroke={axisColor} strokeWidth={1.5} />
      {/* X arrowhead */}
      <polygon
        points={`${xMax},${oy} ${xMax - arrowSize},${oy - arrowSize / 2} ${xMax - arrowSize},${oy + arrowSize / 2}`}
        fill={axisColor}
      />

      {/* Y axis */}
      <line x1={ox} y1={yMax} x2={ox} y2={yMin + arrowSize} stroke={axisColor} strokeWidth={1.5} />
      {/* Y arrowhead */}
      <polygon
        points={`${ox},${yMin} ${ox - arrowSize / 2},${yMin + arrowSize} ${ox + arrowSize / 2},${yMin + arrowSize}`}
        fill={axisColor}
      />

      {/* Tick marks */}
      {showTicks && (
        <g>
          {xTicks.map((x) => (
            <line
              key={`tx-${x}`}
              x1={ox + x * scale}
              y1={oy - 4}
              x2={ox + x * scale}
              y2={oy + 4}
              stroke={axisColor}
              strokeWidth={1}
            />
          ))}
          {yTicks.map((y) => (
            <line
              key={`ty-${y}`}
              x1={ox - 4}
              y1={oy - y * scale}
              x2={ox + 4}
              y2={oy - y * scale}
              stroke={axisColor}
              strokeWidth={1}
            />
          ))}
        </g>
      )}

      {/* Tick labels */}
      {showLabels && (
        <g>
          {xTicks.map((x) => (
            <text
              key={`lx-${x}`}
              x={ox + x * scale}
              y={oy + 18}
              fill={labelColor}
              fontSize={labelFontSize}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {x}
            </text>
          ))}
          {yTicks.map((y) => (
            <text
              key={`ly-${y}`}
              x={ox - 10}
              y={oy - y * scale + 4}
              fill={labelColor}
              fontSize={labelFontSize}
              textAnchor="end"
              fontFamily="monospace"
            >
              {y}
            </text>
          ))}
        </g>
      )}
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, translate }, origin);
}

/** Convert math coordinates to SVG coordinates for use with Axes */
export function mathToSvg(
  mathX: number,
  mathY: number,
  origin: [number, number] = [400, 300],
  scale: number = 40
): [number, number] {
  return [origin[0] + mathX * scale, origin[1] - mathY * scale];
}
