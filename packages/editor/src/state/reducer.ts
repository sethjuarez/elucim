import type { ElucimDocument as CanonicalElucimDocument, ElucimTimeline, EditorProjection as ElucimDocument, ElementNode } from '@elucim/editor-projection';
import { documentFromProjection, projectDocument } from '@elucim/editor-projection';
import type { EditorState, EditorAction, EditorHistoryEntry, AlignDirection, DistributeDirection } from './types';
import { CANVAS_ID } from './types';
import { getElementId, isUndoableAction } from './types';
import { getElementBounds as getMeasuredElementBounds, type BoundingBox } from '../utils/bounds';

const MAX_HISTORY = 50;

// ─── Deep-clone helper (JSON-safe) ─────────────────────────────────────────

function cloneDoc(doc: ElucimDocument): ElucimDocument {
  return JSON.parse(JSON.stringify(doc));
}

function cloneCanonicalDocument(doc: CanonicalElucimDocument | undefined): CanonicalElucimDocument | undefined {
  return doc ? JSON.parse(JSON.stringify(doc)) : undefined;
}

function historyEntryFromState(state: EditorState): EditorHistoryEntry {
  return {
    document: cloneDoc(state.document),
    canonicalDocument: cloneCanonicalDocument(state.canonicalDocument),
  };
}

function restoreHistoryEntry(state: EditorState, entry: EditorHistoryEntry): EditorState {
  return {
    ...state,
    document: cloneDoc(entry.document),
    canonicalDocument: cloneCanonicalDocument(entry.canonicalDocument),
  };
}

function documentsEqual(left: ElucimDocument, right: ElucimDocument): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function syncCanonicalFromProjection(
  state: EditorState,
  document: ElucimDocument,
  options: { idMap?: Map<string, string>; removedIds?: Set<string> } = {},
): EditorState {
  if (!state.canonicalDocument) return { ...state, document };
  const rebuiltDocument = documentFromProjection(document);
  const source = state.canonicalDocument;
  const elementIds = new Set(Object.keys(rebuiltDocument.elements));
  const reverseIdMap = new Map([...options.idMap?.entries() ?? []].map(([from, to]) => [to, from]));
  const elements: CanonicalElucimDocument['elements'] = {};
  for (const [id, element] of Object.entries(rebuiltDocument.elements)) {
    const sourceElement = source.elements[reverseIdMap.get(id) ?? id];
    elements[id] = sourceElement
      ? {
        ...element,
        role: sourceElement.role ?? element.role,
        intent: sourceElement.intent ? { ...sourceElement.intent, ...element.intent } : element.intent,
        layout: sourceElement.layout || element.layout
          ? { ...sourceElement.layout, ...element.layout }
          : element.layout,
      }
      : element;
  }
  const timelines = syncCanonicalTimelines(source.timelines, elementIds, options.idMap, options.removedIds);
  return {
    ...state,
    document,
    canonicalDocument: {
      ...rebuiltDocument,
      $schema: source.$schema ?? rebuiltDocument.$schema,
      scene: {
        ...source.scene,
        type: rebuiltDocument.scene.type,
        width: rebuiltDocument.scene.width,
        height: rebuiltDocument.scene.height,
        background: rebuiltDocument.scene.background ?? source.scene.background,
        children: rebuiltDocument.scene.children,
      },
      elements,
      metadata: source.metadata,
      ...(timelines ? { timelines } : {}),
      ...(source.stateMachines ? { stateMachines: source.stateMachines } : {}),
      ...(source.defaultStateMachine ? { defaultStateMachine: source.defaultStateMachine } : {}),
    },
  };
}

function syncCanonicalTimelines(
  timelines: Record<string, ElucimTimeline> | undefined,
  elementIds: Set<string>,
  idMap?: Map<string, string>,
  removedIds?: Set<string>,
): Record<string, ElucimTimeline> | undefined {
  if (!timelines) return undefined;
  const nextTimelines: Record<string, ElucimTimeline> = {};
  for (const [id, timeline] of Object.entries(timelines)) {
    const tracks = timeline.tracks
      .map(track => ({ ...track, target: idMap?.get(track.target) ?? track.target }))
      .filter(track => elementIds.has(track.target) && !removedIds?.has(track.target));
    const effects = timeline.effects?.map(effect => ({
      ...effect,
      targets: effect.targets
        .map(target => idMap?.get(target) ?? target)
        .filter(target => elementIds.has(target) && !removedIds?.has(target)),
    })).filter(effect => effect.targets.length > 0);
    nextTimelines[id] = effects === undefined ? { ...timeline, tracks } : { ...timeline, tracks, effects };
  }
  return nextTimelines;
}

// ─── Tree traversal helpers ────────────────────────────────────────────────

interface ElementLocation {
  parent: ElementNode[] | undefined;
  index: number;
  element: ElementNode;
  id: string;
  parentPath: string;
}

function getChildren(node: unknown): ElementNode[] | undefined {
  if (node && typeof node === 'object' && 'children' in node && Array.isArray((node as any).children)) {
    return (node as any).children;
  }
  return undefined;
}

