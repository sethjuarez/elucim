import React, { useCallback } from 'react';
import type { CameraNode, ElucimDocument, EditorProjection } from '@elucim/editor-projection';
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
import { PanelToggle } from '../chrome/PanelToggle';

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
  previewDocument?: EditorProjection;
  previewCamera?: CameraNode;
  previewMode: EditorStateMachinePreviewMode;
  timelinePreviewCallbacks: EditorTimelinePreviewCallbacks;
  colorScheme?: string;
  contentTheme?: ElucimTheme;
  onDocumentChange: (document: ElucimDocument) => void;
  onLeftClose?: () => void;
  onRightClose?: () => void;
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
  showHeader?: boolean;
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
    dispatch({ type: 'SET_CANONICAL_DOCUMENT', document });
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
  showHeader = true,
  document: documentModel,
  onDocumentChange,
}: EditorLayoutCompositionOptions): EditorLayoutComposition {
  const { state, commitDocumentChange, stopPlayback } = useEditorLayoutController(onDocumentChange);
  const { dispatch } = useEditorState();
  const activeDocument = documentModel ?? state.canonicalDocument;
  const shell = useEditorShellState({
    hasActiveDocument: Boolean(activeDocument),
    isPlaying: state.isPlaying,
    stopPlayback,
  });
  const { themeVars, colorScheme } = resolveEditorThemeVars(theme, editorTheme, state.themeOverrides);
  const liveDocument = activeDocument;
  const { previewDocument, previewCamera, stateMachinePreviewMode, timelinePreviewCallbacks } = useEditorPreviewController(liveDocument);
  const anchorCanvasForLeftOffsetChange = useCallback((currentLeftOffset: number, nextLeftOffset: number) => {
    const delta = currentLeftOffset - nextLeftOffset;
    if (delta !== 0) {
      dispatch({ type: 'SET_VIEWPORT', viewport: { x: state.viewport.x + delta } });
    }
  }, [dispatch, state.viewport.x]);
  const handleLeftVisibleChange = useCallback((updater: React.SetStateAction<boolean>) => {
    const nextVisible = typeof updater === 'function' ? updater(shell.leftVisible) : updater;
    anchorCanvasForLeftOffsetChange(shell.leftVisible ? shell.leftWidth : 0, nextVisible ? shell.leftWidth : 0);
    shell.setLeftVisible(nextVisible);
  }, [anchorCanvasForLeftOffsetChange, shell]);
  const slots = buildEditorLayoutSlots({
    activeDocument,
    liveDocument,
    workspace: shell.workspace,
    preferredLeftTab: shell.preferredLeftTab,
    previewDocument,
    previewCamera,
    previewMode: stateMachinePreviewMode,
    timelinePreviewCallbacks,
    colorScheme,
    contentTheme: theme,
    onDocumentChange: commitDocumentChange,
    onLeftClose: () => handleLeftVisibleChange(false),
    onRightClose: () => shell.setRightVisible(false),
  });

  return {
    rootTheme: { themeVars, colorScheme },
    workspaceSurfaceProps: {
      showHeader,
      leftVisible: shell.leftVisible,
      rightVisible: shell.rightVisible,
      timelineVisible: shell.timelineVisible,
      leftWidth: shell.leftWidth,
      rightWidth: shell.rightWidth,
      timelineHeight: shell.timelineHeight,
      stateMachineWorkspaceActive: shell.stateMachineWorkspaceActive,
      onLeftVisibleChange: handleLeftVisibleChange,
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
  previewCamera,
  previewMode,
  timelinePreviewCallbacks,
  colorScheme,
  contentTheme,
  onDocumentChange,
  onLeftClose,
  onRightClose,
}: EditorLayoutSlotsOptions): EditorLayoutSlots {
  return {
    leftDock: <LeftDock document={activeDocument} onDocumentChange={onDocumentChange} onClose={onLeftClose} preferredTab={preferredLeftTab} />,
    canvas: (
      <EditorCanvasPanel
        previewDocument={previewDocument}
        previewCamera={previewCamera}
        previewMode={previewMode}
        editorColorScheme={colorScheme}
        contentTheme={contentTheme}
      />
    ),
    inspector: (
      <PanelShell
        title="Inspector"
        actions={onRightClose ? <PanelToggle label="Inspector" panel="right" active onClick={onRightClose} /> : undefined}
      >
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
