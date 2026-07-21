import React, { useEffect, useRef } from 'react';
import type { CameraNode, ElucimDocument, ElucimTimelineFrameSelection, EditorProjection } from '@elucim/editor-projection';
import { applyTimelineFrames, documentFromProjection, projectDocument, evaluateTimelineCameraFrames } from '@elucim/editor-projection';
import { useEditorState } from '../state/EditorProvider';

export function resolveInitialFrame(
  initialFrame: number | 'last' | undefined,
  document?: EditorProjection,
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
): EditorProjection | undefined {
  if (!document || !previewTimelineFrames?.length) return undefined;
  const renderableFrames = previewTimelineFrames.filter(frame => document.timelines?.[frame.timelineId]);
  if (renderableFrames.length === 0) return undefined;
  return projectDocument(applyTimelineFrames(document, renderableFrames));
}

export function resolvePreviewCamera(
  document: ElucimDocument | undefined,
  previewTimelineFrames: ElucimTimelineFrameSelection[] | undefined,
): CameraNode | undefined {
  if (!document || !previewTimelineFrames?.length) return undefined;
  const renderableFrames = previewTimelineFrames.filter(frame => document.timelines?.[frame.timelineId]);
  return renderableFrames.length > 0 ? evaluateTimelineCameraFrames(document, renderableFrames) : undefined;
}

/** Emits canonical document changes from internal editor state. */
export function DocumentChangeEmitter({
  onChange,
}: {
  onChange?: (doc: ElucimDocument) => void;
}) {
  const { state, dispatch } = useEditorState();
  const doc = state.document;
  const sourceDocument = state.canonicalDocument;
  const cbRef = useRef(onChange);
  const previousDocRef = useRef(doc);
  cbRef.current = onChange;
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    const docChanged = previousDocRef.current !== doc;
    previousDocRef.current = doc;
    if (docChanged) {
      const nextDocument = sourceDocument ?? documentFromProjection(doc);
      dispatch({ type: 'SET_CANONICAL_DOCUMENT', document: nextDocument });
      cbRef.current?.(nextDocument);
    }
  }, [dispatch, doc, sourceDocument]);

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
    dispatch({ type: 'SET_CANONICAL_DOCUMENT', document, syncProjection: true });
  }, [dispatch, document, lastEmittedDocumentRef]);
  return null;
}
