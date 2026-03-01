import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Scene, type SceneProps } from './Scene';

export interface PlayerProps extends Omit<SceneProps, 'frame' | 'autoPlay'> {
  /** Show controls bar. Default: true */
  controls?: boolean;
  /** Loop playback. Default: true */
  loop?: boolean;
  /** Auto-play on mount. Default: false */
  autoPlay?: boolean;
}

/**
 * Interactive player component with scrub bar, play/pause, and keyboard controls.
 */
export function Player({
  controls = true,
  loop = true,
  autoPlay = false,
  durationInFrames,
  fps = 60,
  width = 1920,
  height = 1080,
  children,
  ...sceneProps
}: PlayerProps) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const tick = useCallback(
    (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

      const delta = time - lastTimeRef.current;
      const frameDelta = (delta / 1000) * fps;

      if (frameDelta >= 1) {
        setFrame((prev) => {
          const next = prev + Math.floor(frameDelta);
          if (next >= durationInFrames) {
            if (loop) return 0;
            setPlaying(false);
            return durationInFrames - 1;
          }
          return next;
        });
        lastTimeRef.current = time;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [fps, durationInFrames, loop]
  );

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, tick]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const stepForward = useCallback(() => {
    setFrame((f) => Math.min(f + 1, durationInFrames - 1));
    setPlaying(false);
  }, [durationInFrames]);

  const stepBackward = useCallback(() => {
    setFrame((f) => Math.max(f - 1, 0));
    setPlaying(false);
  }, []);

  const seekTo = useCallback(
    (newFrame: number) => {
      setFrame(Math.max(0, Math.min(newFrame, durationInFrames - 1)));
    },
    [durationInFrames]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        !containerRef.current ||
        !containerRef.current.contains(document.activeElement) &&
        document.activeElement !== containerRef.current
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepBackward();
          break;
        case 'Home':
          e.preventDefault();
          seekTo(0);
          break;
        case 'End':
          e.preventDefault();
          seekTo(durationInFrames - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, stepForward, stepBackward, seekTo, durationInFrames]);

  const handleScrub = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      seekTo(Math.round(ratio * (durationInFrames - 1)));
    },
    [durationInFrames, seekTo]
  );

  const handleScrubDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.buttons !== 1) return;
      handleScrub(e);
    },
    [handleScrub]
  );

  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;
  const currentTime = (frame / fps).toFixed(2);
  const totalTime = ((durationInFrames - 1) / fps).toFixed(2);

  // Scale to fit within reasonable display size
  const maxDisplayWidth = width;
  const controlBarHeight = controls ? 52 : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{
        width: maxDisplayWidth,
        outline: 'none',
        fontFamily: 'system-ui, sans-serif',
      }}
      data-testid="elucim-player"
    >
      <Scene
        {...sceneProps}
        width={width}
        height={height}
        fps={fps}
        durationInFrames={durationInFrames}
        frame={frame}
      >
        {children}
      </Scene>

      {controls && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#1a1a2e',
            color: '#e0e0e0',
            height: controlBarHeight,
            boxSizing: 'border-box',
            fontSize: 13,
          }}
          data-testid="elucim-controls"
        >
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            style={{
              background: 'none',
              border: 'none',
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: 18,
              padding: '2px 6px',
              lineHeight: 1,
            }}
            data-testid="elucim-play-btn"
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? '⏸' : '▶'}
          </button>

          {/* Step backward */}
          <button
            onClick={stepBackward}
            style={{
              background: 'none',
              border: 'none',
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 4px',
            }}
            title="Step backward"
          >
            ◀
          </button>

          {/* Step forward */}
          <button
            onClick={stepForward}
            style={{
              background: 'none',
              border: 'none',
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 4px',
            }}
            title="Step forward"
          >
            ▶
          </button>

          {/* Scrub bar */}
          <div
            onClick={handleScrub}
            onMouseMove={handleScrubDrag}
            style={{
              flex: 1,
              height: 6,
              background: '#333',
              borderRadius: 3,
              cursor: 'pointer',
              position: 'relative',
            }}
            data-testid="elucim-scrubbar"
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${progress * 100}%`,
                background: '#4a9eff',
                borderRadius: 3,
                transition: playing ? 'none' : 'width 0.05s',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${progress * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#4a9eff',
                border: '2px solid #fff',
              }}
              data-testid="elucim-scrub-handle"
            />
          </div>

          {/* Frame counter / time display */}
          <span
            style={{ fontSize: 12, minWidth: 120, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
            data-testid="elucim-frame-display"
          >
            {currentTime}s / {totalTime}s &middot; F{frame}
          </span>
        </div>
      )}
    </div>
  );
}
