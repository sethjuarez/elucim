import { describe, expect, it } from 'vitest';
import type { ElucimDocument, RenderableDocument } from '@elucim/dsl';
import { validateDocument } from '@elucim/dsl';
import {
  createDocumentFromEditorState,
  mapSourceIdsToRestoredIds,
  restoreDocumentFromEditorState,
} from '../document/documentBridge';

const sourceDocument: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, children: ['title', 'metric'] },
  elements: {
    title: {
      id: 'title',
      type: 'text',
      layout: { x: 80, y: 120, scale: 1.1 },
      intent: { role: 'title', importance: 'primary' },
      props: { type: 'text', content: 'Before', opacity: 0 },
    },
    metric: {
      id: 'metric',
      type: 'text',
      intent: { role: 'metric' },
      props: { type: 'text', content: '42%', opacity: 1 },
    },
  },
  timelines: {
    intro: {
      id: 'intro',
      duration: 30,
      tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }],
    },
  },
  stateMachines: {
    presentation: {
      id: 'presentation',
      entry: 'intro',
      states: { intro: { timeline: 'intro' } },
      transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
    },
  },
  defaultStateMachine: 'presentation',
  metadata: { title: 'Bridge test' },
};

function editorDocument(...children: RenderableDocument['root']['children']): RenderableDocument {
  return {
    version: '1.0',
    root: {
      type: 'player',
      width: 800,
      height: 600,
      durationInFrames: 120,
      children,
    },
  };
}

describe('editor document bridge', () => {
  it('creates a canonical document from editor state without a source document', () => {
    const document = createDocumentFromEditorState(editorDocument({
      type: 'rect',
      id: 'card',
      x: 80,
      y: 96,
      width: 240,
      height: 120,
    }));

    expect(validateDocument(document).valid).toBe(true);
    expect(document.scene.children).toEqual(['card']);
    expect(document.elements.card.props).toMatchObject({ type: 'rect', x: 80, y: 96 });
  });

  it('restores canonical metadata, intent, layout, and renamed timeline targets from editor state', () => {
    const result = restoreDocumentFromEditorState(editorDocument(
      { type: 'text', id: 'hero-title', content: 'After', x: 120, y: 140 },
      { type: 'text', id: 'metric', content: '42%' },
    ), sourceDocument);

    expect(validateDocument(result.document).valid).toBe(true);
    expect(result.document.metadata?.title).toBe('Bridge test');
    expect(result.document.elements['hero-title'].intent).toMatchObject({ role: 'title', importance: 'primary' });
    expect(result.document.elements['hero-title'].layout).toMatchObject({ x: 120, y: 140, scale: 1.1 });
    expect(result.document.timelines?.intro.tracks[0].target).toBe('hero-title');
    expect(result.document.defaultStateMachine).toBe('presentation');
    expect(result.warnings).toContain('Element "title" was renamed to "hero-title"; timeline references were updated.');
  });

  it('prunes timeline links when editor output removes targeted elements', () => {
    const result = restoreDocumentFromEditorState(editorDocument(
      { type: 'text', id: 'metric', content: '42%' },
    ), sourceDocument);

    expect(validateDocument(result.document).valid).toBe(true);
    expect(result.document.timelines?.intro).toBeUndefined();
    expect(result.document.stateMachines?.presentation.states.intro.timeline).toBeUndefined();
    expect(result.warnings).toContain('Timeline "intro" has 1 track(s) targeting missing elements and will be omitted from document output.');
    expect(result.warnings).toContain('State "intro" in machine "presentation" references missing timeline "intro" and will lose that timeline link.');
  });

  it('does not map renamed IDs onto existing source IDs', () => {
    const restored = createDocumentFromEditorState(editorDocument(
      { type: 'text', id: 'metric', content: 'Renamed title collides with metric' },
      { type: 'text', id: 'metric-copy', content: 'Metric copy' },
    ));

    const idMap = mapSourceIdsToRestoredIds(sourceDocument, restored);

    expect(idMap.has('title')).toBe(false);
    expect(idMap.get('metric')).toBe('metric-copy');
  });

  it('fails loudly when restore source is not a canonical Elucim Document', () => {
    expect(() => restoreDocumentFromEditorState(editorDocument(), editorDocument() as unknown as ElucimDocument)).toThrow(
      'restoreDocumentFromEditorState requires a canonical Elucim Document source.',
    );
  });
});
