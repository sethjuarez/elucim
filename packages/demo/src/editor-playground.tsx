import React from 'react';
import ReactDOM from 'react-dom/client';
import { ElucimEditor } from '@elucim/editor';
import { getDocumentLinearDuration, validateDocument } from '@elucim/dsl';
import type { ElucimDocument } from '@elucim/dsl';

declare global {
  interface Window {
    __elucimEditor?: {
      getDocument: () => ElucimDocument;
    };
  }
}

/**
 * Pre-populated normalized document with several elements for visual testing.
 */
function createDemoDocument(isLight: boolean): ElucimDocument {
  return {
  version: '2.0',
  scene: {
    type: 'player',
    width: 1280,
    height: 720,
    fps: 60,
    background: isLight ? '#f1f5f9' : '#0f172a',
    controls: true,
    loop: true,
    children: ['rect-1', 'circle-1', 'line-1', 'arrow-1', 'text-1', 'matrix-1', 'barchart-1', 'graph-1', 'polygon-1'],
  },
  elements: {
    'rect-1': { id: 'rect-1', type: 'rect', props: { type: 'rect', x: 90, y: 70, width: 220, height: 140, fill: 'none', stroke: '#4fc3f7', strokeWidth: 3, opacity: 1 } },
    'circle-1': { id: 'circle-1', type: 'circle', props: { type: 'circle', cx: 540, cy: 140, r: 80, fill: 'none', stroke: '#a78bfa', strokeWidth: 3, opacity: 1 } },
    'line-1': { id: 'line-1', type: 'line', props: { type: 'line', x1: 100, y1: 315, x2: 390, y2: 315, stroke: '#34d399', strokeWidth: 3 } },
    'arrow-1': { id: 'arrow-1', type: 'arrow', props: { type: 'arrow', x1: 570, y1: 360, x2: 870, y2: 250, stroke: '#fbbf24', strokeWidth: 3, headSize: 16 } },
    'text-1': { id: 'text-1', type: 'text', props: { type: 'text', x: 560, y: 510, content: 'Elucim Editor', fill: isLight ? '#1e293b' : '#e0e0e0', fontSize: 42, textAnchor: 'middle' } },
    'matrix-1': { id: 'matrix-1', type: 'matrix', props: { type: 'matrix', values: [[1, 0], [0, 1]], x: 800, y: 420, color: isLight ? '#1e293b' : '#e0e0e0', cellSize: 62 } },
    'barchart-1': { id: 'barchart-1', type: 'barChart', props: { type: 'barChart', bars: [{ label: 'A', value: 30 }, { label: 'B', value: 70 }, { label: 'C', value: 50 }], x: 80, y: 410, width: 280, height: 190, barColor: '#4fc3f7', labelColor: isLight ? '#1e293b' : '#e0e0e0', showValues: true } },
    'graph-1': { id: 'graph-1', type: 'graph', props: { type: 'graph', nodes: [{ id: 'a', x: 400, y: 230, label: 'A' }, { id: 'b', x: 500, y: 230, label: 'B' }, { id: 'c', x: 450, y: 330, label: 'C' }], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }], nodeColor: '#a78bfa', edgeColor: '#64748b' } },
    'polygon-1': { id: 'polygon-1', type: 'polygon', props: { type: 'polygon', points: [[780, 70], [835, 112], [814, 174], [746, 174], [725, 112]], fill: 'none', stroke: '#f472b6', strokeWidth: 3, closed: true } },
  },
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

function readDocumentFromStorage(params: URLSearchParams): ElucimDocument | undefined {
  if (params.get('document') !== 'localStorage') return undefined;
  const key = params.get('docKey') ?? 'elucim-editor-document';
  const raw = window.localStorage.getItem(key);
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as ElucimDocument;
  const validation = validateDocument(parsed);
  if (!validation.valid) {
    throw new Error(`Invalid stored editor document: ${validation.errors.map(error => `${error.path}: ${error.message}`).join('; ')}`);
  }
  return parsed;
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const isLight = params.get('theme') === 'light';
  const documentMode = params.get('document');
  const docKey = params.get('docKey');
  const initialDoc = React.useMemo(() => {
    return readDocumentFromStorage(params) ?? createDemoDocument(isLight);
  }, [documentMode, docKey, isLight]);
  const [doc, setDoc] = React.useState<ElucimDocument>(initialDoc);

  React.useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  React.useEffect(() => {
    if (documentMode !== 'localStorage') return;
    window.__elucimEditor = {
      getDocument: () => doc,
    };
    return () => {
      delete window.__elucimEditor;
    };
  }, [doc, documentMode]);

  const lastFrame = getDocumentLinearDuration(doc) - 1;
  return (
    <ElucimEditor
      initialDocument={doc}
      initialFrame={lastFrame}
      onDocumentChange={setDoc}
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
