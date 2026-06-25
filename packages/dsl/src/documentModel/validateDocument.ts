import type { ElucimDocument, ElucimElement, ElucimTransition } from './types';
import type { ValidationError, ValidationResult } from '../validator/validate';

const VALID_ROOT_TYPES = new Set(['scene', 'player']);
const VALID_TIMELINE_PROPERTIES = new Set(['opacity', 'translate', 'scale', 'rotate', 'fill', 'stroke', 'x', 'dx', 'from', 'to', 'n']);
const RESERVED_EVENT_NAMES = new Set(['complete', 'entry', 'exit', 'next']);
const LEGACY_WRAPPER_ELEMENT_TYPES = new Set(['sequence', 'fadein', 'fadeout', 'draw', 'write', 'transform', 'morph', 'stagger', 'parallel']);
const LEGACY_ANIMATION_PROPS = new Set(['fadeIn', 'fadeOut', 'draw', 'write']);

export function validateDocument(doc: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  if (!doc || typeof doc !== 'object') {
    errors.push({ path: '', message: 'Document must be an object', severity: 'error' });
    return result(errors);
  }

  const d = doc as Partial<ElucimDocument>;
  if (d.version !== '2.0') {
    errors.push({ path: 'version', message: `Expected version "2.0", got "${String((d as { version?: unknown }).version)}"`, severity: 'error' });
  }

  if (!d.scene || typeof d.scene !== 'object') {
    errors.push({ path: 'scene', message: 'Missing or invalid "scene"', severity: 'error' });
  } else {
    if (!VALID_ROOT_TYPES.has(d.scene.type)) {
      errors.push({ path: 'scene.type', message: 'scene.type must be "scene" or "player"', severity: 'error' });
    }
    if ('durationInFrames' in d.scene) {
      errors.push({ path: 'scene.durationInFrames', message: 'Scene duration is not part of Elucim Document scene layout; timelines, state machines, and export policies own time.', severity: 'error' });
    }
    if (!Array.isArray(d.scene.children)) {
      errors.push({ path: 'scene.children', message: 'scene.children must be an array of element IDs', severity: 'error' });
    }
  }

  if (!d.elements || typeof d.elements !== 'object' || Array.isArray(d.elements)) {
    errors.push({ path: 'elements', message: 'elements must be an object keyed by element ID', severity: 'error' });
    return result(errors);
  }

  const elements = d.elements as Record<string, ElucimElement>;
  for (const [id, element] of Object.entries(elements)) {
    validateElement(id, element, errors);
  }
  validateReferences(d as ElucimDocument, errors);
  validateTimelines(d as ElucimDocument, errors);
  validateStateMachines(d as ElucimDocument, errors);
  validateDefaultStateMachine(d as ElucimDocument, errors);

  return result(errors);
}

function validateDefaultStateMachine(doc: ElucimDocument, errors: ValidationError[]) {
  if (doc.defaultStateMachine && !doc.stateMachines?.[doc.defaultStateMachine]) {
    errors.push({ path: 'defaultStateMachine', message: `Unknown default state machine "${doc.defaultStateMachine}"`, severity: 'error' });
  }
}

function validateElement(id: string, element: ElucimElement, errors: ValidationError[]) {
  const path = `elements.${id}`;
  if (!element || typeof element !== 'object') {
    errors.push({ path, message: 'Element must be an object', severity: 'error' });
    return;
  }
  if (element.id !== id) {
    errors.push({ path: `${path}.id`, message: `Element id "${element.id}" must match map key "${id}"`, severity: 'error' });
  }
  if (!element.type || typeof element.type !== 'string') {
    errors.push({ path: `${path}.type`, message: 'Element type is required', severity: 'error' });
  } else if (LEGACY_WRAPPER_ELEMENT_TYPES.has(element.type.toLowerCase())) {
    errors.push({
      path: `${path}.type`,
      message: `Legacy wrapper element "${element.type}" is not part of Elucim Documents. Use timelines and state machines for motion.`,
      severity: 'error',
    });
  }
  if (!element.props || typeof element.props !== 'object' || Array.isArray(element.props)) {
    errors.push({ path: `${path}.props`, message: 'Element props must be an object', severity: 'error' });
  } else {
    for (const prop of LEGACY_ANIMATION_PROPS) {
      if (prop in element.props) {
        errors.push({
          path: `${path}.props.${prop}`,
          message: `Legacy animation prop "${prop}" is not part of Elucim Documents. Use timeline tracks and keyframes instead.`,
          severity: 'error',
        });
      }
    }
  }
  if (element.children !== undefined && !Array.isArray(element.children)) {
    errors.push({ path: `${path}.children`, message: 'Element children must be an array of element IDs', severity: 'error' });
  }
  validateIntent(element, path, errors);
  validateLayout(element, path, errors);
}

