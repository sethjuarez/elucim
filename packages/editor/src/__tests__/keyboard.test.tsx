/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { EditorAction } from '../state/types';
import { useKeyboardShortcuts } from '../canvas/useKeyboard';

const document = {
  version: '1.0',
  root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [] },
} as const;

afterEach(() => {
  cleanup();
});

function KeyboardHarness({
  isPlaying,
  isCanvasHovered = false,
  dispatch,
}: {
  isPlaying: boolean;
  isCanvasHovered?: boolean;
  dispatch: React.Dispatch<EditorAction>;
}) {
  useKeyboardShortcuts({
    dispatch,
    selectedIds: [],
    document,
    zoom: 1,
    isPlaying,
    isCanvasHovered,
    getDocumentJson: () => JSON.stringify(document),
    importDocument: () => {},
  });
  return null;
}

describe('keyboard shortcuts', () => {
  it('pauses playback on Space when the timeline is playing', () => {
    const dispatch = vi.fn();
    render(<KeyboardHarness isPlaying={true} dispatch={dispatch} />);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PLAYING', playing: false });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PANNING', panning: false });
  });

  it('starts playback on Space when playback is stopped', () => {
    const dispatch = vi.fn();
    render(<KeyboardHarness isPlaying={false} dispatch={dispatch} />);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PLAYING', playing: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PANNING', panning: false });
  });

  it('uses Space for canvas panning when the pointer is over the canvas', () => {
    const dispatch = vi.fn();
    render(<KeyboardHarness isPlaying={true} isCanvasHovered={true} dispatch={dispatch} />);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PANNING', panning: true });
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'SET_PLAYING', playing: false });
  });
});
