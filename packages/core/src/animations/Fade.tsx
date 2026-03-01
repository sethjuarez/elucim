import React from 'react';
import { useCurrentFrame } from '../hooks/useCurrentFrame';
import { interpolate } from '../hooks/interpolate';
import type { EasingFunction } from '../easing/types';
import { easeOutCubic } from '../easing/functions';

export interface FadeInProps {
  children: React.ReactNode;
  /** Duration of the fade in frames. Default: 30 */
  duration?: number;
  /** Easing function. Default: easeOutCubic */
  easing?: EasingFunction;
}

/**
 * Wraps children in an opacity fade from 0 → 1.
 * Use inside a Sequence to control timing.
 */
export function FadeIn({
  children,
  duration = 30,
  easing = easeOutCubic,
}: FadeInProps) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, duration], [0, 1], { easing });

  return <g opacity={opacity}>{children}</g>;
}

export interface FadeOutProps {
  children: React.ReactNode;
  /** Duration of the fade in frames. Default: 30 */
  duration?: number;
  /** Total frames available (fade happens at the end). If omitted, fades from start. */
  totalFrames?: number;
  /** Easing function. Default: easeOutCubic */
  easing?: EasingFunction;
}

/**
 * Wraps children in an opacity fade from 1 → 0.
 * If totalFrames is set, the fade begins at (totalFrames - duration).
 */
export function FadeOut({
  children,
  duration = 30,
  totalFrames,
  easing = easeOutCubic,
}: FadeOutProps) {
  const frame = useCurrentFrame();

  const start = totalFrames !== undefined ? totalFrames - duration : 0;
  const opacity = interpolate(frame, [start, start + duration], [1, 0], { easing });

  return <g opacity={opacity}>{children}</g>;
}
