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
