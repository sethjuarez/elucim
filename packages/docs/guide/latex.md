# LaTeX Rendering

Elucim supports rendering LaTeX math expressions using KaTeX, embedded in SVG via `foreignObject`.

## Setup

Add KaTeX CSS to your HTML:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.33/dist/katex.min.css" />
```

## Usage

```tsx
import { LaTeX } from '@elucim/core';

<LaTeX
  expression="E = mc^2"
  x={400}
  y={200}
  fontSize={32}
  color="#ff6b6b"
  fadeIn={30}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `expression` | `string` | — | LaTeX expression |
| `x` | `number` | — | X position (center) |
| `y` | `number` | — | Y position (center) |
| `fontSize` | `number` | `24` | Font size in pixels |
| `color` | `string` | `'#e0e0e0'` | Text color |
| `width` | `number` | `400` | Container width |
| `height` | `number` | `100` | Container height |
| `align` | `string` | `'center'` | Text alignment |
| `fadeIn` | `number` | `0` | Fade-in animation frames |

## Examples

### Calculus

```tsx
<LaTeX expression="\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}" color="#4ecdc4" />
```

### Series

```tsx
<LaTeX expression="\sum_{n=0}^{\infty} \frac{x^n}{n!} = e^x" color="#ffe66d" />
```

### Maxwell's Equation

```tsx
<LaTeX expression="\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}" color="#a29bfe" />
```

### Sequenced Equations

```tsx
<Sequence from={0} durationInFrames={60}>
  <LaTeX expression="E = mc^2" x={400} y={100} color="#ff6b6b" fadeIn={30} />
</Sequence>
<Sequence from={30} durationInFrames={60}>
  <LaTeX expression="F = ma" x={400} y={200} color="#4ecdc4" fadeIn={30} />
</Sequence>
```
