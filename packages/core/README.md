# @elucim/core

> Animated math & concept visualizations for React — 3Blue1Brown-style, built for the web.

[![npm version](https://img.shields.io/npm/v/@elucim/core)](https://www.npmjs.com/package/@elucim/core)
[![license](https://img.shields.io/npm/l/@elucim/core)](https://github.com/sethjuarez/elucim/blob/main/LICENSE)

Elucim is a React library for creating **interactive, animated explanations** — mathematical visualizations, concept diagrams, and slide-based presentations that viewers can scrub, pause, and explore. Think Manim meets Remotion, live in the browser.

## Install

```bash
npm install @elucim/core
# or
pnpm add @elucim/core
```

**Peer dependencies:** React 18 or 19

## Quick Start

```tsx
import { Player, FadeIn, Circle, Text } from '@elucim/core';

function MyAnimation() {
  return (
    <Player width={800} height={600} fps={30} durationInFrames={90} autoPlay loop>
      <FadeIn duration={20}>
        <Circle cx={400} cy={280} r={80} stroke="#6c5ce7" strokeWidth={3} fill="none" />
      </FadeIn>
      <FadeIn duration={20}>
        <Text x={400} y={290} fill="#e0e0e0" fontSize={24} textAnchor="middle">
          Hello Elucim
        </Text>
      </FadeIn>
    </Player>
  );
}
```

## What's Included

### 🎬 Playback

| Component | Description |
|-----------|-------------|
| `Player` | Interactive player with controls, scrubber, play/pause, keyboard shortcuts |
| `Scene` | Raw SVG scene for embedding in custom playback systems |
| `Sequence` | Time-offset wrapper — schedule children to appear at specific frames |

### 📐 Primitives

| Component | Description |
|-----------|-------------|
| `Circle` | SVG circle with optional animation props |
| `Rect` | Rectangle with optional rounded corners |
| `Line` | Line segment |
| `Arrow` | Line with arrowhead |
| `Polygon` | Arbitrary polygon from point arrays |
| `Text` | SVG text element |

### 📊 Math Visualizations

| Component | Description |
|-----------|-------------|
| `Axes` | Coordinate axes with configurable domain, range, ticks, and grid |
| `FunctionPlot` | Plot any `(x) => y` function on axes |
| `Vector` | Mathematical vector with label and styling |
| `VectorField` | Grid of arrows from a `(x, y) => [dx, dy]` function |
| `Matrix` | Matrix with brackets, configurable styling |
| `Graph` | Graph theory visualization — nodes, edges, labels |
| `LaTeX` | LaTeX math expressions rendered via KaTeX |
| `BarChart` | Animated bar chart with labels and colors |

### ✨ Animations

| Component | Description |
|-----------|-------------|
| `FadeIn` / `FadeOut` | Opacity transitions |
| `Draw` | Progressive stroke drawing (like handwriting) |
| `Write` | Stroke draw followed by fill fade |
| `Transform` | Animate position, scale, rotation, and opacity |
| `Morph` | Color and scale morphing |
| `Stagger` | Sequential delayed entrance for children |
| `Parallel` | Run multiple animations simultaneously |
| `Timeline` | Imperative animation sequencing |

### 🎭 Presentations

| Component | Description |
|-----------|-------------|
| `Presentation` | Full slide-deck system with transitions and keyboard navigation |
| `Slide` | Individual slide with title, notes, and background |

### 🪝 Hooks

| Hook | Description |
|------|-------------|
| `useCurrentFrame()` | Current frame number (0-based) |
| `interpolate()` | Map frame values through input/output ranges with easing |
| `useElucimContext()` | Full scene context — frame, fps, dimensions |
| `usePresentationContext()` | Slide state and navigation inside a Presentation |
| `useInsidePresentation()` | Detect if running inside a Presentation |

### 🎨 Easing Functions

20+ built-in easings including `linear`, `easeInOutCubic`, `easeOutElastic`, `easeOutBounce`, plus `spring()` and `cubicBezier()` generators.

## Examples

### Animated Sine Curve

```tsx
import { Player, Axes, FunctionPlot, Draw, Sequence, FadeIn, LaTeX } from '@elucim/core';

<Player width={800} height={500} fps={30} durationInFrames={120} autoPlay loop>
  <Axes origin={[400, 280]} domain={[-3, 3]} range={[-1.5, 1.5]} scale={80}
        axisColor="#888" labelColor="#888" />
  <Sequence from={10} durationInFrames={110}>
    <Draw duration={60}>
      <FunctionPlot fn={(x) => Math.sin(x)} domain={[-3, 3]}
                    origin={[400, 280]} scale={80} color="#6c5ce7" strokeWidth={2.5} />
    </Draw>
  </Sequence>
  <Sequence from={70} durationInFrames={50}>
    <FadeIn duration={20}>
      <LaTeX expression="f(x) = \sin(x)" x={600} y={60} fontSize={20} color="#6c5ce7" />
    </FadeIn>
  </Sequence>
</Player>
```

### Slide Presentation

```tsx
import { Presentation, Slide, Player, FadeIn, Text, LaTeX } from '@elucim/core';

<Presentation width={1920} height={1080} transition="fade" transitionDuration={500} showHUD>
  <Slide title="Welcome">
    <Player width={1920} height={1080} fps={30} durationInFrames={90} autoPlay loop controls={false}>
      <FadeIn duration={25}>
        <Text x={960} y={480} fill="currentColor" fontSize={64} textAnchor="middle">
          My Presentation
        </Text>
      </FadeIn>
    </Player>
  </Slide>
  <Slide title="The Math">
    <Player width={1920} height={1080} fps={30} durationInFrames={60} autoPlay loop controls={false}>
      <FadeIn duration={30}>
        <LaTeX expression="e^{i\pi} + 1 = 0" x={960} y={500} fontSize={48} color="#fdcb6e" />
      </FadeIn>
    </Player>
  </Slide>
</Presentation>
```

## Theme-Aware

Player and Scene automatically adapt to light and dark themes using CSS `light-dark()`. No custom CSS needed — colors, controls, and backgrounds resolve correctly in both modes.

## Keyboard Shortcuts

**Player:** `Space` play/pause, `←` / `→` seek, `Shift+←` / `Shift+→` seek 10 frames, `Home` / `End` jump

**Presentation:** `←` / `→` navigate slides, `Space` next, `F` fullscreen

## Documentation

Full docs with live interactive examples: [elucim.com](https://elucim.com)

## License

[MIT](https://github.com/sethjuarez/elucim/blob/main/LICENSE)
