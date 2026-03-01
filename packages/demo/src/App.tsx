import React from 'react';
import {
  Player,
  Sequence,
  Circle,
  Line,
  Arrow,
  Rect,
  Text,
  interpolate,
  useCurrentFrame,
  easeOutCubic,
  easeInOutQuad,
  easeOutBounce,
  easeOutElastic,
  spring,
} from '@elucim/core';

// ─── Demo Scenes ────────────────────────────────────────────────────────────

/** Showcase: All basic Mobjects with animations */
function AllMobjectsDemo() {
  return (
    <section id="all-mobjects">
      <h2 style={{ padding: '16px 0 8px' }}>All Mobjects</h2>
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
            Elucim Mobjects
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

      <AllMobjectsDemo />
      <EasingDemo />
      <SequenceTimingDemo />
      <TransformDemo />

      <hr style={{ borderColor: '#333', margin: '32px 0' }} />
      <h2 style={{ marginBottom: 16 }}>Individual Mobjects</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <CircleDemo />
        <LineDemo />
        <ArrowDemo />
        <RectDemo />
        <TextDemo />
      </div>
    </div>
  );
}
