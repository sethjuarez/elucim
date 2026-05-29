import React from 'react';
import { measureTextLayout, measureTextWidth, type MeasuredTextLine } from '../text/measureText';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export type TextBoxPadding = number | { x?: number; y?: number };
export type TextBoxAlign = 'start' | 'middle' | 'end';
export type TextBoxVerticalAlign = 'top' | 'middle' | 'bottom';
export type TextBoxAutoFit = 'none' | 'shrink' | 'truncate';

export interface TextBoxProps extends AnimationProps, SpatialProps, BaseElementProps {
  x: number;
  y: number;
  width: number;
  height: number;
  children: string;
  padding?: TextBoxPadding;
  fill?: string;
  fontSize?: number;
  minFontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  lineHeight?: number;
  align?: TextBoxAlign;
  verticalAlign?: TextBoxVerticalAlign;
  autoFit?: TextBoxAutoFit;
  backgroundFill?: string;
  backgroundStroke?: string;
  backgroundStrokeWidth?: number;
  radius?: number;
  opacity?: number;
}

interface ResolvedPadding {
  x: number;
  y: number;
}

function assertPositiveNumber(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
}

function resolvePadding(padding: TextBoxPadding | undefined): ResolvedPadding {
  if (padding === undefined) return { x: 12, y: 10 };
  if (typeof padding === 'number') {
    if (!Number.isFinite(padding) || padding < 0) {
      throw new Error('padding must be a non-negative finite number');
    }
    return { x: padding, y: padding };
  }

  const x = padding.x ?? 12;
  const y = padding.y ?? 10;
  if (!Number.isFinite(x) || x < 0 || !Number.isFinite(y) || y < 0) {
    throw new Error('padding.x and padding.y must be non-negative finite numbers');
  }
  return { x, y };
}

function lineFits(text: string, maxWidth: number, fontSize: number, fontFamily: string, fontWeight: string | number) {
  return measureTextWidth(text, { fontSize, fontFamily, fontWeight }) <= maxWidth;
}

function truncateLine(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string | number,
  forceSuffix = false
) {
  const suffix = '...';
  if (!forceSuffix && lineFits(text, maxWidth, fontSize, fontFamily, fontWeight)) return text;
  if (!lineFits(suffix, maxWidth, fontSize, fontFamily, fontWeight)) return '';

  let candidate = '';
  for (const char of Array.from(text)) {
    const next = `${candidate}${char}`;
    if (!lineFits(`${next}${suffix}`, maxWidth, fontSize, fontFamily, fontWeight)) break;
    candidate = next;
  }

  return `${candidate.trimEnd()}${suffix}`;
}

function truncateMeasuredLine(
  line: MeasuredTextLine,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string | number,
  forceSuffix = false
): MeasuredTextLine {
  const text = truncateLine(line.text, maxWidth, fontSize, fontFamily, fontWeight, forceSuffix);
  return {
    text,
    width: measureTextWidth(text, { fontSize, fontFamily, fontWeight }),
  };
}

function truncateLines(
  lines: MeasuredTextLine[],
  maxHeight: number,
  lineHeight: number,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string | number
) {
  const maxLines = Math.floor(maxHeight / lineHeight);
  if (maxLines <= 0) return [];

  const visible = lines.slice(0, maxLines).map(line =>
    truncateMeasuredLine(line, maxWidth, fontSize, fontFamily, fontWeight)
  );
  if (lines.length <= maxLines) return visible;

  const last = visible[visible.length - 1];
  visible[visible.length - 1] = truncateMeasuredLine(last, maxWidth, fontSize, fontFamily, fontWeight, true);
  return visible;
}

export function TextBox({
  x,
  y,
  width,
  height,
  children,
  padding,
  fill = '#fff',
  fontSize = 20,
  minFontSize = 10,
  fontFamily = 'sans-serif',
  fontWeight = 'normal',
  lineHeight,
  align = 'start',
  verticalAlign = 'top',
  autoFit = 'none',
  backgroundFill = 'rgba(15, 23, 42, 0.72)',
  backgroundStroke = 'rgba(148, 163, 184, 0.35)',
  backgroundStrokeWidth = 1,
  radius = 8,
  opacity: baseOpacity = 1,
  fadeIn,
  fadeOut,
  easing,
  rotation,
  rotationOrigin,
  scale,
  translate,
}: TextBoxProps) {
  assertPositiveNumber(width, 'width');
  assertPositiveNumber(height, 'height');
  assertPositiveNumber(fontSize, 'fontSize');
  assertPositiveNumber(minFontSize, 'minFontSize');

  const pad = resolvePadding(padding);
  const innerWidth = width - pad.x * 2;
  const innerHeight = height - pad.y * 2;
  assertPositiveNumber(innerWidth, 'inner text width');
  assertPositiveNumber(innerHeight, 'inner text height');

  let resolvedFontSize = fontSize;
  let layout = measureTextLayout(children, {
    fontSize: resolvedFontSize,
    fontFamily,
    fontWeight,
    lineHeight,
    maxWidth: innerWidth,
    wrap: 'word',
  });

  if (autoFit === 'shrink') {
    while (
      resolvedFontSize > minFontSize
      && (layout.height > innerHeight || layout.lines.some(line => line.width > innerWidth))
    ) {
      resolvedFontSize = Math.max(minFontSize, resolvedFontSize - 1);
      layout = measureTextLayout(children, {
        fontSize: resolvedFontSize,
        fontFamily,
        fontWeight,
        lineHeight,
        maxWidth: innerWidth,
        wrap: 'word',
      });
    }

    if (layout.lines.some(line => line.width > innerWidth)) {
      layout = measureTextLayout(children, {
        fontSize: resolvedFontSize,
        fontFamily,
        fontWeight,
        lineHeight,
        maxWidth: innerWidth,
        wrap: 'char',
      });
    }
  }

  const lines = autoFit === 'truncate'
    ? truncateLines(layout.lines, innerHeight, layout.lineHeight, innerWidth, resolvedFontSize, fontFamily, fontWeight)
    : layout.lines;
  const renderedHeight = lines.length * layout.lineHeight;
  const textY = y + pad.y + (
    verticalAlign === 'middle'
      ? Math.max(0, (innerHeight - renderedHeight) / 2)
      : verticalAlign === 'bottom'
        ? Math.max(0, innerHeight - renderedHeight)
        : 0
  );
  const textX = align === 'middle'
    ? x + width / 2
    : align === 'end'
      ? x + width - pad.x
      : x + pad.x;
  const anim = useAnimation({ fadeIn, fadeOut, easing });

  const el = (
    <g opacity={baseOpacity * anim.opacity} data-testid="elucim-textbox">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={radius}
        ry={radius}
        fill={backgroundFill}
        stroke={backgroundStroke}
        strokeWidth={backgroundStrokeWidth}
        data-testid="elucim-textbox-background"
      />
      <text
        x={textX}
        y={textY}
        fill={fill}
        fontSize={resolvedFontSize}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        textAnchor={align}
        dominantBaseline="hanging"
        data-testid="elucim-textbox-text"
      >
        {lines.map((line, index) => (
          <tspan key={index} x={textX} dy={index === 0 ? 0 : layout.lineHeight}>
            {line.text}
          </tspan>
        ))}
      </text>
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate }, [x + width / 2, y + height / 2], [x, y]);
}
