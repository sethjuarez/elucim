import React from 'react';
import type { ElementNode, SceneNode, PlayerNode, PresentationNode, SlideNode } from '../schema/types';
import {
  Scene, Player,
  Presentation, Slide,
  Sequence,
  Circle, Line, Arrow, Rect, Text, Polygon,
  Axes, FunctionPlot, Vector, VectorField, Matrix, Graph, LaTeX,
  FadeIn, FadeOut, Draw, Write, Transform, Morph, Stagger, Parallel,
} from '@elucim/core';
import type { TransitionType } from '@elucim/core';
import { resolveEasing } from './resolveEasing';
import { compileExpression, compileVectorExpression } from '../math/evaluator';
import { validate } from '../validator/validate';
import type { ElucimDocument } from '../schema/types';

// ─── DslRenderer ────────────────────────────────────────────────────────────

export interface DslRendererProps {
  dsl: ElucimDocument;
  className?: string;
  style?: React.CSSProperties;
}

export function DslRenderer({ dsl, className, style }: DslRendererProps) {
  const result = validate(dsl);
  if (!result.valid) {
    return (
      <div
        className={className}
        style={{ color: '#ff6b6b', fontFamily: 'monospace', padding: 16, ...style }}
        data-testid="dsl-error"
      >
        <strong>Elucim DSL Validation Errors:</strong>
        <ul>
          {result.errors.filter(e => e.severity === 'error').map((err, i) => (
            <li key={i}>{err.path}: {err.message}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={className} style={style} data-testid="dsl-root">
      {renderRoot(dsl.root)}
    </div>
  );
}

// ─── Root renderer ──────────────────────────────────────────────────────────

function renderRoot(node: SceneNode | PlayerNode | PresentationNode): React.ReactNode {
  switch (node.type) {
    case 'scene':
      return renderScene(node);
    case 'player':
      return renderPlayer(node);
    case 'presentation':
      return renderPresentation(node);
  }
}

function renderScene(node: SceneNode): React.ReactNode {
  return (
    <Scene
      width={node.width}
      height={node.height}
      fps={node.fps}
      durationInFrames={node.durationInFrames}
      background={node.background}
    >
      {node.children.map((child, i) => renderElement(child, i))}
    </Scene>
  );
}

function renderPlayer(node: PlayerNode): React.ReactNode {
  return (
    <Player
      width={node.width}
      height={node.height}
      fps={node.fps}
      durationInFrames={node.durationInFrames}
      background={node.background}
      controls={node.controls}
      loop={node.loop}
      autoPlay={node.autoPlay}
    >
      {node.children.map((child, i) => renderElement(child, i))}
    </Player>
  );
}

function renderPresentation(node: PresentationNode): React.ReactNode {
  return (
    <Presentation
      width={node.width}
      height={node.height}
      background={node.background}
      transition={node.transition as TransitionType}
      transitionDuration={node.transitionDuration}
      showHUD={node.showHud}
      showNotes={node.showNotes}
    >
      {node.slides.map((slide, i) => renderSlide(slide, i))}
    </Presentation>
  );
}

function renderSlide(node: SlideNode, key: number): React.ReactNode {
  return (
    <Slide key={key} title={node.title} notes={node.notes} background={node.background}>
      {node.children?.map((child, i) => renderElement(child, i))}
    </Slide>
  );
}

// ─── Element renderer ───────────────────────────────────────────────────────

function renderElement(node: ElementNode, key: number): React.ReactNode {
  switch (node.type) {
    // Structural
    case 'sequence':
      return (
        <Sequence key={key} from={node.from} durationInFrames={node.durationInFrames} name={node.name}>
          {node.children.map((child, i) => renderElement(child, i))}
        </Sequence>
      );
    case 'group':
      return <React.Fragment key={key}>{node.children.map((child, i) => renderElement(child, i))}</React.Fragment>;

    // Primitives
    case 'circle':
      return (
        <Circle
          key={key}
          cx={node.cx} cy={node.cy} r={node.r}
          fill={node.fill} stroke={node.stroke} strokeWidth={node.strokeWidth}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
        />
      );
    case 'line':
      return (
        <Line
          key={key}
          x1={node.x1} y1={node.y1} x2={node.x2} y2={node.y2}
          stroke={node.stroke} strokeWidth={node.strokeWidth}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
        />
      );
    case 'arrow':
      return (
        <Arrow
          key={key}
          x1={node.x1} y1={node.y1} x2={node.x2} y2={node.y2}
          stroke={node.stroke} strokeWidth={node.strokeWidth} headSize={node.headSize}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
        />
      );
    case 'rect':
      return (
        <Rect
          key={key}
          x={node.x} y={node.y} width={node.width} height={node.height}
          fill={node.fill} stroke={node.stroke} strokeWidth={node.strokeWidth}
          rx={node.rx} ry={node.ry}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
        />
      );
    case 'polygon':
      return (
        <Polygon
          key={key}
          points={node.points}
          fill={node.fill} stroke={node.stroke} strokeWidth={node.strokeWidth}
          closed={node.closed}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
        />
      );
    case 'text':
      return (
        <Text
          key={key}
          x={node.x} y={node.y}
          fill={node.fill} fontSize={node.fontSize}
          fontFamily={node.fontFamily} fontWeight={node.fontWeight}
          textAnchor={node.textAnchor} dominantBaseline={node.dominantBaseline}
          opacity={node.opacity}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
        >
          {node.content}
        </Text>
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
          axisColor={node.axisColor} gridColor={node.gridColor}
          labelColor={node.labelColor} labelFontSize={node.labelFontSize}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
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
          color={node.color} strokeWidth={node.strokeWidth} samples={node.samples}
          draw={node.draw}
          easing={resolveEasing(node.easing)}
          opacity={node.opacity}
        />
      );
    }
    case 'vector':
      return (
        <Vector
          key={key}
          from={node.from} to={node.to}
          origin={node.origin} scale={node.scale}
          color={node.color} strokeWidth={node.strokeWidth} headSize={node.headSize}
          label={node.label} labelOffset={node.labelOffset}
          labelColor={node.labelColor} labelFontSize={node.labelFontSize}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut} draw={node.draw}
          easing={resolveEasing(node.easing)}
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
          color={node.color} strokeWidth={node.strokeWidth} headSize={node.headSize}
          normalize={node.normalize} maxLength={node.maxLength}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
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
          color={node.color} bracketColor={node.bracketColor}
          fontSize={node.fontSize}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
        />
      );
    case 'graph':
      return (
        <Graph
          key={key}
          nodes={node.nodes} edges={node.edges}
          nodeColor={node.nodeColor} nodeRadius={node.nodeRadius}
          edgeColor={node.edgeColor} edgeWidth={node.edgeWidth}
          labelColor={node.labelColor} labelFontSize={node.labelFontSize}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
        />
      );
    case 'latex':
      return (
        <LaTeX
          key={key}
          expression={node.expression}
          x={node.x} y={node.y}
          color={node.color} fontSize={node.fontSize} align={node.align}
          fadeIn={node.fadeIn} fadeOut={node.fadeOut}
          easing={resolveEasing(node.easing)}
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
          fromColor={node.fromColor} toColor={node.toColor}
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
