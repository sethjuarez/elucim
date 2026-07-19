import React from 'react';
import type { ElementNode, SceneNode, PlayerNode, PresentationNode, SlideNode, ScenePreset } from '../schema/types';
import {
  Scene, Player,
  Presentation, Slide,
  Sequence,
  BezierCurve, Circle, Line, Arrow, Rect, Text, TextBox, Polygon,
  Image, Group,
  Axes, FunctionPlot, SecantLine, TangentLine, RiemannSum, AccumulationArea,
  Vector, VectorField, Matrix, Graph, LaTeX, BarChart,
  FadeIn, FadeOut, Draw, Write, Transform, Morph, Stagger, Parallel, RevealStateProvider,
} from '@elucim/core';
import type { TransitionType, PlayerRef, RevealState } from '@elucim/core';
import { resolveEasing } from './resolveEasing';
import { resolveColor } from './resolveColor';
import { compileExpression, compileVectorExpression } from '../math/evaluator';
import { SceneCameraViewport } from './CameraViewport';
import type { CameraNode } from '../schema/types';

// ─── Preset dimensions ─────────────────────────────────────────────────────

const PRESETS: Record<ScenePreset, [number, number]> = {
  card: [640, 360],
  slide: [1280, 720],
  square: [600, 600],
};

/** Resolve width/height from preset, with explicit values taking precedence. */
function resolvePreset(preset?: ScenePreset, width?: number, height?: number): { width?: number; height?: number } {
  if (!preset) return { width, height };
  const [pw, ph] = PRESETS[preset];
  return { width: width ?? pw, height: height ?? ph };
}

// ─── Root renderer ──────────────────────────────────────────────────────────

export interface RenderRootOverrides {
  frame?: number;
  revealStates?: Record<string, RevealState>;
  playerRef?: React.RefObject<PlayerRef | null>;
  /** CSS color-scheme to pass to Scene/Player. When set, overrides browser prefers-color-scheme. */
  colorScheme?: 'light' | 'dark' | 'light dark';
  /** Override Player controls visibility. */
  controls?: boolean;
  /** Override Player autoPlay setting. */
  autoPlay?: boolean;
  /** Override Player loop setting. */
  loop?: boolean;
  /** When true, scene fills its parent container. */
  fitToContainer?: boolean;
  /** Callback fired when playback state changes. */
  onPlayStateChange?: (playing: boolean) => void;
  /** Evaluated camera from the active timeline or state-machine path. */
  camera?: CameraNode;
}

export function renderRoot(
  node: SceneNode | PlayerNode | PresentationNode,
  overrides?: RenderRootOverrides,
): React.ReactNode {
  switch (node.type) {
    case 'scene':
      return renderScene(node, overrides);
    case 'player':
      if (overrides?.frame !== undefined) {
        // Static rendering: render player as a Scene (no controls needed)
        const { width, height } = resolvePreset(node.preset, node.width, node.height);
        return renderScene(
          {
            type: 'scene',
            width,
            height,
            fps: node.fps,
            durationInFrames: node.durationInFrames,
            background: node.background,
            children: node.children,
          },
          overrides,
        );
      }
      return renderPlayer(node, overrides);
    case 'presentation':
      return renderPresentation(node, overrides);
  }
}

export function renderScene(node: SceneNode, overrides?: RenderRootOverrides): React.ReactNode {
  const hasFrameOverride = overrides?.frame !== undefined;
  const { width, height } = resolvePreset(node.preset, node.width, node.height);
  const sceneWidth = width ?? 1920;
  const sceneHeight = height ?? 1080;
  return (
    <Scene
      width={width}
      height={height}
      fps={node.fps}
      durationInFrames={node.durationInFrames}
      background={resolveColor(node.background)}
      colorScheme={overrides?.colorScheme}
      fitToContainer={overrides?.fitToContainer}
      {...(hasFrameOverride ? { frame: overrides!.frame, autoPlay: false } : {})}
    >
      <SceneCameraViewport camera={overrides?.camera} width={sceneWidth} height={sceneHeight}>
        {node.children.map((child, i) => renderElement(child, i, overrides))}
      </SceneCameraViewport>
    </Scene>
  );
}

