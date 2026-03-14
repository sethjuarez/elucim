/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DslRenderer } from '../renderer/DslRenderer';

const validDsl = {
  version: '1.0' as const,
  root: {
    type: 'player' as const,
    durationInFrames: 30,
    width: 400,
    height: 300,
    fps: 30,
    children: [{ type: 'circle' as const, cx: 100, cy: 100, r: 50 }],
  },
};

const invalidDsl = {
  version: '1.0' as const,
  root: {
    type: 'scene' as const,
    // missing durationInFrames
    children: [{ type: 'circle' as const }], // missing cx, cy, r
  },
};

describe('DslRenderer theme prop', () => {
  it('sets CSS custom properties on the root div', () => {
    const theme = { foreground: '#ffffff', background: '#000000', accent: '#ff0000' };
    const { getByTestId } = render(
      <DslRenderer dsl={validDsl as any} theme={theme} />,
    );
    const root = getByTestId('dsl-root');
    expect(root.style.getPropertyValue('--elucim-foreground')).toBe('#ffffff');
    expect(root.style.getPropertyValue('--elucim-background')).toBe('#000000');
    expect(root.style.getPropertyValue('--elucim-accent')).toBe('#ff0000');
  });

  it('renders without error when no theme is provided', () => {
    const { getAllByTestId } = render(
      <DslRenderer dsl={validDsl as any} />,
    );
    expect(getAllByTestId('dsl-root').length).toBeGreaterThanOrEqual(1);
  });
});

describe('DslRenderer onError callback', () => {
  it('fires onError with structured errors for invalid DSL', () => {
    const onError = vi.fn();
    render(
      <DslRenderer dsl={invalidDsl as any} onError={onError} />,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    const errors = onError.mock.calls[0][0] as Array<{ path: string; message: string }>;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBeGreaterThan(0);
    // Each error should have path and message
    for (const err of errors) {
      expect(err).toHaveProperty('path');
      expect(err).toHaveProperty('message');
    }
  });

  it('does not fire onError when DSL is valid', () => {
    const onError = vi.fn();
    render(
      <DslRenderer dsl={validDsl as any} onError={onError} />,
    );
    expect(onError).not.toHaveBeenCalled();
  });
});

import React from 'react';
import { act } from '@testing-library/react';

describe('DslRenderer poster prop', () => {
  it('renders a static Scene (no controls) with poster="first"', () => {
    const { container } = render(
      <DslRenderer dsl={validDsl as any} poster="first" />,
    );
    const root = container.querySelector('[data-testid="dsl-root"]');
    expect(root).toBeTruthy();
    // Poster converts player to static scene — no control bar should exist
    const controls = container.querySelectorAll('[data-testid="elucim-controls"]');
    expect(controls.length).toBe(0);
    const scene = container.querySelectorAll('[data-testid="elucim-scene"]');
    expect(scene.length).toBe(1);
  });

  it('renders a static Scene with poster="last"', () => {
    const { container } = render(
      <DslRenderer dsl={validDsl as any} poster="last" />,
    );
    const controls = container.querySelectorAll('[data-testid="elucim-controls"]');
    expect(controls.length).toBe(0);
    const scene = container.querySelectorAll('[data-testid="elucim-scene"]');
    expect(scene.length).toBe(1);
  });

  it('renders a static Scene with a numeric poster frame', () => {
    const { container } = render(
      <DslRenderer dsl={validDsl as any} poster={10} />,
    );
    const controls = container.querySelectorAll('[data-testid="elucim-controls"]');
    expect(controls.length).toBe(0);
    const scene = container.querySelectorAll('[data-testid="elucim-scene"]');
    expect(scene.length).toBe(1);
  });
});

describe('DslRendererRef imperative API', () => {
  it('exposes getSvgElement that returns the SVG', () => {
    const ref = React.createRef<import('../renderer/DslRenderer').DslRendererRef>();
    render(<DslRenderer ref={ref} dsl={validDsl as any} />);
    expect(ref.current).not.toBeNull();
    const svg = ref.current!.getSvgElement();
    expect(svg).toBeInstanceOf(SVGSVGElement);
  });

  it('exposes getTotalFrames returning the duration', () => {
    const ref = React.createRef<import('../renderer/DslRenderer').DslRendererRef>();
    render(<DslRenderer ref={ref} dsl={validDsl as any} />);
    expect(ref.current!.getTotalFrames()).toBe(30);
  });

  it('exposes play/pause/isPlaying with state updates', () => {
    const ref = React.createRef<import('../renderer/DslRenderer').DslRendererRef>();
    render(<DslRenderer ref={ref} dsl={validDsl as any} />);
    expect(ref.current!.isPlaying()).toBe(false);
    act(() => { ref.current!.play(); });
    expect(ref.current!.isPlaying()).toBe(true);
    act(() => { ref.current!.pause(); });
    expect(ref.current!.isPlaying()).toBe(false);
  });

  it('exposes seekToFrame', () => {
    const ref = React.createRef<import('../renderer/DslRenderer').DslRendererRef>();
    render(<DslRenderer ref={ref} dsl={validDsl as any} />);
    // seekToFrame should not throw
    act(() => { ref.current!.seekToFrame(15); });
    act(() => { ref.current!.seekToFrame(0); });
    act(() => { ref.current!.seekToFrame(29); });
  });

  it('returns null/defaults when DSL is invalid', () => {
    const ref = React.createRef<import('../renderer/DslRenderer').DslRendererRef>();
    render(<DslRenderer ref={ref} dsl={invalidDsl as any} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current!.getSvgElement()).toBeNull();
    expect(ref.current!.getTotalFrames()).toBe(0);
    expect(ref.current!.isPlaying()).toBe(false);
  });
});