function validateIntent(element: ElucimElement, path: string, errors: ValidationError[]) {
  if (element.intent === undefined) return;
  if (!element.intent || typeof element.intent !== 'object' || Array.isArray(element.intent)) {
    errors.push({ path: `${path}.intent`, message: 'Element intent must be an object', severity: 'error' });
    return;
  }
  if (element.intent.target !== undefined && typeof element.intent.target !== 'string') {
    errors.push({ path: `${path}.intent.target`, message: 'intent.target must be an element ID string', severity: 'error' });
  }
  validateStringArray(element.intent.flowFrom, `${path}.intent.flowFrom`, errors);
  validateStringArray(element.intent.flowTo, `${path}.intent.flowTo`, errors);
  if (element.intent.relationship !== undefined && typeof element.intent.relationship !== 'string') {
    errors.push({ path: `${path}.intent.relationship`, message: 'intent.relationship must be a string', severity: 'error' });
  }
  if (element.intent.group !== undefined && typeof element.intent.group !== 'string') {
    errors.push({ path: `${path}.intent.group`, message: 'intent.group must be a string', severity: 'error' });
  }
}

function validateLayout(element: ElucimElement, path: string, errors: ValidationError[]) {
  if (element.layout === undefined) return;
  if (!element.layout || typeof element.layout !== 'object' || Array.isArray(element.layout)) {
    errors.push({ path: `${path}.layout`, message: 'Element layout must be an object', severity: 'error' });
    return;
  }
  if (element.layout.rank !== undefined && !Number.isFinite(element.layout.rank)) {
    errors.push({ path: `${path}.layout.rank`, message: 'layout.rank must be a finite number', severity: 'error' });
  }
  if (element.layout.locked !== undefined && typeof element.layout.locked !== 'boolean') {
    errors.push({ path: `${path}.layout.locked`, message: 'layout.locked must be a boolean', severity: 'error' });
  }
}

function validateReferences(doc: ElucimDocument, errors: ValidationError[]) {
  const ids = new Set(Object.keys(doc.elements ?? {}));
  doc.scene?.children?.forEach((id, index) => {
    if (!ids.has(id)) {
      errors.push({ path: `scene.children[${index}]`, message: `Unknown element ID "${id}"`, severity: 'error' });
    }
  });

  for (const [id, element] of Object.entries(doc.elements ?? {})) {
    if (element.parentId && !ids.has(element.parentId)) {
      errors.push({ path: `elements.${id}.parentId`, message: `Unknown parent ID "${element.parentId}"`, severity: 'error' });
    }
    if (element.intent?.target && !ids.has(element.intent.target)) {
      errors.push({ path: `elements.${id}.intent.target`, message: `Unknown intent target "${element.intent.target}"`, severity: 'error' });
    } else if (element.intent?.target === id) {
      errors.push({ path: `elements.${id}.intent.target`, message: 'Element cannot target itself', severity: 'error' });
    }
    element.intent?.flowFrom?.forEach((sourceId, index) => {
      if (!ids.has(sourceId)) {
        errors.push({ path: `elements.${id}.intent.flowFrom[${index}]`, message: `Unknown flow source "${sourceId}"`, severity: 'error' });
      } else if (sourceId === id) {
        errors.push({ path: `elements.${id}.intent.flowFrom[${index}]`, message: 'Element cannot flow from itself', severity: 'error' });
      }
    });
    element.intent?.flowTo?.forEach((targetId, index) => {
      if (!ids.has(targetId)) {
        errors.push({ path: `elements.${id}.intent.flowTo[${index}]`, message: `Unknown flow target "${targetId}"`, severity: 'error' });
      } else if (targetId === id) {
        errors.push({ path: `elements.${id}.intent.flowTo[${index}]`, message: 'Element cannot flow to itself', severity: 'error' });
      }
    });
    element.children?.forEach((childId, index) => {
      if (!ids.has(childId)) {
        errors.push({ path: `elements.${id}.children[${index}]`, message: `Unknown child ID "${childId}"`, severity: 'error' });
      } else if (doc.elements[childId]?.parentId !== id) {
        errors.push({ path: `elements.${id}.children[${index}]`, message: `Child "${childId}" must have parentId "${id}"`, severity: 'error' });
      }
    });
  }
}

