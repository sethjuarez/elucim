import { v } from '../theme/tokens';

export function CollapsedPanelRail({
  leftVisible,
  rightVisible,
  timelineVisible,
  onShowLeft,
  onShowRight,
  onShowTimeline,
}: {
  leftVisible: boolean;
  rightVisible: boolean;
  timelineVisible: boolean;
  onShowLeft: () => void;
  onShowRight: () => void;
  onShowTimeline: () => void;
}) {
  if (leftVisible && rightVisible && timelineVisible) return null;
  return (
    <div style={{ position: 'absolute', left: 10, top: 10, zIndex: 20, display: 'flex', gap: 6 }}>
      {!leftVisible && <RailButton label="Show left panel" onClick={onShowLeft} />}
      {!rightVisible && <RailButton label="Show inspector" onClick={onShowRight} />}
      {!timelineVisible && <RailButton label="Show timeline" onClick={onShowTimeline} />}
    </div>
  );
}

function RailButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${v('--elucim-editor-border')}`,
        borderRadius: 999,
        background: `color-mix(in srgb, ${v('--elucim-editor-surface')} 92%, transparent)`,
        color: v('--elucim-editor-fg'),
        cursor: 'pointer',
        fontSize: 10,
        padding: '4px 8px',
        boxShadow: v('--elucim-editor-shadow-dropdown'),
      }}
    >
      {label}
    </button>
  );
}
