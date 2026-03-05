import React from 'react';
import { useAnimation, type AnimationProps } from './animation';

export interface BarDef {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps extends AnimationProps {
  bars: BarDef[];
  /** Top-left x of the chart area */
  x: number;
  /** Top-left y of the chart area */
  y: number;
  /** Total width of the chart area */
  width: number;
  /** Total height of the chart area */
  height: number;
  /** Default bar color. Default: '#4fc3f7' */
  barColor?: string;
  /** Label text color. Default: '#e0e7ff' */
  labelColor?: string;
  /** Label font size. Default: 12 */
  labelFontSize?: number;
  /** Show value text above bars. Default: true */
  showValues?: boolean;
  /** Max value for scaling. Defaults to max of bar values */
  maxValue?: number;
  /** Gap between bars as fraction of bar width. Default: 0.3 */
  gap?: number;
  /** Value format: 'number' shows raw, 'percent' shows %. Default: 'percent' */
  valueFormat?: 'number' | 'percent';
}

/**
 * Vertical bar chart with labels and optional value display.
 */
export function BarChart({
  bars,
  x,
  y,
  width,
  height,
  barColor = '#4fc3f7',
  labelColor = '#e0e7ff',
  labelFontSize = 12,
  showValues = true,
  maxValue,
  gap = 0.3,
  valueFormat = 'percent',
  fadeIn,
  fadeOut,
  easing,
}: BarChartProps) {
  const anim = useAnimation({ fadeIn, fadeOut, easing });

  if (bars.length === 0) return null;

  const max = maxValue ?? Math.max(...bars.map((b) => b.value));
  const labelAreaHeight = labelFontSize + 8;
  const valueAreaHeight = showValues ? labelFontSize + 4 : 0;
  const barAreaHeight = height - labelAreaHeight - valueAreaHeight;
  const totalBarWidth = width / bars.length;
  const barWidth = totalBarWidth * (1 - gap);
  const barGap = totalBarWidth * gap;

  return (
    <g opacity={anim.opacity} data-testid="elucim-barchart">
      {bars.map((bar, i) => {
        const barHeight = max > 0 ? (bar.value / max) * barAreaHeight : 0;
        const bx = x + i * totalBarWidth + barGap / 2;
        const by = y + valueAreaHeight + barAreaHeight - barHeight;
        const color = bar.color ?? barColor;

        const formattedValue =
          valueFormat === 'percent'
            ? `${Math.round(bar.value)}%`
            : `${bar.value}`;

        return (
          <g key={i}>
            {/* Bar */}
            <rect
              x={bx}
              y={by}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx={3}
              ry={3}
            />
            {/* Value label above bar */}
            {showValues && (
              <text
                x={bx + barWidth / 2}
                y={by - 4}
                fill={color}
                fontSize={labelFontSize}
                textAnchor="middle"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {formattedValue}
              </text>
            )}
            {/* Category label below bar */}
            <text
              x={bx + barWidth / 2}
              y={y + valueAreaHeight + barAreaHeight + labelFontSize + 2}
              fill={labelColor}
              fontSize={labelFontSize}
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
