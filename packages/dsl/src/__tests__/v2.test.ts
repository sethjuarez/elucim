import { describe, expect, it } from 'vitest';
import { getDocumentLinearDuration, migrateV1ToV2, migrateV2ToV1, normalizeToV2, resolveExportFrameCount, toRenderableV1, validate, validateV2 } from '../index';
import type { ElucimDocument, ElucimV2Document } from '../index';

describe('Elucim v2 document foundation', () => {
  it('validates a minimal normalized v2 document', () => {
    const doc: ElucimV2Document = {
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

    expect(validateV2(doc)).toEqual({ valid: true, errors: [] });
    expect(validate(doc)).toEqual({ valid: true, errors: [] });
  });

  it('does not require canvas duration for v2 scene layout', () => {
    const doc: ElucimV2Document = {
      version: '2.0',
      scene: { type: 'scene', width: 800, height: 600, children: ['title'] },
      elements: {
        title: { id: 'title', type: 'text', props: { content: 'Hello' } },
      },
      timelines: {
        intro: { id: 'intro', duration: 45, tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 45, value: 1 }] }] },
      },
    };

    const result = validateV2(doc);
    expect(result).toEqual({ valid: true, errors: [] });
    expect((migrateV2ToV1(doc).root as any).durationInFrames).toBe(45);
  });

  it('requires explicit export policies instead of canvas duration for fixed machine output', () => {
    const doc: ElucimV2Document = {
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
    const result = validateV2({
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

  it('migrates a v1 player into normalized v2 elements with stable IDs', () => {
    const v1: ElucimDocument = {
      version: '1.0',
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

    const v2 = migrateV1ToV2(v1);

    expect(v2.version).toBe('2.0');
    expect(v2.scene.children).toEqual(['card']);
    expect(v2.elements.card.children).toEqual(['title', 'card.rect[1]']);
    expect(v2.elements.title.parentId).toBe('card');
    expect(v2.elements.title.layout).toMatchObject({ x: 40, y: 50 });
    expect(v2.elements.title.props).toMatchObject({ type: 'text', content: 'Revenue', x: 40, y: 50 });
    expect(validateV2(v2).valid).toBe(true);
  });

  it('deduplicates repeated v1 IDs during migration', () => {
    const v1: ElucimDocument = {
      version: '1.0',
      root: {
        type: 'scene',
        durationInFrames: 60,
        children: [
          { type: 'text', id: 'label', x: 0, y: 0, content: 'A' },
          { type: 'text', id: 'label', x: 0, y: 30, content: 'B' },
        ],
      },
    };

    const v2 = migrateV1ToV2(v1);

    expect(v2.scene.children).toEqual(['label', 'label-2']);
    expect(v2.elements.label.id).toBe('label');
    expect(v2.elements['label-2'].id).toBe('label-2');
    expect(validateV2(v2).valid).toBe(true);
  });

  it('converts normalized v2 documents back to v1 editor documents', () => {
    const v2 = migrateV1ToV2({
      version: '1.0',
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

    const v1 = migrateV2ToV1(v2);

    expect(v1.version).toBe('1.0');
    expect(v1.root.type).toBe('player');
    expect((v1.root as any).children[0]).toMatchObject({
      type: 'group',
      id: 'card',
      children: [{ type: 'text', id: 'title', content: 'Revenue' }],
    });
    expect(validate(v1).valid).toBe(true);
  });

  it('normalizes legacy rootless documents to v2', () => {
    const result = normalizeToV2({
      version: 1,
      title: 'Legacy visual',
      elements: [{ type: 'text', content: 'Metric', x: 100, y: 160 }],
    });

    expect(result.inputFormat).toBe('legacy-rootless');
    expect(result.migrated).toBe(true);
    expect(result.warnings[0]).toContain('legacy rootless');
    expect(result.document.version).toBe('2.0');
    expect(result.document.metadata?.notes?.[0]).toContain('Migrated');
    expect(validateV2(result.document).valid).toBe(true);
  });

  it('exposes an official renderable v1 bridge for v2 and legacy docs', () => {
    const v1 = toRenderableV1({
      version: 1,
      title: 'Legacy visual',
      elements: [{ type: 'circle', cx: 100, cy: 100, r: 40 }],
    });

    expect(v1.version).toBe('1.0');
    expect(v1.root.type).toBe('player');
    expect(validate(v1).valid).toBe(true);
  });
});