/** Find an element by ID in the tree, returning its parent array and index */
export function findElementById(root: ElucimDocument['root'], id: string, parentPath = 'root'): ElementLocation | null {
  const children = getChildren(root);
  if (!children) return null;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childId = ('id' in child && child.id) ? child.id : `${parentPath}.${child.type}[${i}]`;
    if (childId === id) {
      return { parent: children, index: i, element: child, id: childId, parentPath };
    }
    // Recurse into containers
    const childChildren = getChildren(child);
    if (childChildren) {
      const found = findElementInArray(childChildren, id, childId);
      if (found) return found;
    }
  }
  return null;
}

function findElementInArray(arr: ElementNode[], id: string, parentPath: string): ElementLocation | null {
  for (let i = 0; i < arr.length; i++) {
    const child = arr[i];
    const childId = ('id' in child && child.id) ? child.id : `${parentPath}.${child.type}[${i}]`;
    if (childId === id) {
      return { parent: arr, index: i, element: child, id: childId, parentPath };
    }
    const childChildren = getChildren(child);
    if (childChildren) {
      const found = findElementInArray(childChildren, id, childId);
      if (found) return found;
    }
  }
  return null;
}

/** Collect all element IDs in the tree */
export function collectAllIds(root: ElucimDocument['root'], parentPath = 'root'): string[] {
  const ids: string[] = [];
  const children = getChildren(root);
  if (!children) return ids;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childId = ('id' in child && child.id) ? child.id : `${parentPath}.${child.type}[${i}]`;
    ids.push(childId);
    const childChildren = getChildren(child);
    if (childChildren) {
      ids.push(...collectIdsFromArray(childChildren, childId));
    }
  }
  return ids;
}

function collectIdsFromArray(arr: ElementNode[], parentPath: string): string[] {
  const ids: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    const child = arr[i];
    const childId = ('id' in child && child.id) ? child.id : `${parentPath}.${child.type}[${i}]`;
    ids.push(childId);
    const childChildren = getChildren(child);
    if (childChildren) {
      ids.push(...collectIdsFromArray(childChildren, childId));
    }
  }
  return ids;
}

function groupLocationsByParent(root: ElucimDocument['root'], ids: string[]): ElementLocation[][] {
  const groups = new Map<ElementNode[], ElementLocation[]>();
  for (const id of ids) {
    const loc = findElementById(root, id);
    if (!loc?.parent) continue;
    const group = groups.get(loc.parent) ?? [];
    group.push(loc);
    groups.set(loc.parent, group);
  }
  return [...groups.values()];
}

// ─── Position helpers ──────────────────────────────────────────────────────

function applyMove(element: ElementNode, dx: number, dy: number): ElementNode {
  dx = Math.round(dx);
  dy = Math.round(dy);
  const moved = { ...element };
  // Groups — recursively move all children
  if (moved.type === 'group' && 'children' in moved && Array.isArray(moved.children)) {
    (moved as any).children = (moved.children as ElementNode[]).map(c => applyMove(c, dx, dy));
    return moved;
  }
  // Position-based elements (rect, text, image, latex, barChart, matrix)
  if ('x' in moved && typeof moved.x === 'number') {
    (moved as any).x += dx;
  }
  if ('y' in moved && typeof moved.y === 'number') {
    (moved as any).y += dy;
  }
  // Center-based elements (circle)
  if ('cx' in moved && typeof moved.cx === 'number') {
    (moved as any).cx += dx;
  }
  if ('cy' in moved && typeof moved.cy === 'number') {
    (moved as any).cy += dy;
  }
  // Line-based elements (line, arrow)
  if ('x1' in moved && typeof moved.x1 === 'number') {
    (moved as any).x1 += dx;
    (moved as any).y1 += dy;
    (moved as any).x2 += dx;
    (moved as any).y2 += dy;
  }
  // Origin-based elements (axes, functionPlot, vector, vectorField)
  if ('origin' in moved && Array.isArray(moved.origin)) {
    (moved as any).origin = [moved.origin[0] + dx, moved.origin[1] + dy];
  }
  // Polygon points
  if ('points' in moved && Array.isArray(moved.points)) {
    (moved as any).points = (moved.points as [number, number][]).map(([px, py]) => [px + dx, py + dy]);
  }
  // BezierCurve endpoints + control points
  if ('cx1' in moved && typeof moved.cx1 === 'number') {
    (moved as any).cx1 += dx;
    (moved as any).cy1 += dy;
    if ('cx2' in moved && typeof moved.cx2 === 'number') {
      (moved as any).cx2 += dx;
      (moved as any).cy2 += dy;
    }
  }
  // Graph — move all nodes together
  if ('nodes' in moved && Array.isArray(moved.nodes)) {
    (moved as any).nodes = (moved.nodes as any[]).map((n: any) => ({
      ...n,
      x: typeof n.x === 'number' ? n.x + dx : n.x,
      y: typeof n.y === 'number' ? n.y + dy : n.y,
    }));
  }
  return moved;
}

