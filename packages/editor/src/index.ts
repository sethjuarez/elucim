// @elucim/editor — Visual editor for Elucim animated scenes

// Main component
export { ElucimEditor, type ElucimEditorProps } from './ElucimEditor';

// State management (for advanced integrations)
export { EditorProvider, useEditorState, useEditorDocument, useEditorSelection, type EditorProviderProps } from './state/EditorProvider';
export type { EditorState, EditorAction, EditorTool, Viewport } from './state/types';
export { createInitialState, createDefaultDocument } from './state/types';
export { editorReducer, findElementById, collectAllIds } from './state/reducer';

// Canvas
export { ElucimCanvas, type ElucimCanvasProps } from './canvas/ElucimCanvas';
export { SelectionOverlay, type SelectionOverlayProps } from './canvas/SelectionOverlay';
export { useDrag, type DragState } from './canvas/useDrag';

// Toolbar
export { Toolbar, type ToolbarProps } from './toolbar/Toolbar';
export { ELEMENT_TEMPLATES, getTemplatesByCategory, CATEGORY_LABELS, type ElementTemplate } from './toolbar/templates';

// Inspector
export { Inspector, type InspectorProps } from './inspector/Inspector';

// Utilities
export { getElementBounds, mergeBounds, isPointInBounds, type BoundingBox } from './utils/bounds';
export { computeSnap, type SnapGuide } from './utils/snap';
