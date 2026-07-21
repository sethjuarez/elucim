// ─── Elucim DSL Schema ──────────────────────────────────────────────────────
// Complete type definitions for the Elucim JSON DSL.
// Every Elucim capability is representable in this schema.

// ─── Document Root ──────────────────────────────────────────────────────────

export interface EditorProjection {
  /** JSON Schema URL for editor autocomplete */
  $schema?: string;
  /** Internal static tree root. Canonical documents remain the only import/export format. */
  /** Root node — a Scene or Player. */
  root: RootNode;
}

export type RootNode = SceneNode | PlayerNode;

/** Preset dimensions for common scene sizes */
export type ProjectionScenePreset = 'card' | 'slide' | 'square';

/** Coordinates of the scene region viewed by a camera. */
export interface ProjectionCameraViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Coordinate system used by a camera viewport. */
export type ProjectionCameraCoordinateSpace = 'scene' | 'normalized';

/** How a camera viewport is mapped onto the scene surface. */
export type ProjectionCameraFit = 'cover' | 'contain';

/** An evaluated timeline camera viewport used only while rendering. */
export interface ProjectionCameraNode {
  viewport: ProjectionCameraViewport;
  coordinateSpace?: ProjectionCameraCoordinateSpace;
  fit?: ProjectionCameraFit;
}

/** A frame-accurate camera viewport sample. */
export interface ProjectionCameraKeyframe {
  frame: number;
  viewport: ProjectionCameraViewport;
}

/** A semantic scene camera animation owned by a normalized timeline. */
export interface ProjectionCameraTrack {
  coordinateSpace?: ProjectionCameraCoordinateSpace;
  fit?: ProjectionCameraFit;
  keyframes: ProjectionCameraKeyframe[];
}

// ─── Container Nodes ────────────────────────────────────────────────────────

export interface SceneNode {
  type: 'scene';
  preset?: ProjectionScenePreset;
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames: number;
  background?: string;
  children: ElementNode[];
}

export interface PlayerNode {
  type: 'player';
  preset?: ProjectionScenePreset;
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames: number;
  background?: string;
  controls?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  children: ElementNode[];
}



// ─── Structural Nodes ───────────────────────────────────────────────────────



