import React, { useEffect, useRef } from 'react';
import type { ElucimDocument, ElucimTimelineFrameSelection, RenderableDocument } from '@elucim/dsl';
import { applyTimelineFrames, createRenderableDocument } from '@elucim/dsl';
import { useEditorState } from '../state/EditorProvider';
import { createDocumentFromEditorState } from './documentCompatibility';

export interface ElucimEditorChangeDetails {
  changedFormat: boolean;
  warnings: string[];
}

export function resolveInitialFrame(
  initialFrame: number | 'last' | undefined,
  document?: RenderableDocument,
): number | undefined {
  if (initialFrame !== 'last') return initialFrame;
  const durationInFrames = document?.root && 'durationInFrames' in document.root
    ? document.root.durationInFrames
    : 1;
  return Math.max(0, durationInFrames - 1);
}

export function resolvePreviewDocument(
  document: ElucimDocument | undefined,
  previewTimelineFrames: ElucimTimelineFrameSelection[] | undefined,
): RenderableDocument | undefined {
  if (!document || !previewTimelineFrames?.length) return undefined;
  const renderableFrames = previewTimelineFrames.filter(frame => document.timelines?.[frame.timelineId]);
  if (renderableFrames.length === 0) return undefined;
  return createRenderableDocument(applyTimelineFrames(document, renderableFrames));
}

/** Emits canonical document changes from internal editor state. */
export function DocumentChangeEmitter({
  onChange,
  onWarnings,
}: {
  onChange?: (doc: ElucimDocument, details: ElucimEditorChangeDetails) => void;
  onWarnings?: (warnings: string[]) => void;
}) {
  const { state, dispatch } = useEditorState();
  const doc = state.document;
  const sourceDocument = state.canonicalDocument;
  const cbRef = useRef(onChange);
  const previousDocRef = useRef(doc);
  const previousWarningsRef = useRef('');
  cbRef.current = onChange;
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    const docChanged = previousDocRef.current !== doc;
    previousDocRef.current = doc;
    const result = sourceDocument
      ? { document: sourceDocument, warnings: state.compatibilityWarnings }
      : { document: createDocumentFromEditorState(doc), warnings: [] };
    const details: ElucimEditorChangeDetails = {
      changedFormat: docChanged,
      warnings: result.warnings,
    };
    if (docChanged) {
      dispatch({ type: 'SET_CANONICAL_DOCUMENT', document: result.document, warnings: result.warnings });
      cbRef.current?.(result.document, details);
    }
    const warningKey = result.warnings.join('\n');
    if (warningKey !== previousWarningsRef.current) {
      previousWarningsRef.current = warningKey;
      onWarnings?.(result.warnings);
    }
  }, [dispatch, doc, onWarnings, sourceDocument, state.compatibilityWarnings]);

  return null;
}

export function InitialDocumentModelSync({
  document,
  lastEmittedDocumentRef,
}: {
  document?: ElucimDocument;
  lastEmittedDocumentRef: React.MutableRefObject<ElucimDocument | undefined>;
}) {
  const { dispatch } = useEditorState();
  useEffect(() => {
    if (document === lastEmittedDocumentRef.current) return;
    dispatch({ type: 'SET_CANONICAL_DOCUMENT', document, warnings: [], syncProjection: true });
  }, [dispatch, document, lastEmittedDocumentRef]);
  return null;
}
