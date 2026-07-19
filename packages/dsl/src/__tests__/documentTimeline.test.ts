import { describe, expect, it } from 'vitest';
import { applyCommand, applyTimelineFrame, applyTimelineFrames, createRenderableDocument, evaluateTimeline, resolveTimelineReveals, validateDocument, type ElucimDocument } from '../index';

const doc: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, children: ['title'] },
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

describe('document timelines and keyframes', () => {
  it('validates safe keyframe tracks', () => {
    expect(validateDocument(doc).valid).toBe(true);
  });

  it('reports invalid timeline keyframes with machine-friendly paths', () => {
    const result = validateDocument({
      ...doc,
      timelines: {
        bad: {
          id: 'bad',
          duration: 10,
          tracks: [{ target: 'title', property: 'bogus', keyframes: [{ frame: 12, value: 1 }] }],
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

  it('applies text content timeline tracks without mutating the source document', () => {
    const next = applyTimelineFrame({
      ...doc,
      timelines: {
        typing: {
          id: 'typing',
          duration: 20,
          tracks: [{ target: 'title', property: 'content', keyframes: [{ frame: 0, value: '' }, { frame: 20, value: 'Hello' }] }],
        },
      },
    }, 'typing', 20);

    expect(next.elements.title.props.content).toBe('Hello');
    expect(doc.elements.title.props.content).toBe('Hello');
  });

  it('validates content tracks only for text targets with string keyframes', () => {
    const result = validateDocument({
      ...doc,
      timelines: {
        invalid: {
          id: 'invalid',
          duration: 10,
          tracks: [{ target: 'title', property: 'content', keyframes: [{ frame: 0, value: 1 }] }],
        },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.path)).toContain('timelines.invalid.tracks[0].keyframes[0].value');
  });

  it('resolves explicit reveal effects for text and group descendants', () => {
      const revealDoc: ElucimDocument = {
        ...doc,
        scene: { ...doc.scene, children: ['group'] },
        elements: {
          ...doc.elements,
          group: { id: 'group', type: 'group', children: ['title', 'subtitle'], props: {} },
          subtitle: { id: 'subtitle', type: 'rect', parentId: 'group', props: { type: 'rect', x: 0, y: 0, width: 10, height: 10 } },
          title: { ...doc.elements.title, parentId: 'group' },
        },
        timelines: {
          intro: {
            id: 'intro',
            duration: 12,
            tracks: [],
            effects: [{
              id: 'reveal-group',
              kind: 'reveal',
              targets: ['group'],
              from: 2,
              duration: 4,
              staggerInFrames: 2,
              cursor: { character: '_' },
            }],
          },
        },
      };

      const reveals = resolveTimelineReveals(revealDoc, [{ timelineId: 'intro', frame: 4 }]);

      expect(reveals.title).toEqual({ progress: 0.5, strategy: 'type', cursor: { character: '_' } });
      expect(reveals.subtitle).toEqual({ progress: 0, strategy: 'fade', cursor: { character: '_' } });
      expect(validateDocument(revealDoc).valid).toBe(true);
    });

    it('rejects reveal effects that overrun their timeline', () => {
      const result = validateDocument({
        ...doc,
        timelines: {
          intro: {
            id: 'intro',
            duration: 5,
            tracks: [],
            effects: [{ id: 'late', kind: 'reveal', targets: ['title'], from: 3, duration: 3 }],
          },
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.path === 'timelines.intro.effects[0]')).toBe(true);
  });

  it('keeps the latest started reveal effect for repeated targets', () => {
      const revealDoc: ElucimDocument = {
        ...doc,
        timelines: {
          intro: {
            id: 'intro',
            duration: 10,
            tracks: [],
            effects: [
              { id: 'first', kind: 'reveal', targets: ['title'], from: 0, duration: 2 },
              { id: 'second', kind: 'reveal', targets: ['title'], from: 5, duration: 3 },
            ],
          },
        },
      };

      expect(resolveTimelineReveals(revealDoc, [{ timelineId: 'intro', frame: 3 }]).title.progress).toBe(1);
      expect(resolveTimelineReveals(revealDoc, [{ timelineId: 'intro', frame: 5 }]).title.progress).toBe(0);
  });

  it('accepts effect-only timelines while rejecting incomplete or incompatible effects', () => {
      const effectOnly: ElucimDocument = {
        ...doc,
        timelines: {
          intro: {
            id: 'intro',
            duration: 5,
            tracks: [],
            effects: [{ id: 'fade', kind: 'reveal', targets: ['title'], from: 0, duration: 5, strategy: 'fade' }],
          },
        },
      };
      const malformed = {
        ...effectOnly,
        timelines: {
          intro: {
            ...effectOnly.timelines!.intro,
            effects: [{ id: 'missing-timing', kind: 'reveal', targets: ['title'] }],
          },
        },
      };
      const invalidStrategy = {
        ...effectOnly,
        elements: {
          ...effectOnly.elements,
          box: { id: 'box', type: 'rect', props: { type: 'rect', x: 0, y: 0, width: 1, height: 1 } },
        },
        timelines: {
          intro: {
            ...effectOnly.timelines!.intro,
            effects: [{ id: 'wrong-strategy', kind: 'reveal', targets: ['box'], from: 0, duration: 5, strategy: 'type' }],
          },
        },
      };

      expect(validateDocument(effectOnly).valid).toBe(true);
      expect(() => applyTimelineFrame(effectOnly, 'intro', 2)).not.toThrow();
      expect(validateDocument(malformed).valid).toBe(false);
      expect(validateDocument(invalidStrategy).valid).toBe(false);
  });

  it('applies timeline frames without mutating the source document', () => {
    const next = applyTimelineFrame(doc, 'intro', 30);

    expect(next.elements.title.props.opacity).toBe(1);
    expect(next.elements.title.layout?.translate).toEqual([0, 0]);
    expect(doc.elements.title.props.opacity).toBe(0);
  });

  it('applies multiple timeline frames in order for composed previews', () => {
    const next = applyTimelineFrames({
      ...doc,
      elements: {
        ...doc.elements,
        title: {
          ...doc.elements.title,
          props: { ...doc.elements.title.props, opacity: 0 },
        },
      },
      timelines: {
        intro: doc.timelines!.intro,
        focus: {
          id: 'focus',
          duration: 20,
          tracks: [{ target: 'title', property: 'scale', keyframes: [{ frame: 0, value: 1 }, { frame: 20, value: 1.2 }] }],
        },
      },
    }, [
      { timelineId: 'intro', frame: 30 },
      { timelineId: 'focus', frame: 10 },
    ]);

    expect(next.elements.title.props.opacity).toBe(1);
    expect(next.elements.title.layout?.scale).toBe(1.1);
  });

  it('restores layout timeline patches into renderable elements', () => {
    const next = applyTimelineFrame({
      ...doc,
      elements: {
        ...doc.elements,
        title: {
          ...doc.elements.title,
          layout: { ...doc.elements.title.layout, scale: 1 },
        },
      },
      timelines: {
        intro: {
          id: 'intro',
          duration: 30,
          tracks: [
            { target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] },
            { target: 'title', property: 'scale', keyframes: [{ frame: 0, value: 0.8 }, { frame: 30, value: 1.2 }] },
            { target: 'title', property: 'translate', keyframes: [{ frame: 0, value: [0, 24] }, { frame: 30, value: [0, 0] }] },
            { target: 'title', property: 'rotate', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 90 }] },
          ],
        },
      },
    }, 'intro', 15);

    const restored = createRenderableDocument(next);
    const title = restored.root.children[0] as any;

    expect(title.opacity).toBe(0.5);
    expect(title.scale).toBe(1);
    expect(title.translate).toEqual([0, 12]);
    expect(title.rotation).toBe(45);
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
