# Elucim

> **Animate concepts. Illuminate understanding.**

A JavaScript/TypeScript library for creating animated concept explanations — 3Blue1Brown-style math visualizations, built natively for the web in React.

## ✅ Implementation Status

| Phase | Status | What's Included |
|-------|--------|----------------|
| **Phase 1: Core Engine** | ✅ Complete | Scene, Sequence, Player, interpolate, 20+ easing functions, SVG primitives |
| **Phase 2: Math Primitives** | ✅ Complete | Axes, FunctionPlot, Vector, VectorField, Matrix, Graph, LaTeX (KaTeX) |
| **Phase 3: Animation System** | ✅ Complete | FadeIn/Out, Draw, Write, Transform, Morph, Stagger, Parallel, Timeline DSL |
| **Phase 4: New Primitives** | ✅ Complete | Polygon, VectorField, LaTeX rendering |
| **Phase 5: Tooling** | ✅ Complete | Interactive Explorer, Video Export, VitePress docs site |
| **Phase 6: Presentation** | ✅ Complete | Slide mode, transitions, HUD, keyboard nav, presenter notes |
| **Phase 7: DSL** | ✅ Complete | JSON DSL for AI agents, safe math evaluator, validator, DslRenderer |
| **Testing** | ✅ Complete | 110 Playwright visual tests + 203 Vitest unit tests |

## Quick Start

```bash
pnpm install
pnpm --filter @elucim/demo dev       # Demo playground → http://localhost:3100
pnpm --filter @elucim/explorer dev    # Interactive explorer → http://localhost:3200
pnpm --filter @elucim/docs dev        # Documentation site → http://localhost:3300
```

## Monorepo Structure

```
packages/
  core/       — Library: components, hooks, primitives, animations, export
  demo/       — Demo playground with 15+ interactive scenes
  explorer/   — Storybook-style primitive browser with live controls
  docs/       — VitePress documentation site
  e2e/        — Playwright visual regression tests
docs/         — Developer guide (creating-visuals.md)
```

## Running Tests

```bash
# Unit tests (100 tests)
pnpm --filter @elucim/core test

# Visual regression tests (90 tests — requires demo running on :3100)
pnpm --filter @elucim/demo dev &
cd packages/e2e && npx playwright test
```

---

`elucim.com`

---

## What Is It?

