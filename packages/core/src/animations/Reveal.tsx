import React, { createContext, useContext } from 'react';
import { useCurrentFrame } from '../hooks/useCurrentFrame';

export type RevealStrategy = 'type' | 'fade';

export interface RevealCursorOptions {
  character?: string;
  blinkEveryFrames?: number;
  hideWhenComplete?: boolean;
}

/**
 * A resolved reveal assignment supplied by a timeline or a React animation.
 * Primitives consume progress; timeline scheduling remains outside primitives.
 */
export interface RevealState {
  progress: number;
  strategy: RevealStrategy;
  cursor?: boolean | RevealCursorOptions;
}

export interface RevealProps {
  children: React.ReactNode;
  durationInFrames: number;
  from?: number;
  strategy?: RevealStrategy;
  cursor?: boolean | RevealCursorOptions;
}

const RevealContext = createContext<RevealState | undefined>(undefined);

export function useRevealState(): RevealState | undefined {
  return useContext(RevealContext);
}

export function RevealStateProvider({
  state,
  children,
}: {
  state: RevealState;
  children: React.ReactNode;
}) {
  const opacity = state.strategy === 'fade' ? state.progress : 1;
  return (
    <RevealContext.Provider value={state}>
      <g opacity={opacity}>{children}</g>
    </RevealContext.Provider>
  );
}

/**
 * React authoring wrapper for a single reveal interval.
 *
 * Canonical documents use timeline effects instead, but both paths provide the
 * same resolved state to primitives.
 */
export function Reveal({
  children,
  durationInFrames,
  from = 0,
  strategy = 'fade',
  cursor,
}: RevealProps) {
  if (!Number.isInteger(durationInFrames) || durationInFrames <= 0) {
    throw new Error('Reveal durationInFrames must be a positive integer.');
  }
  if (!Number.isInteger(from) || from < 0) {
    throw new Error('Reveal from must be a non-negative integer.');
  }

  const frame = useCurrentFrame();
  const progress = Math.max(0, Math.min(1, (frame - from) / durationInFrames));
  const elapsedFrames = Math.max(0, frame - from);
  const resolvedCursor = typeof cursor === 'object'
    && cursor.blinkEveryFrames
    && Math.floor(elapsedFrames / cursor.blinkEveryFrames) % 2 === 1
    ? false
    : cursor;
  return (
    <RevealStateProvider state={{ progress, strategy, cursor: resolvedCursor }}>
      {children}
    </RevealStateProvider>
  );
}
