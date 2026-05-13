export { applyCommand } from './documentModel/commands';
export {
  applyNudge,
  suggestDocumentNudges,
  type ElucimDocumentNudge,
} from './documentModel/nudges';
export {
  inspectPolishHeuristics,
  type ElucimPolishHeuristicReport,
  type ElucimPolishReport,
} from './documentModel/polish';
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
} from './documentModel/composites';
export {
  planSemanticLayout,
  suggestSemanticLayoutNudges,
  type ElucimSemanticLayoutOptions,
  type ElucimSemanticLayoutPlan,
} from './documentModel/semanticLayout';
export { applyTimelineFrame } from './documentModel/timeline';
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
} from './documentModel/motion';
export {
  diffDocuments,
  summarizeDocument,
  validateForAgent,
  type JsonPatchOperation,
} from './documentModel/services';