export function renderPlayer(node: PlayerNode, overrides?: RenderRootOverrides): React.ReactNode {
  const { width, height } = resolvePreset(node.preset, node.width, node.height);
  const sceneWidth = width ?? 1920;
  const sceneHeight = height ?? 1080;
  return (
    <Player
      ref={overrides?.playerRef as React.Ref<PlayerRef> | undefined}
      width={width}
      height={height}
      fps={node.fps}
      durationInFrames={node.durationInFrames}
      background={resolveColor(node.background)}
      controls={overrides?.controls ?? node.controls}
      loop={overrides?.loop ?? node.loop}
      autoPlay={overrides?.autoPlay ?? node.autoPlay}
      onPlayStateChange={overrides?.onPlayStateChange}
      fitToContainer={overrides?.fitToContainer}
      colorScheme={overrides?.colorScheme}
    >
      <SceneCameraViewport camera={overrides?.camera} width={sceneWidth} height={sceneHeight}>
        {node.children.map((child, i) => renderElement(child, i, overrides))}
      </SceneCameraViewport>
    </Player>
  );
}

export function renderPresentation(node: PresentationNode, overrides?: RenderRootOverrides): React.ReactNode {
  const { width, height } = resolvePreset(node.preset, node.width, node.height);
  return (
    <Presentation
      width={width}
      height={height}
      background={resolveColor(node.background)}
      transition={node.transition as TransitionType}
      transitionDuration={node.transitionDuration}
      showHUD={node.showHud}
      showNotes={node.showNotes}
      colorScheme={overrides?.colorScheme}
    >
      {node.slides.map((slide, i) => renderSlide(slide, i, overrides))}
    </Presentation>
  );
}

export function renderSlide(node: SlideNode, key: number, overrides?: RenderRootOverrides): React.ReactNode {
  return (
    <Slide key={key} title={node.title} notes={node.notes} background={resolveColor(node.background)}>
      {node.children?.map((child, i) => renderElement(child, i, overrides))}
    </Slide>
  );
}

// ─── Element renderer ───────────────────────────────────────────────────────

export function renderElement(node: ElementNode, key: number, overrides?: RenderRootOverrides): React.ReactNode {
  const element = renderElementNode(node, key, overrides);
  const reveal = 'id' in node && node.id ? overrides?.revealStates?.[node.id] : undefined;
  return reveal ? <RevealStateProvider key={key} state={reveal}>{element}</RevealStateProvider> : element;
}

