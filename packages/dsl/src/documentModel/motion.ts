import type {
  ElucimAnimatableProperty,
  ElucimDocument,
  ElucimElement,
  ElucimKeyframe,
  ElucimStateMachine,
  ElucimTimeline,
  ElucimTimelineTrack,
} from './types';
import { applyTimelineFrame } from './timeline';

export type ElucimSemanticMotionPreset =
  | 'revealFlow'
  | 'emphasizeDecision'
  | 'tracePath'
  | 'loopOnce'
  | 'handoff'
  | 'drainQueue'
  | 'compareBeforeAfter';

export type ElucimMotionBeatRole =
  | 'intro'
  | 'context'
  | 'decision'
  | 'tool-call'
  | 'feedback'
  | 'takeaway'
  | 'custom';

export interface ElucimMotionBeat {
  id: string;
  role?: ElucimMotionBeatRole;
  title?: string;
  start: number;
  duration: number;
  targets?: string[];
  description?: string;
}

export interface ElucimMotionBeatPlanSpec {
  totalFrames?: number;
  seconds?: number;
  fps?: number;
  beats?: Array<{
    id: string;
    role?: ElucimMotionBeatRole;
    title?: string;
    duration?: number;
    weight?: number;
    targets?: string[];
    description?: string;
  }>;
  beatCount?: number;
}

interface MotionBeatInput {
  id: string;
  role?: ElucimMotionBeatRole;
  title?: string;
  duration?: number;
  weight?: number;
  targets?: string[];
  description?: string;
}

export interface ElucimSemanticMotionPresetSpec {
  id: string;
  preset: ElucimSemanticMotionPreset;
  targets?: string[];
  from?: string;
  to?: string;
  connectorId?: string;
  group?: string;
  duration?: number;
  stagger?: number;
  beats?: ElucimMotionBeat[];
  reducedMotion?: boolean;
}

export interface ElucimAutoStaggerMotionSpec {
  id: string;
  targets?: string[];
  group?: string;
  duration?: number;
  stagger?: number;
  orderBy?: 'document' | 'rank' | 'group';
  preset?: 'fadeIn' | 'fadeOut' | 'pulse';
}

export interface ElucimStateSnapshot {
  id: string;
  label?: string;
  values: Record<string, {
    props?: Record<string, unknown>;
    layout?: Record<string, unknown>;
  }>;
}

export interface ElucimStateSnapshotMotionSpec {
  id: string;
  snapshots: ElucimStateSnapshot[];
  transitionDuration?: number;
  start?: 'onStart' | 'onClick' | 'onKey';
}

export interface ElucimStateSnapshotMotion {
  timelines: Record<string, ElucimTimeline>;
  stateMachine: ElucimStateMachine;
}

export type ElucimMotionLintCode =
  | 'blank-first-frame'
  | 'too-fast-transition'
  | 'simultaneous-overload'
  | 'hidden-label'
  | 'flashing'
  | 'excessive-motion'
  | 'static-timeline'
  | 'missing-reduced-motion';

export interface ElucimMotionLintIssue {
  code: ElucimMotionLintCode;
  severity: 'info' | 'warning' | 'error';
  path: string;
  message: string;
  targets?: string[];
  suggestions?: string[];
}

export interface ElucimMotionLintOptions {
  minTransitionFrames?: number;
  maxSimultaneousChanges?: number;
  maxTranslateDistance?: number;
  requireReducedMotion?: boolean;
}

export interface ElucimMotionLintReport {
  valid: boolean;
  score: number;
  issues: ElucimMotionLintIssue[];
}

export interface ElucimBeatPreviewDiff {
  beatId: string;
  frame: number;
  appears: string[];
  disappears: string[];
  moves: string[];
  changes: Array<{ target: string; property: string; before: unknown; after: unknown }>;
  summary: string;
}

export interface ElucimBeatPreviewOptions {
  timelineId: string;
  beats?: ElucimMotionBeat[];
  frames?: number[];
}

export interface ElucimReducedMotionOptions {
  mode?: 'static' | 'minimal';
  poster?: 'first' | 'last';
  maxDuration?: number;
}

