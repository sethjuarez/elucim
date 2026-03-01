import React from 'react';
import { useCurrentFrame } from '../hooks/useCurrentFrame';
import { interpolate } from '../hooks/interpolate';
import type { EasingFunction } from '../easing/types';
import { easeInOutQuad } from '../easing/functions';

export interface DrawProps {
  children: React.ReactElement;
  /** Duration of the draw animation in frames. Default: 60 */
  duration?: number;
  /** Easing function. Default: easeInOutQuad */
  easing?: EasingFunction;
  /** Total stroke length (if not provided, estimated from element) */
  pathLength?: number;
}

/**
 * Progressively draws a stroked SVG element by animating strokeDashoffset.
 * Works by cloning the child element and injecting dash properties.
 */
export function Draw({
  children,
  duration = 60,
  easing = easeInOutQuad,
  pathLength = 1000,
}: DrawProps) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, duration], [0, 1], { easing });

  return React.cloneElement(children, {
    strokeDasharray: pathLength,
    strokeDashoffset: pathLength * (1 - progress),
    pathLength: pathLength,
  } as Record<string, unknown>);
}

export interface WriteProps {
  children: React.ReactNode;
  /** Duration of the write animation in frames. Default: 45 */
  duration?: number;
  /** Easing function. Default: easeInOutQuad */
  easing?: EasingFunction;
}

/**
 * "Write" animation: combines a progressive stroke draw with a fade-in fill.
 * Best for text and complex shapes.
 */
export function Write({
  children,
  duration = 45,
  easing = easeInOutQuad,
}: WriteProps) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, duration * 0.6], [0, 1], { easing });
  const scale = interpolate(frame, [0, duration], [0.95, 1], { easing });

  return (
    <g
      opacity={opacity}
      transform={`scale(${scale})`}
      style={{ transformOrigin: 'center' }}
    >
      {children}
    </g>
  );
}
