import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RenderableDocument, ElucimDocument, ElucimDocumentNudge, ElucimTimelineFrameSelection } from '@elucim/dsl';
import { analyzePolish, applyNudge, applyTimelineFrames, migrateV2ToV1, suggestDocumentNudges, suggestSemanticLayoutNudges } from '@elucim/dsl';
import type { ElucimTheme } from '@elucim/core';
import { ImageResolverProvider, type ImageResolverFn } from '@elucim/core';
import { EditorProvider } from './state/EditorProvider';
import { ImagePickerProvider, type BrowseImageFn } from './image/ImagePickerProvider';
import { useEditorDocument } from './state/EditorProvider';
import { ElucimCanvas } from './canvas/ElucimCanvas';
import { Toolbar } from './toolbar/Toolbar';
import { HierarchyPanel } from './hierarchy/HierarchyPanel';
import { Inspector } from './inspector/Inspector';
import { Timeline } from './timeline/Timeline';
import { EditorErrorBoundary } from './panels/EditorErrorBoundary';
import { useEditorState } from './state/EditorProvider';
import { findElementById } from './state/reducer';
import { CANVAS_ID } from './state/types';
import { buildThemeVars, deriveEditorTheme, v } from './theme/tokens';
import { startRafDrag } from './interactions/rafDrag';
import { createDocumentFromEditorState, normalizeInitialDocument, restoreDocumentFromEditorState } from './document/documentBridge';
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

/** Bridges internal editor state to external document change callbacks. */
function DocumentBridge({
  onChange,
  onWarnings,
  v2Document,
}: {
  onChange?: (doc: ElucimDocument, details: ElucimEditorChangeDetails) => void;
  onWarnings?: (warnings: string[]) => void;
  v2Document?: ElucimDocument;
}) {
  const doc = useEditorDocument();
  const cbRef = useRef(onChange);
  const previousDocRef = useRef(doc);
  const previousV2DocumentRef = useRef(v2Document);
  const previousWarningsRef = useRef('');
  cbRef.current = onChange;
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    const docChanged = previousDocRef.current !== doc;
    const v2Changed = previousV2DocumentRef.current !== v2Document;
    previousDocRef.current = doc;
    previousV2DocumentRef.current = v2Document;
    const result = v2Document
      ? restoreDocumentFromEditorState(doc, v2Document)
      : { document: createDocumentFromEditorState(doc), warnings: [] };
    const details: ElucimEditorChangeDetails = {
      changedFormat: docChanged,
      warnings: result.warnings,
    };
    if (docChanged || v2Changed) {
      cbRef.current?.(result.document, details);
    }
    const warningKey = result.warnings.join('\n');
    if (warningKey !== previousWarningsRef.current) {
      previousWarningsRef.current = warningKey;
      onWarnings?.(result.warnings);
    }
  }, [doc, onWarnings, v2Document]);

  return null;
}

/**
 * A visual editor for creating and editing Elucim animated scenes.
 * Persistent shell with hierarchy, stage, inspector, and timeline.
 */
