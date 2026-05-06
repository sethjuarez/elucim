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

export type {
  ElucimV2Document,
  ElucimV2Scene,
  ElucimV2Element,
  ElucimV2Metadata,
  ElucimV2Intent,
  ElucimV2Layout,
  ElucimV2Timeline,
  ElucimV2TimelineTrack,
  ElucimV2Keyframe,
  ElucimV2StateMachine,
  ElucimV2State,
  ElucimV2Transition,
} from './v2/types';
export { migrateV1ToV2, migrateV2ToV1, normalizeToV2, toRenderableV1, type NormalizeToV2Result } from './v2/migrate';
export { validateV2 } from './v2/validateV2';
export { applyCommand, type ElucimV2Command, type ElucimV2CommandResult } from './v2/commands';
export {
  summarizeDocument,
  validateForAgent,
  diffDocuments,
  type ElucimV2DocumentSummary,
  type ElucimV2ElementSummary,
  type ElucimV2RepairHint,
  type ElucimV2AgentValidationResult,
  type JsonPatchOperation,
} from './v2/services';
export {
  evaluateTimeline,
  applyTimelineFrame,
  type ElucimV2TimelineFrame,
  type ElucimV2TimelinePatch,
} from './v2/timeline';
export {
  getInitialStateSnapshot,
  transitionStateMachine,
  type ElucimV2StateSnapshot,
  type ElucimV2StateTransitionResult,
} from './v2/stateMachine';
export {
  suggestDocumentNudges,
  applyNudge,
  type ElucimV2Nudge,
  type ElucimV2NudgeResult,
} from './v2/nudges';

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
export { DslRenderer, type DslRendererProps, type DslRendererRef } from './renderer/DslRenderer';
export { renderToSvgString, type RenderToSvgStringOptions } from './renderer/renderToSvgString';
export { renderToPng, stripCssFunctions, type RenderToPngOptions } from './renderer/renderToPng';
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

// Color token resolver (canonical source: @elucim/core)
export { resolveColor, SEMANTIC_TOKENS, TOKEN_NAMES } from '@elucim/core';

// Theme (canonical source: @elucim/core)
export type { ElucimTheme, ThemeColorScheme, NormalizedElucimTheme } from '@elucim/core';
export { DARK_THEME, LIGHT_THEME, themeToVars, getThemeDefaults, normalizeTheme, DARK_THEME_VARS, LIGHT_THEME_VARS } from '@elucim/core';

// Image resolver (canonical source: @elucim/core)
export { ImageResolverProvider, useImageResolver, type ImageResolverFn } from '@elucim/core';

// Builders — fluent API for programmatic presentation authoring
export {
  presentation,
  PresentationBuilder,
  type PresentationOptions,
} from './builders/PresentationBuilder';
export { SlideBuilder } from './builders/SlideBuilder';
export { darkTheme, lightTheme, deckDarkTheme, deckLightTheme, type BuilderTheme, type Theme } from './builders/themes';

// YAML parser
export { fromYaml, ElucimYamlError } from './yaml/fromYaml';
