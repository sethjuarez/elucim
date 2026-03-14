import React, { useState } from 'react';
import {
  Player,
  Sequence,
  Circle,
  Line,
  Arrow,
  Rect,
  Text,
  Polygon,
  Axes,
  FunctionPlot,
  Vector,
  VectorField,
  Matrix,
  Graph,
  LaTeX,
  Presentation,
  Slide,
  type GraphNode,
  type GraphEdge,
  FadeIn,
  FadeOut,
  Write,
  Transform as AnimTransform,
  Morph,
  Stagger,
  interpolate,
  useCurrentFrame,
  easeOutCubic,
  easeInOutQuad,
  easeInOutCubic,
  easeOutBounce,
  easeOutElastic,
  spring,
} from '@elucim/core';
import { DslRenderer } from '@elucim/dsl';
import type { ElucimDocument, DslRendererRef } from '@elucim/dsl';
import calculusExplained from '../../dsl/examples/calculus-explained.json';
import agenticLoop from '../../dsl/examples/agentic-loop.json';

// ─── Demo Scenes ────────────────────────────────────────────────────────────

/** Showcase: All basic primitives with animations */
function AllPrimitivesDemo() {
  return (
    <section id="all-primitives">
      <h2 style={{ padding: '16px 0 8px' }}>All Primitives</h2>
      <Player
        width={800}
        height={500}
        fps={60}
        durationInFrames={180}
        background="#111127"
      >
        {/* Circle with draw animation */}
        <Sequence from={0} durationInFrames={60} name="circle">
          <AnimatedCircle />
        </Sequence>

        {/* Rectangle with fadeIn */}
        <Sequence from={20} durationInFrames={80} name="rect">
          <Rect x={500} y={100} width={150} height={100} stroke="#ff6b6b" fill="rgba(255,107,107,0.15)" fadeIn={30} />
        </Sequence>

        {/* Line with draw animation */}
        <Sequence from={40} durationInFrames={80} name="line">
          <Line x1={100} y1={350} x2={700} y2={350} stroke="#4ecdc4" strokeWidth={3} draw={40} />
        </Sequence>

        {/* Arrow with fadeIn */}
        <Sequence from={60} durationInFrames={80} name="arrow">
          <Arrow x1={400} y1={300} x2={600} y2={150} stroke="#ffe66d" strokeWidth={2} fadeIn={30} headSize={14} />
        </Sequence>

        {/* Text with fadeIn */}
        <Sequence from={80} durationInFrames={100} name="text">
          <Text x={400} y={450} fill="#a29bfe" fontSize={32} textAnchor="middle" fadeIn={20}>
            Elucim Primitives
          </Text>
        </Sequence>
      </Player>
    </section>
  );
}

/** Animated circle that draws itself and moves */
function AnimatedCircle() {
  const frame = useCurrentFrame();
  const cx = interpolate(frame, [0, 60], [200, 350], { easing: easeOutCubic });
  const cy = interpolate(frame, [0, 60], [200, 200]);
  return <Circle cx={cx} cy={cy} r={60} stroke="#6c5ce7" strokeWidth={3} draw={40} />;
}

/** Showcase: Easing functions visualized as animated dots */
function EasingDemo() {
  return (
    <section id="easing-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Easing Functions</h2>
      <Player
        width={800}
        height={400}
        fps={60}
        durationInFrames={120}
        background="#111127"
      >
        <EasingVisualization />
      </Player>
    </section>
  );
}

function EasingVisualization() {
  const frame = useCurrentFrame();
  const easings = [
    { name: 'linear', fn: (t: number) => t, color: '#ff6b6b' },
    { name: 'easeOutCubic', fn: easeOutCubic, color: '#4ecdc4' },
    { name: 'easeInOutQuad', fn: easeInOutQuad, color: '#ffe66d' },
    { name: 'easeOutBounce', fn: easeOutBounce, color: '#a29bfe' },
    { name: 'easeOutElastic', fn: easeOutElastic, color: '#fd79a8' },
    { name: 'spring', fn: spring(), color: '#00cec9' },
  ];

  return (
    <>
      {/* Labels and dots */}
      {easings.map((e, i) => {
        const y = 50 + i * 55;
        const x = interpolate(frame, [0, 100], [150, 700], { easing: e.fn });
        return (
          <React.Fragment key={e.name}>
            <Text x={10} y={y + 6} fill={e.color} fontSize={14} fontFamily="monospace">
              {e.name}
            </Text>
            <circle cx={x} cy={y} r={8} fill={e.color} />
            {/* Track line */}
            <line x1={150} y1={y} x2={700} y2={y} stroke="#333" strokeWidth={1} />
          </React.Fragment>
        );
      })}
    </>
  );
}

/** Showcase: Sequence timing — overlapping sequences */
function SequenceTimingDemo() {
  return (
    <section id="sequence-timing">
      <h2 style={{ padding: '16px 0 8px' }}>Sequence Timing</h2>
      <Player
        width={800}
        height={300}
        fps={60}
        durationInFrames={180}
        background="#111127"
      >
        {/* Three circles appearing at staggered times */}
        <Sequence from={0} durationInFrames={180} name="seq1">
          <StaggeredCircle index={0} color="#ff6b6b" />
        </Sequence>
        <Sequence from={30} durationInFrames={150} name="seq2">
          <StaggeredCircle index={1} color="#4ecdc4" />
        </Sequence>
        <Sequence from={60} durationInFrames={120} name="seq3">
          <StaggeredCircle index={2} color="#ffe66d" />
        </Sequence>

        {/* Labels */}
        <Text x={200} y={260} fill="#666" fontSize={14} textAnchor="middle">from=0</Text>
        <Text x={400} y={260} fill="#666" fontSize={14} textAnchor="middle">from=30</Text>
        <Text x={600} y={260} fill="#666" fontSize={14} textAnchor="middle">from=60</Text>
      </Player>
    </section>
  );
}

