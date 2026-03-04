import type {
  ElucimDocument, RootNode, ElementNode, SlideNode,
  EasingSpec, EasingName,
} from '../schema/types';
import { validateExpression } from '../math/evaluator';
import { VALID_EASING_NAMES } from '../renderer/resolveEasing';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ─── Main validator ─────────────────────────────────────────────────────────

export function validate(doc: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!doc || typeof doc !== 'object') {
    errors.push({ path: '', message: 'Document must be an object', severity: 'error' });
    return { valid: false, errors };
  }

  const d = doc as Record<string, unknown>;

  // version
  if (d.version !== '1.0') {
    errors.push({ path: 'version', message: `Expected version "1.0", got "${d.version}"`, severity: 'error' });
  }

  // root
  if (!d.root || typeof d.root !== 'object') {
    errors.push({ path: 'root', message: 'Missing or invalid "root" node', severity: 'error' });
    return { valid: errors.filter(e => e.severity === 'error').length === 0, errors };
  }

  validateRootNode(d.root as Record<string, unknown>, 'root', errors);

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
  };
}

// ─── Node validators ────────────────────────────────────────────────────────

const VALID_ROOT_TYPES = ['scene', 'player', 'presentation'];
const VALID_ELEMENT_TYPES = [
  'sequence', 'group',
  'circle', 'line', 'arrow', 'rect', 'polygon', 'text',
  'axes', 'functionPlot', 'vectorField', 'vector', 'matrix', 'graph', 'latex',
  'fadeIn', 'fadeOut', 'draw', 'write', 'transform', 'morph', 'stagger', 'parallel',
  'player', 'scene',
];
const VALID_TRANSITIONS = ['none', 'fade', 'slide-left', 'slide-up', 'zoom'];

function validateRootNode(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  const type = node.type as string;
  if (!VALID_ROOT_TYPES.includes(type)) {
    errors.push({ path: `${path}.type`, message: `Root type must be one of: ${VALID_ROOT_TYPES.join(', ')}. Got "${type}"`, severity: 'error' });
    return;
  }

  if (type === 'scene' || type === 'player') {
    validateContainerNode(node, path, type, errors);
  } else if (type === 'presentation') {
    validatePresentationNode(node, path, errors);
  }
}

function validateContainerNode(node: Record<string, unknown>, path: string, type: string, errors: ValidationError[]) {
  requirePositiveInt(node, 'durationInFrames', path, errors);
  optionalPositiveNum(node, 'width', path, errors);
  optionalPositiveNum(node, 'height', path, errors);
  optionalPositiveNum(node, 'fps', path, errors);
  optionalString(node, 'background', path, errors);

  if (type === 'player') {
    optionalBoolean(node, 'controls', path, errors);
    optionalBoolean(node, 'loop', path, errors);
    optionalBoolean(node, 'autoPlay', path, errors);
  }

  validateChildren(node, path, errors);
}

function validatePresentationNode(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  optionalPositiveNum(node, 'width', path, errors);
  optionalPositiveNum(node, 'height', path, errors);
  optionalString(node, 'background', path, errors);
  optionalPositiveNum(node, 'transitionDuration', path, errors);
  optionalBoolean(node, 'showHud', path, errors);
  optionalBoolean(node, 'showNotes', path, errors);

  if (node.transition !== undefined) {
    if (!VALID_TRANSITIONS.includes(node.transition as string)) {
      errors.push({
        path: `${path}.transition`,
        message: `Invalid transition "${node.transition}". Must be one of: ${VALID_TRANSITIONS.join(', ')}`,
        severity: 'error',
      });
    }
  }

  if (!Array.isArray(node.slides)) {
    errors.push({ path: `${path}.slides`, message: 'Presentation must have a "slides" array', severity: 'error' });
    return;
  }

  if (node.slides.length === 0) {
    errors.push({ path: `${path}.slides`, message: 'Presentation must have at least one slide', severity: 'warning' });
  }

  (node.slides as unknown[]).forEach((slide, i) => {
    validateSlideNode(slide as Record<string, unknown>, `${path}.slides[${i}]`, errors);
  });
}

