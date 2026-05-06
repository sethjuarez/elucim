import type { ElucimV2Document, ElucimV2StateMachine, ElucimV2Transition } from './types';

export interface ElucimV2StateSnapshot {
  machineId: string;
  stateId: string;
  timelineId?: string;
  events: string[];
  onComplete?: string;
}

export interface ElucimV2StateTransitionResult extends ElucimV2StateSnapshot {
  changed: boolean;
  event: string;
  previousStateId: string;
}

export function getInitialStateSnapshot(doc: ElucimV2Document, machineId: string): ElucimV2StateSnapshot {
  const machine = getMachine(doc, machineId);
  return snapshot(machine, machine.initial);
}

export function transitionStateMachine(
  doc: ElucimV2Document,
  machineId: string,
  currentStateId: string,
  event: string,
): ElucimV2StateTransitionResult {
  const machine = getMachine(doc, machineId);
  const state = machine.states[currentStateId];
  if (!state) throw new Error(`State "${currentStateId}" does not exist in machine "${machineId}"`);

  const transition = event === 'complete' ? state.onComplete : state.on?.[event];
  if (!transition) {
    return {
      ...snapshot(machine, currentStateId),
      changed: false,
      event,
      previousStateId: currentStateId,
    };
  }

  const targetStateId = typeof transition === 'string' ? transition : transition.target;
  if (!machine.states[targetStateId]) throw new Error(`Transition target "${targetStateId}" does not exist in machine "${machineId}"`);
  const next = snapshot(machine, targetStateId);
  const transitionTimeline = typeof transition === 'string' ? undefined : transition.timeline;
  return {
    ...next,
    timelineId: transitionTimeline ?? next.timelineId,
    changed: targetStateId !== currentStateId || Boolean(transitionTimeline),
    event,
    previousStateId: currentStateId,
  };
}

function getMachine(doc: ElucimV2Document, machineId: string): ElucimV2StateMachine {
  const machine = doc.stateMachines?.[machineId];
  if (!machine) throw new Error(`State machine "${machineId}" does not exist`);
  return machine;
}

function snapshot(machine: ElucimV2StateMachine, stateId: string): ElucimV2StateSnapshot {
  const state = machine.states[stateId];
  if (!state) throw new Error(`State "${stateId}" does not exist in machine "${machine.id}"`);
  return {
    machineId: machine.id,
    stateId,
    timelineId: state.timeline,
    events: Object.keys(state.on ?? {}),
    onComplete: transitionTarget(state.onComplete),
  };
}

function transitionTarget(transition: string | ElucimV2Transition | undefined): string | undefined {
  return typeof transition === 'string' ? transition : transition?.target;
}
