import React, { useCallback, useState } from 'react';
import type { ElementNode } from '@elucim/dsl';
import { useEditorState } from '../state/EditorProvider';
import { findElementById } from '../state/reducer';

export interface InspectorProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Inspector content — shows properties for the selected element.
 * Rendered inside a FloatingPanel by ElucimEditor.
 */
export function Inspector({ className, style }: InspectorProps) {
  const { state, dispatch } = useEditorState();
  const { selectedIds, document } = state;

  // Only inspect single selection
  const elementId = selectedIds.length === 1 ? selectedIds[0] : null;
  const loc = elementId ? findElementById(document.root, elementId) : null;
  const element = loc?.element ?? null;

  const handleChange = useCallback((field: string, value: any) => {
    if (!elementId) return;
    dispatch({ type: 'UPDATE_ELEMENT', id: elementId, changes: { [field]: value } as any });
  }, [dispatch, elementId]);

  if (!element) {
    return (
      <div
        className={`elucim-editor-inspector ${className ?? ''}`}
        style={{
          padding: 12,
          color: '#64748b',
          fontSize: 12,
          ...style,
        }}
      >
        {selectedIds.length === 0 ? 'No selection' : `${selectedIds.length} elements selected`}
      </div>
    );
  }

  return (
    <div
      className={`elucim-editor-inspector ${className ?? ''}`}
      style={{
        padding: 12,
        overflowY: 'auto',
        fontSize: 12,
        minWidth: 200,
        ...style,
      }}
    >
      {/* Element type header */}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#4a9eff' }}>
        {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
        {'id' in element && element.id ? ` — ${element.id}` : ''}
      </div>

      {/* Position section */}
      <InspectorSection title="Position">
        <PositionFields element={element} onChange={handleChange} />
      </InspectorSection>

      {/* Style section */}
      <InspectorSection title="Style">
        <StyleFields element={element} onChange={handleChange} />
      </InspectorSection>

      {/* Animation section */}
      <InspectorSection title="Animation">
        <AnimationFields element={element} onChange={handleChange} />
      </InspectorSection>

      {/* Transform section */}
      <InspectorSection title="Transform">
        <TransformFields element={element} onChange={handleChange} />
      </InspectorSection>

      {/* Element-specific section */}
      <ElementSpecificFields element={element} onChange={handleChange} />
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          cursor: 'pointer',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: '#94a3b8',
          padding: '4px 0',
          borderBottom: '1px solid #334155',
          userSelect: 'none',
        }}
      >
        {open ? '▾' : '▸'} {title}
      </div>
      {open && <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>}
    </div>
  );
}

// ─── Field components ──────────────────────────────────────────────────────

function NumberField({ label, value, onChange, step = 1 }: {
  label: string; value: number | undefined; onChange: (v: number) => void; step?: number;
}) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
      <span style={{ color: '#94a3b8', minWidth: 50 }}>{label}</span>
      <input
        type="number"
        value={value ?? ''}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: 70,
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: 3,
          color: '#e0e0e0',
          padding: '2px 6px',
          fontSize: 11,
        }}
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: {
  label: string; value: string | undefined; onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
      <span style={{ color: '#94a3b8', minWidth: 50 }}>{label}</span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          type="color"
          value={value?.startsWith('#') ? value : '#ffffff'}
          onChange={e => onChange(e.target.value)}
          style={{ width: 24, height: 24, padding: 0, border: 'none', cursor: 'pointer' }}
        />
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={{
            width: 70,
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 3,
            color: '#e0e0e0',
            padding: '2px 6px',
            fontSize: 11,
          }}
        />
      </div>
    </label>
  );
}

function TextField({ label, value, onChange }: {
  label: string; value: string | undefined; onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: 3,
          color: '#e0e0e0',
          padding: '4px 6px',
          fontSize: 11,
          boxSizing: 'border-box',
        }}
      />
    </label>
  );
}

// ─── Position Fields ───────────────────────────────────────────────────────

function PositionFields({ element, onChange }: { element: ElementNode; onChange: (field: string, value: any) => void }) {
  const el = element as any;
  return (
    <>
      {'x' in el && <NumberField label="X" value={el.x} onChange={v => onChange('x', v)} />}
      {'y' in el && <NumberField label="Y" value={el.y} onChange={v => onChange('y', v)} />}
      {'cx' in el && <NumberField label="CX" value={el.cx} onChange={v => onChange('cx', v)} />}
      {'cy' in el && <NumberField label="CY" value={el.cy} onChange={v => onChange('cy', v)} />}
      {'r' in el && <NumberField label="R" value={el.r} onChange={v => onChange('r', v)} />}
      {'width' in el && typeof el.width === 'number' && <NumberField label="W" value={el.width} onChange={v => onChange('width', v)} />}
      {'height' in el && typeof el.height === 'number' && <NumberField label="H" value={el.height} onChange={v => onChange('height', v)} />}
      {'x1' in el && <NumberField label="X1" value={el.x1} onChange={v => onChange('x1', v)} />}
      {'y1' in el && <NumberField label="Y1" value={el.y1} onChange={v => onChange('y1', v)} />}
      {'x2' in el && <NumberField label="X2" value={el.x2} onChange={v => onChange('x2', v)} />}
      {'y2' in el && <NumberField label="Y2" value={el.y2} onChange={v => onChange('y2', v)} />}
    </>
  );
}

