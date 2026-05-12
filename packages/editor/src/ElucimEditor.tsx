import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RenderableDocument, ElucimDocument, ElucimTimelineFrameSelection } from '@elucim/dsl';
import { applyTimelineFrames, createRenderableDocument } from '@elucim/dsl';
import type { ElucimTheme } from '@elucim/core';
import { ImageResolverProvider, type ImageResolverFn } from '@elucim/core';
import { EditorProvider, useEditorState } from './state/EditorProvider';
import { ImagePickerProvider, type BrowseImageFn } from './image/ImagePickerProvider';
import { ElucimCanvas } from './canvas/ElucimCanvas';
import { Inspector } from './inspector/Inspector';
import { Timeline } from './timeline/Timeline';
import { EditorErrorBoundary } from './panels/EditorErrorBoundary';
import { LeftDock } from './dock/LeftDock';
import { PanelShell } from './panels/PanelShell';
import { buildThemeVars, deriveEditorTheme, v } from './theme/tokens';
import { startRafDrag } from './interactions/rafDrag';
import { createDocumentFromEditorState, normalizeInitialDocument } from './document/documentCompatibility';
import { CollapsedPanelRail } from './chrome/CollapsedPanelRail';
import { PanelResizeHandle } from './chrome/PanelResizeHandle';
import { PanelToggle } from './chrome/PanelToggle';
import { WorkspaceTab } from './chrome/WorkspaceTab';

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

export interface ElucimEditorChangeDetails {
  changedFormat: boolean;
  warnings: string[];
}

/** Emits canonical document changes from internal editor state. */
function DocumentChangeEmitter({
  onChange,
  onWarnings,
}: {
  onChange?: (doc: ElucimDocument, details: ElucimEditorChangeDetails) => void;
  onWarnings?: (warnings: string[]) => void;
}) {
  const { state, dispatch } = useEditorState();
  const doc = state.document;
  const sourceDocument = state.canonicalDocument;
  const cbRef = useRef(onChange);
  const previousDocRef = useRef(doc);
  const previousWarningsRef = useRef('');
  cbRef.current = onChange;
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    const docChanged = previousDocRef.current !== doc;
    previousDocRef.current = doc;
    const result = sourceDocument
      ? { document: sourceDocument, warnings: state.compatibilityWarnings }
      : { document: createDocumentFromEditorState(doc), warnings: [] };
    const details: ElucimEditorChangeDetails = {
      changedFormat: docChanged,
      warnings: result.warnings,
    };
    if (docChanged) {
      dispatch({ type: 'SET_CANONICAL_DOCUMENT', document: result.document, warnings: result.warnings });
      cbRef.current?.(result.document, details);
    }
    const warningKey = result.warnings.join('\n');
    if (warningKey !== previousWarningsRef.current) {
      previousWarningsRef.current = warningKey;
      onWarnings?.(result.warnings);
    }
  }, [dispatch, doc, onWarnings, sourceDocument, state.compatibilityWarnings]);

  return null;
}

