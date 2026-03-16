import type { ElucimDocument, ElementNode, SceneNode, PlayerNode } from '@elucim/dsl';

// ─── Editor State ──────────────────────────────────────────────────────────

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface EditorState {
  /** The document being edited */
  document: ElucimDocument;
  /** IDs of currently selected elements (uses id field or generated path) */
  selectedIds: string[];
  /** Canvas viewport (pan/zoom) */
  viewport: Viewport;
  /** Undo history stack */
  past: ElucimDocument[];
  /** Redo stack */
  future: ElucimDocument[];
  /** Current animation frame for preview */
  currentFrame: number;
  /** Whether the animation is playing */
  isPlaying: boolean;
  /** Active tool */
  activeTool: EditorTool;
}

export type EditorTool =
  | 'select'
  | 'rect'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text'
  | 'latex';

// ─── Actions ───────────────────────────────────────────────────────────────

export type EditorAction =
  | { type: 'SELECT'; ids: string[] }
  | { type: 'SELECT_ADD'; id: string }
  | { type: 'SELECT_TOGGLE'; id: string }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_DOCUMENT'; document: ElucimDocument }
  | { type: 'UPDATE_ELEMENT'; id: string; changes: Partial<ElementNode> }
  | { type: 'ADD_ELEMENT'; element: ElementNode; parentPath?: string }
  | { type: 'DELETE_ELEMENTS'; ids: string[] }
  | { type: 'MOVE_ELEMENT'; id: string; dx: number; dy: number }
  | { type: 'SET_VIEWPORT'; viewport: Partial<Viewport> }
  | { type: 'SET_FRAME'; frame: number }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SET_TOOL'; tool: EditorTool }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// ─── Element ID helpers ────────────────────────────────────────────────────

/** Get or generate a stable ID for an element based on its path in the tree */
export function getElementId(element: ElementNode, index: number, parentPath: string = 'root'): string {
  if ('id' in element && element.id) return element.id;
  return `${parentPath}.${element.type}[${index}]`;
}

/** Container root types that hold children */
export type ContainerRoot = SceneNode | PlayerNode;

// ─── Default state factory ─────────────────────────────────────────────────

export function createDefaultDocument(): ElucimDocument {
  return {
    version: '1.0',
    root: {
      type: 'player',
      width: 800,
      height: 600,
      durationInFrames: 120,
      fps: 60,
      background: '#0f172a',
      controls: true,
      loop: true,
      children: [],
    },
  };
}

export function createInitialState(document?: ElucimDocument): EditorState {
  return {
    document: document ?? createDefaultDocument(),
    selectedIds: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    past: [],
    future: [],
    currentFrame: 0,
    isPlaying: false,
    activeTool: 'select',
  };
}

const MAX_HISTORY = 50;

/** Whether an action should create a history entry */
export function isUndoableAction(action: EditorAction): boolean {
  switch (action.type) {
    case 'UPDATE_ELEMENT':
    case 'ADD_ELEMENT':
    case 'DELETE_ELEMENTS':
    case 'MOVE_ELEMENT':
    case 'SET_DOCUMENT':
      return true;
    default:
      return false;
  }
}
