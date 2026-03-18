import { describe, it, expect } from 'vitest';
import { createInitialState, createDefaultDocument } from '../state/types';
import type { ElucimDocument } from '@elucim/dsl';

// ─── initialFrame="last" resolution ────────────────────────────────────────

describe('initialFrame="last" resolution', () => {
  // This tests the same logic used in ElucimEditor to resolve 'last'
  function resolveInitialFrame(
    initialFrame: number | 'last' | undefined,
    doc?: ElucimDocument,
  ): number | undefined {
    if (initialFrame === 'last') {
      return Math.max(0, ((doc?.root as any)?.durationInFrames ?? 1) - 1);
    }
    return initialFrame;
  }

  it('resolves "last" to durationInFrames - 1', () => {
    const doc: ElucimDocument = {
      version: '1.0',
      root: {
        type: 'player',
        width: 800,
        height: 600,
        durationInFrames: 120,
        children: [],
      },
    };
    expect(resolveInitialFrame('last', doc)).toBe(119);
  });

  it('resolves "last" to 0 when durationInFrames is 1', () => {
    const doc: ElucimDocument = {
      version: '1.0',
      root: {
        type: 'player',
        width: 800,
        height: 600,
        durationInFrames: 1,
        children: [],
      },
    };
    expect(resolveInitialFrame('last', doc)).toBe(0);
  });

  it('resolves "last" to 0 when no document provided', () => {
    expect(resolveInitialFrame('last', undefined)).toBe(0);
  });

  it('passes numeric values through unchanged', () => {
    expect(resolveInitialFrame(42, undefined)).toBe(42);
    expect(resolveInitialFrame(0, undefined)).toBe(0);
  });

  it('passes undefined through unchanged', () => {
    expect(resolveInitialFrame(undefined, undefined)).toBeUndefined();
  });
});

// ─── createInitialState with initialFrame ──────────────────────────────────

describe('createInitialState with initialFrame', () => {
  it('sets currentFrame from initialFrame parameter', () => {
    const doc: ElucimDocument = {
      version: '1.0',
      root: {
        type: 'player',
        width: 800,
        height: 600,
        durationInFrames: 120,
        children: [],
      },
    };
    const state = createInitialState(doc, 59);
    expect(state.currentFrame).toBe(59);
  });

  it('defaults currentFrame to 0 when no initialFrame', () => {
    const state = createInitialState(createDefaultDocument());
    expect(state.currentFrame).toBe(0);
  });
});

// ─── Default toolbar position ──────────────────────────────────────────────

describe('default toolbar position', () => {
  it('starts with offset from corner', () => {
    const state = createInitialState(createDefaultDocument());
    expect(state.toolbarPosition.x).toBeGreaterThanOrEqual(20);
    expect(state.toolbarPosition.y).toBeGreaterThanOrEqual(20);
  });
});
