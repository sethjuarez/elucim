import React, { useMemo } from 'react';
import { mathToSvg } from './Axes';
import { Circle } from './Circle';
import { Line } from './Line';
import { Text } from './Text';
import { withTransform, type BaseElementProps } from './transform';

export type RiemannSumMethod = 'left' | 'right' | 'midpoint';

export interface MathSpaceProps extends BaseElementProps {
  /** Position of the coordinate origin in SVG pixels [x, y] */
  origin?: [number, number];
  /** Pixels per math unit. Default: 40 */
  scale?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  translate?: [number, number];
}

export interface CalculusLineProps extends MathSpaceProps {
  /** The function to sample. */
  fn: (x: number) => number;
  /** Stroke color. Default: '#f59e0b' for secants and '#22c55e' for tangents */
  stroke?: string;
  /** Stroke width. Default: 2 */
  strokeWidth?: number;
  /** Base opacity. Default: 1 */
  opacity?: number;
  /** Math-space horizontal length of the rendered line segment. Default: 4 */
  length?: number;
  /** Optional label rendered near the line midpoint. */
  label?: string;
  /** Label offset in SVG pixels. Default: [12, -12] */
  labelOffset?: [number, number];
  /** Label color. Defaults to the line stroke. */
  labelColor?: string;
  /** Label font size. Default: 14 */
  labelFontSize?: number;
  /** Show the sampled point or points. Default: false */
  showPoints?: boolean;
  /** Radius for sampled point markers. Default: 4 */
  pointRadius?: number;
}

export interface SecantLineProps extends CalculusLineProps {
  /** First x value. */
  x: number;
  /** Horizontal distance to the second sample point. Must be non-zero. */
  dx: number;
}

export interface TangentLineProps extends CalculusLineProps {
  /** x value where the tangent touches the curve. */
  x: number;
  /** Exact derivative. If omitted, a central-difference estimate is used. */
  derivative?: (x: number) => number;
  /** Central-difference step for numerical derivatives. Default: 1e-4 */
  derivativeStep?: number;
}

