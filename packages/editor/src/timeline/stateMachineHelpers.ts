import type { ElucimStateMachine, ElucimTransition } from '@elucim/dsl';
import { EVENT_PRESET_SET, RESERVED_STATE_EVENT_NAMES } from './constants';

export function displayKeyName(key: string): string | undefined {
  if (key === 'Tab') return undefined;
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function getStateTriggerTransitions(machine: ElucimStateMachine, stateId: string): ElucimTransition[] {
  return (machine.transitions ?? []).filter(transition => (transition.from === stateId || transition.from === 'any') && transition.trigger);
}

export function getEntryTriggerTransitions(machine: ElucimStateMachine): ElucimTransition[] {
  return (machine.transitions ?? []).filter(transition => transition.from === 'entry' && transition.trigger);
}

export function getStateCompleteTransition(machine: ElucimStateMachine, stateId: string): ElucimTransition | undefined {
  return (machine.transitions ?? []).find(transition => transition.from === stateId && transition.exitTime !== undefined);
}

export function getEntryTransition(machine: ElucimStateMachine): ElucimTransition | undefined {
  return (machine.transitions ?? []).find(transition => transition.from === 'entry');
}

export function getEntryTargetStateId(machine: ElucimStateMachine): string | undefined {
  const entryTarget = getEntryTransition(machine)?.to;
  if (entryTarget && entryTarget !== 'entry' && entryTarget !== 'exit' && machine.states[entryTarget]) return entryTarget;
  return machine.states[machine.entry] ? machine.entry : Object.keys(machine.states)[0];
}

export function resolveTransitionTarget(machine: ElucimStateMachine, transition: ElucimTransition): string | 'exit' | undefined {
  if (transition.to === 'exit') return 'exit';
  if (transition.to === 'entry') return getEntryTargetStateId(machine);
  return machine.states[transition.to] ? transition.to : undefined;
}

export function getPreviewTransition(machine: ElucimStateMachine, stateId: string, eventName: string, key?: string): ElucimTransition | undefined {
  if (eventName === 'complete' || eventName === 'next') return getStateCompleteTransition(machine, stateId);
  return (machine.transitions ?? []).find(transition => {
    if ((transition.from !== stateId && transition.from !== 'any') || transition.trigger !== eventName) return false;
    return eventName !== 'onKey' || key === undefined || (transition.key ?? '').toLowerCase() === key.toLowerCase();
  });
}

export function previewEventLabel(transition: ElucimTransition): string {
  switch (transition.trigger) {
    case 'onClick':
      return 'Click';
    case 'reset':
      return 'Reset';
    case 'onKey':
      return transition.key ? `Press ${transition.key}` : 'Press key';
    default:
      return transition.trigger ?? transition.id;
  }
}

export function createUniqueTransitionId(machine: ElucimStateMachine, preferred: string): string {
  const existing = new Set((machine.transitions ?? []).map(transition => transition.id));
  if (!existing.has(preferred)) return preferred;
  let index = 2;
  while (existing.has(`${preferred}-${index}`)) index += 1;
  return `${preferred}-${index}`;
}

export function pruneUnusedTriggerInputs(
  inputs: ElucimStateMachine['inputs'],
  transitions: ElucimTransition[] | undefined,
): ElucimStateMachine['inputs'] {
  if (!inputs) return undefined;
  const usedTriggers = new Set((transitions ?? []).map(transition => transition.trigger).filter((trigger): trigger is string => Boolean(trigger)));
  const nextInputs = Object.fromEntries(Object.entries(inputs).filter(([inputId, input]) => input.type !== 'trigger' || usedTriggers.has(inputId)));
  return Object.keys(nextInputs).length > 0 ? nextInputs : undefined;
}

export function isAvailableTransitionTrigger(machine: ElucimStateMachine, transition: ElucimTransition, trigger: string): boolean {
  if (!trigger || RESERVED_STATE_EVENT_NAMES.has(trigger)) return false;
  return !(machine.transitions ?? []).some(current => {
    if (current.id === transition.id || current.from !== transition.from || current.exitTime !== undefined || current.trigger !== trigger) return false;
    if (trigger === 'onKey') return (current.key ?? '').toLowerCase() === (transition.key ?? '').toLowerCase();
    return true;
  });
}

export function transitionTriggerLabel(transition: ElucimTransition): string {
  if (transition.from === 'entry') return transition.trigger ?? 'onStart';
  if (transition.trigger === 'onKey') return transition.key ? `Key: ${transition.key}` : 'Key';
  if (transition.trigger && EVENT_PRESET_SET.has(transition.trigger)) return transition.trigger;
  return transition.exitTime !== undefined ? 'Next' : `Event: ${transition.trigger ?? transition.id}`;
}
