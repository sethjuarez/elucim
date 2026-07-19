import type {
  ElucimCamera,
  ElucimTimelineCamera,
  ElucimDocument,
  ElucimRevealEffect,
  ElucimLayout,
  ElucimTimeline,
  ElucimTimelineTrack,
} from './types';
import type { RevealState } from '@elucim/core';
import type { EasingSpec } from '../schema/types';
import { resolveEasing } from '../renderer/resolveEasing';

export interface ElucimTimelinePatch {
  layout?: Partial<ElucimLayout>;
  props?: Record<string, unknown>;
}

export type ElucimTimelineFrame = Record<string, ElucimTimelinePatch>;

export interface ElucimTimelineFrameSelection {
  timelineId: string;
  frame: number;
  /** Whether text content tracks contribute to this selection. Default: true. */
  includeContent?: boolean;
  /** Whether this selection may contribute its timeline camera. Default: true. */
  applyCamera?: boolean;
}

export function evaluateTimeline(timeline: ElucimTimeline, frame: number): ElucimTimelineFrame {
  const patches: ElucimTimelineFrame = {};
  const clampedFrame = Math.max(0, Math.min(frame, timeline.duration));
  for (const track of timeline.tracks ?? []) {
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

export function applyTimelineFrame(doc: ElucimDocument, timelineId: string, frame: number): ElucimDocument {
  return applyTimelineFrames(doc, [{ timelineId, frame }]);
}

export function applyTimelineFrames(doc: ElucimDocument, frames: ElucimTimelineFrameSelection[]): ElucimDocument {
  const next = cloneDoc(doc);
  for (const selection of frames) {
    applyTimelineFrameToDocument(next, selection);
  }
  return next;
}

/** Resolves primitive reveal states from an ordered stack of timeline frames. */
export function resolveTimelineReveals(
  doc: ElucimDocument,
  frames: ElucimTimelineFrameSelection[],
): Record<string, RevealState> {
  const reveals: Record<string, RevealState> = {};
  for (const selection of frames) {
    if (selection.includeContent === false) continue;
    const timeline = doc.timelines?.[selection.timelineId];
    if (!timeline) continue;
    const selectionReveals: Record<string, { effect: ElucimRevealEffect; start: number }> = {};
    for (const effect of timeline.effects ?? []) {
      if (effect.kind !== 'reveal') continue;
      const targets = resolveRevealTargets(doc, effect);
      for (const [index, target] of targets.entries()) {
        const offset = (effect.staggerInFrames ?? 0) * index;
        const start = effect.from + offset;
        const previous = selectionReveals[target];
        if (
          !previous
          || (start <= selection.frame && previous.start > selection.frame)
          || (start <= selection.frame && previous.start <= selection.frame && start >= previous.start)
          || (start > selection.frame && previous.start > selection.frame && start < previous.start)
        ) {
          selectionReveals[target] = { effect, start };
        }
      }
    }
    for (const [target, assignment] of Object.entries(selectionReveals)) {
      const { effect, start } = assignment;
      reveals[target] = {
        progress: clamp((selection.frame - start) / effect.duration),
        strategy: resolveRevealStrategy(doc, target, effect),
        ...(effect.cursor === undefined ? {} : { cursor: resolveRevealCursor(effect, selection.frame - start) }),
      };
    }
  }
  return reveals;
}

function resolveRevealTargets(doc: ElucimDocument, effect: ElucimRevealEffect): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string, ancestry: Set<string>) => {
    if (ancestry.has(id)) throw new Error(`Reveal effect "${effect.id}" has a cyclic target tree at "${id}"`);
    const element = doc.elements[id];
    if (!element) throw new Error(`Reveal effect "${effect.id}" targets missing element "${id}"`);
    if (element.children?.length) {
      const nextAncestry = new Set(ancestry);
      nextAncestry.add(id);
      element.children.forEach(child => visit(child, nextAncestry));
      return;
    }
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  };
  effect.targets.forEach(target => visit(target, new Set()));
  return result;
}

function resolveRevealStrategy(
  doc: ElucimDocument,
  target: string,
  effect: ElucimRevealEffect,
): RevealState['strategy'] {
  if (effect.strategy === 'fade') return 'fade';
  if (effect.strategy === 'type') return doc.elements[target]?.type === 'text' ? 'type' : 'fade';
  return doc.elements[target]?.type === 'text' ? 'type' : 'fade';
}

