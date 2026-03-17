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
  BezierCurveNode,
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
  ImageNode,
  ScenePreset,
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
export { DslRenderer, type DslRendererProps, type DslRendererRef, type ElucimTheme } from './renderer/DslRenderer';
export { renderToSvgString, type RenderToSvgStringOptions } from './renderer/renderToSvgString';
export { renderToPng, type RenderToPngOptions } from './renderer/renderToPng';
export {
  renderRoot,
  renderScene,
  renderPlayer,
  renderPresentation,
  renderSlide,
  renderElement,
  type RenderRootOverrides,
} from './renderer/renderElements';

// Easing resolver
export { resolveEasing } from './renderer/resolveEasing';

// Color token resolver
export { resolveColor, SEMANTIC_TOKENS, TOKEN_NAMES } from './renderer/resolveColor';

// Builders — fluent API for programmatic presentation authoring
export {
  presentation,
  PresentationBuilder,
  type PresentationOptions,
} from './builders/PresentationBuilder';
export { SlideBuilder } from './builders/SlideBuilder';
export { darkTheme, lightTheme, type Theme } from './builders/themes';
