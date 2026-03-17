import React from 'react';
import ReactDOM from 'react-dom/client';
import { ElucimEditor } from '@elucim/editor';
import type { ElucimDocument } from '@elucim/dsl';

/**
 * Pre-populated document with several elements for visual testing.
 * No fadeIn/draw animations — elements visible immediately at frame 0.
 */
const DEMO_DOCUMENT: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'player',
    width: 800,
    height: 600,
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

function App() {
  return (
    <ElucimEditor
      initialDocument={DEMO_DOCUMENT}
      style={{ width: '100%', height: '100vh' }}
    />
  );
}

ReactDOM.createRoot(document.getElementById('editor-root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