export function planMotionBeats(spec: ElucimMotionBeatPlanSpec = {}): ElucimMotionBeat[] {
  const fps = spec.fps ?? 30;
  const totalFrames = spec.totalFrames ?? (spec.seconds ? Math.round(spec.seconds * fps) : 120);
  const rawBeats: MotionBeatInput[] = spec.beats && spec.beats.length > 0
    ? spec.beats
    : Array.from({ length: spec.beatCount ?? 4 }, (_, index) => ({
      id: defaultBeatId(index, spec.beatCount ?? 4),
      role: defaultBeatRole(index, spec.beatCount ?? 4),
    }));
  const explicitDuration = rawBeats.reduce((sum, beat) => sum + (beat.duration ?? 0), 0);
  const weighted = rawBeats.filter(beat => beat.duration === undefined);
  const totalWeight = weighted.reduce((sum, beat) => sum + (beat.weight ?? 1), 0) || 1;
  const remaining = Math.max(rawBeats.length, totalFrames - explicitDuration);
  let cursor = 0;
  return rawBeats.map((beat, index): ElucimMotionBeat => {
    const isLast = index === rawBeats.length - 1;
    const duration = beat.duration ?? (isLast
      ? Math.max(1, totalFrames - cursor)
      : Math.max(1, Math.round(remaining * ((beat.weight ?? 1) / totalWeight))));
    const planned = {
      id: sanitizeId(beat.id),
      role: beat.role,
      title: beat.title,
      start: cursor,
      duration,
      targets: beat.targets ? [...beat.targets] : undefined,
      description: beat.description,
    };
    cursor += duration;
    return planned;
  });
}

export function createSemanticMotionTimeline(doc: ElucimDocument, spec: ElucimSemanticMotionPresetSpec): ElucimTimeline {
  const duration = spec.reducedMotion ? Math.min(spec.duration ?? 36, 18) : spec.duration ?? defaultPresetDuration(spec.preset);
  const targets = resolveMotionTargets(doc, spec);
  if (targets.length === 0) throw new Error(`Motion preset "${spec.preset}" requires at least one existing target.`);
  const beat = spec.beats?.[0] ?? { id: spec.id, start: 0, duration };
  const start = beat.start;
  const end = Math.max(start + 1, start + beat.duration);
  const stagger = spec.stagger ?? (spec.preset === 'revealFlow' || spec.preset === 'drainQueue' ? 6 : 0);
  const tracks = buildPresetTracks(doc, spec, targets, start, end, stagger, Boolean(spec.reducedMotion));
  return {
    id: sanitizeId(spec.id),
    duration: Math.max(duration, ...tracks.flatMap(track => track.keyframes.map(keyframe => keyframe.frame))),
    tracks,
  };
}

export function createAutoStaggerTimeline(doc: ElucimDocument, spec: ElucimAutoStaggerMotionSpec): ElucimTimeline {
  const targets = orderTargets(doc, resolveMotionTargets(doc, spec), spec.orderBy ?? 'rank');
  if (targets.length === 0) throw new Error('createAutoStaggerTimeline requires at least one existing target.');
  return createSemanticMotionTimeline(doc, {
    id: spec.id,
    preset: spec.preset === 'pulse' ? 'emphasizeDecision' : spec.preset === 'fadeOut' ? 'compareBeforeAfter' : 'revealFlow',
    targets,
    duration: spec.duration ?? Math.max(36, targets.length * (spec.stagger ?? 6) + 24),
    stagger: spec.stagger,
  });
}

