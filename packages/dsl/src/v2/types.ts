import type { ScenePreset, EasingSpec } from '../schema/types';

export type ElucimV2Version = '2.0';

export interface ElucimV2Document {
  $schema?: string;
  version: ElucimV2Version;
  scene: ElucimV2Scene;
  elements: Record<string, ElucimV2Element>;
  timelines?: Record<string, ElucimV2Timeline>;
  stateMachines?: Record<string, ElucimV2StateMachine>;
  metadata?: ElucimV2Metadata;
}

export interface ElucimV2Scene {
  type: 'scene' | 'player';
  preset?: ScenePreset;
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames: number;
  background?: string;
  controls?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  children: string[];
}

export interface ElucimV2Metadata {
  title?: string;
  intent?: string;
  polishLevel?: 'draft' | 'refined' | 'final';
  generatedBy?: string;
  notes?: string[];
}

export interface ElucimV2Intent {
  role?: string;
  description?: string;
  importance?: 'primary' | 'secondary' | 'supporting' | 'decorative';
  generated?: boolean;
  polishLevel?: 'draft' | 'refined' | 'final';
  hints?: string[];
}

export interface ElucimV2Layout {
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
}

export interface ElucimV2Element {
  id: string;
  type: string;
  parentId?: string;
  children?: string[];
  role?: string;
  intent?: ElucimV2Intent;
  layout?: ElucimV2Layout;
  props: Record<string, unknown>;
}

export type ElucimV2AnimatableProperty =
  | 'opacity'
  | 'translate'
  | 'scale'
  | 'rotate'
  | 'fill'
  | 'stroke';

export interface ElucimV2Keyframe {
  frame: number;
  value: unknown;
  easing?: EasingSpec;
}

export interface ElucimV2TimelineTrack {
  target: string;
  property: ElucimV2AnimatableProperty;
  keyframes: ElucimV2Keyframe[];
}

export interface ElucimV2Timeline {
  id: string;
  duration: number;
  tracks: ElucimV2TimelineTrack[];
}

export interface ElucimV2StateMachine {
  id: string;
  initial: string;
  reset?: string;
  states: Record<string, ElucimV2State>;
  layout?: ElucimV2StateMachineLayout;
}

export interface ElucimV2StateMachineLayout {
  states?: Record<string, ElucimV2GraphPosition>;
}

export interface ElucimV2GraphPosition {
  x: number;
  y: number;
}

export interface ElucimV2State {
  timeline?: string;
  on?: Record<string, string | ElucimV2Transition>;
  onComplete?: string | ElucimV2Transition;
}

export interface ElucimV2Transition {
  target: string;
  timeline?: string;
}
