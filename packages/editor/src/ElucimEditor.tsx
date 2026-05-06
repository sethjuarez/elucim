import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ElucimDocument, ElucimV2Document, ElucimV2StateMachine, ElucimV2Timeline, ElucimV2Transition } from '@elucim/dsl';
import { applyNudge, getInitialStateSnapshot, migrateV1ToV2, migrateV2ToV1, suggestDocumentNudges, transitionStateMachine, validate, validateV2 } from '@elucim/dsl';
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

export interface ElucimEditorProps {
  /** Initial document to edit. Creates an empty scene if not provided. */
  initialDocument?: ElucimDocument | ElucimV2Document;
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
  /** Called whenever the document changes. Receives the updated document. */
  onDocumentChange?: (document: ElucimDocument) => void;
  /** Called with a v2-compatible document when the editor was initialized with v2 input. */
  onV2DocumentChange?: (document: ElucimV2Document, details: ElucimV2EditorChangeDetails) => void;
  /** Called when the v2 compatibility bridge has warnings host apps may want to display. */
  onV2CompatibilityWarnings?: (warnings: string[]) => void;
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

export interface ElucimV2EditorChangeDetails {
  changedFormat: boolean;
  warnings: string[];
}

/** Bridges internal editor state to external document change callbacks. */
function DocumentBridge({
  onChange,
  onV2Change,
  onV2Warnings,
  v2Document,
}: {
  onChange?: (doc: ElucimDocument) => void;
  onV2Change?: (doc: ElucimV2Document, details: ElucimV2EditorChangeDetails) => void;
  onV2Warnings?: (warnings: string[]) => void;
  v2Document?: ElucimV2Document;
}) {
  const doc = useEditorDocument();
  const cbRef = useRef(onChange);
  const v2CbRef = useRef(onV2Change);
  const previousDocRef = useRef(doc);
  const previousWarningsRef = useRef('');
  cbRef.current = onChange;
  v2CbRef.current = onV2Change;
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    const docChanged = previousDocRef.current !== doc;
    previousDocRef.current = doc;
    if (docChanged) cbRef.current?.(doc);
    if (v2Document) {
      const result = restoreV2FromEditorDoc(doc, v2Document);
      v2CbRef.current?.(result.document, {
        changedFormat: docChanged,
        warnings: result.warnings,
      });
      const warningKey = result.warnings.join('\n');
      if (warningKey !== previousWarningsRef.current) {
        previousWarningsRef.current = warningKey;
        onV2Warnings?.(result.warnings);
      }
    }
  }, [doc, onV2Warnings, v2Document]);

  return null;
}

function normalizeInitialDocument(document: ElucimDocument | ElucimV2Document | undefined): ElucimDocument | undefined {
  if (!document || document.version === '1.0') return document;
  const result = validate(document);
  if (!result.valid) {
    throw new Error(`Invalid v2 editor document: ${result.errors.map(error => `${error.path}: ${error.message}`).join('; ')}`);
  }
  return migrateV2ToV1(document);
}

/**
 * A visual editor for creating and editing Elucim animated scenes.
 * Persistent shell with hierarchy, stage, inspector, and timeline.
 */
