import type { ElucimDocument } from '@elucim/dsl';

export function createNewDocument(): ElucimDocument {
  return {
    version: '2.0',
    scene: {
      type: 'player',
      width: 1280,
      height: 720,
      fps: 60,
      background: '#0f172a',
      controls: true,
      loop: true,
      children: ['title', 'frame'],
    },
    elements: {
      title: {
        id: 'title',
        type: 'text',
        layout: { x: 640, y: 320 },
        props: {
          type: 'text',
          x: 640,
          y: 320,
          content: 'Untitled Elucim Scene',
          fill: '#e2e8f0',
          fontSize: 44,
          textAnchor: 'middle',
        },
      },
      frame: {
        id: 'frame',
        type: 'rect',
        layout: { x: 280, y: 210, width: 720, height: 300 },
        props: {
          type: 'rect',
          x: 280,
          y: 210,
          width: 720,
          height: 300,
          fill: 'none',
          stroke: '#6c5ce7',
          strokeWidth: 4,
          rx: 24,
        },
      },
    },
    metadata: {
      title: 'Untitled Elucim Scene',
      polishLevel: 'draft',
    },
  };
}
