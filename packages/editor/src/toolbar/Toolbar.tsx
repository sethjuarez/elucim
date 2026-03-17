import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditorState } from '../state/EditorProvider';
import { getTemplatesByCategory, CATEGORY_LABELS, type ElementTemplate } from './templates';
import { useEditorIcons } from '../theme/icons';
import { v } from '../theme/tokens';
import type { ElucimDocument } from '@elucim/dsl';

// ─── Built-in scene themes ─────────────────────────────────────────────────
// Each theme covers both the scene content AND the editor chrome tokens.
const SCENE_THEMES: Record<string, { colorScheme: 'dark' | 'light'; scene: Record<string, string>; chrome: Record<string, string> }> = {
  dark: {
    colorScheme: 'dark',
    scene: {
      background: '#0a0a1e',
      foreground: '#e0e7ff',
      accent: '#4fc3f7',
    },
    chrome: {
      '--elucim-editor-accent': '#4a9eff',
      '--elucim-editor-bg': '#1a1a2e',
      '--elucim-editor-surface': '#12122a',
      '--elucim-editor-panel': 'rgba(22, 22, 42, 0.93)',
      '--elucim-editor-chrome': 'rgba(15, 23, 42, 0.8)',
      '--elucim-editor-fg': '#e0e0e0',
      '--elucim-editor-text-secondary': '#94a3b8',
      '--elucim-editor-text-muted': '#64748b',
      '--elucim-editor-text-disabled': '#475569',
      '--elucim-editor-border': '#334155',
      '--elucim-editor-border-subtle': '#1e293b',
      '--elucim-editor-input-bg': '#0f172a',
      '--elucim-editor-color-scheme': 'dark',
    },
  },
  light: {
    colorScheme: 'light',
    scene: {
      background: '#f8fafc',
      foreground: '#1e293b',
      accent: '#2563eb',
    },
    chrome: {
      '--elucim-editor-accent': '#2563eb',
      '--elucim-editor-bg': '#f1f5f9',
      '--elucim-editor-surface': '#ffffff',
      '--elucim-editor-panel': 'rgba(255, 255, 255, 0.95)',
      '--elucim-editor-chrome': 'rgba(241, 245, 249, 0.9)',
      '--elucim-editor-fg': '#1e293b',
      '--elucim-editor-text-secondary': '#475569',
      '--elucim-editor-text-muted': '#94a3b8',
      '--elucim-editor-text-disabled': '#cbd5e1',
      '--elucim-editor-border': '#e2e8f0',
      '--elucim-editor-border-subtle': '#f1f5f9',
      '--elucim-editor-input-bg': '#ffffff',
      '--elucim-editor-color-scheme': 'light',
    },
  },
  ocean: {
    colorScheme: 'dark',
    scene: {
      background: '#0c1222',
      foreground: '#cbd5e1',
      accent: '#38bdf8',
    },
    chrome: {
      '--elucim-editor-accent': '#38bdf8',
      '--elucim-editor-bg': '#0c1222',
      '--elucim-editor-surface': '#0f1729',
      '--elucim-editor-panel': 'rgba(12, 18, 34, 0.95)',
      '--elucim-editor-chrome': 'rgba(15, 23, 41, 0.85)',
      '--elucim-editor-fg': '#cbd5e1',
      '--elucim-editor-text-secondary': '#94a3b8',
      '--elucim-editor-text-muted': '#475569',
      '--elucim-editor-text-disabled': '#334155',
      '--elucim-editor-border': '#1e3a5f',
      '--elucim-editor-border-subtle': '#0f2340',
      '--elucim-editor-input-bg': '#081020',
      '--elucim-editor-color-scheme': 'dark',
    },
  },
};

export interface ToolbarProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Toolbar content — file operations, element palette, and undo/redo.
 * Rendered inside a FloatingPanel by ElucimEditor.
 */
