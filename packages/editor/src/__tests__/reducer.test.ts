import { describe, it, expect } from 'vitest';
import { editorReducer, findElementById, collectAllIds } from '../state/reducer';
import { CANVAS_ID, createInitialState, createDefaultDocument } from '../state/types';
import type { EditorState } from '../state/types';
import type { ElucimDocument as CanonicalElucimDocument, RenderableDocument as ElucimDocument, CircleNode, GraphNode, MatrixNode, RectNode, LineNode, TextNode } from '@elucim/dsl';

// ─── Helpers ───────────────────────────────────────────────────────────────

function stateWithElements(...elements: any[]): EditorState {
  const doc: ElucimDocument = {
    version: 'render-tree',
    root: {
      type: 'player',
      width: 800,
      height: 600,
      durationInFrames: 120,
      children: elements,
    },
  };
  return createInitialState(doc);
}

function stateWithCanonicalDocument(): EditorState {
  const renderableDoc: ElucimDocument = {
    version: 'render-tree',
    root: {
      type: 'player',
      width: 800,
      height: 600,
      durationInFrames: 120,
      children: [circle1, rect1],
    },
  };
  const canonicalDocument: CanonicalElucimDocument = {
    version: '2.0',
    metadata: { title: 'Canonical editor state' },
    scene: { type: 'player', width: 800, height: 600, children: ['c1', 'r1'] },
    elements: {
      c1: {
        id: 'c1',
        type: 'circle',
        intent: { role: 'source' },
        props: { type: 'circle', cx: 100, cy: 100, r: 50 },
      },
      r1: {
        id: 'r1',
        type: 'rect',
        props: { type: 'rect', x: 50, y: 50, width: 100, height: 80 },
      },
    },
    timelines: {
      intro: { id: 'intro', duration: 30, tracks: [{ target: 'c1', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }] },
    },
    stateMachines: {
      presentation: {
        id: 'presentation',
        entry: 'intro',
        states: { intro: { timeline: 'intro' } },
        transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
      },
    },
    defaultStateMachine: 'presentation',
  };
  return createInitialState(renderableDoc, undefined, canonicalDocument);
}

const circle1: CircleNode = { type: 'circle', id: 'c1', cx: 100, cy: 100, r: 50 };
const circle2: CircleNode = { type: 'circle', id: 'c2', cx: 300, cy: 200, r: 30 };
const rect1: RectNode = { type: 'rect', id: 'r1', x: 50, y: 50, width: 100, height: 80 };
const line1: LineNode = { type: 'line', id: 'l1', x1: 0, y1: 0, x2: 200, y2: 200 };

// ─── createInitialState ────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('creates default state with empty document', () => {
    const state = createInitialState();
    expect(state.selectedIds).toEqual(['__canvas__']);
    expect(state.inspectorPinned).toBe(true);
    expect(state.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
    expect(state.currentFrame).toBe(0);
    expect(state.isPlaying).toBe(false);
    expect(state.isCameraFraming).toBe(false);
    expect(state.activeTool).toBe('select');
    expect(state.document.version).toBe('render-tree');
    expect((state.document.root as any).width).toBe(1920);
    expect((state.document.root as any).height).toBe(1080);
  });

  it('accepts initialFrame', () => {
    const state = createInitialState(undefined, 42);
    expect(state.currentFrame).toBe(42);
  });

  it('accepts a custom document', () => {
    const doc: ElucimDocument = {
      version: 'render-tree',
      root: { type: 'scene', width: 400, height: 300, durationInFrames: 60, children: [circle1] },
    };
    const state = createInitialState(doc);
    expect(state.document.root.type).toBe('scene');
  });

  it('carries a canonical Elucim Document shadow model', () => {
    const renderableDoc: ElucimDocument = {
      version: 'render-tree',
      root: { type: 'scene', width: 400, height: 300, durationInFrames: 60, children: [circle1] },
    };
    const canonicalDocument: CanonicalElucimDocument = {
      version: '2.0',
      metadata: { title: 'Canonical source' },
      scene: { type: 'player', width: 400, height: 300, children: ['c1'] },
      elements: {
        c1: { id: 'c1', type: 'circle', props: { type: 'circle', cx: 100, cy: 100, r: 50 } },
      },
      timelines: {
        intro: { id: 'intro', duration: 30, tracks: [{ target: 'c1', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }] },
      },
    };

    const state = createInitialState(renderableDoc, undefined, canonicalDocument);

    expect(state.canonicalDocument).toBe(canonicalDocument);
    expect(state.canonicalDocument?.metadata?.title).toBe('Canonical source');
    expect(state.canonicalDocument?.timelines?.intro.tracks[0].target).toBe('c1');
  });
});

// ─── Selection ─────────────────────────────────────────────────────────────

