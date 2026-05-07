import { describe, expect, it } from 'vitest';
import { getInitialStateSnapshot, getStateMachineVisualFrames, transitionStateMachine, validateV2, type ElucimV2Document } from '../index';

const doc: ElucimV2Document = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, children: ['title'] },
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
      entry: 'idle',
      inputs: {
        start: { type: 'trigger' },
        exit: { type: 'trigger' },
        reset: { type: 'trigger' },
      },
      states: {
        idle: { timeline: 'idle' },
        entering: { timeline: 'intro' },
        visible: {},
        exiting: { timeline: 'outro' },
      },
      transitions: [
        { id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' },
        { id: 'idle-start', from: 'idle', to: 'entering', trigger: 'start' },
        { id: 'entering-complete', from: 'entering', to: 'visible', exitTime: 1 },
        { id: 'visible-exit', from: 'visible', to: 'exiting', trigger: 'exit' },
        { id: 'any-reset', from: 'any', to: 'entry', trigger: 'reset' },
      ],
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

  it('resolves event transitions using target state timelines', () => {
    const next = transitionStateMachine(doc, 'presentation', 'idle', 'start');

    expect(next).toMatchObject({
      previousStateId: 'idle',
      stateId: 'entering',
      timelineId: 'intro',
      changed: true,
    });
  });

  it('resolves reset events through Entry', () => {
    const next = transitionStateMachine(doc, 'presentation', 'visible', 'reset');

    expect(next).toMatchObject({
      previousStateId: 'visible',
      stateId: 'idle',
      timelineId: 'idle',
      changed: true,
    });
  });

  it('resolves Next targets that point back through Entry in snapshots', () => {
    const throughEntry: ElucimV2Document = {
      ...doc,
      stateMachines: {
        presentation: {
          ...doc.stateMachines!.presentation,
          transitions: [
            { id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' },
            { id: 'visible-next-entry', from: 'visible', to: 'entry', exitTime: 1 },
          ],
        },
      },
    };

    expect(transitionStateMachine(throughEntry, 'presentation', 'visible', 'next')).toMatchObject({
      stateId: 'idle',
      onComplete: undefined,
      changed: true,
    });
  });

  it('treats missing events as no-op transitions', () => {
    const next = transitionStateMachine(doc, 'presentation', 'visible', 'start');

    expect(next.changed).toBe(false);
    expect(next.stateId).toBe('visible');
  });

  it('uses next transitions for automatic progression and terminal exit', () => {
    const withExit: ElucimV2Document = {
      ...doc,
      stateMachines: {
        presentation: {
          ...doc.stateMachines!.presentation,
          transitions: [
            ...doc.stateMachines!.presentation.transitions!,
            { id: 'visible-next', from: 'visible', to: 'exit', exitTime: 1 },
          ],
        },
      },
    };

    const snapshot = getInitialStateSnapshot(withExit, 'presentation');
    expect(snapshot.events).toEqual(['start', 'reset']);
    const entering = transitionStateMachine(withExit, 'presentation', 'idle', 'start');
    expect(entering.events).toEqual(['reset']);
    expect(entering.onComplete).toBe('visible');

    const visible = transitionStateMachine(withExit, 'presentation', 'entering', 'next');
    expect(visible.stateId).toBe('visible');

    const exited = transitionStateMachine(withExit, 'presentation', 'visible', 'next');
    expect(exited.changed).toBe(true);
    expect(exited.stateId).toBe('visible');
    expect(exited.exited).toBe(true);
    expect(exited.events).toEqual([]);
  });

  it('derives composed visual frames from the state-machine path', () => {
    const frames = getStateMachineVisualFrames(doc, 'presentation', {
      statePath: ['idle', 'entering'],
      currentStateId: 'entering',
      currentFrame: 12,
    });

    expect(frames).toEqual([
      { timelineId: 'idle', frame: 0 },
      { timelineId: 'intro', frame: 0 },
      { timelineId: 'outro', frame: 0 },
      { timelineId: 'idle', frame: 1 },
      { timelineId: 'intro', frame: 12 },
    ]);
  });

  it('can skip stale missing states while composing visual frames for editor previews', () => {
    const frames = getStateMachineVisualFrames(doc, 'presentation', {
      statePath: ['idle', 'deleted-state', 'entering'],
      currentStateId: 'entering',
      currentFrame: 12,
      missingState: 'skip',
    });

    expect(frames).toEqual([
      { timelineId: 'idle', frame: 0 },
      { timelineId: 'intro', frame: 0 },
      { timelineId: 'outro', frame: 0 },
      { timelineId: 'idle', frame: 1 },
      { timelineId: 'intro', frame: 12 },
    ]);
  });

  it('uses every timeline end frame once the state machine exits', () => {
    const frames = getStateMachineVisualFrames(doc, 'presentation', {
      statePath: ['idle', 'entering', 'visible'],
      currentStateId: 'visible',
      currentFrame: 0,
      exited: true,
    });

    expect(frames).toEqual([
      { timelineId: 'idle', frame: 1 },
      { timelineId: 'intro', frame: 30 },
      { timelineId: 'outro', frame: 20 },
    ]);

    expect(getStateMachineVisualFrames(doc, 'presentation', {
      statePath: ['idle', 'entering', 'visible'],
      currentStateId: 'visible',
      currentFrame: 0,
      finished: true,
    })).toEqual(frames);
  });

  it('validates transition targets', () => {
    const result = validateV2({
      ...doc,
      stateMachines: {
        presentation: {
          id: 'presentation',
          entry: 'idle',
          inputs: { start: { type: 'trigger' } },
          states: {
            idle: {},
          },
          transitions: [
            { id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' },
            { id: 'bad', from: 'idle', to: 'missing', trigger: 'start' },
          ],
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.path)).toContain('stateMachines.presentation.transitions[1].to');
  });

  it('validates transition event and Next rules', () => {
    const result = validateV2({
      ...doc,
      stateMachines: {
        presentation: {
          ...doc.stateMachines!.presentation,
          transitions: [
            { id: 'reserved', from: 'idle', to: 'entering', trigger: 'next' },
            { id: 'duplicate-a', from: 'visible', to: 'exiting', trigger: 'advance' },
            { id: 'duplicate-b', from: 'visible', to: 'idle', trigger: 'advance' },
            { id: 'next-with-event', from: 'entering', to: 'visible', trigger: 'done', exitTime: 1 },
            { id: 'second-next', from: 'entering', to: 'exit', exitTime: 2 },
            { id: 'missing-event', from: 'visible', to: 'idle' },
          ],
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.message)).toEqual(expect.arrayContaining([
      '"next" is reserved and cannot be used as an event name',
      'Duplicate event "advance" from "visible"',
      'Next transitions must not have event names',
      'State "entering" can only have one Next transition',
      'Event transitions require an event name',
    ]));
  });

  it('requires exactly one Entry edge to a real state', () => {
    const withoutEntry = validateV2({
      ...doc,
      stateMachines: {
        presentation: {
          ...doc.stateMachines!.presentation,
          transitions: doc.stateMachines!.presentation.transitions!.filter(transition => transition.from !== 'entry'),
        },
      },
    });
    expect(withoutEntry.valid).toBe(false);
    expect(withoutEntry.errors.map(error => error.message)).toContain('Entry must have exactly one outgoing transition');

    const withMultipleEntries = validateV2({
      ...doc,
      stateMachines: {
        presentation: {
          ...doc.stateMachines!.presentation,
          transitions: [
            ...doc.stateMachines!.presentation.transitions!,
            { id: 'entry-alt', from: 'entry', to: 'entering', trigger: 'onClick' },
          ],
        },
      },
    });
    expect(withMultipleEntries.valid).toBe(false);
    expect(withMultipleEntries.errors.map(error => error.message)).toContain('Entry must have exactly one outgoing transition');
  });

  it('requires Entry edges to declare a valid start event', () => {
    const result = validateV2({
      ...doc,
      stateMachines: {
        presentation: {
          ...doc.stateMachines!.presentation,
          transitions: [
            { id: 'entry-missing', from: 'entry', to: 'idle' },
            { id: 'entry-key', from: 'entry', to: 'entering', trigger: 'onKey' },
          ],
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.message)).toEqual(expect.arrayContaining([
      'Entry must have exactly one outgoing transition',
      'Entry transitions require a start event such as onStart or onClick',
      'onKey transitions require a key',
    ]));
  });

  it('validates keyed events by event preset and key metadata', () => {
    const result = validateV2({
      ...doc,
      stateMachines: {
        presentation: {
          ...doc.stateMachines!.presentation,
          transitions: [
            { id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' },
            { id: 'key-missing', from: 'idle', to: 'entering', trigger: 'onKey' },
            { id: 'key-a', from: 'visible', to: 'exiting', trigger: 'onKey', key: 'A' },
            { id: 'key-a-duplicate', from: 'visible', to: 'idle', trigger: 'onKey', key: 'A' },
            { id: 'key-a-case-duplicate', from: 'visible', to: 'entering', trigger: 'onKey', key: 'a' },
          ],
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.message)).toEqual(expect.arrayContaining([
      'onKey transitions require a key',
      'Duplicate event "onKey:A" from "visible"',
    ]));
  });

  it('matches keyed events by metadata when several keys share onKey', () => {
    const keyed: ElucimV2Document = {
      ...doc,
      stateMachines: {
        presentation: {
          ...doc.stateMachines!.presentation,
          transitions: [
            { id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' },
            { id: 'key-a', from: 'idle', to: 'entering', trigger: 'onKey', key: 'A' },
            { id: 'key-b', from: 'idle', to: 'visible', trigger: 'onKey', key: 'B' },
          ],
        },
      },
    };

    expect(transitionStateMachine(keyed, 'presentation', 'idle', { name: 'onKey', key: 'B' })).toMatchObject({
      stateId: 'visible',
      event: 'onKey',
      changed: true,
    });
    expect(getInitialStateSnapshot(keyed, 'presentation').eventTransitions).toEqual(expect.arrayContaining([
      { event: 'onKey', key: 'A', transitionId: 'key-a' },
      { event: 'onKey', key: 'B', transitionId: 'key-b' },
    ]));
    expect(transitionStateMachine(keyed, 'presentation', 'idle', { name: 'onKey', key: 'Z' }).changed).toBe(false);
  });
});
