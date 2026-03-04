# Creating Visuals with Elucim

> A developer guide for building animated concept explanations.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Concepts](#core-concepts)
3. [Primitives Reference](#primitives-reference)
4. [Math Primitives](#math-primitives)
5. [New Primitives (Phase 4)](#new-primitives)
6. [Animation System](#animation-system)
7. [Easing Functions](#easing-functions)
8. [The Player Component](#the-player-component)
9. [Imperative Timeline DSL](#imperative-timeline-dsl)
10. [Video Export](#video-export)
11. [Presentation Mode](#presentation-mode)
12. [JSON DSL & Renderer](#json-dsl--renderer)
13. [DSL Builder API](#dsl-builder-api)
14. [Recipes & Patterns](#recipes--patterns)
15. [API Reference](#api-reference)

---

## Quick Start

### Installation

```bash
pnpm add @elucim/core react react-dom
```

### Your First Scene

```tsx
import { Player, Sequence, Circle, Text, FadeIn } from '@elucim/core';

function MyFirstScene() {
  return (
    <Player width={800} height={600} fps={60} durationInFrames={120}>
      <Sequence from={0} durationInFrames={60}>
        <FadeIn duration={30}>
          <Circle cx={400} cy={300} r={80} stroke="#6c5ce7" strokeWidth={3} />
        </FadeIn>
      </Sequence>
      <Sequence from={40} durationInFrames={80}>
        <FadeIn duration={20}>
          <Text x={400} y={300} fill="#fff" fontSize={32} textAnchor="middle">
            Hello World
          </Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}
```

This creates an 800×600 scene running at 60fps for 2 seconds. A circle fades in over the first 0.5s, then text appears starting at frame 40.

---

## Core Concepts

### Scene

The root container. Defines dimensions, frame rate, and total duration.

```tsx
<Scene
  width={1920}     // SVG viewport width (default: 1920)
  height={1080}    // SVG viewport height (default: 1080)
  fps={60}         // Frames per second (default: 60)
  durationInFrames={300}  // Total duration in frames (required)
  background="#111"       // Background color (default: '#000')
>
  {/* children */}
</Scene>
```

**Key points:**
- All children render inside an SVG element matching the Scene dimensions
- The Scene provides context (`useCurrentFrame()`, dimensions) to all descendants
- Frame numbering: 0 → `durationInFrames - 1`

### Sequence

A time-offset wrapper. Children see frame 0 at the Sequence's start time.

```tsx
<Sequence
  from={60}              // Start at parent frame 60
  durationInFrames={90}  // Run for 90 frames (optional, defaults to end of scene)
  name="intro"           // Debug name (optional)
>
  {/* Children see frame 0 when parent is at frame 60 */}
  {/* Children are unmounted before `from` and after `from + durationInFrames` */}
</Sequence>
```

**Key points:**
- Children are NOT rendered before `from` or after `from + durationInFrames`
- `useCurrentFrame()` inside a Sequence returns the **local** frame (0 at start)
- Sequences can be nested for complex timing hierarchies

### useCurrentFrame()

The fundamental hook. Returns the current frame number within the nearest Sequence (or Scene).

```tsx
function MyComponent() {
  const frame = useCurrentFrame();
  // frame is 0 at the start of the parent Sequence
  const x = 100 + frame * 2;
  return <circle cx={x} cy={100} r={10} fill="#fff" />;
}
```

### interpolate()

Maps a frame number through input/output ranges with easing.

```tsx
import { interpolate, easeOutCubic } from '@elucim/core';

function MovingDot() {
  const frame = useCurrentFrame();
  
  const x = interpolate(frame, [0, 60], [100, 700], { easing: easeOutCubic });
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  const scale = interpolate(frame, [0, 60, 90], [0.5, 1.2, 1.0]);
  
  return <circle cx={x} cy={200} r={10} fill="#fff" opacity={opacity} />;
}
```

**Signature:**
```ts
interpolate(
  frame: number,
  inputRange: number[],   // e.g., [0, 30, 60]
  outputRange: number[],  // e.g., [0, 1, 0.5] — must match inputRange length
  options?: {
    easing?: EasingFunction;       // Default: linear
    extrapolateLeft?: 'clamp' | 'extend';  // Default: 'clamp'
    extrapolateRight?: 'clamp' | 'extend'; // Default: 'clamp'
  }
): number
```

**Multi-segment interpolation** — use arrays with 3+ values:
```tsx
// Opacity: invisible → visible → invisible
const opacity = interpolate(frame, [0, 30, 60, 90], [0, 1, 1, 0]);
```

---

## Primitives Reference

All primitives are SVG elements with built-in animation support.

### Circle

```tsx
<Circle
  cx={400} cy={300}    // Center position
  r={80}               // Radius
  fill="none"          // Fill color (default: 'none')
  stroke="#6c5ce7"     // Stroke color (default: '#fff')
  strokeWidth={3}      // Stroke width (default: 2)
  fadeIn={30}          // Fade in over 30 frames
  draw={50}            // Draw stroke progressively over 50 frames
  easing={easeOutCubic}  // Easing for animations
/>
```

### Line

```tsx
<Line
  x1={100} y1={200}   // Start point
  x2={700} y2={200}   // End point
  stroke="#4ecdc4"
  strokeWidth={3}
  draw={40}            // Draw the line progressively
/>
```

### Arrow

```tsx
<Arrow
  x1={100} y1={300}   // Start point
  x2={600} y2={100}   // End point (arrowhead here)
  stroke="#ffe66d"
  headSize={14}        // Arrowhead size in pixels (default: 10)
  fadeIn={30}
/>
```

### Rect

```tsx
<Rect
  x={100} y={50}
  width={200} height={150}
  fill="rgba(255,107,107,0.2)"
  stroke="#ff6b6b"
  rx={8}               // Border radius
  draw={50}            // Draw stroke progressively
/>
```

### Text

```tsx
<Text
  x={400} y={300}
  fill="#a29bfe"
  fontSize={36}
  fontFamily="serif"
  textAnchor="middle"           // 'start' | 'middle' | 'end'
  dominantBaseline="middle"     // Vertical alignment
  fadeIn={30}
>
  Hello Elucim
</Text>
```

### Common Animation Props

All primitives accept:

| Prop | Type | Description |
|------|------|-------------|
| `fadeIn` | `number` | Fade in over N frames from opacity 0 → 1 |
| `fadeOut` | `number` | Fade out over N frames from opacity 1 → 0 |
| `draw` | `number` | Draw stroke progressively over N frames |
| `easing` | `EasingFunction` | Easing function for animations |
| `opacity` | `number` | Base opacity (multiplied with animation opacity) |

---

## Math Primitives

### Axes

Coordinate axes with ticks, labels, and optional grid.

```tsx
<Axes
  domain={[-5, 5]}     // X-axis range
  range={[-3, 3]}      // Y-axis range
  origin={[400, 300]}  // SVG position of (0,0)
  scale={60}           // Pixels per unit
  showGrid             // Show grid lines
  showTicks            // Show tick marks (default: true)
  showLabels           // Show numeric labels (default: true)
  tickStep={1}         // Spacing between ticks (default: 1)
  axisColor="#888"
  gridColor="#333"
  fadeIn={20}
/>
```

### FunctionPlot

Plot a continuous function on Axes coordinates.

```tsx
<FunctionPlot
  fn={Math.sin}              // (x: number) => number
  domain={[-5, 5]}           // X range to plot
  origin={[400, 300]}        // Must match Axes origin
  scale={60}                 // Must match Axes scale
  color="#ff6b6b"
  strokeWidth={3}
  samples={200}              // Number of sample points (default: 200)
  draw={60}                  // Draw curve progressively over 60 frames
/>
```

**Important:** `origin` and `scale` must match the Axes component for correct alignment.

### Vector

Mathematical vector arrow in Axes coordinate space.

```tsx
<Vector
  from={[0, 0]}           // Start point in math coords (default: origin)
  to={[3, 2]}             // End point in math coords
  origin={[400, 300]}     // Must match Axes
  scale={60}              // Must match Axes
  color="#ff6b6b"
  label="v₁"             // Optional label near the arrow tip
  labelOffset={[8, -8]}  // Label position offset in pixels
  fadeIn={20}
/>
```

### Matrix

Renders a matrix with brackets.

```tsx
<Matrix
  values={[
    [1, 0, 0],
    [0, 'cos θ', '-sin θ'],
    [0, 'sin θ', 'cos θ'],
  ]}
  x={150} y={60}        // Top-left SVG position
  cellSize={55}          // Size of each cell in pixels
  fontSize={18}
  color="#fff"
  bracketColor="#888"
  fadeIn={30}
/>
```

### Graph

Graph theory visualization with nodes and edges.

```tsx
import { Graph, type GraphNode, type GraphEdge } from '@elucim/core';

const nodes: GraphNode[] = [
  { id: 'A', x: 120, y: 100, label: 'A', color: '#ff6b6b' },
  { id: 'B', x: 300, y: 60,  label: 'B', color: '#4ecdc4' },
  { id: 'C', x: 480, y: 100, label: 'C', color: '#ffe66d' },
];

const edges: GraphEdge[] = [
  { from: 'A', to: 'B', directed: true, label: '4' },
  { from: 'B', to: 'C', directed: true, label: '2' },
];

<Graph
  nodes={nodes}
  edges={edges}
  nodeRadius={20}
  edgeColor="#666"
  fadeIn={40}
/>
```

---

## New Primitives

### LaTeX (KaTeX Rendering)

Render beautiful math equations using KaTeX, embedded in SVG via `foreignObject`.

**Setup**: Add KaTeX CSS to your HTML:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.33/dist/katex.min.css" />
```

```tsx
<LaTeX
  expression="E = mc^2"
  x={400} y={200}
  fontSize={32}
  color="#ff6b6b"
  fadeIn={30}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `expression` | `string` | — | LaTeX expression |
| `x`, `y` | `number` | — | Center position |
| `fontSize` | `number` | `24` | Font size |
| `color` | `string` | `'#e0e0e0'` | Text color |
| `width`, `height` | `number` | `400`, `100` | Container size |
| `fadeIn` | `number` | `0` | Fade-in frames |

### VectorField

Visualize 2D vector fields as grids of arrows.

```tsx
<VectorField
  fn={(x, y) => [-y, x]}  // Rotation field
  domain={[-4, 4]}
  range={[-3, 3]}
  origin={[400, 300]}
  scale={50}
  color="#4ecdc4"
  arrowScale={0.35}
  normalize
  fadeIn={30}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fn` | `(x, y) => [number, number]` | — | Vector field function |
| `normalize` | `boolean` | `false` | Normalize arrows to equal length |
| `arrowScale` | `number` | `0.3` | Arrow size scale |
| `spacing` | `number` | `1` | Grid spacing |

### Polygon

Closed polygon with draw animation.

```tsx
<Polygon
  points={[[100, 50], [50, 150], [150, 150]]}
  stroke="#4ecdc4"
  fill="rgba(78,205,196,0.15)"
  strokeWidth={3}
  draw={40}
/>
```

### BarChart

Vertical bar chart with labels, values, and animated reveal.

```tsx
<BarChart
  bars={[
    { label: 'Paris', value: 0.92, color: '#6c5ce7' },
    { label: 'Lyon', value: 0.03, color: '#a29bfe' },
    { label: 'the', value: 0.02, color: '#74b9ff' },
  ]}
  x={100} y={100}
  width={600} height={300}
  barColor="#6c5ce7"
  labelColor="#ccc"
  showValues
  valueFormat="percent"
  maxValue={1}
  gap={0.3}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `bars` | `{ label, value, color? }[]` | — | Bar definitions |
| `x`, `y` | `number` | — | Top-left position |
| `width`, `height` | `number` | — | Chart dimensions |
| `barColor` | `string` | `'#6c5ce7'` | Default bar fill color |
| `labelColor` | `string` | `'#ccc'` | Label text color |
| `showValues` | `boolean` | `true` | Show value labels above bars |
| `valueFormat` | `'number' \| 'percent'` | `'number'` | Value display format |
| `maxValue` | `number` | auto | Maximum value for scaling |
| `gap` | `number` | `0.2` | Gap between bars (0–1 ratio) |

### Dashed Lines

Line, Arrow, and Rect support dashed strokes via `strokeDasharray`:

```tsx
<Line x1={100} y1={200} x2={500} y2={200} stroke="#888" strokeDasharray="6 3" />
<Arrow x1={100} y1={300} x2={500} y2={300} stroke="#ff6b6b" strokeDasharray="8 4" />
<Rect x={200} y={350} width={200} height={100} stroke="#4ecdc4" strokeDasharray="5 5" />
```

> **Note**: When a `draw` animation is active, its `strokeDasharray` takes precedence; the user-provided dasharray applies once the draw completes.

---

## Video Export

Export animations as WebM/MP4 video files directly from the browser.

### Using the useExport Hook

```tsx
import { useExport } from '@elucim/core';

function ExportButton({ svgRef, setFrame }) {
  const { isExporting, progress, startExport, cancel } = useExport();

  return isExporting ? (
    <div>
      <progress value={progress} max={1} />
      <button onClick={cancel}>Cancel</button>
    </div>
  ) : (
    <button onClick={() => startExport(svgRef.current, setFrame, {
      totalFrames: 180, fps: 60, width: 1920, height: 1080
    })}>
      Export Video
    </button>
  );
}
```

### Low-Level API

```tsx
import { exportAnimation } from '@elucim/core';

await exportAnimation(svgElement, (frame) => setFrame(frame), {
  totalFrames: 180,
  fps: 60,
  width: 1920,
  height: 1080,
  format: 'webm',  // or 'mp4'
  onProgress: (frame, total) => console.log(`${frame}/${total}`),
});
```

---

## Animation System

### Wrapper Animations

These components wrap children and apply animations declaratively.

#### FadeIn

```tsx
<Sequence from={0} durationInFrames={60}>
  <FadeIn duration={30} easing={easeOutCubic}>
    <Circle cx={200} cy={200} r={50} fill="#6c5ce7" />
  </FadeIn>
</Sequence>
```

#### FadeOut

```tsx
<Sequence from={60} durationInFrames={60}>
  <FadeOut duration={30}>
    <Circle cx={200} cy={200} r={50} fill="#ff6b6b" />
  </FadeOut>
</Sequence>
```

#### Write

Opacity + scale animation ideal for text reveal.

```tsx
<Write duration={45} easing={easeInOutQuad}>
  <Text x={400} y={200} fill="#4ecdc4" fontSize={48} textAnchor="middle">
    E = mc²
  </Text>
</Write>
```

#### Transform

Animate translate, rotate, scale, and opacity simultaneously.

```tsx
<Transform
  duration={100}
  translate={{ from: [100, 150], to: [600, 150] }}
  rotate={{ from: 0, to: 360 }}
  scale={{ from: 0.5, to: 1.5 }}
  opacity={{ from: 0.3, to: 1 }}
  easing={easeInOutCubic}
>
  <Rect x={-30} y={-30} width={60} height={60} fill="#ffe66d" />
</Transform>
```

#### Morph

Transition color, opacity, and scale between two states.

```tsx
<Morph
  duration={100}
  fromColor="#ff6b6b"
  toColor="#4ecdc4"
  fromScale={0.8}
  toScale={1.2}
  fromOpacity={0.5}
  toOpacity={1}
>
  <circle r={50} fill="currentColor" />
</Morph>
```

#### Stagger

Reveal children one at a time with a delay between each.

```tsx
<Stagger staggerDelay={12}>
  <Circle cx={100} cy={100} r={30} fill="#ff6b6b" />
  <Circle cx={200} cy={100} r={30} fill="#4ecdc4" />
  <Circle cx={300} cy={100} r={30} fill="#ffe66d" />
  <Circle cx={400} cy={100} r={30} fill="#a29bfe" />
</Stagger>
```

---

## Easing Functions

Import easing functions to control animation curves:

```tsx
import {
  linear,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInBack, easeOutBack,
  easeOutElastic,
  easeOutBounce,
  spring,
  cubicBezier,
} from '@elucim/core';
```

### Custom Easing

```tsx
// Spring with custom parameters
const mySpring = spring({ stiffness: 200, damping: 15, mass: 1 });

// CSS cubic-bezier equivalent
const myBezier = cubicBezier(0.25, 0.1, 0.25, 1);

// Completely custom
const myEasing = (t: number) => t * t * (3 - 2 * t); // smoothstep
```

### Which Easing to Use

| Easing | Best for |
|--------|----------|
| `easeOutCubic` | Entrance animations, things appearing |
| `easeInOutQuad` | Movement, transitions between states |
| `easeInOutCubic` | Smooth transforms |
| `easeOutBounce` | Playful, attention-grabbing |
| `easeOutElastic` | Springy overshoot effects |
| `spring()` | Natural physics-based motion |
| `linear` | Continuous motion, clock-like progress |

---

## The Player Component

The Player wraps a Scene with interactive controls.

```tsx
<Player
  width={800}
  height={600}
  fps={60}
  durationInFrames={300}
  background="#111127"
  controls={true}      // Show control bar (default: true)
  loop={true}          // Loop playback (default: true)
  autoPlay={false}     // Auto-play on mount (default: false)
>
  {/* Scene content */}
</Player>
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `→` | Step forward 1 frame |
| `←` | Step backward 1 frame |
| `Home` | Go to first frame |
| `End` | Go to last frame |

**Note:** The Player must be focused (click on it first) for keyboard shortcuts to work.

### Scrub Bar

Click or drag on the scrub bar to seek to any frame. The Player shows:
- Current time in seconds
- Total duration
- Current frame number

---

## Imperative Timeline DSL

For authors who prefer sequential thinking, the Timeline class provides a Manim-style API.

```tsx
import { Timeline } from '@elucim/core';

const timeline = new Timeline(60); // 60 fps

// Sequential animations (each starts after the previous)
timeline.play('fadeIn', 'axes', { runTime: 0.5 });
timeline.play('draw', 'sinCurve', { runTime: 2 });
timeline.wait(0.5);
timeline.play('write', 'label', { runTime: 1 });

// Parallel animations (starts at current cursor without advancing it)
timeline.add('fadeIn', 'highlight', { runTime: 0.5 });
timeline.play('fadeIn', 'annotation', { runTime: 0.5 });

// Compile to frame data
const { actions, totalFrames } = timeline.compile();
// actions: TimelineAction[] — each with startFrame, durationFrames, type, easing
// totalFrames: number — total scene duration needed
```

### Methods

| Method | Description |
|--------|-------------|
| `play(type, id, opts?)` | Add animation and advance cursor |
| `add(type, id, opts?)` | Add animation WITHOUT advancing cursor (parallel) |
| `wait(seconds)` | Pause timeline for duration |
| `compile()` | Returns `{ actions, totalFrames }` |

---

## Presentation Mode

Build slide-based presentations with animated content, transitions, and keyboard navigation.

### Basic Usage

```tsx
import { Presentation, Slide, Scene, Player, Circle, FadeIn } from '@elucim/core';

function MyPresentation() {
  return (
    <Presentation
      transition="fade"
      transitionDuration={500}
      showHud
      showNotes
    >
      <Slide title="Introduction" notes="Welcome the audience">
        <h1>Welcome to My Talk</h1>
      </Slide>

      <Slide title="Demo" notes="Show the circle animation">
        <Player width={800} height={450} fps={30} durationInFrames={90}>
          <Scene>
            <FadeIn startFrame={0} durationInFrames={60}>
              <Circle cx={400} cy={225} r={100} fill="#3b82f6" />
            </FadeIn>
          </Scene>
        </Player>
      </Slide>

      <Slide title="Thanks">
        <h1>Thank You!</h1>
      </Slide>
    </Presentation>
  );
}
```

### Presentation Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `transition` | `TransitionType` | `'none'` | Slide transition effect |
| `transitionDuration` | `number` | `400` | Transition duration in ms |
| `showHud` | `boolean` | `true` | Show title, dots, counter overlay |
| `showNotes` | `boolean` | `false` | Show presenter notes panel |
| `children` | `ReactNode` | — | `<Slide>` components |

### Slide Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Slide title (shown in HUD) |
| `notes` | `string` | — | Presenter notes text |
| `children` | `ReactNode` | — | Slide content |

### Transition Types

- `'none'` — Instant switch
- `'fade'` — Cross-fade between slides
- `'slide-left'` — Slide left/right
- `'slide-up'` — Slide up/down
- `'zoom'` — Zoom in/out

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` / `Space` / `PageDown` | Next slide |
| `←` / `PageUp` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |
| `F` / `F11` | Toggle fullscreen |
| `G` | Go to slide (number prompt) |

### Click Navigation

- Click **right half** of slide → Next slide
- Click **left half** of slide → Previous slide
- Interactive elements (buttons, inputs) are not intercepted

### Accessing Slide Context

```tsx
import { usePresentationContext } from '@elucim/core';

function SlideContent() {
  const { currentSlide, totalSlides, goTo } = usePresentationContext();
  return <p>Slide {currentSlide + 1} of {totalSlides}</p>;
}
```

---

## JSON DSL & Renderer

The `@elucim/dsl` package lets you define visuals as JSON documents instead of writing JSX. This is ideal for AI agents, code generation, and data-driven content.

### Installation

```bash
pnpm add @elucim/dsl @elucim/core react react-dom
```

### Basic JSON Structure

An `ElucimDocument` is a JSON object with `width`, `height`, `fps`, `durationInFrames`, and a `children` array of element nodes:

```json
{
  "width": 800,
  "height": 600,
  "fps": 30,
  "durationInFrames": 90,
  "children": [
    {
      "type": "circle",
      "cx": 400, "cy": 300, "r": 60,
      "stroke": "#6c5ce7", "strokeWidth": 3,
      "fadeIn": 20
    },
    {
      "type": "sequence", "from": 30,
      "children": [{
        "type": "text",
        "x": 400, "y": 300,
        "content": "Hello DSL",
        "fontSize": 28,
        "fill": "#fff",
        "textAnchor": "middle"
      }]
    }
  ]
}
```

### Rendering

```tsx
import { DslRenderer, validate } from '@elucim/dsl';
import myDoc from './my-document.json';

function MyDslScene() {
  const errors = validate(myDoc);
  if (errors.length > 0) return <pre>{errors.join('\n')}</pre>;
  return <DslRenderer document={myDoc} />;
}
```

### Supported Node Types

| Type | Description | Key Props |
|------|-------------|-----------|
| `circle` | SVG circle | `cx`, `cy`, `r`, `fill`, `stroke` |
| `line` | SVG line | `x1`, `y1`, `x2`, `y2`, `stroke`, `strokeDasharray` |
| `arrow` | Line with arrowhead | `x1`, `y1`, `x2`, `y2`, `stroke`, `headSize`, `strokeDasharray` |
| `rect` | SVG rectangle | `x`, `y`, `width`, `height`, `fill`, `stroke`, `rx`, `strokeDasharray` |
| `polygon` | Closed polygon | `points`, `fill`, `stroke` |
| `text` | SVG text | `x`, `y`, `content`, `fontSize`, `fill`, `textAnchor` |
| `latex` | KaTeX expression | `expression`, `x`, `y`, `fontSize`, `color`, `align` |
| `axes` | Coordinate axes | `origin`, `xRange`, `yRange`, `scale` |
| `functionPlot` | Function curve | `fn` (string), `domain`, `color` |
| `vector` | Math vector | `from`, `to`, `color`, `label` |
| `vectorField` | Vector field grid | `fn` (string), `domain`, `range` |
| `matrix` | Matrix with brackets | `values`, `cellSize`, `color` |
| `graph` | Node-edge graph | `nodes[]`, `edges[]`, `nodeColor`, `edgeColor` |
| `barChart` | Vertical bar chart | `bars[]`, `x`, `y`, `width`, `height`, `valueFormat` |
| `sequence` | Timed sequence | `from`, `durationInFrames`, `children` |
| `group` | Grouping | `children` |
| `fadeIn` | Fade-in wrapper | `duration`, `children` |
| `fadeOut` | Fade-out wrapper | `duration`, `children` |
| `draw` | Stroke draw animation | `duration`, `children` |
| `write` | Write animation | `duration`, `children` |
| `transform` | Transform animation | `from`, `to`, `duration`, `children` |
| `morph` | Morph animation | `from`, `to`, `duration`, `children` |
| `stagger` | Staggered reveal | `staggerDelay`, `children` |
| `parallel` | Concurrent group | `children` |
| `player` | Nested Player | `width`, `height`, `fps`, `durationInFrames`, `children` |
| `scene` | Named scene | `name`, `children` |

### Presentations (Multi-slide)

Wrap slides in a `presentation` node:

```json
{
  "type": "presentation",
  "title": "My Presentation",
  "children": [
    {
      "type": "slide",
      "title": "Introduction",
      "notes": "Speaker notes here",
      "children": [{
        "type": "player",
        "width": 900, "height": 640,
        "fps": 30, "durationInFrames": 150,
        "autoPlay": true, "loop": false,
        "children": [
          { "type": "text", "x": 450, "y": 100, "content": "Hello!", "fontSize": 32, "fill": "#fff" }
        ]
      }]
    }
  ]
}
```

### Validation

Always validate before rendering:

```ts
import { validate } from '@elucim/dsl';

const errors = validate(document);
// Returns string[] — empty = valid
```

---

## DSL Builder API

Writing complex JSON by hand is tedious. The **Builder API** provides a fluent TypeScript interface that generates valid `ElucimDocument` JSON automatically.

### Quick Start

```ts
import { presentation, darkTheme } from '@elucim/dsl';

const doc = presentation('My Presentation', darkTheme)
  .slide('Title Slide', s => {
    s.title('Welcome to Elucim')
     .subtitle('Animated explanations for the web')
     .latex('E = mc^2', { y: 300, fontSize: 36 });
  })
  .slide('Demo', s => {
    s.title('Key Concepts')
     .wait(10)
     .boxRow(['Step 1', 'Step 2', 'Step 3'], { y: 200 })
     .wait(15)
     .text('Each step builds on the last', { x: 450, y: 400, fontSize: 16 });
  })
  .build();

// doc is a valid ElucimDocument — write to file or render directly
import fs from 'fs';
fs.writeFileSync('output.json', JSON.stringify(doc, null, 2));
```

### Running a Builder Script

```bash
npx tsx my-presentation.ts
```

### Themes

Two built-in themes:

```ts
import { darkTheme, lightTheme } from '@elucim/dsl';
```

Theme properties:

| Property | Description |
|----------|-------------|
| `background` | Slide background color |
| `title` | Title text color |
| `subtitle` | Subtitle text color |
| `primary` | Primary accent (arrows, highlights) |
| `secondary` | Secondary accent |
| `tertiary` | Third accent |
| `muted` | De-emphasized elements |
| `text` | Default text color |
| `boxFill` | Box/rectangle fill |
| `boxStroke` | Box/rectangle stroke |
| `success` / `warning` / `error` | Semantic colors |
| `palette[0-7]` | 8 distinct colors for variety |

### PresentationBuilder

```ts
const doc = presentation('Title', theme)
  .slide('Slide Name', (s: SlideBuilder) => { /* build slide */ })
  .slide('Next Slide', s => { /* ... */ })
  .build();  // returns ElucimDocument
```

### SlideBuilder Methods

#### Positioning & Timing

| Method | Description |
|--------|-------------|
| `s.wait(frames)` | Advance cursor by N frames (delays next element) |
| `s.at(frame)` | Set cursor to an absolute frame number |
| `s.frame` | Read the current cursor position |
| `s.cx` / `s.cy` | Canvas center coordinates |
| `s.width` / `s.height` | Canvas dimensions |
| `s.fps` | Frames per second |

#### High-Level Helpers

```ts
// Title & subtitle (auto-centered)
s.title('Main Title', { fontSize: 32, color: '#fff' })
 .subtitle('Supporting text');

// LaTeX equation
s.latex('\\int_0^1 f(x)\\,dx', { x: 450, y: 200, fontSize: 28 });

// Text at a position
s.text('Annotation', { x: 300, y: 400, fontSize: 14, color: '#aaa' });
```

#### Shapes & Lines

```ts
s.rect(100, 200, 300, 80, { fill: '#1a1a2e', stroke: '#6c5ce7', dashed: true })
 .circle(450, 300, 40, { fill: 'none', stroke: '#ff6b6b' })
 .arrow(200, 300, 400, 300, { color: '#4ecdc4', headSize: 8, dashed: true })
 .line(100, 500, 700, 500, { color: '#888', dashed: true });
```

#### Bar Chart

```ts
s.barChart(
  [
    { label: 'Paris', value: 0.92, color: '#6c5ce7' },
    { label: 'Lyon', value: 0.03, color: '#a29bfe' },
    { label: 'the', value: 0.02, color: '#74b9ff' },
  ],
  { x: 150, y: 300, width: 600, height: 200, valueFormat: 'percent', maxValue: 1 }
);
```

#### Graph (Nodes & Edges)

```ts
s.graph(
  [
    { id: 'a', x: 200, y: 300, label: 'User', color: '#6c5ce7' },
    { id: 'b', x: 500, y: 300, label: 'LLM', color: '#ff6b6b' },
    { id: 'c', x: 700, y: 300, label: 'Tools', color: '#4ecdc4' },
  ],
  [
    { from: 'a', to: 'b', label: 'query', directed: true },
    { from: 'b', to: 'c', label: 'tool call', directed: true },
    { from: 'c', to: 'b', label: 'result', directed: true, color: '#ffd93d' },
  ]
);
```

#### Matrix

```ts
s.matrix(
  [[1, 0, 0], [0, 'cos θ', '-sin θ'], [0, 'sin θ', 'cos θ']],
  { x: 450, y: 300, cellSize: 50 }
);
```

#### Layout Helpers

**boxRow** — Horizontal row of labeled boxes with staggered reveal:

```ts
const positions = s.boxRow(
  ['Input', 'Process', 'Output'],
  { y: 250, boxWidth: 120, boxHeight: 50, gap: 20, colors: ['#6c5ce7', '#a29bfe', '#74b9ff'] }
);
// positions = [{ x, y, w, h, cx, cy }, ...]
```

**boxColumn** — Vertical stack of labeled boxes:

```ts
const layers = s.boxColumn(
  ['Embedding', 'Attention', 'FFN', 'LayerNorm'],
  { x: 450, y: 150, boxWidth: 200, boxHeight: 40 }
);
```

**connectDown** — Draw arrows between sequential positions:

```ts
s.connectDown(layers, { color: '#6c5ce7' });
```

#### Raw Element Insertion

```ts
// Add any ElementNode at the current cursor
s.add({ type: 'circle', cx: 100, cy: 100, r: 20, fill: '#ff0000' });

// Add at a specific frame (doesn't move cursor)
s.addAt(30, { type: 'text', x: 200, y: 200, content: 'Appears at frame 30', fill: '#fff' });
```

### Advance Control

Every method accepts an `advance` option to control how many frames the cursor moves:

```ts
// These two labels appear nearly simultaneously (only 2 frames apart)
s.text('Label A', { x: 100, y: 200, advance: 2 })
 .text('Label B', { x: 300, y: 200, advance: 2 });

// This pause adds breathing room
s.wait(20);
```

### Complete Example

See `packages/dsl/examples/build-agentic-loop.ts` for a full 12-slide presentation built with the Builder API, covering LLM concepts from tokenization to the agentic loop.

```bash
# Generate the JSON
npx tsx packages/dsl/examples/build-agentic-loop.ts

# The generated JSON can be rendered by DslRenderer
```

---

## Recipes & Patterns

### Animated Function Plot

```tsx
<Player width={800} height={600} fps={60} durationInFrames={180}>
  <Sequence from={0} durationInFrames={180}>
    <Axes domain={[-5, 5]} range={[-2, 2]} origin={[400, 300]} scale={60} showGrid fadeIn={20} />
  </Sequence>
  <Sequence from={20} durationInFrames={100}>
    <FunctionPlot fn={Math.sin} domain={[-5, 5]} origin={[400, 300]} scale={60} color="#ff6b6b" draw={60} />
  </Sequence>
  <Sequence from={80} durationInFrames={100}>
    <FadeIn duration={20}>
      <Text x={650} y={200} fill="#ff6b6b" fontSize={18}>sin(x)</Text>
    </FadeIn>
  </Sequence>
</Player>
```

### Animated Tangent Line

```tsx
function AnimatedTangent() {
  const frame = useCurrentFrame();
  const ox = 400, oy = 300, s = 60;

  // Move point along x from -3 to 3
  const x = interpolate(frame, [0, 180], [-3, 3], { easing: easeInOutQuad });
  const y = Math.sin(x);
  const slope = Math.cos(x); // derivative of sin(x)

  // Draw tangent line ±1 unit around the point
  const tx1 = ox + (x - 1) * s;
  const ty1 = oy - (y - slope) * s;
  const tx2 = ox + (x + 1) * s;
  const ty2 = oy - (y + slope) * s;

  return (
    <g>
      <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#4ecdc4" strokeWidth={2} />
      <circle cx={ox + x * s} cy={oy - y * s} r={5} fill="#ffe66d" />
    </g>
  );
}
```

### Vector Addition

```tsx
<Player width={600} height={500} fps={60} durationInFrames={120}>
  <Axes domain={[-4, 4]} range={[-4, 4]} origin={[300, 250]} scale={50} showGrid />
  <Sequence from={10} durationInFrames={110}>
    <Vector to={[3, 2]} origin={[300, 250]} scale={50} color="#ff6b6b" label="v₁" fadeIn={20} />
  </Sequence>
  <Sequence from={30} durationInFrames={90}>
    <Vector to={[-2, 3]} origin={[300, 250]} scale={50} color="#4ecdc4" label="v₂" fadeIn={20} />
  </Sequence>
  <Sequence from={50} durationInFrames={70}>
    <Vector to={[1, 5]} origin={[300, 250]} scale={50} color="#ffe66d" label="v₁+v₂" fadeIn={20} />
  </Sequence>
</Player>
```

### Staggered Introduction

```tsx
<Sequence from={0} durationInFrames={120}>
  <Stagger staggerDelay={15}>
    <Circle cx={100} cy={200} r={40} fill="#ff6b6b" />
    <Circle cx={250} cy={200} r={40} fill="#4ecdc4" />
    <Circle cx={400} cy={200} r={40} fill="#ffe66d" />
    <Circle cx={550} cy={200} r={40} fill="#a29bfe" />
  </Stagger>
</Sequence>
```

### Complex Scene Composition

```tsx
function MyExplanation() {
  return (
    <Player width={1280} height={720} fps={60} durationInFrames={600}>
      {/* Part 1: Introduce the problem */}
      <Sequence from={0} durationInFrames={120}>
        <FadeIn duration={30}>
          <Text x={640} y={100} fill="#fff" fontSize={36} textAnchor="middle">
            The Pythagorean Theorem
          </Text>
        </FadeIn>
      </Sequence>

      {/* Part 2: Draw the triangle */}
      <Sequence from={60} durationInFrames={180}>
        <Line x1={200} y1={500} x2={600} y2={500} stroke="#ff6b6b" draw={40} />
        <Sequence from={40}>
          <Line x1={600} y1={500} x2={600} y2={200} stroke="#4ecdc4" draw={40} />
        </Sequence>
        <Sequence from={80}>
          <Line x1={600} y1={200} x2={200} y2={500} stroke="#ffe66d" draw={40} />
        </Sequence>
      </Sequence>

      {/* Part 3: Show the equation */}
      <Sequence from={300} durationInFrames={120}>
        <Write duration={60}>
          <Text x={640} y={600} fill="#fff" fontSize={48} textAnchor="middle" fontFamily="serif">
            a² + b² = c²
          </Text>
        </Write>
      </Sequence>
    </Player>
  );
}
```

---

## API Reference

### Components

| Component | Description |
|-----------|-------------|
| `<Scene>` | Root composition with dimensions, fps, duration |
| `<Sequence>` | Time-offset wrapper (from, durationInFrames) |
| `<Player>` | Interactive viewer with controls |

### Primitives

| Primitive | Description |
|-----------|-------------|
| `<Circle>` | SVG circle with cx, cy, r |
| `<Line>` | SVG line with x1, y1, x2, y2 |
| `<Arrow>` | Line with arrowhead |
| `<Rect>` | SVG rectangle |
| `<Text>` | SVG text element |

### Math Primitives

| Primitive | Description |
|-----------|-------------|
| `<Axes>` | 2D coordinate axes with ticks, labels, grid |
| `<FunctionPlot>` | Plot a continuous function |
| `<Vector>` | Mathematical vector arrow with label |
| `<Matrix>` | Matrix with brackets and entries |
| `<Graph>` | Nodes and edges graph visualization |
| `<BarChart>` | Vertical bar chart with labels and values |
| `<LaTeX>` | KaTeX math expression rendering |
| `<VectorField>` | 2D vector field visualization |
| `<Polygon>` | Closed polygon with draw animation |

### Animation Wrappers

| Component | Description |
|-----------|-------------|
| `<FadeIn>` | Opacity 0 → 1 over duration |
| `<FadeOut>` | Opacity 1 → 0 over duration |
| `<Write>` | Opacity + scale reveal (for text) |
| `<Draw>` | Progressive stroke via strokeDashoffset |
| `<Transform>` | Animate translate, rotate, scale, opacity |
| `<Morph>` | Color lerp, scale, opacity transition |
| `<Stagger>` | Sequential delayed appearance of children |
| `<Parallel>` | Semantic grouping for concurrent animations |

### Hooks

| Hook | Description |
|------|-------------|
| `useCurrentFrame()` | Current frame number (0-based) |
| `useElucimContext()` | Full context: frame, fps, duration, width, height |
| `interpolate()` | Map frame through input/output ranges with easing |

### Timeline (Imperative)

| Method | Description |
|--------|-------------|
| `new Timeline(fps)` | Create timeline builder |
| `.play(type, id, opts?)` | Sequential animation |
| `.add(type, id, opts?)` | Parallel animation |
| `.wait(seconds)` | Pause |
| `.compile()` | Returns `{ actions, totalFrames }` |