export function createStateSnapshotMotion(spec: ElucimStateSnapshotMotionSpec): ElucimStateSnapshotMotion {
  if (spec.snapshots.length === 0) throw new Error('createStateSnapshotMotion requires at least one snapshot.');
  const duration = spec.transitionDuration ?? 24;
  const timelines: Record<string, ElucimTimeline> = {};
  const states: ElucimStateMachine['states'] = {};
  const transitions: NonNullable<ElucimStateMachine['transitions']> = [];
  spec.snapshots.forEach((snapshot, index) => {
    const timelineId = sanitizeId(`${spec.id}-${snapshot.id}`);
    const previous = spec.snapshots[Math.max(0, index - 1)];
    timelines[timelineId] = {
      id: timelineId,
      duration,
      tracks: snapshotToTracks(previous, snapshot, duration),
    };
    states[snapshot.id] = { timeline: timelineId };
    if (index === 0) {
      transitions.push({ id: `${spec.id}-entry-${snapshot.id}`, from: 'entry', to: snapshot.id, trigger: spec.start ?? 'onStart' });
    } else {
      transitions.push({ id: `${spec.snapshots[index - 1].id}-to-${snapshot.id}`, from: spec.snapshots[index - 1].id, to: snapshot.id, exitTime: 1 });
    }
  });
  return {
    timelines,
    stateMachine: {
      id: sanitizeId(spec.id),
      entry: spec.snapshots[0].id,
      states,
      transitions,
    },
  };
}

export function lintMotion(doc: ElucimDocument, options: ElucimMotionLintOptions = {}): ElucimMotionLintReport {
  const issues: ElucimMotionLintIssue[] = [];
  const minTransitionFrames = options.minTransitionFrames ?? 6;
  const maxSimultaneousChanges = options.maxSimultaneousChanges ?? 6;
  const maxTranslateDistance = options.maxTranslateDistance ?? 480;
  const timelines = Object.values(doc.timelines ?? {});
  for (const timeline of timelines) {
    const first = applyTimelineFrame(doc, timeline.id, 0);
    const visibleFirst = Object.values(first.elements).filter(isVisibleElement);
    if (Object.keys(first.elements).length > 0 && visibleFirst.length === 0) {
      issues.push({
        code: 'blank-first-frame',
        severity: 'warning',
        path: `timelines.${timeline.id}`,
        message: `Timeline "${timeline.id}" starts with no visible elements.`,
        suggestions: ['Keep a title/context element visible at frame 0 or add a poster/static fallback.'],
      });
    }
    const frameChanges = new Map<number, string[]>();
    for (const [trackIndex, motionTrack] of timeline.tracks.entries()) {
      if (trackHasNoChange(motionTrack)) {
        issues.push({
          code: 'static-timeline',
          severity: 'info',
          path: `timelines.${timeline.id}.tracks[${trackIndex}]`,
          message: `Track ${trackIndex} on "${motionTrack.target}" does not change value.`,
          targets: [motionTrack.target],
        });
      }
      for (let index = 1; index < motionTrack.keyframes.length; index += 1) {
        const previous = motionTrack.keyframes[index - 1];
        const current = motionTrack.keyframes[index];
        const span = current.frame - previous.frame;
        if (span > 0 && span < minTransitionFrames) {
          issues.push({
            code: 'too-fast-transition',
            severity: 'warning',
            path: `timelines.${timeline.id}.tracks[${trackIndex}].keyframes[${index}]`,
            message: `Transition on "${motionTrack.target}" completes in ${span} frame(s).`,
            targets: [motionTrack.target],
            suggestions: [`Use at least ${minTransitionFrames} frames for readable motion.`],
          });
        }
        if (motionTrack.property === 'opacity' && numeric(previous.value) !== undefined && numeric(current.value) !== undefined && Math.abs(numeric(current.value)! - numeric(previous.value)!) > 0.8 && span < minTransitionFrames * 2) {
          issues.push({
            code: 'flashing',
            severity: 'warning',
            path: `timelines.${timeline.id}.tracks[${trackIndex}]`,
            message: `Opacity on "${motionTrack.target}" changes abruptly enough to read as flashing.`,
            targets: [motionTrack.target],
          });
        }
        if (motionTrack.property === 'translate' && tuple(previous.value) && tuple(current.value) && distance(tuple(previous.value)!, tuple(current.value)!) > maxTranslateDistance) {
          issues.push({
            code: 'excessive-motion',
            severity: 'warning',
            path: `timelines.${timeline.id}.tracks[${trackIndex}]`,
            message: `Translate motion on "${motionTrack.target}" travels more than ${maxTranslateDistance}px.`,
            targets: [motionTrack.target],
            suggestions: ['Prefer fades or shorter movement for generated diagrams.'],
          });
        }
        frameChanges.set(current.frame, [...(frameChanges.get(current.frame) ?? []), motionTrack.target]);
      }
    }
    for (const [frame, targets] of frameChanges) {
      const uniqueTargets = [...new Set(targets)];
      if (uniqueTargets.length > maxSimultaneousChanges) {
        issues.push({
          code: 'simultaneous-overload',
          severity: 'info',
          path: `timelines.${timeline.id}.frame.${frame}`,
          message: `${uniqueTargets.length} elements change at frame ${frame}.`,
          targets: uniqueTargets,
          suggestions: ['Use auto-stagger or split this into named beats.'],
        });
      }
    }
  }
  for (const element of Object.values(doc.elements)) {
    if ((element.type === 'text' || element.role === 'title') && numeric(element.props.opacity) === 0) {
      const animated = timelines.some(timeline => timeline.tracks.some(motionTrack => motionTrack.target === element.id && motionTrack.property === 'opacity'));
      if (!animated) {
        issues.push({
          code: 'hidden-label',
          severity: 'warning',
          path: `elements.${element.id}.props.opacity`,
          message: `Label "${element.id}" is hidden and no opacity track reveals it.`,
          targets: [element.id],
        });
      }
    }
  }
  if (options.requireReducedMotion && !doc.metadata?.notes?.some(note => note.includes('reduced-motion'))) {
    issues.push({
      code: 'missing-reduced-motion',
      severity: 'info',
      path: 'metadata.notes',
      message: 'No reduced-motion fallback note is present.',
      suggestions: ['Generate a fallback with createReducedMotionDocument() and store/serve it alongside this document.'],
    });
  }
  const penalty = issues.reduce((sum, issue) => sum + (issue.severity === 'error' ? 30 : issue.severity === 'warning' ? 12 : 5), 0);
  return { valid: !issues.some(issue => issue.severity === 'error'), score: Math.max(0, 100 - penalty), issues };
}

