import { v } from '../theme/tokens';
import { PanelToggle } from './PanelToggle';

export interface EditorTopBarProps {
  leftVisible: boolean;
  rightVisible: boolean;
  timelineVisible: boolean;
  onLeftVisibleChange: (updater: (value: boolean) => boolean) => void;
  onRightVisibleChange: (updater: (value: boolean) => boolean) => void;
  onTimelineVisibleChange: (updater: (value: boolean) => boolean) => void;
}

export function EditorTopBar({
  leftVisible,
  rightVisible,
  timelineVisible,
  onLeftVisibleChange,
  onRightVisibleChange,
  onTimelineVisibleChange,
}: EditorTopBarProps) {
  return (
    <div
      style={{
        height: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: `1px solid ${v('--elucim-editor-border')}`,
        background: v('--elucim-editor-surface'),
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 750, letterSpacing: 0.2 }}>Elucim</div>
        <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10 }}>
          Scene editor
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <PanelToggle label="left panel" panel="left" active={leftVisible} onClick={() => onLeftVisibleChange(value => !value)} />
        <PanelToggle label="timeline" panel="bottom" active={timelineVisible} onClick={() => onTimelineVisibleChange(value => !value)} />
        <PanelToggle label="Inspector" panel="right" active={rightVisible} onClick={() => onRightVisibleChange(value => !value)} />
      </div>
    </div>
  );
}