Elucim is a JavaScript/TypeScript library for creating **animated concept explanations** — think 3Blue1Brown-style math visualizations, but built natively for the web in React. It blends the best of [Manim](https://www.manim.community/) (rich mathematical animation primitives) and [Remotion](https://www.remotion.dev/) (React-based, programmatic, frame-driven), with a critical differentiator neither offers: **fully interactive, live-in-browser animations** that viewers can scrub, pause, and eventually interact with.

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

### 1. Mobject System (from Manim)

First-class mathematical primitives that know how to animate themselves:

- Geometric shapes (Circle, Line, Arrow, Polygon)
- Math objects (Axes, FunctionPlot, Graph, Vector, Matrix)
- Text & LaTeX rendering
- Each Mobject can `fadeIn`, `write`, `transform`, `morph`, `trace`

### 2. React-Based & Declarative (from Remotion)

Everything is a React component. Animations compose naturally:

```tsx
<Scene duration={180} fps={60}>
  <Sequence from={0} duration={60}>
    <Axes domain={[-5, 5]} range={[-2, 2]} />
  </Sequence>
  <Sequence from={40} duration={80}>
    <FunctionPlot fn={Math.sin} color="blue" />
  </Sequence>
  <Sequence from={90}>
    <Label text="sin(x)" position={[Math.PI, 0]} />
  </Sequence>
</Scene>
```

### 3. Imperative Timeline DSL

An optional Manim-style API for authors who prefer sequential thinking:

```ts
const scene = new Scene()
scene.play(FadeIn(axes))
scene.play(Draw(sinCurve), { runTime: 2 })
scene.play(Write(label))
```

This compiles down to the same frame-based rendering under the hood.

### 4. Interactive by Default

Unlike Manim and Remotion, Elucim renders **live in the browser**. The `<Player>` component lets viewers scrub the timeline, step through animation checkpoints, and (eventually) interact with mathematical objects directly. Export to video is additive — not the primary output.

### 5. Renderer-Agnostic Core

The Mobject abstraction is renderer-independent:

- **SVG/Canvas** — default for crisp 2D (vector-sharp text, geometric shapes)
- **BabylonJS** — optional 3D backend (surfaces, parametric curves, 3D graphs, WebGPU)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  React Layer                     │
│   <Scene> <Sequence> <Mobject> <Player>          │
├─────────────────────────────────────────────────┤
│               Timeline Engine                    │
│   Frame clock · Interpolation · Easing           │
│   Imperative DSL → declarative frame mapping     │
├──────────────────┬──────────────────────────────┤
│   SVG/Canvas     │       BabylonJS (3D)          │
│   Renderer       │       Renderer                │
│   (2D default)   │       (optional, WebGPU)      │
└──────────────────┴──────────────────────────────┘
```

**Key abstractions:**

- `Scene` — a composition with dimensions, fps, and duration
- `Sequence` — a time-offset wrapper (from Remotion)
- `Mobject` — a renderable mathematical object with built-in animation methods
- `useCurrentFrame()` — the core hook, returns frame number (0 → duration)
- `interpolate(frame, [in, out], [from, to], easing)` — maps time to values
- `<Player>` — interactive browser component for scrubbing/stepping

---

## Differentiators

| Feature | Elucim | Manim | Remotion |
|---|:---:|:---:|:---:|
| JavaScript/TypeScript | ✅ | ❌ | ✅ |
| React components | ✅ | ❌ | ✅ |
| Math primitives (Mobjects) | ✅ | ✅ | ❌ |
| Interactive in browser | ✅ | ❌ | ❌ |
| Video export | ✅ | ✅ | ✅ |
| 3D support | ✅ (BabylonJS) | ⚠️ | ❌ |
| LaTeX rendering | ✅ | ✅ | ❌ |
| Slide/presentation mode | ✅ | ✅ | ❌ |
| Open source | ✅ | ✅ | ⚠️ (BSL) |

---

## Phased Plan

### Phase 1 — Core Engine

- [ ] `Scene` and `Sequence` components
- [ ] `useCurrentFrame()` and `interpolate()` hooks
- [ ] SVG renderer with basic Mobjects: Circle, Line, Arrow, Rect, Text
- [ ] `<Player>` component with scrubbing
- [ ] Easing library (linear, easeIn, easeOut, spring, etc.)

### Phase 2 — Math Primitives

- [ ] `Axes` with configurable domain/range
- [ ] `FunctionPlot` (continuous functions)
- [ ] `Vector` and `VectorField`
- [ ] `Matrix` display and transformation
- [ ] LaTeX rendering (via MathJax or KaTeX)
- [ ] `Graph` (nodes + edges)

### Phase 3 — Animation System

- [ ] Built-in animation types: `FadeIn`, `FadeOut`, `Write`, `Draw`, `Transform`, `Morph`
- [ ] Imperative timeline DSL (`scene.play()`)
- [ ] Animation groups (parallel + sequential)
- [ ] `Transform` between arbitrary Mobjects

### Phase 4 — 3D & Export

- [ ] BabylonJS renderer backend
- [ ] 3D Mobjects: `Surface`, `ParametricCurve`, `Axes3D`
- [ ] Video export (via WebCodecs or Remotion integration)
- [x] Slide/presentation mode

### Phase 5 — DX & Ecosystem

- [ ] VSCode extension with live preview
- [ ] Hot reload dev server
- [ ] Storybook-style Mobject explorer
- [ ] Documentation site with interactive examples

---

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
- LaTeX: KaTeX (fast, limited) vs. MathJax (full, slow)?
- Should the imperative DSL be first-class or a thin wrapper?
- Remotion interop: deep integration vs. standalone?
- Licensing: fully MIT, or Remotion-style (free for individuals, paid for companies)?

---

*Domain secured: `elucim.com`*