function StaggeredCircle({ index, color }: { index: number; color: string }) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 30], [0, 1], { easing: easeOutCubic });
  const x = 200 + index * 200;
  return <Circle cx={x} cy={130} r={50 * scale} fill={color} stroke={color} strokeWidth={2} />;
}

/** Showcase: Interactive transform — frame-driven position + rotation */
function TransformDemo() {
  return (
    <section id="transform-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Interpolated Transforms</h2>
      <Player
        width={800}
        height={300}
        fps={60}
        durationInFrames={150}
        background="#111127"
      >
        <MovingRect />
      </Player>
    </section>
  );
}

function MovingRect() {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 150], [50, 600], { easing: easeInOutQuad });
  const rotation = interpolate(frame, [0, 150], [0, 360]);
  const hue = interpolate(frame, [0, 150], [0, 360]);

  return (
    <g transform={`translate(${x}, 150) rotate(${rotation})`}>
      <Rect x={-40} y={-40} width={80} height={80} fill={`hsl(${hue}, 70%, 60%)`} stroke="#fff" strokeWidth={2} />
    </g>
  );
}

// ─── Full demo page with navigation ─────────────────────────────────────────

/** Individual demo pages for Playwright testing */
function CircleDemo() {
  return (
    <section id="circle-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Circle — Draw Animation</h2>
      <Player
        width={400}
        height={400}
        fps={60}
        durationInFrames={60}
        background="#111127"
      >
        <Circle cx={200} cy={200} r={80} stroke="#6c5ce7" strokeWidth={4} draw={50} />
      </Player>
    </section>
  );
}

function LineDemo() {
  return (
    <section id="line-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Line — Draw Animation</h2>
      <Player
        width={400}
        height={200}
        fps={60}
        durationInFrames={60}
        background="#111127"
      >
        <Line x1={50} y1={100} x2={350} y2={100} stroke="#4ecdc4" strokeWidth={3} draw={50} />
      </Player>
    </section>
  );
}

function ArrowDemo() {
  return (
    <section id="arrow-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Arrow</h2>
      <Player
        width={400}
        height={300}
        fps={60}
        durationInFrames={60}
        background="#111127"
      >
        <Arrow x1={50} y1={250} x2={350} y2={50} stroke="#ffe66d" strokeWidth={3} headSize={16} fadeIn={30} />
      </Player>
    </section>
  );
}

function RectDemo() {
  return (
    <section id="rect-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Rect</h2>
      <Player
        width={400}
        height={300}
        fps={60}
        durationInFrames={60}
        background="#111127"
      >
        <Rect x={100} y={50} width={200} height={150} stroke="#ff6b6b" fill="rgba(255,107,107,0.2)" draw={50} rx={8} />
      </Player>
    </section>
  );
}

function TextDemo() {
  return (
    <section id="text-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Text — FadeIn</h2>
      <Player
        width={400}
        height={200}
        fps={60}
        durationInFrames={60}
        background="#111127"
      >
        <Text x={200} y={100} fill="#a29bfe" fontSize={36} textAnchor="middle" dominantBaseline="middle" fadeIn={30}>
          Hello Elucim
        </Text>
      </Player>
    </section>
  );
}

// ─── Phase 2: Math Primitives demos ──────────────────────────────────────────

/** Axes + FunctionPlot: sin(x) and cos(x) with draw animation */
function AxesFunctionDemo() {
  return (
    <section id="axes-function-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Axes + Function Plots</h2>
      <Player
        width={800}
        height={600}
        fps={60}
        durationInFrames={120}
        background="#111127"
      >
        <Sequence from={0} durationInFrames={120}>
          <Axes
            domain={[-5, 5]}
            range={[-3, 3]}
            origin={[400, 300]}
            scale={60}
            showGrid
            fadeIn={20}
          />
        </Sequence>
        <Sequence from={20} durationInFrames={100}>
          <FunctionPlot
            fn={Math.sin}
            domain={[-5, 5]}
            origin={[400, 300]}
            scale={60}
            color="#ff6b6b"
            strokeWidth={3}
            draw={60}
          />
        </Sequence>
        <Sequence from={50} durationInFrames={70}>
          <FunctionPlot
            fn={Math.cos}
            domain={[-5, 5]}
            origin={[400, 300]}
            scale={60}
            color="#4ecdc4"
            strokeWidth={3}
            draw={60}
          />
        </Sequence>
        {/* Labels */}
        <Sequence from={80} durationInFrames={40}>
          <Text x={680} y={195} fill="#ff6b6b" fontSize={18} fadeIn={15}>sin(x)</Text>
        </Sequence>
        <Sequence from={90} durationInFrames={30}>
          <Text x={680} y={240} fill="#4ecdc4" fontSize={18} fadeIn={15}>cos(x)</Text>
        </Sequence>
      </Player>
    </section>
  );
}

/** Vectors on axes */
function VectorDemo() {
  return (
    <section id="vector-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Vectors</h2>
      <Player
        width={600}
        height={500}
        fps={60}
        durationInFrames={120}
        background="#111127"
      >
        <Axes
          domain={[-4, 4]}
          range={[-4, 4]}
          origin={[300, 250]}
          scale={50}
          showGrid
          axisColor="#555"
        />
        <Sequence from={10} durationInFrames={110}>
          <Vector to={[3, 2]} origin={[300, 250]} scale={50} color="#ff6b6b" label="v₁" fadeIn={20} />
        </Sequence>
        <Sequence from={30} durationInFrames={90}>
          <Vector to={[-2, 3]} origin={[300, 250]} scale={50} color="#4ecdc4" label="v₂" fadeIn={20} />
        </Sequence>
        <Sequence from={50} durationInFrames={70}>
          <Vector to={[1, 5]} origin={[300, 250]} scale={50} color="#ffe66d" label="v₁+v₂" fadeIn={20} strokeWidth={3} />
        </Sequence>
        {/* Dashed line showing parallelogram */}
        <Sequence from={60} durationInFrames={60}>
          <AnimatedParallelogram />
        </Sequence>
      </Player>
    </section>
  );
}

