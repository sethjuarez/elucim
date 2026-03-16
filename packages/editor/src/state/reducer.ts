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

// ─── Resize helpers ────────────────────────────────────────────────────────

function applyResize(element: ElementNode, handle: string, dx: number, dy: number): ElementNode {
  const resized = { ...element } as any;
  const affectsLeft = handle.includes('w');
  const affectsRight = handle.includes('e');
  const affectsTop = handle.includes('n');
  const affectsBottom = handle.includes('s');

  switch (element.type) {
    case 'rect':
    case 'image':
    case 'barChart': {
      if (affectsLeft) {
        resized.x = (resized.x ?? 0) + dx;
        resized.width = Math.max(1, (resized.width ?? 0) - dx);
      }
      if (affectsRight) {
        resized.width = Math.max(1, (resized.width ?? 0) + dx);
      }
      if (affectsTop) {
        resized.y = (resized.y ?? 0) + dy;
        resized.height = Math.max(1, (resized.height ?? 0) - dy);
      }
      if (affectsBottom) {
        resized.height = Math.max(1, (resized.height ?? 0) + dy);
      }
      break;
    }

    case 'circle': {
      // Resize circle by adjusting radius based on the dominant axis
      const dr = Math.max(Math.abs(dx), Math.abs(dy));
      const sign = (affectsRight || affectsBottom) ? 1 : -1;
      resized.r = Math.max(1, (resized.r ?? 0) + sign * dr);
      break;
    }

    case 'line':
    case 'arrow': {
      // Resize by moving the endpoint closest to the handle
      if (affectsLeft || affectsTop) {
        resized.x1 = (resized.x1 ?? 0) + dx;
        resized.y1 = (resized.y1 ?? 0) + dy;
      }
      if (affectsRight || affectsBottom) {
        resized.x2 = (resized.x2 ?? 0) + dx;
        resized.y2 = (resized.y2 ?? 0) + dy;
      }
      break;
    }

    default:
      // For other types, no-op for now
      break;
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
