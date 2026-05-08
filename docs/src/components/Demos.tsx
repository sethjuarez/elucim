/**
 * Pre-built demo scenes for the documentation site.
 * Each export is a self-contained React component that renders an Elucim Player.
 */
import React from 'react';
import {
  Player, Sequence, Scene,
  Circle, Line, Arrow, Rect, Text, Polygon, Image, Group, BezierCurve,
  Axes, FunctionPlot, Vector, VectorField, Matrix, Graph, LaTeX, BarChart,
  Presentation, Slide,
  useCurrentFrame, interpolate,
} from '@elucim/core';
import { DslRenderer, type ElucimDocument } from '@elucim/dsl/react';

function FadeIn({ children, duration = 30 }: { children: React.ReactNode; duration?: number }) {
  const frame = useCurrentFrame();
  return <g opacity={interpolate(frame, [0, duration], [0, 1])}>{children}</g>;
}

function FadeOut({ children, duration = 30, totalFrames }: { children: React.ReactNode; duration?: number; totalFrames?: number }) {
  const frame = useCurrentFrame();
  const start = totalFrames !== undefined ? totalFrames - duration : 0;
  return <g opacity={interpolate(frame, [start, start + duration], [1, 0])}>{children}</g>;
}

function Draw({ children, duration = 60, pathLength = 1000 }: { children: React.ReactElement; duration?: number; pathLength?: number }) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, duration], [0, 1]);
  return React.cloneElement(children, {
    strokeDasharray: pathLength,
    strokeDashoffset: pathLength * (1 - progress),
    pathLength,
  } as Record<string, unknown>);
}

function Write({ children, duration = 45 }: { children: React.ReactNode; duration?: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, duration * 0.6], [0, 1]);
  const scale = interpolate(frame, [0, duration], [0.95, 1]);
  return <g opacity={opacity} transform={`scale(${scale})`} style={{ transformOrigin: 'center' }}>{children}</g>;
}

function Transform({ children, duration = 60, rotate }: { children: React.ReactNode; duration?: number; rotate?: { from: number; to: number } }) {
  const frame = useCurrentFrame();
  const angle = rotate ? interpolate(frame, [0, duration], [rotate.from, rotate.to]) : 0;
  return <g transform={`rotate(${angle})`}>{children}</g>;
}

function Morph({ children }: { children: React.ReactNode }) {
  return <g>{children}</g>;
}

function Stagger({ children, staggerDelay = 10 }: { children: React.ReactNode[]; staggerDelay?: number }) {
  const frame = useCurrentFrame();
  return (
    <g>
      {React.Children.toArray(children).map((child, index) => (
        <g key={index} opacity={interpolate(frame, [index * staggerDelay, index * staggerDelay + staggerDelay * 2], [0, 1])}>
          {child}
        </g>
      ))}
    </g>
  );
}

function Parallel({ children }: { children: React.ReactNode }) {
  return <g>{children}</g>;
}

// ─── Primitives ─────────────────────────────────────────────────────

export function CircleDemo() {
  return (
    <Player width={500} height={300} fps={30} durationInFrames={90} autoPlay loop>
      <Circle cx={150} cy={150} r={60} stroke="#6c5ce7" strokeWidth={3} fill="none" fadeIn={20} />
      <Sequence from={20} durationInFrames={70}>
        <Circle cx={350} cy={150} r={60} stroke="#ff6b6b" strokeWidth={3} fill="none" draw={30} />
      </Sequence>
      <Sequence from={40} durationInFrames={50}>
        <Circle cx={250} cy={150} r={30} stroke="#4ecdc4" strokeWidth={2} fill="rgba(78,205,196,0.2)" fadeIn={15} />
      </Sequence>
    </Player>
  );
}

export function LineDemo() {
  return (
    <Player width={500} height={300} fps={30} durationInFrames={90} autoPlay loop>
      <Line x1={50} y1={250} x2={450} y2={50} stroke="#6c5ce7" strokeWidth={3} draw={30} />
      <Sequence from={30} durationInFrames={60}>
        <Line x1={50} y1={50} x2={450} y2={250} stroke="#ff6b6b" strokeWidth={2} draw={25} />
      </Sequence>
      <Sequence from={50} durationInFrames={40}>
        <Line x1={250} y1={20} x2={250} y2={280} stroke="#4ecdc4" strokeWidth={1} strokeDasharray="6 3" fadeIn={15} />
      </Sequence>
    </Player>
  );
}

