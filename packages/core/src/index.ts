// @elucim/core — Animated concept explanations for the web

// Components
export { Scene, type SceneProps } from './components/Scene';
export { Sequence, type SequenceProps } from './components/Sequence';
export { Player, type PlayerProps } from './components/Player';

// Hooks
export { useCurrentFrame } from './hooks/useCurrentFrame';
export { interpolate, type InterpolateOptions } from './hooks/interpolate';

// Context
export { useElucimContext, type ElucimContextValue } from './context';

// Mobjects
export { Circle, type CircleProps } from './mobjects/Circle';
export { Line, type LineProps } from './mobjects/Line';
export { Arrow, type ArrowProps } from './mobjects/Arrow';
export { Rect, type RectProps } from './mobjects/Rect';
export { Text, type TextProps } from './mobjects/Text';
export { Axes, type AxesProps, mathToSvg } from './mobjects/Axes';
export { FunctionPlot, type FunctionPlotProps } from './mobjects/FunctionPlot';
export { Vector, type VectorProps } from './mobjects/Vector';
export { Matrix, type MatrixProps } from './mobjects/Matrix';
export { Graph, type GraphProps, type GraphNode, type GraphEdge } from './mobjects/Graph';
export { useAnimation, type AnimationProps } from './mobjects/animation';

// Easing
export {
  type EasingFunction,
  linear,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInBack, easeOutBack,
  easeOutElastic,
  easeOutBounce,
  spring,
  cubicBezier,
} from './easing';
