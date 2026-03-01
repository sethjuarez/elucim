import React, { useMemo } from 'react';
import { ElucimContext, useElucimContext } from '../context';

export interface SequenceProps {
  /** Frame at which this Sequence starts (relative to parent Scene) */
  from: number;
  /** Duration in frames. If omitted, extends to end of Scene */
  durationInFrames?: number;
  /** Children receive a remapped frame starting from 0 */
  children: React.ReactNode;
  /** Optional name for debugging */
  name?: string;
}

/**
 * Time-offset wrapper. Children see local frame = 0 at the Sequence's `from`.
 * Children are unmounted when outside the Sequence's time range.
 */
export function Sequence({
  from,
  durationInFrames,
  children,
  name,
}: SequenceProps) {
  const parent = useElucimContext();
  const localFrame = parent.frame - from;

  const duration = durationInFrames ?? parent.durationInFrames - from;

  const contextValue = useMemo(
    () => ({
      ...parent,
      frame: localFrame,
      durationInFrames: duration,
    }),
    [parent, localFrame, duration]
  );

  // Don't render if we haven't reached this Sequence yet
  if (localFrame < 0) return null;
  // Don't render after Sequence ends
  if (localFrame >= duration) return null;

  return (
    <ElucimContext.Provider value={contextValue}>
      <g data-sequence={name ?? ''}>
        {children}
      </g>
    </ElucimContext.Provider>
  );
}
