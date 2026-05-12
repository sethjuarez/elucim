import { describe, expect, it } from 'vitest';
import {
  analyzePolish,
  applyNudge,
  createAutoLayoutGroupPreset,
  createBadgePreset,
  createBoundaryPreset,
  createCalloutCardPreset,
  createCardGridPreset,
  createComparisonTablePreset,
  createConnectorPreset,
  createDecisionNodePreset,
  createProgressiveRevealGroupPreset,
  createQueueStackPreset,
  createTimelineRoadmapPreset,
  createStepCardPreset,
  createTextBlockPreset,
  inspectPolishHeuristics,
  suggestDocumentNudges,
  validateDocument,
  type ElucimDocument,
} from '../index';

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
    expect(validateDocument(result.document).valid).toBe(true);
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
    expect(validateDocument(next).valid).toBe(true);
  });

  it('exposes raw heuristic evidence for agents to interrogate', () => {
    const heuristicDoc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 240, height: 180, children: ['a', 'b', 'label', 'flow'] },
      elements: {
        a: { id: 'a', type: 'rect', props: { x: 20, y: 20, width: 100, height: 80, fill: '#ff0000' }, intent: { flowTo: ['b'] }, layout: { rank: 0 } },
        b: { id: 'b', type: 'rect', props: { x: 80, y: 60, width: 120, height: 100, fill: '$surface' }, intent: { flowFrom: ['a'] }, layout: { rank: 1, locked: true } },
        label: { id: 'label', type: 'text', props: { x: 210, y: 190, content: 'tiny', fontSize: 10, fill: 'red' } },
        flow: { id: 'flow', type: 'arrow', props: { x1: 120, y1: 60, x2: 200, y2: 110, stroke: '$primary', lineStyle: 'dashed' } },
      },
    };

    const heuristics = inspectPolishHeuristics(heuristicDoc);

    expect(heuristics.intersections).toContainEqual(expect.objectContaining({ ids: ['a', 'b'], area: 1600 }));
    expect(heuristics.offCanvas.map(item => item.id)).toContain('label');
    expect(heuristics.text).toContainEqual(expect.objectContaining({ id: 'label', belowMinimumSize: true }));
    expect(heuristics.colors).toContainEqual(expect.objectContaining({ id: 'a', literalColors: [{ prop: 'fill', value: '#ff0000' }] }));
    expect(heuristics.semanticRelationships).toContainEqual(expect.objectContaining({ id: 'b', flowFrom: ['a'], rank: 1, locked: true }));
    expect(heuristics.connectorContinuations).toContainEqual(expect.objectContaining({
      id: 'flow',
      type: 'arrow',
      fromElementId: 'a',
      toElementId: 'b',
      suggestedCurve: expect.objectContaining({ endCap: 'arrow', lineStyle: 'dashed', strokeLinecap: 'round' }),
    }));
  });

  it('suggests a review nudge to smooth connector continuations', () => {
    const connectorDoc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 500, height: 300, children: ['start', 'end', 'flow'] },
      elements: {
        start: { id: 'start', type: 'rect', props: { x: 40, y: 80, width: 100, height: 80 } },
        end: { id: 'end', type: 'rect', props: { x: 300, y: 120, width: 100, height: 80 } },
        flow: { id: 'flow', type: 'arrow', props: { x1: 140, y1: 120, x2: 300, y2: 160, stroke: '$primary' } },
      },
    };

    const nudge = suggestDocumentNudges(connectorDoc).find(candidate => candidate.id === 'smooth-connector-continuations');
    expect(nudge?.confidence).toBe('review');
    if (!nudge) throw new Error('Expected smooth connector nudge');

    const next = applyNudge(connectorDoc, nudge).document;
    expect(next.elements.flow.type).toBe('bezierCurve');
    expect(next.elements.flow.props).toMatchObject({
      type: 'bezierCurve',
      cx1: expect.any(Number),
      cy1: expect.any(Number),
      cx2: expect.any(Number),
      cy2: expect.any(Number),
      endCap: 'arrow',
      strokeLinecap: 'round',
    });
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
    expect(validateDocument(presetDoc).valid).toBe(true);
  });

  it('creates editable composite helpers as ordinary grouped elements', () => {
    const step = createStepCardPreset({
      id: 'draft',
      x: 80,
      y: 100,
      title: 'Draft the diagram',
      body: 'Start with semantic cards instead of loose rectangles and labels.',
      index: 1,
      status: 'ready',
      rank: 0,
    });
    const textBlock = createTextBlockPreset({
      id: 'notes',
      x: 420,
      y: 100,
      width: 260,
      text: 'Wrapped text becomes editable lines while preserving the text block grouping.',
    });
    const grid = createCardGridPreset({
      id: 'workflow',
      x: 80,
      y: 280,
      columns: 2,
      items: [
        { id: 'grid-draft', title: 'Draft', body: 'Generate the first scene.' },
        { id: 'grid-polish', title: 'Polish', body: 'Review layout and spacing.' },
      ],
    });
    const connector = createConnectorPreset({
      id: 'draft-to-notes',
      from: 'draft',
      to: 'notes',
      fromBounds: { id: 'draft', x: 80, y: 100, width: 300, height: 134 },
      toBounds: { id: 'notes', x: 420, y: 100, width: 260, height: 48 },
      label: 'explains',
    });
    const roots = ['draft', 'notes', 'workflow', 'draft-to-notes'];
    const elements = [...step, ...textBlock, ...grid, ...connector];
    const presetDoc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 900, height: 650, children: roots },
      elements: Object.fromEntries(elements.map(element => [element.id, element])),
    };

    expect(presetDoc.elements.draft.type).toBe('group');
    expect(presetDoc.elements.draft.children).toContain('draft-card');
    expect(presetDoc.elements.notes.type).toBe('group');
    expect(presetDoc.elements.workflow.children).toEqual(['grid-draft', 'grid-polish']);
    expect(presetDoc.elements['draft-to-notes']).toMatchObject({
      type: 'group',
      role: 'connector',
      intent: { flowFrom: ['draft'], flowTo: ['notes'], relationship: 'flows-to' },
    });
    expect(presetDoc.elements['draft-to-notes-curve'].type).toBe('bezierCurve');
    expect(validateDocument(presetDoc).valid).toBe(true);
  });

  it('creates the remaining suggestion-table composites as editable elements', () => {
    const badge = createBadgePreset({ id: 'badge', x: 40, y: 40, label: 'beta' });
    const boundary = createBoundaryPreset({ id: 'system-boundary', x: 30, y: 90, width: 260, height: 180, label: 'System' });
    const decision = createDecisionNodePreset({ id: 'cache-hit', x: 330, y: 80, text: 'Cache hit?', rank: 1 });
    const queue = createQueueStackPreset({
      id: 'work-queue',
      x: 40,
      y: 320,
      title: 'Queue',
      items: [{ label: 'Request' }, { label: 'Render', status: 'active' }],
    });
    const roadmap = createTimelineRoadmapPreset({
      id: 'roadmap',
      x: 360,
      y: 280,
      milestones: [{ label: 'Draft' }, { label: 'Polish' }, { label: 'Publish' }],
    });
    const comparison = createComparisonTablePreset({
      id: 'tradeoffs',
      x: 40,
      y: 470,
      columns: ['Agent', 'Human'],
      rows: [{ label: 'Strength', cells: ['Fast draft', 'Final taste'] }],
    });
    const reveal = createProgressiveRevealGroupPreset({ id: 'progressive', targets: ['badge', 'cache-hit'], stagger: 5 });
    const autoLayout = createAutoLayoutGroupPreset({
      id: 'auto-layout',
      x: 720,
      y: 90,
      direction: 'stack',
      items: [{
        id: 'auto-child',
        element: {
          id: 'auto-child',
          type: 'rect',
          role: 'card',
          layout: { width: 120, height: 80 },
          props: { type: 'rect', x: 0, y: 0, width: 120, height: 80, fill: '$surface' },
        },
      }],
    });
    const roots = ['badge', 'system-boundary', 'cache-hit', 'work-queue', 'roadmap', 'tradeoffs', 'progressive', 'auto-layout'];
    const elements = [...badge, ...boundary, ...decision, ...queue, ...roadmap, ...comparison, ...reveal.elements, ...autoLayout];
    const presetDoc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 1000, height: 700, children: roots },
      elements: Object.fromEntries(elements.map(element => [element.id, element])),
      timelines: { [reveal.timeline.id]: reveal.timeline },
    };

    expect(presetDoc.elements.badge.role).toBe('badge');
    expect(presetDoc.elements['system-boundary'].role).toBe('boundary');
    expect(presetDoc.elements['cache-hit']).toMatchObject({ type: 'group', role: 'decisionNode' });
    expect(presetDoc.elements['work-queue'].intent?.role).toBe('stack');
    expect(presetDoc.elements.roadmap.intent?.role).toBe('timeline');
    expect(presetDoc.elements.tradeoffs.role).toBe('comparisonTable');
    expect(presetDoc.elements['auto-layout'].role).toBe('autoLayoutGroup');
    expect(presetDoc.timelines?.['progressive-reveal'].tracks).toHaveLength(2);
    expect(validateDocument(presetDoc).valid).toBe(true);
  });
});