export function previewBeatDiffs(doc: ElucimDocument, options: ElucimBeatPreviewOptions): ElucimBeatPreviewDiff[] {
  const timeline = doc.timelines?.[options.timelineId];
  if (!timeline) throw new Error(`Timeline "${options.timelineId}" does not exist`);
  const frames = options.frames ?? (options.beats?.map(beat => Math.min(timeline.duration, beat.start + beat.duration)) ?? [0, Math.round(timeline.duration / 2), timeline.duration]);
  const beats = options.beats ?? frames.map((frame, index) => ({ id: `frame-${frame}`, start: frame, duration: 0, role: defaultBeatRole(index, frames.length) }));
  const baseline = applyTimelineFrame(doc, timeline.id, 0);
  return frames.map((frame, index) => {
    const before = index === 0 ? baseline : applyTimelineFrame(doc, timeline.id, frames[index - 1]);
    const after = applyTimelineFrame(doc, timeline.id, frame);
    const changes = diffElementValues(before, after);
    const appears = changes.filter(change => change.property === 'opacity' && numeric(change.before) !== undefined && numeric(change.before)! <= 0.01 && numeric(change.after) !== undefined && numeric(change.after)! > 0.01).map(change => change.target);
    const disappears = changes.filter(change => change.property === 'opacity' && numeric(change.before) !== undefined && numeric(change.before)! > 0.01 && numeric(change.after) !== undefined && numeric(change.after)! <= 0.01).map(change => change.target);
    const moves = changes.filter(change => change.property === 'translate' || change.property === 'x' || change.property === 'y').map(change => change.target);
    const beat = beats[Math.min(index, beats.length - 1)];
    return {
      beatId: beat.id,
      frame,
      appears: [...new Set(appears)],
      disappears: [...new Set(disappears)],
      moves: [...new Set(moves)],
      changes,
      summary: summarizeBeatDiff(beat.id, changes, appears, disappears, moves),
    };
  });
}

