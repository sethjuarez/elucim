import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LINEAR_DURATION_IN_FRAMES, getMaxTimelineDuration, getStateMachineVisualFrames, type ElementNode, type ElucimDocument, type ElucimRevealEffect, type ElucimStateMachine, type ElucimTimeline, type ElucimTimelineFrameSelection, type ElucimTransition } from '@elucim/editor-projection';
import { BaseEdge, EdgeLabelRenderer, Handle, MarkerType, Position, ReactFlow, applyNodeChanges, getSmoothStepPath, type Edge, type EdgeProps, type Node, type NodeMouseHandler, type NodeProps, type OnConnect, type OnNodeDrag, type OnNodesChange, type ReactFlowInstance, type Viewport as ReactFlowViewport } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEditorState } from '../state/EditorProvider';
import { useEditorIcons } from '../theme/icons';
import { v } from '../theme/tokens';
import { clampFrame, clientXToRatio, frameToPercent as timelineFrameToPercent, ratioToFrame } from '../interactions/coordinates';
import { startRafDrag } from '../interactions/rafDrag';
import {
  CLIP_HEADER_HEIGHT,
  EASING_OPTIONS,
  ENTRY_EVENT_PRESETS,
  ENTRY_NODE_ID,
  EVENT_PRESET_SET,
  EVENT_PRESETS,
  EXIT_NODE_ID,
  LABEL_WIDTH,
  MOTION_DETAILS_WIDTH,
  MOTION_LIST_WIDTH,
  MOTION_RAIL_WIDTH,
  RULER_HEIGHT,
  TRACK_HEIGHT,
} from './constants';
import {
  createUniqueTransitionId,
  displayKeyName,
  getEntryTargetStateId,
  getEntryTransition,
  getEntryTriggerTransitions,
  getPreviewTransition,
  getStateCompleteTransition,
  getStateTriggerTransitions,
  isAvailableTransitionTrigger,
  previewEventLabel,
  pruneUnusedTriggerInputs,
  resolveTransitionTarget,
  transitionTriggerLabel,
} from './stateMachineHelpers';
import {
  canvasOverlayButtonStyle,
  chromeTabButtonStyle,
  inspectorInputStyle,
  motionInspectorPanelStyle,
  motionListActionButtonStyle,
  verticalMotionButtonStyle,
} from './styles';
import { TimelineInspector } from './TimelineInspector';
import { TimelinePlaybackControls } from './TimelinePlaybackControls';
import { getRows } from './timelineRows';
import type {
  GraphLayoutDirection,
  SelectedMotionItem,
  SelectedStateMachineItem,
  SelectedTimelineItem,
  StateMachineGraphEdgeData,
  StateMachineGraphNodeData,
  StateMachinePreviewState,
} from './types';

const TIMELINE_SCROLLBAR_GUTTER = 6;
const TIMELINE_RIGHT_GAP = 12;

export interface TimelineProps {
  className?: string;
  style?: React.CSSProperties;
  document?: ElucimDocument;
  timelines?: Record<string, ElucimTimeline>;
  onTimelinesChange?: (timelines: Record<string, ElucimTimeline> | undefined) => void;
  stateMachines?: Record<string, ElucimStateMachine>;
  onStateMachinesChange?: (stateMachines: Record<string, ElucimStateMachine> | undefined) => void;
  onMotionChange?: (timelines: Record<string, ElucimTimeline> | undefined, stateMachines: Record<string, ElucimStateMachine> | undefined) => void;
  preferredMotionType?: 'animation' | 'stateMachine';
  onActiveTimelineChange?: (timelineId: string | undefined) => void;
  onPreviewTimelineFramesChange?: (frames: ElucimTimelineFrameSelection[] | undefined) => void;
  onStateMachinePreviewActiveChange?: (active: boolean) => void;
  onStateMachinePreviewClickChange?: (handler: (() => boolean) | undefined) => void;
  onStateMachinePreviewKeyDownChange?: (handler: ((key: string) => boolean) | undefined) => void;
  onStateMachinePreviewExitChange?: (handler: (() => void) | undefined) => void;
}

function createUniqueTimelineId(existing: Record<string, ElucimTimeline> | undefined, preferred: string): string {
  if (!existing?.[preferred]) return preferred;
  let index = 2;
  while (existing[`${preferred}-${index}`]) index += 1;
  return `${preferred}-${index}`;
}

function createUniqueStateMachineId(existing: Record<string, ElucimStateMachine> | undefined, preferred: string): string {
  if (!existing?.[preferred]) return preferred;
  let index = 2;
  while (existing[`${preferred}-${index}`]) index += 1;
  return `${preferred}-${index}`;
}

export function clampTimelineKeyframesToDuration(clip: ElucimTimeline, duration: number): ElucimTimeline {
  const nextDuration = Math.max(1, Math.round(duration));
  const clampKeyframes = <Keyframe extends { frame: number }>(keyframes: Keyframe[]): Keyframe[] => {
    const clamped: Keyframe[] = [];
    for (const keyframe of keyframes) {
      const next = { ...keyframe, frame: Math.min(keyframe.frame, nextDuration) };
      if (clamped[clamped.length - 1]?.frame === next.frame) {
        clamped[clamped.length - 1] = next;
      } else {
        clamped.push(next);
      }
    }
    return clamped;
  };

  return {
    ...clip,
    duration: nextDuration,
    tracks: clip.tracks.map(track => ({ ...track, keyframes: clampKeyframes(track.keyframes) })),
    ...(clip.camera ? {
      camera: { ...clip.camera, keyframes: clampKeyframes(clip.camera.keyframes) },
    } : {}),
  };
}