export interface GroupNode {
  type: 'group';
  id?: string;
  children: ElementNode[];
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

// ─── Primitive Nodes ────────────────────────────────────────────────────────

export interface BezierCurveNode {
  type: 'bezierCurve';
  id?: string;
  x1: number;
  y1: number;
  cx1: number;
  cy1: number;
  cx2?: number;
  cy2?: number;
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  strokeDasharray?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  startCap?: 'none' | 'arrow' | 'dot';
  endCap?: 'none' | 'arrow' | 'dot';
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface CircleNode {
  type: 'circle';
  id?: string;
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface LineNode {
  type: 'line';
  id?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  strokeLinecap?: 'butt' | 'round' | 'square';
  startCap?: 'none' | 'arrow' | 'dot';
  endCap?: 'none' | 'arrow' | 'dot';
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

/** @deprecated Use `line` or `bezierCurve` with `startCap`/`endCap` instead. */
export interface ArrowNode {
  type: 'arrow';
  id?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
  headSize?: number;
  strokeDasharray?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  strokeLinecap?: 'butt' | 'round' | 'square';
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface RectNode {
  type: 'rect';
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  ry?: number;
  strokeDasharray?: string;
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface PolygonNode {
  type: 'polygon';
  id?: string;
  points: [number, number][];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  closed?: boolean;
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface TextNode {
  type: 'text';
  id?: string;
  x: number;
  y: number;
  content: string;
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  textAnchor?: 'start' | 'middle' | 'end';
  dominantBaseline?: 'auto' | 'middle' | 'hanging' | 'central';
  maxWidth?: number;
  lineHeight?: number;
  wrap?: 'none' | 'word' | 'char';
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface TextBoxNode {
  type: 'textbox';
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  padding?: number | { x?: number; y?: number };
  fill?: string;
  fontSize?: number;
  minFontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  lineHeight?: number;
  align?: 'start' | 'middle' | 'end';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  autoFit?: 'none' | 'shrink' | 'truncate';
  background?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    radius?: number;
  };
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

// ─── Math Nodes ─────────────────────────────────────────────────────────────

export interface AxesNode {
  type: 'axes';
  id?: string;
  domain?: [number, number];
  range?: [number, number];
  origin?: [number, number];
  scale?: number;
  showGrid?: boolean;
  showTicks?: boolean;
  showLabels?: boolean;
  tickStep?: number;
  axisColor?: string;
  gridColor?: string;
  labelColor?: string;
  labelFontSize?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface FunctionPlotNode {
  type: 'functionPlot';
  /** Math expression string, e.g. "sin(x)", "x^2 - 1" */
  fn: string;
  domain?: [number, number];
  yClamp?: [number, number];
  origin?: [number, number];
  scale?: number;
  color?: string;
  strokeWidth?: number;
  samples?: number;
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface SecantLineNode {
  type: 'secantLine';
  id?: string;
  /** Math expression string, e.g. "x^2" */
  fn: string;
  /** First x value. */
  x: number;
  /** Horizontal distance to the second sample point. */
  dx: number;
  length?: number;
  origin?: [number, number];
  scale?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  label?: string;
  labelOffset?: [number, number];
  labelColor?: string;
  labelFontSize?: number;
  showPoints?: boolean;
  pointRadius?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface TangentLineNode {
  type: 'tangentLine';
  id?: string;
  /** Math expression string, e.g. "sin(x)" */
  fn: string;
  /** x value where the tangent touches the curve. */
  x: number;
  /** Optional exact derivative expression, e.g. "cos(x)" */
  derivative?: string;
  derivativeStep?: number;
  length?: number;
  origin?: [number, number];
  scale?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  label?: string;
  labelOffset?: [number, number];
  labelColor?: string;
  labelFontSize?: number;
  showPoints?: boolean;
  pointRadius?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface RiemannSumNode {
  type: 'riemannSum';
  id?: string;
  /** Math expression string, e.g. "x^2" */
  fn: string;
  interval: [number, number];
  n: number;
  method?: 'left' | 'right' | 'midpoint';
  origin?: [number, number];
  scale?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface AccumulationAreaNode {
  type: 'accumulationArea';
  id?: string;
  /** Math expression string, e.g. "sin(x) + 1" */
  fn: string;
  from: number;
  to: number;
  samples?: number;
  origin?: [number, number];
  scale?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface VectorNode {
  type: 'vector';
  id?: string;
  from?: [number, number];
  to: [number, number];
  origin?: [number, number];
  scale?: number;
  color?: string;
  strokeWidth?: number;
  headSize?: number;
  label?: string;
  labelOffset?: [number, number];
  labelColor?: string;
  labelFontSize?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface VectorFieldNode {
  type: 'vectorField';
  id?: string;
  /** Vector expression string, e.g. "[-y, x]" */
  fn: string;
  domain?: [number, number];
  range?: [number, number];
  step?: number;
  origin?: [number, number];
  scale?: number;
  arrowScale?: number;
  color?: string;
  strokeWidth?: number;
  headSize?: number;
  normalize?: boolean;
  maxLength?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface GraphNodeDef {
  id: string;
  x: number;
  y: number;
  label?: string;
  color?: string;
  radius?: number;
}

export interface GraphEdgeDef {
  from: string;
  to: string;
  color?: string;
  directed?: boolean;
  label?: string;
}

export interface GraphNode {
  type: 'graph';
  id?: string;
  nodes: GraphNodeDef[];
  edges: GraphEdgeDef[];
  nodeColor?: string;
  nodeRadius?: number;
  edgeColor?: string;
  edgeWidth?: number;
  labelColor?: string;
  labelFontSize?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface MatrixNode {
  type: 'matrix';
  id?: string;
  values: (number | string)[][];
  x?: number;
  y?: number;
  cellSize?: number;
  color?: string;
  bracketColor?: string;
  fontSize?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface LaTeXNode {
  type: 'latex';
  id?: string;
  /** LaTeX expression, e.g. "\\frac{a}{b}" */
  expression: string;
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

export interface BarChartBarDef {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartNode {
  type: 'barChart';
  id?: string;
  bars: BarChartBarDef[];
  x: number;
  y: number;
  width: number;
  height: number;
  barColor?: string;
  labelColor?: string;
  labelFontSize?: number;
  showValues?: boolean;
  maxValue?: number;
  gap?: number;
  valueFormat?: 'number' | 'percent';
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

// ─── Animation Wrapper Nodes ────────────────────────────────────────────────

export interface ImageNode {
  type: 'image';
  id?: string;
  /** Image URL or data URI. Used directly, or as fallback when ref is set. */
  src?: string;
  /** Opaque consumer reference resolved via ImageResolverProvider at render time. */
  ref?: string;
  /** Human-readable label for the image (shown in editor inspector). */
  displayName?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  preserveAspectRatio?: string;
  borderRadius?: number;
  clipShape?: 'none' | 'circle' | 'ellipse';
  opacity?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
}

// ─── Animation Wrapper Nodes (continued) ────────────────────────────────────

















// ─── Easing Specification ───────────────────────────────────────────────────

export type EasingName =
  | 'linear'
  | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad'
  | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic'
  | 'easeInQuart' | 'easeOutQuart' | 'easeInOutQuart'
  | 'easeInSine' | 'easeOutSine' | 'easeInOutSine'
  | 'easeInExpo' | 'easeOutExpo' | 'easeInOutExpo'
  | 'easeInBack' | 'easeOutBack'
  | 'easeOutElastic'
  | 'easeOutBounce';

export interface SpringEasing {
  type: 'spring';
  stiffness?: number;
  damping?: number;
  mass?: number;
}

export interface CubicBezierEasing {
  type: 'cubicBezier';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type ProjectionEasingSpec = EasingName | SpringEasing | CubicBezierEasing;

// ─── Element Union ──────────────────────────────────────────────────────────

export type ElementNode =
  // Structural
  | GroupNode
  // Primitives
  | BezierCurveNode
  | CircleNode
  | LineNode
  | ArrowNode
  | RectNode
  | PolygonNode
  | TextNode
  | TextBoxNode
  | ImageNode
  // Math
  | AxesNode
  | FunctionPlotNode
  | SecantLineNode
  | TangentLineNode
  | RiemannSumNode
  | AccumulationAreaNode
  | VectorNode
  | VectorFieldNode
  | MatrixNode
  | GraphNode
  | LaTeXNode
  | BarChartNode;
