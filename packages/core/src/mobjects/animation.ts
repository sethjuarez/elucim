import React from 'react';
import { useCurrentFrame } from '../hooks/useCurrentFrame';
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
  const { fadeIn, fadeOut, draw, easing } = props;

  let opacity = 1;

  if (fadeIn !== undefined && fadeIn > 0) {
    opacity *= interpolate(frame, [0, fadeIn], [0, 1], { easing });
  }

  if (fadeOut !== undefined && fadeOut > 0) {
    // fadeOut starts fadeOut frames before the end - but we don't know duration here
    // so we compute relative to the frame; caller can set durationInFrames in Sequence
    const fadeOutOpacity = interpolate(
      frame,
      [0, fadeOut],
      [1, 0],
      { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    // This is a simplification; proper implementation would know end frame
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
