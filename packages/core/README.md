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

## Advanced React Usage

`@elucim/core` is the low-level React runtime and primitive layer. For normal user/agent-authored scenes, prefer normalized `ElucimDocument` files rendered with `@elucim/dsl`'s `<DslRenderer>`. Use core directly when you intentionally want hand-coded React components, custom hooks, or host-level presentation shells.

```tsx
import { Player, Circle, Text, Group, useCurrentFrame, interpolate } from '@elucim/core';

function PulsingGroup() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1]);

  return (
    <Group translate={[400, 280]} opacity={opacity}>
      <Circle cx={0} cy={0} r={80} stroke="#6c5ce7" strokeWidth={3} fill="none" />
      <Circle cx={60} cy={0} r={12} fill="#6c5ce7" />
      <Text x={0} y={10} fill="#e0e0e0" fontSize={24} textAnchor="middle">
        Hello Elucim
      </Text>
    </Group>
  );
}

export function MyAnimation() {
  return (
    <Player width={800} height={600} fps={30} durationInFrames={90} autoPlay loop>
      <PulsingGroup />
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
| `captureFrame` | Single-frame capture to PNG/JPEG |
| `PlayerRef` | Imperative handle type for Player (getSvgElement, play, pause, seek) |

### 📐 Primitives

| Component | Description |
|-----------|-------------|
| `Circle` | SVG circle primitive |
| `Rect` | Rectangle with optional rounded corners |
| `Line` | Line segment |
| `Arrow` | Line with arrowhead |
| `Polygon` | Arbitrary polygon from point arrays |
| `BezierCurve` | Quadratic and cubic Bezier curves |
| `Text` | SVG text element |
| `Image` | Embed images (PNG, JPEG, SVG, WebP, GIF) with `borderRadius`, `clipShape`, and transform support |
| `Group` | Composable container that applies shared transforms to children; later siblings render on top |

### 🔄 Transforms & Composition

All primitives support universal spatial transform props:

| Prop | Description |
|------|-------------|
| `rotation` | Rotate element (degrees) |
| `rotationOrigin` | `[cx, cy]` center of rotation |
| `scale` | Uniform scale factor |
| `translate` | `[dx, dy]` offset |

Stacking follows sibling order: elements rendered later paint on top.

These compose with frame-driven values — use static `rotation={45}` for a fixed rotation, or derive `rotation` from `useCurrentFrame()` / `interpolate()` for custom React animation. For authored timelines and state machines, use `@elucim/dsl` v2 and the editor.

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

### Hand-coded Sine Curve

```tsx
import { Player, Axes, FunctionPlot, LaTeX, useCurrentFrame, interpolate } from '@elucim/core';

function SineCurve() {
  const frame = useCurrentFrame();
  const curveOpacity = interpolate(frame, [10, 40], [0, 1]);
  const labelOpacity = interpolate(frame, [70, 90], [0, 1]);

  return (
    <>
      <Axes origin={[400, 280]} domain={[-3, 3]} range={[-1.5, 1.5]} scale={80}
            axisColor="#888" labelColor="#888" />
      <FunctionPlot fn={(x) => Math.sin(x)} domain={[-3, 3]}
                    origin={[400, 280]} scale={80} color="#6c5ce7" strokeWidth={2.5}
                    opacity={curveOpacity} />
      <LaTeX expression="f(x) = \\sin(x)" x={600} y={60} fontSize={20}
             color="#6c5ce7" opacity={labelOpacity} />
    </>
  );
}
```

### Slide Presentation

```tsx
import { Presentation, Slide, Player, Text, LaTeX } from '@elucim/core';

<Presentation width={1920} height={1080} transition="fade" transitionDuration={500} showHUD>
  <Slide title="Welcome">
    <Player width={1920} height={1080} fps={30} durationInFrames={90} autoPlay loop controls={false}>
      <Text x={960} y={480} fill="currentColor" fontSize={64} textAnchor="middle">
        My Presentation
      </Text>
    </Player>
  </Slide>
  <Slide title="The Math">
    <Player width={1920} height={1080} fps={30} durationInFrames={60} autoPlay loop controls={false}>
      <LaTeX expression="e^{i\pi} + 1 = 0" x={960} y={500} fontSize={48} color="#fdcb6e" />
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

## Related

- **[@elucim/dsl](https://www.npmjs.com/package/@elucim/dsl)** — JSON/YAML DSL for declaring animations without React
- **[@elucim/editor](https://www.npmjs.com/package/@elucim/editor)** — Visual canvas editor for Elucim animations

## License

[MIT](https://github.com/sethjuarez/elucim/blob/main/LICENSE)
