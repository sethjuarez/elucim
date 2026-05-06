import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import type { ElementNode, ElucimV2StateMachine, ElucimV2Timeline, ElucimV2Transition } from '@elucim/dsl';
import { BaseEdge, EdgeLabelRenderer, Handle, MarkerType, Panel, Position, ReactFlow, applyNodeChanges, getSmoothStepPath, type Edge, type EdgeProps, type Node, type NodeMouseHandler, type NodeProps, type OnConnect, type OnNodeDrag, type OnNodesChange, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEditorState } from '../state/EditorProvider';
import { getElementId } from '../state/types';
import { useEditorIcons } from '../theme/icons';
import { v } from '../theme/tokens';

export interface TimelineProps {
  className?: string;
  style?: React.CSSProperties;
  v2Timelines?: Record<string, ElucimV2Timeline>;
  onV2TimelinesChange?: (timelines: Record<string, ElucimV2Timeline> | undefined) => void;
  v2StateMachines?: Record<string, ElucimV2StateMachine>;
  onV2StateMachinesChange?: (stateMachines: Record<string, ElucimV2StateMachine> | undefined) => void;
  onV2MotionChange?: (timelines: Record<string, ElucimV2Timeline> | undefined, stateMachines: Record<string, ElucimV2StateMachine> | undefined) => void;
  preferredMotionType?: 'animation' | 'stateMachine';
  onActiveTimelineChange?: (timelineId: string | undefined) => void;
}

