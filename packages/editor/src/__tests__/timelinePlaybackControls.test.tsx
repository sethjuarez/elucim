/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TimelinePlaybackControls } from '../timeline/TimelinePlaybackControls';

afterEach(() => cleanup());

describe('TimelinePlaybackControls', () => {
  it('renders stable playback labels and calls the matching handlers', () => {
    const handlers = {
      onStart: vi.fn(),
      onStepBackward: vi.fn(),
      onTogglePlay: vi.fn(),
      onStepForward: vi.fn(),
      onEnd: vi.fn(),
    };

    render(
      <TimelinePlaybackControls
        currentFrame={12}
        maxFrame={120}
        fps={60}
        isPlaying={false}
        icons={{
          skipStart: 'start',
          stepBackward: 'back',
          playPause: 'play',
          stepForward: 'forward',
          skipEnd: 'end',
        }}
        {...handlers}
      />,
    );

    expect(screen.getByRole('group', { name: 'Timeline playback controls' })).toBeTruthy();
    expect(screen.getByLabelText('Frame 12 of 120 at 60 frames per second')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step forward' }));
    fireEvent.click(screen.getByRole('button', { name: 'End' }));

    expect(handlers.onStart).toHaveBeenCalledTimes(1);
    expect(handlers.onStepBackward).toHaveBeenCalledTimes(1);
    expect(handlers.onTogglePlay).toHaveBeenCalledTimes(1);
    expect(handlers.onStepForward).toHaveBeenCalledTimes(1);
    expect(handlers.onEnd).toHaveBeenCalledTimes(1);
  });

  it('switches the primary control label while playing', () => {
    render(
      <TimelinePlaybackControls
        currentFrame={1}
        maxFrame={9}
        fps={24}
        isPlaying
        icons={{
          skipStart: 'start',
          stepBackward: 'back',
          playPause: 'pause',
          stepForward: 'forward',
          skipEnd: 'end',
        }}
        onStart={() => {}}
        onStepBackward={() => {}}
        onTogglePlay={() => {}}
        onStepForward={() => {}}
        onEnd={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
  });
});
