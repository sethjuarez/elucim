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

      {controls && <PlayerControls
        playing={playing}
        progress={progress}
        currentTime={currentTime}
        totalTime={totalTime}
        frame={frame}
        bg={controlsBackground}
        fg={controlsColor}
        accent={controlsAccent}
        onTogglePlay={togglePlay}
        onStepBack={stepBackward}
        onStepForward={stepForward}
        onScrub={handleScrub}
        onScrubDrag={handleScrubDrag}
      />}
    </div>
  );
}

/* ── SVG icon paths (Material Design) ── */
const ICON = {
  play:     'M8 5v14l11-7z',
  pause:    'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  skipBack: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
  skipFwd:  'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
};

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d={d} />
    </svg>
  );
}

/* ── Scoped CSS (injected once) ── */
const CONTROLS_CLASS = 'elucim-ctrl';
const controlsCSS = `
.${CONTROLS_CLASS} { display:flex; align-items:center; gap:10px; height:36px; padding:0 12px; box-sizing:border-box; font:11px/36px system-ui,sans-serif; }
.${CONTROLS_CLASS} .btn-group { display:flex; align-items:center; gap:2px; }
.${CONTROLS_CLASS} button { all:unset; cursor:pointer; display:flex; align-items:center; justify-content:center; width:28px; height:28px; }
.${CONTROLS_CLASS} .scrub { flex:1; height:28px; display:flex; align-items:center; cursor:pointer; }
.${CONTROLS_CLASS} .track { flex:1; height:4px; border-radius:2px; position:relative; }
.${CONTROLS_CLASS} .fill { position:absolute; left:0; top:0; height:100%; border-radius:2px; }
.${CONTROLS_CLASS} .handle { position:absolute; top:50%; width:10px; height:10px; border-radius:50%; box-sizing:border-box; transform:translate(-50%,-50%); }
.${CONTROLS_CLASS} .time { white-space:nowrap; font-variant-numeric:tabular-nums; }
`;
let cssInjected = false;

function PlayerControls({
  playing, progress, currentTime, totalTime, frame,
  bg, fg, accent,
  onTogglePlay, onStepBack, onStepForward, onScrub, onScrubDrag,
}: {
  playing: boolean; progress: number; currentTime: string; totalTime: string; frame: number;
  bg: string; fg: string; accent: string;
  onTogglePlay: () => void; onStepBack: () => void; onStepForward: () => void;
  onScrub: (e: React.MouseEvent<HTMLDivElement>) => void;
  onScrubDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const styleRef = useRef<HTMLStyleElement | null>(null);
  useEffect(() => {
    if (!cssInjected) {
      const el = document.createElement('style');
      el.textContent = controlsCSS;
      document.head.appendChild(el);
      styleRef.current = el;
      cssInjected = true;
    }
  }, []);

  return (
    <div className={CONTROLS_CLASS} style={{ background: bg, color: fg }} data-testid="elucim-controls">
      <div className="btn-group">
        <button onClick={onTogglePlay} data-testid="elucim-play-btn" title={playing ? 'Pause' : 'Play'}>
          <Icon d={playing ? ICON.pause : ICON.play} />
        </button>
        <button onClick={onStepBack} title="Step backward"><Icon d={ICON.skipBack} /></button>
        <button onClick={onStepForward} title="Step forward"><Icon d={ICON.skipFwd} /></button>
      </div>

      <div className="scrub" onClick={onScrub} onMouseMove={onScrubDrag} data-testid="elucim-scrubbar">
        <div className="track" style={{ background: fg + '33' }}>
          <div className="fill" style={{ width: `${progress * 100}%`, background: accent, transition: playing ? 'none' : 'width 0.05s' }} />
          <div className="handle" style={{ left: `${progress * 100}%`, background: accent, border: `2px solid ${fg}` }} data-testid="elucim-scrub-handle" />
        </div>
      </div>

      <span className="time" data-testid="elucim-frame-display">
        {currentTime}s / {totalTime}s · F{frame}
      </span>
    </div>
  );
}