export interface RiemannSumProps extends MathSpaceProps {
  /** Function to approximate. */
  fn: (x: number) => number;
  /** Integration interval [a, b]. */
  interval: [number, number];
  /** Number of rectangles. Fractional values are rounded so timelines can animate n. */
  n: number;
  /** Sampling method. Default: 'midpoint' */
  method?: RiemannSumMethod;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface AccumulationAreaProps extends MathSpaceProps {
  /** Function to accumulate under. */
  fn: (x: number) => number;
  /** Lower accumulation bound. */
  from: number;
  /** Upper accumulation bound. */
  to: number;
  /** Number of samples used for the filled boundary. Default: 80 */
  samples?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export function SecantLine({
  fn,
  x,
  dx,
  length = 4,
  origin = [400, 300],
  scale = 40,
  stroke = '#f59e0b',
  strokeWidth = 2,
  opacity = 1,
  label,
  labelOffset = [12, -12],
  labelColor,
  labelFontSize = 14,
  showPoints = false,
  pointRadius = 4,
  rotation,
  rotationOrigin,
  translate,
}: SecantLineProps) {
  assertFiniteNumber('x', x);
  assertNonZeroFiniteNumber('dx', dx);
  assertPositiveFiniteNumber('length', length);

  const y1 = evaluateFinite(fn, x, 'fn(x)');
  const x2 = x + dx;
  const y2 = evaluateFinite(fn, x2, 'fn(x + dx)');
  const slope = (y2 - y1) / dx;
  const midpointX = (x + x2) / 2;
  const midpointY = (y1 + y2) / 2;
  const startX = midpointX - length / 2;
  const endX = midpointX + length / 2;
  const startY = midpointY + slope * (startX - midpointX);
  const endY = midpointY + slope * (endX - midpointX);

  return (
    <CalculusLine
      testId="elucim-secant-line"
      lineStart={[startX, startY]}
      lineEnd={[endX, endY]}
      points={showPoints ? [[x, y1], [x2, y2]] : []}
      origin={origin}
      scale={scale}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={opacity}
      label={label}
      labelOffset={labelOffset}
      labelColor={labelColor}
      labelFontSize={labelFontSize}
      pointRadius={pointRadius}
      rotation={rotation}
      rotationOrigin={rotationOrigin}
      translate={translate}
    />
  );
}

export function TangentLine({
  fn,
  derivative,
  derivativeStep = 1e-4,
  x,
  length = 4,
  origin = [400, 300],
  scale = 40,
  stroke = '#22c55e',
  strokeWidth = 2,
  opacity = 1,
  label,
  labelOffset = [12, -12],
  labelColor,
  labelFontSize = 14,
  showPoints = false,
  pointRadius = 4,
  rotation,
  rotationOrigin,
  translate,
}: TangentLineProps) {
  assertFiniteNumber('x', x);
  assertPositiveFiniteNumber('derivativeStep', derivativeStep);
  assertPositiveFiniteNumber('length', length);

  const y = evaluateFinite(fn, x, 'fn(x)');
  const slope = derivative
    ? evaluateFinite(derivative, x, 'derivative(x)')
    : centralDifference(fn, x, derivativeStep);
  const startX = x - length / 2;
  const endX = x + length / 2;
  const startY = y + slope * (startX - x);
  const endY = y + slope * (endX - x);

  return (
    <CalculusLine
      testId="elucim-tangent-line"
      lineStart={[startX, startY]}
      lineEnd={[endX, endY]}
      points={showPoints ? [[x, y]] : []}
      origin={origin}
      scale={scale}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={opacity}
      label={label}
      labelOffset={labelOffset}
      labelColor={labelColor}
      labelFontSize={labelFontSize}
      pointRadius={pointRadius}
      rotation={rotation}
      rotationOrigin={rotationOrigin}
      translate={translate}
    />
  );
}

export function RiemannSum({
  fn,
  interval,
  n,
  method = 'midpoint',
  origin = [400, 300],
  scale = 40,
  fill = '#8b5cf6',
  stroke = '#c4b5fd',
  strokeWidth = 1,
  opacity = 0.35,
  rotation,
  rotationOrigin,
  translate,
}: RiemannSumProps) {
  assertInterval(interval);
  assertPositiveFiniteNumber('n', n);
  assertRiemannMethod(method);

  const count = Math.max(1, Math.round(n));
  const rectangles = useMemo(() => {
    const [a, b] = interval;
    const width = (b - a) / count;
    return Array.from({ length: count }, (_, index) => {
      const left = a + index * width;
      const right = left + width;
      const sampleX = method === 'left' ? left : method === 'right' ? right : left + width / 2;
      const sample = fn(sampleX);
      const height = Number.isFinite(sample) ? sample : 0;
      const [svgLeft, baseline] = mathToSvg(left, 0, origin, scale);
      const [svgRight] = mathToSvg(right, 0, origin, scale);
      const [, svgTop] = mathToSvg(left, Math.max(height, 0), origin, scale);
      const [, svgBottom] = mathToSvg(left, Math.min(height, 0), origin, scale);
      return {
        x: Math.min(svgLeft, svgRight),
        y: height >= 0 ? svgTop : baseline,
        width: Math.abs(svgRight - svgLeft),
        height: Math.abs(svgBottom - svgTop),
      };
    });
  }, [fn, interval, count, method, origin, scale]);

  const el = (
    <g data-testid="elucim-riemann-sum" opacity={opacity}>
      {rectangles.map((rect, index) => (
        <rect
          key={index}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ))}
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, translate }, origin);
}

export function AccumulationArea({
  fn,
  from,
  to,
  samples = 80,
  origin = [400, 300],
  scale = 40,
  fill = '#14b8a6',
  stroke = '#5eead4',
  strokeWidth = 0,
  opacity = 0.4,
  rotation,
  rotationOrigin,
  translate,
}: AccumulationAreaProps) {
  assertFiniteNumber('from', from);
  assertFiniteNumber('to', to);
  assertPositiveInteger('samples', samples);

  const pathData = useMemo(() => {
    const step = (to - from) / samples;
    const [startBaseX, startBaseY] = mathToSvg(from, 0, origin, scale);
    const commands = [`M ${startBaseX} ${startBaseY}`];
    for (let i = 0; i <= samples; i++) {
      const x = from + step * i;
      const sample = fn(x);
      const y = Number.isFinite(sample) ? sample : 0;
      const [svgX, svgY] = mathToSvg(x, y, origin, scale);
      commands.push(`L ${svgX} ${svgY}`);
    }

    const [endBaseX, endBaseY] = mathToSvg(to, 0, origin, scale);
    commands.push(`L ${endBaseX} ${endBaseY}`, 'Z');
    return commands.join(' ');
  }, [fn, from, to, samples, origin, scale]);

  const el = (
    <path
      d={pathData}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={opacity}
      data-testid="elucim-accumulation-area"
    />
  );

  return withTransform(el, { rotation, rotationOrigin, translate }, origin);
}

interface CalculusLineInternalProps {
  testId: string;
  lineStart: [number, number];
  lineEnd: [number, number];
  points: [number, number][];
  origin: [number, number];
  scale: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  label?: string;
  labelOffset: [number, number];
  labelColor?: string;
  labelFontSize: number;
  pointRadius: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  translate?: [number, number];
}

function CalculusLine({
  testId,
  lineStart,
  lineEnd,
  points,
  origin,
  scale,
  stroke,
  strokeWidth,
  opacity,
  label,
  labelOffset,
  labelColor,
  labelFontSize,
  pointRadius,
  rotation,
  rotationOrigin,
  translate,
}: CalculusLineInternalProps) {
  const [x1, y1] = mathToSvg(lineStart[0], lineStart[1], origin, scale);
  const [x2, y2] = mathToSvg(lineEnd[0], lineEnd[1], origin, scale);
  const [labelX, labelY] = [(x1 + x2) / 2 + labelOffset[0], (y1 + y2) / 2 + labelOffset[1]];
  const el = (
    <g data-testid={testId}>
      <Line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
      {points.map(([pointX, pointY], index) => {
        const [cx, cy] = mathToSvg(pointX, pointY, origin, scale);
        return <Circle key={index} cx={cx} cy={cy} r={pointRadius} fill={stroke} stroke="none" opacity={opacity} />;
      })}
      {label && (
        <Text
          x={labelX}
          y={labelY}
          fill={labelColor ?? stroke}
          fontSize={labelFontSize}
          opacity={opacity}
        >
          {label}
        </Text>
      )}
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, translate }, origin);
}

