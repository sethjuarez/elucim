import { describe, expect, it } from 'vitest';
import {
  addElement,
  addRevealTimeline,
  applyAgentCommands,
  bringElementForward,
  bringElementToFront,
  checkLayoutForAgent,
  createAgentSafeDocument,
  createCalculusAccumulationScenePreset,
  createCalculusDerivativeScenePreset,
  createCalculusRiemannScenePreset,
  createComparisonScenePreset,
  createDocument,
  createStepCardPreset,
  createTextCalloutScenePreset,
  createThreeCardFlowScenePreset,
  createLoopingStateMachine,
  createStateMachine,
  evaluateSceneForAgent,
  getElementOrder,
  getAgentOperationCatalog,
  getTimelineBounds,
  inspectSceneForAgent,
  repairDocumentForAgent,
  reorderElement,
  sampleAnimationForAgent,
  sendElementBackward,
  sendElementToBack,
} from '../agent';
import {
  applyTimelineFrames,
  getInitialStateSnapshot,
  getStateMachineVisualFrames,
  transitionStateMachine,
  validateDocument,
  createTextBoxPreset,
  renderToSvgString,
} from '../index';

describe('agent authoring API', () => {
  it('creates a normalized starter document', () => {
    const doc = createDocument({
      preset: 'slide',
      metadata: { title: 'Derivative intuition', intent: 'Explain slope as local rate of change.' },
    });

    expect(doc).toMatchObject({
      version: '2.0',
      scene: {
        type: 'player',
        preset: 'slide',
        background: '$background',
        children: [],
      },
    });
    expect(validateDocument(doc).valid).toBe(true);
  });

  it('adds elements with stable ids and semantic intent', () => {
    const result = addElement(createDocument(), {
      id: 'title',
      type: 'text',
      props: { content: 'Slope' },
      layout: { x: 64, y: 72 },
      role: 'title',
      intent: { purpose: 'Introduce the concept' },
    });

    expect(result.document.scene.children).toEqual(['title']);
    expect(result.document.elements.title).toMatchObject({
      id: 'title',
      type: 'text',
      props: { type: 'text', content: 'Slope' },
      layout: { x: 64, y: 72 },
      role: 'title',
      intent: { purpose: 'Introduce the concept' },
    });
    expect(validateDocument(result.document).valid).toBe(true);
  });

  it('creates bounded textbox presets for agent-authored copy', () => {
    const [textbox] = createTextBoxPreset({
      id: 'summary',
      x: 80,
      y: 120,
      width: 320,
      height: 120,
      text: 'Use a textbox when generated copy must stay inside a known region.',
      autoFit: 'truncate',
      background: 'none',
      fontWeight: '600',
    });

    expect(textbox).toMatchObject({
      id: 'summary',
      type: 'textbox',
      layout: { x: 80, y: 120, width: 320, height: 120 },
      props: expect.objectContaining({
        type: 'textbox',
        content: 'Use a textbox when generated copy must stay inside a known region.',
        autoFit: 'truncate',
        fontWeight: '600',
        background: { fill: 'none', stroke: 'none', strokeWidth: 0 },
      }),
    });
    expect(validateDocument({
      version: '2.0',
      scene: { type: 'player', children: ['summary'] },
      elements: { summary: textbox },
    }).valid).toBe(true);
  });

  it('includes textbox helpers in the agent operation catalog', () => {
    expect(getAgentOperationCatalog().map(op => op.name)).toContain('createTextBoxPreset');
  });

  it('creates deterministic agent-safe text callout scenes from bounded textboxes', () => {
    const preset = createTextCalloutScenePreset({
      id: 'safe',
      title: 'How embeddings turn words into searchable meaning',
      subtitle: 'A bounded text-first scene for agent generated copy.',
      body: 'Embeddings place related ideas near each other so retrieval can find useful context even when the exact words differ.',
      callout: 'Start with textbox regions, then run checkLayoutForAgent and repairLayoutForAgent before presenting.',
    });
    const doc = createAgentSafeDocument(preset, {
      metadata: { title: 'Safe callout', intent: 'Demonstrate agent-safe text regions.' },
    });
    const again = createTextCalloutScenePreset({
      id: 'safe',
      title: 'How embeddings turn words into searchable meaning',
      subtitle: 'A bounded text-first scene for agent generated copy.',
      body: 'Embeddings place related ideas near each other so retrieval can find useful context even when the exact words differ.',
      callout: 'Start with textbox regions, then run checkLayoutForAgent and repairLayoutForAgent before presenting.',
    });

    expect(again).toEqual(preset);
    expect(validateDocument(doc).valid).toBe(true);
    expect(checkLayoutForAgent(doc)).toMatchObject({ errors: [], warnings: [] });
    expect(Object.values(doc.elements).filter(element => element.type === 'text')).toEqual([]);
    expect(Object.values(doc.elements).filter(element => element.type === 'textbox').length).toBeGreaterThanOrEqual(3);
  });

  it('creates agent-safe card flow scenes without raw authored copy', () => {
    const preset = createThreeCardFlowScenePreset({
      id: 'flow',
      title: 'Agent visual workflow',
      subtitle: 'Cards use textbox bounds so generated labels stay readable.',
      items: [
        { id: 'draft', title: 'Draft the scene', body: 'Create stable IDs and semantic intent before adding animation.' },
        { id: 'check', title: 'Check layout', body: 'Run layout preflight to catch overflow, tiny copy, and unintended overlaps.' },
        { id: 'repair', title: 'Repair safely', body: 'Apply safe repairs and keep review-level nudges explicit.' },
      ],
    });
    const doc = createAgentSafeDocument(preset);

    expect(validateDocument(doc).valid).toBe(true);
    expect(checkLayoutForAgent(doc)).toMatchObject({ errors: [], warnings: [] });
    expect(preset.rootElementIds).toEqual([
      'flow-title',
      'flow-subtitle',
      'draft',
      'check',
      'repair',
      'flow-draft-to-check',
      'flow-check-to-repair',
    ]);
    expect(authoredRawText(doc)).toEqual([]);
  });

  it('creates agent-safe comparison scenes with bounded table cells', () => {
    const preset = createComparisonScenePreset({
      id: 'compare',
      title: 'Prompting vs. agent workflows',
      rowsHeader: 'Criterion',
      columns: ['Prompt only', 'Agent workflow'],
      rows: [
        { id: 'state', label: 'State', cells: ['Usually implicit in chat history.', 'Stored in explicit documents, commands, and diffs.'] },
        { id: 'quality', label: 'Quality loop', cells: ['Manual review after generation.', 'Validate, inspect, repair, then render.'] },
      ],
    });
    const doc = createAgentSafeDocument(preset);

    expect(validateDocument(doc).valid).toBe(true);
    expect(checkLayoutForAgent(doc)).toMatchObject({ errors: [], warnings: [] });
    expect(doc.scene.children).toEqual(['compare-title', 'compare-table']);
    expect(doc.elements['compare-row-header-label'].props.content).toBe('Criterion');
    expect(authoredRawText(doc)).toEqual([]);
  });

  it('rejects comparison scenes with too many rows for the scene height', () => {
    expect(() => createComparisonScenePreset({
      id: 'dense',
      title: 'Too many rows',
      columns: ['A', 'B'],
      rows: Array.from({ length: 8 }, (_, index) => ({
        id: `row-${index + 1}`,
        label: `Row ${index + 1}`,
        cells: ['One', 'Two'],
      })),
    })).toThrow(/supports at most/);
  });

  it('creates agent-safe calculus derivative scenes with semantic calculus primitives', () => {
    const preset = createCalculusDerivativeScenePreset({
      id: 'derivative',
      fn: 'x^2',
      derivative: '2*x',
      x: 1,
      dx: 0.5,
    });
    const doc = createAgentSafeDocument(preset, {
      metadata: { title: 'Derivative lesson', intent: 'Teach secant-to-tangent intuition.' },
    });

    expect(validateDocument(doc).valid).toBe(true);
    expect(doc.scene.children).toEqual([
      'derivative-title',
      'derivative-subtitle',
      'derivative-axes',
      'derivative-curve',
      'derivative-secant',
      'derivative-tangent',
      'derivative-explain',
    ]);
    expect(doc.elements['derivative-secant']).toMatchObject({
      type: 'secantLine',
      props: expect.objectContaining({ type: 'secantLine', fn: 'x^2', dx: 0.5, showPoints: true }),
      intent: expect.objectContaining({ relationship: 'approximates tangent slope' }),
    });
    expect(doc.elements['derivative-axes'].props).toMatchObject({
      type: 'axes',
      domain: [-1, 4],
      range: [-1, 8],
      axisColor: '#94a3b8',
    });
    expect(doc.elements['derivative-curve'].props).toMatchObject({
      type: 'functionPlot',
      domain: [-1, 4],
      color: '#60a5fa',
    });
    expect(doc.elements['derivative-tangent']).toMatchObject({
      type: 'tangentLine',
      props: expect.objectContaining({ type: 'tangentLine', derivative: '2*x', showPoints: true }),
      intent: expect.objectContaining({ relationship: 'local derivative slope' }),
    });
    const svg = renderToSvgString(doc, 0);
    expect(svg).toContain('data-testid="elucim-secant-line"');
    expect(svg).toContain('data-testid="elucim-tangent-line"');
    expect(authoredRawText(doc)).toEqual([]);
  });

  it('creates agent-safe calculus Riemann and accumulation scenes', () => {
    const riemannDoc = createAgentSafeDocument(createCalculusRiemannScenePreset({
      id: 'riemann',
      fn: 'x^2',
      interval: [0, 3],
      n: 8,
      method: 'right',
    }));
    const accumulationDoc = createAgentSafeDocument(createCalculusAccumulationScenePreset({
      id: 'accumulate',
      fn: 'sin(x)+2',
      from: 0,
      to: 3,
      samples: 64,
    }));

    expect(validateDocument(riemannDoc).valid).toBe(true);
    expect(validateDocument(accumulationDoc).valid).toBe(true);
    expect(riemannDoc.elements['riemann-rectangles']).toMatchObject({
      type: 'riemannSum',
      props: expect.objectContaining({ type: 'riemannSum', interval: [0, 3], n: 8, method: 'right' }),
    });
    expect(accumulationDoc.elements['accumulate-area']).toMatchObject({
      type: 'accumulationArea',
      props: expect.objectContaining({ type: 'accumulationArea', from: 0, to: 3, samples: 64 }),
    });
    expect(renderToSvgString(riemannDoc, 0)).toContain('data-testid="elucim-riemann-sum"');
    expect(renderToSvgString(accumulationDoc, 0)).toContain('data-testid="elucim-accumulation-area"');
    expect(authoredRawText(riemannDoc)).toEqual([]);
    expect(authoredRawText(accumulationDoc)).toEqual([]);
  });

  it('rejects calculus presets with invalid runtime inputs before rendering', () => {
    expect(() => createCalculusRiemannScenePreset({
      id: 'bad-interval',
      interval: [2, 2],
    })).toThrow(/interval endpoints must be distinct/);
    expect(() => createCalculusRiemannScenePreset(JSON.parse('{"id":"bad-method","method":"center"}'))).toThrow(/method must be/);
  });

  it('uses textbox content inside step card presets for generated title and body copy', () => {
    const elements = createStepCardPreset({
      id: 'safe-card',
      x: 80,
      y: 120,
      width: 320,
      height: 160,
      title: 'Long agent-generated card title',
      body: 'Body copy is bounded by a textbox instead of loose raw SVG text.',
    });
    const byId = Object.fromEntries(elements.map(element => [element.id, element]));
    const group = byId['safe-card'];
    const title = byId['safe-card-title'];
    const body = byId['safe-card-body'];

    expect(group.children).toContain('safe-card-title');
    expect(group.children).toContain('safe-card-body');
    expect(title).toMatchObject({ type: 'textbox', role: 'title' });
    expect(body).toMatchObject({ type: 'textbox', role: 'body' });
  });

  it('keeps step card status text within its badge background', () => {
    const elements = createStepCardPreset({
      id: 'status-card',
      x: 80,
      y: 120,
      title: 'Status card',
      status: 'Done',
    });
    const byId = Object.fromEntries(elements.map(element => [element.id, element]));
    const background = byId['status-card-status-bg'].props;
    const status = byId['status-card-status'].props;

    expect(status.x).toBeGreaterThanOrEqual(background.x);
    expect(status.x + status.width).toBeLessThanOrEqual(background.x + background.width);
  });

  it('builds reveal timelines and a default state machine without wrapper animation props', () => {
    const withElements = applyAgentCommands(createDocument(), [
      { op: 'addElement', element: { id: 'title', type: 'text', props: { content: 'Slope' } } },
      { op: 'addElement', element: { id: 'axis', type: 'line', props: { x1: 100, y1: 360, x2: 700, y2: 360 } } },
      { op: 'addRevealTimeline', timeline: { id: 'intro', targets: ['title', 'axis'], preset: 'staggeredFadeIn', duration: 48 } },
      { op: 'createStateMachine', stateMachine: { id: 'main', timelineId: 'intro', start: 'onStart' } },
    ]).document;

    expect(withElements.timelines?.intro.tracks).toEqual([
      { target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 42, value: 1, easing: 'easeOutCubic' }] },
      { target: 'axis', property: 'opacity', keyframes: [{ frame: 6, value: 0 }, { frame: 48, value: 1, easing: 'easeOutCubic' }] },
    ]);
    expect(withElements.defaultStateMachine).toBe('main');
    expect(withElements.stateMachines?.main.states.intro.timeline).toBe('intro');
    expect(withElements.elements.title.props).not.toHaveProperty('fadeIn');
    expect(withElements.elements.title.props).not.toHaveProperty('draw');
    expect(validateDocument(withElements).valid).toBe(true);
  });

  function authoredRawText(doc: { elements: Record<string, { type: string; props: Record<string, unknown> }> }) {
    return Object.values(doc.elements)
      .filter(element => element.type === 'text')
      .filter(element => {
        const content = element.props.content;
        return typeof content === 'string' && !/^\d+$/.test(content.trim());
      });
  }

  it('authors Objects, state-machine-embedded animation, and agent-readable validation in one document workflow', () => {
    const result = applyAgentCommands(createDocument({
      metadata: { title: 'Concept flow', intent: 'Show a concept becoming visible.' },
    }), [
      {
        op: 'addElement',
        element: {
          id: 'concept-card',
          type: 'rect',
          props: { x: 80, y: 96, width: 240, height: 120, fill: '$surface', opacity: 0 },
          layout: { x: 80, y: 96, width: 240, height: 120 },
          role: 'object',
          intent: { purpose: 'Container for the core concept' },
        },
      },
      {
        op: 'addElement',
        element: {
          id: 'concept-label',
          type: 'text',
          props: { x: 112, y: 160, content: 'Elucim Document', fill: '$foreground', opacity: 0 },
          layout: { x: 112, y: 160 },
          role: 'label',
          intent: { purpose: 'Name the authored document model' },
        },
      },
      {
        op: 'addRevealTimeline',
        timeline: { id: 'reveal-concept', targets: ['concept-card', 'concept-label'], preset: 'staggeredFadeIn', duration: 48 },
      },
      {
        op: 'createStateMachine',
        stateMachine: { id: 'presentation', timelineId: 'reveal-concept', start: 'onStart', exitTo: 'exit' },
      },
    ]);

    const doc = result.document;
    expect(result.validation.valid).toBe(true);
    expect(doc.scene.children).toEqual(['concept-card', 'concept-label']);
    expect(doc.defaultStateMachine).toBe('presentation');

    const initial = getInitialStateSnapshot(doc, 'presentation');
    expect(initial).toMatchObject({
      machineId: 'presentation',
      stateId: 'reveal-concept',
      timelineId: 'reveal-concept',
      events: [],
    });

    const frames = getStateMachineVisualFrames(doc, 'presentation', {
      statePath: ['reveal-concept'],
      currentStateId: 'reveal-concept',
      currentFrame: 48,
    });
    expect(frames).toEqual(expect.arrayContaining([
      expect.objectContaining({ timelineId: 'reveal-concept', frame: 48 }),
    ]));

    const finalFrame = applyTimelineFrames(doc, frames);
    expect(finalFrame.elements['concept-card'].props.opacity).toBe(1);
    expect(finalFrame.elements['concept-label'].props.opacity).toBe(1);

    const exited = transitionStateMachine(doc, 'presentation', 'reveal-concept', 'next');
    expect(exited.exited).toBe(true);
  });

  it('reorders elements by sibling order instead of z-index', () => {
    const doc = applyAgentCommands(createDocument(), [
      { op: 'addElement', element: { id: 'background', type: 'rect', props: { x: 0, y: 0, width: 800, height: 600 } } },
      { op: 'addElement', element: { id: 'group', type: 'group', children: [], props: {} } },
      { op: 'addElement', element: { id: 'label', type: 'text', parentId: 'group', props: { content: 'Top' } } },
      { op: 'addElement', element: { id: 'badge', type: 'circle', parentId: 'group', props: { cx: 10, cy: 10, r: 8 } } },
    ]).document;

    const rootReordered = bringElementToFront(doc, 'background').document;
    expect(rootReordered.scene.children).toEqual(['group', 'background']);

    const nestedReordered = reorderElement(rootReordered, 'label', 1).document;
    expect(nestedReordered.elements.group.children).toEqual(['badge', 'label']);
    expect(getElementOrder(nestedReordered, 'label')[0]).toMatchObject({ parentId: 'group', index: 1, siblingCount: 2 });

    const movedBack = sendElementBackward(nestedReordered, 'label').document;
    expect(movedBack.elements.group.children).toEqual(['label', 'badge']);
    expect(bringElementForward(movedBack, 'label').document.elements.group.children).toEqual(['badge', 'label']);
    expect(sendElementToBack(rootReordered, 'background').document.scene.children).toEqual(['background', 'group']);
  });

  it('reports actionable agent quality issues and available nudges', () => {
    const report = evaluateSceneForAgent(addRevealTimeline(
      addElement(createDocument(), {
        id: 'headline',
        type: 'text',
        props: { content: 'Energy transfer', fill: '#ffffff' },
      }).document,
      { targets: ['headline'] },
    ).document);

    expect(report.valid).toBe(true);
    expect(report.issues.map(issue => issue.code)).toContain('missing-state-machine');
    expect(report.issues.map(issue => issue.code)).toContain('missing-metadata');
    expect(report.summary?.elementCount).toBe(1);
    expect(report.nudges.length).toBeGreaterThan(0);
    expect(report.polish?.score.overall).toBeLessThan(100);
    expect(report.polish?.diagnostics.map(diagnostic => diagnostic.id)).toContain('missing-intent');
    expect(report.heuristics?.bounds.map(bounds => bounds.id)).toContain('headline');
  });

  it('surfaces an operation catalog for agent tool planners', () => {
    const catalog = getAgentOperationCatalog();

    expect(catalog.map(operation => operation.name)).toContain('suggestSemanticLayoutNudges');
    expect(catalog.map(operation => operation.name)).toContain('inspectPolishHeuristics');
    expect(catalog.map(operation => operation.name)).toContain('createCalculusDerivativeScenePreset');
    expect(catalog.map(operation => operation.name)).toContain('createCalculusRiemannScenePreset');
    expect(catalog.map(operation => operation.name)).toContain('createCalculusAccumulationScenePreset');
    expect(catalog.find(operation => operation.name === 'suggestSemanticLayoutNudges')).toMatchObject({
      kind: 'layout',
      async: true,
    });
    expect(catalog.find(operation => operation.name === 'applyAgentCommands')).toMatchObject({
      kind: 'author',
      async: false,
    });
  });

  it('throws when timelines target missing elements', () => {
    expect(() => addRevealTimeline(createDocument(), { targets: ['missing'] })).toThrow(
      'addRevealTimeline requires at least one existing target',
    );
  });

  it('reserves state machine ids when commands are applied repeatedly', () => {
    const base = applyAgentCommands(createDocument(), [
      { op: 'addElement', element: { id: 'title', type: 'text', props: { content: 'Hello' } } },
      { op: 'addRevealTimeline', timeline: { id: 'intro', targets: ['title'] } },
      { op: 'createStateMachine', stateMachine: { id: 'main', timelineId: 'intro' } },
      { op: 'createStateMachine', stateMachine: { id: 'main', timelineId: 'intro' } },
    ]).document;

    expect(Object.keys(base.stateMachines ?? {})).toEqual(['main', 'main-2']);
    expect(base.defaultStateMachine).toBe('main');
  });

  it('reports and repairs timeline durations that are shorter than keyframes', () => {
    const broken = applyAgentCommands(createDocument(), [
      { op: 'addElement', element: { id: 'title', type: 'text', props: { content: 'Hello', opacity: 0 } } },
      {
        op: 'addTimeline',
        timeline: {
          id: 'intro',
          duration: 10,
          tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 24, value: 1 }] }],
        },
      },
    ]).document;

    const bounds = getTimelineBounds(broken);
    expect(bounds.issues).toEqual([{
      path: 'timelines.intro.duration',
      message: 'Timeline "intro" duration 10 is shorter than its last keyframe 24.',
      suggestedDuration: 24,
    }]);

    const repaired = repairDocumentForAgent(broken);
    expect(repaired.changed).toBe(true);
    expect(repaired.document.timelines?.intro.duration).toBe(24);
    expect(repaired.validation.valid).toBe(true);
    expect(repaired.diff).toContainEqual({ op: 'replace', path: '/timelines/intro/duration', value: 24 });
  });

  it('samples timeline frames to prove an animation changes', () => {
    const doc = applyAgentCommands(createDocument(), [
      { op: 'addElement', element: { id: 'title', type: 'text', props: { content: 'Hello', opacity: 0 } } },
      { op: 'addRevealTimeline', timeline: { id: 'intro', targets: ['title'], preset: 'fadeIn', duration: 20 } },
    ]).document;

    const sample = sampleAnimationForAgent(doc, 'intro', [0, 10, 20]);

    expect(sample.animated).toBe(true);
    expect(sample.samples[0].changedProperties).toEqual([]);
    expect(sample.samples[2].changedProperties).toContainEqual({ target: 'title', property: 'opacity', before: 0, after: 1 });
  });

  it('creates looping state machines for live preview playback', () => {
    const doc = applyAgentCommands(createDocument(), [
      { op: 'addElement', element: { id: 'title', type: 'text', props: { content: 'Hello' } } },
      { op: 'addRevealTimeline', timeline: { id: 'intro', targets: ['title'] } },
    ]).document;

    const result = createLoopingStateMachine(doc, { id: 'main', timelineId: 'intro' });

    expect(result.document.scene.loop).toBe(true);
    expect(result.document.defaultStateMachine).toBe('main');
    expect(result.document.stateMachines?.main.states.intro.timeline).toBe('intro');
  });

  it('inspects sampled frames for visibility, scale, and animation diagnostics', () => {
    const doc = applyAgentCommands(createDocument({ width: 800, height: 600, background: '#000000' }), [
      { op: 'addElement', element: { id: 'title', type: 'text', props: { content: 'Hello', x: 40, y: 80, fill: '#ffffff', opacity: 0, fontSize: 48 } } },
      { op: 'addRevealTimeline', timeline: { id: 'intro', targets: ['title'], preset: 'fadeIn', duration: 20 } },
    ]).document;

    const report = inspectSceneForAgent(doc, { timelineId: 'intro', frames: [0, 20] });

    expect(report.valid).toBe(true);
    expect(report.animated).toBe(true);
    expect(report.frameReports[0].visibleElementCount).toBe(0);
    expect(report.frameReports[1].visibleElementCount).toBe(1);
    expect(report.issues.map(issue => issue.code)).toContain('no-visible-elements');
    expect(report.issues.map(issue => issue.code)).toContain('tiny-scene');
  });

  it('flags off-canvas and low-contrast scene issues for agents', () => {
    const doc = applyAgentCommands(createDocument({ width: 800, height: 600, background: '#ffffff' }), [
      { op: 'addElement', element: { id: 'hidden', type: 'rect', props: { x: 900, y: 100, width: 80, height: 80, fill: '#ff0000' } } },
      { op: 'addElement', element: { id: 'label', type: 'text', props: { content: 'Faint', x: 80, y: 120, fill: '#eeeeee', fontSize: 24 } } },
    ]).document;

    const report = inspectSceneForAgent(doc);

    expect(report.frameReports[0].elements.find(element => element.id === 'hidden')?.visible).toBe(false);
    expect(report.issues.map(issue => issue.code)).toContain('low-contrast-elements');
  });
});
