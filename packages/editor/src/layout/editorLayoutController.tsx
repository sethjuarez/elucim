import React, { useCallback } from 'react';
import type { ElucimDocument, RenderableDocument } from '@elucim/dsl';
import type { ElucimTheme } from '@elucim/core';
import type { EditorState } from '../state/types';
import { useEditorState } from '../state/EditorProvider';
import type { EditorWorkspace } from '../shell/editorShell';
import { EditorCanvasPanel } from '../canvas/EditorCanvasPanel';
import type { EditorStateMachinePreviewMode, EditorTimelinePreviewCallbacks } from '../canvas/editorPreviewController';
import { LeftDock } from '../dock/LeftDock';
import { Inspector } from '../inspector/Inspector';
import { PanelShell } from '../panels/PanelShell';
import { EditorTimelinePanel } from '../timeline/EditorTimelinePanel';

export interface EditorLayoutController {
  state: EditorState;
  commitDocumentChange: (document: ElucimDocument) => void;
  stopPlayback: () => void;
}

export interface EditorLayoutSlotsOptions {
  activeDocument?: ElucimDocument;
  liveDocument?: ElucimDocument;
  workspace: EditorWorkspace;
  preferredLeftTab?: 'objects' | 'polish';
  previewDocument?: RenderableDocument;
  previewMode: EditorStateMachinePreviewMode;
  timelinePreviewCallbacks: EditorTimelinePreviewCallbacks;
  colorScheme?: string;
  contentTheme?: ElucimTheme;
  onDocumentChange: (document: ElucimDocument) => void;
}

export interface EditorLayoutSlots {
  leftDock: React.ReactNode;
  canvas: React.ReactNode;
  inspector: React.ReactNode;
  timeline: React.ReactNode;
}

export function useEditorLayoutController(onDocumentChange?: (document: ElucimDocument) => void): EditorLayoutController {
  const { state, dispatch } = useEditorState();
  const commitDocumentChange = useCallback((document: ElucimDocument) => {
    dispatch({ type: 'SET_CANONICAL_DOCUMENT', document, warnings: [] });
    onDocumentChange?.(document);
  }, [dispatch, onDocumentChange]);
  const stopPlayback = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', playing: false });
  }, [dispatch]);

  return { state, commitDocumentChange, stopPlayback };
}

export function buildEditorLayoutSlots({
  activeDocument,
  liveDocument,
  workspace,
  preferredLeftTab,
  previewDocument,
  previewMode,
  timelinePreviewCallbacks,
  colorScheme,
  contentTheme,
  onDocumentChange,
}: EditorLayoutSlotsOptions): EditorLayoutSlots {
  return {
    leftDock: <LeftDock document={activeDocument} onDocumentChange={onDocumentChange} preferredTab={preferredLeftTab} />,
    canvas: (
      <EditorCanvasPanel
        previewDocument={previewDocument}
        previewMode={previewMode}
        editorColorScheme={colorScheme}
        contentTheme={contentTheme}
      />
    ),
    inspector: (
      <PanelShell title="Inspector">
        <Inspector showCanvasDuration={!activeDocument} />
      </PanelShell>
    ),
    timeline: (
      <EditorTimelinePanel
        document={liveDocument}
        workspace={workspace}
        onDocumentChange={onDocumentChange}
        {...timelinePreviewCallbacks}
      />
    ),
  };
}
