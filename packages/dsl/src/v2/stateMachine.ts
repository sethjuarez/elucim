import type { ElucimV2Document, ElucimV2StateMachine, ElucimV2Transition } from './types';

export interface ElucimV2StateSnapshot {
  machineId: string;
  stateId: string;
  timelineId?: string;
  events: string[];
  eventTransitions: Array<{ event: string; key?: string; transitionId: string }>;
  onComplete?: string;
}

export interface ElucimV2StateTransitionResult extends ElucimV2StateSnapshot {
  changed: boolean;
  event: string;
  previousStateId: string;
  exited?: boolean;
}

export interface ElucimV2StateEvent {
  name: string;
  key?: string;
}

export interface ElucimV2StateMachineVisualFrame {
  timelineId: string;
  frame: number;
}

export interface ElucimV2StateMachineRun {
  machineId: string;
  stateId: string | 'entry';
  timelineId?: string;
  statePath: string[];
  currentFrame: number;
  playing: boolean;
  event?: string;
  previousStateId?: string;
  activeTransitionId?: string;
  exited?: boolean;
  finished?: boolean;
}

export interface ElucimV2StateMachineRunResult extends ElucimV2StateMachineRun {
  changed: boolean;
}

/**
 * Selects an ordered overlay stack of timeline frames for a state-machine visual preview.
 *
 * The returned array is intentionally ordered, not unique by timeline ID:
 * start frames are applied first, then completed/current state frames overlay later.
 * Consumers should apply selections in array order so later entries win.
 */
export interface ElucimV2StateMachineVisualFrameOptions {
  statePath?: string[];
  currentStateId: string;
  currentFrame: number;
  exited?: boolean;
  finished?: boolean;
  missingState?: 'throw' | 'skip';
  missingTimeline?: 'throw' | 'skip';
}

export function getInitialStateSnapshot(doc: ElucimV2Document, machineId: string): ElucimV2StateSnapshot {
  const machine = getMachine(doc, machineId);
  return snapshot(machine, getInitialStateId(machine));
}

export function startStateMachineRun(doc: ElucimV2Document, machineId: string): ElucimV2StateMachineRun {
  const machine = getMachine(doc, machineId);
  const entryTransition = getEntryTransition(machine);
  if (entryTransition?.trigger && entryTransition.trigger !== 'onStart') {
    return {
      machineId,
      stateId: 'entry',
      statePath: [],
      currentFrame: 0,
      playing: false,
      event: 'start',
      activeTransitionId: entryTransition.id,
    };
  }
  return settleImmediateTransitions(doc, machine, enterState(doc, machine, getInitialStateId(machine), {
    event: entryTransition?.trigger ?? 'onStart',
    previousStateId: 'entry',
    activeTransitionId: entryTransition?.id,
  }));
}

export function dispatchStateMachineRunEvent(
  doc: ElucimV2Document,
  run: ElucimV2StateMachineRun,
  event: string | ElucimV2StateEvent,
): ElucimV2StateMachineRunResult {
  if (run.exited || run.finished) return { ...run, changed: false };
  const machine = getMachine(doc, run.machineId);
  const eventName = typeof event === 'string' ? event : event.name;
  const transition = run.stateId === 'entry'
    ? findEntryTransition(machine, event)
    : findTransition(machine, run.stateId, event);
  if (!transition) {
    if ((eventName === 'complete' || eventName === 'next') && run.stateId !== 'entry') {
      const hasEventsToWaitFor = (machine.transitions ?? []).some(transition => transition.from === run.stateId && transition.trigger);
      return {
        ...run,
        currentFrame: getStateTimelineDuration(doc, machine, run.stateId),
        playing: false,
        event: hasEventsToWaitFor ? run.event : eventName,
        finished: !hasEventsToWaitFor,
        changed: !hasEventsToWaitFor,
      };
    }
    return { ...run, changed: false };
  }

  const targetStateId = resolveTransitionTarget(machine, transition);
  if (targetStateId === 'exit') {
    return {
      ...run,
      playing: false,
      event: eventName,
      previousStateId: run.stateId,
      activeTransitionId: transition.id,
      exited: true,
      changed: true,
    };
  }
  const next = settleImmediateTransitions(doc, machine, enterState(doc, machine, targetStateId, {
    event: eventName,
    previousStateId: run.stateId,
    activeTransitionId: transition.id,
    statePath: run.stateId === 'entry' ? [targetStateId] : [...run.statePath, targetStateId],
  }));
  return { ...next, changed: true };
}

