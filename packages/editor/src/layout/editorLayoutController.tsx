import React, { useCallback } from 'react';
import type { ElucimDocument, RenderableDocument } from '@elucim/dsl';
import type { ElucimTheme } from '@elucim/core';
import type { EditorRootProps } from '../chrome/EditorRoot';
import type { EditorWorkspaceSurfaceProps } from '../chrome/EditorWorkspaceSurface';
import type { EditorState } from '../state/types';
import { useEditorState } from '../state/EditorProvider';
import { resolveEditorThemeVars, type EditorWorkspace, useEditorShellState } from '../shell/editorShell';
import { EditorCanvasPanel } from '../canvas/EditorCanvasPanel';
import { useEditorPreviewController, type EditorStateMachinePreviewMode, type EditorTimelinePreviewCallbacks } from '../canvas/editorPreviewController';
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

export interface EditorLayoutCompositionOptions {
  theme?: ElucimTheme;
  editorTheme?: Record<string, string>;
  document?: ElucimDocument;
  onDocumentChange?: (document: ElucimDocument) => void;
}

export interface EditorLayoutComposition {
  rootTheme: Pick<EditorRootProps, 'themeVars' | 'colorScheme'>;
  workspaceSurfaceProps: EditorWorkspaceSurfaceProps;
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

export function useEditorLayoutComposition({
  theme,
  editorTheme,
  document: documentModel,
  onDocumentChange,
}: EditorLayoutCompositionOptions): EditorLayoutComposition {
  const { state, commitDocumentChange, stopPlayback } = useEditorLayoutController(onDocumentChange);
  const activeDocument = documentModel ?? state.canonicalDocument;
  const shell = useEditorShellState({
    hasActiveDocument: Boolean(activeDocument),
    isPlaying: state.isPlaying,
    stopPlayback,
  });
  const { themeVars, colorScheme } = resolveEditorThemeVars(theme, editorTheme, state.themeOverrides);
  const liveDocument = activeDocument;
  const { previewDocument, stateMachinePreviewMode, timelinePreviewCallbacks } = useEditorPreviewController(liveDocument);
  const slots = buildEditorLayoutSlots({
    activeDocument,
    liveDocument,
    workspace: shell.workspace,
    preferredLeftTab: shell.preferredLeftTab,
    previewDocument,
    previewMode: stateMachinePreviewMode,
    timelinePreviewCallbacks,
    colorScheme,
    contentTheme: theme,
    onDocumentChange: commitDocumentChange,
  });

  return {
    rootTheme: { themeVars, colorScheme },
    workspaceSurfaceProps: {
      workspace: shell.workspace,
      leftVisible: shell.leftVisible,
      rightVisible: shell.rightVisible,
      timelineVisible: shell.timelineVisible,
      leftWidth: shell.leftWidth,
      rightWidth: shell.rightWidth,
      timelineHeight: shell.timelineHeight,
      selectedCount: state.selectedIds.length,
      stateMachineWorkspaceActive: shell.stateMachineWorkspaceActive,
      onWorkspaceSelect: shell.selectWorkspace,
      onLeftVisibleChange: shell.setLeftVisible,
      onRightVisibleChange: shell.setRightVisible,
      onTimelineVisibleChange: shell.setTimelineVisible,
      onLeftResizeStart: shell.startSideResize('left'),
      onRightResizeStart: shell.startSideResize('right'),
      onTimelineResizeStart: shell.startTimelineResize,
      ...slots,
    },
  };
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
