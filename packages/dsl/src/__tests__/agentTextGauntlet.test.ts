import { describe, expect, it } from 'vitest';
import {
  checkLayoutForAgent,
  createAgentSafeDocument,
  createComparisonScenePreset,
  createDocument,
  createTextCalloutScenePreset,
  createThreeCardFlowScenePreset,
  evaluateSceneForAgent,
  repairLayoutForAgent,
  suggestLayoutRepairsForAgent,
} from '../agent';
import type { ElucimDocument } from '../index';

describe('agent text gauntlet', () => {
  it('keeps text-heavy safe presets clean under layout scoring', () => {
    const presets = [
      createTextCalloutScenePreset({
        id: 'callout',
        title: 'Retrieval augmented generation keeps answers grounded',
        subtitle: 'A text-heavy agent scene should start from bounded regions.',
        body: 'The agent retrieves relevant context, evaluates whether it is sufficient, and then composes an answer that cites the retrieved evidence instead of relying only on model memory.',
        callout: 'Bounded textboxes make the preflight check deterministic before the scene reaches the editor.',
      }),
      createThreeCardFlowScenePreset({
        id: 'flow',
        title: 'Agent text safety loop',
        subtitle: 'Generated prose stays inside explicit card regions.',
        items: [
          { id: 'draft', title: 'Draft bounded copy', body: 'Start from semantic presets that allocate readable text regions up front.' },
          { id: 'score', title: 'Score layout issues', body: 'Run the quality report and inspect layout diagnostics for overflow, tiny text, and overlaps.' },
          { id: 'repair', title: 'Repair safely', body: 'Apply safe fixes automatically and keep review-level movement or rewrites explicit.' },
        ],
      }),
      createComparisonScenePreset({
        id: 'compare',
        title: 'Prompt-only output vs. agent-safe output',
        rowsHeader: 'Concern',
        columns: ['Prompt only', 'Agent-safe scene'],
        rows: [
          { id: 'text', label: 'Text', cells: ['Loose SVG labels can overflow when copy gets longer.', 'Bounded textboxes wrap, shrink, truncate, and report layout issues.'] },
          { id: 'quality', label: 'Quality', cells: ['Problems are often discovered visually by the user.', 'Validation, scoring, repair suggestions, and editor smoke checks are part of the loop.'] },
        ],
      }),
    ];

    for (const preset of presets) {
      const doc = createAgentSafeDocument(preset, {
        metadata: { title: preset.rootElementIds[0], intent: 'Text gauntlet safe preset.' },
      });
      const layout = checkLayoutForAgent(doc);
      const quality = evaluateSceneForAgent(doc);

      expect(layout).toMatchObject({ valid: true, errors: [], warnings: [] });
      expect(quality.layout).toMatchObject({ valid: true, errors: [], warnings: [] });
      expect(quality.layoutRepairs).toEqual([]);
      expect(quality.issues.filter(issue => issue.severity === 'error')).toEqual([]);
      expect(quality.issues.map(issue => issue.code)).not.toContain('textbox-overflow');
      expect(authoredProseTextElements(doc)).toEqual([]);
    }
  });

  it('scores raw text overflow as an agent quality issue with actionable repairs', () => {
    const doc = rawOverflowDocument();

    const layout = checkLayoutForAgent(doc);
    const quality = evaluateSceneForAgent(doc);
    const repairs = suggestLayoutRepairsForAgent(doc, layout);

    expect(layout.valid).toBe(false);
    expect(layout.errors).toContainEqual(expect.objectContaining({
      code: 'text-overflows-width',
      affectedElementIds: ['risky-copy'],
    }));
    expect(quality.valid).toBe(false);
    expect(quality.score).toBeLessThan(100);
    expect(quality.issues).toContainEqual(expect.objectContaining({
      code: 'text-overflows-width',
      path: 'elements.risky-copy',
      suggestions: expect.arrayContaining([expect.stringContaining('wrap')]),
    }));
    expect(quality.layoutRepairs).toEqual(repairs);
    expect(repairs).toContainEqual(expect.objectContaining({
      action: 'update-text-wrapping',
      confidence: 'safe',
      targetElementId: 'risky-copy',
    }));
  });

  it('repairs unsafe generated text and converges on a stable second pass', () => {
    const first = repairLayoutForAgent(rawOverflowDocument());
    const second = repairLayoutForAgent(first.document);

    expect(first.changed).toBe(true);
    expect(first.converged).toBe(true);
    expect(first.before.valid).toBe(false);
    expect(first.after.valid).toBe(true);
    expect(first.after.issueCount).toBeLessThan(first.before.issueCount);
    expect(first.applied.map(item => item.suggestion.action)).toContain('update-text-wrapping');
    expect(second.before).toEqual(first.after);
    expect(second.changed).toBe(false);
    expect(second.after).toEqual(first.after);
  });

  it('repairs overflowing textboxes without hiding the original issue', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      metadata: { title: 'Textbox repair', intent: 'Exercise agent-safe repair suggestions.' },
      scene: { type: 'player', width: 640, height: 360, children: ['dense-box'] },
      elements: {
        'dense-box': {
          id: 'dense-box',
          type: 'textbox',
          role: 'body',
          intent: { importance: 'primary', generated: true },
          props: {
            type: 'textbox',
            x: 80,
            y: 80,
            width: 180,
            height: 52,
            content: 'This agent-authored paragraph is intentionally too dense for the original fixed textbox region.',
            fontSize: 20,
            autoFit: 'none',
          },
        },
      },
    };

    const repair = repairLayoutForAgent(doc);
    const quality = evaluateSceneForAgent(repair.document);

    expect(repair.before.errors).toContainEqual(expect.objectContaining({ code: 'textbox-overflow' }));
    expect(repair.changed).toBe(true);
    expect(repair.after.valid).toBe(true);
    expect(repair.applied).toContainEqual(expect.objectContaining({
      suggestion: expect.objectContaining({ action: 'resize-textbox', confidence: 'safe' }),
    }));
    expect(quality.layout.valid).toBe(true);
    expect(quality.issues.map(issue => issue.code)).not.toContain('textbox-overflow');
  });

  it('keeps invalid-document layout results empty instead of treating skipped layout as failed', () => {
    const doc = createDocument({
      width: 640,
      height: 360,
      metadata: { title: 'Invalid branch', intent: 'Exercise skipped layout branch.' },
    });
    doc.scene.children = ['missing-element'];

    const quality = evaluateSceneForAgent(doc);

    expect(quality.valid).toBe(false);
    expect(quality.validation.valid).toBe(false);
    expect(quality.layout).toMatchObject({ valid: true, issueCount: 0, errors: [], warnings: [], issues: [] });
    expect(quality.layoutRepairs).toEqual([]);
  });

  it('uses a parseable parent path for multi-element layout issues', () => {
    const doc: ElucimDocument = {
      version: '2.0',
      metadata: { title: 'Overlap path', intent: 'Exercise multi-element issue paths.' },
      scene: { type: 'player', width: 400, height: 240, children: ['a', 'b'] },
      elements: {
        a: { id: 'a', type: 'rect', props: { type: 'rect', x: 60, y: 90, width: 120, height: 80 } },
        b: { id: 'b', type: 'rect', props: { type: 'rect', x: 100, y: 110, width: 120, height: 80 } },
      },
    };

    const quality = evaluateSceneForAgent(doc);

    expect(quality.issues).toContainEqual(expect.objectContaining({
      code: 'element-overlap',
      path: 'elements',
    }));
  });
});

function rawOverflowDocument(): ElucimDocument {
  const doc = createDocument({
    width: 640,
    height: 360,
    metadata: { title: 'Raw overflow', intent: 'Exercise text issue scoring.' },
  });
  doc.scene.children = ['risky-copy'];
  doc.elements['risky-copy'] = {
    id: 'risky-copy',
    type: 'text',
    role: 'body',
    intent: { importance: 'primary', generated: true },
    props: {
      type: 'text',
      x: 64,
      y: 96,
      content: 'supercalifragilisticexpialidocious-supercalifragilisticexpialidocious',
      fontSize: 24,
      maxWidth: 120,
      wrap: 'word',
      fill: '$foreground',
    },
  };
  return doc;
}

function authoredProseTextElements(doc: ElucimDocument) {
  return Object.values(doc.elements)
    .filter(element => element.type === 'text')
    .filter(element => {
      const content = element.props.content;
      return typeof content === 'string' && /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(content);
    })
    .map(element => element.id);
}
