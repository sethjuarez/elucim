import React from 'react';
import { useCurrentFrame } from '../hooks/useCurrentFrame';
import { useElucimContext } from '../context';
import { interpolate } from '../hooks/interpolate';
import type { EasingFunction } from '../easing/types';

export interface AnimationProps {
  /** Fade in over N frames from start */
  fadeIn?: number;
  /** Fade out over N frames before end */
  fadeOut?: number;
  /** Draw stroke progressively over N frames */
  draw?: number;
  /** Easing function for animations */
  easing?: EasingFunction;
}

/**
 * Hook that computes animated opacity and strokeDashoffset from AnimationProps.
 */
export function useAnimation(
  props: AnimationProps,
  totalLength?: number
): { opacity: number; strokeDasharray?: string; strokeDashoffset?: number } {
  const frame = useCurrentFrame();
  const { durationInFrames } = useElucimContext();
  const { fadeIn, fadeOut, draw, easing } = props;

  let opacity = 1;

  if (fadeIn !== undefined && fadeIn > 0) {
    opacity *= interpolate(frame, [0, fadeIn], [0, 1], { easing });
  }

  if (fadeOut !== undefined && fadeOut > 0) {
    const fadeOutStart = durationInFrames - fadeOut;
    const fadeOutOpacity = interpolate(
      frame,
      [fadeOutStart, durationInFrames - 1],
      [1, 0],
      { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    opacity *= fadeOutOpacity;
  }

  const result: { opacity: number; strokeDasharray?: string; strokeDashoffset?: number } = {
    opacity,
  };

  if (draw !== undefined && draw > 0 && totalLength !== undefined) {
    const progress = interpolate(frame, [0, draw], [0, 1], { easing });
    result.strokeDasharray = `${totalLength}`;
    result.strokeDashoffset = totalLength * (1 - progress);
  }

  return result;
}
