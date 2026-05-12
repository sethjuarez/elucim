import type { ElucimTheme } from '@elucim/core';
import type { RenderableDocument } from '@elucim/dsl';
import { ElucimCanvas } from './ElucimCanvas';
import type { EditorStateMachinePreviewMode } from './editorPreviewController';

export interface EditorCanvasPanelProps {
  previewDocument?: RenderableDocument;
  previewMode: EditorStateMachinePreviewMode;
  editorColorScheme?: string;
  contentTheme?: ElucimTheme;
}

export function EditorCanvasPanel({ previewDocument, previewMode, editorColorScheme, contentTheme }: EditorCanvasPanelProps) {
  return (
    <ElucimCanvas
      previewDocument={previewDocument}
      previewMode={previewMode}
      editorColorScheme={editorColorScheme}
      contentTheme={contentTheme}
    />
  );
}
