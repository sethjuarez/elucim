import type { ScenePreset, EasingSpec } from '../schema/types';

export type ElucimVersion = '2.0';

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
  | 'content'
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

export type ElucimRevealStrategy = 'auto' | 'type' | 'fade';

export interface ElucimRevealCursor {
  character?: string;
  blinkEveryFrames?: number;
  hideWhenComplete?: boolean;
}

/**
 * A procedural animation scheduled by a timeline rather than a property track.
 *
 * `duration` is the reveal duration for each resolved leaf target. When a
 * target expands to several descendants, `staggerInFrames` offsets each leaf.
 */
export interface ElucimRevealEffect {
  id: string;
  kind: 'reveal';
  targets: string[];
  from: number;
  duration: number;
  strategy?: ElucimRevealStrategy;
  staggerInFrames?: number;
  cursor?: boolean | ElucimRevealCursor;
}

export interface ElucimTimeline {
  id: string;
  duration: number;
  tracks: ElucimTimelineTrack[];
  effects?: ElucimRevealEffect[];
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
