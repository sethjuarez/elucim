import type { ElucimDocument, ElucimRevealEffect, ElucimTimeline } from './types';
import { resolveRevealTargets } from './timeline';

export type ElucimRetimeErrorCode =
  | 'unknown-timeline'
  | 'unknown-marker'
  | 'invalid-target'
  | 'non-monotonic'
  | 'invalid-duration'
  | 'collapsed-keyframes'
  | 'collapsed-effect';

/** Thrown by retimeTimeline / createRetimeMap when a cue map cannot be applied. */
export class ElucimRetimeError extends Error {
  readonly code: ElucimRetimeErrorCode;
  readonly path?: string;

  constructor(code: ElucimRetimeErrorCode, message: string, path?: string) {
    super(message);
    this.name = 'ElucimRetimeError';
    this.code = code;
    this.path = path;
  }
}

/** Marker name to target frame, e.g. `{ agent: 50, tool: 112 }`. */
export type ElucimCueMap = Record<string, number>;

export interface ElucimRetimeOptions {
  /**
   * New timeline duration. Defaults to keeping the authored tail after the
   * last cued marker (`lastTarget + (duration - lastMarker)`), or the cue
   * itself when a marker sits on the final frame.
   */
  duration?: number;
}

export interface ElucimRetimeAnchor {
  /** Marker name, or `$start` / `$end` for the implicit anchors. */
  name: string;
  source: number;
  target: number;
}

export interface ElucimRetimeMap {
  timelineId: string;
  sourceDuration: number;
  targetDuration: number;
  /** Ordered anchors including `$start` (0 -> 0) and `$end` (duration -> new duration). */
  anchors: ElucimRetimeAnchor[];
  /** Maps an authored frame to its (fractional) retimed frame. */
  map: (sourceFrame: number) => number;
}

/**
 * Builds the piecewise-linear time map for a cue map without changing the
 * document. Anchors are `0 -> 0`, each cued marker, and `duration -> new
 * duration`; markers that are not cued are carried along by the map.
 */
export function createRetimeMap(
  doc: ElucimDocument,
  timelineId: string,
  cues: ElucimCueMap,
  options: ElucimRetimeOptions = {},
): ElucimRetimeMap {
  const timeline = doc.timelines?.[timelineId];
  if (!timeline) throw new ElucimRetimeError('unknown-timeline', `Timeline "${timelineId}" does not exist.`);
  const markers = timeline.markers ?? {};
  const sourceDuration = timeline.duration;
  const cued: ElucimRetimeAnchor[] = [];
  for (const [name, target] of Object.entries(cues)) {
    if (!Object.prototype.hasOwnProperty.call(markers, name)) {
      const known = Object.keys(markers);
      throw new ElucimRetimeError(
        'unknown-marker',
        `Timeline "${timelineId}" has no marker "${name}". Known markers: ${known.length ? known.join(', ') : '(none)'}.`,
        `cues.${name}`,
      );
    }
    if (typeof target !== 'number' || !Number.isInteger(target) || target < 0) {
      throw new ElucimRetimeError('invalid-target', `Cue "${name}" must be a non-negative integer frame, got ${String(target)}.`, `cues.${name}`);
    }
    cued.push({ name, source: markers[name], target });
  }
  cued.sort((a, b) => a.source - b.source);

  const last = cued[cued.length - 1];
  const targetDuration = options.duration
    ?? (last ? last.target + (sourceDuration - last.source) : sourceDuration);
  if (!Number.isInteger(targetDuration) || targetDuration < 1) {
    throw new ElucimRetimeError('invalid-duration', `Retimed duration must be a positive integer frame count, got ${targetDuration}.`, 'duration');
  }

  const anchors: ElucimRetimeAnchor[] = [];
  const startCue = cued.find(cue => cue.source === 0);
  anchors.push(startCue ? { ...startCue } : { name: '$start', source: 0, target: 0 });
  for (const cue of cued) if (cue.source !== 0 && cue.source !== sourceDuration) anchors.push({ ...cue });
  const endCue = cued.find(cue => cue.source === sourceDuration);
  if (endCue && options.duration !== undefined && endCue.target !== options.duration) {
    throw new ElucimRetimeError(
      'non-monotonic',
      `Marker "${endCue.name}" sits on the last frame, so its cue (${endCue.target}) must equal the requested duration (${options.duration}).`,
      `cues.${endCue.name}`,
    );
  }
  anchors.push(endCue ? { ...endCue } : { name: '$end', source: sourceDuration, target: targetDuration });
  const resolvedDuration = anchors[anchors.length - 1].target;

  if (anchors[0].target !== 0) {
    throw new ElucimRetimeError(
      'non-monotonic',
      `Marker "${anchors[0].name}" is at frame 0, so its cue must be 0 (got ${anchors[0].target}).`,
      `cues.${anchors[0].name}`,
    );
  }
  for (let index = 1; index < anchors.length; index += 1) {
    const previous = anchors[index - 1];
    const current = anchors[index];
    if (current.target <= previous.target) {
      throw new ElucimRetimeError(
        'non-monotonic',
        `Cue "${current.name}" -> ${current.target} must be later than "${previous.name}" -> ${previous.target}; cue frames must strictly increase in marker order.`,
        current.name.startsWith('$') ? 'duration' : `cues.${current.name}`,
      );
    }
  }

  const map = (sourceFrame: number): number => {
    if (sourceFrame <= 0) return anchors[0].target + sourceFrame;
    for (let index = 1; index < anchors.length; index += 1) {
      const a = anchors[index - 1];
      const b = anchors[index];
      if (sourceFrame <= b.source) {
        return a.target + ((sourceFrame - a.source) * (b.target - a.target)) / (b.source - a.source);
      }
    }
    const end = anchors[anchors.length - 1];
    return end.target + (sourceFrame - end.source);
  };

  return { timelineId, sourceDuration, targetDuration: resolvedDuration, anchors, map };
}

