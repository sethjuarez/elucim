import React from 'react';
import type { RenderableDocument, ElucimDocument } from '@elucim/dsl';
import type { ElucimTheme } from '@elucim/core';
import { ImageResolverProvider, type ImageResolverFn } from '@elucim/core';
import { useEditorState } from './state/EditorProvider';
import { ImagePickerProvider, type BrowseImageFn } from './image/ImagePickerProvider';
import { EditorCanvasPanel } from './canvas/EditorCanvasPanel';
import { useEditorPreviewController } from './canvas/editorPreviewController';
import { Inspector } from './inspector/Inspector';
import { EditorTimelinePanel } from './timeline/EditorTimelinePanel';
import { LeftDock } from './dock/LeftDock';
import { PanelShell } from './panels/PanelShell';
import { EditorDocumentRuntime } from './document/EditorDocumentRuntime';
import type { ElucimEditorChangeDetails } from './document/documentLifecycle';
import { EditorRoot } from './chrome/EditorRoot';
import { EditorWorkspaceSurface } from './chrome/EditorWorkspaceSurface';
import { resolveEditorThemeVars, useEditorShellState } from './shell/editorShell';

export type { ElucimEditorChangeDetails } from './document/documentLifecycle';

export interface ElucimEditorProps {
  /** Initial document to edit. Creates an empty scene if not provided. */
  initialDocument?: RenderableDocument | ElucimDocument;
  /** Initial animation frame. Use `'last'` to start at the final frame. */
  initialFrame?: number | 'last';
  /**
   * Unified content theme.  When provided, editor chrome is automatically
   * derived from these content tokens (foreground → fg, primary → accent, etc.).
   * Pass the same `ElucimTheme` you use with `DslRenderer`.
   */
  theme?: ElucimTheme;
  /**
   * Explicit overrides for editor chrome tokens.
   * Keys can be bare names (e.g. `"accent"`) or full CSS variable names.
   * These override any values auto-derived from `theme`.
   */
  editorTheme?: Record<string, string>;
  /** Called whenever the document changes. Receives the updated normalized document. */
  onDocumentChange?: (document: ElucimDocument, details: ElucimEditorChangeDetails) => void;
  /** Called when normalized output has warnings host apps may want to display. */
  onCompatibilityWarnings?: (warnings: string[]) => void;
  /**
   * Image picker callback.  When provided, the Inspector shows a "…" browse
   * button next to image `src` fields.  Return `null` if the user cancels.
   */
  onBrowseImage?: BrowseImageFn;
  /**
   * Image resolver for consumer-managed assets.
   * When provided, image elements with a `ref` resolve via this function
   * in both the canvas preview and exported documents.
   */
  imageResolver?: ImageResolverFn;
  /** CSS class for the editor container */
  className?: string;
  /** Inline styles for the editor container */
  style?: React.CSSProperties;
}

/**
 * A visual editor for creating and editing Elucim animated scenes.
 * Persistent shell with hierarchy, stage, inspector, and timeline.
 */
export function ElucimEditor({ initialDocument, initialFrame, theme, editorTheme, className, style, onDocumentChange, onCompatibilityWarnings, onBrowseImage, imageResolver }: ElucimEditorProps) {
  let inner = (
    <EditorDocumentRuntime
      initialDocument={initialDocument}
      initialFrame={initialFrame}
      onDocumentChange={onDocumentChange}
      onCompatibilityWarnings={onCompatibilityWarnings}
    >
      {handleDocumentChange => (
        <ElucimEditorLayout
          theme={theme}
          editorTheme={editorTheme}
          className={className}
          style={style}
          onDocumentChange={handleDocumentChange}
        />
      )}
    </EditorDocumentRuntime>
  );

  if (imageResolver) {
    inner = <ImageResolverProvider resolver={imageResolver}>{inner}</ImageResolverProvider>;
  }
  if (onBrowseImage) {
    inner = <ImagePickerProvider onBrowse={onBrowseImage}>{inner}</ImagePickerProvider>;
  }

  return inner;
}

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
  const { state, dispatch } = useEditorState();
  const activeDocument = documentModel ?? state.canonicalDocument;
  const shell = useEditorShellState({
    hasActiveDocument: Boolean(activeDocument),
    isPlaying: state.isPlaying,
    stopPlayback: () => dispatch({ type: 'SET_PLAYING', playing: false }),
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
  const commitDocumentChange = (document: ElucimDocument) => {
    dispatch({ type: 'SET_CANONICAL_DOCUMENT', document, warnings: [] });
    onDocumentChange?.(document);
  };
  const liveDocument = activeDocument;
  const { previewDocument, stateMachinePreviewMode, timelinePreviewCallbacks } = useEditorPreviewController(liveDocument);

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
        leftDock={<LeftDock document={activeDocument} onDocumentChange={commitDocumentChange} preferredTab={preferredLeftTab} />}
        canvas={(
          <EditorCanvasPanel
            previewDocument={previewDocument}
            previewMode={stateMachinePreviewMode}
            editorColorScheme={colorScheme}
            contentTheme={theme}
          />
        )}
        inspector={(
          <PanelShell title="Inspector">
            <Inspector showCanvasDuration={!activeDocument} />
          </PanelShell>
        )}
        timeline={(
          <EditorTimelinePanel
            document={liveDocument}
            workspace={workspace}
            onDocumentChange={commitDocumentChange}
            {...timelinePreviewCallbacks}
          />
        )}
      />
    </EditorRoot>
  );
}
