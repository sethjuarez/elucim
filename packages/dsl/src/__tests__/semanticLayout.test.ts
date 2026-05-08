import { describe, expect, it } from 'vitest';
import {
  applyNudge,
  planSemanticLayout,
  suggestSemanticLayoutNudges,
  validateV2,
  type ElucimDocument,
} from '../index';

function semanticFlowDoc(): ElucimDocument {
  return {
    version: '2.0',
    scene: { type: 'player', width: 900, height: 500, children: ['request', 'cache', 'database', 'note'] },
    elements: {
      request: {
        id: 'request',
        type: 'rect',
        role: 'step',
        intent: { role: 'step', importance: 'primary', flowTo: ['cache'] },
        layout: { x: 300, y: 160, width: 140, height: 70, rank: 1 },
        props: { x: 300, y: 160, width: 140, height: 70, fill: '$surface' },
      },
      cache: {
        id: 'cache',
        type: 'rect',
        role: 'decision',
        intent: { role: 'decision', importance: 'primary', flowFrom: ['request'], flowTo: ['database'] },
        layout: { x: 310, y: 170, width: 150, height: 80, rank: 2 },
        props: { x: 310, y: 170, width: 150, height: 80, fill: '$surface' },
      },
      database: {
        id: 'database',
        type: 'rect',
        role: 'step',
        intent: { role: 'step', importance: 'supporting', flowFrom: ['cache'] },
        layout: { x: 320, y: 180, width: 150, height: 80, rank: 3 },
        props: { x: 320, y: 180, width: 150, height: 80, fill: '$surface' },
      },
      note: {
        id: 'note',
        type: 'text',
        role: 'callout',
        intent: { role: 'callout', importance: 'supporting', target: 'cache', relationship: 'explains' },
        layout: { x: 315, y: 210, width: 220, height: 40 },
        props: { x: 315, y: 210, content: 'Cache hit avoids database work', fontSize: 18, fill: '$muted' },
      },
    },
  };
}

