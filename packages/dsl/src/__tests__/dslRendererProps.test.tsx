/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { DslRenderer, type DslRendererRef } from '../renderer/DslRenderer';

const playerDsl = {
  version: '1.0' as const,
  root: {
    type: 'player' as const,
    durationInFrames: 60,
    width: 400,
    height: 300,
    fps: 30,
    controls: true,
    autoPlay: false,
    loop: true,
    children: [{ type: 'circle' as const, cx: 100, cy: 100, r: 50 }],
  },
};

// ─── Player override props ──────────────────────────────────────────────────

describe('DslRenderer player override props', () => {
  it('overrides controls=false (hides controls bar)', () => {
    const { container } = render(
      <DslRenderer dsl={playerDsl as any} controls={false} />,
    );
    const controlsBar = container.querySelector('[data-testid="elucim-controls"]');
    expect(controlsBar).toBeNull();
  });

  it('preserves document controls when no override given', () => {
    const { container } = render(
      <DslRenderer dsl={playerDsl as any} />,
    );
    const controlsBar = container.querySelector('[data-testid="elucim-controls"]');
    expect(controlsBar).toBeTruthy();
  });

  it('overrides autoPlay via ref state', () => {
    const ref = React.createRef<DslRendererRef>();
    render(<DslRenderer ref={ref} dsl={playerDsl as any} autoPlay />);
    expect(ref.current!.isPlaying()).toBe(true);
  });
});

// ─── onPlayStateChange ──────────────────────────────────────────────────────

describe('DslRenderer onPlayStateChange', () => {
  it('fires when play/pause is triggered via ref', () => {
    const cb = vi.fn();
    const ref = React.createRef<DslRendererRef>();
    render(<DslRenderer ref={ref} dsl={playerDsl as any} onPlayStateChange={cb} />);
    act(() => { ref.current!.play(); });
    expect(cb).toHaveBeenCalledWith(true);
    act(() => { ref.current!.pause(); });
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('does not fire on initial render', () => {
    const cb = vi.fn();
    render(<DslRenderer dsl={playerDsl as any} onPlayStateChange={cb} />);
    expect(cb).not.toHaveBeenCalled();
  });
});

// ─── CSS var() strings in theme ─────────────────────────────────────────────

describe('DslRenderer theme with CSS var() values', () => {
  it('accepts CSS var() strings in theme prop', () => {
    const theme = { accent: 'var(--my-app-accent)', background: 'var(--my-bg, #fff)' };
    const { container } = render(
      <DslRenderer dsl={playerDsl as any} theme={theme} />,
    );
    const root = container.querySelector('[data-testid="dsl-root"]') as HTMLElement;
    expect(root.style.getPropertyValue('--elucim-accent')).toBe('var(--my-app-accent)');
    expect(root.style.getPropertyValue('--elucim-background')).toBe('var(--my-bg, #fff)');
  });

  it('accepts named colors in theme prop', () => {
    const theme = { foreground: 'white', accent: 'dodgerblue' };
    const { container } = render(
      <DslRenderer dsl={playerDsl as any} theme={theme} />,
    );
    const root = container.querySelector('[data-testid="dsl-root"]') as HTMLElement;
    expect(root.style.getPropertyValue('--elucim-foreground')).toBe('white');
    expect(root.style.getPropertyValue('--elucim-accent')).toBe('dodgerblue');
  });
});
