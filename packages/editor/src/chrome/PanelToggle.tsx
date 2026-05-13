import { v } from '../theme/tokens';
import { useEditorIcons } from '../theme/icons';

export function PanelToggle({
  label,
  active,
  panel,
  onClick,
}: {
  label: string;
  active: boolean;
  panel?: 'left' | 'right' | 'bottom';
  onClick: () => void;
}) {
  const icons = useEditorIcons();
  const accessibleLabel = active ? `Hide ${label}` : `Show ${label}`;
  const icon = panel === 'left'
    ? active ? icons.PanelLeftClose : icons.PanelLeft
    : panel === 'right'
    ? active ? icons.PanelRightClose : icons.PanelRight
    : panel === 'bottom'
    ? active ? icons.PanelBottomClose : icons.PanelBottom
    : undefined;

  return (
    <button
      type="button"
      aria-label={icon ? accessibleLabel : undefined}
      aria-pressed={active}
      title={accessibleLabel}
      onClick={onClick}
      style={{
        height: 24,
        minWidth: icon ? 24 : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${active ? v('--elucim-editor-border') : v('--elucim-editor-border-subtle')}`,
        borderRadius: 6,
        background: active ? 'transparent' : v('--elucim-editor-input-bg'),
        color: active ? v('--elucim-editor-text-secondary') : v('--elucim-editor-text-muted'),
        cursor: 'pointer',
        fontSize: 10,
        padding: icon ? 0 : '0 7px',
      }}
    >
      {icon ? icon({ size: 13 }) : accessibleLabel}
    </button>
  );
}