function AnimatedParallelogram() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 0.4]);
  const ox = 300, oy = 250, s = 50;
  // v1 = (3,2), v2 = (-2,3)
  const v1End = [ox + 3 * s, oy - 2 * s];
  const v2End = [ox - 2 * s, oy - 3 * s];
  const sum = [ox + 1 * s, oy - 5 * s];
  return (
    <g opacity={opacity}>
      <line x1={v1End[0]} y1={v1End[1]} x2={sum[0]} y2={sum[1]} stroke="#ffe66d" strokeWidth={1} strokeDasharray="6 4" />
      <line x1={v2End[0]} y1={v2End[1]} x2={sum[0]} y2={sum[1]} stroke="#ffe66d" strokeWidth={1} strokeDasharray="6 4" />
    </g>
  );
}

/** Matrix display */
function MatrixDemo() {
  return (
    <section id="matrix-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Matrix</h2>
      <Player
        width={600}
        height={300}
        fps={60}
        durationInFrames={90}
        background="#111127"
      >
        <Sequence from={0} durationInFrames={90}>
          <Matrix
            values={[
              [1, 0, 0],
              [0, 'cos θ', '-sin θ'],
              [0, 'sin θ', 'cos θ'],
            ]}
            x={150}
            y={60}
            cellSize={55}
            fontSize={18}
            fadeIn={30}
          />
        </Sequence>
        <Sequence from={40} durationInFrames={50}>
          <Text x={300} y={250} fill="#888" fontSize={16} textAnchor="middle" fadeIn={20}>
            Rotation matrix Rₓ(θ)
          </Text>
        </Sequence>
      </Player>
    </section>
  );
}

/** Graph (nodes + edges) */
function GraphDemo() {
  const nodes: GraphNode[] = [
    { id: 'A', x: 120, y: 100, label: 'A', color: '#ff6b6b' },
    { id: 'B', x: 300, y: 60, label: 'B', color: '#4ecdc4' },
    { id: 'C', x: 480, y: 100, label: 'C', color: '#ffe66d' },
    { id: 'D', x: 200, y: 250, label: 'D', color: '#a29bfe' },
    { id: 'E', x: 400, y: 250, label: 'E', color: '#fd79a8' },
  ];
  const edges: GraphEdge[] = [
    { from: 'A', to: 'B', directed: true, label: '4' },
    { from: 'B', to: 'C', directed: true, label: '2' },
    { from: 'A', to: 'D', directed: true, label: '7' },
    { from: 'D', to: 'E', directed: true, label: '1' },
    { from: 'B', to: 'E', directed: true, label: '3' },
    { from: 'E', to: 'C', directed: true, label: '5' },
  ];

  return (
    <section id="graph-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Graph (Directed, Weighted)</h2>
      <Player
        width={600}
        height={350}
        fps={60}
        durationInFrames={90}
        background="#111127"
      >
        <Graph nodes={nodes} edges={edges} fadeIn={40} edgeColor="#666" />
        <Sequence from={50} durationInFrames={40}>
          <Text x={300} y={330} fill="#888" fontSize={14} textAnchor="middle" fadeIn={15}>
            Shortest path: A → B → E → C (cost: 10)
          </Text>
        </Sequence>
      </Player>
    </section>
  );
}

/** Combined math scene: Axes + function + tangent line */
function TangentLineDemo() {
  return (
    <section id="tangent-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Animated Tangent Line</h2>
      <Player
        width={800}
        height={500}
        fps={60}
        durationInFrames={180}
        background="#111127"
      >
        <Axes
          domain={[-4, 4]}
          range={[-2, 4]}
          origin={[400, 350]}
          scale={70}
          showGrid
          axisColor="#555"
          gridColor="#222"
        />
        <FunctionPlot
          fn={(x) => x * x * 0.5}
          domain={[-4, 4]}
          origin={[400, 350]}
          scale={70}
          color="#ff6b6b"
          strokeWidth={3}
        />
        <AnimatedTangent />
      </Player>
    </section>
  );
}

function AnimatedTangent() {
  const frame = useCurrentFrame();
  const ox = 400, oy = 350, s = 70;
  // Animate x from -3 to 3 over 180 frames
  const x = interpolate(frame, [0, 180], [-3, 3], { easing: easeInOutQuad });
  const y = x * x * 0.5;
  const slope = x; // derivative of 0.5*x^2

  // Tangent line: y - y0 = slope * (x - x0), draw from x-1.5 to x+1.5
  const tLen = 1.5;
  const tx1 = x - tLen;
  const ty1 = y - slope * tLen;
  const tx2 = x + tLen;
  const ty2 = y + slope * tLen;

  const svgX = ox + x * s;
  const svgY = oy - y * s;

  return (
    <g>
      {/* Tangent line */}
      <line
        x1={ox + tx1 * s}
        y1={oy - ty1 * s}
        x2={ox + tx2 * s}
        y2={oy - ty2 * s}
        stroke="#4ecdc4"
        strokeWidth={2}
      />
      {/* Point on curve */}
      <circle cx={svgX} cy={svgY} r={5} fill="#ffe66d" />
      {/* Slope label */}
      <text x={svgX + 12} y={svgY - 12} fill="#ffe66d" fontSize={14} fontFamily="monospace">
        slope = {slope.toFixed(2)}
      </text>
    </g>
  );
}

// ─── New Primitives: LaTeX, VectorField, Polygon ─────────────────────────────

