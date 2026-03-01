import { createContext, useContext } from 'react';

export interface ElucimContextValue {
  /** Current frame number (0 → durationInFrames - 1) */
  frame: number;
  /** Frames per second */
  fps: number;
  /** Total duration in frames */
  durationInFrames: number;
  /** Scene width in pixels */
  width: number;
  /** Scene height in pixels */
  height: number;
}

export const ElucimContext = createContext<ElucimContextValue | null>(null);

export function useElucimContext(): ElucimContextValue {
  const ctx = useContext(ElucimContext);
  if (!ctx) {
    throw new Error(
      'useElucimContext must be used inside a <Scene> component.'
    );
  }
  return ctx;
}