export function ElucimEditor({ initialDocument, initialFrame, theme, editorTheme, className, style, onDocumentChange, onV2DocumentChange, onV2CompatibilityWarnings, onBrowseImage, imageResolver }: ElucimEditorProps) {
  const normalizedInitialDocument = useMemo(() => normalizeInitialDocument(initialDocument), [initialDocument]);
  const initialV2Document = initialDocument?.version === '2.0' ? initialDocument : undefined;
  const [v2Document, setV2Document] = useState<ElucimV2Document | undefined>(initialV2Document);
  useEffect(() => {
    setV2Document(initialV2Document);
  }, [initialV2Document]);
  // Resolve 'last' to the actual final frame number
  const resolvedFrame = initialFrame === 'last'
    ? Math.max(0, ((normalizedInitialDocument?.root as any)?.durationInFrames ?? 1) - 1)
    : initialFrame;

  let inner = (
    <EditorErrorBoundary>
      <EditorProvider initialDocument={normalizedInitialDocument} initialFrame={resolvedFrame}>
        <DocumentBridge onChange={onDocumentChange} onV2Change={onV2DocumentChange} onV2Warnings={onV2CompatibilityWarnings} v2Document={v2Document} />
        <ElucimEditorLayout theme={theme} editorTheme={editorTheme} className={className} style={style} v2Document={v2Document} onV2DocumentChange={setV2Document} />
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

function restoreV2FromEditorDoc(doc: ElucimDocument, sourceV2: ElucimV2Document): { document: ElucimV2Document; warnings: string[] } {
  const migrated = migrateV1ToV2(doc);
  const idMap = mapSourceIdsToMigratedIds(sourceV2, migrated);
  const reverseIdMap = new Map([...idMap.entries()].map(([sourceId, migratedId]) => [migratedId, sourceId]));
  for (const [id, element] of Object.entries(migrated.elements)) {
    const sourceElement = sourceV2.elements[reverseIdMap.get(id) ?? id];
    if (sourceElement) {
      migrated.elements[id] = {
        ...element,
        role: sourceElement.role ?? element.role,
        intent: sourceElement.intent ? { ...sourceElement.intent, ...element.intent } : element.intent,
      };
    }
  }
  const elementIds = new Set(Object.keys(migrated.elements));
  const warnings: string[] = [];
  for (const sourceId of Object.keys(sourceV2.elements)) {
    const mappedId = idMap.get(sourceId);
    if (!mappedId) {
      warnings.push(`Element "${sourceId}" is no longer present in editor output; related v2 references may be pruned.`);
    } else if (mappedId !== sourceId) {
      warnings.push(`Element "${sourceId}" was renamed to "${mappedId}"; v2 timeline references were updated.`);
    }
  }
  const timelines: Record<string, ElucimV2Timeline> = {};
  for (const [id, timeline] of Object.entries(sourceV2.timelines ?? {})) {
    const tracks = timeline.tracks
      .map(track => ({ ...track, target: idMap.get(track.target) ?? track.target }))
      .filter(track => elementIds.has(track.target));
    if (tracks.length < timeline.tracks.length) {
      warnings.push(`Timeline "${id}" has ${timeline.tracks.length - tracks.length} track(s) targeting missing elements and will be omitted from v2 output.`);
    }
    if (tracks.length > 0) timelines[id] = { ...timeline, tracks };
  }
  const timelineIds = new Set(Object.keys(timelines));
  const stateMachines: Record<string, ElucimV2StateMachine> = {};
  for (const [id, machine] of Object.entries(sourceV2.stateMachines ?? {})) {
    stateMachines[id] = {
      ...machine,
      states: Object.fromEntries(
        Object.entries(machine.states).map(([stateId, state]) => {
          const nextState = { ...state };
          if (nextState.timeline && !timelineIds.has(nextState.timeline)) {
            warnings.push(`State "${stateId}" in machine "${id}" references missing timeline "${nextState.timeline}" and will lose that timeline link.`);
            nextState.timeline = undefined;
          }
          if (nextState.on) {
            nextState.on = Object.fromEntries(
              Object.entries(nextState.on).map(([eventName, transition]) => [
                eventName,
                cleanTransitionTimelineReference(transition, timelineIds, warning => warnings.push(`Transition "${eventName}" in state "${stateId}" of machine "${id}" ${warning}`)),
              ]),
            );
          }
          if (nextState.onComplete) {
            nextState.onComplete = cleanTransitionTimelineReference(
              nextState.onComplete,
              timelineIds,
              warning => warnings.push(`onComplete transition in state "${stateId}" of machine "${id}" ${warning}`),
            );
          }
          return [stateId, nextState];
        }),
      ),
    };
  }
  const document = {
    ...migrated,
    metadata: { ...migrated.metadata, ...sourceV2.metadata },
    ...(Object.keys(timelines).length > 0 ? { timelines } : {}),
    ...(Object.keys(stateMachines).length > 0 ? { stateMachines } : {}),
  };
  const validation = validateV2(document);
  for (const error of validation.errors) {
    warnings.push(`V2 output ${error.severity}: ${error.path}: ${error.message}`);
  }
  return { document, warnings };
}

function cleanTransitionTimelineReference(
  transition: string | ElucimV2Transition,
  timelineIds: Set<string>,
  warn: (warning: string) => void,
): string | ElucimV2Transition {
  if (typeof transition === 'string' || !transition.timeline || timelineIds.has(transition.timeline)) {
    return transition;
  }
  warn(`references missing timeline "${transition.timeline}" and will lose that timeline link.`);
  const { timeline: _timeline, ...rest } = transition;
  return rest;
}

function mapSourceIdsToMigratedIds(sourceV2: ElucimV2Document, migrated: ElucimV2Document): Map<string, string> {
  const idMap = new Map<string, string>();
  const visit = (sourceIds: string[], migratedIds: string[]) => {
    const count = Math.min(sourceIds.length, migratedIds.length);
    for (let index = 0; index < count; index += 1) {
      const sourceId = sourceIds[index];
      const migratedId = migratedIds[index];
      const sourceElement = sourceV2.elements[sourceId];
      const migratedElement = migrated.elements[migratedId];
      if (!sourceElement || !migratedElement) continue;
      if (sourceId !== migratedId && sourceV2.elements[migratedId]) {
        continue;
      }
      idMap.set(sourceId, migratedId);
      visit(sourceElement.children ?? [], migratedElement.children ?? []);
    }
  };
  visit(sourceV2.scene.children, migrated.scene.children);
  for (const id of Object.keys(sourceV2.elements)) {
    if (!idMap.has(id) && migrated.elements[id]) idMap.set(id, id);
  }
  return idMap;
}

export interface ElucimEditorLayoutProps {
  theme?: ElucimTheme;
  editorTheme?: Record<string, string>;
  className?: string;
  style?: React.CSSProperties;
  v2Document?: ElucimV2Document;
  onV2DocumentChange?: (document: ElucimV2Document) => void;
}

type EditorWorkspace = 'design' | 'animate' | 'states' | 'polish';

const DEFAULT_LEFT_WIDTH = 252;
const DEFAULT_RIGHT_WIDTH = 286;
const DEFAULT_TIMELINE_HEIGHT = 220;
const MIN_SIDE_WIDTH = 180;
const MAX_SIDE_WIDTH = 560;
const MIN_TIMELINE_HEIGHT = 120;
const MAX_TIMELINE_HEIGHT = 480;

function clampPanelSize(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The internal layout component used by ElucimEditor.
 * Must be rendered inside an EditorProvider. Useful for consumers who need
 * custom composition (e.g. adding panels inside the editor context) while
 * keeping the standard editor shell, scrollbar styles, and theme injection.
 */
export function ElucimEditorLayout({ theme, editorTheme, className, style, v2Document, onV2DocumentChange }: ElucimEditorLayoutProps) {
  const { state } = useEditorState();
  const [workspace, setWorkspace] = useState<EditorWorkspace>('design');
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);
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
  const preferredLeftTab = workspace === 'states' || workspace === 'polish' ? 'states' : workspace === 'design' ? 'objects' : undefined;
  const selectWorkspace = (nextWorkspace: EditorWorkspace) => {
    setWorkspace(nextWorkspace);
    if (nextWorkspace === 'design') {
      setLeftVisible(true);
      setRightVisible(true);
      setTimelineVisible(false);
    } else if (nextWorkspace === 'animate') {
      setLeftVisible(true);
      setRightVisible(false);
      setTimelineVisible(true);
      setTimelineHeight(Math.max(timelineHeight, 280));
    } else if (nextWorkspace === 'states') {
      setLeftVisible(true);
      setRightVisible(false);
      setTimelineVisible(false);
      setLeftWidth(Math.max(leftWidth, 360));
    } else {
      setLeftVisible(true);
      setRightVisible(false);
      setTimelineVisible(false);
      setLeftWidth(Math.max(leftWidth, 360));
    }
  };
  const startSideResize = (side: 'left' | 'right') => (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = side === 'left' ? leftWidth : rightWidth;
    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = side === 'left' ? startWidth + delta : startWidth - delta;
      if (side === 'left') setLeftWidth(clampPanelSize(nextWidth, MIN_SIDE_WIDTH, MAX_SIDE_WIDTH));
      else setRightWidth(clampPanelSize(nextWidth, MIN_SIDE_WIDTH, MAX_SIDE_WIDTH));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  const startTimelineResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startHeight = timelineHeight;
    const onMove = (moveEvent: PointerEvent) => {
      setTimelineHeight(clampPanelSize(startHeight - (moveEvent.clientY - startY), MIN_TIMELINE_HEIGHT, MAX_TIMELINE_HEIGHT));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
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
            <WorkspaceTab label="States" selected={workspace === 'states'} onClick={() => selectWorkspace('states')} />
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
          flex: 1,
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
          {leftVisible && <LeftDock v2Document={v2Document} onV2DocumentChange={onV2DocumentChange} preferredTab={preferredLeftTab} />}
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
          <ElucimCanvas editorColorScheme={colorScheme} contentTheme={theme} />
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
              <Inspector />
            </PanelShell>
          )}
        </aside>
      </div>

      {timelineVisible && (
        <div
          style={{
            height: timelineHeight,
            flexShrink: 0,
            borderTop: `1px solid ${v('--elucim-editor-border')}`,
            background: v('--elucim-editor-surface'),
            position: 'relative',
          }}
        >
          <PanelResizeHandle side="top" label="Resize timeline" onPointerDown={startTimelineResize} />
          <Timeline
            style={{ height: '100%', borderTop: 'none' }}
            v2Timelines={v2Document?.timelines}
            onV2TimelinesChange={v2Document && onV2DocumentChange ? timelines => onV2DocumentChange({ ...v2Document, ...(timelines ? { timelines } : { timelines: undefined }) }) : undefined}
          />
        </div>
      )}
    </div>
  );
}

function WorkspaceTab({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-label={`${label} workspace`}
      aria-selected={selected}
      onClick={onClick}
      style={{
        height: 22,
        border: `1px solid ${selected ? v('--elucim-editor-accent') : v('--elucim-editor-border')}`,
        borderRadius: 999,
        background: selected ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 16%, transparent)` : 'transparent',
        color: selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: 700,
        padding: '0 9px',
      }}
    >
      {label}
    </button>
  );
}

function PanelToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        height: 22,
        border: `1px solid ${active ? v('--elucim-editor-border') : v('--elucim-editor-border-subtle')}`,
        borderRadius: 4,
        background: active ? 'transparent' : v('--elucim-editor-input-bg'),
        color: active ? v('--elucim-editor-text-secondary') : v('--elucim-editor-text-muted'),
        cursor: 'pointer',
        fontSize: 10,
        padding: '0 7px',
      }}
    >
      {active ? `Hide ${label}` : `Show ${label}`}
    </button>
  );
}

function PanelResizeHandle({
  side,
  label,
  onPointerDown,
}: {
  side: 'left' | 'right' | 'top';
  label: string;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const horizontal = side === 'top';
  return (
    <div
      role="separator"
      aria-label={label}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        ...(side === 'left' ? { left: -3, top: 0, bottom: 0, width: 6 } : {}),
        ...(side === 'right' ? { right: -3, top: 0, bottom: 0, width: 6 } : {}),
        ...(side === 'top' ? { left: 0, right: 0, top: -3, height: 6 } : {}),
        zIndex: 5,
        cursor: horizontal ? 'ns-resize' : 'ew-resize',
        background: 'transparent',
      }}
    />
  );
}

function CollapsedPanelRail({
  leftVisible,
  rightVisible,
  timelineVisible,
  onShowLeft,
  onShowRight,
  onShowTimeline,
}: {
  leftVisible: boolean;
  rightVisible: boolean;
  timelineVisible: boolean;
  onShowLeft: () => void;
  onShowRight: () => void;
  onShowTimeline: () => void;
}) {
  if (leftVisible && rightVisible && timelineVisible) return null;
  return (
    <div style={{ position: 'absolute', left: 10, top: 10, zIndex: 20, display: 'flex', gap: 6 }}>
      {!leftVisible && <RailButton label="Show left panel" onClick={onShowLeft} />}
      {!rightVisible && <RailButton label="Show inspector" onClick={onShowRight} />}
      {!timelineVisible && <RailButton label="Show timeline" onClick={onShowTimeline} />}
    </div>
  );
}

function RailButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${v('--elucim-editor-border')}`,
        borderRadius: 999,
        background: `color-mix(in srgb, ${v('--elucim-editor-surface')} 92%, transparent)`,
        color: v('--elucim-editor-fg'),
        cursor: 'pointer',
        fontSize: 10,
        padding: '4px 8px',
        boxShadow: v('--elucim-editor-shadow-dropdown'),
      }}
    >
      {label}
    </button>
  );
}

