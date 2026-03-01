# Math Primitives

Elucim includes specialized primitives for mathematical visualizations.

## Axes

Coordinate axes with tick marks, labels, and optional grid.

```tsx
<Axes
  domain={[-5, 5]}
  range={[-3, 3]}
  origin={[400, 300]}
  scale={50}
  showGrid
  axisColor="#888"
  gridColor="#222"
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `domain` | `[number, number]` | X-axis range |
| `range` | `[number, number]` | Y-axis range |
| `origin` | `[number, number]` | SVG pixel position of (0,0) |
| `scale` | `number` | Pixels per unit |
| `showGrid` | `boolean` | Show grid lines |
| `axisColor` | `string` | Axis color |
| `gridColor` | `string` | Grid line color |

Use `mathToSvg(mathX, mathY, origin, scale)` to convert math coordinates to SVG pixels.

## FunctionPlot

Plot a continuous function over axes with draw animation.

```tsx
<FunctionPlot
  fn={(x) => Math.sin(x)}
  domain={[-5, 5]}
  origin={[400, 300]}
  scale={50}
  stroke="#ff6b6b"
  strokeWidth={3}
  draw={60}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `fn` | `(x: number) => number` | The function to plot |
| `domain` | `[number, number]` | X range |
| `origin` | `[number, number]` | Origin in SVG space |
| `scale` | `number` | Pixels per unit |
| `draw` | `number` | Draw animation frames |
| `samples` | `number` | Number of sample points (default: 200) |

## Vector

Mathematical vector arrow from origin.

```tsx
<Vector vx={3} vy={2} origin={[400, 300]} scale={50} color="#ff6b6b" label="v⃗" />
```

## VectorField

Grid of arrows showing a 2D vector field.

```tsx
<VectorField
  fn={(x, y) => [-y, x]}
  domain={[-4, 4]}
  range={[-3, 3]}
  origin={[400, 300]}
  scale={50}
  color="#4ecdc4"
  arrowScale={0.35}
  normalize
  fadeIn={30}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `fn` | `(x, y) => [number, number]` | Vector field function |
| `normalize` | `boolean` | Normalize all arrows to same length |
| `arrowScale` | `number` | Scale factor for arrows |
| `spacing` | `number` | Grid spacing in math units (default: 1) |

## Matrix

Display a matrix with bracket notation.

```tsx
<Matrix
  entries={[['a', 'b'], ['c', 'd']]}
  x={200} y={150}
  color="#e0e0e0"
  fontSize={22}
  fadeIn={20}
/>
```

## Graph

Node-edge graph visualization.

```tsx
const nodes = [
  { id: 'A', x: 100, y: 80, label: 'A' },
  { id: 'B', x: 300, y: 80, label: 'B' },
  { id: 'C', x: 200, y: 220, label: 'C' },
];
const edges = [
  { from: 'A', to: 'B', label: '3' },
  { from: 'B', to: 'C', directed: true },
  { from: 'C', to: 'A' },
];

<Graph nodes={nodes} edges={edges} nodeColor="#ff6b6b" edgeColor="#888" />
```
