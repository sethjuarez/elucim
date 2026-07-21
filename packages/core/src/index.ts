// @elucim/core — Animated concept explanations for the web

// Components
export { Scene, type SceneProps } from './components/Scene';
export { Player, type PlayerProps, type PlayerRef } from './components/Player';
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
export { useReducedMotion } from './hooks/useReducedMotion';

// Context
export { useElucimContext, type ElucimContextValue } from './context';

// Providers
export { ImageResolverProvider, useImageResolver, type ImageResolverFn } from './providers/ImageResolverProvider';

// Primitives
export { BezierCurve, type BezierCurveProps } from './primitives/BezierCurve';
export { Circle, type CircleProps } from './primitives/Circle';
export { Line, type LineProps } from './primitives/Line';
export { Arrow, type ArrowProps } from './primitives/Arrow';
export { Rect, type RectProps } from './primitives/Rect';
export { Text, type TextProps } from './primitives/Text';
export {
  TextBox,
  type TextBoxAlign,
  type TextBoxAutoFit,
  type TextBoxPadding,
  type TextBoxProps,
  type TextBoxVerticalAlign,
} from './primitives/TextBox';
export { Polygon, type PolygonProps } from './primitives/Polygon';
export { Axes, type AxesProps, mathToSvg } from './primitives/Axes';
export { FunctionPlot, type FunctionPlotProps } from './primitives/FunctionPlot';
export {
  AccumulationArea,
  RiemannSum,
  SecantLine,
  TangentLine,
  type AccumulationAreaProps,
  type CalculusLineProps,
  type MathSpaceProps,
  type RiemannSumMethod,
  type RiemannSumProps,
  type SecantLineProps,
  type TangentLineProps,
} from './primitives/Calculus';
export { Vector, type VectorProps } from './primitives/Vector';
export { VectorField, type VectorFieldProps } from './primitives/VectorField';
export { Matrix, type MatrixProps } from './primitives/Matrix';
export { Graph, type GraphProps, type GraphNode, type GraphEdge } from './primitives/Graph';
export { LaTeX, type LaTeXProps } from './primitives/LaTeX';
export { BarChart, type BarChartProps, type BarDef } from './primitives/BarChart';
export { Image, type ImageProps } from './primitives/Image';
export { Group, type GroupProps } from './primitives/Group';
export { buildTransform, withTransform, sortByZIndex, type SpatialProps, type BaseElementProps } from './primitives/transform';
export {
  measureTextLayout,
  measureTextWidth,
  type MeasuredTextLayout,
  type MeasuredTextLine,
  type MeasureTextOptions,
  type TextWrapMode,
} from './text/measureText';
export {
  RevealStateProvider,
  useRevealState,
  type RevealCursorOptions,
  type RevealState,
  type RevealStrategy,
} from './motion/RevealState';

// Theme
export {
  type ElucimTheme, type ThemeColorScheme, type NormalizedElucimTheme,
  SEMANTIC_TOKENS, TOKEN_NAMES,
  resolveColor,
  themeToVars, getThemeDefaults, normalizeTheme,
  DARK_THEME, LIGHT_THEME,
  DARK_THEME_VARS, LIGHT_THEME_VARS,
} from './theme';

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

// Export / Video / Capture
export {
  exportAnimation,
  exportWithMediaRecorder,
  svgToCanvas,
  downloadBlob,
  useExport,
  captureFrame,
  type ExportOptions,
  type CaptureFrameOptions,
} from './export';
