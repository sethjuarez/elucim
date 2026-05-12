export type {
  ElucimV2Document as ElucimDocument,
  ElucimV2Scene as ElucimScene,
  ElucimV2Element as ElucimElement,
  ElucimV2Metadata as ElucimMetadata,
  ElucimV2Intent as ElucimIntent,
  ElucimV2Layout as ElucimLayout,
  ElucimV2AnimatableProperty as ElucimAnimatableProperty,
  ElucimV2Keyframe as ElucimKeyframe,
  ElucimV2TimelineTrack as ElucimTimelineTrack,
  ElucimV2Timeline as ElucimTimeline,
  ElucimV2StateMachine as ElucimStateMachine,
  ElucimV2StateMachineInput as ElucimStateMachineInput,
  ElucimV2StateMachineLayout as ElucimStateMachineLayout,
  ElucimV2GraphPosition as ElucimGraphPosition,
  ElucimV2GraphViewport as ElucimGraphViewport,
  ElucimV2State as ElucimState,
  ElucimV2Transition as ElucimTransition,
} from './v2/types';

export type {
  ElucimV2Command as ElucimCommand,
  ElucimV2CommandResult as ElucimCommandResult,
} from './v2/commands';

export type {
  ElucimV2ExportPolicy as ElucimExportPolicy,
} from './v2/duration';

export type {
  ElucimV2DocumentSummary as ElucimDocumentSummary,
  ElucimV2ElementSummary as ElucimElementSummary,
  ElucimV2RepairHint as ElucimRepairHint,
  ElucimV2AgentValidationResult as ElucimAgentValidationResult,
} from './v2/services';

export type {
  ElucimV2TimelineFrame as ElucimTimelineFrame,
  ElucimV2TimelineFrameSelection as ElucimTimelineFrameSelection,
  ElucimV2TimelinePatch as ElucimTimelinePatch,
} from './v2/timeline';

export type {
  ElucimV2StateEvent as ElucimStateEvent,
  ElucimV2StateMachineRun as ElucimStateMachineRun,
  ElucimV2StateMachineRunResult as ElucimStateMachineRunResult,
  ElucimV2StateMachineVisualFrame as ElucimStateMachineVisualFrame,
  ElucimV2StateMachineVisualFrameOptions as ElucimStateMachineVisualFrameOptions,
  ElucimV2StateTransitionResult as ElucimStateTransitionResult,
} from './v2/stateMachine';
// Deliberately omit ElucimV2StateSnapshot: motion exports a different ElucimStateSnapshot.

export type {
  NormalizeToV2Result as NormalizeDocumentResult,
} from './v2/migrate';

export {
  migrateV1ToV2 as createDocumentFromRenderable,
  migrateV2ToV1 as createRenderableDocument,
  normalizeToV2 as normalizeDocument,
  toRenderableV1 as toRenderableDocument,
} from './v2/migrate';
export { validateV2 as validateDocument } from './v2/validateV2';
