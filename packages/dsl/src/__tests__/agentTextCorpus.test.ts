import { describe, expect, it } from 'vitest';
import {
  createAgentSafeDocument,
  createComparisonScenePreset,
  createDocument,
  createTextCalloutScenePreset,
  createThreeCardFlowScenePreset,
  evaluateSceneForAgent,
  repairLayoutForAgent,
} from '../agent';
import type { AgentQualityReport, ElucimLayoutRepairAction } from '../agent';
import type { ElucimDocument } from '../index';

type CorpusExpectation = 'safe' | 'repairable-error' | 'repairable-warning' | 'review' | 'invalid';

interface CorpusFixture {
  name: string;
  document: ElucimDocument;
  expectation: CorpusExpectation;
  expectedIssueCodes: string[];
  expectedRepairActions?: ElucimLayoutRepairAction[];
  minSafeScore?: number;
  expectedInvalidCodes?: string[];
}

describe('agent text corpus', () => {
  for (const fixture of textCorpus()) {
    it(`${fixture.name} follows deterministic quality and repair expectations`, () => {
      const before = evaluateSceneForAgent(fixture.document);

      expect(issueCodes(before)).toEqual(expect.arrayContaining(fixture.expectedIssueCodes));
      if (fixture.expectedInvalidCodes) {
        expect(issueCodes(before)).toEqual(expect.arrayContaining(fixture.expectedInvalidCodes));
      }

      const repaired = repairLayoutForAgent(fixture.document);
      const after = evaluateSceneForAgent(repaired.document);
      const secondPass = repairLayoutForAgent(repaired.document);

      expect(after.score).toBeGreaterThanOrEqual(before.score);
      expect(after.layout.issueCount).toBeLessThanOrEqual(before.layout.issueCount);
      expect(secondPass.changed).toBe(false);
      expect(secondPass.before).toEqual(repaired.after);
      expect(secondPass.after).toEqual(repaired.after);

      switch (fixture.expectation) {
        case 'safe':
          expect(before.valid).toBe(true);
          expect(before.layout.issues).toEqual([]);
          expect(before.score).toBeGreaterThanOrEqual(fixture.minSafeScore ?? 70);
          expect(repaired.changed).toBe(false);
          break;
        case 'repairable-error':
          expect(before.valid).toBe(false);
          expect(repaired.changed).toBe(true);
          expect(repaired.converged).toBe(true);
          expect(after.valid).toBe(true);
          expect(appliedRepairActions(repaired)).toEqual(expect.arrayContaining(fixture.expectedRepairActions ?? []));
          break;
        case 'repairable-warning':
          expect(before.valid).toBe(true);
          expect(before.layout.warnings.length).toBeGreaterThan(0);
          expect(repaired.changed).toBe(true);
          expect(repaired.converged).toBe(true);
          expect(after.valid).toBe(true);
          expect(appliedRepairActions(repaired)).toEqual(expect.arrayContaining(fixture.expectedRepairActions ?? []));
          break;
        case 'review':
          expect(before.valid).toBe(true);
          expect(before.layout.warnings.length).toBeGreaterThan(0);
          expect(before.layoutRepairs.some(repair => repair.confidence === 'review')).toBe(true);
          expect(repaired.changed).toBe(false);
          break;
        case 'invalid':
          expect(before.valid).toBe(false);
          expect(before.validation.valid).toBe(false);
          expect(before.layout).toMatchObject({ valid: true, issueCount: 0, errors: [], warnings: [], issues: [] });
          expect(repaired.changed).toBe(false);
          break;
      }
    });
  }
});

