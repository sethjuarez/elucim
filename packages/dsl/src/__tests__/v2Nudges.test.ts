import { describe, expect, it } from 'vitest';
import { applyNudge, suggestDocumentNudges, validateV2, type ElucimV2Document } from '../index';

const doc: ElucimV2Document = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, durationInFrames: 90, children: ['title', 'metric'] },
  elements: {
    title: { id: 'title', type: 'text', layout: { x: 80, y: 80 }, props: { type: 'text', content: 'Revenue' } },
    metric: { id: 'metric', type: 'text', layout: { x: 80, y: 180 }, props: { type: 'text', content: '$2.4M' } },
  },
};

describe('v2 agentic nudges', () => {
  it('suggests deterministic command-backed nudges', () => {
    const nudges = suggestDocumentNudges(doc);

    expect(nudges.map(nudge => nudge.id)).toEqual(['mark-refined', 'normalize-root-layer-order', 'add-staggered-intro']);
    expect(nudges.every(nudge => nudge.commands.length > 0)).toBe(true);
  });

  it('applies nudges without mutating the original document', () => {
    const intro = suggestDocumentNudges(doc).find(nudge => nudge.id === 'add-staggered-intro')!;
    const result = applyNudge(doc, intro);

    expect(result.document.timelines?.['auto-intro'].tracks).toHaveLength(2);
    expect(validateV2(result.document).valid).toBe(true);
    expect(doc.timelines).toBeUndefined();
  });

  it('can normalize metadata and root layer order through commands', () => {
    const nudges = suggestDocumentNudges(doc).filter(nudge => nudge.id !== 'add-staggered-intro');
    const next = nudges.reduce((current, nudge) => applyNudge(current, nudge).document, doc);

    expect(next.metadata?.polishLevel).toBe('refined');
    expect(next.elements.title.layout?.zIndex).toBe(0);
    expect(next.elements.metric.layout?.zIndex).toBe(1);
  });
});
