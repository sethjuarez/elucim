import React, { useMemo, useRef } from 'react';
import type { ElucimDocument, RenderableDocument } from '@elucim/dsl';
import { EditorErrorBoundary } from '../panels/EditorErrorBoundary';
import { EditorProvider } from '../state/EditorProvider';
import { normalizeInitialDocument, resolveInitialDocumentModel } from './documentCompatibility';
import {
  DocumentChangeEmitter,
  InitialDocumentModelSync,
  resolveInitialFrame,
  type ElucimEditorChangeDetails,
} from './documentLifecycle';

export interface EditorDocumentRuntimeProps {
  initialDocument?: RenderableDocument | ElucimDocument;
  initialFrame?: number | 'last';
  onDocumentChange?: (document: ElucimDocument, details: ElucimEditorChangeDetails) => void;
  onCompatibilityWarnings?: (warnings: string[]) => void;
  children: (onDocumentChange: (document: ElucimDocument) => void) => React.ReactNode;
}

export function EditorDocumentRuntime({
  initialDocument,
  initialFrame,
  onDocumentChange,
  onCompatibilityWarnings,
  children,
}: EditorDocumentRuntimeProps) {
  const normalizedInitialDocument = useMemo(() => normalizeInitialDocument(initialDocument), [initialDocument]);
  const initialDocumentModel = useMemo(() => resolveInitialDocumentModel(initialDocument), [initialDocument]);
  const lastEmittedDocumentModel = useRef<ElucimDocument | undefined>(undefined);
  const handleDocumentChange = (document: ElucimDocument, details: ElucimEditorChangeDetails) => {
    lastEmittedDocumentModel.current = document;
    onDocumentChange?.(document, details);
  };
  const resolvedFrame = resolveInitialFrame(initialFrame, normalizedInitialDocument);

  return (
    <EditorErrorBoundary>
      <EditorProvider initialDocument={normalizedInitialDocument} initialCanonicalDocument={initialDocumentModel} initialFrame={resolvedFrame}>
        <InitialDocumentModelSync document={initialDocumentModel} lastEmittedDocumentRef={lastEmittedDocumentModel} />
        <DocumentChangeEmitter onChange={handleDocumentChange} onWarnings={onCompatibilityWarnings} />
        {children(document => handleDocumentChange(document, { changedFormat: false, warnings: [] }))}
      </EditorProvider>
    </EditorErrorBoundary>
  );
}
