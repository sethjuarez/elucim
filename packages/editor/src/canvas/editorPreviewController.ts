import { useCallback, useMemo, useState } from 'react';
import type { CameraNode, ElucimDocument, ElucimTimelineFrameSelection, EditorProjection } from '@elucim/editor-projection';
import { resolvePreviewCamera, resolvePreviewDocument } from '../document/documentLifecycle';

export interface EditorStateMachinePreviewMode {
  active: boolean;
  label: string;
  exitLabel: string;
  onClick?: () => boolean;
  onKeyDown?: (key: string) => boolean;
  onExit?: () => void;
}

export interface EditorTimelinePreviewCallbacks {
  onPreviewTimelineFramesChange: (frames: ElucimTimelineFrameSelection[] | undefined) => void;
  onStateMachinePreviewActiveChange: (active: boolean) => void;
  onStateMachinePreviewClickChange: (handler: (() => boolean) | undefined) => void;
  onStateMachinePreviewKeyDownChange: (handler: ((key: string) => boolean) | undefined) => void;
  onStateMachinePreviewExitChange: (handler: (() => void) | undefined) => void;
}

export interface EditorPreviewController {
  previewDocument: EditorProjection | undefined;
  previewCamera: CameraNode | undefined;
  stateMachinePreviewMode: EditorStateMachinePreviewMode;
  timelinePreviewCallbacks: EditorTimelinePreviewCallbacks;
}

export function useEditorPreviewController(liveDocument: ElucimDocument | undefined): EditorPreviewController {
  const [previewTimelineFrames, setPreviewTimelineFrames] = useState<ElucimTimelineFrameSelection[] | undefined>(undefined);
  const [stateMachinePreviewActive, setStateMachinePreviewActive] = useState(false);
  const [stateMachinePreviewClickHandler, setStateMachinePreviewClickHandler] = useState<(() => boolean) | undefined>(undefined);
  const [stateMachinePreviewKeyDownHandler, setStateMachinePreviewKeyDownHandler] = useState<((key: string) => boolean) | undefined>(undefined);
  const [stateMachinePreviewExitHandler, setStateMachinePreviewExitHandler] = useState<(() => void) | undefined>(undefined);

  const setPreviewClickHandler = useCallback((handler: (() => boolean) | undefined) => {
    setStateMachinePreviewClickHandler(() => handler);
  }, []);

  const setPreviewKeyDownHandler = useCallback((handler: ((key: string) => boolean) | undefined) => {
    setStateMachinePreviewKeyDownHandler(() => handler);
  }, []);

  const setPreviewExitHandler = useCallback((handler: (() => void) | undefined) => {
    setStateMachinePreviewExitHandler(() => handler);
  }, []);

  const previewDocument = useMemo(
    () => resolvePreviewDocument(liveDocument, previewTimelineFrames),
    [liveDocument, previewTimelineFrames],
  );
  const previewCamera = useMemo(
    () => resolvePreviewCamera(liveDocument, previewTimelineFrames),
    [liveDocument, previewTimelineFrames],
  );

  const stateMachinePreviewMode = useMemo(() => ({
    active: stateMachinePreviewActive,
    label: 'Preview mode',
    exitLabel: 'Exit state machine preview mode',
    onClick: stateMachinePreviewClickHandler,
    onKeyDown: stateMachinePreviewKeyDownHandler,
    onExit: stateMachinePreviewExitHandler,
  }), [
    stateMachinePreviewActive,
    stateMachinePreviewClickHandler,
    stateMachinePreviewKeyDownHandler,
    stateMachinePreviewExitHandler,
  ]);

  const timelinePreviewCallbacks = useMemo(() => ({
    // Frame selections are values, not callable handlers, so the React setter is safe to expose here.
    onPreviewTimelineFramesChange: setPreviewTimelineFrames,
    onStateMachinePreviewActiveChange: setStateMachinePreviewActive,
    onStateMachinePreviewClickChange: setPreviewClickHandler,
    onStateMachinePreviewKeyDownChange: setPreviewKeyDownHandler,
    onStateMachinePreviewExitChange: setPreviewExitHandler,
  }), [
    setPreviewClickHandler,
    setPreviewKeyDownHandler,
    setPreviewExitHandler,
  ]);

  return { previewDocument, previewCamera, stateMachinePreviewMode, timelinePreviewCallbacks };
}
