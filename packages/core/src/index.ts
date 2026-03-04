// @elucim/core — Animated concept explanations for the web

// Components
export { Scene, type SceneProps } from './components/Scene';
export { Sequence, type SequenceProps } from './components/Sequence';
export { Player, type PlayerProps } from './components/Player';
export {
  Presentation, type PresentationProps,
  Slide, type SlideProps,
  usePresentationContext,
  type TransitionType,
} from './components/Presentation';

// Hooks
export { useCurrentFrame } from './hooks/useCurrentFrame';
export { interpolate, type InterpolateOptions } from './hooks/interpolate';

// Context
export { useElucimContext, type ElucimContextValue } from './context';

// Primitives
export { Circle, type CircleProps } from './mobjects/Circle';
export { Line, type LineProps } from './mobjects/Line';
export { Arrow, type ArrowProps } from './mobjects/Arrow';
export { Rect, type RectProps } from './mobjects/Rect';
export { Text, type TextProps } from './mobjects/Text';
export { Polygon, type PolygonProps } from './mobjects/Polygon';
export { Axes, type AxesProps, mathToSvg } from './mobjects/Axes';
export { FunctionPlot, type FunctionPlotProps } from './mobjects/FunctionPlot';
export { Vector, type VectorProps } from './mobjects/Vector';
export { VectorField, type VectorFieldProps } from './mobjects/VectorField';
export { Matrix, type MatrixProps } from './mobjects/Matrix';
export { Graph, type GraphProps, type GraphNode, type GraphEdge } from './mobjects/Graph';
export { LaTeX, type LaTeXProps } from './mobjects/LaTeX';
export { BarChart, type BarChartProps, type BarDef } from './mobjects/BarChart';
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
