import { describe, it, expect } from 'vitest';
import { renderToSvgString } from '../renderer/renderToSvgString';
import type { ElucimDocument } from '../index';

const doc = {
  version: 'render-tree' as const,
  root: {
    type: 'scene' as const,
    durationInFrames: 30,
    width: 400,
    height: 300,
    children: [{ type: 'circle' as const, cx: 200, cy: 150, r: 50, fill: '#ff0000' }],
  },
};

describe('renderToSvgString', () => {
  it('returns a string containing <svg', () => {
    const svg = renderToSvgString(doc as any, 0);
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
  });

  it('renders a circle element into the SVG output', () => {
    const svg = renderToSvgString(doc as any, 0);
    expect(svg).toContain('<circle');
  });

  it('renders at a different frame without error', () => {
    const svgFrame0 = renderToSvgString(doc as any, 0);
    const svgFrame15 = renderToSvgString(doc as any, 15);
    const svgFrame29 = renderToSvgString(doc as any, 29);

    expect(svgFrame0).toContain('<svg');
    expect(svgFrame15).toContain('<svg');
    expect(svgFrame29).toContain('<svg');
  });

  it('throws on invalid DSL', () => {
    const bad = { version: 'render-tree', root: { type: 'scene', children: [] } };
    expect(() => renderToSvgString(bad as any, 0)).toThrow('DSL validation failed');
  });

  it('accepts width/height overrides via options', () => {
    const svg = renderToSvgString(doc as any, 0, { width: 800, height: 600 });
    expect(svg).toContain('<svg');
  });

  it('renders canonical normalized documents', () => {
    const normalized: ElucimDocument = {
      version: '2.0',
      scene: {
        type: 'scene',
        width: 400,
        height: 300,
        children: ['circle'],
      },
      elements: {
        circle: {
          id: 'circle',
          type: 'circle',
          props: { type: 'circle', cx: 200, cy: 150, r: 50, fill: '#ff0000' },
        },
      },
    };

    const svg = renderToSvgString(normalized, 0);

    expect(svg).toContain('<svg');
    expect(svg).toContain('<circle');
  });

  it('maps a timeline camera through a clipped nested SVG viewport', () => {
    const normalized: ElucimDocument = {
      version: '2.0',
      scene: {
        type: 'scene',
        width: 400,
        height: 300,
        children: ['circle'],
      },
      elements: {
        circle: {
          id: 'circle',
          type: 'circle',
          props: { type: 'circle', cx: 200, cy: 150, r: 50, fill: '#ff0000' },
        },
      },
      timelines: {
        focus: {
          id: 'focus',
          duration: 1,
          tracks: [],
          camera: {
            coordinateSpace: 'scene',
            fit: 'cover',
            keyframes: [{ frame: 0, viewport: { x: 100, y: 75, width: 200, height: 150 } }],
          },
        },
      },
    };

    const svg = renderToSvgString(normalized, 0, { timelineId: 'focus' });

    expect(svg).toContain('data-elucim-camera-viewport');
    expect(svg).toContain('viewBox="100 75 200 150"');
    expect(svg).toContain('overflow="hidden"');
  });

  it('evaluates a selected timeline camera for static SVG export', () => {
    const normalized: ElucimDocument = {
      version: '2.0',
      scene: { type: 'scene', width: 400, height: 300, children: ['circle'] },
      elements: {
        circle: {
          id: 'circle',
          type: 'circle',
          props: { type: 'circle', cx: 200, cy: 150, r: 50, fill: '#ff0000' },
        },
      },
      timelines: {
        focus: {
          id: 'focus',
          duration: 20,
          tracks: [],
          camera: {
            keyframes: [
              { frame: 0, viewport: { x: 0, y: 0, width: 400, height: 300 } },
              { frame: 20, viewport: { x: 100, y: 75, width: 200, height: 150 } },
            ],
          },
        },
      },
    };

    const svg = renderToSvgString(normalized, 10, { timelineId: 'focus' });

    expect(svg).toContain('viewBox="50 37.5 300 225"');
  });

  it('keeps an explicitly selected timeline camera over the default state camera', () => {
    const normalized: ElucimDocument = {
      version: '2.0',
      scene: { type: 'scene', width: 400, height: 300, children: ['circle'] },
      elements: {
        circle: {
          id: 'circle',
          type: 'circle',
          props: { type: 'circle', cx: 200, cy: 150, r: 50, fill: '#ff0000' },
        },
      },
      timelines: {
        idle: {
          id: 'idle',
          duration: 1,
          tracks: [],
          camera: { keyframes: [{ frame: 0, viewport: { x: 0, y: 0, width: 400, height: 300 } }] },
        },
        focus: {
          id: 'focus',
          duration: 1,
          tracks: [],
          camera: { keyframes: [{ frame: 0, viewport: { x: 100, y: 75, width: 200, height: 150 } }] },
        },
      },
      stateMachines: {
        presentation: {
          id: 'presentation',
          entry: 'idle',
          states: { idle: { timeline: 'idle' } },
          transitions: [{ id: 'entry-idle', from: 'entry', to: 'idle', trigger: 'onStart' }],
        },
      },
      defaultStateMachine: 'presentation',
    };

    const svg = renderToSvgString(normalized, 0, { timelineId: 'focus' });

    expect(svg).toContain('viewBox="100 75 200 150"');
  });
});
