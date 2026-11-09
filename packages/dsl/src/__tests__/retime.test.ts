import { describe, expect, it } from 'vitest';
import {
  applyTimelineFrame,
  createRetimeMap,
  ElucimRetimeError,
  retimeTimeline,
  validateDocument,
  type ElucimDocument,
} from '../index';

function makeDoc(): ElucimDocument {
  return {
    version: '2.0',
    scene: { type: 'player', width: 400, height: 200, fps: 25, children: ['box', 'label', 'group'] },
    elements: {
      box: { id: 'box', type: 'rect', props: { type: 'rect', x: 0, y: 0, width: 40, height: 40, opacity: 0 } },
      label: { id: 'label', type: 'text', props: { type: 'text', x: 10, y: 10, content: 'Hi', opacity: 1 } },
      group: { id: 'group', type: 'group', children: ['a', 'b', 'c'], props: { type: 'group' } },
      a: { id: 'a', type: 'text', parentId: 'group', props: { type: 'text', x: 0, y: 0, content: 'A' } },
      b: { id: 'b', type: 'text', parentId: 'group', props: { type: 'text', x: 0, y: 20, content: 'B' } },
      c: { id: 'c', type: 'text', parentId: 'group', props: { type: 'text', x: 0, y: 40, content: 'C' } },
    },
    timelines: {
      main: {
        id: 'main',
        duration: 100,
        markers: { intro: 10, agent: 40, tool: 70 },
        tracks: [
          {
            target: 'box',
            property: 'opacity',
            keyframes: [
              { frame: 0, value: 0 },
              { frame: 40, value: 1, easing: 'easeOutCubic' },
              { frame: 70, value: 0.5 },
              { frame: 100, value: 1 },
            ],
          },
          { target: 'box', property: 'translate', keyframes: [{ frame: 20, value: [0, 0] }, { frame: 55, value: [100, 0] }] },
        ],
        effects: [{ id: 'type-list', kind: 'reveal', targets: ['group'], from: 40, duration: 12, staggerInFrames: 6 }],
        camera: {
          keyframes: [
            { frame: 0, viewport: { x: 0, y: 0, width: 400, height: 200 } },
            { frame: 70, viewport: { x: 50, y: 0, width: 200, height: 100 } },
          ],
        },
      },
    },
  };
}

const errorCode = (fn: () => unknown) => {
  try { fn(); } catch (error) {
    expect(error).toBeInstanceOf(ElucimRetimeError);
    return (error as ElucimRetimeError).code;
  }
  throw new Error('expected an ElucimRetimeError');
};

describe('timeline markers', () => {
  it('validates marker frames', () => {
    const doc = makeDoc();
    expect(validateDocument(doc).valid).toBe(true);
    doc.timelines!.main.markers = { a: 10, b: 10, c: 101, d: -1, e: 1.5 };
    const messages = validateDocument(doc).errors.map(error => `${error.path}: ${error.message}`);
    expect(messages).toEqual(expect.arrayContaining([
      expect.stringContaining('markers.b: Marker "b" shares frame 10'),
      expect.stringContaining('markers.c: Marker frame cannot exceed'),
      expect.stringContaining('markers.d: Marker frame must be a non-negative integer'),
      expect.stringContaining('markers.e: Marker frame must be a non-negative integer'),
    ]));
  });
});

