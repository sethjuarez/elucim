# Primitives API

## Basic Shapes

### Circle
```ts
interface CircleProps {
  cx: number; cy: number; r: number;
  stroke?: string; fill?: string; strokeWidth?: number;
  draw?: number; fadeIn?: number; fadeOut?: number;
}
```

### Line
```ts
interface LineProps {
  x1: number; y1: number; x2: number; y2: number;
  stroke?: string; strokeWidth?: number;
  draw?: number; fadeIn?: number;
}
```

### Arrow
```ts
interface ArrowProps extends LineProps {
  headSize?: number; // default: 10
}
```

### Rect
```ts
interface RectProps {
  x: number; y: number; width: number; height: number;
  stroke?: string; fill?: string; strokeWidth?: number; rx?: number;
  draw?: number; fadeIn?: number;
}
```

### Text
```ts
interface TextProps {
  x: number; y: number;
  fill?: string; fontSize?: number; fontFamily?: string;
  textAnchor?: 'start' | 'middle' | 'end';
  fadeIn?: number;
  children: string;
}
```

### Polygon
```ts
interface PolygonProps {
  points: [number, number][];
  stroke?: string; fill?: string; strokeWidth?: number;
  draw?: number; fadeIn?: number;
}
```

## Math Primitives

### Axes
```ts
interface AxesProps {
  domain: [number, number];
  range: [number, number];
  origin: [number, number];
  scale: number;
  showGrid?: boolean;
  axisColor?: string;
  gridColor?: string;
  tickSize?: number;
  labelFontSize?: number;
}
```

### FunctionPlot
```ts
interface FunctionPlotProps {
  fn: (x: number) => number;
  domain: [number, number];
  origin: [number, number];
  scale: number;
  stroke?: string; strokeWidth?: number;
  draw?: number;
  samples?: number; // default: 200
}
```

### Vector
```ts
interface VectorProps {
  vx: number; vy: number;
  origin: [number, number];
  scale: number;
  color?: string; strokeWidth?: number;
  label?: string;
  fadeIn?: number;
}
```

### VectorField
```ts
interface VectorFieldProps {
  fn: (x: number, y: number) => [number, number];
  domain: [number, number];
  range: [number, number];
  origin: [number, number];
  scale: number;
  color?: string;
  arrowScale?: number;
  normalize?: boolean;
  spacing?: number;
  fadeIn?: number;
}
```

### Matrix
```ts
interface MatrixProps {
  entries: string[][];
  x: number; y: number;
  color?: string;
  fontSize?: number;
  fadeIn?: number;
}
```

### Graph
```ts
interface GraphNode {
  id: string; x: number; y: number; label?: string;
}

interface GraphEdge {
  from: string; to: string;
  label?: string; weight?: number;
  directed?: boolean;
}

interface GraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeColor?: string; edgeColor?: string;
  nodeRadius?: number;
  fadeIn?: number;
}
```

### LaTeX
```ts
interface LaTeXProps {
  expression: string;
  x: number; y: number;
  fontSize?: number; // default: 24
  color?: string;    // default: '#e0e0e0'
  width?: number;    // default: 400
  height?: number;   // default: 100
  align?: 'left' | 'center' | 'right';
  fadeIn?: number;
}
```
