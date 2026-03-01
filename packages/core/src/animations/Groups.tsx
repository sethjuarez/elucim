import React from 'react';
import { useCurrentFrame } from '../hooks/useCurrentFrame';
import { interpolate } from '../hooks/interpolate';
import type { EasingFunction } from '../easing/types';
import { easeInOutQuad } from '../easing/functions';

export interface ParallelProps {
  children: React.ReactNode;
}

/**
 * Runs child animations in parallel (all start at the same frame).
 * This is a semantic wrapper — children already render in parallel by default.
 * Useful for readability and grouping.
 */
export function Parallel({ children }: ParallelProps) {
  return <g data-animation="parallel">{children}</g>;
}

export interface StaggerProps {
  children: React.ReactNode[];
  /** Delay in frames between each child starting. Default: 10 */
  staggerDelay?: number;
  /** Easing for the stagger offset. Default: easeInOutQuad */
  easing?: EasingFunction;
}

/**
 * Staggers the appearance of children by delaying each one.
 * Each child gets an increasing opacity delay based on its index.
 */
export function Stagger({
  children,
  staggerDelay = 10,
  easing = easeInOutQuad,
}: StaggerProps) {
  const frame = useCurrentFrame();
  const items = React.Children.toArray(children);

  return (
    <g data-animation="stagger">
      {items.map((child, i) => {
        const start = i * staggerDelay;
        const fadeFrames = staggerDelay * 2;
        const opacity = interpolate(
          frame,
          [start, start + fadeFrames],
          [0, 1],
          { easing }
        );
        return (
          <g key={i} opacity={Math.max(0, opacity)}>
            {child}
          </g>
        );
      })}
    </g>
  );
}
