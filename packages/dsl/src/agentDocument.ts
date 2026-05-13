export { applyCommand } from './v2/commands';
export {
  applyNudge,
  suggestDocumentNudges,
  type ElucimDocumentNudge,
} from './v2/nudges';
export {
  inspectPolishHeuristics,
  type ElucimPolishHeuristicReport,
  type ElucimPolishReport,
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
  type ElucimAutoLayoutGroupPresetSpec,
  type ElucimBadgePresetSpec,
  type ElucimBoundaryPresetSpec,
  type ElucimCardGridPresetSpec,
  type ElucimComparisonTablePresetSpec,
  type ElucimConnectorPresetSpec,
  type ElucimDecisionNodePresetSpec,
  type ElucimProgressiveRevealGroupPresetSpec,
  type ElucimQueueStackPresetSpec,
  type ElucimStepCardPresetSpec,
  type ElucimTimelineRoadmapPresetSpec,
  type ElucimTextBlockPresetSpec,
} from './v2/composites';
export {
  planSemanticLayout,
  suggestSemanticLayoutNudges,
  type ElucimSemanticLayoutOptions,
  type ElucimSemanticLayoutPlan,
} from './v2/semanticLayout';
export { applyTimelineFrame } from './v2/timeline';
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
  type ElucimBeatPreviewOptions,
  type ElucimMotionBeatPlanSpec,
  type ElucimReducedMotionOptions,
  type ElucimSemanticMotionPresetSpec,
  type ElucimStateSnapshotMotionSpec,
} from './v2/motion';
export {
  diffDocuments,
  summarizeDocument,
  validateForAgent,
  type JsonPatchOperation,
} from './v2/services';