describe('selection actions', () => {
  it('SELECT sets selected IDs', () => {
    const state = stateWithElements(circle1, rect1);
    const next = editorReducer(state, { type: 'SELECT', ids: ['c1'] });
    expect(next.selectedIds).toEqual(['c1']);
  });

  describe('camera framing action', () => {
    it('toggles framing mode without creating an undo history entry', () => {
      const state = stateWithElements(circle1);
      const next = editorReducer(state, { type: 'SET_CAMERA_FRAMING', framing: true, timelineId: 'focus' });

      expect(next.isCameraFraming).toBe(true);
      expect(next.cameraFramingTimelineId).toBe('focus');
      expect(next.past).toEqual([]);
      const complete = editorReducer(next, { type: 'SET_CAMERA_FRAMING', framing: false });
      expect(complete.isCameraFraming).toBe(false);
      expect(complete.cameraFramingTimelineId).toBeUndefined();
    });

    it('tracks the timeline selected by motion authoring', () => {
      const next = editorReducer(stateWithElements(circle1), { type: 'SET_ACTIVE_TIMELINE', timelineId: 'focus' });

      expect(next.activeTimelineId).toBe('focus');
    });

    it('captures the framing playhead and applies timeline camera edits as one undoable action', () => {
      let state = stateWithCanonicalDocument();
      state = editorReducer(state, { type: 'SET_CAMERA_FRAMING', framing: true, timelineId: 'intro', frame: 12 });

      expect(state.cameraFramingFrame).toBe(12);

      state = editorReducer(state, {
        type: 'UPDATE_TIMELINE_CAMERA',
        timelineId: 'intro',
        camera: {
          keyframes: [{ frame: 12, viewport: { x: 80, y: 60, width: 400, height: 300 } }],
        },
      });
      expect(state.canonicalDocument?.timelines?.intro.camera?.keyframes).toEqual([
        { frame: 12, viewport: { x: 80, y: 60, width: 400, height: 300 } },
      ]);

      state = editorReducer(state, { type: 'UNDO' });
      expect(state.canonicalDocument?.timelines?.intro.camera).toBeUndefined();

      state = editorReducer(state, { type: 'REDO' });
      expect(state.canonicalDocument?.timelines?.intro.camera?.keyframes).toEqual([
        { frame: 12, viewport: { x: 80, y: 60, width: 400, height: 300 } },
      ]);
    });
  });

  it('SELECT_ADD adds to selection', () => {
    let state = stateWithElements(circle1, rect1);
    state = editorReducer(state, { type: 'SELECT', ids: ['c1'] });
    state = editorReducer(state, { type: 'SELECT_ADD', id: 'r1' });
    expect(state.selectedIds).toEqual(['c1', 'r1']);
  });

  it('SELECT_ADD replaces the canvas sentinel with the first real element', () => {
    const state = editorReducer(stateWithElements(circle1), { type: 'SELECT_ADD', id: 'c1' });
    expect(state.selectedIds).toEqual(['c1']);
  });

  it('SELECT_ADD does not duplicate', () => {
    let state = stateWithElements(circle1);
    state = editorReducer(state, { type: 'SELECT', ids: ['c1'] });
    state = editorReducer(state, { type: 'SELECT_ADD', id: 'c1' });
    expect(state.selectedIds).toEqual(['c1']);
  });

  it('SELECT_TOGGLE toggles selection', () => {
    let state = stateWithElements(circle1, rect1);
    // starts with ['__canvas__'] — toggle c1 on
    state = editorReducer(state, { type: 'SELECT_TOGGLE', id: 'c1' });
    expect(state.selectedIds).toEqual(['c1']);
    // toggle c1 off
    state = editorReducer(state, { type: 'SELECT_TOGGLE', id: 'c1' });
    expect(state.selectedIds).not.toContain('c1');
  });

  it('DESELECT_ALL clears selection', () => {
    let state = stateWithElements(circle1);
    state = editorReducer(state, { type: 'SELECT', ids: ['c1'] });
    state = editorReducer(state, { type: 'DESELECT_ALL' });
    expect(state.selectedIds).toEqual([]);
  });

  it('DESELECT_ALL returns same state if already empty', () => {
    let state = stateWithElements(circle1);
    // Clear the default selection first
    state = editorReducer(state, { type: 'DESELECT_ALL' });
    const next = editorReducer(state, { type: 'DESELECT_ALL' });
    expect(next).toBe(state);
  });
});

// ─── Document mutation ─────────────────────────────────────────────────────

