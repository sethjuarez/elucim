# @elucim/dsl

> Normalized JSON/YAML documents for animated Elucim scenes — designed for agents, editors, and content pipelines.

[![npm version](https://img.shields.io/npm/v/@elucim/dsl)](https://www.npmjs.com/package/@elucim/dsl)
[![license](https://img.shields.io/npm/l/@elucim/dsl)](https://github.com/sethjuarez/elucim/blob/main/LICENSE)

`@elucim/dsl` lets you describe animated diagrams as data. A public `ElucimDocument` is the normalized single-scene shape: `version: '2.0'`, `scene`, an ID-keyed `elements` registry, optional `timelines`, optional `stateMachines`, and optional `metadata`. The `<DslRenderer>` component renders these documents as interactive [Elucim](https://www.npmjs.com/package/@elucim/core) visuals — no React authoring required.

## Install

```bash
npm install @elucim/dsl @elucim/core react react-dom
# or
pnpm add @elucim/dsl @elucim/core react react-dom
```

## Quick Start

### From JSON

```tsx
import { DslRenderer } from '@elucim/dsl';
import type { ElucimDocument } from '@elucim/dsl';

const myDiagram: ElucimDocument = {
  version: '2.0',
  scene: {
    type: 'player',
    width: 800,
    height: 600,
    fps: 30,
    background: '#0d0d1a',
    children: ['orbit'],
  },
  elements: {
    orbit: {
      id: 'orbit',
      type: 'circle',
      props: {
        type: 'circle',
        cx: 400,
        cy: 300,
        r: 100,
        stroke: '#3b82f6',
        strokeWidth: 3,
        fill: 'none',
        opacity: 0,
      },
    },
  },
  timelines: {
    intro: {
      id: 'intro',
      duration: 60,
      tracks: [
        {
          target: 'orbit',
          property: 'opacity',
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 60, value: 1, easing: 'easeOutCubic' },
          ],
        },
      ],
    },
  },
  defaultStateMachine: 'main',
  stateMachines: {
    main: {
      id: 'main',
      entry: 'intro',
      states: { intro: { timeline: 'intro' } },
      transitions: [{ id: 'entry-start', from: 'entry', to: 'intro', trigger: 'onStart' }],
    },
  },
};

function App() {
  return <DslRenderer dsl={myDiagram} />;
}
```

### From YAML

```tsx
import { DslRenderer, fromYaml } from '@elucim/dsl';

const yaml = `
version: "2.0"
scene:
  type: player
  width: 800
  height: 600
  fps: 30
  background: "#0d0d1a"
  children: [orbit]
elements:
  orbit:
    id: orbit
    type: circle
    props:
      type: circle
      cx: 400
      cy: 300
      r: 100
      stroke: "#3b82f6"
      strokeWidth: 3
      fill: none
      opacity: 0
timelines:
  intro:
    id: intro
    duration: 60
    tracks:
      - target: orbit
        property: opacity
        keyframes:
          - { frame: 0, value: 0 }
          - { frame: 60, value: 1, easing: easeOutCubic }
defaultStateMachine: main
stateMachines:
  main:
    id: main
    entry: intro
    states:
      intro: { timeline: intro }
    transitions:
      - { id: entry-start, from: entry, to: intro, trigger: onStart }
`;

const myDiagram = fromYaml(yaml);

function App() {
  return <DslRenderer dsl={myDiagram} />;
}
```

## API

### `<DslRenderer dsl={doc} />`

Validates a normalized document and renders it as React components. If validation fails, it displays error messages instead of crashing.

**Props:**
- `dsl: ElucimDocument` — The normalized document to render
- `className?: string` — CSS class for the wrapper div
- `style?: CSSProperties` — Inline styles for the wrapper div
- `theme?: ElucimTheme` — Custom color tokens as CSS custom properties
- `colorScheme?: 'light' | 'dark' | 'auto'` — Inject light/dark theme variables automatically
- `poster?: 'first' | 'last' | number` — Render a static frame instead of interactive playback
- `onError?: (errors: Array<{ path: string; message: string }>) => void` — Callback for validation errors
- `ref?: React.Ref<DslRendererRef>` — Imperative handle for programmatic control

### `validate(doc: unknown): ValidationResult`

Validates a document without rendering it.

```ts
import { validate } from '@elucim/dsl';

const result = validate(myDoc);
if (!result.valid) {
  console.log(result.errors);
  // [{ path: 'elements.orbit.props.cx', message: 'Required numeric field "cx"...', severity: 'error' }]
}
```

### `fromYaml(input: string): ElucimDocument`

Parses a YAML string into a validated `ElucimDocument`. It uses a JSON-compatible schema so YAML values such as `on`, `yes`, and `NO` stay as strings instead of being coerced to booleans.

```ts
import { fromYaml, ElucimYamlError } from '@elucim/dsl';

try {
  const doc = fromYaml(yamlString);
  // doc is a validated ElucimDocument, ready for <DslRenderer>
} catch (e) {
  if (e instanceof ElucimYamlError) {
    console.error(e.message);
    console.error(e.validationErrors);
  }
}
```

### `renderToSvgString(doc, frame, options?)`

Renders a document to an SVG string without a browser DOM — useful for server-side rendering, thumbnails, and static export.

```ts
import { renderToSvgString } from '@elucim/dsl';
const svg = renderToSvgString(myDoc, 0);
```

### Agent authoring helpers

`@elucim/dsl/agent` provides a small, deterministic toolkit for LLM and host workflows. It creates normalized documents, applies higher-level commands, generates explicit timeline/state-machine structures, and returns agent-readable quality reports.

```ts
import {
  applyAgentCommands,
  createDocument,
  evaluateSceneForAgent,
  inspectSceneForAgent,
  repairDocumentForAgent,
  sampleAnimationForAgent,
} from '@elucim/dsl/agent';

const doc = applyAgentCommands(createDocument({
  preset: 'slide',
  metadata: { title: 'Slope intuition' },
}), [
  {
    op: 'addElement',
    element: {
      id: 'title',
      type: 'text',
      role: 'title',
      intent: { purpose: 'Introduce the core concept' },
      layout: { x: 96, y: 96 },
      props: { content: 'Slope as local change', fill: '$title' },
    },
  },
  { op: 'addRevealTimeline', timeline: { id: 'intro', targets: ['title'], preset: 'fadeIn' } },
  { op: 'createStateMachine', stateMachine: { id: 'main', timelineId: 'intro', start: 'onStart' } },
]).document;

const report = evaluateSceneForAgent(doc);
const repaired = repairDocumentForAgent(doc);
const animation = sampleAnimationForAgent(repaired.document, 'intro');
const inspection = inspectSceneForAgent(repaired.document, { timelineId: 'intro' });
```

The agent helpers intentionally produce timelines and state machines rather than wrapper animation props. Use them when you want an LLM to make targeted scene edits without memorizing the full document schema. Diagnostic helpers such as `getTimelineBounds()`, `repairDocumentForAgent()`, `sampleAnimationForAgent()`, `inspectSceneForAgent()`, and `createLoopingStateMachine()` help agents detect timeline mistakes, auto-extend too-short timeline durations, prove that properties change over sampled frames, catch tiny/off-canvas/low-contrast scenes, and wire a generated timeline into live playback.

### Diagram polish for agents

Generated diagrams should be checked with the deterministic polish APIs before handing them to a user. `evaluateSceneForAgent()` includes `report.polish`, and the same analysis is available directly as `analyzePolish(doc)`. The report returns category scores plus diagnostics for layout, hierarchy, readability, contrast, graph readability, explanatory structure, and motion.

```ts
import {
  analyzePolish,
  applyNudge,
  createCalloutCardPreset,
  suggestDocumentNudges,
} from '@elucim/dsl';

const polish = analyzePolish(doc);
const nudges = suggestDocumentNudges(doc);
const safe = nudges.filter(nudge => nudge.confidence === 'safe');
const polished = safe.reduce((current, nudge) => applyNudge(current, nudge).document, doc);

const calloutElements = createCalloutCardPreset({
  id: 'key-insight',
  x: 80,
  y: 420,
  title: 'Key insight',
  body: 'A semantic, token-based callout gives agents a polished starting point.',
});
```

Agent guidance:

- Prefer semantic roles and intent (`role: 'title'`, `role: 'callout'`, `intent.importance: 'primary' | 'secondary' | 'supporting'`) so polish can preserve explanatory meaning.
- Use theme tokens such as `$title`, `$surface`, `$primary`, and `$muted` instead of one-off literal colors unless a specific color is necessary.
- Run `suggestDocumentNudges()` after drafting. Apply `safe` nudges automatically; present `review` nudges, especially graph layout changes, for review.
- For graph elements, provide stable node IDs and `edges`; the layered graph nudge rewrites node coordinates while keeping the graph editable.

### `DslRendererRef`

Imperative handle exposed via `ref` on `<DslRenderer>`:

- `getSvgElement()` — Returns the underlying `SVGSVGElement`
- `seekToFrame(frame)` — Jump to a specific frame
- `getTotalFrames()` — Total frame count for the current playback surface
- `play()` / `pause()` — Control playback
- `isPlaying()` — Whether playback is active

### Math expressions

`compileExpression(expr: string)` and `compileVectorExpression(expr: string)` compile safe math strings for function plots and vector fields. The evaluator supports arithmetic, common trig/log functions, constants (`PI`, `E`, `TAU`), and variables (`x`, or `x`/`y` for vector fields). It does not use arbitrary JavaScript evaluation.

## Document Schema

Every public document uses this normalized structure:

```ts
interface ElucimDocument {
  $schema?: string;
  version: '2.0';
  scene: ElucimScene;
  elements: Record<string, ElucimElement>;
  timelines?: Record<string, ElucimTimeline>;
  stateMachines?: Record<string, ElucimStateMachine>;
  defaultStateMachine?: string;
  metadata?: ElucimMetadata;
}
```

### `scene`

The scene defines the render surface and top-level element order.

| Field | Description |
|-------|-------------|
| `type` | Usually `player` for interactive playback or `scene` for host-controlled rendering |
| `width` / `height` | Scene dimensions in pixels |
| `preset` | Optional shorthand: `card` (640×360), `slide` (1280×720), or `square` (600×600) |
| `fps` | Frames per second for timelines |
| `background` | Background color or semantic token |
| `children` | Ordered array of top-level element IDs |

Presentation and slide-deck composition is host-level React composition with `@elucim/core` components such as `<Presentation>` and `<Slide>`, not a DSL root shape.

### `elements`

Elements are keyed by stable ID. Each element includes its `id`, `type`, optional layout/metadata, and a `props` object for render properties.

Supported primitives include `circle`, `line`, `arrow`, `rect`, `polygon`, `bezierCurve`, `text`, `image`, `group`, and `barChart`.

Supported math/data elements include `axes`, `functionPlot`, `vector`, `vectorField`, `matrix`, `graph`, and `latex`.

### `timelines`

Timelines contain explicit property tracks and keyframes. Use timelines instead of wrapper animation nodes.

```json
{
  "intro": {
    "id": "intro",
    "duration": 45,
    "tracks": [
      {
        "target": "title",
        "property": "opacity",
        "keyframes": [
          { "frame": 0, "value": 0 },
          { "frame": 45, "value": 1 }
        ]
      }
    ]
  }
}
```

Common animated properties include `opacity`, `translate`, `scale`, `rotate`, `fill`, and `stroke`.

### `stateMachines`

State machines connect timelines into interactive flows. Use them for entry animation, click/key-driven transitions, reset behavior, or auto-advancing states.

```json
{
  "main": {
    "id": "main",
    "entry": "intro",
    "states": {
      "intro": { "timeline": "intro" },
      "focus": { "timeline": "focus" }
    },
    "transitions": [
      { "id": "entry-start", "from": "entry", "to": "intro", "trigger": "onStart" },
      { "id": "intro-next", "from": "intro", "to": "focus", "exitTime": 1 }
    ]
  }
}
```

## Semantic Color Tokens

Use `$token` syntax in color fields to create theme-adaptive visualizations. Tokens resolve to CSS custom properties at render time.

```json
{
  "version": "2.0",
  "scene": { "type": "player", "preset": "card", "background": "$background", "children": ["label"] },
  "elements": {
    "label": {
      "id": "label",
      "type": "text",
      "props": { "type": "text", "x": 320, "y": 180, "content": "Hello", "fill": "$foreground", "textAnchor": "middle" }
    }
  }
}
```

Available tokens include `$foreground`, `$background`, `$title`, `$subtitle`, `$muted`, `$primary`, `$secondary`, `$tertiary`, `$success`, `$warning`, `$error`, `$surface`, `$border`, and `$accent`.

Pair tokens with `colorScheme` or `theme`:

```tsx
<DslRenderer dsl={doc} colorScheme="auto" theme={{ accent: '#ff6600' }} />
```

## For AI Agents

When instructing an LLM to create Elucim diagrams:

1. Ask it to produce JSON matching the normalized `ElucimDocument` schema.
2. Set `version: "2.0"` and include exactly one `scene` plus an ID-keyed `elements` object.
3. Use stable, semantic element IDs (`title`, `axis-x`, `curve-sine`) so later edits can target specific objects.
4. Put motion in `timelines` with explicit tracks/keyframes; do not generate wrapper animation nodes.
5. Use `stateMachines` for entry, click/key, reset, and auto-advance behavior.
6. Use math expression strings for function plots and vector fields.
7. Use semantic color tokens (`$accent`, `$foreground`, `$background`) when the host theme should control colors.

Useful APIs for agent and host workflows include `createDocument`, `applyAgentCommands`, `addRevealTimeline`, `createStateMachine`, `evaluateSceneForAgent`, `validateForAgent`, `summarizeDocument`, `diffDocuments`, and `suggestDocumentNudges` from `@elucim/dsl/agent`, plus low-level preview helpers such as `applyTimelineFrame` and `transitionStateMachine` from `@elucim/dsl`.

**Tips:**
- Use `poster` on `<DslRenderer>` to show a static preview frame before playback starts.
- Use `renderToSvgString(doc, frame)` to generate SVG previews server-side for thumbnails and social cards.

Example prompt:
> "Create an Elucim DSL JSON document with `version: \"2.0\"`, a single player scene, stable element IDs for axes and two function plots, an intro timeline that draws the sine curve before the cosine curve, and a state machine that starts the intro on load."

## Related

- **[@elucim/core](https://www.npmjs.com/package/@elucim/core)** — React rendering engine and component APIs
- **[@elucim/editor](https://www.npmjs.com/package/@elucim/editor)** — Visual canvas editor for normalized Elucim documents
- **[Elucim Docs](https://elucim.com)** — Full docs with live interactive examples

## License

[MIT](https://github.com/sethjuarez/elucim/blob/main/LICENSE)
