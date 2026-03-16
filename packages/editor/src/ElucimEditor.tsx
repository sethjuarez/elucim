import React from 'react';
import type { ElucimDocument } from '@elucim/dsl';
import { EditorProvider } from './state/EditorProvider';
import { ElucimCanvas } from './canvas/ElucimCanvas';

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
 *
 * Drop this component into any React app to get a canvas-based editor
 * that produces `ElucimDocument` JSON.
 *
 * ```tsx
 * import { ElucimEditor } from '@elucim/editor';
 *
 * function App() {
 *   return <ElucimEditor style={{ width: '100%', height: '100vh' }} />;
 * }
 * ```
 */
export function ElucimEditor({ initialDocument, className, style }: ElucimEditorProps) {
  return (
    <EditorProvider initialDocument={initialDocument}>
      <div
        className={`elucim-editor ${className ?? ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#1a1a2e',
          color: '#e0e0e0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          ...style,
        }}
      >
        {/* Canvas area */}
        <div
          className="elucim-editor-main"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            padding: 24,
          }}
        >
          <ElucimCanvas />
        </div>
      </div>
    </EditorProvider>
  );
}
