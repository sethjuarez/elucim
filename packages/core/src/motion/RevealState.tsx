import React, { createContext, useContext } from 'react';

export type RevealStrategy = 'type' | 'fade';

export interface RevealCursorOptions {
  character?: string;
  blinkEveryFrames?: number;
  hideWhenComplete?: boolean;
}

/**
 * Resolved reveal progress supplied by the canonical DSL timeline renderer.
 * Primitives consume this state but never schedule reveal effects themselves.
 */
export interface RevealState {
  progress: number;
  strategy: RevealStrategy;
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
