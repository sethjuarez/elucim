import { describe, expect, it } from 'vitest';
import { applyCommand, validateV2 } from '../index';
import type { ElucimV2Document } from '../index';

function doc(): ElucimV2Document {
  return {
    version: '2.0',
    scene: { type: 'player', width: 800, height: 600, children: ['group'] },
    elements: {
      group: { id: 'group', type: 'group', children: ['title'], props: { type: 'group' } },
      title: { id: 'title', type: 'text', parentId: 'group', layout: { x: 20, y: 30 }, props: { type: 'text', content: 'Hello' } },
    },
    timelines: {
      intro: {
        id: 'intro',
        duration: 30,
        tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }],
      },
    },
  };
}

describe('v2 command API', () => {
  it('adds an element under a parent without mutating the source document', () => {
    const source = doc();
    const result = applyCommand(source, {
      op: 'addElement',
      parentId: 'group',
      element: { id: 'subtitle', type: 'text', props: { type: 'text', content: 'World' }, layout: { x: 20, y: 70 } },
    });

    expect(source.elements.subtitle).toBeUndefined();
    expect(result.document.elements.subtitle.parentId).toBe('group');
    expect(result.document.elements.group.children).toEqual(['title', 'subtitle']);
    expect(validateV2(result.document).valid).toBe(true);
  });

  it('updates props and layout shallowly', () => {
    const result = applyCommand(doc(), {
      op: 'updateElement',
      id: 'title',
      patch: { props: { content: 'Updated' }, layout: { x: 100 } },
    });

    expect(result.document.elements.title.props).toMatchObject({ type: 'text', content: 'Updated' });
    expect(result.document.elements.title.layout).toMatchObject({ x: 100, y: 30 });
  });

  it('reparents elements while keeping child references valid', () => {
    const withCard = applyCommand(doc(), {
      op: 'addElement',
      element: { id: 'card', type: 'group', props: { type: 'group' }, children: [] },
    }).document;

    const result = applyCommand(withCard, { op: 'reparentElement', id: 'title', parentId: 'card' });

    expect(result.document.elements.group.children).toEqual([]);
    expect(result.document.elements.card.children).toEqual(['title']);
    expect(result.document.elements.title.parentId).toBe('card');
    expect(validateV2(result.document).valid).toBe(true);
  });

  it('deletes descendants and cleans timeline tracks', () => {
    const result = applyCommand(doc(), { op: 'deleteElement', id: 'group' });

    expect(result.document.scene.children).toEqual([]);
    expect(result.document.elements.group).toBeUndefined();
    expect(result.document.elements.title).toBeUndefined();
    expect(result.document.timelines?.intro.tracks).toEqual([]);
    expect(validateV2(result.document).valid).toBe(true);
  });

  it('applies animation presets through existing prop semantics', () => {
    const result = applyCommand(doc(), { op: 'applyAnimationPreset', ids: ['title'], preset: 'reveal' });

    expect(result.document.elements.title.props.draw).toBe(45);
  });

  it('throws for unsafe reparent cycles', () => {
    expect(() => applyCommand(doc(), { op: 'reparentElement', id: 'group', parentId: 'title' }))
      .toThrow('Cannot reparent');
  });
});
