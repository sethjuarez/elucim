import React, { useMemo } from 'react';
import { useCurrentFrame } from '../hooks/useCurrentFrame';
import { interpolate } from '../hooks/interpolate';
import type { EasingFunction } from '../easing/types';
import { easeInOutCubic } from '../easing/functions';

export interface TransformProps {
  children: React.ReactNode;
  /** Duration of the transform in frames. Default: 60 */
  duration?: number;
  /** Easing function. Default: easeInOutCubic */
  easing?: EasingFunction;
  /** Translate [fromX, fromY] → [toX, toY] in SVG pixels */
  translate?: { from: [number, number]; to: [number, number] };
  /** Scale from → to */
  scale?: { from: number; to: number };
  /** Rotate from → to (in degrees) */
  rotate?: { from: number; to: number };
  /** Opacity from → to */
  opacity?: { from: number; to: number };
}

/**
 * Animates a transform between two states over duration frames.
 * Supports translate, scale, rotate, and opacity simultaneously.
 */
export function Transform({
  children,
  duration = 60,
  easing = easeInOutCubic,
  translate,
  scale,
  rotate,
  opacity,
}: TransformProps) {
  const frame = useCurrentFrame();

  const tx = translate
    ? interpolate(frame, [0, duration], [translate.from[0], translate.to[0]], { easing })
    : 0;
  const ty = translate
    ? interpolate(frame, [0, duration], [translate.from[1], translate.to[1]], { easing })
    : 0;
  const s = scale
    ? interpolate(frame, [0, duration], [scale.from, scale.to], { easing })
    : 1;
  const r = rotate
    ? interpolate(frame, [0, duration], [rotate.from, rotate.to], { easing })
    : 0;
  const o = opacity
    ? interpolate(frame, [0, duration], [opacity.from, opacity.to], { easing })
    : 1;

  const transform = `translate(${tx}, ${ty}) scale(${s}) rotate(${r})`;

  return (
    <g transform={transform} opacity={o}>
      {children}
    </g>
  );
}

export interface MorphProps {
  children: React.ReactNode;
  /** Duration of the morph in frames. Default: 60 */
  duration?: number;
  /** Easing function. Default: easeInOutCubic */
  easing?: EasingFunction;
  /** Start color (fill) */
  fromColor?: string;
  /** End color (fill) */
  toColor?: string;
  /** Start opacity */
  fromOpacity?: number;
  /** End opacity */
  toOpacity?: number;
  /** Start scale */
  fromScale?: number;
  /** End scale */
  toScale?: number;
}

/**
 * Morphs visual properties (color, opacity, scale) over duration frames.
 * For cross-fading between two different elements, use two overlapping Sequences.
 */
export function Morph({
  children,
  duration = 60,
  easing = easeInOutCubic,
  fromColor,
  toColor,
  fromOpacity = 1,
  toOpacity = 1,
  fromScale = 1,
  toScale = 1,
}: MorphProps) {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, duration], [fromOpacity, toOpacity], { easing });
  const scale = interpolate(frame, [0, duration], [fromScale, toScale], { easing });

  // Color interpolation: parse hex to RGB and lerp
  const color = useMemo(() => {
    if (!fromColor || !toColor) return undefined;
    const progress = interpolate(frame, [0, duration], [0, 1], { easing });
    return lerpColor(fromColor, toColor, progress);
  }, [fromColor, toColor, frame, duration, easing]);

  return (
    <g
      opacity={opacity}
      transform={`scale(${scale})`}
      style={{ transformOrigin: 'center' }}
      fill={color}
    >
      {children}
    </g>
  );
}

/** Linear interpolation between two hex colors */
function lerpColor(from: string, to: string, t: number): string {
  const f = parseHex(from);
  const toC = parseHex(to);
  if (!f || !toC) return from;

  const r = Math.round(f[0] + (toC[0] - f[0]) * t);
  const g = Math.round(f[1] + (toC[1] - f[1]) * t);
  const b = Math.round(f[2] + (toC[2] - f[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function parseHex(hex: string): [number, number, number] | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}