/** LaTeX rendering demo */
function LaTeXDemo() {
  return (
    <section id="latex-demo">
      <h2 style={{ padding: '16px 0 8px' }}>LaTeX Rendering (KaTeX)</h2>
      <Player
        width={800}
        height={400}
        fps={60}
        durationInFrames={150}
        background="#111127"
      >
        <Sequence from={0} durationInFrames={150}>
          <LaTeX expression="E = mc^2" x={400} y={60} fontSize={36} color="#ff6b6b" fadeIn={30} />
        </Sequence>
        <Sequence from={30} durationInFrames={120}>
          <LaTeX expression="\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}" x={400} y={150} fontSize={28} color="#4ecdc4" fadeIn={30} />
        </Sequence>
        <Sequence from={60} durationInFrames={90}>
          <LaTeX expression="\sum_{n=0}^{\infty} \frac{x^n}{n!} = e^x" x={400} y={240} fontSize={28} color="#ffe66d" fadeIn={30} />
        </Sequence>
        <Sequence from={90} durationInFrames={60}>
          <LaTeX expression="\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}" x={400} y={330} fontSize={28} color="#a29bfe" fadeIn={30} />
        </Sequence>
      </Player>
    </section>
  );
}

/** VectorField demo */
function VectorFieldDemo() {
  return (
    <section id="vector-field-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Vector Field</h2>
      <Player
        width={800}
        height={600}
        fps={60}
        durationInFrames={90}
        background="#111127"
      >
        <Axes
          domain={[-4, 4]}
          range={[-3, 3]}
          origin={[400, 300]}
          scale={50}
          showGrid
          axisColor="#444"
          gridColor="#222"
        />
        <VectorField
          fn={(x, y) => [-y, x]}
          domain={[-4, 4]}
          range={[-3, 3]}
          origin={[400, 300]}
          scale={50}
          color="#4ecdc4"
          arrowScale={0.35}
          normalize
          fadeIn={40}
        />
        <Sequence from={50} durationInFrames={40}>
          <Text x={400} y={570} fill="#888" fontSize={14} textAnchor="middle" fadeIn={15}>
            F(x,y) = (-y, x) — rotation field
          </Text>
        </Sequence>
      </Player>
    </section>
  );
}

/** Polygon demo */
function PolygonDemo() {
  return (
    <section id="polygon-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Polygon</h2>
      <Player
        width={600}
        height={350}
        fps={60}
        durationInFrames={120}
        background="#111127"
      >
        {/* Pentagon */}
        <Sequence from={0} durationInFrames={120}>
          <Polygon
            points={pentagonPoints(200, 160, 80)}
            stroke="#ff6b6b"
            fill="rgba(255,107,107,0.15)"
            strokeWidth={3}
            draw={50}
          />
          <Text x={200} y={260} fill="#ff6b6b" fontSize={14} textAnchor="middle" fadeIn={30}>
            Pentagon
          </Text>
        </Sequence>
        {/* Star */}
        <Sequence from={30} durationInFrames={90}>
          <Polygon
            points={starPoints(400, 160, 80, 35)}
            stroke="#ffe66d"
            fill="rgba(255,230,109,0.15)"
            strokeWidth={3}
            draw={50}
          />
          <Text x={400} y={260} fill="#ffe66d" fontSize={14} textAnchor="middle" fadeIn={30}>
            Star
          </Text>
        </Sequence>
      </Player>
    </section>
  );
}

function pentagonPoints(cx: number, cy: number, r: number): [number, number][] {
  return Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
  });
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number): [number, number][] {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
  });
}

// ─── Phase 3: Animation System demos ─────────────────────────────────────────

/** FadeIn / FadeOut demonstration */
function FadeAnimationsDemo() {
  return (
    <section id="fade-demo">
      <h2 style={{ padding: '16px 0 8px' }}>FadeIn / FadeOut</h2>
      <Player
        width={800}
        height={300}
        fps={60}
        durationInFrames={120}
        background="#111127"
      >
        <Sequence from={0} durationInFrames={60}>
          <FadeIn duration={40}>
            <Circle cx={200} cy={150} r={60} fill="#6c5ce7" stroke="#6c5ce7" />
            <Text x={200} y={155} fill="#fff" fontSize={16} textAnchor="middle" dominantBaseline="middle">
              FadeIn
            </Text>
          </FadeIn>
        </Sequence>
        <Sequence from={60} durationInFrames={60}>
          <FadeOut duration={40}>
            <Circle cx={600} cy={150} r={60} fill="#ff6b6b" stroke="#ff6b6b" />
            <Text x={600} y={155} fill="#fff" fontSize={16} textAnchor="middle" dominantBaseline="middle">
              FadeOut
            </Text>
          </FadeOut>
        </Sequence>
        {/* Always-visible reference */}
        <Rect x={370} y={120} width={60} height={60} fill="#333" stroke="#555" />
        <Text x={400} y={155} fill="#888" fontSize={12} textAnchor="middle" dominantBaseline="middle">
          ref
        </Text>
      </Player>
    </section>
  );
}

/** Write animation on text */
function WriteDemo() {
  return (
    <section id="write-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Write Animation</h2>
      <Player
        width={800}
        height={200}
        fps={60}
        durationInFrames={90}
        background="#111127"
      >
        <Sequence from={0} durationInFrames={90}>
          <Write duration={60}>
            <Text x={400} y={100} fill="#4ecdc4" fontSize={48} textAnchor="middle" dominantBaseline="middle" fontFamily="serif">
              E = mc²
            </Text>
          </Write>
        </Sequence>
      </Player>
    </section>
  );
}

/** Transform animation — moving and rotating */
function TransformAnimDemo() {
  return (
    <section id="transform-anim-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Transform Animation</h2>
      <Player
        width={800}
        height={300}
        fps={60}
        durationInFrames={120}
        background="#111127"
      >
        <Sequence from={0} durationInFrames={120}>
          <AnimTransform
            duration={100}
            translate={{ from: [100, 150], to: [600, 150] }}
            rotate={{ from: 0, to: 360 }}
            scale={{ from: 0.5, to: 1.5 }}
            easing={easeInOutCubic}
          >
            <Rect x={-30} y={-30} width={60} height={60} fill="#ffe66d" stroke="#fff" strokeWidth={2} rx={8} />
          </AnimTransform>
        </Sequence>

        {/* Scale labels */}
        <Text x={100} y={250} fill="#666" fontSize={12} textAnchor="middle">start: scale=0.5</Text>
        <Text x={600} y={250} fill="#666" fontSize={12} textAnchor="middle">end: scale=1.5, rot=360°</Text>
      </Player>
    </section>
  );
}