export function createReducedMotionDocument(doc: ElucimDocument, options: ElucimReducedMotionOptions = {}): ElucimDocument {
  const mode = options.mode ?? 'static';
  const next = cloneDocument(doc);
  if (mode === 'static') {
    const timelineId = next.defaultStateMachine
      ? next.stateMachines?.[next.defaultStateMachine]?.states[next.stateMachines[next.defaultStateMachine].entry]?.timeline
      : Object.keys(next.timelines ?? {})[0];
    const timeline = timelineId ? next.timelines?.[timelineId] : undefined;
    const posterFrame = options.poster === 'first' ? 0 : timeline?.duration ?? 0;
    const flattened = timelineId && timeline ? applyTimelineFrame(next, timelineId, posterFrame) : next;
    return {
      ...flattened,
      timelines: undefined,
      stateMachines: undefined,
      defaultStateMachine: undefined,
      metadata: {
        ...flattened.metadata,
        notes: [...(flattened.metadata?.notes ?? []), 'reduced-motion: static poster generated from semantic motion intent'],
      },
    };
  }
  const maxDuration = options.maxDuration ?? 18;
  return {
    ...next,
    timelines: Object.fromEntries(Object.entries(next.timelines ?? {}).map(([id, timeline]) => [
      id,
      {
        ...timeline,
        duration: Math.min(timeline.duration, maxDuration),
        tracks: timeline.tracks
          .filter(motionTrack => motionTrack.property === 'opacity' || motionTrack.property === 'fill' || motionTrack.property === 'stroke')
          .map(motionTrack => compressTrack(motionTrack, maxDuration)),
      },
    ])),
    metadata: {
      ...next.metadata,
      notes: [...(next.metadata?.notes ?? []), 'reduced-motion: minimal timeline generated from semantic motion intent'],
    },
  };
}

export function holdFinalFrame(doc: ElucimDocument, timelineId?: string): ElucimDocument {
  const id = timelineId ?? Object.keys(doc.timelines ?? {})[0];
  if (!id || !doc.timelines?.[id]) throw new Error('holdFinalFrame requires an existing timeline.');
  return applyTimelineFrame(doc, id, doc.timelines[id].duration);
}

function buildPresetTracks(
  doc: ElucimDocument,
  spec: ElucimSemanticMotionPresetSpec,
  targets: string[],
  start: number,
  end: number,
  stagger: number,
  reducedMotion: boolean,
): ElucimTimelineTrack[] {
  if (spec.preset === 'tracePath') {
    const connectorId = spec.connectorId ?? targets.find(id => isConnector(doc.elements[id])) ?? targets[0];
    return [
      track(connectorId, 'opacity', [{ frame: start, value: 0 }, { frame: end, value: 1, easing: 'easeOutCubic' }]),
      ...(!reducedMotion ? [track(connectorId, 'scale', [{ frame: start, value: 0.98 }, { frame: end, value: 1 }])] : []),
    ];
  }
  if (spec.preset === 'emphasizeDecision') {
    return targets.flatMap(target => [
      track(target, 'scale', [{ frame: start, value: 1 }, { frame: midpoint(start, end), value: reducedMotion ? 1.03 : 1.1, easing: 'easeOutCubic' }, { frame: end, value: 1 }]),
      track(target, 'stroke', [{ frame: start, value: '$border' }, { frame: midpoint(start, end), value: '$primary' }, { frame: end, value: '$border' }]),
    ]);
  }
  if (spec.preset === 'handoff') {
    const [from = spec.from ?? targets[0], to = spec.to ?? targets[1] ?? targets[0]] = targets;
    return [
      track(from, 'scale', [{ frame: start, value: 1.04 }, { frame: end, value: 1 }]),
      track(to, 'opacity', [{ frame: start, value: 0.55 }, { frame: end, value: 1, easing: 'easeOutCubic' }]),
      ...(!reducedMotion ? [track(to, 'translate', [{ frame: start, value: [-16, 0] }, { frame: end, value: [0, 0], easing: 'easeOutCubic' }])] : []),
    ];
  }
  if (spec.preset === 'drainQueue') {
    return targets.flatMap((target, index) => {
      const targetStart = Math.min(end - 1, start + index * stagger);
      const targetEnd = Math.min(end, targetStart + Math.max(6, end - start - targets.length * stagger));
      return [
        track(target, 'opacity', [{ frame: targetStart, value: 1 }, { frame: targetEnd, value: 0.25, easing: 'easeOutCubic' }]),
        ...(!reducedMotion ? [track(target, 'translate', [{ frame: targetStart, value: [0, 0] }, { frame: targetEnd, value: [24, 0], easing: 'easeOutCubic' }])] : []),
      ];
    });
  }
  if (spec.preset === 'compareBeforeAfter') {
    const split = Math.ceil(targets.length / 2);
    return targets.flatMap((target, index) => index < split
      ? [track(target, 'opacity', [{ frame: start, value: 1 }, { frame: end, value: 0.35, easing: 'easeOutCubic' }])]
      : [track(target, 'opacity', [{ frame: start, value: 0.25 }, { frame: end, value: 1, easing: 'easeOutCubic' }])]);
  }
  if (spec.preset === 'loopOnce') {
    return targets.flatMap(target => [
      track(target, 'scale', [{ frame: start, value: 1 }, { frame: midpoint(start, end), value: reducedMotion ? 1.02 : 1.08, easing: 'easeOutCubic' }, { frame: end, value: 1 }]),
    ]);
  }
  return targets.flatMap((target, index) => {
    const targetStart = Math.min(end - 1, start + index * stagger);
    const targetEnd = Math.min(end, targetStart + Math.max(6, end - start - targets.length * stagger));
    return [
      track(target, 'opacity', [{ frame: targetStart, value: 0 }, { frame: targetEnd, value: 1, easing: 'easeOutCubic' }]),
      ...(!reducedMotion ? [track(target, 'translate', [{ frame: targetStart, value: [0, 12] }, { frame: targetEnd, value: [0, 0], easing: 'easeOutCubic' }])] : []),
    ];
  });
}

