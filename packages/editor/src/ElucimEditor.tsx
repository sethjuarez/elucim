import React from 'react';
import type { RenderableDocument, ElucimDocument } from '@elucim/dsl';
import type { ElucimTheme } from '@elucim/core';
import { ImageResolverProvider, type ImageResolverFn } from '@elucim/core';
import { ImagePickerProvider, type BrowseImageFn } from './image/ImagePickerProvider';
import { EditorDocumentRuntime } from './document/EditorDocumentRuntime';
import type { ElucimEditorChangeDetails } from './document/documentLifecycle';
import { ElucimEditorLayout } from './ElucimEditorLayout';

export type { ElucimEditorChangeDetails } from './document/documentLifecycle';
export { ElucimEditorLayout, type ElucimEditorLayoutProps } from './ElucimEditorLayout';

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
  /** Show standalone editor header/branding. Set false when embedding in host chrome. */
  showHeader?: boolean;
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

/**
 * A visual editor for creating and editing Elucim animated scenes.
 * Persistent shell with Objects, stage, inspector, and timeline.
 */
export function ElucimEditor({ initialDocument, initialFrame, theme, editorTheme, showHeader = true, className, style, onDocumentChange, onCompatibilityWarnings, onBrowseImage, imageResolver }: ElucimEditorProps) {
  let inner = (
    <EditorDocumentRuntime
      initialDocument={initialDocument}
      initialFrame={initialFrame}
      onDocumentChange={onDocumentChange}
      onCompatibilityWarnings={onCompatibilityWarnings}
    >
      {handleDocumentChange => (
        <ElucimEditorLayout
          theme={theme}
          editorTheme={editorTheme}
          showHeader={showHeader}
          className={className}
          style={style}
          onDocumentChange={handleDocumentChange}
        />
      )}
    </EditorDocumentRuntime>
  );

  if (imageResolver) {
    inner = <ImageResolverProvider resolver={imageResolver}>{inner}</ImageResolverProvider>;
  }
  if (onBrowseImage) {
    inner = <ImagePickerProvider onBrowse={onBrowseImage}>{inner}</ImagePickerProvider>;
  }

  return inner;
}

