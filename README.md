# Elucim

> **Describe animated explanations as data. Render them anywhere.**

Elucim is a TypeScript toolkit for normalized, interactive concept diagrams: a Mermaid-like document language for animated explanations, with richer SVG/math primitives, explicit timelines, state machines, React rendering, and a visual editor.

## ✅ Implementation Status

| Phase | Status | What's Included |
|-------|--------|----------------|
| **Phase 1: Core Engine** | ✅ Complete | Player, Scene, hooks, easing, SVG/math primitives |
| **Phase 2: Math Primitives** | ✅ Complete | Axes, FunctionPlot, Vector, VectorField, Matrix, Graph, LaTeX (KaTeX) |
| **Phase 3: Animation System** | ✅ Complete | Normalized timelines, state machines, keyframe evaluation, low-level React hooks |
| **Phase 4: New Primitives** | ✅ Complete | Polygon, VectorField, LaTeX, Image, Group, BarChart |
| **Phase 5: Tooling** | ✅ Complete | Interactive Explorer, Video Export, Starlight docs site |
| **Phase 6: Presentation** | ✅ Complete | React presentation shell, transitions, HUD, keyboard nav, presenter notes |
| **Phase 7: DSL** | ✅ Complete | Normalized JSON/YAML documents for users and AI agents, safe math evaluator, validator, DslRenderer, timelines/state machines |
| **Phase 8: Composability** | ✅ Complete | Universal SpatialProps (rotation, scale, translate), z-index stacking, Group container |
| **Phase 9: Visual Editor** | ✅ Complete | Canvas editor with toolbar, inspector, timeline, theming, marquee selection |
| **Testing** | ✅ Complete | 34 Playwright e2e tests + 429 Vitest unit tests |

## Quick Start