export function advanceStateMachineRunFrame(
  doc: ElucimV2Document,
  run: ElucimV2StateMachineRun,
  frameDelta: number,
): ElucimV2StateMachineRun {
  if (!run.playing || run.stateId === 'entry' || frameDelta <= 0) return run;
  const machine = getMachine(doc, run.machineId);
  const duration = getStateTimelineDuration(doc, machine, run.stateId);
  const nextFrame = run.currentFrame + frameDelta;
  if (nextFrame > duration) {
    return dispatchStateMachineRunEvent(doc, { ...run, currentFrame: duration }, 'complete');
  }
  return { ...run, currentFrame: nextFrame };
}

export function getStateMachineRunVisualFrames(
  doc: ElucimV2Document,
  run: ElucimV2StateMachineRun,
): ElucimV2StateMachineVisualFrame[] {
  return getStateMachineVisualFrames(doc, run.machineId, {
    statePath: run.stateId === 'entry' ? ['entry'] : run.statePath,
    currentStateId: run.stateId,
    currentFrame: run.currentFrame,
    exited: run.exited,
    finished: run.finished,
    missingState: 'skip',
    missingTimeline: 'skip',
  });
}

export function getStateMachineVisualFrames(
  doc: ElucimV2Document,
  machineId: string,
  options: ElucimV2StateMachineVisualFrameOptions,
): ElucimV2StateMachineVisualFrame[] {
  const machine = getMachine(doc, machineId);
  if (options.exited || options.finished) {
    return Object.entries(doc.timelines ?? {}).map(([timelineId, timeline]) => ({ timelineId, frame: timeline.duration }));
  }
  const path = options.statePath?.length ? options.statePath : [options.currentStateId];
  const frames: ElucimV2StateMachineVisualFrame[] = Object.keys(doc.timelines ?? {}).map(timelineId => ({ timelineId, frame: 0 }));
  for (const stateId of path) {
    if (stateId === 'entry') continue;
    const state = machine.states[stateId];
    if (!state) {
      if (options.missingState === 'skip') continue;
      throw new Error(`State "${stateId}" does not exist in machine "${machineId}"`);
    }
    if (!state.timeline) continue;
    const timeline = doc.timelines?.[state.timeline];
    if (!timeline) {
      if (options.missingTimeline === 'skip') continue;
      throw new Error(`Timeline "${state.timeline}" does not exist`);
    }
    frames.push({
      timelineId: state.timeline,
      frame: stateId === options.currentStateId && !options.exited ? options.currentFrame : timeline.duration,
    });
  }
  return frames;
}

export function transitionStateMachine(
  doc: ElucimV2Document,
  machineId: string,
  currentStateId: string,
  event: string | ElucimV2StateEvent,
): ElucimV2StateTransitionResult {
  const machine = getMachine(doc, machineId);
  const state = machine.states[currentStateId];
  if (!state) throw new Error(`State "${currentStateId}" does not exist in machine "${machineId}"`);
  const eventName = typeof event === 'string' ? event : event.name;

  const transition = findTransition(machine, currentStateId, event);
  if (!transition) {
    return {
      ...snapshot(machine, currentStateId),
      changed: false,
      event: eventName,
      previousStateId: currentStateId,
    };
  }

  const targetStateId = transition.to === 'entry' ? getInitialStateId(machine) : transition.to;
  if (targetStateId === 'exit') {
    return {
      machineId: machine.id,
      stateId: currentStateId,
      events: [],
      eventTransitions: [],
      changed: true,
      event: eventName,
      previousStateId: currentStateId,
      exited: true,
    };
  }
  if (!machine.states[targetStateId]) throw new Error(`Transition target "${targetStateId}" does not exist in machine "${machineId}"`);
  const next = snapshot(machine, targetStateId);
  return {
    ...next,
    changed: targetStateId !== currentStateId,
    event: eventName,
    previousStateId: currentStateId,
  };
}

function getMachine(doc: ElucimV2Document, machineId: string): ElucimV2StateMachine {
  const machine = doc.stateMachines?.[machineId];
  if (!machine) throw new Error(`State machine "${machineId}" does not exist`);
  return machine;
}

function getInitialStateId(machine: ElucimV2StateMachine): string {
  const entryTransition = machine.transitions?.find(transition => transition.from === 'entry' && transition.to !== 'entry' && transition.to !== 'exit');
  return entryTransition?.to ?? machine.entry;
}

function getEntryTransition(machine: ElucimV2StateMachine): ElucimV2Transition | undefined {
  return machine.transitions?.find(transition => transition.from === 'entry');
}

