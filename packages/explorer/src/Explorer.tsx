import React, { useState } from 'react';
import { Arrow, Circle, Line, Player, Rect, Text } from '@elucim/core';

const primitives = [
  { name: 'Circle', render: () => <Circle cx={200} cy={150} r={72} fill="none" stroke="#4ecdc4" strokeWidth={3} /> },
  { name: 'Line', render: () => <Line x1={60} y1={220} x2={340} y2={80} stroke="#ff6b6b" strokeWidth={3} /> },
  { name: 'Arrow', render: () => <Arrow x1={60} y1={160} x2={340} y2={160} stroke="#ffe66d" strokeWidth={3} headSize={14} /> },
  { name: 'Rectangle', render: () => <Rect x={90} y={65} width={220} height={170} rx={16} fill="#1f2440" stroke="#a29bfe" strokeWidth={3} /> },
];

export function Explorer() {
  const [selected, setSelected] = useState(0);
  const primitive = primitives[selected];
  return (
    <main style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, padding: 24 }}>
      <nav aria-label="Primitives">
        <h1>Primitive explorer</h1>
        {primitives.map((item, index) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setSelected(index)}
            style={{ display: 'block', width: '100%', margin: '8px 0', fontWeight: selected === index ? 700 : 400 }}
          >
            {item.name}
          </button>
        ))}
      </nav>
      <section>
        <h2>{primitive.name}</h2>
        <p>Core primitives are static SVG building blocks. Author motion through canonical DSL timelines and state machines.</p>
        <Player width={400} height={300} background="#111127" durationInFrames={1} controls={false}>
          {primitive.render()}
          <Text x={200} y={275} fill="#ffffff" fontSize={16} textAnchor="middle">{primitive.name}</Text>
        </Player>
      </section>
    </main>
  );
}
