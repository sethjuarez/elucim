import React, { useMemo, useRef } from 'react';
import type { ElucimDocument } from '@elucim/editor-projection';
import { projectDocument, validate } from '@elucim/editor-projection';
import { EditorErrorBoundary } from '../panels/EditorErrorBoundary';
import { EditorProvider } from '../state/EditorProvider';
import {
  DocumentChangeEmitter,
  InitialDocumentModelSync,
  resolveInitialFrame,
} from './documentLifecycle';

export interface EditorDocumentRuntimeProps {
  initialDocument?: ElucimDocument;
  initialFrame?: number | 'last';
  onDocumentChange?: (document: ElucimDocument) => void;
  children: (onDocumentChange: (document: ElucimDocument) => void) => React.ReactNode;
}

export function EditorDocumentRuntime({
  initialDocument,
  initialFrame,
  onDocumentChange,
  children,
}: EditorDocumentRuntimeProps) {
  const initialCanonicalDocument = useMemo(() => {
    if (!initialDocument) return undefined;
    const result = validate(initialDocument);
    if (!result.valid) {
      throw new Error(`Invalid editor document: ${result.errors.map(error => `${error.path}: ${error.message}`).join('; ')}`);
    }
    return initialDocument;
  }, [initialDocument]);
  const initialProjection = useMemo(
    () => initialCanonicalDocument ? projectDocument(initialCanonicalDocument) : undefined,
    [initialCanonicalDocument],
  );
  const lastEmittedDocumentModel = useRef<ElucimDocument | undefined>(undefined);
  const handleDocumentChange = (document: ElucimDocument) => {
    lastEmittedDocumentModel.current = document;
    onDocumentChange?.(document);
  };
  const resolvedFrame = resolveInitialFrame(initialFrame, initialProjection);

  return (
    <EditorErrorBoundary>
      <EditorProvider initialDocument={initialProjection} initialCanonicalDocument={initialCanonicalDocument} initialFrame={resolvedFrame}>
        <InitialDocumentModelSync document={initialCanonicalDocument} lastEmittedDocumentRef={lastEmittedDocumentModel} />
        <DocumentChangeEmitter onChange={handleDocumentChange} />
        {children(handleDocumentChange)}
      </EditorProvider>
    </EditorErrorBoundary>
  );
}