/** Stagger animation — elements appearing one by one */
function StaggerDemo() {
  return (
    <section id="stagger-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Stagger Animation</h2>
      <Player
        width={800}
        height={200}
        fps={60}
        durationInFrames={120}
        background="#111127"
      >
        <Sequence from={0} durationInFrames={120}>
          <Stagger staggerDelay={12}>
            <Circle cx={100} cy={100} r={30} fill="#ff6b6b" stroke="#ff6b6b" />
            <Circle cx={200} cy={100} r={30} fill="#4ecdc4" stroke="#4ecdc4" />
            <Circle cx={300} cy={100} r={30} fill="#ffe66d" stroke="#ffe66d" />
            <Circle cx={400} cy={100} r={30} fill="#a29bfe" stroke="#a29bfe" />
            <Circle cx={500} cy={100} r={30} fill="#fd79a8" stroke="#fd79a8" />
            <Circle cx={600} cy={100} r={30} fill="#00cec9" stroke="#00cec9" />
            <Circle cx={700} cy={100} r={30} fill="#6c5ce7" stroke="#6c5ce7" />
          </Stagger>
        </Sequence>
      </Player>
    </section>
  );
}

/** Morph animation — color and scale transition */
function MorphDemo() {
  return (
    <section id="morph-demo">
      <h2 style={{ padding: '16px 0 8px' }}>Morph Animation</h2>
      <Player
        width={800}
        height={250}
        fps={60}
        durationInFrames={120}
        background="#111127"
      >
        <Sequence from={0} durationInFrames={120}>
          <Morph
            duration={100}
            fromColor="#ff6b6b"
            toColor="#4ecdc4"
            fromScale={0.8}
            toScale={1.2}
          >
            <g transform="translate(400, 125)">
              <circle r={50} stroke="#fff" strokeWidth={2} />
              <text y={6} fill="#fff" fontSize={16} textAnchor="middle" fontWeight="bold">
                Morph
              </text>
            </g>
          </Morph>
        </Sequence>
      </Player>
    </section>
  );
}

// ─── DSL Data ────────────────────────────────────────────────────────────────

const helloCircleDsl: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'player',
    width: 800, height: 400, fps: 30, durationInFrames: 90,
    background: '#0d0d1a',
    children: [
      {
        type: 'fadeIn', duration: 30,
        children: [{
          type: 'circle', cx: 400, cy: 200, r: 80,
          fill: 'none', stroke: '#3b82f6', strokeWidth: 3, draw: 60, easing: 'easeInOutCubic',
        }],
      },
      {
        type: 'sequence', from: 30,
        children: [{
          type: 'fadeIn', duration: 30,
          children: [{
            type: 'text', x: 400, y: 330, content: 'Hello, DSL!',
            fill: '#fff', fontSize: 28, textAnchor: 'middle',
          }],
        }],
      },
    ],
  },
};

const mathDemoDsl: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'player',
    width: 800, height: 400, fps: 30, durationInFrames: 120,
    background: '#0d0d1a',
    children: [
      { type: 'axes', domain: [-5, 5], range: [-2, 2], origin: [400, 200], scale: 60, showGrid: true, fadeIn: 20 },
      {
        type: 'sequence', from: 10,
        children: [{
          type: 'functionPlot', fn: 'sin(x)', domain: [-5, 5],
          origin: [400, 200], scale: 60, color: '#4a9eff', draw: 60,
        }],
      },
      {
        type: 'sequence', from: 50,
        children: [{
          type: 'fadeIn', duration: 20,
          children: [{
            type: 'vector', from: [0, 0], to: [2, 1],
            origin: [400, 200], scale: 60, color: '#ffe66d', label: 'v₁',
          }],
        }],
      },
    ],
  },
};

const animatedSceneDsl: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'player',
    width: 800, height: 400, fps: 30, durationInFrames: 120,
    background: '#0d0d1a',
    children: [
      {
        type: 'sequence', from: 0,
        children: [{
          type: 'stagger', staggerDelay: 8,
          children: [
            { type: 'circle', cx: 150, cy: 200, r: 30, fill: '#ef4444', fadeIn: 20 },
            { type: 'circle', cx: 250, cy: 200, r: 30, fill: '#f97316', fadeIn: 20 },
            { type: 'circle', cx: 350, cy: 200, r: 30, fill: '#eab308', fadeIn: 20 },
            { type: 'circle', cx: 450, cy: 200, r: 30, fill: '#22c55e', fadeIn: 20 },
            { type: 'circle', cx: 550, cy: 200, r: 30, fill: '#3b82f6', fadeIn: 20 },
            { type: 'circle', cx: 650, cy: 200, r: 30, fill: '#8b5cf6', fadeIn: 20 },
          ],
        }],
      },
      {
        type: 'sequence', from: 60,
        children: [{
          type: 'transform', duration: 60,
          translate: { from: [0, 0], to: [200, 0] },
          rotate: { from: 0, to: 360 },
          children: [{
            type: 'rect', x: 100, y: 300, width: 40, height: 40,
            fill: '#8b5cf6', stroke: 'none',
          }],
        }],
      },
    ],
  },
};

const invalidDsl = {
  version: '1.0',
  root: {
    type: 'scene',
    // Missing durationInFrames
    children: [
      { type: 'circle', cx: 'not a number', cy: 100 },
      { type: 'banana' },
    ],
  },
};

// ─── CutReady Integration Demos ──────────────────────────────────────────────