describe('document mutation actions', () => {
  it('supports the core canvas Object placement workflow', () => {
    let state = stateWithElements();

    state = editorReducer(state, { type: 'ADD_ELEMENT', element: rect1 });
    expect(collectAllIds(state.document.root)).toContain('r1');
    expect((state.document.root.children ?? []).map(child => ('id' in child ? child.id : undefined))).toContain('r1');

    state = editorReducer(state, { type: 'SELECT', ids: ['r1'] });
    expect(state.selectedIds).toEqual(['r1']);

    state = editorReducer(state, { type: 'MOVE_ELEMENT', id: 'r1', dx: 25, dy: 10 });
    const moved = findElementById(state.document.root, 'r1')?.element as RectNode | undefined;
    expect(moved).toMatchObject({ x: 75, y: 60 });

    state = editorReducer(state, { type: 'UNDO' });
    const restored = findElementById(state.document.root, 'r1')?.element as RectNode | undefined;
    expect(restored).toMatchObject({ x: 50, y: 50 });

    state = editorReducer(state, { type: 'REDO' });
    const redone = findElementById(state.document.root, 'r1')?.element as RectNode | undefined;
    expect(redone).toMatchObject({ x: 75, y: 60 });
  });

  it('ADD_ELEMENT adds to root children', () => {
    const state = stateWithElements();
    const next = editorReducer(state, { type: 'ADD_ELEMENT', element: circle1 });
    const root = next.document.root as any;
    expect(root.children).toHaveLength(1);
    expect(root.children[0].id).toBe('c1');
  });

  it('ADD_ELEMENT updates canonical elements and scene order', () => {
    const next = editorReducer(stateWithCanonicalDocument(), {
      type: 'ADD_ELEMENT',
      element: { type: 'text', id: 'label', content: 'Hello', x: 120, y: 140 },
    });

    expect(next.canonicalDocument?.scene.children).toEqual(['c1', 'r1', 'label']);
    expect(next.canonicalDocument?.elements.label).toMatchObject({
      id: 'label',
      type: 'text',
      props: expect.objectContaining({ type: 'text', content: 'Hello', x: 120, y: 140 }),
    });
    expect(next.canonicalDocument?.metadata?.title).toBe('Canonical editor state');
    expect(next.canonicalDocument?.defaultStateMachine).toBe('presentation');
  });

  it('UPDATE_ELEMENT updates canonical props while preserving intent', () => {
    const next = editorReducer(stateWithCanonicalDocument(), {
      type: 'UPDATE_ELEMENT',
      id: 'c1',
      changes: { r: 75, fill: '$primary' } as any,
    });

    expect(next.canonicalDocument?.elements.c1.intent).toEqual({ role: 'source' });
    expect(next.canonicalDocument?.elements.c1.props).toMatchObject({ r: 75, fill: '$primary' });
    expect(next.canonicalDocument?.timelines?.intro.tracks[0].target).toBe('c1');
  });

  it('DELETE_ELEMENTS prunes canonical elements and dependent motion references', () => {
    const next = editorReducer(stateWithCanonicalDocument(), {
      type: 'DELETE_ELEMENTS',
      ids: ['c1'],
    });

    expect(next.canonicalDocument?.scene.children).toEqual(['r1']);
    expect(next.canonicalDocument?.elements.c1).toBeUndefined();
    expect(next.canonicalDocument?.timelines?.intro).toBeUndefined();
    expect(next.canonicalDocument?.stateMachines?.presentation.states.intro.timeline).toBeUndefined();
    expect(next.canonicalDocument?.defaultStateMachine).toBe('presentation');
  });

  it('RENAME_ELEMENT retargets canonical timeline tracks', () => {
    const next = editorReducer(stateWithCanonicalDocument(), {
      type: 'RENAME_ELEMENT',
      id: 'c1',
      newId: 'source-circle',
    });

    expect(next.canonicalDocument?.scene.children).toEqual(['source-circle', 'r1']);
    expect(next.canonicalDocument?.elements.c1).toBeUndefined();
    expect(next.canonicalDocument?.elements['source-circle'].intent).toEqual({ role: 'source' });
    expect(next.canonicalDocument?.timelines?.intro.tracks[0].target).toBe('source-circle');
  });

  it('REORDER_ELEMENT reorders canonical scene children without retargeting motion', () => {
    const next = editorReducer(stateWithCanonicalDocument(), {
      type: 'REORDER_ELEMENT',
      id: 'r1',
      newIndex: 0,
    });

    expect(next.canonicalDocument?.scene.children).toEqual(['r1', 'c1']);
    expect(next.canonicalDocument?.timelines?.intro.tracks[0].target).toBe('c1');
  });

  it('SET_CANONICAL_DOCUMENT updates canonical state without replacing the canvas projection', () => {
    const state = stateWithElements(circle1);
    const canonicalDocument: CanonicalElucimDocument = {
      version: '2.0',
      metadata: { title: 'Updated canonical model' },
      scene: { type: 'player', width: 800, height: 600, children: ['c1'] },
      elements: {
        c1: { id: 'c1', type: 'circle', props: { type: 'circle', cx: 100, cy: 100, r: 50 } },
      },
    };

    const next = editorReducer(state, {
      type: 'SET_CANONICAL_DOCUMENT',
      document: canonicalDocument,
      warnings: ['adapter warning'],
    });

    expect(next.document).toBe(state.document);
    expect(next.canonicalDocument).toBe(canonicalDocument);
    expect(next.compatibilityWarnings).toEqual(['adapter warning']);
  });

  it('SET_CANONICAL_DOCUMENT can derive a fresh projection from the canonical document', () => {
    const state = stateWithElements(circle1);
    const canonicalDocument: CanonicalElucimDocument = {
      version: '2.0',
      metadata: { title: 'Replacement document' },
      scene: { type: 'player', width: 640, height: 480, children: ['r1'] },
      elements: {
        r1: { id: 'r1', type: 'rect', props: { type: 'rect', x: 25, y: 35, width: 120, height: 80 } },
      },
      stateMachines: {
        deck: {
          id: 'deck',
          entry: 'idle',
          states: { idle: { layout: { x: 120, y: 80 } } },
          transitions: [],
          layout: { nodes: { idle: { x: 120, y: 80 } } },
        },
      },
    };

    const next = editorReducer(state, {
      type: 'SET_CANONICAL_DOCUMENT',
      document: canonicalDocument,
      syncProjection: true,
    });

    expect((next.document.root as any).width).toBe(640);
    expect((next.document.root as any).children).toHaveLength(1);
    expect((next.document.root as any).children[0]).toMatchObject({ id: 'r1', x: 25, y: 35 });
    expect(next.canonicalDocument?.metadata?.title).toBe('Replacement document');
    expect(next.canonicalDocument?.stateMachines?.deck.layout).toEqual({ nodes: { idle: { x: 120, y: 80 } } });
  });

  it('DELETE_ELEMENTS removes elements and clears selection', () => {
    let state = stateWithElements(circle1, rect1);
    state = editorReducer(state, { type: 'SELECT', ids: ['c1'] });
    state = editorReducer(state, { type: 'DELETE_ELEMENTS', ids: ['c1'] });
    const root = state.document.root as any;
    expect(root.children).toHaveLength(1);
    expect(root.children[0].id).toBe('r1');
    expect(state.selectedIds).toEqual([]);
  });

  it('UPDATE_ELEMENT updates element properties', () => {
    const state = stateWithElements(circle1);
    const next = editorReducer(state, {
      type: 'UPDATE_ELEMENT',
      id: 'c1',
      changes: { r: 75, fill: '#ff0000' } as any,
    });
    const root = next.document.root as any;
    expect(root.children[0].r).toBe(75);
    expect(root.children[0].fill).toBe('#ff0000');
  });

  it('GROUP_ELEMENTS groups selected root siblings with generated path IDs', () => {
    const anonymousRect: RectNode = { type: 'rect', x: 50, y: 50, width: 100, height: 80 };
    const anonymousCircle: CircleNode = { type: 'circle', cx: 300, cy: 200, r: 30 };
    const state = stateWithElements(anonymousRect, anonymousCircle);

    const next = editorReducer(state, {
      type: 'GROUP_ELEMENTS',
      ids: [CANVAS_ID, 'root.rect[0]', 'root.circle[1]'],
    });

    const root = next.document.root as any;
    expect(root.children).toHaveLength(1);
    expect(root.children[0].type).toBe('group');
    expect(root.children[0].children).toEqual([anonymousRect, anonymousCircle]);
    expect(next.selectedIds).toEqual([root.children[0].id]);
  });

  it('GROUP_ELEMENTS groups selected siblings inside the same parent', () => {
    const group = {
      type: 'group',
      id: 'parent',
      children: [
        { type: 'rect', x: 10, y: 10, width: 20, height: 20 },
        { type: 'circle', cx: 80, cy: 80, r: 12 },
      ],
    } as any;
    const state = stateWithElements(group, rect1);

    const next = editorReducer(state, {
      type: 'GROUP_ELEMENTS',
      ids: ['parent.rect[0]', 'parent.circle[1]'],
    });

    const parent = findElementById(next.document.root, 'parent')!.element as any;
    expect(parent.children).toHaveLength(1);
    expect(parent.children[0].type).toBe('group');
    expect(parent.children[0].children.map((child: any) => child.type)).toEqual(['rect', 'circle']);
    expect(next.selectedIds).toEqual([parent.children[0].id]);
  });

  it('RESIZE_ELEMENT resizes group children relative to group bounds', () => {
    const hero = {
      type: 'group',
      id: 'hero',
      children: [
        { type: 'rect', id: 'hero-bg', x: 220, y: 224, width: 360, height: 152, rx: 22 },
        { type: 'text', id: 'hero-title', x: 400, y: 284, content: 'Key idea', fontSize: 32, textAnchor: 'middle' },
      ],
    } as any;
    const state = stateWithElements(hero);

    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'hero', handle: 'e', dx: 40, dy: 0 });

    const resizedHero = findElementById(next.document.root, 'hero')!.element as any;
    expect(resizedHero.children[0].x).toBe(220);
    expect(resizedHero.children[0].width).toBe(400);
    expect(resizedHero.children[1].x).toBe(420);
    expect(resizedHero.children[1].y).toBe(284);
  });

  it('RESIZE_ELEMENT keeps west-edge group resizing anchored to the east edge', () => {
    const hero = {
      type: 'group',
      id: 'hero',
      children: [
        { type: 'rect', id: 'hero-bg', x: 220, y: 224, width: 360, height: 152, rx: 22 },
        { type: 'text', id: 'hero-title', x: 400, y: 284, content: 'Key idea', fontSize: 32, textAnchor: 'middle' },
      ],
    } as any;
    const state = stateWithElements(hero);

    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'hero', handle: 'w', dx: -40, dy: 0 });

    const resizedHero = findElementById(next.document.root, 'hero')!.element as any;
    expect(resizedHero.children[0].x).toBe(180);
    expect(resizedHero.children[0].width).toBe(400);
    expect(resizedHero.children[1].x).toBe(380);
    expect(resizedHero.children[1].y).toBe(284);
  });

  it('RESIZE_ELEMENT scales graph node positions and visual sizing from bounds', () => {
    const graph: GraphNode = {
      type: 'graph',
      id: 'graph',
      nodes: [
        { id: 'a', x: 100, y: 100, radius: 10 },
        { id: 'b', x: 200, y: 100 },
        { id: 'c', x: 150, y: 200 },
      ],
      edges: [{ from: 'a', to: 'b' }],
      nodeRadius: 8,
      edgeWidth: 2,
      labelFontSize: 14,
      scale: 2,
    };
    const state = stateWithElements(graph);

    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'graph', handle: 'e', dx: 50, dy: 0 });

    const resizedGraph = findElementById(next.document.root, 'graph')!.element as GraphNode;
    expect(resizedGraph.nodes[0].x).toBeCloseTo(102.1, 1);
    expect(resizedGraph.nodes[1].x).toBeCloseTo(223.3, 1);
    expect(resizedGraph.nodes[2].x).toBeCloseTo(162.7, 1);
    expect(resizedGraph.nodes.map(node => node.y)).toEqual([100, 100, 200]);
    expect(resizedGraph.nodeRadius).toBeCloseTo(8.8, 1);
    expect(resizedGraph.edgeWidth).toBeCloseTo(2.2, 1);
    expect(resizedGraph.labelFontSize).toBeCloseTo(15.5, 1);
    expect(resizedGraph.nodes[0].radius).toBeCloseTo(11.1, 1);
    expect(resizedGraph.scale).toBe(2);
  });

  it('RESIZE_ELEMENT scales matrix position and cell size from bounds', () => {
    const matrix: MatrixNode = {
      type: 'matrix',
      id: 'matrix',
      x: 100,
      y: 120,
      cellSize: 48,
      values: [
        [1, 2],
        [3, 4],
      ],
    };
    const state = stateWithElements(matrix);

    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'matrix', handle: 'e', dx: 48, dy: 0 });

    const resizedMatrix = findElementById(next.document.root, 'matrix')!.element as MatrixNode;
    expect(resizedMatrix.x).toBe(100);
    expect(resizedMatrix.y).toBe(120);
    expect(resizedMatrix.cellSize).toBeCloseTo(57.6, 1);
  });

  it('RESIZE_ELEMENT scales text around its measured anchor bounds', () => {
    const label: TextNode = {
      type: 'text',
      id: 'label',
      x: 400,
      y: 300,
      content: 'Slide title',
      fontSize: 40,
      textAnchor: 'middle',
    };
    const state = stateWithElements(label);

    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'label', handle: 'e', dx: 120, dy: 0 });

    const resizedLabel = findElementById(next.document.root, 'label')!.element as TextNode;
    expect(resizedLabel.x).toBe(460);
    expect(resizedLabel.y).toBe(300);
    expect(resizedLabel.fontSize).toBeCloseTo(49.1, 1);
  });

  it('MOVE_ELEMENT moves circle (cx/cy)', () => {
    const state = stateWithElements(circle1);
    const next = editorReducer(state, { type: 'MOVE_ELEMENT', id: 'c1', dx: 10, dy: -5 });
    const root = next.document.root as any;
    expect(root.children[0].cx).toBe(110);
    expect(root.children[0].cy).toBe(95);
  });

  it('MOVE_ELEMENT moves rect (x/y)', () => {
    const state = stateWithElements(rect1);
    const next = editorReducer(state, { type: 'MOVE_ELEMENT', id: 'r1', dx: 20, dy: 30 });
    const root = next.document.root as any;
    expect(root.children[0].x).toBe(70);
    expect(root.children[0].y).toBe(80);
  });

  it('MOVE_ELEMENT moves line (all endpoints)', () => {
    const state = stateWithElements(line1);
    const next = editorReducer(state, { type: 'MOVE_ELEMENT', id: 'l1', dx: 5, dy: 10 });
    const root = next.document.root as any;
    expect(root.children[0].x1).toBe(5);
    expect(root.children[0].y1).toBe(10);
    expect(root.children[0].x2).toBe(205);
    expect(root.children[0].y2).toBe(210);
  });

  it('MOVE_ELEMENT moves all selected elements when target is in multi-selection', () => {
    let state = stateWithElements(circle1, rect1);
    state = { ...state, selectedIds: ['c1', 'r1'] };
    const next = editorReducer(state, { type: 'MOVE_ELEMENT', id: 'c1', dx: 10, dy: 20 });
    const root = next.document.root as any;
    expect(root.children[0].cx).toBe(110);
    expect(root.children[0].cy).toBe(120);
    expect(root.children[1].x).toBe(60);
    expect(root.children[1].y).toBe(70);
  });

  it('MOVE_ELEMENT moves only target when not in multi-selection', () => {
    let state = stateWithElements(circle1, rect1);
    state = { ...state, selectedIds: ['c1'] };
    const next = editorReducer(state, { type: 'MOVE_ELEMENT', id: 'c1', dx: 10, dy: 20 });
    const root = next.document.root as any;
    expect(root.children[0].cx).toBe(110);
    expect(root.children[1].x).toBe(50); // rect unchanged
  });

  it('IMPORT_RENDERABLE_DOCUMENT replaces the projection and creates canonical state', () => {
    const state = stateWithElements(circle1);
    const newDoc: ElucimDocument = {
      version: 'render-tree',
      root: { type: 'player', width: 400, height: 300, durationInFrames: 60, children: [rect1] },
    };
    const next = editorReducer(state, { type: 'IMPORT_RENDERABLE_DOCUMENT', document: newDoc });
    expect((next.document.root as any).children[0].id).toBe('r1');
    expect(next.canonicalDocument?.version).toBe('2.0');
    expect(next.canonicalDocument?.scene.children).toEqual(['r1']);
    expect(next.selectedIds).toEqual([]);
  });
});