describe('semantic layout nudges', () => {
  it('validates semantic relationship metadata', () => {
    const result = validateV2(semanticFlowDoc());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects semantic relationships that reference missing elements', () => {
    const doc = semanticFlowDoc();
    doc.elements.cache.intent = { ...doc.elements.cache.intent, flowTo: ['missing'] };

    const result = validateV2(doc);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: 'elements.cache.intent.flowTo[0]',
      message: 'Unknown flow target "missing"',
      severity: 'error',
    });
  });

  it('rejects self-referential semantic relationships', () => {
    const doc = semanticFlowDoc();
    doc.elements.cache.intent = {
      ...doc.elements.cache.intent,
      target: 'cache',
      flowFrom: ['cache'],
      flowTo: ['cache'],
    };

    const result = validateV2(doc);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: 'elements.cache.intent.target',
      message: 'Element cannot target itself',
      severity: 'error',
    });
    expect(result.errors).toContainEqual({
      path: 'elements.cache.intent.flowFrom[0]',
      message: 'Element cannot flow from itself',
      severity: 'error',
    });
    expect(result.errors).toContainEqual({
      path: 'elements.cache.intent.flowTo[0]',
      message: 'Element cannot flow to itself',
      severity: 'error',
    });
  });

  it('plans an ELK-backed review nudge from explicit semantic flow', async () => {
    const doc = semanticFlowDoc();
    const nudges = await suggestSemanticLayoutNudges(doc);

    expect(nudges).toHaveLength(1);
    expect(nudges[0]).toMatchObject({
      id: 'semantic-layout-elk',
      confidence: 'review',
      category: 'layout',
    });
    expect(nudges[0].commands.length).toBeGreaterThan(0);

    const next = applyNudge(doc, nudges[0]).document;
    expect(next).not.toBe(doc);
    expect(next.elements.request.layout?.x).toBeLessThan(next.elements.cache.layout?.x ?? 0);
    expect(next.elements.cache.layout?.x).toBeLessThan(next.elements.database.layout?.x ?? 0);
    expect(validateV2(next).valid).toBe(true);
  });

  it('keeps locked elements fixed while arranging unlocked peers', async () => {
    const doc = semanticFlowDoc();
    doc.elements.request.layout = { ...doc.elements.request.layout, locked: true };

    const nudges = await suggestSemanticLayoutNudges(doc);
    const next = applyNudge(doc, nudges[0]).document;

    expect(next.elements.request.layout?.x).toBe(300);
    expect(next.elements.request.layout?.y).toBe(160);
    expect(next.elements.cache.layout?.x).not.toBe(310);
  });

  it('moves grouped callout children when the virtual group node moves', async () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 900, height: 500, children: ['concept', 'callout'] },
      elements: {
        concept: {
          id: 'concept',
          type: 'rect',
          intent: { role: 'concept', importance: 'primary' },
          layout: { x: 340, y: 190, width: 150, height: 90 },
          props: { x: 340, y: 190, width: 150, height: 90, fill: '$surface' },
        },
        callout: {
          id: 'callout',
          type: 'group',
          role: 'callout',
          intent: { role: 'callout', target: 'concept', relationship: 'explains' },
          layout: { x: 350, y: 200, width: 220, height: 80 },
          children: ['callout-card', 'callout-title'],
          props: {},
        },
        'callout-card': {
          id: 'callout-card',
          type: 'rect',
          parentId: 'callout',
          props: { x: 350, y: 200, width: 220, height: 80, fill: '$surface', stroke: '$primary' },
        },
        'callout-title': {
          id: 'callout-title',
          type: 'text',
          parentId: 'callout',
          props: { x: 370, y: 235, content: 'Why it matters', fontSize: 18, fill: '$title' },
        },
      },
    };

    const plan = await planSemanticLayout(doc);
    expect(plan?.commands.filter(command => command.op === 'updateElement').length).toBeGreaterThanOrEqual(2);

    const next = applyNudge(doc, { id: plan!.id, title: plan!.title, description: plan!.description, confidence: 'review', commands: plan!.commands }).document;
    expect(next.elements.callout.layout?.x).not.toBe(350);
    expect(next.elements['callout-card'].props.x).not.toBe(350);
    expect(next.elements['callout-title'].props.x).not.toBe(370);
  });

  it('moves Bezier connector control points with their endpoints', async () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 900, height: 500, children: ['start', 'end', 'flow'] },
      elements: {
        start: {
          id: 'start',
          type: 'rect',
          intent: { role: 'step', flowTo: ['end'] },
          layout: { x: 340, y: 160, width: 120, height: 70, rank: 1 },
          props: { x: 340, y: 160, width: 120, height: 70 },
        },
        end: {
          id: 'end',
          type: 'rect',
          intent: { role: 'step', flowFrom: ['start'] },
          layout: { x: 360, y: 180, width: 120, height: 70, rank: 2 },
          props: { x: 360, y: 180, width: 120, height: 70 },
        },
        flow: {
          id: 'flow',
          type: 'bezierCurve',
          intent: { role: 'connector', flowFrom: ['start'], flowTo: ['end'] },
          props: { x1: 460, y1: 195, cx1: 500, cy1: 195, cx2: 320, cy2: 215, x2: 360, y2: 215, stroke: '$primary', endCap: 'arrow' },
        },
      },
    };

    const [nudge] = await suggestSemanticLayoutNudges(doc);
    const next = applyNudge(doc, nudge).document;

    const before = doc.elements.flow.props as Record<string, number>;
    const after = next.elements.flow.props as Record<string, number>;
    const deltaX = after.x1 - before.x1;
    const deltaY = after.y1 - before.y1;
    expect(Math.abs(deltaX) + Math.abs(deltaY)).toBeGreaterThan(0);
    expect(after.cx1).toBe(before.cx1 + deltaX);
    expect(after.cy1).toBe(before.cy1 + deltaY);
    expect(after.cx2).toBe(before.cx2 + deltaX);
    expect(after.cy2).toBe(before.cy2 + deltaY);
  });

  it('does not move locked children inside a semantic group', async () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 900, height: 500, children: ['concept', 'callout'] },
      elements: {
        concept: {
          id: 'concept',
          type: 'rect',
          intent: { role: 'concept', importance: 'primary' },
          layout: { x: 340, y: 190, width: 150, height: 90 },
          props: { x: 340, y: 190, width: 150, height: 90, fill: '$surface' },
        },
        callout: {
          id: 'callout',
          type: 'group',
          role: 'callout',
          intent: { role: 'callout', target: 'concept', relationship: 'explains' },
          layout: { x: 350, y: 200, width: 220, height: 80 },
          children: ['callout-card', 'callout-title'],
          props: {},
        },
        'callout-card': {
          id: 'callout-card',
          type: 'rect',
          parentId: 'callout',
          props: { x: 350, y: 200, width: 220, height: 80, fill: '$surface', stroke: '$primary' },
        },
        'callout-title': {
          id: 'callout-title',
          type: 'text',
          parentId: 'callout',
          layout: { locked: true },
          props: { x: 370, y: 235, content: 'Why it matters', fontSize: 18, fill: '$title' },
        },
      },
    };

    const [nudge] = await suggestSemanticLayoutNudges(doc);
    const next = applyNudge(doc, nudge).document;

    expect(next.elements['callout-card'].props.x).not.toBe(350);
    expect(next.elements['callout-title'].props.x).toBe(370);
    expect(next.elements['callout-title'].props.y).toBe(235);
  });
});
