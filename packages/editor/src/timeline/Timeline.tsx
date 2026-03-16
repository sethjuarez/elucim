import React, { useCallback, useRef, useEffect } from 'react';
import type { ElementNode } from '@elucim/dsl';
import { useEditorState } from '../state/EditorProvider';
import { getElementId } from '../state/types';

export interface TimelineProps {
  className?: string;
  style?: React.CSSProperties;
}

const TRACK_HEIGHT = 24;
const HEADER_HEIGHT = 28;
const RULER_HEIGHT = 20;

/**
 * Animation timeline with playhead, per-element tracks, and playback controls.
 */
export function Timeline({ className, style }: TimelineProps) {
  const { state, dispatch } = useEditorState();
  const { document, currentFrame, isPlaying, selectedIds } = state;
  const root = document.root;
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const durationInFrames = ('durationInFrames' in root ? root.durationInFrames : undefined) ?? 120;
  const fps = ('fps' in root ? root.fps : undefined) ?? 60;
  const children: ElementNode[] = ('children' in root && Array.isArray(root.children)) ? root.children : [];
  const elementIds = children.map((el, i) => getElementId(el, i));

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
      return;
    }

    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - lastTimeRef.current;
      const frameDelta = (elapsed / 1000) * fps;
      if (frameDelta >= 1) {
        const newFrame = (currentFrame + Math.floor(frameDelta)) % durationInFrames;
        dispatch({ type: 'SET_FRAME', frame: newFrame });
        lastTimeRef.current = now;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, currentFrame, durationInFrames, fps, dispatch]);

  const togglePlay = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', playing: !isPlaying });
  }, [dispatch, isPlaying]);

  const stepForward = useCallback(() => {
    dispatch({ type: 'SET_FRAME', frame: Math.min(currentFrame + 1, durationInFrames - 1) });
  }, [dispatch, currentFrame, durationInFrames]);

  const stepBackward = useCallback(() => {
    dispatch({ type: 'SET_FRAME', frame: Math.max(currentFrame - 1, 0) });
  }, [dispatch, currentFrame]);

  const goToStart = useCallback(() => {
    dispatch({ type: 'SET_FRAME', frame: 0 });
  }, [dispatch]);

  const goToEnd = useCallback(() => {
    dispatch({ type: 'SET_FRAME', frame: durationInFrames - 1 });
  }, [dispatch, durationInFrames]);

  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    dispatch({ type: 'SET_FRAME', frame: Math.round(ratio * (durationInFrames - 1)) });
  }, [dispatch, durationInFrames]);

  const playheadPercent = durationInFrames > 1 ? (currentFrame / (durationInFrames - 1)) * 100 : 0;

  return (
    <div
      className={`elucim-editor-timeline ${className ?? ''}`}
      style={{
        background: '#12122a',
        borderTop: '1px solid #334155',
        fontSize: 11,
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Controls bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderBottom: '1px solid #1e293b' }}>
        <TimelineButton icon="⏮" title="Start" onClick={goToStart} />
        <TimelineButton icon="◀" title="Step back" onClick={stepBackward} />
        <TimelineButton icon={isPlaying ? '⏸' : '▶'} title={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} active={isPlaying} />
        <TimelineButton icon="▶" title="Step forward" onClick={stepForward} />
        <TimelineButton icon="⏭" title="End" onClick={goToEnd} />
        <div style={{ marginLeft: 8, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
          {currentFrame} / {durationInFrames - 1} @ {fps}fps
        </div>
      </div>

      {/* Ruler + tracks */}
      <div style={{ position: 'relative' }}>
        {/* Ruler */}
        <div
          onClick={handleRulerClick}
          style={{
            height: RULER_HEIGHT,
            background: '#0f172a',
            cursor: 'pointer',
            position: 'relative',
            borderBottom: '1px solid #1e293b',
          }}
        >
          {/* Tick marks */}
          {Array.from({ length: 11 }, (_, i) => {
            const pct = i * 10;
            const frame = Math.round((pct / 100) * (durationInFrames - 1));
            return (
              <div key={i} style={{ position: 'absolute', left: `${pct}%`, top: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 1, height: 6, background: '#475569' }} />
                <span style={{ fontSize: 8, color: '#64748b' }}>{frame}</span>
              </div>
            );
          })}

          {/* Playhead indicator on ruler */}
          <div style={{
            position: 'absolute',
            left: `${playheadPercent}%`,
            top: 0,
            width: 2,
            height: '100%',
            background: '#4a9eff',
            transform: 'translateX(-1px)',
          }} />
        </div>

        {/* Element tracks */}
        <div style={{ maxHeight: 140, overflowY: 'auto' }}>
          {children.map((el, i) => {
            const id = elementIds[i];
            const isSelected = selectedIds.includes(id);
            const elAny = el as any;
            const fadeIn = elAny.fadeIn ?? 0;
            const fadeOut = elAny.fadeOut ?? 0;
            const draw = elAny.draw ?? 0;

            return (
              <div
                key={id}
                onClick={() => dispatch({ type: 'SELECT', ids: [id] })}
                style={{
                  height: TRACK_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid #1e293b',
                  background: isSelected ? '#4a9eff11' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {/* Label */}
                <div style={{
                  width: 80,
                  padding: '0 6px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isSelected ? '#4a9eff' : '#94a3b8',
                  fontSize: 10,
                  flexShrink: 0,
                }}>
                  {('id' in el && el.id) ? el.id : `${el.type}[${i}]`}
                </div>

                {/* Track bars */}
                <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                  {/* FadeIn bar */}
                  {fadeIn > 0 && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 4,
                      width: `${(fadeIn / durationInFrames) * 100}%`,
                      height: TRACK_HEIGHT - 8,
                      background: '#34d39966',
                      borderRadius: 2,
                    }} title={`fadeIn: ${fadeIn}f`} />
                  )}
                  {/* Draw bar */}
                  {draw > 0 && (
                    <div style={{
                      position: 'absolute',
                      left: fadeIn > 0 ? `${(fadeIn / durationInFrames) * 100}%` : 0,
                      top: 4,
                      width: `${(draw / durationInFrames) * 100}%`,
                      height: TRACK_HEIGHT - 8,
                      background: '#4fc3f766',
                      borderRadius: 2,
                    }} title={`draw: ${draw}f`} />
                  )}
                  {/* FadeOut bar */}
                  {fadeOut > 0 && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: 4,
                      width: `${(fadeOut / durationInFrames) * 100}%`,
                      height: TRACK_HEIGHT - 8,
                      background: '#f8717166',
                      borderRadius: 2,
                    }} title={`fadeOut: ${fadeOut}f`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Playhead line across tracks */}
        <div style={{
          position: 'absolute',
          left: `calc(80px + ${playheadPercent}% * (100% - 80px) / 100%)`,
          top: RULER_HEIGHT,
          width: 1,
          height: children.length * TRACK_HEIGHT,
          background: '#4a9eff88',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function TimelineButton({ icon, title, onClick, active }: {
  icon: string; title: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 28,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 3,
        background: active ? '#4a9eff33' : 'transparent',
        color: '#e0e0e0',
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      {icon}
    </button>
  );
}
