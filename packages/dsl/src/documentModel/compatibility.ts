import type { ElucimDocument as RenderableDocument, ElementNode, PlayerNode, SceneNode } from '../schema/types';
import type { ElucimDocument, ElucimElement, ElucimScene } from './types';
import type { ElucimTimelineFrameSelection } from './timeline';
import { getDocumentLinearDuration } from './duration';
import { getInitialStateSnapshot, getStateMachineVisualFrames } from './stateMachine';
import { applyTimelineFrames } from './timeline';

export interface NormalizeDocumentResult {
  document: ElucimDocument;
  inputFormat: 'document' | 'renderable';
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
  throw new Error(`Unsupported Elucim document format: ${describeFormat(doc)}`);
}

export function toRenderableDocument(doc: unknown): RenderableDocument {
  if (isRenderableDocument(doc)) return doc;
  return createRenderableDocument(applyDefaultStateMachineInitialFrame(normalizeDocument(doc).document));
}

export function createDocumentFromRenderable(doc: RenderableDocument): ElucimDocument {
  if (doc.version !== 'render-tree') {
    throw new Error(`Expected renderable Elucim document, got version "${(doc as { version?: unknown }).version}"`);
  }
  if (doc.root.type === 'presentation') {
    throw new Error('Presentation-to-canonical document import is not implemented yet');
  }

  const root = doc.root as SceneNode | PlayerNode;
  if ('camera' in root) {
    throw new Error('Render-tree camera is not supported. Use timeline.camera keyframes in an Elucim Document.');
  }
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
      notes: [`Migrated from an internal render tree. Root duration was ${root.durationInFrames} frames; canonical documents derive time from timelines, state machines, and export policy.`],
    },
  };
}

/** Projects a canonical document for rendering. */
export function createRenderableDocument(doc: ElucimDocument): RenderableDocument {
  const children = doc.scene.children.map(id => restoreElement(doc, id));
  return {
    version: 'render-tree',
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

export function applyDefaultStateMachineInitialFrame(doc: ElucimDocument): ElucimDocument {
  const frames = getDefaultStateMachineInitialFrames(doc);
  return frames.length > 0 ? applyTimelineFrames(doc, frames) : doc;
}

export function getDefaultStateMachineInitialFrames(doc: ElucimDocument): ElucimTimelineFrameSelection[] {
  if (!doc.defaultStateMachine || !doc.stateMachines?.[doc.defaultStateMachine]) return [];
  const snapshot = getInitialStateSnapshot(doc, doc.defaultStateMachine);
  return getStateMachineVisualFrames(doc, doc.defaultStateMachine, {
    statePath: [snapshot.stateId],
    currentStateId: snapshot.stateId,
    currentFrame: 0,
    missingState: 'skip',
    missingTimeline: 'skip',
  });
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

function isCanonicalDocument(doc: unknown): doc is ElucimDocument {
  return !!doc && typeof doc === 'object' && (doc as { version?: unknown }).version === '2.0';
}

function isRenderableDocument(doc: unknown): doc is RenderableDocument {
  return !!doc && typeof doc === 'object' && (doc as { version?: unknown }).version === 'render-tree' && 'root' in doc;
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
