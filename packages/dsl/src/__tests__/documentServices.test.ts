import { describe, expect, it } from 'vitest';
import { applyCommand, diffDocuments, summarizeDocument, validateForAgent } from '../index';
import type { ElucimDocument } from '../index';

const doc: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, children: ['title'] },
  elements: {
    title: {
      id: 'title',
      type: 'text',
      role: 'title',
      layout: { x: 100, y: 80 },
      props: { type: 'text', content: 'Hello' },
    },
  },
};

describe('agent-readable document services', () => {
  it('summarizes compact document structure for agents', () => {
    const summary = summarizeDocument(doc);

    expect(summary).toMatchObject({
      version: '2.0',
      elementCount: 1,
      scene: { type: 'player', width: 800, height: 600, children: ['title'] },
      timelines: [],
      stateMachines: [],
      issues: [],
    });
    expect(summary.elements[0]).toMatchObject({ id: 'title', type: 'text', role: 'title', layout: { x: 100, y: 80 } });
  });

  it('adds repair hints to validation errors', () => {
    const result = validateForAgent({
      version: '2.0',
      scene: { type: 'scene', children: ['missing'] },
      elements: { title: doc.elements.title },
    });

    expect(result.valid).toBe(false);
    expect(result.repairHints[0]).toMatchObject({
      path: 'scene.children[0]',
      code: 'missing-reference',
      suggestions: ['title'],
    });
  });

  it('reports unsupported old document versions without migration hints', () => {
    const result = validateForAgent({
      version: 1,
      type: 'visual',
      title: 'Old visual',
      elements: [],
    });

    expect(result.valid).toBe(false);
    expect(result.repairHints[0]).toMatchObject({
      path: 'version',
      code: 'unsupported-version',
    });
  });

  it('returns JSON-patch-shaped diffs between documents', () => {
    const after = applyCommand(doc, {
      op: 'moveElement',
      id: 'title',
      layout: { x: 140 },
    }).document;

    expect(diffDocuments(doc, after)).toContainEqual({
      op: 'replace',
      path: '/elements/title/layout/x',
      value: 140,
    });
  });
});