function textCorpus(): CorpusFixture[] {
  return [
    {
      name: 'safe-callout-with-verbose-prose',
      document: createAgentSafeDocument(createTextCalloutScenePreset({
        id: 'safe-callout',
        title: 'Grounded answers need bounded evidence regions',
        subtitle: 'This fixture mimics a verbose agent explanation that should remain safe.',
        body: 'The retrieval step gathers compact facts, ranks them for relevance, and gives the response generator a bounded evidence region so the final answer can stay concise without losing important context.',
        callout: 'Safe presets should be boring in the best way: no layout errors, no repair suggestions, and a stable score.',
      }), {
        metadata: { title: 'Safe callout', intent: 'Agent-safe verbose callout.' },
      }),
      expectation: 'safe',
      expectedIssueCodes: [],
    },
    {
      name: 'safe-card-flow-with-agent-copy',
      document: createAgentSafeDocument(createThreeCardFlowScenePreset({
        id: 'safe-card-flow',
        title: 'Agent layout feedback loop',
        subtitle: 'A three-card explanation with generated prose in each bounded card.',
        items: [
          { id: 'draft', title: 'Draft', body: 'Generate the scene from semantic presets instead of positioning every text line manually.' },
          { id: 'score', title: 'Score', body: 'Run quality and layout checks before handing the document to a human or editor workflow.' },
          { id: 'repair', title: 'Repair', body: 'Apply safe deterministic fixes and leave judgment calls visible for review.' },
        ],
      }), {
        metadata: { title: 'Safe card flow', intent: 'Agent-safe card flow.' },
      }),
      expectation: 'safe',
      expectedIssueCodes: [],
    },
    {
      name: 'safe-comparison-with-dense-cells',
      document: createAgentSafeDocument(createComparisonScenePreset({
        id: 'safe-comparison',
        title: 'Loose output vs. agent-safe output',
        rowsHeader: 'Concern',
        columns: ['Loose output', 'Agent-safe output'],
        rows: [
          { id: 'copy', label: 'Copy', cells: ['Long labels often become raw SVG text with fragile line breaks.', 'Bounded cells wrap and shrink copy predictably.'] },
          { id: 'repair', label: 'Repair', cells: ['Failures are usually found only after visual review.', 'The layout preflight reports deterministic issues and safe fixes.'] },
          { id: 'handoff', label: 'Handoff', cells: ['The user has to infer what went wrong from the final rendering.', 'The quality report gives agents actionable issue codes.'] },
        ],
      }), {
        metadata: { title: 'Safe comparison', intent: 'Agent-safe comparison table.' },
      }),
      expectation: 'safe',
      expectedIssueCodes: [],
    },
    {
      name: 'raw-url-token-overflows-width',
      document: rawTextDocument({
        id: 'url-caption',
        content: 'https://example.com/research/2026/05/28/super-long-agent-generated-reference-token-that-needs-character-wrapping',
        maxWidth: 160,
        wrap: 'word',
      }),
      expectation: 'repairable-error',
      expectedIssueCodes: ['text-overflows-width'],
      expectedRepairActions: ['update-text-wrapping'],
    },
    {
      name: 'raw-code-token-overflows-width',
      document: rawTextDocument({
        id: 'code-caption',
        content: 'constDeterministicLayoutCorpusShouldCatchThisUnbrokenIdentifierBeforeHumansSeeIt',
        maxWidth: 150,
        wrap: 'word',
      }),
      expectation: 'repairable-error',
      expectedIssueCodes: ['text-overflows-width'],
      expectedRepairActions: ['update-text-wrapping'],
    },
    {
      name: 'raw-prose-with-layout-width-only',
      document: rawTextDocument({
        id: 'layout-only',
        content: 'This is agent-authored prose with only layout.width, so the renderer-visible text is not actually bounded.',
        layoutWidth: 130,
      }),
      expectation: 'repairable-warning',
      expectedIssueCodes: ['text-layout-width-without-maxwidth'],
      expectedRepairActions: ['update-text-wrapping'],
    },
    {
      name: 'raw-wide-prose-without-bounds',
      document: rawTextDocument({
        id: 'wide-raw',
        content: 'This generated explanation is far longer than a safe single line should be when no explicit text bounds are present.',
      }),
      expectation: 'repairable-warning',
      expectedIssueCodes: ['raw-text-too-wide'],
      expectedRepairActions: ['update-text-wrapping'],
    },
    {
      name: 'fixed-textbox-overflows',
      document: textboxDocument({
        id: 'fixed-box',
        width: 180,
        height: 54,
        content: 'This dense generated paragraph is intentionally too long for a tiny fixed textbox and should be resized safely.',
        autoFit: 'none',
      }),
      expectation: 'repairable-error',
      expectedIssueCodes: ['textbox-overflow'],
      expectedRepairActions: ['resize-textbox'],
    },
    {
      name: 'tiny-shrink-textbox-stays-reviewable',
      document: textboxDocument({
        id: 'tiny-shrink',
        width: 150,
        height: 52,
        content: 'Dense generated explanation that only fits by becoming too small to comfortably read.',
        autoFit: 'shrink',
        minFontSize: 8,
      }),
      expectation: 'review',
      expectedIssueCodes: ['textbox-tiny-font'],
    },
    {
      name: 'overlapping-card-labels-stay-reviewable',
      document: overlappingCardsDocument(),
      expectation: 'review',
      expectedIssueCodes: ['element-overlap'],
    },
    {
      name: 'missing-element-skips-layout-safely',
      document: missingElementDocument(),
      expectation: 'invalid',
      expectedIssueCodes: ['invalid-document'],
    },
  ];
}

