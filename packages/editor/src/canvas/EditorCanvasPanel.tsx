import type { ElucimTheme } from '@elucim/core';
import type { CameraNode, EditorProjection } from '@elucim/editor-projection';
import { ElucimCanvas } from './ElucimCanvas';
import type { EditorStateMachinePreviewMode } from './editorPreviewController';

export interface EditorCanvasPanelProps {
  previewDocument?: EditorProjection;
  previewCamera?: CameraNode;
  previewMode: EditorStateMachinePreviewMode;
  editorColorScheme?: string;
  contentTheme?: ElucimTheme;
}

export function EditorCanvasPanel({ previewDocument, previewCamera, previewMode, editorColorScheme, contentTheme }: EditorCanvasPanelProps) {
  return (
    <ElucimCanvas
      previewDocument={previewDocument}
      previewCamera={previewCamera}
      previewMode={previewMode}
      editorColorScheme={editorColorScheme}
      contentTheme={contentTheme}
    />
  );
}
