import type { ElucimDocument as RenderableDocument, ElementNode, PlayerNode, SceneNode } from '../schema/types';
import type { ElucimDocument, ElucimElement, ElucimScene } from './types';
import { getDocumentLinearDuration } from './duration';
import { getInitialStateSnapshot, getStateMachineVisualFrames } from './stateMachine';
import { applyTimelineFrames } from './timeline';

export interface NormalizeDocumentResult {
  document: ElucimDocument;
  inputFormat: 'document' | 'renderable' | 'legacy-renderable' | 'legacy-rootless';
  migrated: boolean;
  warnings: string[];
}

interface MigrationState {
  elements: Record<string, ElucimElement>;
  usedIds: Set<string>;
}

const LAYOUT_KEYS = new Set([
  'x', 'y', 'width', 'height',
  'cx', 'cy', 'r',
  'x1', 'y1', 'x2', 'y2',
  'rotation', 'rotationOrigin', 'scale', 'translate', 'zIndex',
]);

export function normalizeDocument(doc: unknown): NormalizeDocumentResult {
  if (isCanonicalDocument(doc)) {
    return { document: doc, inputFormat: 'document', migrated: false, warnings: [] };
  }
  if (isRenderableDocument(doc)) {
    return { document: createDocumentFromRenderable(doc), inputFormat: 'renderable', migrated: true, warnings: [] };
  }
  if (isLegacyRenderableWithRoot(doc)) {
    return {
      document: createDocumentFromRenderable({ ...(doc as Record<string, unknown>), version: '1.0' } as RenderableDocument),
      inputFormat: 'legacy-renderable',
      migrated: true,
      warnings: ['Coerced legacy numeric/string version 1 to Elucim version "1.0".'],
    };
  }
  if (isLegacyRootlessDocument(doc)) {
    const renderable = legacyRootlessToRenderable(doc);
    return {
      document: createDocumentFromRenderable(renderable),
      inputFormat: 'legacy-rootless',
      migrated: true,
      warnings: ['Converted legacy rootless visual into an Elucim player document.'],
    };
  }
  throw new Error(`Unsupported Elucim document format: ${describeFormat(doc)}`);
}

export function toRenderableDocument(doc: unknown): RenderableDocument {
  if (isRenderableDocument(doc)) return doc;
  return createRenderableDocument(applyDefaultStateMachineInitialFrame(normalizeDocument(doc).document));
}

export function createDocumentFromRenderable(doc: RenderableDocument): ElucimDocument {
  if (doc.version !== '1.0') {
    throw new Error(`Expected renderable Elucim document, got version "${(doc as { version?: unknown }).version}"`);
  }
  if (doc.root.type === 'presentation') {
    throw new Error('Presentation-to-canonical document import is not implemented yet');
  }

  const root = doc.root as SceneNode | PlayerNode;
  const state: MigrationState = { elements: {}, usedIds: new Set() };
  const children = root.children.map((child, index) => migrateElement(child, `root.${child.type}[${index}]`, undefined, state));
  const scene: ElucimScene = {
    type: root.type,
    preset: root.preset,
    width: root.width,
    height: root.height,
    fps: root.fps,
    background: root.background,
    children,
    ...(root.type === 'player' ? {
      controls: root.controls,
      loop: root.loop,
      autoPlay: root.autoPlay,
    } : {}),
  };

  return {
    version: '2.0',
    scene: omitUndefinedObject(scene),
    elements: state.elements,
    metadata: {
      polishLevel: 'draft',
      notes: [`Migrated from a renderable Elucim tree structure. Legacy root duration was ${root.durationInFrames} frames; canonical documents derive time from timelines, state machines, and export policy.`],
    },
  };
}

export function createRenderableDocument(doc: ElucimDocument): RenderableDocument {
  const children = doc.scene.children.map(id => restoreElement(doc, id));
  return {
    version: '1.0',
    root: {
      type: doc.scene.type,
      preset: doc.scene.preset,
      width: doc.scene.width,
      height: doc.scene.height,
      fps: doc.scene.fps,
      durationInFrames: getDocumentLinearDuration(doc),
      background: doc.scene.background,
      ...(doc.scene.type === 'player' ? {
        controls: doc.scene.controls,
        loop: doc.scene.loop,
        autoPlay: doc.scene.autoPlay,
      } : {}),
      children,
    } as SceneNode | PlayerNode,
  };
}

function applyDefaultStateMachineInitialFrame(doc: ElucimDocument): ElucimDocument {
  if (!doc.defaultStateMachine || !doc.stateMachines?.[doc.defaultStateMachine]) return doc;
  const snapshot = getInitialStateSnapshot(doc, doc.defaultStateMachine);
  const frames = getStateMachineVisualFrames(doc, doc.defaultStateMachine, {
    statePath: [snapshot.stateId],
    currentStateId: snapshot.stateId,
    currentFrame: 0,
    missingState: 'skip',
    missingTimeline: 'skip',
  });
  return frames.length > 0 ? applyTimelineFrames(doc, frames) : doc;
}

function restoreElement(doc: ElucimDocument, id: string): ElementNode {
  const element = doc.elements[id];
  if (!element) throw new Error(`Cannot restore missing document element "${id}"`);
  const restored = {
    ...element.props,
    ...element.layout,
    id: element.id,
    type: element.type,
    ...(element.children ? { children: element.children.map(childId => restoreElement(doc, childId)) } : {}),
  };
  return restored as unknown as ElementNode;
}

