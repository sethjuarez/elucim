import type React from 'react';
import { v } from '../theme/tokens';

export const chromeTabButtonStyle = (active: boolean, disabled = false): React.CSSProperties => ({
  minHeight: 24,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  border: `1px solid ${active ? v('--elucim-editor-accent') : v('--elucim-editor-border-subtle')}`,
  borderRadius: 999,
  background: active ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 14%, transparent)` : 'transparent',
  color: disabled ? v('--elucim-editor-text-disabled') : active ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 10,
  fontWeight: 700,
  padding: '3px 9px',
});

export const verticalMotionButtonStyle = (active: boolean, disabled = false): React.CSSProperties => ({
  width: 24,
  height: 24,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${active ? v('--elucim-editor-accent') : v('--elucim-editor-border-subtle')}`,
  borderRadius: 7,
  background: active ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 16%, transparent)` : 'transparent',
  color: disabled ? v('--elucim-editor-text-disabled') : active ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 11,
  fontWeight: 800,
  padding: 0,
});

export const motionListActionButtonStyle = (active: boolean, visible = true): React.CSSProperties => ({
  width: 22,
  height: 22,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${active ? v('--elucim-editor-accent') : v('--elucim-editor-border-subtle')}`,
  borderRadius: 6,
  background: active ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 14%, transparent)` : 'transparent',
  color: active ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
  cursor: 'pointer',
  opacity: visible ? 1 : 0,
  pointerEvents: visible ? 'auto' : 'none',
  padding: 0,
});

export const canvasOverlayButtonStyle = (active: boolean, disabled = false): React.CSSProperties => ({
  width: 28,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${active ? v('--elucim-editor-accent') : v('--elucim-editor-border-subtle')}`,
  borderRadius: 7,
  background: active
    ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 18%, ${v('--elucim-editor-input-bg')})`
    : `color-mix(in srgb, ${v('--elucim-editor-input-bg')} 88%, transparent)`,
  color: disabled ? v('--elucim-editor-text-disabled') : active ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
  cursor: disabled ? 'not-allowed' : 'pointer',
  padding: 0,
});

export const inspectorInputStyle: React.CSSProperties = {
  background: v('--elucim-editor-surface'),
  color: v('--elucim-editor-fg'),
  border: `1px solid ${v('--elucim-editor-border')}`,
  borderRadius: 4,
  padding: '4px 6px',
  fontSize: 11,
};

export const motionInspectorPanelStyle: React.CSSProperties = {
  borderLeft: `1px solid ${v('--elucim-editor-border')}`,
  padding: 10,
  display: 'grid',
  gap: 8,
  alignContent: 'start',
  background: v('--elucim-editor-input-bg'),
  minHeight: 0,
  overflowY: 'auto',
};
