import { describe, it, expect } from 'vitest';
import { editorReducer } from '../state/reducer';
import { createInitialState } from '../state/types';
import type { EditorState } from '../state/types';
import type { ElucimDocument, CircleNode, RectNode, LineNode } from '@elucim/dsl';

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

const rect1: RectNode = { type: 'rect', id: 'r1', x: 50, y: 50, width: 100, height: 80 };
const circle1: CircleNode = { type: 'circle', id: 'c1', cx: 200, cy: 200, r: 50 };
const line1: LineNode = { type: 'line', id: 'l1', x1: 10, y1: 10, x2: 110, y2: 110 };

// ─── RESIZE_ELEMENT ────────────────────────────────────────────────────────

describe('RESIZE_ELEMENT', () => {
  it('resizes rect from east handle (expand width)', () => {
    const state = stateWithElements(rect1);
    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'r1', handle: 'e', dx: 20, dy: 0 });
    const el = (next.document.root as any).children[0];
    expect(el.width).toBe(120);
    expect(el.x).toBe(50); // unchanged
  });

  it('resizes rect from west handle (shrink width, shift x)', () => {
    const state = stateWithElements(rect1);
    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'r1', handle: 'w', dx: 10, dy: 0 });
    const el = (next.document.root as any).children[0];
    expect(el.x).toBe(60);
    expect(el.width).toBe(90);
  });

  it('resizes rect from south handle (expand height)', () => {
    const state = stateWithElements(rect1);
    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'r1', handle: 's', dx: 0, dy: 15 });
    const el = (next.document.root as any).children[0];
    expect(el.height).toBe(95);
    expect(el.y).toBe(50);
  });

  it('resizes rect from north handle (shrink height, shift y)', () => {
    const state = stateWithElements(rect1);
    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'r1', handle: 'n', dx: 0, dy: 5 });
    const el = (next.document.root as any).children[0];
    expect(el.y).toBe(55);
    expect(el.height).toBe(75);
  });

  it('resizes rect from se corner (expand both)', () => {
    const state = stateWithElements(rect1);
    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'r1', handle: 'se', dx: 10, dy: 20 });
    const el = (next.document.root as any).children[0];
    expect(el.width).toBe(110);
    expect(el.height).toBe(100);
  });

  it('resizes rect from nw corner (shift + shrink)', () => {
    const state = stateWithElements(rect1);
    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'r1', handle: 'nw', dx: 10, dy: 10 });
    const el = (next.document.root as any).children[0];
    expect(el.x).toBe(60);
    expect(el.y).toBe(60);
    expect(el.width).toBe(90);
    expect(el.height).toBe(70);
  });

  it('clamps rect width to minimum 1', () => {
    const state = stateWithElements(rect1);
    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'r1', handle: 'e', dx: -200, dy: 0 });
    const el = (next.document.root as any).children[0];
    expect(el.width).toBe(1);
  });

  it('resizes circle from east handle (expand radius)', () => {
    const state = stateWithElements(circle1);
    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'c1', handle: 'e', dx: 10, dy: 0 });
    const el = (next.document.root as any).children[0];
    expect(el.r).toBe(60);
  });

  it('resizes circle from west handle (shrink radius)', () => {
    const state = stateWithElements(circle1);
    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'c1', handle: 'w', dx: 10, dy: 0 });
    const el = (next.document.root as any).children[0];
    expect(el.r).toBe(40);
  });

  it('resizes line from nw handle (moves start point)', () => {
    const state = stateWithElements(line1);
    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'l1', handle: 'nw', dx: 5, dy: 10 });
    const el = (next.document.root as any).children[0];
    expect(el.x1).toBe(15);
    expect(el.y1).toBe(20);
    expect(el.x2).toBe(110); // unchanged
    expect(el.y2).toBe(110);
  });

  it('resizes line from se handle (moves end point)', () => {
    const state = stateWithElements(line1);
    const next = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'l1', handle: 'se', dx: -5, dy: 10 });
    const el = (next.document.root as any).children[0];
    expect(el.x1).toBe(10);
    expect(el.y1).toBe(10);
    expect(el.x2).toBe(105);
    expect(el.y2).toBe(120);
  });
});

// ─── ROTATE_ELEMENT ────────────────────────────────────────────────────────

describe('ROTATE_ELEMENT', () => {
  it('adds rotation to element with no existing rotation', () => {
    const state = stateWithElements(rect1);
    const next = editorReducer(state, { type: 'ROTATE_ELEMENT', id: 'r1', angleDeg: 45 });
    const el = (next.document.root as any).children[0];
    expect(el.rotation).toBe(45);
  });

  it('accumulates rotation', () => {
    const rotated: RectNode = { ...rect1, rotation: 30 };
    const state = stateWithElements(rotated);
    const next = editorReducer(state, { type: 'ROTATE_ELEMENT', id: 'r1', angleDeg: 15 });
    const el = (next.document.root as any).children[0];
    expect(el.rotation).toBe(45);
  });

  it('supports negative rotation', () => {
    const state = stateWithElements(rect1);
    const next = editorReducer(state, { type: 'ROTATE_ELEMENT', id: 'r1', angleDeg: -90 });
    const el = (next.document.root as any).children[0];
    expect(el.rotation).toBe(-90);
  });
});

// ─── Resize + Undo integration ─────────────────────────────────────────────

describe('resize + undo', () => {
  it('can undo a resize', () => {
    let state = stateWithElements(rect1);
    state = editorReducer(state, { type: 'RESIZE_ELEMENT', id: 'r1', handle: 'e', dx: 50, dy: 0 });
    expect((state.document.root as any).children[0].width).toBe(150);
    state = editorReducer(state, { type: 'UNDO' });
    expect((state.document.root as any).children[0].width).toBe(100);
  });

  it('can undo a rotation', () => {
    let state = stateWithElements(rect1);
    state = editorReducer(state, { type: 'ROTATE_ELEMENT', id: 'r1', angleDeg: 45 });
    expect((state.document.root as any).children[0].rotation).toBe(45);
    state = editorReducer(state, { type: 'UNDO' });
    expect((state.document.root as any).children[0].rotation).toBeUndefined();
  });
});
