import type { ElucimV2Document, ElucimV2Element } from './types';
import type { ValidationError, ValidationResult } from '../validator/validate';

const VALID_ROOT_TYPES = new Set(['scene', 'player']);
const VALID_TIMELINE_PROPERTIES = new Set(['opacity', 'translate', 'scale', 'rotate', 'fill', 'stroke']);

export function validateV2(doc: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  if (!doc || typeof doc !== 'object') {
    errors.push({ path: '', message: 'Document must be an object', severity: 'error' });
    return result(errors);
  }

  const d = doc as Partial<ElucimV2Document>;
  if (d.version !== '2.0') {
    errors.push({ path: 'version', message: `Expected version "2.0", got "${String((d as { version?: unknown }).version)}"`, severity: 'error' });
  }

  if (!d.scene || typeof d.scene !== 'object') {
    errors.push({ path: 'scene', message: 'Missing or invalid "scene"', severity: 'error' });
  } else {
    if (!VALID_ROOT_TYPES.has(d.scene.type)) {
      errors.push({ path: 'scene.type', message: 'scene.type must be "scene" or "player"', severity: 'error' });
    }
    if (!Number.isInteger(d.scene.durationInFrames) || d.scene.durationInFrames <= 0) {
      errors.push({ path: 'scene.durationInFrames', message: 'durationInFrames must be a positive integer', severity: 'error' });
    }
    if (!Array.isArray(d.scene.children)) {
      errors.push({ path: 'scene.children', message: 'scene.children must be an array of element IDs', severity: 'error' });
    }
  }

  if (!d.elements || typeof d.elements !== 'object' || Array.isArray(d.elements)) {
    errors.push({ path: 'elements', message: 'elements must be an object keyed by element ID', severity: 'error' });
    return result(errors);
  }

  const elements = d.elements as Record<string, ElucimV2Element>;
  for (const [id, element] of Object.entries(elements)) {
    validateElement(id, element, errors);
  }
  validateReferences(d as ElucimV2Document, errors);
  validateTimelines(d as ElucimV2Document, errors);
  validateStateMachines(d as ElucimV2Document, errors);

  return result(errors);
}

function validateElement(id: string, element: ElucimV2Element, errors: ValidationError[]) {
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
  }
  if (!element.props || typeof element.props !== 'object' || Array.isArray(element.props)) {
    errors.push({ path: `${path}.props`, message: 'Element props must be an object', severity: 'error' });
  }
  if (element.children !== undefined && !Array.isArray(element.children)) {
    errors.push({ path: `${path}.children`, message: 'Element children must be an array of element IDs', severity: 'error' });
  }
}

function validateReferences(doc: ElucimV2Document, errors: ValidationError[]) {
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
    element.children?.forEach((childId, index) => {
      if (!ids.has(childId)) {
        errors.push({ path: `elements.${id}.children[${index}]`, message: `Unknown child ID "${childId}"`, severity: 'error' });
      } else if (doc.elements[childId]?.parentId !== id) {
        errors.push({ path: `elements.${id}.children[${index}]`, message: `Child "${childId}" must have parentId "${id}"`, severity: 'error' });
      }
    });
  }
}

function validateTimelines(doc: ElucimV2Document, errors: ValidationError[]) {
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

function validateStateMachines(doc: ElucimV2Document, errors: ValidationError[]) {
  const timelineIds = new Set(Object.keys(doc.timelines ?? {}));
  for (const [machineId, machine] of Object.entries(doc.stateMachines ?? {})) {
    if (machine.id !== machineId) {
      errors.push({ path: `stateMachines.${machineId}.id`, message: `State machine id must match key "${machineId}"`, severity: 'error' });
    }
    if (!machine.states?.[machine.initial]) {
      errors.push({ path: `stateMachines.${machineId}.initial`, message: `Initial state "${machine.initial}" does not exist`, severity: 'error' });
    }
    if (machine.reset && !machine.states?.[machine.reset]) {
      errors.push({ path: `stateMachines.${machineId}.reset`, message: `Reset state "${machine.reset}" does not exist`, severity: 'error' });
    }
    for (const [stateId, state] of Object.entries(machine.states ?? {})) {
      if (state.timeline && !timelineIds.has(state.timeline)) {
        errors.push({ path: `stateMachines.${machineId}.states.${stateId}.timeline`, message: `Unknown timeline "${state.timeline}"`, severity: 'error' });
      }
      for (const [event, transition] of Object.entries(state.on ?? {})) {
        validateTransition(machineId, stateId, `on.${event}`, transition, machine.states ?? {}, timelineIds, errors);
      }
      if (state.onComplete) {
        validateTransition(machineId, stateId, 'onComplete', state.onComplete, machine.states ?? {}, timelineIds, errors);
      }
    }
  }
}

function validateTransition(
  machineId: string,
  stateId: string,
  transitionPath: string,
  transition: string | { target: string; timeline?: string },
  states: Record<string, unknown>,
  timelineIds: Set<string>,
  errors: ValidationError[],
) {
  const target = typeof transition === 'string' ? transition : transition.target;
  const timeline = typeof transition === 'string' ? undefined : transition.timeline;
  if (!states[target]) {
    errors.push({ path: `stateMachines.${machineId}.states.${stateId}.${transitionPath}`, message: `Unknown target state "${target}"`, severity: 'error' });
  }
  if (timeline && !timelineIds.has(timeline)) {
    errors.push({ path: `stateMachines.${machineId}.states.${stateId}.${transitionPath}.timeline`, message: `Unknown timeline "${timeline}"`, severity: 'error' });
  }
}

function result(errors: ValidationError[]): ValidationResult {
  return {
    valid: errors.every(error => error.severity !== 'error'),
    errors,
  };
}
