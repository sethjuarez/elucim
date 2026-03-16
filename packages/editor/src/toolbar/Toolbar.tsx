import React, { useCallback } from 'react';
import { useEditorState } from '../state/EditorProvider';
import { ELEMENT_TEMPLATES, getTemplatesByCategory, CATEGORY_LABELS, type ElementTemplate } from './templates';
import type { EditorTool } from '../state/types';
import { v } from '../theme/tokens';

export interface ToolbarProps {
  className?: string;
  style?: React.CSSProperties;
}

const TOOL_ITEMS: { tool: EditorTool; label: string; icon: string }[] = [
  { tool: 'select', label: 'Select', icon: '⊹' },
];

const PRESET_ITEMS = [
  { label: 'Card', preset: 'card' as const, dims: [640, 360] },
  { label: 'Slide', preset: 'slide' as const, dims: [1280, 720] },
  { label: 'Square', preset: 'square' as const, dims: [600, 600] },
];

/**
 * Toolbar content — element palette, undo/redo, and preset buttons.
 * Rendered inside a FloatingPanel by ElucimEditor.
 */
export function Toolbar({ className, style }: ToolbarProps) {
  const { state, dispatch } = useEditorState();
  const categories = getTemplatesByCategory();

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

  const handlePreset = useCallback((dims: number[]) => {
    const doc = structuredClone(state.document);
    const root = doc.root as any;
    root.width = dims[0];
    root.height = dims[1];
    dispatch({ type: 'SET_DOCUMENT', document: doc });
  }, [state.document, dispatch]);

  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);

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
      {/* Tools */}
      <ToolbarSection label="Tools">
        {TOOL_ITEMS.map(({ tool, label, icon }) => (
          <ToolbarButton
            key={tool}
            icon={icon}
            label={label}
            active={state.activeTool === tool}
            onClick={() => dispatch({ type: 'SET_TOOL', tool })}
          />
        ))}
      </ToolbarSection>

      {/* Undo / Redo */}
      <ToolbarSection label="History">
        <ToolbarButton icon="↶" label="Undo" onClick={handleUndo} disabled={state.past.length === 0} />
        <ToolbarButton icon="↷" label="Redo" onClick={handleRedo} disabled={state.future.length === 0} />
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

      {/* Scene presets */}
      <ToolbarSection label="Presets">
        {PRESET_ITEMS.map(({ label, dims }) => (
          <ToolbarButton
            key={label}
            icon={label[0]}
            label={label}
            onClick={() => handlePreset(dims)}
          />
        ))}
      </ToolbarSection>
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
  icon: string;
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
