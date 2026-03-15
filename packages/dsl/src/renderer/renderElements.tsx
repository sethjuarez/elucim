import React from 'react';
import type { ElementNode, SceneNode, PlayerNode, PresentationNode, SlideNode, ScenePreset } from '../schema/types';
import {
  Scene, Player,
  Presentation, Slide,
  Sequence,
  BezierCurve, Circle, Line, Arrow, Rect, Text, Polygon,
  Image, Group,
  Axes, FunctionPlot, Vector, VectorField, Matrix, Graph, LaTeX, BarChart,
  FadeIn, FadeOut, Draw, Write, Transform, Morph, Stagger, Parallel,
} from '@elucim/core';
import type { TransitionType, PlayerRef } from '@elucim/core';
import { resolveEasing } from './resolveEasing';
import { resolveColor } from './resolveColor';
import { compileExpression, compileVectorExpression } from '../math/evaluator';

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
  playerRef?: React.RefObject<PlayerRef | null>;
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
      return renderPresentation(node);
  }
}

export function renderScene(node: SceneNode, overrides?: RenderRootOverrides): React.ReactNode {
  const hasFrameOverride = overrides?.frame !== undefined;
  const { width, height } = resolvePreset(node.preset, node.width, node.height);
  return (
    <Scene
      width={width}
      height={height}
      fps={node.fps}
      durationInFrames={node.durationInFrames}
      background={resolveColor(node.background)}
      {...(hasFrameOverride ? { frame: overrides!.frame, autoPlay: false } : {})}
    >
      {node.children.map((child, i) => renderElement(child, i))}
    </Scene>
  );
}

export function renderPlayer(node: PlayerNode, overrides?: RenderRootOverrides): React.ReactNode {
  const { width, height } = resolvePreset(node.preset, node.width, node.height);
  return (
    <Player
      ref={overrides?.playerRef as React.Ref<PlayerRef> | undefined}
      width={width}
      height={height}
      fps={node.fps}
      durationInFrames={node.durationInFrames}
      background={resolveColor(node.background)}
      controls={node.controls}
      loop={node.loop}
      autoPlay={node.autoPlay}
    >
      {node.children.map((child, i) => renderElement(child, i))}
    </Player>
  );
}

export function renderPresentation(node: PresentationNode): React.ReactNode {
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
    >
      {node.slides.map((slide, i) => renderSlide(slide, i))}
    </Presentation>
  );
}

export function renderSlide(node: SlideNode, key: number): React.ReactNode {
  return (
    <Slide key={key} title={node.title} notes={node.notes} background={resolveColor(node.background)}>
      {node.children?.map((child, i) => renderElement(child, i))}
    </Slide>
  );
}

// ─── Element renderer ───────────────────────────────────────────────────────

export function renderElement(node: ElementNode, key: number): React.ReactNode {
  switch (node.type) {
    // Structural
    case 'sequence':
      return (
        <Sequence key={key} from={node.from} durationInFrames={node.durationInFrames} name={node.name}>
          {node.children.map((child, i) => renderElement(child, i))}
        </Sequence>
      );
    case 'group':
      return (
        <Group
          key={key}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
          zIndex={node.zIndex}
        >
          {node.children.map((child, i) => renderElement(child, i))}
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
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
          zIndex={node.zIndex}
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
          zIndex={node.zIndex}
        />
      );
    case 'line':
      return (
        <Line
          key={key}
          x1={node.x1} y1={node.y1} x2={node.x2} y2={node.y2}
          stroke={resolveColor(node.stroke)} strokeWidth={node.strokeWidth}
          strokeDasharray={node.strokeDasharray}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
          zIndex={node.zIndex}
        />
      );
    case 'arrow':
      return (
        <Arrow
          key={key}
          x1={node.x1} y1={node.y1} x2={node.x2} y2={node.y2}
          stroke={resolveColor(node.stroke)} strokeWidth={node.strokeWidth} headSize={node.headSize}
          strokeDasharray={node.strokeDasharray}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
          zIndex={node.zIndex}
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
          zIndex={node.zIndex}
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
          zIndex={node.zIndex}
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
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
          zIndex={node.zIndex}
        >
          {node.content}
        </Text>
      );

    case 'image':
      return (
        <Image
          key={key}
          src={node.src}
          x={node.x} y={node.y} width={node.width} height={node.height}
          preserveAspectRatio={node.preserveAspectRatio}
          borderRadius={node.borderRadius}
          clipShape={node.clipShape}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
          rotation={node.rotation} rotationOrigin={node.rotationOrigin}
          scale={node.scale} translate={node.translate}
          zIndex={node.zIndex}
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
          zIndex={node.zIndex}
        />
      );
    case 'functionPlot': {
      const fn = compileExpression(node.fn);
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
          zIndex={node.zIndex}
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
          zIndex={node.zIndex}
        />
      );
    case 'vectorField': {
      const vfn = compileVectorExpression(node.fn);
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
          zIndex={node.zIndex}
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
          zIndex={node.zIndex}
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
          zIndex={node.zIndex}
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
          zIndex={node.zIndex}
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
          zIndex={node.zIndex}
        />
      );

    // Animation wrappers
    case 'fadeIn':
      return (
        <FadeIn key={key} duration={node.duration} easing={resolveEasing(node.easing)}>
          {node.children.map((child, i) => renderElement(child, i))}
        </FadeIn>
      );
    case 'fadeOut':
      return (
        <FadeOut key={key} duration={node.duration} totalFrames={node.totalFrames} easing={resolveEasing(node.easing)}>
          {node.children.map((child, i) => renderElement(child, i))}
        </FadeOut>
      );
    case 'draw':
      return (
        <Draw key={key} duration={node.duration} pathLength={node.pathLength} easing={resolveEasing(node.easing)}>
          {renderElement(node.children[0], 0) as React.ReactElement}
        </Draw>
      );
    case 'write':
      return (
        <Write key={key} duration={node.duration} easing={resolveEasing(node.easing)}>
          {node.children.map((child, i) => renderElement(child, i))}
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
          {node.children.map((child, i) => renderElement(child, i))}
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
          {node.children.map((child, i) => renderElement(child, i))}
        </Morph>
      );
    case 'stagger':
      return (
        <Stagger key={key} staggerDelay={node.staggerDelay} easing={resolveEasing(node.easing)}>
          {node.children.map((child, i) => renderElement(child, i))}
        </Stagger>
      );
    case 'parallel':
      return (
        <Parallel key={key}>
          {node.children.map((child, i) => renderElement(child, i))}
        </Parallel>
      );

    // Nested containers
    case 'scene':
      return <React.Fragment key={key}>{renderScene(node)}</React.Fragment>;
    case 'player':
      return <React.Fragment key={key}>{renderPlayer(node)}</React.Fragment>;

    default: {
      const _exhaustive: never = node;
      return null;
    }
  }
}
