import { describe, expect, it } from 'vitest';
import type { ElucimDocument, RenderableDocument } from '@elucim/dsl';
import { validateDocument } from '@elucim/dsl';
import { createDocumentFromEditorState, normalizeInitialDocument } from '../document/documentBridge';

const renderableDocument: RenderableDocument = {
  version: '1.0',
  root: {
    type: 'player',
    width: 800,
    height: 600,
    durationInFrames: 120,
    children: [
      { type: 'rect', id: 'card', x: 80, y: 96, width: 240, height: 120 },
    ],
  },
};

const canonicalDocument: ElucimDocument = {
  version: '2.0',
  metadata: { title: 'Bridge compatibility' },
  scene: { type: 'player', width: 800, height: 600, children: ['card'] },
  elements: {
    card: {
      id: 'card',
      type: 'rect',
      layout: { x: 80, y: 96, rank: 1 },
      props: { type: 'rect', x: 80, y: 96, width: 240, height: 120 },
    },
  },
  timelines: {
    intro: {
      id: 'intro',
      duration: 30,
      tracks: [{ target: 'card', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }],
    },
  },
  stateMachines: {
    deck: {
      id: 'deck',
      entry: 'intro',
      states: { intro: { timeline: 'intro' } },
      transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
      layout: { entry: { x: -180, y: 0 }, states: { intro: { x: 80, y: 40 } } },
    },
  },
  defaultStateMachine: 'deck',
};

describe('editor document compatibility helpers', () => {
  it('returns renderable documents unchanged for editor projection initialization', () => {
    expect(normalizeInitialDocument(renderableDocument)).toBe(renderableDocument);
  });

  it('normalizes canonical Elucim Documents into renderable editor projections', () => {
    const normalized = normalizeInitialDocument(canonicalDocument);

    expect(normalized?.version).toBe('1.0');
    expect(normalized?.root.type).toBe('player');
    expect((normalized?.root as any).children[0]).toMatchObject({ type: 'rect', id: 'card', x: 80, y: 96 });
  });

  it('rejects invalid canonical Elucim Documents before projection', () => {
    const invalid: ElucimDocument = {
      ...canonicalDocument,
      scene: { ...canonicalDocument.scene, children: ['missing-card'] },
    };

    expect(() => normalizeInitialDocument(invalid)).toThrow('Invalid editor document:');
  });

  it('creates canonical Elucim Documents from renderable compatibility imports', () => {
    const document = createDocumentFromEditorState(renderableDocument);

    expect(validateDocument(document).valid).toBe(true);
    expect(document.version).toBe('2.0');
    expect(document.scene.children).toEqual(['card']);
    expect(document.elements.card.props).toMatchObject({ type: 'rect', x: 80, y: 96 });
  });
});
