import { describe, it, expect } from 'vitest';
import { exportEditorDocumentToJson, exportToJson, importFromJson } from '../utils/io';
import type { ElucimDocument as CanonicalElucimDocument, RenderableDocument as ElucimDocument } from '@elucim/dsl';

const validDoc: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'player',
    width: 800,
    height: 600,
    durationInFrames: 120,
    children: [
      { type: 'circle', id: 'c1', cx: 100, cy: 100, r: 50, fill: '#ff0000' },
      { type: 'rect', id: 'r1', x: 200, y: 200, width: 100, height: 80 },
    ],
  },
};

const canonicalDoc: CanonicalElucimDocument = {
  version: '2.0',
  metadata: { title: 'Canonical concept' },
  scene: { type: 'player', width: 800, height: 600, children: ['title'] },
  elements: {
    title: {
      id: 'title',
      type: 'text',
      layout: { x: 100, y: 120 },
      props: { type: 'text', content: 'Hello', x: 100, y: 120 },
    },
  },
  timelines: {
    intro: { id: 'intro', duration: 30, tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }] },
  },
  stateMachines: {
    deck: {
      id: 'deck',
      entry: 'intro',
      states: { intro: { timeline: 'intro' } },
      transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
      layout: { entry: { x: 20, y: 30 }, states: { intro: { x: 80, y: 90 } } },
    },
  },
  defaultStateMachine: 'deck',
};

// ─── Export ─────────────────────────────────────────────────────────────────

describe('exportToJson', () => {
  it('exports document as pretty JSON', () => {
    const json = exportToJson(validDoc);
    expect(json).toContain('"version": "1.0"');
    expect(json).toContain('"circle"');
    const parsed = JSON.parse(json);
    expect(parsed.root.children).toHaveLength(2);
  });

  it('exports compact JSON', () => {
    const json = exportToJson(validDoc, { pretty: false });
    expect(json).not.toContain('\n');
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
  });

  it('exports canonical editor documents when canonical state is available', () => {
    const json = exportEditorDocumentToJson(validDoc, canonicalDoc);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe('2.0');
    expect(parsed.metadata.title).toBe('Canonical concept');
    expect(parsed.timelines.intro.tracks[0].target).toBe('title');
    expect(parsed.stateMachines.deck.layout.states.intro).toEqual({ x: 80, y: 90 });
  });

  it('exports renderable editor documents as canonical documents when no canonical state is available', () => {
    const json = exportEditorDocumentToJson(validDoc);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe('2.0');
    expect(parsed.scene.children).toEqual(['c1', 'r1']);
    expect(parsed.elements.c1.props.type).toBe('circle');
  });
});

// ─── Import ─────────────────────────────────────────────────────────────────

describe('importFromJson', () => {
  it('imports valid document', () => {
    const json = JSON.stringify(validDoc);
    const result = importFromJson(json);
    expect(result.errors).toHaveLength(0);
    expect(result.document).not.toBeNull();
    expect(result.document!.root.type).toBe('player');
  });

  it('returns error for invalid JSON', () => {
    const result = importFromJson('not json');
    expect(result.document).toBeNull();
    expect(result.errors[0]).toContain('Invalid JSON');
  });

  it('returns error for missing version', () => {
    const result = importFromJson('{"root": {"type": "player"}}');
    expect(result.errors[0]).toContain('Unknown version');
  });

  it('returns error for missing root', () => {
    const result = importFromJson('{"version": "1.0"}');
    expect(result.errors[0]).toContain('Missing "root"');
  });

  it('imports canonical Elucim Documents through the editor projection adapter', () => {
    const result = importFromJson(JSON.stringify(canonicalDoc));

    expect(result.errors).toHaveLength(0);
    expect(result.document?.version).toBe('1.0');
    expect(result.document?.root.type).toBe('player');
    expect((result.document?.root as any).children[0]).toMatchObject({ type: 'text', id: 'title', content: 'Hello' });
    expect(result.canonicalDocument?.metadata?.title).toBe('Canonical concept');
    expect(result.canonicalDocument?.stateMachines?.deck.layout).toEqual({ entry: { x: 20, y: 30 }, states: { intro: { x: 80, y: 90 } } });
  });

  it('imports renderable JSON with a generated canonical document for editor state', () => {
    const result = importFromJson(JSON.stringify(validDoc));

    expect(result.errors).toHaveLength(0);
    expect(result.document?.version).toBe('1.0');
    expect(result.canonicalDocument?.version).toBe('2.0');
    expect(result.canonicalDocument?.scene.children).toEqual(['c1', 'r1']);
  });

  it('returns error for non-object', () => {
    const result = importFromJson('"hello"');
    expect(result.errors[0]).toContain('must be an object');
  });

  it('round-trips correctly', () => {
    const json = exportToJson(validDoc);
    const result = importFromJson(json);
    expect(result.errors).toHaveLength(0);
    expect(result.document!.root.type).toBe('player');
    expect((result.document!.root as any).children).toHaveLength(2);
  });
});