function validateSlideNode(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (!node || typeof node !== 'object') {
    errors.push({ path, message: 'Slide must be an object', severity: 'error' });
    return;
  }
  optionalString(node, 'title', path, errors);
  optionalString(node, 'notes', path, errors);
  optionalString(node, 'background', path, errors);

  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      errors.push({ path: `${path}.children`, message: 'Slide children must be an array', severity: 'error' });
    } else {
      (node.children as unknown[]).forEach((child, i) => {
        validateElementNode(child as Record<string, unknown>, `${path}.children[${i}]`, errors);
      });
    }
  }
}

function validateChildren(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (!Array.isArray(node.children)) {
    errors.push({ path: `${path}.children`, message: 'Expected "children" array', severity: 'error' });
    return;
  }
  (node.children as unknown[]).forEach((child, i) => {
    validateElementNode(child as Record<string, unknown>, `${path}.children[${i}]`, errors);
  });
}

function validateElementNode(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (!node || typeof node !== 'object') {
    errors.push({ path, message: 'Element must be an object', severity: 'error' });
    return;
  }

  const type = node.type as string;
  if (!type || !VALID_ELEMENT_TYPES.includes(type)) {
    const suggestion = type ? findClosest(type, VALID_ELEMENT_TYPES) : '';
    errors.push({
      path: `${path}.type`,
      message: `Unknown element type "${type}".${suggestion} Valid types: ${VALID_ELEMENT_TYPES.join(', ')}`,
      severity: 'error',
    });
    return;
  }

  switch (type) {
    case 'circle': validateCircle(node, path, errors); break;
    case 'line': validateLine(node, path, errors); break;
    case 'arrow': validateArrow(node, path, errors); break;
    case 'rect': validateRect(node, path, errors); break;
    case 'polygon': validatePolygon(node, path, errors); break;
    case 'text': validateText(node, path, errors); break;
    case 'axes': validateAxes(node, path, errors); break;
    case 'functionPlot': validateFunctionPlot(node, path, errors); break;
    case 'vector': validateVector(node, path, errors); break;
    case 'vectorField': validateVectorField(node, path, errors); break;
    case 'matrix': validateMatrix(node, path, errors); break;
    case 'graph': validateGraph(node, path, errors); break;
    case 'latex': validateLaTeX(node, path, errors); break;
    case 'sequence': validateSequence(node, path, errors); break;
    case 'group':
    case 'parallel':
      validateChildren(node, path, errors); break;
    case 'fadeIn': case 'fadeOut': case 'draw': case 'write':
      validateAnimationWrapper(node, path, errors); break;
    case 'transform': validateTransformNode(node, path, errors); break;
    case 'morph': validateMorphNode(node, path, errors); break;
    case 'stagger': validateStaggerNode(node, path, errors); break;
    case 'scene': case 'player':
      validateContainerNode(node, path, type, errors); break;
  }
}

// ─── Primitive validators ───────────────────────────────────────────────────

function validateCircle(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  requireNumber(node, 'cx', path, errors);
  requireNumber(node, 'cy', path, errors);
  requirePositiveNum(node, 'r', path, errors);
  validateAnimationProps(node, path, errors);
}

function validateLine(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  requireNumber(node, 'x1', path, errors);
  requireNumber(node, 'y1', path, errors);
  requireNumber(node, 'x2', path, errors);
  requireNumber(node, 'y2', path, errors);
  validateAnimationProps(node, path, errors);
}

function validateArrow(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  requireNumber(node, 'x1', path, errors);
  requireNumber(node, 'y1', path, errors);
  requireNumber(node, 'x2', path, errors);
  requireNumber(node, 'y2', path, errors);
  validateAnimationProps(node, path, errors);
}

function validateRect(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  requireNumber(node, 'x', path, errors);
  requireNumber(node, 'y', path, errors);
  requirePositiveNum(node, 'width', path, errors);
  requirePositiveNum(node, 'height', path, errors);
  validateAnimationProps(node, path, errors);
}