describe('retimeTimeline', () => {
  it('lands cued markers on target frames and maps keyframes piecewise-linearly', () => {
    const doc = makeDoc();
    const retimed = retimeTimeline(doc, 'main', { agent: 50, tool: 110 });
    const timeline = retimed.timelines!.main;
    // Tail after the last cue keeps its authored length (100 - 70 = 30).
    expect(timeline.duration).toBe(140);
    expect(timeline.markers).toEqual({ intro: 13, agent: 50, tool: 110 });
    expect(timeline.tracks[0].keyframes.map(keyframe => keyframe.frame)).toEqual([0, 50, 110, 140]);
    expect(timeline.tracks[0].keyframes[1].easing).toBe('easeOutCubic');
    // 20 -> 25 (0..40 scaled by 50/40), 55 -> 80 (40..70 scaled by 60/30).
    expect(timeline.tracks[1].keyframes.map(keyframe => keyframe.frame)).toEqual([25, 80]);
    expect(timeline.camera!.keyframes.map(keyframe => keyframe.frame)).toEqual([0, 110]);
    // Reveal 40..64 (3 leaves, stagger 6) -> 50..98: stagger scales by 2.
    expect(timeline.effects![0]).toMatchObject({ from: 50, staggerInFrames: 12, duration: 24 });
    expect(validateDocument(retimed).valid).toBe(true);
  });

  it('preserves the shape of easing at the retimed frames', () => {
    const doc = makeDoc();
    const retimed = retimeTimeline(doc, 'main', { agent: 80 });
    const before = applyTimelineFrame(doc, 'main', 20).elements.box.props.opacity as number;
    const after = applyTimelineFrame(retimed, 'main', 40).elements.box.props.opacity as number;
    expect(after).toBeCloseTo(before, 10);
  });

  it('does not mutate the input document', () => {
    const doc = makeDoc();
    const snapshot = JSON.stringify(doc);
    retimeTimeline(doc, 'main', { agent: 60 });
    expect(JSON.stringify(doc)).toBe(snapshot);
  });

  it('honors an explicit duration and exposes the time map', () => {
    const doc = makeDoc();
    const map = createRetimeMap(doc, 'main', { tool: 75 }, { duration: 80 });
    expect(map.targetDuration).toBe(80);
    expect(map.anchors.map(anchor => [anchor.name, anchor.source, anchor.target])).toEqual([
      ['$start', 0, 0],
      ['tool', 70, 75],
      ['$end', 100, 80],
    ]);
    expect(map.map(35)).toBeCloseTo(37.5);
    expect(retimeTimeline(doc, 'main', { tool: 75 }, { duration: 80 }).timelines!.main.duration).toBe(80);
  });

  it('is the identity with no cues', () => {
    const doc = makeDoc();
    expect(retimeTimeline(doc, 'main', {}).timelines!.main).toEqual(doc.timelines!.main);
  });

  it('rejects unknown markers, invalid and non-monotonic targets', () => {
    const doc = makeDoc();
    expect(errorCode(() => retimeTimeline(doc, 'nope', {}))).toBe('unknown-timeline');
    expect(errorCode(() => retimeTimeline(doc, 'main', { missing: 10 }))).toBe('unknown-marker');
    expect(errorCode(() => retimeTimeline(doc, 'main', { agent: -1 }))).toBe('invalid-target');
    expect(errorCode(() => retimeTimeline(doc, 'main', { agent: 2.5 }))).toBe('invalid-target');
    expect(errorCode(() => retimeTimeline(doc, 'main', { agent: 60, tool: 50 }))).toBe('non-monotonic');
    expect(errorCode(() => retimeTimeline(doc, 'main', { agent: 60, tool: 60 }))).toBe('non-monotonic');
    expect(errorCode(() => retimeTimeline(doc, 'main', { tool: 90 }, { duration: 90 }))).toBe('non-monotonic');
    expect(errorCode(() => retimeTimeline(doc, 'main', {}, { duration: 0 }))).toBe('invalid-duration');
  });

  it('rejects compression that would merge keyframes or markers', () => {
    const doc = makeDoc();
    doc.timelines!.main.tracks.push({ target: 'label', property: 'opacity', keyframes: [{ frame: 45, value: 0 }, { frame: 50, value: 1 }] });
    expect(errorCode(() => retimeTimeline(doc, 'main', { agent: 40, tool: 41 }))).toBe('collapsed-keyframes');
    // Squeezing two markers onto adjacent cues still keeps every uncued marker distinct.
    const tight = makeDoc();
    tight.timelines!.main.markers = { a: 10, b: 11, c: 40 };
    tight.timelines!.main.tracks = [];
    tight.timelines!.main.effects = [];
    delete tight.timelines!.main.camera;
    expect(errorCode(() => retimeTimeline(tight, 'main', { c: 2 }))).toBe('collapsed-keyframes');
  });

  it('handles markers on the first and last frames', () => {
    const doc = makeDoc();
    doc.timelines!.main.markers = { start: 0, end: 100 };
    expect(errorCode(() => retimeTimeline(doc, 'main', { start: 5 }))).toBe('non-monotonic');
    const retimed = retimeTimeline(doc, 'main', { end: 150 });
    expect(retimed.timelines!.main.duration).toBe(150);
    expect(retimed.timelines!.main.markers).toEqual({ start: 0, end: 150 });
  });
});
