import type { ElementNode, ElucimStateMachine, ElucimTimeline, ElucimTransition } from '@elucim/editor-projection';

export type GraphLayoutDirection = 'horizontal' | 'vertical';

export interface StateMachinePreviewState {
  machineId: string;
  stateId: string;
  timelineId?: string;
  event?: string;
  previousStateId?: string;
  activeTransitionId?: string;
  logicalStatePath?: string[];
  exited?: boolean;
  finished?: boolean;
}

export interface StateMachineGraphNodeData extends Record<string, unknown> {
  kind: 'entry' | 'state' | 'exit';
  stateId: string;
  timeline?: string;
  selected: boolean;
  direction: GraphLayoutDirection;
  canDelete?: boolean;
  onDelete?: () => void;
}

export interface StateMachineGraphEdgeData extends Record<string, unknown> {
  label: string;
  detail?: string;
  stateId?: string;
  selected: boolean;
  backEdge: boolean;
  direction: GraphLayoutDirection;
  onSelect?: () => void;
}

export interface SelectedTimelineItem {
  type: 'animation';
  timelineId: string;
  trackIndex?: number;
  keyframeIndex?: number;
}

export interface SelectedStateMachineItem {
  type: 'stateMachine';
  machineId: string;
  stateId?: string;
  transitionEvent?: string;
}

export type SelectedMotionItem = SelectedTimelineItem | SelectedStateMachineItem;

export interface TrackRow {
  element: ElementNode;
  id: string;
  label: string;
  rootIndex: number;
  depth: number;
  hasChildren: boolean;
  isTopLevel: boolean;
}

export type TimelineTrack = ElucimTimeline['tracks'][number];
export type TimelineKeyframe = TimelineTrack['keyframes'][number];
export type StateMachineState = ElucimStateMachine['states'][string];
export type StateMachineTransitionPatch = Partial<ElucimTransition>;
