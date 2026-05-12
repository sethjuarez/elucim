import { v } from '../theme/tokens';

export function WorkspaceTab({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-label={`${label} workspace`}
      aria-selected={selected}
      onClick={onClick}
      style={{
        height: 22,
        border: `1px solid ${selected ? v('--elucim-editor-accent') : v('--elucim-editor-border')}`,
        borderRadius: 999,
        background: selected ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 16%, transparent)` : 'transparent',
        color: selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: 700,
        padding: '0 9px',
      }}
    >
      {label}
    </button>
  );
}
