import { describe, expect, it } from 'vitest';
import {
  addElement,
  addRevealTimeline,
  applyAgentCommands,
  bringElementForward,
  bringElementToFront,
  createDocument,
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
