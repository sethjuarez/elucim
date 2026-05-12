import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  createDocumentFromRenderable,
  createRenderableDocument,
  normalizeDocument,
  summarizeDocument,
  toRenderableDocument,
  validateDocument,
  type ElucimCommand,
  type ElucimDocument,
  type ElucimDocumentSummary,
  type ElucimElement,
  type ElucimStateMachine,
  type ElucimTimeline,
} from '../index';
import type { ElucimV2Document } from '../v2/types';

describe('canonical Elucim Document API', () => {
  it('exposes document, element, timeline, state machine, and command types without v1/v2 naming', () => {
    const element: ElucimElement = {
      id: 'title',
      type: 'text',
      props: { type: 'text', content: 'Elucim Document', opacity: 0 },
      layout: { x: 80, y: 120 },
      intent: { role: 'title' },
    };
    const timeline: ElucimTimeline = {
      id: 'intro',
      duration: 24,
      tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 24, value: 1 }] }],
    };
    const stateMachine: ElucimStateMachine = {
      id: 'presentation',
      entry: 'intro',
      states: { intro: { timeline: 'intro' } },
      transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
    };
    const document: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 800, height: 600, children: ['title'] },
      elements: { title: element },
      timelines: { intro: timeline },
      stateMachines: { presentation: stateMachine },
      defaultStateMachine: 'presentation',
    };
    const command: ElucimCommand = { op: 'updateMetadata', metadata: { title: 'Canonical document API' } };
    const aliasCheck: ElucimDocument = document as ElucimV2Document;

    const result = applyCommand(document, command);
    const summary: ElucimDocumentSummary = summarizeDocument(result.document);

    expect(validateDocument(result.document).valid).toBe(true);
    expect(aliasCheck.scene.children).toEqual(['title']);
    expect(summary.elementCount).toBe(1);
    expect(summary.timelines).toEqual(['intro']);
    expect(summary.stateMachines).toEqual(['presentation']);
  });

  it('exposes canonical document normalization and renderable compatibility helpers', () => {
    const renderable = {
      version: '1.0' as const,
      root: {
        type: 'player' as const,
        width: 640,
        height: 360,
        durationInFrames: 30,
        children: [{ id: 'label', type: 'text' as const, content: 'Renderable input' }],
      },
    };

    const normalized = normalizeDocument(renderable);
    const canonical = createDocumentFromRenderable(renderable);
    const renderableProjection = createRenderableDocument(canonical);
    const renderableFromUnknown = toRenderableDocument(canonical);

    expect(normalized.document).toEqual(canonical);
    expect(normalized.migrated).toBe(true);
    expect(validateDocument(canonical).valid).toBe(true);
    expect(renderableProjection.root.children).toHaveLength(1);
    expect(renderableFromUnknown.root.children).toHaveLength(1);
  });
});