function validateStringArray(value: unknown, path: string, errors: ValidationError[]) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    const pathParts = path.split('.');
    errors.push({ path, message: `${pathParts[pathParts.length - 1]} must be an array of element ID strings`, severity: 'error' });
    return;
  }
  value.forEach((entry, index) => {
    if (typeof entry !== 'string') {
      errors.push({ path: `${path}[${index}]`, message: 'Expected an element ID string', severity: 'error' });
    }
  });
}

function validateTimelines(doc: ElucimDocument, errors: ValidationError[]) {
  const ids = new Set(Object.keys(doc.elements ?? {}));
  for (const [timelineId, timeline] of Object.entries(doc.timelines ?? {})) {
    if (timeline.id !== timelineId) {
      errors.push({ path: `timelines.${timelineId}.id`, message: `Timeline id must match key "${timelineId}"`, severity: 'error' });
    }
    if (!Number.isFinite(timeline.duration) || timeline.duration <= 0) {
      errors.push({ path: `timelines.${timelineId}.duration`, message: 'Timeline duration must be positive', severity: 'error' });
    }
    timeline.tracks?.forEach((track, trackIndex) => {
      const trackPath = `timelines.${timelineId}.tracks[${trackIndex}]`;
      if (!ids.has(track.target)) {
        errors.push({ path: `${trackPath}.target`, message: `Unknown target "${track.target}"`, severity: 'error' });
      }
      if (!VALID_TIMELINE_PROPERTIES.has(track.property)) {
        errors.push({ path: `${trackPath}.property`, message: `Unsupported animatable property "${String(track.property)}"`, severity: 'error' });
      }
      if (!Array.isArray(track.keyframes) || track.keyframes.length === 0) {
        errors.push({ path: `${trackPath}.keyframes`, message: 'Track must have at least one keyframe', severity: 'error' });
      } else {
        let previousFrame = -1;
        track.keyframes.forEach((keyframe, keyframeIndex) => {
          const keyframePath = `${trackPath}.keyframes[${keyframeIndex}]`;
          if (!Number.isInteger(keyframe.frame) || keyframe.frame < 0) {
            errors.push({ path: `${keyframePath}.frame`, message: 'Keyframe frame must be a non-negative integer', severity: 'error' });
          } else {
            if (keyframe.frame > timeline.duration) {
              errors.push({ path: `${keyframePath}.frame`, message: 'Keyframe frame cannot exceed timeline duration', severity: 'error' });
            }
            if (keyframe.frame <= previousFrame) {
              errors.push({ path: `${keyframePath}.frame`, message: 'Keyframe frames must be strictly increasing', severity: 'error' });
            }
            previousFrame = keyframe.frame;
          }
          if (keyframe.value === undefined) {
            errors.push({ path: `${keyframePath}.value`, message: 'Keyframe value is required', severity: 'error' });
          }
        });
      }
    });
  }
}

