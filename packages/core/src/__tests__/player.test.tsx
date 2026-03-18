/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { Player, type PlayerRef } from '../components/Player';

// Default matchMedia mock — no reduced motion
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPlayer(props: Partial<React.ComponentProps<typeof Player>> & { playerRef?: React.RefObject<PlayerRef | null> }) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const { playerRef, ...rest } = props;
  let root: ReturnType<typeof ReactDOM.createRoot>;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(
      <Player
        ref={playerRef as any}
        durationInFrames={30}
        {...rest}
      >
        <circle cx={50} cy={50} r={10} />
      </Player>,
    );
  });
  return {
    container,
    unmount: () => { act(() => { root.unmount(); }); document.body.removeChild(container); },
  };
}

describe('Player onPlayStateChange', () => {
  it('does not fire on initial render', () => {
    const cb = vi.fn();
    const { unmount } = renderPlayer({ onPlayStateChange: cb });
    expect(cb).not.toHaveBeenCalled();
    unmount();
  });

  it('fires when play is triggered via ref', () => {
    const cb = vi.fn();
    const ref = React.createRef<PlayerRef>();
    const { unmount } = renderPlayer({ playerRef: ref, onPlayStateChange: cb });
    act(() => { ref.current!.play(); });
    expect(cb).toHaveBeenCalledWith(true);
    unmount();
  });

  it('fires when pause is triggered via ref', () => {
    const cb = vi.fn();
    const ref = React.createRef<PlayerRef>();
    const { unmount } = renderPlayer({ playerRef: ref, autoPlay: true, onPlayStateChange: cb });
    act(() => { ref.current!.pause(); });
    expect(cb).toHaveBeenCalledWith(false);
    unmount();
  });

  it('does not fire on initial render with autoPlay', () => {
    const cb = vi.fn();
    const { unmount } = renderPlayer({ autoPlay: true, onPlayStateChange: cb });
    expect(cb).not.toHaveBeenCalled();
    unmount();
  });
});

// ─── Reduced motion ──────────────────────────────────────────────────────────

describe('Player with prefers-reduced-motion', () => {
  function mockReducedMotion(matches: boolean) {
    (window.matchMedia as any).mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  }

  it('starts at final frame when autoPlay + reduced motion', () => {
    mockReducedMotion(true);
    const ref = React.createRef<PlayerRef>();
    const { unmount } = renderPlayer({ playerRef: ref, autoPlay: true });
    // Should not be playing — reduced motion skips animation
    expect(ref.current!.isPlaying()).toBe(false);
    unmount();
  });

  it('play() jumps to final frame with reduced motion', () => {
    mockReducedMotion(true);
    const ref = React.createRef<PlayerRef>();
    const { unmount } = renderPlayer({ playerRef: ref });
    act(() => { ref.current!.play(); });
    // The effect detects reducedMotion → jumps to end → sets playing false
    expect(ref.current!.isPlaying()).toBe(false);
    unmount();
  });

  it('starts at frame 0 without reduced motion', () => {
    mockReducedMotion(false);
    const ref = React.createRef<PlayerRef>();
    const { unmount } = renderPlayer({ playerRef: ref });
    expect(ref.current!.isPlaying()).toBe(false);
    unmount();
  });
});
