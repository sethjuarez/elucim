import type React from 'react';
import { v } from '../theme/tokens';
import { PLAYBACK_BUTTON_SIZE, PLAYBACK_PRIMARY_BUTTON_SIZE } from './constants';

export function TimelinePlaybackControls({
  currentFrame,
  maxFrame,
  fps,
  isPlaying,
  icons,
  onStart,
  onStepBackward,
  onTogglePlay,
  onStepForward,
  onEnd,
}: {
  currentFrame: number;
  maxFrame: number;
  fps: number;
  isPlaying: boolean;
  icons: {
    skipStart: React.ReactNode;
    stepBackward: React.ReactNode;
    playPause: React.ReactNode;
    stepForward: React.ReactNode;
    skipEnd: React.ReactNode;
  };
  onStart: () => void;
  onStepBackward: () => void;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onEnd: () => void;
}) {
  const frameNumberWidth = `${Math.max(2, String(maxFrame).length)}ch`;
  return (
    <div
      role="group"
      aria-label="Timeline playback controls"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: 2,
          border: `1px solid ${v('--elucim-editor-border-subtle')}`,
          borderRadius: 999,
          background: `color-mix(in srgb, ${v('--elucim-editor-input-bg')} 72%, transparent)`,
        }}
      >
        <TimelineButton icon={icons.skipStart} title="Start" onClick={onStart} size={PLAYBACK_BUTTON_SIZE} variant="ghost" />
        <TimelineButton icon={icons.stepBackward} title="Step back" onClick={onStepBackward} size={PLAYBACK_BUTTON_SIZE} variant="ghost" />
        <TimelineButton icon={icons.playPause} title={isPlaying ? 'Pause' : 'Play'} onClick={onTogglePlay} active={isPlaying} size={PLAYBACK_PRIMARY_BUTTON_SIZE} variant="primary" />
        <TimelineButton icon={icons.stepForward} title="Step forward" onClick={onStepForward} size={PLAYBACK_BUTTON_SIZE} variant="ghost" />
        <TimelineButton icon={icons.skipEnd} title="End" onClick={onEnd} size={PLAYBACK_BUTTON_SIZE} variant="ghost" />
      </div>
      <div
        aria-label={`Frame ${currentFrame} of ${maxFrame} at ${fps} frames per second`}
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 5,
          color: v('--elucim-editor-text-secondary'),
          fontVariantNumeric: 'tabular-nums',
          fontSize: 10,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ width: frameNumberWidth, color: v('--elucim-editor-fg'), fontWeight: 700, textAlign: 'right' }}>{currentFrame}</span>
        <span>/</span>
        <span style={{ width: frameNumberWidth }}>{maxFrame}</span>
        <span style={{ color: v('--elucim-editor-text-muted') }}>{fps}fps</span>
      </div>
    </div>
  );
}

function TimelineButton({ icon, title, onClick, active, size = 28, variant = 'default' }: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  size?: number;
  variant?: 'default' | 'ghost' | 'primary';
}) {
  const primary = variant === 'primary';
  const ghost = variant === 'ghost';
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: ghost ? 'none' : `1px solid ${active ? v('--elucim-editor-accent') : v('--elucim-editor-border-subtle')}`,
        borderRadius: 999,
        background: active
          ? `color-mix(in srgb, ${v('--elucim-editor-accent')} ${primary ? '28%' : '20%'}, transparent)`
          : primary
            ? v('--elucim-editor-input-bg')
            : 'transparent',
        color: active ? v('--elucim-editor-accent') : v('--elucim-editor-fg'),
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {icon}
    </button>
  );
}