export function Toolbar({ className, style }: ToolbarProps) {
  const { state, dispatch } = useEditorState();
  const icons = useEditorIcons();
  const categories = getTemplatesByCategory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const handleAddElement = useCallback((template: ElementTemplate) => {
    const root = state.document.root as any;
    const cx = (root.width ?? 800) / 2;
    const cy = (root.height ?? 600) / 2;
    const element = template.create(cx, cy);
    dispatch({ type: 'ADD_ELEMENT', element });
    dispatch({ type: 'SET_TOOL', tool: 'select' });
    const id = 'id' in element ? (element as any).id : undefined;
    if (id) dispatch({ type: 'SELECT', ids: [id] });
  }, [state.document.root, dispatch]);

  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);

  // ── File operations ──
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
    e.target.value = '';
  }, [dispatch]);

  const handleCopy = useCallback(async () => {
    const json = JSON.stringify(state.document, null, 2);
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }, [state.document]);

  const applyTheme = useCallback((themeName: string) => {
    const theme = SCENE_THEMES[themeName];
    if (!theme) return;
    // Apply scene content changes
    dispatch({ type: 'UPDATE_CANVAS', changes: { background: theme.scene.background } });
    const root = state.document.root;
    const children = ('children' in root && Array.isArray(root.children)) ? root.children : [];
    for (const el of children) {
      const id = ('id' in el && el.id) ? el.id : undefined;
      if (!id) continue;
      const updates: Record<string, any> = {};
      if ('stroke' in el && (el as any).stroke) updates.stroke = theme.scene.accent;
      if ('fill' in el && (el as any).fill && (el as any).fill !== 'none') updates.fill = theme.scene.accent;
      if ('color' in el) updates.color = theme.scene.foreground;
      if (Object.keys(updates).length > 0) {
        dispatch({ type: 'UPDATE_ELEMENT', id, changes: updates as any });
      }
    }
    // Apply editor chrome theme
    dispatch({ type: 'SET_EDITOR_THEME', overrides: theme.chrome });
    setShowThemePicker(false);
  }, [dispatch, state.document]);

  return (
    <div
      className={`elucim-editor-toolbar ${className ?? ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '6px',
        fontSize: 11,
        ...style,
      }}
    >
      {/* Hidden file input for Open */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* File operations */}
      <ToolbarSection label="File">
        <ToolbarButton icon={icons.Save()} label="Save" onClick={handleSave} />
        <ToolbarButton icon={icons.Open()} label="Open" onClick={handleOpen} />
        <ToolbarButton icon={icons.Copy()} label="Copy" onClick={handleCopy} />
        <ThemeButton
          icon={icons.Palette()}
          active={showThemePicker}
          onToggle={() => setShowThemePicker(!showThemePicker)}
          onApply={applyTheme}
          onClose={() => setShowThemePicker(false)}
          open={showThemePicker}
        />
      </ToolbarSection>

      {/* Undo / Redo */}
      <ToolbarSection label="History">
        <ToolbarButton icon={icons.Undo()} label="Undo" onClick={handleUndo} disabled={state.past.length === 0} />
        <ToolbarButton icon={icons.Redo()} label="Redo" onClick={handleRedo} disabled={state.future.length === 0} />
      </ToolbarSection>

      {/* Element palette */}
      {Object.entries(categories).map(([cat, templates]) => (
        <ToolbarSection key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
          {templates.map((t) => (
            <ToolbarButton
              key={t.type}
              icon={t.icon}
              label={t.label}
              onClick={() => handleAddElement(t)}
            />
          ))}
        </ToolbarSection>
      ))}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ToolbarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 9, color: v('--elucim-editor-text-muted'), textTransform: 'uppercase', letterSpacing: 1, padding: '2px 4px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {children}
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 4,
        background: active ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 20%, transparent)` : 'transparent',
        color: disabled ? v('--elucim-editor-text-disabled') : v('--elucim-editor-fg'),
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 16,
        lineHeight: 1,
        outline: active ? `1px solid ${v('--elucim-editor-accent')}` : 'none',
      }}
    >
      {icon}
    </button>
  );
}

// Portal-based theme picker that renders outside the overflow:hidden panel
function ThemeButton({ icon, active, open, onToggle, onApply, onClose }: {
  icon: React.ReactNode;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onApply: (name: string) => void;
  onClose: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.top, left: r.right + 4 });
    }
  }, [open]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (popupRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  return (
    <>
      <button
        ref={btnRef}
        title="Theme"
        onClick={onToggle}
        style={{
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', borderRadius: 4,
          background: active ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 20%, transparent)` : 'transparent',
          color: v('--elucim-editor-fg'),
          cursor: 'pointer', fontSize: 16, lineHeight: 1,
          outline: active ? `1px solid ${v('--elucim-editor-accent')}` : 'none',
        }}
      >
        {icon}
      </button>
      {open && createPortal(
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 10000,
            background: v('--elucim-editor-surface'),
            border: `1px solid ${v('--elucim-editor-border')}`,
            borderRadius: 4,
            padding: 6,
            minWidth: 140,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ fontSize: 9, color: v('--elucim-editor-text-muted'), padding: '2px 4px', marginBottom: 4 }}>
            Themes
          </div>
          {Object.entries(SCENE_THEMES).map(([name, theme]) => (
            <button
              key={name}
              onClick={() => onApply(name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', padding: '4px 6px',
                border: 'none', borderRadius: 3,
                background: 'transparent',
                color: v('--elucim-editor-fg'),
                cursor: 'pointer', fontSize: 11, textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', gap: 2 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: theme.scene.background, border: `1px solid ${v('--elucim-editor-border-subtle')}` }} />
                <div style={{ width: 10, height: 10, borderRadius: 2, background: theme.scene.accent }} />
              </div>
              <span style={{ textTransform: 'capitalize' }}>{name}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
