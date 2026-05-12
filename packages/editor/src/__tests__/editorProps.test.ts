import { describe, it, expect } from 'vitest';
import type { ElucimDocument, RenderableDocument as RenderableEditorDocument } from '@elucim/dsl';
import { createInitialState, createDefaultDocument } from '../state/types';
import { resolveInitialFrame, resolvePreviewDocument } from '../document/documentLifecycle';

// ─── initialFrame="last" resolution ────────────────────────────────────────

describe('initialFrame="last" resolution', () => {
  it('resolves "last" to durationInFrames - 1', () => {
    const doc: RenderableEditorDocument = {
      version: '1.0',
      root: {
        type: 'player',
        width: 800,
        height: 600,
        durationInFrames: 120,
        children: [],
      },
    };
    expect(resolveInitialFrame('last', doc)).toBe(119);
  });

  it('resolves "last" to 0 when durationInFrames is 1', () => {
    const doc: RenderableEditorDocument = {
      version: '1.0',
      root: {
        type: 'player',
        width: 800,
        height: 600,
        durationInFrames: 1,
        children: [],
      },
    };
    expect(resolveInitialFrame('last', doc)).toBe(0);
  });

  it('resolves "last" to 0 when no document provided', () => {
    expect(resolveInitialFrame('last', undefined)).toBe(0);
  });

  it('passes numeric values through unchanged', () => {
    expect(resolveInitialFrame(42, undefined)).toBe(42);
    expect(resolveInitialFrame(0, undefined)).toBe(0);
  });

  it('passes undefined through unchanged', () => {
    expect(resolveInitialFrame(undefined, undefined)).toBeUndefined();
  });
});

// ─── createInitialState with initialFrame ──────────────────────────────────

describe('createInitialState with initialFrame', () => {
  it('sets currentFrame from initialFrame parameter', () => {
    const doc: RenderableEditorDocument = {
      version: '1.0',
      root: {
        type: 'player',
        width: 800,
        height: 600,
        durationInFrames: 120,
        children: [],
      },
    };
    const state = createInitialState(doc, 59);
    expect(state.currentFrame).toBe(59);
  });

  it('defaults currentFrame to 0 when no initialFrame', () => {
    const state = createInitialState(createDefaultDocument());
    expect(state.currentFrame).toBe(0);
  });
});

// ─── Default toolbar position ──────────────────────────────────────────────

describe('default toolbar position', () => {
  it('starts with offset from corner', () => {
    const state = createInitialState(createDefaultDocument());
    expect(state.toolbarPosition.x).toBeGreaterThanOrEqual(20);
    expect(state.toolbarPosition.y).toBeGreaterThanOrEqual(20);
  });
});

describe('preview document resolution', () => {
  const document: ElucimDocument = {
    version: '2.0',
    scene: { type: 'player', width: 800, height: 600, children: ['card'] },
    elements: {
      card: {
        id: 'card',
        type: 'rect',
        props: { type: 'rect', x: 0, y: 0, width: 100, height: 60, opacity: 0 },
      },
    },
    timelines: {
      intro: {
        id: 'intro',
        duration: 30,
        tracks: [{ target: 'card', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }],
      },
    },
  };

  it('returns undefined without a live document or valid preview frames', () => {
    expect(resolvePreviewDocument(undefined, [{ timelineId: 'intro', frame: 30 }])).toBeUndefined();
    expect(resolvePreviewDocument(document, undefined)).toBeUndefined();
    expect(resolvePreviewDocument(document, [{ timelineId: 'missing', frame: 30 }])).toBeUndefined();
  });

  it('applies valid preview timeline frames and returns a renderable projection', () => {
    const preview = resolvePreviewDocument(document, [{ timelineId: 'intro', frame: 30 }]);
    const card = preview?.root.children[0] as { opacity?: number };

    expect(preview?.version).toBe('1.0');
    expect(card.opacity).toBe(1);
  });
});
