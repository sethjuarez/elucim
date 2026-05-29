import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';
import { measureTextLayout, type TextWrapMode } from '../text/measureText';

export interface TextProps extends AnimationProps, SpatialProps, BaseElementProps {
  x: number;
  y: number;
  children: string;
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  textAnchor?: 'start' | 'middle' | 'end';
  dominantBaseline?: 'auto' | 'middle' | 'hanging' | 'central';
  opacity?: number;
  maxWidth?: number;
  lineHeight?: number;
  wrap?: TextWrapMode;
}

export function Text({
  x,
  y,
  children,
  fill = '#fff',
  fontSize = 24,
  fontFamily = 'sans-serif',
  fontWeight = 'normal',
  textAnchor = 'start',
  dominantBaseline = 'auto',
  opacity: baseOpacity = 1,
  maxWidth,
  lineHeight,
  wrap,
  fadeIn,
  fadeOut,
  easing,
  rotation,
  rotationOrigin,
  scale,
  translate,
}: TextProps) {
  const anim = useAnimation({ fadeIn, fadeOut, easing });
  const shouldUseLayout = maxWidth !== undefined || lineHeight !== undefined || wrap !== undefined;
  const layout = shouldUseLayout
    ? measureTextLayout(children, { fontSize, fontFamily, fontWeight, lineHeight, maxWidth, wrap })
    : undefined;
  const shouldRenderLines = layout !== undefined && (layout.lines.length !== 1 || layout.lines[0]?.text !== children);
  const renderedContent = shouldRenderLines && layout
    ? layout.lines.map((line, index) => (
      <tspan key={index} x={x} dy={index === 0 ? 0 : layout.lineHeight}>
        {line.text}
      </tspan>
    ))
    : children;

  const el = (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={fontSize}
      fontFamily={fontFamily}
      fontWeight={fontWeight}
      textAnchor={textAnchor}
      dominantBaseline={dominantBaseline}
      opacity={baseOpacity * anim.opacity}
      data-testid="elucim-text"
    >
      {renderedContent}
    </text>
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate }, [x, y], [x, y]);
}