const TRACK_HEIGHT = 30;
const RULER_HEIGHT = 24;
const CLIP_HEADER_HEIGHT = 46;
const LABEL_WIDTH = 156;
const EASING_OPTIONS = ['linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'easeInSine', 'easeOutSine', 'easeInOutSine', 'easeOutElastic', 'easeOutBounce', 'easeInBack', 'easeOutBack'];
const V2_ANIMATABLE_PROPERTIES = ['opacity', 'translate', 'scale', 'rotate', 'fill', 'stroke'] as const;
const WRAPPER_TYPES = new Set(['fadeIn', 'fadeOut', 'draw', 'write', 'transform', 'morph', 'stagger', 'parallel']);
type GraphLayoutDirection = 'horizontal' | 'vertical';
interface StateMachineGraphNodeData extends Record<string, unknown> {
  stateId: string;
  timeline?: string;
  initial: boolean;
  reset: boolean;
  selected: boolean;
  direction: GraphLayoutDirection;
  onPreviewState?: (stateId: string) => void;
}
interface StateMachineGraphEdgeData extends Record<string, unknown> {
  label: string;
  detail?: string;
  selected: boolean;
  backEdge: boolean;
  direction: GraphLayoutDirection;
}
const chromeTabButtonStyle = (active: boolean, disabled = false): React.CSSProperties => ({
  minHeight: 24,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  border: `1px solid ${active ? v('--elucim-editor-accent') : v('--elucim-editor-border-subtle')}`,
  borderRadius: 999,
  background: active ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 14%, transparent)` : 'transparent',
  color: disabled ? v('--elucim-editor-text-disabled') : active ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 10,
  fontWeight: 700,
  padding: '3px 9px',
});
const verticalMotionButtonStyle = (active: boolean, disabled = false): React.CSSProperties => ({
  width: 24,
  height: 24,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${active ? v('--elucim-editor-accent') : v('--elucim-editor-border-subtle')}`,
  borderRadius: 7,
  background: active ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 16%, transparent)` : 'transparent',
  color: disabled ? v('--elucim-editor-text-disabled') : active ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 11,
  fontWeight: 800,
  padding: 0,
});

interface SelectedV2TimelineItem {
  type: 'animation';
  timelineId: string;
  trackIndex?: number;
  keyframeIndex?: number;
}

interface SelectedStateMachineItem {
  type: 'stateMachine';
  machineId: string;
  stateId?: string;
  transitionEvent?: string;
}

type SelectedMotionItem = SelectedV2TimelineItem | SelectedStateMachineItem;

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

function createUniqueStateMachineId(existing: Record<string, ElucimV2StateMachine> | undefined, preferred: string): string {
  if (!existing?.[preferred]) return preferred;
  let index = 2;
  while (existing[`${preferred}-${index}`]) index += 1;
  return `${preferred}-${index}`;
}

function normalizeGraphId(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

/**
 * Animation timeline with playhead, per-element tracks, and playback controls.
 * Supports: editable labels, drag reorder, draggable animation bars, easing picker.
 */
export function Timeline({ className, style, v2Timelines, onV2TimelinesChange, v2StateMachines, onV2StateMachinesChange, onV2MotionChange, preferredMotionType = 'animation', onActiveTimelineChange }: TimelineProps) {
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
  const stateMachineClips = useMemo(() => Object.values(v2StateMachines ?? {}), [v2StateMachines]);
  const showLegacyElementTracks = timelineClips.length === 0 && stateMachineClips.length === 0;
  const [activeMotionType, setActiveMotionType] = useState<'animation' | 'stateMachine'>(preferredMotionType);
  const [activeTimelineId, setActiveTimelineId] = useState<string | undefined>(undefined);
  const showAnimationTimeline = showLegacyElementTracks || activeMotionType === 'animation';
  const activeTimelineMaxFrame = activeTimelineId && v2Timelines?.[activeTimelineId]
    ? v2Timelines[activeTimelineId].duration
    : durationInFrames - 1;
  const scopedPlayheadPercent = activeTimelineMaxFrame > 0 ? (Math.min(currentFrame, activeTimelineMaxFrame) / activeTimelineMaxFrame) * 100 : 0;
  const updateV2Timeline = useCallback((timeline: ElucimV2Timeline) => {
    onV2TimelinesChange?.({ ...(v2Timelines ?? {}), [timeline.id]: timeline });
  }, [onV2TimelinesChange, v2Timelines]);
  const renameV2Timeline = useCallback((timeline: ElucimV2Timeline, nextId: string) => {
    if (!v2Timelines || timeline.id === nextId) return;
    const existing = { ...v2Timelines };
    delete existing[timeline.id];
    const normalizedId = createUniqueTimelineId(existing, normalizeGraphId(nextId, timeline.id));
    if (normalizedId === timeline.id) return;
    const renamedTimeline = { ...timeline, id: normalizedId };
    const nextTimelines = { ...existing, [normalizedId]: renamedTimeline };
    const renameTransitionTimeline = (transition: string | ElucimV2Transition): string | ElucimV2Transition => (
      typeof transition === 'string'
        ? transition
        : { ...transition, timeline: transition.timeline === timeline.id ? normalizedId : transition.timeline }
    );
    const nextStateMachines = v2StateMachines
      ? Object.fromEntries(Object.entries(v2StateMachines).map(([machineId, machine]) => [machineId, {
          ...machine,
          states: Object.fromEntries(Object.entries(machine.states).map(([stateId, state]) => [stateId, {
            ...state,
            timeline: state.timeline === timeline.id ? normalizedId : state.timeline,
            on: state.on ? Object.fromEntries(Object.entries(state.on).map(([eventName, transition]) => [eventName, renameTransitionTimeline(transition)])) : undefined,
            onComplete: state.onComplete ? renameTransitionTimeline(state.onComplete) : undefined,
          }])),
        }]))
      : undefined;
    if (onV2MotionChange) onV2MotionChange(nextTimelines, nextStateMachines ?? v2StateMachines);
    else {
      onV2TimelinesChange?.(nextTimelines);
      if (nextStateMachines) onV2StateMachinesChange?.(nextStateMachines);
    }
    onActiveTimelineChange?.(normalizedId);
  }, [onActiveTimelineChange, onV2MotionChange, onV2StateMachinesChange, onV2TimelinesChange, v2StateMachines, v2Timelines]);
  const updateV2StateMachine = useCallback((machine: ElucimV2StateMachine) => {
    onV2StateMachinesChange?.({ ...(v2StateMachines ?? {}), [machine.id]: machine });
  }, [onV2StateMachinesChange, v2StateMachines]);
  const renameV2StateMachine = useCallback((machine: ElucimV2StateMachine, nextId: string) => {
    if (!v2StateMachines || machine.id === nextId) return;
    const normalizedId = createUniqueStateMachineId(v2StateMachines, normalizeGraphId(nextId, machine.id));
    if (normalizedId === machine.id) return;
    const next = { ...v2StateMachines };
    delete next[machine.id];
    next[normalizedId] = { ...machine, id: normalizedId };
    onV2StateMachinesChange?.(next);
  }, [onV2StateMachinesChange, v2StateMachines]);
  const deleteV2Timeline = useCallback((id: string) => {
    if (!v2Timelines) return;
    const next = { ...v2Timelines };
    delete next[id];
    const nextTimelines = Object.keys(next).length > 0 ? next : undefined;
    const clearTransitionTimeline = (transition: string | ElucimV2Transition): string | ElucimV2Transition => (
      typeof transition === 'string' || transition.timeline !== id
        ? transition
        : { ...transition, timeline: undefined }
    );
    const nextStateMachines = v2StateMachines
      ? Object.fromEntries(Object.entries(v2StateMachines).map(([machineId, machine]) => [machineId, {
          ...machine,
          states: Object.fromEntries(Object.entries(machine.states).map(([stateId, state]) => [stateId, {
            ...state,
            timeline: state.timeline === id ? undefined : state.timeline,
            on: state.on ? Object.fromEntries(Object.entries(state.on).map(([eventName, transition]) => [eventName, clearTransitionTimeline(transition)])) : undefined,
            onComplete: state.onComplete ? clearTransitionTimeline(state.onComplete) : undefined,
          } satisfies ElucimV2StateMachine['states'][string]])),
        } satisfies ElucimV2StateMachine]))
      : undefined;
    if (onV2MotionChange) onV2MotionChange(nextTimelines, nextStateMachines ?? v2StateMachines);
    else {
      onV2TimelinesChange?.(nextTimelines);
      if (nextStateMachines) onV2StateMachinesChange?.(nextStateMachines);
    }
  }, [onV2MotionChange, onV2StateMachinesChange, onV2TimelinesChange, v2StateMachines, v2Timelines]);
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
  const addStateMachine = useCallback(() => {
    const id = createUniqueStateMachineId(v2StateMachines, 'state-machine');
    updateV2StateMachine({
      id,
      initial: 'idle',
      reset: 'idle',
      states: { idle: {} },
    });
  }, [updateV2StateMachine, v2StateMachines]);

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
        const playbackDuration = Math.max(1, activeTimelineMaxFrame + 1);
        const newFrame = (currentFrame + Math.floor(frameDelta)) % playbackDuration;
        dispatch({ type: 'SET_FRAME', frame: newFrame });
        lastTimeRef.current = now;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, [activeTimelineMaxFrame, isPlaying, currentFrame, fps, dispatch]);

  const handleActiveTimelineChange = useCallback((timelineId: string | undefined) => {
    setActiveTimelineId(timelineId);
    const nextMaxFrame = timelineId && v2Timelines?.[timelineId] ? v2Timelines[timelineId].duration : durationInFrames - 1;
    if (currentFrame > nextMaxFrame) dispatch({ type: 'SET_FRAME', frame: nextMaxFrame });
    onActiveTimelineChange?.(timelineId);
  }, [currentFrame, dispatch, durationInFrames, onActiveTimelineChange, v2Timelines]);

  const togglePlay = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', playing: !isPlaying });
  }, [dispatch, isPlaying]);

  const stepForward = useCallback(() => {
    dispatch({ type: 'SET_FRAME', frame: Math.min(currentFrame + 1, activeTimelineMaxFrame) });
  }, [activeTimelineMaxFrame, dispatch, currentFrame]);

  const stepBackward = useCallback(() => {
    dispatch({ type: 'SET_FRAME', frame: Math.max(currentFrame - 1, 0) });
  }, [dispatch, currentFrame]);

  const goToStart = useCallback(() => {
    dispatch({ type: 'SET_FRAME', frame: 0 });
  }, [dispatch]);

  const goToEnd = useCallback(() => {
    dispatch({ type: 'SET_FRAME', frame: activeTimelineMaxFrame });
  }, [activeTimelineMaxFrame, dispatch]);

  const scrubRef = useRef<boolean>(false);
  const rulerRef = useRef<HTMLDivElement>(null);

  const scrubFromClientX = useCallback((clientX: number) => {
    const ruler = rulerRef.current;
    if (!ruler) return;
    const rect = ruler.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    dispatch({ type: 'SET_FRAME', frame: Math.round(ratio * activeTimelineMaxFrame) });
  }, [activeTimelineMaxFrame, dispatch]);

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

  const playheadPercent = scopedPlayheadPercent;

  return (
    <div
      className={`elucim-editor-timeline ${className ?? ''}`}
      style={{
        background: v('--elucim-editor-surface'),
        borderTop: `1px solid ${v('--elucim-editor-border')}`,
        fontSize: 11,
        userSelect: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
      onPointerMove={handleBarEdgeMove}
      onPointerUp={handleBarEdgeUp}
    >
      {showLegacyElementTracks && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}` }}>
        {showLegacyElementTracks && showAnimationTimeline && (
          <>
            <TimelineButton icon={icons.SkipStart()} title="Start" onClick={goToStart} />
            <TimelineButton icon={icons.StepBackward()} title="Step back" onClick={stepBackward} />
            <TimelineButton icon={isPlaying ? icons.Pause() : icons.Play()} title={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} active={isPlaying} />
            <TimelineButton icon={icons.StepForward()} title="Step forward" onClick={stepForward} />
            <TimelineButton icon={icons.SkipEnd()} title="End" onClick={goToEnd} />
            <div style={{ marginLeft: 8, color: v('--elucim-editor-text-secondary'), fontVariantNumeric: 'tabular-nums' }}>
              {currentFrame} / {durationInFrames - 1} @ {fps}fps
            </div>
          </>
        )}
      </div>
      )}

      {/* Ruler + tracks */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }} data-track-area>
        {/* Ruler */}
        {showLegacyElementTracks && showAnimationTimeline && (
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
              <div style={{
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `8px solid ${v('--elucim-editor-accent')}`,
              }} />
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
        )}

        {(timelineClips.length > 0 || stateMachineClips.length > 0 || onV2TimelinesChange || onV2StateMachinesChange) && (
          <TimelineClipRows
            clips={timelineClips}
            durationInFrames={activeTimelineMaxFrame + 1}
            onKeyframeClick={frame => dispatch({ type: 'SET_FRAME', frame: Math.max(0, Math.min(frame, activeTimelineMaxFrame)) })}
            onTimelineChange={onV2TimelinesChange ? updateV2Timeline : undefined}
            onTimelineRename={onV2TimelinesChange ? renameV2Timeline : undefined}
            onTimelineDelete={onV2TimelinesChange ? deleteV2Timeline : undefined}
            onAddTimeline={onV2TimelinesChange ? addBlankTimeline : undefined}
            onAddIntroTimeline={onV2TimelinesChange ? addIntroTimeline : undefined}
            elementIds={rows.map(row => row.id)}
            stateMachines={stateMachineClips}
            timelines={v2Timelines ?? {}}
            onStateMachineChange={onV2StateMachinesChange ? updateV2StateMachine : undefined}
            onStateMachineRename={onV2StateMachinesChange ? renameV2StateMachine : undefined}
            onAddStateMachine={onV2StateMachinesChange ? addStateMachine : undefined}
            preferredMotionType={preferredMotionType}
            onMotionTypeChange={setActiveMotionType}
            onActiveTimelineChange={handleActiveTimelineChange}
            playheadPercent={playheadPercent}
            playbackControls={(
              <>
                <TimelineButton icon={icons.SkipStart({ size: 11 })} title="Start" onClick={goToStart} size={18} />
                <TimelineButton icon={icons.StepBackward({ size: 11 })} title="Step back" onClick={stepBackward} size={18} />
                <TimelineButton icon={isPlaying ? icons.Pause({ size: 11 }) : icons.Play({ size: 11 })} title={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} active={isPlaying} size={18} />
                <TimelineButton icon={icons.StepForward({ size: 11 })} title="Step forward" onClick={stepForward} size={18} />
                <TimelineButton icon={icons.SkipEnd({ size: 11 })} title="End" onClick={goToEnd} size={18} />
                <span style={{ color: v('--elucim-editor-text-secondary'), fontVariantNumeric: 'tabular-nums', fontSize: 10, whiteSpace: 'nowrap' }}>
                  {Math.min(currentFrame, activeTimelineMaxFrame)} / {activeTimelineMaxFrame} @ {fps}fps
                </span>
              </>
            )}
            rulerRef={rulerRef}
            onRulerPointerDown={handleRulerPointerDown}
            onRulerPointerMove={handleRulerPointerMove}
            onRulerPointerUp={handleRulerPointerUp}
            onStopPlayback={() => dispatch({ type: 'SET_PLAYING', playing: false })}
            onPreviewState={() => {
              dispatch({ type: 'SET_FRAME', frame: 0 });
              dispatch({ type: 'SET_PLAYING', playing: true });
            }}
          />
        )}

        {/* Element tracks */}
        {showLegacyElementTracks && (
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
        )}

        {showLegacyElementTracks && (
          <div style={{
            position: 'absolute',
            left: `calc(${LABEL_WIDTH}px + ${playheadPercent}% * (100% - ${LABEL_WIDTH}px) / 100%)`,
            top: RULER_HEIGHT,
            width: 1,
            height: rows.length * TRACK_HEIGHT,
            background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 53%, transparent)`,
            pointerEvents: 'none',
          }} />
        )}
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

function TimelineClipRows({
  clips,
  durationInFrames,
  onKeyframeClick,
  onTimelineChange,
  onTimelineRename,
  onTimelineDelete,
  onAddTimeline,
  onAddIntroTimeline,
  elementIds,
  stateMachines,
  timelines,
  onStateMachineChange,
  onStateMachineRename,
  onAddStateMachine,
  preferredMotionType,
  onMotionTypeChange,
  onActiveTimelineChange,
  playheadPercent,
  playbackControls,
  rulerRef,
  onRulerPointerDown,
  onRulerPointerMove,
  onRulerPointerUp,
  onStopPlayback,
  onPreviewState,
}: {
  clips: ElucimV2Timeline[];
  durationInFrames: number;
  onKeyframeClick: (frame: number) => void;
  onTimelineChange?: (timeline: ElucimV2Timeline) => void;
  onTimelineRename?: (timeline: ElucimV2Timeline, nextId: string) => void;
  onTimelineDelete?: (id: string) => void;
  onAddTimeline?: () => void;
  onAddIntroTimeline?: () => void;
  elementIds: string[];
  stateMachines: ElucimV2StateMachine[];
  timelines: Record<string, ElucimV2Timeline>;
  onStateMachineChange?: (machine: ElucimV2StateMachine) => void;
  onStateMachineRename?: (machine: ElucimV2StateMachine, nextId: string) => void;
  onAddStateMachine?: () => void;
  preferredMotionType: 'animation' | 'stateMachine';
  onMotionTypeChange?: (type: 'animation' | 'stateMachine') => void;
  onActiveTimelineChange?: (timelineId: string | undefined) => void;
  playheadPercent: number;
  playbackControls: React.ReactNode;
  rulerRef: React.RefObject<HTMLDivElement>;
  onRulerPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onRulerPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onRulerPointerUp: () => void;
  onStopPlayback: () => void;
  onPreviewState: (stateId: string) => void;
}) {
  const icons = useEditorIcons();
  const firstAnimationItem = useMemo<SelectedV2TimelineItem | null>(() => clips[0] ? { type: 'animation', timelineId: clips[0].id } : null, [clips]);
  const firstStateMachineItem = useMemo<SelectedStateMachineItem | null>(() => stateMachines[0] ? { type: 'stateMachine', machineId: stateMachines[0].id } : null, [stateMachines]);
  const [selectedItem, setSelectedItem] = useState<SelectedMotionItem | null>(() => {
    if (preferredMotionType === 'stateMachine' && firstStateMachineItem) return firstStateMachineItem;
    if (firstAnimationItem) return firstAnimationItem;
    if (firstStateMachineItem) return firstStateMachineItem;
    return null;
  });
  const [activeMotionType, setActiveMotionType] = useState<'animation' | 'stateMachine'>(() => selectedItem?.type ?? preferredMotionType);
  const [renamingMotionItem, setRenamingMotionItem] = useState<SelectedMotionItem | null>(null);
  const [keyframeDragPreview, setKeyframeDragPreview] = useState<{ timelineId: string; trackIndex: number; keyframeIndex: number; frame: number } | null>(null);
  const suppressKeyframeClickRef = useRef(false);
  const lastAnimationItem = useRef<SelectedV2TimelineItem | null>(firstAnimationItem);
  const lastStateMachineItem = useRef<SelectedStateMachineItem | null>(firstStateMachineItem);
  const selectMotionItem = useCallback((item: SelectedMotionItem) => {
    if (item.type === 'animation') lastAnimationItem.current = item;
    else lastStateMachineItem.current = item;
    setActiveMotionType(item.type);
    onMotionTypeChange?.(item.type);
    setSelectedItem(item);
  }, [onMotionTypeChange]);
  const selectMotionType = useCallback((type: 'animation' | 'stateMachine') => {
    setActiveMotionType(type);
    onMotionTypeChange?.(type);
    if (type === 'animation') {
      const item = lastAnimationItem.current && clips.some(clip => clip.id === lastAnimationItem.current?.timelineId)
        ? lastAnimationItem.current
        : firstAnimationItem;
      if (item) setSelectedItem(item);
      return;
    }
    const item = lastStateMachineItem.current && stateMachines.some(machine => machine.id === lastStateMachineItem.current?.machineId)
      ? lastStateMachineItem.current
      : firstStateMachineItem;
    if (item) setSelectedItem(item);
  }, [clips, firstAnimationItem, firstStateMachineItem, onMotionTypeChange, stateMachines]);
  const previousPreferredMotionType = useRef(preferredMotionType);
  const previousStateMachineCount = useRef(stateMachines.length);
  useEffect(() => {
    if (previousPreferredMotionType.current !== preferredMotionType) {
      previousPreferredMotionType.current = preferredMotionType;
      selectMotionType(preferredMotionType);
    }
  }, [preferredMotionType, selectMotionType]);
  useEffect(() => {
    const previousCount = previousStateMachineCount.current;
    previousStateMachineCount.current = stateMachines.length;
    if (preferredMotionType === 'stateMachine' && previousCount === 0 && stateMachines[0]) {
      selectMotionItem({ type: 'stateMachine', machineId: stateMachines[0].id });
    }
  }, [preferredMotionType, selectMotionItem, stateMachines]);
  useEffect(() => {
    if (selectedItem?.type === 'animation' && clips.some(clip => clip.id === selectedItem.timelineId)) return;
    if (selectedItem?.type === 'stateMachine' && stateMachines.some(machine => machine.id === selectedItem.machineId)) return;
    if (preferredMotionType === 'stateMachine' && stateMachines[0]) {
      selectMotionItem({ type: 'stateMachine', machineId: stateMachines[0].id });
    } else {
      const lastAnimation = lastAnimationItem.current && clips.some(clip => clip.id === lastAnimationItem.current?.timelineId)
        ? lastAnimationItem.current
        : null;
      const fallback = lastAnimation ?? (clips[0] ? { type: 'animation' as const, timelineId: clips[0].id } : stateMachines[0] ? { type: 'stateMachine' as const, machineId: stateMachines[0].id } : null);
      if (fallback) selectMotionItem(fallback);
      else setSelectedItem(null);
    }
  }, [clips, preferredMotionType, selectMotionItem, selectedItem, stateMachines]);
  const selectedClip = activeMotionType === 'animation' && selectedItem?.type === 'animation' ? clips.find(clip => clip.id === selectedItem.timelineId) : undefined;
  useEffect(() => {
    onActiveTimelineChange?.(activeMotionType === 'animation' ? selectedClip?.id : undefined);
  }, [activeMotionType, onActiveTimelineChange, selectedClip?.id]);
  const selectedMachine = activeMotionType === 'stateMachine' && selectedItem?.type === 'stateMachine' ? stateMachines.find(machine => machine.id === selectedItem.machineId) : undefined;
  const selectedTrack = selectedClip && selectedItem?.type === 'animation' && selectedItem.trackIndex !== undefined ? selectedClip.tracks[selectedItem.trackIndex] : undefined;
  const selectedKeyframe = selectedTrack && selectedItem?.type === 'animation' && selectedItem.keyframeIndex !== undefined ? selectedTrack.keyframes[selectedItem.keyframeIndex] : undefined;
  useEffect(() => {
    if (!keyframeDragPreview || !selectedKeyframe || selectedItem?.type !== 'animation') return;
    const previewMatchesSelection = keyframeDragPreview.timelineId === selectedItem.timelineId
      && keyframeDragPreview.trackIndex === selectedItem.trackIndex
      && keyframeDragPreview.keyframeIndex === selectedItem.keyframeIndex;
    if (previewMatchesSelection && selectedKeyframe.frame === keyframeDragPreview.frame) {
      setKeyframeDragPreview(null);
    }
  }, [keyframeDragPreview, selectedItem, selectedKeyframe]);
  const visibleClips = selectedClip ? [selectedClip] : clips.slice(0, 1);
  const commitInlineRename = (value: string) => {
    const item = renamingMotionItem;
    setRenamingMotionItem(null);
    if (!item) return;
    if (item.type === 'animation') {
      const clip = clips.find(currentClip => currentClip.id === item.timelineId);
      if (clip) renameClip(clip, value);
      return;
    }
    const machine = stateMachines.find(currentMachine => currentMachine.id === item.machineId);
    if (machine) renameMachine(machine, value);
  };
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
  const renameClip = (clip: ElucimV2Timeline, value: string) => {
    const baseId = normalizeGraphId(value, clip.id);
    const existing = Object.fromEntries(clips.filter(current => current.id !== clip.id).map(current => [current.id, current]));
    const nextId = createUniqueTimelineId(existing, baseId);
    if (nextId === clip.id) return;
    onTimelineRename?.(clip, nextId);
    selectMotionItem({ type: 'animation', timelineId: nextId });
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
    selectMotionItem({ type: 'animation', timelineId: clip.id });
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
              { frame: middleFrame, value: track.keyframes[track.keyframes.length - 1]?.value ?? 1 },
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
    selectMotionItem({ type: 'animation', timelineId: clip.id, trackIndex });
  };
  const dragKeyframe = (event: React.PointerEvent<HTMLButtonElement>, clip: ElucimV2Timeline, trackIndex: number, keyframeIndex: number) => {
    if (!onTimelineChange) return;
    event.preventDefault();
    event.stopPropagation();
    const track = clip.tracks[trackIndex];
    const timelineLane = event.currentTarget.parentElement;
    if (!track || !timelineLane) return;
    const startX = event.clientX;
    let didDrag = false;
    selectMotionItem({ type: 'animation', timelineId: clip.id, trackIndex, keyframeIndex });
    const frameFromClientX = (clientX: number) => {
      const rect = timelineLane.getBoundingClientRect();
      const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      const rawFrame = Math.round(Math.max(0, Math.min(1, ratio)) * Math.max(0, clip.duration - 1));
      const previousFrame = track.keyframes[keyframeIndex - 1]?.frame ?? -1;
      const nextFrame = track.keyframes[keyframeIndex + 1]?.frame ?? clip.duration + 1;
      return Math.max(previousFrame + 1, Math.min(nextFrame - 1, rawFrame));
    };
    const previewFrame = (clientX: number) => {
      const frame = frameFromClientX(clientX);
      setKeyframeDragPreview({ timelineId: clip.id, trackIndex, keyframeIndex, frame });
      return frame;
    };
    const onMove = (moveEvent: PointerEvent) => {
      if (!didDrag && Math.abs(moveEvent.clientX - startX) < 3) return;
      didDrag = true;
      previewFrame(moveEvent.clientX);
    };
    const onUp = (upEvent: PointerEvent) => {
      if (didDrag) {
        suppressKeyframeClickRef.current = true;
        updateKeyframe(clip, trackIndex, keyframeIndex, { frame: previewFrame(upEvent.clientX) });
      } else {
        setKeyframeDragPreview(null);
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  const selectedStateId = selectedMachine && selectedItem?.type === 'stateMachine'
    ? selectedItem.stateId && selectedMachine.states[selectedItem.stateId] ? selectedItem.stateId : undefined
    : undefined;
  const selectedState = selectedMachine && selectedStateId ? selectedMachine.states[selectedStateId] : undefined;
  const updateMachine = (machine: ElucimV2StateMachine, patch: Partial<ElucimV2StateMachine>) => {
    onStateMachineChange?.({ ...machine, ...patch });
  };
  const renameMachine = (machine: ElucimV2StateMachine, value: string) => {
    const baseId = normalizeGraphId(value, machine.id);
    const existing = Object.fromEntries(stateMachines.filter(current => current.id !== machine.id).map(current => [current.id, current]));
    const nextId = createUniqueStateMachineId(existing, baseId);
    if (nextId === machine.id) return;
    onStateMachineRename?.(machine, nextId);
    selectMotionItem({ type: 'stateMachine', machineId: nextId });
  };
  const updateMachineState = (machine: ElucimV2StateMachine, stateId: string, patch: Partial<ElucimV2StateMachine['states'][string]>) => {
    onStateMachineChange?.({
      ...machine,
      states: {
        ...machine.states,
        [stateId]: { ...machine.states[stateId], ...patch },
      },
    });
  };
  const renameMachineState = (machine: ElucimV2StateMachine, stateId: string, value: string) => {
    const baseId = normalizeGraphId(value, stateId);
    let nextStateId = baseId;
    let index = 2;
    while (nextStateId !== stateId && machine.states[nextStateId]) {
      nextStateId = `${baseId}-${index}`;
      index += 1;
    }
    if (nextStateId === stateId) return;
    const renameTransition = (transition: string | ElucimV2Transition): string | ElucimV2Transition => {
      if (typeof transition === 'string') return transition === stateId ? nextStateId : transition;
      return { ...transition, target: transition.target === stateId ? nextStateId : transition.target };
    };
    const states = Object.fromEntries(Object.entries(machine.states).map(([id, currentState]) => {
      const nextState = {
        ...currentState,
        on: currentState.on
          ? Object.fromEntries(Object.entries(currentState.on).map(([eventName, transition]) => [eventName, renameTransition(transition)]))
          : undefined,
        onComplete: currentState.onComplete ? renameTransition(currentState.onComplete) : undefined,
      };
      return [id === stateId ? nextStateId : id, nextState];
    }));
    const layoutStates = machine.layout?.states
      ? Object.fromEntries(Object.entries(machine.layout.states).map(([id, position]) => [id === stateId ? nextStateId : id, position]))
      : undefined;
    onStateMachineChange?.({
      ...machine,
      initial: machine.initial === stateId ? nextStateId : machine.initial,
      reset: machine.reset === stateId ? nextStateId : machine.reset,
      states,
      layout: layoutStates ? { ...machine.layout, states: layoutStates } : machine.layout,
    });
    selectMotionItem({ type: 'stateMachine', machineId: machine.id, stateId: nextStateId });
  };
  const addMachineState = (machine: ElucimV2StateMachine) => {
    let id = 'state';
    let index = 2;
    while (machine.states[id]) {
      id = `state-${index}`;
      index += 1;
    }
    const stateCount = Object.keys(machine.states).length;
    onStateMachineChange?.({
      ...machine,
      states: { ...machine.states, [id]: {} },
      layout: {
        ...machine.layout,
        states: {
          ...machine.layout?.states,
          [id]: { x: 226 + ((stateCount - 1) % 3) * 190, y: 42 + Math.floor(Math.max(0, stateCount - 1) / 3) * 104 },
        },
      },
    });
    selectMotionItem({ type: 'stateMachine', machineId: machine.id, stateId: id });
  };
  const deleteMachineState = (machine: ElucimV2StateMachine, stateId: string) => {
    const remainingStateIds = Object.keys(machine.states).filter(id => id !== stateId);
    if (remainingStateIds.length === 0) return;
    const fallback = remainingStateIds[0] ?? machine.initial;
    const states = Object.fromEntries(Object.entries(machine.states)
      .filter(([id]) => id !== stateId)
      .map(([id, state]) => {
        const on = state.on
          ? Object.fromEntries(Object.entries(state.on).filter(([, transition]) => {
              const normalized = typeof transition === 'string' ? { target: transition } : transition;
              return normalized.target !== stateId;
            }))
          : undefined;
        const onComplete = state.onComplete
          ? (() => {
              const normalized = typeof state.onComplete === 'string' ? { target: state.onComplete } : state.onComplete;
              return normalized.target === stateId ? undefined : state.onComplete;
            })()
          : undefined;
        return [id, {
          ...state,
          ...(on && Object.keys(on).length > 0 ? { on } : { on: undefined }),
          onComplete,
        }];
      }));
    onStateMachineChange?.({
      ...machine,
      initial: machine.initial === stateId ? fallback : machine.initial,
      reset: machine.reset === stateId ? fallback : machine.reset,
      states,
      layout: {
        ...machine.layout,
        states: Object.fromEntries(Object.entries(machine.layout?.states ?? {}).filter(([id]) => id !== stateId)),
      },
    });
    selectMotionItem({ type: 'stateMachine', machineId: machine.id });
  };
  const moveMachineState = (machine: ElucimV2StateMachine, stateId: string, position: { x: number; y: number }) => {
    onStateMachineChange?.({
      ...machine,
      layout: {
        ...machine.layout,
        states: {
          ...machine.layout?.states,
          [stateId]: position,
        },
      },
    });
  };
  const addMachineTransition = (machine: ElucimV2StateMachine, stateId: string, targetStateId?: string) => {
    const state = machine.states[stateId];
    if (!state) return;
    let eventName = 'next';
    let index = 2;
    while (state.on?.[eventName]) {
      eventName = `next-${index}`;
      index += 1;
    }
    const target = targetStateId && machine.states[targetStateId] ? targetStateId : Object.keys(machine.states).find(id => id !== stateId) ?? stateId;
    updateMachineState(machine, stateId, { on: { ...state.on, [eventName]: { target } } });
    selectMotionItem({ type: 'stateMachine', machineId: machine.id, stateId, transitionEvent: eventName });
    return eventName;
  };
  const updateMachineTransition = (machine: ElucimV2StateMachine, stateId: string, eventName: string, transition: ElucimV2Transition) => {
    const state = machine.states[stateId];
    if (!state) return;
    updateMachineState(machine, stateId, { on: { ...state.on, [eventName]: transition } });
  };
  const deleteMachineTransition = (machine: ElucimV2StateMachine, stateId: string, eventName: string) => {
    const state = machine.states[stateId];
    if (!state?.on) return;
    const next = { ...state.on };
    delete next[eventName];
    updateMachineState(machine, stateId, { on: Object.keys(next).length > 0 ? next : undefined });
    selectMotionItem({ type: 'stateMachine', machineId: machine.id, stateId });
  };
  return (
    <div aria-label="Animation clips" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '34px 140px minmax(0, 1fr) 300px', flex: 1, minHeight: 0 }}>
        <div role="tablist" aria-label="Motion editor type" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '6px 4px', borderRight: `1px solid ${v('--elucim-editor-border-subtle')}`, background: v('--elucim-editor-input-bg') }}>
          <button
            type="button"
            role="tab"
            aria-label="Animations motion tab"
            aria-selected={activeMotionType === 'animation'}
            onClick={() => selectMotionType('animation')}
            disabled={clips.length === 0 && !onAddTimeline}
            title="Animations"
            style={verticalMotionButtonStyle(activeMotionType === 'animation', clips.length === 0 && !onAddTimeline)}
          >
            {icons.Sequence({ size: 13 })}
          </button>
          <button
            type="button"
            role="tab"
            aria-label="State machines motion tab"
            aria-selected={activeMotionType === 'stateMachine'}
            onClick={() => selectMotionType('stateMachine')}
            disabled={stateMachines.length === 0 && !onAddStateMachine}
            title="State machines"
            style={verticalMotionButtonStyle(activeMotionType === 'stateMachine', stateMachines.length === 0 && !onAddStateMachine)}
          >
            {icons.Graph({ size: 13 })}
          </button>
          <div style={{ flex: 1 }} />
          {activeMotionType === 'animation' && onAddTimeline && (
            <>
              <button
                type="button"
                aria-label="Add animation"
                title="Add animation"
                onClick={onAddTimeline}
                style={verticalMotionButtonStyle(false)}
              >
                +
              </button>
              {onAddIntroTimeline && (
                <button
                  type="button"
                  aria-label="Add intro animation"
                  title="Add intro animation"
                  onClick={onAddIntroTimeline}
                  style={verticalMotionButtonStyle(false)}
                >
                  I
                </button>
              )}
            </>
          )}
          {activeMotionType === 'stateMachine' && onAddStateMachine && (
            <button
              type="button"
              aria-label="Add state machine"
              title="Add state machine"
              onClick={onAddStateMachine}
              style={verticalMotionButtonStyle(false)}
            >
              +
            </button>
          )}
        </div>
        <div style={{ borderRight: `1px solid ${v('--elucim-editor-border')}`, background: v('--elucim-editor-surface') }}>
          <div style={{ padding: '6px 8px', color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {activeMotionType === 'animation' ? 'Animations' : 'State machines'}
          </div>
          {activeMotionType === 'animation' && clips.map(clip => {
            const selected = selectedItem?.type === 'animation' && selectedItem.timelineId === clip.id;
            const renaming = renamingMotionItem?.type === 'animation' && renamingMotionItem.timelineId === clip.id;
            if (renaming) {
              return (
                <input
                  key={clip.id}
                  autoFocus
                  aria-label={`Rename animation ${clip.id} inline`}
                  defaultValue={clip.id}
                  onBlur={event => commitInlineRename(event.currentTarget.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') setRenamingMotionItem(null);
                  }}
                  style={{ ...inspectorInputStyle, width: 'calc(100% - 12px)', margin: 6, fontSize: 10 }}
                />
              );
            }
            return (
              <button
                key={clip.id}
                type="button"
                aria-label={`Select animation ${clip.id}`}
                onClick={() => selectMotionItem({ type: 'animation', timelineId: clip.id })}
                onDoubleClick={() => {
                  selectMotionItem({ type: 'animation', timelineId: clip.id });
                  setRenamingMotionItem({ type: 'animation', timelineId: clip.id });
                }}
                style={{
                  width: '100%',
                  display: 'grid',
                  gap: 2,
                  padding: '6px 8px',
                  border: 'none',
                  borderTop: `1px solid ${v('--elucim-editor-border-subtle')}`,
                  background: selected ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 12%, transparent)` : 'transparent',
                  color: selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 10,
                }}
              >
                <strong>{clip.id}</strong>
                <span style={{ color: v('--elucim-editor-text-muted') }}>{clip.duration}f · {clip.tracks.length} track{clip.tracks.length === 1 ? '' : 's'}</span>
              </button>
            );
          })}
          {activeMotionType === 'stateMachine' && stateMachines.map(machine => {
            const selected = selectedItem?.type === 'stateMachine' && selectedItem.machineId === machine.id;
            const renaming = renamingMotionItem?.type === 'stateMachine' && renamingMotionItem.machineId === machine.id;
            if (renaming) {
              return (
                <input
                  key={machine.id}
                  autoFocus
                  aria-label={`Rename state machine ${machine.id} inline`}
                  defaultValue={machine.id}
                  onBlur={event => commitInlineRename(event.currentTarget.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') setRenamingMotionItem(null);
                  }}
                  style={{ ...inspectorInputStyle, width: 'calc(100% - 12px)', margin: 6, fontSize: 10 }}
                />
              );
            }
            return (
              <button
                key={machine.id}
                type="button"
                aria-label={`Select state machine ${machine.id}`}
                onClick={() => selectMotionItem({ type: 'stateMachine', machineId: machine.id })}
                onDoubleClick={() => {
                  selectMotionItem({ type: 'stateMachine', machineId: machine.id });
                  setRenamingMotionItem({ type: 'stateMachine', machineId: machine.id });
                }}
                style={{
                  width: '100%',
                  display: 'grid',
                  gap: 2,
                  padding: '6px 8px',
                  border: 'none',
                  borderTop: `1px solid ${v('--elucim-editor-border-subtle')}`,
                  background: selected ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 12%, transparent)` : 'transparent',
                  color: selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 10,
                }}
              >
                <strong>{machine.id}</strong>
                <span style={{ color: v('--elucim-editor-text-muted') }}>{Object.keys(machine.states).length} state{Object.keys(machine.states).length === 1 ? '' : 's'}</span>
              </button>
            );
          })}
        </div>
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
      {activeMotionType === 'stateMachine' ? selectedMachine ? (
        <StateMachineTimelineGraph
          machine={selectedMachine}
          selectedStateId={selectedStateId}
          selectedTransitionEvent={selectedItem?.type === 'stateMachine' ? selectedItem.transitionEvent : undefined}
          onSelectState={stateId => {
            onStopPlayback();
            selectMotionItem({ type: 'stateMachine', machineId: selectedMachine.id, stateId });
          }}
          onSelectTransition={(stateId, transitionEvent) => selectMotionItem({ type: 'stateMachine', machineId: selectedMachine.id, stateId, transitionEvent })}
          onSelectMachine={() => selectMotionItem({ type: 'stateMachine', machineId: selectedMachine.id })}
          onMoveState={(stateId, position) => moveMachineState(selectedMachine, stateId, position)}
          onAddState={() => addMachineState(selectedMachine)}
            onDeleteState={selectedStateId ? () => deleteMachineState(selectedMachine, selectedStateId) : undefined}
            onPreviewState={stateId => {
              const timelineId = selectedMachine.states[stateId]?.timeline;
              onActiveTimelineChange?.(timelineId);
              onPreviewState(stateId);
            }}
            onConnectStates={(sourceStateId, targetStateId) => addMachineTransition(selectedMachine, sourceStateId, targetStateId)}
          />
      ) : (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: v('--elucim-editor-text-muted'), fontSize: 11 }}>
          Use the + button in the motion rail to add a state machine.
        </div>
      ) : visibleClips.length === 0 ? (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: v('--elucim-editor-text-muted'), fontSize: 11 }}>
          Use the + button in the motion rail to add an animation.
        </div>
      ) : visibleClips.map(clip => (
        <div key={clip.id} style={{ position: 'relative' }}>
          <div
            style={{
              height: CLIP_HEADER_HEIGHT,
              display: 'grid',
              gridTemplateColumns: `${LABEL_WIDTH}px minmax(0, 1fr)`,
              alignItems: 'stretch',
              background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 8%, transparent)`,
              borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: onTimelineDelete && onTimelineChange ? '1fr 1fr' : '1fr', gap: 4, alignItems: 'center', minWidth: 0, padding: '0 6px' }}>
                {onTimelineDelete && (
                  <button
                    type="button"
                    aria-label={`Remove animation ${clip.id}`}
                    title="Remove animation"
                    onClick={() => onTimelineDelete(clip.id)}
                    style={{ height: 24, border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 999, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', fontSize: 13, fontWeight: 800, lineHeight: 1, padding: 0 }}
                  >
                    ×
                  </button>
                )}
                {onTimelineChange && (
                  <button
                    type="button"
                    aria-label={`Add track to animation ${clip.id}`}
                    title="Add track"
                    onClick={() => addTrack(clip)}
                    style={{ height: 24, border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 999, background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', fontSize: 13, fontWeight: 800, lineHeight: 1, padding: 0 }}
                  >
                    +
                  </button>
                )}
            </div>
            <div style={{ minWidth: 0, display: 'grid', gridTemplateRows: '20px 1fr' }}>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'end', gap: 8 }}>
                <div style={{ color: v('--elucim-editor-text-secondary'), fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {clip.id} - {clip.duration}f - {clip.tracks.length} track{clip.tracks.length === 1 ? '' : 's'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, alignSelf: 'center', paddingRight: 6 }}>
                  {playbackControls}
                </div>
              </div>
              <div
                ref={rulerRef}
                onPointerDown={onRulerPointerDown}
                onPointerMove={onRulerPointerMove}
                onPointerUp={onRulerPointerUp}
                style={{
                  position: 'relative',
                  cursor: 'ew-resize',
                  minHeight: RULER_HEIGHT,
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
                <div
                  data-elucim-playhead-arrow
                  onPointerDown={onRulerPointerDown}
                  onPointerMove={onRulerPointerMove}
                  onPointerUp={onRulerPointerUp}
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
                  <div style={{
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: `8px solid ${v('--elucim-editor-accent')}`,
                  }} />
                </div>
              </div>
            </div>
          </div>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: LABEL_WIDTH,
              right: 0,
              top: CLIP_HEADER_HEIGHT,
              height: clip.tracks.length * TRACK_HEIGHT,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <div
              data-elucim-playhead-line
              style={{
                position: 'absolute',
                left: `${playheadPercent}%`,
                top: 0,
                width: 1,
                height: '100%',
                background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 53%, transparent)`,
              }}
            />
          </div>
          {clip.tracks.map((track, trackIndex) => (
            <div
              key={`${clip.id}-${trackIndex}`}
              style={{
                height: TRACK_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
              }}
            >
              <div style={{ width: LABEL_WIDTH, flexShrink: 0, display: 'grid', gridTemplateColumns: onTimelineChange ? 'auto minmax(0, 1fr)' : '1fr', alignItems: 'center', gap: 6, padding: '0 6px' }}>
                {onTimelineChange && (
                  <div style={{ display: 'flex', gap: 3 }}>
                    <button
                      type="button"
                      aria-label={`Add keyframe to ${clip.id} ${track.target}.${track.property}`}
                      title="Add keyframe"
                      onClick={() => addKeyframe(clip, trackIndex)}
                      style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', fontSize: 9, padding: '1px 4px', whiteSpace: 'nowrap' }}
                    >
                      + key
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${clip.id} ${track.target}.${track.property} track`}
                      title="Remove track"
                      onClick={() => deleteTrack(clip, trackIndex)}
                      style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', fontSize: 11, fontWeight: 800, padding: '1px 6px', whiteSpace: 'nowrap', lineHeight: 1 }}
                    >
                      -
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  aria-label={`Select ${clip.id} ${track.target}.${track.property} track`}
                  onClick={() => selectMotionItem({ type: 'animation', timelineId: clip.id, trackIndex })}
                  title={`${track.target}.${track.property}`}
                  style={{
                    minWidth: 0,
                    padding: 0,
                    color: selectedItem?.type === 'animation' && selectedItem.timelineId === clip.id && selectedItem.trackIndex === trackIndex ? v('--elucim-editor-accent') : v('--elucim-editor-text-secondary'),
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 10,
                  }}
                >
                  {track.target}.{track.property}
                </button>
              </div>
              <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: `${framePercent(track.keyframes[0]?.frame ?? 0, clip.duration)}%`,
                    width: `${Math.max(0.5, framePercent(track.keyframes[track.keyframes.length - 1]?.frame ?? 0, clip.duration) - framePercent(track.keyframes[0]?.frame ?? 0, clip.duration))}%`,
                    top: 12,
                    height: 6,
                    borderRadius: 999,
                    background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 30%, transparent)`,
                  }}
                />
                {track.keyframes.map((keyframe, keyframeIndex) => (
                  <React.Fragment key={`${trackIndex}-${keyframeIndex}`}>
                    {(() => {
                      const previewFrame = keyframeDragPreview?.timelineId === clip.id
                        && keyframeDragPreview.trackIndex === trackIndex
                        && keyframeDragPreview.keyframeIndex === keyframeIndex
                        ? keyframeDragPreview.frame
                        : undefined;
                      const displayFrame = previewFrame ?? keyframe.frame;
                      const selected = selectedItem?.type === 'animation'
                        && selectedItem.timelineId === clip.id
                        && selectedItem.trackIndex === trackIndex
                        && selectedItem.keyframeIndex === keyframeIndex;
                      return (
                        <>
                    <button
                      type="button"
                      aria-label={`Go to ${clip.id} ${track.target}.${track.property} keyframe ${displayFrame}`}
                      title={`Select keyframe at frame ${displayFrame}`}
                      onClick={event => {
                        event.stopPropagation();
                        if (suppressKeyframeClickRef.current) {
                          suppressKeyframeClickRef.current = false;
                          return;
                        }
                        onKeyframeClick(displayFrame);
                        selectMotionItem({ type: 'animation', timelineId: clip.id, trackIndex, keyframeIndex });
                      }}
                      onPointerDown={event => dragKeyframe(event, clip, trackIndex, keyframeIndex)}
                      style={{
                        position: 'absolute',
                        left: `${framePercent(displayFrame, clip.duration)}%`,
                        top: 9,
                        width: 12,
                        height: 12,
                        transform: 'translateX(-6px) rotate(45deg)',
                        border: `1px solid ${selected ? v('--elucim-editor-fg') : v('--elucim-editor-accent')}`,
                        background: selected ? v('--elucim-editor-accent') : v('--elucim-editor-input-bg'),
                        boxShadow: selected ? `0 0 0 2px color-mix(in srgb, ${v('--elucim-editor-accent')} 28%, transparent)` : undefined,
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    />
                    {selected && (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: `${framePercent(displayFrame, clip.duration)}%`,
                          top: 24,
                          transform: 'translateX(-50%)',
                          color: v('--elucim-editor-accent'),
                          fontSize: 9,
                          fontWeight: 700,
                          pointerEvents: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                         {displayFrame}f
                      </span>
                    )}
                        </>
                      );
                    })()}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
        </div>
        {selectedMachine && onStateMachineChange ? (
          <StateMachineMotionInspector
            machine={selectedMachine}
            state={selectedState}
            selectedStateId={selectedStateId}
            selectedTransitionEvent={selectedItem?.type === 'stateMachine' ? selectedItem.transitionEvent : undefined}
            timelines={timelines}
            onUpdateMachine={updateMachine}
            onRenameMachine={renameMachine}
            onUpdateState={updateMachineState}
            onRenameState={renameMachineState}
            onUpdateTransition={updateMachineTransition}
            onDeleteTransition={deleteMachineTransition}
          />
        ) : onTimelineChange && (
          <V2TimelineInspector
            clip={selectedClip}
            track={selectedTrack}
            keyframe={selectedKeyframe}
            selectedItem={selectedItem?.type === 'animation' ? selectedItem : null}
            elementIds={elementIds}
            onRenameClip={renameClip}
            onUpdateDuration={updateDuration}
            onUpdateTrack={updateTrack}
            onUpdateKeyframe={updateKeyframe}
            onDeleteKeyframe={deleteKeyframe}
          />
        )}
      </div>
    </div>
  );
}

function V2TimelineInspector({
  clip,
  track,
  keyframe,
  selectedItem,
  elementIds,
  onRenameClip,
  onUpdateDuration,
  onUpdateTrack,
  onUpdateKeyframe,
  onDeleteKeyframe,
}: {
  clip?: ElucimV2Timeline;
  track?: ElucimV2Timeline['tracks'][number];
  keyframe?: ElucimV2Timeline['tracks'][number]['keyframes'][number];
  selectedItem: SelectedV2TimelineItem | null;
  elementIds: string[];
  onRenameClip?: (clip: ElucimV2Timeline, nextId: string) => void;
  onUpdateDuration: (clip: ElucimV2Timeline, duration: number) => void;
  onUpdateTrack: (clip: ElucimV2Timeline, trackIndex: number, patch: Partial<ElucimV2Timeline['tracks'][number]>) => void;
  onUpdateKeyframe: (clip: ElucimV2Timeline, trackIndex: number, keyframeIndex: number, patch: { frame?: number; value?: unknown }) => void;
  onDeleteKeyframe: (clip: ElucimV2Timeline, trackIndex: number, keyframeIndex: number) => void;
}) {
  if (!clip) {
    return <div style={{ ...motionInspectorPanelStyle, color: v('--elucim-editor-text-muted'), fontSize: 11 }}>Select a timeline to edit details.</div>;
  }
  const commitKeyframeFrame = (value: string) => {
    if (!keyframe || selectedItem?.trackIndex === undefined || selectedItem.keyframeIndex === undefined) return;
    if (value.trim() === '') return;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    const frame = Math.max(0, Math.min(clip.duration, Math.round(numeric)));
    if (frame !== keyframe.frame) onUpdateKeyframe(clip, selectedItem.trackIndex, selectedItem.keyframeIndex, { frame });
  };
  const commitKeyframeValue = (value: string) => {
    if (!keyframe || selectedItem?.trackIndex === undefined || selectedItem.keyframeIndex === undefined) return;
    const nextValue = parseKeyframeValue(value);
    if (nextValue !== keyframe.value) onUpdateKeyframe(clip, selectedItem.trackIndex, selectedItem.keyframeIndex, { value: nextValue });
  };
  return (
    <aside style={motionInspectorPanelStyle}>
      <div>
        <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Animation details</div>
        <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{clip.id}</div>
        <div style={{ color: v('--elucim-editor-text-secondary'), fontSize: 10 }}>{clip.tracks.length} track{clip.tracks.length === 1 ? '' : 's'}</div>
      </div>
      <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
        Name
        <input
          key={clip.id}
          aria-label={`Rename animation ${clip.id}`}
          defaultValue={clip.id}
          onBlur={event => onRenameClip?.(clip, event.currentTarget.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          style={inspectorInputStyle}
        />
      </label>
      <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
        Duration
        <input
          aria-label={`Animation ${clip.id} duration`}
          type="number"
          min={1}
          value={clip.duration}
          onChange={event => onUpdateDuration(clip, Number(event.target.value))}
          style={inspectorInputStyle}
        />
      </label>
      {track && selectedItem?.trackIndex !== undefined && (
        <>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Target
            <select
              aria-label={`${clip.id} track ${selectedItem.trackIndex + 1} target`}
              value={track.target}
              onChange={event => onUpdateTrack(clip, selectedItem.trackIndex!, { target: event.target.value })}
              style={inspectorInputStyle}
            >
              {elementIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Property
            <select
              aria-label={`${clip.id} track ${selectedItem.trackIndex + 1} property`}
              value={track.property}
              onChange={event => onUpdateTrack(clip, selectedItem.trackIndex!, { property: event.target.value as ElucimV2Timeline['tracks'][number]['property'] })}
              style={inspectorInputStyle}
            >
              {V2_ANIMATABLE_PROPERTIES.map(property => <option key={property} value={property}>{property}</option>)}
            </select>
          </label>
        </>
      )}
      {keyframe && selectedItem?.trackIndex !== undefined && selectedItem.keyframeIndex !== undefined && (
        <div style={{ display: 'grid', gap: 6, paddingTop: 6, borderTop: `1px solid ${v('--elucim-editor-border-subtle')}` }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Keyframe</div>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Frame
            <input
              key={`${clip.id}-${selectedItem.trackIndex}-${selectedItem.keyframeIndex}-${keyframe.frame}-frame`}
              aria-label={`${clip.id} ${track?.target}.${track?.property} keyframe ${selectedItem.keyframeIndex + 1} frame`}
              type="number"
              min={0}
              max={clip.duration}
              defaultValue={keyframe.frame}
              onBlur={event => commitKeyframeFrame(event.currentTarget.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') {
                  event.currentTarget.value = String(keyframe.frame);
                  event.currentTarget.blur();
                }
              }}
              style={inspectorInputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Value
            <input
              key={`${clip.id}-${selectedItem.trackIndex}-${selectedItem.keyframeIndex}-${String(keyframe.value)}-value`}
              aria-label={`${clip.id} ${track?.target}.${track?.property} keyframe ${selectedItem.keyframeIndex + 1} value`}
              defaultValue={String(keyframe.value)}
              onBlur={event => commitKeyframeValue(event.currentTarget.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') {
                  event.currentTarget.value = String(keyframe.value);
                  event.currentTarget.blur();
                }
              }}
              style={inspectorInputStyle}
            />
          </label>
          <button
            type="button"
            aria-label={`Remove ${clip.id} ${track?.target}.${track?.property} keyframe ${selectedItem.keyframeIndex + 1}`}
            onClick={() => onDeleteKeyframe(clip, selectedItem.trackIndex!, selectedItem.keyframeIndex!)}
            style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', padding: '4px 6px', textAlign: 'left' }}
          >
            Remove keyframe
          </button>
        </div>
      )}
      {!track && <div style={{ color: v('--elucim-editor-text-muted'), lineHeight: 1.4 }}>Select a track row to edit its target and property. Select a diamond keyframe to edit frame/value.</div>}
    </aside>
  );
}

function createStateMachineDagLayout(
  states: [string, ElucimV2StateMachine['states'][string]][],
  transitions: { stateId: string; eventName: string; target: string; timeline?: string }[],
  initialStateId: string,
  direction: GraphLayoutDirection,
): Map<string, { x: number; y: number }> {
  const stateIds = states.map(([stateId]) => stateId);
  const stateSet = new Set(stateIds);
  const outgoing = new Map<string, string[]>();
  for (const transition of transitions) {
    if (!stateSet.has(transition.stateId) || !stateSet.has(transition.target)) continue;
    outgoing.set(transition.stateId, [...(outgoing.get(transition.stateId) ?? []), transition.target]);
  }

  const ranks = new Map<string, number>();
  const visit = (stateId: string, rank: number, path: Set<string>) => {
    if (!stateSet.has(stateId)) return;
    if (path.has(stateId)) return;
    if ((ranks.get(stateId) ?? -1) >= rank) return;
    ranks.set(stateId, rank);
    const nextPath = new Set(path);
    nextPath.add(stateId);
    for (const target of outgoing.get(stateId) ?? []) {
      visit(target, rank + 1, nextPath);
    }
  };

  visit(initialStateId, 0, new Set());
  let fallbackRank = Math.max(0, ...Array.from(ranks.values())) + 1;
  for (const stateId of stateIds) {
    if (!ranks.has(stateId)) {
      ranks.set(stateId, fallbackRank);
      fallbackRank += 1;
    }
  }

  const columns = new Map<number, string[]>();
  for (const stateId of stateIds) {
    const rank = ranks.get(stateId) ?? 0;
    columns.set(rank, [...(columns.get(rank) ?? []), stateId]);
  }

  const positionByState = new Map<string, { x: number; y: number }>();
  const majorGap = direction === 'horizontal' ? 220 : 68;
  const minorGap = direction === 'horizontal' ? 96 : 180;
  const offset = 48;
  Array.from(columns.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([rank, ids]) => {
      ids.forEach((stateId, index) => {
        positionByState.set(stateId, direction === 'horizontal'
          ? { x: offset + rank * majorGap, y: offset + index * minorGap }
          : { x: offset + index * minorGap, y: offset + rank * majorGap });
      });
    });

  return positionByState;
}

function StateMachineGraphNode({ data }: NodeProps<Node<StateMachineGraphNodeData>>) {
  const direction = data.direction;
  return (
    <div
      className="elucim-state-node-card"
      aria-label={`Select graph state ${data.stateId}`}
      style={{
        width: 150,
        minHeight: 66,
        border: `1px solid ${data.selected ? v('--elucim-editor-accent') : v('--elucim-editor-border')}`,
        borderRadius: 10,
        padding: '10px 12px',
        background: data.selected ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 14%, ${v('--elucim-editor-input-bg')})` : v('--elucim-editor-input-bg'),
        color: data.selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
        textAlign: 'left',
        boxShadow: data.selected ? `0 0 0 1px ${v('--elucim-editor-accent')} inset` : undefined,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        style={{ width: 11, height: 11, border: `2px solid ${v('--elucim-editor-accent')}`, background: v('--elucim-editor-input-bg'), opacity: direction === 'horizontal' ? 1 : 0, pointerEvents: direction === 'horizontal' ? 'auto' : 'none' }}
      />
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        style={{ width: 11, height: 11, border: `2px solid ${v('--elucim-editor-accent')}`, background: v('--elucim-editor-input-bg'), opacity: direction === 'horizontal' ? 1 : 0, pointerEvents: direction === 'horizontal' ? 'auto' : 'none', cursor: 'crosshair' }}
      />
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        style={{ width: 11, height: 11, border: `2px solid ${v('--elucim-editor-accent')}`, background: v('--elucim-editor-input-bg'), opacity: direction === 'vertical' ? 1 : 0, pointerEvents: direction === 'vertical' ? 'auto' : 'none' }}
      />
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        style={{ width: 11, height: 11, border: `2px solid ${v('--elucim-editor-accent')}`, background: v('--elucim-editor-input-bg'), opacity: direction === 'vertical' ? 1 : 0, pointerEvents: direction === 'vertical' ? 'auto' : 'none', cursor: 'crosshair' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <div style={{ fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.stateId}</div>
        {data.initial && (
          <span style={{ color: v('--elucim-editor-accent'), fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>start state</span>
        )}
        {!data.initial && data.reset && (
          <span style={{ color: v('--elucim-editor-text-muted'), fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>reset</span>
        )}
      </div>
      <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, marginTop: 4 }}>
        {data.timeline ? `animation: ${data.timeline}` : data.initial ? 'initial state' : 'no animation'}
      </div>
      {data.timeline && (
        <button
          type="button"
          className="nodrag nopan"
          aria-label={`Preview state ${data.stateId} animation`}
          title={`Play ${data.timeline}`}
          onClick={event => {
            event.stopPropagation();
            data.onPreviewState?.(data.stateId);
          }}
          style={{
            position: 'absolute',
            right: 8,
            bottom: 7,
            width: 18,
            height: 18,
            display: 'grid',
            placeItems: 'center',
            border: `1px solid ${v('--elucim-editor-border-subtle')}`,
            borderRadius: 999,
            background: 'transparent',
            color: v('--elucim-editor-text-secondary'),
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span aria-hidden="true" style={{
            width: 0,
            height: 0,
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            borderLeft: `6px solid ${v('--elucim-editor-text-secondary')}`,
            transform: 'translateX(1px)',
          }} />
        </button>
      )}
    </div>
  );
}

function StateMachineGraphEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  data,
}: EdgeProps<Edge<StateMachineGraphEdgeData>>) {
  const direction = data?.direction ?? 'horizontal';
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: direction === 'horizontal' ? Position.Right : Position.Bottom,
    targetPosition: direction === 'horizontal' ? Position.Left : Position.Top,
  });
  const selected = Boolean(data?.selected);
  const backEdge = Boolean(data?.backEdge);
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? v('--elucim-editor-accent') : backEdge ? v('--elucim-editor-text-muted') : `color-mix(in srgb, ${v('--elucim-editor-text-secondary')} 70%, transparent)`,
          strokeWidth: selected ? 2 : 1.35,
          strokeDasharray: backEdge ? '4 5' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'none',
            color: selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1.15,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            textShadow: `0 0 3px ${v('--elucim-editor-input-bg')}, 0 0 6px ${v('--elucim-editor-input-bg')}`,
          }}
        >
          <div>{String(data?.label ?? '')}</div>
          {data?.detail && (
            <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, fontWeight: 700, marginTop: 2 }}>{data.detail}</div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function StateMachineTimelineGraph({
  machine,
  selectedStateId,
  selectedTransitionEvent,
  onSelectState,
  onSelectTransition,
  onSelectMachine,
  onMoveState,
  onAddState,
  onDeleteState,
  onPreviewState,
  onConnectStates,
}: {
  machine: ElucimV2StateMachine;
  selectedStateId?: string;
  selectedTransitionEvent?: string;
  onSelectState: (stateId: string) => void;
  onSelectTransition: (stateId: string, transitionEvent: string) => void;
  onSelectMachine: () => void;
  onMoveState: (stateId: string, position: { x: number; y: number }) => void;
  onAddState: () => void;
  onDeleteState?: () => void;
  onPreviewState: (stateId: string) => void;
  onConnectStates: (sourceStateId: string, targetStateId: string) => string | undefined;
}) {
  const states = useMemo(() => Object.entries(machine.states), [machine.states]);
  const transitions = useMemo(() => states.flatMap(([stateId, state]) => Object.entries(state.on ?? {}).map(([eventName, transition]) => {
    const normalized = typeof transition === 'string' ? { target: transition } : transition;
    return { stateId, eventName, target: normalized.target, timeline: normalized.timeline };
  })), [states]);
  const graphTransitions = useMemo(() => transitions.filter(transition => transition.eventName.toLowerCase() !== 'reset'), [transitions]);
  const [layoutDirection, setLayoutDirection] = useState<GraphLayoutDirection>('horizontal');
  const flowInstanceRef = useRef<ReactFlowInstance<Node<StateMachineGraphNodeData>, Edge<StateMachineGraphEdgeData>> | null>(null);
  const isDraggingNodeRef = useRef(false);
  const didInitialFitRef = useRef(false);
  const hasSavedStatePositions = Object.keys(machine.layout?.states ?? {}).length > 0;
  const nodeTypes = useMemo(() => ({ stateMachineState: StateMachineGraphNode }), []);
  const edgeTypes = useMemo(() => ({ stateTransition: StateMachineGraphEdge }), []);
  const dagPositions = useMemo(() => createStateMachineDagLayout(states, graphTransitions, machine.initial, layoutDirection), [layoutDirection, machine.initial, graphTransitions, states]);
  const statePositions = useMemo(() => {
    const positions = new Map(dagPositions);
    for (const [stateId, position] of Object.entries(machine.layout?.states ?? {})) {
      positions.set(stateId, position);
    }
    return positions;
  }, [dagPositions, machine.layout?.states]);
  const [localPositions, setLocalPositions] = useState(() => new Map(statePositions));
  const previousMachineIdRef = useRef(machine.id);
  useEffect(() => {
    if (previousMachineIdRef.current !== machine.id) {
      previousMachineIdRef.current = machine.id;
      setLocalPositions(new Map(statePositions));
      return;
    }
    setLocalPositions(currentPositions => {
      const nextPositions = new Map(currentPositions);
      let changed = false;
      for (const [stateId, position] of statePositions) {
        if (!nextPositions.has(stateId)) {
          nextPositions.set(stateId, position);
          changed = true;
        }
      }
      for (const stateId of nextPositions.keys()) {
        if (!statePositions.has(stateId)) {
          nextPositions.delete(stateId);
          changed = true;
        }
      }
      return changed ? nextPositions : currentPositions;
    });
  }, [machine.id, statePositions]);
  const fitGraph = useCallback(() => {
    if (isDraggingNodeRef.current) return;
    flowInstanceRef.current?.fitView({ padding: 0.28, includeHiddenNodes: false, duration: 0 });
  }, []);
  const applyDagLayout = (direction: GraphLayoutDirection) => {
    setLayoutDirection(direction);
    const nextPositions = createStateMachineDagLayout(states, graphTransitions, machine.initial, direction);
    setLocalPositions(new Map(nextPositions));
    for (const [stateId, position] of nextPositions) {
      onMoveState(stateId, position);
    }
  };
  const nodes: Node<StateMachineGraphNodeData>[] = useMemo(() => states.map(([stateId, state]) => {
    const selected = selectedStateId === stateId && !selectedTransitionEvent;
    return {
      id: stateId,
      position: localPositions.get(stateId) ?? statePositions.get(stateId) ?? { x: 36, y: 42 },
      type: 'stateMachineState',
      data: {
        stateId,
        timeline: state.timeline,
        initial: stateId === machine.initial,
        reset: stateId === (machine.reset ?? machine.initial),
        selected,
        direction: layoutDirection,
        onPreviewState,
      },
      selected,
      draggable: true,
      style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, cursor: 'grab' },
    };
  }), [layoutDirection, localPositions, machine.initial, machine.reset, onPreviewState, selectedStateId, selectedTransitionEvent, statePositions, states]);
  const [flowNodes, setFlowNodes] = useState(nodes);
  useEffect(() => {
    setFlowNodes(currentNodes => nodes.map(node => {
      const existing = currentNodes.find(currentNode => currentNode.id === node.id);
      return existing ? { ...existing, ...node, position: existing.position } : node;
    }));
  }, [nodes]);
  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    setFlowNodes(currentNodes => applyNodeChanges(changes, currentNodes) as Node<StateMachineGraphNodeData>[]);
  }, []);
  const edges: Edge<StateMachineGraphEdgeData>[] = graphTransitions.map(transition => {
    const selected = selectedStateId === transition.stateId && selectedTransitionEvent === transition.eventName;
    const sourceRankPosition = dagPositions.get(transition.stateId) ?? { x: 0, y: 0 };
    const targetRankPosition = dagPositions.get(transition.target) ?? { x: 0, y: 0 };
    const forward = layoutDirection === 'horizontal'
      ? targetRankPosition.x >= sourceRankPosition.x
      : targetRankPosition.y >= sourceRankPosition.y;
    const label = `on ${transition.eventName}`;
    const detail = transition.timeline ? `play ${transition.timeline}` : undefined;
    return {
      id: `${transition.stateId}:${transition.eventName}`,
      source: transition.stateId,
      target: transition.target,
      sourceHandle: layoutDirection === 'horizontal' ? 'source-right' : 'source-bottom',
      targetHandle: layoutDirection === 'horizontal' ? 'target-left' : 'target-top',
      type: 'stateTransition',
      selected,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: selected ? v('--elucim-editor-accent') : `color-mix(in srgb, ${v('--elucim-editor-text-secondary')} 70%, transparent)`,
      },
      data: {
        label,
        detail,
        selected,
        backEdge: !forward,
        direction: layoutDirection,
        stateId: transition.stateId,
        eventName: transition.eventName,
      },
    };
  });
  const handleNodeClick: NodeMouseHandler = (_, node) => {
    onSelectState(node.id);
  };
  const handleNodeDragStart: OnNodeDrag = () => {
    isDraggingNodeRef.current = true;
  };
  const handleNodeDrag: OnNodeDrag = (_, node) => {
    setLocalPositions(currentPositions => new Map(currentPositions).set(node.id, node.position));
  };
  const handleNodeDragStop: OnNodeDrag = (_, node) => {
    isDraggingNodeRef.current = false;
    const position = { x: Math.max(12, Math.round(node.position.x)), y: Math.max(12, Math.round(node.position.y)) };
    setLocalPositions(currentPositions => new Map(currentPositions).set(node.id, position));
    onMoveState(node.id, position);
  };
  const handleConnect: OnConnect = (connection) => {
    if (!connection.source || !connection.target) return;
    const eventName = onConnectStates(connection.source, connection.target);
    if (eventName) onSelectTransition(connection.source, eventName);
  };
  return (
    <section aria-label={`State machine graph ${machine.id}`} style={{ height: '100%', minHeight: 180 }}>
      <div
        aria-label={`State machine graph canvas ${machine.id}`}
        style={{
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: v('--elucim-editor-input-bg'),
        }}
      >
        <ReactFlow
          key={machine.id}
          nodes={flowNodes}
          onNodesChange={handleNodesChange}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={instance => {
            flowInstanceRef.current = instance;
            if (!didInitialFitRef.current && !hasSavedStatePositions) {
              didInitialFitRef.current = true;
              fitGraph();
            }
          }}
          onNodeClick={handleNodeClick}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={onSelectMachine}
          nodesDraggable
          nodesConnectable
          onConnect={handleConnect}
          elementsSelectable
          selectNodesOnDrag={false}
          panOnDrag={[2]}
          zoomOnDoubleClick={false}
          nodesFocusable={false}
          edgesFocusable={false}
          onEdgeClick={(_, edge) => {
            const stateId = typeof edge.data?.stateId === 'string' ? edge.data.stateId : undefined;
            const eventName = typeof edge.data?.eventName === 'string' ? edge.data.eventName : undefined;
            if (stateId && eventName) onSelectTransition(stateId, eventName);
          }}
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
          style={{
            background: v('--elucim-editor-input-bg'),
            color: v('--elucim-editor-fg'),
          }}
        >
          <Panel position="top-left" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              type="button"
              aria-label={`Add state to ${machine.id}`}
              onClick={onAddState}
              style={chromeTabButtonStyle(false)}
            >
              + State
            </button>
            <button
              type="button"
              aria-label={selectedStateId ? `Remove state ${selectedStateId}` : 'Remove selected state'}
              disabled={!selectedStateId || Object.keys(machine.states).length <= 1}
              onClick={onDeleteState}
              style={chromeTabButtonStyle(false)}
            >
              - State
            </button>
            <button
              type="button"
              aria-label="Use horizontal state machine layout"
              aria-pressed={layoutDirection === 'horizontal'}
              onClick={() => applyDagLayout('horizontal')}
              style={chromeTabButtonStyle(layoutDirection === 'horizontal')}
            >
              Horizontal
            </button>
            <button
              type="button"
              aria-label="Use vertical state machine layout"
              aria-pressed={layoutDirection === 'vertical'}
              onClick={() => applyDagLayout('vertical')}
              style={chromeTabButtonStyle(layoutDirection === 'vertical')}
            >
              Vertical
            </button>
          </Panel>
          <Panel position="bottom-left" style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, fontWeight: 700 }}>
            Drag state cards to arrange · reset uses the selected reset state
          </Panel>
        </ReactFlow>
      </div>
    </section>
  );
}

function StateMachineMotionInspector({
  machine,
  state,
  selectedStateId,
  selectedTransitionEvent,
  timelines,
  onUpdateMachine,
  onRenameMachine,
  onUpdateState,
  onRenameState,
  onUpdateTransition,
  onDeleteTransition,
}: {
  machine: ElucimV2StateMachine;
  state?: ElucimV2StateMachine['states'][string];
  selectedStateId?: string;
  selectedTransitionEvent?: string;
  timelines: Record<string, ElucimV2Timeline>;
  onUpdateMachine: (machine: ElucimV2StateMachine, patch: Partial<ElucimV2StateMachine>) => void;
  onRenameMachine: (machine: ElucimV2StateMachine, nextId: string) => void;
  onUpdateState: (machine: ElucimV2StateMachine, stateId: string, patch: Partial<ElucimV2StateMachine['states'][string]>) => void;
  onRenameState: (machine: ElucimV2StateMachine, stateId: string, nextId: string) => void;
  onUpdateTransition: (machine: ElucimV2StateMachine, stateId: string, eventName: string, transition: ElucimV2Transition) => void;
  onDeleteTransition: (machine: ElucimV2StateMachine, stateId: string, eventName: string) => void;
}) {
  const stateIds = Object.keys(machine.states);
  const timelineIds = Object.keys(timelines);
  const selectedTransition = state && selectedTransitionEvent ? state.on?.[selectedTransitionEvent] : undefined;
  const normalizedTransition = typeof selectedTransition === 'string' ? { target: selectedTransition } : selectedTransition;
  if (selectedStateId && selectedTransitionEvent && normalizedTransition) {
    return (
      <aside style={motionInspectorPanelStyle}>
        <div>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Selected transition</div>
          <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{selectedTransitionEvent}</div>
        </div>
        <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
          Target state
          <select
            aria-label={`Transition ${selectedTransitionEvent} target state`}
            value={normalizedTransition.target}
            onChange={event => onUpdateTransition(machine, selectedStateId, selectedTransitionEvent, { ...normalizedTransition, target: event.target.value })}
            style={inspectorInputStyle}
          >
            {stateIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
          Transition animation
          <select
            aria-label={`Transition ${selectedTransitionEvent} animation`}
            value={normalizedTransition.timeline ?? ''}
            onChange={event => onUpdateTransition(machine, selectedStateId, selectedTransitionEvent, { ...normalizedTransition, timeline: event.target.value || undefined })}
            style={inspectorInputStyle}
          >
            <option value="">none</option>
            {timelineIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <button
          type="button"
          aria-label={`Remove transition ${selectedTransitionEvent}`}
          onClick={() => onDeleteTransition(machine, selectedStateId, selectedTransitionEvent)}
          style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', padding: '4px 6px', textAlign: 'left' }}
        >
          Remove transition
        </button>
      </aside>
    );
  }

  if (selectedStateId && state) {
    return (
      <aside style={motionInspectorPanelStyle}>
        <div>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Selected state</div>
          <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{selectedStateId}</div>
        </div>
        <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
          State name
          <input
            key={selectedStateId}
            aria-label={`Rename state ${selectedStateId}`}
            defaultValue={selectedStateId}
            onBlur={event => onRenameState(machine, selectedStateId, event.currentTarget.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            style={inspectorInputStyle}
          />
        </label>
        <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
          Animation
          <select
            aria-label={`State ${selectedStateId} animation`}
            value={state.timeline ?? ''}
            onChange={event => onUpdateState(machine, selectedStateId, { timeline: event.target.value || undefined })}
            style={inspectorInputStyle}
          >
            <option value="">none</option>
            {timelineIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
      </aside>
    );
  }

  return (
    <aside style={motionInspectorPanelStyle}>
      <div>
        <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>State machine details</div>
        <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{machine.id}</div>
        <div style={{ color: v('--elucim-editor-text-secondary'), fontSize: 10 }}>{stateIds.length} state{stateIds.length === 1 ? '' : 's'}</div>
      </div>
      <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
        Machine name
        <input
          key={machine.id}
          aria-label={`Rename state machine ${machine.id}`}
          defaultValue={machine.id}
          onBlur={event => onRenameMachine(machine, event.currentTarget.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          style={inspectorInputStyle}
        />
      </label>
      <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
        Initial state
        <select
          aria-label={`State machine ${machine.id} initial state`}
          value={machine.initial}
          onChange={event => onUpdateMachine(machine, { initial: event.target.value })}
          style={inspectorInputStyle}
        >
          {stateIds.map(id => <option key={id} value={id}>{id}</option>)}
        </select>
      </label>
      <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
        Reset state
        <select
          aria-label={`State machine ${machine.id} reset state`}
          value={machine.reset ?? machine.initial}
          onChange={event => onUpdateMachine(machine, { reset: event.target.value })}
          style={inspectorInputStyle}
        >
          {stateIds.map(id => <option key={id} value={id}>{id}</option>)}
        </select>
      </label>
    </aside>
  );
}

function parseKeyframeValue(value: string): unknown {
  const numeric = Number(value);
  return value.trim() !== '' && Number.isFinite(numeric) ? numeric : value;
}

const inspectorInputStyle: React.CSSProperties = {
  background: v('--elucim-editor-surface'),
  color: v('--elucim-editor-fg'),
  border: `1px solid ${v('--elucim-editor-border')}`,
  borderRadius: 4,
  padding: '4px 6px',
  fontSize: 11,
};

const motionInspectorPanelStyle: React.CSSProperties = {
  borderLeft: `1px solid ${v('--elucim-editor-border')}`,
  padding: 10,
  display: 'grid',
  gap: 8,
  alignContent: 'start',
  background: v('--elucim-editor-input-bg'),
  minHeight: 0,
  overflowY: 'auto',
};

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

function TimelineButton({ icon, title, onClick, active, size = 28 }: {
  icon: React.ReactNode; title: string; onClick: () => void; active?: boolean; size?: number;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${active ? v('--elucim-editor-accent') : v('--elucim-editor-border-subtle')}`,
        borderRadius: 999,
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
