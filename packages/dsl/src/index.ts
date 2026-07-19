// @elucim/dsl — JSON DSL for creating Elucim diagrams

// Schema types
export type {
  ElucimAgentValidationResult,
  ElucimAnimatableProperty,
  ElucimCommand,
  ElucimCommandResult,
  ElucimDocument,
  ElucimDocumentSummary,
  ElucimCamera,
  ElucimCameraCoordinateSpace,
  ElucimCameraFit,
  ElucimCameraKeyframe,
  ElucimCameraViewport,
  ElucimElement,
  ElucimElementSummary,
  ElucimExportPolicy,
  ElucimGraphPosition,
  ElucimGraphViewport,
  ElucimIntent,
  ElucimKeyframe,
  ElucimRevealCursor,
  ElucimRevealEffect,
  ElucimRevealStrategy,
  ElucimLayout,
  ElucimMetadata,
  ElucimRepairHint,
  ElucimScene,
  ElucimState,
  ElucimStateEvent,
  ElucimStateMachine,
  ElucimStateMachineInput,
  ElucimStateMachineLayout,
  ElucimStateMachineRun,
  ElucimStateMachineRunResult,
  ElucimStateMachineVisualFrame,
  ElucimStateMachineVisualFrameOptions,
  ElucimStateTransitionResult,
  ElucimTimeline,
  ElucimTimelineCamera,
  ElucimTimelineFrame,
  ElucimTimelineFrameSelection,
  ElucimTimelinePatch,
  ElucimTimelineTrack,
  ElucimTransition,
  NormalizeDocumentResult,
} from './document';
export {
  createDocumentFromRenderable,
  createRenderableDocument,
  getDocumentLinearDuration,
  getMaxTimelineDuration,
  resolveExportFrameCount,
  normalizeDocument,
  toRenderableDocument,
  validateDocument,
} from './document';

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
  TextBoxNode,
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
  CameraNode,
  CameraTrack,
  CameraKeyframe,
  CameraViewport,
  CameraCoordinateSpace,
  CameraFit,
  ImageNode,
  ScenePreset,
} from './schema/types';

export { DEFAULT_LINEAR_DURATION_IN_FRAMES } from './documentModel/duration';
export { SceneCameraViewport, resolveCameraViewport } from './renderer/CameraViewport';
export { applyCommand } from './documentModel/commands';
export {
  summarizeDocument,
  validateForAgent,
  diffDocuments,
  type JsonPatchOperation,
} from './documentModel/services';
export {
  evaluateTimeline,
  evaluateCameraTrack,
  applyTimelineFrame,
  applyTimelineFrames,
  resolveTimelineReveals,
  evaluateTimelineCameraFrames,
} from './documentModel/timeline';
export {
  getInitialStateSnapshot,
  startStateMachineRun,
  dispatchStateMachineRunEvent,
  advanceStateMachineRunFrame,
  getStateMachineRunVisualFrames,
  getStateMachineVisualFrames,
  transitionStateMachine,
} from './documentModel/stateMachine';
export {
  suggestDocumentNudges,
  applyNudge,
  type ElucimDocumentNudge,
  type ElucimDocumentNudgeResult,
} from './documentModel/nudges';
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
} from './documentModel/polish';
export {
  checkLayoutForAgent,
  repairLayoutForAgent,
  suggestLayoutRepairsForAgent,
  type ElucimAppliedLayoutRepair,
  type ElucimLayoutCheckCode,
  type ElucimLayoutCheckOptions,
  type ElucimLayoutCheckResult,
  type ElucimLayoutCheckSeverity,
  type ElucimLayoutIssue,
  type ElucimLayoutRepairAction,
  type ElucimLayoutRepairCliCommand,
  type ElucimLayoutRepairCommand,
  type ElucimLayoutRepairConfidence,
  type ElucimLayoutRepairOptions,
  type ElucimLayoutRepairPatch,
  type ElucimLayoutRepairResult,
  type ElucimLayoutRepairSuggestion,
  type ElucimSkippedLayoutRepair,
  type ElucimSkippedLayoutRepairReason,
} from './documentModel/layoutCheck';
export {
  createAgentSafeDocument,
  createCalculusAccumulationScenePreset,
  createCalculusDerivativeScenePreset,
  createCalculusRiemannScenePreset,
  createComparisonScenePreset,
  createTextCalloutScenePreset,
  createThreeCardFlowScenePreset,
  type ElucimAgentSafeDocumentOptions,
  type ElucimAgentSafeScenePreset,
  type ElucimCalculusAccumulationSceneSpec,
  type ElucimCalculusDerivativeSceneSpec,
  type ElucimCalculusRiemannSceneSpec,
  type ElucimComparisonSceneRowSpec,
  type ElucimComparisonSceneSpec,
  type ElucimTextCalloutSceneSpec,
  type ElucimThreeCardFlowItemSpec,
  type ElucimThreeCardFlowSceneSpec,
} from './documentModel/agentSafeTemplates';
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
  createTextBoxPreset,
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
  type ElucimTextBoxPresetSpec,
} from './documentModel/composites';
export {
  applySemanticLayoutNudge,
  planSemanticLayout,
  suggestSemanticLayoutNudges,
  type ElucimSemanticLayoutDirection,
  type ElucimSemanticLayoutOptions,
  type ElucimSemanticLayoutPlan,
} from './documentModel/semanticLayout';
export {
  createAutoStaggerTimeline,
  createReducedMotionDocument,
  createSemanticMotionTimeline,
  createStateSnapshotMotion,
  holdFinalFrame,
  lintMotion,
  planMotionBeats,
  previewBeatDiffs,
  type ElucimAutoStaggerMotionSpec,
  type ElucimBeatPreviewDiff,
  type ElucimBeatPreviewOptions,
  type ElucimMotionBeat,
  type ElucimMotionBeatPlanSpec,
  type ElucimMotionBeatRole,
  type ElucimMotionLintCode,
  type ElucimMotionLintIssue,
  type ElucimMotionLintOptions,
  type ElucimMotionLintReport,
  type ElucimReducedMotionOptions,
  type ElucimSemanticMotionPreset,
  type ElucimSemanticMotionPresetSpec,
  type ElucimStateSnapshot,
  type ElucimStateSnapshotMotion,
  type ElucimStateSnapshotMotionSpec,
} from './documentModel/motion';

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