export function ElucimEditor({ initialDocument, initialFrame, theme, editorTheme, className, style, onDocumentChange, onCompatibilityWarnings, onBrowseImage, imageResolver }: ElucimEditorProps) {
  const normalizedInitialDocument = useMemo(() => normalizeInitialDocument(initialDocument), [initialDocument]);
  const initialV2Document = initialDocument?.version === '2.0' ? initialDocument : undefined;
  const [v2Document, setV2Document] = useState<ElucimDocument | undefined>(initialV2Document);
  const lastEmittedV2Document = useRef<ElucimDocument | undefined>(undefined);
  useEffect(() => {
    if (initialV2Document && initialV2Document === lastEmittedV2Document.current) return;
    setV2Document(initialV2Document);
  }, [initialV2Document]);
  const handleDocumentChange = (document: ElucimDocument, details: ElucimEditorChangeDetails) => {
    lastEmittedV2Document.current = document;
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
      <EditorProvider initialDocument={normalizedInitialDocument} initialFrame={resolvedFrame}>
        <DocumentBridge onChange={handleDocumentChange} onWarnings={handleCompatibilityWarnings} v2Document={v2Document} />
        <ElucimEditorLayout theme={theme} editorTheme={editorTheme} className={className} style={style} v2Document={v2Document} onDocumentChange={setV2Document} />
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
  v2Document?: ElucimDocument;
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
export function ElucimEditorLayout({ theme, editorTheme, className, style, v2Document, onDocumentChange }: ElucimEditorLayoutProps) {
  const { state, dispatch } = useEditorState();
  const [workspace, setWorkspace] = useState<EditorWorkspace>(() => v2Document ? 'animate' : 'design');
  const [previewTimelineFrames, setPreviewTimelineFrames] = useState<ElucimTimelineFrameSelection[] | undefined>(undefined);
  const [stateMachinePreviewActive, setStateMachinePreviewActive] = useState(false);
  const [stateMachinePreviewClickHandler, setStateMachinePreviewClickHandler] = useState<(() => boolean) | undefined>(undefined);
  const [stateMachinePreviewKeyDownHandler, setStateMachinePreviewKeyDownHandler] = useState<((key: string) => boolean) | undefined>(undefined);
  const [stateMachinePreviewExitHandler, setStateMachinePreviewExitHandler] = useState<(() => void) | undefined>(undefined);
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(() => !v2Document);
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
  const preferredLeftTab = workspace === 'polish' ? 'details' : workspace === 'design' ? 'objects' : undefined;
  const stateMachineWorkspaceActive = workspace === 'states' && timelineVisible;
  const liveV2Document = useMemo(() => {
    if (!v2Document) return undefined;
    return restoreDocumentFromEditorState(state.document, v2Document).document;
  }, [state.document, v2Document]);
  const previewDocument = useMemo(() => {
    if (!liveV2Document || !previewTimelineFrames?.length) return undefined;
    const renderableFrames = previewTimelineFrames.filter(frame => liveV2Document.timelines?.[frame.timelineId]);
    if (renderableFrames.length === 0) return undefined;
    return migrateV2ToV1(applyTimelineFrames(liveV2Document, renderableFrames));
  }, [previewTimelineFrames, liveV2Document]);
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
          {leftVisible && <LeftDock v2Document={v2Document} onDocumentChange={onDocumentChange} preferredTab={preferredLeftTab} />}
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
              <Inspector showCanvasDuration={!v2Document} />
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
            v2Document={liveV2Document}
            v2Timelines={liveV2Document?.timelines}
            onV2TimelinesChange={liveV2Document && onDocumentChange ? timelines => onDocumentChange({ ...liveV2Document, ...(timelines ? { timelines } : { timelines: undefined }) }) : undefined}
            v2StateMachines={liveV2Document?.stateMachines}
            onV2StateMachinesChange={liveV2Document && onDocumentChange ? stateMachines => onDocumentChange({ ...liveV2Document, ...(stateMachines ? { stateMachines } : { stateMachines: undefined }) }) : undefined}
            onV2MotionChange={liveV2Document && onDocumentChange ? (timelines, stateMachines) => onDocumentChange({
              ...liveV2Document,
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

function LeftDock({ v2Document, onDocumentChange, preferredTab }: { v2Document?: ElucimDocument; onDocumentChange?: (document: ElucimDocument) => void; preferredTab?: 'objects' | 'create' | 'details' }) {
  const [tab, setTab] = useState<'objects' | 'create'>('objects');
  useEffect(() => {
    if (preferredTab === 'objects' || preferredTab === 'create') setTab(preferredTab);
  }, [preferredTab]);
  if (preferredTab === 'details') {
    return (
      <section style={{ minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 27, display: 'flex', alignItems: 'center', padding: '0 10px', borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`, background: v('--elucim-editor-input-bg'), color: v('--elucim-editor-text-muted'), fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 0 }}>
          Polish
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <StateMachinePanel v2Document={v2Document} onDocumentChange={onDocumentChange} />
        </div>
      </section>
    );
  }
  return (
    <section style={{ minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        role="tablist"
        aria-label="Left editor panel"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          padding: '0 8px',
          borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
          flexShrink: 0,
          background: v('--elucim-editor-input-bg'),
        }}
      >
        <DockTab label="Hierarchy" selected={tab === 'objects'} onClick={() => setTab('objects')} />
        <DockTab label="Create" selected={tab === 'create'} onClick={() => setTab('create')} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'create' ? <Toolbar /> : <HierarchyPanel v2Document={v2Document} />}
      </div>
    </section>
  );
}

function DockTab({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      style={{
        height: 26,
        border: 'none',
        borderBottom: `2px solid ${selected ? v('--elucim-editor-accent') : 'transparent'}`,
        borderRadius: 0,
        background: selected ? v('--elucim-editor-surface') : 'transparent',
        color: selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: -1,
      }}
    >
      {label}
    </button>
  );
}

function StateMachinePanel({ v2Document, onDocumentChange }: { v2Document?: ElucimDocument; onDocumentChange?: (document: ElucimDocument) => void }) {
  const { state } = useEditorState();
  const selectedId = state.selectedIds.length === 1 && state.selectedIds[0] !== CANVAS_ID ? state.selectedIds[0] : null;
  const selected = selectedId ? findElementById(state.document.root, selectedId)?.element : null;
  const selectedLabel = selectedId && selected ? (('id' in selected && selected.id) ? selected.id : selectedId) : null;
  const v2Compatibility = useMemo(() => v2Document ? restoreDocumentFromEditorState(state.document, v2Document) : undefined, [state.document, v2Document]);
  const currentV2Document = v2Compatibility?.document ?? v2Document;
  const selectedV2Element = selectedId && currentV2Document ? currentV2Document.elements[selectedId] : undefined;
  const machineIds = Object.keys(currentV2Document?.stateMachines ?? {});
  const [dismissedNudgeIds, setDismissedNudgeIds] = useState<Set<string>>(() => new Set());
  const [semanticLayoutNudges, setSemanticLayoutNudges] = useState<ElucimDocumentNudge[]>([]);
  const [semanticLayoutError, setSemanticLayoutError] = useState<string | null>(null);
  const [semanticLayoutLoading, setSemanticLayoutLoading] = useState(false);
  const documentNudges = useMemo(() => currentV2Document
    ? suggestDocumentNudges(currentV2Document)
    : [], [currentV2Document]);
  useEffect(() => {
    if (!currentV2Document) {
      setSemanticLayoutNudges([]);
      setSemanticLayoutError(null);
      setSemanticLayoutLoading(false);
      return;
    }
    let cancelled = false;
    setSemanticLayoutLoading(true);
    setSemanticLayoutError(null);
    suggestSemanticLayoutNudges(currentV2Document)
      .then(nudges => {
        if (cancelled) return;
        setSemanticLayoutNudges(nudges);
      })
      .catch(error => {
        if (cancelled) return;
        setSemanticLayoutNudges([]);
        setSemanticLayoutError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setSemanticLayoutLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentV2Document]);
  const nudgeCandidates = useMemo(() => currentV2Document
    ? [...documentNudges, ...semanticLayoutNudges].filter(nudge => !dismissedNudgeIds.has(nudge.id))
    : [], [currentV2Document, dismissedNudgeIds, documentNudges, semanticLayoutNudges]);
  const polishReport = useMemo(() => currentV2Document ? analyzePolish(currentV2Document) : undefined, [currentV2Document]);
  const nudgePreviews = useMemo(() => {
    if (!currentV2Document) return new Map<string, string[]>();
    const entries: Array<[string, string[]]> = nudgeCandidates.map(nudge => {
      try {
        return [nudge.id, applyNudge(currentV2Document, nudge).summaries];
      } catch (error) {
        return [nudge.id, [`Cannot preview nudge: ${error instanceof Error ? error.message : String(error)}`]];
      }
    });
    return new Map(entries);
  }, [currentV2Document, nudgeCandidates]);
  const updateV2Document = (updater: (document: ElucimDocument) => ElucimDocument) => {
    const baseDocument = v2Compatibility?.document ?? v2Document;
    if (!baseDocument) return;
    onDocumentChange?.(updater(baseDocument));
  };

  const updateMetadata = (changes: NonNullable<ElucimDocument['metadata']>) => {
    updateV2Document(document => ({
      ...document,
      metadata: { ...document.metadata, ...changes },
    }));
  };

  const updateSelectedIntent = (changes: NonNullable<NonNullable<ElucimDocument['elements'][string]>['intent']>) => {
    if (!selectedId) return;
    updateV2Document(document => ({
      ...document,
      elements: {
        ...document.elements,
        [selectedId]: {
          ...document.elements[selectedId],
          intent: { ...document.elements[selectedId]?.intent, ...changes },
        },
      },
    }));
  };

  const applyEditorNudge = (nudgeId: string) => {
    const baseDocument = v2Compatibility?.document ?? v2Document;
    const nudge = nudgeCandidates.find(candidate => candidate.id === nudgeId);
    if (!baseDocument || !nudge) return;
    onDocumentChange?.(applyNudge(baseDocument, nudge).document);
    setDismissedNudgeIds(previous => new Set(previous).add(nudge.id));
  };

  const dismissEditorNudge = (nudgeId: string) => {
    setDismissedNudgeIds(previous => new Set(previous).add(nudgeId));
  };

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11 }}>
      <div style={{ color: v('--elucim-editor-text-secondary'), lineHeight: 1.45 }}>
        Polish is for scene metadata, selected-element intent, suggestions, and document diagnostics. Use the State Machine workspace to author interactive state graphs.
      </div>

      {v2Document && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Motion
          </div>
          <div style={{ color: v('--elucim-editor-text-secondary'), lineHeight: 1.4 }}>
            {machineIds.length === 0
              ? 'No state machines yet. Open the State Machine workspace and use Add state machine to create one.'
              : `${machineIds.length} state machine${machineIds.length === 1 ? '' : 's'} in this scene. Open the State Machine workspace to edit the graph, states, and transitions.`}
          </div>
        </div>
      )}

      {v2Document && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Scene metadata
          </div>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Polish level
            <select
              aria-label="Polish level"
              value={v2Document.metadata?.polishLevel ?? 'draft'}
              onChange={event => updateMetadata({ polishLevel: event.target.value as NonNullable<ElucimDocument['metadata']>['polishLevel'] })}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            >
              <option value="draft">draft</option>
              <option value="refined">refined</option>
              <option value="final">final</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Intent
            <input
              aria-label="Document intent"
              value={v2Document.metadata?.intent ?? ''}
              onChange={event => updateMetadata({ intent: event.target.value })}
              placeholder="What this visual should communicate"
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Generated/source
            <input
              aria-label="Generated by"
              value={v2Document.metadata?.generatedBy ?? ''}
              onChange={event => updateMetadata({ generatedBy: event.target.value })}
              placeholder="Designer, user, agent name"
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Notes
            <textarea
              aria-label="Document notes"
              value={(v2Document.metadata?.notes ?? []).join('\n')}
              onChange={event => updateMetadata({ notes: event.target.value.split('\n').map(note => note.trim()).filter(Boolean) })}
              placeholder="One note per line"
              rows={3}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4, resize: 'vertical' }}
            />
          </label>
        </div>
      )}

      {v2Document && polishReport && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Polish score
            </div>
            <strong style={{ color: polishReport.score.overall >= 85 ? v('--elucim-editor-success') : v('--elucim-editor-warning') }}>
              {polishReport.score.overall}
            </strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4, color: v('--elucim-editor-text-secondary'), fontSize: 10 }}>
            <span>Layout {polishReport.score.layout}</span>
            <span>Hierarchy {polishReport.score.hierarchy}</span>
            <span>Readability {polishReport.score.readability}</span>
            <span>Graph {polishReport.score.graph}</span>
            <span>Structure {polishReport.score.structure}</span>
            <span>Motion {polishReport.score.motion}</span>
          </div>
          {polishReport.diagnostics.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 16, color: v('--elucim-editor-text-secondary'), fontSize: 10, lineHeight: 1.35 }}>
              {polishReport.diagnostics.slice(0, 5).map(diagnostic => (
                <li key={diagnostic.id}>
                  <strong>{diagnostic.category}</strong>: {diagnostic.message}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: v('--elucim-editor-text-secondary'), lineHeight: 1.4 }}>
              No polish diagnostics found.
            </div>
          )}
          {semanticLayoutLoading && (
            <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, lineHeight: 1.35 }}>
              Checking semantic layout relationships...
            </div>
          )}
          {semanticLayoutError && (
            <div style={{ color: v('--elucim-editor-warning'), fontSize: 10, lineHeight: 1.35 }}>
              Semantic layout unavailable: {semanticLayoutError}
            </div>
          )}
        </div>
      )}

      {v2Document && nudgeCandidates.length > 0 && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Polish suggestions
          </div>
          {nudgeCandidates.map(nudge => (
            <div key={nudge.id} style={{ display: 'grid', gap: 4, padding: 6, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ color: v('--elucim-editor-fg') }}>{nudge.title}</strong>
                <span style={{ color: nudge.confidence === 'safe' ? v('--elucim-editor-success') : v('--elucim-editor-warning') }}>
                  {nudge.category ? `${nudge.category} / ` : ''}{nudge.confidence}
                </span>
              </div>
              <div style={{ color: v('--elucim-editor-text-secondary'), lineHeight: 1.35 }}>{nudge.description}</div>
              <ul style={{ margin: 0, paddingLeft: 16, color: v('--elucim-editor-text-muted'), fontSize: 10, lineHeight: 1.35 }}>
                {nudge.commands.map((command, index) => <li key={index}>{summarizeNudgeCommand(command)}</li>)}
              </ul>
              {(nudgePreviews.get(nudge.id)?.length ?? 0) > 0 && (
                <div style={{ borderTop: `1px solid ${v('--elucim-editor-border-subtle')}`, paddingTop: 4 }}>
                  <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, fontWeight: 700, marginBottom: 2 }}>
                    Previewed changes
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, color: v('--elucim-editor-text-secondary'), fontSize: 10, lineHeight: 1.35 }}>
                    {nudgePreviews.get(nudge.id)?.map((summary, index) => <li key={index}>{summary}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  aria-label={`Apply nudge ${nudge.title}`}
                  onClick={() => applyEditorNudge(nudge.id)}
                  style={{ flex: 1, border: `1px solid ${nudge.confidence === 'safe' ? v('--elucim-editor-success') : v('--elucim-editor-warning')}`, borderRadius: 4, padding: '4px 6px', background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', textAlign: 'left' }}
                >
                  Apply {nudge.confidence === 'safe' ? 'safe nudge' : 'review nudge'}
                </button>
                <button
                  type="button"
                  aria-label={`Dismiss nudge ${nudge.title}`}
                  onClick={() => dismissEditorNudge(nudge.id)}
                  style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: '4px 6px', background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {v2Document && selectedV2Element && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Selected intent
          </div>
          <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{selectedId}</div>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Role
            <input
              aria-label="Selected role"
              value={selectedV2Element.intent?.role ?? ''}
              onChange={event => updateSelectedIntent({ role: event.target.value })}
              placeholder="title, hero, stage-1, cta"
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Importance
            <select
              aria-label="Selected importance"
              value={selectedV2Element.intent?.importance ?? 'supporting'}
              onChange={event => updateSelectedIntent({ importance: event.target.value as NonNullable<typeof selectedV2Element.intent>['importance'] })}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            >
              <option value="primary">primary</option>
              <option value="secondary">secondary</option>
              <option value="supporting">supporting</option>
              <option value="decorative">decorative</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: v('--elucim-editor-text-secondary') }}>
            <input
                aria-label="Selected generated"
              type="checkbox"
              checked={selectedV2Element.intent?.generated ?? false}
              onChange={event => updateSelectedIntent({ generated: event.target.checked })}
            />
            Generated by agent
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Description
            <textarea
              aria-label="Selected description"
              value={selectedV2Element.intent?.description ?? ''}
              onChange={event => updateSelectedIntent({ description: event.target.value })}
              rows={2}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4, resize: 'vertical' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Hints
            <textarea
              aria-label="Selected hints"
              value={(selectedV2Element.intent?.hints ?? []).join('\n')}
              onChange={event => updateSelectedIntent({ hints: event.target.value.split('\n').map(hint => hint.trim()).filter(Boolean) })}
              placeholder="One hint per line"
              rows={3}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4, resize: 'vertical' }}
            />
          </label>
        </div>
      )}

      {v2Compatibility && v2Compatibility.warnings.length > 0 && (
        <div role="status" style={{ padding: 8, border: `1px solid ${v('--elucim-editor-warning')}`, borderRadius: 6, background: `color-mix(in srgb, ${v('--elucim-editor-warning')} 10%, transparent)`, color: v('--elucim-editor-warning'), lineHeight: 1.4 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Document compatibility warnings</div>
          {v2Compatibility.warnings.map(warning => <div key={warning}>{warning}</div>)}
        </div>
      )}

      <div style={{ color: v('--elucim-editor-text-muted'), lineHeight: 1.45 }}>
        Selected element: {selectedLabel ?? 'none'}. Use timeline-backed nudges or the State Machine workspace for motion.
      </div>
    </div>
  );
}

function summarizeNudgeCommand(command: ReturnType<typeof suggestDocumentNudges>[number]['commands'][number]): string {
  switch (command.op) {
    case 'updateMetadata':
      return `Update metadata: ${Object.keys(command.metadata ?? {}).join(', ')}`;
    case 'updateElement':
      return `Update ${command.id}: ${Object.keys(command.patch).join(', ')}`;
    case 'upsertTimeline':
      return `Upsert timeline "${command.timeline.id}" with ${command.timeline.tracks.length} track${command.timeline.tracks.length === 1 ? '' : 's'}`;
    case 'deleteTimeline':
      return `Delete timeline "${command.id}"`;
    case 'addElement':
      return `Add element "${command.element.id}"`;
    case 'deleteElement':
      return `Delete element "${command.id}"`;
    case 'moveElement':
      return `Move element "${command.id}"`;
    case 'reorderElement':
      return `Reorder element "${command.id}" to sibling index ${command.index}`;
    case 'reparentElement':
      return `Reparent element "${command.id}"`;
    case 'applyTimelineFrame':
      return `Preview timeline "${command.timelineId}" at frame ${command.frame}`;
  }
}

function PanelShell({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={{
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          height: 30,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
          color: v('--elucim-editor-text-secondary'),
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {title}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {children}
      </div>
    </section>
  );
}
