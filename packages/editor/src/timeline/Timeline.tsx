import React, { useCallback, useRef, useEffect, useState } from 'react';
import type { ElementNode } from '@elucim/dsl';
import { useEditorState } from '../state/EditorProvider';
import { getElementId } from '../state/types';
import { useEditorIcons } from '../theme/icons';
import { v } from '../theme/tokens';

export interface TimelineProps {
  className?: string;
  style?: React.CSSProperties;
}

const TRACK_HEIGHT = 24;
const RULER_HEIGHT = 20;
const LABEL_WIDTH = 80;
const EASING_OPTIONS = ['linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'easeInSine', 'easeOutSine', 'easeInOutSine', 'easeOutElastic', 'easeOutBounce', 'easeInBack', 'easeOutBack'];

/**
 * Animation timeline with playhead, per-element tracks, and playback controls.
 * Supports: editable labels, drag reorder, draggable animation bars, easing picker.
 */
export function Timeline({ className, style }: TimelineProps) {
  const { state, dispatch } = useEditorState();
  const icons = useEditorIcons();
  const { document, currentFrame, isPlaying, selectedIds } = state;
  const root = document.root;
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const durationInFrames = ('durationInFrames' in root ? root.durationInFrames : undefined) ?? 120;
  const fps = ('fps' in root ? root.fps : undefined) ?? 60;
  const children: ElementNode[] = ('children' in root && Array.isArray(root.children)) ? root.children : [];
  const elementIds = children.map((el, i) => getElementId(el, i));

  // ── Rename state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // ── Drag reorder state ──
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  // ── Easing picker state ──
  const [easingPickerId, setEasingPickerId] = useState<string | null>(null);

  // ── Animation bar drag state ──
  const barDragRef = useRef<{ elementId: string; prop: 'fadeIn' | 'fadeOut' | 'draw'; startX: number; startVal: number } | null>(null);

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

  // ── Rename handlers ──
  const handleLabelDoubleClick = useCallback((id: string, currentLabel: string) => {
    setEditingId(id);
    setEditValue(currentLabel);
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim() && editValue.trim() !== editingId) {
      dispatch({ type: 'RENAME_ELEMENT', id: editingId, newId: editValue.trim() });
    }
    setEditingId(null);
  }, [dispatch, editingId, editValue]);

  // ── Drag reorder handlers ──
  const handleTrackDragStart = useCallback((idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleTrackDragOver = useCallback((idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIdx(idx);
  }, []);

  const handleTrackDrop = useCallback((idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      const id = elementIds[dragIdx];
      dispatch({ type: 'REORDER_ELEMENT', id, newIndex: idx });
    }
    setDragIdx(null);
    setDropIdx(null);
  }, [dragIdx, elementIds, dispatch]);

  const handleTrackDragEnd = useCallback(() => {
    setDragIdx(null);
    setDropIdx(null);
  }, []);

  // ── Animation bar edge drag ──
  const handleBarEdgeDown = useCallback((elementId: string, prop: 'fadeIn' | 'fadeOut' | 'draw', startVal: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    barDragRef.current = { elementId, prop, startX: e.clientX, startVal };
  }, []);

  const handleBarEdgeMove = useCallback((e: React.PointerEvent) => {
    const drag = barDragRef.current;
    if (!drag) return;
    const parent = (e.currentTarget as HTMLElement).closest('.elucim-editor-timeline');
    if (!parent) return;
    const trackArea = parent.querySelector('[data-track-area]') as HTMLElement;
    if (!trackArea) return;
    const trackWidth = trackArea.clientWidth - LABEL_WIDTH;
    const pixelDelta = e.clientX - drag.startX;
    const frameDelta = Math.round((pixelDelta / trackWidth) * durationInFrames);
    const newVal = Math.max(0, Math.min(durationInFrames, drag.startVal + (drag.prop === 'fadeOut' ? -frameDelta : frameDelta)));
    if (newVal !== drag.startVal + (drag.prop === 'fadeOut' ? -frameDelta : frameDelta)) return;
    dispatch({ type: 'UPDATE_ELEMENT', id: drag.elementId, changes: { [drag.prop]: Math.max(0, newVal) } as any });
  }, [dispatch, durationInFrames]);

  const handleBarEdgeUp = useCallback(() => {
    barDragRef.current = null;
  }, []);

  const playheadPercent = durationInFrames > 1 ? (currentFrame / (durationInFrames - 1)) * 100 : 0;

  return (
    <div
      className={`elucim-editor-timeline ${className ?? ''}`}
      style={{
        background: v('--elucim-editor-surface'),
        borderTop: `1px solid ${v('--elucim-editor-border')}`,
        fontSize: 11,
        userSelect: 'none',
        ...style,
      }}
      onPointerMove={handleBarEdgeMove}
      onPointerUp={handleBarEdgeUp}
    >
      {/* Controls bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}` }}>
        <TimelineButton icon={icons.SkipStart()} title="Start" onClick={goToStart} />
        <TimelineButton icon={icons.StepBackward()} title="Step back" onClick={stepBackward} />
        <TimelineButton icon={isPlaying ? icons.Pause() : icons.Play()} title={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} active={isPlaying} />
        <TimelineButton icon={icons.StepForward()} title="Step forward" onClick={stepForward} />
        <TimelineButton icon={icons.SkipEnd()} title="End" onClick={goToEnd} />
        <div style={{ marginLeft: 8, color: v('--elucim-editor-text-secondary'), fontVariantNumeric: 'tabular-nums' }}>
          {currentFrame} / {durationInFrames - 1} @ {fps}fps
        </div>
      </div>

      {/* Ruler + tracks */}
      <div style={{ position: 'relative' }} data-track-area>
        {/* Ruler */}
        <div
          onClick={handleRulerClick}
          style={{
            height: RULER_HEIGHT,
            background: v('--elucim-editor-input-bg'),
            cursor: 'pointer',
            position: 'relative',
            borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
            marginLeft: LABEL_WIDTH,
          }}
        >
          {Array.from({ length: 11 }, (_, i) => {
            const pct = i * 10;
            const frame = Math.round((pct / 100) * (durationInFrames - 1));
            return (
              <div key={i} style={{ position: 'absolute', left: `${pct}%`, top: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 1, height: 6, background: v('--elucim-editor-text-disabled') }} />
                <span style={{ fontSize: 8, color: v('--elucim-editor-text-muted') }}>{frame}</span>
              </div>
            );
          })}
          <div style={{
            position: 'absolute',
            left: `${playheadPercent}%`,
            top: 0,
            width: 2,
            height: '100%',
            background: v('--elucim-editor-accent'),
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
            const label = ('id' in el && el.id) ? el.id : `${el.type}[${i}]`;
            const isDropTarget = dropIdx === i && dragIdx !== null && dragIdx !== i;

            return (
              <div
                key={id}
                draggable
                onDragStart={handleTrackDragStart(i)}
                onDragOver={handleTrackDragOver(i)}
                onDrop={handleTrackDrop(i)}
                onDragEnd={handleTrackDragEnd}
                onClick={() => dispatch({ type: 'SELECT', ids: [id] })}
                style={{
                  height: TRACK_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
                  borderTop: isDropTarget ? `2px solid ${v('--elucim-editor-accent')}` : undefined,
                  background: isSelected ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 7%, transparent)` : 'transparent',
                  cursor: 'grab',
                  opacity: dragIdx === i ? 0.5 : 1,
                }}
              >
                {/* Label */}
                <div
                  onDoubleClick={() => handleLabelDoubleClick(id, label)}
                  style={{
                    width: LABEL_WIDTH,
                    padding: '0 6px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: isSelected ? v('--elucim-editor-accent') : v('--elucim-editor-text-secondary'),
                    fontSize: 10,
                    flexShrink: 0,
                  }}
                >
                  {editingId === id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: '100%',
                        fontSize: 10,
                        border: `1px solid ${v('--elucim-editor-accent')}`,
                        borderRadius: 2,
                        background: v('--elucim-editor-input-bg'),
                        color: v('--elucim-editor-fg'),
                        padding: '0 2px',
                        outline: 'none',
                      }}
                    />
                  ) : label}
                </div>

                {/* Track bars */}
                <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                  {fadeIn > 0 && (
                    <AnimationBar
                      left={0}
                      width={(fadeIn / durationInFrames) * 100}
                      color={v('--elucim-editor-success')}
                      title={`fadeIn: ${fadeIn}f`}
                      onEdgeDrag={handleBarEdgeDown(id, 'fadeIn', fadeIn)}
                      onClick={() => setEasingPickerId(easingPickerId === `${id}-fadeIn` ? null : `${id}-fadeIn`)}
                    />
                  )}
                  {draw > 0 && (
                    <AnimationBar
                      left={fadeIn > 0 ? (fadeIn / durationInFrames) * 100 : 0}
                      width={(draw / durationInFrames) * 100}
                      color={v('--elucim-editor-info')}
                      title={`draw: ${draw}f`}
                      onEdgeDrag={handleBarEdgeDown(id, 'draw', draw)}
                      onClick={() => setEasingPickerId(easingPickerId === `${id}-draw` ? null : `${id}-draw`)}
                    />
                  )}
                  {fadeOut > 0 && (
                    <AnimationBar
                      left={100 - (fadeOut / durationInFrames) * 100}
                      width={(fadeOut / durationInFrames) * 100}
                      color={v('--elucim-editor-error')}
                      title={`fadeOut: ${fadeOut}f`}
                      onEdgeDrag={handleBarEdgeDown(id, 'fadeOut', fadeOut)}
                      onClick={() => setEasingPickerId(easingPickerId === `${id}-fadeOut` ? null : `${id}-fadeOut`)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Playhead line across tracks */}
        <div style={{
          position: 'absolute',
          left: `calc(${LABEL_WIDTH}px + ${playheadPercent}% * (100% - ${LABEL_WIDTH}px) / 100%)`,
          top: RULER_HEIGHT,
          width: 1,
          height: children.length * TRACK_HEIGHT,
          background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 53%, transparent)`,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Easing picker popover */}
      {easingPickerId && (() => {
        const [elemId, prop] = easingPickerId.split(/-(?=fadeIn|fadeOut|draw)/);
        const elNode = children.find((c, i) => elementIds[i] === elemId);
        const currentEasing = (elNode as any)?.easing ?? 'linear';
        return (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: LABEL_WIDTH,
            background: v('--elucim-editor-surface'),
            border: `1px solid ${v('--elucim-editor-border')}`,
            borderRadius: 4,
            padding: 4,
            zIndex: 1000,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            maxWidth: 260,
          }}>
            <div style={{ width: '100%', fontSize: 9, color: v('--elucim-editor-text-muted'), padding: '2px 4px' }}>
              Easing for {prop}
            </div>
            {EASING_OPTIONS.map(eOpt => (
              <button
                key={eOpt}
                onClick={() => {
                  dispatch({ type: 'UPDATE_ELEMENT', id: elemId, changes: { easing: eOpt } as any });
                  setEasingPickerId(null);
                }}
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  border: `1px solid ${currentEasing === eOpt ? v('--elucim-editor-accent') : v('--elucim-editor-border-subtle')}`,
                  borderRadius: 3,
                  background: currentEasing === eOpt ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 20%, transparent)` : 'transparent',
                  color: v('--elucim-editor-fg'),
                  cursor: 'pointer',
                }}
              >
                {eOpt}
              </button>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function AnimationBar({ left, width, color, title, onEdgeDrag, onClick }: {
  left: number; width: number; color: string; title: string;
  onEdgeDrag: (e: React.PointerEvent) => void;
  onClick: () => void;
}) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: 4,
        width: `${width}%`,
        height: TRACK_HEIGHT - 8,
        background: `color-mix(in srgb, ${color} 40%, transparent)`,
        borderRadius: 2,
        cursor: 'pointer',
      }}
    >
      {/* Right edge drag handle */}
      <div
        onPointerDown={onEdgeDrag}
        style={{
          position: 'absolute',
          right: -2,
          top: 0,
          width: 5,
          height: '100%',
          cursor: 'ew-resize',
          background: `color-mix(in srgb, ${color} 80%, transparent)`,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  );
}

function TimelineButton({ icon, title, onClick, active }: {
  icon: React.ReactNode; title: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 3,
        background: active ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 20%, transparent)` : 'transparent',
        color: v('--elucim-editor-fg'),
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {icon}
    </button>
  );
}
