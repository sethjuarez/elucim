import { describe, expect, it } from 'vitest';
import { createDocumentFromRenderable, createRenderableDocument, getDocumentLinearDuration, normalizeDocument, resolveExportFrameCount, toRenderableDocument, validate, validateDocument } from '../index';
import type { ElucimDocument, RenderableDocument } from '../index';

describe('Elucim Document compatibility foundation', () => {
  it('validates a minimal normalized document', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 1920, height: 1080, children: ['title'] },
      elements: {
        title: {
          id: 'title',
          type: 'text',
          role: 'title',
          layout: { x: 100, y: 120 },
          intent: { importance: 'primary', generated: true },
          props: { content: 'Hello', fill: '$title' },
        },
      },
    };

    expect(validateDocument(doc)).toEqual({ valid: true, errors: [] });
    expect(validate(doc)).toEqual({ valid: true, errors: [] });
  });

  it('does not require canvas duration for document scene layout', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'scene', width: 800, height: 600, children: ['title'] },
      elements: {
        title: { id: 'title', type: 'text', props: { content: 'Hello' } },
      },
      timelines: {
        intro: { id: 'intro', duration: 45, tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 45, value: 1 }] }] },
      },
    };

    const result = validateDocument(doc);
    expect(result).toEqual({ valid: true, errors: [] });
    expect((createRenderableDocument(doc).root as any).durationInFrames).toBe(45);
  });

  it('requires explicit export policies instead of canvas duration for fixed machine output', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', children: ['title'] },
      elements: {
        title: { id: 'title', type: 'text', props: { content: 'Hello' } },
      },
      timelines: {
        idle: { id: 'idle', duration: 30, tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 1 }] }] },
        unused: { id: 'unused', duration: 90, tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 1 }] }] },
      },
      defaultStateMachine: 'deck',
      stateMachines: {
        deck: {
          id: 'deck',
          entry: 'idle',
          states: { idle: { timeline: 'idle' } },
          transitions: [{ id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' }],
        },
      },
    };

    expect(getDocumentLinearDuration(doc)).toBe(30);
    expect(resolveExportFrameCount(doc, { type: 'state', machineId: 'deck', stateId: 'idle' })).toBe(30);
    expect(resolveExportFrameCount(doc, { type: 'machineUntilExit', machineId: 'deck', maxFrames: 300 })).toBe(300);
    expect(() => resolveExportFrameCount(doc, { type: 'machineFirstFrames', machineId: 'missing', frameCount: 10 })).toThrow('State machine "missing" does not exist');
    expect(() => resolveExportFrameCount(doc, { type: 'machineUntilExit', machineId: 'deck', maxFrames: 0 })).toThrow('machineUntilExit.maxFrames must be a positive integer');
  });

  it('reports machine-friendly reference errors', () => {
    const result = validateDocument({
      version: '2.0',
      scene: { type: 'scene', children: ['missing'] },
      elements: {},
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: 'scene.children[0]',
      message: 'Unknown element ID "missing"',
      severity: 'error',
    });
  });

  it('rejects legacy wrapper animation syntax in normalized documents', () => {
    const result = validateDocument({
      version: '2.0',
      scene: { type: 'player', children: ['title', 'intro'] },
      elements: {
        title: { id: 'title', type: 'text', props: { content: 'Hello', fadeIn: 20 } },
        intro: { id: 'intro', type: 'fadeIn', props: { type: 'fadeIn' } },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: 'elements.title.props.fadeIn',
      message: 'Legacy animation prop "fadeIn" is not part of Elucim Documents. Use timeline tracks and keyframes instead.',
      severity: 'error',
    });
    expect(result.errors).toContainEqual({
      path: 'elements.intro.type',
      message: 'Legacy wrapper element "fadeIn" is not part of Elucim Documents. Use timelines and state machines for motion.',
      severity: 'error',
    });
  });

  it('migrates a renderable player into normalized elements with stable IDs', () => {
    const renderable: RenderableDocument = {
      version: 'render-tree',
      root: {
        type: 'player',
        width: 800,
        height: 600,
        durationInFrames: 90,
        children: [
          {
            type: 'group',
            id: 'card',
            children: [
              { type: 'text', id: 'title', x: 40, y: 50, content: 'Revenue' },
              { type: 'rect', x: 30, y: 80, width: 180, height: 100 },
            ],
          },
        ],
      },
    };

    const doc = createDocumentFromRenderable(renderable);

    expect(doc.version).toBe('2.0');
    expect(doc.scene.children).toEqual(['card']);
    expect(doc.elements.card.children).toEqual(['title', 'card.rect[1]']);
    expect(doc.elements.title.parentId).toBe('card');
    expect(doc.elements.title.layout).toMatchObject({ x: 40, y: 50 });
    expect(doc.elements.title.props).toMatchObject({ type: 'text', content: 'Revenue', x: 40, y: 50 });
    expect(validateDocument(doc).valid).toBe(true);
  });

  it('deduplicates repeated renderable IDs during migration', () => {
    const renderable: RenderableDocument = {
      version: 'render-tree',
      root: {
        type: 'scene',
        durationInFrames: 60,
        children: [
          { type: 'text', id: 'label', x: 0, y: 0, content: 'A' },
          { type: 'text', id: 'label', x: 0, y: 30, content: 'B' },
        ],
      },
    };

    const doc = createDocumentFromRenderable(renderable);

    expect(doc.scene.children).toEqual(['label', 'label-2']);
    expect(doc.elements.label.id).toBe('label');
    expect(doc.elements['label-2'].id).toBe('label-2');
    expect(validateDocument(doc).valid).toBe(true);
  });

  it('converts normalized documents back to renderable editor documents', () => {
    const doc = createDocumentFromRenderable({
      version: 'render-tree',
      root: {
        type: 'player',
        width: 800,
        height: 600,
        durationInFrames: 90,
        children: [
          { type: 'group', id: 'card', children: [{ type: 'text', id: 'title', x: 40, y: 50, content: 'Revenue' }] },
        ],
      },
    });

    const renderable = createRenderableDocument(doc);

    expect(renderable.version).toBe('render-tree');
    expect(renderable.root.type).toBe('player');
    expect((renderable.root as any).children[0]).toMatchObject({
      type: 'group',
      id: 'card',
      children: [{ type: 'text', id: 'title', content: 'Revenue' }],
    });
    expect(validate(renderable).valid).toBe(true);
  });

  it('rejects old rootless visual documents instead of migrating them', () => {
    expect(() => normalizeDocument({
      version: 1,
      title: 'Legacy visual',
      elements: [{ type: 'text', content: 'Metric', x: 100, y: 160 }],
    })).toThrow('Unsupported Elucim document format: version=1');
  });

  it('rejects old documents in the render-tree adapter', () => {
    expect(() => toRenderableDocument({
      version: 1,
      title: 'Legacy visual',
      elements: [{ type: 'circle', cx: 100, cy: 100, r: 40 }],
    })).toThrow('Unsupported Elucim document format: version=1');
  });

  it('applies default state-machine start frames in the renderable compatibility adapter', () => {
    const renderable = toRenderableDocument({
      version: '2.0',
      scene: { type: 'player', children: ['title'] },
      elements: {
        title: { id: 'title', type: 'text', props: { type: 'text', content: 'Hello', opacity: 1 } },
      },
      timelines: {
        intro: {
          id: 'intro',
          duration: 30,
          tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }],
        },
      },
      defaultStateMachine: 'deck',
      stateMachines: {
        deck: {
          id: 'deck',
          entry: 'idle',
          states: { idle: { timeline: 'intro' } },
          transitions: [{ id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' }],
        },
      },
    });

    expect(renderable.root.type).toBe('player');
    if (renderable.root.type !== 'player') throw new Error('Expected player root');
    expect(renderable.root.children[0]).toMatchObject({ id: 'title', opacity: 0 });
  });
});
