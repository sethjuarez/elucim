// @elucim/dsl — JSON DSL for creating Elucim diagrams

// Schema types
export type {
  ElucimDocument,
  RootNode,
  SceneNode,
  PlayerNode,
  PresentationNode,
  SlideNode,
  SequenceNode,
  GroupNode,
  ElementNode,
  CircleNode,
  LineNode,
  ArrowNode,
  RectNode,
  PolygonNode,
  TextNode,
  AxesNode,
  FunctionPlotNode,
  VectorNode,
  VectorFieldNode,
  MatrixNode,
  GraphNode,
  LaTeXNode,
  FadeInNode,
  FadeOutNode,
  DrawNode,
  WriteNode,
  TransformNode,
  MorphNode,
  StaggerNode,
  ParallelNode,
  EasingSpec,
  SpringEasing,
  CubicBezierEasing,
  GraphNodeDef,
  GraphEdgeDef,
  BarChartNode,
  BarChartBarDef,
} from './schema/types';

// Math expression evaluator
export {
  compileExpression,
  compileVectorExpression,
  validateExpression,
} from './math/evaluator';

// Validator
export {
  validate,
  type ValidationError,
  type ValidationResult,
} from './validator/validate';

// Renderer
export { DslRenderer, type DslRendererProps } from './renderer/DslRenderer';

// Easing resolver
export { resolveEasing } from './renderer/resolveEasing';

// Builders — fluent API for programmatic presentation authoring
export {
  presentation,
  PresentationBuilder,
  type PresentationOptions,
} from './builders/PresentationBuilder';
export { SlideBuilder } from './builders/SlideBuilder';
export { darkTheme, lightTheme, type Theme } from './builders/themes';
