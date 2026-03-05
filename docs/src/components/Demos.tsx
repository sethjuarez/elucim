/**
 * Pre-built demo scenes for the documentation site.
 * Each export is a self-contained React component that renders an Elucim Player.
 */
import React from 'react';
import {
  Player, Sequence, Scene,
  Circle, Line, Arrow, Rect, Text, Polygon,
  Axes, FunctionPlot, Vector, VectorField, Matrix, Graph, LaTeX, BarChart,
  FadeIn, FadeOut, Draw, Write, Transform, Morph, Stagger, Parallel,
  useCurrentFrame, interpolate,
} from '@elucim/core';

// ─── Primitives ─────────────────────────────────────────────────────

export function CircleDemo() {
  return (
    <Player width={500} height={300} fps={30} durationInFrames={90} autoPlay loop>
      <FadeIn duration={20}>
        <Circle cx={150} cy={150} r={60} stroke="#6c5ce7" strokeWidth={3} fill="none" />
      </FadeIn>
      <Sequence from={20} durationInFrames={70}>
        <Draw duration={30}>
          <Circle cx={350} cy={150} r={60} stroke="#ff6b6b" strokeWidth={3} fill="none" />
        </Draw>
      </Sequence>
      <Sequence from={40} durationInFrames={50}>
        <FadeIn duration={15}>
          <Circle cx={250} cy={150} r={30} stroke="#4ecdc4" strokeWidth={2} fill="rgba(78,205,196,0.2)" />
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function LineDemo() {
  return (
    <Player width={500} height={300} fps={30} durationInFrames={90} autoPlay loop>
      <Draw duration={30}>
        <Line x1={50} y1={250} x2={450} y2={50} stroke="#6c5ce7" strokeWidth={3} />
      </Draw>
      <Sequence from={30} durationInFrames={60}>
        <Draw duration={25}>
          <Line x1={50} y1={50} x2={450} y2={250} stroke="#ff6b6b" strokeWidth={2} />
        </Draw>
      </Sequence>
      <Sequence from={50} durationInFrames={40}>
        <FadeIn duration={15}>
          <Line x1={250} y1={20} x2={250} y2={280} stroke="#4ecdc4" strokeWidth={1} strokeDasharray="6 3" />
        </FadeIn>
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
          <Text x={120} y={135} fill="#aaa" fontSize={11} textAnchor="middle">directed</Text>
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
          <Text x={250} y={200} fill="#888" fontSize={12} textAnchor="middle" fontFamily="monospace">
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
      <Draw duration={30}>
        <Polygon
          points={[[150, 40], [50, 180], [250, 180]]}
          stroke="#ff6b6b" strokeWidth={2.5} fill="rgba(255,107,107,0.1)"
        />
      </Draw>
      <Sequence from={25} durationInFrames={65}>
        <Draw duration={30}>
          <Polygon
            points={[[350, 40], [280, 130], [310, 240], [390, 240], [420, 130]]}
            stroke="#6c5ce7" strokeWidth={2.5} fill="rgba(108,92,231,0.1)"
          />
        </Draw>
      </Sequence>
    </Player>
  );
}

// ─── Math ───────────────────────────────────────────────────────────

export function AxesDemo() {
  return (
    <Player width={500} height={350} fps={30} durationInFrames={120} autoPlay loop>
      <Axes origin={[250, 200]} xRange={[-4, 4]} yRange={[-2, 3]} scale={50}
            color="#444" labelColor="#888" showGrid gridColor="#222" />
      <Sequence from={20} durationInFrames={100}>
        <Draw duration={40}>
          <FunctionPlot fn={(x: number) => Math.sin(x)} domain={[-4, 4]}
                        origin={[250, 200]} scale={50} color="#6c5ce7" strokeWidth={2.5} />
        </Draw>
      </Sequence>
      <Sequence from={50} durationInFrames={70}>
        <Draw duration={40}>
          <FunctionPlot fn={(x: number) => 0.5 * x * x - 1} domain={[-3, 3]}
                        origin={[250, 200]} scale={50} color="#ff6b6b" strokeWidth={2} />
        </Draw>
      </Sequence>
    </Player>
  );
}

export function VectorDemo() {
  return (
    <Player width={500} height={350} fps={30} durationInFrames={90} autoPlay loop>
      <Axes origin={[250, 200]} xRange={[-4, 4]} yRange={[-3, 3]} scale={50}
            color="#333" labelColor="#666" />
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
  return (
    <Player width={500} height={300} fps={30} durationInFrames={60} autoPlay loop>
      <FadeIn duration={20}>
        <Matrix values={[[1, 0, 0], [0, 'cos θ', '-sin θ'], [0, 'sin θ', 'cos θ']]}
               x={250} y={150} cellSize={55} color="#e0e0e0" bracketColor="#6c5ce7" />
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
            { from: 'a', to: 'c', directed: false, label: '5', color: '#888' },
          ]}
          nodeColor="#6c5ce7"
          edgeColor="#555"
          labelColor="#fff"
        />
      </FadeIn>
    </Player>
  );
}

export function LaTeXDemo() {
  return (
    <Player width={500} height={300} fps={30} durationInFrames={90} autoPlay loop>
      <FadeIn duration={20}>
        <LaTeX expression="E = mc^2" x={250} y={80} fontSize={36} color="#6c5ce7" />
      </FadeIn>
      <Sequence from={25} durationInFrames={65}>
        <FadeIn duration={20}>
          <LaTeX expression="\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}"
                 x={250} y={180} fontSize={28} color="#ff6b6b" />
        </FadeIn>
      </Sequence>
      <Sequence from={45} durationInFrames={45}>
        <FadeIn duration={20}>
          <LaTeX expression="\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}"
                 x={250} y={260} fontSize={22} color="#4ecdc4" />
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
          barColor="#6c5ce7" labelColor="#ccc"
          showValues valueFormat="percent" maxValue={1} gap={0.3}
        />
      </FadeIn>
    </Player>
  );
}

// ─── Animations ─────────────────────────────────────────────────────

export function FadeDemo() {
  return (
    <Player width={500} height={250} fps={30} durationInFrames={120} autoPlay loop>
      <FadeIn duration={30}>
        <Circle cx={125} cy={125} r={50} stroke="#6c5ce7" strokeWidth={3} fill="rgba(108,92,231,0.2)" />
      </FadeIn>
      <Sequence from={30} durationInFrames={90}>
        <FadeIn duration={20}>
          <Text x={125} y={130} fill="#6c5ce7" fontSize={14} textAnchor="middle">FadeIn</Text>
        </FadeIn>
      </Sequence>
      <Sequence from={0} durationInFrames={60}>
        <FadeIn duration={30}>
          <Circle cx={375} cy={125} r={50} stroke="#ff6b6b" strokeWidth={3} fill="rgba(255,107,107,0.2)" />
        </FadeIn>
      </Sequence>
      <Sequence from={60} durationInFrames={60}>
        <FadeOut duration={30}>
          <Circle cx={375} cy={125} r={50} stroke="#ff6b6b" strokeWidth={3} fill="rgba(255,107,107,0.2)" />
        </FadeOut>
      </Sequence>
      <Sequence from={30} durationInFrames={90}>
        <FadeIn duration={20}>
          <Text x={375} y={130} fill="#ff6b6b" fontSize={14} textAnchor="middle">FadeOut</Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function DrawDemo() {
  return (
    <Player width={500} height={250} fps={30} durationInFrames={90} autoPlay loop>
      <Draw duration={40}>
        <Circle cx={125} cy={125} r={60} stroke="#6c5ce7" strokeWidth={3} fill="none" />
      </Draw>
      <Sequence from={10} durationInFrames={80}>
        <Write duration={30}>
          <Text x={125} y={130} fill="#6c5ce7" fontSize={16} textAnchor="middle">Draw</Text>
        </Write>
      </Sequence>
      <Sequence from={20} durationInFrames={70}>
        <Draw duration={40}>
          <Rect x={300} y={65} width={120} height={120} stroke="#ff6b6b" strokeWidth={3} fill="none" rx={8} />
        </Draw>
      </Sequence>
      <Sequence from={30} durationInFrames={60}>
        <Write duration={30}>
          <Text x={360} y={130} fill="#ff6b6b" fontSize={16} textAnchor="middle">Write</Text>
        </Write>
      </Sequence>
    </Player>
  );
}

export function TransformDemo() {
  return (
    <Player width={500} height={250} fps={30} durationInFrames={90} autoPlay loop>
      <Transform
        from={{ translateX: 0, translateY: 0, scale: 0.5, opacity: 0.3 }}
        to={{ translateX: 0, translateY: 0, scale: 1.2, rotate: 360, opacity: 1 }}
        duration={60}
      >
        <Circle cx={150} cy={125} r={40} stroke="#6c5ce7" strokeWidth={3} fill="rgba(108,92,231,0.2)" />
      </Transform>
      <Sequence from={15} durationInFrames={75}>
        <Morph
          from={{ fill: '#ff6b6b', scale: 1, opacity: 0.3 }}
          to={{ fill: '#4ecdc4', scale: 1.3, opacity: 1 }}
          duration={50}
        >
          <Rect x={310} y={85} width={80} height={80} stroke="#ff6b6b" strokeWidth={2} fill="rgba(255,107,107,0.3)" rx={6} />
        </Morph>
      </Sequence>
    </Player>
  );
}

export function StaggerDemo() {
  return (
    <Player width={500} height={250} fps={30} durationInFrames={90} autoPlay loop>
      <Stagger staggerDelay={8}>
        {[0, 1, 2, 3, 4].map(i => (
          <FadeIn key={i} duration={15}>
            <Rect x={40 + i * 90} y={80} width={70} height={70}
                  stroke={['#6c5ce7', '#a29bfe', '#74b9ff', '#ff6b6b', '#ffd93d'][i]}
                  strokeWidth={2}
                  fill={`${['#6c5ce7', '#a29bfe', '#74b9ff', '#ff6b6b', '#ffd93d'][i]}22`}
                  rx={8} />
          </FadeIn>
        ))}
      </Stagger>
      <Sequence from={50} durationInFrames={40}>
        <FadeIn duration={15}>
          <Text x={250} y={200} fill="#888" fontSize={12} textAnchor="middle">
            Elements appear with staggerDelay between each
          </Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}

// ─── Quick Start Demo ───────────────────────────────────────────────

export function QuickStartDemo() {
  return (
    <Player width={500} height={350} fps={30} durationInFrames={120} autoPlay loop>
      <Sequence from={0} durationInFrames={60}>
        <FadeIn duration={20}>
          <Circle cx={250} cy={175} r={80} stroke="#6c5ce7" strokeWidth={3} fill="none" />
        </FadeIn>
      </Sequence>
      <Sequence from={30} durationInFrames={90}>
        <FadeIn duration={20}>
          <Text x={250} y={180} fill="#fff" fontSize={24} textAnchor="middle">
            Hello World
          </Text>
        </FadeIn>
      </Sequence>
      <Sequence from={60} durationInFrames={60}>
        <FadeIn duration={20}>
          <Text x={250} y={300} fill="#888" fontSize={14} textAnchor="middle">
            Your first Elucim scene ✨
          </Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}

// ─── Hero Demo ──────────────────────────────────────────────────────

export function HeroDemo() {
  return (
    <Player width={600} height={200} fps={30} durationInFrames={150} autoPlay loop
            background="transparent">
      <Axes origin={[300, 110]} xRange={[-4, 4]} yRange={[-1.5, 1.5]} scale={50}
            color="#888" labelColor="#666" showGrid={false} />
      <Sequence from={0} durationInFrames={150}>
        <Draw duration={50}>
          <FunctionPlot fn={(x: number) => Math.sin(x)} domain={[-4, 4]}
                        origin={[300, 110]} scale={50} color="#6c5ce7" strokeWidth={2.5} />
        </Draw>
      </Sequence>
      <Sequence from={30} durationInFrames={120}>
        <Draw duration={50}>
          <FunctionPlot fn={(x: number) => Math.cos(x)} domain={[-4, 4]}
                        origin={[300, 110]} scale={50} color="#ff6b6b" strokeWidth={2} />
        </Draw>
      </Sequence>
      <Sequence from={60} durationInFrames={90}>
        <FadeIn duration={20}>
          <LaTeX expression="f(x) = \\sin(x)" x={480} y={40} fontSize={16} color="#6c5ce7" />
        </FadeIn>
      </Sequence>
      <Sequence from={75} durationInFrames={75}>
        <FadeIn duration={20}>
          <LaTeX expression="g(x) = \\cos(x)" x={480} y={70} fontSize={16} color="#ff6b6b" />
        </FadeIn>
      </Sequence>
    </Player>
  );
}