function migrateElement(element: ElementNode, fallbackId: string, parentId: string | undefined, state: MigrationState): string {
  const raw = element as unknown as Record<string, unknown>;
  const id = reserveId(typeof raw.id === 'string' && raw.id.trim() ? raw.id : fallbackId, state.usedIds);
  const children = Array.isArray(raw.children)
    ? (raw.children as ElementNode[]).map((child, index) => migrateElement(child, `${id}.${child.type}[${index}]`, id, state))
    : undefined;
  const props = omitKeys(raw, new Set(['id', 'children']));
  const layout = extractLayout(raw);

  const nextElement: ElucimElement = {
    id,
    type: String(raw.type),
    props,
    ...(parentId ? { parentId } : {}),
    ...(children ? { children } : {}),
    ...(Object.keys(layout).length > 0 ? { layout } : {}),
  };
  state.elements[id] = nextElement;
  return id;
}

function legacyRootlessToRenderable(doc: Record<string, unknown>): RenderableDocument {
  const elements = Array.isArray(doc.elements) ? doc.elements : [];
  const title = typeof doc.title === 'string' ? doc.title : undefined;
  const children = elements.map((element, index) => normalizeLegacyElement(element, index));
  return {
    version: '1.0',
    root: {
      type: 'player',
      width: asNumber(doc.width) ?? 1920,
      height: asNumber(doc.height) ?? 1080,
      fps: asNumber(doc.fps),
      durationInFrames: asNumber(doc.durationInFrames) ?? asNumber(doc.duration) ?? 120,
      background: typeof doc.background === 'string' ? doc.background : undefined,
      children: title ? [{ type: 'text', id: 'title', content: title, x: 96, y: 96, fontSize: 48 }, ...children] as ElementNode[] : children,
    },
  };
}

function normalizeLegacyElement(element: unknown, index: number): ElementNode {
  if (!element || typeof element !== 'object' || Array.isArray(element)) {
    return { type: 'text', id: `legacy-label-${index + 1}`, content: String(element ?? ''), x: 96, y: 180 + index * 48 } as unknown as ElementNode;
  }
  const raw = element as Record<string, unknown>;
  const type = typeof raw.type === 'string' && raw.type.trim() ? raw.type : 'group';
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : `legacy-${type}-${index + 1}`;
  const children = Array.isArray(raw.children)
    ? { children: raw.children.map((child, childIndex) => normalizeLegacyElement(child, childIndex)) }
    : {};
  if (type === 'text') {
    return {
      ...raw,
      id,
      type,
      x: asNumber(raw.x) ?? 96,
      y: asNumber(raw.y) ?? 180 + index * 48,
      content: typeof raw.content === 'string'
        ? raw.content
        : typeof raw.text === 'string'
          ? raw.text
          : typeof raw.title === 'string'
            ? raw.title
            : '',
      ...children,
    } as unknown as ElementNode;
  }
  if (type === 'rect') {
    return { ...raw, id, type, x: asNumber(raw.x) ?? 96, y: asNumber(raw.y) ?? 160 + index * 64, width: asNumber(raw.width) ?? 240, height: asNumber(raw.height) ?? 80, ...children } as unknown as ElementNode;
  }
  if (type === 'circle') {
    return { ...raw, id, type, cx: asNumber(raw.cx) ?? 180, cy: asNumber(raw.cy) ?? 200 + index * 64, r: asNumber(raw.r) ?? 40, ...children } as unknown as ElementNode;
  }
  return { ...raw, id, type, ...children } as unknown as ElementNode;
}

function isCanonicalDocument(doc: unknown): doc is ElucimDocument {
  return !!doc && typeof doc === 'object' && (doc as { version?: unknown }).version === '2.0';
}

function isRenderableDocument(doc: unknown): doc is RenderableDocument {
  return !!doc && typeof doc === 'object' && (doc as { version?: unknown }).version === '1.0' && 'root' in doc;
}

function isLegacyRenderableWithRoot(doc: unknown): boolean {
  return !!doc && typeof doc === 'object'
    && ((doc as { version?: unknown }).version === 1 || (doc as { version?: unknown }).version === '1')
    && 'root' in doc;
}

function isLegacyRootlessDocument(doc: unknown): doc is Record<string, unknown> {
  return !!doc && typeof doc === 'object' && !Array.isArray(doc)
    && ((doc as { version?: unknown }).version === 1 || (doc as { version?: unknown }).version === '1')
    && !('root' in doc)
    && Array.isArray((doc as { elements?: unknown }).elements);
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function describeFormat(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return typeof doc;
  const version = (doc as { version?: unknown }).version;
  return `version=${String(version)}`;
}

function reserveId(baseId: string, usedIds: Set<string>): string {
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function extractLayout(raw: Record<string, unknown>): Record<string, unknown> {
  const layout: Record<string, unknown> = {};
  for (const key of LAYOUT_KEYS) {
    if (raw[key] !== undefined) layout[key] = raw[key];
  }
  return layout;
}

function omitKeys(raw: Record<string, unknown>, keys: Set<string>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!keys.has(key)) next[key] = value;
  }
  return omitUndefined(next);
}

function omitUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function omitUndefinedObject<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
