import { describe, expect, it } from 'vitest';
import { applyCommand, applyTimelineFrame, evaluateTimeline, validateV2, type ElucimV2Document } from '../index';

const doc: ElucimV2Document = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, durationInFrames: 90, children: ['title'] },
  elements: {
    title: {
      id: 'title',
      type: 'text',
      layout: { x: 80, y: 120 },
      props: { type: 'text', content: 'Hello', opacity: 0, fill: '#000000' },
    },
  },
  timelines: {
    intro: {
      id: 'intro',
      duration: 30,
      tracks: [
        { target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] },
        { target: 'title', property: 'translate', keyframes: [{ frame: 0, value: [0, 24] }, { frame: 30, value: [0, 0] }] },
        { target: 'title', property: 'fill', keyframes: [{ frame: 0, value: '#000000' }, { frame: 30, value: '#ffffff' }] },
      ],
    },
  },
};

describe('v2 timelines and keyframes', () => {
  it('validates safe keyframe tracks', () => {
    expect(validateV2(doc).valid).toBe(true);
  });

  it('reports invalid timeline keyframes with machine-friendly paths', () => {
    const result = validateV2({
      ...doc,
      timelines: {
        bad: {
          id: 'bad',
          duration: 10,
          tracks: [{ target: 'title', property: 'x', keyframes: [{ frame: 12, value: 1 }] }],
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.path)).toContain('timelines.bad.tracks[0].property');
    expect(result.errors.map(error => error.path)).toContain('timelines.bad.tracks[0].keyframes[0].frame');
  });

  it('evaluates numeric, tuple, and color keyframes deterministically', () => {
    const frame = evaluateTimeline(doc.timelines!.intro, 15);

    expect(frame.title.props?.opacity).toBe(0.5);
    expect(frame.title.layout?.translate).toEqual([0, 12]);
    expect(frame.title.props?.fill).toBe('#808080');
  });

  it('applies timeline frames without mutating the source document', () => {
    const next = applyTimelineFrame(doc, 'intro', 30);

    expect(next.elements.title.props.opacity).toBe(1);
    expect(next.elements.title.layout?.translate).toEqual([0, 0]);
    expect(doc.elements.title.props.opacity).toBe(0);
  });

  it('lets commands upsert and preview timeline clips', () => {
    const upserted = applyCommand(doc, {
      op: 'upsertTimeline',
      timeline: {
        id: 'outro',
        duration: 20,
        tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 1 }, { frame: 20, value: 0 }] }],
      },
    });
    const previewed = applyCommand(upserted.document, { op: 'applyTimelineFrame', timelineId: 'outro', frame: 10 });

    expect(upserted.document.timelines?.outro.duration).toBe(20);
    expect(previewed.document.elements.title.props.opacity).toBe(0.5);
  });
});
