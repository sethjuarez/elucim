import { describe, expect, it } from 'vitest';
import * as core from '../index';

describe('removed motion API', () => {
  it('does not expose React motion wrappers, sequencing, or primitive animation hooks', () => {
    for (const name of [
      'FadeIn', 'FadeOut', 'Draw', 'Write', 'Transform', 'Morph',
      'Stagger', 'Parallel', 'Sequence', 'Timeline', 'Reveal', 'useAnimation',
    ]) {
      expect(name in core).toBe(false);
    }
  });

  it('retains resolved reveal state primitives for canonical renderers', () => {
    expect(typeof core.RevealStateProvider).toBe('function');
    expect(typeof core.useRevealState).toBe('function');
  });
});
