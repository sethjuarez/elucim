import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import type { ElementNode, ElucimV2Timeline } from '@elucim/dsl';
import { useEditorState } from '../state/EditorProvider';
import { getElementId } from '../state/types';
import { useEditorIcons } from '../theme/icons';
import { v } from '../theme/tokens';

export interface TimelineProps {
  className?: string;
  style?: React.CSSProperties;
  v2Timelines?: Record<string, ElucimV2Timeline>;
  onV2TimelinesChange?: (timelines: Record<string, ElucimV2Timeline> | undefined) => void;
}

const TRACK_HEIGHT = 24;
const RULER_HEIGHT = 20;
const LABEL_WIDTH = 80;
const EASING_OPTIONS = ['linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'easeInSine', 'easeOutSine', 'easeInOutSine', 'easeOutElastic', 'easeOutBounce', 'easeInBack', 'easeOutBack'];
const V2_ANIMATABLE_PROPERTIES = ['opacity', 'translate', 'scale', 'rotate', 'fill', 'stroke'] as const;
const WRAPPER_TYPES = new Set(['fadeIn', 'fadeOut', 'draw', 'write', 'transform', 'morph', 'stagger', 'parallel']);

interface TrackRow {
  element: ElementNode;
  id: string;
  label: string;
  rootIndex: number;
  depth: number;
  hasChildren: boolean;
  isTopLevel: boolean;
}

function getChildren(element: ElementNode): ElementNode[] {
  return 'children' in element && Array.isArray((element as any).children) ? (element as any).children : [];
}

function getRows(elements: ElementNode[], expandedIds: Set<string>, parentPath = 'root', depth = 0): TrackRow[] {
  return elements.flatMap((element, index) => {
    const id = getElementId(element, index, parentPath);
    const children = getChildren(element);
    const label = ('id' in element && element.id) ? element.id : `${element.type}[${index}]`;
    const row: TrackRow = {
      element,
      id,
      label,
      rootIndex: depth === 0 ? index : -1,
      depth,
      hasChildren: children.length > 0,
      isTopLevel: depth === 0,
    };
    return expandedIds.has(id)
      ? [row, ...getRows(children, expandedIds, id, depth + 1)]
      : [row];
  });
}

function getAnimationValues(element: ElementNode): { fadeIn: number; fadeOut: number; draw: number } {
  const el = element as any;
  if (el.type === 'fadeIn') return { fadeIn: el.duration ?? 0, fadeOut: 0, draw: 0 };
  if (el.type === 'fadeOut') return { fadeIn: 0, fadeOut: el.duration ?? 0, draw: 0 };
  if (el.type === 'draw' || el.type === 'write') return { fadeIn: 0, fadeOut: 0, draw: el.duration ?? 0 };
  if (WRAPPER_TYPES.has(el.type)) return { fadeIn: 0, fadeOut: 0, draw: el.duration ?? 0 };
  return { fadeIn: el.fadeIn ?? 0, fadeOut: el.fadeOut ?? 0, draw: el.draw ?? 0 };
}

function getAnimationUpdateProp(element: ElementNode, prop: 'fadeIn' | 'fadeOut' | 'draw'): 'fadeIn' | 'fadeOut' | 'draw' | 'duration' {
  return WRAPPER_TYPES.has(element.type) ? 'duration' : prop;
}

function createUniqueTimelineId(existing: Record<string, ElucimV2Timeline> | undefined, preferred: string): string {
  if (!existing?.[preferred]) return preferred;
  let index = 2;
  while (existing[`${preferred}-${index}`]) index += 1;
  return `${preferred}-${index}`;
}

/**
 * Animation timeline with playhead, per-element tracks, and playback controls.
 * Supports: editable labels, drag reorder, draggable animation bars, easing picker.
 */
export function Timeline({ className, style, v2Timelines, onV2TimelinesChange }: TimelineProps) {
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const rows = useMemo(() => getRows(children, expandedIds), [children, expandedIds]);
  const timelineClips = useMemo(() => Object.values(v2Timelines ?? {}), [v2Timelines]);
  const updateV2Timeline = useCallback((timeline: ElucimV2Timeline) => {
    onV2TimelinesChange?.({ ...(v2Timelines ?? {}), [timeline.id]: timeline });
  }, [onV2TimelinesChange, v2Timelines]);
  const deleteV2Timeline = useCallback((id: string) => {
    if (!v2Timelines) return;
    const next = { ...v2Timelines };
    delete next[id];
    onV2TimelinesChange?.(Object.keys(next).length > 0 ? next : undefined);
  }, [onV2TimelinesChange, v2Timelines]);
  const addIntroTimeline = useCallback(() => {
    const targets = rows.slice(0, 8).map(row => row.id);
    if (targets.length === 0) return;
    const id = createUniqueTimelineId(v2Timelines, 'auto-intro');
    const stagger = 6;
    const fadeDuration = 18;
    const duration = Math.min(durationInFrames, Math.max(fadeDuration, (targets.length - 1) * stagger + fadeDuration));
    updateV2Timeline({
      id,
      duration,
      tracks: targets.map((target, index) => {
        const start = Math.min(index * stagger, Math.max(0, duration - fadeDuration));
        return {
          target,
          property: 'opacity',
          keyframes: [
            { frame: start, value: 0 },
            { frame: Math.min(duration, start + fadeDuration), value: 1, easing: 'easeOutCubic' },
          ],
        };
      }),
    });
  }, [durationInFrames, rows, updateV2Timeline, v2Timelines]);
  const addBlankTimeline = useCallback(() => {
    const target = rows.find(row => selectedIds.includes(row.id))?.id ?? rows[0]?.id;
    if (!target) return;
    const id = createUniqueTimelineId(v2Timelines, 'timeline');
    updateV2Timeline({
      id,
      duration: Math.min(durationInFrames, 30),
      tracks: [
        {
          target,
          property: 'opacity',
          keyframes: [
            { frame: 0, value: 1 },
            { frame: Math.min(durationInFrames, 30), value: 1 },
          ],
        },
      ],
    });
  }, [durationInFrames, rows, selectedIds, updateV2Timeline, v2Timelines]);

  // ── Rename state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // ── Drag reorder state ──
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  // ── Easing picker state ──
  const [easingPickerId, setEasingPickerId] = useState<string | null>(null);

  // ── Animation bar drag state ──
  const barDragRef = useRef<{ elementId: string; prop: 'fadeIn' | 'fadeOut' | 'draw' | 'duration'; startX: number; startVal: number } | null>(null);

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

  const scrubRef = useRef<boolean>(false);
  const rulerRef = useRef<HTMLDivElement>(null);

  const scrubFromClientX = useCallback((clientX: number) => {
    const ruler = rulerRef.current;
    if (!ruler) return;
    const rect = ruler.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    dispatch({ type: 'SET_FRAME', frame: Math.round(ratio * (durationInFrames - 1)) });
  }, [dispatch, durationInFrames]);

  const handleRulerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubRef.current = true;
    scrubFromClientX(e.clientX);
  }, [scrubFromClientX]);

  const handleRulerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubRef.current) return;
    scrubFromClientX(e.clientX);
  }, [scrubFromClientX]);

  const handleRulerPointerUp = useCallback(() => {
    scrubRef.current = false;
  }, []);

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
  const handleBarEdgeDown = useCallback((elementId: string, prop: 'fadeIn' | 'fadeOut' | 'draw' | 'duration', startVal: number) => (e: React.PointerEvent) => {
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
    // fadeOut: drag left = grow, drag right = shrink (inverted)
    const adjustedDelta = drag.prop === 'fadeOut' ? -frameDelta : frameDelta;
    const newVal = Math.max(0, Math.min(durationInFrames, drag.startVal + adjustedDelta));
    dispatch({ type: 'UPDATE_ELEMENT', id: drag.elementId, changes: { [drag.prop]: newVal } as any });
  }, [dispatch, durationInFrames]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
        overflow: 'hidden',
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
        {onV2TimelinesChange && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              type="button"
              aria-label="Add v2 timeline"
              onClick={addBlankTimeline}
              style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', fontSize: 10, padding: '4px 7px' }}
            >
              Add timeline
            </button>
            <button
              type="button"
              aria-label="Add v2 intro clip"
              onClick={addIntroTimeline}
              style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', fontSize: 10, padding: '4px 7px' }}
            >
              Add intro clip
            </button>
          </div>
        )}
      </div>

      {/* Ruler + tracks */}
      <div style={{ position: 'relative' }} data-track-area>
        {/* Ruler */}
        <div
          ref={rulerRef}
          onPointerDown={handleRulerPointerDown}
          onPointerMove={handleRulerPointerMove}
          onPointerUp={handleRulerPointerUp}
          style={{
            height: RULER_HEIGHT,
            background: v('--elucim-editor-input-bg'),
            cursor: 'ew-resize',
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
          {/* Playhead handle + line */}
          <div
            onPointerDown={handleRulerPointerDown}
            onPointerMove={handleRulerPointerMove}
            onPointerUp={handleRulerPointerUp}
            style={{
              position: 'absolute',
              left: `${playheadPercent}%`,
              top: 0,
              transform: 'translateX(-6px)',
              width: 12,
              height: '100%',
              cursor: 'ew-resize',
              zIndex: 2,
            }}
          >
            {/* Triangle handle */}
            <div style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `8px solid ${v('--elucim-editor-accent')}`,
            }} />
            {/* Vertical line */}
            <div style={{
              position: 'absolute',
              left: 5,
              top: 8,
              width: 2,
              height: 'calc(100% - 8px)',
              background: v('--elucim-editor-accent'),
              borderRadius: 1,
            }} />
          </div>
        </div>

        {timelineClips.length > 0 && (
          <TimelineClipRows
            clips={timelineClips}
            durationInFrames={durationInFrames}
            onKeyframeClick={frame => dispatch({ type: 'SET_FRAME', frame: Math.max(0, Math.min(frame, durationInFrames - 1)) })}
            onTimelineChange={onV2TimelinesChange ? updateV2Timeline : undefined}
            onTimelineDelete={onV2TimelinesChange ? deleteV2Timeline : undefined}
            elementIds={rows.map(row => row.id)}
          />
        )}

        {/* Element tracks */}
        <div style={{ maxHeight: 140, overflowY: 'auto' }}>
          {rows.map((row, i) => {
            const { element: el, id } = row;
            const isSelected = selectedIds.includes(id);
            const { fadeIn, fadeOut, draw } = getAnimationValues(el);
            const label = row.label;
            const isDropTarget = row.isTopLevel && dropIdx === row.rootIndex && dragIdx !== null && dragIdx !== row.rootIndex;
            const canReorder = row.isTopLevel;
            const expanded = expandedIds.has(id);

            return (
              <div
                key={id}
                draggable={canReorder}
                onDragStart={canReorder ? handleTrackDragStart(row.rootIndex) : undefined}
                onDragOver={canReorder ? handleTrackDragOver(row.rootIndex) : undefined}
                onDrop={canReorder ? handleTrackDrop(row.rootIndex) : undefined}
                onDragEnd={handleTrackDragEnd}
                onClick={() => dispatch({ type: 'SELECT', ids: [id] })}
                style={{
                  height: TRACK_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
                  borderTop: isDropTarget ? `2px solid ${v('--elucim-editor-accent')}` : undefined,
                  background: isSelected ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 7%, transparent)` : 'transparent',
                  cursor: 'default',
                  opacity: dragIdx === row.rootIndex ? 0.5 : 1,
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <span style={{ display: 'inline-block', width: row.depth * 10, flexShrink: 0 }} />
                  {row.hasChildren ? (
                    <button
                      type="button"
                      aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
                      title={expanded ? 'Collapse children' : 'Expand children'}
                      onClick={e => {
                        e.stopPropagation();
                        toggleExpanded(id);
                      }}
                      style={{
                        width: 12,
                        height: 14,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        color: v('--elucim-editor-text-muted'),
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {expanded ? icons.ChevronDown({ size: 10 }) : icons.ChevronRight({ size: 10 })}
                    </button>
                  ) : (
                    <span style={{ width: 12, flexShrink: 0 }} />
                  )}
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
                  ) : <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
                </div>

                {/* Track bars */}
                <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                  {fadeIn > 0 && (
                    <AnimationBar
                      left={0}
                      width={(fadeIn / durationInFrames) * 100}
                      color={v('--elucim-editor-success')}
                      title={`fadeIn: ${fadeIn}f`}
                      onEdgeDrag={handleBarEdgeDown(id, getAnimationUpdateProp(el, 'fadeIn'), fadeIn)}
                      onClick={() => setEasingPickerId(easingPickerId === `${id}-fadeIn` ? null : `${id}-fadeIn`)}
                    />
                  )}
                  {draw > 0 && (
                    <AnimationBar
                      left={fadeIn > 0 ? (fadeIn / durationInFrames) * 100 : 0}
                      width={(draw / durationInFrames) * 100}
                      color={v('--elucim-editor-info')}
                      title={`draw: ${draw}f`}
                      onEdgeDrag={handleBarEdgeDown(id, getAnimationUpdateProp(el, 'draw'), draw)}
                      onClick={() => setEasingPickerId(easingPickerId === `${id}-draw` ? null : `${id}-draw`)}
                    />
                  )}
                  {fadeOut > 0 && (
                    <AnimationBar
                      left={100 - (fadeOut / durationInFrames) * 100}
                      width={(fadeOut / durationInFrames) * 100}
                      color={v('--elucim-editor-error')}
                      title={`fadeOut: ${fadeOut}f`}
                      onEdgeDrag={handleBarEdgeDown(id, getAnimationUpdateProp(el, 'fadeOut'), fadeOut)}
                      onClick={() => setEasingPickerId(easingPickerId === `${id}-fadeOut` ? null : `${id}-fadeOut`)}
                      edgeSide="left"
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
          height: rows.length * TRACK_HEIGHT,
          background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 53%, transparent)`,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Easing picker popover */}
      {easingPickerId && (() => {
        const [elemId, prop] = easingPickerId.split(/-(?=fadeIn|fadeOut|draw)/);
        const elNode = rows.find(row => row.id === elemId)?.element;
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

function TimelineClipRows({ clips, durationInFrames, onKeyframeClick, onTimelineChange, onTimelineDelete, elementIds }: {
  clips: ElucimV2Timeline[];
  durationInFrames: number;
  onKeyframeClick: (frame: number) => void;
  onTimelineChange?: (timeline: ElucimV2Timeline) => void;
  onTimelineDelete?: (id: string) => void;
  elementIds: string[];
}) {
  const updateDuration = (clip: ElucimV2Timeline, duration: number) => {
    const nextDuration = Math.max(1, Math.round(duration));
    onTimelineChange?.({
      ...clip,
      duration: nextDuration,
      tracks: clip.tracks.map(track => ({
        ...track,
        keyframes: track.keyframes.map(keyframe => ({ ...keyframe, frame: Math.min(keyframe.frame, nextDuration) })),
      })),
    });
  };
  const updateKeyframe = (clip: ElucimV2Timeline, trackIndex: number, keyframeIndex: number, patch: { frame?: number; value?: unknown }) => {
    onTimelineChange?.({
      ...clip,
      tracks: clip.tracks.map((track, currentTrackIndex) => currentTrackIndex === trackIndex
        ? {
            ...track,
            keyframes: track.keyframes
              .map((keyframe, currentKeyframeIndex) => currentKeyframeIndex === keyframeIndex ? { ...keyframe, ...patch } : keyframe)
              .sort((a, b) => a.frame - b.frame),
          }
        : track),
    });
  };
  const updateTrack = (clip: ElucimV2Timeline, trackIndex: number, patch: Partial<ElucimV2Timeline['tracks'][number]>) => {
    onTimelineChange?.({
      ...clip,
      tracks: clip.tracks.map((track, currentTrackIndex) => currentTrackIndex === trackIndex ? { ...track, ...patch } : track),
    });
  };
  const addTrack = (clip: ElucimV2Timeline) => {
    const target = elementIds[0] ?? clip.tracks[0]?.target;
    if (!target) return;
    onTimelineChange?.({
      ...clip,
      tracks: [
        ...clip.tracks,
        {
          target,
          property: 'opacity',
          keyframes: [
            { frame: 0, value: 1 },
            { frame: clip.duration, value: 1 },
          ],
        },
      ],
    });
  };
  const deleteTrack = (clip: ElucimV2Timeline, trackIndex: number) => {
    onTimelineChange?.({
      ...clip,
      tracks: clip.tracks.filter((_, currentTrackIndex) => currentTrackIndex !== trackIndex),
    });
  };
  const addKeyframe = (clip: ElucimV2Timeline, trackIndex: number) => {
    const middleFrame = Math.round(clip.duration / 2);
    onTimelineChange?.({
      ...clip,
      tracks: clip.tracks.map((track, currentTrackIndex) => currentTrackIndex === trackIndex
        ? {
            ...track,
            keyframes: [
              ...track.keyframes,
              { frame: middleFrame, value: track.keyframes.at(-1)?.value ?? 1 },
            ].sort((a, b) => a.frame - b.frame),
          }
        : track),
    });
  };
  const deleteKeyframe = (clip: ElucimV2Timeline, trackIndex: number, keyframeIndex: number) => {
    onTimelineChange?.({
      ...clip,
      tracks: clip.tracks.map((track, currentTrackIndex) => currentTrackIndex === trackIndex
        ? { ...track, keyframes: track.keyframes.filter((_, currentKeyframeIndex) => currentKeyframeIndex !== keyframeIndex) }
        : track),
    });
  };
  return (
    <div aria-label="V2 timeline clips" style={{ borderBottom: `1px solid ${v('--elucim-editor-border')}` }}>
      {clips.map(clip => (
        <div key={clip.id}>
          <div
            style={{
              height: TRACK_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 8%, transparent)`,
              borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
            }}
          >
            <div style={{ width: LABEL_WIDTH, padding: '0 8px', color: v('--elucim-editor-fg'), fontWeight: 600, flexShrink: 0 }}>
              Clip
            </div>
            <div style={{ color: v('--elucim-editor-text-secondary') }}>
              {clip.id} - {clip.duration}f - {clip.tracks.length} track{clip.tracks.length === 1 ? '' : 's'}
            </div>
            {onTimelineChange && (
              <label style={{ marginLeft: 10, display: 'flex', alignItems: 'center', gap: 4, color: v('--elucim-editor-text-secondary') }}>
                Duration
                <input
                  aria-label={`V2 timeline ${clip.id} duration`}
                  type="number"
                  min={1}
                  value={clip.duration}
                  onChange={event => updateDuration(clip, Number(event.target.value))}
                  style={{ width: 58, background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, padding: '1px 3px', fontSize: 10 }}
                />
              </label>
            )}
            {onTimelineDelete && (
              <button
                type="button"
                aria-label={`Remove v2 timeline ${clip.id}`}
                onClick={() => onTimelineDelete(clip.id)}
                style={{ marginLeft: 'auto', marginRight: 6, border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', fontSize: 10, padding: '2px 6px' }}
              >
                Remove
              </button>
            )}
            {onTimelineChange && (
              <button
                type="button"
                aria-label={`Add track to v2 timeline ${clip.id}`}
                onClick={() => addTrack(clip)}
                style={{ marginRight: 6, border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', fontSize: 10, padding: '2px 6px' }}
              >
                Add track
              </button>
            )}
          </div>
          {clip.tracks.map((track, trackIndex) => (
            <div
              key={`${clip.id}-${track.target}-${track.property}-${trackIndex}`}
              style={{
                height: TRACK_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
              }}
            >
              {onTimelineChange ? (
                <div style={{ width: LABEL_WIDTH, padding: '0 4px', display: 'grid', gridTemplateColumns: '1fr', gap: 2, flexShrink: 0 }}>
                  <select
                    aria-label={`V2 ${clip.id} track ${trackIndex + 1} target`}
                    value={track.target}
                    onChange={event => updateTrack(clip, trackIndex, { target: event.target.value })}
                    style={{ minWidth: 0, background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, fontSize: 9 }}
                  >
                    {elementIds.map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                  <select
                    aria-label={`V2 ${clip.id} track ${trackIndex + 1} property`}
                    value={track.property}
                    onChange={event => updateTrack(clip, trackIndex, { property: event.target.value as ElucimV2Timeline['tracks'][number]['property'] })}
                    style={{ minWidth: 0, background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, fontSize: 9 }}
                  >
                    {V2_ANIMATABLE_PROPERTIES.map(property => <option key={property} value={property}>{property}</option>)}
                  </select>
                </div>
              ) : (
                <div
                  title={`${track.target}.${track.property}`}
                  style={{
                    width: LABEL_WIDTH,
                    padding: '0 8px',
                    color: v('--elucim-editor-text-secondary'),
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {track.target}.{track.property}
                </div>
              )}
              <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: `${framePercent(track.keyframes[0]?.frame ?? 0, durationInFrames)}%`,
                    width: `${Math.max(0.5, framePercent(track.keyframes[track.keyframes.length - 1]?.frame ?? 0, durationInFrames) - framePercent(track.keyframes[0]?.frame ?? 0, durationInFrames))}%`,
                    top: 9,
                    height: 6,
                    borderRadius: 999,
                    background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 30%, transparent)`,
                  }}
                />
                {track.keyframes.map((keyframe, keyframeIndex) => (
                  <React.Fragment key={`${keyframe.frame}-${keyframeIndex}`}>
                    <button
                      type="button"
                      aria-label={`Go to ${clip.id} ${track.target}.${track.property} keyframe ${keyframe.frame}`}
                      title={`${keyframe.frame}f`}
                      onClick={event => {
                        event.stopPropagation();
                        onKeyframeClick(keyframe.frame);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${framePercent(keyframe.frame, durationInFrames)}%`,
                        top: 6,
                        width: 12,
                        height: 12,
                        transform: 'translateX(-6px) rotate(45deg)',
                        border: `1px solid ${v('--elucim-editor-accent')}`,
                        background: v('--elucim-editor-input-bg'),
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    />
                    {onTimelineChange && (
                      <span style={{ position: 'absolute', left: `${framePercent(keyframe.frame, durationInFrames)}%`, top: 2, transform: 'translateX(8px)', display: 'flex', gap: 2 }}>
                        <input
                          aria-label={`V2 ${clip.id} ${track.target}.${track.property} keyframe ${keyframeIndex + 1} frame`}
                          type="number"
                          min={0}
                          max={clip.duration}
                          value={keyframe.frame}
                          onChange={event => updateKeyframe(clip, trackIndex, keyframeIndex, { frame: Math.max(0, Math.min(clip.duration, Math.round(Number(event.target.value)))) })}
                          style={{ width: 42, background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, padding: '1px 2px', fontSize: 9 }}
                        />
                        <input
                          aria-label={`V2 ${clip.id} ${track.target}.${track.property} keyframe ${keyframeIndex + 1} value`}
                          value={String(keyframe.value)}
                          onChange={event => updateKeyframe(clip, trackIndex, keyframeIndex, { value: parseKeyframeValue(event.target.value) })}
                          style={{ width: 42, background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, padding: '1px 2px', fontSize: 9 }}
                        />
                        <button
                          type="button"
                          aria-label={`Remove v2 ${clip.id} ${track.target}.${track.property} keyframe ${keyframeIndex + 1}`}
                          onClick={() => deleteKeyframe(clip, trackIndex, keyframeIndex)}
                          style={{ width: 18, border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', fontSize: 9, padding: 0 }}
                        >
                          x
                        </button>
                      </span>
                    )}
                  </React.Fragment>
                ))}
                {onTimelineChange && (
                  <div style={{ position: 'absolute', right: 4, top: 3, display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      aria-label={`Add keyframe to v2 ${clip.id} ${track.target}.${track.property}`}
                      onClick={() => addKeyframe(clip, trackIndex)}
                      style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', fontSize: 9, padding: '1px 4px' }}
                    >
                      + key
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove v2 ${clip.id} ${track.target}.${track.property} track`}
                      onClick={() => deleteTrack(clip, trackIndex)}
                      style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', fontSize: 9, padding: '1px 4px' }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function parseKeyframeValue(value: string): unknown {
  const numeric = Number(value);
  return value.trim() !== '' && Number.isFinite(numeric) ? numeric : value;
}

function framePercent(frame: number, durationInFrames: number): number {
  return durationInFrames > 1 ? (Math.max(0, Math.min(frame, durationInFrames - 1)) / (durationInFrames - 1)) * 100 : 0;
}

function AnimationBar({ left, width, color, title, onEdgeDrag, onClick, edgeSide = 'right' }: {
  left: number; width: number; color: string; title: string;
  onEdgeDrag: (e: React.PointerEvent) => void;
  onClick: () => void;
  edgeSide?: 'left' | 'right';
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
      {/* Drag handle on the moveable edge */}
      <div
        onPointerDown={onEdgeDrag}
        style={{
          position: 'absolute',
          ...(edgeSide === 'left' ? { left: -2 } : { right: -2 }),
          top: 0,
          width: 5,
          height: '100%',
          cursor: 'ew-resize',
          background: `color-mix(in srgb, ${color} 80%, transparent)`,
          borderRadius: edgeSide === 'left' ? '2px 0 0 2px' : '0 2px 2px 0',
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
