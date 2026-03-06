import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface MatrixProps extends AnimationProps, SpatialProps, BaseElementProps {
  /** 2D array of numbers or strings */
  values: (number | string)[][];
  /** Top-left position in SVG coordinates */
  x?: number;
  y?: number;
  /** Cell size in pixels. Default: 48 */
  cellSize?: number;
  /** Text color. Default: '#fff' */
  color?: string;
  /** Bracket color. Default: '#888' */
  bracketColor?: string;
  /** Font size. Default: 20 */
  fontSize?: number;
}

/**
 * Renders a matrix with square brackets and entries.
 */
export function Matrix({
  values,
  x = 0,
  y = 0,
  cellSize = 48,
  color = '#fff',
  bracketColor = '#888',
  fontSize = 20,
  fadeIn,
  fadeOut,
  easing,
  rotation,
  rotationOrigin,
  scale,
  translate,
}: MatrixProps) {
  const anim = useAnimation({ fadeIn, fadeOut, easing });

  const rows = values.length;
  const cols = values[0]?.length ?? 0;
  const totalWidth = cols * cellSize;
  const totalHeight = rows * cellSize;
  const bracketWidth = 8;
  const bracketStroke = 2;
  const padding = 4;

  const el = (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={anim.opacity}
      data-testid="elucim-matrix"
    >
      {/* Left bracket */}
      <path
        d={`M ${bracketWidth + padding} ${-padding} L ${padding} ${-padding} L ${padding} ${totalHeight + padding} L ${bracketWidth + padding} ${totalHeight + padding}`}
        fill="none"
        stroke={bracketColor}
        strokeWidth={bracketStroke}
        strokeLinecap="round"
      />
      {/* Right bracket */}
      <path
        d={`M ${totalWidth + bracketWidth + padding} ${-padding} L ${totalWidth + 2 * bracketWidth + padding} ${-padding} L ${totalWidth + 2 * bracketWidth + padding} ${totalHeight + padding} L ${totalWidth + bracketWidth + padding} ${totalHeight + padding}`}
        fill="none"
        stroke={bracketColor}
        strokeWidth={bracketStroke}
        strokeLinecap="round"
      />

      {/* Matrix entries */}
      {values.map((row, i) =>
        row.map((val, j) => (
          <text
            key={`${i}-${j}`}
            x={bracketWidth + padding + j * cellSize + cellSize / 2}
            y={i * cellSize + cellSize / 2 + fontSize / 3}
            fill={color}
            fontSize={fontSize}
            fontFamily="monospace"
            textAnchor="middle"
          >
            {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(2)) : val}
          </text>
        ))
      )}
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate }, [x, y]);
}
