import type {
  CameraNode,
  CameraTrack,
  EasingSpec,
  ScenePreset,
} from '../schema/types';

export type ElucimVersion = '2.0';
export type ElucimCamera = CameraNode;
export type ElucimTimelineCamera = CameraTrack;
export type ElucimCameraKeyframe = CameraTrack['keyframes'][number];
export type ElucimCameraViewport = CameraNode['viewport'];
export type ElucimCameraCoordinateSpace = NonNullable<CameraNode['coordinateSpace']>;
export type ElucimCameraFit = NonNullable<CameraNode['fit']>;

export interface ElucimDocument {
  $schema?: string;
  version: ElucimVersion;
  scene: ElucimScene;
  elements: Record<string, ElucimElement>;
  timelines?: Record<string, ElucimTimeline>;
  stateMachines?: Record<string, ElucimStateMachine>;
  defaultStateMachine?: string;
  metadata?: ElucimMetadata;
}

export interface ElucimScene {
  type: 'scene' | 'player';
  preset?: ScenePreset;
  width?: number;
  height?: number;
  fps?: number;
  background?: string;
  controls?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  children: string[];
}

export interface ElucimMetadata {
  title?: string;
  intent?: string;
  polishLevel?: 'draft' | 'refined' | 'final';
  generatedBy?: string;
  notes?: string[];
}

export interface ElucimIntent {
  role?: string;
  description?: string;
  importance?: 'primary' | 'secondary' | 'supporting' | 'decorative';
  target?: string;
  flowFrom?: string[];
  flowTo?: string[];
  relationship?: string;
  group?: string;
  generated?: boolean;
  polishLevel?: 'draft' | 'refined' | 'final';
  hints?: string[];
}

export interface ElucimLayout {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  rotationOrigin?: [number, number];
  scale?: number | [number, number];
  translate?: [number, number];
  zIndex?: number;
  role?: string;
  rank?: number;
  locked?: boolean;
}

export interface ElucimElement {
  id: string;
  type: string;
  parentId?: string;
  children?: string[];
  role?: string;
  intent?: ElucimIntent;
  layout?: ElucimLayout;
  props: Record<string, unknown>;
}

export type ElucimAnimatableProperty =
  | 'opacity'
  | 'translate'
  | 'scale'
  | 'rotate'
  | 'fill'
  | 'stroke'
  | 'x'
  | 'dx'
  | 'from'
  | 'to'
  | 'n';

export interface ElucimKeyframe {
  frame: number;
  value: unknown;
  easing?: EasingSpec;
}

export interface ElucimTimelineTrack {
  target: string;
  property: ElucimAnimatableProperty;
  keyframes: ElucimKeyframe[];
}

export interface ElucimTimeline {
  id: string;
  duration: number;
  tracks: ElucimTimelineTrack[];
  /** Optional scene-level camera animation for this timeline. */
  camera?: CameraTrack;
}

export interface ElucimStateMachine {
  id: string;
  entry: string;
  inputs?: Record<string, ElucimStateMachineInput>;
  states: Record<string, ElucimState>;
  transitions?: ElucimTransition[];
  layout?: ElucimStateMachineLayout;
}

export type ElucimStateMachineInput =
  | { type: 'trigger' }
  | { type: 'boolean'; default?: boolean }
  | { type: 'number'; default?: number };

export interface ElucimStateMachineLayout {
  entry?: ElucimGraphPosition;
  states?: Record<string, ElucimGraphPosition>;
  viewport?: ElucimGraphViewport;
}

export interface ElucimGraphPosition {
  x: number;
  y: number;
}

export interface ElucimGraphViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface ElucimState {
  timeline?: string;
}

export interface ElucimTransition {
  id: string;
  from: string | 'entry' | 'any';
  to: string | 'entry' | 'exit';
  trigger?: string;
  key?: string;
  exitTime?: number;
}
