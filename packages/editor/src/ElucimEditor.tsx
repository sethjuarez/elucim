import React, { useMemo, useRef, useState } from 'react';
import type { RenderableDocument, ElucimDocument, ElucimTimelineFrameSelection } from '@elucim/dsl';
import type { ElucimTheme } from '@elucim/core';
import { ImageResolverProvider, type ImageResolverFn } from '@elucim/core';
import { EditorProvider, useEditorState } from './state/EditorProvider';
import { ImagePickerProvider, type BrowseImageFn } from './image/ImagePickerProvider';
import { ElucimCanvas } from './canvas/ElucimCanvas';
import { Inspector } from './inspector/Inspector';
import { EditorTimelinePanel } from './timeline/EditorTimelinePanel';
import { EditorErrorBoundary } from './panels/EditorErrorBoundary';
import { LeftDock } from './dock/LeftDock';
import { PanelShell } from './panels/PanelShell';
import { v } from './theme/tokens';
import { normalizeInitialDocument } from './document/documentCompatibility';
import { DocumentChangeEmitter, InitialDocumentModelSync, resolveInitialFrame, resolvePreviewDocument, type ElucimEditorChangeDetails } from './document/documentLifecycle';
import { EditorMainGrid } from './chrome/EditorMainGrid';
import { EditorTimelineDock } from './chrome/EditorTimelineDock';
import { EditorTopBar } from './chrome/EditorTopBar';
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
  const normalizedInitialDocument = useMemo(() => normalizeInitialDocument(initialDocument), [initialDocument]);
  const initialDocumentModel = initialDocument?.version === '2.0' ? initialDocument : undefined;
  const lastEmittedDocumentModel = useRef<ElucimDocument | undefined>(undefined);
  const handleDocumentChange = (document: ElucimDocument, details: ElucimEditorChangeDetails) => {
    lastEmittedDocumentModel.current = document;
    onDocumentChange?.(document, details);
  };
  const handleCompatibilityWarnings = (warnings: string[]) => {
    onCompatibilityWarnings?.(warnings);
  };
  // Resolve 'last' to the actual final frame number
  const resolvedFrame = resolveInitialFrame(initialFrame, normalizedInitialDocument);

  let inner = (
    <EditorErrorBoundary>
      <EditorProvider initialDocument={normalizedInitialDocument} initialCanonicalDocument={initialDocumentModel} initialFrame={resolvedFrame}>
        <InitialDocumentModelSync document={initialDocumentModel} lastEmittedDocumentRef={lastEmittedDocumentModel} />
        <DocumentChangeEmitter onChange={handleDocumentChange} onWarnings={handleCompatibilityWarnings} />
        <ElucimEditorLayout theme={theme} editorTheme={editorTheme} className={className} style={style} onDocumentChange={document => handleDocumentChange(document, { changedFormat: false, warnings: [] })} />
      </EditorProvider>
    </EditorErrorBoundary>
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
  const [previewTimelineFrames, setPreviewTimelineFrames] = useState<ElucimTimelineFrameSelection[] | undefined>(undefined);
  const [stateMachinePreviewActive, setStateMachinePreviewActive] = useState(false);
  const [stateMachinePreviewClickHandler, setStateMachinePreviewClickHandler] = useState<(() => boolean) | undefined>(undefined);
  const [stateMachinePreviewKeyDownHandler, setStateMachinePreviewKeyDownHandler] = useState<((key: string) => boolean) | undefined>(undefined);
  const [stateMachinePreviewExitHandler, setStateMachinePreviewExitHandler] = useState<(() => void) | undefined>(undefined);
  const { themeVars, colorScheme } = resolveEditorThemeVars(theme, editorTheme, state.themeOverrides);
  const commitDocumentChange = (document: ElucimDocument) => {
    dispatch({ type: 'SET_CANONICAL_DOCUMENT', document, warnings: [] });
    onDocumentChange?.(document);
  };
  const liveDocument = activeDocument;
  const previewDocument = useMemo(() => resolvePreviewDocument(liveDocument, previewTimelineFrames), [previewTimelineFrames, liveDocument]);

  return (
    <div
      className={`elucim-editor ${className ?? ''}`}
      style={{
        ...themeVars,
        display: 'flex',
        flexDirection: 'column',
        background: v('--elucim-editor-bg'),
        color: v('--elucim-editor-fg'),
        fontFamily: 'system-ui, -apple-system, sans-serif',
        height: '100%',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        colorScheme: colorScheme as any,
        ...style,
        }}
      >
      {/* Scoped scrollbar + input styling */}
      <style>{`
        .elucim-editor ::-webkit-scrollbar { width: 6px; height: 6px; }
        .elucim-editor ::-webkit-scrollbar-track { background: transparent; }
        .elucim-editor ::-webkit-scrollbar-thumb {
          background: ${v('--elucim-editor-border')};
          border-radius: 3px;
        }
        .elucim-editor ::-webkit-scrollbar-thumb:hover {
          background: ${v('--elucim-editor-text-muted')};
        }
        .elucim-editor input[type="number"] {
          -moz-appearance: textfield;
        }
        .elucim-editor input[type="number"]::-webkit-inner-spin-button,
        .elucim-editor input[type="number"]::-webkit-outer-spin-button {
          opacity: 0;
          width: 0;
          margin: 0;
        }
        .elucim-editor input[type="number"]:hover::-webkit-inner-spin-button {
          opacity: 1;
          width: 10px;
          height: 14px;
          cursor: pointer;
        }
        .elucim-editor input:focus, .elucim-editor textarea:focus {
          outline: 1px solid ${v('--elucim-editor-accent')};
          outline-offset: -1px;
        }
      `}</style>
      <EditorTopBar
        workspace={workspace}
        leftVisible={leftVisible}
        rightVisible={rightVisible}
        timelineVisible={timelineVisible}
        selectedCount={state.selectedIds.length}
        onWorkspaceSelect={selectWorkspace}
        onLeftVisibleChange={setLeftVisible}
        onRightVisibleChange={setRightVisible}
        onTimelineVisibleChange={setTimelineVisible}
      />

      <EditorMainGrid
        leftVisible={leftVisible}
        rightVisible={rightVisible}
        timelineVisible={timelineVisible}
        leftWidth={leftWidth}
        rightWidth={rightWidth}
        stateMachineWorkspaceActive={stateMachineWorkspaceActive}
        onLeftVisibleChange={setLeftVisible}
        onRightVisibleChange={setRightVisible}
        onTimelineVisibleChange={setTimelineVisible}
        onLeftResizeStart={startSideResize('left')}
        onRightResizeStart={startSideResize('right')}
        leftDock={<LeftDock document={activeDocument} onDocumentChange={commitDocumentChange} preferredTab={preferredLeftTab} />}
        canvas={(
          <ElucimCanvas
            previewDocument={previewDocument}
            previewMode={{
              active: stateMachinePreviewActive,
              label: 'Preview mode',
              exitLabel: 'Exit state machine preview mode',
              onClick: stateMachinePreviewClickHandler,
              onKeyDown: stateMachinePreviewKeyDownHandler,
              onExit: stateMachinePreviewExitHandler,
            }}
            editorColorScheme={colorScheme}
            contentTheme={theme}
          />
        )}
        inspector={(
          <PanelShell title="Inspector">
            <Inspector showCanvasDuration={!activeDocument} />
          </PanelShell>
        )}
      />

      <EditorTimelineDock visible={timelineVisible} stateMachineWorkspaceActive={stateMachineWorkspaceActive} timelineHeight={timelineHeight} onResizeStart={startTimelineResize}>
        <EditorTimelinePanel
          document={liveDocument}
          workspace={workspace}
          onDocumentChange={commitDocumentChange}
          onPreviewTimelineFramesChange={setPreviewTimelineFrames}
          onStateMachinePreviewActiveChange={setStateMachinePreviewActive}
          onStateMachinePreviewClickChange={handler => setStateMachinePreviewClickHandler(() => handler)}
          onStateMachinePreviewKeyDownChange={handler => setStateMachinePreviewKeyDownHandler(() => handler)}
          onStateMachinePreviewExitChange={handler => setStateMachinePreviewExitHandler(() => handler)}
        />
      </EditorTimelineDock>
    </div>
  );
}
