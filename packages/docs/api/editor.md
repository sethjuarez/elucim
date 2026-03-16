# Editor API

Full API reference for `@elucim/editor`.

## Components

### `ElucimEditor`

The main editor component — all-in-one canvas, toolbar, inspector, and timeline.

```ts
interface ElucimEditorProps {
  initialDocument?: ElucimDocument;
  theme?: Record<string, string>;
  className?: string;
  style?: React.CSSProperties;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialDocument` | `ElucimDocument` | Empty 800×600 scene | Starting scene document |
| `theme` | `Record<string, string>` | — | Token overrides (see [Theming](/guide/editor-theming)) |
| `className` | `string` | — | CSS class on root element |
| `style` | `CSSProperties` | — | Inline styles on root element |

### `EditorProvider`

Context provider wrapping the editor state. Used internally by `ElucimEditor`, but exported for custom editor layouts.

```ts
interface EditorProviderProps {
  initialDocument?: ElucimDocument;
  children: React.ReactNode;
}
```

### `ElucimCanvas`

The canvas rendering surface with zoom, pan, selection overlays, and dot grid.

### `Toolbar`

Floating panel with categorized element templates. Click a template to add it to the scene.

### `Inspector`

Contextual property editing panel. Shows element properties when an element is selected, or scene properties when the canvas is selected.

### `Timeline`

Bottom panel with play/pause, scrub bar, and frame counter.

### `FloatingPanel`

Draggable, floating container used by the toolbar and inspector. Can be used to build custom floating UI.

### `SelectionOverlay`

SVG overlay that renders selection boxes, resize handles, and rotation handles for selected elements.

### `DotGrid`

Zoom-adaptive dot grid background for the canvas.

### `Minimap`

Bird's-eye canvas overview showing the viewport position.

### `ZoomControls`

Zoom in/out buttons and zoom-to-fit.

## Hooks

### `useEditorState()`

Returns the full editor state and dispatch function.

```ts
function useEditorState(): [EditorState, React.Dispatch<EditorAction>];
```

```tsx
const [state, dispatch] = useEditorState();

// Read state
console.log(state.selectedIds);
console.log(state.viewport.zoom);
console.log(state.isPlaying);

// Dispatch actions
dispatch({ type: 'SELECT', ids: ['element-1'] });
dispatch({ type: 'UNDO' });
```

### `useEditorDocument()`

Returns the current `ElucimDocument`.

```ts
function useEditorDocument(): ElucimDocument;
```

### `useEditorSelection()`

Returns the array of selected element IDs.

```ts
function useEditorSelection(): string[];
```

### `useViewport()`

Zoom and pan state with handlers.

### `useDrag()`

Element drag, resize, and rotate interaction handlers.

### `useMarquee()`

Marquee (lasso) selection interaction handlers.

### `useMeasuredBounds()`

DOM-based element bounds measurement using `getBBox()`.

## State

### `EditorState`

```ts
interface EditorState {
  document: ElucimDocument;
  selectedIds: string[];
  viewport: { x: number; y: number; zoom: number };
  past: ElucimDocument[];      // undo stack
  future: ElucimDocument[];    // redo stack
  currentFrame: number;
  isPlaying: boolean;
  activeTool: EditorTool;
  isPanning: boolean;
  toolbarPosition: { x: number; y: number };
  inspectorPosition: { x: number; y: number } | null;
  inspectorPinned: boolean;
  toolbarCollapsed: boolean;
}
```

### `EditorTool`

```ts
type EditorTool = 'select' | 'rect' | 'circle' | 'line' | 'arrow' | 'text' | 'latex';
```

### `EditorAction`

All available dispatch actions:

| Action | Payload | Description |
|--------|---------|-------------|
| `SELECT` | `ids: string[]` | Replace selection |
| `SELECT_ADD` | `ids: string[]` | Add to selection |
| `SELECT_TOGGLE` | `ids: string[]` | Toggle selection |
| `DESELECT_ALL` | — | Clear selection |
| `SET_DOCUMENT` | `document: ElucimDocument` | Replace entire document |
| `UPDATE_ELEMENT` | `id: string, changes: object` | Update element properties |
| `UPDATE_CANVAS` | `changes: object` | Update scene root properties |
| `ADD_ELEMENT` | `element: object` | Add element to scene |
| `DELETE_ELEMENTS` | `ids: string[]` | Remove elements |
| `MOVE_ELEMENT` | `id: string, dx: number, dy: number` | Translate element |
| `RESIZE_ELEMENT` | `id: string, changes: object` | Resize element |
| `ROTATE_ELEMENT` | `id: string, rotation: number` | Rotate element |
| `SET_VIEWPORT` | `viewport: object` | Update zoom/pan |
| `SET_FRAME` | `frame: number` | Seek to frame |
| `SET_PLAYING` | `playing: boolean` | Play or pause |
| `SET_TOOL` | `tool: EditorTool` | Switch active tool |
| `ZOOM_TO_FIT` | — | Auto-fit canvas to viewport |
| `UNDO` | — | Undo last action |
| `REDO` | — | Redo last undone action |

### `CANVAS_ID`

Sentinel value (`'__canvas__'`) used when the canvas itself is selected:

```ts
import { CANVAS_ID } from '@elucim/editor';

const isCanvasSelected = selectedIds.includes(CANVAS_ID);
```

## Utilities

### `exportToJson(document)`

Serialize an `ElucimDocument` to a formatted JSON string.

```ts
function exportToJson(document: ElucimDocument): string;
```

### `importFromJson(json)`

Parse a JSON string into an `ElucimDocument`.

```ts
function importFromJson(json: string): ElucimDocument;
```

### `downloadAsJson(document, filename)`

Trigger a browser file download of the document as JSON.

```ts
function downloadAsJson(document: ElucimDocument, filename?: string): void;
```

### `getElementBounds(element)`

Compute the bounding box for a DSL element.

```ts
function getElementBounds(element: object): { x: number; y: number; width: number; height: number } | null;
```

### `mergeBounds(boxes)`

Merge multiple bounding boxes into one enclosing box.

```ts
function mergeBounds(boxes: Array<{ x: number; y: number; width: number; height: number }>):
  { x: number; y: number; width: number; height: number };
```

### `isPointInBounds(point, bounds)`

Hit-test a point against a bounding box.

```ts
function isPointInBounds(
  point: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number }
): boolean;
```

### `computeSnap(value, gridSize)`

Snap a value to the nearest grid increment.

```ts
function computeSnap(value: number, gridSize: number): number;
```

## Theming Utilities

### `v(token)`

Returns a CSS `var()` reference with fallback:

```ts
function v(token: string): string;
// v('--elucim-editor-accent') → 'var(--elucim-editor-accent, #4a9eff)'
```

### `buildThemeVars(overrides?)`

Merge theme overrides with defaults, returning a CSS variable object:

```ts
function buildThemeVars(overrides?: Record<string, string>): Record<string, string>;
```

### `makeRotateCursor(color?)`

Generate an SVG data-URL cursor string for rotation handles:

```ts
function makeRotateCursor(color?: string): string;
```

### `EDITOR_TOKENS`

The full token registry with default values:

```ts
const EDITOR_TOKENS: Record<string, string>;
// { '--elucim-editor-accent': '#4a9eff', '--elucim-editor-bg': '#1a1a2e', ... }
```

### `ROTATE_CURSOR`

Pre-built rotation cursor using the default accent color.

```ts
const ROTATE_CURSOR: string;
```

## Template Utilities

### `ELEMENT_TEMPLATES`

Array of all available element templates with metadata:

```ts
const ELEMENT_TEMPLATES: Array<{
  type: string;
  category: string;
  label: string;
  defaults: object;
}>;
```

### `getTemplatesByCategory()`

Returns templates grouped by category key:

```ts
function getTemplatesByCategory(): Record<string, typeof ELEMENT_TEMPLATES>;
```

### `CATEGORY_LABELS`

Display labels for template categories:

```ts
const CATEGORY_LABELS: Record<string, string>;
// { shapes: 'Shapes', math: 'Math', data: 'Data', ... }
```