// ─── Resize helpers (property-based) ────────────────────────────────────────

function roundCoord(value: number): number {
  return Math.round(value * 10) / 10;
}

function scaleScalar(value: number, scale: number, min = 1): number {
  return Math.max(min, roundCoord(value * scale));
}

function transformPoint(
  x: number,
  y: number,
  oldBounds: BoundingBox,
  newBounds: BoundingBox,
): [number, number] {
  const scaleX = oldBounds.width === 0 ? 1 : newBounds.width / oldBounds.width;
  const scaleY = oldBounds.height === 0 ? 1 : newBounds.height / oldBounds.height;
  return [
    roundCoord(newBounds.x + (x - oldBounds.x) * scaleX),
    roundCoord(newBounds.y + (y - oldBounds.y) * scaleY),
  ];
}

function resizeBounds(bounds: BoundingBox, handle: string, dx: number, dy: number): BoundingBox | null {
  let left = bounds.x;
  let right = bounds.x + bounds.width;
  let top = bounds.y;
  let bottom = bounds.y + bounds.height;

  if (handle.includes('w')) left += dx;
  if (handle.includes('e')) right += dx;
  if (handle.includes('n')) top += dy;
  if (handle.includes('s')) bottom += dy;

  if (right - left < 1 || bottom - top < 1) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function getSpatialScale(element: ElementNode): [number, number] {
  const scale = (element as any).scale;
  // Origin-based math primitives use `scale` as coordinate scale, not SpatialProps scale.
  if (Array.isArray((element as any).origin)) return [1, 1];
  if (typeof scale === 'number') return [scale || 1, scale || 1];
  if (Array.isArray(scale)) return [scale[0] || 1, scale[1] || 1];
  return [1, 1];
}

function withoutSpatialScale(element: ElementNode): ElementNode {
  if (!('scale' in element) || Array.isArray((element as any).origin)) return element;
  const clone = { ...(element as any) };
  delete clone.scale;
  return clone as ElementNode;
}

function transformElementForGroupResize(
  element: ElementNode,
  oldBounds: BoundingBox,
  newBounds: BoundingBox,
): ElementNode {
  const resized = { ...element } as any;
  const scaleX = oldBounds.width === 0 ? 1 : newBounds.width / oldBounds.width;
  const scaleY = oldBounds.height === 0 ? 1 : newBounds.height / oldBounds.height;
  const uniformScale = Math.max(0.1, (Math.abs(scaleX) + Math.abs(scaleY)) / 2);

  if (typeof resized.x === 'number' && typeof resized.y === 'number') {
    [resized.x, resized.y] = transformPoint(resized.x, resized.y, oldBounds, newBounds);
  }
  if (typeof resized.cx === 'number' && typeof resized.cy === 'number') {
    [resized.cx, resized.cy] = transformPoint(resized.cx, resized.cy, oldBounds, newBounds);
  }
  if (typeof resized.x1 === 'number' && typeof resized.y1 === 'number') {
    [resized.x1, resized.y1] = transformPoint(resized.x1, resized.y1, oldBounds, newBounds);
  }
  if (typeof resized.x2 === 'number' && typeof resized.y2 === 'number') {
    [resized.x2, resized.y2] = transformPoint(resized.x2, resized.y2, oldBounds, newBounds);
  }
  if (typeof resized.cx1 === 'number' && typeof resized.cy1 === 'number') {
    [resized.cx1, resized.cy1] = transformPoint(resized.cx1, resized.cy1, oldBounds, newBounds);
  }
  if (typeof resized.cx2 === 'number' && typeof resized.cy2 === 'number') {
    [resized.cx2, resized.cy2] = transformPoint(resized.cx2, resized.cy2, oldBounds, newBounds);
  }

  if (typeof resized.width === 'number') resized.width = scaleScalar(resized.width, Math.abs(scaleX));
  if (typeof resized.height === 'number') resized.height = scaleScalar(resized.height, Math.abs(scaleY));
  if (typeof resized.r === 'number') resized.r = scaleScalar(resized.r, uniformScale);
  if (typeof resized.nodeRadius === 'number') resized.nodeRadius = scaleScalar(resized.nodeRadius, uniformScale);
  if (typeof resized.edgeWidth === 'number') resized.edgeWidth = scaleScalar(resized.edgeWidth, uniformScale, 0.5);
  if (typeof resized.labelFontSize === 'number') resized.labelFontSize = scaleScalar(resized.labelFontSize, uniformScale, 4);
  if (typeof resized.fontSize === 'number') resized.fontSize = scaleScalar(resized.fontSize, uniformScale, 4);
  if (typeof resized.cellSize === 'number') resized.cellSize = scaleScalar(resized.cellSize, uniformScale, 10);
  if (typeof resized.scale === 'number' && Array.isArray(resized.origin)) resized.scale = scaleScalar(resized.scale, uniformScale, 5);
  if (typeof resized.rx === 'number') resized.rx = scaleScalar(resized.rx, uniformScale);
  if (typeof resized.ry === 'number') resized.ry = scaleScalar(resized.ry, uniformScale);
  if (typeof resized.strokeWidth === 'number') resized.strokeWidth = scaleScalar(resized.strokeWidth, uniformScale, 0.5);

  if (Array.isArray(resized.origin) && resized.origin.length >= 2) {
    resized.origin = transformPoint(resized.origin[0], resized.origin[1], oldBounds, newBounds);
  }
  if (Array.isArray(resized.points)) {
    resized.points = resized.points.map(([px, py]: [number, number]) => transformPoint(px, py, oldBounds, newBounds));
  }
  if (Array.isArray(resized.nodes)) {
    resized.nodes = resized.nodes.map((node: any) => {
      if (typeof node.x !== 'number' || typeof node.y !== 'number') return node;
      const [x, y] = transformPoint(node.x, node.y, oldBounds, newBounds);
      const next = { ...node, x, y };
      if (typeof next.radius === 'number') next.radius = scaleScalar(next.radius, uniformScale);
      return next;
    });
  }
  if (Array.isArray(resized.rotationOrigin) && resized.rotationOrigin.length >= 2) {
    resized.rotationOrigin = transformPoint(resized.rotationOrigin[0], resized.rotationOrigin[1], oldBounds, newBounds);
  }
  if (resized.type === 'group' && Array.isArray(resized.children)) {
    resized.children = resized.children.map((child: ElementNode) => transformElementForGroupResize(child, oldBounds, newBounds));
  }

  return resized as ElementNode;
}

function applyResize(element: ElementNode, handle: string, dx: number, dy: number): ElementNode {
  dx = Math.round(dx);
  dy = Math.round(dy);
  const resized = { ...element } as any;

  // Groups — scale all children relative to group bounds
  if (resized.type === 'group' && Array.isArray(resized.children)) {
    const bounds = getMeasuredElementBounds(element);
    const nextBounds = bounds ? resizeBounds(bounds, handle, dx, dy) : null;
    if (!bounds || !nextBounds) return resized as ElementNode;
    resized.children = (resized.children as ElementNode[]).map(child => transformElementForGroupResize(child, bounds, nextBounds));
    return resized as ElementNode;
  }

  if (
    resized.type === 'graph' ||
    resized.type === 'matrix' ||
    resized.type === 'text' ||
    resized.type === 'latex'
  ) {
    const boundsElement = withoutSpatialScale(element);
    const bounds = getMeasuredElementBounds(boundsElement);
    const [scaleX, scaleY] = getSpatialScale(element);
    const localDx = dx / scaleX;
    const localDy = dy / scaleY;
    const nextBounds = bounds ? resizeBounds(bounds, handle, localDx, localDy) : null;
    if (!bounds || !nextBounds) return resized as ElementNode;
    return transformElementForGroupResize(element, bounds, nextBounds);
  }

  const affectsLeft = handle.includes('w');
  const affectsRight = handle.includes('e');
  const affectsTop = handle.includes('n');
  const affectsBottom = handle.includes('s');

  // Signed delta: positive = outward (growing), negative = inward (shrinking).
  // For right/bottom handles, outward means positive dx/dy.
  // For left/top handles, outward means negative dx/dy.
  const signedDelta =
    dx * (affectsRight ? 1 : affectsLeft ? -1 : 0) +
    dy * (affectsBottom ? 1 : affectsTop ? -1 : 0);

  // 1. Has width/height (rect, image, barChart)
  if ('width' in resized && typeof resized.width === 'number' &&
      'height' in resized && typeof resized.height === 'number') {
    if (affectsLeft) { resized.x = (resized.x ?? 0) + dx; resized.width = Math.max(1, resized.width - dx); }
    if (affectsRight) { resized.width = Math.max(1, resized.width + dx); }
    if (affectsTop) { resized.y = (resized.y ?? 0) + dy; resized.height = Math.max(1, resized.height - dy); }
    if (affectsBottom) { resized.height = Math.max(1, resized.height + dy); }
  }
  // 2. Has radius (circle) — use signed delta for correct inward/outward
  else if ('r' in resized && typeof resized.r === 'number') {
    resized.r = Math.max(1, resized.r + signedDelta);
  }
  // 3. Has endpoints (line, arrow, bezierCurve)
  else if ('x1' in resized && typeof resized.x1 === 'number') {
    if (affectsLeft || affectsTop) { resized.x1 += dx; resized.y1 += dy; }
    if (affectsRight || affectsBottom) { resized.x2 += dx; resized.y2 += dy; }
  }
  // 4. Has points (polygon) — scale all points from centroid
  else if ('points' in resized && Array.isArray(resized.points) && resized.points.length > 0) {
    const pts = resized.points as [number, number][];
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const scaleFactor = 1 + signedDelta / 100;
    resized.points = pts.map(([px, py]) => [
      cx + (px - cx) * scaleFactor,
      cy + (py - cy) * scaleFactor,
    ]);
  }
  // 5. Has fontSize (text, latex) — resize via font size
  else if ('fontSize' in resized && typeof resized.fontSize === 'number') {
    resized.fontSize = Math.max(4, resized.fontSize + signedDelta * 0.1);
  }
  // 6. Has cellSize (matrix) — resize via cell size
  else if ('cellSize' in resized && typeof resized.cellSize === 'number') {
    resized.cellSize = Math.max(10, resized.cellSize + signedDelta * 0.2);
  }
  // 7. Has numeric scale (axes, functionPlot, etc.) — adjust scale
  else if ('scale' in resized && typeof resized.scale === 'number') {
    resized.scale = Math.max(5, resized.scale + signedDelta * 0.2);
  }

  return resized as ElementNode;
}

// ─── Duplicate helper ───────────────────────────────────────────────────────

function cloneElement(element: ElementNode, offset: { dx: number; dy: number }): ElementNode {
  const clone = JSON.parse(JSON.stringify(element));
  if ('id' in clone) clone.id = `${clone.id}-copy-${Date.now().toString(36).slice(-4)}`;
  return applyMove(clone, offset.dx, offset.dy);
}

// ─── Bounding box helper for alignment ──────────────────────────────────────

interface Bounds { x: number; y: number; width: number; height: number }

function getElementBounds(el: ElementNode): Bounds | null {
  if ('x' in el && typeof el.x === 'number' && 'width' in el && typeof el.width === 'number') {
    return { x: el.x, y: (el as any).y ?? 0, width: el.width, height: (el as any).height ?? 0 };
  }
  if ('cx' in el && typeof el.cx === 'number' && 'r' in el && typeof el.r === 'number') {
    return { x: el.cx - el.r, y: (el as any).cy - el.r, width: el.r * 2, height: el.r * 2 };
  }
  if ('x1' in el && typeof el.x1 === 'number') {
    const x = Math.min(el.x1, (el as any).x2);
    const y = Math.min((el as any).y1, (el as any).y2);
    return { x, y, width: Math.abs((el as any).x2 - el.x1), height: Math.abs((el as any).y2 - (el as any).y1) };
  }
  if ('points' in el && Array.isArray(el.points) && el.points.length > 0) {
    const pts = el.points as [number, number][];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
  }
  if ('origin' in el && Array.isArray(el.origin)) {
    return { x: el.origin[0], y: el.origin[1], width: 0, height: 0 };
  }
  return null;
}

// ─── Reducer ───────────────────────────────────────────────────────────────

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  // Push history for undoable actions
  if (isUndoableAction(action)) {
    const past = [...state.past, historyEntryFromState(state)].slice(-MAX_HISTORY);
    state = { ...state, past, future: [] };
  }

  switch (action.type) {
    case 'SELECT':
      return { ...state, selectedIds: action.ids };

    case 'SELECT_ADD':
      if (state.selectedIds.includes(action.id)) return state;
      return { ...state, selectedIds: [...state.selectedIds.filter(id => id !== CANVAS_ID), action.id] };

    case 'SELECT_TOGGLE': {
      const idx = state.selectedIds.indexOf(action.id);
      if (idx >= 0) {
        const selectedIds = state.selectedIds.filter((_, i) => i !== idx);
        return { ...state, selectedIds };
      }
      return { ...state, selectedIds: [...state.selectedIds.filter(id => id !== CANVAS_ID), action.id] };
    }

    case 'DESELECT_ALL':
      return state.selectedIds.length === 0 ? state : { ...state, selectedIds: [] };

    case 'SET_CAMERA_FRAMING':
      if (!action.framing) {
        return !state.isCameraFraming && !state.cameraFramingTimelineId && state.cameraFramingFrame === undefined
          ? state
          : {
              ...state,
              isCameraFraming: false,
              cameraFramingTimelineId: undefined,
              cameraFramingFrame: undefined,
            };
      }
      return state.isCameraFraming
        && state.cameraFramingTimelineId === action.timelineId
        && state.cameraFramingFrame === action.frame
        ? state
        : {
            ...state,
            isCameraFraming: true,
            cameraFramingTimelineId: action.timelineId,
            cameraFramingFrame: action.frame,
          };

    case 'SET_ACTIVE_TIMELINE':
      return state.activeTimelineId === action.timelineId
        ? state
        : { ...state, activeTimelineId: action.timelineId };

    case 'IMPORT_CANONICAL_DOCUMENT':
      return {
        ...state,
        document: projectDocument(action.document),
        canonicalDocument: action.document,
        selectedIds: [],
      };

    case 'SET_CANONICAL_DOCUMENT':
      if (action.document && action.syncProjection) {
        const projectedDocument = projectDocument(action.document);
        return syncCanonicalFromProjection(
          { ...state, canonicalDocument: action.document },
          documentsEqual(projectedDocument, state.document) ? state.document : projectedDocument,
        );
      }
      return {
        ...state,
        canonicalDocument: action.document,
      };

    case 'UPDATE_TIMELINE_CAMERA': {
      const canonicalDocument = state.canonicalDocument;
      const timeline = canonicalDocument?.timelines?.[action.timelineId];
      if (!canonicalDocument || !timeline) return state;
      const nextCanonicalDocument: CanonicalElucimDocument = {
        ...canonicalDocument,
        timelines: {
          ...canonicalDocument.timelines,
          [action.timelineId]: { ...timeline, camera: action.camera },
        },
      };
      const projectedDocument = projectDocument(nextCanonicalDocument);
      return syncCanonicalFromProjection(
        { ...state, canonicalDocument: nextCanonicalDocument },
        documentsEqual(projectedDocument, state.document) ? state.document : projectedDocument,
      );
    }

    case 'UPDATE_ELEMENT': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.id);
      if (!loc || !loc.parent) return state;
      loc.parent[loc.index] = { ...loc.element, ...action.changes } as ElementNode;
      return syncCanonicalFromProjection(state, doc);
    }

    case 'UPDATE_CANVAS': {
      const doc = cloneDoc(state.document);
      Object.assign(doc.root, action.changes);
      return syncCanonicalFromProjection(state, doc);
    }

    case 'ADD_ELEMENT': {
      const doc = cloneDoc(state.document);
      const root = doc.root;
      if ('children' in root && Array.isArray(root.children)) {
        root.children.push(action.element);
      }
      return syncCanonicalFromProjection(state, doc);
    }

    case 'DELETE_ELEMENTS': {
      const doc = cloneDoc(state.document);
      for (const id of action.ids) {
        const loc = findElementById(doc.root, id);
        if (loc?.parent) {
          loc.parent.splice(loc.index, 1);
        }
      }
      return {
        ...syncCanonicalFromProjection(state, doc, { removedIds: new Set(action.ids) }),
        selectedIds: state.selectedIds.filter(id => !action.ids.includes(id)),
      };
    }

    case 'DUPLICATE_ELEMENTS': {
      const doc = cloneDoc(state.document);
      const rootChildren = getChildren(doc.root);
      if (!rootChildren) return state;
      const offset = action.offset ?? { dx: 20, dy: 20 };
      const newIds: string[] = [];
      for (const id of action.ids) {
        const loc = findElementById(doc.root, id);
        if (loc?.parent) {
          const clone = cloneElement(loc.element, offset);
          const cloneId = ('id' in clone && clone.id) ? clone.id : undefined;
          loc.parent.splice(loc.index + 1, 0, clone);
          if (cloneId) newIds.push(cloneId);
        }
      }
      return { ...syncCanonicalFromProjection(state, doc), selectedIds: newIds.length > 0 ? newIds : state.selectedIds };
    }

    case 'MOVE_ELEMENT': {
      const doc = cloneDoc(state.document);
      // If the dragged element is in a multi-selection, move all selected elements
      const idsToMove = state.selectedIds.length > 1 && state.selectedIds.includes(action.id)
        ? state.selectedIds
        : [action.id];
      for (const id of idsToMove) {
        const loc = findElementById(doc.root, id);
        if (loc?.parent) {
          loc.parent[loc.index] = applyMove(loc.element, action.dx, action.dy);
        }
      }
      return syncCanonicalFromProjection(state, doc);
    }

    case 'MOVE_GRAPH_NODE': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.graphId);
      if (!loc?.parent) return state;
      const graph = { ...loc.element } as any;
      if (!Array.isArray(graph.nodes)) return state;
      const nodeIdx = graph.nodes.findIndex((n: any) => n.id === action.nodeId);
      if (nodeIdx < 0) return state;
      graph.nodes = [...graph.nodes];
      graph.nodes[nodeIdx] = {
        ...graph.nodes[nodeIdx],
        x: Math.round(graph.nodes[nodeIdx].x + action.dx),
        y: Math.round(graph.nodes[nodeIdx].y + action.dy),
      };
      loc.parent[loc.index] = graph;
      return syncCanonicalFromProjection(state, doc);
    }

    case 'RESIZE_ELEMENT': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.id);
      if (!loc?.parent) return state;
      let { dx, dy } = action;
      if (action.constrain) {
        // Constrained resize: use larger axis for uniform scaling
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        const d = absDx > absDy ? dx : dy;
        dx = d;
        dy = d;
      }
      loc.parent[loc.index] = applyResize(loc.element, action.handle, dx, dy);
      return syncCanonicalFromProjection(state, doc);
    }

    case 'ROTATE_ELEMENT': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.id);
      if (!loc?.parent) return state;
      const el = loc.element as any;
      const current = el.rotation ?? 0;
      loc.parent[loc.index] = { ...el, rotation: current + action.angleDeg } as ElementNode;
      return syncCanonicalFromProjection(state, doc);
    }

    case 'GROUP_ELEMENTS': {
      const doc = cloneDoc(state.document);
      const locations = action.ids
        .filter(id => id !== CANVAS_ID)
        .map(id => findElementById(doc.root, id))
        .filter((loc): loc is ElementLocation => !!loc?.parent);

      if (locations.length < 2) return state;
      const parent = locations[0].parent;
      if (!parent || locations.some(loc => loc.parent !== parent)) return state;

      const sorted = [...locations].sort((a, b) => a.index - b.index);
      const indices = sorted.map(loc => loc.index);
      const elements = sorted.map(loc => loc.element);

      // Remove grouped elements (reverse order to preserve indices)
      for (let i = indices.length - 1; i >= 0; i--) {
        parent.splice(indices[i], 1);
      }
      // Insert group at the position of the first element
      const groupNode: any = {
        type: 'group',
        id: `group-${Date.now().toString(36).slice(-6)}`,
        children: elements,
      };
      parent.splice(indices[0], 0, groupNode as ElementNode);
      return { ...syncCanonicalFromProjection(state, doc), selectedIds: [groupNode.id] };
    }

    case 'UNGROUP': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.id);
      if (!loc?.parent) return state;
      const group = loc.element as any;
      if (group.type !== 'group' || !Array.isArray(group.children)) return state;
      // Replace the group with its children at the same position
      loc.parent.splice(loc.index, 1, ...group.children);
      const childIds = group.children
        .map((c: any) => c.id)
        .filter((id: string | undefined): id is string => !!id);
      return { ...syncCanonicalFromProjection(state, doc, { removedIds: new Set([action.id]) }), selectedIds: childIds };
    }

    case 'RENAME_ELEMENT': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.id);
      if (!loc?.parent) return state;
      loc.parent[loc.index] = { ...loc.element, id: action.newId } as ElementNode;
      // Update selectedIds if the renamed element was selected
      const selectedIds = state.selectedIds.map(id => id === action.id ? action.newId : id);
      return {
        ...syncCanonicalFromProjection(state, doc, {
          idMap: new Map([[action.id, action.newId]]),
        }),
        selectedIds,
      };
    }

    case 'REORDER_ELEMENT': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.id);
      if (!loc?.parent) return state;
      const newIdx = Math.max(0, Math.min(action.newIndex, loc.parent.length - 1));
      if (newIdx === loc.index) return state;
      const [removed] = loc.parent.splice(loc.index, 1);
      loc.parent.splice(newIdx, 0, removed);
      return syncCanonicalFromProjection(state, doc);
    }

    case 'SET_VIEWPORT':
      return { ...state, viewport: { ...state.viewport, ...action.viewport } };

    case 'SET_FRAME':
      return { ...state, currentFrame: action.frame };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.playing };

    case 'SET_TOOL':
      return { ...state, activeTool: action.tool };

    case 'SET_PANNING':
      return { ...state, isPanning: action.panning };

    case 'SET_TOOLBAR_POSITION':
      return { ...state, toolbarPosition: action.position };

    case 'SET_TOOLBAR_COLLAPSED':
      return { ...state, toolbarCollapsed: action.collapsed };

    case 'SET_INSPECTOR_POSITION':
      return { ...state, inspectorPosition: action.position };

    case 'SET_INSPECTOR_PINNED':
      return { ...state, inspectorPinned: action.pinned };

    case 'SET_EDITOR_THEME':
      return { ...state, themeOverrides: action.overrides };

    // ─── Layer order actions ─────────────────────────────────────────────

    case 'BRING_FORWARD': {
      const doc = cloneDoc(state.document);
      for (const group of groupLocationsByParent(doc.root, action.ids)) {
        const parent = group[0].parent!;
        const sorted = group.map(loc => loc.index).sort((a, b) => b - a);
        for (const idx of sorted) {
          if (idx < parent.length - 1) {
            const [el] = parent.splice(idx, 1);
            parent.splice(idx + 1, 0, el);
          }
        }
      }
      return syncCanonicalFromProjection(state, doc);
    }

    case 'SEND_BACKWARD': {
      const doc = cloneDoc(state.document);
      for (const group of groupLocationsByParent(doc.root, action.ids)) {
        const parent = group[0].parent!;
        const sorted = group.map(loc => loc.index).sort((a, b) => a - b);
        for (const idx of sorted) {
          if (idx > 0) {
            const [el] = parent.splice(idx, 1);
            parent.splice(idx - 1, 0, el);
          }
        }
      }
      return syncCanonicalFromProjection(state, doc);
    }

    case 'BRING_TO_FRONT': {
      const doc = cloneDoc(state.document);
      for (const group of groupLocationsByParent(doc.root, action.ids)) {
        const parent = group[0].parent!;
        const sorted = group.map(loc => loc.index).sort((a, b) => b - a);
        const removed: ElementNode[] = [];
        for (const idx of sorted) {
          removed.unshift(...parent.splice(idx, 1));
        }
        parent.push(...removed);
      }
      return syncCanonicalFromProjection(state, doc);
    }

    case 'SEND_TO_BACK': {
      const doc = cloneDoc(state.document);
      for (const group of groupLocationsByParent(doc.root, action.ids)) {
        const parent = group[0].parent!;
        const sorted = group.map(loc => loc.index).sort((a, b) => b - a);
        const removed: ElementNode[] = [];
        for (const idx of sorted) {
          removed.unshift(...parent.splice(idx, 1));
        }
        parent.unshift(...removed);
      }
      return syncCanonicalFromProjection(state, doc);
    }

    // ─── Alignment & distribution ────────────────────────────────────────

    case 'ALIGN_ELEMENTS': {
      if (action.ids.length < 2) return state;
      const doc = cloneDoc(state.document);
      const elements = action.ids.map(id => findElementById(doc.root, id)).filter(Boolean) as ElementLocation[];
      const boundsArr = elements.map(loc => ({ loc, bounds: getElementBounds(loc.element) })).filter(b => b.bounds !== null) as { loc: ElementLocation; bounds: Bounds }[];
      if (boundsArr.length < 2) return state;

      let target: number;
      switch (action.direction) {
        case 'left':
          target = Math.min(...boundsArr.map(b => b.bounds.x));
          for (const { loc, bounds } of boundsArr) {
            loc.parent![loc.index] = applyMove(loc.element, target - bounds.x, 0);
          }
          break;
        case 'right':
          target = Math.max(...boundsArr.map(b => b.bounds.x + b.bounds.width));
          for (const { loc, bounds } of boundsArr) {
            loc.parent![loc.index] = applyMove(loc.element, target - (bounds.x + bounds.width), 0);
          }
          break;
        case 'top':
          target = Math.min(...boundsArr.map(b => b.bounds.y));
          for (const { loc, bounds } of boundsArr) {
            loc.parent![loc.index] = applyMove(loc.element, 0, target - bounds.y);
          }
          break;
        case 'bottom':
          target = Math.max(...boundsArr.map(b => b.bounds.y + b.bounds.height));
          for (const { loc, bounds } of boundsArr) {
            loc.parent![loc.index] = applyMove(loc.element, 0, target - (bounds.y + bounds.height));
          }
          break;
        case 'center-h':
          target = boundsArr.reduce((s, b) => s + b.bounds.x + b.bounds.width / 2, 0) / boundsArr.length;
          for (const { loc, bounds } of boundsArr) {
            loc.parent![loc.index] = applyMove(loc.element, target - (bounds.x + bounds.width / 2), 0);
          }
          break;
        case 'center-v':
          target = boundsArr.reduce((s, b) => s + b.bounds.y + b.bounds.height / 2, 0) / boundsArr.length;
          for (const { loc, bounds } of boundsArr) {
            loc.parent![loc.index] = applyMove(loc.element, 0, target - (bounds.y + bounds.height / 2));
          }
          break;
      }
      return { ...state, document: doc };
    }

    case 'DISTRIBUTE_ELEMENTS': {
      if (action.ids.length < 3) return state;
      const doc = cloneDoc(state.document);
      const elements = action.ids.map(id => findElementById(doc.root, id)).filter(Boolean) as ElementLocation[];
      const boundsArr = elements.map(loc => ({ loc, bounds: getElementBounds(loc.element) })).filter(b => b.bounds !== null) as { loc: ElementLocation; bounds: Bounds }[];
      if (boundsArr.length < 3) return state;

      if (action.direction === 'horizontal') {
        boundsArr.sort((a, b) => a.bounds.x - b.bounds.x);
        const first = boundsArr[0].bounds.x + boundsArr[0].bounds.width / 2;
        const last = boundsArr[boundsArr.length - 1].bounds.x + boundsArr[boundsArr.length - 1].bounds.width / 2;
        const step = (last - first) / (boundsArr.length - 1);
        for (let i = 1; i < boundsArr.length - 1; i++) {
          const targetCenter = first + step * i;
          const currentCenter = boundsArr[i].bounds.x + boundsArr[i].bounds.width / 2;
          boundsArr[i].loc.parent![boundsArr[i].loc.index] = applyMove(boundsArr[i].loc.element, targetCenter - currentCenter, 0);
        }
      } else {
        boundsArr.sort((a, b) => a.bounds.y - b.bounds.y);
        const first = boundsArr[0].bounds.y + boundsArr[0].bounds.height / 2;
        const last = boundsArr[boundsArr.length - 1].bounds.y + boundsArr[boundsArr.length - 1].bounds.height / 2;
        const step = (last - first) / (boundsArr.length - 1);
        for (let i = 1; i < boundsArr.length - 1; i++) {
          const targetCenter = first + step * i;
          const currentCenter = boundsArr[i].bounds.y + boundsArr[i].bounds.height / 2;
          boundsArr[i].loc.parent![boundsArr[i].loc.index] = applyMove(boundsArr[i].loc.element, 0, targetCenter - currentCenter);
        }
      }
      return { ...state, document: doc };
    }

    case 'ZOOM_TO_FIT':
      return { ...state, viewport: { x: 0, y: 0, zoom: 1 } };

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...restoreHistoryEntry(state, prev),
        past: state.past.slice(0, -1),
        future: [historyEntryFromState(state), ...state.future].slice(0, MAX_HISTORY),
        selectedIds: [],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...restoreHistoryEntry(state, next),
        past: [...state.past, historyEntryFromState(state)].slice(-MAX_HISTORY),
        future: state.future.slice(1),
        selectedIds: [],
      };
    }

    default:
      return state;
  }
}
