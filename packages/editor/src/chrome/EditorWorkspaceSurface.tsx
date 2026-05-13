import type React from 'react';
import { EditorMainGrid } from './EditorMainGrid';
import { EditorTimelineDock } from './EditorTimelineDock';
import { EditorTopBar } from './EditorTopBar';

export interface EditorWorkspaceSurfaceProps {
  leftVisible: boolean;
  rightVisible: boolean;
  timelineVisible: boolean;
  leftWidth: number;
  rightWidth: number;
  timelineHeight: number;
  stateMachineWorkspaceActive: boolean;
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
  leftVisible,
  rightVisible,
  timelineVisible,
  leftWidth,
  rightWidth,
  timelineHeight,
  stateMachineWorkspaceActive,
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
        leftVisible={leftVisible}
        rightVisible={rightVisible}
        timelineVisible={timelineVisible}
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