function issueCodes(report: AgentQualityReport): string[] {
  return report.issues.map(issue => issue.code);
}

function appliedRepairActions(result: ReturnType<typeof repairLayoutForAgent>): ElucimLayoutRepairAction[] {
  return result.applied.map(item => item.suggestion.action);
}

function rawTextDocument(options: {
  id: string;
  content: string;
  maxWidth?: number;
  wrap?: 'word' | 'char' | 'none';
  layoutWidth?: number;
}): ElucimDocument {
  const doc = createDocument({
    width: 640,
    height: 360,
    metadata: { title: options.id, intent: 'Deterministic corpus raw text fixture.' },
  });
  doc.scene.children = [options.id];
  doc.elements[options.id] = {
    id: options.id,
    type: 'text',
    role: 'body',
    intent: { generated: true, importance: 'primary' },
    ...(options.layoutWidth ? { layout: { width: options.layoutWidth } } : {}),
    props: {
      type: 'text',
      x: 64,
      y: 120,
      content: options.content,
      fontSize: 24,
      fill: '$foreground',
      ...(options.maxWidth ? { maxWidth: options.maxWidth } : {}),
      ...(options.wrap ? { wrap: options.wrap } : {}),
    },
  };
  return doc;
}

function textboxDocument(options: {
  id: string;
  content: string;
  width: number;
  height: number;
  autoFit: 'none' | 'shrink' | 'truncate';
  minFontSize?: number;
}): ElucimDocument {
  const doc = createDocument({
    width: 640,
    height: 360,
    metadata: { title: options.id, intent: 'Deterministic corpus textbox fixture.' },
  });
  doc.scene.children = [options.id];
  doc.elements[options.id] = {
    id: options.id,
    type: 'textbox',
    role: 'body',
    intent: { generated: true, importance: 'primary' },
    props: {
      type: 'textbox',
      x: 72,
      y: 72,
      width: options.width,
      height: options.height,
      content: options.content,
      fontSize: 22,
      autoFit: options.autoFit,
      ...(options.minFontSize ? { minFontSize: options.minFontSize } : {}),
    },
  };
  return doc;
}

function overlappingCardsDocument(): ElucimDocument {
  const doc = createDocument({
    width: 640,
    height: 360,
    metadata: { title: 'overlapping cards', intent: 'Deterministic overlap fixture.' },
  });
  doc.scene.children = ['left-card', 'right-card'];
  doc.elements['left-card'] = {
    id: 'left-card',
    type: 'rect',
    role: 'body',
    intent: { generated: true, importance: 'primary' },
    props: { type: 'rect', x: 120, y: 96, width: 220, height: 120, fill: '$surface' },
  };
  doc.elements['right-card'] = {
    id: 'right-card',
    type: 'rect',
    role: 'body',
    intent: { generated: true, importance: 'secondary' },
    props: { type: 'rect', x: 260, y: 136, width: 220, height: 120, fill: '$surfaceAlt' },
  };
  return doc;
}

function missingElementDocument(): ElucimDocument {
  const doc = createDocument({
    width: 640,
    height: 360,
    metadata: { title: 'missing element', intent: 'Deterministic invalid fixture.' },
  });
  doc.scene.children = ['not-present'];
  return doc;
}
