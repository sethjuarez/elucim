import { describe, it, expect } from 'vitest';
import { editorReducer } from '../state/reducer';
import { createInitialState } from '../state/types';
import type { CircleNode, RectNode } from '@elucim/dsl';

const circle: CircleNode = { type: 'circle', id: 'c1', cx: 100, cy: 100, r: 50, fadeIn: 20, fadeOut: 10, draw: 40 };
const rect: RectNode = { type: 'rect', id: 'r1', x: 50, y: 50, width: 100, height: 80 };

function stateWith(...elements: any[]) {
  return createInitialState({
    version: '1.0',
    root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: elements },
  });
}

describe('timeline playback controls', () => {
  it('SET_FRAME sets current frame', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'SET_FRAME', frame: 42 });
    expect(state.currentFrame).toBe(42);
  });

  it('SET_PLAYING toggles play state', () => {
    let state = stateWith(circle);
    expect(state.isPlaying).toBe(false);
    state = editorReducer(state, { type: 'SET_PLAYING', playing: true });
    expect(state.isPlaying).toBe(true);
    state = editorReducer(state, { type: 'SET_PLAYING', playing: false });
    expect(state.isPlaying).toBe(false);
  });

  it('step forward increments frame', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'SET_FRAME', frame: 0 });
    state = editorReducer(state, { type: 'SET_FRAME', frame: Math.min(state.currentFrame + 1, 119) });
    expect(state.currentFrame).toBe(1);
  });

  it('step backward decrements frame', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'SET_FRAME', frame: 50 });
    state = editorReducer(state, { type: 'SET_FRAME', frame: Math.max(state.currentFrame - 1, 0) });
    expect(state.currentFrame).toBe(49);
  });

  it('go to start sets frame 0', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'SET_FRAME', frame: 80 });
    state = editorReducer(state, { type: 'SET_FRAME', frame: 0 });
    expect(state.currentFrame).toBe(0);
  });

  it('go to end sets last frame', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'SET_FRAME', frame: 119 });
    expect(state.currentFrame).toBe(119);
  });
});

describe('timeline track data', () => {
  it('elements with animation props have track data', () => {
    const state = stateWith(circle, rect);
    const root = state.document.root as any;
    const el = root.children[0];
    expect(el.fadeIn).toBe(20);
    expect(el.fadeOut).toBe(10);
    expect(el.draw).toBe(40);
  });

  it('updating fadeIn via inspector syncs with timeline', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'c1', changes: { fadeIn: 45 } as any });
    const el = (state.document.root as any).children[0];
    expect(el.fadeIn).toBe(45);
  });

  it('ruler click sets frame proportionally', () => {
    let state = stateWith(circle);
    // Simulate: click at 50% of ruler → frame 59
    const ratio = 0.5;
    const durationInFrames = 120;
    const frame = Math.round(ratio * (durationInFrames - 1));
    state = editorReducer(state, { type: 'SET_FRAME', frame });
    expect(state.currentFrame).toBe(60); // (0.5 * 119) rounded
  });
});

describe('selection via timeline track', () => {
  it('clicking track selects element', () => {
    let state = stateWith(circle, rect);
    state = editorReducer(state, { type: 'SELECT', ids: ['c1'] });
    expect(state.selectedIds).toEqual(['c1']);
    state = editorReducer(state, { type: 'SELECT', ids: ['r1'] });
    expect(state.selectedIds).toEqual(['r1']);
  });
});