function LeftDock({ v2Document, onV2DocumentChange, preferredTab }: { v2Document?: ElucimV2Document; onV2DocumentChange?: (document: ElucimV2Document) => void; preferredTab?: 'objects' | 'create' | 'states' }) {
  const [tab, setTab] = useState<'objects' | 'create' | 'states'>('objects');
  useEffect(() => {
    if (preferredTab) setTab(preferredTab);
  }, [preferredTab]);
  return (
    <section style={{ minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        role="tablist"
        aria-label="Left editor panel"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 0,
          padding: '0 8px',
          borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
          flexShrink: 0,
          background: v('--elucim-editor-input-bg'),
        }}
      >
        <DockTab label="Hierarchy" selected={tab === 'objects'} onClick={() => setTab('objects')} />
        <DockTab label="Create" selected={tab === 'create'} onClick={() => setTab('create')} />
        <DockTab label="States" selected={tab === 'states'} onClick={() => setTab('states')} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'create' ? <Toolbar /> : tab === 'objects' ? <HierarchyPanel v2Document={v2Document} /> : <StateMachinePanel v2Document={v2Document} onV2DocumentChange={onV2DocumentChange} />}
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

function StateMachinePanel({ v2Document, onV2DocumentChange }: { v2Document?: ElucimV2Document; onV2DocumentChange?: (document: ElucimV2Document) => void }) {
  const { state, dispatch } = useEditorState();
  const selectedId = state.selectedIds.length === 1 && state.selectedIds[0] !== CANVAS_ID ? state.selectedIds[0] : null;
  const selected = selectedId ? findElementById(state.document.root, selectedId)?.element : null;
  const selectedLabel = selectedId && selected ? (('id' in selected && selected.id) ? selected.id : selectedId) : null;
  const v2Compatibility = useMemo(() => v2Document ? restoreV2FromEditorDoc(state.document, v2Document) : undefined, [state.document, v2Document]);
  const currentV2Document = v2Compatibility?.document ?? v2Document;
  const selectedV2Element = selectedId && currentV2Document ? currentV2Document.elements[selectedId] : undefined;
  const machineIds = Object.keys(currentV2Document?.stateMachines ?? {});
  const [activeMachineId, setActiveMachineId] = useState(machineIds[0] ?? '');
  const [activeStateId, setActiveStateId] = useState('');
  const [dismissedNudgeIds, setDismissedNudgeIds] = useState<Set<string>>(() => new Set());
  const [newStateId, setNewStateId] = useState('state');
  const [newTransitionEvent, setNewTransitionEvent] = useState('next');
  const activeMachine = activeMachineId ? currentV2Document?.stateMachines?.[activeMachineId] : undefined;
  const activeState = activeMachine && activeStateId ? activeMachine.states[activeStateId] : undefined;
  const nudgeCandidates = useMemo(() => currentV2Document
    ? suggestDocumentNudges(currentV2Document).filter(nudge => !dismissedNudgeIds.has(nudge.id))
    : [], [currentV2Document, dismissedNudgeIds]);
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
  const snapshot = currentV2Document && activeMachineId
    ? activeStateId
      ? { ...getInitialStateSnapshot(currentV2Document, activeMachineId), ...transitionStateMachine(currentV2Document, activeMachineId, activeStateId, '__noop__') }
      : getInitialStateSnapshot(currentV2Document, activeMachineId)
    : undefined;

  useEffect(() => {
    if (machineIds.length > 0 && (!activeMachineId || !machineIds.includes(activeMachineId))) setActiveMachineId(machineIds[0]);
  }, [activeMachineId, machineIds]);

  useEffect(() => {
    if (activeMachine && (!activeStateId || !activeMachine.states[activeStateId])) setActiveStateId(activeMachine.initial);
  }, [activeMachine, activeStateId]);

  const applyState = (changes: Record<string, unknown>) => {
    if (!selectedId) return;
    dispatch({ type: 'UPDATE_ELEMENT', id: selectedId, changes: changes as any });
  };

  const updateV2Document = (updater: (document: ElucimV2Document) => ElucimV2Document) => {
    const baseDocument = v2Compatibility?.document ?? v2Document;
    if (!baseDocument) return;
    onV2DocumentChange?.(updater(baseDocument));
  };

  const updateMetadata = (changes: NonNullable<ElucimV2Document['metadata']>) => {
    updateV2Document(document => ({
      ...document,
      metadata: { ...document.metadata, ...changes },
    }));
  };

  const updateSelectedIntent = (changes: NonNullable<NonNullable<ElucimV2Document['elements'][string]>['intent']>) => {
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

  const updateMachineState = (changes: Partial<NonNullable<typeof activeState>>) => {
    if (!activeMachineId || !activeStateId) return;
    updateV2Document(document => {
      const machine = document.stateMachines?.[activeMachineId];
      if (!machine) return document;
      return {
        ...document,
        stateMachines: {
          ...document.stateMachines,
          [activeMachineId]: {
            ...machine,
            states: {
              ...machine.states,
              [activeStateId]: { ...machine.states[activeStateId], ...changes },
            },
          },
        },
      };
    });
  };

  const updateTransition = (eventName: string, transition: ElucimV2Transition) => {
    if (!activeState) return;
    updateMachineState({ on: { ...activeState.on, [eventName]: transition } });
  };

  const createStateMachine = () => {
    updateV2Document(document => {
      const stateMachines = document.stateMachines ?? {};
      const preferred = 'deck';
      let id = preferred;
      let index = 2;
      while (stateMachines[id]) {
        id = `${preferred}-${index}`;
        index += 1;
      }
      setActiveMachineId(id);
      setActiveStateId('idle');
      return {
        ...document,
        stateMachines: {
          ...stateMachines,
          [id]: {
            id,
            initial: 'idle',
            states: { idle: {} },
          },
        },
      };
    });
  };

  const addState = () => {
    if (!activeMachine) return;
    const base = newStateId.trim() || 'state';
    let id = base;
    let index = 2;
    while (activeMachine.states[id]) {
      id = `${base}-${index}`;
      index += 1;
    }
    updateV2Document(document => {
      const machine = document.stateMachines?.[activeMachineId];
      if (!machine) return document;
      return {
        ...document,
        stateMachines: {
          ...document.stateMachines,
          [activeMachineId]: {
            ...machine,
            states: {
              ...machine.states,
              [id]: {},
            },
          },
        },
      };
    });
    setActiveStateId(id);
    setNewStateId('state');
  };

  const removeActiveState = () => {
    if (!activeMachine || !activeStateId || Object.keys(activeMachine.states).length <= 1) return;
    const remainingStateIds = Object.keys(activeMachine.states).filter(id => id !== activeStateId);
    const fallback = remainingStateIds[0] ?? activeMachine.initial;
    updateV2Document(document => {
      const machine = document.stateMachines?.[activeMachineId];
      if (!machine) return document;
      const states = Object.fromEntries(Object.entries(machine.states)
        .filter(([id]) => id !== activeStateId)
        .map(([id, state]) => {
          const on = state.on
            ? Object.fromEntries(Object.entries(state.on).filter(([, transition]) => {
                const normalized = typeof transition === 'string' ? { target: transition } : transition;
                return normalized.target !== activeStateId;
              }))
            : undefined;
          return [id, { ...state, ...(on && Object.keys(on).length > 0 ? { on } : { on: undefined }) }];
        }));
      return {
        ...document,
        stateMachines: {
          ...document.stateMachines,
          [activeMachineId]: {
            ...machine,
            initial: machine.initial === activeStateId ? fallback : machine.initial,
            states,
          },
        },
      };
    });
    setActiveStateId(fallback);
  };

  const addNamedTransition = () => {
    if (!activeMachine || !activeStateId) return;
    const eventName = newTransitionEvent.trim() || 'next';
    const target = Object.keys(activeMachine.states).find(id => id !== activeStateId) ?? activeStateId;
    updateTransition(eventName, { target });
    setNewTransitionEvent('next');
  };

  const deleteTransition = (eventName: string) => {
    if (!activeState?.on) return;
    const next = { ...activeState.on };
    delete next[eventName];
    updateMachineState({ on: next });
  };

  const applyEditorNudge = (nudgeId: string) => {
    const baseDocument = v2Compatibility?.document ?? v2Document;
    const nudge = nudgeCandidates.find(candidate => candidate.id === nudgeId);
    if (!baseDocument || !nudge) return;
    onV2DocumentChange?.(applyNudge(baseDocument, nudge).document);
    setDismissedNudgeIds(previous => new Set(previous).add(nudge.id));
  };

  const dismissEditorNudge = (nudgeId: string) => {
    setDismissedNudgeIds(previous => new Set(previous).add(nudgeId));
  };

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11 }}>
      <div style={{ color: v('--elucim-editor-text-secondary'), lineHeight: 1.45 }}>
        State presets are the quick v1 bridge. V2 documents can also preview native state machines here.
      </div>

      {v2Document && !activeMachine && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            State machine
          </div>
          <div style={{ color: v('--elucim-editor-text-secondary'), lineHeight: 1.4 }}>
            This v2 document has no state machine yet.
          </div>
          <button
            type="button"
            aria-label="Create v2 state machine"
            onClick={createStateMachine}
            style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: '4px 6px', background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', textAlign: 'left' }}
          >
            Create state machine
          </button>
        </div>
      )}

      {v2Document && activeMachine && snapshot && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            State machine
          </div>
          <select
            aria-label="State machine"
            value={activeMachineId}
            onChange={event => {
              setActiveMachineId(event.target.value);
              setActiveStateId(currentV2Document?.stateMachines?.[event.target.value]?.initial ?? '');
            }}
            style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
          >
            {machineIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{activeStateId || activeMachine.initial}</div>
            <div style={{ color: v('--elucim-editor-text-secondary') }}>
              Timeline: {snapshot.timelineId ?? 'none'}{snapshot.onComplete ? `, completes -> ${snapshot.onComplete}` : ''}
            </div>
          </div>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Editing state
            <select
              aria-label="V2 active state"
              value={activeStateId || activeMachine.initial}
              onChange={event => setActiveStateId(event.target.value)}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            >
              {Object.keys(activeMachine.states).map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 4, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
              New state
              <input
                aria-label="V2 new state id"
                value={newStateId}
                onChange={event => setNewStateId(event.target.value)}
                style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
              />
            </label>
            <button type="button" aria-label="Add v2 state" onClick={addState} style={{ height: 26, border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer' }}>Add</button>
            <button type="button" aria-label={`Remove v2 state ${activeStateId || activeMachine.initial}`} disabled={Object.keys(activeMachine.states).length <= 1} onClick={removeActiveState} style={{ height: 26, border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: Object.keys(activeMachine.states).length <= 1 ? v('--elucim-editor-text-disabled') : v('--elucim-editor-text-secondary'), cursor: Object.keys(activeMachine.states).length <= 1 ? 'default' : 'pointer' }}>Remove</button>
          </div>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Initial state
            <select
              aria-label="V2 initial state"
              value={activeMachine.initial}
              onChange={event => updateV2Document(document => {
                const machine = document.stateMachines?.[activeMachineId];
                if (!machine) return document;
                return { ...document, stateMachines: { ...document.stateMachines, [activeMachineId]: { ...machine, initial: event.target.value } } };
              })}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            >
              {Object.keys(activeMachine.states).map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Active state timeline
            <select
              aria-label="V2 active state timeline"
              value={activeState?.timeline ?? ''}
              onChange={event => updateMachineState({ timeline: event.target.value || undefined })}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            >
              <option value="">none</option>
              {Object.keys(currentV2Document?.timelines ?? {}).map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          {Object.entries(activeState?.on ?? {}).map(([eventName, transition]) => {
            const normalized = typeof transition === 'string' ? { target: transition } : transition;
            return (
              <div key={eventName} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 4, alignItems: 'end' }}>
                <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                  {eventName} target
                  <select
                    aria-label={`V2 transition ${eventName} target`}
                    value={normalized.target}
                    onChange={event => updateTransition(eventName, { ...normalized, target: event.target.value })}
                    style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
                  >
                    {Object.keys(activeMachine.states).map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                  Timeline
                  <select
                    aria-label={`V2 transition ${eventName} timeline`}
                    value={normalized.timeline ?? ''}
                    onChange={event => updateTransition(eventName, { ...normalized, timeline: event.target.value || undefined })}
                    style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
                  >
                    <option value="">none</option>
                    {Object.keys(currentV2Document?.timelines ?? {}).map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                </label>
                <button type="button" aria-label={`Remove v2 transition ${eventName}`} onClick={() => deleteTransition(eventName)} style={{ height: 26, border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer' }}>Remove</button>
              </div>
            );
          })}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
              New transition event
              <input
                aria-label="V2 new transition event"
                value={newTransitionEvent}
                onChange={event => setNewTransitionEvent(event.target.value)}
                style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
              />
            </label>
            <button
              type="button"
              aria-label="Add v2 transition"
              onClick={addNamedTransition}
              style={{ height: 26, border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: '4px 6px', background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', textAlign: 'left' }}
            >
              Add transition
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {snapshot.events.length === 0 ? (
              <span style={{ color: v('--elucim-editor-text-muted') }}>No outgoing events</span>
            ) : snapshot.events.map(event => (
              <button
                key={event}
                type="button"
                onClick={() => {
                  if (!currentV2Document) return;
                  const next = transitionStateMachine(currentV2Document, activeMachineId, activeStateId || activeMachine.initial, event);
                  setActiveStateId(next.stateId);
                  dispatch({ type: 'SET_FRAME', frame: 0 });
                }}
                style={{ border: `1px solid ${v('--elucim-editor-accent')}`, borderRadius: 999, padding: '3px 8px', background: 'transparent', color: v('--elucim-editor-accent'), cursor: 'pointer' }}
              >
                {event}
              </button>
            ))}
          </div>
        </div>
      )}

      {v2Document && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            V2 metadata
          </div>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Polish level
            <select
              aria-label="V2 polish level"
              value={v2Document.metadata?.polishLevel ?? 'draft'}
              onChange={event => updateMetadata({ polishLevel: event.target.value as NonNullable<ElucimV2Document['metadata']>['polishLevel'] })}
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
              aria-label="V2 document intent"
              value={v2Document.metadata?.intent ?? ''}
              onChange={event => updateMetadata({ intent: event.target.value })}
              placeholder="What this visual should communicate"
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Generated/source
            <input
              aria-label="V2 generated by"
              value={v2Document.metadata?.generatedBy ?? ''}
              onChange={event => updateMetadata({ generatedBy: event.target.value })}
              placeholder="Designer, user, agent name"
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Notes
            <textarea
              aria-label="V2 document notes"
              value={(v2Document.metadata?.notes ?? []).join('\n')}
              onChange={event => updateMetadata({ notes: event.target.value.split('\n').map(note => note.trim()).filter(Boolean) })}
              placeholder="One note per line"
              rows={3}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4, resize: 'vertical' }}
            />
          </label>
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
                <span style={{ color: nudge.confidence === 'safe' ? v('--elucim-editor-success') : v('--elucim-editor-warning') }}>{nudge.confidence}</span>
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
                  aria-label={`Apply v2 nudge ${nudge.title}`}
                  onClick={() => applyEditorNudge(nudge.id)}
                  style={{ flex: 1, border: `1px solid ${nudge.confidence === 'safe' ? v('--elucim-editor-success') : v('--elucim-editor-warning')}`, borderRadius: 4, padding: '4px 6px', background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', textAlign: 'left' }}
                >
                  Apply {nudge.confidence === 'safe' ? 'safe nudge' : 'review nudge'}
                </button>
                <button
                  type="button"
                  aria-label={`Dismiss v2 nudge ${nudge.title}`}
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
            Selected v2 intent
          </div>
          <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{selectedId}</div>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Role
            <input
              aria-label="V2 selected role"
              value={selectedV2Element.intent?.role ?? ''}
              onChange={event => updateSelectedIntent({ role: event.target.value })}
              placeholder="title, hero, stage-1, cta"
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Importance
            <select
              aria-label="V2 selected importance"
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
              aria-label="V2 selected generated"
              type="checkbox"
              checked={selectedV2Element.intent?.generated ?? false}
              onChange={event => updateSelectedIntent({ generated: event.target.checked })}
            />
            Generated by agent
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Description
            <textarea
              aria-label="V2 selected description"
              value={selectedV2Element.intent?.description ?? ''}
              onChange={event => updateSelectedIntent({ description: event.target.value })}
              rows={2}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4, resize: 'vertical' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Hints
            <textarea
              aria-label="V2 selected hints"
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
          <div style={{ fontWeight: 700, marginBottom: 4 }}>V2 compatibility warnings</div>
          {v2Compatibility.warnings.map(warning => <div key={warning}>{warning}</div>)}
        </div>
      )}

      <div
        style={{
          padding: 8,
          border: `1px solid ${v('--elucim-editor-border-subtle')}`,
          borderRadius: 6,
          background: v('--elucim-editor-input-bg'),
        }}
      >
        <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>
          Target
        </div>
        <div style={{ color: selectedLabel ? v('--elucim-editor-fg') : v('--elucim-editor-text-muted') }}>
          {selectedLabel ?? 'Select one element'}
        </div>
      </div>

      <StatePresetButton
        title="Intro"
        description="Fade this element in over the first 20 frames."
        disabled={!selectedId}
        onClick={() => applyState({ fadeIn: 20 })}
      />
      <StatePresetButton
        title="Reveal"
        description="Draw/reveal this element over 45 frames."
        disabled={!selectedId}
        onClick={() => applyState({ draw: 45 })}
      />
      <StatePresetButton
        title="Outro"
        description="Fade this element out over the final 20 frames."
        disabled={!selectedId}
        onClick={() => applyState({ fadeOut: 20 })}
      />

      <div style={{ color: v('--elucim-editor-text-muted'), lineHeight: 1.45 }}>
        Next, this can become a real state graph: states like Intro, Focus, and Outro connected by click, time, or data triggers.
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
    case 'reparentElement':
      return `Reparent element "${command.id}"`;
    case 'applyAnimationPreset':
      return `Apply ${command.preset} preset to ${command.ids.length} element${command.ids.length === 1 ? '' : 's'}`;
    case 'applyTimelineFrame':
      return `Preview timeline "${command.timelineId}" at frame ${command.frame}`;
  }
}

function StatePresetButton({
  title,
  description,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 9px',
        border: `1px solid ${v('--elucim-editor-border-subtle')}`,
        borderRadius: 6,
        background: disabled ? 'transparent' : `color-mix(in srgb, ${v('--elucim-editor-accent')} 8%, transparent)`,
        color: disabled ? v('--elucim-editor-text-disabled') : v('--elucim-editor-fg'),
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>
      <div style={{ color: disabled ? v('--elucim-editor-text-disabled') : v('--elucim-editor-text-secondary'), fontSize: 10, lineHeight: 1.35 }}>
        {description}
      </div>
    </button>
  );
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
