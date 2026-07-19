/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { EditorAction } from '../state/types';
import { useKeyboardShortcuts } from '../canvas/useKeyboard';
import { EditorProvider } from '../state/EditorProvider';
import { ElucimCanvas } from '../canvas/ElucimCanvas';

const testDocument = {
  version: 'render-tree',
  root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [] },
} as const;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.document.body.innerHTML = '';
});

function KeyboardHarness({
  isPlaying,
  isCanvasHovered = false,
  isCameraFraming = false,
  dispatch,
  selectedIds = [],
}: {
  isPlaying: boolean;
  isCanvasHovered?: boolean;
  isCameraFraming?: boolean;
  dispatch: React.Dispatch<EditorAction>;
  selectedIds?: string[];
}) {
  useKeyboardShortcuts({
    dispatch,
    selectedIds,
    document: testDocument,
    zoom: 1,
    isPlaying,
    isCanvasHovered,
    isCameraFraming,
    getDocumentJson: () => JSON.stringify(testDocument),
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

  it('deletes the selected element when the editor owns focus', () => {
    const dispatch = vi.fn();
    render(<KeyboardHarness isPlaying={false} selectedIds={['rect-1']} dispatch={dispatch} />);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));

    expect(dispatch).toHaveBeenCalledWith({ type: 'DELETE_ELEMENTS', ids: ['rect-1'] });
  });

  it('reserves keyboard input for camera framing and cancels it with Escape', () => {
    const dispatch = vi.fn();
    render(<KeyboardHarness isPlaying={false} isCameraFraming selectedIds={['rect-1']} dispatch={dispatch} />);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(dispatch).not.toHaveBeenCalledWith({ type: 'DELETE_ELEMENTS', ids: ['rect-1'] });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_CAMERA_FRAMING', framing: false });
  });

  it('focuses the canvas on pointer down so stale form focus does not trap Delete', () => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    Object.defineProperty(window.HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    const staleInput = window.document.createElement('input');
    window.document.body.appendChild(staleInput);
    staleInput.focus();

    const { container } = render(
      <EditorProvider initialDocument={testDocument}>
        <ElucimCanvas />
      </EditorProvider>,
    );
    const canvas = container.querySelector('.elucim-editor-canvas') as HTMLElement | null;

    expect(canvas).toBeTruthy();
    fireEvent.pointerDown(canvas!);

    expect(window.document.activeElement).toBe(canvas);
  });
});