// ─── Duplicate ──────────────────────────────────────────────────────────────

describe('DUPLICATE_ELEMENTS', () => {
  it('duplicates selected elements with offset', () => {
    let state = stateWithElements(circle1, rect1);
    state = editorReducer(state, { type: 'DUPLICATE_ELEMENTS', ids: ['c1'] });
    const root = state.document.root as any;
    expect(root.children).toHaveLength(3);
    const clone = root.children[1]; // inserted after c1
    expect(clone.id).toContain('c1-copy');
    expect(clone.cx).toBe(120); // original 100 + 20 offset
  });

  it('duplicates with custom offset', () => {
    let state = stateWithElements(circle1);
    state = editorReducer(state, { type: 'DUPLICATE_ELEMENTS', ids: ['c1'], offset: { dx: 0, dy: 0 } });
    const root = state.document.root as any;
    expect(root.children).toHaveLength(2);
    expect(root.children[1].cx).toBe(100); // no offset
  });

  it('selects duplicated elements', () => {
    let state = stateWithElements(circle1, rect1);
    state = editorReducer(state, { type: 'DUPLICATE_ELEMENTS', ids: ['c1', 'r1'] });
    expect(state.selectedIds).toHaveLength(2);
    expect(state.selectedIds[0]).toContain('c1-copy');
  });
});

