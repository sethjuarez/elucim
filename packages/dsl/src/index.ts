// @elucim/dsl — JSON DSL for creating Elucim diagrams

// Schema types
export type {
  ElucimDocument as RenderableDocument,
  RootNode,
  SceneNode,
  PlayerNode,
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
  ElucimV2Document as ElucimDocument,
  ElucimV2Scene,
  ElucimV2Element,
  ElucimV2Metadata,
  ElucimV2Intent,
  ElucimV2Layout,
  ElucimV2Timeline,
  ElucimV2TimelineTrack,
  ElucimV2Keyframe,
  ElucimV2StateMachine,
  ElucimV2StateMachineInput,
  ElucimV2State,
  ElucimV2Transition,
} from './v2/types';
export { migrateV1ToV2, migrateV2ToV1, normalizeToV2, toRenderableV1, type NormalizeToV2Result } from './v2/migrate';
export { validateV2 } from './v2/validateV2';
export { DEFAULT_LINEAR_DURATION_IN_FRAMES, getDocumentLinearDuration, getMaxTimelineDuration, resolveExportFrameCount, type ElucimV2ExportPolicy } from './v2/duration';
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
  applyTimelineFrames,
  type ElucimV2TimelineFrame,
  type ElucimV2TimelineFrameSelection,
  type ElucimV2TimelinePatch,
} from './v2/timeline';
export {
  getInitialStateSnapshot,
  startStateMachineRun,
  dispatchStateMachineRunEvent,
  advanceStateMachineRunFrame,
  getStateMachineRunVisualFrames,
  getStateMachineVisualFrames,
  transitionStateMachine,
  type ElucimV2StateEvent,
  type ElucimV2StateMachineRun,
  type ElucimV2StateMachineRunResult,
  type ElucimV2StateMachineVisualFrame,
  type ElucimV2StateMachineVisualFrameOptions,
  type ElucimV2StateSnapshot,
  type ElucimV2StateTransitionResult,
} from './v2/stateMachine';
export {
  suggestDocumentNudges,
  applyNudge,
  type ElucimDocumentNudge,
  type ElucimDocumentNudgeResult,
} from './v2/nudges';
export {
  analyzePolish,
  collectElementBounds,
  createCalloutCardPreset,
  getSmoothConnectorCandidates,
  inspectPolishHeuristics,
  layoutGraphLayered,
  type ElucimCalloutCardPresetSpec,
  type ElucimColorHeuristic,
  type ElucimConnectorContinuationHeuristic,
  type ElucimElementIntersection,
  type ElucimPresetElement,
  type ElucimPolishCategory,
  type ElucimPolishDiagnostic,
  type ElucimPolishHeuristicReport,
  type ElucimPolishReport,
  type ElucimPolishScore,
  type ElucimPolishSeverity,
  type ElucimGraphEdgeCrossing,
  type ElucimGraphEdgeLayout,
  type ElucimGraphHeuristic,
  type ElucimGraphNodeLayout,
  type ElucimGraphNodeOverlap,
  type ElucimOffCanvasHeuristic,
  type ElucimSemanticRelationshipHeuristic,
  type ElucimTextHeuristic,
} from './v2/polish';
export {
  createAutoLayoutGroupPreset,
  createBadgePreset,
  createBoundaryPreset,
  createCardGridPreset,
  createComparisonTablePreset,
  createConnectorPreset,
  createDecisionNodePreset,
  createProgressiveRevealGroupPreset,
  createQueueStackPreset,
  createTimelineRoadmapPreset,
  createStepCardPreset,
  createTextBlockPreset,
  type ElucimAutoLayoutDirection,
  type ElucimAutoLayoutGroupItemSpec,
  type ElucimAutoLayoutGroupPresetSpec,
  type ElucimBadgePresetSpec,
  type ElucimBoundaryPresetSpec,
  type ElucimCardGridItemSpec,
  type ElucimCardGridPresetSpec,
  type ElucimCompositeElement,
  type ElucimComparisonTablePresetSpec,
  type ElucimConnectorAnchor,
  type ElucimConnectorCurve,
  type ElucimConnectorPresetSpec,
  type ElucimDecisionNodePresetSpec,
  type ElucimProgressiveRevealGroupPreset,
  type ElucimProgressiveRevealGroupPresetSpec,
  type ElucimQueueStackItemSpec,
  type ElucimQueueStackPresetSpec,
  type ElucimRoadmapMilestoneSpec,
  type ElucimRoadmapOrientation,
  type ElucimStepCardPresetSpec,
  type ElucimTimelineRoadmapPresetSpec,
  type ElucimTextAlign,
  type ElucimTextBlockPresetSpec,
} from './v2/composites';
export {
  applySemanticLayoutNudge,
  planSemanticLayout,
  suggestSemanticLayoutNudges,
  type ElucimSemanticLayoutDirection,
  type ElucimSemanticLayoutOptions,
  type ElucimSemanticLayoutPlan,
} from './v2/semanticLayout';

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

// YAML parser
export { fromYaml, ElucimYamlError } from './yaml/fromYaml';
