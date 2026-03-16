import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { ElucimDocument } from '@elucim/dsl';
import { EditorProvider } from './state/EditorProvider';
import { ElucimCanvas } from './canvas/ElucimCanvas';
import { Toolbar } from './toolbar/Toolbar';
import { Inspector } from './inspector/Inspector';
import { Timeline } from './timeline/Timeline';
import { FloatingPanel } from './panels/FloatingPanel';
import { useEditorState } from './state/EditorProvider';

export interface ElucimEditorProps {
  /** Initial document to edit. Creates an empty scene if not provided. */
  initialDocument?: ElucimDocument;
  /** CSS class for the editor container */
  className?: string;
  /** Inline styles for the editor container */
  style?: React.CSSProperties;
}

/**
 * A visual editor for creating and editing Elucim animated scenes.
 * Full-bleed canvas with floating toolbar, contextual inspector, and Premiere-style timeline.
 */
export function ElucimEditor({ initialDocument, className, style }: ElucimEditorProps) {
  return (
    <EditorProvider initialDocument={initialDocument}>
      <EditorLayout className={className} style={style} />
    </EditorProvider>
  );
}

function EditorLayout({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { state, dispatch } = useEditorState();

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

  // Compute inspector position near selection if not pinned
  const inspectorPos = state.inspectorPosition ?? { x: 600, y: 60 };

  return (
    <div
      className={`elucim-editor ${className ?? ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a2e',
        color: '#e0e0e0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        height: '100%',
        ...style,
      }}
    >
      {/* Main canvas area — full-bleed */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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
                  color: state.inspectorPinned ? '#4a9eff' : '#64748b',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '0 2px',
                }}
              >
                📌
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