// ─── Layer order ────────────────────────────────────────────────────────────

describe('layer order actions', () => {
  it('BRING_FORWARD moves element one step forward', () => {
    let state = stateWithElements(circle1, rect1, line1);
    state = editorReducer(state, { type: 'BRING_FORWARD', ids: ['c1'] });
    const ids = (state.document.root as any).children.map((c: any) => c.id);
    expect(ids).toEqual(['r1', 'c1', 'l1']);
  });

  it('SEND_BACKWARD moves element one step backward', () => {
    let state = stateWithElements(circle1, rect1, line1);
    state = editorReducer(state, { type: 'SEND_BACKWARD', ids: ['r1'] });
    const ids = (state.document.root as any).children.map((c: any) => c.id);
    expect(ids).toEqual(['r1', 'c1', 'l1']);
  });

  it('BRING_TO_FRONT moves element to end', () => {
    let state = stateWithElements(circle1, rect1, line1);
    state = editorReducer(state, { type: 'BRING_TO_FRONT', ids: ['c1'] });
    const ids = (state.document.root as any).children.map((c: any) => c.id);
    expect(ids).toEqual(['r1', 'l1', 'c1']);
  });

  it('SEND_TO_BACK moves element to beginning', () => {
    let state = stateWithElements(circle1, rect1, line1);
    state = editorReducer(state, { type: 'SEND_TO_BACK', ids: ['l1'] });
    const ids = (state.document.root as any).children.map((c: any) => c.id);
    expect(ids).toEqual(['l1', 'c1', 'r1']);
  });

  it('BRING_FORWARD at end is no-op', () => {
    let state = stateWithElements(circle1, rect1);
    state = editorReducer(state, { type: 'BRING_FORWARD', ids: ['r1'] });
    const ids = (state.document.root as any).children.map((c: any) => c.id);
    expect(ids).toEqual(['c1', 'r1']);
  });

  it('REORDER_ELEMENT moves nested siblings inside a group', () => {
    const group = { type: 'group', id: 'g1', children: [circle1, rect1, line1] };
    let state = stateWithElements(group);

    state = editorReducer(state, { type: 'REORDER_ELEMENT', id: 'c1', newIndex: 2 });

    const ids = ((state.document.root as any).children[0].children as any[]).map(c => c.id);
    expect(ids).toEqual(['r1', 'l1', 'c1']);
  });

  it('order shortcuts operate within each selected element parent', () => {
    const group = { type: 'group', id: 'g1', children: [circle1, rect1, line1] };
    let state = stateWithElements(group, { type: 'text', id: 't1', content: 'Top', x: 0, y: 0 });

    state = editorReducer(state, { type: 'BRING_TO_FRONT', ids: ['c1', 'g1'] });

    const rootIds = (state.document.root as any).children.map((c: any) => c.id);
    const groupIds = ((state.document.root as any).children.find((c: any) => c.id === 'g1').children as any[]).map(c => c.id);
    expect(rootIds).toEqual(['t1', 'g1']);
    expect(groupIds).toEqual(['r1', 'l1', 'c1']);
  });
});