function validatePolygon(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (!Array.isArray(node.points)) {
    errors.push({ path: `${path}.points`, message: 'Polygon requires a "points" array', severity: 'error' });
  } else if (node.points.length < 3) {
    errors.push({ path: `${path}.points`, message: 'Polygon requires at least 3 points', severity: 'error' });
  } else {
    (node.points as unknown[]).forEach((pt, i) => {
      if (!Array.isArray(pt) || pt.length !== 2 || typeof pt[0] !== 'number' || typeof pt[1] !== 'number') {
        errors.push({ path: `${path}.points[${i}]`, message: 'Each point must be [number, number]', severity: 'error' });
      }
    });
  }
  validateAnimationProps(node, path, errors);
}

function validateText(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  requireNumber(node, 'x', path, errors);
  requireNumber(node, 'y', path, errors);
  if (typeof node.content !== 'string') {
    errors.push({ path: `${path}.content`, message: 'Text requires a "content" string', severity: 'error' });
  }
  validateAnimationProps(node, path, errors);
}

// ─── Math validators ────────────────────────────────────────────────────────

function validateAxes(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  optionalTuple2(node, 'domain', path, errors);
  optionalTuple2(node, 'range', path, errors);
  optionalTuple2(node, 'origin', path, errors);
  validateAnimationProps(node, path, errors);
}

function validateFunctionPlot(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (typeof node.fn !== 'string') {
    errors.push({ path: `${path}.fn`, message: 'FunctionPlot requires a "fn" expression string', severity: 'error' });
  } else {
    const err = validateExpression(node.fn);
    if (err) {
      errors.push({ path: `${path}.fn`, message: `Invalid expression: ${err}`, severity: 'error' });
    }
  }
  optionalTuple2(node, 'domain', path, errors);
  validateAnimationProps(node, path, errors);
}

function validateVector(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (!Array.isArray(node.to) || node.to.length !== 2) {
    errors.push({ path: `${path}.to`, message: 'Vector requires a "to" array of [number, number]', severity: 'error' });
  }
  optionalTuple2(node, 'from', path, errors);
  validateAnimationProps(node, path, errors);
}

function validateVectorField(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (typeof node.fn !== 'string') {
    errors.push({ path: `${path}.fn`, message: 'VectorField requires a "fn" expression string', severity: 'error' });
  } else {
    const err = validateExpression(node.fn);
    if (err) {
      errors.push({ path: `${path}.fn`, message: `Invalid vector expression: ${err}`, severity: 'error' });
    }
  }
  optionalTuple2(node, 'domain', path, errors);
  optionalTuple2(node, 'range', path, errors);
  validateAnimationProps(node, path, errors);
}

function validateMatrix(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (!Array.isArray(node.values)) {
    errors.push({ path: `${path}.values`, message: 'Matrix requires a "values" 2D array', severity: 'error' });
  } else {
    (node.values as unknown[]).forEach((row, i) => {
      if (!Array.isArray(row)) {
        errors.push({ path: `${path}.values[${i}]`, message: 'Each matrix row must be an array', severity: 'error' });
      }
    });
  }
  validateAnimationProps(node, path, errors);
}

function validateGraph(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (!Array.isArray(node.nodes)) {
    errors.push({ path: `${path}.nodes`, message: 'Graph requires a "nodes" array', severity: 'error' });
  } else {
    const nodeIds = new Set<string>();
    (node.nodes as Record<string, unknown>[]).forEach((n, i) => {
      if (typeof n.id !== 'string') {
        errors.push({ path: `${path}.nodes[${i}].id`, message: 'Graph node requires a string "id"', severity: 'error' });
      } else {
        if (nodeIds.has(n.id)) {
          errors.push({ path: `${path}.nodes[${i}].id`, message: `Duplicate node id "${n.id}"`, severity: 'error' });
        }
        nodeIds.add(n.id);
      }
      requireNumber(n, 'x', `${path}.nodes[${i}]`, errors);
      requireNumber(n, 'y', `${path}.nodes[${i}]`, errors);
    });

    if (Array.isArray(node.edges)) {
      (node.edges as Record<string, unknown>[]).forEach((e, i) => {
        if (typeof e.from !== 'string' || !nodeIds.has(e.from)) {
          errors.push({ path: `${path}.edges[${i}].from`, message: `Edge "from" references unknown node "${e.from}"`, severity: 'error' });
        }
        if (typeof e.to !== 'string' || !nodeIds.has(e.to)) {
          errors.push({ path: `${path}.edges[${i}].to`, message: `Edge "to" references unknown node "${e.to}"`, severity: 'error' });
        }
      });
    }
  }
  validateAnimationProps(node, path, errors);
}