```bash
pnpm install
pnpm --filter @elucim/demo dev       # Demo playground → http://localhost:3100
pnpm --filter @elucim/explorer dev    # Interactive explorer → http://localhost:3200
pnpm --filter @elucim/docs dev        # Documentation site → http://localhost:3300
```

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| **[@elucim/dsl](./packages/dsl)** | Primary authoring surface: normalized JSON/YAML documents, timelines, state machines, DslRenderer | [![npm](https://img.shields.io/npm/v/@elucim/dsl)](https://www.npmjs.com/package/@elucim/dsl) |
| **[@elucim/core](./packages/core)** | Low-level React components, hooks, primitives including bounded `TextBox`, playback, and export utilities | [![npm](https://img.shields.io/npm/v/@elucim/core)](https://www.npmjs.com/package/@elucim/core) |
| **[@elucim/editor](./packages/editor)** | Visual canvas editor — Figma-like design tool | [![npm](https://img.shields.io/npm/v/@elucim/editor)](https://www.npmjs.com/package/@elucim/editor) |

## Monorepo Structure

```
packages/
  dsl/        — Primary authoring model: normalized scene schema, validator, renderer, timelines, state machines
  core/       — Low-level React components, hooks, primitives, playback, export
  editor/     — Visual editor: canvas, toolbar, inspector, timeline, theming
  demo/       — Demo playground with 15+ interactive scenes
  explorer/   — Storybook-style primitive browser with live controls
  e2e/        — Playwright visual regression tests
```

## Running Tests

```bash
# Unit tests (429 tests across core, dsl, editor)
pnpm test

# Packed package smoke tests (requires pnpm build first; installs tarballs with npm)
pnpm build
pnpm test:package-smoke

# Individual packages
pnpm --filter @elucim/core test
pnpm --filter @elucim/dsl test
pnpm --filter @elucim/editor test

# E2e tests (requires demo running on :3100)
pnpm --filter @elucim/demo dev &
cd packages/e2e && npx playwright test
```

---

`elucim.com`

---

## What Is It?

Elucim is a JavaScript/TypeScript toolkit for creating **animated concept explanations** — think 3Blue1Brown-style math visualizations, but authored as normalized data and rendered live in the browser. The primary authoring model is an `ElucimDocument`: one scene, stable element IDs, explicit timelines, state machines, and metadata. React hosts render that document with `<DslRenderer dsl={doc} />`.

The name comes from *elucidate* — to make clear through explanation — with a nod to Manim's `-im` suffix.

---

## The Problem

| Tool | What's missing |
|---|---|
| **Manim** | Python-only, outputs video, no browser interactivity, weak 3D |
| **Remotion** | No math primitives, animations are DIY, outputs video only |
| **Reveal.js / Slidev** | Animates *slides*, not *content* — no mathematical object support |
| **Framer Motion** | UI animations, not concept explanations |

There is no JavaScript-native tool for building **beautiful, mathematical, interactive animated explanations**.

---

## Core Design Principles

### 1. Primitive System

First-class visual primitives represented as normalized elements:

- Geometric shapes (Circle, Line, Arrow, Polygon)
- Math & data (Axes, FunctionPlot, Graph, Vector, Matrix)
- Text & LaTeX rendering
- Image embedding (PNG, JPEG, SVG, WebP, GIF)
- Composable Group containers
- Layout metadata for rotation, scale, translate, and zIndex
- Timeline tracks for motion such as opacity, translate, scale, rotate, fill, and stroke

### 2. Normalized Document Model

Scenes are inspectable JSON/YAML data:

```ts
import { DslRenderer, type ElucimDocument } from '@elucim/dsl';

const doc: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, children: ['axes', 'curve'] },
  elements: {
    axes: { id: 'axes', type: 'axes', props: { type: 'axes', origin: [400, 300], xRange: [-5, 5], yRange: [-3, 3], scale: 50 } },
    curve: { id: 'curve', type: 'functionPlot', props: { type: 'functionPlot', expression: 'sin(x)', domain: [-5, 5], origin: [400, 300], scale: 50, opacity: 0 } },
  },
  timelines: {
    intro: { id: 'intro', duration: 45, tracks: [{ target: 'curve', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 45, value: 1 }] }] },
  },
  defaultStateMachine: 'main',
  stateMachines: {
    main: { id: 'main', entry: 'intro', states: { intro: { timeline: 'intro' } }, transitions: [{ id: 'entry-start', from: 'entry', to: 'intro', trigger: 'onStart' }] },
  },
};

export function Scene() {
  return <DslRenderer dsl={doc} />;
}
```

### 3. React Rendering and Low-Level Core APIs

`@elucim/dsl` renders documents through React. `@elucim/core` provides the lower-level primitives, player, hooks, and export utilities that power the renderer and remain available for advanced hand-coded React integrations.

### 4. Interactive by Default

Unlike Manim and Remotion, Elucim renders **live in the browser**. `DslRenderer` can run the document's default state machine interactively, while the lower-level `<Player>` remains available for custom React playback. Export to video is additive — not the primary output.

### 5. Renderer-Agnostic Core

The primitive abstraction is renderer-independent:

- **SVG/Canvas** — default for crisp 2D (vector-sharp text, geometric shapes)
- **BabylonJS** — optional 3D backend (surfaces, parametric curves, 3D graphs, WebGPU)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Normalized Document Layer           │
│   ElucimDocument · elements · timelines · states  │
├─────────────────────────────────────────────────┤
│                 React Runtime                    │
│   DslRenderer · Player · frame clock · easing     │
├──────────────────┬──────────────────────────────┤
│   SVG/Canvas     │       BabylonJS (3D)          │
│   Renderer       │       Renderer                │
│   (2D default)   │       (optional, WebGPU)      │
└──────────────────┴──────────────────────────────┘
```

**Key abstractions:**

- `ElucimDocument` — normalized single-scene document with stable IDs
- `elements` — ID-keyed visual primitives and semantic metadata
- `timelines` — explicit keyframe tracks over safe animatable properties
- `stateMachines` — interactive Entry/state/transition playback
- `<DslRenderer>` — React renderer for normalized documents
- `@elucim/core` — lower-level React primitives, hooks, player, and export utilities

---

## Differentiators

| Feature | Elucim | Manim | Remotion |
|---|:---:|:---:|:---:|
| JavaScript/TypeScript | ✅ | ❌ | ✅ |
| React components | ✅ | ❌ | ✅ |
| Math primitives | ✅ | ✅ | ❌ |
| Interactive in browser | ✅ | ❌ | ❌ |
| Video export | ✅ | ✅ | ✅ |
| 3D support | ✅ (BabylonJS) | ⚠️ | ❌ |
| LaTeX rendering | ✅ | ✅ | ❌ |
| Host-level presentation shell | ✅ | ✅ | ❌ |
| Open source | ✅ | ✅ | ⚠️ (BSL) |

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript | Type safety for math objects |
| UI | React 18+ | Ecosystem, composability |
| 2D Rendering | SVG (default) | Vector-sharp, accessible |
| 2D Performance | Canvas/WebGL | For particle-heavy scenes |
| 3D Rendering | BabylonJS | WebGPU-ready, mature scene graph |
| Math | mathjs | Symbolic + numeric computation |
| LaTeX | KaTeX | Fast, browser-native |
| Build | Vite | Fast dev, library mode |
| Testing | Vitest + Playwright | Unit + visual regression |

---

## Competitive Landscape

- **Manim** — the gold standard for math animation, but Python/video-only
- **Remotion** — React video, no math primitives, BSL license for companies
- **Motion Canvas** — TypeScript, closest JS alternative to Manim, no React
- **Slidev** — Vue presentation tool, surface-level animations only
- **D3.js** — data viz workhorse, but not designed for concept animation

**Elucim's position:** The only React-native, interactive, mathematically-rich animation library for the web.

---

## Open Questions

- Rendering strategy: pure SVG vs. hybrid SVG+Canvas for performance at scale
- Remotion interop: deep integration vs. standalone?

---

*Domain secured: `elucim.com`*
