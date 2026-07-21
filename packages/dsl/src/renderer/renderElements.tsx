import React from 'react';
import {
  AccumulationArea,
  Arrow,
  Axes,
  BarChart,
  BezierCurve,
  Circle,
  FunctionPlot,
  Graph,
  Group,
  Image,
  LaTeX,
  Line,
  Matrix,
  Player,
  Polygon,
  Rect,
  RiemannSum,
  Scene,
  SecantLine,
  TangentLine,
  Text,
  TextBox,
  Vector,
  VectorField,
  RevealStateProvider,
  type PlayerRef,
  type RevealState,
} from '@elucim/core';
import type { CameraNode, ScenePreset } from '../schema/types';
import type { ElucimDocument, ElucimElement } from '../document';
import { compileExpression, compileVectorExpression } from '../math/evaluator';
import { SceneCameraViewport } from './CameraViewport';
import { resolveColor } from '@elucim/core';

const PRESETS: Record<ScenePreset, [number, number]> = {
  card: [640, 360],
  slide: [1280, 720],
  square: [600, 600],
};

const COLOR_KEYS = new Set([
  'fill', 'stroke', 'color', 'axisColor', 'gridColor', 'labelColor',
  'nodeColor', 'edgeColor', 'bracketColor', 'barColor',
  'backgroundFill', 'backgroundStroke',
]);

type RenderableCoreComponent = React.ComponentType<Record<string, unknown>>;

const PRIMITIVES: Record<string, RenderableCoreComponent> = {
  arrow: Arrow as unknown as RenderableCoreComponent,
  axes: Axes as unknown as RenderableCoreComponent,
  accumulationArea: AccumulationArea as unknown as RenderableCoreComponent,
  barChart: BarChart as unknown as RenderableCoreComponent,
  bezierCurve: BezierCurve as unknown as RenderableCoreComponent,
  circle: Circle as unknown as RenderableCoreComponent,
  functionPlot: FunctionPlot as unknown as RenderableCoreComponent,
  graph: Graph as unknown as RenderableCoreComponent,
  image: Image as unknown as RenderableCoreComponent,
  latex: LaTeX as unknown as RenderableCoreComponent,
  line: Line as unknown as RenderableCoreComponent,
  matrix: Matrix as unknown as RenderableCoreComponent,
  polygon: Polygon as unknown as RenderableCoreComponent,
  rect: Rect as unknown as RenderableCoreComponent,
  riemannSum: RiemannSum as unknown as RenderableCoreComponent,
  secantLine: SecantLine as unknown as RenderableCoreComponent,
  tangentLine: TangentLine as unknown as RenderableCoreComponent,
  text: Text as unknown as RenderableCoreComponent,
  textbox: TextBox as unknown as RenderableCoreComponent,
  vector: Vector as unknown as RenderableCoreComponent,
  vectorField: VectorField as unknown as RenderableCoreComponent,
};

export interface RenderDocumentOverrides {
  frame?: number;
  revealStates?: Record<string, RevealState>;
  playerRef?: React.RefObject<PlayerRef | null>;
  colorScheme?: 'light' | 'dark' | 'light dark';
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  fitToContainer?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  camera?: CameraNode;
}

/**
 * Renders only normalized Elucim documents. Motion is evaluated before this
 * projection, so this layer never interprets removed animation wrappers.
 */
export function renderDocument(
  document: ElucimDocument,
  overrides?: RenderDocumentOverrides,
): React.ReactNode {
  const { width, height } = resolvePreset(document.scene.preset, document.scene.width, document.scene.height);
  const sceneWidth = width ?? 1920;
  const sceneHeight = height ?? 1080;
  const children = (
    <SceneCameraViewport camera={overrides?.camera} width={sceneWidth} height={sceneHeight}>
      {document.scene.children.map((id, index) => renderElement(document, id, index, overrides))}
    </SceneCameraViewport>
  );

  if (document.scene.type === 'scene' || overrides?.frame !== undefined) {
    return (
      <Scene
        width={width}
        height={height}
        fps={document.scene.fps}
        durationInFrames={getDocumentDuration(document)}
        background={resolveColor(document.scene.background)}
        colorScheme={overrides?.colorScheme}
        fitToContainer={overrides?.fitToContainer}
        {...(overrides?.frame !== undefined ? { frame: overrides.frame, autoPlay: false } : {})}
      >
        {children}
      </Scene>
    );
  }

  return (
    <Player
      ref={overrides?.playerRef as React.Ref<PlayerRef> | undefined}
      width={width}
      height={height}
      fps={document.scene.fps}
      durationInFrames={getDocumentDuration(document)}
      background={resolveColor(document.scene.background)}
      controls={overrides?.controls ?? document.scene.controls}
      loop={overrides?.loop ?? document.scene.loop}
      autoPlay={overrides?.autoPlay ?? document.scene.autoPlay}
      onPlayStateChange={overrides?.onPlayStateChange}
      fitToContainer={overrides?.fitToContainer}
      colorScheme={overrides?.colorScheme}
    >
      {children}
    </Player>
  );
}