function validateLaTeX(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (typeof node.expression !== 'string') {
    errors.push({ path: `${path}.expression`, message: 'LaTeX requires an "expression" string', severity: 'error' });
  }
  requireNumber(node, 'x', path, errors);
  requireNumber(node, 'y', path, errors);
  validateAnimationProps(node, path, errors);
}

// ─── Structure validators ───────────────────────────────────────────────────

function validateSequence(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  requireNumber(node, 'from', path, errors);
  optionalPositiveInt(node, 'durationInFrames', path, errors);
  validateChildren(node, path, errors);
}

function validateAnimationWrapper(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  optionalPositiveNum(node, 'duration', path, errors);
  validateEasing(node, path, errors);
  validateChildren(node, path, errors);
}

function validateTransformNode(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  optionalPositiveNum(node, 'duration', path, errors);
  validateEasing(node, path, errors);

  if (node.translate !== undefined) {
    const t = node.translate as Record<string, unknown>;
    if (!t || typeof t !== 'object') {
      errors.push({ path: `${path}.translate`, message: 'translate must be { from: [x,y], to: [x,y] }', severity: 'error' });
    }
  }
  if (node.scale !== undefined) {
    const s = node.scale as Record<string, unknown>;
    if (!s || typeof s !== 'object' || typeof s.from !== 'number' || typeof s.to !== 'number') {
      errors.push({ path: `${path}.scale`, message: 'scale must be { from: number, to: number }', severity: 'error' });
    }
  }
  if (node.rotate !== undefined) {
    const r = node.rotate as Record<string, unknown>;
    if (!r || typeof r !== 'object' || typeof r.from !== 'number' || typeof r.to !== 'number') {
      errors.push({ path: `${path}.rotate`, message: 'rotate must be { from: number, to: number }', severity: 'error' });
    }
  }
  if (node.opacity !== undefined) {
    const o = node.opacity as Record<string, unknown>;
    if (!o || typeof o !== 'object' || typeof o.from !== 'number' || typeof o.to !== 'number') {
      errors.push({ path: `${path}.opacity`, message: 'opacity must be { from: number, to: number }', severity: 'error' });
    }
  }

  validateChildren(node, path, errors);
}

function validateMorphNode(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  optionalPositiveNum(node, 'duration', path, errors);
  validateEasing(node, path, errors);
  optionalString(node, 'fromColor', path, errors);
  optionalString(node, 'toColor', path, errors);
  validateChildren(node, path, errors);
}

function validateStaggerNode(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  optionalPositiveNum(node, 'staggerDelay', path, errors);
  validateEasing(node, path, errors);
  validateChildren(node, path, errors);
}

// ─── Common validation helpers ──────────────────────────────────────────────

function validateAnimationProps(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  optionalPositiveNum(node, 'fadeIn', path, errors);
  optionalPositiveNum(node, 'fadeOut', path, errors);
  optionalPositiveNum(node, 'draw', path, errors);
  validateEasing(node, path, errors);
}