// ─── Alignment ──────────────────────────────────────────────────────────────

describe('ALIGN_ELEMENTS', () => {
  it('aligns elements left', () => {
    const r2: RectNode = { type: 'rect', id: 'r2', x: 200, y: 50, width: 80, height: 60 };
    let state = stateWithElements(rect1, r2);
    state = editorReducer(state, { type: 'ALIGN_ELEMENTS', ids: ['r1', 'r2'], direction: 'left' });
    const root = state.document.root as any;
    expect(root.children[0].x).toBe(50);
    expect(root.children[1].x).toBe(50);
  });

  it('aligns elements right', () => {
    const r2: RectNode = { type: 'rect', id: 'r2', x: 200, y: 50, width: 80, height: 60 };
    let state = stateWithElements(rect1, r2);
    state = editorReducer(state, { type: 'ALIGN_ELEMENTS', ids: ['r1', 'r2'], direction: 'right' });
    const root = state.document.root as any;
    // Right edge: rect1 50+100=150, r2 200+80=280 → align to 280
    expect(root.children[0].x).toBe(180); // 280-100
    expect(root.children[1].x).toBe(200); // 280-80
  });

  it('requires at least 2 elements', () => {
    let state = stateWithElements(rect1);
    const next = editorReducer(state, { type: 'ALIGN_ELEMENTS', ids: ['r1'], direction: 'left' });
    // Returns early — document unchanged (but history was pushed)
    expect((next.document.root as any).children[0].x).toBe(50);
  });
});