function renderElement(
  document: ElucimDocument,
  id: string,
  index: number,
  overrides?: RenderDocumentOverrides,
): React.ReactNode {
  const element = document.elements[id];
  if (!element) {
    throw new Error(`Cannot render canonical document: missing element "${id}".`);
  }

  const rendered = renderElementNode(document, element, index, overrides);
  const reveal = overrides?.revealStates?.[id];
  return reveal
    ? <RevealStateProvider key={id} state={reveal}>{rendered}</RevealStateProvider>
    : rendered;
}

function renderElementNode(
  document: ElucimDocument,
  element: ElucimElement,
  index: number,
  overrides?: RenderDocumentOverrides,
): React.ReactNode {
  const props = resolveProps(element);
  const children = element.children?.map((childId, childIndex) => renderElement(document, childId, childIndex, overrides));

  if (element.type === 'group') {
    return <Group key={element.id || index} {...props}>{children}</Group>;
  }

  const Primitive = PRIMITIVES[element.type];
  if (!Primitive) {
    throw new Error(`Unsupported canonical element type "${element.type}".`);
  }

  switch (element.type) {
    case 'text':
    case 'textbox': {
      const content = props.content;
      delete props.content;
      return <Primitive key={element.id || index} {...props}>{typeof content === 'string' ? content : ''}</Primitive>;
    }
    case 'image': {
      if (typeof props.ref === 'string' && props.imageRef === undefined) props.imageRef = props.ref;
      delete props.ref;
      return <Primitive key={element.id || index} {...props} />;
    }
    case 'functionPlot':
      props.fn = resolveScalarExpression(props.fn, 'functionPlot.fn');
      return <Primitive key={element.id || index} {...props} />;
    case 'secantLine':
    case 'tangentLine':
    case 'riemannSum':
    case 'accumulationArea':
      props.fn = resolveScalarExpression(props.fn, `${element.type}.fn`);
      if (props.derivative !== undefined) props.derivative = resolveScalarExpression(props.derivative, `${element.type}.derivative`);
      return <Primitive key={element.id || index} {...props} />;
    case 'vectorField':
      props.fn = resolveVectorExpression(props.fn);
      return <Primitive key={element.id || index} {...props} />;
    default:
      return <Primitive key={element.id || index} {...props} />;
  }
}

function resolveProps(element: ElucimElement): Record<string, unknown> {
  const props: Record<string, unknown> = { ...element.props, ...element.layout };
  for (const key of COLOR_KEYS) {
    if (typeof props[key] === 'string') props[key] = resolveColor(props[key] as string);
  }
  if (isRecord(props.background)) {
    props.background = {
      ...props.background,
      fill: resolveColor(stringOrUndefined(props.background.fill)),
      stroke: resolveColor(stringOrUndefined(props.background.stroke)),
    };
  }
  return props;
}

function resolveScalarExpression(value: unknown, name: string): (input: number) => number {
  if (typeof value === 'function') return value as (input: number) => number;
  if (typeof value !== 'string') throw new Error(`${name} must be a safe math expression string.`);
  const compiled = compileExpression(value);
  return input => compiled({ x: input });
}

function resolveVectorExpression(value: unknown): (x: number, y: number) => [number, number] {
  if (typeof value === 'function') return value as (x: number, y: number) => [number, number];
  if (typeof value !== 'string') throw new Error('vectorField.fn must be a safe vector expression string.');
  const compiled = compileVectorExpression(value);
  return (x, y) => compiled({ x, y });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function resolvePreset(
  preset: ScenePreset | undefined,
  width: number | undefined,
  height: number | undefined,
): { width?: number; height?: number } {
  if (!preset) return { width, height };
  const [presetWidth, presetHeight] = PRESETS[preset];
  return { width: width ?? presetWidth, height: height ?? presetHeight };
}

function getDocumentDuration(document: ElucimDocument): number {
  const durations = Object.values(document.timelines ?? {})
    .map(timeline => timeline.duration)
    .filter(duration => Number.isFinite(duration) && duration > 0);
  return durations.length ? Math.max(...durations) : 120;
}