function InitialDocumentModelSync({
  document,
  lastEmittedDocumentRef,
}: {
  document?: ElucimDocument;
  lastEmittedDocumentRef: React.MutableRefObject<ElucimDocument | undefined>;
}) {
  const { dispatch } = useEditorState();
  useEffect(() => {
    if (document === lastEmittedDocumentRef.current) return;
    dispatch({ type: 'SET_CANONICAL_DOCUMENT', document, warnings: [], syncProjection: true });
  }, [dispatch, document, lastEmittedDocumentRef]);
  return null;
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
  const resolvedFrame = initialFrame === 'last'
    ? Math.max(0, ((normalizedInitialDocument?.root as any)?.durationInFrames ?? 1) - 1)
    : initialFrame;

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

type EditorWorkspace = 'design' | 'animate' | 'states' | 'polish';

const DEFAULT_LEFT_WIDTH = 252;
const DEFAULT_RIGHT_WIDTH = 286;
const DEFAULT_TIMELINE_HEIGHT = 340;
const MIN_SIDE_WIDTH = 180;
const MAX_SIDE_WIDTH = 560;
const MIN_TIMELINE_HEIGHT = 220;
const MAX_TIMELINE_HEIGHT = 640;

function clampPanelSize(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
  const [workspace, setWorkspace] = useState<EditorWorkspace>(() => activeDocument ? 'animate' : 'design');
  const [previewTimelineFrames, setPreviewTimelineFrames] = useState<ElucimTimelineFrameSelection[] | undefined>(undefined);
  const [stateMachinePreviewActive, setStateMachinePreviewActive] = useState(false);
  const [stateMachinePreviewClickHandler, setStateMachinePreviewClickHandler] = useState<(() => boolean) | undefined>(undefined);
  const [stateMachinePreviewKeyDownHandler, setStateMachinePreviewKeyDownHandler] = useState<((key: string) => boolean) | undefined>(undefined);
  const [stateMachinePreviewExitHandler, setStateMachinePreviewExitHandler] = useState<(() => void) | undefined>(undefined);
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(() => !activeDocument);
  const [timelineVisible, setTimelineVisible] = useState(true);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);
  const [timelineHeight, setTimelineHeight] = useState(DEFAULT_TIMELINE_HEIGHT);

  // Derive editor chrome from content theme, then layer explicit overrides
  const colorSchemeHint = editorTheme?.['color-scheme'] ?? editorTheme?.['--elucim-editor-color-scheme'] ?? 'dark';
  const derived = theme
    ? deriveEditorTheme(theme, colorSchemeHint as 'light' | 'dark')
    : {};
  const merged = { ...derived, ...editorTheme };
  for (const [k, val] of Object.entries(state.themeOverrides)) {
    merged[k] = val;
  }
  const themeVars = buildThemeVars(merged);
  const colorScheme = merged['--elucim-editor-color-scheme'] || merged['color-scheme'] || colorSchemeHint;
  const preferredLeftTab = workspace === 'polish' ? 'polish' : workspace === 'design' ? 'objects' : undefined;
  const stateMachineWorkspaceActive = workspace === 'states' && timelineVisible;
  const commitDocumentChange = (document: ElucimDocument) => {
    dispatch({ type: 'SET_CANONICAL_DOCUMENT', document, warnings: [] });
    onDocumentChange?.(document);
  };
  const liveDocument = activeDocument;
  const previewDocument = useMemo(() => {
    if (!liveDocument || !previewTimelineFrames?.length) return undefined;
    const renderableFrames = previewTimelineFrames.filter(frame => liveDocument.timelines?.[frame.timelineId]);
    if (renderableFrames.length === 0) return undefined;
    return createRenderableDocument(applyTimelineFrames(liveDocument, renderableFrames));
  }, [previewTimelineFrames, liveDocument]);
  const selectWorkspace = (nextWorkspace: EditorWorkspace) => {
    if (nextWorkspace !== 'animate' && state.isPlaying) {
      dispatch({ type: 'SET_PLAYING', playing: false });
    }
    setWorkspace(nextWorkspace);
    if (nextWorkspace === 'design') {
      setLeftVisible(true);
      setRightVisible(true);
      setTimelineVisible(false);
    } else if (nextWorkspace === 'animate') {
      setLeftVisible(true);
      setRightVisible(false);
      setTimelineVisible(true);
      setTimelineHeight(Math.max(timelineHeight, 360));
    } else if (nextWorkspace === 'states') {
      setLeftVisible(false);
      setRightVisible(false);
      setTimelineVisible(true);
      setTimelineHeight(Math.max(timelineHeight, 420));
    } else {
      setLeftVisible(true);
      setRightVisible(false);
      setTimelineVisible(false);
      setLeftWidth(Math.max(leftWidth, 360));
    }
  };
  const startSideResize = (side: 'left' | 'right') => (event: React.PointerEvent<HTMLDivElement>) => {
    const startWidth = side === 'left' ? leftWidth : rightWidth;
    startRafDrag({
      event,
      onFrame: point => {
        const nextWidth = side === 'left' ? startWidth + point.deltaX : startWidth - point.deltaX;
        if (side === 'left') setLeftWidth(clampPanelSize(nextWidth, MIN_SIDE_WIDTH, MAX_SIDE_WIDTH));
        else setRightWidth(clampPanelSize(nextWidth, MIN_SIDE_WIDTH, MAX_SIDE_WIDTH));
      },
    });
  };
  const startTimelineResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const startHeight = timelineHeight;
    startRafDrag({
      event,
      onFrame: point => setTimelineHeight(clampPanelSize(startHeight - point.deltaY, MIN_TIMELINE_HEIGHT, MAX_TIMELINE_HEIGHT)),
    });
  };

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
      <div
        style={{
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: `1px solid ${v('--elucim-editor-border')}`,
          background: v('--elucim-editor-surface'),
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 750, letterSpacing: 0.2 }}>Elucim</div>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10 }}>
            Scene editor
          </div>
          <div role="tablist" aria-label="Editor workspace" style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
            <WorkspaceTab label="Design" selected={workspace === 'design'} onClick={() => selectWorkspace('design')} />
            <WorkspaceTab label="Animate" selected={workspace === 'animate'} onClick={() => selectWorkspace('animate')} />
            <WorkspaceTab label="State Machine" selected={workspace === 'states'} onClick={() => selectWorkspace('states')} />
            <WorkspaceTab label="Polish" selected={workspace === 'polish'} onClick={() => selectWorkspace('polish')} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PanelToggle label="Left panel" active={leftVisible} onClick={() => setLeftVisible(value => !value)} />
          <PanelToggle label="Inspector" active={rightVisible} onClick={() => setRightVisible(value => !value)} />
          <PanelToggle label="Timeline" active={timelineVisible} onClick={() => setTimelineVisible(value => !value)} />
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, fontVariantNumeric: 'tabular-nums', minWidth: 76, textAlign: 'right' }}>
            {state.selectedIds.length === 0 ? 'No selection' : `${state.selectedIds.length} selected`}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: stateMachineWorkspaceActive ? '0 0 clamp(96px, 14vh, 180px)' : 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `${leftVisible ? `${leftWidth}px` : '0px'} minmax(260px, 1fr) ${rightVisible ? `${rightWidth}px` : '0px'}`,
          background: v('--elucim-editor-bg'),
        }}
      >
        <aside
          aria-hidden={!leftVisible}
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            borderRight: `1px solid ${v('--elucim-editor-border')}`,
            background: v('--elucim-editor-surface'),
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {leftVisible && <LeftDock document={activeDocument} onDocumentChange={commitDocumentChange} preferredTab={preferredLeftTab} />}
          {leftVisible && <PanelResizeHandle side="right" label="Resize left panel" onPointerDown={startSideResize('left')} />}
        </aside>

        <main style={{ position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          <CollapsedPanelRail
            leftVisible={leftVisible}
            rightVisible={rightVisible}
            timelineVisible={timelineVisible}
            onShowLeft={() => setLeftVisible(true)}
            onShowRight={() => setRightVisible(true)}
            onShowTimeline={() => setTimelineVisible(true)}
          />
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
        </main>

        <aside
          aria-hidden={!rightVisible}
          style={{
            minWidth: 0,
            minHeight: 0,
            borderLeft: `1px solid ${v('--elucim-editor-border')}`,
            background: v('--elucim-editor-surface'),
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {rightVisible && <PanelResizeHandle side="left" label="Resize inspector" onPointerDown={startSideResize('right')} />}
          {rightVisible && (
            <PanelShell title="Inspector">
              <Inspector showCanvasDuration={!activeDocument} />
            </PanelShell>
          )}
        </aside>
      </div>

      {timelineVisible && (
        <div
          style={{
            height: stateMachineWorkspaceActive ? undefined : timelineHeight,
            flex: stateMachineWorkspaceActive ? '1 1 0' : '0 0 auto',
            minHeight: stateMachineWorkspaceActive ? 360 : undefined,
            borderTop: `1px solid ${v('--elucim-editor-border')}`,
            background: v('--elucim-editor-surface'),
            position: 'relative',
          }}
        >
          <PanelResizeHandle side="top" label="Resize timeline" onPointerDown={startTimelineResize} />
          <Timeline
            style={{ height: '100%', borderTop: 'none' }}
            document={liveDocument}
            timelines={liveDocument?.timelines}
            onTimelinesChange={liveDocument ? timelines => commitDocumentChange({ ...liveDocument, ...(timelines ? { timelines } : { timelines: undefined }) }) : undefined}
            stateMachines={liveDocument?.stateMachines}
            onStateMachinesChange={liveDocument ? stateMachines => commitDocumentChange({ ...liveDocument, ...(stateMachines ? { stateMachines } : { stateMachines: undefined }) }) : undefined}
            onMotionChange={liveDocument ? (timelines, stateMachines) => commitDocumentChange({
              ...liveDocument,
              ...(timelines ? { timelines } : { timelines: undefined }),
              ...(stateMachines ? { stateMachines } : { stateMachines: undefined }),
            }) : undefined}
            preferredMotionType={workspace === 'states' ? 'stateMachine' : 'animation'}
            onPreviewTimelineFramesChange={setPreviewTimelineFrames}
            onStateMachinePreviewActiveChange={setStateMachinePreviewActive}
            onStateMachinePreviewClickChange={handler => setStateMachinePreviewClickHandler(() => handler)}
            onStateMachinePreviewKeyDownChange={handler => setStateMachinePreviewKeyDownHandler(() => handler)}
            onStateMachinePreviewExitChange={handler => setStateMachinePreviewExitHandler(() => handler)}
          />
        </div>
      )}
    </div>
  );
}
