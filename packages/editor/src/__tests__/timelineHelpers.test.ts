import { describe, expect, it } from 'vitest';
import type { ElucimStateMachine } from '@elucim/dsl';
import { parseKeyframeValue } from '../timeline/keyframeValue';
import {
  createUniqueTransitionId,
  displayKeyName,
  getEntryTargetStateId,
  getPreviewTransition,
  isAvailableTransitionTrigger,
  pruneUnusedTriggerInputs,
  resolveTransitionTarget,
  transitionTriggerLabel,
} from '../timeline/stateMachineHelpers';
import { getAnimationUpdateProp, getAnimationValues, getRows } from '../timeline/timelineRows';

const machine: ElucimStateMachine = {
  id: 'deck',
  entry: 'idle',
  inputs: {
    start: { type: 'trigger' },
    unused: { type: 'trigger' },
    speed: { type: 'number' },
  },
  states: {
    idle: { timeline: 'idle' },
    intro: { timeline: 'intro' },
  },
  transitions: [
    { id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' },
    { id: 'idle-start', from: 'idle', to: 'intro', trigger: 'start' },
    { id: 'intro-next', from: 'intro', to: 'exit', exitTime: 1 },
    { id: 'any-reset', from: 'any', to: 'idle', trigger: 'reset' },
  ],
};

describe('timeline helper extraction', () => {
  it('keeps nested rows collapsed until a parent is expanded', () => {
    const group = {
      type: 'group',
      id: 'group-1',
      children: [
        { type: 'rect', id: 'rect-1', x: 0, y: 0, width: 10, height: 10 },
        { type: 'circle', id: 'circle-1', cx: 5, cy: 5, r: 4 },
      ],
    } as any;

    expect(getRows([group], new Set()).map(row => row.id)).toEqual(['group-1']);
    expect(getRows([group], new Set(['group-1'])).map(row => [row.id, row.depth])).toEqual([
      ['group-1', 0],
      ['rect-1', 1],
      ['circle-1', 1],
    ]);
  });

  it('normalizes legacy wrapper animation values and update targets', () => {
    const fadeIn = { type: 'fadeIn', id: 'wrap', duration: 12, children: [] } as any;
    const rect = { type: 'rect', id: 'rect', x: 0, y: 0, width: 10, height: 10, fadeIn: 3, fadeOut: 4, draw: 5 } as any;

    expect(getAnimationValues(fadeIn)).toEqual({ fadeIn: 12, fadeOut: 0, draw: 0 });
    expect(getAnimationValues(rect)).toEqual({ fadeIn: 3, fadeOut: 4, draw: 5 });
    expect(getAnimationUpdateProp(fadeIn, 'fadeIn')).toBe('duration');
    expect(getAnimationUpdateProp(rect, 'fadeIn')).toBe('fadeIn');
  });

  it('parses numeric keyframe values but preserves non-numeric input exactly', () => {
    expect(parseKeyframeValue('42')).toBe(42);
    expect(parseKeyframeValue(' -3.5 ')).toBe(-3.5);
    expect(parseKeyframeValue('')).toBe('');
    expect(parseKeyframeValue('true')).toBe('true');
    expect(parseKeyframeValue('{"x":1}')).toBe('{"x":1}');
  });
});

describe('state-machine helper extraction', () => {
  it('resolves entry and transition targets for preview playback', () => {
    expect(getEntryTargetStateId(machine)).toBe('idle');
    expect(resolveTransitionTarget(machine, machine.transitions![1])).toBe('intro');
    expect(resolveTransitionTarget(machine, machine.transitions![2])).toBe('exit');
  });

  it('finds preview transitions including complete and key events', () => {
    const keyMachine: ElucimStateMachine = {
      ...machine,
      transitions: [
        ...machine.transitions!,
        { id: 'idle-key', from: 'idle', to: 'intro', trigger: 'onKey', key: 'G' },
      ],
    };

    expect(getPreviewTransition(machine, 'intro', 'complete')?.id).toBe('intro-next');
    expect(getPreviewTransition(keyMachine, 'idle', 'onKey', 'g')?.id).toBe('idle-key');
    expect(getPreviewTransition(keyMachine, 'idle', 'onKey', 'x')).toBeUndefined();
  });

  it('keeps trigger inputs and labels deterministic', () => {
    expect(createUniqueTransitionId(machine, 'idle-start')).toBe('idle-start-2');
    expect(pruneUnusedTriggerInputs(machine.inputs, machine.transitions)).toEqual({
      start: { type: 'trigger' },
      speed: { type: 'number' },
    });
    expect(isAvailableTransitionTrigger(machine, machine.transitions![1], 'entry')).toBe(false);
    expect(isAvailableTransitionTrigger(machine, machine.transitions![1], 'start')).toBe(true);
    expect(transitionTriggerLabel(machine.transitions![2])).toBe('Next');
    expect(displayKeyName(' ')).toBe('Space');
    expect(displayKeyName('Tab')).toBeUndefined();
  });
});
