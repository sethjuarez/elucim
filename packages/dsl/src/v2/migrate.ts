import type { ElucimDocument, ElementNode, PlayerNode, SceneNode } from '../schema/types';
import type { ElucimV2Document, ElucimV2Element, ElucimV2Scene } from './types';

export interface NormalizeToV2Result {
  document: ElucimV2Document;
  inputFormat: 'v2' | 'v1' | 'legacy-v1' | 'legacy-rootless';
  migrated: boolean;
  warnings: string[];
}

interface MigrationState {
  elements: Record<string, ElucimV2Element>;
  usedIds: Set<string>;
}

const LAYOUT_KEYS = new Set([
  'x', 'y', 'width', 'height',
  'cx', 'cy', 'r',
  'x1', 'y1', 'x2', 'y2',
  'rotation', 'rotationOrigin', 'scale', 'translate', 'zIndex',
]);

export function normalizeToV2(doc: unknown): NormalizeToV2Result {
  if (isV2Document(doc)) {
    return { document: doc, inputFormat: 'v2', migrated: false, warnings: [] };
  }
  if (isV1Document(doc)) {
    return { document: migrateV1ToV2(doc), inputFormat: 'v1', migrated: true, warnings: [] };
  }
  if (isLegacyV1WithRoot(doc)) {
    return {
      document: migrateV1ToV2({ ...(doc as Record<string, unknown>), version: '1.0' } as ElucimDocument),
      inputFormat: 'legacy-v1',
      migrated: true,
      warnings: ['Coerced legacy numeric/string version 1 to Elucim version "1.0".'],
    };
  }
  if (isLegacyRootlessDocument(doc)) {
    const v1 = legacyRootlessToV1(doc);
    return {
      document: migrateV1ToV2(v1),
      inputFormat: 'legacy-rootless',
      migrated: true,
      warnings: ['Converted legacy rootless visual into an Elucim player document.'],
    };
  }
  throw new Error(`Unsupported Elucim document format: ${describeFormat(doc)}`);
}

export function toRenderableV1(doc: unknown): ElucimDocument {
  if (isV1Document(doc)) return doc;
  return migrateV2ToV1(normalizeToV2(doc).document);
}

export function migrateV1ToV2(doc: ElucimDocument): ElucimV2Document {
  if (doc.version !== '1.0') {
    throw new Error(`Expected Elucim v1 document, got version "${(doc as { version?: unknown }).version}"`);
  }
  if (doc.root.type === 'presentation') {
    throw new Error('v1 presentation migration to v2 is not implemented yet');
  }

  const root = doc.root as SceneNode | PlayerNode;
  const state: MigrationState = { elements: {}, usedIds: new Set() };
  const children = root.children.map((child, index) => migrateElement(child, `root.${child.type}[${index}]`, undefined, state));
  const scene: ElucimV2Scene = {
    type: root.type,
    preset: root.preset,
    width: root.width,
    height: root.height,
    fps: root.fps,
    durationInFrames: root.durationInFrames,
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
      notes: ['Migrated from Elucim v1 normalized tree structure.'],
    },
  };
}

export function migrateV2ToV1(doc: ElucimV2Document): ElucimDocument {
  const children = doc.scene.children.map(id => restoreElement(doc, id));
  return {
    version: '1.0',
    root: {
      type: doc.scene.type,
      preset: doc.scene.preset,
      width: doc.scene.width,
      height: doc.scene.height,
      fps: doc.scene.fps,
      durationInFrames: doc.scene.durationInFrames,
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

function restoreElement(doc: ElucimV2Document, id: string): ElementNode {
  const element = doc.elements[id];
  if (!element) throw new Error(`Cannot restore missing v2 element "${id}"`);
  const restored = {
    ...element.props,
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

  const nextElement: ElucimV2Element = {
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

function legacyRootlessToV1(doc: Record<string, unknown>): ElucimDocument {
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

function isV2Document(doc: unknown): doc is ElucimV2Document {
  return !!doc && typeof doc === 'object' && (doc as { version?: unknown }).version === '2.0';
}

function isV1Document(doc: unknown): doc is ElucimDocument {
  return !!doc && typeof doc === 'object' && (doc as { version?: unknown }).version === '1.0' && 'root' in doc;
}

function isLegacyV1WithRoot(doc: unknown): boolean {
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
