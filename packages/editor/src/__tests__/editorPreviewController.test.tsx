/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ElucimDocument } from '@elucim/dsl';
import { useEditorPreviewController } from '../canvas/editorPreviewController';

afterEach(() => {
  cleanup();
});

const documentModel: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, children: ['card'] },
  elements: {
    card: {
      id: 'card',
      type: 'rect',
      props: { type: 'rect', x: 0, y: 0, width: 100, height: 60, opacity: 0 },
    },
  },
  timelines: {
    intro: {
      id: 'intro',
      duration: 30,
      tracks: [{ target: 'card', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }],
    },
  },
};

describe('useEditorPreviewController', () => {
  it('wraps state-machine function handlers before storing them in React state', () => {
    const { result } = renderHook(() => useEditorPreviewController(documentModel));
    const clickHandler = vi.fn(() => true);
    const keyDownHandler = vi.fn((key: string) => key === 'Enter');
    const exitHandler = vi.fn();

    act(() => {
      result.current.timelinePreviewCallbacks.onStateMachinePreviewClickChange(clickHandler);
      result.current.timelinePreviewCallbacks.onStateMachinePreviewKeyDownChange(keyDownHandler);
      result.current.timelinePreviewCallbacks.onStateMachinePreviewExitChange(exitHandler);
    });

    expect(result.current.stateMachinePreviewMode.onClick).toBe(clickHandler);
    expect(result.current.stateMachinePreviewMode.onKeyDown).toBe(keyDownHandler);
    expect(result.current.stateMachinePreviewMode.onExit).toBe(exitHandler);
    expect(result.current.stateMachinePreviewMode.onClick?.()).toBe(true);
    expect(result.current.stateMachinePreviewMode.onKeyDown?.('Enter')).toBe(true);

    act(() => {
      result.current.timelinePreviewCallbacks.onStateMachinePreviewClickChange(undefined);
      result.current.timelinePreviewCallbacks.onStateMachinePreviewKeyDownChange(undefined);
      result.current.timelinePreviewCallbacks.onStateMachinePreviewExitChange(undefined);
    });

    expect(result.current.stateMachinePreviewMode.onClick).toBeUndefined();
    expect(result.current.stateMachinePreviewMode.onKeyDown).toBeUndefined();
    expect(result.current.stateMachinePreviewMode.onExit).toBeUndefined();
  });

  it('resolves timeline frames into a renderable preview document', () => {
    const { result } = renderHook(() => useEditorPreviewController(documentModel));

    expect(result.current.previewDocument).toBeUndefined();

    act(() => {
      result.current.timelinePreviewCallbacks.onPreviewTimelineFramesChange([{ timelineId: 'intro', frame: 30 }]);
    });

    const card = result.current.previewDocument?.root.children[0] as { opacity?: number };
    expect(result.current.previewDocument?.version).toBe('1.0');
    expect(card.opacity).toBe(1);
  });

  it('keeps the resolved preview projection stable when inputs do not change', () => {
    const { result, rerender } = renderHook(({ liveDocument }) => useEditorPreviewController(liveDocument), {
      initialProps: { liveDocument: documentModel as ElucimDocument | undefined },
    });

    act(() => {
      result.current.timelinePreviewCallbacks.onPreviewTimelineFramesChange([{ timelineId: 'intro', frame: 30 }]);
    });
    const preview = result.current.previewDocument;

    rerender({ liveDocument: documentModel });

    expect(result.current.previewDocument).toBe(preview);
  });

  it('tracks whether state-machine preview mode is active', () => {
    const { result } = renderHook(() => useEditorPreviewController(documentModel));

    expect(result.current.stateMachinePreviewMode.active).toBe(false);

    act(() => {
      result.current.timelinePreviewCallbacks.onStateMachinePreviewActiveChange(true);
    });

    expect(result.current.stateMachinePreviewMode.active).toBe(true);
  });
});
