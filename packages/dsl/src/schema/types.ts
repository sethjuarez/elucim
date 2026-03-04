// ─── Elucim DSL Schema ──────────────────────────────────────────────────────
// Complete type definitions for the Elucim JSON DSL.
// Every Elucim capability is representable in this schema.

// ─── Document Root ──────────────────────────────────────────────────────────

export interface ElucimDocument {
  /** JSON Schema URL for editor autocomplete */
  $schema?: string;
  /** DSL version */
  version: '1.0';
  /** Root node — a Scene, Player, or Presentation */
  root: RootNode;
}

export type RootNode = SceneNode | PlayerNode | PresentationNode;

// ─── Container Nodes ────────────────────────────────────────────────────────

export interface SceneNode {
  type: 'scene';
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames: number;
  background?: string;
  children: ElementNode[];
}

export interface PlayerNode {
  type: 'player';
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

export interface PresentationNode {
  type: 'presentation';
  width?: number;
  height?: number;
  background?: string;
  transition?: TransitionType;
  transitionDuration?: number;
  showHud?: boolean;
  showNotes?: boolean;
  slides: SlideNode[];
}

export type TransitionType = 'none' | 'fade' | 'slide-left' | 'slide-up' | 'zoom';

export interface SlideNode {
  type: 'slide';
  title?: string;
  notes?: string;
  background?: string;
  children: ElementNode[];
}

// ─── Structural Nodes ───────────────────────────────────────────────────────

export interface SequenceNode {
  type: 'sequence';
  from: number;
  durationInFrames?: number;
  name?: string;
  children: ElementNode[];
}

export interface GroupNode {
  type: 'group';
  children: ElementNode[];
}

// ─── Primitive Nodes ────────────────────────────────────────────────────────

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
  fadeIn?: number;
  fadeOut?: number;
  draw?: number;
  easing?: EasingSpec;
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
  opacity?: number;
  fadeIn?: number;
  fadeOut?: number;
  draw?: number;
  easing?: EasingSpec;
}

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
  opacity?: number;
  fadeIn?: number;
  fadeOut?: number;
  draw?: number;
  easing?: EasingSpec;
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
  opacity?: number;
  fadeIn?: number;
  fadeOut?: number;
  draw?: number;
  easing?: EasingSpec;
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
  fadeIn?: number;
  fadeOut?: number;
  draw?: number;
  easing?: EasingSpec;
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
  opacity?: number;
  fadeIn?: number;
  fadeOut?: number;
  easing?: EasingSpec;
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
  fadeIn?: number;
  fadeOut?: number;
  draw?: number;
  easing?: EasingSpec;
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
  draw?: number;
  easing?: EasingSpec;
  opacity?: number;
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
  fadeIn?: number;
  fadeOut?: number;
  draw?: number;
  easing?: EasingSpec;
}

export interface VectorFieldNode {
  type: 'vectorField';
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
  fadeIn?: number;
  fadeOut?: number;
  easing?: EasingSpec;
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
  fadeIn?: number;
  fadeOut?: number;
  easing?: EasingSpec;
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
  fadeIn?: number;
  fadeOut?: number;
  easing?: EasingSpec;
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
  fadeIn?: number;
  fadeOut?: number;
  easing?: EasingSpec;
}

// ─── Animation Wrapper Nodes ────────────────────────────────────────────────

export interface FadeInNode {
  type: 'fadeIn';
  duration?: number;
  easing?: EasingSpec;
  children: ElementNode[];
}

export interface FadeOutNode {
  type: 'fadeOut';
  duration?: number;
  totalFrames?: number;
  easing?: EasingSpec;
  children: ElementNode[];
}

export interface DrawNode {
  type: 'draw';
  duration?: number;
  easing?: EasingSpec;
  pathLength?: number;
  children: ElementNode[];
}

export interface WriteNode {
  type: 'write';
  duration?: number;
  easing?: EasingSpec;
  children: ElementNode[];
}

export interface TransformNode {
  type: 'transform';
  duration?: number;
  easing?: EasingSpec;
  translate?: { from: [number, number]; to: [number, number] };
  scale?: { from: number; to: number };
  rotate?: { from: number; to: number };
  opacity?: { from: number; to: number };
  children: ElementNode[];
}

export interface MorphNode {
  type: 'morph';
  duration?: number;
  easing?: EasingSpec;
  fromColor?: string;
  toColor?: string;
  fromOpacity?: number;
  toOpacity?: number;
  fromScale?: number;
  toScale?: number;
  children: ElementNode[];
}

export interface StaggerNode {
  type: 'stagger';
  staggerDelay?: number;
  easing?: EasingSpec;
  children: ElementNode[];
}

export interface ParallelNode {
  type: 'parallel';
  children: ElementNode[];
}

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

export type EasingSpec = EasingName | SpringEasing | CubicBezierEasing;

// ─── Element Union ──────────────────────────────────────────────────────────

export type ElementNode =
  // Structural
  | SequenceNode
  | GroupNode
  // Primitives
  | CircleNode
  | LineNode
  | ArrowNode
  | RectNode
  | PolygonNode
  | TextNode
  // Math
  | AxesNode
  | FunctionPlotNode
  | VectorNode
  | VectorFieldNode
  | MatrixNode
  | GraphNode
  | LaTeXNode
  // Animation wrappers
  | FadeInNode
  | FadeOutNode
  | DrawNode
  | WriteNode
  | TransformNode
  | MorphNode
  | StaggerNode
  | ParallelNode
  // Nested containers (e.g., Player inside a Slide)
  | PlayerNode
  | SceneNode;
