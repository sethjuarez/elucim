import React, { useCallback, useRef, useState } from 'react';
import type { ElucimDocument } from '@elucim/dsl';
import type { ElementNode } from '@elucim/dsl';
import { EditorProvider } from './state/EditorProvider';
import { ElucimCanvas } from './canvas/ElucimCanvas';
import { Toolbar } from './toolbar/Toolbar';
import { Inspector } from './inspector/Inspector';
import { Timeline } from './timeline/Timeline';
import { FloatingPanel } from './panels/FloatingPanel';
import { EditorErrorBoundary } from './panels/EditorErrorBoundary';
import { useEditorState } from './state/EditorProvider';
import { getElementBounds } from './utils/bounds';
import { useEditorIcons } from './theme/icons';
import { buildThemeVars, v } from './theme/tokens';
import { CANVAS_ID } from './state/types';

export interface ElucimEditorProps {
  /** Initial document to edit. Creates an empty scene if not provided. */
  initialDocument?: ElucimDocument;
  /**
   * Theme overrides for editor chrome colors.
   * Keys can be bare names (e.g. `"accent"`) which map to `--elucim-editor-accent`,
   * or full CSS variable names (e.g. `"--elucim-editor-accent"`).
   */
  theme?: Record<string, string>;
  /** CSS class for the editor container */
  className?: string;
  /** Inline styles for the editor container */
  style?: React.CSSProperties;
}

/**
 * A visual editor for creating and editing Elucim animated scenes.
 * Full-bleed canvas with floating toolbar, contextual inspector, and Premiere-style timeline.
 */
export function ElucimEditor({ initialDocument, theme, className, style }: ElucimEditorProps) {
  return (
    <EditorErrorBoundary>
      <EditorProvider initialDocument={initialDocument}>
        <EditorLayout theme={theme} className={className} style={style} />
      </EditorProvider>
    </EditorErrorBoundary>
  );
}

function EditorLayout({ theme, className, style }: { theme?: Record<string, string>; className?: string; style?: React.CSSProperties }) {
  const { state, dispatch } = useEditorState();
  const icons = useEditorIcons();
  const containerRef = useRef<HTMLDivElement>(null);
  const themeVars = buildThemeVars(theme);

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
    if (state.inspectorPinned && state.inspectorPosition) {
      return state.inspectorPosition;
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
        colorScheme: 'dark',
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
        <ElucimCanvas />

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
      <Timeline />
    </div>
  );
}
