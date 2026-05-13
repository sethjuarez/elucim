import type React from 'react';
import { v } from '../theme/tokens';
import { PanelResizeHandle } from './PanelResizeHandle';
import { PanelToggle } from './PanelToggle';

export interface EditorTimelineDockProps {
  visible: boolean;
  stateMachineWorkspaceActive: boolean;
  timelineHeight: number;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onClose?: () => void;
  children: React.ReactNode;
}

export function buildTimelineDockStyle(
  stateMachineWorkspaceActive: boolean,
  timelineHeight: number,
): React.CSSProperties {
  return {
    height: stateMachineWorkspaceActive ? undefined : timelineHeight,
    flex: stateMachineWorkspaceActive ? '1 1 0' : '0 0 auto',
    minHeight: stateMachineWorkspaceActive ? 360 : undefined,
    borderTop: `1px solid ${v('--elucim-editor-border')}`,
    background: v('--elucim-editor-surface'),
    position: 'relative',
  };
}

export function EditorTimelineDock({
  visible,
  stateMachineWorkspaceActive,
  timelineHeight,
  onResizeStart,
  onClose,
  children,
}: EditorTimelineDockProps) {
  if (!visible) return null;
  return (
    <div style={buildTimelineDockStyle(stateMachineWorkspaceActive, timelineHeight)}>
      <PanelResizeHandle side="top" label="Resize timeline" onPointerDown={onResizeStart} />
      {onClose && (
        <div style={{ position: 'absolute', top: 5, right: 8, zIndex: 8 }}>
          <PanelToggle label="timeline" panel="bottom" active onClick={onClose} />
        </div>
      )}
      {children}
    </div>
  );
}