function normalizeGraphId(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

export function previewFramesEqual(
  left: ElucimTimelineFrameSelection[] | undefined,
  right: ElucimTimelineFrameSelection[] | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((frame, index) => (
    frame.timelineId === right[index].timelineId
    && frame.frame === right[index].frame
    && (frame.applyCamera !== false) === (right[index].applyCamera !== false)
  ));
}

/**
 * Animation timeline with playhead, per-element tracks, and playback controls.
 * Supports: editable labels, drag reorder, draggable animation bars, easing picker.
 */
export function Timeline({
  className,
  style,
  document: documentModel,
  timelines,
  onTimelinesChange,
  stateMachines,
  onStateMachinesChange,
  onMotionChange,
  preferredMotionType = 'animation',
  onActiveTimelineChange,
  onPreviewTimelineFramesChange,
  onStateMachinePreviewActiveChange,
  onStateMachinePreviewClickChange,
  onStateMachinePreviewKeyDownChange,
  onStateMachinePreviewExitChange,
}: TimelineProps) {
  const activeDocument = documentModel;
  const activeTimelines = timelines;
  const onActiveTimelinesChange = onTimelinesChange;
  const activeStateMachines = stateMachines;
  const onActiveStateMachinesChange = onStateMachinesChange;
  const onActiveMotionChange = onMotionChange;
  const { state, dispatch } = useEditorState();
  const icons = useEditorIcons();
  const { document, currentFrame, isPlaying, selectedIds } = state;
  const root = document.root;
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const fps = ('fps' in root ? root.fps : undefined) ?? 60;
  const children: ElementNode[] = ('children' in root && Array.isArray(root.children)) ? root.children : [];
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const rows = useMemo(() => getRows(children, expandedIds), [children, expandedIds]);
  const elementTypes = useMemo(() => Object.fromEntries(rows.map(row => [row.id, row.element.type])), [rows]);
  const timelineClips = useMemo(() => Object.values(activeTimelines ?? {}), [activeTimelines]);
  const stateMachineClips = useMemo(() => Object.values(activeStateMachines ?? {}), [activeStateMachines]);
  const timelineDurationFallback = getMaxTimelineDuration(activeTimelines) ?? DEFAULT_LINEAR_DURATION_IN_FRAMES;
  const [activeMotionType, setActiveMotionType] = useState<'animation' | 'stateMachine'>(preferredMotionType);
  const [activeTimelineId, setActiveTimelineId] = useState<string | undefined>(undefined);
  const showAnimationTimeline = activeMotionType === 'animation';
  const effectiveActiveTimelineId = activeTimelineId && activeTimelines?.[activeTimelineId]
    ? activeTimelineId
    : activeMotionType === 'animation'
      ? timelineClips[0]?.id
      : undefined;
  const activeTimelineMaxFrame = effectiveActiveTimelineId && activeTimelines?.[effectiveActiveTimelineId]
    ? activeTimelines[effectiveActiveTimelineId].duration
    : timelineDurationFallback - 1;
  const scopedPlayheadPercent = activeTimelineMaxFrame > 0 ? (Math.min(currentFrame, activeTimelineMaxFrame) / activeTimelineMaxFrame) * 100 : 0;
  const updateTimeline = useCallback((timeline: ElucimTimeline) => {
    onActiveTimelinesChange?.({ ...(activeTimelines ?? {}), [timeline.id]: timeline });
  }, [onActiveTimelinesChange, activeTimelines]);
  const renameTimeline = useCallback((timeline: ElucimTimeline, nextId: string) => {
    if (!activeTimelines || timeline.id === nextId) return;
    const existing = { ...activeTimelines };
    delete existing[timeline.id];
    const normalizedId = createUniqueTimelineId(existing, normalizeGraphId(nextId, timeline.id));
    if (normalizedId === timeline.id) return;
    const renamedTimeline = { ...timeline, id: normalizedId };
    const nextTimelines = { ...existing, [normalizedId]: renamedTimeline };
    const nextStateMachines = activeStateMachines
      ? Object.fromEntries(Object.entries(activeStateMachines).map(([machineId, machine]) => [machineId, {
          ...machine,
          states: Object.fromEntries(Object.entries(machine.states).map(([stateId, state]) => [stateId, {
            ...state,
            timeline: state.timeline === timeline.id ? normalizedId : state.timeline,
          }])),
        }]))
      : undefined;
    if (onActiveMotionChange) onActiveMotionChange(nextTimelines, nextStateMachines ?? activeStateMachines);
    else {
      onActiveTimelinesChange?.(nextTimelines);
      if (nextStateMachines) onActiveStateMachinesChange?.(nextStateMachines);
    }
    onActiveTimelineChange?.(normalizedId);
  }, [onActiveTimelineChange, onActiveMotionChange, onActiveStateMachinesChange, onActiveTimelinesChange, activeStateMachines, activeTimelines]);
  const updateStateMachine = useCallback((machine: ElucimStateMachine) => {
    onActiveStateMachinesChange?.({ ...(activeStateMachines ?? {}), [machine.id]: machine });
  }, [onActiveStateMachinesChange, activeStateMachines]);
  const renameStateMachine = useCallback((machine: ElucimStateMachine, nextId: string) => {
    if (!activeStateMachines || machine.id === nextId) return;
    const normalizedId = createUniqueStateMachineId(activeStateMachines, normalizeGraphId(nextId, machine.id));
    if (normalizedId === machine.id) return;
    const next = { ...activeStateMachines };
    delete next[machine.id];
    next[normalizedId] = { ...machine, id: normalizedId };
    onActiveStateMachinesChange?.(next);
  }, [onActiveStateMachinesChange, activeStateMachines]);
  const deleteStateMachine = useCallback((id: string) => {
    if (!activeStateMachines) return;
    const next = { ...activeStateMachines };
    delete next[id];
    onActiveStateMachinesChange?.(Object.keys(next).length > 0 ? next : undefined);
  }, [onActiveStateMachinesChange, activeStateMachines]);
  const deleteTimeline = useCallback((id: string) => {
    if (!activeTimelines) return;
    const next = { ...activeTimelines };
    delete next[id];
    const nextTimelines = Object.keys(next).length > 0 ? next : undefined;
    const nextStateMachines = activeStateMachines
      ? Object.fromEntries(Object.entries(activeStateMachines).map(([machineId, machine]) => [machineId, {
          ...machine,
          states: Object.fromEntries(Object.entries(machine.states).map(([stateId, state]) => [stateId, {
            ...state,
            timeline: state.timeline === id ? undefined : state.timeline,
          } satisfies ElucimStateMachine['states'][string]])),
        } satisfies ElucimStateMachine]))
      : undefined;
    if (onActiveMotionChange) onActiveMotionChange(nextTimelines, nextStateMachines ?? activeStateMachines);
    else {
      onActiveTimelinesChange?.(nextTimelines);
      if (nextStateMachines) onActiveStateMachinesChange?.(nextStateMachines);
    }
  }, [onActiveMotionChange, onActiveStateMachinesChange, onActiveTimelinesChange, activeStateMachines, activeTimelines]);
  const addIntroTimeline = useCallback(() => {
    const targets = rows.slice(0, 8).map(row => row.id);
    if (targets.length === 0) return;
    const id = createUniqueTimelineId(activeTimelines, 'auto-intro');
    const stagger = 6;
    const fadeDuration = 18;
    const duration = Math.max(fadeDuration, (targets.length - 1) * stagger + fadeDuration);
    updateTimeline({
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
  }, [rows, updateTimeline, activeTimelines]);
  const addBlankTimeline = useCallback(() => {
    const target = rows.find(row => selectedIds.includes(row.id))?.id ?? rows[0]?.id;
    if (!target) return;
    const id = createUniqueTimelineId(activeTimelines, 'timeline');
    updateTimeline({
      id,
      duration: 30,
      tracks: [
        {
          target,
          property: 'opacity',
          keyframes: [
            { frame: 0, value: 1 },
            { frame: 30, value: 1 },
          ],
        },
      ],
    });
  }, [rows, selectedIds, updateTimeline, activeTimelines]);
  const addStateMachine = useCallback(() => {
    const id = createUniqueStateMachineId(activeStateMachines, 'state-machine');
    updateStateMachine({
      id,
      entry: 'start',
      states: { start: {} },
      inputs: { onStart: { type: 'trigger' } },
      transitions: [{ id: 'entry-start', from: 'entry', to: 'start', trigger: 'onStart' }],
    });
  }, [updateStateMachine, activeStateMachines]);

  // ── Rename state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // ── Drag reorder state ──

  // ── Easing picker state ──
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [stateMachinePreview, setStateMachinePreview] = useState<StateMachinePreviewState | null>(null);

  useEffect(() => {
    onStateMachinePreviewActiveChange?.(Boolean(stateMachinePreview && !stateMachinePreview.finished && !stateMachinePreview.exited));
  }, [onStateMachinePreviewActiveChange, stateMachinePreview]);

  const handleActiveTimelineChange = useCallback((timelineId: string | undefined) => {
    setActiveTimelineId(timelineId);
    dispatch({ type: 'SET_ACTIVE_TIMELINE', timelineId });
    const nextMaxFrame = timelineId && activeTimelines?.[timelineId] ? activeTimelines[timelineId].duration : timelineDurationFallback - 1;
    if (currentFrame > nextMaxFrame) dispatch({ type: 'SET_FRAME', frame: nextMaxFrame });
    onActiveTimelineChange?.(timelineId);
  }, [currentFrame, dispatch, onActiveTimelineChange, timelineDurationFallback, activeTimelines]);

  useEffect(() => {
    dispatch({ type: 'SET_ACTIVE_TIMELINE', timelineId: effectiveActiveTimelineId });
  }, [dispatch, effectiveActiveTimelineId]);

  const previewStateAnimation = useCallback((machineId: string, stateId: string, details?: { event?: string; previousStateId?: string; activeTransitionId?: string }) => {
    const timelineId = activeStateMachines?.[machineId]?.states[stateId]?.timeline;
    handleActiveTimelineChange(timelineId);
    setPlaybackSpeed(1);
    setStateMachinePreview({ machineId, stateId, timelineId, event: details?.event ?? 'start', previousStateId: details?.previousStateId, activeTransitionId: details?.activeTransitionId, logicalStatePath: [stateId] });
    dispatch({ type: 'SET_FRAME', frame: 0 });
    dispatch({ type: 'SET_PLAYING', playing: Boolean(timelineId) });
  }, [dispatch, handleActiveTimelineChange, activeStateMachines]);

  const triggerStateMachinePreviewEvent = useCallback((machineId: string, stateId: string, eventName: string, key?: string): boolean => {
    if (stateMachinePreview?.machineId === machineId && stateMachinePreview.exited) return false;
    const machine = activeStateMachines?.[machineId];
    const sourceIsEntry = stateId === 'entry';
    const state = sourceIsEntry ? undefined : machine?.states[stateId];
    if (!machine || (!sourceIsEntry && !state)) return false;

    const transition = getPreviewTransition(machine, stateId, eventName, key);
      if (!transition) {
        if (eventName === 'complete') {
          const hasEventsToWaitFor = stateId !== 'entry' && (machine.transitions ?? []).some(transition => transition.from === stateId && transition.trigger);
          setStateMachinePreview(current => ({
            machineId,
            stateId,
            timelineId: state?.timeline,
            event: hasEventsToWaitFor ? current?.event ?? 'start' : 'complete',
            previousStateId: current?.previousStateId,
            activeTransitionId: current?.activeTransitionId,
            logicalStatePath: current?.logicalStatePath ?? [stateId],
            finished: !hasEventsToWaitFor,
          }));
          dispatch({ type: 'SET_PLAYING', playing: false });
        }
      return false;
    }

    const targetStateId = resolveTransitionTarget(machine, transition);
    if (targetStateId === 'exit') {
      setStateMachinePreview({
        machineId,
        stateId,
        timelineId: state?.timeline,
        event: eventName,
        previousStateId: stateId,
        activeTransitionId: transition.id,
        exited: true,
      });
      dispatch({ type: 'SET_PLAYING', playing: false });
      return true;
    }
    if (!targetStateId) return false;

    const timelineId = machine.states[targetStateId]?.timeline;
    handleActiveTimelineChange(timelineId);
    setPlaybackSpeed(1);
    setStateMachinePreview({
      machineId,
      stateId: targetStateId,
      timelineId,
      event: eventName,
      previousStateId: stateId,
      activeTransitionId: transition.id,
      logicalStatePath: sourceIsEntry
        ? [targetStateId]
        : [...(stateMachinePreview?.logicalStatePath ?? [stateId]), targetStateId],
    });
    dispatch({ type: 'SET_FRAME', frame: 0 });
    dispatch({ type: 'SET_PLAYING', playing: Boolean(timelineId) });
    return true;
  }, [dispatch, handleActiveTimelineChange, stateMachinePreview?.logicalStatePath, activeStateMachines]);

  useEffect(() => {
    if (!stateMachinePreview || stateMachinePreview.timelineId || stateMachinePreview.exited) return;
    const machine = activeStateMachines?.[stateMachinePreview.machineId];
    const nextTransition = machine ? getStateCompleteTransition(machine, stateMachinePreview.stateId) : undefined;
    if (!machine || !nextTransition || stateMachinePreview.activeTransitionId === nextTransition.id) return;
    const targetStateId = resolveTransitionTarget(machine, nextTransition);
    if (!targetStateId || targetStateId === stateMachinePreview.stateId) return;
    if (stateMachinePreview.logicalStatePath?.includes(targetStateId)) return;
    const timeout = window.setTimeout(() => {
      triggerStateMachinePreviewEvent(stateMachinePreview.machineId, stateMachinePreview.stateId, 'complete');
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [stateMachinePreview, triggerStateMachinePreviewEvent, activeStateMachines]);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
      return;
    }

    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - lastTimeRef.current;
      const frameDelta = (elapsed / 1000) * fps * playbackSpeed;
      if (frameDelta >= 1) {
        const frameStep = Math.floor(frameDelta);
        if (stateMachinePreview) {
          const nextFrame = currentFrame + frameStep;
          if (nextFrame > activeTimelineMaxFrame) {
            dispatch({ type: 'SET_FRAME', frame: activeTimelineMaxFrame });
            triggerStateMachinePreviewEvent(stateMachinePreview.machineId, stateMachinePreview.stateId, 'complete');
          } else {
            dispatch({ type: 'SET_FRAME', frame: nextFrame });
          }
        } else {
          const playbackDuration = Math.max(1, activeTimelineMaxFrame + 1);
          const newFrame = (currentFrame + frameStep) % playbackDuration;
          dispatch({ type: 'SET_FRAME', frame: newFrame });
        }
        lastTimeRef.current = now;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, [activeTimelineMaxFrame, isPlaying, currentFrame, fps, playbackSpeed, dispatch, stateMachinePreview, triggerStateMachinePreviewEvent]);

  const stopMotionPlayback = useCallback(() => {
    setPlaybackSpeed(1);
    setStateMachinePreview(null);
    dispatch({ type: 'SET_PLAYING', playing: false });
  }, [dispatch]);

  useEffect(() => {
    onStateMachinePreviewExitChange?.(stopMotionPlayback);
    return () => onStateMachinePreviewExitChange?.(undefined);
  }, [onStateMachinePreviewExitChange, stopMotionPlayback]);

  const togglePlay = useCallback(() => {
    setPlaybackSpeed(1);
    setStateMachinePreview(null);
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

  const rulerRef = useRef<HTMLDivElement>(null);

  const scrubFromClientX = useCallback((clientX: number) => {
    const ruler = rulerRef.current;
    if (!ruler) return;
    dispatch({ type: 'SET_FRAME', frame: ratioToFrame(clientXToRatio(clientX, ruler.getBoundingClientRect()), activeTimelineMaxFrame) });
  }, [activeTimelineMaxFrame, dispatch]);

  const handleRulerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    startRafDrag({
      event: e,
      onStart: point => scrubFromClientX(point.clientX),
      onFrame: point => scrubFromClientX(point.clientX),
      onCommit: point => scrubFromClientX(point.clientX),
    });
  }, [scrubFromClientX]);

  const handleRulerPointerMove = useCallback(() => {}, []);

  const handleRulerPointerUp = useCallback(() => {}, []);



  const playheadPercent = scopedPlayheadPercent;
  const playbackControls = (
    <TimelinePlaybackControls
      currentFrame={Math.min(currentFrame, activeTimelineMaxFrame)}
      maxFrame={activeTimelineMaxFrame}
      fps={fps}
      isPlaying={isPlaying}
      icons={{
        skipStart: icons.SkipStart({ size: 12 }),
        stepBackward: icons.StepBackward({ size: 12 }),
        playPause: isPlaying ? icons.Pause({ size: 14 }) : icons.Play({ size: 14 }),
        stepForward: icons.StepForward({ size: 12 }),
        skipEnd: icons.SkipEnd({ size: 12 }),
      }}
      onStart={goToStart}
      onStepBackward={stepBackward}
      onTogglePlay={togglePlay}
      onStepForward={stepForward}
      onEnd={goToEnd}
    />
  );

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
    >
      {/* Ruler + tracks */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }} data-track-area>
        {/* Ruler */}

        {(timelineClips.length > 0 || stateMachineClips.length > 0 || onActiveTimelinesChange || onActiveStateMachinesChange) && (
            <TimelineClipRows
            clips={timelineClips}
            document={activeDocument}
            durationInFrames={activeTimelineMaxFrame + 1}
            onKeyframeClick={frame => dispatch({ type: 'SET_FRAME', frame: Math.max(0, Math.min(frame, activeTimelineMaxFrame)) })}
            onTimelineChange={onActiveTimelinesChange ? updateTimeline : undefined}
            onTimelineRename={onActiveTimelinesChange ? renameTimeline : undefined}
            onTimelineDelete={onActiveTimelinesChange ? deleteTimeline : undefined}
            onAddTimeline={onActiveTimelinesChange ? addBlankTimeline : undefined}
            onAddIntroTimeline={onActiveTimelinesChange ? addIntroTimeline : undefined}
            elementIds={rows.map(row => row.id)}
            elementTypes={elementTypes}
            stateMachines={stateMachineClips}
            timelines={activeTimelines ?? {}}
            onStateMachineChange={onActiveStateMachinesChange ? updateStateMachine : undefined}
            onStateMachineRename={onActiveStateMachinesChange ? renameStateMachine : undefined}
            onStateMachineDelete={onActiveStateMachinesChange ? deleteStateMachine : undefined}
            onAddStateMachine={onActiveStateMachinesChange ? addStateMachine : undefined}
            stateMachinePreview={stateMachinePreview}
            isPlaying={isPlaying}
            currentFrame={currentFrame}
            playbackSpeed={playbackSpeed}
            preferredMotionType={preferredMotionType}
            onMotionTypeChange={setActiveMotionType}
            onActiveTimelineChange={handleActiveTimelineChange}
            onPreviewTimelineFramesChange={onPreviewTimelineFramesChange}
            onStateMachinePreviewClickChange={onStateMachinePreviewClickChange}
            onStateMachinePreviewKeyDownChange={onStateMachinePreviewKeyDownChange}
            playheadPercent={playheadPercent}
            playbackControls={playbackControls}
            rulerRef={rulerRef}
            onRulerPointerDown={handleRulerPointerDown}
            onRulerPointerMove={handleRulerPointerMove}
            onRulerPointerUp={handleRulerPointerUp}
            onStopPlayback={stopMotionPlayback}
            onPreviewState={previewStateAnimation}
            onPreviewEvent={triggerStateMachinePreviewEvent}
          />
        )}

        {/* Element tracks */}
      </div>

    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function TimelineClipRows({
  clips,
  document,
  durationInFrames,
  onKeyframeClick,
  onTimelineChange,
  onTimelineRename,
  onTimelineDelete,
  onAddTimeline,
  onAddIntroTimeline,
  elementIds,
  elementTypes,
  stateMachines,
  timelines,
  onStateMachineChange,
  onStateMachineRename,
  onStateMachineDelete,
  onAddStateMachine,
  stateMachinePreview,
  isPlaying,
  currentFrame,
  playbackSpeed,
  preferredMotionType,
  onMotionTypeChange,
  onActiveTimelineChange,
  onPreviewTimelineFramesChange,
  onStateMachinePreviewClickChange,
  onStateMachinePreviewKeyDownChange,
  playheadPercent,
  playbackControls,
  rulerRef,
  onRulerPointerDown,
  onRulerPointerMove,
  onRulerPointerUp,
  onStopPlayback,
  onPreviewState,
  onPreviewEvent,
}: {
  clips: ElucimTimeline[];
  document?: ElucimDocument;
  durationInFrames: number;
  onKeyframeClick: (frame: number) => void;
  onTimelineChange?: (timeline: ElucimTimeline) => void;
  onTimelineRename?: (timeline: ElucimTimeline, nextId: string) => void;
  onTimelineDelete?: (id: string) => void;
  onAddTimeline?: () => void;
  onAddIntroTimeline?: () => void;
  elementIds: string[];
  elementTypes: Record<string, string>;
  stateMachines: ElucimStateMachine[];
  timelines: Record<string, ElucimTimeline>;
  onStateMachineChange?: (machine: ElucimStateMachine) => void;
  onStateMachineRename?: (machine: ElucimStateMachine, nextId: string) => void;
  onStateMachineDelete?: (id: string) => void;
  onAddStateMachine?: () => void;
  stateMachinePreview: StateMachinePreviewState | null;
  isPlaying: boolean;
  currentFrame: number;
  playbackSpeed: number;
  preferredMotionType: 'animation' | 'stateMachine';
  onMotionTypeChange?: (type: 'animation' | 'stateMachine') => void;
  onActiveTimelineChange?: (timelineId: string | undefined) => void;
  onPreviewTimelineFramesChange?: (frames: ElucimTimelineFrameSelection[] | undefined) => void;
  onStateMachinePreviewClickChange?: (handler: (() => boolean) | undefined) => void;
  onStateMachinePreviewKeyDownChange?: (handler: ((key: string) => boolean) | undefined) => void;
  playheadPercent: number;
  playbackControls: React.ReactNode;
  rulerRef: React.RefObject<HTMLDivElement>;
  onRulerPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onRulerPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onRulerPointerUp: () => void;
  onStopPlayback: () => void;
  onPreviewState: (machineId: string, stateId: string, details?: { event?: string; previousStateId?: string; activeTransitionId?: string }) => void;
  onPreviewEvent: (machineId: string, stateId: string, eventName: string, key?: string) => boolean;
}) {
  const icons = useEditorIcons();
  const firstAnimationItem = useMemo<SelectedTimelineItem | null>(() => clips[0] ? { type: 'animation', timelineId: clips[0].id } : null, [clips]);
  const firstStateMachineItem = useMemo<SelectedStateMachineItem | null>(() => stateMachines[0] ? { type: 'stateMachine', machineId: stateMachines[0].id } : null, [stateMachines]);
  const [selectedItem, setSelectedItem] = useState<SelectedMotionItem | null>(() => {
    if (preferredMotionType === 'stateMachine' && firstStateMachineItem) return firstStateMachineItem;
    if (firstAnimationItem) return firstAnimationItem;
    if (firstStateMachineItem) return firstStateMachineItem;
    return null;
  });
  const [activeMotionType, setActiveMotionType] = useState<'animation' | 'stateMachine'>(() => selectedItem?.type ?? preferredMotionType);
  const [renamingMotionItem, setRenamingMotionItem] = useState<SelectedMotionItem | null>(null);
  const [hoveredMotionItem, setHoveredMotionItem] = useState<SelectedMotionItem | null>(null);
  const [keyframeDragPreview, setKeyframeDragPreview] = useState<{ timelineId: string; trackIndex: number; keyframeIndex: number; frame: number; percent: number } | null>(null);
  const suppressKeyframeClickRef = useRef(false);
  const lastAnimationItem = useRef<SelectedTimelineItem | null>(firstAnimationItem);
  const lastStateMachineItem = useRef<SelectedStateMachineItem | null>(firstStateMachineItem);
  const latestStateMachinesRef = useRef(stateMachines);
  const lastPreviewFramesRef = useRef<ElucimTimelineFrameSelection[] | undefined>(undefined);
  useEffect(() => {
    latestStateMachinesRef.current = stateMachines;
  }, [stateMachines]);
  const selectMotionItem = useCallback((item: SelectedMotionItem) => {
    if (item.type === 'animation') lastAnimationItem.current = item;
    else lastStateMachineItem.current = item;
    setActiveMotionType(item.type);
    onMotionTypeChange?.(item.type);
    setSelectedItem(item);
  }, [onMotionTypeChange]);
  const previousPreviewSelection = useRef<string | null>(null);
  useEffect(() => {
    if (!stateMachinePreview) return;
    const key = `${stateMachinePreview.machineId}:${stateMachinePreview.stateId}`;
    if (previousPreviewSelection.current === key) return;
    previousPreviewSelection.current = key;
    if (stateMachines.some(machine => machine.id === stateMachinePreview.machineId)) {
      selectMotionItem({ type: 'stateMachine', machineId: stateMachinePreview.machineId, stateId: stateMachinePreview.stateId });
    }
  }, [selectMotionItem, stateMachinePreview, stateMachines]);
  const selectMotionType = useCallback((type: 'animation' | 'stateMachine') => {
    if (type !== activeMotionType) onStopPlayback();
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
  }, [activeMotionType, clips, firstAnimationItem, firstStateMachineItem, onMotionTypeChange, onStopPlayback, stateMachines]);
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
    if (activeMotionType === 'stateMachine' && previousCount === 0 && stateMachines[0]) {
      selectMotionItem({ type: 'stateMachine', machineId: stateMachines[0].id });
    }
  }, [activeMotionType, selectMotionItem, stateMachines]);
  useEffect(() => {
    if (selectedItem?.type === 'animation' && clips.some(clip => clip.id === selectedItem.timelineId)) return;
    if (selectedItem?.type === 'stateMachine' && stateMachines.some(machine => machine.id === selectedItem.machineId)) return;
    if (activeMotionType === 'stateMachine' && stateMachines[0]) {
      selectMotionItem({ type: 'stateMachine', machineId: stateMachines[0].id });
    } else {
      const lastAnimation = lastAnimationItem.current && clips.some(clip => clip.id === lastAnimationItem.current?.timelineId)
        ? lastAnimationItem.current
        : null;
      const fallback = lastAnimation ?? (clips[0] ? { type: 'animation' as const, timelineId: clips[0].id } : stateMachines[0] ? { type: 'stateMachine' as const, machineId: stateMachines[0].id } : null);
      if (fallback) selectMotionItem(fallback);
      else setSelectedItem(null);
    }
  }, [activeMotionType, clips, selectMotionItem, selectedItem, stateMachines]);
  const selectedClip = activeMotionType === 'animation' && selectedItem?.type === 'animation' ? clips.find(clip => clip.id === selectedItem.timelineId) : undefined;
  const emitPreviewTimelineFrames = useCallback((frames: ElucimTimelineFrameSelection[] | undefined) => {
    if (previewFramesEqual(lastPreviewFramesRef.current, frames)) return;
    lastPreviewFramesRef.current = frames?.map(frame => ({ ...frame }));
    onPreviewTimelineFramesChange?.(frames);
  }, [onPreviewTimelineFramesChange]);
  useEffect(() => {
    onActiveTimelineChange?.(activeMotionType === 'animation' ? selectedClip?.id : stateMachinePreview?.timelineId);
  }, [activeMotionType, onActiveTimelineChange, selectedClip?.id, stateMachinePreview?.timelineId]);
  useEffect(() => {
    if (activeMotionType === 'animation') {
      emitPreviewTimelineFrames(selectedClip ? [{ timelineId: selectedClip.id, frame: currentFrame }] : undefined);
      return;
    }
    if (!stateMachinePreview) {
      emitPreviewTimelineFrames(undefined);
      return;
    }
    const frames = getStateMachineVisualFrames(
      document ?? { version: '2.0', scene: { type: 'scene', children: [] }, elements: {}, timelines, stateMachines: Object.fromEntries(stateMachines.map(machine => [machine.id, machine])) },
      stateMachinePreview.machineId,
      {
        statePath: stateMachinePreview.logicalStatePath,
        currentStateId: stateMachinePreview.stateId,
        currentFrame,
        exited: stateMachinePreview.exited,
        finished: stateMachinePreview.finished,
        missingState: 'skip',
        missingTimeline: 'skip',
      },
    );
    emitPreviewTimelineFrames(frames.length > 0 ? frames : undefined);
  }, [activeMotionType, currentFrame, document, emitPreviewTimelineFrames, selectedClip, stateMachinePreview, stateMachines, timelines]);
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
  const updateDuration = (clip: ElucimTimeline, duration: number) => {
    onTimelineChange?.(clampTimelineKeyframesToDuration(clip, duration));
  };
  const renameClip = (clip: ElucimTimeline, value: string) => {
    const baseId = normalizeGraphId(value, clip.id);
    const existing = Object.fromEntries(clips.filter(current => current.id !== clip.id).map(current => [current.id, current]));
    const nextId = createUniqueTimelineId(existing, baseId);
    if (nextId === clip.id) return;
    onTimelineRename?.(clip, nextId);
    selectMotionItem({ type: 'animation', timelineId: nextId });
  };
  const updateKeyframe = (clip: ElucimTimeline, trackIndex: number, keyframeIndex: number, patch: { frame?: number; value?: unknown }) => {
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
  const updateTrack = (clip: ElucimTimeline, trackIndex: number, patch: Partial<ElucimTimeline['tracks'][number]>) => {
    onTimelineChange?.({
      ...clip,
      tracks: clip.tracks.map((track, currentTrackIndex) => currentTrackIndex === trackIndex ? { ...track, ...patch } : track),
    });
  };
  const addTrack = (clip: ElucimTimeline) => {
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
  const deleteTrack = (clip: ElucimTimeline, trackIndex: number) => {
    onTimelineChange?.({
      ...clip,
      tracks: clip.tracks.filter((_, currentTrackIndex) => currentTrackIndex !== trackIndex),
    });
    selectMotionItem({ type: 'animation', timelineId: clip.id });
  };
  const addKeyframe = (clip: ElucimTimeline, trackIndex: number) => {
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
  const deleteKeyframe = (clip: ElucimTimeline, trackIndex: number, keyframeIndex: number) => {
    onTimelineChange?.({
      ...clip,
      tracks: clip.tracks.map((track, currentTrackIndex) => currentTrackIndex === trackIndex
        ? { ...track, keyframes: track.keyframes.filter((_, currentKeyframeIndex) => currentKeyframeIndex !== keyframeIndex) }
        : track),
    });
    selectMotionItem({ type: 'animation', timelineId: clip.id, trackIndex });
  };
  const updateEffects = (clip: ElucimTimeline, effects: ElucimRevealEffect[]) => {
    onTimelineChange?.({ ...clip, effects });
  };
  const dragKeyframe = (event: React.PointerEvent<HTMLButtonElement>, clip: ElucimTimeline, trackIndex: number, keyframeIndex: number) => {
    if (!onTimelineChange) return;
    event.preventDefault();
    event.stopPropagation();
    const track = clip.tracks[trackIndex];
    const timelineLane = event.currentTarget.parentElement;
    if (!track || !timelineLane) return;
    const dragTarget = event.currentTarget;
    const startX = event.clientX;
    const laneRect = timelineLane.getBoundingClientRect();
    const startFrame = track.keyframes[keyframeIndex]?.frame ?? 0;
    const startLaneX = (framePercent(startFrame, clip.duration) / 100) * laneRect.width;
    const positionFromClientX = (clientX: number) => {
      const targetLaneX = startLaneX + (clientX - startX);
      const ratio = laneRect.width > 0 ? targetLaneX / laneRect.width : 0;
      const previousFrame = track.keyframes[keyframeIndex - 1]?.frame ?? -1;
      const nextFrame = track.keyframes[keyframeIndex + 1]?.frame ?? clip.duration + 1;
      const minFrame = previousFrame + 1;
      const maxFrame = nextFrame - 1;
      const continuousFrame = Math.max(minFrame, Math.min(maxFrame, Math.max(0, Math.min(1, ratio)) * Math.max(0, clip.duration)));
      return {
        frame: Math.round(continuousFrame),
        percent: framePercent(continuousFrame, clip.duration),
      };
    };
    const previewFrame = (clientX: number) => {
      const preview = positionFromClientX(clientX);
      dragTarget.style.left = `${preview.percent}%`;
      setKeyframeDragPreview({ timelineId: clip.id, trackIndex, keyframeIndex, ...preview });
      return preview.frame;
    };
    startRafDrag({
      event,
      onFrame: point => previewFrame(point.clientX),
      onCommit: point => {
        if (!point.moved) {
          setKeyframeDragPreview(null);
          return;
        }
        suppressKeyframeClickRef.current = true;
        const frame = previewFrame(point.clientX);
        updateKeyframe(clip, trackIndex, keyframeIndex, { frame });
        selectMotionItem({ type: 'animation', timelineId: clip.id, trackIndex, keyframeIndex });
        setKeyframeDragPreview(null);
      },
      onCancel: () => setKeyframeDragPreview(null),
    });
  };
  const selectedStateId = selectedMachine && selectedItem?.type === 'stateMachine'
    ? selectedItem.stateId && selectedMachine.states[selectedItem.stateId] ? selectedItem.stateId : undefined
    : undefined;
  const selectedState = selectedMachine && selectedStateId ? selectedMachine.states[selectedStateId] : undefined;
  const renameMachine = (machine: ElucimStateMachine, value: string) => {
    const baseId = normalizeGraphId(value, machine.id);
    const existing = Object.fromEntries(stateMachines.filter(current => current.id !== machine.id).map(current => [current.id, current]));
    const nextId = createUniqueStateMachineId(existing, baseId);
    if (nextId === machine.id) return;
    onStateMachineRename?.(machine, nextId);
    selectMotionItem({ type: 'stateMachine', machineId: nextId });
  };
  const updateMachineState = (machine: ElucimStateMachine, stateId: string, patch: Partial<ElucimStateMachine['states'][string]>) => {
    onStateMachineChange?.({
      ...machine,
      states: {
        ...machine.states,
        [stateId]: { ...machine.states[stateId], ...patch },
      },
    });
  };
  const renameMachineState = (machine: ElucimStateMachine, stateId: string, value: string) => {
    const baseId = normalizeGraphId(value, stateId);
    let nextStateId = baseId;
    let index = 2;
    while (nextStateId !== stateId && machine.states[nextStateId]) {
      nextStateId = `${baseId}-${index}`;
      index += 1;
    }
    if (nextStateId === stateId) return;
    const states = Object.fromEntries(Object.entries(machine.states).map(([id, currentState]) => [id === stateId ? nextStateId : id, currentState]));
    const layoutStates = machine.layout?.states
      ? Object.fromEntries(Object.entries(machine.layout.states).map(([id, position]) => [id === stateId ? nextStateId : id, position]))
      : undefined;
    onStateMachineChange?.({
      ...machine,
      entry: machine.entry === stateId ? nextStateId : machine.entry,
      states,
      transitions: machine.transitions?.map(transition => ({
        ...transition,
        from: transition.from === stateId ? nextStateId : transition.from,
        to: transition.to === stateId ? nextStateId : transition.to,
      })),
      layout: layoutStates ? { ...machine.layout, states: layoutStates } : machine.layout,
    });
    selectMotionItem({ type: 'stateMachine', machineId: machine.id, stateId: nextStateId });
  };
  const addMachineState = (machine: ElucimStateMachine) => {
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
  const deleteMachineState = (machine: ElucimStateMachine, stateId: string) => {
    const remainingStateIds = Object.keys(machine.states).filter(id => id !== stateId);
    if (remainingStateIds.length === 0) return;
    const fallback = remainingStateIds[0] ?? machine.entry;
    const states = Object.fromEntries(Object.entries(machine.states)
      .filter(([id]) => id !== stateId)
      .map(([id, state]) => [id, state]));
    onStateMachineChange?.({
      ...machine,
      entry: machine.entry === stateId ? fallback : machine.entry,
      states,
      transitions: machine.transitions?.filter(transition => transition.from !== stateId && transition.to !== stateId),
      layout: {
        ...machine.layout,
        states: Object.fromEntries(Object.entries(machine.layout?.states ?? {}).filter(([id]) => id !== stateId)),
      },
    });
    selectMotionItem({ type: 'stateMachine', machineId: machine.id });
  };
  const normalizeGraphViewport = (viewport: ReactFlowViewport): ReactFlowViewport => ({
    x: Math.round(viewport.x),
    y: Math.round(viewport.y),
    zoom: Number(viewport.zoom.toFixed(3)),
  });
  const graphViewportsEqual = (left: ReactFlowViewport | undefined, right: ReactFlowViewport | undefined): boolean => (
    left?.x === right?.x && left?.y === right?.y && left?.zoom === right?.zoom
  );
  const moveMachineGraphNode = (machine: ElucimStateMachine, nodeId: string, position: { x: number; y: number }, viewport?: ReactFlowViewport) => {
    const latestMachine = latestStateMachinesRef.current.find(current => current.id === machine.id) ?? machine;
    onStateMachineChange?.({
      ...latestMachine,
      layout: {
        ...latestMachine.layout,
        entry: nodeId === ENTRY_NODE_ID ? position : latestMachine.layout?.entry,
        viewport: viewport ? normalizeGraphViewport(viewport) : latestMachine.layout?.viewport,
        states: {
          ...latestMachine.layout?.states,
          ...(nodeId === ENTRY_NODE_ID ? {} : { [nodeId]: position }),
        },
      },
    });
  };
  const applyMachineGraphLayout = (machine: ElucimStateMachine, entryPosition: { x: number; y: number }, statePositions: Map<string, { x: number; y: number }>) => {
    const latestMachine = latestStateMachinesRef.current.find(current => current.id === machine.id) ?? machine;
    onStateMachineChange?.({
      ...latestMachine,
      layout: {
        ...latestMachine.layout,
        entry: entryPosition,
        states: {
          ...latestMachine.layout?.states,
          ...Object.fromEntries(statePositions),
        },
      },
    });
  };
  const moveMachineViewport = (machine: ElucimStateMachine, viewport: ReactFlowViewport) => {
    const latestMachine = latestStateMachinesRef.current.find(current => current.id === machine.id) ?? machine;
    const nextViewport = normalizeGraphViewport(viewport);
    if (graphViewportsEqual(latestMachine.layout?.viewport, nextViewport)) return;
    onStateMachineChange?.({
      ...latestMachine,
      layout: {
        ...latestMachine.layout,
        viewport: nextViewport,
      },
    });
  };
  const addMachineTransition = (machine: ElucimStateMachine, stateId: string, targetStateId?: string) => {
    const state = machine.states[stateId];
    if (!state) return;
    let transitionName = 'next';
    let index = 2;
    const existingIds = new Set((machine.transitions ?? []).map(transition => transition.id));
    while (existingIds.has(`${stateId}-${transitionName}`)) {
      transitionName = `next-${index}`;
      index += 1;
    }
    const target = targetStateId === 'exit'
      ? 'exit'
      : targetStateId === 'entry'
        ? 'entry'
      : targetStateId && machine.states[targetStateId] ? targetStateId : Object.keys(machine.states).find(id => id !== stateId) ?? stateId;
    const existingNext = machine.transitions?.find(transition => transition.from === stateId && transition.exitTime !== undefined);
    if (existingNext) {
      onStateMachineChange?.({
        ...machine,
        transitions: (machine.transitions ?? []).map(transition => transition.id === existingNext.id ? { ...transition, to: target } : transition),
      });
      selectMotionItem({ type: 'stateMachine', machineId: machine.id, stateId, transitionEvent: existingNext.id });
      return existingNext.id;
    }
    const transitionId = createUniqueTransitionId(machine, `${stateId}-${transitionName}`);
    onStateMachineChange?.({
      ...machine,
      transitions: [...(machine.transitions ?? []), { id: transitionId, from: stateId, to: target, exitTime: 1 }],
    });
    selectMotionItem({ type: 'stateMachine', machineId: machine.id, stateId, transitionEvent: transitionId });
    return transitionId;
  };
  const updateMachineTransition = (machine: ElucimStateMachine, transitionId: string, patch: Partial<ElucimTransition>) => {
    onStateMachineChange?.({
      ...machine,
      transitions: (machine.transitions ?? []).map(transition => transition.id === transitionId ? { ...transition, ...patch } : transition),
    });
  };
  const renameMachineTransition = (machine: ElucimStateMachine, transitionId: string, nextTrigger: string) => {
    const transition = machine.transitions?.find(current => current.id === transitionId);
    if (!transition?.trigger) return;
    const trigger = EVENT_PRESET_SET.has(nextTrigger) ? nextTrigger : normalizeGraphId(nextTrigger, transition.trigger);
    if (trigger === transition.trigger) return;
    if (transition.from !== 'entry' && !isAvailableTransitionTrigger(machine, transition, trigger)) return;
    const transitions = machine.transitions?.map(current => {
      if (current.id !== transitionId) return current;
      return trigger === 'onKey' ? { ...current, trigger, key: current.key?.trim() || 'Enter' } : { ...current, trigger, key: undefined };
    });
    onStateMachineChange?.({
      ...machine,
      inputs: pruneUnusedTriggerInputs({ ...(machine.inputs ?? {}), [trigger]: { type: 'trigger' } }, transitions),
      transitions,
    });
  };
  const setMachineTransitionKind = (machine: ElucimStateMachine, transitionId: string, kind: 'event' | 'next') => {
    const transition = machine.transitions?.find(current => current.id === transitionId);
    if (!transition || transition.from === 'entry') return;
    const transitions = (machine.transitions ?? []).flatMap(current => {
      if (current.id !== transitionId) return current;
      if (kind === 'next') {
        const { trigger: _trigger, key: _key, ...rest } = current;
        return { ...rest, exitTime: current.exitTime ?? 1 };
      }
      const trigger = current.trigger && isAvailableTransitionTrigger(machine, current, current.trigger) ? current.trigger : 'onClick';
      const { exitTime: _exitTime, ...rest } = current;
      return { ...rest, trigger };
    }).filter(current => !(kind === 'next' && current.id !== transitionId && current.from === transition.from && current.exitTime !== undefined));
    const inputs = kind === 'event'
      ? { ...(machine.inputs ?? {}), [(transition.trigger ?? 'onClick')]: { type: 'trigger' as const } }
      : machine.inputs;
    onStateMachineChange?.({
      ...machine,
      inputs: pruneUnusedTriggerInputs(inputs, transitions),
      transitions,
    });
  };
  const deleteMachineTransition = (machine: ElucimStateMachine, transitionId: string) => {
    const transition = machine.transitions?.find(current => current.id === transitionId);
    const transitions = machine.transitions?.filter(current => current.id !== transitionId);
    onStateMachineChange?.({
      ...machine,
      inputs: pruneUnusedTriggerInputs(machine.inputs, transitions),
      transitions,
    });
    selectMotionItem({ type: 'stateMachine', machineId: machine.id, stateId: transition?.from !== 'entry' && transition?.from !== 'any' ? transition?.from : undefined });
  };
  const playStateMachine = (machine: ElucimStateMachine) => {
    const entryTransition = getEntryTransition(machine);
    const initialStateId = getEntryTargetStateId(machine);
    if (!initialStateId) return;
    if (entryTransition?.trigger && entryTransition.trigger !== 'onStart') {
      selectMotionItem({ type: 'stateMachine', machineId: machine.id, stateId: undefined, transitionEvent: entryTransition.id });
      onPreviewState(machine.id, 'entry', { event: 'start', activeTransitionId: entryTransition.id });
      return;
    }
    selectMotionItem({ type: 'stateMachine', machineId: machine.id, stateId: initialStateId });
    onPreviewState(machine.id, initialStateId, { event: entryTransition?.trigger ?? 'onStart', previousStateId: 'entry', activeTransitionId: entryTransition?.id });
  };
  const resetStateMachinePreview = (machine: ElucimStateMachine) => {
    const entryTransition = getEntryTransition(machine);
    onStopPlayback();
    onPreviewState(machine.id, 'entry', { event: 'reset', activeTransitionId: entryTransition?.id });
    selectMotionItem({ type: 'stateMachine', machineId: machine.id, stateId: undefined, transitionEvent: entryTransition?.id });
  };
  const motionGridColumns = activeMotionType === 'stateMachine'
    ? `${MOTION_RAIL_WIDTH}px ${MOTION_LIST_WIDTH}px minmax(0, 1fr) minmax(236px, ${MOTION_DETAILS_WIDTH}px)`
    : `${MOTION_RAIL_WIDTH}px ${MOTION_LIST_WIDTH}px minmax(0, 1fr) ${MOTION_DETAILS_WIDTH}px`;
  return (
    <div aria-label="Animation clips" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: motionGridColumns, flex: 1, minHeight: 0 }}>
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
        </div>
        <div style={{ borderRight: `1px solid ${v('--elucim-editor-border')}`, background: v('--elucim-editor-surface') }}>
          <div style={{ minHeight: 31, padding: '4px 6px 4px 8px', display: 'flex', alignItems: 'center', gap: 4, borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}` }}>
            <span style={{ flex: 1, minWidth: 0, color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {activeMotionType === 'animation' ? 'Animations' : 'State machines'}
            </span>
            {activeMotionType === 'animation' && onAddIntroTimeline && (
              <button
                type="button"
                aria-label="Add intro animation"
                title="Auto-create staggered intro animation"
                onClick={onAddIntroTimeline}
                style={motionListActionButtonStyle(false)}
              >
                {icons.AutoIntro({ size: 13 })}
              </button>
            )}
            {activeMotionType === 'animation' && onAddTimeline && (
              <button
                type="button"
                aria-label="Add animation"
                title="Add animation"
                onClick={onAddTimeline}
                style={motionListActionButtonStyle(false)}
              >
                {icons.Add({ size: 13 })}
              </button>
            )}
            {activeMotionType === 'stateMachine' && onAddStateMachine && (
              <button
                type="button"
                aria-label="Add state machine"
                title="Add state machine"
                onClick={onAddStateMachine}
                style={motionListActionButtonStyle(false)}
              >
                {icons.Add({ size: 13 })}
              </button>
            )}
          </div>
          {activeMotionType === 'animation' && clips.map(clip => {
            const selected = selectedItem?.type === 'animation' && selectedItem.timelineId === clip.id;
            const hovered = hoveredMotionItem?.type === 'animation' && hoveredMotionItem.timelineId === clip.id;
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
              <div
                key={clip.id}
                role="button"
                tabIndex={0}
                aria-label={`Select animation ${clip.id}`}
                onClick={() => selectMotionItem({ type: 'animation', timelineId: clip.id })}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectMotionItem({ type: 'animation', timelineId: clip.id });
                  }
                }}
                onDoubleClick={() => {
                  selectMotionItem({ type: 'animation', timelineId: clip.id });
                  setRenamingMotionItem({ type: 'animation', timelineId: clip.id });
                }}
                onMouseEnter={() => setHoveredMotionItem({ type: 'animation', timelineId: clip.id })}
                onMouseLeave={() => setHoveredMotionItem(current => current?.type === 'animation' && current.timelineId === clip.id ? null : current)}
                onFocus={() => setHoveredMotionItem({ type: 'animation', timelineId: clip.id })}
                onBlur={() => setHoveredMotionItem(current => current?.type === 'animation' && current.timelineId === clip.id ? null : current)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: 6,
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
                <span style={{ minWidth: 0, display: 'grid', gap: 2 }}>
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clip.id}</strong>
                  <span style={{ color: v('--elucim-editor-text-muted'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clip.duration}f · {clip.tracks.length} track{clip.tracks.length === 1 ? '' : 's'}</span>
                </span>
                {onTimelineDelete && (
                  <button
                    type="button"
                    aria-label={`Remove animation ${clip.id}`}
                    title="Remove animation"
                    onClick={event => {
                      event.stopPropagation();
                      onTimelineDelete(clip.id);
                    }}
                    style={motionListActionButtonStyle(false, selected || hovered)}
                  >
                    {icons.Remove({ size: 12 })}
                  </button>
                )}
              </div>
            );
          })}
          {activeMotionType === 'stateMachine' && stateMachines.map(machine => {
            const selected = selectedItem?.type === 'stateMachine' && selectedItem.machineId === machine.id;
            const hovered = hoveredMotionItem?.type === 'stateMachine' && hoveredMotionItem.machineId === machine.id;
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
              <div
                key={machine.id}
                role="button"
                tabIndex={0}
                aria-label={`Select state machine ${machine.id}`}
                onClick={() => selectMotionItem({ type: 'stateMachine', machineId: machine.id })}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectMotionItem({ type: 'stateMachine', machineId: machine.id });
                  }
                }}
                onDoubleClick={() => {
                  selectMotionItem({ type: 'stateMachine', machineId: machine.id });
                  setRenamingMotionItem({ type: 'stateMachine', machineId: machine.id });
                }}
                onMouseEnter={() => setHoveredMotionItem({ type: 'stateMachine', machineId: machine.id })}
                onMouseLeave={() => setHoveredMotionItem(current => current?.type === 'stateMachine' && current.machineId === machine.id ? null : current)}
                onFocus={() => setHoveredMotionItem({ type: 'stateMachine', machineId: machine.id })}
                onBlur={() => setHoveredMotionItem(current => current?.type === 'stateMachine' && current.machineId === machine.id ? null : current)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: 6,
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
                <span style={{ minWidth: 0, display: 'grid', gap: 2 }}>
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{machine.id}</strong>
                  <span style={{ color: v('--elucim-editor-text-muted'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {Object.keys(machine.states).length} state{Object.keys(machine.states).length === 1 ? '' : 's'} · {(machine.transitions ?? []).length} transition{(machine.transitions ?? []).length === 1 ? '' : 's'}
                  </span>
                </span>
                {onStateMachineDelete && (
                  <button
                    type="button"
                    aria-label={`Remove state machine ${machine.id}`}
                    title="Remove state machine"
                    onClick={event => {
                      event.stopPropagation();
                      onStateMachineDelete(machine.id);
                    }}
                    style={motionListActionButtonStyle(false, selected || hovered)}
                  >
                    {icons.Remove({ size: 12 })}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ minHeight: 0, overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
          onMoveNode={(nodeId, position, viewport) => moveMachineGraphNode(selectedMachine, nodeId, position, viewport)}
          onApplyLayout={(entryPosition, statePositions) => applyMachineGraphLayout(selectedMachine, entryPosition, statePositions)}
          onMoveViewport={viewport => moveMachineViewport(selectedMachine, viewport)}
          onAddState={() => addMachineState(selectedMachine)}
          onDeleteState={stateId => deleteMachineState(selectedMachine, stateId)}
          onPreviewMachine={() => playStateMachine(selectedMachine)}
          onResetPreview={() => resetStateMachinePreview(selectedMachine)}
          onPreviewState={stateId => onPreviewState(selectedMachine.id, stateId)}
          onPreviewCanvasClickChange={onStateMachinePreviewClickChange}
          onPreviewCanvasKeyDownChange={onStateMachinePreviewKeyDownChange}
          previewStatus={stateMachinePreview?.machineId === selectedMachine.id ? {
            stateId: stateMachinePreview.stateId,
            timelineId: stateMachinePreview.timelineId,
            event: stateMachinePreview.event,
            previousStateId: stateMachinePreview.previousStateId,
            activeTransitionId: stateMachinePreview.activeTransitionId,
            exited: stateMachinePreview.exited,
            finished: stateMachinePreview.finished,
            playing: isPlaying,
            frame: currentFrame,
            duration: stateMachinePreview.timelineId ? timelines[stateMachinePreview.timelineId]?.duration : undefined,
            speed: playbackSpeed,
          } : null}
          onTriggerEvent={(stateId, eventName, key) => onPreviewEvent(selectedMachine.id, stateId, eventName, key)}
          onConnectStates={(sourceStateId, targetStateId) => addMachineTransition(selectedMachine, sourceStateId, targetStateId)}
        />
      ) : (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 16, color: v('--elucim-editor-text-muted'), fontSize: 11 }}>
          <div style={{ maxWidth: 360, display: 'grid', gap: 10, padding: 14, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 10, background: v('--elucim-editor-surface'), lineHeight: 1.4 }}>
            <div>
              <div style={{ color: v('--elucim-editor-fg'), fontSize: 13, fontWeight: 800 }}>Create a state machine</div>
              <div>State machines turn animation clips into interactive flows with Entry, states, transitions, and Exit.</div>
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              <span>1. Create a machine.</span>
              <span>2. Add states and assign animations.</span>
              <span>3. Drag connector handles to create transitions, then preview events.</span>
            </div>
            {onAddStateMachine && (
              <button
                type="button"
                aria-label="Create first state machine"
                onClick={onAddStateMachine}
                style={{ justifySelf: 'start', border: `1px solid ${v('--elucim-editor-accent')}`, borderRadius: 6, background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', padding: '5px 8px', fontWeight: 700 }}
              >
                Create state machine
              </button>
            )}
          </div>
        </div>
      ) : visibleClips.length === 0 ? (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: v('--elucim-editor-text-muted'), fontSize: 11 }}>
          Use the add button in the Animations header to create an animation.
        </div>
      ) : visibleClips.map(clip => (
        <div key={clip.id} style={{ height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              height: CLIP_HEADER_HEIGHT,
              display: 'grid',
              gridTemplateColumns: `${LABEL_WIDTH}px minmax(0, 1fr) ${TIMELINE_SCROLLBAR_GUTTER + TIMELINE_RIGHT_GAP}px`,
              alignItems: 'stretch',
              background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 8%, transparent)`,
              borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
              flexShrink: 0,
            }}
          >
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', padding: '0 8px', color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Tracks
            </div>
            <div style={{ minWidth: 0, display: 'grid', gridTemplateRows: '20px 1fr' }}>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', paddingRight: 8 }}>
                <div style={{ color: v('--elucim-editor-text-secondary'), fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {clip.id} - {clip.duration}f - {clip.tracks.length} track{clip.tracks.length === 1 ? '' : 's'}
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
            <div aria-hidden="true" />
          </div>
          <div
            data-elucim-animation-track-scroll
            style={{
              flex: 1,
              minHeight: 0,
              overflowX: 'hidden',
              overflowY: 'auto',
              scrollbarGutter: 'stable',
              paddingRight: TIMELINE_RIGHT_GAP,
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: LABEL_WIDTH,
              right: TIMELINE_RIGHT_GAP,
              top: 0,
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
                      style={{ width: 24, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', padding: 0 }}
                    >
                      {icons.Add({ size: 12 })}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${clip.id} ${track.target}.${track.property} track`}
                      title="Remove track"
                      onClick={() => deleteTrack(clip, trackIndex)}
                      style={{ width: 24, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 3, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', padding: 0 }}
                    >
                      {icons.Remove({ size: 12 })}
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
                      const previewPercent = keyframeDragPreview?.timelineId === clip.id
                        && keyframeDragPreview.trackIndex === trackIndex
                        && keyframeDragPreview.keyframeIndex === keyframeIndex
                        ? keyframeDragPreview.percent
                        : undefined;
                      const displayFrame = previewFrame ?? keyframe.frame;
                      const displayPercent = previewPercent ?? framePercent(keyframe.frame, clip.duration);
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
                        left: `${displayPercent}%`,
                        top: 9,
                        width: 12,
                        height: 12,
                        transform: 'translateX(-6px) rotate(45deg)',
                        border: `1px solid ${selected ? v('--elucim-editor-fg') : v('--elucim-editor-accent')}`,
                        background: selected ? v('--elucim-editor-accent') : v('--elucim-editor-input-bg'),
                        padding: 0,
                        cursor: keyframeDragPreview ? 'grabbing' : 'pointer',
                        touchAction: 'none',
                        willChange: keyframeDragPreview ? 'left' : undefined,
                        zIndex: 3,
                      }}
                    />
                    {selected && (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: `${displayPercent}%`,
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
          {onTimelineChange && (
            <div
              style={{
                height: TRACK_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
              }}
            >
              <div style={{ width: LABEL_WIDTH, flexShrink: 0, padding: '0 6px' }}>
                <button
                  type="button"
                  aria-label={`Add track to animation ${clip.id}`}
                  title="Add track"
                  onClick={() => addTrack(clip)}
                  style={{
                    width: '100%',
                    height: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    border: `1px dashed ${v('--elucim-editor-border')}`,
                    borderRadius: 4,
                    background: 'transparent',
                    color: v('--elucim-editor-text-secondary'),
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: 0,
                  }}
                >
                  {icons.Add({ size: 12 })}
                  <span>Track</span>
                </button>
              </div>
              <div style={{ flex: 1, height: '100%' }} />
            </div>
          )}
          </div>
        </div>
      ))}
          </div>
          {activeMotionType === 'animation' && (
            <div
              style={{
                minHeight: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderTop: `1px solid ${v('--elucim-editor-border-subtle')}`,
                background: `color-mix(in srgb, ${v('--elucim-editor-input-bg')} 42%, transparent)`,
              }}
            >
              {playbackControls}
            </div>
          )}
        </div>
        {selectedMachine && onStateMachineChange ? (
          <StateMachineMotionInspector
            machine={selectedMachine}
            state={selectedState}
            selectedStateId={selectedStateId}
            selectedTransitionEvent={selectedItem?.type === 'stateMachine' ? selectedItem.transitionEvent : undefined}
            timelines={timelines}
            onRenameMachine={renameMachine}
            onUpdateState={updateMachineState}
            onRenameState={renameMachineState}
            onUpdateTransition={updateMachineTransition}
            onRenameTransition={renameMachineTransition}
            onSetTransitionKind={setMachineTransitionKind}
            onDeleteTransition={deleteMachineTransition}
            onDeleteState={deleteMachineState}
            onSelectTransition={(stateId, transitionEvent) => selectMotionItem({ type: 'stateMachine', machineId: selectedMachine.id, stateId, transitionEvent })}
            onPreviewState={onPreviewState}
          />
        ) : onTimelineChange && (
          <TimelineInspector
            clip={selectedClip}
            track={selectedTrack}
            keyframe={selectedKeyframe}
            selectedItem={selectedItem?.type === 'animation' ? selectedItem : null}
            elementIds={elementIds}
            elementTypes={elementTypes}
            onRenameClip={renameClip}
            onUpdateDuration={updateDuration}
            onUpdateTrack={updateTrack}
            onUpdateKeyframe={updateKeyframe}
            onDeleteKeyframe={deleteKeyframe}
            onUpdateEffects={updateEffects}
          />
        )}
      </div>
    </div>
  );
}

function createStateMachineDagLayout(
  states: [string, ElucimStateMachine['states'][string]][],
  transitions: { from: string; to: string }[],
  entryStateId: string,
  direction: GraphLayoutDirection,
): Map<string, { x: number; y: number }> {
  const stateIds = states.map(([stateId]) => stateId);
  const stateSet = new Set(stateIds);
  const outgoing = new Map<string, string[]>();
  for (const transition of transitions) {
    if (!stateSet.has(transition.from) || !stateSet.has(transition.to)) continue;
    outgoing.set(transition.from, [...(outgoing.get(transition.from) ?? []), transition.to]);
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

  visit(entryStateId, 0, new Set());
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
  const majorGap = direction === 'horizontal' ? 210 : 112;
  const minorGap = direction === 'horizontal' ? 98 : 178;
  const offset = { x: direction === 'horizontal' ? 150 : 96, y: 84 };
  const maxColumnSize = Math.max(1, ...Array.from(columns.values()).map(ids => ids.length));
  Array.from(columns.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([rank, ids]) => {
      const columnInset = ((maxColumnSize - ids.length) * minorGap) / 2;
      ids.forEach((stateId, index) => {
        positionByState.set(stateId, direction === 'horizontal'
          ? { x: offset.x + rank * majorGap, y: offset.y + columnInset + index * minorGap }
          : { x: offset.x + columnInset + index * minorGap, y: offset.y + rank * majorGap });
      });
    });

  return positionByState;
}

function directionEntryPosition(entryTarget: { x: number; y: number }, direction: GraphLayoutDirection): { x: number; y: number } {
  return direction === 'horizontal'
    ? { x: Math.max(12, entryTarget.x - 116), y: entryTarget.y + 6 }
    : { x: entryTarget.x + 24, y: Math.max(12, entryTarget.y - 74) };
}

function exitNodePosition(statePositions: Map<string, { x: number; y: number }>, direction: GraphLayoutDirection): { x: number; y: number } {
  const positions = Array.from(statePositions.values());
  if (positions.length === 0) return direction === 'horizontal' ? { x: 360, y: 90 } : { x: 120, y: 300 };
  if (direction === 'horizontal') {
    const right = Math.max(...positions.map(position => position.x));
    const middle = positions.reduce((sum, position) => sum + position.y, 0) / positions.length;
    return { x: right + 220, y: middle + 6 };
  }
  const bottom = Math.max(...positions.map(position => position.y));
  const middle = positions.reduce((sum, position) => sum + position.x, 0) / positions.length;
  return { x: middle + 24, y: bottom + 150 };
}

function StateMachineGraphNode({ data }: NodeProps<Node<StateMachineGraphNodeData>>) {
  const icons = useEditorIcons();
  const direction = data.direction;
  const portPosition = (position: Position): React.CSSProperties => {
    switch (position) {
      case Position.Left:
        return { position: 'absolute', left: -5, top: '50%', transform: 'translate(-50%, -50%)' };
      case Position.Right:
        return { position: 'absolute', right: -5, top: '50%', transform: 'translate(50%, -50%)' };
      case Position.Top:
        return { position: 'absolute', left: '50%', top: -5, transform: 'translate(-50%, -50%)' };
      case Position.Bottom:
        return { position: 'absolute', left: '50%', bottom: -5, transform: 'translate(-50%, 50%)' };
      default:
        return {};
    }
  };
  const activePort = (axis: 'horizontal' | 'vertical', position: Position): React.CSSProperties => ({
    ...portPosition(position),
    width: 10,
    height: 10,
    border: `2px solid ${v('--elucim-editor-accent')}`,
    borderRadius: 999,
    boxSizing: 'border-box',
    background: v('--elucim-editor-input-bg'),
    opacity: direction === axis ? 1 : 0,
    pointerEvents: direction === axis ? 'auto' as const : 'none' as const,
  });
  const mutedPort = (axis: 'horizontal' | 'vertical', position: Position): React.CSSProperties => ({
    ...portPosition(position),
    width: 10,
    height: 10,
    border: `2px solid ${v('--elucim-editor-text-muted')}`,
    borderRadius: 999,
    boxSizing: 'border-box',
    background: v('--elucim-editor-input-bg'),
    opacity: direction === axis ? 1 : 0,
    pointerEvents: direction === axis ? 'auto' as const : 'none' as const,
  });
  if (data.kind === 'entry') {
    return (
      <div
        aria-label="State machine entry"
        style={{
          width: 64,
          height: 34,
          border: `1px solid ${v('--elucim-editor-accent')}`,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 16%, ${v('--elucim-editor-input-bg')})`,
          color: v('--elucim-editor-fg'),
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          userSelect: 'none',
          position: 'relative',
        }}
      >
        Entry
        <Handle id="source-right" type="source" position={Position.Right} style={activePort('horizontal', Position.Right)} />
        <Handle id="source-bottom" type="source" position={Position.Bottom} style={activePort('vertical', Position.Bottom)} />
      </div>
    );
  }
  if (data.kind === 'exit') {
    return (
      <div
        aria-label="State machine exit"
        style={{
          width: 64,
          height: 34,
          border: `1px solid ${v('--elucim-editor-text-muted')}`,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          background: v('--elucim-editor-input-bg'),
          color: v('--elucim-editor-text-secondary'),
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          userSelect: 'none',
          position: 'relative',
        }}
      >
        Exit
        <Handle id="target-left" type="target" position={Position.Left} style={mutedPort('horizontal', Position.Left)} />
        <Handle id="target-top" type="target" position={Position.Top} style={mutedPort('vertical', Position.Top)} />
      </div>
    );
  }
  return (
    <div
      className="elucim-state-node-card"
      aria-label={`Select graph state ${data.stateId}`}
      style={{
        width: 118,
        minHeight: 46,
        border: `1px solid ${data.selected ? v('--elucim-editor-accent') : v('--elucim-editor-border')}`,
        borderRadius: 8,
        padding: '7px 9px',
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
        style={activePort('horizontal', Position.Left)}
      />
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        style={{ ...activePort('horizontal', Position.Right), cursor: 'crosshair' }}
      />
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        style={activePort('vertical', Position.Top)}
      />
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        style={{ ...activePort('vertical', Position.Bottom), cursor: 'crosshair' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <div style={{ fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.stateId}</div>
        {data.selected && data.canDelete && data.onDelete && (
          <button
            type="button"
            aria-label={`Remove state ${data.stateId}`}
            title="Remove state"
            onPointerDown={event => event.stopPropagation()}
            onClick={event => {
              event.stopPropagation();
              data.onDelete?.();
            }}
            style={{
              width: 18,
              height: 18,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${v('--elucim-editor-border-subtle')}`,
              borderRadius: 5,
              background: 'transparent',
              color: v('--elucim-editor-text-secondary'),
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          >
            {icons.Remove({ size: 11 })}
          </button>
        )}
      </div>
      <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 9, marginTop: 3 }}>
        {data.timeline ? data.timeline : 'no animation'}
      </div>
    </div>
  );
}

function StateMachineGraphEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps<Edge<StateMachineGraphEdgeData>>) {
  const direction = data?.direction ?? 'horizontal';
  const span = direction === 'horizontal' ? Math.abs(targetX - sourceX) : Math.abs(targetY - sourceY);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: sourcePosition ?? (direction === 'horizontal' ? Position.Right : Position.Bottom),
    targetPosition: targetPosition ?? (direction === 'horizontal' ? Position.Left : Position.Top),
    offset: Math.max(4, Math.min(20, span / 2 - 1)),
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
        <button
          type="button"
          aria-label={data?.onSelect ? `Edit ${String(data.label)} transition from ${String(data.stateId)}` : undefined}
          disabled={!data?.onSelect}
          onClick={event => {
            event.stopPropagation();
            data?.onSelect?.();
          }}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: data?.onSelect ? 'auto' : 'none',
            border: selected ? `1px solid ${v('--elucim-editor-accent')}` : '1px solid transparent',
            borderRadius: 6,
            background: `color-mix(in srgb, ${v('--elucim-editor-input-bg')} 82%, transparent)`,
            color: selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1.15,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            textShadow: `0 0 3px ${v('--elucim-editor-input-bg')}, 0 0 6px ${v('--elucim-editor-input-bg')}`,
            cursor: data?.onSelect ? 'pointer' : undefined,
            padding: '2px 5px',
          }}
        >
          <div>{String(data?.label ?? '')}</div>
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

function LayoutDirectionIcon({ direction }: { direction: GraphLayoutDirection }) {
  const horizontal = direction === 'horizontal';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <line
        x1={horizontal ? 3 : 7}
        y1={horizontal ? 7 : 3}
        x2={horizontal ? 11 : 7}
        y2={horizontal ? 7 : 11}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx={horizontal ? 3 : 7} cy={horizontal ? 7 : 3} r="2" fill="currentColor" />
      <circle cx={horizontal ? 11 : 7} cy={horizontal ? 7 : 11} r="2" fill="currentColor" />
    </svg>
  );
}

function stateMachineNodesEqual(
  left: Node<StateMachineGraphNodeData>[],
  right: Node<StateMachineGraphNodeData>[]
) {
  if (left.length !== right.length) return false;
  return left.every((leftNode, index) => {
    const rightNode = right[index];
    if (!rightNode || leftNode.id !== rightNode.id || leftNode.type !== rightNode.type) return false;
    if (leftNode.position.x !== rightNode.position.x || leftNode.position.y !== rightNode.position.y) return false;
    if (leftNode.selected !== rightNode.selected || leftNode.draggable !== rightNode.draggable || leftNode.selectable !== rightNode.selectable) return false;
    return (
      leftNode.data.kind === rightNode.data.kind &&
      leftNode.data.stateId === rightNode.data.stateId &&
      leftNode.data.timeline === rightNode.data.timeline &&
      leftNode.data.selected === rightNode.data.selected &&
      leftNode.data.direction === rightNode.data.direction &&
      leftNode.data.canDelete === rightNode.data.canDelete
    );
  });
}

function stateMachineEdgesEqual(
  left: Edge<StateMachineGraphEdgeData>[],
  right: Edge<StateMachineGraphEdgeData>[]
) {
  if (left.length !== right.length) return false;
  return left.every((leftEdge, index) => {
    const rightEdge = right[index];
    if (!rightEdge || leftEdge.id !== rightEdge.id || leftEdge.source !== rightEdge.source || leftEdge.target !== rightEdge.target || leftEdge.type !== rightEdge.type) return false;
    if (leftEdge.sourceHandle !== rightEdge.sourceHandle || leftEdge.targetHandle !== rightEdge.targetHandle || leftEdge.selected !== rightEdge.selected) return false;
    return (
      leftEdge.data?.label === rightEdge.data?.label &&
      leftEdge.data?.selected === rightEdge.data?.selected &&
      leftEdge.data?.backEdge === rightEdge.data?.backEdge &&
      leftEdge.data?.direction === rightEdge.data?.direction &&
      leftEdge.data?.stateId === rightEdge.data?.stateId &&
      leftEdge.data?.eventName === rightEdge.data?.eventName
    );
  });
}

function StateMachineTimelineGraph({
  machine,
  selectedStateId,
  selectedTransitionEvent,
  onSelectState,
  onSelectTransition,
  onSelectMachine,
  onMoveNode,
  onApplyLayout,
  onMoveViewport,
  onAddState,
  onDeleteState,
  onPreviewMachine,
  onResetPreview,
  onPreviewState,
  onPreviewCanvasClickChange,
  onPreviewCanvasKeyDownChange,
  previewStatus,
  onTriggerEvent,
  onConnectStates,
}: {
  machine: ElucimStateMachine;
  selectedStateId?: string;
  selectedTransitionEvent?: string;
  onSelectState: (stateId: string) => void;
  onSelectTransition: (stateId: string, transitionEvent: string) => void;
  onSelectMachine: () => void;
  onMoveNode: (nodeId: string, position: { x: number; y: number }, viewport?: ReactFlowViewport) => void;
  onApplyLayout: (entryPosition: { x: number; y: number }, statePositions: Map<string, { x: number; y: number }>) => void;
  onMoveViewport: (viewport: ReactFlowViewport) => void;
  onAddState: () => void;
  onDeleteState: (stateId: string) => void;
  onPreviewMachine: () => void;
  onResetPreview: () => void;
  onPreviewState: (stateId: string) => void;
  onPreviewCanvasClickChange?: (handler: (() => boolean) | undefined) => void;
  onPreviewCanvasKeyDownChange?: (handler: ((key: string) => boolean) | undefined) => void;
  previewStatus: { stateId: string; timelineId?: string; event?: string; previousStateId?: string; activeTransitionId?: string; playing: boolean; frame: number; duration?: number; speed: number; exited?: boolean; finished?: boolean } | null;
  onTriggerEvent: (stateId: string, eventName: string, key?: string) => boolean;
  onConnectStates: (sourceStateId: string, targetStateId: string) => string | undefined;
}) {
  const icons = useEditorIcons();
  const states = useMemo(() => Object.entries(machine.states), [machine.states]);
  const transitions = useMemo(() => machine.transitions ?? [], [machine.transitions]);
  const graphTransitions = useMemo(() => transitions.filter(transition => transition.from !== 'any' && transition.from !== 'entry'), [transitions]);
  const exitTransitions = useMemo(() => graphTransitions.filter(transition => transition.to === 'exit'), [graphTransitions]);
  const [layoutDirection, setLayoutDirection] = useState<GraphLayoutDirection>('horizontal');
  const flowInstanceRef = useRef<ReactFlowInstance<Node<StateMachineGraphNodeData>, Edge<StateMachineGraphEdgeData>> | null>(null);
  const isDraggingNodeRef = useRef(false);
  const skipNextMoveEndRef = useRef(false);
  const didInitialFitRef = useRef(false);
  const onSelectTransitionRef = useRef(onSelectTransition);
  useEffect(() => {
    onSelectTransitionRef.current = onSelectTransition;
  }, [onSelectTransition]);
  const hasSavedNodePositions = Boolean(machine.layout?.entry) || Object.keys(machine.layout?.states ?? {}).length > 0;
  const hasSavedViewport = Boolean(machine.layout?.viewport);
  const nodeTypes = useMemo(() => ({ stateMachineState: StateMachineGraphNode }), []);
  const edgeTypes = useMemo(() => ({ stateTransition: StateMachineGraphEdge }), []);
  const dagPositions = useMemo(() => createStateMachineDagLayout(states, graphTransitions.filter(transition => transition.to !== 'exit').map(transition => ({ from: transition.from, to: transition.to })), machine.entry, layoutDirection), [layoutDirection, machine.entry, graphTransitions, states]);
  const statePositions = useMemo(() => {
    const positions = new Map(dagPositions);
    for (const [stateId, position] of Object.entries(machine.layout?.states ?? {})) {
      positions.set(stateId, position);
    }
    return positions;
  }, [dagPositions, machine.layout?.states]);
  const graphPositions = useMemo(() => {
    const entryPosition = machine.layout?.entry ?? directionEntryPosition(statePositions.get(machine.entry) ?? { x: 150, y: 84 }, layoutDirection);
    return new Map<string, { x: number; y: number }>([[ENTRY_NODE_ID, entryPosition], ...statePositions]);
  }, [layoutDirection, machine.entry, machine.layout?.entry, statePositions]);
  const eventSourceStateId = previewStatus?.exited || previewStatus?.finished ? undefined : previewStatus?.stateId;
  const eventSourceState = eventSourceStateId ? machine.states[eventSourceStateId] : undefined;
  const exposedTransitions = eventSourceStateId === 'entry'
    ? getEntryTriggerTransitions(machine)
    : eventSourceState && eventSourceStateId ? getStateTriggerTransitions(machine, eventSourceStateId) : [];
  const previewClickTransition = exposedTransitions.find(transition => transition.trigger === 'onClick');
  const exposedEvents = exposedTransitions.map(transition => previewEventLabel(transition));
  const onCompleteTarget = eventSourceState && eventSourceStateId ? getStateCompleteTransition(machine, eventSourceStateId)?.to : undefined;
  const statusText = previewStatus
    ? previewStatus.exited
      ? `Exited ${machine.id} via ${previewStatus.event ?? 'transition'} from ${previewStatus.previousStateId ?? previewStatus.stateId}`
      : previewStatus.finished
      ? `Finished ${previewStatus.stateId}; restart preview to run from Entry`
      : previewStatus.stateId === 'entry'
      ? `Waiting at Entry for ${exposedEvents.join(' or ') || 'a start event'}`
      : `${previewStatus.playing ? 'Previewing' : 'Preview'} ${previewStatus.stateId}${previewStatus.previousStateId ? ` via ${previewStatus.event} from ${previewStatus.previousStateId}` : ''}${previewStatus.timelineId ? ` (${previewStatus.timelineId}) ${Math.round(previewStatus.frame)}/${previewStatus.duration ?? 0}` : ' has no animation'}`
    : '';
  const [localPositions, setLocalPositions] = useState(() => new Map(graphPositions));
  const previousMachineIdRef = useRef(machine.id);
  useEffect(() => {
    if (previousMachineIdRef.current !== machine.id) {
      previousMachineIdRef.current = machine.id;
      didInitialFitRef.current = false;
      setLocalPositions(new Map(graphPositions));
      return;
    }
    setLocalPositions(currentPositions => {
      const nextPositions = new Map(currentPositions);
      let changed = false;
      for (const [nodeId, position] of graphPositions) {
        if (!nextPositions.has(nodeId)) {
          nextPositions.set(nodeId, position);
          changed = true;
        }
      }
      for (const nodeId of nextPositions.keys()) {
        if (!graphPositions.has(nodeId)) {
          nextPositions.delete(nodeId);
          changed = true;
        }
      }
      return changed ? nextPositions : currentPositions;
    });
  }, [graphPositions, machine.id]);
  const fitGraph = useCallback(() => {
    if (isDraggingNodeRef.current) return;
    flowInstanceRef.current?.fitView({ padding: 0.28, includeHiddenNodes: false, duration: 0, maxZoom: 1 });
  }, []);
  const applyDagLayout = (direction: GraphLayoutDirection) => {
    setLayoutDirection(direction);
    const nextPositions = createStateMachineDagLayout(states, graphTransitions.map(transition => ({ from: transition.from, to: transition.to })), machine.entry, direction);
    const nextEntryPosition = directionEntryPosition(nextPositions.get(machine.entry) ?? { x: 150, y: 84 }, direction);
    setLocalPositions(new Map([[ENTRY_NODE_ID, nextEntryPosition], ...nextPositions]));
    onApplyLayout(nextEntryPosition, nextPositions);
  };
  const nodes: Node<StateMachineGraphNodeData>[] = useMemo(() => {
    const entryPosition = localPositions.get(ENTRY_NODE_ID) ?? graphPositions.get(ENTRY_NODE_ID) ?? directionEntryPosition(localPositions.get(machine.entry) ?? statePositions.get(machine.entry) ?? { x: 150, y: 84 }, layoutDirection);
    const entryNode: Node<StateMachineGraphNodeData> = {
      id: ENTRY_NODE_ID,
      position: entryPosition,
      type: 'stateMachineState',
      data: { kind: 'entry', stateId: 'entry', selected: previewStatus?.stateId === 'entry', direction: layoutDirection },
      draggable: true,
      selectable: false,
      style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, cursor: 'grab' },
    };
    const stateNodes = states.map(([stateId, state]) => {
    const selected = (selectedStateId === stateId && !selectedTransitionEvent) || previewStatus?.stateId === stateId;
    return {
      id: stateId,
      position: localPositions.get(stateId) ?? statePositions.get(stateId) ?? { x: 36, y: 42 },
      type: 'stateMachineState',
      data: {
        kind: 'state' as const,
        stateId,
        timeline: state.timeline,
        selected,
        direction: layoutDirection,
        canDelete: selectedStateId === stateId && states.length > 1,
        onDelete: () => onDeleteState(stateId),
      },
      selected,
      draggable: true,
      style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, cursor: 'grab' },
    };
    });
    const exitNode: Node<StateMachineGraphNodeData> | null = exitTransitions.length > 0
      ? {
          id: EXIT_NODE_ID,
          position: exitNodePosition(statePositions, layoutDirection),
          type: 'stateMachineState',
          data: { kind: 'exit', stateId: 'exit', selected: false, direction: layoutDirection },
          draggable: false,
          selectable: false,
          style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
        }
      : null;
    return exitNode ? [entryNode, ...stateNodes, exitNode] : [entryNode, ...stateNodes];
  }, [exitTransitions.length, graphPositions, layoutDirection, localPositions, machine.entry, onDeleteState, previewStatus?.stateId, selectedStateId, selectedTransitionEvent, statePositions, states]);
  const [flowNodes, setFlowNodes] = useState(nodes);
  useEffect(() => {
    setFlowNodes(currentNodes => {
      const nextNodes = nodes.map(node => {
        const existing = currentNodes.find(currentNode => currentNode.id === node.id);
        return existing && isDraggingNodeRef.current ? { ...existing, ...node, position: existing.position } : node;
      });
      return stateMachineNodesEqual(currentNodes, nextNodes) ? currentNodes : nextNodes;
    });
  }, [nodes]);
  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    setFlowNodes(currentNodes => applyNodeChanges(changes, currentNodes) as Node<StateMachineGraphNodeData>[]);
  }, []);
  const entryTransition = getEntryTransition(machine);
  const activeTransitionId = previewStatus?.activeTransitionId;
  const edges: Edge<StateMachineGraphEdgeData>[] = useMemo(() => {
    const entryEdgeActive = activeTransitionId === entryTransition?.id;
    const entryEdge: Edge<StateMachineGraphEdgeData> = {
      id: `${ENTRY_NODE_ID}:${machine.entry}`,
      source: ENTRY_NODE_ID,
      target: entryTransition?.to && entryTransition.to !== 'exit' ? entryTransition.to : machine.entry,
      sourceHandle: layoutDirection === 'horizontal' ? 'source-right' : 'source-bottom',
      targetHandle: layoutDirection === 'horizontal' ? 'target-left' : 'target-top',
      type: 'stateTransition',
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: v('--elucim-editor-accent') },
      data: { label: entryTransition ? transitionTriggerLabel(entryTransition) : 'onStart', selected: entryEdgeActive, backEdge: false, direction: layoutDirection, stateId: 'entry', eventName: entryTransition?.id ?? 'entry', onSelect: entryTransition ? () => onSelectTransitionRef.current('entry', entryTransition.id) : undefined },
    };
    return [entryEdge, ...graphTransitions.map(transition => {
      const selected = selectedTransitionEvent === transition.id || activeTransitionId === transition.id;
      const sourceRankPosition = dagPositions.get(transition.from) ?? { x: 0, y: 0 };
      const targetRankPosition = transition.to === 'exit'
        ? exitNodePosition(statePositions, layoutDirection)
        : transition.to === 'entry'
          ? graphPositions.get(ENTRY_NODE_ID) ?? { x: 0, y: 0 }
          : dagPositions.get(transition.to) ?? { x: 0, y: 0 };
      const forward = layoutDirection === 'horizontal'
        ? targetRankPosition.x >= sourceRankPosition.x
        : targetRankPosition.y >= sourceRankPosition.y;
      const label = transitionTriggerLabel(transition);
      return {
        id: transition.id,
        source: transition.from,
        target: transition.to === 'exit' ? EXIT_NODE_ID : transition.to === 'entry' ? ENTRY_NODE_ID : transition.to,
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
          selected,
          backEdge: !forward,
          direction: layoutDirection,
          stateId: transition.from,
          eventName: transition.id,
          onSelect: () => onSelectTransitionRef.current(transition.from, transition.id),
        },
      };
    })];
  }, [activeTransitionId, dagPositions, entryTransition, graphPositions, graphTransitions, layoutDirection, machine.entry, selectedTransitionEvent, statePositions]);
  const [flowEdges, setFlowEdges] = useState(edges);
  useEffect(() => {
    setFlowEdges(currentEdges => stateMachineEdgesEqual(currentEdges, edges) ? currentEdges : edges);
  }, [edges]);
  const triggerPreviewClickEvent = useCallback(() => {
    if (!eventSourceStateId) return false;
    if (!previewClickTransition) return false;
    return onTriggerEvent(eventSourceStateId, 'onClick');
  }, [eventSourceStateId, onTriggerEvent, previewClickTransition]);
  const triggerPreviewKeyEvent = useCallback((key: string) => {
    if (!eventSourceStateId) return false;
    const keyName = displayKeyName(key);
    if (!keyName) return false;
    const keyTransition = exposedTransitions.find(transition => transition.trigger === 'onKey' && transition.key && transition.key.toLowerCase() === keyName.toLowerCase());
    if (!keyTransition) return false;
    return onTriggerEvent(eventSourceStateId, 'onKey', keyTransition.key);
  }, [eventSourceStateId, exposedTransitions, onTriggerEvent]);
  const previewCanvasHandlersRef = useRef({ click: triggerPreviewClickEvent, key: triggerPreviewKeyEvent });
  useEffect(() => {
    previewCanvasHandlersRef.current = { click: triggerPreviewClickEvent, key: triggerPreviewKeyEvent };
  }, [triggerPreviewClickEvent, triggerPreviewKeyEvent]);
  const previewCanvasClickHandler = useCallback(() => previewCanvasHandlersRef.current.click(), []);
  const previewCanvasKeyDownHandler = useCallback((key: string) => previewCanvasHandlersRef.current.key(key), []);
  const previewActive = Boolean(previewStatus);
  useEffect(() => {
    if (!previewActive) {
      onPreviewCanvasClickChange?.(undefined);
      onPreviewCanvasKeyDownChange?.(undefined);
      return;
    }
    onPreviewCanvasClickChange?.(previewCanvasClickHandler);
    onPreviewCanvasKeyDownChange?.(previewCanvasKeyDownHandler);
    return () => {
      onPreviewCanvasClickChange?.(undefined);
      onPreviewCanvasKeyDownChange?.(undefined);
    };
  }, [onPreviewCanvasClickChange, onPreviewCanvasKeyDownChange, previewActive, previewCanvasClickHandler, previewCanvasKeyDownHandler]);
  const handleNodeClick: NodeMouseHandler = (_, node) => {
    if (triggerPreviewClickEvent()) return;
    if (node.id === ENTRY_NODE_ID || node.id === EXIT_NODE_ID) {
      onSelectMachine();
      return;
    }
    onSelectState(node.id);
  };
  const handleNodeDragStart: OnNodeDrag = () => {
    isDraggingNodeRef.current = true;
    skipNextMoveEndRef.current = true;
  };
  const handleNodeDrag: OnNodeDrag = (_, node) => {
    setLocalPositions(currentPositions => new Map(currentPositions).set(node.id, node.position));
  };
  const handleNodeDragStop: OnNodeDrag = (_, node) => {
    isDraggingNodeRef.current = false;
    skipNextMoveEndRef.current = true;
    const position = { x: Math.round(node.position.x), y: Math.round(node.position.y) };
    setLocalPositions(currentPositions => new Map(currentPositions).set(node.id, position));
    onMoveNode(node.id, position, flowInstanceRef.current?.getViewport());
  };
  const handleMoveEnd = useCallback((_event: MouseEvent | TouchEvent | null, viewport: ReactFlowViewport) => {
    if (skipNextMoveEndRef.current) {
      skipNextMoveEndRef.current = false;
      return;
    }
    onMoveViewport(viewport);
  }, [onMoveViewport]);
  const handleConnect: OnConnect = (connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.target === ENTRY_NODE_ID) return;
    const eventName = onConnectStates(connection.source, connection.target === EXIT_NODE_ID ? 'exit' : connection.target);
    if (eventName) onSelectTransition(connection.source, eventName);
  };
  const handlePaneClick = () => {
    if (!triggerPreviewClickEvent()) onSelectMachine();
  };
  const handlePreviewKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (triggerPreviewKeyEvent(event.key)) event.preventDefault();
  };
  return (
    <section
      aria-label={`State machine graph ${machine.id}`}
      tabIndex={0}
      onKeyDown={handlePreviewKeyDown}
      style={{ height: '100%', minHeight: 180, display: 'grid', gridTemplateRows: 'minmax(0, 1fr)', position: 'relative', background: v('--elucim-editor-input-bg'), outline: 'none' }}
    >
      <div
        aria-label={`State machine graph canvas ${machine.id}`}
        style={{
          height: '100%',
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
          background: v('--elucim-editor-input-bg'),
        }}
      >
        <div
          aria-label={`State machine canvas controls for ${machine.id}`}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'inline-flex',
            gap: 4,
            zIndex: 5,
          }}
        >
          <button
            type="button"
            aria-label={`Preview state machine ${machine.id}`}
            title="Preview"
            onClick={onPreviewMachine}
            style={canvasOverlayButtonStyle(false)}
          >
            {icons.Play({ size: 13 })}
          </button>
          <button
            type="button"
            aria-label={`Restart state machine preview ${machine.id}`}
            title="Restart preview"
            onClick={onResetPreview}
            disabled={!previewStatus}
            style={canvasOverlayButtonStyle(false, !previewStatus)}
          >
            {icons.SkipStart({ size: 13 })}
          </button>
          <button
            type="button"
            aria-label={`Add state to ${machine.id}`}
            title="Add state"
            onClick={onAddState}
            style={canvasOverlayButtonStyle(false)}
          >
            {icons.Add({ size: 13 })}
          </button>
        </div>
        <div
          aria-label={`State machine layout controls for ${machine.id}`}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'inline-flex',
            gap: 4,
            zIndex: 5,
          }}
        >
          <button
            type="button"
            aria-label="Use horizontal state machine layout"
            aria-pressed={layoutDirection === 'horizontal'}
            title="Horizontal layout"
            onClick={() => applyDagLayout('horizontal')}
            style={canvasOverlayButtonStyle(layoutDirection === 'horizontal')}
          >
            <LayoutDirectionIcon direction="horizontal" />
          </button>
          <button
            type="button"
            aria-label="Use vertical state machine layout"
            aria-pressed={layoutDirection === 'vertical'}
            title="Vertical layout"
            onClick={() => applyDagLayout('vertical')}
            style={canvasOverlayButtonStyle(layoutDirection === 'vertical')}
          >
            <LayoutDirectionIcon direction="vertical" />
          </button>
        </div>
        <ReactFlow
          key={machine.id}
          nodes={flowNodes}
          onNodesChange={handleNodesChange}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={instance => {
            flowInstanceRef.current = instance;
            if (!didInitialFitRef.current && !hasSavedNodePositions && !hasSavedViewport) {
              didInitialFitRef.current = true;
              fitGraph();
            }
          }}
          onNodeClick={handleNodeClick}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onMoveEnd={handleMoveEnd}
          onPaneClick={handlePaneClick}
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
          defaultViewport={machine.layout?.viewport}
          proOptions={{ hideAttribution: true }}
          style={{
            background: v('--elucim-editor-input-bg'),
            color: v('--elucim-editor-fg'),
          }}
        />
      </div>
      {previewStatus && (
        <div
          aria-live="polite"
          style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            zIndex: 5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            maxWidth: 'calc(100% - 16px)',
            padding: '4px 6px',
            border: `1px solid ${v('--elucim-editor-border-subtle')}`,
            borderRadius: 8,
            background: `color-mix(in srgb, ${v('--elucim-editor-input-bg')} 88%, transparent)`,
            color: v('--elucim-editor-text-muted'),
            fontSize: 11,
            fontWeight: 700,
            overflow: 'hidden',
          }}
        >
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusText}</span>
          {exposedTransitions.map(transition => (
            <button
              key={transition.id}
              type="button"
              aria-label={`Trigger ${transition.trigger} event from ${eventSourceStateId}`}
              disabled={!eventSourceStateId}
              onClick={() => eventSourceStateId && onTriggerEvent(eventSourceStateId, transition.trigger!, transition.key)}
              style={chromeTabButtonStyle(false)}
            >
              {previewEventLabel(transition)}
            </button>
          ))}
          {onCompleteTarget && (
            <span style={{ color: v('--elucim-editor-text-muted'), whiteSpace: 'nowrap' }}>
              Next auto-runs {'->'} {onCompleteTarget}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function StateMachineMotionInspector({
  machine,
  state,
  selectedStateId,
  selectedTransitionEvent,
  timelines,
  onRenameMachine,
  onUpdateState,
  onRenameState,
  onUpdateTransition,
  onRenameTransition,
  onSetTransitionKind,
  onDeleteTransition,
  onDeleteState,
  onSelectTransition,
  onPreviewState,
}: {
  machine: ElucimStateMachine;
  state?: ElucimStateMachine['states'][string];
  selectedStateId?: string;
  selectedTransitionEvent?: string;
  timelines: Record<string, ElucimTimeline>;
  onRenameMachine: (machine: ElucimStateMachine, nextId: string) => void;
  onUpdateState: (machine: ElucimStateMachine, stateId: string, patch: Partial<ElucimStateMachine['states'][string]>) => void;
  onRenameState: (machine: ElucimStateMachine, stateId: string, nextId: string) => void;
  onUpdateTransition: (machine: ElucimStateMachine, transitionId: string, patch: Partial<ElucimTransition>) => void;
  onRenameTransition: (machine: ElucimStateMachine, transitionId: string, nextTrigger: string) => void;
  onSetTransitionKind: (machine: ElucimStateMachine, transitionId: string, kind: 'event' | 'next') => void;
  onDeleteTransition: (machine: ElucimStateMachine, transitionId: string) => void;
  onDeleteState: (machine: ElucimStateMachine, stateId: string) => void;
  onSelectTransition: (stateId: string, transitionEvent: string) => void;
  onPreviewState: (machineId: string, stateId: string) => void;
}) {
  const stateIds = Object.keys(machine.states);
  const timelineIds = Object.keys(timelines);
  const selectedTransition = selectedTransitionEvent ? machine.transitions?.find(transition => transition.id === selectedTransitionEvent) : undefined;
  if (selectedTransition) {
    const trigger = selectedTransition.trigger ?? 'next';
    const transitionKind = selectedTransition.exitTime !== undefined ? 'next' : 'event';
    const eventPreset = trigger && EVENT_PRESET_SET.has(trigger) ? trigger : 'custom';
    const eventPresets = selectedTransition.from === 'entry' ? ENTRY_EVENT_PRESETS : EVENT_PRESETS;
    return (
      <aside style={motionInspectorPanelStyle}>
          <div>
            <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Transition</div>
            <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{transitionTriggerLabel(selectedTransition)}</div>
          <div style={{ color: v('--elucim-editor-text-secondary'), fontSize: 10 }}>
            {selectedTransition.from === 'entry'
              ? `"${trigger}" controls how the machine leaves Entry; onStart fires automatically when preview/run starts.`
              : transitionKind === 'next'
                ? 'Next transitions run automatically when the source animation finishes.'
                : `Event "${trigger}" becomes a preview button while "${selectedTransition.from}" is active.`}
          </div>
        </div>
        <div style={{ display: 'grid', gap: 4, padding: 6, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 8, background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 8%, ${v('--elucim-editor-input-bg')})`, color: v('--elucim-editor-text-secondary'), fontSize: 10, lineHeight: 1.35 }}>
          <strong style={{ color: v('--elucim-editor-fg'), fontSize: 11 }}>Transition editing</strong>
          <span>Choose Event for user-driven moves or Next for automatic flow after the source animation. onKey captures Space as a key; Tab still moves focus.</span>
        </div>
        <div style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
          Source
          <div aria-label={`Transition ${selectedTransition.id} source`} style={{ ...inspectorInputStyle, display: 'flex', alignItems: 'center' }}>
            {selectedTransition.from}
          </div>
        </div>
        {selectedTransition.from !== 'entry' && (
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Transition type
            <select
              aria-label={`Transition ${selectedTransition.id} type`}
              value={transitionKind}
              onChange={event => onSetTransitionKind(machine, selectedTransition.id, event.target.value as 'event' | 'next')}
              style={inspectorInputStyle}
            >
              <option value="next">Next after animation</option>
              <option value="event">Event trigger</option>
            </select>
          </label>
        )}
        {transitionKind === 'event' && (
          <>
            <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
              {selectedTransition.from === 'entry' ? 'Start event' : 'Event'}
              <select
                aria-label={`Transition ${selectedTransition.id} event preset`}
                value={eventPreset}
                onChange={event => {
                  const nextPreset = event.target.value;
                  onRenameTransition(machine, selectedTransition.id, nextPreset === 'custom' ? 'customEvent' : nextPreset);
                }}
                style={inspectorInputStyle}
              >
                {eventPresets.map(preset => <option key={preset} value={preset}>{preset}</option>)}
                <option value="custom">custom</option>
              </select>
            </label>
            {eventPreset === 'custom' && (
              <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                Custom event name
                <input
                  key={`${selectedTransition.id}-${trigger}`}
                  aria-label={`Rename transition trigger ${trigger}`}
                  defaultValue={trigger}
                  onBlur={event => onRenameTransition(machine, selectedTransition.id, event.currentTarget.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                  style={inspectorInputStyle}
                />
              </label>
            )}
            {trigger === 'onKey' && (
              <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                Key
                <input
                  key={`${selectedTransition.id}-${selectedTransition.key ?? ''}`}
                  aria-label={`Transition ${selectedTransition.id} key`}
                  defaultValue={selectedTransition.key ?? ''}
                  placeholder="Press a key"
                  title="Press a key to capture it. Tab moves focus."
                  onBlur={event => onUpdateTransition(machine, selectedTransition.id, { key: event.currentTarget.value.trim() || undefined })}
                  onKeyDown={event => {
                    const keyName = displayKeyName(event.key);
                    if (!keyName) return;
                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.value = keyName;
                    onUpdateTransition(machine, selectedTransition.id, { key: keyName });
                  }}
                  style={inspectorInputStyle}
                />
                <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10 }}>
                  Press the key to capture it, like G, Space, Enter, Escape, or ArrowLeft. Tab moves focus.
                </div>
              </label>
            )}
          </>
        )}
        <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
          Target state
          <select
            aria-label={`Transition ${selectedTransitionEvent} target state`}
            value={selectedTransition.to}
            onChange={event => onUpdateTransition(machine, selectedTransition.id, { to: event.target.value })}
            style={inspectorInputStyle}
          >
            {selectedTransition.from !== 'entry' && <option value="exit">Exit machine</option>}
            {stateIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        {selectedTransition.from !== 'entry' && (
          <button
            type="button"
            aria-label={`Remove transition ${transitionTriggerLabel(selectedTransition)}`}
            onClick={() => onDeleteTransition(machine, selectedTransition.id)}
            style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', padding: '4px 6px', textAlign: 'left' }}
          >
            Remove transition
          </button>
        )}
      </aside>
    );
  }

  if (selectedStateId && state) {
    const selectedStateTransitions = (machine.transitions ?? []).filter(transition => transition.from === selectedStateId || transition.from === 'any');
    return (
      <aside style={motionInspectorPanelStyle}>
        <div>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Selected state</div>
          <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{selectedStateId}</div>
          <div style={{ color: v('--elucim-editor-text-secondary'), fontSize: 10 }}>
            States play one animation clip and expose outgoing transitions.
          </div>
        </div>
        <button
          type="button"
          aria-label={`Preview state ${selectedStateId}`}
          onClick={() => onPreviewState(machine.id, selectedStateId)}
          style={{ border: `1px solid ${v('--elucim-editor-accent')}`, borderRadius: 6, background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', padding: '5px 6px', textAlign: 'left' }}
        >
          Preview this state
        </button>
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
        {selectedStateTransitions.length > 0 && (
          <div style={{ display: 'grid', gap: 4, color: v('--elucim-editor-text-secondary') }}>
            Transitions
            {selectedStateTransitions.map(transition => (
              <button
                key={transition.id}
                type="button"
                aria-label={`Edit ${transitionTriggerLabel(transition)} transition from ${transition.from}`}
                onClick={() => onSelectTransition(transition.from, transition.id)}
                style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', padding: '4px 6px', textAlign: 'left' }}
              >
                {transitionTriggerLabel(transition)}
              </button>
            ))}
          </div>
        )}
        {stateIds.length > 1 && (
          <button
            type="button"
            aria-label={`Remove selected state ${selectedStateId}`}
            onClick={() => onDeleteState(machine, selectedStateId)}
            style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', padding: '4px 6px', textAlign: 'left' }}
          >
            Remove state
          </button>
        )}
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
    </aside>
  );
}

function framePercent(frame: number, durationInFrames: number): number {
  return durationInFrames > 0 ? (Math.max(0, Math.min(frame, durationInFrames)) / durationInFrames) * 100 : 0;
}
