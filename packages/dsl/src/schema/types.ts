/** Shared canonical scene and timeline value types. */
export type ScenePreset = 'card' | 'slide' | 'square';

export interface CameraViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CameraCoordinateSpace = 'scene' | 'normalized';
export type CameraFit = 'cover' | 'contain';

export interface CameraNode {
  viewport: CameraViewport;
  coordinateSpace?: CameraCoordinateSpace;
  fit?: CameraFit;
}

export interface CameraKeyframe {
  frame: number;
  viewport: CameraViewport;
  easing?: EasingSpec;
}

export interface CameraTrack {
  coordinateSpace?: CameraCoordinateSpace;
  fit?: CameraFit;
  keyframes: CameraKeyframe[];
}

export type EasingName =
  | 'linear'
  | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad'
  | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic'
  | 'easeInQuart' | 'easeOutQuart' | 'easeInOutQuart'
  | 'easeInSine' | 'easeOutSine' | 'easeInOutSine'
  | 'easeInExpo' | 'easeOutExpo' | 'easeInOutExpo'
  | 'easeInBack' | 'easeOutBack'
  | 'easeOutElastic'
  | 'easeOutBounce';

export interface SpringEasing {
  type: 'spring';
  stiffness?: number;
  damping?: number;
  mass?: number;
}

export interface CubicBezierEasing {
  type: 'cubicBezier';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type EasingSpec = EasingName | SpringEasing | CubicBezierEasing;