// ─── Distribution ───────────────────────────────────────────────────────────

describe('DISTRIBUTE_ELEMENTS', () => {
  it('distributes 3 elements horizontally', () => {
    const r1: RectNode = { type: 'rect', id: 'r1', x: 0, y: 0, width: 20, height: 20 };
    const r2: RectNode = { type: 'rect', id: 'r2', x: 10, y: 0, width: 20, height: 20 };
    const r3: RectNode = { type: 'rect', id: 'r3', x: 100, y: 0, width: 20, height: 20 };
    let state = stateWithElements(r1, r2, r3);
    state = editorReducer(state, { type: 'DISTRIBUTE_ELEMENTS', ids: ['r1', 'r2', 'r3'], direction: 'horizontal' });
    const root = state.document.root as any;
    // Centers: r1=10, r3=110 → middle should be 60 → x = 60-10 = 50
    expect(root.children[0].x).toBe(0);   // first stays
    expect(root.children[1].x).toBe(50);  // middle distributed
    expect(root.children[2].x).toBe(100); // last stays
  });

  it('requires at least 3 elements', () => {
    let state = stateWithElements(rect1, circle1);
    const next = editorReducer(state, { type: 'DISTRIBUTE_ELEMENTS', ids: ['r1', 'c1'], direction: 'horizontal' });
    // Returns early — document unchanged (but history was pushed)
    expect((next.document.root as any).children[0].x).toBe(50);
  });
});

// ─── Constrained Resize ─────────────────────────────────────────────────────

describe('constrained resize', () => {
  it('uses uniform delta when constrain is true', () => {
    let state = stateWithElements(rect1);
    // Drag SE handle with dx=30, dy=10, constrain=true → uses 30 for both
    state = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'r1', handle: 'se', dx: 30, dy: 10, constrain: true });
    const root = state.document.root as any;
    expect(root.children[0].width).toBe(130);  // 100 + 30
    expect(root.children[0].height).toBe(110); // 80 + 30
  });
});

// ─── Animation wrappers ─────────────────────────────────────────────────────

describe('animation wrapper actions', () => {
  it('wraps a selected element in an animation wrapper', () => {
    let state = stateWithElements(rect1);
    state = editorReducer(state, { type: 'WRAP_IN_ANIMATION', id: 'r1', wrapper: 'fadeIn' });
    const root = state.document.root as any;
    expect(root.children[0].type).toBe('fadeIn');
    expect(root.children[0].id).toBeUndefined();
    expect(root.children[0].duration).toBe(15);
    expect(root.children[0].children[0].id).toBe('r1');
    expect(state.selectedIds).toEqual(['root.fadeIn[0]']);
  });

  it('unwraps an animation wrapper and restores its child', () => {
    let state = stateWithElements(rect1);
    state = editorReducer(state, { type: 'WRAP_IN_ANIMATION', id: 'r1', wrapper: 'transform' });
    const wrapperId = state.selectedIds[0];
    state = editorReducer(state, { type: 'UNWRAP_ANIMATION', id: wrapperId });
    const root = state.document.root as any;
    expect(root.children[0].type).toBe('rect');
    expect(root.children[0].id).toBe('r1');
    expect(state.selectedIds).toEqual(['r1']);
  });

  it('selects generated child path after unwrapping an anonymous element', () => {
    let state = stateWithElements({ type: 'rect', x: 50, y: 50, width: 100, height: 80 });
    state = editorReducer(state, { type: 'WRAP_IN_ANIMATION', id: 'root.rect[0]', wrapper: 'fadeIn' });
    state = editorReducer(state, { type: 'UNWRAP_ANIMATION', id: 'root.fadeIn[0]' });
    expect(state.selectedIds).toEqual(['root.rect[0]']);
  });

  it('supports undo after wrapping', () => {
    let state = stateWithElements(rect1);
    state = editorReducer(state, { type: 'WRAP_IN_ANIMATION', id: 'r1', wrapper: 'fadeIn' });
    expect((state.document.root as any).children[0].type).toBe('fadeIn');
    state = editorReducer(state, { type: 'UNDO' });
    expect((state.document.root as any).children[0].type).toBe('rect');
  });
});

// ─── Undo / Redo ───────────────────────────────────────────────────────────