/**
 * Returns a new document whose timeline is retimed so each cued marker lands
 * on its target frame. Keyframes (tracks and camera), reveal effects and the
 * other markers are mapped piecewise-linearly between consecutive anchors and
 * rounded to integer frames (half up), so authored easing and ordering survive.
 *
 * Throws {@link ElucimRetimeError} for unknown markers, non-increasing cue
 * frames, or when compression would merge two keyframes of one track (or a
 * marker) onto the same frame. The input document is not modified. State
 * machines reference timelines by id, so they follow automatically.
 */
export function retimeTimeline(
  doc: ElucimDocument,
  timelineId: string,
  cues: ElucimCueMap,
  options: ElucimRetimeOptions = {},
): ElucimDocument {
  const retime = createRetimeMap(doc, timelineId, cues, options);
  const source = doc.timelines![timelineId];
  const toFrame = (frame: number) => Math.round(retime.map(frame));
  const timeline: ElucimTimeline = JSON.parse(JSON.stringify(source)) as ElucimTimeline;
  timeline.duration = retime.targetDuration;

  timeline.tracks.forEach((track, trackIndex) => {
    track.keyframes = track.keyframes.map(keyframe => ({ ...keyframe, frame: toFrame(keyframe.frame) }));
    assertIncreasing(
      track.keyframes.map(keyframe => keyframe.frame),
      `timelines.${timelineId}.tracks[${trackIndex}]`,
      `Track on "${track.target}" (${track.property})`,
    );
  });
  if (timeline.camera) {
    timeline.camera.keyframes = timeline.camera.keyframes.map(keyframe => ({ ...keyframe, frame: toFrame(keyframe.frame) }));
    assertIncreasing(timeline.camera.keyframes.map(keyframe => keyframe.frame), `timelines.${timelineId}.camera`, 'Camera track');
  }
  if (timeline.effects) {
    timeline.effects = timeline.effects.map((effect, index) =>
      retimeEffect(doc, effect, toFrame, `timelines.${timelineId}.effects[${index}]`));
  }
  if (timeline.markers) {
    const markers: Record<string, number> = {};
    for (const [name, frame] of Object.entries(timeline.markers)) {
      markers[name] = Object.prototype.hasOwnProperty.call(cues, name) ? cues[name] : toFrame(frame);
    }
    const ordered = Object.entries(markers).sort((a, b) => (timeline.markers![a[0]] - timeline.markers![b[0]]));
    assertIncreasing(ordered.map(([, frame]) => frame), `timelines.${timelineId}.markers`, 'Markers', ordered.map(([name]) => name));
    timeline.markers = markers;
  }

  return { ...doc, timelines: { ...doc.timelines, [timelineId]: timeline } };
}

function retimeEffect(
  doc: ElucimDocument,
  effect: ElucimRevealEffect,
  toFrame: (frame: number) => number,
  path: string,
): ElucimRevealEffect {
  const leaves = Math.max(1, resolveRevealTargets(doc, effect).length);
  const stagger = effect.staggerInFrames ?? 0;
  const span = effect.duration + stagger * (leaves - 1);
  const from = toFrame(effect.from);
  const end = toFrame(effect.from + span);
  const newSpan = end - from;
  if (newSpan < 1) {
    throw new ElucimRetimeError('collapsed-effect', `Reveal "${effect.id}" would collapse to ${newSpan} frame(s) after retiming.`, path);
  }
  const next: ElucimRevealEffect = { ...effect, from };
  if (leaves > 1 && stagger > 0) {
    let newStagger = Math.floor((stagger * newSpan) / span);
    newStagger = Math.min(newStagger, Math.floor((newSpan - 1) / (leaves - 1)));
    next.staggerInFrames = newStagger;
    next.duration = newSpan - newStagger * (leaves - 1);
  } else {
    next.duration = newSpan - stagger * (leaves - 1);
    if (next.duration < 1) {
      throw new ElucimRetimeError('collapsed-effect', `Reveal "${effect.id}" would collapse after retiming.`, path);
    }
  }
  return next;
}

function assertIncreasing(frames: number[], path: string, label: string, names?: string[]): void {
  for (let index = 1; index < frames.length; index += 1) {
    if (frames[index] <= frames[index - 1]) {
      const what = names
        ? `"${names[index - 1]}" and "${names[index]}"`
        : `keyframes ${index - 1} and ${index}`;
      throw new ElucimRetimeError(
        'collapsed-keyframes',
        `${label}: ${what} both land on frame ${frames[index]} after retiming. Give that segment more frames or remove a keyframe.`,
        path,
      );
    }
  }
}
