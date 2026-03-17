import type { ElucimDocument, ElementNode } from '@elucim/dsl';
import type { EditorState, EditorAction } from './types';
import { isUndoableAction } from './types';

const MAX_HISTORY = 50;

// ─── Deep-clone helper (JSON-safe) ─────────────────────────────────────────

function cloneDoc(doc: ElucimDocument): ElucimDocument {
  return JSON.parse(JSON.stringify(doc));
}

// ─── Tree traversal helpers ────────────────────────────────────────────────

interface ElementLocation {
  parent: ElementNode[] | undefined;
  index: number;
  element: ElementNode;
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
      return { parent: children, index: i, element: child };
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
      return { parent: arr, index: i, element: child };
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

// ─── Position helpers ──────────────────────────────────────────────────────

function applyMove(element: ElementNode, dx: number, dy: number): ElementNode {
  const moved = { ...element };
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
  return moved;
}

// ─── Resize helpers (property-based) ────────────────────────────────────────

function applyResize(element: ElementNode, handle: string, dx: number, dy: number): ElementNode {
  const resized = { ...element } as any;
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

// ─── Reducer ───────────────────────────────────────────────────────────────

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  // Push history for undoable actions
  if (isUndoableAction(action)) {
    const past = [...state.past, cloneDoc(state.document)].slice(-MAX_HISTORY);
    state = { ...state, past, future: [] };
  }

  switch (action.type) {
    case 'SELECT':
      return { ...state, selectedIds: action.ids };

    case 'SELECT_ADD':
      if (state.selectedIds.includes(action.id)) return state;
      return { ...state, selectedIds: [...state.selectedIds, action.id] };

    case 'SELECT_TOGGLE': {
      const idx = state.selectedIds.indexOf(action.id);
      if (idx >= 0) {
        return { ...state, selectedIds: state.selectedIds.filter((_, i) => i !== idx) };
      }
      return { ...state, selectedIds: [...state.selectedIds, action.id] };
    }

    case 'DESELECT_ALL':
      return state.selectedIds.length === 0 ? state : { ...state, selectedIds: [] };

    case 'SET_DOCUMENT':
      return { ...state, document: action.document, selectedIds: [] };

    case 'UPDATE_ELEMENT': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.id);
      if (!loc || !loc.parent) return state;
      loc.parent[loc.index] = { ...loc.element, ...action.changes } as ElementNode;
      return { ...state, document: doc };
    }

    case 'UPDATE_CANVAS': {
      const doc = cloneDoc(state.document);
      Object.assign(doc.root, action.changes);
      return { ...state, document: doc };
    }

    case 'ADD_ELEMENT': {
      const doc = cloneDoc(state.document);
      const root = doc.root;
      if ('children' in root && Array.isArray(root.children)) {
        root.children.push(action.element);
      }
      return { ...state, document: doc };
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
        ...state,
        document: doc,
        selectedIds: state.selectedIds.filter(id => !action.ids.includes(id)),
      };
    }

    case 'MOVE_ELEMENT': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.id);
      if (!loc?.parent) return state;
      loc.parent[loc.index] = applyMove(loc.element, action.dx, action.dy);
      return { ...state, document: doc };
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
        x: graph.nodes[nodeIdx].x + action.dx,
        y: graph.nodes[nodeIdx].y + action.dy,
      };
      loc.parent[loc.index] = graph;
      return { ...state, document: doc };
    }

    case 'RESIZE_ELEMENT': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.id);
      if (!loc?.parent) return state;
      loc.parent[loc.index] = applyResize(loc.element, action.handle, action.dx, action.dy);
      return { ...state, document: doc };
    }

    case 'ROTATE_ELEMENT': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.id);
      if (!loc?.parent) return state;
      const el = loc.element as any;
      const current = el.rotation ?? 0;
      loc.parent[loc.index] = { ...el, rotation: current + action.angleDeg } as ElementNode;
      return { ...state, document: doc };
    }

    case 'GROUP_ELEMENTS': {
      if (action.ids.length < 2) return state;
      const doc = cloneDoc(state.document);
      const rootChildren = getChildren(doc.root);
      if (!rootChildren) return state;
      // Collect elements to group (only from root level)
      const indices: number[] = [];
      const elements: ElementNode[] = [];
      for (let i = 0; i < rootChildren.length; i++) {
        const cId = ('id' in rootChildren[i] && rootChildren[i].id) ? rootChildren[i].id : undefined;
        if (cId && action.ids.includes(cId)) {
          indices.push(i);
          elements.push(rootChildren[i]);
        }
      }
      if (elements.length < 2) return state;
      // Remove grouped elements (reverse order to preserve indices)
      for (let i = indices.length - 1; i >= 0; i--) {
        rootChildren.splice(indices[i], 1);
      }
      // Insert group at the position of the first element
      const groupNode: any = {
        type: 'group',
        id: `group-${Date.now().toString(36).slice(-6)}`,
        children: elements,
      };
      rootChildren.splice(indices[0], 0, groupNode as ElementNode);
      return { ...state, document: doc, selectedIds: [groupNode.id] };
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
      return { ...state, document: doc, selectedIds: childIds };
    }

    case 'RENAME_ELEMENT': {
      const doc = cloneDoc(state.document);
      const loc = findElementById(doc.root, action.id);
      if (!loc?.parent) return state;
      loc.parent[loc.index] = { ...loc.element, id: action.newId } as ElementNode;
      // Update selectedIds if the renamed element was selected
      const selectedIds = state.selectedIds.map(id => id === action.id ? action.newId : id);
      return { ...state, document: doc, selectedIds };
    }

    case 'REORDER_ELEMENT': {
      const doc = cloneDoc(state.document);
      const rootChildren = getChildren(doc.root);
      if (!rootChildren) return state;
      const loc = findElementById(doc.root, action.id);
      if (!loc?.parent || loc.parent !== rootChildren) return state;
      const newIdx = Math.max(0, Math.min(action.newIndex, rootChildren.length - 1));
      if (newIdx === loc.index) return state;
      const [removed] = rootChildren.splice(loc.index, 1);
      rootChildren.splice(newIdx, 0, removed);
      return { ...state, document: doc };
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

    case 'ZOOM_TO_FIT':
      return { ...state, viewport: { x: 0, y: 0, zoom: 1 } };

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        document: prev,
        past: state.past.slice(0, -1),
        future: [cloneDoc(state.document), ...state.future].slice(0, MAX_HISTORY),
        selectedIds: [],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        document: next,
        past: [...state.past, cloneDoc(state.document)].slice(-MAX_HISTORY),
        future: state.future.slice(1),
        selectedIds: [],
      };
    }

    default:
      return state;
  }
}
