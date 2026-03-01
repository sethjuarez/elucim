# Basic Shapes

All basic shapes render as SVG elements and support animation props.

## Circle

```tsx
<Circle cx={200} cy={150} r={80} stroke="#4ecdc4" fill="none" strokeWidth={3} draw={40} />
```

| Prop | Type | Description |
|------|------|-------------|
| `cx`, `cy` | `number` | Center coordinates |
| `r` | `number` | Radius |
| `stroke` | `string` | Stroke color |
| `fill` | `string` | Fill color |
| `strokeWidth` | `number` | Stroke width |
| `draw` | `number` | Frames to animate stroke drawing |
| `fadeIn` | `number` | Frames to fade in |

## Line

```tsx
<Line x1={50} y1={200} x2={350} y2={50} stroke="#ff6b6b" strokeWidth={3} draw={40} />
```

| Prop | Type | Description |
|------|------|-------------|
| `x1`, `y1`, `x2`, `y2` | `number` | Start/end coordinates |
| `stroke` | `string` | Color |
| `strokeWidth` | `number` | Width |
| `draw` | `number` | Draw animation frames |

## Arrow

```tsx
<Arrow x1={50} y1={200} x2={350} y2={100} stroke="#ffe66d" headSize={10} />
```

Like Line but with an arrowhead marker. Additional prop: `headSize`.

## Rect

```tsx
<Rect x={100} y={50} width={200} height={150} stroke="#a29bfe" rx={8} draw={30} />
```

| Prop | Type | Description |
|------|------|-------------|
| `x`, `y` | `number` | Position |
| `width`, `height` | `number` | Dimensions |
| `rx` | `number` | Corner radius |
| `draw` | `number` | Draw animation frames |

## Text

```tsx
<Text x={200} y={150} fill="#e0e0e0" fontSize={24} textAnchor="middle" fadeIn={20}>
  Hello World
</Text>
```

| Prop | Type | Description |
|------|------|-------------|
| `x`, `y` | `number` | Position |
| `fill` | `string` | Text color |
| `fontSize` | `number` | Font size |
| `textAnchor` | `string` | Alignment: `start`, `middle`, `end` |
| `fadeIn` | `number` | Fade in duration |

## Polygon

```tsx
<Polygon
  points={[[100, 50], [50, 150], [150, 150]]}
  stroke="#4ecdc4"
  fill="rgba(78,205,196,0.15)"
  strokeWidth={3}
  draw={40}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `points` | `[number, number][]` | Array of vertex coordinates |
| `stroke` | `string` | Stroke color |
| `fill` | `string` | Fill color |
| `draw` | `number` | Draw animation frames |