function validateEasing(node: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (node.easing === undefined) return;

  if (typeof node.easing === 'string') {
    if (!VALID_EASING_NAMES.includes(node.easing)) {
      const suggestion = findClosest(node.easing, VALID_EASING_NAMES);
      errors.push({
        path: `${path}.easing`,
        message: `Unknown easing "${node.easing}".${suggestion} Available: ${VALID_EASING_NAMES.join(', ')}`,
        severity: 'error',
      });
    }
    return;
  }

  if (typeof node.easing === 'object' && node.easing !== null) {
    const e = node.easing as Record<string, unknown>;
    if (e.type === 'spring') return;
    if (e.type === 'cubicBezier') {
      for (const k of ['x1', 'y1', 'x2', 'y2']) {
        if (typeof e[k] !== 'number') {
          errors.push({ path: `${path}.easing.${k}`, message: `cubicBezier requires numeric "${k}"`, severity: 'error' });
        }
      }
      return;
    }
    errors.push({ path: `${path}.easing.type`, message: `Easing object type must be "spring" or "cubicBezier"`, severity: 'error' });
    return;
  }

  errors.push({ path: `${path}.easing`, message: 'Easing must be a string name or { type: "spring"|"cubicBezier", ... }', severity: 'error' });
}

// ─── Field helpers ──────────────────────────────────────────────────────────

function requireNumber(node: Record<string, unknown>, field: string, path: string, errors: ValidationError[]) {
  if (typeof node[field] !== 'number') {
    errors.push({ path: `${path}.${field}`, message: `Required numeric field "${field}" is missing or not a number`, severity: 'error' });
  }
}

function requirePositiveNum(node: Record<string, unknown>, field: string, path: string, errors: ValidationError[]) {
  if (typeof node[field] !== 'number' || (node[field] as number) <= 0) {
    errors.push({ path: `${path}.${field}`, message: `"${field}" must be a positive number`, severity: 'error' });
  }
}

function requirePositiveInt(node: Record<string, unknown>, field: string, path: string, errors: ValidationError[]) {
  const v = node[field];
  if (typeof v !== 'number' || v <= 0 || !Number.isInteger(v)) {
    errors.push({ path: `${path}.${field}`, message: `"${field}" must be a positive integer`, severity: 'error' });
  }
}

function optionalPositiveNum(node: Record<string, unknown>, field: string, path: string, errors: ValidationError[]) {
  if (node[field] !== undefined && (typeof node[field] !== 'number' || (node[field] as number) <= 0)) {
    errors.push({ path: `${path}.${field}`, message: `"${field}" must be a positive number`, severity: 'error' });
  }
}

function optionalPositiveInt(node: Record<string, unknown>, field: string, path: string, errors: ValidationError[]) {
  const v = node[field];
  if (v !== undefined && (typeof v !== 'number' || v <= 0 || !Number.isInteger(v))) {
    errors.push({ path: `${path}.${field}`, message: `"${field}" must be a positive integer`, severity: 'error' });
  }
}

function optionalString(node: Record<string, unknown>, field: string, path: string, errors: ValidationError[]) {
  if (node[field] !== undefined && typeof node[field] !== 'string') {
    errors.push({ path: `${path}.${field}`, message: `"${field}" must be a string`, severity: 'error' });
  }
}

function optionalBoolean(node: Record<string, unknown>, field: string, path: string, errors: ValidationError[]) {
  if (node[field] !== undefined && typeof node[field] !== 'boolean') {
    errors.push({ path: `${path}.${field}`, message: `"${field}" must be a boolean`, severity: 'error' });
  }
}

function optionalTuple2(node: Record<string, unknown>, field: string, path: string, errors: ValidationError[]) {
  const v = node[field];
  if (v !== undefined) {
    if (!Array.isArray(v) || v.length !== 2 || typeof v[0] !== 'number' || typeof v[1] !== 'number') {
      errors.push({ path: `${path}.${field}`, message: `"${field}" must be [number, number]`, severity: 'error' });
    }
  }
}

function findClosest(input: string, options: string[]): string {
  const lower = input.toLowerCase();
  const match = options.find(o => o.toLowerCase() === lower);
  if (match) return ` Did you mean '${match}'?`;

  // Simple prefix match
  const prefix = options.find(o => o.toLowerCase().startsWith(lower.slice(0, 4)));
  if (prefix) return ` Did you mean '${prefix}'?`;

  return '';
}
