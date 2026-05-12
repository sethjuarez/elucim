import { describe, expect, it } from 'vitest';
import type { ElucimDocument, ElucimStateMachine, ElucimTimeline } from '@elucim/dsl';
import {
  applyMotionDocumentChange,
  applyStateMachineDocumentChange,
  applyTimelineDocumentChange,
  getPreferredMotionType,
} from '../timeline/EditorTimelinePanel';

const timeline: ElucimTimeline = {
  id: 'intro',
  duration: 30,
  tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }],
};

const stateMachine: ElucimStateMachine = {
  id: 'deck',
  entry: 'intro',
  states: { intro: { timeline: 'intro' } },
  transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
};

const document: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', children: ['title'] },
  elements: {
    title: { id: 'title', type: 'text', props: { type: 'text', content: 'Hello' } },
  },
  timelines: { intro: timeline },
  stateMachines: { deck: stateMachine },
  metadata: { title: 'Motion document' },
};

describe('editor timeline panel helpers', () => {
  it('patches timelines while preserving document extras', () => {
    const nextTimeline: ElucimTimeline = { ...timeline, duration: 45 };
    const next = applyTimelineDocumentChange(document, { intro: nextTimeline });

    expect(next.timelines?.intro.duration).toBe(45);
    expect(next.stateMachines).toBe(document.stateMachines);
    expect(next.metadata).toBe(document.metadata);
  });

  it('can explicitly clear timelines or state machines', () => {
    expect(applyTimelineDocumentChange(document, undefined)).toMatchObject({ timelines: undefined });
    expect(applyStateMachineDocumentChange(document, undefined)).toMatchObject({ stateMachines: undefined });
  });

  it('patches timelines and state machines together for motion edits', () => {
    const nextTimeline: ElucimTimeline = { ...timeline, duration: 60 };
    const nextMachine: ElucimStateMachine = {
      ...stateMachine,
      states: { intro: { timeline: 'intro' }, complete: {} },
    };
    const next = applyMotionDocumentChange(document, { intro: nextTimeline }, { deck: nextMachine });

    expect(next.timelines?.intro.duration).toBe(60);
    expect(next.stateMachines?.deck.states.complete).toEqual({});
    expect(next.elements).toBe(document.elements);
  });

  it('selects the state-machine motion tab only for the state-machine workspace', () => {
    expect(getPreferredMotionType('states')).toBe('stateMachine');
    expect(getPreferredMotionType('animate')).toBe('animation');
    expect(getPreferredMotionType('design')).toBe('animation');
    expect(getPreferredMotionType('polish')).toBe('animation');
  });
});
