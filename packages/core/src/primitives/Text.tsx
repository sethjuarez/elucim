import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';
import { measureTextLayout, measureTextWidth, type TextWrapMode } from '../text/measureText';
import { useRevealState, type RevealCursorOptions } from '../animations/Reveal';

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
  const reveal = useRevealState();
  const revealState = reveal?.strategy === 'type'
    ? resolveTextReveal(children, reveal.progress, reveal.cursor)
    : { content: children };
  const content = revealState.content;
  const shouldUseLayout = maxWidth !== undefined || lineHeight !== undefined || wrap !== undefined;
  const layout = shouldUseLayout
    ? measureTextLayout(content, { fontSize, fontFamily, fontWeight, lineHeight, maxWidth, wrap })
    : undefined;
  const shouldRenderLines = layout !== undefined && (layout.lines.length !== 1 || layout.lines[0]?.text !== content);
  const renderedContent = shouldRenderLines && layout
    ? layout.lines.map((line, index) => (
      <tspan key={index} x={x} dy={index === 0 ? 0 : layout.lineHeight}>
        {line.text}
      </tspan>
    ))
    : content;

  const textEl = (
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
  const cursorLineIndex = shouldRenderLines && layout ? Math.max(0, layout.lines.length - 1) : 0;
  const cursorLine = shouldRenderLines && layout
    ? layout.lines[cursorLineIndex] ?? { text: '', width: 0 }
    : { text: content, width: measureTextWidth(content, { fontSize, fontFamily, fontWeight }) };
  const cursorX = textAnchor === 'middle'
    ? x + cursorLine.width / 2
    : textAnchor === 'end'
      ? x
      : x + cursorLine.width;
  const cursorY = y + (shouldRenderLines && layout ? cursorLineIndex * layout.lineHeight : 0);
  const el = revealState.cursor ? (
    <g>
      {textEl}
      <text
        x={cursorX}
        y={cursorY}
        fill={fill}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        dominantBaseline={dominantBaseline}
        opacity={baseOpacity * anim.opacity}
        data-testid="elucim-text-cursor"
      >
        {revealState.cursor}
      </text>
    </g>
  ) : textEl;

  return withTransform(el, { rotation, rotationOrigin, scale, translate }, [x, y], [x, y]);
}

function resolveTextReveal(
  content: string,
  progress: number,
  cursor: boolean | RevealCursorOptions | undefined,
): { content: string; cursor?: string } {
  const characters = Array.from(content);
  const visibleCount = Math.floor(Math.max(0, Math.min(1, progress)) * characters.length);
  const visibleContent = characters.slice(0, visibleCount).join('');
  const complete = visibleCount >= characters.length;
  const cursorOptions = cursor === false ? undefined : cursor ?? true;
  const hideWhenComplete = typeof cursorOptions === 'object'
    ? cursorOptions.hideWhenComplete ?? true
    : true;
  if (!cursorOptions || (complete && hideWhenComplete)) return { content: visibleContent };

  return {
    content: visibleContent,
    cursor: typeof cursorOptions === 'object' ? cursorOptions.character ?? '|' : '|',
  };
}
