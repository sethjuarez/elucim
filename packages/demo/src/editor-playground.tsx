import React from 'react';
import ReactDOM from 'react-dom/client';
import { ElucimEditor } from '@elucim/editor';
import { getDocumentLinearDuration, migrateV1ToV2 } from '@elucim/dsl';
import type { ElucimDocument, ElucimV2Document } from '@elucim/dsl';

/**
 * Pre-populated document with several elements for visual testing.
 * Some elements have fadeIn animations to demonstrate initialFrame.
 */
const DEMO_DOCUMENT: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'player',
    width: 1920,
    height: 1080,
    durationInFrames: 120,
    fps: 60,
    background: '#0f172a',
    controls: true,
    loop: true,
    children: [
      {
        type: 'rect',
        id: 'rect-1',
        x: 80,
        y: 60,
        width: 160,
        height: 100,
        fill: 'none',
        stroke: '#4fc3f7',
        strokeWidth: 2,
        fadeIn: 30,
      },
      {
        type: 'circle',
        id: 'circle-1',
        cx: 500,
        cy: 120,
        r: 60,
        fill: 'none',
        stroke: '#a78bfa',
        strokeWidth: 2,
        fadeIn: 20,
      },
      {
        type: 'line',
        id: 'line-1',
        x1: 100,
        y1: 300,
        x2: 350,
        y2: 300,
        stroke: '#34d399',
        strokeWidth: 2,
      },
      {
        type: 'arrow',
        id: 'arrow-1',
        x1: 400,
        y1: 350,
        x2: 650,
        y2: 250,
        stroke: '#fbbf24',
        strokeWidth: 2,
        headSize: 12,
      },
      {
        type: 'text',
        id: 'text-1',
        x: 400,
        y: 480,
        content: 'Elucim Editor',
        fill: '#e0e0e0',
        fontSize: 28,
        textAnchor: 'middle',
      },
      {
        type: 'matrix',
        id: 'matrix-1',
        values: [[1, 0], [0, 1]],
        x: 600,
        y: 400,
        color: '#e0e0e0',
        cellSize: 48,
      },
      {
        type: 'barChart',
        id: 'barchart-1',
        bars: [
          { label: 'A', value: 30 },
          { label: 'B', value: 70 },
          { label: 'C', value: 50 },
        ],
        x: 50,
        y: 380,
        width: 200,
        height: 160,
        barColor: '#4fc3f7',
        labelColor: '#e0e0e0',
        showValues: true,
      },
      {
        type: 'graph',
        id: 'graph-1',
        nodes: [
          { id: 'a', x: 250, y: 200, label: 'A' },
          { id: 'b', x: 350, y: 200, label: 'B' },
          { id: 'c', x: 300, y: 280, label: 'C' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'c', to: 'a' },
        ],
        nodeColor: '#a78bfa',
        edgeColor: '#64748b',
      },
      {
        type: 'polygon',
        id: 'polygon-1',
        points: [
          [680, 60],
          [727, 95],
          [709, 145],
          [651, 145],
          [633, 95],
        ],
        fill: 'none',
        stroke: '#f472b6',
        strokeWidth: 2,
        closed: true,
      },
    ] as any[],
  },
};

function createDemoDocument(isLight: boolean): ElucimDocument {
  return {
    ...DEMO_DOCUMENT,
    root: {
      ...DEMO_DOCUMENT.root,
      background: isLight ? '#f1f5f9' : '#0f172a',
      children: (DEMO_DOCUMENT.root as any).children.map((el: any) => {
        if (el.id === 'text-1') return { ...el, fill: isLight ? '#1e293b' : '#e0e0e0' };
        if (el.id === 'matrix-1') return { ...el, color: isLight ? '#1e293b' : '#e0e0e0' };
        if (el.id === 'barchart-1') return { ...el, labelColor: isLight ? '#1e293b' : '#e0e0e0' };
        return el;
      }),
    } as any,
  };
}

function createV2DemoDocument(doc: ElucimDocument): ElucimV2Document {
  const v2 = migrateV1ToV2(doc);
  return {
    ...v2,
    elements: Object.fromEntries(Object.entries(v2.elements).map(([id, element]) => {
      const props = { ...element.props };
      delete props.fadeIn;
      delete props.fadeOut;
      delete props.draw;
      return [id, { ...element, props }];
    })),
    metadata: {
      title: 'Editor authoring sample',
      intent: 'Demonstrate native timeline and state-machine editing in the Elucim editor.',
      polishLevel: 'draft',
      notes: [
        'Use the timeline footer to add/edit timelines, tracks, and keyframes.',
        'Use the State Machine workspace to connect animation states and transitions.',
      ],
    },
    timelines: {
      intro: {
        id: 'intro',
        duration: 90,
        tracks: [
          { target: 'rect-1', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 90, value: 1, easing: 'easeOutCubic' }] },
          { target: 'circle-1', property: 'scale', keyframes: [{ frame: 0, value: 0.75 }, { frame: 90, value: 1, easing: 'easeOutCubic' }] },
        ],
      },
      focus: {
        id: 'focus',
        duration: 90,
        tracks: [
          { target: 'text-1', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 60, value: 1, easing: 'easeOutCubic' }] },
          { target: 'text-1', property: 'scale', keyframes: [{ frame: 0, value: 0.9 }, { frame: 90, value: 1.08, easing: 'easeOutCubic' }] },
        ],
      },
    },
    stateMachines: {
      walkthrough: {
        id: 'walkthrough',
        entry: 'idle',
        inputs: { reset: { type: 'trigger' } },
        states: {
          idle: { timeline: 'intro' },
          focus: { timeline: 'focus' },
        },
        transitions: [
          { id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' },
          { id: 'idle-next', from: 'idle', to: 'focus', exitTime: 1 },
          { id: 'any-reset', from: 'any', to: 'entry', trigger: 'reset' },
        ],
      },
    },
    defaultStateMachine: 'walkthrough',
  };
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const isLight = params.get('theme') === 'light';
  const initialDoc = React.useMemo(() => {
    const doc = createDemoDocument(isLight);
    return createV2DemoDocument(doc);
  }, [isLight]);
  const [doc, setDoc] = React.useState<ElucimDocument | ElucimV2Document>(initialDoc);

  React.useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  const lastFrame = doc.version === '2.0'
    ? getDocumentLinearDuration(doc) - 1
    : (doc.root as any).durationInFrames! - 1;
  return (
    <ElucimEditor
      initialDocument={doc}
      initialFrame={lastFrame}
      onV2DocumentChange={setDoc}
      editorTheme={isLight ? { 'color-scheme': 'light' } : undefined}
      style={{ width: '100%', height: '100vh' }}
    />
  );
}

ReactDOM.createRoot(document.getElementById('editor-root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
