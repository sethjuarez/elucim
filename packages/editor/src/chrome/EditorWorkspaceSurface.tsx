import type React from 'react';
import { EditorMainGrid } from './EditorMainGrid';
import { EditorTimelineDock } from './EditorTimelineDock';
import { EditorTopBar } from './EditorTopBar';
import { PanelToggle } from './PanelToggle';

export interface EditorWorkspaceSurfaceProps {
  showHeader?: boolean;
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
  showHeader = true,
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
      {showHeader && <EditorTopBar />}

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
      <div
        aria-label="Collapsed editor panels"
        style={{
          position: 'absolute',
          inset: showHeader ? '34px 0 0 0' : 0,
          pointerEvents: 'none',
          zIndex: 12,
        }}
      >
        {!leftVisible && (
          <div style={{ position: 'absolute', left: 8, top: 10, pointerEvents: 'auto' }}>
            <PanelToggle label="left panel" panel="left" active={false} onClick={() => onLeftVisibleChange(true)} />
          </div>
        )}
        {!rightVisible && (
          <div style={{ position: 'absolute', right: 8, top: 10, pointerEvents: 'auto' }}>
            <PanelToggle label="Inspector" panel="right" active={false} onClick={() => onRightVisibleChange(true)} />
          </div>
        )}
        {!timelineVisible && (
          <div style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
            <PanelToggle label="timeline" panel="bottom" active={false} onClick={() => onTimelineVisibleChange(true)} />
          </div>
        )}
      </div>

      <EditorTimelineDock
        visible={timelineVisible}
        stateMachineWorkspaceActive={stateMachineWorkspaceActive}
        timelineHeight={timelineHeight}
        onResizeStart={onTimelineResizeStart}
        onClose={() => onTimelineVisibleChange(false)}
      >
        {timeline}
      </EditorTimelineDock>
    </>
  );
}