describe('undo/redo', () => {
  it('UNDO restores previous document state', () => {
    let state = stateWithElements(circle1);
    state = editorReducer(state, { type: 'ADD_ELEMENT', element: rect1 });
    expect((state.document.root as any).children).toHaveLength(2);
    state = editorReducer(state, { type: 'UNDO' });
    expect((state.document.root as any).children).toHaveLength(1);
    expect(state.future).toHaveLength(1);
  });

  it('REDO restores undone state', () => {
    let state = stateWithElements(circle1);
    state = editorReducer(state, { type: 'ADD_ELEMENT', element: rect1 });
    state = editorReducer(state, { type: 'UNDO' });
    state = editorReducer(state, { type: 'REDO' });
    expect((state.document.root as any).children).toHaveLength(2);
  });

  it('UNDO and REDO restore canonical document state and warnings', () => {
    let state = {
      ...stateWithCanonicalDocument(),
      compatibilityWarnings: ['starting warning'],
    };
    state = editorReducer(state, { type: 'DELETE_ELEMENTS', ids: ['c1'] });

    expect(state.canonicalDocument?.elements.c1).toBeUndefined();
    expect(state.canonicalDocument?.timelines?.intro).toBeUndefined();
    expect(state.compatibilityWarnings).toContain('Timeline "intro" has 1 track(s) targeting missing elements and will be omitted from document output.');

    state = editorReducer(state, { type: 'UNDO' });

    expect((state.document.root as any).children).toHaveLength(2);
    expect(state.canonicalDocument?.elements.c1).toBeTruthy();
    expect(state.canonicalDocument?.timelines?.intro.tracks[0].target).toBe('c1');
    expect(state.canonicalDocument?.stateMachines?.presentation.states.intro.timeline).toBe('intro');
    expect(state.compatibilityWarnings).toEqual(['starting warning']);

    state = editorReducer(state, { type: 'REDO' });

    expect((state.document.root as any).children).toHaveLength(1);
    expect(state.canonicalDocument?.elements.c1).toBeUndefined();
    expect(state.canonicalDocument?.timelines?.intro).toBeUndefined();
    expect(state.canonicalDocument?.stateMachines?.presentation.states.intro.timeline).toBeUndefined();
    expect(state.compatibilityWarnings).toContain('Timeline "intro" has 1 track(s) targeting missing elements and will be omitted from document output.');
  });

  it('UNDO does nothing when history is empty', () => {
    const state = stateWithElements(circle1);
    const next = editorReducer(state, { type: 'UNDO' });
    expect(next).toBe(state);
  });

  it('REDO does nothing when future is empty', () => {
    const state = stateWithElements(circle1);
    const next = editorReducer(state, { type: 'REDO' });
    expect(next).toBe(state);
  });

  it('new undoable action clears future', () => {
    let state = stateWithElements(circle1);
    state = editorReducer(state, { type: 'ADD_ELEMENT', element: rect1 });
    state = editorReducer(state, { type: 'UNDO' });
    expect(state.future).toHaveLength(1);
    state = editorReducer(state, { type: 'ADD_ELEMENT', element: circle2 });
    expect(state.future).toHaveLength(0);
  });
});

// ─── Viewport / Frame / Tool ───────────────────────────────────────────────

describe('viewport, frame, tool actions', () => {
  it('SET_VIEWPORT updates viewport', () => {
    const state = createInitialState();
    const next = editorReducer(state, { type: 'SET_VIEWPORT', viewport: { zoom: 2 } });
    expect(next.viewport.zoom).toBe(2);
    expect(next.viewport.x).toBe(0);
  });

  it('SET_FRAME updates current frame', () => {
    const state = createInitialState();
    const next = editorReducer(state, { type: 'SET_FRAME', frame: 42 });
    expect(next.currentFrame).toBe(42);
  });

  it('SET_PLAYING toggles playing state', () => {
    const state = createInitialState();
    const next = editorReducer(state, { type: 'SET_PLAYING', playing: true });
    expect(next.isPlaying).toBe(true);
  });

  it('SET_TOOL changes active tool', () => {
    const state = createInitialState();
    const next = editorReducer(state, { type: 'SET_TOOL', tool: 'rect' });
    expect(next.activeTool).toBe('rect');
  });
});

// ─── Tree helpers ──────────────────────────────────────────────────────────

describe('findElementById', () => {
  it('finds element by explicit id', () => {
    const doc: ElucimDocument = {
      version: 'render-tree',
      root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [circle1, rect1] },
    };
    const loc = findElementById(doc.root, 'c1');
    expect(loc).not.toBeNull();
    expect((loc!.element as CircleNode).cx).toBe(100);
  });

  it('finds element by generated path', () => {
    const noId: CircleNode = { type: 'circle', cx: 50, cy: 50, r: 10 };
    const doc: ElucimDocument = {
      version: 'render-tree',
      root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [noId] },
    };
    const loc = findElementById(doc.root, 'root.circle[0]');
    expect(loc).not.toBeNull();
    expect((loc!.element as CircleNode).r).toBe(10);
  });

  it('returns null for unknown id', () => {
    const doc: ElucimDocument = {
      version: 'render-tree',
      root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [circle1] },
    };
    expect(findElementById(doc.root, 'nonexistent')).toBeNull();
  });
});

describe('collectAllIds', () => {
  it('collects all element ids', () => {
    const doc: ElucimDocument = {
      version: 'render-tree',
      root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [circle1, rect1] },
    };
    const ids = collectAllIds(doc.root);
    expect(ids).toContain('c1');
    expect(ids).toContain('r1');
    expect(ids).toHaveLength(2);
  });
});
