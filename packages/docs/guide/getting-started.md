# Getting Started

## Installation

```bash
# Using pnpm (recommended)
pnpm add @elucim/core react react-dom

# Using npm
npm install @elucim/core react react-dom
```

For LaTeX support, also install KaTeX:

```bash
pnpm add katex
```

And include the KaTeX CSS in your HTML:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.33/dist/katex.min.css" />
```

## Your First Animation

```tsx
import { Player, Sequence, Circle, Text, FadeIn } from '@elucim/core';

function MyFirstAnimation() {
  return (
    <Player width={800} height={400} fps={60} durationInFrames={120} background="#111127">
      {/* Circle draws itself over 40 frames */}
      <Sequence from={0} durationInFrames={60}>
        <Circle cx={400} cy={200} r={80} stroke="#4ecdc4" strokeWidth={3} draw={40} />
      </Sequence>

      {/* Text fades in after the circle */}
      <Sequence from={50} durationInFrames={70}>
        <FadeIn durationInFrames={30}>
          <Text x={400} y={200} fill="#e0e0e0" fontSize={24} textAnchor="middle">
            Hello Elucim!
          </Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}
```

## How It Works

1. **`<Player>`** renders an SVG canvas and manages a frame counter (0 → durationInFrames).
2. **`<Sequence>`** controls _when_ children appear by offsetting the frame counter.
3. **Primitives** like `<Circle>` accept animation props (`draw`, `fadeIn`) that animate based on the current frame.
4. **Animation wrappers** like `<FadeIn>` apply effects to any children.

## Key Concepts

### Frames, not Time

Everything in Elucim is frame-based. At 60fps with 120 frames, your animation is 2 seconds long.

```tsx
<Player fps={60} durationInFrames={120}>  {/* 2 seconds */}
```

### Sequences for Timing

`<Sequence from={30} durationInFrames={60}>` means children appear at frame 30 and last for 60 frames. Children see their own local frame counter starting from 0.

### Interpolation

Use `interpolate()` for custom animations:

```tsx
import { useCurrentFrame, interpolate, easeOutCubic } from '@elucim/core';

function CustomAnimation() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], { easing: easeOutCubic });
  const scale = interpolate(frame, [0, 30], [0.5, 1], { easing: easeOutCubic });

  return (
    <g style={{ opacity }} transform={`scale(${scale})`}>
      {/* ... */}
    </g>
  );
}
```

## Next Steps

- [Scene & Composition](/guide/scene) — Learn about the Scene component
- [Basic Shapes](/guide/basic-shapes) — All available primitives
- [Math Primitives](/guide/math-primitives) — Axes, plots, vectors, and more
- [Animations](/guide/animations) — FadeIn, Draw, Transform, Stagger
- [Visual Editor](/guide/editor) — Build scenes visually with the drag-and-drop editor
- [API Reference](/api/components) — Full API documentation
