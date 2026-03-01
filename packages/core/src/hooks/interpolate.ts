import type { EasingFunction } from '../easing/types';
import { linear } from '../easing/functions';

export interface InterpolateOptions {
  easing?: EasingFunction;
  /** Behavior when frame is outside inputRange. Default: 'clamp' */
  extrapolateLeft?: 'clamp' | 'extend';
  extrapolateRight?: 'clamp' | 'extend';
}

/**
 * Maps a frame value through input/output ranges with optional easing.
 *
 * @param frame - The current frame number
 * @param inputRange - Array of at least 2 ascending numbers [start, end]
 * @param outputRange - Array matching inputRange length [fromValue, toValue]
 * @param options - Easing function and extrapolation behavior
 * @returns Interpolated value
 */
export function interpolate(
  frame: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options: InterpolateOptions = {}
): number {
  if (inputRange.length !== outputRange.length) {
    throw new Error('inputRange and outputRange must have the same length');
  }
  if (inputRange.length < 2) {
    throw new Error('inputRange and outputRange must have at least 2 elements');
  }

  const {
    easing = linear,
    extrapolateLeft = 'clamp',
    extrapolateRight = 'clamp',
  } = options;

  // Find the segment the frame falls into
  let segmentIndex = 0;
  for (let i = 1; i < inputRange.length; i++) {
    if (frame >= inputRange[i]) {
      segmentIndex = i;
    } else {
      break;
    }
  }

  // Clamp segmentIndex so we always have a valid pair
  const i = Math.min(segmentIndex, inputRange.length - 2);
  const inStart = inputRange[i];
  const inEnd = inputRange[i + 1];
  const outStart = outputRange[i];
  const outEnd = outputRange[i + 1];

  // Calculate progress (0 → 1) within this segment
  let progress = inEnd === inStart ? 1 : (frame - inStart) / (inEnd - inStart);

  // Handle extrapolation
  if (progress < 0) {
    progress = extrapolateLeft === 'clamp' ? 0 : progress;
  }
  if (progress > 1) {
    progress = extrapolateRight === 'clamp' ? 1 : progress;
  }

  // Clamp progress for easing (easing expects 0-1)
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const easedProgress = easing(clampedProgress);

  // For extrapolated values, apply the easing result plus the overshoot
  if (progress < 0 && extrapolateLeft === 'extend') {
    return outStart + progress * (outEnd - outStart);
  }
  if (progress > 1 && extrapolateRight === 'extend') {
    return outEnd + (progress - 1) * (outEnd - outStart);
  }

  return outStart + easedProgress * (outEnd - outStart);
}
