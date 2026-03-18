/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { Player, type PlayerRef } from '../components/Player';

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
