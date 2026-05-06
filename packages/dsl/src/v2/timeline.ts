import type {
  ElucimV2Document,
  ElucimV2Layout,
  ElucimV2Timeline,
  ElucimV2TimelineTrack,
} from './types';
import type { EasingSpec } from '../schema/types';

export interface ElucimV2TimelinePatch {
  layout?: Partial<ElucimV2Layout>;
  props?: Record<string, unknown>;
}

export type ElucimV2TimelineFrame = Record<string, ElucimV2TimelinePatch>;

export function evaluateTimeline(timeline: ElucimV2Timeline, frame: number): ElucimV2TimelineFrame {
  const patches: ElucimV2TimelineFrame = {};
  const clampedFrame = Math.max(0, Math.min(frame, timeline.duration));
  for (const track of timeline.tracks) {
    const value = evaluateTrack(track, clampedFrame);
    const targetPatch = (patches[track.target] ??= {});
    if (track.property === 'translate' || track.property === 'scale' || track.property === 'rotate') {
      targetPatch.layout = {
        ...targetPatch.layout,
        ...(track.property === 'rotate' ? { rotation: value as number } : { [track.property]: value }),
      };
    } else {
      targetPatch.props = { ...targetPatch.props, [track.property]: value };
    }
  }
  return patches;
}

export function applyTimelineFrame(doc: ElucimV2Document, timelineId: string, frame: number): ElucimV2Document {
  const timeline = doc.timelines?.[timelineId];
  if (!timeline) throw new Error(`Timeline "${timelineId}" does not exist`);
  const next = cloneDoc(doc);
  const patches = evaluateTimeline(timeline, frame);
  for (const [id, patch] of Object.entries(patches)) {
    const element = next.elements[id];
    if (!element) throw new Error(`Timeline "${timelineId}" targets missing element "${id}"`);
    element.layout = patch.layout ? { ...element.layout, ...patch.layout } : element.layout;
    element.props = patch.props ? { ...element.props, ...patch.props } : element.props;
  }
  return next;
}

function evaluateTrack(track: ElucimV2TimelineTrack, frame: number): unknown {
  const keyframes = [...track.keyframes].sort((a, b) => a.frame - b.frame);
  if (keyframes.length === 0) throw new Error('Timeline track must have at least one keyframe');
  if (frame <= keyframes[0].frame) return keyframes[0].value;
  const last = keyframes[keyframes.length - 1];
  if (frame >= last.frame) return last.value;

  const nextIndex = keyframes.findIndex(keyframe => keyframe.frame >= frame);
  const from = keyframes[nextIndex - 1];
  const to = keyframes[nextIndex];
  const span = to.frame - from.frame;
  const t = span === 0 ? 1 : ease((frame - from.frame) / span, to.easing ?? from.easing);
  return interpolateValue(from.value, to.value, t);
}

function interpolateValue(from: unknown, to: unknown, t: number): unknown {
  if (typeof from === 'number' && typeof to === 'number') return from + (to - from) * t;
  if (Array.isArray(from) && Array.isArray(to) && from.length === to.length && from.every(isNumber) && to.every(isNumber)) {
    return from.map((value, index) => value + ((to[index] as number) - value) * t);
  }
  const fromColor = parseHexColor(from);
  const toColor = parseHexColor(to);
  if (fromColor && toColor) {
    const channels = fromColor.map((value, index) => Math.round(value + (toColor[index] - value) * t));
    return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
  }
  return t < 1 ? from : to;
}

function ease(t: number, easing?: EasingSpec): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (!easing || easing === 'linear') return clamped;
  if (typeof easing !== 'string') {
    return easing.type === 'cubicBezier' ? cubicBezierY(clamped, easing.y1, easing.y2) : easeOutCubic(clamped);
  }
  switch (easing) {
    case 'easeInQuad': return clamped * clamped;
    case 'easeOutQuad': return 1 - (1 - clamped) * (1 - clamped);
    case 'easeInOutQuad': return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    case 'easeInCubic': return clamped * clamped * clamped;
    case 'easeOutCubic': return easeOutCubic(clamped);
    case 'easeInOutCubic': return clamped < 0.5 ? 4 * clamped * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
    case 'easeInSine': return 1 - Math.cos((clamped * Math.PI) / 2);
    case 'easeOutSine': return Math.sin((clamped * Math.PI) / 2);
    case 'easeInOutSine': return -(Math.cos(Math.PI * clamped) - 1) / 2;
    default: return clamped;
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function cubicBezierY(t: number, y1: number, y2: number): number {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * y1 + 3 * inverse * t * t * y2 + t * t * t;
}

function parseHexColor(value: unknown): [number, number, number] | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.startsWith('#') ? value.slice(1) : value;
  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    return normalized.split('').map(channel => parseInt(channel + channel, 16)) as [number, number, number];
  }
  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return [0, 2, 4].map(offset => parseInt(normalized.slice(offset, offset + 2), 16)) as [number, number, number];
  }
  return undefined;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function cloneDoc(doc: ElucimV2Document): ElucimV2Document {
  return JSON.parse(JSON.stringify(doc)) as ElucimV2Document;
}
