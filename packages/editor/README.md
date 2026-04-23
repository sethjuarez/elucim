# @elucim/editor

> Visual canvas editor for Elucim animations — Figma-like design tool for the web.

[![npm version](https://img.shields.io/npm/v/@elucim/editor)](https://www.npmjs.com/package/@elucim/editor)
[![license](https://img.shields.io/npm/l/@elucim/editor)](https://github.com/sethjuarez/elucim/blob/main/LICENSE)

`@elucim/editor` is a drop-in React component that provides a full visual editing experience for [Elucim](https://www.npmjs.com/package/@elucim/core) animations — a floating toolbar, contextual inspector, animation timeline, zoom/pan canvas, and drag-and-drop element manipulation. Think Figma for animated math visualizations.

## Install

```bash
npm install @elucim/editor @elucim/core @elucim/dsl react react-dom
# or
pnpm add @elucim/editor @elucim/core @elucim/dsl react react-dom
```

**Peer dependencies:** React 18 or 19

## Quick Start

```tsx
import { ElucimEditor } from '@elucim/editor';

function App() {
  return <ElucimEditor style={{ width: '100vw', height: '100vh' }} />;
}
```

That's it — a full-featured visual editor in one component.

### With an Initial Document

```tsx
import { ElucimEditor } from '@elucim/editor';
import type { ElucimDocument } from '@elucim/dsl';

const myScene: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'player',
    width: 800,
    height: 600,
    fps: 60,
    durationInFrames: 300,
    background: '#0d0d1a',
    children: [
      { type: 'circle', cx: 400, cy: 300, r: 80, stroke: '#6c5ce7', strokeWidth: 3, fill: 'none' },
      { type: 'latex', expression: 'e^{i\\pi} + 1 = 0', x: 400, y: 300, fontSize: 24, color: '#fdcb6e' },
    ],
  },
};

function App() {
  return <ElucimEditor initialDocument={myScene} style={{ width: '100vw', height: '100vh' }} />;
}
```

## Features

### 🖼️ Canvas

- **Infinite canvas** with zoom (scroll or Ctrl+scroll) and pan (middle-click drag or Space+drag)
- **Dot grid** background with zoom-adaptive density
- **Minimap** for orientation in large scenes
- **Zoom controls** with zoom-to-fit
- Canvas itself is selectable — click empty space to edit scene properties (dimensions, background, FPS, duration)

### 🧰 Toolbar

Floating, draggable, collapsible tool panel with categorized element templates:

| Category | Elements |
|----------|----------|
| **Shapes** | Circle, Rectangle, Line, Arrow, Polygon, Bezier Curve |
| **Math** | Axes, Function Plot, Vector, Vector Field, Matrix, LaTeX |
| **Data** | Bar Chart, Graph |
| **Media** | Text, Image |
| **Layout** | Group |
| **Animation** | FadeIn, FadeOut, Draw, Write, Transform, Morph, Stagger, Parallel |
| **Structure** | Sequence |

Click any template to add it to the scene.

### 🔍 Inspector

Contextual property panel that auto-positions next to the selected element:

- **Element inspector** — edit any property of the selected element (position, size, colors, stroke, text content, math expressions, etc.)
- **Canvas inspector** — edit scene root properties (width, height, background, FPS, duration)
- **Pinnable** — pin the inspector to keep it in place, or let it float contextually
- **Draggable** — reposition anywhere on the canvas

### 🎬 Timeline

Premiere-style bottom panel for animation control:

- Play/pause with frame counter
- Scrub bar for seeking to any frame
- Frame-accurate playback at the scene's configured FPS

### ✋ Interactions

- **Click** to select elements — inspector appears contextually
- **Shift+click** to add/remove from multi-selection
- **Marquee select** — click and drag on empty canvas to lasso-select multiple elements
- **Drag** to move selected elements
- **Resize handles** on selection bounds
- **Rotation handle** with custom rotation cursor
- **Escape** deselects all, **Delete** removes selected elements
- **Ctrl+Z** / **Ctrl+Shift+Z** for undo/redo (50-level history)

### 📤 Import / Export

```tsx
import { exportToJson, importFromJson, downloadAsJson } from '@elucim/editor';

// Export current document
const json = exportToJson(editorState.document);

// Download as file
downloadAsJson(editorState.document, 'my-animation.json');

// Import from JSON
const doc = importFromJson(jsonString);
```

## Theming

The editor uses CSS custom properties for all UI chrome colors. Override any token via the `theme` prop:

```tsx
<ElucimEditor
  theme={{
    accent: '#e040fb',
    bg: '#1e1e2e',
    surface: '#181825',
    fg: '#cdd6f4',
    border: '#45475a',
  }}
/>
```

### Available Tokens

| Token | Default | Description |
|-------|---------|-------------|
| `accent` | `#4a9eff` | Primary accent (selection, highlights, buttons) |
| `bg` | `#1a1a2e` | Editor background |
| `surface` | `#12122a` | Deeper surface color |
| `panel` | `rgba(22,22,42,0.93)` | Floating panel background |
| `chrome` | `rgba(15,23,42,0.8)` | UI chrome (toolbar, timeline) |
| `fg` | `#e0e0e0` | Primary text |
| `text-secondary` | `#94a3b8` | Secondary text |
| `text-muted` | `#64748b` | Muted text |
| `text-disabled` | `#475569` | Disabled text |
| `border` | `#334155` | Borders |
| `border-subtle` | `#1e293b` | Subtle dividers |
| `input-bg` | `#0f172a` | Input field background |
| `success` | `#34d399` | Success indicators |
| `info` | `#4fc3f7` | Info indicators |
| `error` | `#f87171` | Error indicators |

Tokens accept bare names (`"accent"`) or full CSS variable names (`"--elucim-editor-accent"`).

### Programmatic Token Access

```tsx
import { v, buildThemeVars, EDITOR_TOKENS } from '@elucim/editor';

// Use in inline styles
const style = { color: v('--elucim-editor-accent') };
// → { color: 'var(--elucim-editor-accent, #4a9eff)' }

// Build a full theme override object
const vars = buildThemeVars({ accent: '#e040fb', bg: '#1e1e2e' });
// → { '--elucim-editor-accent': '#e040fb', '--elucim-editor-bg': '#1e1e2e', ... }
```

## State Management

The editor uses a reducer-based state model. Access it programmatically via context hooks:

```tsx
import { EditorProvider, useEditorState, useEditorDocument, useEditorSelection } from '@elucim/editor';

function MyCustomPanel() {
  const [state, dispatch] = useEditorState();
  const document = useEditorDocument();
  const selectedIds = useEditorSelection();

  return <div>Selected: {selectedIds.length} elements</div>;
}
```

### Canvas as Object

Click on empty canvas space to select the canvas itself. The inspector switches to show scene-level properties:

```tsx
import { CANVAS_ID } from '@elucim/editor';

// Check if canvas is selected
const isCanvasSelected = selectedIds.length === 1 && selectedIds[0] === CANVAS_ID;
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected elements |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+A` | Select all |
| `Escape` | Deselect all |
| `Space` (hold) | Pan mode |
| `Ctrl+Scroll` | Zoom in/out |
| `Ctrl+E` | Export to JSON |

## Error Recovery

The editor wraps its entire component tree in an error boundary. If a rendering error occurs (e.g., an invalid math expression), the editor shows a recovery UI instead of a blank screen. Click "Try again" to reset and continue editing.

## API Reference

### Components

| Export | Description |
|--------|-------------|
| `ElucimEditor` | Main editor component — all-in-one canvas + toolbar + inspector + timeline |
| `ElucimCanvas` | Standalone canvas with zoom/pan (used internally by ElucimEditor) |
| `Toolbar` | Element template palette |
| `Inspector` | Property editing panel |
| `Timeline` | Animation playback controls |
| `FloatingPanel` | Draggable floating container |
| `SelectionOverlay` | Selection boxes, handles, and resize/rotate UI |
| `DotGrid` | Zoom-adaptive dot grid background |
| `Minimap` | Canvas overview minimap |
| `ZoomControls` | Zoom buttons and zoom-to-fit |

### Hooks

| Export | Description |
|--------|-------------|
| `useEditorState()` | `[state, dispatch]` — full editor state and action dispatcher |
| `useEditorDocument()` | Current `ElucimDocument` |
| `useEditorSelection()` | Array of selected element IDs |
| `useViewport()` | Zoom/pan state and handlers |
| `useDrag()` | Element drag/resize/rotate interactions |
| `useMarquee()` | Lasso selection interactions |
| `useMeasuredBounds()` | DOM-based element bounds measurement |

### Utilities

| Export | Description |
|--------|-------------|
| `exportToJson(doc)` | Serialize document to JSON string |
| `importFromJson(json)` | Parse JSON string to document |
| `downloadAsJson(doc, filename)` | Trigger browser download |
| `getElementBounds(el)` | Compute bounding box for an element |
| `mergeBounds(boxes)` | Merge multiple bounding boxes |
| `isPointInBounds(pt, box)` | Hit test a point against a bounding box |
| `computeSnap(value, grid)` | Snap a value to a grid |
| `ELEMENT_TEMPLATES` | All available element templates |
| `getTemplatesByCategory()` | Templates grouped by category |
| `CATEGORY_LABELS` | Display labels for template categories |

## Related

- **[@elucim/core](https://www.npmjs.com/package/@elucim/core)** — The React rendering engine (peer dependency)
- **[@elucim/dsl](https://www.npmjs.com/package/@elucim/dsl)** — JSON/YAML DSL for declaring animations (peer dependency)
- **[Elucim Docs](https://elucim.com)** — Full documentation with live interactive examples

## License

[MIT](https://github.com/sethjuarez/elucim/blob/main/LICENSE)
