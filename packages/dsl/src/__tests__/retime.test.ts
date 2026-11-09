import { describe, expect, it } from 'vitest';
import {
  applyTimelineFrame,
  createRetimeMap,
  ElucimRetimeError,
  lintMotion,
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

describe('lintMotion against external timing', () => {
  it('flags beats squeezed below minTransitionFrames after retiming', () => {
    const doc = makeDoc();
    const report = lintMotion(doc, { cues: { timelineId: 'main', cues: { agent: 50, tool: 54 } } });
    const squeezed = report.issues.filter(issue => issue.code === 'squeezed-beat');
    expect(squeezed.map(issue => issue.message)).toEqual(expect.arrayContaining([
      'Beat at marker "agent" (frame 50) gets 4 frame(s) before the next cue "tool" (frame 54).',
      expect.stringContaining('Reveal "type-list-1" in the beat at marker "agent" gets'),
    ]));
    expect(lintMotion(doc).issues.some(issue => issue.code === 'squeezed-beat')).toBe(false);
  });

  it('reports cue maps that collapse markers or keyframes as errors', () => {
    const doc = makeDoc();
    doc.timelines!.main.tracks.push({ target: 'label', property: 'opacity', keyframes: [{ frame: 45, value: 0 }, { frame: 50, value: 1 }] });
    const report = lintMotion(doc, { cues: { timelineId: 'main', cues: { agent: 40, tool: 41 } } });
    expect(report.valid).toBe(false);
    expect(report.issues[0]).toMatchObject({ code: 'collapsed-marker', severity: 'error', path: 'timelines.main.tracks[2]' });
  });

  it('reports unusable cue maps as invalid-cue errors', () => {
    const doc = makeDoc();
    expect(lintMotion(doc, { cues: { timelineId: 'main', cues: { agent: 60, tool: 60 } } }).issues[0])
      .toMatchObject({ code: 'invalid-cue', severity: 'error', path: 'timelines.main.cues.tool' });
    expect(lintMotion(doc, { cues: { timelineId: 'main', cues: { agnet: 60 } } }).issues[0])
      .toMatchObject({ code: 'invalid-cue', message: expect.stringContaining('no marker "agnet"') });
  });

  it('flags markers that share a frame in an authored document', () => {
    const doc = makeDoc();
    doc.timelines!.main.markers = { a: 10, b: 10 };
    expect(lintMotion(doc).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'collapsed-marker', path: 'timelines.main.markers.b' }),
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
    // 20 -> 25 (0..40 scaled by 50/40), 55 -> 80 (40..70 scaled by 60/30); split at the agent marker (40 -> 50).
    expect(timeline.tracks[1].keyframes.map(keyframe => keyframe.frame)).toEqual([25, 50, 80]);
    expect(timeline.camera!.keyframes.map(keyframe => keyframe.frame)).toEqual([0, 50, 110]);
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

  it('lands the authored state at a marker exactly on its cue when a segment spans it', () => {
    const doc = makeDoc();
    doc.timelines!.main.markers = { mid: 50 };
    doc.timelines!.main.tracks = [{ target: 'box', property: 'x', keyframes: [{ frame: 0, value: 0 }, { frame: 100, value: 100 }] }];
    doc.timelines!.main.effects = [];
    doc.timelines!.main.camera = {
      keyframes: [
        { frame: 0, viewport: { x: 0, y: 0, width: 400, height: 200 } },
        { frame: 100, viewport: { x: 100, y: 0, width: 400, height: 200 } },
      ],
    };
    const retimed = retimeTimeline(doc, 'main', { mid: 80 });
    expect(applyTimelineFrame(retimed, 'main', 80).elements.box.props.x).toBe(50);
    expect(retimed.timelines!.main.camera!.keyframes[1]).toMatchObject({ frame: 80, viewport: { x: 50 } });
    // Eased segments keep their easing on both halves of the split.
    doc.timelines!.main.tracks[0].keyframes[1].easing = 'easeInOutCubic';
    const eased = retimeTimeline(doc, 'main', { mid: 80 }).timelines!.main.tracks[0].keyframes;
    expect(eased.map(keyframe => [keyframe.frame, keyframe.easing])).toEqual([[0, undefined], [80, 'easeInOutCubic'], [130, 'easeInOutCubic']]);
    expect(eased[1].value).toBe(50);
  });

  it('splits a staggered reveal that spans a cue so each target starts on its mapped frame', () => {
    const doc = makeDoc();
    // Leaves start at 30, 40, 50; marker "agent" (40) moves to 80, so the slope changes mid-stagger.
    doc.timelines!.main.effects = [{ id: 'type-list', kind: 'reveal', targets: ['group'], from: 30, duration: 10, staggerInFrames: 10 }];
    const retimed = retimeTimeline(doc, 'main', { agent: 80, tool: 110 });
    const effects = retimed.timelines!.main.effects!;
    expect(effects.map(effect => [effect.id, effect.targets, effect.from, effect.duration, effect.staggerInFrames])).toEqual([
      ['type-list-1', ['a'], 60, 20, undefined],
      ['type-list-2', ['b'], 80, 10, undefined],
      ['type-list-3', ['c'], 90, 10, undefined],
    ]);
    expect(validateDocument(retimed).valid).toBe(true);
  });

  it('splits a staggered reveal when rounding makes mapped starts uneven, even within one segment', () => {
    const doc = makeDoc();
    // 0..40 stretches to 0..50 (x1.25): starts 1,2,3 -> 1,3,4 (half up) and ends 5,6,7 -> 6,8,9.
    doc.timelines!.main.effects = [{ id: 'type-list', kind: 'reveal', targets: ['group'], from: 1, duration: 4, staggerInFrames: 1 }];
    const effects = retimeTimeline(doc, 'main', { agent: 50, tool: 80 }).timelines!.main.effects!;
    expect(effects.map(effect => [effect.id, effect.from, effect.duration])).toEqual([
      ['type-list-1', 1, 5],
      ['type-list-2', 3, 5],
      ['type-list-3', 4, 5],
    ]);
  });

  it('keeps a single reveal when mapped timings stay evenly staggered', () => {
    const doc = makeDoc();
    doc.timelines!.main.effects = [{ id: 'type-list', kind: 'reveal', targets: ['group'], from: 0, duration: 4, staggerInFrames: 4 }];
    const effects = retimeTimeline(doc, 'main', { agent: 80, tool: 110 }).timelines!.main.effects!;
    expect(effects).toEqual([{ id: 'type-list', kind: 'reveal', targets: ['group'], from: 0, duration: 8, staggerInFrames: 8 }]);
  });

  it('rejects a reveal whose stagger would collapse', () => {
    const doc = makeDoc();
    doc.timelines!.main.effects = [{ id: 'type-list', kind: 'reveal', targets: ['group'], from: 42, duration: 4, staggerInFrames: 1 }];
    expect(errorCode(() => retimeTimeline(doc, 'main', { agent: 40, tool: 45 }))).toBe('collapsed-effect');
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