function findEntryTransition(machine: ElucimV2StateMachine, event: string | ElucimV2StateEvent): ElucimV2Transition | undefined {
  const eventName = typeof event === 'string' ? event : event.name;
  const key = typeof event === 'string' ? undefined : event.key;
  return (machine.transitions ?? []).find(transition => {
    if (transition.from !== 'entry' || transition.trigger !== eventName) return false;
    return eventName !== 'onKey' || key === undefined || (transition.key ?? '').toLowerCase() === key.toLowerCase();
  });
}

function resolveTransitionTarget(machine: ElucimV2StateMachine, transition: ElucimV2Transition): string | 'exit' {
  if (transition.to === 'exit') return 'exit';
  if (transition.to === 'entry') return getInitialStateId(machine);
  return transition.to;
}

function enterState(
  doc: ElucimV2Document,
  machine: ElucimV2StateMachine,
  stateId: string,
  details: { event: string; previousStateId?: string; activeTransitionId?: string; statePath?: string[] },
): ElucimV2StateMachineRun {
  if (!machine.states[stateId]) throw new Error(`State "${stateId}" does not exist in machine "${machine.id}"`);
  const timelineId = machine.states[stateId].timeline;
  return {
    machineId: machine.id,
    stateId,
    timelineId,
    statePath: details.statePath ?? [stateId],
    currentFrame: 0,
    playing: Boolean(timelineId && doc.timelines?.[timelineId]),
    event: details.event,
    previousStateId: details.previousStateId,
    activeTransitionId: details.activeTransitionId,
  };
}

function getStateTimelineDuration(doc: ElucimV2Document, machine: ElucimV2StateMachine, stateId: string): number {
  const timelineId = machine.states[stateId]?.timeline;
  return timelineId ? doc.timelines?.[timelineId]?.duration ?? 0 : 0;
}

function settleImmediateTransitions(
  doc: ElucimV2Document,
  machine: ElucimV2StateMachine,
  run: ElucimV2StateMachineRun,
  visited = new Set<string>(),
): ElucimV2StateMachineRun {
  if (run.stateId === 'entry' || run.exited || run.finished || run.playing || run.timelineId) return run;
  if (visited.has(run.stateId)) return run;
  const transition = findTransition(machine, run.stateId, 'complete');
  if (!transition) return run;
  visited.add(run.stateId);
  const targetStateId = resolveTransitionTarget(machine, transition);
  if (targetStateId === 'exit') {
    return {
      ...run,
      event: 'complete',
      previousStateId: run.stateId,
      activeTransitionId: transition.id,
      exited: true,
    };
  }
  return settleImmediateTransitions(doc, machine, enterState(doc, machine, targetStateId, {
    event: 'complete',
    previousStateId: run.stateId,
    activeTransitionId: transition.id,
    statePath: [...run.statePath, targetStateId],
  }), visited);
}

function snapshot(machine: ElucimV2StateMachine, stateId: string): ElucimV2StateSnapshot {
  const state = machine.states[stateId];
  if (!state) throw new Error(`State "${stateId}" does not exist in machine "${machine.id}"`);
  const eventTransitions = machine.transitions
    ?.filter(transition => (transition.from === stateId || transition.from === 'any') && transition.trigger)
    .map(transition => ({
      event: transition.trigger!,
      key: transition.key,
      transitionId: transition.id,
    }))
    ?? [];
  const completeTarget = machine.transitions?.find(transition => transition.from === stateId && transition.exitTime !== undefined)?.to;
  const onComplete = completeTarget === 'entry' ? getInitialStateId(machine) : completeTarget;
  return {
    machineId: machine.id,
    stateId,
    timelineId: state.timeline,
    events: [...new Set(eventTransitions.map(transition => transition.event))],
    eventTransitions,
    onComplete,
  };
}

function findTransition(machine: ElucimV2StateMachine, stateId: string, event: string | ElucimV2StateEvent): ElucimV2Transition | undefined {
  const eventName = typeof event === 'string' ? event : event.name;
  const key = typeof event === 'string' ? undefined : event.key;
  if (eventName === 'complete' || eventName === 'next') {
    return machine.transitions?.find(transition => transition.from === stateId && transition.exitTime !== undefined);
  }
  return machine.transitions?.find(transition => {
    if ((transition.from !== stateId && transition.from !== 'any') || transition.trigger !== eventName) return false;
    return eventName !== 'onKey' || key === undefined || (transition.key ?? '').toLowerCase() === key.toLowerCase();
  });
}