function validateStateMachines(doc: ElucimDocument, errors: ValidationError[]) {
  const timelineIds = new Set(Object.keys(doc.timelines ?? {}));
  for (const [machineId, machine] of Object.entries(doc.stateMachines ?? {})) {
    if (machine.id !== machineId) {
      errors.push({ path: `stateMachines.${machineId}.id`, message: `State machine id must match key "${machineId}"`, severity: 'error' });
    }
    if (!machine.states?.[machine.entry]) {
      errors.push({ path: `stateMachines.${machineId}.entry`, message: `Entry state "${machine.entry}" does not exist`, severity: 'error' });
    }
    for (const [inputId, input] of Object.entries(machine.inputs ?? {})) {
      if (!input || !['trigger', 'boolean', 'number'].includes(input.type)) {
        errors.push({ path: `stateMachines.${machineId}.inputs.${inputId}.type`, message: 'Input type must be "trigger", "boolean", or "number"', severity: 'error' });
      }
    }
    for (const [stateId, state] of Object.entries(machine.states ?? {})) {
      if (state.timeline && !timelineIds.has(state.timeline)) {
        errors.push({ path: `stateMachines.${machineId}.states.${stateId}.timeline`, message: `Unknown timeline "${state.timeline}"`, severity: 'error' });
      }
    }
    const nextSources = new Set<string>();
    const eventSources = new Set<string>();
    const entryTransitions = machine.transitions?.filter(transition => transition.from === 'entry') ?? [];
    if (entryTransitions.length !== 1) {
      errors.push({ path: `stateMachines.${machineId}.transitions`, message: 'Entry must have exactly one outgoing transition', severity: 'error' });
    } else if (entryTransitions[0].to !== machine.entry) {
      errors.push({ path: `stateMachines.${machineId}.entry`, message: 'Machine entry must match the explicit Entry transition target', severity: 'error' });
    }
    machine.transitions?.forEach((transition, index) => {
      validateTransition(machineId, index, transition, machine.states ?? {}, timelineIds, errors);
      const path = `stateMachines.${machineId}.transitions[${index}]`;
      if (transition.from === 'entry') {
        if (transition.to === 'entry' || transition.to === 'exit') {
          errors.push({ path: `${path}.to`, message: 'Entry transition must target a real state', severity: 'error' });
        }
        if (transition.exitTime !== undefined) {
          errors.push({ path: `${path}.exitTime`, message: 'Entry transitions cannot be Next transitions', severity: 'error' });
        }
        if (!transition.trigger) {
          errors.push({ path: `${path}.trigger`, message: 'Entry transitions require a start event such as onStart or onClick', severity: 'error' });
        } else if (RESERVED_EVENT_NAMES.has(transition.trigger)) {
          errors.push({ path: `${path}.trigger`, message: `"${transition.trigger}" is reserved and cannot be used as an event name`, severity: 'error' });
        }
        if (transition.trigger === 'onKey' && !transition.key?.trim()) {
          errors.push({ path: `${path}.key`, message: 'onKey transitions require a key', severity: 'error' });
        }
      }
      if (transition.exitTime !== undefined) {
        if (transition.trigger) {
          errors.push({ path: `${path}.trigger`, message: 'Next transitions must not have event names', severity: 'error' });
        }
        if (nextSources.has(transition.from)) {
          errors.push({ path: `${path}.from`, message: `State "${transition.from}" can only have one Next transition`, severity: 'error' });
        }
        nextSources.add(transition.from);
        return;
      }
      if (transition.from !== 'entry') {
        if (!transition.trigger) {
          errors.push({ path: `${path}.trigger`, message: 'Event transitions require an event name', severity: 'error' });
          return;
        }
        if (RESERVED_EVENT_NAMES.has(transition.trigger)) {
          errors.push({ path: `${path}.trigger`, message: `"${transition.trigger}" is reserved and cannot be used as an event name`, severity: 'error' });
        }
        const eventKey = `${transition.from}:${transition.trigger}`;
        if (transition.trigger === 'onKey' && !transition.key?.trim()) {
          errors.push({ path: `${path}.key`, message: 'onKey transitions require a key', severity: 'error' });
        }
        const scopedEventKey = transition.trigger === 'onKey' ? `${eventKey}:${(transition.key ?? '').toLowerCase()}` : eventKey;
        if (eventSources.has(scopedEventKey)) {
          const eventLabel = transition.trigger === 'onKey' ? `${transition.trigger}:${transition.key ?? ''}` : transition.trigger;
          errors.push({ path: `${path}.trigger`, message: `Duplicate event "${eventLabel}" from "${transition.from}"`, severity: 'error' });
        }
        eventSources.add(scopedEventKey);
      }
    });
  }
}

function validateTransition(
  machineId: string,
  transitionIndex: number,
  transition: ElucimTransition,
  states: Record<string, unknown>,
  _timelineIds: Set<string>,
  errors: ValidationError[],
) {
  const path = `stateMachines.${machineId}.transitions[${transitionIndex}]`;
  if (!transition.id) {
    errors.push({ path: `${path}.id`, message: 'Transition id is required', severity: 'error' });
  }
  if (transition.from !== 'entry' && transition.from !== 'any' && !states[transition.from]) {
    errors.push({ path: `${path}.from`, message: `Unknown source state "${transition.from}"`, severity: 'error' });
  }
  if (transition.to !== 'entry' && transition.to !== 'exit' && !states[transition.to]) {
    errors.push({ path: `${path}.to`, message: `Unknown target state "${transition.to}"`, severity: 'error' });
  }
  if (transition.exitTime !== undefined && (!Number.isFinite(transition.exitTime) || transition.exitTime < 0)) {
    errors.push({ path: `${path}.exitTime`, message: 'Exit time must be a non-negative number', severity: 'error' });
  }
}

function result(errors: ValidationError[]): ValidationResult {
  return {
    valid: errors.every(error => error.severity !== 'error'),
    errors,
  };
}
