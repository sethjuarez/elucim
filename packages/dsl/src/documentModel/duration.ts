import type { ElucimDocument, ElucimStateMachine, ElucimTimeline } from './types';

export const DEFAULT_LINEAR_DURATION_IN_FRAMES = 120;

export function getMaxTimelineDuration(timelines: Record<string, ElucimTimeline> | undefined): number | undefined {
  const durations = Object.values(timelines ?? {})
    .map(timeline => timeline.duration)
    .filter((duration): duration is number => Number.isFinite(duration) && duration > 0);
  return durations.length > 0 ? Math.max(...durations) : undefined;
}

export function getDocumentLinearDuration(doc: Pick<ElucimDocument, 'timelines' | 'stateMachines' | 'defaultStateMachine'>): number {
  const defaultMachineDuration = getDefaultStateMachineInitialTimelineDuration(doc);
  return defaultMachineDuration ?? getMaxTimelineDuration(doc.timelines) ?? DEFAULT_LINEAR_DURATION_IN_FRAMES;
}

function getDefaultStateMachineInitialTimelineDuration(doc: Pick<ElucimDocument, 'timelines' | 'stateMachines' | 'defaultStateMachine'>): number | undefined {
  const machine = doc.defaultStateMachine ? doc.stateMachines?.[doc.defaultStateMachine] : undefined;
  if (!machine) return undefined;
  const stateId = getInitialStateId(machine);
  const timelineId = stateId ? machine.states[stateId]?.timeline : undefined;
  return timelineId ? doc.timelines?.[timelineId]?.duration : undefined;
}

function getInitialStateId(machine: ElucimStateMachine): string | undefined {
  const entryTarget = machine.transitions?.find(transition => transition.from === 'entry' && transition.to !== 'entry' && transition.to !== 'exit')?.to;
  if (entryTarget && machine.states[entryTarget]) return entryTarget;
  return machine.states[machine.entry] ? machine.entry : undefined;
}

export type ElucimExportPolicy =
  | { type: 'timeline'; timelineId: string }
  | { type: 'state'; machineId: string; stateId: string }
  | { type: 'machineUntilExit'; machineId: string; maxFrames: number }
  | { type: 'machineFirstFrames'; machineId: string; frameCount: number }
  | { type: 'scriptedMachine'; machineId: string; events: Array<{ atFrame: number; event: string; key?: string }>; maxFrames: number };

export function resolveExportFrameCount(doc: ElucimDocument, policy: ElucimExportPolicy): number {
  switch (policy.type) {
    case 'timeline': {
      const timeline = doc.timelines?.[policy.timelineId];
      if (!timeline) throw new Error(`Timeline "${policy.timelineId}" does not exist`);
      return timeline.duration;
    }
    case 'state': {
      const machine = doc.stateMachines?.[policy.machineId];
      if (!machine) throw new Error(`State machine "${policy.machineId}" does not exist`);
      const state = machine.states[policy.stateId];
      if (!state) throw new Error(`State "${policy.stateId}" does not exist in machine "${policy.machineId}"`);
      if (!state.timeline) return 1;
      const timeline = doc.timelines?.[state.timeline];
      if (!timeline) throw new Error(`Timeline "${state.timeline}" does not exist`);
      return timeline.duration;
    }
    case 'machineUntilExit':
    case 'scriptedMachine':
      requireMachine(doc, policy.machineId);
      return requirePositiveFrameCap(policy.maxFrames, `${policy.type}.maxFrames`);
    case 'machineFirstFrames':
      requireMachine(doc, policy.machineId);
      return requirePositiveFrameCap(policy.frameCount, 'machineFirstFrames.frameCount');
  }
}

function requireMachine(doc: ElucimDocument, machineId: string) {
  if (!doc.stateMachines?.[machineId]) throw new Error(`State machine "${machineId}" does not exist`);
}

function requirePositiveFrameCap(value: number, path: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${path} must be a positive integer`);
  }
  return value;
}
