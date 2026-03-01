# Scene & Composition

## Scene

`<Scene>` is the root container for all Elucim content. It renders an SVG element and provides a frame clock via React context.

```tsx
import { Scene } from '@elucim/core';

<Scene width={800} height={600} fps={60} durationInFrames={180}>
  {/* All primitives and animations go here */}
</Scene>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number` | — | SVG viewport width |
| `height` | `number` | — | SVG viewport height |
| `fps` | `number` | `60` | Frames per second |
| `durationInFrames` | `number` | — | Total animation duration in frames |
| `background` | `string` | `'transparent'` | Background color |

::: tip
Most users should use `<Player>` instead of `<Scene>` directly — it wraps Scene and adds transport controls.
:::

## Player

`<Player>` wraps `<Scene>` with interactive controls: play/pause, scrub bar, keyboard shortcuts.

```tsx
<Player
  width={800}
  height={400}
  fps={60}
  durationInFrames={120}
  background="#111127"
>
  {/* Your animation content */}
</Player>
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| ← / → | Step back / forward one frame |
| Home / End | Jump to start / end |

## Sequence

`<Sequence>` controls **when** children appear in the timeline.

```tsx
<Sequence from={30} durationInFrames={60}>
  {/* These children appear at frame 30 and last 60 frames */}
  {/* Inside here, useCurrentFrame() returns 0..59 */}
</Sequence>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `from` | `number` | Start frame (global timeline) |
| `durationInFrames` | `number` | How many frames this sequence lasts |

### Key Behavior

- Children are **unmounted** outside the `[from, from + durationInFrames)` range
- Children receive a **remapped frame counter** starting from 0
- Sequences can be nested for complex timing hierarchies

### Example: Sequential Animations

```tsx
<Player width={800} height={400} fps={60} durationInFrames={180}>
  {/* Step 1: Draw circle (frames 0-60) */}
  <Sequence from={0} durationInFrames={60}>
    <Circle cx={200} cy={200} r={80} stroke="#4ecdc4" draw={40} />
  </Sequence>

  {/* Step 2: Draw line (frames 40-120) — overlaps with circle */}
  <Sequence from={40} durationInFrames={80}>
    <Line x1={200} y1={200} x2={600} y2={200} stroke="#ff6b6b" draw={50} />
  </Sequence>

  {/* Step 3: Show text (frames 100-180) */}
  <Sequence from={100} durationInFrames={80}>
    <Text x={400} y={200} fill="#e0e0e0" fontSize={24} textAnchor="middle" fadeIn={30}>
      Connected!
    </Text>
  </Sequence>
</Player>
```
