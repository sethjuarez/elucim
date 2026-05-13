import type React from 'react';
import { v } from '../theme/tokens';
import { PanelResizeHandle } from './PanelResizeHandle';

export interface EditorMainGridProps {
  leftVisible: boolean;
  rightVisible: boolean;
  leftWidth: number;
  rightWidth: number;
  stateMachineWorkspaceActive: boolean;
  onLeftResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onRightResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  leftDock: React.ReactNode;
  canvas: React.ReactNode;
  inspector: React.ReactNode;
}

export function buildEditorGridColumns(
  leftVisible: boolean,
  leftWidth: number,
  rightVisible: boolean,
  rightWidth: number,
): string {
  return `${leftVisible ? `${leftWidth}px` : '0px'} minmax(260px, 1fr) ${rightVisible ? `${rightWidth}px` : '0px'}`;
}

export function EditorMainGrid({
  leftVisible,
  rightVisible,
  leftWidth,
  rightWidth,
  stateMachineWorkspaceActive,
  onLeftResizeStart,
  onRightResizeStart,
  leftDock,
  canvas,
  inspector,
}: EditorMainGridProps) {
  return (
    <div
      style={{
        flex: stateMachineWorkspaceActive ? '0 0 clamp(96px, 14vh, 180px)' : 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: buildEditorGridColumns(leftVisible, leftWidth, rightVisible, rightWidth),
        background: v('--elucim-editor-bg'),
      }}
    >
      <aside
        aria-hidden={!leftVisible}
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          borderRight: `1px solid ${v('--elucim-editor-border')}`,
          background: v('--elucim-editor-surface'),
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {leftVisible && leftDock}
        {leftVisible && <PanelResizeHandle side="right" label="Resize left panel" onPointerDown={onLeftResizeStart} />}
      </aside>

      <main style={{ position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        {canvas}
      </main>

      <aside
        aria-hidden={!rightVisible}
        style={{
          minWidth: 0,
          minHeight: 0,
          borderLeft: `1px solid ${v('--elucim-editor-border')}`,
          background: v('--elucim-editor-surface'),
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {rightVisible && <PanelResizeHandle side="left" label="Resize inspector" onPointerDown={onRightResizeStart} />}
        {rightVisible && inspector}
      </aside>
    </div>
  );
}
