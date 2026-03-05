// @elucim/core — Animated concept explanations for the web

// Components
export { Scene, type SceneProps } from './components/Scene';
export { Sequence, type SequenceProps } from './components/Sequence';
export { Player, type PlayerProps } from './components/Player';
export {
  Presentation, type PresentationProps,
  Slide, type SlideProps,
  usePresentationContext,
  useInsidePresentation,
  type TransitionType,
} from './components/Presentation';

// Hooks
export { useCurrentFrame } from './hooks/useCurrentFrame';
export { interpolate, type InterpolateOptions } from './hooks/interpolate';

// Context
export { useElucimContext, type ElucimContextValue } from './context';

// Primitives
export { Circle, type CircleProps } from './primitives/Circle';
export { Line, type LineProps } from './primitives/Line';
export { Arrow, type ArrowProps } from './primitives/Arrow';
export { Rect, type RectProps } from './primitives/Rect';
export { Text, type TextProps } from './primitives/Text';
export { Polygon, type PolygonProps } from './primitives/Polygon';
export { Axes, type AxesProps, mathToSvg } from './primitives/Axes';
export { FunctionPlot, type FunctionPlotProps } from './primitives/FunctionPlot';
export { Vector, type VectorProps } from './primitives/Vector';
export { VectorField, type VectorFieldProps } from './primitives/VectorField';
export { Matrix, type MatrixProps } from './primitives/Matrix';
export { Graph, type GraphProps, type GraphNode, type GraphEdge } from './primitives/Graph';
export { LaTeX, type LaTeXProps } from './primitives/LaTeX';
export { BarChart, type BarChartProps, type BarDef } from './primitives/BarChart';
export { useAnimation, type AnimationProps } from './primitives/animation';

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

// Animations (Phase 3)
export { FadeIn, type FadeInProps, FadeOut, type FadeOutProps } from './animations/Fade';
export { Draw, type DrawProps, Write, type WriteProps } from './animations/DrawWrite';
export { Transform, type TransformProps, Morph, type MorphProps } from './animations/Transform';
export { Parallel, Stagger, type StaggerProps } from './animations/Groups';
export { Timeline, type TimelineAction, type PlayOptions } from './animations/Timeline';

// Export / Video
export {
  exportAnimation,
  exportWithMediaRecorder,
  svgToCanvas,
  downloadBlob,
  useExport,
  type ExportOptions,
} from './export';
