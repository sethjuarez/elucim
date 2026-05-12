import type { ElucimDocument, ElucimStateMachine, ElucimTimeline, ElucimTimelineFrameSelection } from '@elucim/dsl';
import type { EditorWorkspace } from '../shell/editorShell';
import { Timeline } from './Timeline';

export interface EditorTimelinePanelProps {
  document?: ElucimDocument;
  workspace: EditorWorkspace;
  onDocumentChange: (document: ElucimDocument) => void;
  onPreviewTimelineFramesChange: (frames: ElucimTimelineFrameSelection[] | undefined) => void;
  onStateMachinePreviewActiveChange: (active: boolean) => void;
  onStateMachinePreviewClickChange: (handler: (() => boolean) | undefined) => void;
  onStateMachinePreviewKeyDownChange: (handler: ((key: string) => boolean) | undefined) => void;
  onStateMachinePreviewExitChange: (handler: (() => void) | undefined) => void;
}

export function applyTimelineDocumentChange(
  document: ElucimDocument,
  timelines: Record<string, ElucimTimeline> | undefined,
): ElucimDocument {
  return { ...document, ...(timelines ? { timelines } : { timelines: undefined }) };
}

export function applyStateMachineDocumentChange(
  document: ElucimDocument,
  stateMachines: Record<string, ElucimStateMachine> | undefined,
): ElucimDocument {
  return { ...document, ...(stateMachines ? { stateMachines } : { stateMachines: undefined }) };
}

export function applyMotionDocumentChange(
  document: ElucimDocument,
  timelines: Record<string, ElucimTimeline> | undefined,
  stateMachines: Record<string, ElucimStateMachine> | undefined,
): ElucimDocument {
  return {
    ...document,
    ...(timelines ? { timelines } : { timelines: undefined }),
    ...(stateMachines ? { stateMachines } : { stateMachines: undefined }),
  };
}

export function getPreferredMotionType(workspace: EditorWorkspace): 'animation' | 'stateMachine' {
  return workspace === 'states' ? 'stateMachine' : 'animation';
}

export function EditorTimelinePanel({
  document,
  workspace,
  onDocumentChange,
  onPreviewTimelineFramesChange,
  onStateMachinePreviewActiveChange,
  onStateMachinePreviewClickChange,
  onStateMachinePreviewKeyDownChange,
  onStateMachinePreviewExitChange,
}: EditorTimelinePanelProps) {
  return (
    <Timeline
      style={{ height: '100%', borderTop: 'none' }}
      document={document}
      timelines={document?.timelines}
      onTimelinesChange={document ? timelines => onDocumentChange(applyTimelineDocumentChange(document, timelines)) : undefined}
      stateMachines={document?.stateMachines}
      onStateMachinesChange={document ? stateMachines => onDocumentChange(applyStateMachineDocumentChange(document, stateMachines)) : undefined}
      onMotionChange={document ? (timelines, stateMachines) => onDocumentChange(applyMotionDocumentChange(document, timelines, stateMachines)) : undefined}
      preferredMotionType={getPreferredMotionType(workspace)}
      onPreviewTimelineFramesChange={onPreviewTimelineFramesChange}
      onStateMachinePreviewActiveChange={onStateMachinePreviewActiveChange}
      onStateMachinePreviewClickChange={onStateMachinePreviewClickChange}
      onStateMachinePreviewKeyDownChange={onStateMachinePreviewKeyDownChange}
      onStateMachinePreviewExitChange={onStateMachinePreviewExitChange}
    />
  );
}
