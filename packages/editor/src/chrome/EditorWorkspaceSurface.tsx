import type React from 'react';
import type { EditorWorkspace } from '../shell/editorShell';
import { EditorMainGrid } from './EditorMainGrid';
import { EditorTimelineDock } from './EditorTimelineDock';
import { EditorTopBar } from './EditorTopBar';

export interface EditorWorkspaceSurfaceProps {
  workspace: EditorWorkspace;
  leftVisible: boolean;
  rightVisible: boolean;
  timelineVisible: boolean;
  leftWidth: number;
  rightWidth: number;
  timelineHeight: number;
  stateMachineWorkspaceActive: boolean;
  onWorkspaceSelect: (workspace: EditorWorkspace) => void;
  onLeftVisibleChange: React.Dispatch<React.SetStateAction<boolean>>;
  onRightVisibleChange: React.Dispatch<React.SetStateAction<boolean>>;
  onTimelineVisibleChange: React.Dispatch<React.SetStateAction<boolean>>;
  onLeftResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onRightResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onTimelineResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  leftDock: React.ReactNode;
  canvas: React.ReactNode;
  inspector: React.ReactNode;
  timeline: React.ReactNode;
}

export function EditorWorkspaceSurface({
  workspace,
  leftVisible,
  rightVisible,
  timelineVisible,
  leftWidth,
  rightWidth,
  timelineHeight,
  stateMachineWorkspaceActive,
  onWorkspaceSelect,
  onLeftVisibleChange,
  onRightVisibleChange,
  onTimelineVisibleChange,
  onLeftResizeStart,
  onRightResizeStart,
  onTimelineResizeStart,
  leftDock,
  canvas,
  inspector,
  timeline,
}: EditorWorkspaceSurfaceProps) {
  return (
    <>
      <EditorTopBar
        workspace={workspace}
        leftVisible={leftVisible}
        rightVisible={rightVisible}
        timelineVisible={timelineVisible}
        onWorkspaceSelect={onWorkspaceSelect}
        onLeftVisibleChange={onLeftVisibleChange}
        onRightVisibleChange={onRightVisibleChange}
        onTimelineVisibleChange={onTimelineVisibleChange}
      />

      <EditorMainGrid
        leftVisible={leftVisible}
        rightVisible={rightVisible}
        leftWidth={leftWidth}
        rightWidth={rightWidth}
        stateMachineWorkspaceActive={stateMachineWorkspaceActive}
        onLeftResizeStart={onLeftResizeStart}
        onRightResizeStart={onRightResizeStart}
        leftDock={leftDock}
        canvas={canvas}
        inspector={inspector}
      />

      <EditorTimelineDock
        visible={timelineVisible}
        stateMachineWorkspaceActive={stateMachineWorkspaceActive}
        timelineHeight={timelineHeight}
        onResizeStart={onTimelineResizeStart}
      >
        {timeline}
      </EditorTimelineDock>
    </>
  );
}
