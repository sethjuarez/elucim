import { describe, expect, it } from 'vitest';
import { getInitialStateSnapshot, transitionStateMachine, validateV2, type ElucimV2Document } from '../index';

const doc: ElucimV2Document = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, durationInFrames: 90, children: ['title'] },
  elements: {
    title: { id: 'title', type: 'text', props: { type: 'text', content: 'Hello' } },
  },
  timelines: {
    idle: { id: 'idle', duration: 1, tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 1 }] }] },
    intro: { id: 'intro', duration: 30, tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }] },
    outro: { id: 'outro', duration: 20, tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 1 }, { frame: 20, value: 0 }] }] },
  },
  stateMachines: {
    presentation: {
      id: 'presentation',
      initial: 'idle',
      reset: 'idle',
      states: {
        idle: { timeline: 'idle', on: { start: { target: 'entering', timeline: 'intro' } } },
        entering: { timeline: 'intro', onComplete: 'visible' },
        visible: { on: { exit: { target: 'exiting', timeline: 'outro' } } },
        exiting: { timeline: 'outro' },
      },
    },
  },
};

describe('v2 state machines', () => {
  it('returns the initial state snapshot with available events', () => {
    const snapshot = getInitialStateSnapshot(doc, 'presentation');

    expect(snapshot).toMatchObject({
      machineId: 'presentation',
      stateId: 'idle',
      timelineId: 'idle',
      events: ['start', 'reset'],
    });
  });

  it('resolves event transitions and transition-specific timelines', () => {
    const next = transitionStateMachine(doc, 'presentation', 'idle', 'start');

    expect(next).toMatchObject({
      previousStateId: 'idle',
      stateId: 'entering',
      timelineId: 'intro',
      changed: true,
    });
  });

  it('resolves reset events through the machine reset state', () => {
    const next = transitionStateMachine(doc, 'presentation', 'visible', 'reset');

    expect(next).toMatchObject({
      previousStateId: 'visible',
      stateId: 'idle',
      timelineId: 'idle',
      changed: true,
    });
  });

  it('treats missing events as no-op transitions', () => {
    const next = transitionStateMachine(doc, 'presentation', 'visible', 'start');

    expect(next.changed).toBe(false);
    expect(next.stateId).toBe('visible');
  });

  it('validates transition targets and transition timelines', () => {
    const result = validateV2({
      ...doc,
      stateMachines: {
        presentation: {
          id: 'presentation',
          initial: 'idle',
          states: {
            idle: { on: { start: { target: 'missing', timeline: 'unknown' } } },
          },
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.path)).toContain('stateMachines.presentation.states.idle.on.start');
    expect(result.errors.map(error => error.path)).toContain('stateMachines.presentation.states.idle.on.start.timeline');
  });

  it('validates reset state targets', () => {
    const result = validateV2({
      ...doc,
      stateMachines: {
        presentation: {
          ...doc.stateMachines!.presentation,
          reset: 'missing',
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.path)).toContain('stateMachines.presentation.reset');
  });
});
