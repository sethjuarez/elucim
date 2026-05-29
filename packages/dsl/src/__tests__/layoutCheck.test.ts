import { describe, expect, it } from 'vitest';
import { checkLayoutForAgent, createDocument, repairLayoutForAgent, suggestLayoutRepairsForAgent } from '../agent';
import type { ElucimDocument } from '../index';

describe('layout preflight checks', () => {
  it('reports overflowing raw text and overlapping elements', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 400, height: 240, children: ['caption', 'a', 'b'] },
      elements: {
        caption: {
          id: 'caption',
          type: 'text',
          props: {
            type: 'text',
            x: 20,
            y: 40,
            content: 'supercalifragilisticexpialidocious',
            fontSize: 20,
            maxWidth: 90,
            wrap: 'word',
          },
        },
        a: {
          id: 'a',
          type: 'rect',
          props: { type: 'rect', x: 60, y: 90, width: 120, height: 80 },
        },
        b: {
          id: 'b',
          type: 'rect',
          props: { type: 'rect', x: 100, y: 110, width: 120, height: 80 },
        },
      },
    };

    const result = checkLayoutForAgent(doc);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'text-overflows-width',
      affectedElementIds: ['caption'],
    }));
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: 'element-overlap',
      affectedElementIds: ['a', 'b'],
    }));

    const repairs = suggestLayoutRepairsForAgent(doc, result);
    expect(repairs).toContainEqual(expect.objectContaining({
      action: 'update-text-wrapping',
      targetElementId: 'caption',
      confidence: 'safe',
      command: expect.objectContaining({
        op: 'updateElement',
        id: 'caption',
        patch: { props: { wrap: 'char' } },
      }),
    }));
    expect(repairs).toContainEqual(expect.objectContaining({
      action: 'move-element',
      targetElementId: 'a',
      confidence: 'review',
    }));
  });

  it('reports textbox overflow and suspiciously tiny shrink output', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 400, height: 240, children: ['fixed', 'shrinking'] },
      elements: {
        fixed: {
          id: 'fixed',
          type: 'textbox',
          props: {
            type: 'textbox',
            x: 20,
            y: 20,
            width: 120,
            height: 48,
            content: 'This generated paragraph has far too many words for a fixed-size box.',
            fontSize: 20,
            autoFit: 'none',
          },
        },
        shrinking: {
          id: 'shrinking',
          type: 'textbox',
          props: {
            type: 'textbox',
            x: 180,
            y: 20,
            width: 150,
            height: 62,
            content: 'Dense generated explanation that only fits by becoming unreadably small.',
            fontSize: 22,
            minFontSize: 8,
            autoFit: 'shrink',
          },
        },
      },
    };

    const result = checkLayoutForAgent(doc);

    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'textbox-overflow',
      affectedElementIds: ['fixed'],
    }));
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: 'textbox-tiny-font',
      affectedElementIds: ['shrinking'],
    }));

    const repairs = suggestLayoutRepairsForAgent(doc, result);
    expect(repairs).toContainEqual(expect.objectContaining({
      action: 'resize-textbox',
      targetElementId: 'fixed',
      confidence: 'safe',
      command: expect.objectContaining({
        id: 'fixed',
        patch: { props: expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }) },
      }),
    }));
    expect(repairs).toContainEqual(expect.objectContaining({
      action: 'resize-textbox',
      targetElementId: 'shrinking',
      confidence: 'review',
    }));
  });

  it('warns instead of failing when raw text only has layout width', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 400, height: 240, children: ['label'] },
      elements: {
        label: {
          id: 'label',
          type: 'text',
          layout: { width: 80 },
          props: {
            type: 'text',
            x: 20,
            y: 40,
            content: 'This renderer-visible text is long but layout.width alone does not wrap it.',
            fontSize: 18,
          },
        },
      },
    };

    const result = checkLayoutForAgent(doc);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: 'text-layout-width-without-maxwidth',
      affectedElementIds: ['label'],
    }));
    expect(suggestLayoutRepairsForAgent(doc, result)).toContainEqual(expect.objectContaining({
      action: 'update-text-wrapping',
      targetElementId: 'label',
      command: expect.objectContaining({
        patch: { props: { maxWidth: 80, wrap: 'word' } },
      }),
    }));
  });

  it('does not warn for ordinary one-line textbox truncation', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 400, height: 240, children: ['badge'] },
      elements: {
        badge: {
          id: 'badge',
          type: 'textbox',
          props: {
            type: 'textbox',
            x: 20,
            y: 40,
            width: 160,
            height: 44,
            content: 'This longer badge label will be shortened.',
            fontSize: 18,
            autoFit: 'truncate',
          },
        },
      },
    };

    const result = checkLayoutForAgent(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('passes agent-safe textbox copy with intentional container overlap ignored', () => {
    const doc = createDocument();
    doc.scene.children = ['card', 'label'];
    doc.elements.card = {
      id: 'card',
      type: 'rect',
      parentId: 'group',
      role: 'container',
      props: { type: 'rect', x: 40, y: 40, width: 280, height: 120, fill: '$surface' },
    };
    doc.elements.label = {
      id: 'label',
      type: 'textbox',
      parentId: 'group',
      props: {
        type: 'textbox',
        x: 58,
        y: 56,
        width: 244,
        height: 88,
        content: 'Bounded copy uses deterministic wrapping and stays readable.',
        autoFit: 'shrink',
        background: { fill: 'none', stroke: 'none', strokeWidth: 0 },
      },
    };

    const result = checkLayoutForAgent(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('applies safe layout repairs without mutating the original document', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 400, height: 240, children: ['caption'] },
      elements: {
        caption: {
          id: 'caption',
          type: 'text',
          props: {
            type: 'text',
            x: 20,
            y: 40,
            content: 'supercalifragilisticexpialidocious',
            fontSize: 20,
            maxWidth: 90,
          },
        },
      },
    };

    const result = repairLayoutForAgent(doc);

    expect(result.changed).toBe(true);
    expect(result.converged).toBe(true);
    expect(result.before.valid).toBe(false);
    expect(result.after.valid).toBe(true);
    expect(result.applied.map(item => item.suggestion.command?.patch.props)).toEqual([
      { wrap: 'word' },
      { wrap: 'char' },
    ]);
    expect(result.document.elements.caption.props.wrap).toBe('char');
    expect(doc.elements.caption.props.wrap).toBeUndefined();
  });

  it('skips review-level overlap moves in safe repair mode', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 400, height: 240, children: ['a', 'b'] },
      elements: {
        a: {
          id: 'a',
          type: 'rect',
          props: { type: 'rect', x: 60, y: 90, width: 120, height: 80 },
        },
        b: {
          id: 'b',
          type: 'rect',
          props: { type: 'rect', x: 100, y: 110, width: 120, height: 80 },
        },
      },
    };

    const result = repairLayoutForAgent(doc);

    expect(result.changed).toBe(false);
    expect(result.after.valid).toBe(true);
    expect(result.after.warnings).toContainEqual(expect.objectContaining({ code: 'element-overlap' }));
    expect(result.skipped).toContainEqual(expect.objectContaining({
      reason: 'review-not-selected',
      suggestion: expect.objectContaining({ action: 'move-element' }),
    }));
  });
});
