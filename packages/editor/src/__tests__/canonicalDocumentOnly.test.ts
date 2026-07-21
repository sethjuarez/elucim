import { describe, expect, it } from 'vitest';
import { importFromJson } from '../utils/io';
import { projectDocument } from '../document/projection';
import { resolvePreviewDocument } from '../document/documentLifecycle';
import { validateDocument, type ElucimDocument } from '@elucim/dsl';
import { editorReducer } from '../state/reducer';
import { createInitialState } from '../state/types';

const document: ElucimDocument = {
  version: '2.0',
  scene: { type: 'scene', width: 320, height: 180, children: ['label'] },
  elements: {
    label: { id: 'label', type: 'text', props: { type: 'text', content: 'Canonical' } },
  },
};

describe('canonical editor documents', () => {
  it('imports and projects canonical documents for the private canvas state', () => {
    expect(importFromJson(JSON.stringify(document))).toMatchObject({ document, errors: [] });
    expect(projectDocument(document).root.children[0]).toMatchObject({
      id: 'label',
      type: 'text',
      content: 'Canonical',
    });
  });

  it('rejects removed render-tree imports', () => {
    expect(importFromJson(JSON.stringify({ version: 'render-tree', root: { type: 'scene', children: [] } })))
      .toMatchObject({
        document: null,
        errors: expect.arrayContaining([expect.stringContaining('Expected version "2.0"')]),
      });
  });

  it('projects canonical base values and evaluates selected timeline frames only for preview', () => {
    const animated: ElucimDocument = {
      ...document,
      elements: {
        label: {
          ...document.elements.label,
          props: { ...document.elements.label.props, opacity: 1 },
        },
      },
      timelines: {
        intro: {
          id: 'intro',
          duration: 10,
          tracks: [{
            target: 'label',
            property: 'opacity',
            keyframes: [{ frame: 0, value: 0 }, { frame: 10, value: 1 }],
          }],
        },
      },
      defaultStateMachine: 'main',
      stateMachines: {
        main: {
          id: 'main',
          entry: 'intro',
          states: { intro: { timeline: 'intro' } },
          transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
        },
      },
    };

    expect(projectDocument(animated).root.children[0]).toMatchObject({ opacity: 1 });
    expect(resolvePreviewDocument(animated, [{ timelineId: 'intro', frame: 10 }])?.root.children[0])
      .toMatchObject({ opacity: 1 });
  });

  it('preserves animated base values when editing an unrelated element', () => {
    const animated: ElucimDocument = {
      version: '2.0',
      scene: { type: 'scene', children: ['animated', 'caption'] },
      elements: {
        animated: { id: 'animated', type: 'rect', props: { type: 'rect', opacity: 1 } },
        caption: { id: 'caption', type: 'text', props: { type: 'text', content: 'Before' } },
      },
      timelines: {
        intro: {
          id: 'intro',
          duration: 10,
          tracks: [{ target: 'animated', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 10, value: 1 }] }],
        },
      },
      defaultStateMachine: 'main',
      stateMachines: {
        main: {
          id: 'main',
          entry: 'intro',
          states: { intro: { timeline: 'intro' } },
          transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
        },
      },
    };

    const next = editorReducer(
      createInitialState(projectDocument(animated), undefined, animated),
      { type: 'UPDATE_ELEMENT', id: 'caption', changes: { content: 'After' } },
    );

    expect(next.canonicalDocument?.elements.animated.props.opacity).toBe(1);
    expect(next.canonicalDocument?.elements.caption.props.content).toBe('After');
  });

  it('keeps exported documents valid when a reveal target is deleted', () => {
    const animated: ElucimDocument = {
      version: '2.0',
      scene: { type: 'scene', children: ['title', 'caption'] },
      elements: {
        title: { id: 'title', type: 'text', props: { type: 'text', content: 'Title' } },
        caption: { id: 'caption', type: 'text', props: { type: 'text', content: 'Caption' } },
      },
      timelines: {
        intro: {
          id: 'intro',
          duration: 12,
          tracks: [],
          effects: [{
            id: 'reveal-copy',
            kind: 'reveal',
            targets: ['title', 'caption'],
            from: 0,
            duration: 12,
          }],
        },
      },
    };
    const initial = createInitialState(projectDocument(animated), undefined, animated);
    const next = editorReducer(initial, { type: 'DELETE_ELEMENTS', ids: ['title'] });

    expect(next.canonicalDocument?.timelines?.intro.effects).toEqual([{
      id: 'reveal-copy',
      kind: 'reveal',
      targets: ['caption'],
      from: 0,
      duration: 12,
    }]);
    expect(validateDocument(next.canonicalDocument).valid).toBe(true);
  });
});
