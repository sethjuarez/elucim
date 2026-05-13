import React from 'react';
import type { ElucimDocument } from '@elucim/dsl';
import type { ElucimTheme } from '@elucim/core';
import { useEditorPreviewController } from './canvas/editorPreviewController';
import { EditorRoot } from './chrome/EditorRoot';
import { EditorWorkspaceSurface } from './chrome/EditorWorkspaceSurface';
import { buildEditorLayoutSlots, useEditorLayoutController } from './layout/editorLayoutController';
import { resolveEditorThemeVars, useEditorShellState } from './shell/editorShell';

export interface ElucimEditorLayoutProps {
  theme?: ElucimTheme;
  editorTheme?: Record<string, string>;
  className?: string;
  style?: React.CSSProperties;
  /** Canonical Elucim Document model used by timeline and state-machine panels. */
  document?: ElucimDocument;
  onDocumentChange?: (document: ElucimDocument) => void;
}

/**
 * The internal layout component used by ElucimEditor.
 * Must be rendered inside an EditorProvider. Useful for consumers who need
 * custom composition (e.g. adding panels inside the editor context) while
 * keeping the standard editor shell, scrollbar styles, and theme injection.
 */
export function ElucimEditorLayout({ theme, editorTheme, className, style, document: documentModel, onDocumentChange }: ElucimEditorLayoutProps) {
  const { state, commitDocumentChange, stopPlayback } = useEditorLayoutController(onDocumentChange);
  const activeDocument = documentModel ?? state.canonicalDocument;
  const shell = useEditorShellState({
    hasActiveDocument: Boolean(activeDocument),
    isPlaying: state.isPlaying,
    stopPlayback,
  });
  const {
    workspace,
    leftVisible,
    rightVisible,
    timelineVisible,
    leftWidth,
    rightWidth,
    timelineHeight,
    setLeftVisible,
    setRightVisible,
    setTimelineVisible,
    preferredLeftTab,
    stateMachineWorkspaceActive,
    selectWorkspace,
    startSideResize,
    startTimelineResize,
  } = shell;
  const { themeVars, colorScheme } = resolveEditorThemeVars(theme, editorTheme, state.themeOverrides);
  const liveDocument = activeDocument;
  const { previewDocument, stateMachinePreviewMode, timelinePreviewCallbacks } = useEditorPreviewController(liveDocument);
  const slots = buildEditorLayoutSlots({
    activeDocument,
    liveDocument,
    workspace,
    preferredLeftTab,
    previewDocument,
    previewMode: stateMachinePreviewMode,
    timelinePreviewCallbacks,
    colorScheme,
    contentTheme: theme,
    onDocumentChange: commitDocumentChange,
  });

  return (
    <EditorRoot className={className} style={style} themeVars={themeVars} colorScheme={colorScheme}>
      <EditorWorkspaceSurface
        workspace={workspace}
        leftVisible={leftVisible}
        rightVisible={rightVisible}
        timelineVisible={timelineVisible}
        leftWidth={leftWidth}
        rightWidth={rightWidth}
        timelineHeight={timelineHeight}
        selectedCount={state.selectedIds.length}
        stateMachineWorkspaceActive={stateMachineWorkspaceActive}
        onWorkspaceSelect={selectWorkspace}
        onLeftVisibleChange={setLeftVisible}
        onRightVisibleChange={setRightVisible}
        onTimelineVisibleChange={setTimelineVisible}
        onLeftResizeStart={startSideResize('left')}
        onRightResizeStart={startSideResize('right')}
        onTimelineResizeStart={startTimelineResize}
        {...slots}
      />
    </EditorRoot>
  );
}