function resolveMotionTargets(doc: ElucimDocument, spec: { targets?: string[]; from?: string; to?: string; connectorId?: string; group?: string }): string[] {
  const ids = new Set(Object.keys(doc.elements));
  const explicit = [spec.from, spec.to, spec.connectorId, ...(spec.targets ?? [])].filter((id): id is string => Boolean(id));
  if (explicit.length > 0) return [...new Set(explicit.filter(id => ids.has(id)))];
  if (spec.group) {
    return Object.values(doc.elements)
      .filter(element => element.intent?.group === spec.group || element.role === spec.group || element.parentId === spec.group)
      .map(element => element.id);
  }
  return [...doc.scene.children].filter(id => ids.has(id));
}

function orderTargets(doc: ElucimDocument, targets: string[], orderBy: 'document' | 'rank' | 'group'): string[] {
  if (orderBy === 'document') return [...targets];
  return [...targets].sort((a, b) => {
    const aElement = doc.elements[a];
    const bElement = doc.elements[b];
    if (orderBy === 'group') return String(aElement.intent?.group ?? aElement.parentId ?? '').localeCompare(String(bElement.intent?.group ?? bElement.parentId ?? ''));
    return (aElement.layout?.rank ?? Number.MAX_SAFE_INTEGER) - (bElement.layout?.rank ?? Number.MAX_SAFE_INTEGER);
  });
}

function snapshotToTracks(previous: ElucimStateSnapshot, snapshot: ElucimStateSnapshot, duration: number): ElucimTimelineTrack[] {
  const tracks: ElucimTimelineTrack[] = [];
  for (const [target, value] of Object.entries(snapshot.values)) {
    const previousValue = previous.values[target] ?? {};
    for (const [property, nextValue] of Object.entries(value.props ?? {})) {
      if (property === 'opacity' || property === 'fill' || property === 'stroke') {
        tracks.push(track(target, property, [{ frame: 0, value: previousValue.props?.[property] ?? nextValue }, { frame: duration, value: nextValue, easing: 'easeOutCubic' }]));
      }
    }
    for (const [property, nextValue] of Object.entries(value.layout ?? {})) {
      const timelineProperty = property === 'rotation' ? 'rotate' : property;
      if (timelineProperty === 'translate' || timelineProperty === 'scale' || timelineProperty === 'rotate') {
        tracks.push(track(target, timelineProperty, [{ frame: 0, value: previousValue.layout?.[property] ?? nextValue }, { frame: duration, value: nextValue, easing: 'easeOutCubic' }]));
      }
    }
  }
  return tracks;
}

