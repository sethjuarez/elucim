import React, { useMemo } from 'react';
import katex from 'katex';
import { useAnimation, type AnimationProps } from './animation';

export interface LaTeXProps extends AnimationProps {
  /** LaTeX expression string (e.g., "\\frac{a}{b}") */
  expression: string;
  /** SVG x position */
  x: number;
  /** SVG y position */
  y: number;
  /** Text color. Default: '#fff' */
  color?: string;
  /** Font size in pixels. Default: 24 */
  fontSize?: number;
  /** Horizontal alignment. Default: 'center' */
  align?: 'left' | 'center' | 'right';
}

/**
 * Renders a LaTeX expression using KaTeX, embedded in SVG via foreignObject.
 */
export function LaTeX({
  expression,
  x,
  y,
  color = '#fff',
  fontSize = 24,
  align = 'center',
  fadeIn,
  fadeOut,
  easing,
}: LaTeXProps) {
  const anim = useAnimation({ fadeIn, fadeOut, easing });

  const html = useMemo(() => {
    try {
      return katex.renderToString(expression, {
        throwOnError: false,
        displayMode: true,
        output: 'html',
      });
    } catch {
      return `<span style="color:red">LaTeX error</span>`;
    }
  }, [expression]);

  // Estimate width for alignment (rough heuristic)
  const estimatedWidth = expression.length * fontSize * 0.6;
  const offsetX =
    align === 'center' ? -estimatedWidth / 2
    : align === 'right' ? -estimatedWidth
    : 0;

  return (
    <foreignObject
      x={x + offsetX}
      y={y - fontSize * 1.2}
      width={estimatedWidth + fontSize * 2}
      height={fontSize * 3}
      opacity={anim.opacity}
      data-testid="elucim-latex"
    >
      <div
        style={{
          color,
          fontSize: `${fontSize}px`,
          fontFamily: 'KaTeX_Main, serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
          height: '100%',
          overflow: 'visible',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </foreignObject>
  );
}
