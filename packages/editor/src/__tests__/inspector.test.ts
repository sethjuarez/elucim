import { describe, it, expect } from 'vitest';
import { editorReducer, findElementById } from '../state/reducer';
import { createInitialState } from '../state/types';
import type { CircleNode, RectNode, TextNode, LaTeXNode } from '@elucim/dsl';

const circle: CircleNode = { type: 'circle', id: 'c1', cx: 100, cy: 200, r: 50, fill: '#ff0000', stroke: '#00ff00', strokeWidth: 2, opacity: 0.8 };
const rect: RectNode = { type: 'rect', id: 'r1', x: 50, y: 50, width: 100, height: 80, fill: '#0000ff' };
const text: TextNode = { type: 'text', id: 't1', x: 200, y: 100, content: 'Hello', fontSize: 24, fill: '#fff' };
const latex: LaTeXNode = { type: 'latex', id: 'lx1', x: 300, y: 300, expression: '\\frac{a}{b}', fontSize: 20 };

function stateWith(...elements: any[]) {
  return createInitialState({
    version: '1.0',
    root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: elements },
  });
}

// ─── Position field updates ────────────────────────────────────────────────

describe('inspector position updates', () => {
  it('updates circle cx/cy/r', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'c1', changes: { cx: 150 } as any });
    const el = findElementById(state.document.root, 'c1')!.element as CircleNode;
    expect(el.cx).toBe(150);
    expect(el.cy).toBe(200); // unchanged
  });

  it('updates rect x/y/width/height', () => {
    let state = stateWith(rect);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'r1', changes: { width: 200, height: 150 } as any });
    const el = findElementById(state.document.root, 'r1')!.element as RectNode;
    expect(el.width).toBe(200);
    expect(el.height).toBe(150);
    expect(el.x).toBe(50);
  });
});

// ─── Style field updates ───────────────────────────────────────────────────

describe('inspector style updates', () => {
  it('updates fill color', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'c1', changes: { fill: '#123456' } as any });
    const el = findElementById(state.document.root, 'c1')!.element as CircleNode;
    expect(el.fill).toBe('#123456');
  });

  it('updates stroke and strokeWidth', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'c1', changes: { stroke: '#aabbcc', strokeWidth: 5 } as any });
    const el = findElementById(state.document.root, 'c1')!.element as CircleNode;
    expect(el.stroke).toBe('#aabbcc');
    expect(el.strokeWidth).toBe(5);
  });

  it('updates opacity', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'c1', changes: { opacity: 0.5 } as any });
    const el = findElementById(state.document.root, 'c1')!.element as CircleNode;
    expect(el.opacity).toBe(0.5);
  });

  it('updates fontSize', () => {
    let state = stateWith(text);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 't1', changes: { fontSize: 36 } as any });
    const el = findElementById(state.document.root, 't1')!.element as TextNode;
    expect(el.fontSize).toBe(36);
  });
});

// ─── Animation field updates ───────────────────────────────────────────────

describe('inspector animation updates', () => {
  it('sets fadeIn', () => {
    let state = stateWith(rect);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'r1', changes: { fadeIn: 30 } as any });
    const el = findElementById(state.document.root, 'r1')!.element as any;
    expect(el.fadeIn).toBe(30);
  });

  it('sets fadeOut', () => {
    let state = stateWith(rect);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'r1', changes: { fadeOut: 15 } as any });
    const el = findElementById(state.document.root, 'r1')!.element as any;
    expect(el.fadeOut).toBe(15);
  });
});

// ─── Transform field updates ───────────────────────────────────────────────

describe('inspector transform updates', () => {
  it('sets rotation', () => {
    let state = stateWith(rect);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'r1', changes: { rotation: 45 } as any });
    const el = findElementById(state.document.root, 'r1')!.element as any;
    expect(el.rotation).toBe(45);
  });

  it('sets zIndex', () => {
    let state = stateWith(rect);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'r1', changes: { zIndex: 5 } as any });
    const el = findElementById(state.document.root, 'r1')!.element as any;
    expect(el.zIndex).toBe(5);
  });
});

// ─── Element-specific field updates ────────────────────────────────────────

describe('inspector element-specific updates', () => {
  it('updates text content', () => {
    let state = stateWith(text);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 't1', changes: { content: 'World' } as any });
    const el = findElementById(state.document.root, 't1')!.element as TextNode;
    expect(el.content).toBe('World');
  });

  it('updates latex expression', () => {
    let state = stateWith(latex);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'lx1', changes: { expression: 'E=mc^2' } as any });
    const el = findElementById(state.document.root, 'lx1')!.element as LaTeXNode;
    expect(el.expression).toBe('E=mc^2');
  });

  it('multiple field changes in one update', () => {
    let state = stateWith(circle);
    state = editorReducer(state, {
      type: 'UPDATE_ELEMENT',
      id: 'c1',
      changes: { cx: 300, cy: 400, r: 75, fill: '#abcdef' } as any,
    });
    const el = findElementById(state.document.root, 'c1')!.element as CircleNode;
    expect(el.cx).toBe(300);
    expect(el.cy).toBe(400);
    expect(el.r).toBe(75);
    expect(el.fill).toBe('#abcdef');
  });
});
