import React from 'react';
import { useAnimation, type AnimationProps } from './animation';

export interface TextProps extends AnimationProps {
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
  fadeIn,
  fadeOut,
  easing,
}: TextProps) {
  const anim = useAnimation({ fadeIn, fadeOut, easing });

  return (
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
      {children}
    </text>
  );
}
