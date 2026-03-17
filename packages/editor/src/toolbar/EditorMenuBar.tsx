import React, { useCallback, useState, useRef } from 'react';
import { useEditorState } from '../state/EditorProvider';
import { useEditorIcons } from '../theme/icons';
import { v } from '../theme/tokens';
import type { ElucimDocument } from '@elucim/dsl';

const SEMANTIC_TOKENS = [
  'foreground', 'background', 'title', 'subtitle', 'accent', 'muted', 'surface',
  'border', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'error',
] as const;

// Built-in themes for the canvas scene
const SCENE_THEMES: Record<string, Record<string, string>> = {
  dark: {
    background: '#0a0a1e',
    foreground: '#e0e7ff',
    accent: '#4fc3f7',
    muted: '#64748b',
    primary: '#4fc3f7',
    secondary: '#a78bfa',
    tertiary: '#f472b6',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
  },
  light: {
    background: '#f8fafc',
    foreground: '#1e293b',
    accent: '#2563eb',
    muted: '#94a3b8',
    primary: '#2563eb',
    secondary: '#7c3aed',
    tertiary: '#db2777',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
  },
  ocean: {
    background: '#0c1222',
    foreground: '#cbd5e1',
    accent: '#38bdf8',
    muted: '#475569',
    primary: '#38bdf8',
    secondary: '#818cf8',
    tertiary: '#c084fc',
    success: '#2dd4bf',
    warning: '#facc15',
    error: '#fb7185',
  },
};

/**
 * Top menu bar with Save/Open/Copy, theme picker, and custom theme editor.
 */
export function EditorMenuBar() {
  const { state, dispatch } = useEditorState();
  const icons = useEditorIcons();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showCustomTheme, setShowCustomTheme] = useState(false);

  // ── Export (save JSON) ──
  const handleSave = useCallback(() => {
    const json = JSON.stringify(state.document, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'elucim-scene.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [state.document]);

  // ── Import (open JSON) ──
  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const doc = JSON.parse(reader.result as string) as ElucimDocument;
        dispatch({ type: 'SET_DOCUMENT', document: doc });
      } catch {
        // Silent fail — invalid JSON
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset for re-selecting same file
  }, [dispatch]);

  // ── Copy JSON ──
  const handleCopy = useCallback(async () => {
    const json = JSON.stringify(state.document, null, 2);
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }, [state.document]);

  // ── Apply theme ──
  const applyTheme = useCallback((themeName: string) => {
    const theme = SCENE_THEMES[themeName];
    if (!theme) return;
    // Update scene background
    dispatch({ type: 'UPDATE_CANVAS', changes: { background: theme.background } });
    // Update all elements' primary colors
    const root = state.document.root;
    const children = ('children' in root && Array.isArray(root.children)) ? root.children : [];
    for (const el of children) {
      const id = ('id' in el && el.id) ? el.id : undefined;
      if (!id) continue;
      const updates: Record<string, any> = {};
      if ('stroke' in el && (el as any).stroke) updates.stroke = theme.accent;
      if ('fill' in el && (el as any).fill && (el as any).fill !== 'none') updates.fill = theme.accent;
      if ('color' in el) updates.color = theme.foreground;
      if (Object.keys(updates).length > 0) {
        dispatch({ type: 'UPDATE_ELEMENT', id, changes: updates as any });
      }
    }
    setShowThemePicker(false);
  }, [dispatch, state.document]);

  // ── Custom theme token editor ──
  const handleCustomTokenChange = useCallback((token: string, value: string) => {
    if (token === 'background') {
      dispatch({ type: 'UPDATE_CANVAS', changes: { background: value } });
    }
  }, [dispatch]);

  const rootBg = ('background' in state.document.root ? (state.document.root as any).background : '') ?? '#0a0a1e';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      padding: '2px 8px',
      background: v('--elucim-editor-surface'),
      borderBottom: `1px solid ${v('--elucim-editor-border')}`,
      fontSize: 11,
      minHeight: 28,
    }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* File operations */}
      <MenuButton icon={icons.Save()} title="Save as JSON" onClick={handleSave} label="Save" />
      <MenuButton icon={icons.Open()} title="Open JSON file" onClick={handleOpen} label="Open" />
      <MenuButton icon={icons.Copy()} title="Copy JSON to clipboard" onClick={handleCopy} label="Copy" />

      <div style={{ width: 1, height: 16, background: v('--elucim-editor-border-subtle'), margin: '0 4px' }} />

      {/* Theme picker */}
      <div style={{ position: 'relative' }}>
        <MenuButton
          icon={icons.Palette()}
          title="Scene theme"
          onClick={() => { setShowThemePicker(!showThemePicker); setShowCustomTheme(false); }}
          label="Theme"
          active={showThemePicker}
        />
        {showThemePicker && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 1000,
            background: v('--elucim-editor-surface'),
            border: `1px solid ${v('--elucim-editor-border')}`,
            borderRadius: 4,
            padding: 6,
            minWidth: 160,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: 10, color: v('--elucim-editor-text-muted'), padding: '2px 4px', marginBottom: 4 }}>
              Built-in Themes
            </div>
            {Object.entries(SCENE_THEMES).map(([name, theme]) => (
              <button
                key={name}
                onClick={() => applyTheme(name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '4px 6px',
                  border: 'none',
                  borderRadius: 3,
                  background: 'transparent',
                  color: v('--elucim-editor-fg'),
                  cursor: 'pointer',
                  fontSize: 11,
                  textAlign: 'left',
                }}
              >
                {/* Color swatch preview */}
                <div style={{ display: 'flex', gap: 2 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: theme.background, border: `1px solid ${v('--elucim-editor-border-subtle')}` }} />
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: theme.accent }} />
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: theme.secondary ?? theme.primary }} />
                </div>
                <span style={{ textTransform: 'capitalize' }}>{name}</span>
              </button>
            ))}
            <div style={{ borderTop: `1px solid ${v('--elucim-editor-border-subtle')}`, marginTop: 4, paddingTop: 4 }}>
              <button
                onClick={() => { setShowCustomTheme(!showCustomTheme); }}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  border: 'none',
                  borderRadius: 3,
                  background: showCustomTheme ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 15%, transparent)` : 'transparent',
                  color: v('--elucim-editor-fg'),
                  cursor: 'pointer',
                  fontSize: 11,
                  textAlign: 'left',
                }}
              >
                Custom Theme…
              </button>
            </div>
            {showCustomTheme && (
              <div style={{ marginTop: 6, maxHeight: 200, overflowY: 'auto' }}>
                <div style={{ fontSize: 9, color: v('--elucim-editor-text-muted'), padding: '2px 4px' }}>
                  Scene background
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px' }}>
                  <input
                    type="color"
                    value={rootBg}
                    onChange={(e) => handleCustomTokenChange('background', e.target.value)}
                    style={{ width: 24, height: 20, padding: 0, border: 'none', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: v('--elucim-editor-text-secondary') }}>
                    {rootBg}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuButton({ icon, title, onClick, label, active }: {
  icon: React.ReactNode; title: string; onClick: () => void; label: string; active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        border: 'none',
        borderRadius: 3,
        background: active ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 15%, transparent)` : 'transparent',
        color: v('--elucim-editor-fg'),
        cursor: 'pointer',
        fontSize: 11,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
