import type { ElucimDocument, ElementNode, SceneNode, PlayerNode } from '@elucim/dsl';

// ─── Editor State ──────────────────────────────────────────────────────────

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface PanelPosition {
  x: number;
  y: number;
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
  /** Whether user is currently panning (Space held) */
  isPanning: boolean;
  /** Floating toolbar position */
  toolbarPosition: PanelPosition;
  /** Floating inspector position (null = auto-position near selection) */
  inspectorPosition: PanelPosition | null;
  /** Whether inspector is pinned to its current position */
  inspectorPinned: boolean;
  /** Whether toolbar is collapsed to icon strip */
  toolbarCollapsed: boolean;
  /** Runtime editor-chrome theme overrides (set by "Apply theme") */
  themeOverrides: Record<string, string>;
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

export type AlignDirection = 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v';
export type DistributeDirection = 'horizontal' | 'vertical';

export type EditorAction =
  | { type: 'SELECT'; ids: string[] }
  | { type: 'SELECT_ADD'; id: string }
  | { type: 'SELECT_TOGGLE'; id: string }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_DOCUMENT'; document: ElucimDocument }
  | { type: 'UPDATE_ELEMENT'; id: string; changes: Partial<ElementNode> }
  | { type: 'UPDATE_CANVAS'; changes: Record<string, any> }
  | { type: 'ADD_ELEMENT'; element: ElementNode; parentPath?: string }
  | { type: 'DELETE_ELEMENTS'; ids: string[] }
  | { type: 'DUPLICATE_ELEMENTS'; ids: string[]; offset?: { dx: number; dy: number } }
  | { type: 'MOVE_ELEMENT'; id: string; dx: number; dy: number }
  | { type: 'MOVE_GRAPH_NODE'; graphId: string; nodeId: string; dx: number; dy: number }
  | { type: 'RESIZE_ELEMENT'; id: string; handle: string; dx: number; dy: number; constrain?: boolean }
  | { type: 'ROTATE_ELEMENT'; id: string; angleDeg: number }
  | { type: 'GROUP_ELEMENTS'; ids: string[] }
  | { type: 'UNGROUP'; id: string }
  | { type: 'RENAME_ELEMENT'; id: string; newId: string }
  | { type: 'REORDER_ELEMENT'; id: string; newIndex: number }
  | { type: 'BRING_FORWARD'; ids: string[] }
  | { type: 'SEND_BACKWARD'; ids: string[] }
  | { type: 'BRING_TO_FRONT'; ids: string[] }
  | { type: 'SEND_TO_BACK'; ids: string[] }
  | { type: 'ALIGN_ELEMENTS'; ids: string[]; direction: AlignDirection }
  | { type: 'DISTRIBUTE_ELEMENTS'; ids: string[]; direction: DistributeDirection }
  | { type: 'SET_VIEWPORT'; viewport: Partial<Viewport> }
  | { type: 'SET_FRAME'; frame: number }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SET_TOOL'; tool: EditorTool }
  | { type: 'SET_PANNING'; panning: boolean }
  | { type: 'SET_TOOLBAR_POSITION'; position: PanelPosition }
  | { type: 'SET_TOOLBAR_COLLAPSED'; collapsed: boolean }
  | { type: 'SET_INSPECTOR_POSITION'; position: PanelPosition | null }
  | { type: 'SET_INSPECTOR_PINNED'; pinned: boolean }
  | { type: 'SET_EDITOR_THEME'; overrides: Record<string, string> }
  | { type: 'ZOOM_TO_FIT' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

/** Sentinel ID representing the canvas/scene root in the selection. */
export const CANVAS_ID = '__canvas__';

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

export function createInitialState(document?: ElucimDocument, initialFrame?: number): EditorState {
  return {
    document: document ?? createDefaultDocument(),
    selectedIds: [CANVAS_ID],
    viewport: { x: 0, y: 0, zoom: 1 },
    past: [],
    future: [],
    currentFrame: initialFrame ?? 0,
    isPlaying: false,
    activeTool: 'select',
    isPanning: false,
    toolbarPosition: { x: 24, y: 24 },
    inspectorPosition: null,
    inspectorPinned: true,
    toolbarCollapsed: false,
    themeOverrides: {},
  };
}

const MAX_HISTORY = 50;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 0.1;

/** Whether an action should create a history entry */
export function isUndoableAction(action: EditorAction): boolean {
  switch (action.type) {
    case 'UPDATE_ELEMENT':
    case 'UPDATE_CANVAS':
    case 'ADD_ELEMENT':
    case 'DELETE_ELEMENTS':
    case 'DUPLICATE_ELEMENTS':
    case 'MOVE_ELEMENT':
    case 'RESIZE_ELEMENT':
    case 'ROTATE_ELEMENT':
    case 'SET_DOCUMENT':
    case 'BRING_FORWARD':
    case 'SEND_BACKWARD':
    case 'BRING_TO_FRONT':
    case 'SEND_TO_BACK':
    case 'ALIGN_ELEMENTS':
    case 'DISTRIBUTE_ELEMENTS':
      return true;
    default:
      return false;
  }
}
