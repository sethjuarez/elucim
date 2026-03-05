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
 * Theme-aware controls bar using CSS custom properties.
 *
 * Props provide fallback values that are written as CSS custom properties
 * on the root element. Host pages can override these with plain CSS:
 *
 *   [data-testid="elucim-controls"] {
 *     --elucim-ctrl-bg: #f0f0f5;
 *     --elucim-ctrl-fg: #333;
 *     --elucim-ctrl-accent: #4a9eff;
 *   }
 *
 * All child elements inherit color from the root and SVGs use currentColor,
 * so a single CSS rule is enough to re-theme the entire bar.
 */
function ControlBar({ playing, progress, time, bg, fg, accent, onTogglePlay, onStepBack, onStepForward, onScrub, onScrubDrag }: {
  playing: boolean; progress: number; time: string;
  bg: string; fg: string; accent: string;
  onTogglePlay: () => void; onStepBack: () => void; onStepForward: () => void;
  onScrub: (e: React.MouseEvent<HTMLDivElement>) => void;
  onScrubDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const h = 36;
  const iconSize = 16;
  const r: React.CSSProperties = { margin: 0, padding: 0, border: 'none', boxSizing: 'border-box' };

  // Icons use currentColor so they inherit from the bar's color property
  const playIcon = (
    <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" style={r}>
      <path d="M4 2 L4 14 L13 8 Z" fill="currentColor" />
    </svg>
  );
  const pauseIcon = (
    <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" style={r}>
      <rect x={2.5} y={2} width={4} height={12} rx={1} fill="currentColor" />
      <rect x={9.5} y={2} width={4} height={12} rx={1} fill="currentColor" />
    </svg>
  );
  const skipBackIcon = (
    <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" style={r}>
      <rect x={1.5} y={3} width={2.5} height={10} rx={0.5} fill="currentColor" />
      <path d="M14 3 L14 13 L5.5 8 Z" fill="currentColor" />
    </svg>
  );
  const skipFwdIcon = (
    <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" style={r}>
      <path d="M2 3 L2 13 L10.5 8 Z" fill="currentColor" />
      <rect x={12} y={3} width={2.5} height={10} rx={0.5} fill="currentColor" />
    </svg>
  );

  const btn = (onClick: () => void, label: string, icon: React.ReactNode, testId?: string) => (
    <button onClick={onClick} title={label} data-testid={testId} style={{
      ...r, background: 'none', color: 'inherit', cursor: 'pointer',
      width: 30, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {icon}
    </button>
  );

  return (
    <div
      data-testid="elucim-controls"
      style={{
        ...r,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        height: h,
        padding: '0 10px',
        background: `var(--elucim-ctrl-bg, ${bg})`,
        color: `var(--elucim-ctrl-fg, ${fg})`,
        userSelect: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        lineHeight: '1',
        overflow: 'hidden',
      } as React.CSSProperties}
    >
      {btn(onTogglePlay, playing ? 'Pause' : 'Play', playing ? pauseIcon : playIcon, 'elucim-play-btn')}
      {btn(onStepBack, 'Step backward', skipBackIcon)}
      {btn(onStepForward, 'Step forward', skipFwdIcon)}

      {/* Scrub bar */}
      <div
        onClick={onScrub} onMouseMove={onScrubDrag}
        data-testid="elucim-scrubbar"
        style={{ ...r, flex: 1, height: h, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', marginLeft: 8, marginRight: 8 }}
      >
        {/* Track background — uses currentColor with opacity for theme adaptability */}
        <div style={{ ...r, flex: 1, height: 4, borderRadius: 2, position: 'relative', background: 'currentColor', opacity: 0.2 }} />
        {/* Track fill + handle — sits on top of the track via absolute positioning */}
        <div style={{ ...r, position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <div style={{ ...r, flex: 1, height: 4, borderRadius: 2, position: 'relative' }}>
            <div style={{ ...r, position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress * 100}%`, background: `var(--elucim-ctrl-accent, ${accent})`, borderRadius: 2 }} />
            <div
              data-testid="elucim-scrub-handle"
              style={{
                ...r, position: 'absolute', left: `${progress * 100}%`, top: '50%',
                width: 12, height: 12, borderRadius: '50%',
                background: `var(--elucim-ctrl-accent, ${accent})`, border: `2px solid var(--elucim-ctrl-fg, ${fg})`,
                transform: 'translate(-50%, -50%)', pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      </div>

      <span data-testid="elucim-frame-display" style={{
        ...r, fontSize: 11, color: 'inherit', fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap', flexShrink: 0, lineHeight: `${h}px`,
      }}>
        {time}
      </span>
    </div>
  );
}
