import { describe, expect, it } from 'vitest';
import { analyzePolish, applyNudge, createCalloutCardPreset, suggestDocumentNudges, validateV2, type ElucimDocument } from '../index';

const doc: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, children: ['title', 'metric'] },
  elements: {
    title: { id: 'title', type: 'text', layout: { x: 80, y: 80 }, props: { type: 'text', content: 'Revenue' } },
    metric: { id: 'metric', type: 'text', layout: { x: 80, y: 180 }, props: { type: 'text', content: '$2.4M' } },
  },
};

describe('document polish nudges', () => {
  it('suggests deterministic command-backed nudges', () => {
    const nudges = suggestDocumentNudges(doc);

    expect(nudges.map(nudge => nudge.id)).toEqual(['mark-refined', 'add-staggered-intro', 'polish-title-hierarchy']);
    expect(nudges.every(nudge => nudge.commands.length > 0)).toBe(true);
  });

  it('applies nudges without mutating the original document', () => {
    const intro = suggestDocumentNudges(doc).find(nudge => nudge.id === 'add-staggered-intro')!;
    const result = applyNudge(doc, intro);

    expect(result.document.timelines?.['auto-intro'].tracks).toHaveLength(2);
    expect(validateV2(result.document).valid).toBe(true);
    expect(doc.timelines).toBeUndefined();
  });

  it('can normalize metadata through commands', () => {
    const nudges = suggestDocumentNudges(doc).filter(nudge => nudge.id !== 'add-staggered-intro');
    const next = nudges.reduce((current, nudge) => applyNudge(current, nudge).document, doc);

    expect(next.metadata?.polishLevel).toBe('refined');
    expect(next.elements.title.role).toBe('title');
    expect(next.elements.title.props.fontSize).toBe(40);
    expect(next.scene.children).toEqual(['title', 'metric']);
  });

  it('reports polish diagnostics and lays out graph nodes through commands', () => {
    const graphDoc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 800, height: 600, children: ['graph'] },
      elements: {
        graph: {
          id: 'graph',
          type: 'graph',
          props: {
            nodes: [
              { id: 'a', label: 'A', x: 100, y: 100, radius: 24 },
              { id: 'b', label: 'B', x: 110, y: 104, radius: 24 },
              { id: 'c', label: 'C', x: 120, y: 108, radius: 24 },
            ],
            edges: [
              { from: 'a', to: 'b', directed: true },
              { from: 'b', to: 'c', directed: true },
            ],
          },
        },
      },
    };

    expect(analyzePolish(graphDoc).diagnostics.map(diagnostic => diagnostic.id)).toContain('graph-node-overlap-graph');
    const graphNudge = suggestDocumentNudges(graphDoc).find(nudge => nudge.id === 'layout-graph-graph');
    expect(graphNudge?.category).toBe('graph');
    if (!graphNudge) throw new Error('Expected graph layout nudge');

    const next = applyNudge(graphDoc, graphNudge).document;
    expect(next.elements.graph.props.nodes).toMatchObject([
      { id: 'a', x: expect.any(Number), y: expect.any(Number) },
      { id: 'b', x: expect.any(Number), y: expect.any(Number) },
      { id: 'c', x: expect.any(Number), y: expect.any(Number) },
    ]);
    expect(validateV2(next).valid).toBe(true);
  });

  it('creates token-based explanatory callout presets', () => {
    const elements = createCalloutCardPreset({
      id: 'agent-note',
      x: 80,
      y: 120,
      title: 'Important relationship',
      body: 'This callout gives agents a polished explanatory primitive.',
    });
    const presetDoc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 800, height: 600, children: ['agent-note'] },
      elements: Object.fromEntries(elements.map(element => [element.id, element])),
    };

    expect(presetDoc.elements['agent-note'].role).toBe('callout');
    expect(presetDoc.elements['agent-note-card'].props.fill).toBe('$surface');
    expect(validateV2(presetDoc).valid).toBe(true);
  });
});