function renderElementNode(node: ElementNode, key: number, overrides?: RenderRootOverrides): React.ReactNode {
  switch (node.type) {
    // Structural
    case 'sequence':
      return (
        <Sequence key={key} from={node.from} durationInFrames={node.durationInFrames} name={node.name}>
          {node.children.map((child, i) => renderElement(child, i, overrides))}
        </Sequence>
      );
    case 'group':
      return (
        <Group
          key={key}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          opacity={node.opacity}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        >
          {node.children.map((child, i) => renderElement(child, i, overrides))}
        </Group>
      );

    // Primitives
    case 'bezierCurve':
      return (
        <BezierCurve
          key={key}
          x1={node.x1} y1={node.y1}
          cx1={node.cx1} cy1={node.cy1}
          cx2={node.cx2} cy2={node.cy2}
          x2={node.x2} y2={node.y2}
          stroke={resolveColor(node.stroke)} strokeWidth={node.strokeWidth}
          fill={resolveColor(node.fill)}
          strokeDasharray={node.strokeDasharray}
          lineStyle={node.lineStyle}
          strokeLinecap={node.strokeLinecap}
          strokeLinejoin={node.strokeLinejoin}
          startCap={node.startCap}
          endCap={node.endCap}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        />
      );
    case 'circle':
      return (
        <Circle
          key={key}
          cx={node.cx} cy={node.cy} r={node.r}
          fill={resolveColor(node.fill)} stroke={resolveColor(node.stroke)} strokeWidth={node.strokeWidth}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        />
      );
    case 'line':
      return (
        <Line
          key={key}
          x1={node.x1} y1={node.y1} x2={node.x2} y2={node.y2}
          stroke={resolveColor(node.stroke)} strokeWidth={node.strokeWidth}
          strokeDasharray={node.strokeDasharray}
          lineStyle={node.lineStyle}
          strokeLinecap={node.strokeLinecap}
          startCap={node.startCap}
          endCap={node.endCap}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        />
      );
    case 'arrow':
      return (
        <Arrow
          key={key}
          x1={node.x1} y1={node.y1} x2={node.x2} y2={node.y2}
          stroke={resolveColor(node.stroke)} strokeWidth={node.strokeWidth} headSize={node.headSize}
          strokeDasharray={node.strokeDasharray}
          lineStyle={node.lineStyle}
          strokeLinecap={node.strokeLinecap}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        />
      );
    case 'rect':
      return (
        <Rect
          key={key}
          x={node.x} y={node.y} width={node.width} height={node.height}
          fill={resolveColor(node.fill)} stroke={resolveColor(node.stroke)} strokeWidth={node.strokeWidth}
          rx={node.rx} ry={node.ry}
          strokeDasharray={node.strokeDasharray}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        />
      );
    case 'polygon':
      return (
        <Polygon
          key={key}
          points={node.points}
          fill={resolveColor(node.fill)} stroke={resolveColor(node.stroke)} strokeWidth={node.strokeWidth}
          closed={node.closed}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        />
      );
    case 'text':
      return (
        <Text
          key={key}
          x={node.x} y={node.y}
          fill={resolveColor(node.fill)} fontSize={node.fontSize}
          fontFamily={node.fontFamily} fontWeight={node.fontWeight}
          textAnchor={node.textAnchor} dominantBaseline={node.dominantBaseline}
          maxWidth={node.maxWidth} lineHeight={node.lineHeight} wrap={node.wrap}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        >
          {node.content}
        </Text>
      );
    case 'textbox':
      return (
        <TextBox
          key={key}
          x={node.x} y={node.y} width={node.width} height={node.height}
          padding={node.padding}
          fill={resolveColor(node.fill)} fontSize={node.fontSize} minFontSize={node.minFontSize}
          fontFamily={node.fontFamily} fontWeight={node.fontWeight} lineHeight={node.lineHeight}
          align={node.align} verticalAlign={node.verticalAlign} autoFit={node.autoFit}
          backgroundFill={resolveColor(node.background?.fill)}
          backgroundStroke={resolveColor(node.background?.stroke)}
          backgroundStrokeWidth={node.background?.strokeWidth}
          radius={node.background?.radius}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        >
          {node.content}
        </TextBox>
      );

    case 'image':
      return (
        <Image
          key={key}
          src={node.src}
          imageRef={node.ref}
          x={node.x} y={node.y} width={node.width} height={node.height}
          preserveAspectRatio={node.preserveAspectRatio}
          borderRadius={node.borderRadius}
          clipShape={node.clipShape}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        />
      );

    // Math
    case 'axes':
      return (
        <Axes
          key={key}
          domain={node.domain} range={node.range}
          origin={node.origin} scale={node.scale}
          showGrid={node.showGrid} showTicks={node.showTicks} showLabels={node.showLabels}
          tickStep={node.tickStep}
          axisColor={resolveColor(node.axisColor)} gridColor={resolveColor(node.gridColor)}
          labelColor={resolveColor(node.labelColor)} labelFontSize={node.labelFontSize}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          translate={node.translate}
        />
      );
    case 'functionPlot': {
      let fn: (vars: Record<string, number>) => number;
      try {
        fn = compileExpression(node.fn);
      } catch {
        return (
          <Text key={key} x={(node.origin?.[0] ?? 400)} y={(node.origin?.[1] ?? 300) - 20}
            fontSize={14} fill="red" opacity={0.8}>{`⚠ f(x) = ${node.fn}`}</Text>
        );
      }
      return (
        <FunctionPlot
          key={key}
          fn={(x: number) => fn({ x })}
          domain={node.domain} yClamp={node.yClamp}
          origin={node.origin} scale={node.scale}
          color={resolveColor(node.color)} strokeWidth={node.strokeWidth} samples={node.samples}
          draw={node.draw}
          easing={resolveEasing(node.easing)}
          opacity={node.opacity}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          translate={node.translate}
        />
      );
    }
    case 'secantLine': {
      let fn: (vars: Record<string, number>) => number;
      try {
        fn = compileExpression(node.fn);
      } catch {
        return (
          <Text key={key} x={(node.origin?.[0] ?? 400)} y={(node.origin?.[1] ?? 300) - 20}
            fontSize={14} fill="red" opacity={0.8}>{`⚠ secant f(x) = ${node.fn}`}</Text>
        );
      }
      return (
        <SecantLine
          key={key}
          fn={(x: number) => fn({ x })}
          x={node.x}
          dx={node.dx}
          length={node.length}
          origin={node.origin}
          scale={node.scale}
          stroke={resolveColor(node.stroke)}
          strokeWidth={node.strokeWidth}
          opacity={node.opacity}
          label={node.label}
          labelOffset={node.labelOffset}
          labelColor={resolveColor(node.labelColor)}
          labelFontSize={node.labelFontSize}
          showPoints={node.showPoints}
          pointRadius={node.pointRadius}
          fadeIn={node.fadeIn}
          fadeOut={node.fadeOut}
          draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation}
          rotationOrigin={node.rotationOrigin}
          translate={node.translate}
        />
      );
    }
    case 'tangentLine': {
      let fn: (vars: Record<string, number>) => number;
      let derivative: ((vars: Record<string, number>) => number) | undefined;
      try {
        fn = compileExpression(node.fn);
        derivative = node.derivative ? compileExpression(node.derivative) : undefined;
      } catch {
        return (
          <Text key={key} x={(node.origin?.[0] ?? 400)} y={(node.origin?.[1] ?? 300) - 20}
            fontSize={14} fill="red" opacity={0.8}>{`⚠ tangent f(x) = ${node.fn}`}</Text>
        );
      }
      return (
        <TangentLine
          key={key}
          fn={(x: number) => fn({ x })}
          derivative={derivative ? (x: number) => derivative({ x }) : undefined}
          derivativeStep={node.derivativeStep}
          x={node.x}
          length={node.length}
          origin={node.origin}
          scale={node.scale}
          stroke={resolveColor(node.stroke)}
          strokeWidth={node.strokeWidth}
          opacity={node.opacity}
          label={node.label}
          labelOffset={node.labelOffset}
          labelColor={resolveColor(node.labelColor)}
          labelFontSize={node.labelFontSize}
          showPoints={node.showPoints}
          pointRadius={node.pointRadius}
          fadeIn={node.fadeIn}
          fadeOut={node.fadeOut}
          draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation}
          rotationOrigin={node.rotationOrigin}
          translate={node.translate}
        />
      );
    }
    case 'riemannSum': {
      let fn: (vars: Record<string, number>) => number;
      try {
        fn = compileExpression(node.fn);
      } catch {
        return (
          <Text key={key} x={(node.origin?.[0] ?? 400)} y={(node.origin?.[1] ?? 300) - 20}
            fontSize={14} fill="red" opacity={0.8}>{`⚠ riemann f(x) = ${node.fn}`}</Text>
        );
      }
      return (
        <RiemannSum
          key={key}
          fn={(x: number) => fn({ x })}
          interval={node.interval}
          n={node.n}
          method={node.method}
          origin={node.origin}
          scale={node.scale}
          fill={resolveColor(node.fill)}
          stroke={resolveColor(node.stroke)}
          strokeWidth={node.strokeWidth}
          opacity={node.opacity}
          fadeIn={node.fadeIn}
          fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation}
          rotationOrigin={node.rotationOrigin}
          translate={node.translate}
        />
      );
    }
    case 'accumulationArea': {
      let fn: (vars: Record<string, number>) => number;
      try {
        fn = compileExpression(node.fn);
      } catch {
        return (
          <Text key={key} x={(node.origin?.[0] ?? 400)} y={(node.origin?.[1] ?? 300) - 20}
            fontSize={14} fill="red" opacity={0.8}>{`⚠ area f(x) = ${node.fn}`}</Text>
        );
      }
      return (
        <AccumulationArea
          key={key}
          fn={(x: number) => fn({ x })}
          from={node.from}
          to={node.to}
          samples={node.samples}
          origin={node.origin}
          scale={node.scale}
          fill={resolveColor(node.fill)}
          stroke={resolveColor(node.stroke)}
          strokeWidth={node.strokeWidth}
          opacity={node.opacity}
          fadeIn={node.fadeIn}
          fadeOut={node.fadeOut}
          draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation}
          rotationOrigin={node.rotationOrigin}
          translate={node.translate}
        />
      );
    }
    case 'vector':
      return (
        <Vector
          key={key}
          from={node.from} to={node.to}
          origin={node.origin} scale={node.scale}
          color={resolveColor(node.color)} strokeWidth={node.strokeWidth} headSize={node.headSize}
          label={node.label} labelOffset={node.labelOffset}
          labelColor={resolveColor(node.labelColor)} labelFontSize={node.labelFontSize}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          translate={node.translate}
        />
      );
    case 'vectorField': {
      let vfn: (vars: Record<string, number>) => [number, number];
      try {
        vfn = compileVectorExpression(node.fn);
      } catch {
        return (
          <Text key={key} x={(node.origin?.[0] ?? 400)} y={(node.origin?.[1] ?? 300) - 20}
            fontSize={14} fill="red" opacity={0.8}>{`⚠ field = ${node.fn}`}</Text>
        );
      }
      return (
        <VectorField
          key={key}
          fn={(x: number, y: number) => vfn({ x, y })}
          domain={node.domain} range={node.range} step={node.step}
          origin={node.origin} scale={node.scale} arrowScale={node.arrowScale}
          color={resolveColor(node.color)} strokeWidth={node.strokeWidth} headSize={node.headSize}
          normalize={node.normalize} maxLength={node.maxLength}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          translate={node.translate}
        />
      );
    }
    case 'matrix':
      return (
        <Matrix
          key={key}
          values={node.values}
          x={node.x} y={node.y}
          cellSize={node.cellSize}
          color={resolveColor(node.color)} bracketColor={resolveColor(node.bracketColor)}
          fontSize={node.fontSize}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        />
      );
    case 'graph':
      return (
        <Graph
          key={key}
          nodes={node.nodes} edges={node.edges}
          nodeColor={resolveColor(node.nodeColor)} nodeRadius={node.nodeRadius}
          edgeColor={resolveColor(node.edgeColor)} edgeWidth={node.edgeWidth}
          labelColor={resolveColor(node.labelColor)} labelFontSize={node.labelFontSize}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        />
      );
    case 'latex':
      return (
        <LaTeX
          key={key}
          expression={node.expression}
          x={node.x} y={node.y}
          color={resolveColor(node.color)} fontSize={node.fontSize} align={node.align}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        />
      );
    case 'barChart':
      return (
        <BarChart
          key={key}
          bars={node.bars}
          x={node.x} y={node.y} width={node.width} height={node.height}
          barColor={resolveColor(node.barColor)} labelColor={resolveColor(node.labelColor)}
          labelFontSize={node.labelFontSize}
          showValues={node.showValues} maxValue={node.maxValue}
          gap={node.gap} valueFormat={node.valueFormat}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
        />
      );

    // Animation wrappers
    case 'fadeIn':
      return (
        <FadeIn key={key} duration={node.duration} easing={resolveEasing(node.easing)}>
          {node.children.map((child, i) => renderElement(child, i, overrides))}
        </FadeIn>
      );
    case 'fadeOut':
      return (
        <FadeOut key={key} duration={node.duration} totalFrames={node.totalFrames} easing={resolveEasing(node.easing)}>
          {node.children.map((child, i) => renderElement(child, i, overrides))}
        </FadeOut>
      );
    case 'draw':
      return (
        <Draw key={key} duration={node.duration} pathLength={node.pathLength} easing={resolveEasing(node.easing)}>
          {renderElement(node.children[0], 0, overrides) as React.ReactElement}
        </Draw>
      );
    case 'write':
      return (
        <Write key={key} duration={node.duration} easing={resolveEasing(node.easing)}>
          {node.children.map((child, i) => renderElement(child, i, overrides))}
        </Write>
      );
    case 'transform':
      return (
        <Transform
          key={key}
          duration={node.duration}
          easing={resolveEasing(node.easing)}
          translate={node.translate}
          scale={node.scale}
          rotate={node.rotate}
          opacity={node.opacity}
        >
          {node.children.map((child, i) => renderElement(child, i, overrides))}
        </Transform>
      );
    case 'morph':
      return (
        <Morph
          key={key}
          duration={node.duration}
          easing={resolveEasing(node.easing)}
          fromColor={resolveColor(node.fromColor)} toColor={resolveColor(node.toColor)}
          fromOpacity={node.fromOpacity} toOpacity={node.toOpacity}
          fromScale={node.fromScale} toScale={node.toScale}
        >
          {node.children.map((child, i) => renderElement(child, i, overrides))}
        </Morph>
      );
    case 'stagger':
      return (
        <Stagger key={key} staggerDelay={node.staggerDelay} easing={resolveEasing(node.easing)}>
          {node.children.map((child, i) => renderElement(child, i, overrides))}
        </Stagger>
      );
    case 'parallel':
      return (
        <Parallel key={key}>
          {node.children.map((child, i) => renderElement(child, i, overrides))}
        </Parallel>
      );

    // Nested containers
    case 'scene':
      return <React.Fragment key={key}>{renderScene(node, overrides)}</React.Fragment>;
    case 'player':
      return <React.Fragment key={key}>{renderPlayer(node, overrides)}</React.Fragment>;

    default: {
      const _exhaustive: never = node;
      return null;
    }
  }
}