const presetCardDsl: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'player',
    preset: 'card',
    durationInFrames: 60,
    fps: 30,
    children: [
      { type: 'rect', x: 20, y: 20, width: 600, height: 320, fill: '#1a1a3e', rx: 12 },
      { type: 'circle', cx: 320, cy: 180, r: 80, fill: '#4a9eff', opacity: 0.8 },
      { type: 'text', content: 'Card Preset (640×360)', x: 320, y: 180, fontSize: 24, fill: '#fff', textAnchor: 'middle' },
    ],
  },
};

const presetSlideDsl: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'scene',
    preset: 'slide',
    durationInFrames: 60,
    fps: 30,
    children: [
      { type: 'rect', x: 0, y: 0, width: 1280, height: 720, fill: '#0d0d2a' },
      { type: 'circle', cx: 640, cy: 360, r: 150, fill: '#ff6b6b', opacity: 0.7 },
      { type: 'text', content: 'Slide Preset (1280×720)', x: 640, y: 360, fontSize: 48, fill: '#fff', textAnchor: 'middle' },
    ],
  },
};

const presetSquareDsl: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'scene',
    preset: 'square',
    durationInFrames: 60,
    fps: 30,
    children: [
      { type: 'rect', x: 0, y: 0, width: 600, height: 600, fill: '#1a2a1a' },
      { type: 'circle', cx: 300, cy: 300, r: 120, fill: '#6bff6b', opacity: 0.7 },
      { type: 'text', content: 'Square (600×600)', x: 300, y: 300, fontSize: 32, fill: '#fff', textAnchor: 'middle' },
    ],
  },
};

const posterDsl: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'player',
    preset: 'card',
    durationInFrames: 90,
    fps: 30,
    children: [
      { type: 'rect', x: 0, y: 0, width: 640, height: 360, fill: '#1a1a2e' },
      { type: 'circle', cx: 320, cy: 180, r: 60, fill: '#ff9f43' },
      { type: 'text', content: 'Poster Mode — Static Frame', x: 320, y: 180, fontSize: 20, fill: '#fff', textAnchor: 'middle' },
    ],
  },
};

const richErrorDsl = {
  version: '1.0',
  root: {
    type: 'scene',
    preset: 'banana',
    children: [
      { type: 'circle', cx: 'NaN', cy: 100 },
      { type: 'unknown_element' },
      { type: 'rect', width: -10, height: -5 },
    ],
  },
};

