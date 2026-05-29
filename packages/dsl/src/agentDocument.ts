export { applyCommand } from './documentModel/commands';
export {
  applyNudge,
  suggestDocumentNudges,
  type ElucimDocumentNudge,
} from './documentModel/nudges';
export {
  checkLayoutForAgent,
  type ElucimLayoutCheckResult,
  type ElucimLayoutIssue,
  repairLayoutForAgent,
  type ElucimAppliedLayoutRepair,
  type ElucimLayoutRepairOptions,
  type ElucimLayoutRepairResult,
  type ElucimSkippedLayoutRepair,
  type ElucimSkippedLayoutRepairReason,
  suggestLayoutRepairsForAgent,
  type ElucimLayoutRepairSuggestion,
} from './documentModel/layoutCheck';
export {
  inspectPolishHeuristics,
  type ElucimPolishHeuristicReport,
  type ElucimPolishReport,
} from './documentModel/polish';
export {
  createAgentSafeDocument,
  createComparisonScenePreset,
  createTextCalloutScenePreset,
  createThreeCardFlowScenePreset,
  type ElucimAgentSafeDocumentOptions,
  type ElucimAgentSafeScenePreset,
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
  type ElucimTextBoxPresetSpec,
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
