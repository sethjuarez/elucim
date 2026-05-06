import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ElucimDocument, ElucimV2Document, ElucimV2StateMachine, ElucimV2Timeline } from '@elucim/dsl';
import { getInitialStateSnapshot, migrateV1ToV2, migrateV2ToV1, transitionStateMachine, validate } from '@elucim/dsl';
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
  v2Document,
}: {
  onChange?: (doc: ElucimDocument) => void;
  onV2Change?: (doc: ElucimV2Document, details: ElucimV2EditorChangeDetails) => void;
  v2Document?: ElucimV2Document;
}) {
  const doc = useEditorDocument();
  const cbRef = useRef(onChange);
  const v2CbRef = useRef(onV2Change);
  const previousDocRef = useRef(doc);
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
    }
  }, [doc, v2Document]);

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
export function ElucimEditor({ initialDocument, initialFrame, theme, editorTheme, className, style, onDocumentChange, onV2DocumentChange, onBrowseImage, imageResolver }: ElucimEditorProps) {
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
        <DocumentBridge onChange={onDocumentChange} onV2Change={onV2DocumentChange} v2Document={v2Document} />
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
  for (const [id, element] of Object.entries(migrated.elements)) {
    const sourceElement = sourceV2.elements[id];
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
  const timelines: Record<string, ElucimV2Timeline> = {};
  for (const [id, timeline] of Object.entries(sourceV2.timelines ?? {})) {
    const tracks = timeline.tracks.filter(track => elementIds.has(track.target));
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
        Object.entries(machine.states).map(([stateId, state]) => [
          stateId,
          state.timeline && !timelineIds.has(state.timeline)
            ? (warnings.push(`State "${stateId}" in machine "${id}" references missing timeline "${state.timeline}" and will lose that timeline link.`), { ...state, timeline: undefined })
            : state,
        ]),
      ),
    };
  }
  return {
    document: {
    ...migrated,
    metadata: { ...migrated.metadata, ...sourceV2.metadata },
    ...(Object.keys(timelines).length > 0 ? { timelines } : {}),
    ...(Object.keys(stateMachines).length > 0 ? { stateMachines } : {}),
    },
    warnings,
  };
}

export interface ElucimEditorLayoutProps {
  theme?: ElucimTheme;
  editorTheme?: Record<string, string>;
  className?: string;
  style?: React.CSSProperties;
  v2Document?: ElucimV2Document;
  onV2DocumentChange?: (document: ElucimV2Document) => void;
}

/**
 * The internal layout component used by ElucimEditor.
 * Must be rendered inside an EditorProvider. Useful for consumers who need
 * custom composition (e.g. adding panels inside the editor context) while
 * keeping the standard editor shell, scrollbar styles, and theme injection.
 */
export function ElucimEditorLayout({ theme, editorTheme, className, style, v2Document, onV2DocumentChange }: ElucimEditorLayoutProps) {
  const { state } = useEditorState();

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
        </div>
        <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
          {state.selectedIds.length === 0 ? 'No selection' : `${state.selectedIds.length} selected`}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '252px minmax(420px, 1fr) 286px',
          background: v('--elucim-editor-bg'),
        }}
      >
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            borderRight: `1px solid ${v('--elucim-editor-border')}`,
            background: v('--elucim-editor-surface'),
          }}
        >
          <LeftDock v2Document={v2Document} onV2DocumentChange={onV2DocumentChange} />
        </aside>

        <main style={{ position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          <ElucimCanvas editorColorScheme={colorScheme} contentTheme={theme} />
        </main>

        <aside
          style={{
            minWidth: 0,
            minHeight: 0,
            borderLeft: `1px solid ${v('--elucim-editor-border')}`,
            background: v('--elucim-editor-surface'),
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <PanelShell title="Inspector">
            <Inspector />
          </PanelShell>
        </aside>
      </div>

      <div
        style={{
          height: 220,
          flexShrink: 0,
          borderTop: `1px solid ${v('--elucim-editor-border')}`,
          background: v('--elucim-editor-surface'),
        }}
      >
        <Timeline style={{ height: '100%', borderTop: 'none' }} v2Timelines={v2Document?.timelines} />
      </div>
    </div>
  );
}

function LeftDock({ v2Document, onV2DocumentChange }: { v2Document?: ElucimV2Document; onV2DocumentChange?: (document: ElucimV2Document) => void }) {
  const [tab, setTab] = useState<'objects' | 'create' | 'states'>('objects');
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
  const selectedV2Element = selectedId && v2Document ? v2Document.elements[selectedId] : undefined;
  const v2Compatibility = useMemo(() => v2Document ? restoreV2FromEditorDoc(state.document, v2Document) : undefined, [state.document, v2Document]);
  const machineIds = Object.keys(v2Document?.stateMachines ?? {});
  const [activeMachineId, setActiveMachineId] = useState(machineIds[0] ?? '');
  const [activeStateId, setActiveStateId] = useState('');
  const activeMachine = activeMachineId ? v2Document?.stateMachines?.[activeMachineId] : undefined;
  const snapshot = v2Document && activeMachineId
    ? activeStateId
      ? { ...getInitialStateSnapshot(v2Document, activeMachineId), ...transitionStateMachine(v2Document, activeMachineId, activeStateId, '__noop__') }
      : getInitialStateSnapshot(v2Document, activeMachineId)
    : undefined;

  useEffect(() => {
    if (machineIds.length > 0 && !activeMachineId) setActiveMachineId(machineIds[0]);
  }, [activeMachineId, machineIds]);

  useEffect(() => {
    if (activeMachine && !activeStateId) setActiveStateId(activeMachine.initial);
  }, [activeMachine, activeStateId]);

  const applyState = (changes: Record<string, unknown>) => {
    if (!selectedId) return;
    dispatch({ type: 'UPDATE_ELEMENT', id: selectedId, changes: changes as any });
  };

  const updateV2Document = (updater: (document: ElucimV2Document) => ElucimV2Document) => {
    if (!v2Document) return;
    onV2DocumentChange?.(updater(v2Document));
  };

  const updateMetadata = (changes: NonNullable<ElucimV2Document['metadata']>) => {
    updateV2Document(document => ({
      ...document,
      metadata: { ...document.metadata, ...changes },
    }));
  };

  const updateSelectedIntent = (changes: NonNullable<NonNullable<ElucimV2Document['elements'][string]>['intent']>) => {
    if (!selectedId || !selectedV2Element) return;
    updateV2Document(document => ({
      ...document,
      elements: {
        ...document.elements,
        [selectedId]: {
          ...selectedV2Element,
          intent: { ...selectedV2Element.intent, ...changes },
        },
      },
    }));
  };

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11 }}>
      <div style={{ color: v('--elucim-editor-text-secondary'), lineHeight: 1.45 }}>
        State presets are the quick v1 bridge. V2 documents can also preview native state machines here.
      </div>

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
              setActiveStateId(v2Document.stateMachines?.[event.target.value]?.initial ?? '');
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {snapshot.events.length === 0 ? (
              <span style={{ color: v('--elucim-editor-text-muted') }}>No outgoing events</span>
            ) : snapshot.events.map(event => (
              <button
                key={event}
                type="button"
                onClick={() => {
                  const next = transitionStateMachine(v2Document, activeMachineId, activeStateId || activeMachine.initial, event);
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