function CutReadyRefDemo() {
  const ref = React.useRef<DslRendererRef>(null);
  const [info, setInfo] = React.useState('Click a button');

  const dsl: ElucimDocument = {
    version: '1.0',
    root: {
      type: 'player',
      preset: 'card',
      durationInFrames: 120,
      fps: 30,
      controls: true,
      children: [
        { type: 'rect', x: 0, y: 0, width: 640, height: 360, fill: '#0d0d2a' },
        { type: 'circle', cx: 320, cy: 180, r: 80, fill: '#4a9eff', opacity: 0.8 },
        { type: 'text', content: 'DslRendererRef Demo', x: 320, y: 180, fontSize: 22, fill: '#fff', textAnchor: 'middle' },
      ],
    },
  };

  return (
    <div>
      <DslRenderer ref={ref} dsl={dsl} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }} data-testid="ref-controls">
        <button data-testid="ref-play" onClick={() => { ref.current?.play(); setInfo('Playing'); }}>Play</button>
        <button data-testid="ref-pause" onClick={() => { ref.current?.pause(); setInfo('Paused'); }}>Pause</button>
        <button data-testid="ref-seek" onClick={() => { ref.current?.seekToFrame(60); setInfo('Seeked to F60'); }}>Seek F60</button>
        <button data-testid="ref-info" onClick={() => {
          const total = ref.current?.getTotalFrames() ?? 0;
          const playing = ref.current?.isPlaying() ?? false;
          const svg = ref.current?.getSvgElement();
          setInfo(`Total: ${total}, Playing: ${playing}, SVG: ${svg?.tagName ?? 'null'}`);
        }}>Get Info</button>
      </div>
      <p data-testid="ref-output" style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>{info}</p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 36, marginBottom: 8, color: '#fff' }}>
        ✨ Elucim Demo
      </h1>
      <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>
        Animate concepts. Illuminate understanding.
      </p>

      <AllPrimitivesDemo />
      <EasingDemo />
      <SequenceTimingDemo />
      <TransformDemo />

      <hr style={{ borderColor: '#333', margin: '32px 0' }} />
      <h2 style={{ marginBottom: 16 }}>Phase 2: Math Primitives</h2>

      <AxesFunctionDemo />
      <VectorDemo />
      <TangentLineDemo />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <MatrixDemo />
        <GraphDemo />
      </div>

      <hr style={{ borderColor: '#333', margin: '32px 0' }} />
      <h2 style={{ marginBottom: 16 }}>New Primitives</h2>

      <LaTeXDemo />
      <VectorFieldDemo />
      <PolygonDemo />

      <hr style={{ borderColor: '#333', margin: '32px 0' }} />
      <h2 style={{ marginBottom: 16 }}>Phase 3: Animation System</h2>

      <FadeAnimationsDemo />
      <WriteDemo />
      <TransformAnimDemo />
      <StaggerDemo />
      <MorphDemo />

      <hr style={{ borderColor: '#333', margin: '32px 0' }} />
      <h2 style={{ marginBottom: 16 }}>Individual Primitives</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <CircleDemo />
        <LineDemo />
        <ArrowDemo />
        <RectDemo />
        <TextDemo />
      </div>

      <hr style={{ borderColor: '#333', margin: '32px 0' }} />
      <h2 style={{ marginBottom: 16 }}>🎤 Presentation Mode</h2>
      <p style={{ color: '#888', marginBottom: 16 }}>
        Click the presentation below to navigate. Use ← → keys, Space, or F for fullscreen.
      </p>

      <div id="presentation-demo" style={{ maxWidth: 960, margin: '0 auto' }}>
        <Presentation
          width={960}
          height={540}
          transition="fade"
          transitionDuration={500}
          showNotes
        >
          <Slide title="Welcome" notes="Introduce Elucim and its purpose.">
            <Player width={960} height={540} fps={60} durationInFrames={120} background="#111127" controls={false} autoPlay loop>
              <Sequence from={0} durationInFrames={120}>
                <Text x={480} y={200} fill="#4ecdc4" fontSize={48} textAnchor="middle" fadeIn={30}>
                  ✨ Elucim
                </Text>
              </Sequence>
              <Sequence from={30} durationInFrames={90}>
                <Text x={480} y={280} fill="#888" fontSize={22} textAnchor="middle" fadeIn={30}>
                  Animate concepts. Illuminate understanding.
                </Text>
              </Sequence>
              <Sequence from={60} durationInFrames={60}>
                <Stagger staggerDelay={8}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <FadeIn key={i} duration={20}>
                      <Circle cx={330 + i * 65} cy={380} r={20} stroke="#4ecdc4" fill="rgba(78,205,196,0.15)" strokeWidth={2} />
                    </FadeIn>
                  ))}
                </Stagger>
              </Sequence>
            </Player>
          </Slide>

          <Slide title="The Unit Circle" notes="Show the relationship between sine, cosine and the unit circle.">
            <Player width={960} height={540} fps={60} durationInFrames={150} background="#111127" controls={false} autoPlay loop>
              <Axes domain={[-2, 2]} range={[-2, 2]} origin={[480, 270]} scale={120} showGrid axisColor="#444" gridColor="#1a1a2e" />
              <Circle cx={480} cy={270} r={120} stroke="#4ecdc4" strokeWidth={2} fill="none" draw={40} />
              <Sequence from={40} durationInFrames={110}>
                <FunctionPlot fn={(x) => Math.sqrt(1 - x * x)} domain={[-1, 1]} origin={[480, 270]} scale={120} color="#ff6b6b" strokeWidth={2} draw={40} />
              </Sequence>
              <Sequence from={60} durationInFrames={90}>
                <LaTeX expression="\sin^2\theta + \cos^2\theta = 1" x={480} y={60} fontSize={28} color="#ffe66d" fadeIn={25} />
              </Sequence>
            </Player>
          </Slide>

          <Slide title="Taylor Series" notes="Visual demonstration of Taylor series approximation of sin(x).">
            <Player width={960} height={540} fps={60} durationInFrames={180} background="#111127" controls={false} autoPlay loop>
              <Axes domain={[-4, 4]} range={[-2, 2]} origin={[480, 270]} scale={60} showGrid axisColor="#444" gridColor="#1a1a2e" />
              <FunctionPlot fn={Math.sin} domain={[-4, 4]} origin={[480, 270]} scale={60} color="#666" strokeWidth={1} draw={20} />
              <Sequence from={20} durationInFrames={160}>
                <FunctionPlot fn={(x) => x} domain={[-4, 4]} origin={[480, 270]} scale={60} color="#ff6b6b" strokeWidth={2} draw={30} />
              </Sequence>
              <Sequence from={60} durationInFrames={120}>
                <FunctionPlot fn={(x) => x - x ** 3 / 6} domain={[-4, 4]} origin={[480, 270]} scale={60} color="#4ecdc4" strokeWidth={2} draw={30} />
              </Sequence>
              <Sequence from={100} durationInFrames={80}>
                <FunctionPlot fn={(x) => x - x ** 3 / 6 + x ** 5 / 120} domain={[-3.5, 3.5]} origin={[480, 270]} scale={60} color="#ffe66d" strokeWidth={2} draw={30} />
              </Sequence>
              <Sequence from={30} durationInFrames={150}>
                <LaTeX expression="\sin(x) \approx x - \frac{x^3}{3!} + \frac{x^5}{5!} - \cdots" x={480} y={50} fontSize={24} color="#e0e0e0" fadeIn={25} />
              </Sequence>
            </Player>
          </Slide>

          <Slide title="Vector Fields" notes="Demonstrate a rotation vector field and its properties." background="#0a0a15">
            <Player width={960} height={540} fps={60} durationInFrames={120} background="#0a0a15" controls={false} autoPlay loop>
              <Axes domain={[-4, 4]} range={[-3, 3]} origin={[480, 270]} scale={50} showGrid axisColor="#333" gridColor="#181828" />
              <VectorField
                fn={(x, y) => [-y, x]}
                domain={[-4, 4]} range={[-3, 3]}
                origin={[480, 270]} scale={50}
                color="#a29bfe" arrowScale={0.35} normalize fadeIn={40}
              />
              <Sequence from={50} durationInFrames={70}>
                <LaTeX expression="\mathbf{F}(x,y) = (-y, x)" x={480} y={50} fontSize={26} color="#a29bfe" fadeIn={20} />
              </Sequence>
              <Sequence from={70} durationInFrames={50}>
                <Text x={480} y={510} fill="#666" fontSize={14} textAnchor="middle" fadeIn={15}>
                  A rotation field — every vector is tangent to a circle centered at the origin
                </Text>
              </Sequence>
            </Player>
          </Slide>

          <Slide title="Thank You" notes="Closing slide. Mention the Explorer and docs.">
            <Player width={960} height={540} fps={60} durationInFrames={120} background="#111127" controls={false} autoPlay loop>
              <Sequence from={0} durationInFrames={120}>
                <Text x={480} y={220} fill="#4ecdc4" fontSize={42} textAnchor="middle" fadeIn={30}>
                  Thank you!
                </Text>
              </Sequence>
              <Sequence from={30} durationInFrames={90}>
                <Text x={480} y={290} fill="#888" fontSize={18} textAnchor="middle" fadeIn={25}>
                  github.com/example/elucim · Explorer at :3200 · Docs at :3300
                </Text>
              </Sequence>
              <Sequence from={60} durationInFrames={60}>
                <Stagger staggerDelay={6}>
                  {['🎬', '📐', '✍️', '🎮', '📹'].map((emoji, i) => (
                    <FadeIn key={i} duration={15}>
                      <Text x={330 + i * 65} y={380} fill="#e0e0e0" fontSize={32} textAnchor="middle">{emoji}</Text>
                    </FadeIn>
                  ))}
                </Stagger>
              </Sequence>
            </Player>
          </Slide>
        </Presentation>
      </div>

      <hr style={{ borderColor: '#333', margin: '32px 0' }} />
      <h2 style={{ marginBottom: 16 }}>🤖 DSL Renderer</h2>
      <p style={{ color: '#888', marginBottom: 16 }}>
        These diagrams are rendered from JSON DSL documents — the same format an AI agent would produce.
      </p>

      <section id="dsl-hello">
        <h3 style={{ color: '#aaa', marginBottom: 8 }}>Hello Circle (DSL)</h3>
        <DslRenderer dsl={helloCircleDsl} />
      </section>

      <section id="dsl-math" style={{ marginTop: 24 }}>
        <h3 style={{ color: '#aaa', marginBottom: 8 }}>Math Demo (DSL)</h3>
        <DslRenderer dsl={mathDemoDsl} />
      </section>

      <section id="dsl-animated" style={{ marginTop: 24 }}>
        <h3 style={{ color: '#aaa', marginBottom: 8 }}>Animated Scene (DSL)</h3>
        <DslRenderer dsl={animatedSceneDsl} />
      </section>

      <section id="dsl-error" style={{ marginTop: 24 }}>
        <h3 style={{ color: '#aaa', marginBottom: 8 }}>Error Handling (DSL)</h3>
        <DslRenderer dsl={invalidDsl as any} />
      </section>

      <section id="dsl-calculus" style={{ marginTop: 32 }}>
        <h3 style={{ color: '#aaa', marginBottom: 8 }}>📐 The Calculus of Change — Full Presentation (DSL)</h3>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
          9-slide animated presentation covering functions, derivatives, trig, vectors, vector fields, matrices, graphs, and Euler's identity — all from a single JSON document.
        </p>
        <DslRenderer dsl={calculusExplained as ElucimDocument} />
      </section>

      <section id="dsl-agentic" style={{ marginTop: 32 }}>
        <h3 style={{ color: '#aaa', marginBottom: 8 }}>🤖 From Words to Agents — Full Presentation (DSL Builder)</h3>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
          12-slide animated presentation covering tokenization, embeddings, attention, transformers, autoregressive generation, tool calling, and the agentic loop — built using the Elucim DSL Builder API.
        </p>
        <DslRenderer dsl={agenticLoop as ElucimDocument} />
      </section>

      <hr style={{ borderColor: '#333', margin: '32px 0' }} />
      <h2 style={{ marginBottom: 16 }}>🎬 CutReady Integration</h2>
      <p style={{ color: '#888', marginBottom: 16 }}>
        Features for headless rendering, static poster frames, presets, theme tokens, and imperative control.
      </p>

      <section id="cutready-presets" style={{ marginTop: 24 }}>
        <h3 style={{ color: '#aaa', marginBottom: 8 }}>Scene Presets</h3>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>card (640×360), slide (1280×720), square (600×600)</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div data-testid="preset-card"><DslRenderer dsl={presetCardDsl} /></div>
          <div data-testid="preset-slide"><DslRenderer dsl={presetSlideDsl} /></div>
          <div data-testid="preset-square"><DslRenderer dsl={presetSquareDsl} /></div>
        </div>
      </section>

      <section id="cutready-theme" style={{ marginTop: 24 }}>
        <h3 style={{ color: '#aaa', marginBottom: 8 }}>Theme Tokens</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div data-testid="theme-default">
            <p style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Default</p>
            <DslRenderer dsl={presetCardDsl} />
          </div>
          <div data-testid="theme-warm">
            <p style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Warm Theme</p>
            <DslRenderer dsl={presetCardDsl} theme={{ foreground: '#ffeedd', background: '#2d1a0e', accent: '#ff6b35' }} />
          </div>
          <div data-testid="theme-cool">
            <p style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Cool Theme</p>
            <DslRenderer dsl={presetCardDsl} theme={{ foreground: '#e0f0ff', background: '#0a1628', accent: '#00bfff' }} />
          </div>
        </div>
      </section>

      <section id="cutready-poster" style={{ marginTop: 24 }}>
        <h3 style={{ color: '#aaa', marginBottom: 8 }}>Poster Mode (Static Frames)</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div data-testid="poster-first">
            <p style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>poster=&quot;first&quot;</p>
            <DslRenderer dsl={posterDsl} poster="first" />
          </div>
          <div data-testid="poster-last">
            <p style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>poster=&quot;last&quot;</p>
            <DslRenderer dsl={posterDsl} poster="last" />
          </div>
          <div data-testid="poster-frame45">
            <p style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>poster=45</p>
            <DslRenderer dsl={posterDsl} poster={45} />
          </div>
        </div>
      </section>

      <section id="cutready-errors" style={{ marginTop: 24 }}>
        <h3 style={{ color: '#aaa', marginBottom: 8 }}>Enhanced Error Reporting</h3>
        <div data-testid="rich-errors">
          <DslRenderer dsl={richErrorDsl as any} onError={(errs) => console.log('DSL errors:', errs)} />
        </div>
      </section>

      <section id="cutready-ref" style={{ marginTop: 24 }}>
        <h3 style={{ color: '#aaa', marginBottom: 8 }}>DslRendererRef — Imperative Control</h3>
        <div data-testid="ref-demo">
          <CutReadyRefDemo />
        </div>
      </section>
    </div>
  );
}