function track(target: string, property: ElucimAnimatableProperty, keyframes: ElucimKeyframe[]): ElucimTimelineTrack {
  return { target, property, keyframes };
}

function defaultPresetDuration(preset: ElucimSemanticMotionPreset): number {
  if (preset === 'loopOnce') return 60;
  if (preset === 'compareBeforeAfter') return 72;
  return 48;
}

function defaultBeatId(index: number, count: number): string {
  if (index === count - 1) return 'takeaway';
  return ['intro', 'context', 'decision', 'feedback'][index] ?? `beat-${index + 1}`;
}

function defaultBeatRole(index: number, count: number): ElucimMotionBeatRole {
  if (index === 0) return 'intro';
  if (index === count - 1) return 'takeaway';
  if (index === 1) return 'context';
  if (index === 2) return 'decision';
  return 'feedback';
}

function midpoint(start: number, end: number): number {
  return Math.round((start + end) / 2);
}

function sanitizeId(value: string): string {
  const id = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return id || 'motion';
}

function isConnector(element: ElucimElement | undefined): boolean {
  return element?.role === 'connector' || element?.intent?.role === 'connector' || element?.type === 'line' || element?.type === 'bezierCurve';
}

function trackHasNoChange(motionTrack: ElucimTimelineTrack): boolean {
  if (motionTrack.keyframes.length < 2) return true;
  const first = motionTrack.keyframes[0].value;
  return motionTrack.keyframes.every(keyframe => JSON.stringify(keyframe.value) === JSON.stringify(first));
}

function numeric(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function tuple(value: unknown): [number, number] | undefined {
  return Array.isArray(value) && value.length >= 2 && numeric(value[0]) !== undefined && numeric(value[1]) !== undefined
    ? [value[0], value[1]]
    : undefined;
}

function distance(a: [number, number], b: [number, number]): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function isVisibleElement(element: ElucimElement): boolean {
  return (numeric(element.props.opacity) ?? 1) > 0.01 && element.props.visible !== false && element.props.display !== 'none' && element.props.visibility !== 'hidden';
}

function diffElementValues(before: ElucimDocument, after: ElucimDocument): ElucimBeatPreviewDiff['changes'] {
  const changes: ElucimBeatPreviewDiff['changes'] = [];
  for (const [target, element] of Object.entries(after.elements)) {
    const previous = before.elements[target];
    if (!previous) continue;
    for (const [property, value] of Object.entries(element.props)) {
      const beforeValue = previous.props[property];
      if (JSON.stringify(beforeValue) !== JSON.stringify(value)) changes.push({ target, property, before: beforeValue, after: value });
    }
    for (const [property, value] of Object.entries(element.layout ?? {})) {
      const beforeValue = previous.layout?.[property as keyof NonNullable<ElucimElement['layout']>];
      if (JSON.stringify(beforeValue) !== JSON.stringify(value)) changes.push({ target, property, before: beforeValue, after: value });
    }
  }
  return changes;
}

function summarizeBeatDiff(beatId: string, changes: ElucimBeatPreviewDiff['changes'], appears: string[], disappears: string[], moves: string[]): string {
  const parts = [
    appears.length ? `${appears.length} appear` : '',
    disappears.length ? `${disappears.length} disappear` : '',
    moves.length ? `${moves.length} move` : '',
    changes.length ? `${changes.length} property changes` : 'no visible changes',
  ].filter(Boolean);
  return `${beatId}: ${parts.join(', ')}.`;
}

function compressTrack(motionTrack: ElucimTimelineTrack, maxDuration: number): ElucimTimelineTrack {
  const last = motionTrack.keyframes[motionTrack.keyframes.length - 1];
  return {
    ...motionTrack,
    keyframes: [
      { ...motionTrack.keyframes[0], frame: 0 },
      { ...last, frame: maxDuration },
    ],
  };
}

function cloneDocument(doc: ElucimDocument): ElucimDocument {
  return JSON.parse(JSON.stringify(doc)) as ElucimDocument;
}
