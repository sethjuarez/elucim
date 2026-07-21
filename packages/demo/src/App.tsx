import React from 'react';
import { DslRenderer } from '@elucim/dsl';
import type { DslRendererRef, ElucimDocument } from '@elucim/dsl';
import {
  Element,
  Reveal,
  Scene,
  State,
  StateMachine,
  Text,
  Timeline,
  Track,
  Transition,
} from '@elucim/dsl/react';

const helloDocument: ElucimDocument = {
  version: '2.0',
  scene: {
    type: 'player',
    width: 800,
    height: 400,
    fps: 30,
    background: '#0d0d1a',
    children: ['orb', 'label'],
  },
  elements: {
    orb: { id: 'orb', type: 'circle', props: { type: 'circle', cx: 400, cy: 180, r: 80, fill: 'none', stroke: '#3b82f6', strokeWidth: 3 } },
    label: { id: 'label', type: 'text', props: { type: 'text', x: 400, y: 320, content: 'Hello, Elucim!', fill: '#fff', fontSize: 28, textAnchor: 'middle' } },
  },
  timelines: {
    intro: {
      id: 'intro',
      duration: 60,
      tracks: [{ target: 'orb', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 20, value: 1 }] }],
      effects: [{ id: 'label-reveal', kind: 'reveal', targets: ['label'], from: 18, duration: 30 }],
    },
  },
  stateMachines: {
    main: {
      id: 'main',
      entry: 'intro',
      states: { intro: { timeline: 'intro' } },
      transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
    },
  },
  defaultStateMachine: 'main',
};

const mathDocument: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 400, fps: 30, background: '#0d0d1a', children: ['axes', 'plot', 'vector'] },
  elements: {
    axes: { id: 'axes', type: 'axes', props: { type: 'axes', domain: [-5, 5], range: [-2, 2], origin: [400, 200], scale: 60, showGrid: true } },
    plot: { id: 'plot', type: 'functionPlot', props: { type: 'functionPlot', fn: 'sin(x)', domain: [-5, 5], origin: [400, 200], scale: 60, color: '#4a9eff' } },
    vector: { id: 'vector', type: 'vector', props: { type: 'vector', from: [0, 0], to: [2, 1], origin: [400, 200], scale: 60, color: '#ffe66d', label: 'u' } },
  },
};

const presetCardDocument: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', preset: 'card', fps: 30, background: '#0d0d2a', children: ['background', 'orb', 'title'] },
  elements: {
    background: { id: 'background', type: 'rect', props: { type: 'rect', x: 20, y: 20, width: 600, height: 320, fill: '#1a1a3e', rx: 12 } },
    orb: { id: 'orb', type: 'circle', props: { type: 'circle', cx: 320, cy: 160, r: 72, fill: '#4a9eff', opacity: 0.8 } },
    title: { id: 'title', type: 'text', props: { type: 'text', content: 'Canonical document', x: 320, y: 285, fontSize: 24, fill: '#fff', textAnchor: 'middle' } },
  },
};

function CanonicalReactDemo() {
  return (
    <Scene type="player" width={800} height={260} background="#111127" defaultStateMachine="main">
      <Text id="headline" x={400} y={120} fill="#a29bfe" fontSize={40} textAnchor="middle">
        One canonical motion model
      </Text>
      <Text id="caption" x={400} y={175} fill="#94a3b8" fontSize={18} textAnchor="middle">
        JSX serializes to the same document as JSON and YAML.
      </Text>
      <Element id="badge" type="rect" x={330} y={195} width={140} height={32} fill="#3b82f6" />
      <Timeline id="intro" duration={60}>
        <Reveal id="headline-reveal" target="headline" from={0} duration={32} />
        <Reveal id="caption-reveal" target="caption" from={18} duration={30} strategy="type" />
        <Track target="badge" property="opacity" keyframes={[{ frame: 0, value: 0 }, { frame: 24, value: 1 }]} />
      </Timeline>
      <StateMachine id="main" entry="intro">
        <State id="intro" timeline="intro" />
        <Transition id="entry-intro" from="entry" to="intro" trigger="onStart" />
      </StateMachine>
    </Scene>
  );
}

function RefDemo() {
  const ref = React.useRef<DslRendererRef>(null);
  const [info, setInfo] = React.useState('Click a button');
  return (
    <div>
      <DslRenderer ref={ref} dsl={helloDocument} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }} data-testid="ref-controls">
        <button data-testid="ref-play" onClick={() => { ref.current?.play(); setInfo('Playing'); }}>Play</button>
        <button data-testid="ref-pause" onClick={() => { ref.current?.pause(); setInfo('Paused'); }}>Pause</button>
        <button data-testid="ref-seek" onClick={() => { ref.current?.seekToFrame(45); setInfo('Seeked to F45'); }}>Seek F45</button>
        <button data-testid="ref-info" onClick={() => setInfo(`Total: ${ref.current?.getTotalFrames() ?? 0}`)}>Get Info</button>
      </div>
      <p data-testid="ref-output" style={{ color: '#aaa', fontSize: 13 }}>{info}</p>
    </div>
  );
}

export function App() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 36, marginBottom: 8, color: '#fff' }}>✨ Elucim Demo</h1>
      <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>
        Canonical Elucim documents and timeline state machines.
      </p>

      <section id="dsl-hello">
        <h2>Hello Circle</h2>
        <DslRenderer dsl={helloDocument} />
      </section>
      <section id="dsl-math" style={{ marginTop: 24 }}>
        <h2>Math document</h2>
        <DslRenderer dsl={mathDocument} />
      </section>
      <section id="dsl-react-authoring" style={{ marginTop: 24 }}>
        <h2>Canonical React authoring</h2>
        <CanonicalReactDemo />
      </section>
      <section id="cutready-presets" style={{ marginTop: 24 }}>
        <h2>Scene preset</h2>
        <div data-testid="preset-card"><DslRenderer dsl={presetCardDocument} /></div>
      </section>
      <section id="cutready-theme" style={{ marginTop: 24 }}>
        <h2>Theme tokens</h2>
        <div data-testid="theme-default"><DslRenderer dsl={presetCardDocument} /></div>
        <div data-testid="theme-warm"><DslRenderer dsl={presetCardDocument} theme={{ foreground: '#ffeedd', background: '#2d1a0e', accent: '#ff6b35' }} /></div>
      </section>
      <section id="cutready-poster" style={{ marginTop: 24 }}>
        <h2>Poster frames</h2>
        <div data-testid="poster-first"><DslRenderer dsl={helloDocument} poster="first" /></div>
        <div data-testid="poster-last"><DslRenderer dsl={helloDocument} poster="last" /></div>
      </section>
      <section id="cutready-ref" style={{ marginTop: 24 }}>
        <h2>Renderer controls</h2>
        <div data-testid="ref-demo"><RefDemo /></div>
      </section>
    </div>
  );
}
