import React, { useState, useCallback, useEffect, useRef, forwardRef } from 'react';
import { ElucimContext, type ElucimContextValue } from '../context';
import { useInsidePresentation } from './Presentation';
import { sortByZIndex } from '../primitives/transform';

export interface SceneProps {
  /** Width in pixels. Default: 1920 */
  width?: number;
  /** Height in pixels. Default: 1080 */
  height?: number;
  /** Frames per second. Default: 60 */
  fps?: number;
  /** Total duration in frames */
  durationInFrames: number;
  /** Background color. Default: auto (light/dark aware) */
  background?: string;
  /** Children to render */
  children: React.ReactNode;
  /** If true, auto-plays on mount. Default: false */
  autoPlay?: boolean;
  /**
   * Controlled frame (if provided, Scene is in controlled mode).
   * Used by Player to drive the Scene externally.
   */
  frame?: number;
  /** CSS class name */
  className?: string;
  /** CSS style */
  style?: React.CSSProperties;
}

/**
 * Root composition component.
 * Provides frame clock and dimensions to all children via context.
 * Forwards ref to the inner SVG element.
 */
export const Scene = forwardRef<SVGSVGElement, SceneProps>(function Scene(
  {
    width = 1920,
    height = 1080,
    fps = 60,
    durationInFrames,
    background = 'light-dark(#f5f5fa, #0d0d1a)',
    children,
    autoPlay = false,
    frame: controlledFrame,
    className,
    style,
  },
  ref
) {
  const [internalFrame, setInternalFrame] = useState(0);
  const isControlled = controlledFrame !== undefined;
  const frame = isControlled ? controlledFrame : internalFrame;
  const playingRef = useRef(autoPlay && !isControlled);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  const tick = useCallback(
    (time: number) => {
      if (!playingRef.current) return;

      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

      const delta = time - lastTimeRef.current;
      const frameDelta = (delta / 1000) * fps;

      if (frameDelta >= 1) {
        setInternalFrame((prev) => {
          const next = prev + Math.floor(frameDelta);
          return next >= durationInFrames ? 0 : next;
        });
        lastTimeRef.current = time;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [fps, durationInFrames]
  );

  useEffect(() => {
    if (!isControlled && playingRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick, isControlled]);

  const contextValue: ElucimContextValue = {
    frame,
    fps,
    durationInFrames,
    width,
    height,
  };

  const insidePresentation = useInsidePresentation();
  const effectiveBg = insidePresentation ? 'transparent' : `var(--elucim-scene-bg, ${background})`;

  return (
    <ElucimContext.Provider value={contextValue}>
      <div
        className={className}
        style={{
          position: 'relative',
          width: insidePresentation ? '100%' : width,
          height: insidePresentation ? '100%' : undefined,
          maxWidth: '100%',
          aspectRatio: insidePresentation ? undefined : `${width} / ${height}`,
          overflow: 'hidden',
          background: effectiveBg,
          colorScheme: 'light dark',
          color: 'var(--elucim-scene-fg, light-dark(#333, #e0e0e0))',
          ...style,
        }}
        data-testid="elucim-scene"
      >
        <svg
          ref={ref}
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {sortByZIndex(children)}
        </svg>
      </div>
    </ElucimContext.Provider>
  );
});
