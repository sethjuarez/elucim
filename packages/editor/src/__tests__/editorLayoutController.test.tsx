/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ElucimDocument } from '@elucim/dsl';
import { buildEditorLayoutSlots, useEditorLayoutComposition, useEditorLayoutController } from '../layout/editorLayoutController';
import { EditorProvider, useEditorState } from '../state/EditorProvider';
import { createDefaultDocument } from '../state/types';

const documentModel: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, children: ['title'] },
  elements: {
    title: {
      id: 'title',
      type: 'text',
      props: { type: 'text', content: 'Hello' },
    },
  },
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <EditorProvider initialDocument={createDefaultDocument()}>{children}</EditorProvider>;
}

function useControllerProbe(onDocumentChange?: (document: ElucimDocument) => void) {
  const controller = useEditorLayoutController(onDocumentChange);
  const { dispatch } = useEditorState();
  return { ...controller, dispatch };
}

describe('editor layout controller', () => {
  afterEach(() => cleanup());

  it('commits canonical documents through editor state and the host callback', () => {
    const onDocumentChange = vi.fn();
    const { result } = renderHook(() => useEditorLayoutController(onDocumentChange), { wrapper });

    act(() => {
      result.current.commitDocumentChange(documentModel);
    });

    expect(result.current.state.canonicalDocument).toBe(documentModel);
    expect(result.current.state.compatibilityWarnings).toEqual([]);
    expect(onDocumentChange).toHaveBeenCalledWith(documentModel);
  });

  it('stops playback through the editor reducer', () => {
    const { result } = renderHook(() => useControllerProbe(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'SET_PLAYING', playing: true });
    });
    expect(result.current.state.isPlaying).toBe(true);

    act(() => {
      result.current.stopPlayback();
    });

    expect(result.current.state.isPlaying).toBe(false);
  });

  it('builds the standard layout content slots', () => {
    const slots = buildEditorLayoutSlots({
      activeDocument: documentModel,
      liveDocument: documentModel,
      workspace: 'animate',
      preferredLeftTab: 'objects',
      previewMode: { active: false, label: 'Preview mode', exitLabel: 'Exit state machine preview mode' },
      timelinePreviewCallbacks: {
        onPreviewTimelineFramesChange: vi.fn(),
        onStateMachinePreviewActiveChange: vi.fn(),
        onStateMachinePreviewClickChange: vi.fn(),
        onStateMachinePreviewKeyDownChange: vi.fn(),
        onStateMachinePreviewExitChange: vi.fn(),
      },
      colorScheme: 'dark',
      onDocumentChange: vi.fn(),
    });

    expect(React.isValidElement(slots.leftDock)).toBe(true);
    expect(React.isValidElement(slots.canvas)).toBe(true);
    expect(React.isValidElement(slots.inspector)).toBe(true);
    expect(React.isValidElement(slots.timeline)).toBe(true);
  });

  it('composes root theme data and workspace surface props for the layout', () => {
    const { result } = renderHook(() => useEditorLayoutComposition({
      document: documentModel,
      editorTheme: { accent: '#7c3aed' },
    }), { wrapper });

    expect(result.current.rootTheme.colorScheme).toBe('dark');
    expect(result.current.rootTheme.themeVars['--elucim-editor-accent' as keyof React.CSSProperties]).toBe('#7c3aed');
    expect(React.isValidElement(result.current.workspaceSurfaceProps.leftDock)).toBe(true);
    expect(React.isValidElement(result.current.workspaceSurfaceProps.canvas)).toBe(true);
    expect(React.isValidElement(result.current.workspaceSurfaceProps.inspector)).toBe(true);
    expect(React.isValidElement(result.current.workspaceSurfaceProps.timeline)).toBe(true);
  });

  it('anchors the canvas viewport when the left panel is hidden', () => {
    const { result } = renderHook(() => {
      const composition = useEditorLayoutComposition({ document: documentModel });
      const { state } = useEditorState();
      return { composition, state };
    }, { wrapper });

    act(() => {
      result.current.composition.workspaceSurfaceProps.onLeftVisibleChange(value => !value);
    });

    expect(result.current.composition.workspaceSurfaceProps.leftVisible).toBe(false);
    expect(result.current.state.viewport.x).toBe(252);
  });
});
