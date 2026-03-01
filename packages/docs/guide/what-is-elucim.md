# What is Elucim?

Elucim is a JavaScript/TypeScript library for creating **animated concept explanations** — think 3Blue1Brown-style math visualizations, but natively for the web using React.

## Why Elucim?

- **Web-native**: No Python, no video rendering pipeline. Animations run directly in the browser as interactive React components.
- **Declarative**: Build animations by composing React components like `<Scene>`, `<Sequence>`, `<FadeIn>`, and `<Circle>`.
- **Interactive**: Built-in player with scrub bar, keyboard shortcuts, and frame-accurate seeking.
- **Math-first**: Purpose-built primitives for coordinate axes, function plots, vectors, matrices, graphs, and LaTeX equations.
- **Exportable**: Render animations to WebM/MP4 video files directly from the browser.

## Architecture

```
@elucim/core          — Library: components, hooks, primitives, animations
@elucim/demo          — Demo playground (port 3100)
@elucim/explorer      — Interactive primitive explorer (port 3200)
@elucim/docs          — This documentation site
packages/e2e          — Playwright visual regression tests
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Scene** | Root SVG container that runs a frame clock |
| **Sequence** | Time-offset wrapper that controls when children appear |
| **Player** | Interactive wrapper with transport controls |
| **Primitives** | SVG elements (Circle, Line, Arrow, Rect, Text, Polygon, etc.) |
| **Math Primitives** | Axes, FunctionPlot, Vector, VectorField, Matrix, Graph, LaTeX |
| **Animations** | FadeIn, FadeOut, Draw, Write, Transform, Morph, Stagger |
| **Timeline** | Imperative DSL for building animation sequences |
| **interpolate** | Maps frame numbers through input/output ranges with easing |
