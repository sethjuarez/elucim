import type { ElucimDocument } from './types';
import { validateDocument } from './validateDocument';
import type { ValidationError, ValidationResult } from '../validator/validate';

export interface ElucimElementSummary {
  id: string;
  type: string;
  parentId?: string;
  children: string[];
  role?: string;
  layout?: Record<string, unknown>;
}

export interface ElucimDocumentSummary {
  version: '2.0';
  scene: {
    type: 'scene' | 'player';
    width?: number;
    height?: number;
    children: string[];
  };
  elementCount: number;
  elements: ElucimElementSummary[];
  timelines: string[];
  stateMachines: string[];
  issues: ValidationError[];
}

export interface ElucimRepairHint {
  path: string;
  message: string;
  code:
    | 'unsupported-version'
    | 'missing-reference'
    | 'id-mismatch'
    | 'missing-state'
    | 'invalid-timeline'
    | 'invalid-relationship'
    | 'props-type-mismatch'
    | 'unknown';
  suggestions?: string[];
}

export interface ElucimAgentValidationResult extends ValidationResult {
  repairHints: ElucimRepairHint[];
}

export interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
}

export function summarizeDocument(doc: ElucimDocument): ElucimDocumentSummary {
  const validation = validateDocument(doc);
  return {
    version: '2.0',
    scene: {
      type: doc.scene.type,
      width: doc.scene.width,
      height: doc.scene.height,
      children: [...doc.scene.children],
    },
    elementCount: Object.keys(doc.elements).length,
    elements: Object.values(doc.elements).map(element => ({
      id: element.id,
      type: element.type,
      parentId: element.parentId,
      children: [...(element.children ?? [])],
      role: element.role ?? element.intent?.role,
      layout: element.layout ? { ...element.layout } : undefined,
    })),
    timelines: Object.keys(doc.timelines ?? {}),
    stateMachines: Object.keys(doc.stateMachines ?? {}),
    issues: validation.errors,
  };
}

export function validateForAgent(doc: unknown): ElucimAgentValidationResult {
  const validation = validateDocument(doc);
  return {
    ...validation,
    repairHints: validation.errors.map(error => toRepairHint(error, doc)),
  };
}

export function diffDocuments(before: ElucimDocument, after: ElucimDocument): JsonPatchOperation[] {
  const patches: JsonPatchOperation[] = [];
  diffValue(before, after, '', patches);
  return patches;
}

function toRepairHint(error: ValidationError, doc: unknown): ElucimRepairHint {
  const knownIds = doc && typeof doc === 'object' && 'elements' in doc && typeof (doc as { elements?: unknown }).elements === 'object'
    ? Object.keys((doc as { elements: Record<string, unknown> }).elements)
    : [];
  if (error.message.includes('Unknown element ID') || error.message.includes('Unknown target') || error.message.includes('Unknown parent ID')) {
    return {
      path: error.path,
      message: error.message,
      code: 'missing-reference',
      suggestions: knownIds,
    };
  }
  if (error.message.includes('must match key')) {
    return { path: error.path, message: error.message, code: 'id-mismatch' };
  }
  if (error.message.includes('Initial state')) {
    return { path: error.path, message: error.message, code: 'missing-state' };
  }
  if (error.path === 'version') {
    return { path: error.path, message: error.message, code: 'unsupported-version', suggestions: ['Use normalizeDocument(doc) to migrate supported renderable compatibility formats.'] };
  }
  if (error.path.includes('.tracks') || error.path.startsWith('timelines.')) {
    return { path: error.path, message: error.message, code: 'invalid-timeline', suggestions: knownIds };
  }
  if (error.path.includes('.children') || error.path.includes('.parentId') || error.message.includes('parentId')) {
    return { path: error.path, message: error.message, code: 'invalid-relationship', suggestions: knownIds };
  }
  if (error.path.endsWith('.props') || error.message.includes('props')) {
    return { path: error.path, message: error.message, code: 'props-type-mismatch' };
  }
  return { path: error.path, message: error.message, code: 'unknown' };
}

function diffValue(before: unknown, after: unknown, path: string, patches: JsonPatchOperation[]) {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  if (before === undefined) {
    patches.push({ op: 'add', path: path || '/', value: after });
    return;
  }
  if (after === undefined) {
    patches.push({ op: 'remove', path: path || '/' });
    return;
  }
  if (!isPlainObject(before) || !isPlainObject(after)) {
    patches.push({ op: 'replace', path: path || '/', value: after });
    return;
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of [...keys].sort()) {
    diffValue(before[key], after[key], `${path}/${escapeJsonPointer(key)}`, patches);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function escapeJsonPointer(value: string): string {
  return value.replace(/~/g, '~0').replace(/\//g, '~1');
}
