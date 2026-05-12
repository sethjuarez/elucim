import { v } from '../theme/tokens';

export function PanelToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        height: 22,
        border: `1px solid ${active ? v('--elucim-editor-border') : v('--elucim-editor-border-subtle')}`,
        borderRadius: 4,
        background: active ? 'transparent' : v('--elucim-editor-input-bg'),
        color: active ? v('--elucim-editor-text-secondary') : v('--elucim-editor-text-muted'),
        cursor: 'pointer',
        fontSize: 10,
        padding: '0 7px',
      }}
    >
      {active ? `Hide ${label}` : `Show ${label}`}
    </button>
  );
}
