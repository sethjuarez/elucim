export type {
  ElucimDocument as ElucimDocument,
  ElucimScene as ElucimScene,
  ElucimCamera as ElucimCamera,
  ElucimTimelineCamera as ElucimTimelineCamera,
  ElucimCameraKeyframe as ElucimCameraKeyframe,
  ElucimCameraViewport as ElucimCameraViewport,
  ElucimCameraCoordinateSpace as ElucimCameraCoordinateSpace,
  ElucimCameraFit as ElucimCameraFit,
  ElucimElement as ElucimElement,
  ElucimMetadata as ElucimMetadata,
  ElucimIntent as ElucimIntent,
  ElucimLayout as ElucimLayout,
  ElucimAnimatableProperty as ElucimAnimatableProperty,
  ElucimKeyframe as ElucimKeyframe,
  ElucimRevealCursor as ElucimRevealCursor,
  ElucimRevealEffect as ElucimRevealEffect,
  ElucimRevealStrategy as ElucimRevealStrategy,
  ElucimTimelineTrack as ElucimTimelineTrack,
  ElucimTimeline as ElucimTimeline,
  ElucimStateMachine as ElucimStateMachine,
  ElucimStateMachineInput as ElucimStateMachineInput,
  ElucimStateMachineLayout as ElucimStateMachineLayout,
  ElucimGraphPosition as ElucimGraphPosition,
  ElucimGraphViewport as ElucimGraphViewport,
  ElucimState as ElucimState,
  ElucimTransition as ElucimTransition,
} from './documentModel/types';

export type {
  ElucimCommand as ElucimCommand,
  ElucimCommandResult as ElucimCommandResult,
} from './documentModel/commands';

export type {
  ElucimExportPolicy as ElucimExportPolicy,
} from './documentModel/duration';

export type {
  ElucimDocumentSummary as ElucimDocumentSummary,
  ElucimElementSummary as ElucimElementSummary,
  ElucimRepairHint as ElucimRepairHint,
  ElucimAgentValidationResult as ElucimAgentValidationResult,
} from './documentModel/services';

export type {
  ElucimTimelineFrame as ElucimTimelineFrame,
  ElucimTimelineFrameSelection as ElucimTimelineFrameSelection,
  ElucimTimelinePatch as ElucimTimelinePatch,
} from './documentModel/timeline';

export type {
  ElucimStateEvent as ElucimStateEvent,
  ElucimStateMachineRun as ElucimStateMachineRun,
  ElucimStateMachineRunResult as ElucimStateMachineRunResult,
  ElucimStateMachineVisualFrame as ElucimStateMachineVisualFrame,
  ElucimStateMachineVisualFrameOptions as ElucimStateMachineVisualFrameOptions,
  ElucimStateTransitionResult as ElucimStateTransitionResult,
} from './documentModel/stateMachine';
// Deliberately omit ElucimStateSnapshot: motion exports a different ElucimStateSnapshot.

export type {
  NormalizeDocumentResult as NormalizeDocumentResult,
} from './documentModel/compatibility';

export {
  createDocumentFromRenderable as createDocumentFromRenderable,
  createRenderableDocument as createRenderableDocument,
  normalizeDocument as normalizeDocument,
  toRenderableDocument as toRenderableDocument,
} from './documentModel/compatibility';
export { validateDocument as validateDocument } from './documentModel/validateDocument';
export {
  getDocumentLinearDuration,
  getMaxTimelineDuration,
  resolveExportFrameCount,
} from './documentModel/duration';
export {
  applyTimelineFrame,
  applyTimelineFrames,
  evaluateTimelineCameraFrames,
  evaluateCameraTrack,
  evaluateTimeline,
  resolveTimelineReveals,
} from './documentModel/timeline';
export {
  advanceStateMachineRunFrame,
  dispatchStateMachineRunEvent,
  getInitialStateSnapshot,
  getStateMachineRunVisualFrames,
  getStateMachineVisualFrames,
  startStateMachineRun,
  transitionStateMachine,
} from './documentModel/stateMachine';
