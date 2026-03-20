import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ElucimDocument } from '@elucim/dsl';
import type { ElementNode } from '@elucim/dsl';
import type { ElucimTheme } from '@elucim/core';
import { ImageResolverProvider, type ImageResolverFn } from '@elucim/core';
import { EditorProvider } from './state/EditorProvider';
import { ImagePickerProvider, type BrowseImageFn } from './image/ImagePickerProvider';
import { useEditorDocument } from './state/EditorProvider';
import { ElucimCanvas } from './canvas/ElucimCanvas';
import { Toolbar } from './toolbar/Toolbar';
import { Inspector } from './inspector/Inspector';
import { Timeline } from './timeline/Timeline';
import { FloatingPanel } from './panels/FloatingPanel';
import { EditorErrorBoundary } from './panels/EditorErrorBoundary';
import { useEditorState } from './state/EditorProvider';
import { getElementBounds } from './utils/bounds';
import { useEditorIcons } from './theme/icons';
import { buildThemeVars, deriveEditorTheme, v } from './theme/tokens';
import { CANVAS_ID } from './state/types';

export interface ElucimEditorProps {
  /** Initial document to edit. Creates an empty scene if not provided. */
  initialDocument?: ElucimDocument;
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

/** Bridges internal editor state to the external onDocumentChange callback. */
function DocumentBridge({ onChange }: { onChange?: (doc: ElucimDocument) => void }) {
  const doc = useEditorDocument();
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    cbRef.current?.(doc);
  }, [doc]);

  return null;
}

/**
 * A visual editor for creating and editing Elucim animated scenes.
 * Full-bleed canvas with floating toolbar, contextual inspector, and Premiere-style timeline.
 */
export function ElucimEditor({ initialDocument, initialFrame, theme, editorTheme, className, style, onDocumentChange, onBrowseImage, imageResolver }: ElucimEditorProps) {
  // Resolve 'last' to the actual final frame number
  const resolvedFrame = initialFrame === 'last'
    ? Math.max(0, ((initialDocument?.root as any)?.durationInFrames ?? 1) - 1)
    : initialFrame;

  let inner = (
    <EditorErrorBoundary>
      <EditorProvider initialDocument={initialDocument} initialFrame={resolvedFrame}>
        <DocumentBridge onChange={onDocumentChange} />
        <ElucimEditorLayout theme={theme} editorTheme={editorTheme} className={className} style={style} />
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
}

/**
 * The internal layout component used by ElucimEditor.
 * Must be rendered inside an EditorProvider. Useful for consumers who need
 * custom composition (e.g. adding panels inside the editor context) while
 * keeping the standard floating-panel layout, scrollbar styles, and theme injection.
 */
export function ElucimEditorLayout({ theme, editorTheme, className, style }: ElucimEditorLayoutProps) {
  const { state, dispatch } = useEditorState();
  const icons = useEditorIcons();
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleToolbarPosition = useCallback((pos: { x: number; y: number }) => {
    dispatch({ type: 'SET_TOOLBAR_POSITION', position: pos });
  }, [dispatch]);

  const handleToolbarCollapsed = useCallback((collapsed: boolean) => {
    dispatch({ type: 'SET_TOOLBAR_COLLAPSED', collapsed });
  }, [dispatch]);

  const handleInspectorPosition = useCallback((pos: { x: number; y: number }) => {
    dispatch({ type: 'SET_INSPECTOR_POSITION', position: pos });
  }, [dispatch]);

  const handlePinInspector = useCallback(() => {
    dispatch({ type: 'SET_INSPECTOR_PINNED', pinned: !state.inspectorPinned });
  }, [dispatch, state.inspectorPinned]);

  // Compute inspector position near the selected element when unpinned
  const inspectorPos = React.useMemo(() => {
    // When pinned, use stored position — or default to right of canvas
    if (state.inspectorPinned) {
      if (state.inspectorPosition) return state.inspectorPosition;
      const container = containerRef.current;
      const maxX = (container?.clientWidth ?? 900) - 250;
      return { x: Math.max(8, maxX), y: 60 };
    }

    // Canvas selection — position at top-right area
    if (state.selectedIds.length === 1 && state.selectedIds[0] === CANVAS_ID) {
      const container = containerRef.current;
      const maxX = (container?.clientWidth ?? 900) - 250;
      return { x: Math.max(8, maxX), y: 60 };
    }

    // Find first selected element's bounds and position inspector to its right
    if (state.selectedIds.length > 0) {
      const root = state.document.root;
      const children: ElementNode[] = ('children' in root && Array.isArray(root.children)) ? root.children : [];
      const selectedEl = children.find((el, i) => {
        const id = ('id' in el && el.id) ? el.id : `el-${i}`;
        return state.selectedIds.includes(id);
      });
      if (selectedEl) {
        const bounds = getElementBounds(selectedEl);
        if (bounds) {
          const vp = state.viewport;
          // Convert scene coords to screen coords
          const screenRight = vp.x + (bounds.x + bounds.width) * vp.zoom + 16;
          const screenTop = vp.y + bounds.y * vp.zoom;
          // Clamp to keep panel visible within canvas
          const container = containerRef.current;
          const maxX = (container?.clientWidth ?? 900) - 250;
          const maxY = (container?.clientHeight ?? 600) - 200;
          return {
            x: Math.min(screenRight, maxX),
            y: Math.max(8, Math.min(screenTop, maxY)),
          };
        }
      }
    }

    return state.inspectorPosition ?? { x: 600, y: 60 };
  }, [state.inspectorPinned, state.inspectorPosition, state.selectedIds, state.document, state.viewport]);

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
      {/* Main canvas area — full-bleed */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Canvas fills everything */}
        <ElucimCanvas editorColorScheme={colorScheme} contentTheme={theme} />

        {/* Floating Toolbar */}
        <FloatingPanel
          position={state.toolbarPosition}
          onPositionChange={handleToolbarPosition}
          title="Tools"
          collapsible
          collapsed={state.toolbarCollapsed}
          onCollapsedChange={handleToolbarCollapsed}
          maxWidth={180}
        >
          <Toolbar />
        </FloatingPanel>

        {/* Floating Inspector — only visible when something is selected */}
        {state.selectedIds.length > 0 && (
          <FloatingPanel
            position={inspectorPos}
            onPositionChange={handleInspectorPosition}
            title="Inspector"
            headerExtra={
              <button
                onClick={handlePinInspector}
                title={state.inspectorPinned ? 'Unpin inspector' : 'Pin inspector'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: state.inspectorPinned ? v('--elucim-editor-accent') : v('--elucim-editor-text-muted'),
                  cursor: 'pointer',
                  padding: '0 2px',
                  lineHeight: 0,
                }}
              >
                {icons.Pin({ pinned: state.inspectorPinned })}
              </button>
            }
            maxWidth={240}
          >
            <Inspector />
          </FloatingPanel>
        )}
      </div>

      {/* Timeline — stays at bottom */}
      <div style={{ padding: '0 15px 15px 15px', marginTop: -11 }}>
        <Timeline style={{ borderRadius: 6, border: `1px solid ${v('--elucim-editor-border')}`, boxSizing: 'border-box', overflow: 'hidden' }} />
      </div>
    </div>
  );
}
