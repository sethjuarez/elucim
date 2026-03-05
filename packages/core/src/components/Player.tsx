import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Scene, type SceneProps } from './Scene';

export interface PlayerProps extends Omit<SceneProps, 'frame' | 'autoPlay'> {
  /** Show controls bar. Default: true */
  controls?: boolean;
  /** Loop playback. Default: true */
  loop?: boolean;
  /** Auto-play on mount. Default: false */
  autoPlay?: boolean;
  /** Background color of controls bar. Default: '#1a1a2e' */
  controlsBackground?: string;
  /** Text/icon color of controls bar. Default: '#e0e0e0' */
  controlsColor?: string;
  /** Accent color for scrub bar progress and handle. Default: '#4a9eff' */
  controlsAccent?: string;
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
  controlsBackground = '#1a1a2e',
  controlsColor = '#e0e0e0',
  controlsAccent = '#4a9eff',
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

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{
        width,
        maxWidth: '100%',
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

      {controls && <ControlBar
        playing={playing} progress={progress}
        time={`${currentTime}s / ${totalTime}s · F${frame}`}
        bg={controlsBackground} fg={controlsColor} accent={controlsAccent}
        onTogglePlay={togglePlay} onStepBack={stepBackward} onStepForward={stepForward}
        onScrub={handleScrub} onScrubDrag={handleScrubDrag}
      />}
    </div>
  );
}

/**
 * Flat flexbox controls bar with explicit resets.
 * Layout: [▶][◀][▶] [────●────────] [0.00s / 4.97s · F0]
 * Every element uses inline styles with all relevant properties reset
 * to prevent host-page CSS (e.g. Starlight) from interfering.
 */
function ControlBar({ playing, progress, time, bg, fg, accent, onTogglePlay, onStepBack, onStepForward, onScrub, onScrubDrag }: {
  playing: boolean; progress: number; time: string;
  bg: string; fg: string; accent: string;
  onTogglePlay: () => void; onStepBack: () => void; onStepForward: () => void;
  onScrub: (e: React.MouseEvent<HTMLDivElement>) => void;
  onScrubDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const h = 36;
  // Shared reset for every child — kills inherited margins/padding from host CSS
  const reset: React.CSSProperties = { margin: 0, padding: 0, border: 'none', boxSizing: 'border-box' as const };

  const iconBtn = (onClick: () => void, label: string, icon: React.ReactNode, testId?: string): React.ReactNode => (
    <button
      onClick={onClick}
      title={label}
      data-testid={testId}
      style={{
        ...reset,
        background: 'none',
        color: fg,
        cursor: 'pointer',
        width: 28,
        height: h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  );

  const svgIcon = (d: string, size = 14) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={reset}>
      <path d={d} fill={fg} />
    </svg>
  );

  const playIcon = svgIcon('M3 1 L3 13 L12 7 Z');
  const pauseIcon = (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" style={reset}>
      <rect x={2} y={1} width={3.5} height={12} rx={1} fill={fg} />
      <rect x={8.5} y={1} width={3.5} height={12} rx={1} fill={fg} />
    </svg>
  );
  const skipBackIcon = (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" style={reset}>
      <rect x={1} y={2} width={2.5} height={10} rx={0.5} fill={fg} />
      <path d="M13 2 L13 12 L5 7 Z" fill={fg} />
    </svg>
  );
  const skipFwdIcon = (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" style={reset}>
      <path d="M1 2 L1 12 L9 7 Z" fill={fg} />
      <rect x={10.5} y={2} width={2.5} height={10} rx={0.5} fill={fg} />
    </svg>
  );

  return (
    <div
      data-testid="elucim-controls"
      style={{
        ...reset,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        height: h,
        padding: '0 10px',
        background: bg,
        color: fg,
        userSelect: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        lineHeight: '1',
        overflow: 'hidden',
      }}
    >
      {/* Transport buttons — tightly grouped */}
      {iconBtn(onTogglePlay, playing ? 'Pause' : 'Play', playing ? pauseIcon : playIcon, 'elucim-play-btn')}
      {iconBtn(onStepBack, 'Step backward', skipBackIcon)}
      {iconBtn(onStepForward, 'Step forward', skipFwdIcon)}

      {/* Scrub bar — fills remaining space */}
      <div
        onClick={onScrub}
        onMouseMove={onScrubDrag}
        data-testid="elucim-scrubbar"
        style={{
          ...reset,
          flex: 1,
          height: h,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          position: 'relative',
          marginLeft: 8,
          marginRight: 8,
        }}
      >
        {/* Track background */}
        <div style={{ ...reset, flex: 1, height: 4, background: fg + '33', borderRadius: 2, position: 'relative' }}>
          {/* Track fill */}
          <div style={{ ...reset, position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress * 100}%`, background: accent, borderRadius: 2 }} />
          {/* Handle */}
          <div
            data-testid="elucim-scrub-handle"
            style={{
              ...reset,
              position: 'absolute',
              left: `${progress * 100}%`,
              top: '50%',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: accent,
              border: `2px solid ${fg}`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Time display */}
      <span
        data-testid="elucim-frame-display"
        style={{
          ...reset,
          fontSize: 11,
          color: fg,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          lineHeight: `${h}px`,
        }}
      >
        {time}
      </span>
    </div>
  );
}