export function ArrowDemo() {
  return (
    <Player width={500} height={300} fps={30} durationInFrames={90} autoPlay loop>
      <FadeIn duration={20}>
        <Arrow x1={50} y1={150} x2={200} y2={150} stroke="#6c5ce7" strokeWidth={2} headSize={10} />
      </FadeIn>
      <Sequence from={20} durationInFrames={70}>
        <FadeIn duration={20}>
          <Arrow x1={230} y1={150} x2={350} y2={80} stroke="#ff6b6b" strokeWidth={2} headSize={8} />
        </FadeIn>
      </Sequence>
      <Sequence from={40} durationInFrames={50}>
        <FadeIn duration={20}>
          <Arrow x1={230} y1={150} x2={350} y2={220} stroke="#4ecdc4" strokeWidth={2} headSize={8} strokeDasharray="6 3" />
        </FadeIn>
      </Sequence>
      <Sequence from={50} durationInFrames={40}>
        <FadeIn duration={15}>
          <Text x={120} y={135} fill="currentColor" fontSize={11} textAnchor="middle">directed</Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function RectDemo() {
  return (
    <Player width={500} height={300} fps={30} durationInFrames={90} autoPlay loop>
      <FadeIn duration={20}>
        <Rect x={30} y={50} width={180} height={100} stroke="#6c5ce7" strokeWidth={2} fill="rgba(108,92,231,0.15)" rx={8} />
      </FadeIn>
      <Sequence from={20} durationInFrames={70}>
        <FadeIn duration={20}>
          <Rect x={240} y={80} width={120} height={120} stroke="#ff6b6b" strokeWidth={2} fill="none" rx={0} />
        </FadeIn>
      </Sequence>
      <Sequence from={40} durationInFrames={50}>
        <FadeIn duration={20}>
          <Rect x={390} y={60} width={80} height={160} stroke="#4ecdc4" strokeWidth={1.5} fill="none" strokeDasharray="5 5" rx={12} />
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function TextDemo() {
  return (
    <Player width={500} height={300} fps={30} durationInFrames={120} autoPlay loop>
      <Write duration={30}>
        <Text x={250} y={80} fill="#6c5ce7" fontSize={32} textAnchor="middle" fontWeight="bold">
          Hello Elucim
        </Text>
      </Write>
      <Sequence from={30} durationInFrames={90}>
        <FadeIn duration={20}>
          <Text x={250} y={140} fill="#a29bfe" fontSize={16} textAnchor="middle">
            Animate concepts. Illuminate understanding.
          </Text>
        </FadeIn>
      </Sequence>
      <Sequence from={50} durationInFrames={70}>
        <FadeIn duration={20}>
          <Text x={250} y={200} fill="currentColor" fontSize={12} textAnchor="middle" fontFamily="monospace">
            fontSize · fontWeight · fontFamily · textAnchor
          </Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function PolygonDemo() {
  return (
    <Player width={500} height={300} fps={30} durationInFrames={90} autoPlay loop>
      <Polygon
        points={[[150, 40], [50, 180], [250, 180]]}
        stroke="#ff6b6b" strokeWidth={2.5} fill="rgba(255,107,107,0.1)" draw={30}
      />
      <Sequence from={25} durationInFrames={65}>
        <Polygon
          points={[[350, 40], [280, 130], [310, 240], [390, 240], [420, 130]]}
          stroke="#6c5ce7" strokeWidth={2.5} fill="rgba(108,92,231,0.1)" draw={30}
        />
      </Sequence>
    </Player>
  );
}

export function ImageDemo() {
  return (
    <Player width={500} height={350} fps={30} durationInFrames={120} autoPlay loop>
      <FadeIn duration={20}>
        <Image
          src="https://raw.githubusercontent.com/sethjuarez/elucim/main/docs/public/logo.svg"
          x={150} y={50} width={200} height={200}
          borderRadius={20}
        />
      </FadeIn>
      <Sequence from={30} durationInFrames={90}>
        <FadeIn duration={20}>
          <Text x={250} y={300} fill="currentColor" fontSize={20} textAnchor="middle">
            Image with rounded corners
          </Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function GroupDemo() {
  return (
    <Player width={500} height={350} fps={30} durationInFrames={120} autoPlay loop>
      <Group rotation={15} fadeIn={30}>
        <Rect x={150} y={75} width={200} height={200} stroke="#6c5ce7" fill="none" strokeWidth={2} />
        <Circle cx={250} cy={175} r={50} stroke="#e17055" fill="none" strokeWidth={2} />
        <Text x={250} y={180} fill="currentColor" fontSize={16} textAnchor="middle">Grouped</Text>
      </Group>
    </Player>
  );
}

export function BezierCurveDemo() {
  return (
    <Player width={500} height={300} fps={30} durationInFrames={120} autoPlay loop>
      <Draw duration={40}>
        <BezierCurve
          x1={50} y1={250} cx1={150} cy1={30} x2={450} y2={250}
          stroke="#6c5ce7" strokeWidth={3}
        />
      </Draw>
      <Sequence from={30} durationInFrames={90}>
        <Draw duration={40}>
          <BezierCurve
            x1={50} y1={150} cx1={150} cy1={20} cx2={350} cy2={280} x2={450} y2={150}
            stroke="#ff6b6b" strokeWidth={3}
          />
        </Draw>
      </Sequence>
      <Sequence from={60} durationInFrames={60}>
        <FadeIn duration={15}>
          <Text x={250} y={30} fill="currentColor" fontSize={14} textAnchor="middle">
            Quadratic (purple) &amp; Cubic (red)
          </Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}

// ─── Math ───────────────────────────────────────────────────────────

export function AxesDemo() {
  return (
    <Player width={500} height={350} fps={30} durationInFrames={120} autoPlay loop>
      <Axes origin={[250, 200]} domain={[-4, 4]} range={[-2, 3]} scale={50}
            axisColor="currentColor" labelColor="currentColor" showGrid gridColor="currentColor" />
      <Sequence from={20} durationInFrames={100}>
        <FunctionPlot fn={(x: number) => Math.sin(x)} domain={[-4, 4]}
                      origin={[250, 200]} scale={50} color="#6c5ce7" strokeWidth={2.5} draw={40} />
      </Sequence>
      <Sequence from={50} durationInFrames={70}>
        <FunctionPlot fn={(x: number) => 0.2 * x * x - 1} domain={[-4, 4]}
                      origin={[250, 200]} scale={50} color="#ff6b6b" strokeWidth={2} draw={40} />
      </Sequence>
    </Player>
  );
}

export function VectorDemo() {
  return (
    <Player width={500} height={400} fps={30} durationInFrames={90} autoPlay loop>
      <Axes origin={[250, 200]} domain={[-4, 4]} range={[-3, 3]} scale={50}
            axisColor="currentColor" labelColor="currentColor" />
      <FadeIn duration={20}>
        <Vector from={[0, 0]} to={[3, 2]} origin={[250, 200]} scale={50}
                color="#6c5ce7" strokeWidth={2.5} label="v" />
      </FadeIn>
      <Sequence from={25} durationInFrames={65}>
        <FadeIn duration={20}>
          <Vector from={[0, 0]} to={[-2, 1]} origin={[250, 200]} scale={50}
                  color="#ff6b6b" strokeWidth={2.5} label="w" />
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function MatrixDemo() {
  const cols = 3, rows = 3, cell = 70, bracketW = 12;
  const totalW = cols * cell + bracketW * 2;
  const totalH = rows * cell;
  return (
    <Player width={600} height={320} fps={30} durationInFrames={60} autoPlay loop>
      <FadeIn duration={20}>
        <Matrix values={[[1, 0, 0], [0, 'cos θ', '−sin θ'], [0, 'sin θ', 'cos θ']]}
               x={(600 - totalW) / 2} y={(320 - totalH) / 2}
               cellSize={cell} color="currentColor" bracketColor="#6c5ce7" fontSize={18} />
      </FadeIn>
    </Player>
  );
}

export function GraphDemo() {
  return (
    <Player width={500} height={350} fps={30} durationInFrames={60} autoPlay loop>
      <FadeIn duration={25}>
        <Graph
          nodes={[
            { id: 'a', x: 100, y: 175, label: 'A', color: '#6c5ce7', radius: 22 },
            { id: 'b', x: 250, y: 80, label: 'B', color: '#ff6b6b', radius: 22 },
            { id: 'c', x: 400, y: 175, label: 'C', color: '#4ecdc4', radius: 22 },
            { id: 'd', x: 250, y: 270, label: 'D', color: '#ffd93d', radius: 22 },
          ]}
          edges={[
            { from: 'a', to: 'b', directed: true, label: '4' },
            { from: 'b', to: 'c', directed: true, label: '2' },
            { from: 'c', to: 'd', directed: true, label: '7' },
            { from: 'd', to: 'a', directed: true, label: '3' },
            { from: 'a', to: 'c', directed: false, label: '5', color: 'currentColor' },
          ]}
          nodeColor="#6c5ce7"
          edgeColor="currentColor"
          labelColor="#fff"
        />
      </FadeIn>
    </Player>
  );
}

export function LaTeXDemo() {
  const expr1 = "E = mc^2";
  const expr2 = "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}";
  const expr3 = "\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}";
  return (
    <Player width={500} height={300} fps={30} durationInFrames={90} autoPlay loop>
      <FadeIn duration={20}>
        <LaTeX expression={expr1} x={250} y={30} fontSize={36} color="#6c5ce7" />
      </FadeIn>
      <Sequence from={25} durationInFrames={65}>
        <FadeIn duration={20}>
          <LaTeX expression={expr2} x={250} y={120} fontSize={28} color="#ff6b6b" />
        </FadeIn>
      </Sequence>
      <Sequence from={45} durationInFrames={45}>
        <FadeIn duration={20}>
          <LaTeX expression={expr3} x={250} y={200} fontSize={22} color="#4ecdc4" />
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function BarChartDemo() {
  return (
    <Player width={500} height={300} fps={30} durationInFrames={60} autoPlay loop>
      <FadeIn duration={25}>
        <BarChart
          bars={[
            { label: 'Paris', value: 0.92, color: '#6c5ce7' },
            { label: 'Lyon', value: 0.03, color: '#a29bfe' },
            { label: 'the', value: 0.02, color: '#74b9ff' },
            { label: 'Berlin', value: 0.015, color: '#81ecec' },
            { label: 'London', value: 0.01, color: '#55efc4' },
          ]}
          x={50} y={30} width={400} height={230}
          barColor="#6c5ce7" labelColor="currentColor"
          showValues valueFormat="percent" maxValue={1} gap={0.3}
        />
      </FadeIn>
    </Player>
  );
}

// ─── Animations ─────────────────────────────────────────────────────

export function FadeDemo() {
  const doc: ElucimDocument = {
    version: '2.0',
    scene: { type: 'player', width: 500, height: 250, fps: 30, loop: true, children: ['in-label', 'out-label', 'in-circle', 'in-text', 'out-circle', 'out-text'] },
    elements: {
      'in-label': { id: 'in-label', type: 'text', props: { type: 'text', x: 125, y: 220, content: 'opacity in', fill: '$muted', fontSize: 12, textAnchor: 'middle' } },
      'out-label': { id: 'out-label', type: 'text', props: { type: 'text', x: 375, y: 220, content: 'opacity out', fill: '$muted', fontSize: 12, textAnchor: 'middle' } },
      'in-circle': { id: 'in-circle', type: 'circle', props: { type: 'circle', cx: 125, cy: 125, r: 50, stroke: '$accent', strokeWidth: 3, fill: 'rgba(108,92,231,0.2)', opacity: 1 } },
      'in-text': { id: 'in-text', type: 'text', props: { type: 'text', x: 125, y: 130, content: 'Visible!', fill: '$accent', fontSize: 14, textAnchor: 'middle', opacity: 1 } },
      'out-circle': { id: 'out-circle', type: 'circle', props: { type: 'circle', cx: 375, cy: 125, r: 50, stroke: '#ff6b6b', strokeWidth: 3, fill: 'rgba(255,107,107,0.2)', opacity: 0 } },
      'out-text': { id: 'out-text', type: 'text', props: { type: 'text', x: 375, y: 130, content: 'Gone!', fill: '#ff6b6b', fontSize: 14, textAnchor: 'middle', opacity: 1 } },
    },
    timelines: {
      fade: {
        id: 'fade',
        duration: 90,
        tracks: [
          { target: 'in-circle', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] },
          { target: 'in-text', property: 'opacity', keyframes: [{ frame: 30, value: 0 }, { frame: 50, value: 1 }] },
          { target: 'out-circle', property: 'opacity', keyframes: [{ frame: 50, value: 1 }, { frame: 90, value: 0 }] },
          { target: 'out-text', property: 'opacity', keyframes: [{ frame: 60, value: 0 }, { frame: 75, value: 1 }] },
        ],
      },
    },
    defaultStateMachine: 'main',
    stateMachines: {
      main: {
        id: 'main',
        entry: 'fade',
        states: { fade: { timeline: 'fade' } },
        transitions: [{ id: 'entry-start', from: 'entry', to: 'fade', trigger: 'onStart' }],
      },
    },
    metadata: { title: 'Opacity timeline demo' },
  };

  return <DslRenderer dsl={doc} colorScheme="auto" />;
}

export function DrawDemo() {
  const doc: ElucimDocument = {
    version: '2.0',
    scene: { type: 'player', width: 500, height: 250, fps: 30, loop: true, children: ['circle', 'circle-text', 'rect', 'rect-text'] },
    elements: {
      circle: { id: 'circle', type: 'circle', props: { type: 'circle', cx: 125, cy: 125, r: 60, stroke: '$accent', strokeWidth: 3, fill: 'none', opacity: 1 } },
      'circle-text': { id: 'circle-text', type: 'text', props: { type: 'text', x: 125, y: 130, content: 'Reveal', fill: '$accent', fontSize: 16, textAnchor: 'middle', opacity: 1 } },
      rect: { id: 'rect', type: 'rect', props: { type: 'rect', x: 300, y: 65, width: 120, height: 120, stroke: '#ff6b6b', strokeWidth: 3, fill: 'none', rx: 8, opacity: 1 } },
      'rect-text': { id: 'rect-text', type: 'text', props: { type: 'text', x: 360, y: 130, content: 'Write', fill: '#ff6b6b', fontSize: 16, textAnchor: 'middle', opacity: 1 } },
    },
    timelines: {
      reveal: {
        id: 'reveal',
        duration: 70,
        tracks: [
          { target: 'circle', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] },
          { target: 'circle-text', property: 'opacity', keyframes: [{ frame: 10, value: 0 }, { frame: 40, value: 1 }] },
          { target: 'rect', property: 'opacity', keyframes: [{ frame: 20, value: 0 }, { frame: 50, value: 1 }] },
          { target: 'rect-text', property: 'opacity', keyframes: [{ frame: 30, value: 0 }, { frame: 60, value: 1 }] },
        ],
      },
    },
    defaultStateMachine: 'main',
    stateMachines: {
      main: {
        id: 'main',
        entry: 'reveal',
        states: { reveal: { timeline: 'reveal' } },
        transitions: [{ id: 'entry-start', from: 'entry', to: 'reveal', trigger: 'onStart' }],
      },
    },
    metadata: { title: 'Property reveal demo' },
  };

  return <DslRenderer dsl={doc} colorScheme="auto" />;
}

export function TransformDemo() {
  const doc: ElucimDocument = {
    version: '2.0',
    scene: { type: 'player', width: 500, height: 250, fps: 30, loop: true, children: ['orb', 'card', 'label'] },
    elements: {
      orb: { id: 'orb', type: 'circle', layout: { scale: 1.2, rotation: 360 }, props: { type: 'circle', cx: 150, cy: 125, r: 40, stroke: '$accent', strokeWidth: 3, fill: 'rgba(108,92,231,0.2)', opacity: 1 } },
      card: { id: 'card', type: 'rect', layout: { scale: 1.3 }, props: { type: 'rect', x: 310, y: 85, width: 80, height: 80, stroke: '#4ecdc4', strokeWidth: 2, fill: 'rgba(78,205,196,0.3)', rx: 6, opacity: 1 } },
      label: { id: 'label', type: 'text', props: { type: 'text', x: 250, y: 218, content: 'layout + timeline transform tracks', fill: '$muted', fontSize: 12, textAnchor: 'middle' } },
    },
    timelines: {
      transform: {
        id: 'transform',
        duration: 60,
        tracks: [
          { target: 'orb', property: 'scale', keyframes: [{ frame: 0, value: 0.5 }, { frame: 60, value: 1.2 }] },
          { target: 'orb', property: 'rotate', keyframes: [{ frame: 0, value: 0 }, { frame: 60, value: 360 }] },
          { target: 'card', property: 'fill', keyframes: [{ frame: 15, value: '#ff6b6b' }, { frame: 60, value: '#4ecdc4' }] },
        ],
      },
    },
    defaultStateMachine: 'main',
    stateMachines: {
      main: {
        id: 'main',
        entry: 'transform',
        states: { transform: { timeline: 'transform' } },
        transitions: [{ id: 'entry-start', from: 'entry', to: 'transform', trigger: 'onStart' }],
      },
    },
    metadata: { title: 'Transform timeline demo' },
  };

  return <DslRenderer dsl={doc} colorScheme="auto" />;
}

export function StaggerDemo() {
  const colors = ['#6c5ce7', '#a29bfe', '#74b9ff', '#ff6b6b', '#ffd93d'];
  const doc: ElucimDocument = {
    version: '2.0',
    scene: { type: 'player', width: 500, height: 250, fps: 30, loop: true, children: ['box-0', 'box-1', 'box-2', 'box-3', 'box-4', 'caption'] },
    elements: {
      ...Object.fromEntries(colors.map((color, i) => [
        `box-${i}`,
        { id: `box-${i}`, type: 'rect', props: { type: 'rect', x: 40 + i * 90, y: 80, width: 70, height: 70, stroke: color, strokeWidth: 2, fill: `${color}22`, rx: 8, opacity: 1 } },
      ])),
      caption: { id: 'caption', type: 'text', props: { type: 'text', x: 250, y: 200, content: 'Each box uses an offset keyframe', fill: '$muted', fontSize: 12, textAnchor: 'middle', opacity: 1 } },
    },
    timelines: {
      stagger: {
        id: 'stagger',
        duration: 70,
        tracks: [
          ...colors.map((_, i) => ({ target: `box-${i}`, property: 'opacity', keyframes: [{ frame: i * 8, value: 0 }, { frame: i * 8 + 15, value: 1 }] })),
          { target: 'caption', property: 'opacity', keyframes: [{ frame: 50, value: 0 }, { frame: 65, value: 1 }] },
        ],
      },
    },
    defaultStateMachine: 'main',
    stateMachines: {
      main: {
        id: 'main',
        entry: 'stagger',
        states: { stagger: { timeline: 'stagger' } },
        transitions: [{ id: 'entry-start', from: 'entry', to: 'stagger', trigger: 'onStart' }],
      },
    },
    metadata: { title: 'Staggered timeline demo' },
  };

  return <DslRenderer dsl={doc} colorScheme="auto" />;
}

// ─── Quick Start Demo ───────────────────────────────────────────────

export function CodeResultDemo() {
  const doc: ElucimDocument = {
    version: '2.0',
    scene: { type: 'player', width: 400, height: 300, fps: 30, children: ['circle', 'title'] },
    elements: {
      circle: { id: 'circle', type: 'circle', props: { type: 'circle', cx: 200, cy: 140, r: 60, stroke: '$accent', strokeWidth: 3, fill: 'none' } },
      title: { id: 'title', type: 'text', props: { type: 'text', x: 200, y: 148, content: 'Hello World', fill: '$foreground', fontSize: 20, textAnchor: 'middle' } },
    },
    metadata: { title: 'Hello World' },
  };

  return <DslRenderer dsl={doc} colorScheme="auto" />;
}

const codeSnippet = `import { DslRenderer, type ElucimDocument }
  from '@elucim/dsl';

const doc: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 400, height: 300, children: ['circle', 'title'] },
  elements: {
    circle: {
      id: 'circle',
      type: 'circle',
      props: { type: 'circle', cx: 200, cy: 140, r: 60, stroke: '$accent', fill: 'none' },
    },
    title: {
      id: 'title',
      type: 'text',
      props: { type: 'text', x: 200, y: 148, content: 'Hello World', textAnchor: 'middle' },
    },
  },
};

<DslRenderer dsl={doc} />`;

export function CodeResultTabs() {
  const [tab, setTab] = React.useState<'result' | 'code'>('result');

  return (
    <div className="code-tabs">
      <div className="code-tabs-header">
        <button
          className={`code-tab ${tab === 'result' ? 'active' : ''}`}
          onClick={() => setTab('result')}
        >
          Result
        </button>
        <button
          className={`code-tab ${tab === 'code' ? 'active' : ''}`}
          onClick={() => setTab('code')}
        >
          Code
        </button>
      </div>
      <div className="code-tabs-body">
        {tab === 'result' ? (
          <CodeResultDemo />
        ) : (
          <pre className="code-tabs-pre"><code>{codeSnippet}</code></pre>
        )}
      </div>
    </div>
  );
}

export function QuickStartDemo() {
  const quickStartScene: ElucimDocument = {
    version: '2.0',
    scene: {
      type: 'player',
      width: 500,
      height: 350,
      fps: 30,
      loop: true,
      background: '$background',
      children: ['ring', 'title', 'subtitle'],
    },
    elements: {
      ring: {
        id: 'ring',
        type: 'circle',
        role: 'hero-shape',
        props: { type: 'circle', cx: 250, cy: 175, r: 80, stroke: '$accent', strokeWidth: 3, fill: 'none', opacity: 0 },
      },
      title: {
        id: 'title',
        type: 'text',
        role: 'title',
        props: { type: 'text', x: 250, y: 180, fill: '$foreground', fontSize: 24, textAnchor: 'middle', content: 'Hello World', opacity: 0 },
      },
      subtitle: {
        id: 'subtitle',
        type: 'text',
        role: 'caption',
        props: { type: 'text', x: 250, y: 300, fill: '$muted', fontSize: 14, textAnchor: 'middle', content: 'Your first Elucim scene', opacity: 0 },
      },
    },
    timelines: {
      intro: {
        id: 'intro',
        duration: 80,
        tracks: [
          { target: 'ring', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 20, value: 1, easing: 'easeOutCubic' }] },
          { target: 'title', property: 'opacity', keyframes: [{ frame: 30, value: 0 }, { frame: 50, value: 1, easing: 'easeOutCubic' }] },
          { target: 'subtitle', property: 'opacity', keyframes: [{ frame: 60, value: 0 }, { frame: 80, value: 1, easing: 'easeOutCubic' }] },
        ],
      },
    },
    defaultStateMachine: 'main',
    stateMachines: {
      main: {
        id: 'main',
        entry: 'intro',
        states: { intro: { timeline: 'intro' } },
        transitions: [{ id: 'entry-start', from: 'entry', to: 'intro', trigger: 'onStart' }],
      },
    },
    metadata: { title: 'Hello World', intent: 'Introduce a first Elucim scene.' },
  };

  return (
    <DslRenderer dsl={quickStartScene} colorScheme="auto" />
  );
}

// ─── Hero Demo ──────────────────────────────────────────────────────

export function HeroDemo() {
  const bars = [
    { id: 'bar-0', x: 120, y: 305, height: 45, fill: '$accent' },
    { id: 'bar-1', x: 175, y: 280, height: 70, fill: '$accentMuted' },
    { id: 'bar-2', x: 230, y: 295, height: 55, fill: '$accent' },
    { id: 'bar-3', x: 285, y: 260, height: 90, fill: '$accentMuted' },
    { id: 'bar-4', x: 340, y: 285, height: 65, fill: '$accent' },
    { id: 'bar-5', x: 395, y: 270, height: 80, fill: '$accentMuted' },
  ];
  const doc: ElucimDocument = {
    version: '2.0',
    scene: {
      type: 'player',
      width: 600,
      height: 360,
      fps: 30,
      loop: true,
      children: ['title', 'primitive-label', 'primitive-circle', 'primitive-arrow', 'math-label', 'math-axis-x', 'math-axis-y', 'curve', 'latex-label', 'latex', 'scene-label', ...bars.map((bar) => bar.id)],
    },
    elements: {
      title: { id: 'title', type: 'text', props: { type: 'text', x: 300, y: 38, content: 'What you can build with Elucim', fill: '$accent', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle', opacity: 1 } },
      'primitive-label': { id: 'primitive-label', type: 'text', props: { type: 'text', x: 82, y: 75, content: 'Primitives', fill: '$muted', fontSize: 11, textAnchor: 'middle', opacity: 1 } },
      'primitive-circle': { id: 'primitive-circle', type: 'circle', props: { type: 'circle', cx: 82, cy: 130, r: 35, stroke: '$accent', strokeWidth: 2.5, fill: 'none', opacity: 1 } },
      'primitive-arrow': { id: 'primitive-arrow', type: 'arrow', props: { type: 'arrow', x1: 50, y1: 190, x2: 115, y2: 190, stroke: '$accentMuted', strokeWidth: 2, headSize: 8, opacity: 1 } },
      'math-label': { id: 'math-label', type: 'text', props: { type: 'text', x: 300, y: 75, content: 'Math visualizations', fill: '$muted', fontSize: 11, textAnchor: 'middle', opacity: 1 } },
      'math-axis-x': { id: 'math-axis-x', type: 'line', props: { type: 'line', x1: 210, y1: 145, x2: 390, y2: 145, stroke: '$foreground', strokeWidth: 1, opacity: 0.4 } },
      'math-axis-y': { id: 'math-axis-y', type: 'line', props: { type: 'line', x1: 300, y1: 100, x2: 300, y2: 190, stroke: '$foreground', strokeWidth: 1, opacity: 0.4 } },
      curve: { id: 'curve', type: 'bezierCurve', props: { type: 'bezierCurve', x1: 210, y1: 145, cx1: 250, cy1: 95, cx2: 350, cy2: 195, x2: 390, y2: 145, stroke: '$accent', strokeWidth: 2.5, fill: 'none', opacity: 1 } },
      'latex-label': { id: 'latex-label', type: 'text', props: { type: 'text', x: 518, y: 75, content: 'LaTeX equations', fill: '$muted', fontSize: 11, textAnchor: 'middle', opacity: 1 } },
      latex: { id: 'latex', type: 'latex', props: { type: 'latex', expression: 'e^{i\\pi} + 1 = 0', x: 518, y: 135, fontSize: 18, color: '$accent', opacity: 1 } },
      'scene-label': { id: 'scene-label', type: 'text', props: { type: 'text', x: 300, y: 235, content: 'Compose into animated scenes', fill: '$muted', fontSize: 11, textAnchor: 'middle', opacity: 1 } },
      ...Object.fromEntries(bars.map((bar) => [
        bar.id,
        { id: bar.id, type: 'rect', props: { type: 'rect', x: bar.x, y: bar.y, width: 40, height: bar.height, fill: bar.fill, rx: 3, opacity: 1 } },
      ])),
    },
    timelines: {
      intro: {
        id: 'intro',
        duration: 190,
        tracks: [
          { target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 18, value: 1, easing: 'easeOutCubic' }] },
          { target: 'primitive-label', property: 'opacity', keyframes: [{ frame: 12, value: 0 }, { frame: 30, value: 1, easing: 'easeOutCubic' }] },
          { target: 'primitive-circle', property: 'opacity', keyframes: [{ frame: 24, value: 0 }, { frame: 42, value: 1, easing: 'easeOutCubic' }] },
          { target: 'primitive-arrow', property: 'opacity', keyframes: [{ frame: 36, value: 0 }, { frame: 54, value: 1, easing: 'easeOutCubic' }] },
          { target: 'math-label', property: 'opacity', keyframes: [{ frame: 54, value: 0 }, { frame: 72, value: 1, easing: 'easeOutCubic' }] },
          { target: 'math-axis-x', property: 'opacity', keyframes: [{ frame: 66, value: 0 }, { frame: 84, value: 0.4, easing: 'easeOutCubic' }] },
          { target: 'math-axis-y', property: 'opacity', keyframes: [{ frame: 66, value: 0 }, { frame: 84, value: 0.4, easing: 'easeOutCubic' }] },
          { target: 'curve', property: 'opacity', keyframes: [{ frame: 78, value: 0 }, { frame: 102, value: 1, easing: 'easeOutCubic' }] },
          { target: 'latex-label', property: 'opacity', keyframes: [{ frame: 96, value: 0 }, { frame: 114, value: 1, easing: 'easeOutCubic' }] },
          { target: 'latex', property: 'opacity', keyframes: [{ frame: 108, value: 0 }, { frame: 132, value: 1, easing: 'easeOutCubic' }] },
          { target: 'scene-label', property: 'opacity', keyframes: [{ frame: 126, value: 0 }, { frame: 144, value: 1, easing: 'easeOutCubic' }] },
          ...bars.map((bar, index) => ({
            target: bar.id,
            property: 'opacity' as const,
            keyframes: [{ frame: 138 + index * 5, value: 0 }, { frame: 156 + index * 5, value: 1, easing: 'easeOutCubic' }],
          })),
        ],
      },
    },
    defaultStateMachine: 'main',
    stateMachines: {
      main: {
        id: 'main',
        entry: 'intro',
        states: { intro: { timeline: 'intro' } },
        transitions: [{ id: 'entry-start', from: 'entry', to: 'intro', trigger: 'onStart' }],
      },
    },
    metadata: { title: 'What you can build with Elucim' },
  };

  return <DslRenderer dsl={doc} colorScheme="auto" />;
}

// ─── Example Demos ──────────────────────────────────────────────────

/** Animated tangent line sweeping along sin(x) */
function TangentLine() {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 120], [-3, 3]);
  const y = Math.sin(x);
  const dy = Math.cos(x);
  const ox = 300, oy = 200, sc = 50;
  const px = ox + x * sc, py = oy - y * sc;
  const len = 40;

  return (
    <>
      <Line x1={px - len} y1={py + len * dy / sc * sc} x2={px + len} y2={py - len * dy / sc * sc}
            stroke="#f472b6" strokeWidth={2} />
      <Circle cx={px} cy={py} r={5} fill="#f472b6" stroke="none" />
    </>
  );
}

export function TangentDemo() {
  const fnExpr = 'f(x) = \\sin(x)';
  const derivExpr = "f'(x) = \\cos(x)";
  return (
    <Player width={600} height={400} fps={30} durationInFrames={120} autoPlay loop>
      <Axes origin={[300, 200]} domain={[-4, 4]} range={[-2, 2]} scale={50}
            axisColor="currentColor" labelColor="currentColor" showGrid gridColor="currentColor" />
      <FunctionPlot fn={Math.sin} domain={[-4, 4]} origin={[300, 200]} scale={50}
                    color="#818cf8" strokeWidth={2.5} />
      <TangentLine />
      <Sequence from={10} durationInFrames={110}>
        <FadeIn duration={15}>
          <LaTeX expression={fnExpr} x={500} y={40} fontSize={18} color="#818cf8" />
        </FadeIn>
      </Sequence>
      <Sequence from={20} durationInFrames={100}>
        <FadeIn duration={15}>
          <LaTeX expression={derivExpr} x={500} y={75} fontSize={16} color="#f472b6" />
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function PipelineDemo() {
  const labels = ['Input', 'Tokenize', 'Embed', 'Attend', 'Output'];
  return (
    <Player width={600} height={200} fps={30} durationInFrames={90} autoPlay loop>
      <Stagger staggerDelay={8}>
        {labels.map((label, i) => (
          <FadeIn key={i} duration={15}>
            <Rect x={20 + i * 115} y={50} width={100} height={50}
                  fill="rgba(79,195,247,0.15)" stroke="#4fc3f7" rx={8} strokeWidth={1.5} />
            <Text x={70 + i * 115} y={80} fill="currentColor" fontSize={13}
                  textAnchor="middle">{label}</Text>
          </FadeIn>
        ))}
      </Stagger>
      {/* Arrows between boxes */}
      <Sequence from={30} durationInFrames={60}>
        <FadeIn duration={15}>
          {[0, 1, 2, 3].map(i => (
            <Arrow key={i} x1={120 + i * 115} y1={75} x2={135 + i * 115} y2={75}
                   stroke="currentColor" strokeWidth={1.5} headSize={6} />
          ))}
        </FadeIn>
      </Sequence>
      <Sequence from={50} durationInFrames={40}>
        <FadeIn duration={15}>
          <Text x={300} y={140} fill="currentColor" fontSize={12} textAnchor="middle" opacity={0.6}>
            Elements appear with staggerDelay between each
          </Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function CalcTitleDemo() {
  const derivExpr = '\\frac{d}{dx}\\sin(x) = \\cos(x)';
  return (
    <Player width={600} height={400} fps={30} durationInFrames={150} autoPlay loop>
      {/* Title */}
      <Sequence from={0} durationInFrames={150}>
        <FadeIn duration={30}>
          <Text x={300} y={45} fill="#6c5ce7" fontSize={28} fontWeight="bold" textAnchor="middle">
            The Calculus of Change
          </Text>
        </FadeIn>
      </Sequence>
      {/* Subtitle */}
      <Sequence from={20} durationInFrames={130}>
        <FadeIn duration={25}>
          <Text x={300} y={72} fill="#888" fontSize={14} textAnchor="middle">
            A visual journey through mathematics
          </Text>
        </FadeIn>
      </Sequence>
      {/* Function plot — compact axes with tight y-range */}
      <Sequence from={40} durationInFrames={110}>
        <Axes origin={[300, 220]} domain={[-5, 5]} range={[-1.5, 1.5]} scale={50}
              axisColor="currentColor" labelColor="currentColor" showGrid={false} />
        <FunctionPlot fn={Math.sin} domain={[-5, 5]} origin={[300, 220]} scale={50}
                      color="#6c5ce7" strokeWidth={2.5} draw={40} />
      </Sequence>
      {/* LaTeX equation */}
      <Sequence from={80} durationInFrames={70}>
        <FadeIn duration={20}>
          <LaTeX expression={derivExpr} x={300} y={345} fontSize={18} color="#6c5ce7" />
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function AgenticDemo() {
  // Nodes form a diamond: top, right, bottom, left
  const nodes = [
    { label: 'Observe', x: 300, y: 120, color: '#4fc3f7' },
    { label: 'Think', x: 450, y: 200, color: '#a78bfa' },
    { label: 'Act', x: 300, y: 280, color: '#f472b6' },
    { label: 'Reflect', x: 150, y: 200, color: '#34d399' },
  ];
  const R = 38;
  // Compute arrow start/end at circle edges
  const edgePoint = (from: typeof nodes[0], to: typeof nodes[0], inward: boolean) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len, uy = dy / len;
    return inward ? { x: to.x - R * ux, y: to.y - R * uy }
                  : { x: from.x + R * ux, y: from.y + R * uy };
  };
  const arrows = nodes.map((n, i) => {
    const next = nodes[(i + 1) % nodes.length];
    const s = edgePoint(n, next, false);
    const e = edgePoint(n, next, true);
    return { x1: s.x, y1: s.y, x2: e.x, y2: e.y, color: n.color };
  });

  return (
    <Player width={600} height={350} fps={30} durationInFrames={120} autoPlay loop>
      {/* Title */}
      <Sequence from={0} durationInFrames={120}>
        <FadeIn duration={20}>
          <Text x={300} y={40} fill="#6c5ce7" fontSize={24} fontWeight="bold" textAnchor="middle">
            The Agentic Loop
          </Text>
        </FadeIn>
      </Sequence>
      {/* Cycle: Observe → Think → Act → Reflect */}
      <Sequence from={15} durationInFrames={105}>
        <Stagger staggerDelay={12}>
          {nodes.map((node, i) => (
            <FadeIn key={i} duration={15}>
              <Circle cx={node.x} cy={node.y} r={R} stroke={node.color} strokeWidth={2.5}
                      fill={`${node.color}40`} />
              <Text x={node.x} y={node.y + 5} fill={node.color} fontSize={13}
                    textAnchor="middle" fontWeight="bold">{node.label}</Text>
            </FadeIn>
          ))}
        </Stagger>
      </Sequence>
      {/* Arrows connecting cycle — start/end at circle edges */}
      <Sequence from={60} durationInFrames={60}>
        <FadeIn duration={20}>
          {arrows.map((a, i) => (
            <Arrow key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                   stroke={a.color} strokeWidth={2} headSize={7} />
          ))}
        </FadeIn>
      </Sequence>
    </Player>
  );
}

// ─── Presentation ───────────────────────────────────────────────────

export function TransformsDemo() {
  const doc: ElucimDocument = {
    version: '2.0',
    scene: { type: 'player', width: 500, height: 300, fps: 30, children: ['group-box', 'group-circle', 'group-label', 'front-circle', 'front-label'] },
    elements: {
      'group-box': { id: 'group-box', type: 'rect', layout: { rotation: 15, translate: [50, 0] }, props: { type: 'rect', x: 125, y: 50, width: 200, height: 200, stroke: '$accent', fill: 'none', strokeWidth: 2 } },
      'group-circle': { id: 'group-circle', type: 'circle', layout: { rotation: 15, translate: [50, 0] }, props: { type: 'circle', cx: 225, cy: 150, r: 50, stroke: '#e17055', fill: 'none', strokeWidth: 2 } },
      'group-label': { id: 'group-label', type: 'text', layout: { rotation: 15, translate: [50, 0] }, props: { type: 'text', x: 225, y: 155, content: 'shared layout', fill: '$foreground', fontSize: 14, textAnchor: 'middle' } },
      'front-circle': { id: 'front-circle', type: 'circle', props: { type: 'circle', cx: 400, cy: 150, r: 30, stroke: '#00b894', fill: 'none', strokeWidth: 2 } },
      'front-label': { id: 'front-label', type: 'text', props: { type: 'text', x: 400, y: 200, content: 'last child paints on top', fill: '$foreground', fontSize: 12, textAnchor: 'middle' } },
    },
    metadata: { title: 'Layout composition demo' },
  };

  return <DslRenderer dsl={doc} colorScheme="auto" />;
}

export function PresentationDemo() {
  const euler = "e^{i\\pi} + 1 = 0";
  return (
    <Presentation
      width={700}
      height={400}
      transition="fade"
      transitionDuration={500}
      showHUD
      background="var(--elucim-scene-bg, #1a1a2e)"
    >
      <Slide title="Welcome" notes="Opening slide — introduce Elucim presentations">
        <Player width={700} height={400} fps={30} durationInFrames={90} autoPlay loop controls={false}>
          <FadeIn duration={25}>
            <Text x={350} y={150} fill="currentColor" fontSize={36} textAnchor="middle">
              Elucim Presentations
            </Text>
          </FadeIn>
          <Sequence from={30} durationInFrames={60}>
            <FadeIn duration={20}>
              <Text x={350} y={195} fill="currentColor" fontSize={18} textAnchor="middle" opacity={0.5}>
                Use ← → keys or click buttons to navigate
              </Text>
            </FadeIn>
          </Sequence>
        </Player>
      </Slide>

      <Slide title="Animated Math" notes="Each slide has its own Player with independent animation">
        <Player width={700} height={400} fps={30} durationInFrames={90} autoPlay loop controls={false}>
          <Axes origin={[350, 190]} domain={[-3, 3]} range={[-1.5, 1.5]} scale={80}
                axisColor="currentColor" labelColor="currentColor" />
          <Sequence from={10} durationInFrames={80}>
            <Draw duration={50}>
              <FunctionPlot fn={(x: number) => Math.sin(x)} domain={[-3, 3]}
                            origin={[350, 190]} scale={80} color="#6c5ce7" strokeWidth={2.5} />
            </Draw>
          </Sequence>
          <Sequence from={50} durationInFrames={40}>
            <FadeIn duration={20}>
              <LaTeX expression={`f(x) = \\sin(x)`} x={520} y={55} fontSize={20} color="currentColor" />
            </FadeIn>
          </Sequence>
        </Player>
      </Slide>

      <Slide title="Euler's Identity" notes="LaTeX rendering with animated reveal">
        <Player width={700} height={400} fps={30} durationInFrames={60} autoPlay loop controls={false}>
          <FadeIn duration={30}>
            <LaTeX expression={euler} x={350} y={140} fontSize={40} color="#fdcb6e" align="center" />
          </FadeIn>
          <Sequence from={30} durationInFrames={30}>
            <FadeIn duration={15}>
              <Text x={350} y={215} fill="currentColor" fontSize={16} textAnchor="middle" opacity={0.5}>
                "The most beautiful equation in mathematics"
              </Text>
            </FadeIn>
          </Sequence>
        </Player>
      </Slide>
    </Presentation>
  );
}
