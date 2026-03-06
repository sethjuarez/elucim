# @elucim/dsl

> Declarative JSON DSL for animated visualizations — perfect for AI agents.

[![npm version](https://img.shields.io/npm/v/@elucim/dsl)](https://www.npmjs.com/package/@elucim/dsl)
[![license](https://img.shields.io/npm/l/@elucim/dsl)](https://github.com/sethjuarez/elucim/blob/main/LICENSE)

`@elucim/dsl` lets you describe animated diagrams as JSON documents. An AI agent (or any code) produces a JSON object conforming to the schema, and the `<DslRenderer>` component renders it as a fully interactive [Elucim](https://www.npmjs.com/package/@elucim/core) visualization — no React knowledge required.

## Install

```bash
npm install @elucim/dsl @elucim/core react react-dom
# or
pnpm add @elucim/dsl @elucim/core react react-dom
```

## Quick Start

```tsx
import { DslRenderer } from '@elucim/dsl';
import type { ElucimDocument } from '@elucim/dsl';

const myDiagram: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'player',
    width: 800,
    height: 600,
    fps: 30,
    durationInFrames: 90,
    background: '#0d0d1a',
    children: [
      {
        type: 'circle',
        cx: 400,
        cy: 300,
        r: 100,
        stroke: '#3b82f6',
        strokeWidth: 3,
        draw: 60,
      },
    ],
  },
};

function App() {
  return <DslRenderer dsl={myDiagram} />;
}
```

## API

### `<DslRenderer dsl={doc} />`

Validates the DSL document and renders it as React components. If validation fails, displays error messages.

**Props:**
- `dsl: ElucimDocument` — The DSL document to render
- `className?: string` — CSS class for the wrapper div
- `style?: CSSProperties` — Inline styles for the wrapper div

### `validate(doc: unknown): ValidationResult`

Validates a DSL document without rendering it.

```ts
import { validate } from '@elucim/dsl';

const result = validate(myDoc);
if (!result.valid) {
  console.log(result.errors);
  // [{ path: 'root.children[0].cx', message: 'Required numeric field "cx"...', severity: 'error' }]
}
```

### `compileExpression(expr: string)`

Compile a math expression string into a callable function.

```ts
import { compileExpression } from '@elucim/dsl';

const fn = compileExpression('sin(x) * 2');
fn({ x: Math.PI / 2 }); // → 2
```

### `compileVectorExpression(expr: string)`

Compile a vector field expression returning `[number, number]`.

```ts
import { compileVectorExpression } from '@elucim/dsl';

const fn = compileVectorExpression('[-y, x]');
fn({ x: 1, y: 2 }); // → [-2, 1]
```

## Document Schema

Every document has this structure:

```json
{
  "version": "1.0",
  "root": { "type": "scene|player|presentation", ... }
}
```

### Root Types

| Type | Description |
|------|-------------|
| `scene` | Raw SVG scene (needs external frame control) |
| `player` | Interactive player with controls, scrub bar, play/pause |
| `presentation` | Slide-based presentation with transitions |

### Element Types

#### Primitives
| Type | Required Props | Description |
|------|---------------|-------------|
| `circle` | `cx`, `cy`, `r` | SVG circle |
| `line` | `x1`, `y1`, `x2`, `y2` | SVG line |
| `arrow` | `x1`, `y1`, `x2`, `y2` | Line with arrowhead |
| `rect` | `x`, `y`, `width`, `height` | Rectangle |
| `polygon` | `points` (array of [x,y]) | Polygon/polyline |
| `text` | `x`, `y`, `content` | Text element |
| `image` | `src`, `x`, `y`, `width`, `height` | Embed external images (PNG, SVG, etc.) |
| `barChart` | `bars` | Animated bar chart with labels and colors |

#### Math Visualizations
| Type | Required Props | Description |
|------|---------------|-------------|
| `axes` | — | Coordinate axes with grid/ticks |
| `functionPlot` | `fn` (expression) | Plot a function like `"sin(x)"` |
| `vector` | `to` ([x,y]) | Mathematical vector with label |
| `vectorField` | `fn` (vector expr) | Grid of arrows like `"[-y, x]"` |
| `matrix` | `values` (2D array) | Matrix with brackets |
| `graph` | `nodes`, `edges` | Graph theory visualization |
| `latex` | `expression`, `x`, `y` | LaTeX rendered via KaTeX |

#### Animation Wrappers
| Type | Key Props | Description |
|------|----------|-------------|
| `fadeIn` | `duration`, `easing` | Fade children in |
| `fadeOut` | `duration`, `easing` | Fade children out |
| `draw` | `duration`, `easing` | Progressive stroke drawing |
| `write` | `duration`, `easing` | Stroke draw + fill fade |
| `transform` | `translate`, `scale`, `rotate`, `opacity` | Animate position/scale/rotation |
| `morph` | `fromColor`, `toColor`, `fromScale`, `toScale` | Color/scale morphing |
| `stagger` | `staggerDelay` | Sequential delayed children |
| `parallel` | — | Children animate simultaneously |

#### Structural
| Type | Key Props | Description |
|------|----------|-------------|
| `sequence` | `from`, `durationInFrames` | Time-offset wrapper |
| `group` | `children` | Logical grouping with shared transforms (rotation, scale, translate) and zIndex sorting of children |

### Inline Animation Props

All primitives support these optional animation props directly:
- `fadeIn?: number` — Fade in over N frames
- `fadeOut?: number` — Fade out over N frames
- `draw?: number` — Progressive stroke draw over N frames
- `easing?: string | { type, ... }` — Easing function

### Spatial Transform Props

All primitives and groups support these optional spatial transform props:
- `rotation?: number` — Rotate element in degrees
- `rotationOrigin?: [number, number]` — Center of rotation [cx, cy]
- `scale?: number` — Uniform scale factor
- `translate?: [number, number]` — Offset [dx, dy]
- `zIndex?: number` — Stacking order (higher renders on top)

### Easing

**Named easings:** `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeInQuart`, `easeOutQuart`, `easeInOutQuart`, `easeInSine`, `easeOutSine`, `easeInOutSine`, `easeInExpo`, `easeOutExpo`, `easeInOutExpo`, `easeInBack`, `easeOutBack`, `easeOutElastic`, `easeOutBounce`

**Spring:** `{ "type": "spring", "stiffness": 100, "damping": 10, "mass": 1 }`

**Cubic Bezier:** `{ "type": "cubicBezier", "x1": 0.25, "y1": 0.1, "x2": 0.25, "y2": 1 }`

### Math Expressions

Used in `functionPlot.fn` and `vectorField.fn`. Safe evaluation — no `eval()`.

**Operators:** `+`, `-`, `*`, `/`, `^` (power), unary `-`

**Functions:** `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sqrt`, `abs`, `log`, `ln`, `exp`, `floor`, `ceil`, `round`, `min`, `max`, `sign`, `pow`

**Constants:** `PI`, `E`, `TAU`

**Variables:** `x` (FunctionPlot), `x` and `y` (VectorField)

**Examples:**
- `"sin(x)"` — Sine wave
- `"x^2 - 1"` — Parabola
- `"exp(-(x^2) / 2)"` — Gaussian
- `"[-y, x]"` — Rotation vector field
- `"[sin(y), cos(x)]"` — Wave vector field

## Examples

See the [`examples/`](./examples/) directory:
- `hello-circle.json` — Minimal animated circle
- `math-demo.json` — Axes, function plot, vector, LaTeX
- `animated-scene.json` — FadeIn, Draw, Transform, Stagger, Morph
- `presentation.json` — Multi-slide presentation
- `full-showcase.json` — Every feature in one document

## For AI Agents

When instructing an LLM to create Elucim diagrams:

1. **Ask it to produce JSON** matching the `ElucimDocument` schema
2. **Set `version: "1.0"`** as the first field
3. **Choose a root type**: `player` for interactive, `scene` for embedded, `presentation` for slides
4. **Use `sequence` nodes** to control timing (offsets in frames)
5. **Wrap elements in animation nodes** (`fadeIn`, `draw`, `stagger`) for entrance effects
6. **Use math expression strings** for function plots and vector fields

Example prompt:
> "Create an Elucim DSL JSON document that shows a coordinate system with sin(x) and cos(x) plotted, 
> with the sin curve drawing first, then the cos curve drawing 30 frames later, 
> and a LaTeX label fading in at the end."

## Fluent Builder API

Build presentations programmatically with a chainable TypeScript API:

```tsx
import { presentation, darkTheme } from '@elucim/dsl';

const doc = presentation(darkTheme)
  .size(1920, 1080)
  .transition('fade', 500)
  .slide('Welcome', (s) => {
    s.title('Hello World');
  })
  .slide('Math', (s) => {
    s.latex('e^{i\\pi} + 1 = 0', { x: 960, y: 500, fontSize: 48, color: '#fdcb6e' });
  })
  .build();
```

## Related

- **[@elucim/core](https://www.npmjs.com/package/@elucim/core)** — The React rendering engine (peer dependency)
- **[Elucim Docs](https://elucim.com)** — Full docs with live interactive examples

## License

[MIT](https://github.com/sethjuarez/elucim/blob/main/LICENSE)
