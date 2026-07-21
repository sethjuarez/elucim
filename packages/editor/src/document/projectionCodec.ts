import {
  getDocumentLinearDuration,
  type ElucimDocument,
  type ElucimElement,
  type ElucimScene,
  type ElucimTimelineFrameSelection,
} from '@elucim/dsl';
import type { EditorProjection, ElementNode, PlayerNode, SceneNode } from './projectionTypes';

interface ProjectionState {
  elements: Record<string, ElucimElement>;
  usedIds: Set<string>;
}

const LAYOUT_KEYS = new Set([
  'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2',
  'rotation', 'rotationOrigin', 'scale', 'translate', 'zIndex',
]);

/** Projects a canonical document into the editor's private static canvas tree. */
export function projectDocument(document: ElucimDocument): EditorProjection {
  return {
    root: {
      type: document.scene.type,
      preset: document.scene.preset,
      width: document.scene.width,
      height: document.scene.height,
      fps: document.scene.fps,
      durationInFrames: getDocumentLinearDuration(document),
      background: document.scene.background,
      ...(document.scene.type === 'player' ? {
        controls: document.scene.controls,
        loop: document.scene.loop,
        autoPlay: document.scene.autoPlay,
      } : {}),
      children: document.scene.children.map(id => restoreElement(document, id)),
    } as SceneNode | PlayerNode,
  };
}

/**
 * Rebuilds canonical element records from an editor-owned static projection.
 * This is intentionally private to the editor: external imports accept only
 * version "2.0" documents.
 */
export function documentFromProjection(projection: EditorProjection): ElucimDocument {
  const root = projection.root;
  if (root.type !== 'scene' && root.type !== 'player') {
    throw new Error('The editor supports scene and player canonical documents only.');
  }

  const state: ProjectionState = { elements: {}, usedIds: new Set() };
  const children = root.children.map((child, index) =>
    collectElement(child, `root.${child.type}[${index}]`, undefined, state));
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
    scene: omitUndefined(scene),
    elements: state.elements,
  };
}

function restoreElement(document: ElucimDocument, id: string): ElementNode {
  const element = document.elements[id];
  if (!element) throw new Error(`Cannot project missing canonical element "${id}".`);
  return {
    ...element.props,
    ...element.layout,
    id: element.id,
    type: element.type,
    ...(element.children ? { children: element.children.map(childId => restoreElement(document, childId)) } : {}),
  } as unknown as ElementNode;
}

function collectElement(
  element: ElementNode,
  generatedId: string,
  parentId: string | undefined,
  state: ProjectionState,
): string {
  const raw = element as unknown as Record<string, unknown>;
  const id = reserveId(typeof raw.id === 'string' && raw.id.trim() ? raw.id : generatedId, state.usedIds);
  const children = Array.isArray(raw.children)
    ? (raw.children as ElementNode[]).map((child, index) =>
      collectElement(child, `${id}.${child.type}[${index}]`, id, state))
    : undefined;
  const layout = extractLayout(raw);
  state.elements[id] = {
    id,
    type: String(raw.type),
    props: omitKeys(raw, new Set(['id', 'children', ...LAYOUT_KEYS])),
    ...(parentId ? { parentId } : {}),
    ...(children ? { children } : {}),
    ...(Object.keys(layout).length ? { layout } : {}),
  };
  return id;
}

function reserveId(baseId: string, usedIds: Set<string>): string {
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
  usedIds.add(id);
  return id;
}

function extractLayout(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries([...LAYOUT_KEYS]
    .filter(key => raw[key] !== undefined)
    .map(key => [key, raw[key]]));
}

function omitKeys(raw: Record<string, unknown>, keys: Set<string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(raw)
    .filter(([key, value]) => !keys.has(key) && value !== undefined));
}

function omitUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