function resolveRevealCursor(effect: ElucimRevealEffect, elapsedFrames: number): RevealState['cursor'] {
  if (effect.cursor === false || effect.cursor === true || effect.cursor === undefined) return effect.cursor;
  const blinkEveryFrames = effect.cursor.blinkEveryFrames;
  if (blinkEveryFrames && Math.floor(Math.max(0, elapsedFrames) / blinkEveryFrames) % 2 === 1) return false;
  return effect.cursor;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Evaluates the effective camera for ordered timeline selections without mutating the document. */
export function evaluateTimelineCameraFrames(
  doc: ElucimDocument,
  frames: ElucimTimelineFrameSelection[],
): ElucimCamera | undefined {
  let camera: ElucimCamera | undefined;
  for (const { timelineId, frame, applyCamera = true } of frames) {
    const timeline = doc.timelines?.[timelineId];
    if (!timeline) throw new Error(`Timeline "${timelineId}" does not exist`);
    if (timeline.camera && applyCamera) camera = evaluateCameraTrack(timeline.camera, frame);
  }
  return camera;
}

function applyTimelineFrameToDocument(
  doc: ElucimDocument,
  selection: ElucimTimelineFrameSelection,
): void {
  const { timelineId, frame, includeContent = true } = selection;
  const timeline = doc.timelines?.[timelineId];
  if (!timeline) throw new Error(`Timeline "${timelineId}" does not exist`);
  const patches = evaluateTimeline(timeline, frame);
  for (const [id, patch] of Object.entries(patches)) {
    const element = doc.elements[id];
    if (!element) throw new Error(`Timeline "${timelineId}" targets missing element "${id}"`);
    element.layout = patch.layout ? { ...element.layout, ...patch.layout } : element.layout;
    const props = includeContent || patch.props?.content === undefined
      ? patch.props
      : Object.fromEntries(Object.entries(patch.props).filter(([key]) => key !== 'content'));
    element.props = props ? { ...element.props, ...props } : element.props;
  }
}

export function evaluateCameraTrack(track: ElucimTimelineCamera, frame: number): ElucimCamera {
  const keyframes = [...track.keyframes].sort((a, b) => a.frame - b.frame);
  if (keyframes.length === 0) throw new Error('Camera track must have at least one keyframe');
  if (frame <= keyframes[0].frame) {
    return {
      viewport: { ...keyframes[0].viewport },
      ...(track.coordinateSpace ? { coordinateSpace: track.coordinateSpace } : {}),
      ...(track.fit ? { fit: track.fit } : {}),
    };
  }
  const last = keyframes[keyframes.length - 1];
  if (frame >= last.frame) {
    return {
      viewport: { ...last.viewport },
      ...(track.coordinateSpace ? { coordinateSpace: track.coordinateSpace } : {}),
      ...(track.fit ? { fit: track.fit } : {}),
    };
  }

  const nextIndex = keyframes.findIndex(keyframe => keyframe.frame >= frame);
  const from = keyframes[nextIndex - 1];
  const to = keyframes[nextIndex];
  const span = to.frame - from.frame;
  const t = span === 0 ? 1 : ease((frame - from.frame) / span, to.easing ?? from.easing);
  return {
    viewport: {
      x: interpolateNumber(from.viewport.x, to.viewport.x, t),
      y: interpolateNumber(from.viewport.y, to.viewport.y, t),
      width: interpolateCameraDimension(from.viewport.width, to.viewport.width, t),
      height: interpolateCameraDimension(from.viewport.height, to.viewport.height, t),
    },
    ...(track.coordinateSpace ? { coordinateSpace: track.coordinateSpace } : {}),
    ...(track.fit ? { fit: track.fit } : {}),
  };
}

function evaluateTrack(track: ElucimTimelineTrack, frame: number): unknown {
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

function interpolateNumber(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function interpolateCameraDimension(from: number, to: number, t: number): number {
  return Math.max(Number.EPSILON, interpolateNumber(from, to, t));
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
  return resolveEasing(easing)?.(clamped) ?? clamped;
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

function cloneDoc(doc: ElucimDocument): ElucimDocument {
  return JSON.parse(JSON.stringify(doc)) as ElucimDocument;
}
