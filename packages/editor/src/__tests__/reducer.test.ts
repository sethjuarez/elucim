import { describe, it, expect } from 'vitest';
import { editorReducer, findElementById, collectAllIds } from '../state/reducer';
import { createInitialState, createDefaultDocument } from '../state/types';
import type { EditorState } from '../state/types';
import type { ElucimDocument, CircleNode, RectNode, LineNode } from '@elucim/dsl';

// ─── Helpers ───────────────────────────────────────────────────────────────

function stateWithElements(...elements: any[]): EditorState {
  const doc: ElucimDocument = {
    version: '1.0',
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
    expect(state.activeTool).toBe('select');
    expect(state.document.version).toBe('1.0');
  });

  it('accepts initialFrame', () => {
    const state = createInitialState(undefined, 42);
    expect(state.currentFrame).toBe(42);
  });

  it('accepts a custom document', () => {
    const doc: ElucimDocument = {
      version: '1.0',
      root: { type: 'scene', width: 400, height: 300, durationInFrames: 60, children: [circle1] },
    };
    const state = createInitialState(doc);
    expect(state.document.root.type).toBe('scene');
  });
});

// ─── Selection ─────────────────────────────────────────────────────────────

describe('selection actions', () => {
  it('SELECT sets selected IDs', () => {
    const state = stateWithElements(circle1, rect1);
    const next = editorReducer(state, { type: 'SELECT', ids: ['c1'] });
    expect(next.selectedIds).toEqual(['c1']);
  });

  it('SELECT_ADD adds to selection', () => {
    let state = stateWithElements(circle1, rect1);
    state = editorReducer(state, { type: 'SELECT', ids: ['c1'] });
    state = editorReducer(state, { type: 'SELECT_ADD', id: 'r1' });
    expect(state.selectedIds).toEqual(['c1', 'r1']);
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
    expect(state.selectedIds).toContain('c1');
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
  it('ADD_ELEMENT adds to root children', () => {
    const state = stateWithElements();
    const next = editorReducer(state, { type: 'ADD_ELEMENT', element: circle1 });
    const root = next.document.root as any;
    expect(root.children).toHaveLength(1);
    expect(root.children[0].id).toBe('c1');
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

  it('SET_DOCUMENT replaces the entire document', () => {
    const state = stateWithElements(circle1);
    const newDoc: ElucimDocument = {
      version: '1.0',
      root: { type: 'player', width: 400, height: 300, durationInFrames: 60, children: [rect1] },
    };
    const next = editorReducer(state, { type: 'SET_DOCUMENT', document: newDoc });
    expect((next.document.root as any).children[0].id).toBe('r1');
    expect(next.selectedIds).toEqual([]);
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
      version: '1.0',
      root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [circle1, rect1] },
    };
    const loc = findElementById(doc.root, 'c1');
    expect(loc).not.toBeNull();
    expect((loc!.element as CircleNode).cx).toBe(100);
  });

  it('finds element by generated path', () => {
    const noId: CircleNode = { type: 'circle', cx: 50, cy: 50, r: 10 };
    const doc: ElucimDocument = {
      version: '1.0',
      root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [noId] },
    };
    const loc = findElementById(doc.root, 'root.circle[0]');
    expect(loc).not.toBeNull();
    expect((loc!.element as CircleNode).r).toBe(10);
  });

  it('returns null for unknown id', () => {
    const doc: ElucimDocument = {
      version: '1.0',
      root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [circle1] },
    };
    expect(findElementById(doc.root, 'nonexistent')).toBeNull();
  });
});

describe('collectAllIds', () => {
  it('collects all element ids', () => {
    const doc: ElucimDocument = {
      version: '1.0',
      root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [circle1, rect1] },
    };
    const ids = collectAllIds(doc.root);
    expect(ids).toContain('c1');
    expect(ids).toContain('r1');
    expect(ids).toHaveLength(2);
  });
});