function centralDifference(fn: (x: number) => number, x: number, step: number): number {
  const left = evaluateFinite(fn, x - step, 'fn(x - derivativeStep)');
  const right = evaluateFinite(fn, x + step, 'fn(x + derivativeStep)');
  return (right - left) / (2 * step);
}

function evaluateFinite(fn: (x: number) => number, x: number, label: string): number {
  const value = fn(x);
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must produce a finite number, got ${String(value)}`);
  }
  return value;
}

function assertFiniteNumber(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

function assertNonZeroFiniteNumber(name: string, value: number): void {
  assertFiniteNumber(name, value);
  if (value === 0) {
    throw new Error(`${name} must be non-zero`);
  }
}

function assertPositiveFiniteNumber(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function assertInterval(interval: [number, number]): void {
  if (!Array.isArray(interval) || interval.length !== 2 || !Number.isFinite(interval[0]) || !Number.isFinite(interval[1])) {
    throw new Error('interval must be [number, number]');
  }
  if (interval[0] === interval[1]) {
    throw new Error('interval endpoints must be distinct');
  }
}

function assertRiemannMethod(method: RiemannSumMethod): void {
  if (method !== 'left' && method !== 'right' && method !== 'midpoint') {
    throw new Error('method must be one of: left, right, midpoint');
  }
}
