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
  return (
    <Player width={500} height={250} fps={30} durationInFrames={120} autoPlay loop>
      {/* Labels visible immediately */}
      <Text x={125} y={220} fill="currentColor" fontSize={12} textAnchor="middle" opacity={0.5}>FadeIn</Text>
      <Text x={375} y={220} fill="currentColor" fontSize={12} textAnchor="middle" opacity={0.5}>FadeOut</Text>
      {/* Left: circle fades in */}
      <Circle cx={125} cy={125} r={50} stroke="#6c5ce7" strokeWidth={3} fill="rgba(108,92,231,0.2)" fadeIn={30} />
      <Sequence from={30} durationInFrames={90}>
        <FadeIn duration={20}>
          <Text x={125} y={130} fill="#6c5ce7" fontSize={14} textAnchor="middle">Visible!</Text>
        </FadeIn>
      </Sequence>
      {/* Right: circle appears then fades out */}
      <Sequence from={0} durationInFrames={60}>
        <Circle cx={375} cy={125} r={50} stroke="#ff6b6b" strokeWidth={3} fill="rgba(255,107,107,0.2)" fadeIn={20} />
      </Sequence>
      <Sequence from={60} durationInFrames={60}>
        <FadeOut duration={40}>
          <Circle cx={375} cy={125} r={50} stroke="#ff6b6b" strokeWidth={3} fill="rgba(255,107,107,0.2)" />
        </FadeOut>
      </Sequence>
      <Sequence from={60} durationInFrames={60}>
        <FadeIn duration={15}>
          <Text x={375} y={130} fill="#ff6b6b" fontSize={14} textAnchor="middle">Gone!</Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}

export function DrawDemo() {
  return (
    <Player width={500} height={250} fps={30} durationInFrames={90} autoPlay loop>
      {/* Use built-in draw prop for stroke animation */}
      <Circle cx={125} cy={125} r={60} stroke="#6c5ce7" strokeWidth={3} fill="none" draw={40} />
      <Sequence from={10} durationInFrames={80}>
        <Write duration={30}>
          <Text x={125} y={130} fill="#6c5ce7" fontSize={16} textAnchor="middle">Draw</Text>
        </Write>
      </Sequence>
      <Sequence from={20} durationInFrames={70}>
        <Rect x={300} y={65} width={120} height={120} stroke="#ff6b6b" strokeWidth={3} fill="none" rx={8} draw={40} />
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
        scale={{ from: 0.5, to: 1.2 }}
        rotate={{ from: 0, to: 360 }}
        opacity={{ from: 0.3, to: 1 }}
        duration={60}
      >
        <Circle cx={150} cy={125} r={40} stroke="#6c5ce7" strokeWidth={3} fill="rgba(108,92,231,0.2)" />
      </Transform>
      <Sequence from={15} durationInFrames={75}>
        <Morph
          fromColor="#ff6b6b"
          toColor="#4ecdc4"
          fromScale={0.8}
          toScale={1.3}
          fromOpacity={0.3}
          toOpacity={1}
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
          <Text x={250} y={200} fill="currentColor" fontSize={12} textAnchor="middle">
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
          <Text x={250} y={180} fill="currentColor" fontSize={24} textAnchor="middle">
            Hello World
          </Text>
        </FadeIn>
      </Sequence>
      <Sequence from={60} durationInFrames={60}>
        <FadeIn duration={20}>
          <Text x={250} y={300} fill="currentColor" fontSize={14} textAnchor="middle">
            Your first Elucim scene ✨
          </Text>
        </FadeIn>
      </Sequence>
    </Player>
  );
}

// ─── Hero Demo ──────────────────────────────────────────────────────

export function HeroDemo() {
  const sinExpr = 'f(x) = \\sin(x)';
  const cosExpr = 'g(x) = \\cos(x)';
  return (
    <Player width={600} height={200} fps={30} durationInFrames={150} autoPlay loop
            background="transparent">
      <Axes origin={[300, 110]} domain={[-4, 4]} range={[-1.5, 1.5]} scale={50}
            axisColor="currentColor" labelColor="currentColor" showGrid={false} />
      <Sequence from={0} durationInFrames={150}>
        <FunctionPlot fn={(x: number) => Math.sin(x)} domain={[-4, 4]}
                      origin={[300, 110]} scale={50} color="#6c5ce7" strokeWidth={2.5} draw={50} />
      </Sequence>
      <Sequence from={30} durationInFrames={120}>
        <FunctionPlot fn={(x: number) => Math.cos(x)} domain={[-4, 4]}
                      origin={[300, 110]} scale={50} color="#ff6b6b" strokeWidth={2} draw={50} />
      </Sequence>
      <Sequence from={60} durationInFrames={90}>
        <FadeIn duration={20}>
          <LaTeX expression={sinExpr} x={480} y={40} fontSize={16} color="#6c5ce7" />
        </FadeIn>
      </Sequence>
      <Sequence from={75} durationInFrames={75}>
        <FadeIn duration={20}>
          <LaTeX expression={cosExpr} x={480} y={70} fontSize={16} color="#ff6b6b" />
        </FadeIn>
      </Sequence>
    </Player>
  );
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