// ─── Style Fields ──────────────────────────────────────────────────────────

function StyleFields({ element, onChange }: { element: ElementNode; onChange: (field: string, value: any) => void }) {
  const el = element as any;
  return (
    <>
      {'fill' in el && <ColorField label="Fill" value={el.fill} onChange={v => onChange('fill', v)} />}
      {'stroke' in el && <ColorField label="Stroke" value={el.stroke} onChange={v => onChange('stroke', v)} />}
      {'color' in el && <ColorField label="Color" value={el.color} onChange={v => onChange('color', v)} />}
      {'strokeWidth' in el && <NumberField label="Stroke W" value={el.strokeWidth} onChange={v => onChange('strokeWidth', v)} step={0.5} />}
      {'opacity' in el && <NumberField label="Opacity" value={el.opacity} onChange={v => onChange('opacity', v)} step={0.1} />}
      {'fontSize' in el && <NumberField label="Font Size" value={el.fontSize} onChange={v => onChange('fontSize', v)} />}
    </>
  );
}

// ─── Animation Fields ──────────────────────────────────────────────────────

function AnimationFields({ element, onChange }: { element: ElementNode; onChange: (field: string, value: any) => void }) {
  const el = element as any;
  return (
    <>
      <NumberField label="Fade In" value={el.fadeIn} onChange={v => onChange('fadeIn', v)} />
      <NumberField label="Fade Out" value={el.fadeOut} onChange={v => onChange('fadeOut', v)} />
      {'draw' in el && <NumberField label="Draw" value={el.draw} onChange={v => onChange('draw', v)} />}
    </>
  );
}

// ─── Transform Fields ──────────────────────────────────────────────────────

function TransformFields({ element, onChange }: { element: ElementNode; onChange: (field: string, value: any) => void }) {
  const el = element as any;
  return (
    <>
      <NumberField label="Rotation" value={el.rotation} onChange={v => onChange('rotation', v)} />
      <NumberField label="Z-Index" value={el.zIndex} onChange={v => onChange('zIndex', v)} />
    </>
  );
}

// ─── Element-Specific Fields ───────────────────────────────────────────────

function ElementSpecificFields({ element, onChange }: { element: ElementNode; onChange: (field: string, value: any) => void }) {
  const el = element as any;

  switch (element.type) {
    case 'text':
      return (
        <InspectorSection title="Content">
          <TextField label="Text" value={el.content} onChange={v => onChange('content', v)} />
          <TextField label="Font" value={el.fontFamily} onChange={v => onChange('fontFamily', v)} />
        </InspectorSection>
      );

    case 'latex':
      return (
        <InspectorSection title="Expression">
          <TextField label="LaTeX" value={el.expression} onChange={v => onChange('expression', v)} />
        </InspectorSection>
      );

    case 'functionPlot':
      return (
        <InspectorSection title="Function">
          <TextField label="f(x)" value={el.fn} onChange={v => onChange('fn', v)} />
          <NumberField label="Samples" value={el.samples} onChange={v => onChange('samples', v)} />
        </InspectorSection>
      );

    case 'image':
      return (
        <InspectorSection title="Image">
          <TextField label="Source" value={el.src} onChange={v => onChange('src', v)} />
        </InspectorSection>
      );

    case 'arrow':
      return (
        <InspectorSection title="Arrow">
          <NumberField label="Head Size" value={el.headSize} onChange={v => onChange('headSize', v)} />
        </InspectorSection>
      );

    case 'matrix':
      return (
        <InspectorSection title="Matrix">
          <TextField
            label="Values"
            value={el.values ? el.values.map((r: any[]) => r.join(', ')).join(' ; ') : ''}
            onChange={v => {
              const rows = v.split(';').map((r: string) =>
                r.trim().split(',').map((c: string) => {
                  const n = Number(c.trim());
                  return isNaN(n) ? c.trim() : n;
                })
              );
              onChange('values', rows);
            }}
          />
          <NumberField label="Cell Size" value={el.cellSize ?? 40} onChange={v => onChange('cellSize', v)} />
          <NumberField label="Font Size" value={el.fontSize ?? 16} onChange={v => onChange('fontSize', v)} />
        </InspectorSection>
      );

    default:
      return null;
  }
}
