import { v } from '../theme/tokens';

export function EditorTopBar() {
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
    </div>
  );
}
